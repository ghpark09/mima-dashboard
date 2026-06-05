// 미마 대시보드 통합 데이터 타입

export type MediaKey = "kakao" | "naver" | "meta_mima" | "meta_naver";

export const MEDIA_LABEL: Record<MediaKey, string> = {
  kakao: "카카오",
  naver: "네이버",
  meta_mima: "메타(미마)",
  meta_naver: "메타(네이버)",
};

/** 정제된 매출 1행 (판매시트 Raw) */
export interface SalesRow {
  date: string; // YYYY-MM-DD (주문일자)
  year: number;
  month: number;
  day: number;
  week: number;
  vendor: string; // 판매처
  channel1: string; // 채널 구분1 (정규화)
  channel2: string; // 채널 구분2 (온라인/오프라인)
  product: string; // 상품명
  sku: string; // 구분(SKU)
  model: string; // 모델명
  variant: string; // 모델명2
  qty: number; // 수량
  gross: number; // 판매가 (VAT 포함)
  net: number; // 판매가(-vat) (VAT 제외, 판촉=0)
  saleType: "판매" | "판촉";
}

/** 정제된 광고 1행 (매체 공통 스키마) */
export interface AdRow {
  media: MediaKey;
  date: string; // YYYY-MM-DD
  campaign: string;
  exec: string; // 집행구분: 기획 / 상시·라이브 / 기타 (캠페인명 파싱)
  channelType: string; // 매체 내 유형 (네이버 광고구분, 카카오 유형, 메타 플랫폼)
  classification: string; // 세부 분류 (네이버 캠페인 분류 등)
  subMedia: string; // 매체 세분화 라벨 (네이버: 검색광고/디스플레이광고 / 그 외: 전체)
  spend: number; // 광고비
  impressions: number;
  clicks: number;
  reach: number; // 비가산 — 매체별 표시용
  purchases: number; // 구매 전환수
  convRevenue: number; // 광고 전환매출 (없으면 0)
  hasRevenue: boolean; // 전환매출 신뢰 가능 여부 (메타미마=false)
}

export interface DailyRow {
  date: string;
  netRevenue: number;
  grossRevenue: number;
  orders: number;
  units: number;
  promoCount: number;
  spendByMedia: Record<MediaKey, number>;
  totalSpend: number;
  blendedRoas: number | null; // 매출÷광고비×100, 광고비 없으면 null
  // 일별 광고 합계 (스파크라인/일별 효율용)
  impressions: number;
  clicks: number;
  convRevenue: number;
  purchases: number;
}

export interface MediaAgg {
  media: MediaKey;
  label: string;
  subMedia: string; // "전체" 또는 네이버 하위
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  convRevenue: number;
  ctr: number; // %
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number; // %
  hasRevenue: boolean;
}

export interface MonthMediaAgg extends MediaAgg {
  month: number;
}

export interface DayMediaAgg extends MediaAgg {
  date: string;
}

export interface ChannelAgg {
  key: string; // 채널/판매처 이름
  netRevenue: number;
  grossRevenue: number;
  orders: number;
  units: number;
  aov: number;
}

export interface CampaignAgg {
  media: MediaKey;
  mediaLabel: string;
  campaign: string;
  channelType: string;
  classification: string;
  exec: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  convRevenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  hasRevenue: boolean;
}

export interface MonthAgg {
  month: number;
  netRevenue: number;
  grossRevenue: number;
  orders: number;
  units: number;
  aov: number;
  momPct: number | null; // 전월 대비 %
}

export interface WeekAgg {
  week: number;
  netRevenue: number;
  grossRevenue: number;
  orders: number;
  units: number;
}

export interface Insight {
  level: "good" | "warn" | "bad" | "info";
  title: string;
  detail: string;
}

/** 기간 필터용 — 판매(판촉 제외) 행 경량 데이터 */
export interface SalesLite {
  date: string;
  channel1: string;
  vendor: string;
  model: string;
  product: string;
  channel2: string;
  gross: number;
  qty: number;
}

/** 기간 필터용 — 일자 × 캠페인 집계 */
export interface DayCampaignAgg {
  date: string;
  media: MediaKey;
  mediaLabel: string;
  campaign: string;
  channelType: string;
  classification: string;
  exec: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  convRevenue: number;
  hasRevenue: boolean;
}

export interface DashboardData {
  generatedAt: string;
  range: {
    salesMin: string;
    salesMax: string;
    adMin: string;
    adMax: string;
  };
  totals: {
    netRevenue: number;
    grossRevenue: number;
    orders: number;
    units: number;
    promoCount: number;
    totalSpend: number;
    blendedRoas: number | null;
    aov: number;
  };
  latestDay: DailyRow | null;
  prevDay: DailyRow | null;
  daily: DailyRow[];
  byMedia: MediaAgg[]; // 매체 단위 (전체)
  byMediaSub: MediaAgg[]; // 매체 + 세분화 (네이버 검색/디스플레이 포함)
  byMonthMedia: MonthMediaAgg[];
  byDayMedia: DayMediaAgg[];
  byDaySub: DayMediaAgg[]; // 일자 × 매체 × 광고유형(네이버=캠페인분류) — 기간 필터용
  byDayCampaign: DayCampaignAgg[]; // 일자 × 캠페인 — 기간 필터용
  salesLite: SalesLite[]; // 판매 행(판촉 제외) — 기간 필터용
  salesByChannel1: ChannelAgg[];
  channelYesterday: ChannelAgg[];
  channelThisMonth: ChannelAgg[];
  salesByVendor: ChannelAgg[];
  salesByModel: ChannelAgg[];
  salesByProduct: ChannelAgg[];
  onlineOffline: ChannelAgg[];
  promoSplit: { saleType: string; revenue: number; count: number }[];
  campaigns: CampaignAgg[];
  monthly: MonthAgg[];
  weekly: WeekAgg[];
  insights: Insight[];
}
