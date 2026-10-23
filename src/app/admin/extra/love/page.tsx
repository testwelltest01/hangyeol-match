import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { parseLoveSample } from "@/lib/admin/loveSample";
import { loadGenderOf } from "@/lib/admin/trendData";
import { loadAllLove } from "@/lib/love/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoading } from "../../ui";
import { LoveStatsView } from "./LoveStatsView";

export const metadata: Metadata = { title: "연애 상황 검사 통계 | 한결 관리", robots: { index: false, follow: false } };

export default function LoveStatsPage({ searchParams }: PageProps<"/admin/extra/love">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <LoveStatsGate searchParams={searchParams} />
    </Suspense>
  );
}

async function LoveStatsGate({ searchParams }: { searchParams: PageProps<"/admin/extra/love">["searchParams"] }) {
  await requireAdmin();
  const sample = parseLoveSample(await searchParams);
  const admin = createAdminClient();
  const [all, genderOf] = await Promise.all([loadAllLove(admin), loadGenderOf(admin)]);
  const rows = all.map((r) => ({ ...r, gender: r.user_id ? genderOf(r.user_id) : ("unknown" as const) }));
  return <LoveStatsView all={rows} sample={sample} />;
}
