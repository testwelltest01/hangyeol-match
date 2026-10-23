import Link from "next/link";
import { attemptsByPerson, loveSampleQuery, pickLoveSample, retestPairs, type LoveSampleOptions } from "@/lib/admin/loveSample";
import type { GenderKey } from "@/lib/admin/trends";
import { correlationMatrix, cronbachAlpha, itemAnalysis, meanSd, pearson, skewness } from "@/lib/extra/stats";
import { LOVE_GROUPS, LOVE_ITEMS, LOVE_SCALES, LOVE_VERSION, type LoveScale } from "@/lib/love/items";
import type { LoveAnswers, LoveScores } from "@/lib/love/score";
import { AdminShell, AdminTitle, Empty, Panel, Stat, TableWrap, td, th } from "../../ui";

export type LoveStatRow = {
  id: string;
  user_id: string | null;
  version: string;
  answers: LoveAnswers;
  scores: LoveScores;
  status: string;
  created_at: string;
  gender: GenderKey;
};

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "–");
const fmtR = (v: number) => (Number.isFinite(v) ? v.toFixed(2).replace(/^(-?)0\./, "$1.") : "–");
const keyed = (row: LoveStatRow, item: { id: string; reverse: boolean }) => (item.reverse ? 6 - row.answers[item.id] : row.answers[item.id]);
const groupLabel = (s: LoveScale) => LOVE_GROUPS.find((g) => g.id === s.group)?.label ?? "";

function href(o: LoveSampleOptions) {
  const q = new URLSearchParams(loveSampleQuery(o)).toString();
  return `/admin/extra/love${q ? `?${q}` : ""}`;
}

function Chips({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-[13.5px] ${i.active ? "bg-ink font-semibold text-white" : "bg-surface text-ink-soft ring-1 ring-line/80 hover:text-ink"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** 상관 칸 색: 양수는 쪽빛, 음수는 장미색, 진할수록 강하다 */
const cellColor = (r: number) =>
  Number.isFinite(r) ? `color-mix(in srgb, ${r >= 0 ? "var(--color-indigo)" : "var(--color-rose)"} ${Math.round(Math.abs(r) * 70)}%, var(--color-surface))` : "var(--color-mist)";

/**
 * 연애 상황 검사 통계 (LPA 전에 척도 확인): 지금 문항 버전에서 사람마다 한 번(첫/최근 검사, 비회원 포함 여부를 고른다)으로
 * 척도 요약(평균·표준편차·왜도·α·재검사 r), 문항 분석(수정된 문항-총점 r, 뺐을 때 α), 척도 간 상관
 */
export function LoveStatsView({ all, sample }: { all: LoveStatRow[]; sample: LoveSampleOptions }) {
  const rows = pickLoveSample(all, sample);
  const people = attemptsByPerson(all, sample.guests);
  const attempts = people.reduce((a, l) => a + l.length, 0);
  const pairs = retestPairs(all, sample.guests);
  const gapDays = pairs.length ? pairs.reduce((a, [x, y]) => a + (Date.parse(y.created_at) - Date.parse(x.created_at)) / 86_400_000, 0) / pairs.length : NaN;
  const male = rows.filter((r) => r.gender === "male");
  const female = rows.filter((r) => r.gender === "female");
  const guests = rows.filter((r) => !r.user_id).length;
  const enough = rows.length >= 3;
  const matrix = enough ? correlationMatrix(LOVE_SCALES.map((s) => rows.map((r) => r.scores[s.id]))) : [];
  const lpaLink = (set: string) => `/admin/lpa?${new URLSearchParams({ set, model: "equal", ...loveSampleQuery(sample) })}`;

  return (
    <AdminShell current="extra" back={{ href: "/admin/extra", label: "추가 검사" }}>
      <AdminTitle
        title="연애 상황 검사 통계"
        lead={`LPA 전에 척도가 잘 재지는지 보는 화면이에요. 지금 문항 버전(${LOVE_VERSION})만, 사람마다 검사 한 번씩 골라 계산해요. 원자료(모든 시도)는 엑셀 '추가 · 연애 상황 보고서' 시트에 있어요.`}
      />

      <div className="mt-6 space-y-3">
        <Chips
          items={[
            { href: href({ ...sample, attempt: "first" }), label: "사람마다 첫 검사", active: sample.attempt === "first" },
            { href: href({ ...sample, attempt: "latest" }), label: "사람마다 가장 최근 검사", active: sample.attempt === "latest" },
          ]}
        />
        <Chips
          items={[
            { href: href({ ...sample, guests: true }), label: "가입 전 비회원 포함", active: sample.guests },
            { href: href({ ...sample, guests: false }), label: "회원만", active: !sample.guests },
          ]}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        첫 검사는 연습 효과가 없어서 LPA 기본으로 써요. 비회원은 같은 사람이 다시 했는지 알 수 없어 검사 한 번을 한 사람으로 세요.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="사람" value={rows.length} sub={`남 ${male.length} · 여 ${female.length} · 비회원 ${guests}`} />
        <Stat label="검사 횟수" value={attempts} sub="다시 검사 포함" />
        <Stat label="두 번 이상 검사" value={pairs.length} sub={Number.isFinite(gapDays) ? `첫·최근 검사 간격 평균 ${gapDays.toFixed(1)}일` : "재검사 r 계산에 써요"} />
        <Stat label="LPA 권장 100명까지" value={rows.length >= 100 ? "충분" : `${100 - rows.length}명`} sub={rows.length >= 100 ? `지금 ${rows.length}명` : `더 모이면 돼요 (지금 ${rows.length}명)`} />
      </div>

      <Panel
        className="mt-4"
        title="척도 요약"
        lead="평균(표준편차)은 1~5점. 왜도 절댓값이 1을 넘으면 한쪽으로 몰린 거예요. α·재검사 r이 .60보다 낮으면 빨간색이에요. 재검사 r은 두 번 이상 검사한 사람이 3명 이상일 때 첫·최근 검사의 상관이에요."
      >
        {!enough ? (
          <Empty>3명 이상 모이면 보여요. 지금 {rows.length}명이에요.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>척도</th>
                <th className={`${th} text-right`}>전체</th>
                <th className={`${th} text-right`}>남</th>
                <th className={`${th} text-right`}>여</th>
                <th className={`${th} text-right`}>왜도</th>
                <th className={`${th} text-right`}>α</th>
                <th className={`${th} text-right`}>재검사 r</th>
              </tr>
            </thead>
            <tbody className="tabular-nums [&_td]:whitespace-nowrap">
              {LOVE_SCALES.map((s) => {
                const v = (rs: LoveStatRow[]) => rs.map((r) => r.scores[s.id]);
                const ms = (rs: LoveStatRow[]) => {
                  const r = meanSd(v(rs));
                  return r.n ? `${fmt(r.mean)} (${fmt(r.sd)})` : "–";
                };
                const items = LOVE_ITEMS.filter((i) => i.scale === s.id);
                const alpha = cronbachAlpha(rows.map((r) => items.map((i) => keyed(r, i))));
                const sk = skewness(v(rows));
                const retest = pearson(pairs.map(([x, y]) => [x.scores[s.id], y.scores[s.id]]));
                return (
                  <tr key={s.id}>
                    <td className={td}>
                      <span className="text-muted">{groupLabel(s)} · </span>
                      {s.label}
                    </td>
                    <td className={`${td} text-right`}>{ms(rows)}</td>
                    <td className={`${td} text-right`}>{ms(male)}</td>
                    <td className={`${td} text-right`}>{ms(female)}</td>
                    <td className={`${td} text-right ${Math.abs(sk) > 1 ? "text-alert" : ""}`}>{fmt(sk)}</td>
                    <td className={`${td} text-right ${alpha < 0.6 ? "text-alert" : ""}`}>{fmt(alpha)}</td>
                    <td className={`${td} text-right ${retest < 0.6 ? "text-alert" : ""}`}>{fmt(retest)}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <Panel
        className="mt-4"
        title="문항 분석"
        lead="역문항은 뒤집어서 계산해요. 문항-총점 r은 그 문항을 뺀 나머지 3문항 합과의 상관(수정된 값)이고 .30보다 낮으면 빨간색, '뺐을 때 α'가 지금 α보다 높으면 그 문항이 척도를 흐리는 쪽이라 굵게 보여요."
      >
        {!enough ? (
          <Empty>3명 이상 모이면 보여요.</Empty>
        ) : (
          <div className="space-y-6">
            {LOVE_SCALES.map((s) => {
              const items = LOVE_ITEMS.filter((i) => i.scale === s.id);
              const m = rows.map((r) => items.map((i) => keyed(r, i)));
              const alpha = cronbachAlpha(m);
              const stats = itemAnalysis(m);
              return (
                <div key={s.id}>
                  <h3 className="text-[14px] font-semibold text-ink">
                    <span className="font-normal text-muted">{groupLabel(s)} · </span>
                    {s.label} <span className="ml-1 text-[12.5px] font-normal text-muted">α {fmt(alpha)} · {s.source}</span>
                  </h3>
                  <TableWrap>
                    <thead>
                      <tr>
                        <th className={th}>문항</th>
                        <th className={`${th} text-right`}>평균</th>
                        <th className={`${th} text-right`}>표준편차</th>
                        <th className={`${th} text-right`}>문항-총점 r</th>
                        <th className={`${th} text-right`}>뺐을 때 α</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {items.map((it, j) => (
                        <tr key={it.id}>
                          <td className={td}>
                            <span className="mr-1.5 font-mono text-[12px] text-muted">{it.id}</span>
                            {it.text}
                            {it.reverse && <span className="ml-1.5 rounded bg-mist px-1 text-[11px] text-ink-soft">역</span>}
                          </td>
                          <td className={`${td} text-right`}>{fmt(stats[j].mean)}</td>
                          <td className={`${td} text-right`}>{fmt(stats[j].sd)}</td>
                          <td className={`${td} text-right ${stats[j].citc < 0.3 ? "text-alert" : ""}`}>{fmt(stats[j].citc)}</td>
                          <td className={`${td} text-right ${stats[j].alphaIfDeleted > alpha ? "font-bold text-alert" : ""}`}>{fmt(stats[j].alphaIfDeleted)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel className="mt-4" title="척도 간 상관" lead="피어슨 r. 쪽빛은 양의 상관, 장미색은 음의 상관이고 진할수록 강해요. LPA 지표끼리 너무 높게(.80 이상) 겹치면 지표를 줄이는 걸 생각해 보세요.">
        {!enough ? (
          <Empty>3명 이상 모이면 보여요.</Empty>
        ) : (
          <div className="relative -mx-5 overflow-x-auto px-5">
            <table className="border-collapse text-[11px] tabular-nums">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface" />
                  {LOVE_SCALES.map((s, j) => (
                    <th key={s.id} className="h-24 w-9 min-w-9 align-bottom font-normal text-muted">
                      <span className="inline-block w-4 whitespace-nowrap [writing-mode:vertical-rl]" title={s.label}>
                        {j + 1}. {s.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LOVE_SCALES.map((s, i) => (
                  <tr key={s.id}>
                    <th className="sticky left-0 z-10 whitespace-nowrap bg-surface pr-2 text-left font-normal text-ink-soft">
                      {i + 1}. {s.label}
                    </th>
                    {LOVE_SCALES.map((t, j) => {
                      const r = matrix[i][j];
                      return (
                        <td
                          key={t.id}
                          title={`${s.label} × ${t.label}: r = ${fmt(r, 3)}`}
                          className={`h-8 w-9 min-w-9 border border-surface text-center ${i === j ? "text-muted" : Math.abs(r) >= 0.5 ? "font-semibold text-white" : "text-ink"}`}
                          style={{ background: i === j ? "var(--color-mist)" : cellColor(r) }}
                        >
                          {i === j ? "" : fmtR(r)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="mt-4" title="LPA로 이어서" lead="같은 표본(첫/최근 검사, 비회원 포함 여부)으로 LPA 화면이 열려요. 거기서 Mplus 데이터·입력 파일도 받을 수 있어요.">
        <div className="flex flex-wrap gap-2">
          {[
            ["love_relation", "관계 척도 12개"],
            ["love_nature", "기질·성격 7개"],
            ["love_all", "19척도 전체"],
          ].map(([id, label]) => (
            <Link key={id} href={lpaLink(id)} className="rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white">
              {label}로 LPA
            </Link>
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
