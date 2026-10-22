import Link from "next/link";
import type { ReactNode } from "react";
import { IconCheck, IconCross } from "@/components/icons";
import { ShareLink } from "@/components/ShareLink";
import { ReportTabs } from "@/app/report/ReportTabs";
import { RewriteOffer } from "./RewriteOffer";
import { SceneCarousel } from "./SceneCarousel";
import { LOVE_GROUPS, LOVE_SCALES } from "@/lib/love/items";
import { PROMPT_NEWS, SITUATIONS, type LoveReport, type Scene, type SituationId, type TalkLine } from "@/lib/love/prompt";
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

function Part({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-1 text-[1.05rem] font-semibold text-ink">{title}</h2>
      {lead && <p className="mt-1 px-1 text-[14px] leading-relaxed text-muted">{lead}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** 대화 한 줄: 상대는 왼쪽(아래에 점선 말풍선으로 속마음), 나는 오른쪽. 각자 처음 말할 때만 '상대'·'나' 이름표 */
function TalkBubble({ line, good, label }: { line: TalkLine; good: boolean; label: boolean }) {
  if (line.who === "me") {
    return (
      <div className="flex flex-col items-end">
        {label && <span className="mb-1 mr-1 text-[12px] text-muted">나</span>}
        <p
          className={`max-w-[85%] rounded-[18px] rounded-br-md px-3.5 py-2 text-[14.5px] leading-relaxed text-white ${good ? "bg-primary" : "bg-muted"}`}
        >
          <span className="sr-only">나: </span>
          {line.text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start">
      {label && <span className="mb-1 ml-1 text-[12px] text-muted">상대</span>}
      <p className="max-w-[85%] rounded-[18px] rounded-bl-md bg-surface px-3.5 py-2 text-[14.5px] leading-relaxed text-ink ring-1 ring-line/80">
        <span className="sr-only">상대: </span>
        {line.text}
      </p>
      {line.thought && (
        <p className="ml-3 mt-1.5 max-w-[85%] rounded-[16px] border border-dashed border-indigo/45 bg-surface/70 px-3 py-1.5 text-[13.5px] leading-snug text-ink-soft">
          <span className="mr-1.5 text-[12px] font-semibold text-indigo">속마음</span>
          {line.thought}
        </p>
      )}
    </div>
  );
}

function Dialogue({ kind, lines }: { kind: "bad" | "good"; lines: TalkLine[] }) {
  const good = kind === "good";
  return (
    <div className={`rounded-[18px] px-3.5 pb-4 pt-3.5 ${good ? "bg-moss/[0.1] ring-1 ring-moss/30" : "bg-mist/80"}`}>
      <p className={`flex items-center gap-1.5 text-[13.5px] font-semibold ${good ? "text-moss" : "text-muted"}`}>
        <span aria-hidden className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-white ${good ? "bg-moss" : "bg-muted/80"}`}>
          {good ? <IconCheck size={11} strong /> : <IconCross size={11} strong />}
        </span>
        {good ? "좋은 대화" : "아쉬운 대화"}
      </p>
      <div className="mt-3 space-y-2.5">
        {lines.map((line, i) => (
          <TalkBubble key={i} line={line} good={good} label={lines.findIndex((l) => l.who === line.who) === i} />
        ))}
      </div>
    </div>
  );
}

function SceneCard({ n, id, title, scene, image }: { n: number; id: string; title: string; scene: Scene; image?: string }) {
  return (
    <article id={`scene-${id}`} className="overflow-hidden rounded-[22px] bg-surface px-5 py-6 ring-1 ring-line/80">
      {image && (
        <div className="-mx-5 -mt-6 mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase 공개 버킷의 장면 사진 (모든 보고서가 같이 쓴다) */}
          <img src={image} alt={`'${title}' 장면 사진`} className="aspect-[3/2] w-full bg-mist object-cover" loading="lazy" decoding="async" />
        </div>
      )}
      <p className="text-[13px] font-semibold text-indigo">장면 {n}</p>
      <h3 className="mt-0.5 font-serif text-[1.2rem] font-bold leading-snug text-ink">{title}</h3>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink">{scene.me}</p>
      <div className="mt-5 border-t border-line/70 pt-5 text-[15px] leading-relaxed">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
          <span aria-hidden className="text-[10px] text-indigo">
            ◆
          </span>
          상대에게는 이렇게 보일 수 있어요
        </p>
        <p className="mt-1 text-ink-soft">{scene.seen}</p>
      </div>

      {scene.talk ? (
        <section className="mt-5 border-t border-line/70 pt-5">
          <h4 className="text-[13px] font-semibold text-muted">대화로 보면</h4>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">{scene.talk.moment}</p>
          <div className="mt-4 space-y-3">
            <Dialogue kind="bad" lines={scene.talk.bad} />
            <Dialogue kind="good" lines={scene.talk.good} />
          </div>
        </section>
      ) : null}

      <div className="mt-5 border-t border-line/70 pt-5 text-[15px] leading-relaxed">
        <p className="text-[13px] font-semibold text-muted">이렇게 해 보면 좋아요</p>
        <p className="mt-1 text-ink-soft">{scene.tip}</p>
      </div>

      {/* 2026-10-v3 전에 쓴 보고서: 대화 예시 대신 한 문장 ('새 보고서 받기'로 바꿀 수 있다) */}
      {!scene.talk && scene.say && (
        <figure className="mt-5">
          <figcaption className="text-right text-[12.5px] font-semibold text-muted">이렇게 말해 보세요</figcaption>
          <blockquote className="ml-auto mt-1.5 w-fit max-w-[88%] rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-white">
            {scene.say}
          </blockquote>
        </figure>
      )}
    </article>
  );
}

/**
 * 다 쓴 보고서. 한 줄 요약 → 화면 안 탭(장면 10가지 슬라이드 · 나의 연애 결(기질·성격, 강점, 잘 맞는 결, 한 가지) · 검사 결과) → 안내.
 * retest면 맨 아래에 '다시 검사하기', share면 그 아래에 이 검사를 친구에게 공유하는 버튼(가입 없이 받는 /love).
 * rewrite가 있으면(예전 PROMPT_VERSION으로 쓴 보고서) 맨 위에 '새 보고서 받기'
 */
export function LoveReportView({
  report,
  scores,
  completedAt,
  retest = false,
  share = false,
  guest = false,
  images = {},
  rewrite,
}: {
  report: LoveReport;
  scores: LoveScores;
  completedAt: string | null;
  retest?: boolean;
  share?: boolean;
  /** 장면 사진 (장면 id → 주소, src/lib/love/sceneImages.ts loadSceneImageUrls). 없는 장면은 사진 없이 */
  images?: Partial<Record<SituationId, string>>;
  /** 가입 전 비회원 보고서 (아래 안내 문구가 다르다) */
  guest?: boolean;
  /** 같은 답으로 새 형식 보고서를 쓰는 서버 액션 (예전 형식 보고서에만 넘긴다) */
  rewrite?: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  // 문항 버전이 바뀌기 전 결과에는 없는 척도가 있어서, 점수가 있는 것만 보여준다
  const shown = LOVE_SCALES.filter((s) => typeof scores[s.id] === "number");
  const date = completedAt
    ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(completedAt))
    : null;
  return (
    <article>
      {rewrite && <RewriteOffer rewrite={rewrite} news={PROMPT_NEWS} />}
      <p className="text-sm font-semibold text-indigo">연애 상황 보고서</p>
      <h1 className="mt-1.5 font-serif text-[1.8rem] font-bold leading-snug text-ink">{report.headline}</h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">{report.summary}</p>

      {/* 길어지지 않게 화면 안 탭 3개로 나눈다: 장면(옆으로 밀어 한 장씩) · 나의 연애 결 · 검사 결과. 고른 탭은 주소 #에 */}
      <ReportTabs
        label="연애 상황 보고서"
        tabs={[
          {
            id: "scenes",
            label: "장면 10가지",
            content: (
              <>
                <p className="mb-4 px-1 text-[14px] leading-relaxed text-muted">연애에서 자주 만나는 장면이에요. 옆으로 밀어 넘겨 보세요.</p>
                <SceneCarousel>
                  {SITUATIONS.map((s, i) => (
                    <SceneCard key={s.id} n={i + 1} id={s.id} title={s.title} scene={report.situations[s.id]} image={images[s.id]} />
                  ))}
                </SceneCarousel>
              </>
            ),
          },
          {
            id: "summary",
            label: "나의 연애 결",
            content: (
              <div className="space-y-8">
                {report.nature && (
                  <Part title="타고난 기질, 다듬어 가는 성격" lead="처음 반응이 어느 쪽으로 기우는지(기질)와, 그 반응을 살면서 어떻게 다루게 됐는지(성격)를 함께 봤어요.">
                    <p className="rounded-[22px] bg-surface px-5 py-5 text-[15px] leading-relaxed text-ink ring-1 ring-line/80">{report.nature}</p>
                  </Part>
                )}
                <Part title="연애에서 나의 강점">
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
                </Part>
                <Part title="나와 결이 맞는 사람">
                  <div className="space-y-5 rounded-[22px] bg-surface px-5 py-6 text-[15px] leading-relaxed ring-1 ring-line/80">
                    <div>
                      <p className="text-[13px] font-semibold text-moss">잘 맞는 결</p>
                      <p className="mt-1 text-ink">{report.match.good}</p>
                    </div>
                    <div className="border-t border-line/70 pt-5">
                      <p className="text-[13px] font-semibold text-indigo">먼저 이야기해 두면 좋은 결</p>
                      <p className="mt-1 text-ink">{report.match.careful}</p>
                    </div>
                  </div>
                </Part>
                <section className="rounded-[22px] bg-indigo/5 px-5 py-6 ring-1 ring-indigo/15">
                  <h2 className="text-[13px] font-semibold text-indigo">더 편한 연애를 위해 한 가지만</h2>
                  <p className="mt-2 font-serif text-[1.1rem] leading-relaxed text-ink">{report.one_thing}</p>
                </section>
              </div>
            ),
          },
          {
            id: "scores",
            label: `검사 결과 ${shown.length}가지`,
            content: (
              <>
                <p className="mb-4 px-1 text-[14px] leading-relaxed text-muted">
                  보고서의 바탕이 된 검사 결과예요. 점이 가까운 쪽이 나에 더 가까워요. 좋고 나쁨이 아니라 방향의 차이예요.
                </p>
                <div className="space-y-4">
                  {LOVE_GROUPS.filter((g) => shown.some((s) => s.group === g.id)).map((g) => (
                    <div key={g.id} className="rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
                      <h3 className="text-[13px] font-semibold text-muted">{g.label}</h3>
                      <div className="mt-3 space-y-5">
                        {shown.filter((s) => s.group === g.id).map((s) => (
                          <ScaleTrack key={s.id} label={s.label} low={s.low} high={s.high} score={scores[s.id]} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ),
          },
        ]}
      />

      <p className="mt-8 px-1 text-[13px] leading-relaxed text-muted">
        공개 성격검사(IPIP) 문항과 한결이 만든 기질·성격 문항으로 잰 결과{guest ? "" : ", 기본 검사 결과"}를 바탕으로 AI(OpenAI)가 쓴 보고서예요
        {date ? ` (${date})` : ""}. 진단이 아니라 나를 돌아보는 참고용이고,{" "}
        {guest ? "이 주소를 아는 사람만 볼 수 있어요." : "나만 볼 수 있어요. 추천 계산에는 쓰지 않아요."}
      </p>

      {retest && (
        <div className="mt-8 rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
          <p className="text-[15px] font-semibold text-ink">요즘의 나는 좀 달라졌나요?</p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">다시 검사하면 새 답으로 보고서를 새로 써 드려요. 하루 3번까지 할 수 있어요.</p>
          <Link
            href="/report/love/test"
            className="mt-4 block rounded-full border border-primary px-5 py-3 text-center text-[15px] font-semibold text-primary active:scale-[0.98] active:opacity-80"
          >
            다시 검사하기
          </Link>
        </div>
      )}

      {share && (
        <div className="mt-4 rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
          <p className="text-[15px] font-semibold text-ink">친구도 받아 보게 하기</p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">가입하지 않아도 10분이면 자기 연애 상황 보고서를 받아 볼 수 있어요.</p>
          <div className="mt-4">
            <ShareLink path="/love" label="이 검사 공유하기" />
          </div>
        </div>
      )}
    </article>
  );
}
