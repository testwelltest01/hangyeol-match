import { Notice } from "@/components/ui";
import type { GenderKey } from "@/lib/admin/trends";
import type { ExtraRow } from "@/lib/extra/server";
import { cronbachAlpha, meanSd } from "@/lib/extra/stats";
import { EXTRA_TESTS, topScales, type ExtraTest } from "@/lib/extra/tests";
import { AdminShell, AdminTitle, Empty, Panel, TableWrap, td, th } from "../ui";

export type Row = ExtraRow & { user_id: string; gender: GenderKey };

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "–");
const ms = (vals: number[]) => {
  const r = meanSd(vals);
  return r.n ? `${fmt(r.mean)} (${fmt(r.sd)})` : "–";
};

/** 유형별 인원: 가장 높은 하위척도가 같으면 두 곳에 모두 센다 */
function typeCounts(test: ExtraTest, rows: Row[], group?: string) {
  const pool = test.scales.filter((s) => (group ? s.group === group : !s.group));
  return pool.map((s) => ({
    label: s.label,
    male: rows.filter((r) => r.gender === "male" && topScales(test, r.scores, group).some((t) => t.id === s.id)).length,
    female: rows.filter((r) => r.gender === "female" && topScales(test, r.scores, group).some((t) => t.id === s.id)).length,
  }));
}

function CountTable({ title, rows, male, female }: { title: string; rows: { label: string; male: number; female: number }[]; male: number; female: number }) {
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      <TableWrap wide={false}>
        <thead>
          <tr>
            <th className={th}>유형</th>
            <th className={`${th} text-right`}>남</th>
            <th className={`${th} text-right`}>여</th>
          </tr>
        </thead>
        <tbody className="tabular-nums [&_td]:whitespace-nowrap">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className={td}>{r.label}</td>
              <td className={`${td} text-right`}>
                {r.male} <span className="text-muted">({pct(r.male, male)})</span>
              </td>
              <td className={`${td} text-right`}>
                {r.female} <span className="text-muted">({pct(r.female, female)})</span>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

function TestPanel({ test, all }: { test: ExtraTest; all: Row[] }) {
  const rows = all.filter((r) => r.test_id === test.id && r.version === test.version);
  const male = rows.filter((r) => r.gender === "male");
  const female = rows.filter((r) => r.gender === "female");
  const choiceItem = test.items.find((i) => i.options);

  return (
    <Panel
      className="mt-4"
      title={`${test.title} · ${rows.length}명`}
      lead={`남 ${male.length} · 여 ${female.length} · 문항 버전 ${test.version}. 평균(표준편차)은 1~5점, α는 전체 응답으로 계산해요.`}
    >
      {rows.length === 0 ? (
        <Empty>아직 응답이 없어요.</Empty>
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>하위척도</th>
                <th className={`${th} text-right`}>문항</th>
                <th className={`${th} text-right`}>전체</th>
                <th className={`${th} text-right`}>남</th>
                <th className={`${th} text-right`}>여</th>
                <th className={`${th} text-right`}>α</th>
              </tr>
            </thead>
            <tbody className="tabular-nums [&_td]:whitespace-nowrap">
              {test.scales.map((s) => {
                const items = test.items.filter((i) => i.scale === s.id);
                const matrix = rows.map((r) => items.map((i) => (i.reverse ? 6 - r.answers[i.id] : r.answers[i.id])));
                const alpha = cronbachAlpha(matrix);
                const v = (rs: Row[]) => rs.map((r) => r.scores.scales[s.id]);
                return (
                  <tr key={s.id}>
                    <td className={td}>
                      {s.group === "want" ? "받고 싶은 위로 · " : s.group === "give" ? "주는 위로 · " : ""}
                      {s.label}
                    </td>
                    <td className={`${td} text-right`}>{items.length}</td>
                    <td className={`${td} text-right`}>{ms(v(rows))}</td>
                    <td className={`${td} text-right`}>{ms(v(male))}</td>
                    <td className={`${td} text-right`}>{ms(v(female))}</td>
                    <td className={`${td} text-right ${Number.isFinite(alpha) && alpha < 0.6 ? "text-alert" : ""}`}>{fmt(alpha)}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {test.id === "comfort" ? (
              <>
                <CountTable title="가장 받고 싶은 위로" rows={typeCounts(test, rows, "want")} male={male.length} female={female.length} />
                <CountTable title="내가 주는 위로" rows={typeCounts(test, rows, "give")} male={male.length} female={female.length} />
              </>
            ) : test.id === "talk" ? (
              <CountTable
                title="말하기와 듣기"
                rows={[
                  { label: "이야기를 꺼내는 쪽 (3.5 이상)", test: (x: number) => x >= 3.5 },
                  { label: "반반", test: (x: number) => x > 2.5 && x < 3.5 },
                  { label: "듣는 쪽 (2.5 이하)", test: (x: number) => x <= 2.5 },
                ].map((c) => ({
                  label: c.label,
                  male: male.filter((r) => c.test(r.scores.scales.talker)).length,
                  female: female.filter((r) => c.test(r.scores.scales.talker)).length,
                }))}
                male={male.length}
                female={female.length}
              />
            ) : (
              <>
                <CountTable title="마음이 가장 크게 전해지는 방식" rows={typeCounts(test, rows)} male={male.length} female={female.length} />
                {choiceItem?.options && (
                  <CountTable
                    title="내가 주로 표현하는 방식"
                    rows={choiceItem.options.map((o) => ({
                      label: o.label,
                      male: male.filter((r) => r.scores.choice === o.value).length,
                      female: female.filter((r) => r.scores.choice === o.value).length,
                    }))}
                    male={male.length}
                    female={female.length}
                  />
                )}
              </>
            )}
          </div>
          <p className="mt-3 text-sm text-muted">
            {test.id === "talk" ? "" : "가장 높은 점수가 같으면 두 유형에 모두 셉니다. "}α가 .60보다 낮으면 빨간색이에요. 하위척도가 2문항이라 낮게 나오기 쉬워요. 역문항(T08)은 뒤집어서 계산해요.
          </p>
        </>
      )}
    </Panel>
  );
}

export function ExtraView({ available, all }: { available: boolean; all: Row[] }) {
  return (
    <AdminShell current="extra">
      <AdminTitle
        title="추가 검사"
        lead="한결이 직접 만든 시범 검사(선택)의 응답 현황이에요. 추천 계산에는 쓰지 않아요. 원자료는 엑셀의 '추가 · …' 시트에 있어요."
      />
      {!available ? (
        <div className="mt-6">
          <Notice>추가 검사 테이블이 아직 없어요. Supabase SQL Editor에서 0004_extra_tests.sql을 실행하면 회원들이 할 수 있어요.</Notice>
        </div>
      ) : (
        EXTRA_TESTS.map((t) => <TestPanel key={t.id} test={t} all={all} />)
      )}
    </AdminShell>
  );
}
