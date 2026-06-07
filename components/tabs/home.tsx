"use client";

import {
  AreaChart,
  Badge,
  BarList,
  Card,
  Flex,
  Grid,
  SparkAreaChart,
  Text,
  Title,
} from "@tremor/react";
import { DailyRow, DashboardData } from "@/lib/types";
import { int, ratePct, roasPct, won } from "@/lib/format";

const LEVEL_COLOR: Record<string, string> = { good: "emerald", warn: "amber", bad: "rose", info: "blue" };
const LEVEL_LABEL: Record<string, string> = { good: "기회", warn: "주의", bad: "경고", info: "정보" };

const sum = (days: DailyRow[], f: (d: DailyRow) => number) => days.reduce((s, d) => s + f(d), 0);
const deltaPct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const ratio = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
const per = (n: number, d: number) => (d > 0 ? n / d : 0);

export function HomeTab({ data }: { data: DashboardData }) {
  const { latestDay, prevDay } = data;
  const months = data.monthly.map((m) => m.month);
  const curMonth = months.length ? Math.max(...months) : 0;
  const prevMonth = curMonth - 1;

  const curDays = data.daily.filter((d) => Number(d.date.slice(5, 7)) === curMonth);
  const maxDay = curDays.length ? Math.max(...curDays.map((d) => Number(d.date.slice(8, 10)))) : 0;
  const prevDays = data.daily.filter(
    (d) => Number(d.date.slice(5, 7)) === prevMonth && Number(d.date.slice(8, 10)) <= maxDay
  );

  // 이번달 / 전월 동기
  const cRev = sum(curDays, (d) => d.grossRevenue), pRev = sum(prevDays, (d) => d.grossRevenue);
  const cSpend = sum(curDays, (d) => d.totalSpend), pSpend = sum(prevDays, (d) => d.totalSpend);
  const cImpr = sum(curDays, (d) => d.impressions), pImpr = sum(prevDays, (d) => d.impressions);
  const cClick = sum(curDays, (d) => d.clicks), pClick = sum(prevDays, (d) => d.clicks);

  const recent = data.daily.slice(-30).map((d, i) => ({
    i,
    매출: Math.round(d.grossRevenue),
    광고비: Math.round(d.totalSpend),
    광고비율: d.grossRevenue > 0 ? +(d.totalSpend / d.grossRevenue * 100).toFixed(1) : 0,
    ROAS: d.totalSpend > 0 ? Math.round(d.grossRevenue / d.totalSpend * 100) : 0,
    CTR: d.impressions > 0 ? +(d.clicks / d.impressions * 100).toFixed(2) : 0,
    CPC: d.clicks > 0 ? Math.round(d.totalSpend / d.clicks) : 0,
  }));

  const monthKpis = [
    { label: "판매금액", value: won(cRev), d: deltaPct(cRev, pRev), key: "매출", color: "indigo", goodUp: true },
    { label: "광고비", value: won(cSpend), d: deltaPct(cSpend, pSpend), key: "광고비", color: "violet", goodUp: false },
    { label: "광고비율", value: ratePct(ratio(cSpend, cRev)), d: deltaPct(ratio(cSpend, cRev), ratio(pSpend, pRev)), key: "광고비율", color: "amber", goodUp: false },
    { label: "ROAS", value: roasPct(ratio(cRev, cSpend)), d: deltaPct(ratio(cRev, cSpend), ratio(pRev, pSpend)), key: "ROAS", color: "emerald", goodUp: true },
    { label: "CTR", value: ratePct(ratio(cClick, cImpr)), d: deltaPct(ratio(cClick, cImpr), ratio(pClick, pImpr)), key: "CTR", color: "cyan", goodUp: true },
    { label: "평균 CPC", value: won(per(cSpend, cClick)), d: deltaPct(per(cSpend, cClick), per(pSpend, pClick)), key: "CPC", color: "blue", goodUp: false },
  ];

  // 데이터 신선도 — 최신 데이터일이 진짜 어제(D-1)인지 판정
  const expectedYesterday = new Date(Date.parse(data.today + "T00:00:00Z") - 86400000)
    .toISOString()
    .slice(0, 10);
  const isFresh = latestDay?.date === expectedYesterday;
  const lagDays = latestDay
    ? Math.round((Date.parse(data.today + "T00:00:00Z") - Date.parse(latestDay.date + "T00:00:00Z")) / 86400000)
    : 0;
  const perfLabel = isFresh ? "어제 성과" : "최근 매출 성과";

  // 어제 성과 (ROAS = 판매금액 ÷ 광고비)
  const yRoas = latestDay && latestDay.totalSpend > 0 ? ratio(latestDay.grossRevenue, latestDay.totalSpend) : null;
  const pRoas = prevDay && prevDay.totalSpend > 0 ? ratio(prevDay.grossRevenue, prevDay.totalSpend) : null;
  const yKpis = [
    { label: "판매금액", value: won(latestDay?.grossRevenue ?? 0), d: latestDay && prevDay ? deltaPct(latestDay.grossRevenue, prevDay.grossRevenue) : null, goodUp: true },
    { label: "판매건수", value: int(latestDay?.orders ?? 0) + "건", d: latestDay && prevDay ? deltaPct(latestDay.orders, prevDay.orders) : null, goodUp: true },
    { label: "광고비", value: won(latestDay?.totalSpend ?? 0), d: latestDay && prevDay ? deltaPct(latestDay.totalSpend, prevDay.totalSpend) : null, goodUp: false },
    { label: "ROAS", value: roasPct(yRoas), d: yRoas != null && pRoas != null ? deltaPct(yRoas, pRoas) : null, goodUp: true },
  ];

  const yChannel = data.channelYesterday.slice(0, 7).map((c) => ({ name: c.key, value: Math.round(c.grossRevenue) }));
  const mChannel = data.channelThisMonth.slice(0, 7).map((c) => ({ name: c.key, value: Math.round(c.grossRevenue) }));
  const revTrend = data.daily.slice(-30).map((d) => ({ date: d.date.slice(5), 판매금액: Math.round(d.grossRevenue) }));

  return (
    <div className="mt-6 space-y-8">
      {/* ── 어제 성과 (최상단, 한눈에) ── */}
      <section>
        <Flex className="mb-3">
          <Title className="text-xl">⚡ {perfLabel} <span className="text-base font-normal text-slate-400">({latestDay?.date})</span></Title>
          <Badge color="slate">전일 대비</Badge>
        </Flex>
        {!isFresh && latestDay && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            ⚠️ 최신 데이터가 <b>{latestDay.date}</b> 기준입니다 (오늘 {data.today} · <b>{lagDays}일 전</b>).
            주말이거나 담당자 RAW 업로드가 아직 안 된 상태일 수 있어요. 업로드 후 우측 상단 <b>새로고침</b>을 누르면 즉시 반영됩니다.
          </div>
        )}
        <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
          {yKpis.map((k) => {
            const up = k.d != null && k.d >= 0;
            const positive = k.d == null ? null : k.goodUp ? up : !up;
            return (
              <Card key={k.label} className="bg-indigo-50/40 ring-1 ring-indigo-100">
                <Text className="font-medium text-slate-500">{k.label}</Text>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{k.value}</p>
                {k.d != null && (
                  <div className={`mt-2 text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                    {k.d >= 0 ? "▲" : "▼"} {Math.abs(k.d).toFixed(1)}% <span className="font-normal text-slate-400">전일 대비</span>
                  </div>
                )}
              </Card>
            );
          })}
        </Grid>
        <Card className="mt-4 ring-1 ring-slate-200">
          <Flex>
            <Title>{isFresh ? "어제" : "최근"} 채널별 판매금액</Title>
            <Text>{latestDay?.date}</Text>
          </Flex>
          {yChannel.length ? (
            <BarList data={yChannel} className="mt-4" valueFormatter={(n: number) => won(n)} color="indigo" />
          ) : (
            <Text className="mt-4 text-slate-400">어제 판매 데이터가 없습니다.</Text>
          )}
        </Card>
      </section>

      {/* ── 이번 달 요약 ── */}
      <section>
        <Flex className="mb-3">
          <div>
            <Title className="text-xl">📅 이번 달 요약</Title>
            <Text className="mt-0.5">{curMonth}월 1일 ~ {curMonth}월 {maxDay}일 · 전월 동기({prevMonth}월 1~{maxDay}일) 대비</Text>
          </div>
        </Flex>
        <Grid numItemsSm={2} numItemsLg={3} className="gap-4">
          {monthKpis.map((k) => {
            const up = k.d != null && k.d >= 0;
            const positive = k.d == null ? null : k.goodUp ? up : !up;
            return (
              <Card key={k.label} className="ring-1 ring-slate-200">
                <Text className="font-medium text-slate-500">{k.label}</Text>
                <Flex className="mt-1 items-end gap-2">
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{k.value}</p>
                  <SparkAreaChart data={recent} index="i" categories={[k.key]} colors={[k.color]} className="h-9 w-24" />
                </Flex>
                {k.d != null && (
                  <div className={`mt-2 text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                    {k.d >= 0 ? "▲" : "▼"} {Math.abs(k.d).toFixed(1)}% <span className="font-normal text-slate-400">전월 동기</span>
                  </div>
                )}
              </Card>
            );
          })}
        </Grid>

        <Grid numItemsLg={3} className="mt-4 gap-6">
          <Card className="lg:col-span-2 ring-1 ring-slate-200">
            <Title>일별 매출 추이</Title>
            <Text>최근 30일 · 판매금액(VAT 포함, 판촉 제외)</Text>
            <AreaChart
              className="mt-4 h-64"
              data={revTrend}
              index="date"
              categories={["판매금액"]}
              colors={["indigo"]}
              valueFormatter={(n: number) => won(n)}
              showLegend={false}
              yAxisWidth={80}
              curveType="monotone"
            />
          </Card>
          <Card className="ring-1 ring-slate-200">
            <Title>이번 달 채널별 판매금액</Title>
            <Text>{curMonth}월</Text>
            <BarList data={mChannel} className="mt-4" valueFormatter={(n: number) => won(n)} color="violet" />
          </Card>
        </Grid>
      </section>

      {/* ── 개선 제안 ── */}
      <Card className="ring-1 ring-slate-200">
        <Flex>
          <Title>오늘의 개선 제안</Title>
          <Badge color="indigo">자동 분석</Badge>
        </Flex>
        <Grid numItemsMd={2} className="mt-4 gap-3">
          {data.insights.map((i, idx) => (
            <div key={idx} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <Badge color={LEVEL_COLOR[i.level]}>{LEVEL_LABEL[i.level]}</Badge>
              <div>
                <div className="text-sm font-semibold text-slate-800">{i.title}</div>
                <div className="mt-0.5 text-xs text-slate-500">{i.detail}</div>
              </div>
            </div>
          ))}
        </Grid>
      </Card>
    </div>
  );
}
