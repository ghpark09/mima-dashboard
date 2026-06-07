"use client";

import { useState } from "react";

interface LogEntry {
  ts: string;
  trigger: string;
}

const kst = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [log, setLog] = useState<LogEntry[] | null>(null);
  const [kv, setKv] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-log?pw=${encodeURIComponent(pw)}`);
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error || "오류가 발생했습니다.");
        setLog(null);
      } else {
        setLog(j.log || []);
        setKv(!!j.kv);
      }
    } catch {
      setErr("요청에 실패했습니다.");
    }
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-bold text-slate-900">🔒 관리자 — 갱신 로그</h1>
      <p className="mt-1 text-sm text-slate-500">데이터 갱신(자동 10시 / 수기 새로고침) 이력입니다.</p>

      <div className="mt-6 flex gap-2">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="관리자 비밀번호"
          className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={load}
          disabled={loading || !pw}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "확인 중…" : "조회"}
        </button>
      </div>

      {err && <p className="mt-4 rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</p>}

      {log && (
        <div className="mt-6">
          {!kv && (
            <p className="mb-3 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
              ⚠️ 저장소(Vercel KV)가 아직 연결되지 않아 이력이 비어 있습니다. KV를 연결하면 이후 갱신부터 기록됩니다.
            </p>
          )}
          <p className="mb-2 text-sm text-slate-500">총 {log.length}건 (최신순, KST)</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">시각 (KST)</th>
                <th className="py-2">트리거</th>
              </tr>
            </thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-800">{kst(e.ts)}</td>
                  <td className="py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        e.trigger.includes("자동")
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {e.trigger}
                    </span>
                  </td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-slate-400">
                    아직 기록된 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
