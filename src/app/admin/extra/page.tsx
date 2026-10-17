import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { loadGenderOf } from "@/lib/admin/trendData";
import { loadAllExtra } from "@/lib/extra/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoading } from "../ui";
import { ExtraView, type Row } from "./ExtraView";

export const metadata: Metadata = { title: "추가 검사 | 한결 관리", robots: { index: false, follow: false } };

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
  const [{ available, rows }, genderOf] = await Promise.all([loadAllExtra(admin), loadGenderOf(admin)]);
  const all: Row[] = rows.map((r) => ({ ...r, gender: genderOf(r.user_id) }));
  return <ExtraView available={available} all={all} />;
}
