"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmSingle } from "@/app/actions";

/**
 * 혼인 중이 아님 확인 (2026-10-31부터 처음 정보 입력의 필수 확인). 그 전에 가입한 회원에게만 추천 화면 위에 한 번 보인다.
 * 본인이 직접 눌러야 기록한다
 */
export function SingleConfirm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onClick = () =>
    start(async () => {
      setError(null);
      const res = await confirmSingle();
      if (res.ok) router.refresh();
      else setError(res.error ?? "저장하지 못했어요.");
    });

  return (
    <div className="rounded-2xl bg-indigo/5 px-4 py-4 ring-1 ring-indigo/15">
      <p className="text-[15px] font-semibold text-ink">한 가지만 확인할게요</p>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
        한결은 법적으로 혼인 중이 아닌 분만 이용할 수 있어요. 혼인 중인 사실이 확인되면 이용이 정지되고, 탈퇴한 뒤 다시 가입해도 이용할 수
        없어요.
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="mt-3 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98] active:opacity-80 disabled:opacity-60"
      >
        {pending ? "저장하는 중" : "네, 혼인 중이 아니에요"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
