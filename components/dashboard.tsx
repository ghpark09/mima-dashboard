"use client";

import { useEffect, useState } from "react";
import { Tab, TabGroup, TabList } from "@tremor/react";
import { DashboardData } from "@/lib/types";
import { HomeTab } from "./tabs/home";
import { DailyTab } from "./tabs/daily";
import { MediaEfficiencyTab } from "./tabs/media-efficiency";
import { SalesChannelTab } from "./tabs/sales-channel";
import { TrendTab } from "./tabs/trend";
import { MonthlyMediaTab } from "./tabs/monthly-media";
import { CampaignTab } from "./tabs/campaign";
import { RefreshButton } from "./refresh-button";

const TABS = [
  "종합 요약",
  "일별 성과",
  "매체 광고효율",
  "판매처별 매출",
  "추세·누적",
  "월별 매체 리포트",
  "채널·캠페인 분석",
];

export function Dashboard({ data }: { data: DashboardData }) {
  // 차트(Recharts) SSR 하이드레이션 방지 + 활성 탭만 렌더(성능)
  const [mounted, setMounted] = useState(false);
  const [idx, setIdx] = useState(0);
  useEffect(() => setMounted(true), []);

  // KST(UTC+9)로 고정 포맷 — 서버(UTC)/브라우저(KST) 시간대 차이로 인한 하이드레이션 불일치 방지
  const gen = new Date(new Date(data.generatedAt).getTime() + 9 * 3600 * 1000);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const genStr = `${gen.getUTCFullYear()}.${p2(gen.getUTCMonth() + 1)}.${p2(gen.getUTCDate())} ${p2(gen.getUTCHours())}:${p2(gen.getUTCMinutes())}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-extrabold text-white">
              M
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Mima Analytics</h1>
              <p className="text-xs text-slate-500">광고비 · 매출 통합 대시보드</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-slate-500">
              <div className="flex items-center justify-end gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                매일 오전 10시 갱신
              </div>
              <div className="mt-0.5">최종 갱신 {genStr}</div>
            </div>
            <RefreshButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <TabGroup index={idx} onIndexChange={setIdx}>
          <TabList variant="solid" className="flex-wrap">
            {TABS.map((t) => (
              <Tab key={t}>{t}</Tab>
            ))}
          </TabList>
        </TabGroup>

        {!mounted ? (
          <div className="py-24 text-center text-slate-400">대시보드를 불러오는 중…</div>
        ) : (
          <>
            {idx === 0 && <HomeTab data={data} />}
            {idx === 1 && <DailyTab data={data} />}
            {idx === 2 && <MediaEfficiencyTab data={data} />}
            {idx === 3 && <SalesChannelTab data={data} />}
            {idx === 4 && <TrendTab data={data} />}
            {idx === 5 && <MonthlyMediaTab data={data} />}
            {idx === 6 && <CampaignTab data={data} />}
          </>
        )}
      </main>

      <footer className="mx-auto max-w-[1400px] px-6 pb-10 pt-4 text-xs text-slate-400">
        데이터 범위 — 매출 {data.range.salesMin}~{data.range.salesMax} · 광고 {data.range.adMin}~
        {data.range.adMax}. 매체 전환매출은 각 매체 보고 기준이며 실제 판매매출과 다를 수 있습니다.
      </footer>
    </div>
  );
}
