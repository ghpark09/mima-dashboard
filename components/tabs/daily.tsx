"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  BarChart,
  Card,
  Flex,
  Grid,
  LineChart,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from "@tremor/react";
import { PeriodPicker } from "@/components/period-picker";
import { inRange, Period, presets } from "@/lib/period";
import { DashboardData } from "@/lib/types";
import { int, ratePct, roasPct, won } from "@/lib/format";

export function DailyTab({ data }: { data: DashboardData }) {
  const min = data.range.salesMin, max = data.range.salesMax;
  const [period, setPeriod] = useState<Period>(presets(min, max)[2]); // 최근 30일

  const days = useMemo(() => data.daily.filter((d) => inRange(d.date, period)), [data, period]);

  const S = (f: (d: (typeof days)[number]) => number) => days.reduce((s, d) => s + f(d), 0);
  const rev = S((d) => d.grossRevenue), spend = S((d) => d.totalSpend);
  const orders = S((d) => d.orders), impr = S((d) => d.impressions), clk = S((d) => d.clicks);
  const roas = spend > 0 ? (rev / spend) * 100 : null;

  const kpis = [
    { label: "판매금액", value: won(rev) },
    { label: "판매건수", value: int(orders) + "건" },
    { label: "광고비", value: spend > 0 ? won(spend) : "—" },
    { label: "ROAS (매출÷광고비)", value: roas != null ? roasPct(roas) : "—" },
    { label: "CTR", value: impr > 0 ? ratePct((clk / impr) * 100) : "—" },
    { label: "평균 CPC", value: clk > 0 ? won(spend / clk) : "—" },
  ];

  const revSeries = days.map((d) => ({ date: d.date.slice(5), 판매금액: Math.round(d.grossRevenue) }));
  const cmpSeries = days
    .filter((d) => d.totalSpend > 0)
    .map((d) => ({ date: d.date.slice(5), 판매금액: Math.round(d.grossRevenue), 광고비: Math.round(d.totalSpend) }));
  const roasSeries = days
    .filter((d) => d.totalSpend > 0)
    .map((d) => ({ date: d.date.slice(5), ROAS: Math.round((d.grossRevenue / d.totalSpend) * 100) }));
  const tableRows = [...days].reverse();

  return (
    <div className="mt-6 space-y-6">
      <Card className="ring-1 ring-slate-200">
        <Flex className="flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div>
            <Title>일별 성과</Title>
            <Text>{period.from} ~ {period.to} ({days.length}일)</Text>
          </div>
          <PeriodPicker min={min} max={max} value={period} onChange={setPeriod} />
        </Flex>
        <Grid numItemsSm={3} numItemsLg={6} className="mt-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg bg-slate-50 p-3">
              <Text className="text-xs text-slate-500">{k.label}</Text>
              <p className="mt-1 text-lg font-bold text-slate-900">{k.value}</p>
            </div>
          ))}
        </Grid>
      </Card>

      <Card>
        <Title>일별 판매금액 추이</Title>
        <Text>VAT 포함 · 판촉 제외</Text>
        <AreaChart
          className="mt-4 h-72"
          data={revSeries}
          index="date"
          categories={["판매금액"]}
          colors={["indigo"]}
          valueFormatter={(n) => won(n)}
          showLegend={false}
          yAxisWidth={80}
          curveType="monotone"
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Title>판매금액 vs 광고비</Title>
          <Text>광고 집행일만 표시</Text>
          <BarChart
            className="mt-4 h-72"
            data={cmpSeries}
            index="date"
            categories={["판매금액", "광고비"]}
            colors={["indigo", "amber"]}
            valueFormatter={(n) => won(n)}
            yAxisWidth={80}
          />
        </Card>
        <Card>
          <Title>일별 ROAS (매출 ÷ 광고비)</Title>
          <Text>광고 집행일만 표시</Text>
          <LineChart
            className="mt-4 h-72"
            data={roasSeries}
            index="date"
            categories={["ROAS"]}
            colors={["emerald"]}
            valueFormatter={(n) => roasPct(n)}
            showLegend={false}
            yAxisWidth={64}
            curveType="monotone"
          />
        </Card>
      </div>

      <Card>
        <Title>일자별 상세</Title>
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeaderCell>일자</TableHeaderCell>
              <TableHeaderCell className="text-right">판매금액</TableHeaderCell>
              <TableHeaderCell className="text-right">판매건수</TableHeaderCell>
              <TableHeaderCell className="text-right">수량</TableHeaderCell>
              <TableHeaderCell className="text-right">판촉</TableHeaderCell>
              <TableHeaderCell className="text-right">광고비</TableHeaderCell>
              <TableHeaderCell className="text-right">ROAS</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRows.map((d) => (
              <TableRow key={d.date}>
                <TableCell className="font-medium">{d.date}</TableCell>
                <TableCell className="text-right">{won(d.grossRevenue)}</TableCell>
                <TableCell className="text-right">{int(d.orders)}</TableCell>
                <TableCell className="text-right">{int(d.units)}</TableCell>
                <TableCell className="text-right text-slate-400">{int(d.promoCount)}</TableCell>
                <TableCell className="text-right">{d.totalSpend > 0 ? won(d.totalSpend) : "—"}</TableCell>
                <TableCell className="text-right">
                  {d.totalSpend > 0 ? roasPct((d.grossRevenue / d.totalSpend) * 100) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
