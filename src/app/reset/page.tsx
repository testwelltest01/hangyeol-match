import Link from "next/link";
import { EmailCodeForm } from "@/components/auth/EmailCodeForm";
import { Shell } from "@/components/Shell";

export default function ResetPage() {
  return (
    <Shell>
      <h1 className="font-serif text-3xl font-bold">비밀번호 찾기</h1>
      <p className="mt-3 text-ink-soft">가입한 이메일로 인증 코드를 보내드려요. 확인되면 새 비밀번호를 정할 수 있어요.</p>
      <EmailCodeForm mode="reset" />
      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/login" className="underline underline-offset-4">
          로그인으로 돌아가기
        </Link>
      </p>
    </Shell>
  );
}
