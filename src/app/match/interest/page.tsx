import { EmptyText, loadMatch, MatchFrame, MatchNotices, PairRow, Section } from "../frame";

export default function InterestPage() {
  return (
    <MatchFrame current="interest" title="관심">
      <InterestGate />
    </MatchFrame>
  );
}

async function InterestGate() {
  const data = await loadMatch();
  const { d } = data;
  const empty = d.photos.length === 0 && d.waitingAccept.length === 0 && d.sentInterest.length === 0;

  return (
    <>
      <MatchNotices data={data} />
      {empty ? (
        <EmptyText>아직 주고받은 관심이 없어요. 오늘의 추천에서 마음에 드는 사람에게 관심을 보내보세요.</EmptyText>
      ) : (
        <div className="space-y-10">
          {d.photos.length > 0 && (
            <Section title="서로 관심을 보냈어요" lead="사진이 공개됐어요. 보고 마음에 들면 수락해주세요. 서로 수락하면 연락처가 공개돼요.">
              {d.photos.map((c) => (
                <PairRow key={c.id} card={c} note="사진 보기" />
              ))}
            </Section>
          )}
          {d.waitingAccept.length > 0 && (
            <Section title="내가 수락했어요" lead="상대도 수락하면 연락처가 공개돼요.">
              {d.waitingAccept.map((c) => (
                <PairRow key={c.id} card={c} note="답 기다리는 중" waiting />
              ))}
            </Section>
          )}
          {d.sentInterest.length > 0 && (
            <Section title="내가 관심을 보냈어요" lead="상대도 관심을 보내면 서로의 사진이 공개돼요.">
              {d.sentInterest.map((c) => (
                <PairRow key={c.id} card={c} note="답 기다리는 중" waiting />
              ))}
            </Section>
          )}
        </div>
      )}
    </>
  );
}
