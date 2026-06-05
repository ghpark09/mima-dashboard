"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Card,
  Flex,
  Grid,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableFooterCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from "@tremor/react";
import { PeriodPicker } from "@/components/period-picker";
import { byMediaInRange, bySubInRange, Period, presets, totalOf } from "@/lib/period";
import { DashboardData, MediaAgg } from "@/lib/types";
import { int, MEDIA_COLOR, ratePct, roasPct, won } from "@/lib/format";

export function MediaEfficiencyTab({ data }: { data: DashboardData }) {
  const min = data.range.adMin, max = data.range.adMax;
  const [period, setPeriod] = useState<Period>(presets(min, max)[4]); // 전체(광고기간)
  const [expand, setExpand] = useState(false);

  const yesterday = useMemo(
    () => byMediaInRange(data.byDaySub, { from: max, to: max, label: "어제" }),
    [data, max]
  );
  const rows = useMemo(
    () => (expand ? bySubInRange(data.byDaySub, period) : byMediaInRange(data.byDaySub, period)),
    [data, period, expand]
  );

  const nameOf = (m: MediaAgg) =>
    m.media === "naver" && m.subMedia !== "전체" ? `네이버 · ${m.subMedia}` : m.label;

  const roasChart = byMediaInRange(data.byDaySub, period)
    .filter((m) => m.hasRevenue)
    .map((m) => ({ name: m.label, "ROAS(%)": Math.round(m.roas) }));

  return (
    <div className="mt-6 space-y-6">
      {/* 최상단: 어제(전일) 매체 요약 */}
      <section>
        <Flex className="mb-3">
          <Title className="text-xl">⚡ 어제 매체별 성과 <span className="text-base font-normal text-slate-400">({max})</span></Title>
        </Flex>
        <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
          {yesterday.length ? yesterday.map((m) => (
            <Card key={m.media} className="ring-1 ring-slate-200">
              <Flex>
                <Text className="font-semibold text-slate-700">{m.label}</Text>
                <span className={`inline-block h-2.5 w-2.5 rounded-full bg-${MEDIA_COLOR[m.media]}-500`} />
              </Flex>
              <p className="mt-2 text-xl font-bold text-slate-900">{won(m.spend)}</p>
              <Text className="text-xs text-slate-400">광고비</Text>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">전환매출<span className="text-[10px]"> (매체보고)</span></span>
                <span className="text-slate-500">{m.hasRevenue ? won(m.convRevenue) : "N/A"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">ROAS<span className="text-[10px]"> (매체보고)</span></span>
                <span className="font-medium text-slate-500">{m.hasRevenue ? roasPct(m.roas) : "N/A"}</span>
              </div>
            </Card>
          )) : <Text className="text-slate-400">어제 광고 데이터가 없습니다.</Text>}
        </Grid>
      </section>

      {/* 기간 필터 + 매체별 효율표 */}
      <Card className="ring-1 ring-slate-200">
        <Flex className="flex-col items-start gap-3 lg:flex-row lg:items-center">
          <div>
            <Title>기간별 매체 효율</Title>
            <Text>{period.from} ~ {period.to} · 광고비·클릭·CTR·CPC·전환수는 신뢰 / 전환매출·ROAS는 <span className="font-semibold text-amber-600">매체 자체 보고(기여기간 기준, 실매출과 다름) — 참고용</span></Text>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <PeriodPicker min={min} max={max} value={period} onChange={setPeriod} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch checked={expand} onChange={setExpand} />
              네이버 광고유형별 (파워링크·쇼핑검색·브랜드검색 등)
            </label>
          </div>
        </Flex>
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeaderCell>매체</TableHeaderCell>
              <TableHeaderCell className="text-right">광고비</TableHeaderCell>
              <TableHeaderCell className="text-right">노출</TableHeaderCell>
              <TableHeaderCell className="text-right">클릭</TableHeaderCell>
              <TableHeaderCell className="text-right">CTR</TableHeaderCell>
              <TableHeaderCell className="text-right">CPC</TableHeaderCell>
              <TableHeaderCell className="text-right">CPM</TableHeaderCell>
              <TableHeaderCell className="text-right">구매</TableHeaderCell>
              <TableHeaderCell className="text-right">CPA</TableHeaderCell>
              <TableHeaderCell className="text-right text-slate-400">전환매출<br /><span className="text-[10px] font-normal">(매체보고)</span></TableHeaderCell>
              <TableHeaderCell className="text-right text-slate-400">ROAS<br /><span className="text-[10px] font-normal">(매체보고)</span></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.media + m.subMedia}>
                <TableCell className="font-medium">{nameOf(m)}</TableCell>
                <TableCell className="text-right">{won(m.spend)}</TableCell>
                <TableCell className="text-right">{int(m.impressions)}</TableCell>
                <TableCell className="text-right">{int(m.clicks)}</TableCell>
                <TableCell className="text-right">{ratePct(m.ctr)}</TableCell>
                <TableCell className="text-right">{m.clicks > 0 ? won(m.cpc) : "—"}</TableCell>
                <TableCell className="text-right">{m.impressions > 0 ? won(m.cpm) : "—"}</TableCell>
                <TableCell className="text-right">{int(m.purchases)}</TableCell>
                <TableCell className="text-right">{m.purchases > 0 ? won(m.cpa) : "—"}</TableCell>
                <TableCell className="text-right text-slate-400">{m.hasRevenue ? won(m.convRevenue) : "N/A"}</TableCell>
                <TableCell className="text-right text-slate-400">{m.hasRevenue ? roasPct(m.roas) : "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (() => {
            const t = totalOf(rows);
            return (
              <TableFoot>
                <TableRow>
                  <TableFooterCell>합계</TableFooterCell>
                  <TableFooterCell className="text-right">{won(t.spend)}</TableFooterCell>
                  <TableFooterCell className="text-right">{int(t.impressions)}</TableFooterCell>
                  <TableFooterCell className="text-right">{int(t.clicks)}</TableFooterCell>
                  <TableFooterCell className="text-right">{ratePct(t.ctr)}</TableFooterCell>
                  <TableFooterCell className="text-right">{t.clicks > 0 ? won(t.cpc) : "—"}</TableFooterCell>
                  <TableFooterCell className="text-right">{t.impressions > 0 ? won(t.cpm) : "—"}</TableFooterCell>
                  <TableFooterCell className="text-right">{int(t.purchases)}</TableFooterCell>
                  <TableFooterCell className="text-right">{t.purchases > 0 ? won(t.cpa) : "—"}</TableFooterCell>
                  <TableFooterCell className="text-right text-slate-400">{won(t.convRevenue)}</TableFooterCell>
                  <TableFooterCell className="text-right text-slate-400">{t.spend > 0 ? roasPct(t.roas) : "—"}</TableFooterCell>
                </TableRow>
              </TableFoot>
            );
          })()}
        </Table>
      </Card>

      <Card className="ring-1 ring-slate-200">
        <Title>매체별 ROAS (매체 보고 · 참고용)</Title>
        <Text>매체가 보고한 전환매출 ÷ 광고비 — 기여기간·중복 포함이라 실매출 기준과 다름</Text>
        <BarChart
          className="mt-4 h-64"
          data={roasChart}
          index="name"
          categories={["ROAS(%)"]}
          colors={["emerald"]}
          valueFormatter={(n) => roasPct(n)}
          showLegend={false}
          layout="vertical"
          yAxisWidth={90}
        />
      </Card>

      <Card className="bg-amber-50 ring-1 ring-amber-200">
        <Text className="text-amber-800">
          ⚠️ 메타(미마)는 전환매출 컬럼이 없어 N/A입니다. 네이버 검색광고(브랜드검색·파워링크 등)는 일부 비용이 미보고되어 ROAS가 과대 표시될 수 있습니다. 여기 ROAS는 매체가 보고한 전환매출 기준으로, 실제 판매금액 기준(종합요약)과 다릅니다.
        </Text>
      </Card>
    </div>
  );
}
