import { getAdmin } from "@/lib/admin/auth";
import { loadExportData } from "@/lib/admin/export";
import { buildWorkbook } from "@/lib/admin/workbook";
import { allow } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/** 관리자 엑셀 내려받기. 관리자가 아니면 주소가 없는 것처럼 404 */
export async function GET() {
  const me = await getAdmin();
  if (!me) return new Response("Not Found", { status: 404 });
  if (!(await allow(`admin-export:${me.userId}`, 20, 3600))) {
    return new Response("요청이 너무 많아요. 잠시 후 다시 시도해주세요.", { status: 429 });
  }

  const data = await loadExportData(createAdminClient());
  const file = await buildWorkbook(data);
  const stamp = new Date(data.generatedAt.getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "_");
  console.info(`[admin] export by ${me.userId}: ${data.members.length} members`);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hangyeol_${stamp}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
