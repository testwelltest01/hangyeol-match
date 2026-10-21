"use server";

import { after } from "next/server";
import {
  collectFeatures,
  createPending,
  loadIllustrations,
  overDailyCap,
  runIllustration,
  usedByAccount,
} from "@/lib/illustration/server";
import { ILLUSTRATIONS_PER_ACCOUNT } from "@/lib/illustration/prompt";
import { canDelete } from "@/lib/illustration/rules";
import { loadMySetup } from "@/lib/match/me";
import { getProgress } from "@/lib/progress";
import { allow, TOO_MANY, UUID_RE } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** 그림 그리기 시작 (다시 그리기·새로 그리기). 응답은 바로 보내고, 그리는 일은 after()에서 이어간다 (최대 300초) */
export async function createIllustration(): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if ((await getProgress(userId)) !== "report") return { ok: false, error: "검사를 먼저 마쳐주세요." };
  if (!(await allow(`illust:${userId}`, 10, 3600))) return { ok: false, error: TOO_MANY };

  const setup = await loadMySetup(userId);
  if (!setup?.matchProfile || !setup.photos.face || !setup.photos.body) {
    return { ok: false, error: "내 정보와 사진 2장을 먼저 채워주세요." };
  }
  if (setup.suspended) return { ok: false, error: "신고가 접수되어 지금은 이용할 수 없어요." };

  const admin = createAdminClient();
  const rows = await loadIllustrations(admin, userId);
  if (rows.some((r) => r.status === "pending")) return { ok: false, error: "지금 그리고 있어요. 조금만 기다려주세요." };
  // 동의는 처음 정보 입력에서 받는다 (없으면 보내지 않는다)
  if (!setup.consents.illustration) return { ok: false, error: "그림 프로필 동의 기록이 없어요. 운영자에게 알려주세요." };
  if ((await usedByAccount(admin, userId)) >= ILLUSTRATIONS_PER_ACCOUNT) {
    return { ok: false, error: `그림은 한 계정당 ${ILLUSTRATIONS_PER_ACCOUNT}번까지 그릴 수 있어요. 남아 있는 그림 중에서 골라주세요.` };
  }
  if (await overDailyCap(admin)) return { ok: false, error: "오늘은 그림 요청이 많아 잠시 쉬어요. 내일 다시 시도해주세요." };

  const features = await collectFeatures(admin, userId);
  if (!features) return { ok: false, error: "정보를 불러오지 못했어요." };
  const id = await createPending(admin, userId, features);
  if (!id) return { ok: false, error: "시작하지 못했어요. 다시 시도해주세요." };

  after(() => runIllustration(createAdminClient(), userId, id, features));
  return { ok: true };
}

async function own(id: unknown) {
  const userId = await getUserId();
  if (!userId) return { error: "로그인이 풀렸어요. 다시 로그인해주세요." } as const;
  if (typeof id !== "string" || !UUID_RE.test(id)) return { error: "잘못된 요청이에요." } as const;
  if (!(await allow(`illust-edit:${userId}`, 60, 3600))) return { error: TOO_MANY } as const;
  const admin = createAdminClient();
  const { data } = await admin
    .from("illustrations")
    .select("id, status, path, shown")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return { error: "그림을 찾을 수 없어요." } as const;
  return { userId, admin, row: data } as const;
}

/** 이 그림을 뺀 내 다 그린 그림 (최근 순) */
async function otherDone(admin: ReturnType<typeof createAdminClient>, userId: string, except: string) {
  const { data } = await admin
    .from("illustrations")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "done")
    .is("deleted_at", null)
    .neq("id", except)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** 추천 카드에 보여줄 그림 고르기. 그림 프로필은 꼭 있어야 해서 숨기기는 없고, 보여주는 그림은 한 사람에 하나 */
export async function chooseIllustration(id: string): Promise<Result> {
  const o = await own(id);
  if ("error" in o) return { ok: false, error: o.error ?? "잘못된 요청이에요." };
  if (o.row.status !== "done") return { ok: false, error: "다 그린 그림만 고를 수 있어요." };
  await o.admin.from("illustrations").update({ shown: false }).eq("user_id", o.userId).eq("shown", true).neq("id", id);
  const { error } = await o.admin.from("illustrations").update({ shown: true }).eq("id", id);
  return error ? { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." } : { ok: true };
}

/** 그림 지우기 (파일도 지운다). 마지막 남은 그림은 지울 수 없다. 보여주던 그림을 지우면 남은 그림 중 가장 최근 것을 보여준다 */
export async function deleteIllustration(id: string): Promise<Result> {
  const o = await own(id);
  if ("error" in o) return { ok: false, error: o.error ?? "잘못된 요청이에요." };
  const others = await otherDone(o.admin, o.userId, id);
  const doneCount = others.length + (o.row.status === "done" ? 1 : 0);
  if (!canDelete(o.row.status, doneCount)) {
    return {
      ok: false,
      error: o.row.status === "pending" ? "그리는 중에는 지울 수 없어요." : "그림 프로필은 하나는 꼭 있어야 해요. 새로 그린 뒤에 지워주세요.",
    };
  }
  if (o.row.path) await o.admin.storage.from("photos").remove([o.row.path]);
  const { error } = await o.admin.from("illustrations").update({ deleted_at: new Date().toISOString(), shown: false }).eq("id", id);
  if (error) return { ok: false, error: "지우지 못했어요. 다시 시도해주세요." };
  if (o.row.shown && others[0]) await o.admin.from("illustrations").update({ shown: true }).eq("id", others[0].id);
  return { ok: true };
}
