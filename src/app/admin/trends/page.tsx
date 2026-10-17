import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { loadGenderOf, loadTrendEvents } from "@/lib/admin/trendData";
import { buildTrend, METRICS, PERIODS, type Metric } from "@/lib/admin/trends";
import { daysBefore, kstDay } from "@/lib/day";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoading } from "../ui";
import { TrendsView } from "./TrendsView";

export const metadata: Metadata = { title: "추세 | 한결 관리", robots: { index: false, follow: false } };

export default function TrendsPage({ searchParams }: PageProps<"/admin/trends">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <TrendsGate searchParams={searchParams} />
    </Suspense>
  );
}

async function TrendsGate({ searchParams }: { searchParams: PageProps<"/admin/trends">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const metric: Metric = METRICS.find((m) => m.id === sp.metric)?.id ?? "visit";
  const days = PERIODS.find((p) => String(p) === sp.days) ?? 30;

  const today = kstDay();
  // 한국 날짜로 기간 첫날 0시부터
  const since = new Date(`${daysBefore(today, days - 1)}T00:00:00+09:00`).toISOString();
  const admin = createAdminClient();
  const [genderOf, { events, available }] = await Promise.all([loadGenderOf(admin), loadTrendEvents(admin, metric, since)]);

  return <TrendsView metric={metric} days={days} trend={buildTrend(events, genderOf, days, today)} available={available} />;
}
