import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { fitRange, suggestK, type LpaModel } from "@/lib/admin/lpa";
import { loadLpaRows } from "@/lib/admin/lpaData";
import { findLpaSet } from "@/lib/admin/lpaSets";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoading } from "../ui";
import { LpaView, MIN_LPA_N } from "./LpaView";

export const metadata: Metadata = { title: "LPA | 한결 관리", robots: { index: false, follow: false } };
// 사람이 많아지면 계산이 길어질 수 있다
export const maxDuration = 60;

const MAX_K = 6;

export default function LpaPage({ searchParams }: PageProps<"/admin/lpa">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <LpaGate searchParams={searchParams} />
    </Suspense>
  );
}

async function LpaGate({ searchParams }: { searchParams: PageProps<"/admin/lpa">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const set = findLpaSet(sp.set);
  const model: LpaModel = sp.model === "varying" ? "varying" : "equal";

  const rows = await loadLpaRows(createAdminClient(), set);
  const X = rows.map((r) => r.x);
  const n = X.length;
  const d = set.indicators.length;
  const mean = Array.from({ length: d }, (_, j) => (n ? X.reduce((a, x) => a + x[j], 0) / n : 0));
  const sd = Array.from({ length: d }, (_, j) => (n ? Math.sqrt(X.reduce((a, x) => a + (x[j] - mean[j]) ** 2, 0) / n) : 0));

  const results = n >= MIN_LPA_N ? fitRange(X, MAX_K, { model }) : [];
  const suggested = suggestK(results);
  const asked = Number(sp.k);
  const selected = results.find((r) => r.k === asked) ?? results.find((r) => r.k === suggested) ?? null;

  return (
    <LpaView
      set={set}
      model={model}
      n={n}
      genders={rows.map((r) => r.gender)}
      results={results}
      selected={selected}
      suggested={suggested}
      overall={{ mean, sd }}
    />
  );
}
