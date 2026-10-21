"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions";

/**
 * 탈퇴: 누르면 화면 안 확인 창을 띄우고, '탈퇴하기'를 한 번 더 눌러야 지운다 (되돌릴 수 없다).
 * 브라우저 기본 확인 창(window.confirm)은 사이트 주소가 붙어 낯설고 앱 안 브라우저에서 막히기도 해서 쓰지 않는다
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // 열리면 '취소'에 초점(실수로 바로 탈퇴하지 않게), Esc로 닫기
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function onConfirm() {
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
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="text-sm text-muted underline underline-offset-4"
      >
        탈퇴하고 내 정보 지우기
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-body"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[22px] bg-surface px-5 pb-5 pt-6 text-left shadow-xl"
          >
            <h2 id="delete-title" className="text-[1.15rem] font-bold text-ink">
              정말 탈퇴할까요?
            </h2>
            <div id="delete-body" className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink-soft">
              <p>
                <strong className="font-semibold text-alert">탈퇴하면 복구할 수 없어요.</strong> 검사 결과, 친구 평가, 사진, 그림 프로필, 연락처,
                관심·대화 기록이 바로 지워져요.
              </p>
              <p>같은 이메일로 다시 가입할 수는 있지만, 처음부터 다시 시작해야 해요.</p>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-alert">
                {error}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                ref={cancelRef}
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-full border border-line bg-surface px-4 py-3.5 text-[15px] font-semibold text-ink active:scale-[0.98] active:opacity-80 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onConfirm}
                className="rounded-full bg-alert px-4 py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] active:opacity-80 disabled:opacity-60"
              >
                {pending ? "탈퇴하는 중" : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
