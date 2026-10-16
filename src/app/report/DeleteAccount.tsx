"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions";

export function DeleteAccount() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    const ok = window.confirm("탈퇴하면 검사 결과, 친구 평가, 사진, 연락처, 매칭 기록이 모두 바로 지워지고 되돌릴 수 없어요. 탈퇴할까요?");
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteAccount();
      if (res && !res.ok) setError(res.error ?? "탈퇴하지 못했어요.");
    });
  }

  return (
    <div className="mt-16 text-center">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-sm text-muted underline underline-offset-4"
      >
        {pending ? "탈퇴하는 중" : "탈퇴하고 내 정보 지우기"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
