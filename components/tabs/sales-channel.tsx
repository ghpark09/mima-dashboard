"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Card,
  DonutChart,
  Flex,
  Legend,
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
import { aggregateSalesBy, Period, presets } from "@/lib/period";
import { DashboardData } from "@/lib/types";
import { int, won } from "@/lib/format";

export function SalesChannelTab({ data }: { data: DashboardData }) {
  const min = data.range.salesMin, max = data.range.salesMax;
  const [period, setPeriod] = useState<Period>(presets(min, max)[3]); // 이번 달

  const ch1 = useMemo(() => aggregateSalesBy(data.salesLite, period, (r) => r.channel1), [data, period]);
  const vendor = useMemo(() => aggregateSalesBy(data.salesLite, period, (r) => r.vendor), [data, period]);
  const model = useMemo(() => aggregateSalesBy(data.salesLite, period, (r) => r.model), [data, period]);
  const product = useMemo(() => aggregateSalesBy(data.salesLite, period, (r) => r.product), [data, period]);
  const oo = useMemo(() => aggregateSalesBy(data.salesLite, period, (r) => r.channel2), [data, period]);

  const ch1Chart = ch1.slice(0, 10).map((c) => ({ name: c.key, 판매금액: Math.round(c.grossRevenue) }));
  const modelChart = model.filter((m) => m.key !== "미분류").slice(0, 10).map((c) => ({ name: c.key, 판매금액: Math.round(c.grossRevenue) }));
  const ooChart = oo.map((c) => ({ name: c.key, value: Math.round(c.grossRevenue) }));
  const total = ch1.reduce((s, c) => s + c.grossRevenue, 0);

  return (
    <div className="mt-6 space-y-6">
      <Card className="ring-1 ring-slate-200">
        <Flex className="flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div>
            <Title>판매처별 매출</Title>
            <Text>{period.from} ~ {period.to} · 판매금액(VAT 포함, 판촉 제외) 합계 {won(total)}</Text>
          </div>
          <PeriodPicker min={min} max={max} value={period} onChange={setPeriod} />
        </Flex>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Title>채널별 판매금액 (채널 구분1)</Title>
          <BarChart
            className="mt-4 h-80"
            data={ch1Chart}
            index="name"
            categories={["판매금액"]}
            colors={["indigo"]}
            valueFormatter={(n) => won(n)}
            layout="vertical"
            showLegend={false}
            yAxisWidth={110}
          />
        </Card>
        <Card>
          <Title>온라인 / 오프라인</Title>
          <Text>판매금액 비중</Text>
          <DonutChart
            className="mt-4 h-52"
            data={ooChart}
            category="value"
            index="name"
            colors={["indigo", "cyan"]}
            valueFormatter={(n) => won(n)}
          />
          <Legend className="mt-3" categories={ooChart.map((o) => o.name)} colors={["indigo", "cyan"]} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Title>판매처별 매출 TOP 10</Title>
          <Table className="mt-4">
            <TableHead>
              <TableRow>
                <TableHeaderCell>판매처</TableHeaderCell>
                <TableHeaderCell className="text-right">판매금액</TableHeaderCell>
                <TableHeaderCell className="text-right">건수</TableHeaderCell>
                <TableHeaderCell className="text-right">평균금액</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendor.slice(0, 10).map((c) => (
                <TableRow key={c.key}>
                  <TableCell className="font-medium">{c.key}</TableCell>
                  <TableCell className="text-right">{won(c.grossRevenue)}</TableCell>
                  <TableCell className="text-right">{int(c.orders)}</TableCell>
                  <TableCell className="text-right">{won(c.aov)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <Title>제품군(모델명)별 판매금액</Title>
          <BarChart
            className="mt-4 h-80"
            data={modelChart}
            index="name"
            categories={["판매금액"]}
            colors={["violet"]}
            valueFormatter={(n) => won(n)}
            layout="vertical"
            showLegend={false}
            yAxisWidth={90}
          />
        </Card>
      </div>

      <Card>
        <Title>상품별 매출 TOP 15</Title>
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeaderCell>상품명</TableHeaderCell>
              <TableHeaderCell className="text-right">판매금액</TableHeaderCell>
              <TableHeaderCell className="text-right">건수</TableHeaderCell>
              <TableHeaderCell className="text-right">수량</TableHeaderCell>
              <TableHeaderCell className="text-right">평균금액</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {product.filter((p) => p.key !== "미분류").slice(0, 15).map((c) => (
              <TableRow key={c.key}>
                <TableCell className="font-medium">{c.key}</TableCell>
                <TableCell className="text-right">{won(c.grossRevenue)}</TableCell>
                <TableCell className="text-right">{int(c.orders)}</TableCell>
                <TableCell className="text-right">{int(c.units)}</TableCell>
                <TableCell className="text-right">{won(c.aov)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
