"use client";

import { useMemo, useState } from "react";
import {
  Card,
  Flex,
  MultiSelect,
  MultiSelectItem,
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
import { Button } from "@/components/ui/button";
import { PeriodPicker } from "@/components/period-picker";
import { inRange, Period, presets, totalOf } from "@/lib/period";
import { DashboardData, MediaAgg, MediaKey, MEDIA_LABEL } from "@/lib/types";
import { int, ratePct, roasPct, won } from "@/lib/format";

const ALL_MEDIA: MediaKey[] = ["kakao", "naver", "meta_mima", "meta_naver"];
type Row = { period: string; sort: string; media: MediaKey; agg: MediaAgg };

export function MonthlyMediaTab({ data }: { data: DashboardData }) {
  const min = data.range.adMin, max = data.range.adMax;
  const [period, setPeriod] = useState<Period>(presets(min, max)[4]); // 전체
  const [selMedia, setSelMedia] = useState<string[]>(ALL_MEDIA);
  const [daily, setDaily] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const filt = data.byDayMedia.filter((r) => inRange(r.date, period) && selMedia.includes(r.media));
    if (daily) {
      return filt
        .map((r) => ({ period: r.date, sort: r.date + r.media, media: r.media, agg: r }))
        .sort((a, b) => a.sort.localeCompare(b.sort));
    }
    // 월 단위 그룹
    const map = new Map<string, { month: number; media: MediaKey; rows: MediaAgg[] }>();
    for (const r of filt) {
      const month = Number(r.date.slice(5, 7));
      const k = month + "|" + r.media;
      if (!map.has(k)) map.set(k, { month, media: r.media, rows: [] });
      map.get(k)!.rows.push(r);
    }
    return [...map.values()]
      .map(({ month, media, rows }) => ({ period: `${month}월`, sort: String(month).padStart(2, "0") + media, media, agg: totalOf(rows) }))
      .sort((a, b) => a.sort.localeCompare(b.sort));
  }, [data, period, selMedia, daily]);

  const tot = useMemo(() => totalOf(rows.map((r) => r.agg)), [rows]);
  const exportUrl = `/api/export?grain=${daily ? "day" : "month"}&from=${period.from}&to=${period.to}&medias=${selMedia.join(",")}`;

  return (
    <div className="mt-6 space-y-6">
      <Card className="ring-1 ring-slate-200">
        <Flex className="flex-col items-start gap-4 lg:flex-row lg:items-end">
          <div className="grow">
            <Title>매체 리포트</Title>
            <Text className="mb-2">{period.from} ~ {period.to}</Text>
            <PeriodPicker min={min} max={max} value={period} onChange={setPeriod} />
          </div>
          <div className="flex flex-col items-start gap-3">
            <div className="w-full sm:w-72">
              <Text className="mb-1">매체 선택</Text>
              <MultiSelect value={selMedia} onValueChange={setSelMedia}>
                {ALL_MEDIA.map((m) => (
                  <MultiSelectItem key={m} value={m}>{MEDIA_LABEL[m]}</MultiSelectItem>
                ))}
              </MultiSelect>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                <Switch checked={daily} onChange={setDaily} /> 일 단위
              </label>
              <Button asChild>
                <a href={exportUrl}>⬇ Excel 다운로드</a>
              </Button>
            </div>
          </div>
        </Flex>
      </Card>

      <Card>
        <Title>{daily ? "일별" : "월별"} 매체 리포트</Title>
        <Text>광고비·전환수는 신뢰 / 전환매출·ROAS는 매체 보고(참고용)</Text>
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeaderCell>{daily ? "일자" : "월"}</TableHeaderCell>
              <TableHeaderCell>매체</TableHeaderCell>
              <TableHeaderCell className="text-right">총광고비</TableHeaderCell>
              <TableHeaderCell className="text-right">노출수</TableHeaderCell>
              <TableHeaderCell className="text-right">클릭수</TableHeaderCell>
              <TableHeaderCell className="text-right">CTR</TableHeaderCell>
              <TableHeaderCell className="text-right">CPC</TableHeaderCell>
              <TableHeaderCell className="text-right">구매수</TableHeaderCell>
              <TableHeaderCell className="text-right text-slate-400">전환매출<br /><span className="text-[10px] font-normal">(매체보고)</span></TableHeaderCell>
              <TableHeaderCell className="text-right text-slate-400">ROAS<br /><span className="text-[10px] font-normal">(매체보고)</span></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.period}</TableCell>
                <TableCell>{MEDIA_LABEL[r.media]}</TableCell>
                <TableCell className="text-right">{won(r.agg.spend)}</TableCell>
                <TableCell className="text-right">{int(r.agg.impressions)}</TableCell>
                <TableCell className="text-right">{int(r.agg.clicks)}</TableCell>
                <TableCell className="text-right">{ratePct(r.agg.ctr)}</TableCell>
                <TableCell className="text-right">{r.agg.clicks > 0 ? won(r.agg.cpc) : "—"}</TableCell>
                <TableCell className="text-right">{int(r.agg.purchases)}</TableCell>
                <TableCell className="text-right text-slate-400">{r.agg.hasRevenue ? won(r.agg.convRevenue) : "N/A"}</TableCell>
                <TableCell className="text-right text-slate-400">{r.agg.hasRevenue ? roasPct(r.agg.roas) : "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFoot>
            <TableRow>
              <TableFooterCell>합계</TableFooterCell>
              <TableFooterCell />
              <TableFooterCell className="text-right">{won(tot.spend)}</TableFooterCell>
              <TableFooterCell className="text-right">{int(tot.impressions)}</TableFooterCell>
              <TableFooterCell className="text-right">{int(tot.clicks)}</TableFooterCell>
              <TableFooterCell className="text-right">{ratePct(tot.ctr)}</TableFooterCell>
              <TableFooterCell className="text-right">{tot.clicks > 0 ? won(tot.cpc) : "—"}</TableFooterCell>
              <TableFooterCell className="text-right">{int(tot.purchases)}</TableFooterCell>
              <TableFooterCell className="text-right text-slate-400">{won(tot.convRevenue)}</TableFooterCell>
              <TableFooterCell className="text-right text-slate-400">{tot.spend > 0 ? roasPct(tot.roas) : "—"}</TableFooterCell>
            </TableRow>
          </TableFoot>
        </Table>
      </Card>
    </div>
  );
}
