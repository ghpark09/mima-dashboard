"use client";

import {
  AreaChart,
  BarChart,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from "@tremor/react";
import { DashboardData } from "@/lib/types";
import { int, won } from "@/lib/format";

export function TrendTab({ data }: { data: DashboardData }) {
  const monthly = data.monthly.map((m) => ({ name: `${m.month}월`, 판매금액: Math.round(m.grossRevenue) }));
  const weekly = data.weekly.map((w) => ({ name: `${w.week}주`, 판매금액: Math.round(w.grossRevenue) }));

  let run = 0;
  const cum = data.daily.map((d) => {
    run += d.grossRevenue;
    return { date: d.date.slice(5), "누적 판매금액": Math.round(run) };
  });

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Title>월별 판매금액</Title>
          <Text>6월은 일부 기간만 집계됨</Text>
          <BarChart
            className="mt-4 h-72"
            data={monthly}
            index="name"
            categories={["판매금액"]}
            colors={["indigo"]}
            valueFormatter={(n) => won(n)}
            showLegend={false}
            yAxisWidth={80}
          />
        </Card>
        <Card>
          <Title>주별 판매금액</Title>
          <BarChart
            className="mt-4 h-72"
            data={weekly}
            index="name"
            categories={["판매금액"]}
            colors={["cyan"]}
            valueFormatter={(n) => won(n)}
            showLegend={false}
            yAxisWidth={80}
          />
        </Card>
      </div>

      <Card>
        <Title>누적 판매금액 (YTD)</Title>
        <Text>2026-01-01 부터 일별 누적</Text>
        <AreaChart
          className="mt-4 h-72"
          data={cum}
          index="date"
          categories={["누적 판매금액"]}
          colors={["emerald"]}
          valueFormatter={(n) => won(n)}
          showLegend={false}
          yAxisWidth={90}
        />
      </Card>

      <Card>
        <Title>월별 상세 · 전월 대비(MoM)</Title>
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeaderCell>월</TableHeaderCell>
              <TableHeaderCell className="text-right">판매금액</TableHeaderCell>
              <TableHeaderCell className="text-right">주문수</TableHeaderCell>
              <TableHeaderCell className="text-right">수량</TableHeaderCell>
              <TableHeaderCell className="text-right">AOV</TableHeaderCell>
              <TableHeaderCell className="text-right">전월 대비</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.monthly.map((m) => (
              <TableRow key={m.month}>
                <TableCell className="font-medium">{m.month}월</TableCell>
                <TableCell className="text-right">{won(m.grossRevenue)}</TableCell>
                <TableCell className="text-right">{int(m.orders)}</TableCell>
                <TableCell className="text-right">{int(m.units)}</TableCell>
                <TableCell className="text-right">{won(m.aov)}</TableCell>
                <TableCell className={`text-right ${m.momPct == null ? "text-slate-400" : m.momPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {m.momPct == null ? "—" : `${m.momPct >= 0 ? "▲" : "▼"} ${Math.abs(m.momPct).toFixed(1)}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
