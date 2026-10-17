import type { NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { loadLpaRows } from "@/lib/admin/lpaData";
import { findLpaSet } from "@/lib/admin/lpaSets";
import { buildIdMap, buildMplusData, buildMplusInput, mplusFileBase } from "@/lib/admin/mplus";
import { allow } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

/** Mplus용 파일 내려받기: file=dat(데이터) | inp(입력 파일) | ids(행번호-사용자ID 대응표) */
export async function GET(request: NextRequest) {
  const me = await getAdmin();
  if (!me) return new Response("Not Found", { status: 404 });
  if (!(await allow(`admin-export:${me.userId}`, 60, 3600))) {
    return new Response("요청이 너무 많아요. 잠시 후 다시 시도해주세요.", { status: 429 });
  }

  const sp = request.nextUrl.searchParams;
  const set = findLpaSet(sp.get("set"));
  const model = sp.get("model") === "varying" ? "varying" : "equal";
  const k = Math.min(6, Math.max(1, Number.parseInt(sp.get("k") ?? "2", 10) || 2));
  const file = sp.get("file");
  const rows = await loadLpaRows(createAdminClient(), set);
  const base = mplusFileBase(set);
  const stamp = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");

  let body: string;
  let name: string;
  let type = "text/plain; charset=utf-8";
  if (file === "dat") {
    body = buildMplusData(rows);
    name = `${base}.dat`;
  } else if (file === "inp") {
    body = buildMplusInput({ set, k, model, n: rows.length, stamp });
    name = `${base}_c${k}.inp`;
  } else if (file === "ids") {
    body = buildIdMap(rows);
    name = `${base}_ids.csv`;
    type = "text/csv; charset=utf-8";
  } else {
    return new Response("Not Found", { status: 404 });
  }
  console.info(`[admin] lpa ${file} by ${me.userId}: ${set.id}, n=${rows.length}`);
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
