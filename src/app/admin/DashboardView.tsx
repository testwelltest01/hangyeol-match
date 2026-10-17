import Link from "next/link";
import { kstTime, memberName, OUTCOME_LABEL, REPORT_REASON_LABEL, type MemberRow, type ReportRow } from "@/lib/admin/data";
import { AGE_BANDS, ageBand, dailyCounts, funnel, reactionStats, STAGE_LABEL, type ReactionRow } from "@/lib/admin/stats";
import { kstDay, kstYear } from "@/lib/day";
import { ResolveButton, SuspendButton } from "./AdminButtons";
import { AdminShell, AdminTitle, Chip, Empty, Panel, Stat, TableWrap, td, th } from "./ui";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

export function DashboardView({
  members,
  reactions,
  reports,
  recsToday,
  recsAll,
  feedback,
  now,
}: {
  members: MemberRow[];
  reactions: ReactionRow[];
  reports: ReportRow[];
  recsToday: number;
  recsAll: number;
  feedback: { outcome: string }[];
  now: Date;
}) {
  const today = kstDay(now);
  const byId = new Map(members.map((m) => [m.id, m]));
  const { totals } = reactionStats(reactions);
  const scored = members.filter((m) => m.scoredAt);
  const ready = members.filter((m) => m.stage === "ready");
  const readyActive = ready.filter((m) => !m.paused && !m.suspended);
  const suspended = members.filter((m) => m.suspended);
  const openReports = reports.filter((r) => !r.resolved_at);
  const signups7 = dailyCounts(members.map((m) => m.createdAt), 7, today).reduce((a, d) => a + d.count, 0);
  const steps = funnel(members);
  const signupDays = dailyCounts(members.map((m) => m.createdAt), 14, today);
  const testDays = dailyCounts(members.map((m) => m.scoredAt), 14, today);
  const chartMax = Math.max(1, ...signupDays.map((d) => d.count), ...testDays.map((d) => d.count));
  const year = kstYear(now);
  const ageTable = AGE_BANDS.map((band) => {
    const inBand = scored.filter((m) => m.birthYear && ageBand(m.birthYear, year) === band);
    return { band, male: inBand.filter((m) => m.gender === "male").length, female: inBand.filter((m) => m.gender === "female").length };
  });
  const outcomeCounts = Object.keys(OUTCOME_LABEL).map((k) => ({ k, n: feedback.filter((f) => f.outcome === k).length }));

  return (
    <AdminShell current="dashboard">
      <AdminTitle title="대시보드" lead={`${kstTime(now.toISOString())} 기준 · 한국 시간`} />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="전체 가입" value={members.length} sub={`최근 7일 +${signups7}`} />
        <Stat label="검사 완료" value={scored.length} sub={`가입 대비 ${pct(scored.length, members.length)}`} />
        <Stat
          label="매칭 준비 완료"
          value={ready.length}
          sub={`남 ${readyActive.filter((m) => m.gender === "male").length} · 여 ${readyActive.filter((m) => m.gender === "female").length} (추천 중)`}
        />
        <Stat label="처리할 신고" value={openReports.length} sub={`이용 정지 ${suspended.length}명`} />
        <Stat label="오늘 추천" value={recsToday} sub={`누적 ${recsAll}건`} />
        <Stat label="보낸 관심" value={totals.interests} sub={`넘기기 ${totals.passes}건`} />
        <Stat label="서로 관심" value={`${totals.mutualPairs}쌍`} sub="사진 공개" />
        <Stat label="연결" value={`${totals.connectedPairs}쌍`} sub={`만남 피드백 ${feedback.length}건`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="단계별 전환" lead="앞 단계를 지난 사람만 셉니다. 오른쪽 %는 바로 앞 단계 대비예요.">
          <ol className="space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                <span>{s.label}</span>
                <span className="relative h-2 rounded-full bg-mist" aria-hidden>
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-indigo/80"
                    style={{ width: `${steps[0].count ? (s.count / steps[0].count) * 100 : 0}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">
                  <strong>{s.count}</strong>
                  {s.rate !== null && <span className="ml-1 text-muted">{s.rate}%</span>}
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="최근 14일" lead="날짜별 가입과 검사 완료 (한국 날짜)">
          <div className="flex h-36 items-end gap-1" role="img" aria-label="최근 14일 가입과 검사 완료 막대 그래프">
            {signupDays.map((d, i) => (
              <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="flex h-full w-full items-end justify-center gap-[2px]">
                  <span
                    className="w-1/2 max-w-3 rounded-t bg-indigo/80"
                    style={{ height: `${(d.count / chartMax) * 100}%` }}
                    title={`${d.day} 가입 ${d.count}`}
                  />
                  <span
                    className="w-1/2 max-w-3 rounded-t bg-moss/80"
                    style={{ height: `${(testDays[i].count / chartMax) * 100}%` }}
                    title={`${d.day} 검사 완료 ${testDays[i].count}`}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted">{i % 2 === 1 ? d.day.slice(8) : " "}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex gap-4 text-sm text-ink-soft">
            <span>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-indigo/80" />
              가입 {signupDays.reduce((a, d) => a + d.count, 0)}
            </span>
            <span>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-moss/80" />
              검사 완료 {testDays.reduce((a, d) => a + d.count, 0)}
            </span>
          </p>
        </Panel>

        <Panel title="성별·나이대" lead="검사를 마친 회원 기준, 연 나이">
          <TableWrap wide={false}>
            <thead>
              <tr>
                <th className={th}>나이대</th>
                <th className={`${th} text-right`}>남</th>
                <th className={`${th} text-right`}>여</th>
                <th className={`${th} text-right`}>합계</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {ageTable.map((r) => (
                <tr key={r.band}>
                  <td className={td}>{r.band}</td>
                  <td className={`${td} text-right`}>{r.male}</td>
                  <td className={`${td} text-right`}>{r.female}</td>
                  <td className={`${td} text-right`}>{r.male + r.female}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={td}>합계</td>
                <td className={`${td} text-right`}>{ageTable.reduce((a, r) => a + r.male, 0)}</td>
                <td className={`${td} text-right`}>{ageTable.reduce((a, r) => a + r.female, 0)}</td>
                <td className={`${td} text-right`}>{ageTable.reduce((a, r) => a + r.male + r.female, 0)}</td>
              </tr>
            </tbody>
          </TableWrap>
        </Panel>

        <Panel title="최근 가입">
          {members.length === 0 ? (
            <Empty>아직 가입한 사람이 없어요.</Empty>
          ) : (
            <ul className="divide-y divide-line/70">
              {members.slice(0, 6).map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/users/${m.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">{memberName(m)}</span>
                      {m.isAdmin && <span className="ml-1.5"><Chip tone="indigo">관리자</Chip></span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-muted">
                      <Chip tone={m.stage === "ready" ? "moss" : "mist"}>{STAGE_LABEL[m.stage]}</Chip>
                      <span className="tabular-nums">{kstTime(m.createdAt).slice(5, 10)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        className="mt-4"
        title={`처리할 신고 ${openReports.length}건`}
        lead="확인을 마친 신고는 '확인 완료'를 눌러주세요. 같은 사람을 서로 다른 3명이 신고하면 자동으로 정지돼요(ID로 찾을 수 없음 제외)."
      >
        {openReports.length === 0 ? (
          <Empty>처리할 신고가 없어요.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>신고일</th>
                <th className={th}>대상</th>
                <th className={th}>신고한 사람</th>
                <th className={th}>사유</th>
                <th className={th}>내용</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {openReports.map((r) => {
                const target = byId.get(r.target);
                return (
                  <tr key={r.id}>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>{kstTime(r.created_at)}</td>
                    <td className={td}>
                      <Link href={`/admin/users/${r.target}`} className="font-semibold underline underline-offset-4">
                        {memberName(target)}
                      </Link>
                      {target?.suspended && <span className="ml-1.5"><Chip tone="alert">정지</Chip></span>}
                    </td>
                    <td className={td}>
                      {r.reporter ? (
                        <Link href={`/admin/users/${r.reporter}`} className="underline underline-offset-4">
                          {memberName(byId.get(r.reporter))}
                        </Link>
                      ) : (
                        "탈퇴한 회원"
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{REPORT_REASON_LABEL[r.reason] ?? r.reason}</td>
                    <td className={`${td} max-w-[18rem] whitespace-pre-line break-words text-ink-soft`}>{r.detail ?? ""}</td>
                    <td className={td}>
                      <ResolveButton reportId={r.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={`이용 정지 ${suspended.length}명`}>
          {suspended.length === 0 ? (
            <Empty>정지된 회원이 없어요.</Empty>
          ) : (
            <ul className="divide-y divide-line/70">
              {suspended.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <Link href={`/admin/users/${m.id}`} className="font-semibold underline underline-offset-4">
                      {memberName(m)}
                    </Link>
                    <span className="mt-0.5 block text-muted">{m.suspendReason}</span>
                  </span>
                  <SuspendButton userId={m.id} suspended name={memberName(m)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="만남 피드백" lead="연락처가 공개된 뒤 회원이 남긴 답">
          <ul className="space-y-2 text-sm">
            {outcomeCounts.map((o) => (
              <li key={o.k} className="flex justify-between">
                <span>{OUTCOME_LABEL[o.k]}</span>
                <span className="tabular-nums font-semibold">{o.n}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AdminShell>
  );
}
