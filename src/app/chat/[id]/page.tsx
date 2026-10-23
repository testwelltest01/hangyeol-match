import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { chatState, getChatRoom, loadChatMessages, openChatRoom, syncReads } from "@/lib/chat/server";
import { decryptText } from "@/lib/crypto";
import { igVerifiedSet } from "@/lib/instagram/server";
import { commonGround, talkingPoint } from "@/lib/match/explain";
import { loadPair, pairStage } from "@/lib/match/server";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import type { Scores } from "@/lib/scoring";
import { UUID_RE } from "@/lib/sniff";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { ChatRoom } from "./ChatRoom";

export const metadata: Metadata = { title: "대화 | 한결", robots: { index: false, follow: false } };

export default function ChatPage({ params }: PageProps<"/chat/[id]">) {
  return (
    <Shell back={{ href: "/match/connected", label: "대화" }} hideFooter>
      <Suspense fallback={<Loading />}>
        <ChatGate params={params} />
      </Suspense>
    </Shell>
  );
}

function safeDecrypt(v: string | null | undefined): string | null {
  if (!v) return null;
  try {
    return decryptText(v);
  } catch {
    return null;
  }
}

async function ChatGate({ params }: { params: PageProps<"/chat/[id]">["params"] }) {
  const { id } = await params;
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  if (!UUID_RE.test(id) || id === userId) notFound();

  const admin = createAdminClient();
  // 서로 수락한 사이에서만 대화방이 있다. 그 밖에는 있는지조차 알려주지 않는다
  if (pairStage(await loadPair(admin, userId!, id)) !== "connected") notFound();
  const room = (await getChatRoom(admin, userId!, id)) ?? (await openChatRoom(admin, userId!, id));
  if (!room) redirect(`/people/${id}`);

  const [profile, messages, myScores, theirScores, contactRow] = await Promise.all([
    admin.from("profiles").select("nickname").eq("id", id).maybeSingle(),
    loadChatMessages(admin, room.id, userId!),
    admin.from("test_scores").select("scores").eq("user_id", userId!).maybeSingle(),
    admin.from("test_scores").select("scores").eq("user_id", id).maybeSingle(),
    // 연락처는 둘 다 '연락처 전달'을 누른 뒤에만 읽는다
    room.exchanged_at ? admin.from("contacts").select("instagram, kakao").eq("user_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const instagramVerified = contactRow.data ? (await igVerifiedSet(admin, [id])).has(id) : false;
  if (!profile.data) notFound();
  const theirRead = await syncReads(admin, room, userId!, messages.at(-1)?.id ?? 0);
  const both = myScores.data && theirScores.data ? ([myScores.data.scores as Scores, theirScores.data.scores as Scores] as const) : null;
  const tip = both ? talkingPoint(...both) : null;
  const common = both ? commonGround(...both) : null;
  const contact = contactRow.data
    ? { instagram: safeDecrypt(contactRow.data.instagram), kakao: safeDecrypt(contactRow.data.kakao), instagramVerified }
    : null;

  return (
    <ChatRoom
      otherId={id}
      name={profile.data.nickname}
      initialMessages={messages}
      initialState={chatState(room, userId!)}
      initialTheirRead={theirRead}
      contact={contact}
      tip={tip}
      common={common}
    />
  );
}
