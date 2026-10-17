import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { kstDay, kstYear } from "@/lib/day";
import { EXTRA_TESTS, summarizeExtra } from "@/lib/extra/tests";
import { loadExtraResults } from "@/lib/extra/server";
import { generateIllustration, imageModel } from "@/lib/illustration/generate";
import { buildFeatures, buildPrompt, PROMPT_VERSION, type IllustrationFeatures } from "@/lib/illustration/prompt";
import { kstDayStartIso } from "@/lib/photo/rules";
import { sniffImage } from "@/lib/sniff";
import type { Scores } from "@/lib/scoring";

type Admin = SupabaseClient;

export type IllustrationRow = {
  id: string;
  status: "pending" | "done" | "failed";
  path: string | null;
  model: string;
  prompt_version: string;
  features: IllustrationFeatures;
  error: string | null;
  shown: boolean;
  created_at: string;
  completed_at: string | null;
};

/** 이보다 오래 '그리는 중'이면 함수가 멈춘 것으로 본다 */
const STALE_MS = 6 * 60_000;
/** 서비스 전체 하루 상한 (비용 보호). 환경 변수로 바꿀 수 있다 */
const dailyCap = () => Number(process.env.ILLUSTRATION_DAILY_CAP) || 300;

const COLUMNS = "id, status, path, model, prompt_version, features, error, shown, created_at, completed_at";

/** 내 그림들 (지운 것 제외, 최근 순). 0006 SQL 전이면 available=false */
export async function loadIllustrations(admin: Admin, userId: string): Promise<{ available: boolean; rows: IllustrationRow[] }> {
  const { data, error } = await admin
    .from("illustrations")
    .select(COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return { available: false, rows: [] };
  const rows = (data ?? []) as IllustrationRow[];
  // 너무 오래 멈춰 있는 것은 실패로 정리한다
  const stale = rows.filter((r) => r.status === "pending" && Date.now() - new Date(r.created_at).getTime() > STALE_MS);
  if (stale.length) {
    const msg = "그리는 데 너무 오래 걸려서 멈췄어요. 다시 시도해주세요.";
    await admin.from("illustrations").update({ status: "failed", error: msg }).in("id", stale.map((r) => r.id));
    for (const r of stale) Object.assign(r, { status: "failed", error: msg });
  }
  return { available: true, rows };
}

/** 이 계정이 지금까지 그린 수 (실패 제외, 지운 그림 포함 — 지웠다 다시 그려도 횟수가 늘지 않게) */
export async function usedByAccount(admin: Admin, userId: string): Promise<number> {
  const { count } = await admin
    .from("illustrations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "failed");
  return count ?? 0;
}

/** 서비스 전체에서 오늘 그린 수 (실패 제외, 한국 날짜) */
async function usedTodayAll(admin: Admin): Promise<number> {
  const { count } = await admin
    .from("illustrations")
    .select("id", { count: "exact", head: true })
    .neq("status", "failed")
    .gte("created_at", kstDayStartIso(kstDay()));
  return count ?? 0;
}

export const overDailyCap = async (admin: Admin) => (await usedTodayAll(admin)) >= dailyCap();

/** 그림에 넣을 정보 모으기 (이름·지역·종교·연락처는 읽지도 않는다) */
export async function collectFeatures(admin: Admin, userId: string): Promise<IllustrationFeatures | null> {
  const [profile, mp, score, extra] = await Promise.all([
    admin.from("profiles").select("gender, birth_year").eq("id", userId).maybeSingle(),
    admin.from("match_profiles").select("height, intro").eq("user_id", userId).maybeSingle(),
    admin.from("test_scores").select("scores").eq("user_id", userId).maybeSingle(),
    loadExtraResults(admin, userId),
  ]);
  if (!profile.data || !score.data) return null;
  const extraChips = EXTRA_TESTS.flatMap((t) => (extra.rows[t.id] ? summarizeExtra(t, extra.rows[t.id]!.scores).chips : []));
  return buildFeatures({
    gender: profile.data.gender,
    birthYear: profile.data.birth_year,
    year: kstYear(),
    height: mp.data?.height ?? null,
    intro: mp.data?.intro ?? "",
    scores: score.data.scores as Scores,
    extraChips,
  });
}

/** 그리는 중 기록을 먼저 만든다 */
export async function createPending(admin: Admin, userId: string, features: IllustrationFeatures): Promise<string | null> {
  const { data, error } = await admin
    .from("illustrations")
    .insert({ user_id: userId, status: "pending", model: imageModel(), prompt_version: PROMPT_VERSION, features })
    .select("id")
    .single();
  return error ? null : (data.id as string);
}

async function download(admin: Admin, path: string): Promise<{ data: Buffer; mime: string } | null> {
  const { data } = await admin.storage.from("photos").download(path);
  if (!data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  const mime = sniffImage(buf);
  return mime ? { data: buf, mime } : null;
}

/** 실제로 그리기 (응답을 보낸 뒤 after()에서 부른다). 끝나면 완료·실패를 기록한다 */
export async function runIllustration(admin: Admin, userId: string, id: string, features: IllustrationFeatures): Promise<void> {
  const fail = (error: string) => admin.from("illustrations").update({ status: "failed", error, completed_at: new Date().toISOString() }).eq("id", id);
  try {
    const { data: photos } = await admin.from("photos").select("slot, path").eq("user_id", userId).is("replaced_at", null);
    const face = photos?.find((p) => p.slot === "face");
    const body = photos?.find((p) => p.slot === "body");
    if (!face || !body) return void (await fail("사진 2장을 먼저 등록해주세요."));
    const [f, b] = await Promise.all([download(admin, face.path), download(admin, body.path)]);
    if (!f || !b) return void (await fail("사진을 불러오지 못했어요."));

    const result = await generateIllustration({
      images: [
        { ...f, name: `face.${f.mime.split("/")[1]}` },
        { ...b, name: `body.${b.mime.split("/")[1]}` },
      ],
      prompt: buildPrompt(features),
      userId,
    });
    if (!result.ok) return void (await fail(result.error));

    const path = `${userId}/illust-${id}.webp`;
    const { error: upErr } = await admin.storage.from("photos").upload(path, result.image, { contentType: "image/webp", upsert: true });
    if (upErr) return void (await fail("그림을 저장하지 못했어요."));
    await admin
      .from("illustrations")
      .update({ status: "done", path, model: result.model, completed_at: new Date().toISOString() })
      .eq("id", id);

    // 한 계정당 3번뿐이라 예전 그림도 지우지 않고 남긴다 (회원이 그중에서 고르거나 직접 지운다)
  } catch (e) {
    console.error("illustration failed", (e as Error).message);
    await fail("그림을 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
}

/** 추천 카드에 보여주기로 한 그림 (회원 id → 서명 주소 10분). 0006 전이면 빈 결과 */
export async function shownIllustrationUrls(admin: Admin, userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!userIds.length) return out;
  const { data, error } = await admin
    .from("illustrations")
    .select("user_id, path")
    .in("user_id", userIds)
    .eq("shown", true)
    .is("deleted_at", null);
  if (error || !data?.length) return out;
  const rows = data.filter((r): r is { user_id: string; path: string } => Boolean(r.path));
  const { data: signed } = await admin.storage.from("photos").createSignedUrls(rows.map((r) => r.path), 600);
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  for (const r of rows) {
    const url = byPath.get(r.path);
    if (url) out.set(r.user_id, url);
  }
  return out;
}
