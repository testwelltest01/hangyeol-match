import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { AppNav, PageTitle } from "@/components/ui";
import { decryptText } from "@/lib/crypto";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <Shell right={<AppNav current="me" />}>
      <PageTitle
        title="연락처"
        lead="한결에는 채팅이 없어요. 서로 수락하면 이 아이디가 상대에게 공개되고, 그때부터 직접 연락해요."
      />
      <Suspense fallback={<Loading />}>
        <ContactGate />
      </Suspense>
    </Shell>
  );
}

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try {
    return decryptText(v);
  } catch {
    return "";
  }
}

async function ContactGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);

  const { data } = await createAdminClient().from("contacts").select("instagram, kakao").eq("user_id", userId!).maybeSingle();
  return <ContactForm initial={{ instagram: safeDecrypt(data?.instagram ?? null), kakao: safeDecrypt(data?.kakao ?? null) }} />;
}
