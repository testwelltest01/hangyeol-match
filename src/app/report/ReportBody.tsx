import type { ReactNode } from "react";
import { TraitBar, ValueTrack } from "@/components/ReportParts";
import type { Trait } from "@/lib/items";
import type { Report } from "@/lib/report";
import { DeleteAccount } from "./DeleteAccount";
import { InviteBox } from "./InviteBox";
import { ShareService } from "./ShareService";

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-12 border-t border-line pt-8">
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
}: {
  nickname: string;
  report: Report;
  friendBigFive: Record<Trait, number> | null;
  friendCount: number;
  minFriendCount: number;
  inviteToken: string | null;
}) {
  return (
    <article>
      <h1 className="font-serif text-[2rem] font-bold leading-tight">{nickname}님의 연애 결</h1>
      <p className="mt-3 text-ink-soft">
        검사 답을 바탕으로 정리했어요. 매칭이 열리면 이 결과로 결이 맞는 사람을 추천해요.
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

      <Section title="친구가 보는 나">
        <InviteBox initialToken={inviteToken} count={friendCount} minCount={minFriendCount} />
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

      <Section title="매칭은 곧 열려요" lead="사용자가 모이면 이 결과로 결이 맞는 사람을 하루 3명씩 추천해요. 친구에게 알려주면 더 빨리 열려요.">
        <ShareService />
      </Section>

      <DeleteAccount />
    </article>
  );
}
