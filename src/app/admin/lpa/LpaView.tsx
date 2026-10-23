import Link from "next/link";
import { Notice } from "@/components/ui";
import { loveSampleQuery, type LoveSampleOptions } from "@/lib/admin/loveSample";
import { defaultStarts, paramCount, type LpaModel, type LpaResult } from "@/lib/admin/lpa";
import { LPA_SETS, type LpaSet } from "@/lib/admin/lpaSets";
import type { GenderKey } from "@/lib/admin/trends";
import { AdminShell, AdminTitle, Empty, Panel, TableWrap, td, th } from "../ui";

/** 프로필 색 (쪽빛, 황토, 이끼, 장미, 보라, 청록) */
export const PROFILE_COLORS = ["#2e45a8", "#b8662e", "#5e7d63", "#c0405f", "#6b5ca5", "#3a8a9a"];

export const MIN_LPA_N = 10;
const RECOMMENDED_N = 100;

type Props = {
  set: LpaSet;
  model: LpaModel;
  /** 연애 상황 검사 표본 (사람마다 첫/최근 검사, 비회원 포함) */
  love: LoveSampleOptions;
  n: number;
  genders: GenderKey[];
  results: LpaResult[];
  selected: LpaResult | null;
  suggested: number | null;
  overall: { mean: number[]; sd: number[] };
};

const fmt = (v: number, digits = 2) => (Number.isFinite(v) ? v.toFixed(digits) : "–");
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");

function hrefOf(set: string, model: LpaModel, k?: number, love?: LoveSampleOptions) {
  const p = new URLSearchParams({ set, model, ...(love && set.startsWith("love") ? loveSampleQuery(love) : {}) });
  if (k) p.set("k", String(k));
  return `/admin/lpa?${p}`;
}

function Chips({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.href}
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

function Dot({ c }: { c: number }) {
  return <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: PROFILE_COLORS[c % PROFILE_COLORS.length] }} />;
}

function ProfilePlot({ set, r, overall }: { set: LpaSet; r: LpaResult; overall: number[] }) {
  const d = set.indicators.length;
  const W = Math.max(640, d * 38);
  const H = 320;
  const m = { l: 36, r: 16, t: 16, b: d > 8 ? 110 : 40 };
  const [lo, hi] = set.range;
  const x = (j: number) => m.l + ((W - m.l - m.r) * (j + 0.5)) / d;
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - (v - lo) / (hi - lo));
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const path = (vals: number[]) => vals.map((v, j) => `${j ? "L" : "M"}${x(j).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="relative -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="프로필별 지표 평균 그래프">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
              {t}
            </text>
          </g>
        ))}
        <path d={path(overall)} fill="none" stroke="var(--color-muted)" strokeDasharray="4 4" strokeWidth="1.5" />
        {r.means.map((mean, c) => (
          <g key={c}>
            <path d={path(mean)} fill="none" stroke={PROFILE_COLORS[c % PROFILE_COLORS.length]} strokeWidth="2.5" />
            {mean.map((v, j) => (
              <circle key={j} cx={x(j)} cy={y(v)} r="3.5" fill={PROFILE_COLORS[c % PROFILE_COLORS.length]}>
                <title>{`프로필 ${c + 1} · ${set.indicators[j].label}: ${v.toFixed(2)}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {set.indicators.map((ind, j) =>
          d > 8 ? (
            <text key={ind.id} transform={`translate(${x(j) + 4},${H - m.b + 12}) rotate(-50)`} textAnchor="end" fontSize="11" fill="var(--color-ink-soft)">
              {ind.label.length > 16 ? `${ind.label.slice(0, 15)}…` : ind.label}
            </text>
          ) : (
            <text key={ind.id} x={x(j)} y={H - m.b + 20} textAnchor="middle" fontSize="12" fill="var(--color-ink-soft)">
              {ind.label}
            </text>
          ),
        )}
      </svg>
    </div>
  );
}

export function LpaView({ set, model, love, n, genders, results, selected, suggested, overall }: Props) {
  const male = genders.filter((g) => g === "male").length;
  const female = genders.filter((g) => g === "female").length;
  const best = (key: "aic" | "bic" | "sabic") => (results.length ? Math.min(...results.map((r) => r[key])) : NaN);
  const starts = defaultStarts(n, set.indicators.length);
  const mplus = (file: string) =>
    `/admin/lpa/export?${new URLSearchParams({ set: set.id, model, k: String(selected?.k ?? 2), file, ...(set.source === "love" ? loveSampleQuery(love) : {}) })}`;
  const unknown = genders.length - male - female;

  return (
    <AdminShell current="lpa">
      <AdminTitle title="잠재프로파일분석 (LPA)" lead="검사 점수로 비슷한 응답 패턴을 가진 집단을 찾아요. 새로 고칠 때마다 같은 결과가 나오도록 시드를 고정했어요." />

      <div className="mt-6 space-y-3">
        <Chips items={LPA_SETS.map((s) => ({ href: hrefOf(s.id, model, undefined, love), label: s.label, active: s.id === set.id }))} />
        <Chips
          items={[
            { href: hrefOf(set.id, "equal", undefined, love), label: "분산 같음 (Mplus 기본)", active: model === "equal" },
            { href: hrefOf(set.id, "varying", undefined, love), label: "분산 다름", active: model === "varying" },
          ]}
        />
        {set.source === "love" && (
          <>
            <Chips
              items={[
                { href: hrefOf(set.id, model, undefined, { ...love, attempt: "first" }), label: "사람마다 첫 검사", active: love.attempt === "first" },
                { href: hrefOf(set.id, model, undefined, { ...love, attempt: "latest" }), label: "사람마다 가장 최근 검사", active: love.attempt === "latest" },
              ]}
            />
            <Chips
              items={[
                { href: hrefOf(set.id, model, undefined, { ...love, guests: true }), label: "가입 전 비회원 포함", active: love.guests },
                { href: hrefOf(set.id, model, undefined, { ...love, guests: false }), label: "회원만", active: !love.guests },
              ]}
            />
          </>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">
        {set.lead} 검사를 마친 {n}명 (남 {male} · 여 {female}
        {unknown ? ` · 성별 모름 ${unknown}` : ""}), 지표 {set.indicators.length}개.
        {set.source === "love" ? " 지금 문항 버전만, 비회원은 검사 한 번을 한 사람으로 세요." : ""} 시작값 {starts.starts}개를 짧게 돌리고 그중 {starts.finalStarts}개를 끝까지 돌려요.
      </p>

      {n < MIN_LPA_N ? (
        <div className="mt-6">
          <Notice>검사를 마친 사람이 {MIN_LPA_N}명 이상이면 결과를 볼 수 있어요. 지금은 {n}명이에요.</Notice>
        </div>
      ) : (
        <>
          {n < RECOMMENDED_N && (
            <div className="mt-4">
              <Notice tone="alert">
                표본이 {n}명이라 결과가 불안정해요. 참고로만 보세요. LPA는 보통 100명 이상, 프로필마다 5% 이상일 때 해석해요.
              </Notice>
            </div>
          )}

          {results.length < 2 && (
            <div className="mt-4">
              <Notice>
                {set.label}은 지표가 {set.indicators.length}개라 추정할 모수가 많아요. 2개 프로필을 계산하려면 검사를 마친 사람이{" "}
                {paramCount(2, set.indicators.length, model) + 1}명 이상이어야 해요 (지금 {n}명).
              </Notice>
            </div>
          )}

          {results.length > 0 && (
          <Panel className="mt-6" title="적합도" lead="AIC·BIC·SABIC은 낮을수록, 엔트로피는 1에 가까울수록 좋아요. 굵은 값이 각 열에서 가장 낮은 값이에요. 줄을 누르면 그 모형을 봐요.">
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>프로필</th>
                  <th className={`${th} text-right`}>로그우도</th>
                  <th className={`${th} text-right`}>모수</th>
                  <th className={`${th} text-right`}>AIC</th>
                  <th className={`${th} text-right`}>BIC</th>
                  <th className={`${th} text-right`}>SABIC</th>
                  <th className={`${th} text-right`}>엔트로피</th>
                  <th className={`${th} text-right`}>가장 작은 프로필</th>
                  <th className={`${th} text-right`}>최고 LL 반복</th>
                </tr>
              </thead>
              <tbody className="tabular-nums [&_td]:whitespace-nowrap">
                {results.map((r) => {
                  const active = r.k === selected?.k;
                  const smallest = Math.min(...r.counts);
                  return (
                    <tr key={r.k} className={active ? "bg-mist" : "hover:bg-paper"}>
                      <td className={td}>
                        <Link href={hrefOf(set.id, model, r.k, love)} className="font-semibold underline underline-offset-4">
                          {r.k}개
                        </Link>
                        {r.k === suggested && <span className="ml-1.5 text-xs text-indigo">추천</span>}
                      </td>
                      <td className={`${td} text-right`}>{fmt(r.logLik, 1)}</td>
                      <td className={`${td} text-right`}>{r.params}</td>
                      {(["aic", "bic", "sabic"] as const).map((key) => (
                        <td key={key} className={`${td} text-right ${r[key] === best(key) ? "font-bold text-ink" : ""}`}>
                          {fmt(r[key], 1)}
                        </td>
                      ))}
                      <td className={`${td} text-right`}>{r.entropy === null ? "–" : fmt(r.entropy, 3)}</td>
                      <td className={`${td} text-right ${smallest / r.n < 0.05 ? "text-alert" : ""}`}>
                        {smallest}명 ({pct(smallest, r.n)})
                      </td>
                      <td className={`${td} text-right ${r.k > 1 && r.bestReplicated < 2 ? "text-alert" : ""}`}>
                        {r.k === 1 ? "–" : `${r.bestReplicated}/${r.finalStarts}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
            <p className="mt-3 text-sm text-muted">
              &lsquo;추천&rsquo;은 가장 작은 프로필이 5% 이상인 모형 중 BIC가 가장 낮은 것이에요. 해석할 수 있는지와 함께 판단하세요. 모수가 사람 수보다 많아지는 모형은 계산하지 않아요.
            </p>
          </Panel>
          )}

          {selected && (
            <>
              <Panel className="mt-4" title={`${selected.k}개 프로필`} lead="점선은 전체 평균이에요. 점에 마우스를 올리면 값이 보여요.">
                {selected.k > 1 && selected.bestReplicated < 2 && (
                  <div className="mb-4">
                    <Notice tone="alert">최고 로그우도가 다른 시작값에서 다시 나오지 않았어요. 국소해일 수 있으니 Mplus에서 시작값을 늘려 확인하세요.</Notice>
                  </div>
                )}
                <ProfilePlot set={set} r={selected} overall={overall.mean} />
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {selected.counts.map((cnt, c) => (
                    <li key={c}>
                      <Dot c={c} />
                      프로필 {c + 1} · {cnt}명 ({pct(cnt, selected.n)})
                    </li>
                  ))}
                  <li className="text-muted">┄ 전체 평균</li>
                </ul>
              </Panel>

              <Panel className="mt-4" title="프로필별 평균" lead="추정된 평균이에요. 오른쪽 끝은 전체 평균(표준편차)이에요.">
                <TableWrap wide={selected.k > 2}>
                  <thead>
                    <tr>
                      <th className={th}>지표</th>
                      {selected.means.map((_, c) => (
                        <th key={c} className={`${th} text-right`}>
                          <Dot c={c} />
                          {c + 1}
                        </th>
                      ))}
                      <th className={`${th} text-right`}>전체</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {set.indicators.map((ind, j) => (
                      <tr key={ind.id}>
                        <td className={`${td} max-w-[16rem]`}>{ind.label}</td>
                        {selected.means.map((mean, c) => {
                          const z = overall.sd[j] ? (mean[j] - overall.mean[j]) / overall.sd[j] : 0;
                          return (
                            <td key={c} className={`${td} whitespace-nowrap text-right ${z >= 0.5 ? "font-semibold text-indigo" : z <= -0.5 ? "font-semibold text-ochre" : ""}`}>
                              {fmt(mean[j])}
                            </td>
                          );
                        })}
                        <td className={`${td} whitespace-nowrap text-right text-muted`}>
                          {fmt(overall.mean[j])} ({fmt(overall.sd[j])})
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className={`${td} text-muted`}>비율 π</td>
                      {selected.proportions.map((p, c) => (
                        <td key={c} className={`${td} text-right text-muted`}>
                          {fmt(p, 3)}
                        </td>
                      ))}
                      <td className={td} />
                    </tr>
                  </tbody>
                </TableWrap>
                <p className="mt-3 text-sm text-muted">전체 평균보다 0.5 표준편차 이상 높으면 쪽빛, 낮으면 황토색으로 표시했어요.</p>
              </Panel>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Panel title="성별 분포" lead="가장 가능성 높은 프로필로 나눈 인원. %는 같은 성별 안에서의 비율이에요.">
                  <TableWrap wide={false}>
                    <thead>
                      <tr>
                        <th className={th}>프로필</th>
                        <th className={`${th} text-right`}>남</th>
                        <th className={`${th} text-right`}>여</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums [&_td]:whitespace-nowrap">
                      {selected.counts.map((_, c) => {
                        const mm = genders.filter((g, i) => g === "male" && selected.modal[i] === c).length;
                        const ff = genders.filter((g, i) => g === "female" && selected.modal[i] === c).length;
                        return (
                          <tr key={c}>
                            <td className={td}>
                              <Dot c={c} />
                              프로필 {c + 1}
                            </td>
                            <td className={`${td} text-right`}>
                              {mm} <span className="text-muted">({pct(mm, male)})</span>
                            </td>
                            <td className={`${td} text-right`}>
                              {ff} <span className="text-muted">({pct(ff, female)})</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </TableWrap>
                </Panel>

                <Panel title="분류 정확도 (AvePP)" lead="배정된 프로필(행)별 평균 사후확률. 대각선이 .70 이상이면 잘 나뉜 편이에요.">
                  {selected.k === 1 ? (
                    <Empty>프로필이 1개라 해당이 없어요.</Empty>
                  ) : (
                    <TableWrap wide={false}>
                      <thead>
                        <tr>
                          <th className={th}>배정</th>
                          {selected.avePP.map((_, c) => (
                            <th key={c} className={`${th} text-right`}>
                              {c + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="tabular-nums [&_td]:whitespace-nowrap">
                        {selected.avePP.map((row, a) => (
                          <tr key={a}>
                            <td className={td}>
                              <Dot c={a} />
                              {a + 1}
                            </td>
                            {row.map((v, b) => (
                              <td key={b} className={`${td} text-right ${a === b ? (v < 0.7 ? "font-bold text-alert" : "font-bold") : "text-muted"}`}>
                                {Number.isNaN(v) ? "–" : v.toFixed(3)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  )}
                </Panel>
              </div>
            </>
          )}
        </>
      )}

      <Panel
        className="mt-4"
        title="Mplus로 확인하기"
        lead="LMR·BLRT(TECH11, TECH14)는 여기서 계산하지 않아요. 같은 데이터와 입력 파일을 받아 Mplus로 돌려보세요. 세 파일을 같은 폴더에 두면 돼요."
      >
        <ul className="space-y-2 text-[15px]">
          <li>
            <a href={mplus("dat")} className="font-semibold underline underline-offset-4">
              데이터 (.dat)
            </a>{" "}
            <span className="text-muted">행번호, 성별(1 남, 2 여), 지표 순서. 이름·이메일 없음</span>
          </li>
          <li>
            <a href={mplus("inp")} className="font-semibold underline underline-offset-4">
              입력 파일 (.inp)
            </a>{" "}
            <span className="text-muted">
              {selected?.k ?? 2}개 프로필, {model === "equal" ? "분산 같음" : "분산 다름"}, STARTS 500 100, TECH11·TECH14 포함
            </span>
          </li>
          <li>
            <a href={mplus("ids")} className="font-semibold underline underline-offset-4">
              행번호-사용자ID 대응표 (.csv)
            </a>{" "}
            <span className="text-muted">결과를 회원과 다시 이을 때만 쓰고 따로 보관하세요</span>
          </li>
        </ul>
      </Panel>
    </AdminShell>
  );
}
