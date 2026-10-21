"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ErrorText } from "@/components/ui";
import type { UserView } from "@/lib/photo/score";
import { resizeImage } from "@/lib/photo/resize";
import { uploadPhoto } from "../actions";
import { ZoomImage } from "@/components/ZoomImage";

function FeedbackCard({ feedback, fresh }: { feedback: UserView; fresh: boolean }) {
  return (
    <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-4">
      <p className="text-sm font-semibold text-muted">{fresh ? "방금 받은 피드백" : "지금 사진의 피드백"}</p>
      {feedback.acknowledged_previous && <p className="mt-2 text-moss">{feedback.acknowledged_previous}</p>}
      {feedback.strength && (
        <p className="mt-2">
          <span className="font-semibold">좋은 점 · </span>
          {feedback.strength}
        </p>
      )}
      {feedback.improvements.length > 0 && (
        <ol className="mt-3 space-y-3">
          {feedback.improvements.map((i, n) => (
            <li key={n} className="border-l-2 border-indigo pl-3">
              <p className="font-semibold">{i.what}</p>
              <p className="mt-1 text-ink-soft">{i.how}</p>
              <p className="mt-1 text-sm text-muted">{i.why}</p>
            </li>
          ))}
        </ol>
      )}
      {feedback.suggest_retake && (
        <p className="mt-3 rounded-lg bg-mist px-3 py-2 text-[15px]">
          위 팁에 맞는 다른 사진을 골라보거나 한 번 더 찍어서 올려보시겠어요? 사진이 바뀌면 첫인상이 크게 달라져요.
        </p>
      )}
    </div>
  );
}

export function PhotoSlot({
  slot,
  title,
  tip,
  current,
  canUpload,
}: {
  slot: "face" | "body";
  title: string;
  tip: string;
  current: { url: string | null; feedback: UserView } | null;
  canUpload: boolean;
}) {
  const router = useRouter();
  // 얼굴·전신 모두 갤러리에서 고른다 (바로 찍기는 기본 카메라만 써서 뺐다. 갤러리 화면에서도 촬영은 할 수 있다)
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<UserView | null>(null);

  const locked = !canUpload;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      const form = new FormData();
      form.set("slot", slot);
      form.set("photo", new File([blob], `${slot}.jpg`, { type: "image/jpeg" }));
      const res = await uploadPhoto(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFresh(res.feedback);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진을 올리지 못했어요.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const feedback = fresh ?? current?.feedback ?? null;
  const disabled = busy || locked;

  return (
    <section>
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      <p className="mt-2 text-[15px] text-ink-soft">{tip}</p>

      <div className="mt-4 flex gap-4">
        <div className="aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-xl bg-mist">
          {current?.url ? (
            <ZoomImage src={current.url} alt={`내 ${title}`} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">아직 없어요</div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="w-full rounded-full bg-primary transition active:scale-[0.98] active:opacity-80 px-5 py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            {busy
              ? "AI가 사진을 보는 중"
              : locked
                ? "올릴 수 있는 횟수를 다 썼어요"
                : current
                  ? "다른 사진 고르기"
                  : slot === "face"
                    ? "얼굴 사진 고르기"
                    : "전신 사진 고르기"}
          </button>
          {busy && <p className="text-sm text-muted">10~30초쯤 걸려요. 화면을 닫지 말아주세요.</p>}
        </div>
      </div>

      <div className="mt-3">
        <ErrorText>{error}</ErrorText>
      </div>
      {feedback && <FeedbackCard feedback={feedback} fresh={Boolean(fresh)} />}
    </section>
  );
}
