import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { PageTitle } from "@/components/ui";
import { kstYear } from "@/lib/day";
import { ageOf } from "@/lib/match/filters";
import { loadMySetup } from "@/lib/match/me";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";
import { FiltersForm } from "./FiltersForm";

export default function FiltersPage({ searchParams }: PageProps<"/me/filters">) {
  return (
    <Shell back={{ href: "/me", label: "내 정보" }}>
      <PageTitle
        title="원하는 상대 조건"
        lead="조건마다 '꼭'과 '되도록'을 고를 수 있어요. '꼭'이 어긋나면 서로 추천하지 않고, '되도록'은 추천은 하되 순서를 뒤로 미뤄요."
      />
      <Suspense fallback={<Loading />}>
        <FiltersGate searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

async function FiltersGate({ searchParams }: { searchParams: PageProps<"/me/filters">["searchParams"] }) {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");
  if (!setup.matchProfile) redirect("/me/profile");
  const { first } = await searchParams;

  const year = kstYear();
  return (
    <FiltersForm
      initial={setup.matchProfile.filters}
      me={{
        age: ageOf(setup.birthYear, year),
        height: setup.matchProfile.height,
        religion: setup.matchProfile.religion,
        region: setup.matchProfile.region,
      }}
      year={year}
      first={first === "1"}
    />
  );
}
