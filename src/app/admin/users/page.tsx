import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { loadMembers } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoading } from "../ui";
import { FILTERS, UsersView } from "./UsersView";

export const metadata: Metadata = { title: "회원 | 한결 관리", robots: { index: false, follow: false } };

export default function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <UsersGate searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersGate({ searchParams }: { searchParams: PageProps<"/admin/users">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const filter = FILTERS.find((f) => f.id && f.id === sp.stage)?.id ?? null;

  const { members } = await loadMembers(createAdminClient());
  return <UsersView members={members} q={q} filter={filter} />;
}
