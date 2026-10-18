import Link from "next/link";
import { Avatar } from "@/components/app-ui";
import { fieldClass } from "@/components/ui";
import { kstTime, memberName, type MemberRow } from "@/lib/admin/data";
import { STAGE_LABEL, type UserStage } from "@/lib/admin/stats";
import { AdminShell, AdminTitle, Chip, Empty, TableWrap, td, th } from "../ui";

export type Filter = UserStage | "suspended";
export const FILTERS: { id: Filter | null; label: string }[] = [
  { id: null, label: "전체" },
  { id: "account", label: STAGE_LABEL.account },
  { id: "testing", label: STAGE_LABEL.testing },
  { id: "tested", label: STAGE_LABEL.tested },
  { id: "ready", label: STAGE_LABEL.ready },
  { id: "suspended", label: "이용 정지" },
];

function matches(m: MemberRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [m.nickname, m.email, m.id].some((v) => v?.toLowerCase().includes(needle));
}

function hrefWith(q: string, filter: Filter | null): string {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (filter) p.set("stage", filter);
  const s = p.toString();
  return s ? `/admin/users?${s}` : "/admin/users";
}

const GENDER = { male: "남", female: "여" } as const;

export function UsersView({ members, q, filter }: { members: MemberRow[]; q: string; filter: Filter | null }) {
  const rows = members.filter(
    (m) => matches(m, q) && (!filter || (filter === "suspended" ? m.suspended : m.stage === filter)),
  );

  return (
    <AdminShell current="users">
      <AdminTitle title="회원" lead={`전체 ${members.length}명, 가입한 순서 (최근이 위)`} />

      <form action="/admin/users" method="get" className="mt-6 flex max-w-md gap-2">
        <label htmlFor="q" className="sr-only">
          닉네임, 이메일, ID로 찾기
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="닉네임, 이메일, ID" className={fieldClass.replace("mt-2 ", "")} />
        {filter && <input type="hidden" name="stage" value={filter} />}
        <button type="submit" className="shrink-0 rounded-xl bg-ink px-5 font-semibold text-white">
          찾기
        </button>
      </form>

      <nav aria-label="단계로 거르기" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const n = f.id === null ? members.length : members.filter((m) => (f.id === "suspended" ? m.suspended : m.stage === f.id)).length;
          return (
            <Link
              key={f.label}
              href={hrefWith(q, f.id)}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-[13.5px] ${active ? "bg-ink font-semibold text-white" : "bg-surface text-ink-soft ring-1 ring-line/80 hover:text-ink"}`}
            >
              {f.label} <span className="tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[20px] bg-surface px-5 py-3 ring-1 ring-line/80">
        {rows.length === 0 ? (
          <div className="py-3">
            <Empty>{q ? `'${q}'에 맞는 회원이 없어요.` : "해당하는 회원이 없어요."}</Empty>
          </div>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>회원</th>
                <th className={th}>성별·출생</th>
                <th className={th}>단계</th>
                <th className={`${th} text-right`}>친구 평가</th>
                <th className={`${th} text-right`}>사진</th>
                <th className={`${th} text-right`}>관심 보냄/받음</th>
                <th className={`${th} text-right`}>서로 관심</th>
                <th className={`${th} text-right`}>연결</th>
                <th className={th}>가입</th>
                <th className={th}>최근 로그인</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-paper">
                  <td className={td}>
                    <Link href={`/admin/users/${m.id}`} className="flex items-center gap-2.5">
                      <Avatar name={memberName(m)} size={32} />
                      <span className="min-w-0">
                        <span className="block font-semibold underline-offset-4 hover:underline">{memberName(m)}</span>
                        {m.nickname && m.email && <span className="mt-0.5 block text-xs text-muted">{m.email}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {m.gender ? `${GENDER[m.gender]} · ${m.birthYear}` : <span className="text-muted">–</span>}
                  </td>
                  <td className={td}>
                    <span className="flex flex-wrap gap-1">
                      <Chip tone={m.stage === "ready" ? "moss" : "mist"}>{STAGE_LABEL[m.stage]}</Chip>
                      {m.suspended && <Chip tone="alert">정지</Chip>}
                      {m.paused && <Chip>쉬는 중</Chip>}
                      {m.isAdmin && <Chip tone="indigo">관리자</Chip>}
                    </span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{m.friendCount}</td>
                  <td className={`${td} text-right tabular-nums`}>{m.photoCount}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {m.sentInterest}/{m.receivedInterest}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{m.mutual}</td>
                  <td className={`${td} text-right tabular-nums`}>{m.connected}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{kstTime(m.createdAt).slice(0, 10)}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums text-muted`}>{kstTime(m.lastSignInAt)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>
    </AdminShell>
  );
}
