import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmailCodeForm } from "@/components/auth/EmailCodeForm";
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
  return <EmailCodeForm mode="signup" />;
}
