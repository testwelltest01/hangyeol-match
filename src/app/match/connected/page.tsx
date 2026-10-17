import { MESSAGES_PER_PERSON } from "@/lib/chat/rules";
import type { Dashboard } from "@/lib/match/dashboard";
import { EmptyText, loadMatch, MatchFrame, MatchNotices, PairRow, Section } from "../frame";

export default function ConnectedPage() {
  return (
    <MatchFrame current="connected" title="연결">
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

async function ConnectedGate() {
  const data = await loadMatch();
  const { d } = data;
  const ask = d.connected.filter((c) => c.needsFeedback);

  if (!d.chatAvailable) {
    // 0005 SQL 전: 예전처럼 서로 수락하면 연락처가 보인다
    const rest = d.connected.filter((c) => !c.needsFeedback);
    return (
      <>
        <MatchNotices data={data} />
        {d.connected.length === 0 ? (
          <EmptyText>아직 연결된 사람이 없어요. 서로 수락하면 여기에서 연락처를 볼 수 있어요.</EmptyText>
        ) : (
          <div className="space-y-10">
            {ask.length > 0 && (
              <Section title="만나보셨나요?" lead="짧은 답이 다음 추천을 더 정확하게 만들어요. 답은 상대에게 보이지 않아요.">
                {ask.map((c) => (
                  <PairRow key={c.id} card={c} note="답하기" />
                ))}
              </Section>
            )}
            {rest.length > 0 && (
              <Section title="연락처를 주고받았어요" lead="먼저 인사를 건네보세요.">
                {rest.map((c) => (
                  <PairRow key={c.id} card={c} note="연락처 보기" />
                ))}
              </Section>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <MatchNotices data={data} />
      {d.connected.length === 0 ? (
        <EmptyText>아직 연결된 사람이 없어요. 서로 수락하면 대화방이 열려요.</EmptyText>
      ) : (
        <div className="space-y-10">
          {ask.length > 0 && (
            <Section title="만나보셨나요?" lead="짧은 답이 다음 추천을 더 정확하게 만들어요. 답은 상대에게 보이지 않아요.">
              {ask.map((c) => (
                <PairRow key={c.id} card={c} note="답하기" />
              ))}
            </Section>
          )}
          <Section
            title="대화"
            lead={`서로 수락하면 대화방이 열려요. 한 사람당 메시지 ${MESSAGES_PER_PERSON}개까지 보낼 수 있고, 둘 다 '연락처 전달'을 누르면 연락처가 보여요.`}
          >
            {d.connected.map((c) => {
              const { note, waiting } = chatNote(c);
              const sub = c.chat ? `나 ${c.chat.myCount}/${MESSAGES_PER_PERSON} · ${c.nickname}님 ${c.chat.theirCount}/${MESSAGES_PER_PERSON}` : undefined;
              return <PairRow key={c.id} card={c} note={note} waiting={waiting} href={`/chat/${c.id}`} sub={sub} />;
            })}
          </Section>
        </div>
      )}
    </>
  );
}
