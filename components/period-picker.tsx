"use client";

import { Period, presets } from "@/lib/period";

export function PeriodPicker({
  min,
  max,
  value,
  onChange,
}: {
  min: string;
  max: string;
  value: Period;
  onChange: (p: Period) => void;
}) {
  const ps = presets(min, max);
  const isActive = (p: Period) => value.from === p.from && value.to === p.to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ps.map((p) => (
        <button
          key={p.label}
          onClick={() => onChange(p)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            isActive(p)
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {p.label}
        </button>
      ))}
      <span className="mx-1 text-slate-300">|</span>
      <input
        type="date"
        min={min}
        max={max}
        value={value.from}
        onChange={(e) => onChange({ from: e.target.value, to: value.to, label: "직접 선택" })}
        className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
      />
      <span className="text-slate-400">~</span>
      <input
        type="date"
        min={min}
        max={max}
        value={value.to}
        onChange={(e) => onChange({ from: value.from, to: e.target.value, label: "직접 선택" })}
        className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
      />
    </div>
  );
}
