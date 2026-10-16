import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { getUserId } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Shell>
      <h1 className="font-serif text-3xl font-bold">이메일로 시작하기</h1>
      <p className="mt-3 text-ink-soft">
        이메일로 받은 인증 코드를 입력하면 로그인돼요. 처음이면 계정이 자동으로 만들어져요.
      </p>
      <Suspense fallback={<div className="mt-8"><Loading /></div>}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

/** 이미 로그인했으면 다음 단계로 보내고, 아니면 로그인 폼을 보여준다. */
async function LoginGate({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  if (await getUserId()) redirect("/start");
  const { error } = await searchParams;
  return (
    <>
      {error === "link" && (
        <p role="alert" className="mt-4 text-alert">
          로그인 링크가 만료됐거나 다른 브라우저에서 열렸어요. 아래에서 코드를 다시 받아주세요.
        </p>
      )}
      <LoginForm />
    </>
  );
}
