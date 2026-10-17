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
import { loadMySetup } from "@/lib/match/me";
import { getProgress } from "@/lib/progress";
import { allow, TOO_MANY, UUID_RE } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** 그림 그리기 시작. 응답은 바로 보내고, 그리는 일은 after()에서 이어간다 (최대 300초) */
export async function createIllustration(agree: boolean): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if (typeof agree !== "boolean") return { ok: false, error: "잘못된 요청이에요." };
  if ((await getProgress(userId)) !== "report") return { ok: false, error: "검사를 먼저 마쳐주세요." };
  if (!(await allow(`illust:${userId}`, 10, 3600))) return { ok: false, error: TOO_MANY };

  const setup = await loadMySetup(userId);
  if (!setup?.matchProfile || !setup.photos.face || !setup.photos.body) {
    return { ok: false, error: "내 정보와 사진 2장을 먼저 채워주세요." };
  }
  if (setup.suspended) return { ok: false, error: "신고가 접수되어 지금은 이용할 수 없어요." };

  const admin = createAdminClient();
  const { available, rows } = await loadIllustrations(admin, userId);
  if (!available) return { ok: false, error: "그림 프로필을 준비하고 있어요." };
  if (rows.some((r) => r.status === "pending")) return { ok: false, error: "지금 그리고 있어요. 조금만 기다려주세요." };

  const { data: consent } = await admin.from("consents").select("kind").eq("user_id", userId).eq("kind", "illustration").maybeSingle();
  if (!consent) {
    if (!agree) return { ok: false, error: "그림을 만들려면 사진과 정보 전송에 동의해주세요." };
    const { error } = await admin.from("consents").upsert({ user_id: userId, kind: "illustration" });
    if (error) return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };
  }
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

/** 추천 카드에 보여주기 / 숨기기. 보여주는 그림은 한 사람에 하나 */
export async function setIllustrationShown(id: string, shown: boolean): Promise<Result> {
  if (typeof shown !== "boolean") return { ok: false, error: "잘못된 요청이에요." };
  const o = await own(id);
  if ("error" in o) return { ok: false, error: o.error ?? "잘못된 요청이에요." };
  if (o.row.status !== "done") return { ok: false, error: "다 그린 그림만 보여줄 수 있어요." };
  if (shown) {
    await o.admin.from("illustrations").update({ shown: false }).eq("user_id", o.userId).eq("shown", true);
  }
  const { error } = await o.admin.from("illustrations").update({ shown }).eq("id", id);
  return error ? { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." } : { ok: true };
}

/** 그림 지우기 (파일도 지운다) */
export async function deleteIllustration(id: string): Promise<Result> {
  const o = await own(id);
  if ("error" in o) return { ok: false, error: o.error ?? "잘못된 요청이에요." };
  if (o.row.status === "pending") return { ok: false, error: "그리는 중에는 지울 수 없어요." };
  if (o.row.path) await o.admin.storage.from("photos").remove([o.row.path]);
  const { error } = await o.admin.from("illustrations").update({ deleted_at: new Date().toISOString(), shown: false }).eq("id", id);
  return error ? { ok: false, error: "지우지 못했어요. 다시 시도해주세요." } : { ok: true };
}
