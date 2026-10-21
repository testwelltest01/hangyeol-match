import Link from "next/link";
import { GrainMark } from "@/components/GrainMark";
import { LoginOrContinue } from "@/components/HomeLink";
import { PrimaryLink } from "@/components/buttons";
import { Shell } from "@/components/Shell";

const STEPS = [
  {
    title: "검사하기",
    body: "연락, 갈등, 돈, 주말처럼 연애에서 실제로 부딪히는 8가지 생활 영역과 성격을 물어요.",
  },
  {
    title: "리포트 받기",
    body: "나의 연애 결과, 상대와 다를 때 오해가 생기기 쉬운 순간을 알려드려요.",
  },
  {
    title: "추천받기",
    body: "매일 결이 맞는 3명을 추천해요. 서로 관심을 보내면 사진이, 서로 수락하면 연락처가 공개돼요.",
  },
];

export default function Home() {
  return (
    <Shell
      right={<LoginOrContinue className="text-[15px] text-muted hover:text-ink" />}
    >
      <section>
        <h1 className="font-serif text-[2.1rem] font-bold leading-[1.3] tracking-tight text-ink sm:text-[2.6rem]">
          연락 스타일과 주말이
          <br />
          맞는 사람
        </h1>
        <p className="mt-5 max-w-[34ch] text-[17px] leading-relaxed text-ink-soft">
          한결은 가치관 검사로 나와 결이 맞는 사람을 찾는 소개팅 서비스예요. 사진보다 검사 결과를 먼저 보고, 서로
          관심이 있을 때 사진을 공개해요.
        </p>
      </section>

      <div className="-mx-5 my-10 sm:mx-0">
        <GrainMark />
      </div>

      <div>
        <PrimaryLink href="/start">검사 시작하기</PrimaryLink>
        <p className="mt-3 text-center text-sm text-muted">약 11분이면 끝나고, 무료예요.</p>
        <p className="mt-4 text-center">
          <Link href="/tour" className="text-[15px] text-ink underline underline-offset-4">
            가입 전에 가상 매칭 둘러보기
          </Link>
        </p>
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
        <h2 className="font-serif text-2xl font-bold">왜 가치관부터 보나요</h2>
        <p className="mt-4 text-ink-soft">
          성격이 비슷하다고 잘 맞는 건 아니라는 연구가 많아요. 한결은 연락 빈도, 돈 쓰는 방식, 다툰 뒤 푸는 방법처럼
          함께 지내면 매일 마주치는 부분부터 맞춰봐요.
        </p>
      </section>
    </Shell>
  );
}
