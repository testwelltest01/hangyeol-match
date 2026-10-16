import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { OBSERVER_ITEMS } from "@/lib/items";
import { createAdminClient } from "@/lib/supabase/admin";
import { FriendForm } from "./FriendForm";

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
  const admin = createAdminClient();

  const { data: invite } = await admin.from("friend_invites").select("user_id").eq("token", token).maybeSingle();
  if (!invite) notFound();
  const { data: profile } = await admin.from("profiles").select("nickname").eq("id", invite.user_id).maybeSingle();
  if (!profile) notFound();

  const name = profile.nickname;
  const items = OBSERVER_ITEMS.map((i) => ({ id: i.id, text: i.observerText!.replace("{name}", name) }));

  return (
    <>
      <h1 className="font-serif text-3xl font-bold leading-tight">{name}님은 어떤 사람인가요?</h1>
      <p className="mt-3 text-ink-soft">
        10문항, 1분이면 끝나요. 답은 다른 친구들의 답과 합쳐서 평균으로만 보여주고, 누가 어떻게 답했는지는 {name}님에게
        보이지 않아요. 이름이나 연락처는 받지 않아요.
      </p>
      <FriendForm token={token} items={items} />
    </>
  );
}
