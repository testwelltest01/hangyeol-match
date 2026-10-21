import { MESSAGES_PER_PERSON } from "@/lib/chat/rules";
import type { Dashboard } from "@/lib/match/dashboard";
import Link from "next/link";
import { EmptyState } from "@/components/app-ui";
import { IconChat } from "@/components/icons";
import { loadMatch, MatchFrame, MatchNotices, PairRow, Section } from "../frame";

export default function ConnectedPage() {
  return (
    <MatchFrame current="connected" title="대화" sub="서로 수락한 사람과 이야기해보세요. 둘 다 '연락처 전달'을 누르면 연락처가 보여요.">
      <ConnectedGate />
    </MatchFrame>
  );
}

type Connected = Dashboard["connected"][number];

/** 대화방 한 줄의 오른쪽 안내와 회색 여부 */
function chatNote(c: Connected): { note: string; waiting: boolean } {
  const chat = c.chat;
  if (!chat) return { note: "대화하기", waiting: false };
  if (chat.closed) return { note: "대화 종료", waiting: true };
  if (chat.unread > 0) return { note: `새 메시지 ${chat.unread}`, waiting: false };
  if (chat.contactTheirs && !chat.contactMine && !chat.exchanged) return { note: "연락처 전달 요청", waiting: false };
  if (chat.exchanged) return { note: "연락처 교환됨", waiting: true };
  if (chat.contactMine) return { note: "상대 답 기다리는 중", waiting: true };
  return { note: "대화하기", waiting: false };
}

const toInterest = (
  <Link href="/match/interest" className="inline-block rounded-full border border-primary px-5 py-2.5 text-[15px] font-semibold text-primary hover:bg-primary hover:text-white">
    관심 보기
  </Link>
);

async function ConnectedGate() {
  const data = await loadMatch();
  const { d } = data;
  const ask = d.connected.filter((c) => c.needsFeedback);

  return (
    <>
      <MatchNotices data={data} />
      {d.connected.length === 0 ? (
        <EmptyState icon={<IconChat size={26} />} title="아직 대화할 사람이 없어요" body="서로 수락하면 여기에서 대화방이 열려요." action={toInterest} />
      ) : (
        <div className="space-y-8">
          {ask.length > 0 && (
            <Section title="만나보셨나요?" lead="짧은 답이 다음 추천을 더 정확하게 만들어요. 답은 상대에게 보이지 않아요.">
              {ask.map((c) => (
                <PairRow key={c.id} card={c} note="답하기" />
              ))}
            </Section>
          )}
          <Section title="대화방" lead={`한 사람당 메시지를 ${MESSAGES_PER_PERSON}개까지 보낼 수 있어요.`}>
            {d.connected.map((c) => {
              const { note, waiting } = chatNote(c);
              const sub = c.chat ? `보낸 메시지 ${c.chat.myCount}개, 받은 메시지 ${c.chat.theirCount}개` : undefined;
              return <PairRow key={c.id} card={c} note={note} waiting={waiting} href={`/chat/${c.id}`} sub={sub} />;
            })}
          </Section>
        </div>
      )}
    </>
  );
}
