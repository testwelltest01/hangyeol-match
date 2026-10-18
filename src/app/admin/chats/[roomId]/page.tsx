import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { kstTime, REPORT_REASON_LABEL } from "@/lib/admin/data";
import { roomMetrics, type ChatMessageMeta, type ChatRoomMeta } from "@/lib/chat/metrics";
import { UUID_RE } from "@/lib/sniff";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoading, AdminShell, Chip, Panel, TableWrap, td, th } from "../../ui";

export const metadata: Metadata = { title: "대화 | 한결 관리", robots: { index: false, follow: false } };

export default function AdminChatPage({ params }: PageProps<"/admin/chats/[roomId]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ChatGate params={params} />
    </Suspense>
  );
}

const EVENT_LABEL: Record<string, string> = {
  opened: "방 열림",
  contact_request: "연락처 전달 누름",
  contact_cancel: "연락처 전달 취소",
  contact_exchanged: "연락처 교환",
  limit_reached: "메시지 한도 도달",
  closed: "대화 닫힘",
};

const sec = (v: number | null) => (v === null ? "–" : v < 120 ? `${v}초` : v < 7200 ? `${Math.round(v / 60)}분` : `${(v / 3600).toFixed(1)}시간`);

async function ChatGate({ params }: { params: PageProps<"/admin/chats/[roomId]">["params"] }) {
  const me = await requireAdmin();
  const { roomId } = await params;
  if (!UUID_RE.test(roomId)) notFound();
  const admin = createAdminClient();

  const { data: roomData } = await admin
    .from("chat_rooms")
    .select("id, user_a, user_b, opened_at, first_message_at, last_message_at, count_a, count_b, contact_a_at, contact_b_at, exchanged_at, closed_at, close_reason")
    .eq("id", roomId)
    .maybeSingle();
  if (!roomData) notFound();
  const room = roomData as ChatRoomMeta;

  const [profiles, reports, events, meta] = await Promise.all([
    admin.from("profiles").select("id, nickname").in("id", [room.user_a, room.user_b]),
    admin
      .from("reports")
      .select("id, reporter, target, reason, detail, created_at, resolved_at")
      .or(`and(reporter.eq.${room.user_a},target.eq.${room.user_b}),and(reporter.eq.${room.user_b},target.eq.${room.user_a})`)
      .order("created_at"),
    admin.from("chat_events").select("id, user_id, kind, created_at").eq("room_id", room.id).order("id"),
    admin
      .from("chat_messages")
      .select("id, room_id, sender, room_seq, sender_seq, turn, char_count, response_seconds, created_at")
      .eq("room_id", room.id)
      .order("room_seq"),
  ]);
  const name = new Map((profiles.data ?? []).map((p) => [p.id, p.nickname as string]));
  const nameOf = (id: string | null) => (id ? (name.get(id) ?? "탈퇴한 회원") : "탈퇴한 회원");
  const messages = (meta.data ?? []) as ChatMessageMeta[];
  const m = roomMetrics(room, messages);

  // 대화 내용은 두 사람 사이에 신고가 있을 때만 연다 (신고 확인용)
  const canRead = (reports.data ?? []).length > 0;
  let bodies = new Map<number, string | null>();
  if (canRead) {
    const { data } = await admin.from("chat_messages").select("id, body").eq("room_id", room.id);
    bodies = new Map((data ?? []).map((r) => [r.id as number, r.body as string | null]));
    console.info(`[admin] ${me.userId} read chat ${room.id}`);
  }

  return (
    <AdminShell current="users" back={{ href: `/admin/users/${room.user_a}`, label: `${nameOf(room.user_a)}님 상세` }}>
      <h1 className="font-serif text-[1.6rem] font-bold leading-tight">
        <Link href={`/admin/users/${room.user_a}`} className="hover:underline">
          {nameOf(room.user_a)}
        </Link>{" "}
        ·{" "}
        <Link href={`/admin/users/${room.user_b}`} className="hover:underline">
          {nameOf(room.user_b)}
        </Link>
      </h1>
      <p className="mt-2 flex flex-wrap gap-1.5">
        {room.exchanged_at ? <Chip tone="moss">연락처 교환</Chip> : <Chip>연락처 미교환</Chip>}
        {room.closed_at && <Chip tone="alert">{room.close_reason === "blocked" ? "차단으로 닫힘" : "신고로 닫힘"}</Chip>}
        {canRead && <Chip tone="alert">신고 {reports.data!.length}건</Chip>}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="요약" lead="내용 없이 시각·글자 수로 계산한 값이에요.">
          <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm tabular-nums">
            <dt className="text-muted">열린 시각</dt>
            <dd>{kstTime(room.opened_at)}</dd>
            <dt className="text-muted">메시지</dt>
            <dd>
              {nameOf(room.user_a)} {room.count_a} · {nameOf(room.user_b)} {room.count_b} · 말차례 {m.turns}
            </dd>
            <dt className="text-muted">평균 글자</dt>
            <dd>
              {m.avgCharsA ?? "–"} · {m.avgCharsB ?? "–"}
            </dd>
            <dt className="text-muted">응답 중앙값</dt>
            <dd>
              {sec(m.medianResponseA)} · {sec(m.medianResponseB)}
            </dd>
            <dt className="text-muted">첫 메시지까지</dt>
            <dd>
              {sec(m.secondsToFirstMessage)}
              {m.firstSender && ` (${nameOf(m.firstSender === "a" ? room.user_a : room.user_b)}님이 먼저)`}
            </dd>
            <dt className="text-muted">첫 답장까지</dt>
            <dd>{sec(m.secondsToFirstReply)}</dd>
            <dt className="text-muted">연락처 교환까지</dt>
            <dd>{sec(m.secondsToExchange)}</dd>
          </dl>
        </Panel>
        <Panel title="일어난 일">
          <ul className="space-y-1.5 text-sm">
            {(events.data ?? []).map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span>
                  {EVENT_LABEL[e.kind as string] ?? e.kind}
                  {e.user_id && <span className="text-muted"> · {nameOf(e.user_id as string)}</span>}
                </span>
                <span className="tabular-nums text-muted">{kstTime(e.created_at as string)}</span>
              </li>
            ))}
          </ul>
          {canRead && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-sm font-semibold">신고</p>
              <ul className="mt-1 space-y-1 text-sm">
                {reports.data!.map((r) => (
                  <li key={r.id}>
                    {nameOf(r.reporter)} → {nameOf(r.target)} · {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                    {r.resolved_at ? <span className="text-muted"> (확인 완료)</span> : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="mt-4" title={`메시지 ${messages.length}개`}>
        {!canRead && (
          <div className="mb-4">
            <Notice>신고가 없는 대화는 내용을 열 수 없어요. 개인정보 보호를 위해 두 사람 사이에 신고가 있을 때만 확인용으로 보여줘요.</Notice>
          </div>
        )}
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>순번</th>
              <th className={th}>보낸 사람</th>
              <th className={`${th} text-right`}>말차례</th>
              <th className={`${th} text-right`}>글자</th>
              <th className={`${th} text-right`}>응답</th>
              <th className={th}>시각</th>
              {canRead && <th className={th}>내용</th>}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {messages.map((msg) => (
              <tr key={msg.id}>
                <td className={td}>{msg.room_seq}</td>
                <td className={`${td} whitespace-nowrap`}>{nameOf(msg.sender)}</td>
                <td className={`${td} text-right`}>{msg.turn}</td>
                <td className={`${td} text-right`}>{msg.char_count}</td>
                <td className={`${td} whitespace-nowrap text-right`}>{sec(msg.response_seconds)}</td>
                <td className={`${td} whitespace-nowrap text-muted`}>{kstTime(msg.created_at)}</td>
                {canRead && (
                  <td className={`${td} min-w-[16rem] whitespace-pre-wrap break-words`}>
                    {bodies.get(msg.id) ?? <span className="text-muted">보관 기간이 지나 지워짐</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>
    </AdminShell>
  );
}
