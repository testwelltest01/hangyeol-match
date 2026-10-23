import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { PageTitle } from "@/components/ui";
import { decryptText } from "@/lib/crypto";
import { igOfficial, myIgVerification } from "@/lib/instagram/server";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { ContactForm } from "./ContactForm";
import { InstagramVerify } from "./InstagramVerify";

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

  const admin = createAdminClient();
  const [{ data }, verified] = await Promise.all([
    admin.from("contacts").select("instagram, kakao").eq("user_id", userId!).maybeSingle(),
    myIgVerification(admin, userId!),
  ]);
  const initial = { instagram: safeDecrypt(data?.instagram ?? null), kakao: safeDecrypt(data?.kakao ?? null) };
  const official = igOfficial();
  return (
    <>
      {/* 인스타 확인(선택): 공식 계정이 설정돼 있을 때만 */}
      {official && <InstagramVerify official={official} verified={verified ? { username: verified.username } : null} />}
      {/* 확인으로 인스타 아이디가 바뀌면 입력칸을 새 값으로 다시 그린다 */}
      <ContactForm key={initial.instagram} initial={initial} verifiedInstagram={verified?.username ?? null} />
    </>
  );
}
