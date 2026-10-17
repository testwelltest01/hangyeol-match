import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { loadMembers, loadReports } from "@/lib/admin/data";
import { kstDay } from "@/lib/day";
import { fetchAll } from "@/lib/match/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardView } from "./DashboardView";
import { AdminLoading } from "./ui";

export const metadata: Metadata = { title: "관리 | 한결", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <DashboardGate />
    </Suspense>
  );
}

async function DashboardGate() {
  await requireAdmin();
  const admin = createAdminClient();
  const today = kstDay();
  const [{ members, reactions }, reports, recsToday, recsAll, feedback] = await Promise.all([
    loadMembers(admin),
    loadReports(admin),
    admin.from("recommendations").select("target_id", { count: "exact", head: true }).eq("day", today),
    admin.from("recommendations").select("target_id", { count: "exact", head: true }),
    fetchAll<{ outcome: string }>((a, b) => admin.from("meeting_feedback").select("outcome").range(a, b)),
  ]);

  return (
    <DashboardView
      members={members}
      reactions={reactions}
      reports={reports}
      recsToday={recsToday.count ?? 0}
      recsAll={recsAll.count ?? 0}
      feedback={feedback}
      now={new Date()}
    />
  );
}
