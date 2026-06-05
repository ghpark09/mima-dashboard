import {
  AdRow,
  CampaignAgg,
  ChannelAgg,
  DailyRow,
  DashboardData,
  DayCampaignAgg,
  DayMediaAgg,
  Insight,
  MediaAgg,
  MediaKey,
  MEDIA_LABEL,
  MonthAgg,
  MonthMediaAgg,
  SalesLite,
  SalesRow,
  WeekAgg,
} from "./types";

const MEDIA_KEYS: MediaKey[] = ["kakao", "naver", "meta_mima", "meta_naver"];

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
const div = (num: number, den: number) => (den > 0 ? num / den : 0);

function emptySpend(): Record<MediaKey, number> {
  return { kakao: 0, naver: 0, meta_mima: 0, meta_naver: 0 };
}

// ── 광고 집계 ───────────────────────────────────────────────────────

function aggregateMedia(
  rows: AdRow[],
  media: MediaKey,
  subMedia: string
): MediaAgg {
  const spend = sum(rows, "spend");
  const impressions = sum(rows, "impressions");
  const clicks = sum(rows, "clicks");
  const reach = sum(rows, "reach");
  const purchases = sum(rows, "purchases");
  const convRevenue = sum(rows, "convRevenue");
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
    ctr: pct(clicks, impressions),
    cpc: div(spend, clicks),
    cpm: div(spend, impressions) * 1000,
    cpa: div(spend, purchases),
    roas: hasRevenue ? pct(convRevenue, spend) : 0,
    hasRevenue,
  };
}

function sum<T>(rows: T[], key: keyof T): number {
  let s = 0;
  for (const r of rows) s += Number(r[key]) || 0;
  return s;
}

// ── 매출 채널 집계 ──────────────────────────────────────────────────

function aggregateChannel(rows: SalesRow[], keyOf: (r: SalesRow) => string): ChannelAgg[] {
  const map = new Map<string, SalesRow[]>();
  for (const r of rows) {
    const k = keyOf(r) || "미분류";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  const out: ChannelAgg[] = [];
  for (const [key, list] of map) {
    const sales = list.filter((r) => r.saleType === "판매");
    const netRevenue = sum(list, "net"); // 판촉=0 이라 전체 합산 안전
    const grossRevenue = sum(sales, "gross");
    const orders = sales.length;
    const units = sum(sales, "qty");
    out.push({ key, netRevenue, grossRevenue, orders, units, aov: div(netRevenue, orders) });
  }
  return out.sort((a, b) => b.netRevenue - a.netRevenue);
}

// ── 메인 조립 ───────────────────────────────────────────────────────

export function assembleDashboard(salesRowsAll: SalesRow[], adRowsAll: AdRow[]): DashboardData {
  // 오늘(KST)은 아직 미완성일 → 자정 전까지는 D-1까지만 집계 (오늘/미래 데이터 제외)
  const todayKST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const salesRows = salesRowsAll.filter((r) => r.date < todayKST);
  const adRows = adRowsAll.filter((r) => r.date < todayKST);

  // 날짜 범위
  const salesDates = salesRows.map((r) => r.date).sort();
  const adDates = adRows.map((r) => r.date).sort();

  // ── 일별 ──
  const dailyMap = new Map<string, DailyRow>();
  const ensureDay = (date: string): DailyRow => {
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        netRevenue: 0,
        grossRevenue: 0,
        orders: 0,
        units: 0,
        promoCount: 0,
        spendByMedia: emptySpend(),
        totalSpend: 0,
        blendedRoas: null,
        impressions: 0,
        clicks: 0,
        convRevenue: 0,
        purchases: 0,
      });
    }
    return dailyMap.get(date)!;
  };
  for (const r of salesRows) {
    const d = ensureDay(r.date);
    d.netRevenue += r.net;
    if (r.saleType === "판매") {
      d.grossRevenue += r.gross;
      d.orders += 1;
      d.units += r.qty;
    } else {
      d.promoCount += 1;
    }
  }
  for (const r of adRows) {
    const d = ensureDay(r.date);
    d.spendByMedia[r.media] += r.spend;
    d.totalSpend += r.spend;
    d.impressions += r.impressions;
    d.clicks += r.clicks;
    d.purchases += r.purchases;
    if (r.hasRevenue) d.convRevenue += r.convRevenue;
  }
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const d of daily) d.blendedRoas = d.totalSpend > 0 ? pct(d.netRevenue, d.totalSpend) : null;

  // ── 매체 집계 ──
  const byMedia: MediaAgg[] = MEDIA_KEYS.map((m) =>
    aggregateMedia(adRows.filter((r) => r.media === m), m, "전체")
  ).filter((m) => m.spend > 0 || m.impressions > 0);

  // 매체 + 세분화 (네이버는 검색/디스플레이로 분리, 나머지는 전체)
  const byMediaSub: MediaAgg[] = [];
  for (const m of MEDIA_KEYS) {
    const mrows = adRows.filter((r) => r.media === m);
    if (m === "naver") {
      const subs = [...new Set(mrows.map((r) => r.subMedia))];
      for (const s of subs)
        byMediaSub.push(aggregateMedia(mrows.filter((r) => r.subMedia === s), m, s));
    } else {
      const agg = aggregateMedia(mrows, m, "전체");
      if (agg.spend > 0 || agg.impressions > 0) byMediaSub.push(agg);
    }
  }

  // ── 월 × 매체 ──
  const byMonthMedia: MonthMediaAgg[] = [];
  const months = [...new Set(adRows.map((r) => Number(r.date.slice(5, 7))))].sort((a, b) => a - b);
  for (const mo of months) {
    for (const m of MEDIA_KEYS) {
      const mrows = adRows.filter((r) => r.media === m && Number(r.date.slice(5, 7)) === mo);
      if (!mrows.length) continue;
      byMonthMedia.push({ ...aggregateMedia(mrows, m, "전체"), month: mo });
    }
  }

  // ── 일 × 매체 ──
  const byDayMedia: DayMediaAgg[] = [];
  const dmKeys = new Map<string, AdRow[]>();
  for (const r of adRows) {
    const k = `${r.date}||${r.media}`;
    if (!dmKeys.has(k)) dmKeys.set(k, []);
    dmKeys.get(k)!.push(r);
  }
  for (const [k, list] of dmKeys) {
    const [date, media] = k.split("||") as [string, MediaKey];
    byDayMedia.push({ ...aggregateMedia(list, media, "전체"), date });
  }
  byDayMedia.sort((a, b) => a.date.localeCompare(b.date) || a.media.localeCompare(b.media));

  // ── 일 × 매체 × 광고유형(subMedia) ── (기간 필터 + 네이버 유형별 동시 지원)
  const byDaySub: DayMediaAgg[] = [];
  const dsKeys = new Map<string, AdRow[]>();
  for (const r of adRows) {
    const k = `${r.date}||${r.media}||${r.subMedia}`;
    if (!dsKeys.has(k)) dsKeys.set(k, []);
    dsKeys.get(k)!.push(r);
  }
  for (const [k, list] of dsKeys) {
    const [date, media] = k.split("||") as [string, MediaKey, string];
    byDaySub.push({ ...aggregateMedia(list, media, list[0].subMedia), date });
  }
  byDaySub.sort((a, b) => a.date.localeCompare(b.date));

  // ── 일 × 캠페인 ── (기간 필터용)
  const byDayCampaign: DayCampaignAgg[] = [];
  const dcKeys = new Map<string, AdRow[]>();
  for (const r of adRows) {
    const k = `${r.date}|||${r.media}|||${r.campaign}`;
    if (!dcKeys.has(k)) dcKeys.set(k, []);
    dcKeys.get(k)!.push(r);
  }
  for (const list of dcKeys.values()) {
    const media = list[0].media;
    const a = aggregateMedia(list, media, "전체");
    byDayCampaign.push({
      date: list[0].date,
      media,
      mediaLabel: MEDIA_LABEL[media],
      campaign: list[0].campaign,
      channelType: list[0].channelType,
      classification: list[0].classification,
      exec: list[0].exec,
      spend: a.spend,
      impressions: a.impressions,
      clicks: a.clicks,
      purchases: a.purchases,
      convRevenue: a.convRevenue,
      hasRevenue: a.hasRevenue,
    });
  }

  // ── 판매 경량 데이터 (기간 필터용, 판촉 제외) ──
  const salesLite: SalesLite[] = salesRows
    .filter((r) => r.saleType === "판매")
    .map((r) => ({
      date: r.date,
      channel1: r.channel1,
      vendor: r.vendor,
      model: r.model,
      product: r.product,
      channel2: r.channel2,
      gross: r.gross,
      qty: r.qty,
    }));

  // ── 캠페인 ──
  const campMap = new Map<string, AdRow[]>();
  for (const r of adRows) {
    const k = `${r.media}||${r.campaign}`;
    if (!campMap.has(k)) campMap.set(k, []);
    campMap.get(k)!.push(r);
  }
  const campaigns: CampaignAgg[] = [];
  for (const [k, list] of campMap) {
    const [media] = k.split("||") as [MediaKey, string];
    const a = aggregateMedia(list, media, "전체");
    campaigns.push({
      media,
      mediaLabel: MEDIA_LABEL[media],
      campaign: list[0].campaign,
      channelType: list[0].channelType,
      classification: list[0].classification,
      exec: list[0].exec,
      spend: a.spend,
      impressions: a.impressions,
      clicks: a.clicks,
      purchases: a.purchases,
      convRevenue: a.convRevenue,
      ctr: a.ctr,
      cpc: a.cpc,
      cpa: a.cpa,
      roas: a.roas,
      hasRevenue: a.hasRevenue,
    });
  }
  campaigns.sort((a, b) => b.spend - a.spend);

  // ── 매출 채널/상품 ──
  const salesByChannel1 = aggregateChannel(salesRows, (r) => r.channel1);
  const latestSalesDate = salesDates[salesDates.length - 1] || "";
  const curMonthNum = salesRows.length ? Math.max(...salesRows.map((r) => r.month)) : 0;
  const channelYesterday = aggregateChannel(
    salesRows.filter((r) => r.date === latestSalesDate),
    (r) => r.channel1
  );
  const channelThisMonth = aggregateChannel(
    salesRows.filter((r) => r.month === curMonthNum),
    (r) => r.channel1
  );
  const productThisMonth = aggregateChannel(
    salesRows.filter((r) => r.month === curMonthNum),
    (r) => r.product
  );
  const salesByVendor = aggregateChannel(salesRows, (r) => r.vendor);
  const salesByModel = aggregateChannel(salesRows, (r) => r.model);
  const salesByProduct = aggregateChannel(salesRows, (r) => r.product);
  const onlineOffline = aggregateChannel(salesRows, (r) => r.channel2);

  const promoSale = salesRows.filter((r) => r.saleType === "판매");
  const promoPromo = salesRows.filter((r) => r.saleType === "판촉");
  const promoSplit = [
    { saleType: "판매", revenue: sum(promoSale, "net"), count: promoSale.length },
    { saleType: "판촉", revenue: 0, count: promoPromo.length },
  ];

  // ── 월/주 추세 ──
  const monthly: MonthAgg[] = [];
  const moMap = new Map<number, SalesRow[]>();
  for (const r of salesRows) {
    if (!moMap.has(r.month)) moMap.set(r.month, []);
    moMap.get(r.month)!.push(r);
  }
  const moSorted = [...moMap.keys()].sort((a, b) => a - b);
  let prevNet = 0;
  for (const mo of moSorted) {
    const list = moMap.get(mo)!;
    const sales = list.filter((r) => r.saleType === "판매");
    const netRevenue = sum(list, "net");
    const m: MonthAgg = {
      month: mo,
      netRevenue,
      grossRevenue: sum(sales, "gross"),
      orders: sales.length,
      units: sum(sales, "qty"),
      aov: div(netRevenue, sales.length),
      momPct: prevNet > 0 ? ((netRevenue - prevNet) / prevNet) * 100 : null,
    };
    monthly.push(m);
    prevNet = netRevenue;
  }

  const weekly: WeekAgg[] = [];
  const wkMap = new Map<number, SalesRow[]>();
  for (const r of salesRows) {
    if (!r.week) continue;
    if (!wkMap.has(r.week)) wkMap.set(r.week, []);
    wkMap.get(r.week)!.push(r);
  }
  for (const wk of [...wkMap.keys()].sort((a, b) => a - b)) {
    const sales = wkMap.get(wk)!.filter((r) => r.saleType === "판매");
    weekly.push({
      week: wk,
      netRevenue: sum(wkMap.get(wk)!, "net"),
      grossRevenue: sum(sales, "gross"),
      orders: sales.length,
      units: sum(sales, "qty"),
    });
  }

  // ── 합계 ──
  const netRevenue = sum(salesRows, "net");
  const grossRevenue = sum(promoSale, "gross");
  const orders = promoSale.length;
  const units = sum(promoSale, "qty");
  const totalSpend = sum(adRows, "spend");
  const totals = {
    netRevenue,
    grossRevenue,
    orders,
    units,
    promoCount: promoPromo.length,
    totalSpend,
    blendedRoas: totalSpend > 0 ? pct(netRevenue, totalSpend) : null,
    aov: div(netRevenue, orders),
  };

  const latestDay = daily.length ? daily[daily.length - 1] : null;
  const prevDay = daily.length > 1 ? daily[daily.length - 2] : null;

  const insights = buildInsights({
    daily,
    byMedia,
    campaigns,
    channelMonth: channelThisMonth,
    productMonth: productThisMonth,
  });

  return {
    generatedAt: new Date().toISOString(),
    range: {
      salesMin: salesDates[0] || "",
      salesMax: salesDates[salesDates.length - 1] || "",
      adMin: adDates[0] || "",
      adMax: adDates[adDates.length - 1] || "",
    },
    totals,
    latestDay,
    prevDay,
    daily,
    byMedia,
    byMediaSub,
    byMonthMedia,
    byDayMedia,
    byDaySub,
    byDayCampaign,
    salesLite,
    salesByChannel1,
    channelYesterday,
    channelThisMonth,
    salesByVendor,
    salesByModel,
    salesByProduct,
    onlineOffline,
    promoSplit,
    campaigns,
    monthly,
    weekly,
    insights,
  };
}

// ── 인사이트 (근거 기반 비즈니스 개선 제안) ──────────────────────────

function buildInsights(d: {
  daily: DailyRow[];
  byMedia: MediaAgg[];
  campaigns: CampaignAgg[];
  channelMonth: ChannelAgg[];
  productMonth: ChannelAgg[];
}): Insight[] {
  const out: Insight[] = [];
  const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");
  const sumF = <T,>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);

  const ds = d.daily;
  const last7 = ds.slice(-7);
  const prev7 = ds.slice(-14, -7);

  // 1) 매출 추세 — 최근 7일 vs 직전 7일
  const l7 = sumF(last7, (x) => x.grossRevenue), p7 = sumF(prev7, (x) => x.grossRevenue);
  if (p7 > 0) {
    const g = ((l7 - p7) / p7) * 100;
    out.push({
      level: g >= 0 ? "good" : "warn",
      title: `최근 7일 판매금액 ${won(l7)} — 직전 7일 대비 ${g >= 0 ? "▲" : "▼"} ${Math.abs(g).toFixed(1)}%`,
      detail:
        g >= 0
          ? `상승세입니다(직전 7일 ${won(p7)}). 잘 나가는 채널·상품에 노출/광고를 더 집중하세요.`
          : `하락세입니다(직전 7일 ${won(p7)}). 주력 채널 노출 감소·경쟁사 프로모션·재고 품절 여부를 점검하세요.`,
    });
  }

  // 2) 채널 집중도 (이번 달) — 리스크/다변화
  const chTot = sumF(d.channelMonth, (x) => x.grossRevenue);
  const topCh = d.channelMonth.find((c) => c.key !== "미분류");
  if (topCh && chTot > 0) {
    const share = (topCh.grossRevenue / chTot) * 100;
    out.push({
      level: share >= 60 ? "warn" : "info",
      title: `이번 달 매출의 ${share.toFixed(0)}%가 '${topCh.key}'에 집중 (${won(topCh.grossRevenue)})`,
      detail:
        share >= 60
          ? "특정 채널 의존도가 높습니다. 채널이 흔들리면 전체 매출이 타격받으니, 차순위 채널(쿠팡·오늘의집 등) 강화로 리스크를 분산하세요."
          : "주력 채널이 안정적으로 기여하고 있습니다. 차순위 채널 성장 여지를 점검하세요.",
    });
  }

  // 3) 이번 달 베스트셀러 — 재고/번들/광고 활용
  const pTot = sumF(d.productMonth, (x) => x.grossRevenue);
  const bestP = d.productMonth.find((p) => p.key !== "미분류");
  if (bestP && pTot > 0) {
    out.push({
      level: "info",
      title: `이번 달 베스트셀러: ${bestP.key} ${won(bestP.grossRevenue)} (매출의 ${((bestP.grossRevenue / pTot) * 100).toFixed(0)}%)`,
      detail: `${bestP.orders}건 판매. 품절 방지를 위한 재고 확보, 연관 상품 묶음 구성, 이 상품 중심의 광고 소재 활용을 고려하세요.`,
    });
  }

  // 4) 광고 한계효율 — 광고비 증가분이 매출로 이어지는지
  const l7s = sumF(last7, (x) => x.totalSpend), p7s = sumF(prev7, (x) => x.totalSpend);
  if (p7s > 0 && l7s > 0) {
    const sg = ((l7s - p7s) / p7s) * 100;
    const rg = p7 > 0 ? ((l7 - p7) / p7) * 100 : 0;
    if (sg > 10 && rg < sg - 10) {
      out.push({
        level: "warn",
        title: `최근 7일 광고비 ▲${sg.toFixed(0)}%인데 매출은 ${rg >= 0 ? "▲" : "▼"}${Math.abs(rg).toFixed(0)}% — 광고 한계효율 저하`,
        detail: "광고비를 늘린 만큼 매출이 따라오지 않고 있습니다. 신규 캠페인 성과를 점검하고, 효율 검증된 캠페인 위주로 예산을 재배분하세요.",
      });
    }
  }

  // 5) 전환당 비용(CPA) 비교 — 실측 전환수 기반(부풀려진 전환매출 미사용)
  const conv = d.byMedia.filter((m) => m.purchases > 0 && m.spend > 0);
  if (conv.length >= 2) {
    const cheap = [...conv].sort((a, b) => a.cpa - b.cpa)[0];
    const pricey = [...conv].sort((a, b) => b.cpa - a.cpa)[0];
    if (cheap.media !== pricey.media && pricey.cpa > cheap.cpa * 1.5) {
      out.push({
        level: "info",
        title: `전환당 비용: ${cheap.label} ${won(cheap.cpa)}(최저) vs ${pricey.label} ${won(pricey.cpa)}(최고)`,
        detail: `${cheap.label}가 전환 1건을 가장 싸게 만듭니다. ${pricey.label}는 전환당 비용이 ${(pricey.cpa / cheap.cpa).toFixed(1)}배 높으니 타겟·소재·입찰 점검 또는 예산 축소를 검토하세요.`,
      });
    }
  }

  // 6) 광고비 집행했으나 구매 0 — 점검/중지
  const wasted = d.campaigns.filter((c) => c.spend >= 50000 && c.purchases === 0).slice(0, 2);
  for (const c of wasted) {
    out.push({
      level: "warn",
      title: `${c.mediaLabel} · ${c.campaign} — 광고비 ${won(c.spend)} 집행, 구매 0`,
      detail: "전환이 없는 캠페인입니다. 랜딩페이지·소재·타겟을 점검하거나 일시중지 후 예산을 효율 캠페인으로 재배분하세요.",
    });
  }

  return out.slice(0, 7);
}
