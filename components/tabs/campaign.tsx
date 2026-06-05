"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Card,
  Flex,
  MultiSelect,
  MultiSelectItem,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
  Title,
} from "@tremor/react";
import { PeriodPicker } from "@/components/period-picker";
import { campaignsInRange, Period, presets } from "@/lib/period";
import { DashboardData, MediaKey, MEDIA_LABEL } from "@/lib/types";
import { int, ratePct, roasPct, won } from "@/lib/format";

const ALL_MEDIA: MediaKey[] = ["kakao", "naver", "meta_mima", "meta_naver"];

type SortKey = "spend" | "roas" | "ctr" | "purchases" | "convRevenue";

export function CampaignTab({ data }: { data: DashboardData }) {
  const min = data.range.adMin, max = data.range.adMax;
  const [period, setPeriod] = useState<Period>(presets(min, max)[4]); // 전체
  const [selMedia, setSelMedia] = useState<string[]>(ALL_MEDIA);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("spend");

  const base = useMemo(() => campaignsInRange(data.byDayCampaign, period), [data, period]);
  const rows = useMemo(() => {
    return base
      .filter((c) => selMedia.includes(c.media))
      .filter((c) => (q ? c.campaign.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
  }, [base, selMedia, q, sortBy]);

  const topRoas = rows
    .filter((c) => c.hasRevenue && c.roas > 0)
    .slice()
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 8)
    .map((c) => ({ name: c.campaign.length > 22 ? c.campaign.slice(0, 22) + "…" : c.campaign, "ROAS(%)": Math.round(c.roas) }));

  const topSpend = rows.slice(0, 8).map((c) => ({
    name: c.campaign.length > 22 ? c.campaign.slice(0, 22) + "…" : c.campaign,
    광고비: Math.round(c.spend),
  }));

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <div className="mb-4 border-b border-slate-100 pb-4">
          <Text className="mb-2">기간 ({period.from} ~ {period.to})</Text>
          <PeriodPicker min={min} max={max} value={period} onChange={setPeriod} />
        </div>
        <Flex className="flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-full sm:w-72">
            <Text className="mb-1">매체</Text>
            <MultiSelect value={selMedia} onValueChange={setSelMedia}>
              {ALL_MEDIA.map((m) => (
                <MultiSelectItem key={m} value={m}>{MEDIA_LABEL[m]}</MultiSelectItem>
              ))}
            </MultiSelect>
          </div>
          <div className="w-full sm:w-64">
            <Text className="mb-1">캠페인 검색</Text>
            <TextInput placeholder="캠페인명..." value={q} onValueChange={setQ} />
          </div>
          <div className="w-full sm:w-48">
            <Text className="mb-1">정렬</Text>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectItem value="spend">광고비순</SelectItem>
              <SelectItem value="roas">ROAS순</SelectItem>
              <SelectItem value="convRevenue">전환매출순</SelectItem>
              <SelectItem value="purchases">구매순</SelectItem>
              <SelectItem value="ctr">CTR순</SelectItem>
            </Select>
          </div>
        </Flex>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Title>캠페인 ROAS TOP 8</Title>
          <BarChart
            className="mt-4 h-80"
            data={topRoas}
            index="name"
            categories={["ROAS(%)"]}
            colors={["emerald"]}
            valueFormatter={(n) => roasPct(n)}
            layout="vertical"
            showLegend={false}
            yAxisWidth={150}
          />
        </Card>
        <Card>
          <Title>광고비 TOP 8</Title>
          <BarChart
            className="mt-4 h-80"
            data={topSpend}
            index="name"
            categories={["광고비"]}
            colors={["indigo"]}
            valueFormatter={(n) => won(n)}
            layout="vertical"
            showLegend={false}
            yAxisWidth={150}
          />
        </Card>
      </div>

      <Card>
        <Flex>
          <Title>캠페인 상세 ({rows.length}건)</Title>
        </Flex>
        <div className="mt-4 max-h-[600px] overflow-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>캠페인</TableHeaderCell>
                <TableHeaderCell>매체</TableHeaderCell>
                <TableHeaderCell>유형</TableHeaderCell>
                <TableHeaderCell>집행</TableHeaderCell>
                <TableHeaderCell className="text-right">광고비</TableHeaderCell>
                <TableHeaderCell className="text-right">클릭</TableHeaderCell>
                <TableHeaderCell className="text-right">CTR</TableHeaderCell>
                <TableHeaderCell className="text-right">CPC</TableHeaderCell>
                <TableHeaderCell className="text-right">구매</TableHeaderCell>
                <TableHeaderCell className="text-right">전환매출</TableHeaderCell>
                <TableHeaderCell className="text-right">ROAS</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[260px] truncate font-medium" title={c.campaign}>{c.campaign}</TableCell>
                  <TableCell>{c.mediaLabel}</TableCell>
                  <TableCell className="text-slate-500">{c.channelType}</TableCell>
                  <TableCell className="text-slate-500">{c.exec}</TableCell>
                  <TableCell className="text-right">{won(c.spend)}</TableCell>
                  <TableCell className="text-right">{int(c.clicks)}</TableCell>
                  <TableCell className="text-right">{ratePct(c.ctr)}</TableCell>
                  <TableCell className="text-right">{c.clicks > 0 ? won(c.cpc) : "—"}</TableCell>
                  <TableCell className="text-right">{int(c.purchases)}</TableCell>
                  <TableCell className="text-right">{c.hasRevenue ? won(c.convRevenue) : "N/A"}</TableCell>
                  <TableCell className="text-right font-semibold">{c.hasRevenue ? roasPct(c.roas) : "N/A"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
