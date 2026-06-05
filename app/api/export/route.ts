import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getDashboardData } from "@/lib/data";
import { inRange, totalOf } from "@/lib/period";
import { DayMediaAgg, MediaAgg, MediaKey, MEDIA_LABEL } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const grain = sp.get("grain") === "day" ? "day" : "month";
  const medias = (sp.get("medias") || "").split(",").filter(Boolean);
  const data = await getDashboardData();
  const from = sp.get("from") || data.range.adMin;
  const to = sp.get("to") || data.range.adMax;

  const filt = data.byDayMedia.filter(
    (r) => inRange(r.date, { from, to }) && (medias.length === 0 || medias.includes(r.media))
  );

  let rows: { period: string; media: MediaKey; agg: MediaAgg }[];
  if (grain === "day") {
    rows = filt
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.media.localeCompare(b.media))
      .map((r) => ({ period: r.date, media: r.media, agg: r }));
  } else {
    const map = new Map<string, { month: number; media: MediaKey; list: DayMediaAgg[] }>();
    for (const r of filt) {
      const month = Number(r.date.slice(5, 7));
      const k = month + "|" + r.media;
      if (!map.has(k)) map.set(k, { month, media: r.media, list: [] });
      map.get(k)!.list.push(r);
    }
    rows = [...map.values()]
      .sort((a, b) => a.month - b.month || a.media.localeCompare(b.media))
      .map(({ month, media, list }) => ({ period: `${month}월`, media, agg: totalOf(list) }));
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Mima Dashboard";
  const ws = wb.addWorksheet(grain === "day" ? "일별 매체" : "월별 매체");
  ws.columns = [
    { header: grain === "day" ? "일자" : "월", key: "period", width: 14 },
    { header: "매체", key: "media", width: 14 },
    { header: "총광고비", key: "spend", width: 16, style: { numFmt: "#,##0" } },
    { header: "노출수", key: "impr", width: 14, style: { numFmt: "#,##0" } },
    { header: "클릭수", key: "clicks", width: 12, style: { numFmt: "#,##0" } },
    { header: "CTR", key: "ctr", width: 10, style: { numFmt: '0.00"%"' } },
    { header: "CPC", key: "cpc", width: 12, style: { numFmt: "#,##0" } },
    { header: "구매수", key: "purchases", width: 10, style: { numFmt: "#,##0" } },
    { header: "전환매출(매체보고)", key: "rev", width: 20, style: { numFmt: "#,##0" } },
    { header: "ROAS(매체보고)", key: "roas", width: 14, style: { numFmt: '0"%"' } },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

  const tot = totalOf(rows.map((r) => r.agg));
  for (const r of rows) {
    const a = r.agg;
    ws.addRow({
      period: r.period,
      media: MEDIA_LABEL[r.media],
      spend: Math.round(a.spend),
      impr: Math.round(a.impressions),
      clicks: Math.round(a.clicks),
      ctr: Number(a.ctr.toFixed(2)),
      cpc: a.clicks > 0 ? Math.round(a.cpc) : null,
      purchases: Math.round(a.purchases),
      rev: a.hasRevenue ? Math.round(a.convRevenue) : null,
      roas: a.hasRevenue ? Math.round(a.roas) : null,
    });
  }
  const totalRow = ws.addRow({
    period: "합계",
    media: "",
    spend: Math.round(tot.spend),
    impr: Math.round(tot.impressions),
    clicks: Math.round(tot.clicks),
    ctr: Number(tot.ctr.toFixed(2)),
    cpc: tot.clicks > 0 ? Math.round(tot.cpc) : null,
    purchases: Math.round(tot.purchases),
    rev: Math.round(tot.convRevenue),
    roas: tot.spend > 0 ? Math.round(tot.roas) : null,
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mima_media_${grain}_${from}_${to}.xlsx"`,
    },
  });
}
