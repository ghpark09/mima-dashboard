import {
  CampaignAgg,
  ChannelAgg,
  DayCampaignAgg,
  DayMediaAgg,
  MediaAgg,
  MediaKey,
  MEDIA_LABEL,
  SalesLite,
} from "./types";

export interface Period {
  from: string; // YYYY-MM-DD
  to: string;
  label: string;
}

const shift = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function presets(min: string, max: string): Period[] {
  const monthStart = max.slice(0, 7) + "-01";
  return [
    { label: "어제", from: max, to: max },
    { label: "최근 7일", from: shift(max, -6), to: max },
    { label: "최근 30일", from: shift(max, -29), to: max },
    { label: "이번 달", from: monthStart, to: max },
    { label: "전체", from: min, to: max },
  ];
}

export const inRange = (date: string, p: { from: string; to: string }) =>
  date >= p.from && date <= p.to;

function aggregate(rows: DayMediaAgg[], media: MediaKey, subMedia: string): MediaAgg {
  const s = (k: keyof DayMediaAgg) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const spend = s("spend"), impressions = s("impressions"), clicks = s("clicks");
  const reach = s("reach"), purchases = s("purchases"), convRevenue = s("convRevenue");
  const hasRevenue = rows.some((r) => r.hasRevenue);
  return {
    media,
    label: MEDIA_LABEL[media],
    subMedia,
    spend,
    impressions,
    clicks,
    reach,
    purchases,
    convRevenue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: purchases > 0 ? spend / purchases : 0,
    roas: hasRevenue && spend > 0 ? (convRevenue / spend) * 100 : 0,
    hasRevenue,
  };
}

/** 기간 내 매체별 재집계 */
export function byMediaInRange(byDaySub: DayMediaAgg[], p: Period): MediaAgg[] {
  const filt = byDaySub.filter((r) => inRange(r.date, p));
  const map = new Map<MediaKey, DayMediaAgg[]>();
  for (const r of filt) {
    if (!map.has(r.media)) map.set(r.media, []);
    map.get(r.media)!.push(r);
  }
  return [...map.entries()]
    .map(([m, rows]) => aggregate(rows, m, "전체"))
    .filter((x) => x.spend > 0 || x.impressions > 0)
    .sort((a, b) => b.spend - a.spend);
}

/** 기간 내 매체 + 광고유형(subMedia)별 재집계 (네이버 광고유형 펼침용) */
export function bySubInRange(byDaySub: DayMediaAgg[], p: Period): MediaAgg[] {
  const filt = byDaySub.filter((r) => inRange(r.date, p));
  const map = new Map<string, { media: MediaKey; sub: string; rows: DayMediaAgg[] }>();
  for (const r of filt) {
    const k = r.media + "||" + r.subMedia;
    if (!map.has(k)) map.set(k, { media: r.media, sub: r.subMedia, rows: [] });
    map.get(k)!.rows.push(r);
  }
  return [...map.values()]
    .map(({ media, sub, rows }) => aggregate(rows, media, sub))
    .filter((x) => x.spend > 0 || x.impressions > 0);
}

/** 여러 MediaAgg를 하나로 합산(합계 행용) */
export function totalOf(rows: MediaAgg[]): MediaAgg {
  const s = (k: keyof MediaAgg) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const spend = s("spend"), impressions = s("impressions"), clicks = s("clicks");
  const purchases = s("purchases"), convRevenue = s("convRevenue"), reach = s("reach");
  const hasRevenue = rows.some((r) => r.hasRevenue);
  return {
    media: "kakao",
    label: "합계",
    subMedia: "전체",
    spend,
    impressions,
    clicks,
    reach,
    purchases,
    convRevenue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: purchases > 0 ? spend / purchases : 0,
    roas: hasRevenue && spend > 0 ? (convRevenue / spend) * 100 : 0,
    hasRevenue,
  };
}

/** 기간 내 판매(판촉 제외) 집계 — 채널/판매처/상품/모델 등 */
export function aggregateSalesBy(
  rows: SalesLite[],
  p: Period,
  keyFn: (r: SalesLite) => string
): ChannelAgg[] {
  const filt = rows.filter((r) => inRange(r.date, p));
  const map = new Map<string, SalesLite[]>();
  for (const r of filt) {
    const k = keyFn(r) || "미분류";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const grossRevenue = list.reduce((s, r) => s + r.gross, 0);
      const units = list.reduce((s, r) => s + r.qty, 0);
      const orders = list.length;
      return { key, netRevenue: 0, grossRevenue, orders, units, aov: orders > 0 ? grossRevenue / orders : 0 };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);
}

/** 기간 내 캠페인 재집계 */
export function campaignsInRange(byDayCampaign: DayCampaignAgg[], p: Period): CampaignAgg[] {
  const filt = byDayCampaign.filter((r) => inRange(r.date, p));
  const map = new Map<string, DayCampaignAgg[]>();
  for (const r of filt) {
    const k = r.media + "|||" + r.campaign;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return [...map.values()]
    .map((list) => {
      const f = list[0];
      const spend = list.reduce((s, r) => s + r.spend, 0);
      const impressions = list.reduce((s, r) => s + r.impressions, 0);
      const clicks = list.reduce((s, r) => s + r.clicks, 0);
      const purchases = list.reduce((s, r) => s + r.purchases, 0);
      const convRevenue = list.reduce((s, r) => s + r.convRevenue, 0);
      const hasRevenue = list.some((r) => r.hasRevenue);
      return {
        media: f.media,
        mediaLabel: f.mediaLabel,
        campaign: f.campaign,
        channelType: f.channelType,
        classification: f.classification,
        exec: f.exec,
        spend,
        impressions,
        clicks,
        purchases,
        convRevenue,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpa: purchases > 0 ? spend / purchases : 0,
        roas: hasRevenue && spend > 0 ? (convRevenue / spend) * 100 : 0,
        hasRevenue,
      };
    })
    .sort((a, b) => b.spend - a.spend);
}
