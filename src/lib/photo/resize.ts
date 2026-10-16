// 브라우저에서 사진을 긴 변 1024px JPEG로 줄인다.
// 저장 용량과 AI 비용을 줄이고, 다시 그리면서 위치 정보(EXIF GPS)도 함께 빠진다.

export const MAX_SIDE = 1024;

export async function resizeImage(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("이 사진 형식은 열 수 없어요. JPG나 PNG 사진으로 다시 시도해주세요.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 처리하지 못했어요.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("사진을 처리하지 못했어요.");
  return blob;
}
