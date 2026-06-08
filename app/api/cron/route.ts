import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";

// Vercel Cron이 매일 01:00 UTC(= 10:00 KST)에 호출 → 데이터 캐시를 갱신
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 선택: CRON_SECRET 환경변수를 설정하면 외부 호출을 차단
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidateTag("sheets");
  revalidatePath("/");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
