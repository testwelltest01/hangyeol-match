"use client";

import Link from "next/link";
import { useState } from "react";
import { PrimaryButton } from "@/components/buttons";
import { ErrorText, fieldClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function PasswordLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      // 이메일이 없는지 비밀번호가 틀렸는지 구분해서 알려주지 않는다 (가입 여부 노출 방지)
      setError(
        error.status === 429
          ? "로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요."
          : "이메일 또는 비밀번호가 맞지 않아요. 코드로만 가입했다면 '비밀번호 찾기'로 비밀번호를 만들어주세요.",
      );
      return;
    }
    // 로그인 상태가 바뀌었으니 페이지를 새로 연다. 앱 안 이동(router)으로 넘어가면 로그인 전에 받아둔 화면,
    // /start(넘겨주기만 하는 주소), 홈 화면 앱에 오래 남은 예전 화면 코드가 섞여 '페이지를 불러오지 못함'이 뜰 수 있다
    window.location.replace("/start");
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
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
      <label className="block">
        <span className="text-sm font-semibold">비밀번호</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </label>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton type="submit" disabled={busy || !email || !password}>
        {busy ? "로그인하는 중" : "로그인"}
      </PrimaryButton>
      <div className="flex justify-between text-sm">
        <Link href="/reset" className="text-muted underline underline-offset-4">
          비밀번호를 잊었어요
        </Link>
        <Link href="/signup" className="font-semibold text-indigo underline underline-offset-4">
          처음이에요, 가입하기
        </Link>
      </div>
    </form>
  );
}
