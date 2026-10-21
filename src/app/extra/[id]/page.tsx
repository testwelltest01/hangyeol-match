import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { loadExtraResults } from "@/lib/extra/server";
import { findExtraTest } from "@/lib/extra/tests";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { ExtraForm } from "./ExtraForm";

export const metadata: Metadata = { title: "더 알아보기 | 한결", robots: { index: false, follow: false } };

export default function ExtraPage({ params }: PageProps<"/extra/[id]">) {
  return (
    <Shell back={{ href: "/report#extra", label: "내 결" }}>
      <Suspense fallback={<Loading />}>
        <ExtraGate params={params} />
      </Suspense>
    </Shell>
  );
}

async function ExtraGate({ params }: { params: PageProps<"/extra/[id]">["params"] }) {
  const { id } = await params;
  const test = findExtraTest(id);
  if (!test) notFound();
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);

  const rows = await loadExtraResults(createAdminClient(), userId!);
  const prev = rows[test.id];
  return <ExtraForm test={test} initial={prev?.answers ?? {}} initialShare={prev?.share ?? true} />;
}
