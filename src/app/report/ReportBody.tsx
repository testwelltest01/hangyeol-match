import type { ReactNode } from "react";
import { TraitBar, ValueTrack } from "@/components/ReportParts";
import { PrimaryLink } from "@/components/Shell";
import { MIN_FRIENDS_FOR_MATCHING } from "@/lib/match/rules";
import type { Trait } from "@/lib/items";
import type { Report } from "@/lib/report";
import { InviteBox } from "./InviteBox";
import { ShareService } from "./ShareService";

function Section({ id, title, lead, children }: { id?: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-6 border-t border-line pt-8">
      <h2 className="font-serif text-2xl font-bold">{title}</h2>
      {lead && <p className="mt-2 text-ink-soft">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ReportParts({
  nickname,
  report,
  friendBigFive,
  friendCount,
  minFriendCount,
  inviteToken,
  viewer = "owner",
}: {
  nickname: string;
  report: Report;
  friendBigFive: Record<Trait, number> | null;
  friendCount: number;
  minFriendCount: number;
  inviteToken: string | null;
  /** admin이면 관리자 화면 안에서 읽기 전용으로 보여준다 (초대·공유·매칭 버튼 없음) */
  viewer?: "owner" | "admin";
}) {
  const admin = viewer === "admin";
  return (
    <article>
      {admin ? (
        <h2 className="font-serif text-[1.6rem] font-bold leading-tight">{nickname}님의 연애 결</h2>
      ) : (
        <h1 className="font-serif text-[2rem] font-bold leading-tight">{nickname}님의 연애 결</h1>
      )}
      <p className="mt-3 text-ink-soft">
        검사 답을 바탕으로 정리했어요. 이 결과로 결이 맞는 사람을 추천해요.
      </p>

      <Section
        title="생활 속 가치관"
        lead="점이 놓인 쪽이 내 생각에 더 가까워요. 영역 옆 문구는 상대와 다를 때 얼마나 신경 쓰이는지예요."
      >
        <div className="space-y-9">
          {report.domains.map((d) => (
            <div key={d.domain}>
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

      <Section title="오해가 생기기 쉬운 순간">
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

      <Section id="friends" title="친구가 보는 나">
        {admin ? (
          <p className="text-ink-soft">
            친구 {friendCount}명이 평가했어요. 회원에게는 {minFriendCount}명 이상일 때부터 평균이 보여요.
          </p>
        ) : (
          <InviteBox initialToken={inviteToken} count={friendCount} minCount={minFriendCount} />
        )}
      </Section>

      <Section title="꾸밈과 조건">
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
        <Section title="이제 추천받기" lead="이 결과로 결이 맞는 사람을 매일 3명씩 추천해요. 지역과 조건, 사진 2장, 연락처를 채우면 바로 시작돼요.">
          {friendCount >= MIN_FRIENDS_FOR_MATCHING ? (
            <PrimaryLink href="/match">매칭 시작하기</PrimaryLink>
          ) : (
            <p className="rounded-xl bg-mist px-4 py-3.5 text-[15px] text-ink-soft">
              친구 {MIN_FRIENDS_FOR_MATCHING}명 이상이 위의 &quot;친구가 보는 나&quot;를 평가해주면 매칭을 시작할 수 있어요. 나를 아는 사람의
              시선이 있어야 더 믿을 수 있는 추천이 돼요.
            </p>
          )}
          <div className="mt-6">
            <ShareService />
          </div>
        </Section>
      )}
    </article>
  );
}
