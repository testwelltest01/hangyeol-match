"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevron, IconCross, IconGrain } from "@/components/icons";
import { DATE_MYTHS, DATE_TIPS, type DateTip, type TipSource } from "@/lib/dateTips";

/** 두 사람의 검사 결과로 붙이는 한 줄 (src/lib/match/explain.ts commonGround·talkingPoint). 없으면 null */
export type DateTipHints = { common: string | null; differ: string | null };

const BUTTON =
  "flex w-full items-center justify-center gap-1.5 rounded-full border border-primary px-4 py-2.5 text-[15px] font-semibold text-primary active:scale-[0.98] active:opacity-80";

/**
 * '첫 만남 팁 보기' 버튼과, 누르면 아래에서 올라오는 창 (연락처를 주고받은 뒤 대화방·사람 자세히에서).
 * 팁마다 '근거 보기'를 펼치면 어떤 연구인지(근거 종류·규모, 확인한 내용, 논문 링크)가 나온다. 내용은 src/lib/dateTips.ts.
 * autoOpenKey가 있으면 그 기기에서 처음 한 번은 알아서 연다 (입력 중이면 방해하지 않고 다음에).
 */
export function DateTipsButton({ name, hints, autoOpenKey }: { name: string; hints: DateTipHints; autoOpenKey?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!autoOpenKey) return;
    const active = document.activeElement;
    if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return;
    try {
      if (localStorage.getItem(autoOpenKey)) return;
    } catch {
      return; // 기기 저장소를 못 쓰면(사생활 보호 모드 등) 매번 뜨지 않게 자동으로는 열지 않는다
    }
    // 화면이 자리 잡은 뒤에 연다. 열었다는 기록은 실제로 열 때 남긴다 (그 전에 화면을 떠나면 다음에 다시)
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(autoOpenKey, new Date().toISOString());
      } catch {
        return;
      }
      setOpen(true);
    }, 500);
    return () => window.clearTimeout(t);
  }, [autoOpenKey]);

  // 열려 있는 동안: Esc로 닫기, 뒤 화면 스크롤 막기, 창에 초점 (화면 읽기 프로그램이 제목부터 읽게)
  useEffect(() => {
    if (!open) return;
    sheetRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const during = DATE_TIPS.filter((t) => t.phase === "during");
  const after = DATE_TIPS.filter((t) => t.phase === "after");

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} className={BUTTON}>
        첫 만남 팁 보기
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 motion-safe:animate-[zoom-fade_150ms_ease-out] sm:items-center sm:p-4"
            onClick={close}
          >
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="date-tips-title"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[92dvh] outline-none w-full max-w-[560px] flex-col rounded-t-[26px] bg-paper shadow-xl motion-safe:animate-[sheet-up_240ms_ease-out] sm:rounded-[26px]"
            >
              <header className="flex items-start justify-between gap-3 border-b border-line/70 px-5 pb-4 pt-5">
                <div>
                  <p className="text-[13px] font-semibold text-indigo">첫 만남 팁</p>
                  <h2 id="date-tips-title" className="mt-0.5 font-serif text-[1.3rem] font-bold leading-snug text-ink">
                    {name}님과 만나기 전에
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="닫기"
                  className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted"
                >
                  <IconCross size={22} />
                </button>
              </header>

              <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-4">
                <p className="text-[14.5px] leading-relaxed text-ink-soft">
                  연애·대인관계 연구에서 여러 번 확인됐거나 실제 만남 자료로 확인된 것만 골랐어요. &lsquo;근거 보기&rsquo;를 누르면 어떤 연구인지 볼 수 있어요.
                </p>

                <TipGroup title="만나는 동안" tips={during} from={1} hints={hints} />
                <TipGroup title="헤어진 뒤" tips={after} from={during.length + 1} hints={hints} />

                <details className="group mt-8 rounded-[20px] bg-mist/60 px-4 py-3.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[14px] font-semibold text-ink-soft [&::-webkit-details-marker]:hidden">
                    흔히 듣지만 근거가 약해서 넣지 않은 것
                    <IconChevron size={18} className="shrink-0 rotate-90 text-muted transition-transform group-open:-rotate-90" />
                  </summary>
                  <ul className="mt-3 space-y-4">
                    {DATE_MYTHS.map((m) => (
                      <li key={m.id}>
                        <p className="text-[14px] font-semibold text-ink">&lsquo;{m.claim}&rsquo;</p>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{m.why}</p>
                        <Sources sources={m.sources} />
                      </li>
                    ))}
                  </ul>
                </details>

                <p className="mt-6 text-[13px] leading-relaxed text-muted">
                  연구는 여러 사람의 평균적인 경향이에요. 다 하려고 애쓰기보다 상대의 반응을 보며 편한 만큼만 해 보세요.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function TipGroup({ title, tips, from, hints }: { title: string; tips: DateTip[]; from: number; hints: DateTipHints }) {
  return (
    <section className="mt-6">
      <h3 className="px-1 text-[13px] font-semibold text-muted">{title}</h3>
      <ol className="mt-2 space-y-3">
        {tips.map((t, i) => (
          <TipCard key={t.id} n={from + i} tip={t} hint={t.hint ? hints[t.hint] : null} />
        ))}
      </ol>
    </section>
  );
}

function TipCard({ n, tip, hint }: { n: number; tip: DateTip; hint: string | null }) {
  return (
    <li className="rounded-[20px] bg-surface px-4 py-4 ring-1 ring-line/80">
      <p className="flex items-start gap-2.5">
        <span aria-hidden className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">
          {n}
        </span>
        <span className="text-[16px] font-semibold leading-snug text-ink">{tip.title}</span>
      </p>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{tip.body}</p>
      {tip.example && (
        <p className="mt-2.5 rounded-2xl bg-mist/70 px-3.5 py-2 text-[14px] leading-relaxed text-ink">
          <span className="sr-only">예: </span>&ldquo;{tip.example}&rdquo;
        </p>
      )}
      {hint && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[13.5px] leading-relaxed text-indigo">
          <IconGrain size={17} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">한결이 본 두 분: </span>
            {hint}
          </span>
        </p>
      )}
      <details className="group mt-3 border-t border-line/70 pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] [&::-webkit-details-marker]:hidden">
          <span className="font-semibold text-muted">근거 보기</span>
          <span className="rounded-full bg-mist px-2 py-0.5 text-[12px] text-ink-soft">{tip.basis}</span>
          <IconChevron size={16} className="ml-auto shrink-0 rotate-90 text-muted transition-transform group-open:-rotate-90" />
        </summary>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">{tip.evidence}</p>
        <Sources sources={tip.sources} />
      </details>
    </li>
  );
}

function Sources({ sources }: { sources: TipSource[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {sources.map((s) => (
        <li key={s.url} className="text-[12.5px] leading-snug text-muted">
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo underline underline-offset-2">
            {s.cite}
          </a>{" "}
          {s.title}. <i>{s.journal}</i>
        </li>
      ))}
    </ul>
  );
}
