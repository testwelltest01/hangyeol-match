import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { getAuth } from "@/lib/supabase/server";

const TEXT = {
  signup: { title: "비밀번호 만들기", lead: "이메일 확인이 끝났어요. 다음부터는 이메일과 이 비밀번호로 로그인해요." },
  first: { title: "비밀번호 만들기", lead: "이제 메일 코드 대신 비밀번호로 로그인해요. 한 번만 만들어주세요." },
  reset: { title: "새 비밀번호", lead: "이메일 확인이 끝났어요. 새로 쓸 비밀번호를 정해주세요." },
  change: { title: "비밀번호 바꾸기", lead: "새로 쓸 비밀번호를 정해주세요." },
} as const;

const AGAIN = {
  title: "이미 가입된 이메일이에요",
  lead: "이메일 확인이 끝났어요. 쓰던 비밀번호를 그대로 넣어도 되고, 새 비밀번호로 바꿔도 돼요.",
};

export default function SetPasswordPage({ searchParams }: PageProps<"/set-password">) {
  return (
    <Shell>
      <Suspense fallback={<Loading />}>
        <SetPasswordGate searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

async function SetPasswordGate({ searchParams }: { searchParams: PageProps<"/set-password">["searchParams"] }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const { mode: raw } = await searchParams;
  const mode = raw === "signup" || raw === "reset" || raw === "change" ? raw : auth.passwordSet ? "change" : "first";
  // 이미 가입된 이메일로 '회원가입'을 다시 한 경우: 코드 확인으로 그 계정에 로그인됐다. 쓰던 비밀번호를 그대로 넣어도 된다
  const t = mode === "signup" && auth.passwordSet ? AGAIN : TEXT[mode];
  return (
    <>
      <h1 className="font-serif text-[1.65rem] font-bold leading-tight">{t.title}</h1>
      <p className="mt-3 text-ink-soft">{t.lead}</p>
      <SetPasswordForm mode={mode} />
    </>
  );
}
