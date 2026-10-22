import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Callout } from "@/components/app-ui";
import { EmailCodeForm } from "@/components/auth/EmailCodeForm";
import { GUEST_CLAIM_COOKIE } from "@/lib/love/guest";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { getUserId } from "@/lib/supabase/server";

export default function SignupPage() {
  return (
    <Shell>
      <h1 className="font-serif text-[1.65rem] font-bold leading-tight">가입하기</h1>
      <p className="mt-3 text-ink-soft">이메일로 받은 인증 코드로 확인한 뒤, 다음부터 쓸 비밀번호를 만들어요.</p>
      <Suspense
        fallback={
          <div className="mt-8">
            <Loading />
          </div>
        }
      >
        <SignupGate />
      </Suspense>
      <p className="mt-8 text-center text-sm text-muted">
        이미 가입했어요.{" "}
        <Link href="/login" className="font-semibold text-indigo underline underline-offset-4">
          로그인
        </Link>
      </p>
    </Shell>
  );
}

async function SignupGate() {
  if (await getUserId()) redirect("/start");
  // 가입 전에 공유 링크로 연애 상황 검사를 했으면(/love/claim이 남긴 쿠키) 가입하면 그 보고서가 계정에 저장된다고 알려준다
  const fromLove = Boolean((await cookies()).get(GUEST_CLAIM_COOKIE));
  return (
    <>
      {fromLove && (
        <div className="mt-6">
          <Callout>가입하면 방금 받은 연애 상황 보고서가 이 계정에 그대로 저장돼요.</Callout>
        </div>
      )}
      <EmailCodeForm mode="signup" />
    </>
  );
}
