"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { makeSceneImages } from "./actions";

export type SceneItem = { id: string; title: string; status: "none" | "pending" | "done" | "failed"; url: string | null; error: string | null; updated: string | null };

const STATUS = { none: "없음", pending: "만드는 중", done: "완료", failed: "실패" } as const;
const TONE = { none: "text-muted", pending: "text-indigo", done: "text-moss", failed: "text-alert" } as const;

/** 장면 사진 10장: 미리보기·상태와 '없는 사진 모두 만들기'·'다시 만들기'. 만드는 동안 5초마다 새로 확인 */
export function ScenePanel({ items }: { items: SceneItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const busy = items.some((i) => i.status === "pending");
  const missing = items.filter((i) => i.status === "none" || i.status === "failed").length;

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [busy, router]);

  const run = (which: string) =>
    start(async () => {
      setError(null);
      const res = await makeSceneImages(which);
      if (!res.ok) setError(res.error);
      router.refresh();
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || missing === 0}
          onClick={() => run("missing")}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {missing ? `없는 사진 ${missing}장 만들기` : "모두 만들었어요"}
        </button>
        {busy && <span className="text-sm text-indigo">만드는 중이에요. 보통 2~3분 걸려요 (화면을 나가도 계속 만들어요).</span>}
      </div>
      {error && <p className="mt-3 whitespace-pre-line break-words text-sm text-alert">{error}</p>}
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i, n) => (
          <li key={i.id} className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line/80">
            {i.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase 공개 버킷 사진
              <img src={i.url} alt="" className="aspect-[3/2] w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex aspect-[3/2] w-full items-center justify-center bg-mist text-sm text-muted">{i.status === "pending" ? "만드는 중…" : "사진 없음"}</div>
            )}
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">
                  {n + 1}. {i.title}
                </p>
                <span className={`shrink-0 text-xs font-semibold ${TONE[i.status]}`}>{STATUS[i.status]}</span>
              </div>
              {i.error && i.status === "failed" && <p className="mt-1 break-words text-xs text-alert">{i.error}</p>}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{i.updated ?? ""}</span>
                <button
                  type="button"
                  disabled={pending || i.status === "pending"}
                  onClick={() => run(i.id)}
                  className="rounded-full border border-line px-3 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  {i.status === "none" ? "만들기" : "다시 만들기"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
