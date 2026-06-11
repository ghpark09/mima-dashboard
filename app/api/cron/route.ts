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

  // 캐시 무효화 후 홈을 즉시 한 번 호출해 재생성 → '최종 갱신' 시각이 10시로 찍히고
  // 방문자가 없어도 데이터가 미리 준비됨 (자동갱신이 눈에 보이도록)
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://mima-dashboard.vercel.app";
  let warmed = false;
  try {
    const res = await fetch(`${base}/`, { cache: "no-store" });
    warmed = res.ok;
  } catch {
    /* 워밍 실패해도 캐시 무효화는 이미 적용됨 */
  }

  return Response.json({ revalidated: true, warmed, at: new Date().toISOString() });
}
