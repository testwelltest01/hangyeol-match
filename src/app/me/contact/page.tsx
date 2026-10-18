import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { PageTitle } from "@/components/ui";
import { decryptText } from "@/lib/crypto";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <Shell back={{ href: "/me", label: "내 정보" }}>
      <PageTitle
        title="연락처"
        lead="서로 수락하면 대화방이 먼저 열려요. 둘 다 '연락처 전달'을 눌렀을 때만 이 아이디가 상대에게 보여요."
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
