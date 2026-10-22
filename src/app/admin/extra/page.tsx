import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { loadGenderOf } from "@/lib/admin/trendData";
import { loadAllExtra } from "@/lib/extra/server";
import { kstTime } from "@/lib/admin/data";
import { SITUATIONS } from "@/lib/love/prompt";
import { loadSceneRows, publicSceneUrl } from "@/lib/love/sceneImages";
import { loadAllLove } from "@/lib/love/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoading } from "../ui";
import { ExtraView, type LoveRowG, type Row } from "./ExtraView";
import type { SceneItem } from "./ScenePanel";

export const metadata: Metadata = { title: "추가 검사 | 한결 관리", robots: { index: false, follow: false } };

// 장면 사진 만들기는 응답 뒤 after()에서 한다
export const maxDuration = 300;

export default function ExtraAdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ExtraGate />
    </Suspense>
  );
}

async function ExtraGate() {
  await requireAdmin();
  const admin = createAdminClient();
  const [rows, loveRows, genderOf, sceneRows] = await Promise.all([
    loadAllExtra(admin),
    loadAllLove(admin),
    loadGenderOf(admin),
    loadSceneRows(admin).catch(() => []),
  ]);
  const sceneById = new Map(sceneRows.map((r) => [r.scene, r]));
  const scenes: SceneItem[] = SITUATIONS.map((s) => {
    const r = sceneById.get(s.id);
    return {
      id: s.id,
      title: s.title,
      status: r?.status ?? "none",
      url: r?.path ? publicSceneUrl(admin, r.path) : null,
      error: r?.error ?? null,
      updated: r ? kstTime(r.updated_at) : null,
    };
  });
  const all: Row[] = rows.map((r) => ({ ...r, gender: genderOf(r.user_id) }));
  const love: LoveRowG[] = loveRows.map((r) => ({ ...r, gender: r.user_id ? genderOf(r.user_id) : "unknown" }));
  return <ExtraView all={all} love={love} scenes={scenes} />;
}
