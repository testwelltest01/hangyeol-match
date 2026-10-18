import Link from "next/link";
import type { ReactNode } from "react";
import { TraitBar, ValueTrack } from "@/components/ReportParts";
import { Callout } from "@/components/app-ui";
import { IconChat, IconFriends, IconGrain, IconLink, IconSliders, IconToday, IconUser } from "@/components/icons";
import type { ExtraCard } from "@/lib/extra/cards";
import { MIN_FRIENDS_FOR_MATCHING } from "@/lib/match/rules";
import type { Trait } from "@/lib/items";
import type { Report } from "@/lib/report";
import { InviteBox } from "./InviteBox";
import { ShareService } from "./ShareService";

function ExtraCards({ cards, admin }: { cards: ExtraCard[]; admin: boolean }) {
  return (
    <ul className="space-y-3">
      {cards.map((c) => (
        <li key={c.id} className="rounded-2xl bg-surface px-5 py-4 ring-1 ring-line/80">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">{c.title}</h3>
            <span className="shrink-0 text-sm text-muted">약 {c.minutes}분</span>
          </div>
          {c.result ? (
            <>
              <p className="mt-2 font-serif leading-relaxed">{c.result.headline}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted">{c.result.share ? "추천받은 상대에게 요약이 보여요" : "나만 볼 수 있어요"}</span>
                {!admin && (
                  <Link href={`/extra/${c.id}`} className="text-muted underline underline-offset-4">
                    다시 하기
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[15px] text-ink-soft">{c.short}</p>
              {admin ? (
                <span className="text-sm text-muted">아직 안 했어요</span>
              ) : (
                <Link href={`/extra/${c.id}`} className="shrink-0 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">
                  시작하기
                </Link>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** 리포트 한 덩어리: 제목(아이콘)과 짧은 설명, 하얀 카드. plain이면 카드 없이 (안에 카드 목록이 있을 때) */
function Section({
  id,
  title,
  lead,
  icon,
  plain = false,
  children,
}: {
  id?: string;
  title: string;
  lead?: string;
  icon?: ReactNode;
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-4">
      <h2 className="flex items-center gap-2 px-1 text-[1.1rem] font-semibold text-ink">
        {icon && <span className="text-indigo">{icon}</span>}
        {title}
      </h2>
      {lead && <p className="mt-1.5 px-1 text-[14px] leading-relaxed text-muted">{lead}</p>}
      <div className={plain ? "mt-4" : "mt-4 rounded-[22px] bg-surface px-5 py-6 ring-1 ring-line/80"}>{children}</div>
    </section>
  );
}

const pill = "inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-soft";

export function ReportParts({
  nickname,
  report,
  friendBigFive,
  friendCount,
  minFriendCount,
  inviteToken,
  viewer = "owner",
  extras = null,
}: {
  nickname: string;
  report: Report;
  friendBigFive: Record<Trait, number> | null;
  friendCount: number;
  minFriendCount: number;
  inviteToken: string | null;
  /** admin이면 관리자 화면 안에서 읽기 전용으로 보여준다 (초대·공유·매칭 버튼 없음) */
  viewer?: "owner" | "admin";
  /** 추가 검사 카드. null이면 섹션을 숨긴다 (0004 SQL 전) */
  extras?: ExtraCard[] | null;
}) {
  const admin = viewer === "admin";
  return (
    <article>
      {admin ? (
        <h2 className="font-serif text-[1.6rem] font-bold leading-tight">{nickname}님의 연애 결</h2>
      ) : (
        <h1 className="font-serif text-[2rem] font-bold leading-tight">{nickname}님의 연애 결</h1>
      )}
      <p className="mt-2 text-[15px] text-ink-soft">검사 답을 바탕으로 정리했어요. 이 결과로 결이 맞는 사람을 추천해요.</p>

      {!admin && (
        <div className="mt-5">
          {friendCount >= MIN_FRIENDS_FOR_MATCHING ? (
            <Callout
              icon={<IconToday size={22} />}
              action={
                <Link href="/match" className={pill}>
                  오늘의 추천 보기
                </Link>
              }
            >
              이 결과로 매일 저녁 8시에 결이 맞는 3명을 추천해요.
            </Callout>
          ) : (
            <Callout
              icon={<IconFriends size={22} />}
              action={
                <a href="#friends" className={pill}>
                  친구에게 평가 부탁하기
                </a>
              }
            >
              친구 {MIN_FRIENDS_FOR_MATCHING}명이 &lsquo;친구가 보는 나&rsquo;를 남기면 매칭을 시작할 수 있어요. 나를 아는 사람의 시선이 있어야 더 믿을 수 있는
              추천이 돼요.
            </Callout>
          )}
        </div>
      )}

      <nav aria-label="리포트 바로가기" className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {[
          { href: "#values", label: "가치관" },
          { href: "#tips", label: "오해 포인트" },
          { href: "#traits", label: "성격" },
          { href: "#friends", label: "친구가 보는 나" },
          ...(extras ? [{ href: "#extra", label: "더 알아보기" }] : []),
          { href: "#conditions", label: "꾸밈과 조건" },
        ].map((l) => (
          <a key={l.href} href={l.href} className="shrink-0 rounded-full bg-surface px-3.5 py-1.5 text-[13.5px] text-ink-soft ring-1 ring-line/80 hover:text-ink">
            {l.label}
          </a>
        ))}
      </nav>

      <Section
        id="values"
        icon={<IconGrain size={20} />}
        title="생활 속 가치관"
        lead="점이 놓인 쪽이 내 생각에 더 가까워요. 영역 옆 문구는 상대와 다를 때 얼마나 신경 쓰이는지예요."
      >
        <div className="divide-y divide-line/70">
          {report.domains.map((d) => (
            <div key={d.domain} className="py-6 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold">{d.label}</h3>
                <span className="shrink-0 text-sm text-muted">{d.importanceLabel}</span>
              </div>
              <div className="mt-3 space-y-4">
                {d.items.map((item) => (
                  <ValueTrack key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="tips" icon={<IconChat size={20} />} title="오해가 생기기 쉬운 순간">
        {report.tips.length ? (
          <ul className="space-y-5">
            {report.tips.map((tip) => (
              <li key={tip} className="border-l-2 border-indigo pl-4 font-serif text-[1.05rem] leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft">
            한쪽으로 크게 기운 답이 없어요. 대부분의 상대와 이야기하며 맞춰갈 수 있는 편이에요.
          </p>
        )}
      </Section>

      <Section
        id="traits"
        icon={<IconUser size={20} />}
        title="성격"
        lead={
          friendBigFive
            ? "동그라미는 내가 본 나, 마름모는 친구들이 본 나예요."
            : "IPIP 성격 5요인 검사 결과예요. 좋고 나쁨이 아니라 방향의 차이예요."
        }
      >
        <div className="space-y-7">
          {report.traits.map((t) => (
            <TraitBar key={t.trait} trait={t} friendScore={friendBigFive?.[t.trait]} />
          ))}
        </div>
      </Section>

      <Section id="friends" icon={<IconFriends size={20} />} title="친구가 보는 나">
        {admin ? (
          <p className="text-ink-soft">
            친구 {friendCount}명이 평가했어요. 회원에게는 {minFriendCount}명 이상일 때부터 평균이 보여요.
          </p>
        ) : (
          <InviteBox initialToken={inviteToken} count={friendCount} minCount={minFriendCount} />
        )}
      </Section>

      {extras && (
        <Section
          id="extra"
          plain
          icon={<IconToday size={20} />}
          title="더 알아보기"
          lead="한결이 직접 만든 짧은 시범 검사예요. 하고 싶은 것만 골라서 해보세요. 추천 계산에는 쓰지 않아요."
        >
          <ExtraCards cards={extras} admin={admin} />
        </Section>
      )}

      <Section id="conditions" icon={<IconSliders size={20} />} title="꾸밈과 조건">
        <dl className="grid grid-cols-[6.5rem_1fr] gap-y-3 text-[15px]">
          <dt className="text-muted">나의 꾸밈</dt>
          <dd>{report.groomingLabel}</dd>
          <dt className="text-muted">편한 상대</dt>
          <dd>{report.groomingPreferenceLabel}</dd>
          {report.dealbreakers.map((d) => (
            <div key={d.label} className="contents">
              <dt className="text-muted">{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {!admin && (
        <Section icon={<IconLink size={20} />} title="친구에게 한결 알리기" lead="결이 맞는 사람을 찾는 친구가 있다면 소개해주세요.">
          <ShareService />
        </Section>
      )}
    </article>
  );
}
