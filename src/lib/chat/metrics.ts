// 대화 분석 지표. 내용은 쓰지 않고 시각·글자 수·순번만 쓴다. 순수 함수.

export type ChatRoomMeta = {
  id: string;
  user_a: string;
  user_b: string;
  opened_at: string;
  first_message_at: string | null;
  last_message_at: string | null;
  count_a: number;
  count_b: number;
  contact_a_at: string | null;
  contact_b_at: string | null;
  exchanged_at: string | null;
  closed_at: string | null;
  close_reason: string | null;
};

export type ChatMessageMeta = {
  id: number;
  room_id: string;
  sender: string;
  room_seq: number;
  sender_seq: number;
  turn: number;
  char_count: number;
  response_seconds: number | null;
  created_at: string;
};

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const seconds = (from: string | null, to: string | null) =>
  from && to ? Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000) : null;

export type RoomMetrics = {
  turns: number;
  avgCharsA: number | null;
  avgCharsB: number | null;
  medianResponseA: number | null;
  medianResponseB: number | null;
  /** 방이 열리고 첫 메시지까지 */
  secondsToFirstMessage: number | null;
  /** 첫 메시지에 상대가 처음 답하기까지 */
  secondsToFirstReply: number | null;
  firstSender: "a" | "b" | null;
  secondsToExchange: number | null;
  /** 첫 메시지부터 마지막 메시지까지 */
  activeSeconds: number | null;
};

export function roomMetrics(room: ChatRoomMeta, messages: ChatMessageMeta[]): RoomMetrics {
  const ms = messages.filter((m) => m.room_id === room.id).sort((a, b) => a.room_seq - b.room_seq);
  const by = (u: string) => ms.filter((m) => m.sender === u);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const first = ms[0];
  const firstReply = first ? ms.find((m) => m.sender !== first.sender) : undefined;
  return {
    turns: ms.length ? Math.max(...ms.map((m) => m.turn)) : 0,
    avgCharsA: avg(by(room.user_a).map((m) => m.char_count)),
    avgCharsB: avg(by(room.user_b).map((m) => m.char_count)),
    medianResponseA: median(by(room.user_a).flatMap((m) => (m.response_seconds === null ? [] : [m.response_seconds]))),
    medianResponseB: median(by(room.user_b).flatMap((m) => (m.response_seconds === null ? [] : [m.response_seconds]))),
    secondsToFirstMessage: seconds(room.opened_at, first?.created_at ?? null),
    secondsToFirstReply: first && firstReply ? seconds(first.created_at, firstReply.created_at) : null,
    firstSender: first ? (first.sender === room.user_a ? "a" : "b") : null,
    secondsToExchange: seconds(room.opened_at, room.exchanged_at),
    activeSeconds: first ? seconds(first.created_at, ms[ms.length - 1].created_at) : null,
  };
}
