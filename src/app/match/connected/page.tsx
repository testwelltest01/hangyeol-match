import { EmptyText, loadMatch, MatchFrame, MatchNotices, PairRow, Section } from "../frame";

export default function ConnectedPage() {
  return (
    <MatchFrame current="connected" title="연결">
      <ConnectedGate />
    </MatchFrame>
  );
}

async function ConnectedGate() {
  const data = await loadMatch();
  const ask = data.d.connected.filter((c) => c.needsFeedback);
  const rest = data.d.connected.filter((c) => !c.needsFeedback);

  return (
    <>
      <MatchNotices data={data} />
      {ask.length === 0 && rest.length === 0 ? (
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
