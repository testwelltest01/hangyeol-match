"use server";

import { getAdmin } from "@/lib/admin/auth";
import { SITUATIONS, type SituationId } from "@/lib/love/prompt";
import { isScene, loadSceneRows, startSceneImages } from "@/lib/love/sceneImages";
import { allow, TOO_MANY } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

/**
 * 연애 상황 보고서 장면 사진 만들기 (관리자만). which: 'missing' = 아직 없거나 실패한 장면 모두, 아니면 장면 id 하나(다시 만들기).
 * 이미지 생성 비용이 들어서 10분에 4번까지
 */
export async function makeSceneImages(which: unknown): Promise<Result> {
  const me = await getAdmin();
  if (!me) return { ok: false, error: "권한이 없어요." };
  if (which !== "missing" && !isScene(which)) return { ok: false, error: "잘못된 요청이에요." };
  if (!(await allow(`scenes:${me.userId}`, 4, 600))) return { ok: false, error: TOO_MANY };

  const admin = createAdminClient();
  const rows = await loadSceneRows(admin);
  const byId = new Map(rows.map((r) => [r.scene, r]));
  const ids: SituationId[] =
    which === "missing"
      ? SITUATIONS.map((s) => s.id).filter((id) => {
          const r = byId.get(id);
          return !r || (r.status !== "pending" && !r.path) || r.status === "failed";
        })
      : byId.get(which as SituationId)?.status === "pending"
        ? []
        : [which as SituationId];
  if (!ids.length) return { ok: false, error: which === "missing" ? "새로 만들 장면이 없어요." : "이미 만드는 중이에요." };
  console.info(`[admin] ${me.userId} scene images ${ids.join(",")}`);
  return startSceneImages(admin, ids);
}
