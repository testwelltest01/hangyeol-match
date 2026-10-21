"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PrimaryButton, PrimaryLink } from "@/components/buttons";
import { Notice } from "@/components/ui";
import { chooseIllustration, createIllustration, deleteIllustration } from "./actions";
import { ZoomImage } from "@/components/ZoomImage";
import { SaveImageButton } from "@/components/SaveImageButton";

type Row = { id: string; status: "pending" | "done" | "failed"; url: string | null; error: string | null; shown: boolean; createdAt: string };

type Props = {
  /** 그리기 전에 채울 것: 사진 2장이 먼저, 그다음 내 정보(자기소개 등) */
  missing: "photos" | "profile" | null;
  remaining: number;
  /** 한 계정이 그릴 수 있는 횟수 */
  limit: number;
  /** 매칭 준비를 모두 마쳤는지 (그림이 마지막 단계라 다 그리면 오늘의 추천으로 보낸다) */
  ready: boolean;
  rows: Row[];
};

const OPENAI_DATA_POLICY = "https://openai.com/ko-KR/policies/how-your-data-is-used-to-improve-model-performance/";

/** 그림 프로필은 매칭에 꼭 필요하다: 숨기기는 없고, 여러 장이면 보여줄 그림을 고른다. 마지막 남은 그림은 지울 수 없다 */
export function IllustrationPanel({ missing, remaining, limit, ready, rows }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const drawing = rows.some((r) => r.status === "pending");
  const latest = rows[0];
  const done = rows.filter((r) => r.status === "done");
  // 추천 카드에 보이는 그림: 고른 그림, 없으면 가장 최근 그림 (서버 pickShown과 같은 기준, rows는 최근 순)
  const shownId = (done.find((r) => r.shown) ?? done[0])?.id;

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

  if (missing === "photos") {
    return (
      <div className="mt-8 space-y-4">
        <Notice>그림은 등록한 얼굴·전신 사진 2장을 바탕으로 그려요. 사진을 올리면 AI가 알아서 그려요.</Notice>
        <PrimaryLink href="/me/photos?next=illustration">사진 등록하러 가기</PrimaryLink>
      </div>
    );
  }
  if (missing === "profile") {
    return (
      <div className="mt-8 space-y-4">
        <Notice>그림의 분위기는 자기소개를 보고 정해요. 내 정보와 자기소개를 채우면 AI가 알아서 그려요.</Notice>
        <PrimaryLink href="/me/profile">내 정보 채우기</PrimaryLink>
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
            <p className="mt-0.5 text-sm text-ink-soft">1~2분쯤 걸려요. 이 화면을 나가도 계속 그리니 다른 준비를 먼저 해도 돼요.</p>
          </div>
        </div>
      )}

      {latest?.status === "failed" && !drawing && (
        <Notice tone="alert">
          {latest.error ?? "그림을 만들지 못했어요."}
          {done.length === 0 && " 30분쯤 뒤 이 화면을 열면 알아서 다시 그려요. 바로 그리려면 '다시 그리기'를 눌러주세요."}
        </Notice>
      )}

      {done.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2">
          {done.map((r) => (
            <li key={r.id}>
              <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-mist">
                {r.url && <ZoomImage src={r.url} alt="AI가 그린 내 그림 프로필" />}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {shownId === r.id ? (
                  <span className="text-sm font-semibold text-moss">추천 카드에 보이는 중</span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => chooseIllustration(r.id))}
                    className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white active:scale-[0.98] disabled:opacity-60"
                  >
                    이 그림으로 바꾸기
                  </button>
                )}
                <span className="flex flex-wrap items-center gap-4 text-sm">
                  {r.url && (
                    <SaveImageButton url={r.url} filename="hangyeol-profile.webp" className="font-semibold text-indigo underline underline-offset-4 disabled:opacity-60" />
                  )}
                  {done.length > 1 && (
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
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {ready && done.length > 0 && <PrimaryLink href="/match">오늘의 추천 보기</PrimaryLink>}

      {!drawing && (
        <section className="rounded-2xl bg-mist px-5 py-5">
          <h2 className="font-semibold">AI에게 보내는 정보</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-ink-soft">
            <li>등록한 얼굴·전신 사진 2장</li>
            <li>성별, 나이대, 키, 자기소개</li>
            <li>검사 결과 중 성격·생활 성향·꾸밈 정도 요약, 더 알아보기 결과</li>
          </ul>
          <p className="mt-2 text-sm text-muted">닉네임, 사는 곳, 종교, 연락처, 생활 습관 점수, 결혼·자녀·흡연·음주 조건은 보내지 않아요.</p>
          <p className="mt-2 text-sm text-muted">
            OpenAI(미국)로 보내고, 보낸 정보는{" "}
            <a href={OPENAI_DATA_POLICY} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              AI 학습에 이용되지 않아요
            </a>
            .{" "}
            <Link href="/privacy#overseas" className="underline underline-offset-4">
              자세히
            </Link>
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-alert">
              {error}
            </p>
          )}
          <div className="mt-4">
            {done.length ? (
              // 이미 그림이 있으면 새로 그리기는 보조 버튼 (큰 버튼은 '오늘의 추천 보기')
              <button
                type="button"
                disabled={pending || remaining === 0}
                onClick={() => run(() => createIllustration())}
                className="block w-full rounded-full border border-primary px-6 py-3.5 text-center font-semibold text-primary transition-colors hover:bg-primary hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
              >
                {remaining === 0 ? `${limit}번 모두 그렸어요` : `새로 그리기 (${remaining}번 남음)`}
              </button>
            ) : (
              <PrimaryButton disabled={pending || remaining === 0} onClick={() => run(() => createIllustration())}>
                {remaining === 0 ? `${limit}번 모두 그렸어요` : latest?.status === "failed" ? "다시 그리기" : "그림 그리기"}
              </PrimaryButton>
            )}
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
