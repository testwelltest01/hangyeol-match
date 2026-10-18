"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/buttons";
import { ErrorText, fieldClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * 이메일로 인증 코드를 받아 확인한다. 확인되면 비밀번호 만들기 화면으로 간다.
 * - signup: 처음 가입 (계정이 없으면 만든다)
 * - reset: 비밀번호 찾기 (가입된 이메일만)
 */
export function EmailCodeForm({ mode }: { mode: "signup" | "reset" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: mode === "signup", emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setBusy(false);
    if (error?.status === 429) {
      setError("잠시 후 다시 시도해주세요. 짧은 시간에 너무 많이 요청했어요.");
      return;
    }
    // 비밀번호 찾기에서는 가입되지 않은 이메일이어도 같은 화면을 보여준다 (가입 여부 노출 방지)
    if (error && mode === "signup") {
      setError("코드를 보내지 못했어요. 이메일 주소를 확인해주세요.");
      return;
    }
    setSentTo(email.trim());
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" });
    if (error) {
      setBusy(false);
      setError("코드가 맞지 않거나 만료됐어요. 메일의 최신 코드를 입력해주세요.");
      return;
    }
    router.replace(`/set-password?mode=${mode}`);
    router.refresh();
  }

  if (!sentTo) {
    return (
      <form onSubmit={sendCode} className="mt-8 space-y-6">
        <label className="block">
          <span className="text-sm font-semibold">이메일</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={fieldClass}
          />
        </label>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton type="submit" disabled={busy || !email}>
          {busy ? "보내는 중" : "인증 코드 받기"}
        </PrimaryButton>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="mt-8 space-y-6">
      <p className="text-ink-soft">
        {mode === "reset" ? (
          <>
            <strong className="text-ink">{sentTo}</strong>이 가입된 이메일이면 인증 코드를 보냈어요.
          </>
        ) : (
          <>
            <strong className="text-ink">{sentTo}</strong>로 인증 코드를 보냈어요.
          </>
        )}{" "}
        메일이 안 보이면 스팸함도 확인해주세요.
      </p>
      <label className="block">
        <span className="text-sm font-semibold">인증 코드</span>
        <input
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6,10}"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="메일에 있는 숫자"
          className={`${fieldClass} tracking-[0.3em]`}
        />
      </label>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton type="submit" disabled={busy || code.length < 6}>
        {busy ? "확인하는 중" : "확인"}
      </PrimaryButton>
      <button
        type="button"
        onClick={() => {
          setSentTo(null);
          setCode("");
        }}
        className="w-full text-center text-sm text-muted underline underline-offset-4"
      >
        다른 이메일로 받기
      </button>
    </form>
  );
}
