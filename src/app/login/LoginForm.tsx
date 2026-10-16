"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/Shell";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-base text-ink placeholder:text-muted focus:border-indigo focus:outline-none";

export function LoginForm() {
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
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "잠시 후 다시 시도해주세요. 짧은 시간에 너무 많이 요청했어요."
          : "코드를 보내지 못했어요. 이메일 주소를 확인해주세요.",
      );
      return;
    }
    setSentTo(email.trim());
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" });
    if (error) {
      setBusy(false);
      setError("코드가 맞지 않거나 만료됐어요. 메일의 최신 코드를 입력해주세요.");
      return;
    }
    router.replace("/start");
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
            className={inputClass}
          />
        </label>
        {error && (
          <p role="alert" className="text-alert">
            {error}
          </p>
        )}
        <PrimaryButton type="submit" disabled={busy || !email}>
          {busy ? "보내는 중" : "인증 코드 받기"}
        </PrimaryButton>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="mt-8 space-y-6">
      <p className="text-ink-soft">
        <strong className="text-ink">{sentTo}</strong>로 로그인 메일을 보냈어요. 메일에 숫자 코드가 있으면 아래에 입력하고,
        링크만 있으면 <strong className="text-ink">지금 이 브라우저에서</strong> 메일을 열어 링크를 눌러주세요. 메일이 안
        보이면 스팸함도 확인해주세요.
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
          className={`${inputClass} tracking-[0.3em]`}
        />
      </label>
      {error && (
        <p role="alert" className="text-alert">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" disabled={busy || code.length < 6}>
        {busy ? "확인하는 중" : "로그인"}
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
