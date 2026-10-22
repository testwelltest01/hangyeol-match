import type { ReactNode } from "react";
import { PrimaryLink } from "@/components/buttons";
import { GUEST_KEEP_DAYS } from "@/lib/love/guest-keys";
import { LOVE_GROUPS, LOVE_ITEMS, LOVE_MINUTES, LOVE_SCALES } from "@/lib/love/items";
import { SITUATIONS } from "@/lib/love/prompt";

const RELATION_COUNT = LOVE_SCALES.filter((s) => LOVE_GROUPS.find((g) => g.id === s.group)?.part === "relation").length;

/**
 * 아직 검사를 하지 않았을 때: 무엇을 받는지 먼저 보여준다.
 * guest = 가입 전 공유 링크(/love): 가입 없이 받는다는 안내, 검사는 /love/test, resume에 '지난번 보고서 다시 보기'
 */
export function LoveIntro({ guest = false, resume }: { guest?: boolean; resume?: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-indigo">{guest ? "연애 상황 보고서 · 가입 없이 받아요" : "연애 상황 보고서"}</p>
      <h1 className="mt-1.5 font-serif text-[1.75rem] font-bold leading-snug text-ink">다툴 때, 연락이 뜸할 때, 화해할 때 나는 어떤 사람일까요?</h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
        {LOVE_ITEMS.length}문항(약 {LOVE_MINUTES}분)에 답하면 {guest ? "" : "기본 검사 결과와 엮어 "}AI가 연애의 장면 10가지로 보고서를 써 드려요. 그 장면에서 나는
        어떤지, <strong className="font-semibold text-ink">결이 다른 상대에게는 어떻게 보일 수 있는지</strong>, 무엇을 해 보면 좋은지, 상대에게 건넬 한 마디까지요.
      </p>
      {resume}

      <section className="mt-8 rounded-[22px] bg-surface px-5 py-6 ring-1 ring-line/80">
        <h2 className="text-[13px] font-semibold text-muted">보고서에 담기는 장면</h2>
        <ol className="mt-3 grid gap-x-4 gap-y-2.5 text-[15px] text-ink sm:grid-cols-2">
          {SITUATIONS.map((s, i) => (
            <li key={s.id} className="flex gap-2.5">
              <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-indigo">{i + 1}</span>
              {s.title}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 rounded-[22px] bg-surface px-5 py-6 ring-1 ring-line/80">
        <h2 className="text-[13px] font-semibold text-muted">이렇게 만들어요</h2>
        <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-ink-soft">
          <li>
            세계적으로 쓰이는 공개 성격검사(IPIP)에서 연애 장면으로 풀기 좋은 관계 척도 {RELATION_COUNT}가지(마음 여는 속도, 속마음 꺼내기, 믿음, 걱정, 털어내기 등)를 골라 우리말로 옮겼어요.
          </li>
          <li>여기에 타고난 기질(설렘 찾기, 조심성, 정에 기대기, 끈기)과 다듬어 가는 성격(스스로 서기, 함께하는 마음, 더 큰 의미)을 보는 한결 문항을 더해, 처음 반응과 그걸 다루는 방식을 함께 풀어요.</li>
          {guest ? (
            <>
              <li>검사는 한결을 만든 사람(심리학 대학원에서 심리측정 전공)이 직접 골라 엮었어요.</li>
              <li>이름이나 연락처는 묻지 않아요. 가입하면 보고서가 내 계정에 저장되고, 가입하지 않으면 {GUEST_KEEP_DAYS}일 뒤 지워져요.</li>
            </>
          ) : (
            <>
              <li>마음이 달라졌다 싶으면 다시 검사할 수 있어요. 다시 하면 보고서를 새로 써 드려요.</li>
              <li>나만 볼 수 있고, 추천 계산에는 쓰지 않아요.</li>
            </>
          )}
        </ul>
      </section>

      <div className="mt-8">
        <PrimaryLink href={guest ? "/love/test" : "/report/love/test"}>검사 시작하기</PrimaryLink>
      </div>
    </div>
  );
}
