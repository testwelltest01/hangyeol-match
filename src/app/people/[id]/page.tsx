import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/app-ui";
import { DateTipsButton } from "@/components/DateTips";
import { IgVerifiedBadge } from "@/components/IgVerifiedBadge";
import { LikedBadge } from "@/components/LikedBadge";
import { Loading } from "@/components/Loading";
import { personLine } from "@/components/PersonCard";
import { ReactButtons } from "@/components/ReactButtons";
import { PrimaryLink } from "@/components/buttons";
import { Shell } from "@/components/Shell";
import { Notice } from "@/components/ui";
import { getChatRoom, unreadCounts } from "@/lib/chat/server";
import { decryptText } from "@/lib/crypto";
import { shownIllustrationUrls } from "@/lib/illustration/server";
import { igVerifiedSet } from "@/lib/instagram/server";
import { loadExtraResults, sharedScores } from "@/lib/extra/server";
import { EXTRA_TESTS, extraCommonalities, summarizeExtra } from "@/lib/extra/tests";
import { commonGround, domainComparison, profileChips, recommendationReason, talkingPoint } from "@/lib/match/explain";
import { signedPhotoUrls } from "@/lib/match/me";
import { photosVisible } from "@/lib/match/rules";
import { FIRST_MEETING_GUIDE } from "@/lib/match/safety";
import { loadPair, pairStage } from "@/lib/match/server";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import type { Scores } from "@/lib/scoring";
import { UUID_RE } from "@/lib/sniff";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { CopyButton } from "./CopyButton";
import { MeetingFeedbackForm } from "./MeetingFeedbackForm";
import { SafetyActions } from "./SafetyActions";
import { ZoomImage } from "@/components/ZoomImage";

export default function PersonPage({ params }: PageProps<"/people/[id]">) {
  return (
    <Shell back={{ href: "/match", label: "뒤로", history: true }}>
      <Suspense fallback={<Loading />}>
        <PersonGate params={params} />
      </Suspense>
    </Shell>
  );
}

function safeDecrypt(v: string | null): string | null {
  if (!v) return null;
  try {
    return decryptText(v);
  } catch {
    return null;
  }
}

async function PersonGate({ params }: { params: PageProps<"/people/[id]">["params"] }) {
  const { id } = await params;
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  if (!UUID_RE.test(id) || id === userId) notFound();

  const admin = createAdminClient();
  const pair = await loadPair(admin, userId!, id);
  const stage = pairStage(pair);
  // 추천받았거나 관심·수락으로 이어진 사람만 볼 수 있다. 그 밖에는 있는지조차 알려주지 않는다
  if (stage === "hidden") notFound();

  const [profile, mp, theirScores, myScores, rec, theirExtra, myExtra] = await Promise.all([
    admin.from("profiles").select("nickname, birth_year").eq("id", id).maybeSingle(),
    admin.from("match_profiles").select("region, height, intro").eq("user_id", id).maybeSingle(),
    admin.from("test_scores").select("scores").eq("user_id", id).maybeSingle(),
    admin.from("test_scores").select("scores").eq("user_id", userId!).single(),
    admin.from("recommendations").select("reason").eq("user_id", userId!).eq("target_id", id).order("day", { ascending: false }).limit(1),
    loadExtraResults(admin, id),
    loadExtraResults(admin, userId!),
  ]);
  const [illustrationUrls, igVerified] = await Promise.all([shownIllustrationUrls(admin, [id]), igVerifiedSet(admin, [id])]);
  const illustrationUrl = illustrationUrls.get(id) ?? null;
  const instagramVerified = igVerified.has(id);
  if (!profile.data || !mp.data || !theirScores.data) notFound();

  const mine = myScores.data!.scores as Scores;
  const theirs = theirScores.data.scores as Scores;
  const reason = rec.data?.[0]?.reason ?? recommendationReason(mine, theirs);
  const talk = talkingPoint(mine, theirs);
  const chips = profileChips(theirs);
  const domains = domainComparison(mine, theirs);

  const showPhotos = photosVisible(stage);
  let photos: { slot: string; url: string }[] = [];
  if (showPhotos) {
    const { data } = await admin.from("photos").select("slot, path").eq("user_id", id).is("replaced_at", null);
    const rows = (data ?? []).sort((a, b) => (a.slot === "face" ? -1 : 1) - (b.slot === "face" ? -1 : 1));
    const urls = await signedPhotoUrls(rows.map((r) => r.path));
    photos = rows.flatMap((r) => (urls.get(r.path) ? [{ slot: r.slot, url: urls.get(r.path)! }] : []));
  }

  // 대화방: 서로 수락하면 열린다. 연락처는 둘 다 '연락처 전달'을 눌러야 보인다
  const room = stage === "connected" ? await getChatRoom(admin, userId!, id) : null;
  const exchanged = Boolean(room?.exchanged_at);
  const unread = room ? ((await unreadCounts(admin, [room], userId!)).get(room.id) ?? 0) : 0;

  let contact: { instagram: string | null; kakao: string | null } | null = null;
  let feedback: { outcome: string } | null = null;
  if (exchanged) {
    const [{ data: c }, { data: fb }] = await Promise.all([
      admin.from("contacts").select("instagram, kakao").eq("user_id", id).maybeSingle(),
      admin.from("meeting_feedback").select("outcome").eq("from_user", userId!).eq("to_user", id).maybeSingle(),
    ]);
    contact = { instagram: safeDecrypt(c?.instagram ?? null), kakao: safeDecrypt(c?.kakao ?? null) };
    feedback = fb ?? null;
  }

  const name = profile.data.nickname;
  // 추가 검사: 상대가 보여주기로 한 결과만. 공통점은 내 결과(보여주기 여부와 상관없이)와 비교한다
  const theirShared = sharedScores(theirExtra);
  const extraChips = EXTRA_TESTS.flatMap((t) => (theirShared[t.id] ? summarizeExtra(t, theirShared[t.id]!).chips : []));
  const mineExtra = Object.fromEntries(Object.values(myExtra).map((r) => [r!.test_id, r!.scores]));
  const extraCommon = extraCommonalities(mineExtra, theirShared, name);
  const canCompare = EXTRA_TESTS.some((t) => theirShared[t.id] && mineExtra[t.id]);

  return (
    <article>
      <div className="flex items-center gap-4">
        {!showPhotos && !illustrationUrl && <Avatar name={name} size={56} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="font-serif text-[1.8rem] font-bold leading-tight">{name}</h1>
            {instagramVerified && <IgVerifiedBadge />}
          </div>
          <p className="mt-0.5 text-[14px] text-muted">{personLine({ birthYear: profile.data.birth_year, region: mp.data.region, height: mp.data.height })}</p>
        </div>
        {stage === "new" && pair.theirs?.interest === true && <LikedBadge />}
      </div>

      <div className="mt-5 rounded-[22px] bg-surface px-5 py-4 ring-1 ring-line/80">
        <p className="font-serif text-[1.05rem] leading-relaxed text-ink">{reason}</p>
        {talk && <p className="mt-2 text-[14.5px] text-ink-soft">{talk}</p>}
      </div>

      {!showPhotos && illustrationUrl && (
        <section className="mt-8">
          <h2 className="sr-only">그림 프로필</h2>
          <div className="mx-auto aspect-[2/3] max-w-xs overflow-hidden rounded-2xl bg-mist">
            <ZoomImage src={illustrationUrl} alt={`${name}님의 그림 프로필`} />
          </div>
          <p className="mt-2 text-center text-sm text-muted">
            AI가 실제 사진과 자기소개로 그린 그림이에요. 실제 사진은 서로 관심을 보내면 공개돼요.
          </p>
        </section>
      )}

      {showPhotos && (
        <section className="mt-8">
          <h2 className="sr-only">사진</h2>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((p) => (
              <div key={p.slot} className="aspect-[3/4] overflow-hidden rounded-xl bg-mist">
                <ZoomImage src={p.url} alt={`${name}님의 ${p.slot === "face" ? "얼굴" : "전신"} 사진`} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">사진은 서로 관심을 보낸 사람에게만 보여요. 저장하거나 다른 곳에 올리지 말아주세요.</p>
        </section>
      )}

      <section className="mt-6 rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
        <h2 className="text-sm font-semibold text-muted">자기소개</h2>
        <p className="mt-2 whitespace-pre-line leading-relaxed">{mp.data.intro}</p>
        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="성향">
            {chips.map((c) => (
              <li key={c} className="rounded-full bg-mist px-3 py-1 text-sm text-ink-soft">
                {c}
              </li>
            ))}
          </ul>
        )}
      </section>

      {extraChips.length > 0 && (
        <section className="mt-4 rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
          <h2 className="text-sm font-semibold text-muted">더 알아본 {name}님</h2>
          {extraCommon.length > 0 && (
            <ul className="mt-3 space-y-1.5 rounded-xl bg-mist px-4 py-3 text-[15px]">
              {extraCommon.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="추가 검사 결과">
            {extraChips.map((c) => (
              <li key={c} className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft">
                {c}
              </li>
            ))}
          </ul>
          {!canCompare && (
            <p className="mt-3 text-sm text-muted">
              나도{" "}
              <Link href="/report#extra" className="underline underline-offset-4">
                더 알아보기
              </Link>
              를 하면 공통점을 볼 수 있어요.
            </p>
          )}
        </section>
      )}

      <section className="mt-4 rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
        <h2 className="text-sm font-semibold text-muted">나와 비슷한 정도</h2>
        <ul className="mt-3 space-y-2.5">
          {domains.map((d) => (
            <li key={d.domain} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-[15px]">
              <span>{d.label}</span>
              <span className="relative h-1.5 rounded-full bg-line" aria-hidden>
                <span className="absolute inset-y-0 left-0 rounded-full bg-indigo/70" style={{ width: `${d.percent}%` }} />
              </span>
              <span className="text-right text-sm text-muted">{d.percent}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-line pt-8">
        {stage === "new" && <ReactButtons targetId={id} mode="interest" />}
        {stage === "waiting_interest" && (
          <Notice>관심을 보냈어요. {name}님도 관심을 보내면 서로의 사진이 공개돼요.</Notice>
        )}
        {stage === "photos" && (
          <>
            <p className="mb-4 text-ink-soft">
              사진을 보고 마음에 들면 수락해주세요. 서로 수락하면 대화방이 열려요.
            </p>
            <ReactButtons targetId={id} mode="accept" />
          </>
        )}
        {stage === "waiting_accept" && <Notice>수락했어요. {name}님의 답을 기다리고 있어요.</Notice>}
        {stage === "connected" && (
          <div className="mb-10">
            <h2 className="font-serif text-xl font-bold">대화</h2>
            <p className="mt-2 text-ink-soft">
              {room?.closed_at
                ? "대화가 닫혔어요."
                : exchanged
                  ? "연락처를 주고받았어요. 대화방도 남은 메시지만큼 계속 쓸 수 있어요."
                  : "서로 수락해서 대화방이 열렸어요. 편하게 이야기해보고, 둘 다 '연락처 전달'을 누르면 여기에 연락처가 보여요."}
            </p>
            <div className="mt-4">
              <PrimaryLink href={`/chat/${id}`}>{unread ? `대화방 열기 · 새 메시지 ${unread}` : "대화방 열기"}</PrimaryLink>
            </div>
          </div>
        )}
        {exchanged && contact && (
          <>
            <h2 className="font-serif text-xl font-bold">연락처</h2>
            <p className="mt-2 text-ink-soft">둘 다 연락처 전달을 눌렀어요.</p>
            <dl className="mt-4 space-y-3">
              {contact.instagram && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-muted">
                      인스타그램
                      {instagramVerified && <IgVerifiedBadge short />}
                    </dt>
                    <dd className="font-semibold">@{contact.instagram}</dd>
                  </div>
                  <CopyButton text={contact.instagram} />
                </div>
              )}
              {contact.kakao && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                  <div>
                    <dt className="text-sm text-muted">카카오톡 ID</dt>
                    <dd className="font-semibold">{contact.kakao}</dd>
                  </div>
                  <CopyButton text={contact.kakao} />
                </div>
              )}
            </dl>
            <div className="mt-6 rounded-xl bg-mist px-4 py-4">
              <p className="font-semibold">첫 만남 안전 수칙</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-ink-soft">
                {FIRST_MEETING_GUIDE.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
            {/* 연구로 확인된 첫 만남 팁 (대화방 연락처 칸에도 같은 버튼) */}
            <div className="mt-4">
              <DateTipsButton name={name} hints={{ common: commonGround(mine, theirs), differ: talk }} />
            </div>
            <div id="feedback" className="mt-10">
              <MeetingFeedbackForm targetId={id} name={name} answered={feedback?.outcome ?? null} />
            </div>
          </>
        )}
      </section>

      <SafetyActions targetId={id} name={name} connected={exchanged} />
    </article>
  );
}
