import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PasswordLoginForm } from "@/components/auth/PasswordLoginForm";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { getUserId } from "@/lib/supabase/server";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Shell>
      <h1 className="font-serif text-[1.65rem] font-bold leading-tight">로그인</h1>
      <Suspense
        fallback={
          <div className="mt-8">
            <Loading />
          </div>
        }
      >
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
          메일의 링크가 만료됐거나 다른 브라우저에서 열렸어요. 비밀번호로 로그인하거나 코드를 다시 받아주세요.
        </p>
      )}
      <PasswordLoginForm />
    </>
  );
}
