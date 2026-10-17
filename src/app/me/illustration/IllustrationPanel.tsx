"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PrimaryButton } from "@/components/Shell";
import { Notice } from "@/components/ui";
import { createIllustration, deleteIllustration, setIllustrationShown } from "./actions";

type Row = { id: string; status: "pending" | "done" | "failed"; url: string | null; error: string | null; shown: boolean; createdAt: string };

type Props = {
  available: boolean;
  ready: boolean;
  consented: boolean;
  remaining: number;
  /** 한 계정이 그릴 수 있는 횟수 */
  limit: number;
  rows: Row[];
};

export function IllustrationPanel({ available, ready, consented, remaining, limit, rows }: Props) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const drawing = rows.some((r) => r.status === "pending");
  const latest = rows[0];
  const done = rows.filter((r) => r.status === "done");

  // 그리는 동안 5초마다 새로 확인한다 (화면을 나가도 서버에서 계속 그린다)
  useEffect(() => {
    if (!drawing) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [drawing, router]);

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error);
      router.refresh();
    });

  if (!available) {
    return (
      <div className="mt-8">
        <Notice>그림 프로필을 준비하고 있어요. 조금만 기다려주세요.</Notice>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="mt-8">
        <Notice>
          그림을 그리려면 내 정보와 사진 2장이 필요해요.{" "}
          <Link href="/me" className="underline underline-offset-4">
            내 정보 채우기
          </Link>
        </Notice>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {drawing && (
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-5" aria-live="polite">
          <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-line border-t-indigo" aria-hidden />
          <div>
            <p className="font-semibold">그리는 중이에요</p>
            <p className="mt-0.5 text-sm text-ink-soft">1~2분쯤 걸려요. 이 화면을 나가도 계속 그려요.</p>
          </div>
        </div>
      )}

      {latest?.status === "failed" && !drawing && <Notice tone="alert">{latest.error ?? "그림을 만들지 못했어요."}</Notice>}

      {done.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2">
          {done.map((r) => (
            <li key={r.id}>
              <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-mist">
                {r.url && (
                  // 10분짜리 서명 주소라 next/image 최적화 대신 그대로 보여준다
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.url} alt="AI가 그린 내 그림 프로필" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {r.shown ? (
                  <span className="text-sm font-semibold text-moss">추천 카드에 보이는 중</span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setIllustrationShown(r.id, true))}
                    className="rounded-full border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-ink hover:text-white disabled:opacity-60"
                  >
                    추천 카드에 보여주기
                  </button>
                )}
                <span className="flex gap-4 text-sm">
                  {r.shown && (
                    <button type="button" disabled={pending} onClick={() => run(() => setIllustrationShown(r.id, false))} className="text-muted underline underline-offset-4">
                      숨기기
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm("이 그림을 지울까요? 지워도 그릴 수 있는 횟수는 돌아오지 않아요.")) run(() => deleteIllustration(r.id));
                    }}
                    className="text-muted underline underline-offset-4"
                  >
                    지우기
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!drawing && (
        <section className="rounded-2xl bg-mist px-5 py-5">
          <h2 className="font-semibold">AI에게 보내는 정보</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-ink-soft">
            <li>등록한 얼굴·전신 사진 2장</li>
            <li>성별, 나이대, 키, 자기소개</li>
            <li>검사 결과 중 성격·생활 성향·꾸밈 정도 요약, 더 알아보기 결과</li>
          </ul>
          <p className="mt-2 text-sm text-muted">닉네임, 사는 곳, 종교, 연락처, 생활 습관 점수, 결혼·자녀·흡연 조건은 보내지 않아요.</p>
          {!consented && (
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-indigo" />
              <span className="text-[15px]">
                그림을 만들기 위해 위 정보를 OpenAI(미국)로 보내는 데 동의해요.{" "}
                <Link href="/privacy#overseas" className="text-muted underline underline-offset-4">
                  자세히
                </Link>
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-alert">
              {error}
            </p>
          )}
          <div className="mt-4">
            <PrimaryButton disabled={pending || remaining === 0 || (!consented && !agree)} onClick={() => run(() => createIllustration(agree))}>
              {remaining === 0 ? `${limit}번 모두 그렸어요` : done.length ? `새로 그리기 (${remaining}번 남음)` : "그림 그리기"}
            </PrimaryButton>
          </div>
          <p className="mt-2 text-center text-sm text-muted">
            한 계정당 {limit}번까지 그릴 수 있어요 ({remaining}번 남음). 실패하면 세지 않고, 지운 그림은 횟수에 포함돼요. 실제 사진은 지금처럼
            서로 관심을 보낸 뒤에만 공개돼요.
          </p>
        </section>
      )}
    </div>
  );
}
