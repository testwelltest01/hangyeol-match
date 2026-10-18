import Link from "next/link";
import { EmptyState } from "@/components/app-ui";
import { IconHeart } from "@/components/icons";
import { loadMatch, MatchFrame, MatchNotices, PairRow, Section } from "../frame";

export default function InterestPage() {
  return (
    <MatchFrame current="interest" title="관심" sub="서로 관심을 보내면 사진이 공개되고, 서로 수락하면 대화가 시작돼요.">
      <InterestGate />
    </MatchFrame>
  );
}

async function InterestGate() {
  const data = await loadMatch();
  const { d } = data;
  const empty = d.photos.length === 0 && d.waitingAccept.length === 0 && d.sentInterest.length === 0;
  const opens = d.chatAvailable ? "대화방이 열려요" : "연락처가 공개돼요";

  return (
    <>
      <MatchNotices data={data} />
      {empty ? (
        <EmptyState
          icon={<IconHeart size={26} />}
          title="아직 주고받은 관심이 없어요"
          body="오늘의 추천에서 마음이 가는 사람에게 관심을 보내보세요."
          action={
            <Link href="/match" className="inline-block rounded-full border border-primary px-5 py-2.5 text-[15px] font-semibold text-primary hover:bg-primary hover:text-white">
              오늘의 추천 보기
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {d.photos.length > 0 && (
            <Section title="서로 관심을 보냈어요" lead={`사진이 공개됐어요. 마음에 들면 수락해주세요. 서로 수락하면 ${opens}.`}>
              {d.photos.map((c) => (
                <PairRow key={c.id} card={c} note="사진 보기" />
              ))}
            </Section>
          )}
          {d.waitingAccept.length > 0 && (
            <Section title="내가 수락했어요" lead={`상대도 수락하면 ${opens}.`}>
              {d.waitingAccept.map((c) => (
                <PairRow key={c.id} card={c} note="기다리는 중" waiting />
              ))}
            </Section>
          )}
          {d.sentInterest.length > 0 && (
            <Section title="내가 관심을 보냈어요" lead="상대도 관심을 보내면 서로의 사진이 공개돼요.">
              {d.sentInterest.map((c) => (
                <PairRow key={c.id} card={c} note="기다리는 중" waiting />
              ))}
            </Section>
          )}
        </div>
      )}
    </>
  );
}
