"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/buttons";
import { ErrorText, fieldClass } from "@/components/ui";
import { CodeBoxes, OTP_LENGTH } from "./CodeBoxes";
import { forgetTheme } from "@/components/ThemeSync";
import { createClient } from "@/lib/supabase/client";

/**
 * 이메일로 인증 코드를 받아 확인한다. 확인되면 비밀번호 만들기 화면으로 간다.
 * - signup: 처음 가입 (계정이 없으면 만든다)
 * - reset: 비밀번호 찾기 (가입된 이메일만)
 */
export function EmailCodeForm({ mode }: { mode: "signup" | "reset" }) {
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

  /** 6자리를 다 넣으면 바로 확인한다 (버튼으로도 확인할 수 있다) */
  async function verify(token: string) {
    if (!sentTo || busy || token.length !== OTP_LENGTH) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: sentTo, token, type: "email" });
    if (error) {
      setBusy(false);
      setCode(""); // 다시 넣기 쉽게 비운다
      setError("코드가 맞지 않거나 만료됐어요. 메일의 최신 코드를 다시 넣어주세요.");
      return;
    }
    // 로그인 상태가 바뀌었으니 페이지를 새로 연다 (PasswordLoginForm과 같은 이유)
    forgetTheme(); // 이 기기에 남은 이전 계정의 성별 색을 지운다
    window.location.replace(`/set-password?mode=${mode}`);
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verify(code);
      }}
      className="mt-8 space-y-6"
    >
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
      <div>
        <label htmlFor="email-code" className="text-sm font-semibold">
          메일에 있는 {OTP_LENGTH}자리 숫자
        </label>
        <div className="mt-2">
          <CodeBoxes value={code} onChange={setCode} onComplete={verify} disabled={busy} />
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton type="submit" disabled={busy || code.length < OTP_LENGTH}>
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
