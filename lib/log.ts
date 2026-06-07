import { kv } from "@vercel/kv";

const KEY = "refresh_log";
const MAX = 300;

export interface LogEntry {
  ts: string; // ISO
  trigger: string; // "수기 새로고침" | "자동 갱신(10시)"
}

/** Vercel KV(저장소)가 연결되어 있는지 */
export const kvConfigured = () =>
  !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/** 갱신 이벤트 기록 (KV 미연결 시 조용히 무시) */
export async function logEvent(trigger: string): Promise<void> {
  if (!kvConfigured()) return;
  try {
    await kv.lpush(KEY, { ts: new Date().toISOString(), trigger });
    await kv.ltrim(KEY, 0, MAX - 1);
  } catch {
    /* 로깅 실패가 본 기능을 막지 않도록 무시 */
  }
}

/** 최근 이력 조회 (최신순) */
export async function getLog(): Promise<LogEntry[]> {
  if (!kvConfigured()) return [];
  try {
    const raw = await kv.lrange(KEY, 0, MAX - 1);
    return (raw as unknown[]).map((s) =>
      typeof s === "string" ? (JSON.parse(s) as LogEntry) : (s as LogEntry)
    );
  } catch {
    return [];
  }
}
