"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { submitGuestLoveTest } from "@/app/love/actions";
import { PrimaryButton } from "@/components/buttons";
import { LikertScale } from "@/components/scales";
import { LIKERT_OPTIONS } from "@/lib/items";
import { GUEST_KEEP_DAYS, GUEST_LOCAL_KEY } from "@/lib/love/guest-keys";
import { LOVE_ITEMS, LOVE_PAGES, LOVE_VERSION } from "@/lib/love/items";
import type { LoveAnswers } from "@/lib/love/score";
import { submitLoveTest } from "../actions";

const OPENAI_DATA_POLICY = "https://openai.com/ko-KR/policies/how-your-data-is-used-to-improve-model-performance/";

type Draft = { v: string; page: number; answers: LoveAnswers };

/** 동의 한 줄 */
function ConsentBox({ checked, onChange, title, children }: { checked: boolean; onChange: (v: boolean) => void; title: string; children?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-line/80">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-indigo)]" />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink">
          <span className="text-indigo">[필수]</span> {title}
        </span>
        {children && <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{children}</span>}
      </span>
    </label>
  );
}

const policyLinks = (
  <>
    API로 보낸 정보는{" "}
    <a href={OPENAI_DATA_POLICY} target="_blank" rel="noreferrer" className="underline underline-offset-4">
      OpenAI의 AI 학습에 이용되지 않고
    </a>
    , 남용 감시를 위해 최대 30일 보관된 뒤 지워져요. 동의하지 않으면 보고서를 받을 수 없어요.{" "}
    <Link href="/privacy#overseas" target="_blank" className="underline underline-offset-4">
      처리방침
    </Link>
  </>
);

/**
 * 연애 상황 검사: 8쪽(관계 척도 + 기질·성격 문항). 답은 이 기기에 임시로 남겨 두고(앱을 닫았다 열어도 이어서), 마지막 쪽에서 동의와 함께 한 번에 낸다.
 * 임시 저장은 계정마다 따로(draftKey, 같은 기기를 여러 계정이 써도 섞이지 않게).
 * guest = 가입 전 공유 링크(/love/test): 동의 3가지(만 19세 이상·수집·국외 이전), 내면 결과 주소(/love/r/열쇠)로 가고 열쇠를 이 기기에 남긴다
 */
export function LoveTestForm({ draftKey, again, guest = false }: { draftKey: string; again: boolean; guest?: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<LoveAnswers>({});
  const [page, setPage] = useState(0);
  const [agree, setAgree] = useState(false);
  const [age, setAge] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const agreedAll = guest ? agree && age && privacy : agree;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // 이 기기에 남겨 둔 답 불러오기 (문항 버전이 바뀌었으면 버린다)
  useEffect(() => {
    const restore = () => {
      try {
        const d = JSON.parse(localStorage.getItem(draftKey) ?? "null") as Draft | null;
        if (d?.v !== LOVE_VERSION) return;
        setAnswers(d.answers ?? {});
        setPage(Math.min(Math.max(0, d.page | 0), LOVE_PAGES.length - 1));
      } catch {
        // 저장소를 못 쓰면 처음부터
      }
    };
    restore();
  }, [draftKey]);

  const save = (next: LoveAnswers, nextPage: number) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ v: LOVE_VERSION, page: nextPage, answers: next } satisfies Draft));
    } catch {
      // 임시 저장은 편의 기능이라 실패해도 그냥 둔다
    }
  };

  const items = LOVE_PAGES[page];
  const left = items.filter((i) => answers[i.id] === undefined).length;
  const isLast = page === LOVE_PAGES.length - 1;
  const answered = LOVE_ITEMS.filter((i) => answers[i.id] !== undefined).length;
  const progress = (answered / LOVE_ITEMS.length) * 100;

  const set = (id: string) => (v: number) =>
    setAnswers((a) => {
      const next = { ...a, [id]: v };
      save(next, page);
      return next;
    });

  function go(to: number) {
    setError(null);
    setPage(to);
    save(answers, to);
    window.scrollTo({ top: 0 });
  }

  function submit() {
    setError(null);
    start(async () => {
      if (guest) {
        const res = await submitGuestLoveTest(answers, { age, privacy, overseas: agree });
        if (!res.ok) return setError(res.error);
        try {
          localStorage.removeItem(draftKey);
          localStorage.setItem(GUEST_LOCAL_KEY, res.token);
        } catch {}
        router.replace(`/love/r/${res.token}`);
        return;
      }
      const res = await submitLoveTest(answers, agree);
      if (!res.ok) return setError(res.error);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      router.replace("/report/love");
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm text-muted">
        <span>
          {page + 1} / {LOVE_PAGES.length}
        </span>
        <span>이 기기에 답이 임시로 남아요</span>
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="검사 진행률"
      >
        <div className="h-full bg-indigo transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <h1 className="mt-8 font-serif text-[1.7rem] font-bold leading-tight">{isLast ? "마지막 쪽이에요" : "평소의 나"}</h1>
      <p className="mt-2 text-ink-soft">
        {again && page === 0
          ? "다시 하는 검사예요. 지난번 답은 떠올리지 말고 지금의 나로 답해주세요."
          : "연애할 때만이 아니라 평소 사람을 대하는 나를 떠올리며 답해주세요. 정답은 없어요."}
      </p>

      <div className="mt-8 divide-y divide-line">
        {items.map((item) => (
          <div key={item.id} className="py-7 first:pt-0">
            <LikertScale name={item.id} text={item.text} options={LIKERT_OPTIONS} value={answers[item.id]} onChange={set(item.id)} />
          </div>
        ))}
      </div>

      {isLast && (
        <div className="mt-4 space-y-3">
          {guest && (
            <>
              <ConsentBox checked={age} onChange={setAge} title="만 19세 이상이에요" />
              <ConsentBox checked={privacy} onChange={setPrivacy} title="검사 응답 수집·이용에 동의해요">
                검사 응답과 점수로 보고서를 만들어 결과 주소로 보여 드려요. 이름·연락처는 받지 않아요. 가입하면 내 계정으로 옮겨지고, 가입하지 않으면{" "}
                {GUEST_KEEP_DAYS}일 뒤 지워져요. 요청이 몰리지 않게 접속 IP를 하루 동안 기록해요.
              </ConsentBox>
            </>
          )}
          <ConsentBox checked={agree} onChange={setAgree} title="검사 결과를 OpenAI의 AI로 보내 보고서를 쓰는 데 동의해요">
            {guest
              ? "이 검사 점수를 OpenAI(미국)로 보내 보고서를 써요. 다른 정보는 보내지 않아요. "
              : "이 검사와 기본 검사 결과(성격·관계 가치관), 추가 검사 요약, 성별을 OpenAI(미국)로 보내 보고서를 써요. 닉네임·나이·사는 곳·종교·연락처·사진·자기소개는 보내지 않아요. "}
            {policyLinks}
          </ConsentBox>
          <p className="px-1 text-[13.5px] leading-relaxed text-muted">
            {guest
              ? "내면 바로 보고서를 써요(1~2분). 결과 주소를 저장해 두면 다시 볼 수 있어요."
              : again
                ? "이 답으로 보고서를 새로 써요. 새 보고서가 나오면 이전 보고서 대신 보여요."
                : "이 답으로 보고서를 써요. 나중에 마음이 달라졌다 싶으면 다시 검사할 수 있어요."}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 whitespace-pre-line break-words text-alert">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {isLast ? (
          <PrimaryButton onClick={submit} disabled={left > 0 || !agreedAll || pending}>
            {pending ? "보내는 중" : left > 0 ? `${left}문항 남았어요` : agreedAll ? "보고서 받기" : "동의하면 보고서를 받을 수 있어요"}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => go(page + 1)} disabled={left > 0}>
            {left > 0 ? `${left}문항 남았어요` : "다음"}
          </PrimaryButton>
        )}
        {page > 0 && (
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={pending}
            className="w-full py-2 text-center text-sm text-muted underline underline-offset-4"
          >
            이전
          </button>
        )}
      </div>
    </div>
  );
}
