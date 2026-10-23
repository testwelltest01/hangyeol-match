import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { daysBefore, kstDay } from "@/lib/day";
import { createAdminClient } from "@/lib/supabase/admin";
import { usdKrw } from "@/lib/usage/prices";
import { loadRecentFailures, loadUsageRows } from "@/lib/usage/server";
import { buildUsage, USAGE_METRICS, USAGE_PERIODS, type UsageMetric } from "@/lib/usage/stats";
import { AdminLoading } from "../ui";
import { UsageView } from "./UsageView";

export const metadata: Metadata = { title: "API 사용량 | 한결 관리", robots: { index: false, follow: false } };

export default function UsagePage({ searchParams }: PageProps<"/admin/usage">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <UsageGate searchParams={searchParams} />
    </Suspense>
  );
}

async function UsageGate({ searchParams }: { searchParams: PageProps<"/admin/usage">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const metric: UsageMetric = USAGE_METRICS.find((m) => m.id === sp.metric)?.id ?? "cost";
  const days = USAGE_PERIODS.find((p) => String(p) === sp.days) ?? 30;

  const today = kstDay();
  // 한국 날짜로 기간 첫날 0시부터
  const since = new Date(`${daysBefore(today, days - 1)}T00:00:00+09:00`).toISOString();
  const admin = createAdminClient();
  const [{ rows, missing }, failures] = await Promise.all([loadUsageRows(admin, since), loadRecentFailures(admin, since)]);

  return <UsageView metric={metric} days={days} stats={buildUsage(rows, days, today)} rate={usdKrw()} missing={missing} failures={failures} />;
}
