"use client";

import { useState } from "react";

export function RefreshButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await fetch("/api/refresh", { method: "POST" });
        } catch {
          /* noop */
        }
        location.reload();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
      title="구글 시트 데이터를 즉시 다시 불러옵니다"
    >
      <span className={loading ? "animate-spin" : ""}>↻</span>
      {loading ? "갱신 중…" : "새로고침"}
    </button>
  );
}
