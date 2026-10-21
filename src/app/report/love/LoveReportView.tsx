import type { ReactNode } from "react";
import { IconCheck } from "@/components/icons";
import { LOVE_GROUPS, LOVE_SCALES } from "@/lib/love/items";
import { SITUATIONS, type LoveReport, type Scene } from "@/lib/love/prompt";
import { lovePercent, type LoveScores } from "@/lib/love/score";

/** 척도 하나: 낮은 쪽 말 ↔ 높은 쪽 말 사이 결 위에 점. 가까운 쪽 말을 진하게 */
function ScaleTrack({ label, low, high, score }: { label: string; low: string; high: string; score: number }) {
  const pos = lovePercent(score);
  const side = pos < 40 ? "low" : pos > 60 ? "high" : "mid";
  return (
    <div>
      <p className="text-[15px] font-semibold text-ink">{label}</p>
      <div className="mt-1 flex justify-between gap-4 text-[13.5px]">
        <span className={side === "low" ? "font-semibold text-ink" : "text-muted"}>{low}</span>
        <span className={`text-right ${side === "high" ? "font-semibold text-ink" : "text-muted"}`}>{high}</span>
      </div>
      <div className="relative mx-2 mt-2 h-4" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-px -translate-y-1/2 bg-line" />
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo" style={{ left: `${pos}%` }} />
      </div>
      <p className="sr-only">
        {low}에서 {high} 사이, 100 중 {pos}
      </p>
    </div>
  );
}

function Block({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="px-1 text-[1.05rem] font-semibold text-ink">{title}</h2>
      {lead && <p className="mt-1 px-1 text-[14px] leading-relaxed text-muted">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SceneCard({ n, id, title, scene }: { n: number; id: string; title: string; scene: Scene }) {
  return (
    <li id={`scene-${id}`} className="scroll-mt-4 rounded-[22px] bg-surface px-5 py-6 ring-1 ring-line/80">
      <p className="text-[13px] font-semibold text-indigo">장면 {n}</p>
      <h3 className="mt-0.5 font-serif text-[1.2rem] font-bold leading-snug text-ink">{title}</h3>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink">{scene.me}</p>
      <dl className="mt-5 space-y-4 border-t border-line/70 pt-5 text-[15px] leading-relaxed">
        <div>
          <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <span aria-hidden className="text-[10px] text-indigo">
              ◆
            </span>
            상대에게는 이렇게 보일 수 있어요
          </dt>
          <dd className="mt-1 text-ink-soft">{scene.seen}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-semibold text-muted">이렇게 해 보면 좋아요</dt>
          <dd className="mt-1 text-ink-soft">{scene.tip}</dd>
        </div>
      </dl>
      <figure className="mt-5">
        <figcaption className="text-right text-[12.5px] font-semibold text-muted">이렇게 말해 보세요</figcaption>
        <blockquote className="ml-auto mt-1.5 w-fit max-w-[88%] rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-white">
          {scene.say}
        </blockquote>
      </figure>
    </li>
  );
}

/** 다 쓴 보고서. 한 줄 요약 → 마음의 결 12가지 → 강점 → 장면 10가지 → 잘 맞는 결 → 한 가지 */
export function LoveReportView({ report, scores, completedAt }: { report: LoveReport; scores: LoveScores; completedAt: string | null }) {
  const date = completedAt
    ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(completedAt))
    : null;
  return (
    <article>
      <p className="text-sm font-semibold text-indigo">연애 상황 보고서</p>
      <h1 className="mt-1.5 font-serif text-[1.8rem] font-bold leading-snug text-ink">{report.headline}</h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">{report.summary}</p>

      <Block title="연애에서 나의 강점">
        <ul className="space-y-3 rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
          {report.strengths.map((s) => (
            <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-ink">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss text-white">
                <IconCheck size={12} strong />
              </span>
              {s}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="장면별로 보면" lead="연애에서 자주 만나는 10가지 장면이에요. 궁금한 장면부터 눌러 보세요.">
        <nav aria-label="장면 바로가기" className="flex flex-wrap gap-2">
          {SITUATIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#scene-${s.id}`}
              className="rounded-full bg-surface px-3 py-1.5 text-[13.5px] text-ink-soft ring-1 ring-line/80 hover:bg-mist"
            >
              <span className="mr-1 text-indigo">{i + 1}</span>
              {s.short}
            </a>
          ))}
        </nav>
        <ol className="mt-5 space-y-4">
          {SITUATIONS.map((s, i) => (
            <SceneCard key={s.id} n={i + 1} id={s.id} title={s.title} scene={report.situations[s.id]} />
          ))}
        </ol>
      </Block>

      <Block title="나와 결이 맞는 사람">
        <div className="space-y-5 rounded-[22px] bg-surface px-5 py-6 ring-1 ring-line/80 text-[15px] leading-relaxed">
          <div>
            <p className="text-[13px] font-semibold text-moss">잘 맞는 결</p>
            <p className="mt-1 text-ink">{report.match.good}</p>
          </div>
          <div className="border-t border-line/70 pt-5">
            <p className="text-[13px] font-semibold text-indigo">먼저 이야기해 두면 좋은 결</p>
            <p className="mt-1 text-ink">{report.match.careful}</p>
          </div>
        </div>
      </Block>

      <Block title="마음의 결 12가지" lead="보고서의 바탕이 된 검사 결과예요. 점이 가까운 쪽이 나에 더 가까워요. 좋고 나쁨이 아니라 방향의 차이예요.">
        <div className="space-y-4">
          {LOVE_GROUPS.map((g) => (
            <div key={g.id} className="rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
              <h3 className="text-[13px] font-semibold text-muted">{g.label}</h3>
              <div className="mt-3 space-y-5">
                {LOVE_SCALES.filter((s) => s.group === g.id).map((s) => (
                  <ScaleTrack key={s.id} label={s.label} low={s.low} high={s.high} score={scores[s.id]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Block>

      <section className="mt-10 rounded-[22px] bg-indigo/5 px-5 py-6 ring-1 ring-indigo/15">
        <h2 className="text-[13px] font-semibold text-indigo">더 편한 연애를 위해 한 가지만</h2>
        <p className="mt-2 font-serif text-[1.1rem] leading-relaxed text-ink">{report.one_thing}</p>
      </section>

      <p className="mt-8 px-1 text-[13px] leading-relaxed text-muted">
        공개 성격검사(IPIP) 문항으로 잰 결과와 기본 검사 결과를 바탕으로 AI(OpenAI)가 쓴 보고서예요{date ? ` (${date})` : ""}. 진단이 아니라 나를 돌아보는
        참고용이고, 나만 볼 수 있어요. 추천 계산에는 쓰지 않아요.
      </p>
    </article>
  );
}
