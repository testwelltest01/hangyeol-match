import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CopyText } from "@/components/CopyText";
import { GrainMark } from "@/components/GrainMark";
import { Shell } from "@/components/Shell";
import { AppNav, PublicNav } from "@/components/ui";
import { getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "만든 사람의 편지 | 한결",
  description: "한결을 만든 이유, 앞으로 바뀌는 점, 본인확인이 필요한 이유, 후원 안내를 편지로 전해요.",
};

const ACCOUNT = { bank: "국민은행", number: "612502-01-316396", holder: "최현석" };

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-serif text-[1.25rem] font-bold text-ink">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Reason({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr] gap-x-2">
      <span className="font-serif text-lg leading-[1.9] text-indigo">{n}</span>
      <span>
        <strong className="font-semibold text-ink">{title}</strong> {children}
      </span>
    </li>
  );
}

/** 편지는 누구나 읽을 수 있다. 로그인했으면 평소 메뉴를, 아니면 편지와 로그인만 보여준다 */
async function LetterNav() {
  const userId = await getUserId();
  if (userId) return <AppNav current="letter" />;
  return (
    <PublicNav current="letter">
      <Link href="/login" className="text-muted hover:text-ink">
        로그인
      </Link>
    </PublicNav>
  );
}

export default function LetterPage() {
  return (
    <Shell
      header={
        <Suspense fallback={<PublicNav current="letter" />}>
          <LetterNav />
        </Suspense>
      }
    >
      <article className="rounded-2xl border border-line bg-surface px-6 py-10 font-serif text-[17px] leading-[1.9] text-ink-soft shadow-[0_1px_0_rgba(31,47,92,0.04)] sm:px-10">
        <p className="font-sans text-sm text-muted">한결을 만든 사람의 편지</p>
        <h1 className="mt-2 text-[1.7rem] font-bold leading-snug text-ink">
          결이 맞는 사람을
          <br />
          만나길 바라며
        </h1>

        <div className="mt-8 space-y-4">
          <p>안녕하세요. 한결을 만든 최현석이에요.</p>
          <p>
            이 편지를 열어주셔서 고마워요. 한결이 어떻게 시작됐는지, 그리고 앞으로 어떻게 바뀔지 솔직하게 적어볼게요.
          </p>
        </div>

        <Part title="한결을 만든 이유">
          <p>
            저는 심리학을 전공하고 심리학 대학원을 수료했어요. 사람의 마음에 관심이 많은 채로 서른이 되었고, 자연스럽게
            오래 함께할 사람을 진지하게 만나는 일, 그러니까 소개팅에도 관심이 생겼어요.
          </p>
          <p>
            그러다 궁금해졌어요. 정말로 &lsquo;잘 맞는 성격&rsquo;이라는 게 있을까? 그런데 지금까지의 연구를 찾아보면, 어떤
            성격끼리 만나야 잘 된다는 조합은 생각보다 거의 없었어요.
          </p>
          <p>
            오히려 국내 한 연애 관련 회사의 연구를 보면서, 연락은 얼마나 자주 할지, 돈은 어떻게 쓸지, 다투면 어떻게 풀지처럼
            연애의 기본과 서로 맞춰가야 할 것들이 더 중요할 수도 있겠다는 생각이 들었어요. 한결이 성격보다 생활 속 가치관을
            먼저 보는 이유예요. 언젠가는 연애에 꼭 맞는 성격 척도도 직접 만들어보고 싶어요.
          </p>
          <p>
            소개팅 앱을 직접 써보려고도 했어요. 그런데 생각보다 너무 비싸더라고요. 좋은 사람을 만나는 데 돈이 부담이 되지
            않았으면 했어요.
          </p>
          <p>
            요즘은 연애하는 사람이 많이 줄었다고 해요. 더 많은 사람이 연애했으면 좋겠어요. 데이트하러 나가는 사람이 늘면 동네
            가게들도 조금은 더 바빠지지 않을까 하는 막연한 기대도 있고요. 무엇보다 남자와 여자가 서로를 조금 더 이해하는
            세상이 왔으면 좋겠어요.
          </p>
          <p>이런 마음들이 모여서 한결을 만들기 시작했어요.</p>
        </Part>

        <Part title="지금의 한결은 시험 버전이에요">
          <p>
            지금 보고 계신 사이트는 한결이 앱으로 나오기 전에 미리 열어둔 시험 버전이에요. 아직 다듬는 중이라 부족한 점이
            많아요. 불편한 점을 알려주시면 하나씩 고쳐갈게요.
          </p>
          <div className="rounded-xl bg-mist px-5 py-4 font-sans text-[15px] leading-relaxed text-ink">
            앱이 나오면 <strong>휴대폰 본인확인 절차</strong>가 추가돼요. 그때 지금 사이트의 모든 정보(검사 결과, 사진, 연락처,
            매칭 기록)는 <strong>초기화</strong>되고, 이 사이트는 더 이상 쓰지 않아요. 바뀌기 전에 가입하신 이메일로 미리
            알려드릴게요.
          </div>
        </Part>

        <Part title="본인확인은 왜 필요할까요">
          <p>
            본인확인은 &lsquo;이 사람이 정말 그 사람인지&rsquo;를 휴대폰으로 한 번 확인하는 절차예요. 조금 번거롭게 느껴질 수
            있지만, 사람과 사람을 이어주는 서비스에서는 꼭 필요해요.
          </p>
          <ol className="space-y-3">
            <Reason n={1} title="미성년자를 지켜요.">
              지금은 출생연도를 적기만 하면 누구나 어른이라고 할 수 있어요. 본인확인을 하면 실제 나이를 확인할 수 있어요.
            </Reason>
            <Reason n={2} title="가짜 계정을 막아요.">
              한 사람이 계정을 여러 개 만들어 사기를 치거나 홍보하는 일을 막을 수 있어요.
            </Reason>
            <Reason n={3} title="신고가 제대로 힘을 가져요.">
              문제를 일으킨 사람이 이메일만 바꿔 다시 가입하는 일을 막을 수 있어요.
            </Reason>
          </ol>
          <p>
            그래서 상대가 실제로 있는, 확인된 사람이라는 믿음 위에서 만날 수 있어요. 본인확인으로 받은 정보는 확인하는 데만
            쓰고, 이름이나 전화번호를 상대에게 보여주지 않아요.
          </p>
        </Part>

        <Part title="한결이 계속 무료이려면">
          <p>
            한결은 앞으로도 무료로 운영하고 싶어요. 다만 함께하는 분이 많아질수록 데이터를 안전하게 보관하고, 서버를 관리하고,
            AI 사진 피드백을 돌리는 데 드는 비용도 함께 늘어나요.
          </p>
          <p>
            한결이 계속 무료로 이어질 수 있도록 마음을 보태주시면 정말 큰 힘이 돼요. 보내주신 후원은 서버와 데이터 관리
            비용에 소중히 쓸게요.
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-paper px-5 py-4 font-sans">
            <div>
              <p className="text-sm text-muted">후원 계좌</p>
              <p className="mt-1 text-[15px] text-ink-soft">{ACCOUNT.bank}</p>
              <p className="whitespace-nowrap text-[18px] font-semibold tracking-wide text-ink">{ACCOUNT.number}</p>
              <p className="text-[15px] text-ink-soft">예금주 {ACCOUNT.holder}</p>
            </div>
            <CopyText text={`${ACCOUNT.bank} ${ACCOUNT.number}`} label="계좌 복사" />
          </div>
          <p className="font-sans text-sm leading-relaxed text-muted">
            후원은 전혀 의무가 아니에요. 후원 여부는 추천에 아무 영향도 주지 않아요.
          </p>
        </Part>

        <Part title="좋은 인연을 만나길">
          <p>사람을 만나는 일은 늘 조금 떨리고, 가끔은 지치기도 해요. 그래도 나와 결이 맞는 사람은 분명 어딘가에 있다고 믿어요.</p>
          <p>
            한결에서 만난 분이 꼭 정답이 아니어도 괜찮아요. 서로를 알아가는 동안 나를 조금 더 알게 된다면, 그것만으로도 충분히
            의미 있는 시간일 거예요.
          </p>
          <p>여러분이 좋은 인연을 만나길 진심으로 바랄게요.</p>
        </Part>

        <div className="mt-12 text-right">
          <p className="text-[15px] text-muted">2026년 10월</p>
          <p className="mt-1 text-ink">한결을 만든 최현석 드림</p>
        </div>

        <div className="-mx-2 mt-10 opacity-80" aria-hidden>
          <GrainMark />
        </div>

        <p className="mt-6 font-sans text-sm leading-relaxed text-muted">
          궁금한 점이나 하고 싶은 말은 testwelltest01@gmail.com으로 편하게 보내주세요.
        </p>
      </article>
    </Shell>
  );
}
