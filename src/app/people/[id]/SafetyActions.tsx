"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { blockUser, reportUser } from "@/app/match/actions";
import { fieldClass } from "@/components/ui";
import { REPORT_REASONS, type ReportReason } from "@/lib/match/safety";

export function SafetyActions({ targetId, name, connected }: { targetId: string; name: string; connected: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function block() {
    if (!window.confirm(`${name}님을 차단할까요? 서로 다시는 추천되지 않고, 진행 중인 연결도 사라져요.`)) return;
    startTransition(async () => {
      const res = await blockUser(targetId);
      if (!res.ok) return setError(res.error);
      router.replace("/match");
    });
  }

  function report(r: ReportReason, text: string) {
    setError(null);
    startTransition(async () => {
      const res = await reportUser(targetId, r, text);
      if (!res.ok) return setError(res.error);
      if (r === "contact_not_found") {
        setMessage(`${name}님에게 연락처를 다시 확인해달라고 알렸어요.`);
        return;
      }
      router.replace("/match");
    });
  }

  return (
    <section id="safety" className="mt-14 scroll-mt-6 border-t border-line pt-6 text-sm">
      {connected && (
        <button
          type="button"
          disabled={pending}
          onClick={() => report("contact_not_found", "")}
          className="mb-4 w-full rounded-full border border-line px-4 py-3 text-ink-soft"
        >
          아이디로 찾을 수 없어요
        </button>
      )}
      {message && <p className="mb-4 text-moss">{message}</p>}

      <div className="flex justify-center gap-6 text-muted">
        <button type="button" disabled={pending} onClick={() => setOpen((v) => !v)} className="underline underline-offset-4">
          신고하기
        </button>
        <button type="button" disabled={pending} onClick={block} className="underline underline-offset-4">
          차단하기
        </button>
      </div>

      {open && (
        <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-4">
          <p className="font-semibold text-ink">무엇이 문제였나요?</p>
          <div className="mt-3 space-y-2">
            {REPORT_REASONS.map((r) => (
              <label key={r.id} className="flex items-center gap-3 text-[15px] text-ink">
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="h-4 w-4 accent-[var(--color-indigo)]"
                />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="자세한 내용 (선택)"
            className={fieldClass}
          />
          <p className="mt-2 text-muted">신고하면 바로 차단돼요. 운영자가 확인하고, 신고가 여러 건 쌓이면 상대의 매칭이 멈춰요.</p>
          <button
            type="button"
            disabled={!reason || pending}
            onClick={() => reason && report(reason, detail)}
            className="mt-4 w-full rounded-full bg-alert px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            신고하기
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-center text-alert">
          {error}
        </p>
      )}
    </section>
  );
}
