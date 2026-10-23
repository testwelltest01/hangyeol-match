"use client";

import { useState, useTransition } from "react";

type CreateResult = { ok: true; path: string } | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };

/** 링크를 공유 창으로 보낸다. 공유 창이 없거나 막히면 복사, 그것도 안 되면 manual (한 번 더 눌러 달라고 안내) */
async function sendLink(url: string): Promise<"shared" | "cancelled" | "copied" | "manual"> {
  if (navigator.share) {
    try {
      await navigator.share({ url });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
      // NotAllowedError 등: 링크를 만드느라 기다리는 사이 누른 효력이 끝났다 → 복사로
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "manual";
  }
}

const abs = (path: string) => new URL(path, window.location.origin).toString();

/**
 * 연애 상황 보고서 화면의 '내 연애 보고서 공유하기' (남에게 보여주는 /love/s/열쇠).
 * 처음 누르면 링크를 켜고(create) 바로 공유 창을 연다. 켜진 뒤에는 다시 공유·링크 복사·링크 끄기(stop).
 * 링크로는 보고서 글만 보이고 검사 점수·닉네임은 보이지 않는다. followsLatest: 회원(다시 검사하면 같은 링크에 새 보고서)
 */
export function ReportShare({
  initialPath,
  create,
  stop,
  followsLatest = false,
}: {
  initialPath: string | null;
  create: () => Promise<CreateResult>;
  stop: () => Promise<Result>;
  followsLatest?: boolean;
}) {
  const [path, setPath] = useState(initialPath);
  const [confirmOff, setConfirmOff] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function report(how: Awaited<ReturnType<typeof sendLink>>, justMade: boolean) {
    if (how === "copied") setNote("링크를 복사했어요. 보여주고 싶은 사람에게 붙여넣어 보내 주세요.");
    else if (how === "manual") setNote(justMade ? "링크가 켜졌어요. '내 연애 보고서 공유하기'를 한 번 더 눌러 보내 주세요." : "공유 창을 열지 못했어요. '링크 복사'를 눌러 주세요.");
    else setNote(null);
  }

  function onShare() {
    setError(null);
    setNote(null);
    if (path) {
      void sendLink(abs(path)).then((how) => report(how, false));
      return;
    }
    start(async () => {
      const res = await create();
      if (!res.ok) return setError(res.error);
      setPath(res.path);
      report(await sendLink(abs(res.path)), true);
    });
  }

  function onCopy() {
    if (!path) return;
    setError(null);
    navigator.clipboard
      .writeText(abs(path))
      .then(() => setNote("링크를 복사했어요."))
      .catch(() => window.prompt("이 링크를 복사해 보내 주세요", abs(path)));
  }

  function onStop() {
    setError(null);
    start(async () => {
      const res = await stop();
      if (!res.ok) return setError(res.error);
      setPath(null);
      setConfirmOff(false);
      setNote("링크를 껐어요. 이미 보낸 링크로도 더 볼 수 없어요.");
    });
  }

  return (
    <div>
      {path ? (
        <>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <span aria-hidden className="h-2 w-2 rounded-full bg-moss" />
            공유 링크가 켜져 있어요
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            링크를 아는 사람만 보고서 글을 볼 수 있어요.{followsLatest ? " 다시 검사하면 같은 링크에 새 보고서가 보여요." : ""}
          </p>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-ink">내 보고서를 보여주고 싶다면</p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            링크를 아는 사람만 볼 수 있어요. 보고서 글만 보이고 검사 점수와 닉네임은 보이지 않아요. 언제든 링크를 끌 수 있어요.
          </p>
        </>
      )}

      <button
        type="button"
        onClick={onShare}
        disabled={busy}
        className="mt-4 w-full rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] active:opacity-80 disabled:opacity-60"
      >
        {busy && !path ? "링크 만드는 중" : "내 연애 보고서 공유하기"}
      </button>

      {note && <p className="mt-2 text-center text-sm text-moss">{note}</p>}
      {error && (
        <p role="alert" className="mt-2 whitespace-pre-line break-words text-center text-sm text-alert">
          {error}
        </p>
      )}

      {path &&
        (confirmOff ? (
          <div className="mt-3 rounded-2xl bg-mist px-4 py-3">
            <p className="text-[14px] text-ink-soft">링크를 끌까요? 이미 보낸 링크로도 더 볼 수 없어요.</p>
            <div className="mt-2 flex justify-end gap-4 text-[14px]">
              <button type="button" onClick={() => setConfirmOff(false)} disabled={busy} className="text-muted">
                취소
              </button>
              <button type="button" onClick={onStop} disabled={busy} className="font-semibold text-alert disabled:opacity-60">
                {busy ? "끄는 중" : "링크 끄기"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex justify-center gap-5 text-[14px] text-muted">
            <button type="button" onClick={onCopy} className="underline underline-offset-4">
              링크 복사
            </button>
            <button type="button" onClick={() => setConfirmOff(true)} className="underline underline-offset-4">
              링크 끄기
            </button>
          </div>
        ))}
    </div>
  );
}
