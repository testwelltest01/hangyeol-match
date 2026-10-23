import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CopyText } from "@/components/CopyText";
import { GrainMark } from "@/components/GrainMark";
import { Shell } from "@/components/Shell";
import { ZoomImage } from "@/components/ZoomImage";

export const metadata: Metadata = {
  title: "만든 사람의 편지 | 한결",
  description: "정식 개시 목표일(2027년 1월 1일, 휴대폰 본인인증 연동), 한결을 만든 이유, 본인확인이 필요한 이유, 후원 안내를 편지로 전합니다.",
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

export default function LetterPage() {
  return (
    <Shell back={{ href: "/", label: "뒤로", history: true }} hideLetter>
      <article className="rounded-2xl border border-line bg-surface px-6 py-10 font-serif text-[17px] leading-[1.9] text-ink-soft shadow-[0_1px_0_rgba(31,47,92,0.04)] sm:px-10">
        {/* 맨 앞에 강조: 정식 개시 목표일과, 그 전까지는 본인인증이 없다는 것 */}
        <aside aria-label="정식 개시 안내" className="mb-9 rounded-xl border-2 border-primary/70 bg-primary/5 px-5 py-5 font-sans">
          <p className="text-[13px] font-semibold text-primary">먼저 알려드립니다</p>
          <p className="mt-1 font-serif text-[1.35rem] font-bold leading-snug text-ink">
            정식 개시 목표일은 <span className="whitespace-nowrap text-primary">2027년 1월 1일</span>입니다
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            심리검사 기반 소개팅 서비스 한결은 <strong className="text-ink">휴대폰 본인인증을 연동</strong>해 2027년 1월 1일에 정식으로 문을 여는 것을
            목표로 하고 있습니다.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            그때까지도 검사와 소개팅(매일 저녁 추천, 대화, 연락처 주고받기)은 지금처럼 이용하실 수 있습니다. 다만{" "}
            <strong className="text-ink">아직 본인인증 서비스가 없어서</strong> 상대가 확인된 사람이라고 보장해 드릴 수 없습니다. 처음 만날 때는 사람이
            많은 곳에서 조금 더 조심해 주세요.
          </p>
        </aside>

        <p className="font-sans text-sm text-muted">한결을 만든 사람의 편지</p>
        <h1 className="mt-2 text-[1.7rem] font-bold leading-snug text-ink">
          결이 맞는 사람을
          <br />
          만나길 바라며
        </h1>

        {/* 인사와 만든 사람 그림. 휴대폰: 그림 | 첫 인사, 다음 문단은 전체 폭. 넓은 화면: 두 문단 | 그림 (남는 높이는 셋째 줄이 받는다) */}
        <div className="mt-8 grid grid-cols-[6rem_1fr] items-center gap-x-4 gap-y-4 sm:grid-cols-[1fr_9rem] sm:grid-rows-[auto_auto_1fr] sm:items-start sm:gap-x-8">
          <figure className="sm:col-start-2 sm:row-span-3 sm:row-start-1">
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-line bg-mist">
              <ZoomImage src="/letter/choi-hyunseok.webp" alt="한결을 만든 최현석" />
            </div>
          </figure>
          <p className="sm:col-start-1 sm:row-start-1">안녕하세요. 한결을 만든 최현석입니다.</p>
          <p className="col-span-2 sm:col-span-1 sm:col-start-1 sm:row-start-2">
            이 편지를 열어주셔서 감사합니다. 한결이 어떻게 시작되었는지, 그리고 앞으로 어떻게 바뀔지 솔직하게
            적어보겠습니다.
          </p>
        </div>

        <Part title="한결을 만든 이유">
          <p>
            저는 심리학을 전공하고 심리학 대학원을 수료했습니다. 사람의 마음에 관심이 많은 채로 서른이 되었고, 자연스럽게
            오래 함께할 사람을 진지하게 만나는 일, 그러니까 소개팅에도 관심이 생겼습니다.
          </p>
          <p>
            그러다 궁금해졌습니다. 정말로 &lsquo;잘 맞는 성격&rsquo;이라는 게 있을까? 그런데 지금까지의 연구를 찾아보니,
            어떤 성격끼리 만나야 잘 된다는 조합은 생각보다 거의 없었습니다.
          </p>
          <p>
            오히려 국내 한 연애 관련 회사의 연구를 보면서, 연락은 얼마나 자주 할지, 돈은 어떻게 쓸지, 다투면 어떻게 풀지처럼
            연애의 기본과 서로 맞춰가야 할 것들이 더 중요할 수도 있겠다는 생각이 들었습니다. 한결이 성격보다 생활 속 가치관을
            먼저 보는 이유입니다. 언젠가는 연애에 꼭 맞는 성격 척도도 직접 만들어보고 싶습니다.
          </p>
          <p>
            소개팅 앱을 직접 써보려고도 했습니다. 그런데 생각보다 너무 비쌌습니다. 좋은 사람을 만나는 데 돈이 부담이 되지
            않았으면 했습니다.
          </p>
          <p>
            요즘은 연애하는 사람이 많이 줄었다고 합니다. 더 많은 사람이 연애했으면 좋겠습니다. 데이트하러 나가는 사람이 늘면
            동네 가게들도 조금은 더 바빠지지 않을까 하는 막연한 기대도 있습니다. 무엇보다 남자와 여자가 서로를 조금 더
            이해하는 세상이 왔으면 좋겠습니다.
          </p>
          <p>이런 마음들이 모여 한결을 만들기 시작했습니다.</p>
        </Part>

        <Part title="지금의 한결은 시험 버전입니다">
          <p>
            지금 보고 계신 사이트는 한결이 앱으로 나오기 전에 미리 열어둔 시험 버전입니다. 아직 다듬는 중이라 부족한 점이
            많습니다. 불편한 점을 알려주시면 하나씩 고쳐가겠습니다.
          </p>
          <div className="rounded-xl bg-mist px-5 py-4 font-sans text-[15px] leading-relaxed text-ink">
            정식으로 문을 열면(목표 2027년 1월 1일) <strong>휴대폰 본인확인 절차</strong>가 추가됩니다. 그때 지금 사이트의 모든 정보(검사 결과, 사진,
            연락처, 매칭·대화 기록)는 <strong>초기화</strong>되고, 이 사이트는 더 이상 쓰지 않습니다. 바뀌기 전에 가입하신
            이메일로 미리 알려드리겠습니다.
          </div>
        </Part>

        <Part title="본인확인이 필요한 이유">
          <p>
            본인확인은 &lsquo;이 사람이 정말 그 사람인지&rsquo;를 휴대폰으로 한 번 확인하는 절차입니다. 조금 번거롭게 느껴질
            수 있지만, 사람과 사람을 이어주는 서비스에서는 꼭 필요합니다.
          </p>
          <ol className="space-y-3">
            <Reason n={1} title="미성년자를 지킵니다.">
              지금은 출생연도를 적기만 하면 누구나 어른이라고 할 수 있습니다. 본인확인을 하면 실제 나이를 확인할 수
              있습니다.
            </Reason>
            <Reason n={2} title="가짜 계정을 막습니다.">
              한 사람이 계정을 여러 개 만들어 사기를 치거나 홍보하는 일을 막을 수 있습니다.
            </Reason>
            <Reason n={3} title="신고가 제대로 힘을 가집니다.">
              문제를 일으킨 사람이 이메일만 바꿔 다시 가입하는 일을 막을 수 있습니다.
            </Reason>
          </ol>
          <p>
            그래서 상대가 실제로 있는, 확인된 사람이라는 믿음 위에서 만날 수 있습니다. 본인확인으로 받은 정보는 확인하는
            데만 쓰고, 이름이나 전화번호를 상대에게 보여주지 않습니다.
          </p>
        </Part>

        <Part title="한결이 계속 무료이려면">
          <p>
            한결은 앞으로도 무료로 운영하고 싶습니다. 다만 함께하는 분이 많아질수록 데이터를 안전하게 보관하고, 서버를
            관리하고, AI 사진 피드백을 돌리는 데 드는 비용도 함께 늘어납니다.
          </p>
          <p>
            한결이 계속 무료로 이어질 수 있도록 마음을 보태주시면 정말 큰 힘이 됩니다. 보내주신 후원은 서버와 데이터 관리
            비용에 소중히 쓰겠습니다.
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
            후원은 전혀 의무가 아닙니다. 후원 여부는 추천에 아무 영향도 주지 않습니다.
          </p>
        </Part>

        <Part title="좋은 인연을 만나길">
          <p>
            사람을 만나는 일은 늘 조금 떨리고, 가끔은 지치기도 합니다. 그래도 나와 결이 맞는 사람은 분명 어딘가에 있다고
            믿습니다.
          </p>
          <p>
            한결에서 만난 분이 꼭 정답이 아니어도 괜찮습니다. 서로를 알아가는 동안 나를 조금 더 알게 된다면, 그것만으로도
            충분히 의미 있는 시간일 것입니다.
          </p>
          <p>여러분이 좋은 인연을 만나길 진심으로 바랍니다.</p>
        </Part>

        <div className="mt-12 text-right">
          <p className="text-[15px] text-muted">2026년 10월</p>
          <p className="mt-1 text-ink">한결을 만든 최현석 드림</p>
        </div>

        <div className="-mx-2 mt-10 opacity-80" aria-hidden>
          <GrainMark />
        </div>

        <p className="mt-6 font-sans text-sm leading-relaxed text-muted">
          궁금한 점이나 하고 싶은 말씀이 있으면 testwelltest01@gmail.com으로 보내주십시오. 하나하나 읽겠습니다.
        </p>
      </article>
    </Shell>
  );
}
