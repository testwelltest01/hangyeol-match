"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { normalizeInstagram, normalizeKakao } from "@/lib/contact";
import { encryptText } from "@/lib/crypto";
import { kstDay, kstYear } from "@/lib/day";
import {
  checkIntro,
  defaultFilters,
  isReligion,
  MAX_HEIGHT,
  MIN_HEIGHT,
  sanitizeFilters,
  type Filters,
  type MatchPerson,
} from "@/lib/match/filters";
import { loadMySetup, nextSetupPath } from "@/lib/match/me";
import { countMutualMatches, loadPool } from "@/lib/match/server";
import { analyzePhoto, type Improvement, type PhotoSlot, type UserView } from "@/lib/photo/feedback";
import { canUploadToday } from "@/lib/photo/rules";
import { isRegionKey } from "@/lib/regions";
import { allow, sniffImage, TOO_MANY } from "@/lib/security";
import type { Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

export type FormState = { error: string | null; saved?: boolean };

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return userId;
}

// ---------------------------------------------------------------------------
// 내 정보 (지역, 키, 자기소개, 종교)
// ---------------------------------------------------------------------------

export async function saveMatchProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUser();
  if (!(await allow(`profile:${userId}`, 60, 3600))) return { error: TOO_MANY };
  const setup = await loadMySetup(userId);
  if (!setup) redirect("/start");

  const region = String(formData.get("region") ?? "");
  const height = Number(formData.get("height"));
  const intro = String(formData.get("intro") ?? "").trim();
  const religionRaw = String(formData.get("religion") ?? "");
  const agreeReligion = formData.get("agreeReligion") === "on";

  if (!isRegionKey(region)) return { error: "사는 지역을 골라주세요." };
  if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) return { error: "키를 확인해주세요." };
  if (intro.length < 10) return { error: "자기소개를 10자 이상 써주세요." };
  const introError = checkIntro(intro);
  if (introError) return { error: introError };

  const religion = religionRaw === "" ? null : religionRaw;
  if (religion !== null && !isReligion(religion)) return { error: "종교를 다시 골라주세요." };

  const admin = createAdminClient();
  if (religion !== null && !setup.consents.religion) {
    if (!agreeReligion) return { error: "종교를 입력하려면 민감정보 수집·이용에 동의해주세요. 입력하지 않아도 매칭할 수 있어요." };
    const { error } = await admin.from("consents").upsert({ user_id: userId, kind: "religion" });
    if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };
  }

  const isNew = !setup.matchProfile;
  let filters: Filters = setup.matchProfile?.filters ?? defaultFilters({ birthYear: setup.birthYear, region }, kstYear());
  // 내 종교를 지우면 종교 조건도 풀린다 (종교 조건은 내 종교를 입력한 사람만 걸 수 있다)
  if (religion === null && filters.religion.mode !== "any") filters = { ...filters, religion: { ...filters.religion, mode: "any", list: [] } };

  const { error } = await admin.from("match_profiles").upsert({
    user_id: userId,
    region,
    height,
    intro,
    religion,
    filters,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };

  // 종교를 지웠으면 동의 기록도 지운다 (최소 수집)
  if (religion === null && setup.consents.religion) {
    await admin.from("consents").delete().eq("user_id", userId).eq("kind", "religion");
  }

  if (isNew) redirect("/me/filters?first=1");
  return { error: null, saved: true };
}

// ---------------------------------------------------------------------------
// 원하는 상대 조건
// ---------------------------------------------------------------------------

async function currentMe(userId: string): Promise<{ me: MatchPerson; next: string } | null> {
  const setup = await loadMySetup(userId);
  if (!setup?.matchProfile) return null;
  const admin = createAdminClient();
  const { data: scoreRow } = await admin.from("test_scores").select("scores").eq("user_id", userId).maybeSingle();
  if (!scoreRow) return null;
  const s = scoreRow.scores as Scores;
  return {
    me: {
      id: userId,
      gender: setup.gender,
      birthYear: setup.birthYear,
      region: setup.matchProfile.region,
      height: setup.matchProfile.height,
      religion: setup.matchProfile.religion,
      smoking: s.dealbreakers.smoking,
      marriage: s.dealbreakers.marriage,
      children: s.dealbreakers.children,
      filters: setup.matchProfile.filters,
    },
    next: nextSetupPath(setup, "filters"),
  };
}

/** 조건을 바꿀 때마다 "지금 조건에 맞는 사람 n명"을 다시 센다 */
export async function countMatches(draft: unknown): Promise<{ count: number } | { error: string }> {
  const userId = await getUserId();
  if (!userId) return { error: "로그인이 풀렸어요." };
  // 전체 후보를 읽는 무거운 계산이라 횟수를 제한한다
  if (!(await allow(`count:${userId}`, 40, 60))) return { error: TOO_MANY };
  const current = await currentMe(userId);
  if (!current) return { error: "내 정보를 먼저 입력해주세요." };
  const filters = sanitizeFilters(draft, { religion: current.me.religion });
  if ("error" in filters) return { error: filters.error };
  const pool = await loadPool(createAdminClient());
  return { count: countMutualMatches({ ...current.me, filters }, pool) };
}

export async function saveFilters(draft: unknown): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if (!(await allow(`filters:${userId}`, 60, 3600))) return { ok: false, error: TOO_MANY };
  const current = await currentMe(userId);
  if (!current) return { ok: false, error: "내 정보를 먼저 입력해주세요." };
  const filters = sanitizeFilters(draft, { religion: current.me.religion });
  if ("error" in filters) return { ok: false, error: filters.error };

  const { error } = await createAdminClient()
    .from("match_profiles")
    .update({ filters, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };
  return { ok: true, next: current.next };
}

// ---------------------------------------------------------------------------
// 연락처
// ---------------------------------------------------------------------------

export async function saveContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUser();
  if (!(await allow(`contact:${userId}`, 30, 3600))) return { error: TOO_MANY };
  const instagram = normalizeInstagram(String(formData.get("instagram") ?? ""));
  const kakao = normalizeKakao(String(formData.get("kakao") ?? ""));
  if (instagram === null) return { error: "인스타그램 아이디를 확인해주세요. 영문, 숫자, 마침표, 밑줄만 쓸 수 있어요." };
  if (kakao === null) return { error: "카카오톡 ID를 확인해주세요. 영문, 숫자, 마침표, 밑줄, 하이픈 4~20자예요." };
  if (!instagram && !kakao) return { error: "인스타그램과 카카오톡 중 하나 이상 입력해주세요." };

  let row: { user_id: string; instagram: string | null; kakao: string | null; updated_at: string };
  try {
    row = {
      user_id: userId,
      instagram: instagram ? encryptText(instagram) : null,
      kakao: kakao ? encryptText(kakao) : null,
      updated_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error(e);
    return { error: "서버 설정 문제로 저장하지 못했어요. 운영자에게 알려주세요." };
  }
  const { error } = await createAdminClient().from("contacts").upsert(row);
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };

  const setup = await loadMySetup(userId);
  redirect(setup ? nextSetupPath(setup, "contact") : "/match");
}

// ---------------------------------------------------------------------------
// 사진
// ---------------------------------------------------------------------------

/** 하루에 AI 사진 분석을 시도할 수 있는 횟수 (거절된 사진 포함, 비용 보호용) */
const MAX_ATTEMPTS_PER_DAY = 10;
const MAX_BYTES = 3 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type UploadResult =
  | { ok: true; feedback: UserView }
  | { ok: false; error: string; rejected?: boolean };

export async function uploadPhoto(formData: FormData): Promise<UploadResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if (!(formData instanceof FormData)) return { ok: false, error: "잘못된 요청이에요." };
  if (!(await allow(`photo:${userId}`, 30, 3600))) return { ok: false, error: TOO_MANY };

  const slot = String(formData.get("slot") ?? "") as PhotoSlot;
  if (slot !== "face" && slot !== "body") return { ok: false, error: "사진 종류가 올바르지 않아요." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "사진을 골라주세요." };
  if (!MIME_EXT[file.type]) return { ok: false, error: "JPG, PNG, WEBP 사진만 올릴 수 있어요." };
  if (file.size > MAX_BYTES) return { ok: false, error: "사진이 너무 커요. 다시 찍어주세요." };

  const setup = await loadMySetup(userId);
  if (!setup) return { ok: false, error: "프로필을 먼저 만들어주세요." };

  const admin = createAdminClient();

  // 국외 이전 동의 (OpenAI로 사진 전송)
  if (!setup.consents.photoOverseas) {
    if (formData.get("agreeOverseas") !== "on") {
      return { ok: false, error: "사진 피드백을 받으려면 국외 이전에 동의해주세요. 동의하지 않으면 사진을 등록할 수 없어요." };
    }
    const { error } = await admin.from("consents").upsert({ user_id: userId, kind: "photo_overseas" });
    if (error) return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };
  }

  // 하루 1회 교체: 처음 등록은 횟수에 넣지 않고, 교체만 한국 날짜 기준 하루 한 번
  const today = kstDay();
  const { data: history } = await admin.from("photos").select("created_at").eq("user_id", userId).eq("slot", slot);
  if (!canUploadToday((history ?? []).map((p) => p.created_at))) {
    return { ok: false, error: "사진은 하루에 한 번 바꿀 수 있어요. 내일 다시 바꿔주세요." };
  }

  // 시도 횟수 제한
  const since = new Date(`${today}T00:00:00+09:00`).toISOString();
  const { count } = await admin
    .from("photo_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_ATTEMPTS_PER_DAY) {
    return { ok: false, error: "오늘은 사진 분석을 많이 시도했어요. 내일 다시 시도해주세요." };
  }

  const image = Buffer.from(await file.arrayBuffer());
  // 확장자나 file.type은 바꿀 수 있으니 실제 파일 내용으로 형식을 확인한다
  const mimeType = sniffImage(image);
  if (!mimeType) return { ok: false, error: "사진 파일이 아니에요. 다시 찍어주세요." };
  const current = setup.photos[slot];
  const previous: Improvement[] = current?.feedback?.improvements ?? [];
  const result = await analyzePhoto({ image, mimeType, slot, gender: setup.gender, previous });

  const logAttempt = (r: string) => admin.from("photo_attempts").insert({ user_id: userId, slot, result: r });

  if (!result.ok) {
    await logAttempt("error");
    return { ok: false, error: `${result.error} 피드백 없이는 등록되지 않아요.` };
  }
  if (!result.valid) {
    await logAttempt("rejected");
    return { ok: false, rejected: true, error: result.rejectReason };
  }

  const path = `${userId}/${slot}-${randomUUID()}.${MIME_EXT[mimeType]}`;
  const { error: uploadError } = await admin.storage.from("photos").upload(path, image, { contentType: mimeType });
  if (uploadError) {
    await logAttempt("error");
    return { ok: false, error: "사진을 저장하지 못했어요. 다시 시도해주세요." };
  }

  const now = new Date().toISOString();
  if (current) await admin.from("photos").update({ replaced_at: now }).eq("id", current.id);
  const { error: insertError } = await admin
    .from("photos")
    .insert({ user_id: userId, slot, path, feedback: result.userView, internal: result.internal, created_at: now });
  if (insertError) {
    // 되돌리기: 이전 사진을 다시 쓰고, 방금 올린 파일은 지운다
    if (current) await admin.from("photos").update({ replaced_at: null }).eq("id", current.id);
    await admin.storage.from("photos").remove([path]);
    await logAttempt("error");
    return { ok: false, error: "사진을 저장하지 못했어요. 다시 시도해주세요." };
  }
  await logAttempt("registered");
  return { ok: true, feedback: result.userView };
}

// ---------------------------------------------------------------------------
// 매칭 쉬기
// ---------------------------------------------------------------------------

export async function setPaused(paused: boolean): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId || typeof paused !== "boolean") return { ok: false };
  const { error } = await createAdminClient()
    .from("match_profiles")
    .update({ paused, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { ok: !error };
}
