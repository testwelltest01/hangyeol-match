"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CodeBoxes } from "@/components/auth/CodeBoxes";
import { IconExternal } from "@/components/icons";
import { IgVerifiedBadge } from "@/components/IgVerifiedBadge";
import { dmLink } from "@/lib/instagram/rules";
import { verifyInstagram } from "./actions";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 text-[15px] font-semibold text-ink">
      <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] text-white">
        {n}
      </span>
      <span>{children}</span>
    </p>
  );
}

/**
 * 인스타 계정 확인 (선택). 한결 공식 인스타에 DM으로 '인증'을 보내면 봇이 6자리 코드를 답장하고, 그 코드를 여기 넣는다.
 * 인스타 API는 회원이 먼저 보낸 DM에만 답장할 수 있어서 이 순서다 (src/lib/instagram/rules.ts)
 */
export function InstagramVerify({ official, verified }: { official: string; verified: { username: string } | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (value: string) =>
    start(async () => {
      setError(null);
      const res = await verifyInstagram(value);
      if (res.ok) {
        setDone(res.username);
        setOpen(false);
        setCode("");
        router.refresh();
      } else {
        setError(res.error);
        setCode("");
      }
    });

  const showSteps = !verified || open;

  return (
    <section aria-labelledby="ig-verify-title" className="mt-8 rounded-2xl bg-surface px-5 py-5 ring-1 ring-line/80">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ig-verify-title" className="font-semibold text-ink">
          인스타 인증
        </h2>
        {verified ? <IgVerifiedBadge short /> : <span className="text-xs text-muted">선택</span>}
      </div>

      {done && (
        <p role="status" className="mt-3 rounded-xl bg-moss/10 px-4 py-3 text-[15px] text-ink">
          인증했어요. 연락처의 인스타 아이디를 @{done}(으)로 맞췄어요.
        </p>
      )}

      {verified && !open && (
        <>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            @{verified.username} 계정으로 인증했어요. 추천 카드에 &lsquo;인스타 인증&rsquo;이 보여요. 아래에서 인스타 아이디를 바꾸면 인증이 풀려요.
          </p>
          <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm text-muted underline underline-offset-4">
            다른 계정으로 다시 인증하기
          </button>
        </>
      )}

      {showSteps && (
        <>
          {!verified && (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              인스타를 연락처로 쓴다면 인증해 두세요. 추천 카드에 &lsquo;인스타 인증&rsquo;이 붙어서 상대가 더 믿고 다가올 수 있어요.
            </p>
          )}
          <div className="mt-5 space-y-5">
            <div>
              <Step n={1}>
                한결 인스타(@{official})에 DM으로 다른 말 없이 <strong className="text-primary">인증</strong> 두 글자만 보내주세요
              </Step>
              <a
                href={dmLink(official)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-7 mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition active:scale-[0.98] active:opacity-80"
              >
                한결 인스타 DM 열기
                <IconExternal size={16} />
              </a>
            </div>
            <div>
              <Step n={2}>답장으로 온 6자리 코드를 넣어주세요</Step>
              <div className="ml-7 mt-2.5">
                <CodeBoxes id="ig-code" label="인스타 인증 코드" autoFocus={false} value={code} onChange={setCode} onComplete={submit} disabled={pending} />
              </div>
              {pending && <p className="ml-7 mt-2 text-sm text-muted">확인하는 중</p>}
              {error && (
                <p role="alert" className="ml-7 mt-2 text-sm text-alert">
                  {error}
                </p>
              )}
            </div>
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-muted">
            인증하면 DM을 보낸 인스타 아이디가 연락처에 들어가요. 아이디는 둘 다 &lsquo;연락처 전달&rsquo;을 누른 뒤에만 상대에게 보여요.
            코드는 10분 동안만 쓸 수 있어요.
          </p>
          {verified && (
            <button type="button" onClick={() => setOpen(false)} className="mt-3 text-sm text-muted underline underline-offset-4">
              그대로 두기
            </button>
          )}
        </>
      )}
    </section>
  );
}
