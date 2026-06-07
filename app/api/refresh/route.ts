import { revalidatePath, revalidateTag } from "next/cache";
import { logEvent } from "@/lib/log";

// 수기 새로고침 — 구글 시트를 즉시 다시 읽어옴 (담당자 RAW 업로드가 늦었을 때 사용)
export const dynamic = "force-dynamic";

export async function POST() {
  revalidateTag("sheets"); // 시트 fetch 캐시 무효화 → 다음 요청에서 새로 가져옴
  revalidatePath("/");
  await logEvent("수기 새로고침");
  return Response.json({ ok: true, at: new Date().toISOString() });
}
