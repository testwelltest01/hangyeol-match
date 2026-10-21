"use client";

import { useEffect, useState } from "react";

async function loadFile(url: string, filename: string): Promise<File | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/webp" });
}

function download(file: File) {
  const href = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/**
 * 그림을 휴대폰에 저장. 휴대폰은 공유 시트(파일 공유)를 열어 '이미지 저장'으로 사진 앱에 넣고, 공유 시트가 없는 컴퓨터는 내려받는다.
 * 공유 시트는 누른 직후에만 열 수 있어서(iPhone) 화면이 열릴 때 그림 파일을 미리 받아 둔다.
 * 서명 주소(10분)가 만료됐으면 화면을 새로 고치라고 알린다
 */
export function SaveImageButton({ url, filename, className }: { url: string; filename: string; className: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadFile(url, filename)
      .then((f) => {
        if (alive && f) setFile(f);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url, filename]);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const f = file ?? (await loadFile(url, filename));
      if (!f) throw new Error("expired");
      if (navigator.canShare?.({ files: [f] })) {
        try {
          await navigator.share({ files: [f] });
          return;
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return; // 공유 창을 닫음
          // 공유 시트를 못 열면 내려받기로
        }
      }
      download(f);
    } catch {
      setError("저장하지 못했어요. 화면을 새로 고친 뒤 다시 눌러주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={save} disabled={busy} className={className}>
        {busy ? "준비 중" : "저장"}
      </button>
      {error && (
        <span role="alert" className="basis-full text-sm text-alert">
          {error}
        </span>
      )}
    </>
  );
}
