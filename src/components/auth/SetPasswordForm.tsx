"use client";

import Link from "next/link";
import { useState } from "react";
import { PrimaryButton } from "@/components/buttons";
import { ErrorText, fieldClass } from "@/components/ui";
import { checkPassword, PASSWORD_MIN } from "@/lib/password";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm({ mode }: { mode: "signup" | "reset" | "change" | "first" }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = checkPassword(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("두 비밀번호가 달라요.");

    setBusy(true);
    const supabase = createClient();
    let { error } = await supabase.auth.updateUser({ password, data: { password_set: true } });
    // 이미 있는 계정에서 쓰던 비밀번호를 그대로 넣은 경우(같은 이메일로 다시 가입하기·비밀번호 찾기): 이메일 코드로 본인 확인을
    // 마쳤으니 그 비밀번호를 그대로 쓰게 한다. 로그인한 채 '비밀번호 바꾸기'에서만 다른 비밀번호를 요구한다
    if (error?.code === "same_password" && mode !== "change") {
      ({ error } = await supabase.auth.updateUser({ data: { password_set: true } }));
    }
    if (error) {
      setBusy(false);
      if (error.code === "same_password") return setError("지금 쓰는 비밀번호와 같아요. 다른 비밀번호로 정해주세요.");
      if (error.code === "weak_password") return setError("더 어려운 비밀번호로 정해주세요. 영문과 숫자를 섞어 8자 이상이어야 해요.");
      if (error.code === "reauthentication_needed") {
        setNeedsReauth(true);
        return setError("보안을 위해 이메일 코드로 한 번 더 확인해주세요.");
      }
      return setError("비밀번호를 저장하지 못했어요. 다시 시도해주세요.");
    }
    // 바뀐 정보(비밀번호 설정 여부)가 로그인 토큰에 반영되도록 새로 받는다
    await supabase.auth.refreshSession();
    // 계정 정보(비밀번호 만듦)가 바뀌었으니 페이지를 새로 연다 (PasswordLoginForm과 같은 이유)
    window.location.replace(mode === "change" ? "/me" : "/start");
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      <label className="block">
        <span className="text-sm font-semibold">{mode === "signup" || mode === "first" ? "비밀번호" : "새 비밀번호"}</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
        <span className="mt-2 block text-sm text-muted">영문과 숫자를 섞어 {PASSWORD_MIN}자 이상. 다른 사이트와 같은 비밀번호는 피해주세요.</span>
      </label>
      <label className="block">
        <span className="text-sm font-semibold">한 번 더 입력</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={fieldClass}
        />
      </label>
      <ErrorText>{error}</ErrorText>
      {needsReauth && (
        <Link href="/reset" className="block text-center text-indigo underline underline-offset-4">
          이메일 코드로 확인하기
        </Link>
      )}
      <PrimaryButton type="submit" disabled={busy || !password || !confirm}>
        {busy ? "저장하는 중" : "비밀번호 저장"}
      </PrimaryButton>
    </form>
  );
}
