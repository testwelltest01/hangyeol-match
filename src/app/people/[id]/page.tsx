import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { personLine } from "@/components/PersonCard";
import { ReactButtons } from "@/components/ReactButtons";
import { Shell } from "@/components/Shell";
import { AppNav, Notice } from "@/components/ui";
import { decryptText } from "@/lib/crypto";
import { domainComparison, profileChips, recommendationReason, talkingPoint } from "@/lib/match/explain";
import { signedPhotoUrls } from "@/lib/match/me";
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

export default function PersonPage({ params }: PageProps<"/people/[id]">) {
  return (
    <Shell right={<AppNav current="match" />}>
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

  const [profile, mp, theirScores, myScores, rec] = await Promise.all([
    admin.from("profiles").select("nickname, birth_year").eq("id", id).maybeSingle(),
    admin.from("match_profiles").select("region, height, intro").eq("user_id", id).maybeSingle(),
    admin.from("test_scores").select("scores").eq("user_id", id).maybeSingle(),
    admin.from("test_scores").select("scores").eq("user_id", userId!).single(),
    admin.from("recommendations").select("reason").eq("user_id", userId!).eq("target_id", id).order("day", { ascending: false }).limit(1),
  ]);
  if (!profile.data || !mp.data || !theirScores.data) notFound();

  const mine = myScores.data!.scores as Scores;
  const theirs = theirScores.data.scores as Scores;
  const reason = rec.data?.[0]?.reason ?? recommendationReason(mine, theirs);
  const talk = talkingPoint(mine, theirs);
  const chips = profileChips(theirs);
  const domains = domainComparison(mine, theirs);

  const showPhotos = stage === "photos" || stage === "waiting_accept" || stage === "connected";
  let photos: { slot: string; url: string }[] = [];
  if (showPhotos) {
    const { data } = await admin.from("photos").select("slot, path").eq("user_id", id).is("replaced_at", null);
    const rows = (data ?? []).sort((a, b) => (a.slot === "face" ? -1 : 1) - (b.slot === "face" ? -1 : 1));
    const urls = await signedPhotoUrls(rows.map((r) => r.path));
    photos = rows.flatMap((r) => (urls.get(r.path) ? [{ slot: r.slot, url: urls.get(r.path)! }] : []));
  }

  let contact: { instagram: string | null; kakao: string | null } | null = null;
  let feedback: { outcome: string } | null = null;
  if (stage === "connected") {
    const [{ data: c }, { data: fb }] = await Promise.all([
      admin.from("contacts").select("instagram, kakao").eq("user_id", id).maybeSingle(),
      admin.from("meeting_feedback").select("outcome").eq("from_user", userId!).eq("to_user", id).maybeSingle(),
    ]);
    contact = { instagram: safeDecrypt(c?.instagram ?? null), kakao: safeDecrypt(c?.kakao ?? null) };
    feedback = fb ?? null;
  }

  const name = profile.data.nickname;
  return (
    <article>
      <h1 className="font-serif text-[1.9rem] font-bold leading-tight">{name}</h1>
      <p className="mt-1 text-muted">{personLine({ birthYear: profile.data.birth_year, region: mp.data.region, height: mp.data.height })}</p>

      <p className="mt-6 border-l-2 border-indigo pl-3 font-serif text-[1.05rem] leading-relaxed">{reason}</p>
      {talk && <p className="mt-3 text-ink-soft">{talk}</p>}

      {showPhotos && (
        <section className="mt-8">
          <h2 className="sr-only">사진</h2>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((p) => (
              <div key={p.slot} className="aspect-[3/4] overflow-hidden rounded-xl bg-mist">
                {/* 10분짜리 서명 주소라 next/image 최적화 대신 그대로 보여준다 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`${name}님의 ${p.slot === "face" ? "얼굴" : "전신"} 사진`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">사진은 서로 관심을 보낸 사람에게만 보여요. 저장하거나 다른 곳에 올리지 말아주세요.</p>
        </section>
      )}

      <section className="mt-8">
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

      <section className="mt-8">
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
            <p className="mb-4 text-ink-soft">사진을 보고 마음에 들면 수락해주세요. 서로 수락하면 연락처가 공개돼요.</p>
            <ReactButtons targetId={id} mode="accept" />
          </>
        )}
        {stage === "waiting_accept" && <Notice>수락했어요. {name}님의 답을 기다리고 있어요.</Notice>}
        {stage === "connected" && contact && (
          <>
            <h2 className="font-serif text-xl font-bold">연락처</h2>
            <p className="mt-2 text-ink-soft">서로 수락했어요. 먼저 인사를 건네보세요.</p>
            <dl className="mt-4 space-y-3">
              {contact.instagram && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                  <div>
                    <dt className="text-sm text-muted">인스타그램</dt>
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
            <div id="feedback" className="mt-10">
              <MeetingFeedbackForm targetId={id} name={name} answered={feedback?.outcome ?? null} />
            </div>
          </>
        )}
      </section>

      <SafetyActions targetId={id} name={name} connected={stage === "connected"} />
    </article>
  );
}
