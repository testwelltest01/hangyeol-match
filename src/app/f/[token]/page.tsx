import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { OBSERVER_ITEMS } from "@/lib/items";
import { createAdminClient } from "@/lib/supabase/admin";
import { FriendForm } from "./FriendForm";

async function nicknameByToken(token: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: invite } = await admin.from("friend_invites").select("user_id").eq("token", token).maybeSingle();
  if (!invite) return null;
  const { data: profile } = await admin.from("profiles").select("nickname").eq("id", invite.user_id).maybeSingle();
  return profile?.nickname ?? null;
}

/** 카카오톡에 친구 평가 링크를 보내면 "○○님은 어떤 사람인가요?"로 보이게 한다. 이미지는 같은 폴더의 opengraph-image.png */
const SHARE_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "한결: 결이 맞는 사람" };

export async function generateMetadata({ params }: PageProps<"/f/[token]">): Promise<Metadata> {
  const { token } = await params;
  const name = await nicknameByToken(token);
  const title = name ? `${name}님은 어떤 사람인가요?` : "한결 친구 평가";
  const description = "10문항, 1분이면 끝나요. 답은 다른 친구들의 답과 합쳐 평균으로만 보여줘요.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    // openGraph를 여기서 다시 정하면 루트의 그림(app/opengraph-image.png)이 빠지므로 직접 붙인다
    openGraph: { type: "website", siteName: "한결", locale: "ko_KR", title, description, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

export default function FriendPage({ params }: PageProps<"/f/[token]">) {
  return (
    <Shell>
      <Suspense fallback={<Loading />}>
        <FriendGate params={params} />
      </Suspense>
    </Shell>
  );
}

async function FriendGate({ params }: { params: PageProps<"/f/[token]">["params"] }) {
  const { token } = await params;
  const name = await nicknameByToken(token);
  if (!name) notFound();

  const items = OBSERVER_ITEMS.map((i) => ({ id: i.id, text: i.observerText!.replace("{name}", name) }));

  return <FriendForm token={token} name={name} items={items} />;
}
