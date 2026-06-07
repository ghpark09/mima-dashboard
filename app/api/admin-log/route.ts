import { NextRequest } from "next/server";
import { getLog, kvConfigured } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pw =
    req.nextUrl.searchParams.get("pw") || req.headers.get("authorization") || "";
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) {
    return Response.json(
      { error: "ADMIN_PASSWORD 환경변수가 설정되지 않았습니다. (Vercel → Settings → Environment Variables)" },
      { status: 503 }
    );
  }
  if (pw !== admin) {
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  return Response.json({ kv: kvConfigured(), log: await getLog() });
}
