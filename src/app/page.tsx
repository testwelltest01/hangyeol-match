import Link from "next/link";
import { GrainMark } from "@/components/GrainMark";
import { LoginOrContinue } from "@/components/HomeLink";
import { IconLock } from "@/components/icons";
import { OpenInBrowserLink } from "@/components/OpenInBrowserLink";
import { TalkingPoint } from "@/components/PersonCard";
import { Shell } from "@/components/Shell";

// 첫 화면. 다른 '가치관 소개팅'과 다른 점을 앞에 둔다: 어디가 맞는지(연락·돈·다툼·주말 같은 생활 장면)와
// 어디서 부딪힐 수 있는지까지 알려주고, 사진보다 결을 먼저 본다. 말로 설명하기보다 실제 모양의 추천 카드 예시를 보여준다

const STEPS = [
  {
    title: "11분 검사",
    body: "연락, 돈, 다툰 뒤, 주말처럼 연애에서 실제로 부딪히는 8가지 생활 영역과 성격을 물어요.",
  },
  {
    title: "나의 연애 결 리포트",
    body: "내가 어떤 사람과 편한지, 결이 다른 사람과는 어떤 순간에 오해가 생기기 쉬운지 알려드려요.",
  },
  {
    title: "매일 저녁 8시, 한 사람 소개",
    body: "왜 맞는지와 다를 수 있는 부분을 함께 보여드려요. 서로 관심을 보내면 사진이, 서로 수락하면 대화방이 열려요.",
  },
];

/** 추천 카드 예시 (가상 인물). 실제 추천 카드와 같은 순서·말투: 추천 이유 → 다를 수 있는 부분 → 성향 */
function ExampleCard() {
  return (
    <article className="overflow-hidden rounded-[22px] bg-surface ring-1 ring-line/80" aria-label="추천 카드 예시 (가상 인물)">
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mist font-serif text-lg font-bold text-indigo">
            도
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-serif text-xl font-bold leading-tight">도담</span>
              <span className="rounded-full border border-dashed border-muted/60 px-2 py-0.5 text-xs text-muted">가상 인물 · 예시</span>
            </p>
            <p className="mt-0.5 text-[13px] text-muted">20대 후반 · 서울 마포구</p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-paper px-4 py-3 font-serif text-[15.5px] leading-relaxed text-ink">
          연락 빈도 기대와 다툰 뒤 푸는 방식이 비슷해서 추천했어요.
        </p>
        <TalkingPoint text="주말 보내는 방식은 조금 달라요. 만나면 먼저 이야기해보세요." />
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="성향">
          {["답장은 빨리", "갈등은 바로 대화", "밖에서 충전"].map((c) => (
            <li key={c} className="rounded-full bg-mist px-3 py-1 text-[13px] text-ink-soft">
              {c}
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-2 border-t border-line/70 px-5 py-3 text-[13px] text-muted">
        <IconLock size={15} />
        사진은 서로 관심을 보낸 뒤에 공개돼요
      </p>
    </article>
  );
}

export default function Home() {
  return (
    <Shell right={<LoginOrContinue className="text-[15px] text-muted hover:text-ink" />}>
      <section>
        <h1 className="font-serif text-[2.1rem] font-bold leading-[1.3] tracking-tight text-ink sm:text-[2.6rem]">
          연락 스타일과 주말이
          <br />
          맞는 사람
        </h1>
        <p className="mt-5 max-w-[34ch] text-[17px] leading-relaxed text-ink-soft">
          한결은 <strong className="font-semibold text-ink">왜 잘 맞는지, 어디서 부딪힐 수 있는지</strong>까지 알려주는 소개팅이에요.
          사진보다 결을 먼저 보고, 서로 관심이 있을 때 사진을 공개해요.
        </p>
      </section>

      <section className="mt-9">
        <p className="mb-3 px-1 text-[14px] font-semibold text-ink-soft">이런 카드로 소개받아요</p>
        <ExampleCard />
      </section>

      <div className="mt-9">
        {/* 카카오톡 등 앱 안 브라우저에서 누르면 Safari(아이폰)·기본 브라우저로 넘겨 연다 (가입·로그인이 앱 창에 묶이지 않게) */}
        <OpenInBrowserLink href="/start">검사 시작하기</OpenInBrowserLink>
        <p className="mt-3 text-center text-sm text-muted">약 11분이면 끝나고, 무료예요.</p>
        <div className="mt-5">
          <OpenInBrowserLink href="/tour" variant="secondary">
            가입 없이 가상 매칭 먼저 해보기
          </OpenInBrowserLink>
        </div>
      </div>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="font-serif text-2xl font-bold">이렇게 진행돼요</h2>
        <ol className="mt-6 space-y-7">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-x-3">
              <span className="font-serif text-2xl leading-none text-indigo">{i + 1}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="mt-1 text-ink-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="font-serif text-2xl font-bold">왜 결부터 보나요</h2>
        <div className="-mx-5 my-6 sm:mx-0">
          <GrainMark />
        </div>
        <p className="text-ink-soft">
          성격이 비슷하다고 잘 맞는 건 아니라는 연구가 많아요. 오래 만나며 부딪히는 건 연락 빈도, 돈 쓰는 방식, 다툰 뒤 푸는 방법처럼 매일
          마주치는 생활의 결이에요. 한결은 그 부분부터 맞춰보고, 다른 부분은 미리 알려드려요.
        </p>
        <p className="mt-4 text-ink-soft">
          검사는 한결을 만든 사람이 직접 설계했어요. 심리학 대학원에서 검사를 만들고 검증하는 분야(심리측정)를 전공했어요. 성격 문항은
          세계적으로 쓰이는 공개 성격검사(IPIP)를 우리말로 옮겨 썼어요.{" "}
          <Link href="/letter" className="text-ink underline underline-offset-4">
            만든 사람의 편지
          </Link>
        </p>
      </section>
    </Shell>
  );
}
