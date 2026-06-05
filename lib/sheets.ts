import Papa from "papaparse";
import { AdRow, MediaKey, SalesRow } from "./types";

// ── 워크북/시트 식별자 ──────────────────────────────────────────────
const SALES_BOOK = "1ckzRQ_TJ56rMEi9_OM_KCSLXU_z9Bz-VTrSCO-BMXmQ";
const SALES_GID = "1131251018"; // Raw 탭
const AD_BOOK = "1fBShNEzCga_OZ9HRzf4tB0gOdX5NJi5XBTemY-ZmwgU";

// ── 공통 유틸 ───────────────────────────────────────────────────────

/** 텍스트 숫자(콤마/공백/통화기호 포함)를 number로. 빈값/N-A → 0 */
export function num(v: unknown): number {
  if (v == null) return 0;
  const s = String(v).replace(/[, ₩\s]/g, "").replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** 날짜를 ISO(YYYY-MM-DD)로 정규화. 카카오의 2026.05.27 도 처리 */
export function toISO(v: unknown): string {
  if (!v) return "";
  let s = String(v).trim();
  s = s.replace(/\./g, "-").replace(/\//g, "-");
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return "";
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** 캠페인명 prefix로 집행구분 파싱 */
export function parseExec(campaign: string): string {
  const c = campaign || "";
  if (c.includes("기획")) return "기획";
  if (c.startsWith("라이브") || c.includes("라이브") || c.startsWith("상시"))
    return "상시·라이브";
  return "기타";
}

async function fetchCsv(url: string): Promise<string> {
  // NOTE: 현재는 링크 공개 시트를 인증 없이 읽음.
  // 운영 전환 시 이 함수만 서비스계정(googleapis Sheets API)으로 교체하면 됨.
  const res = await fetch(url, {
    redirect: "follow",
    // 매일 1회 갱신 + 'sheets' 태그로 수기 새로고침 시 강제 재요청
    next: { revalidate: 3600, tags: ["sheets"] },
    headers: { "User-Agent": "Mozilla/5.0 MimaDashboard" },
  });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.text();
}

function gvizUrl(book: string, sheet: string): string {
  return `https://docs.google.com/spreadsheets/d/${book}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheet
  )}`;
}

/** 정규화 헤더 기반 컬럼 접근기 (공백제거 + 부분일치 허용) */
function makeGetter(row: Record<string, string>) {
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const entries = Object.keys(row).map((k) => [norm(k), row[k]] as const);
  return (...candidates: string[]): string => {
    for (const cand of candidates) {
      const nc = norm(cand);
      const exact = entries.find(([k]) => k === nc);
      if (exact) return exact[1];
    }
    for (const cand of candidates) {
      const nc = norm(cand);
      const part = entries.find(([k]) => k.includes(nc));
      if (part) return part[1];
    }
    return "";
  };
}

// ── 매출시트 ────────────────────────────────────────────────────────

export async function fetchSalesRows(): Promise<SalesRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SALES_BOOK}/export?format=csv&gid=${SALES_GID}`;
  const csv = await fetchCsv(url);
  const parsed = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: false });
  const rows = parsed.data;
  const out: SalesRow[] = [];
  // 헤더가 3행 → 데이터는 인덱스 3부터 (0-based)
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const date = toISO(r[4]); // E 주문일자
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const saleType = (r[21] || "").trim() === "판매" ? "판매" : "판촉";
    out.push({
      date,
      year: num(r[16]) || Number(date.slice(0, 4)),
      month: num(r[17]) || Number(date.slice(5, 7)),
      day: num(r[18]) || Number(date.slice(8, 10)),
      week: num(r[19]),
      vendor: (r[1] || "미분류").trim(),
      channel1: (r[13] || r[1] || "미분류").trim(),
      channel2: (r[14] || "미분류").trim(),
      product: (r[6] || "미분류").trim(),
      sku: cleanSku(r[9]),
      model: (r[11] || "미분류").trim() || "미분류",
      variant: normVariant(r[12]),
      qty: num(r[7]),
      gross: num(r[8]),
      net: num(r[20]),
      saleType,
    });
  }
  return out;
}

function cleanSku(v: unknown): string {
  const s = (v == null ? "" : String(v)).trim();
  if (!s || s === "#N/A") return "미분류";
  return s;
}
function normVariant(v: unknown): string {
  const s = (v == null ? "" : String(v)).trim();
  if (!s) return "미분류";
  return s.replace(/\s+/g, ""); // 선데이 베이지 = 선데이베이지
}

// ── 광고시트 ────────────────────────────────────────────────────────

type RawRow = Record<string, string>;

async function fetchAdSheet(sheet: string): Promise<RawRow[]> {
  const csv = await fetchCsv(gvizUrl(AD_BOOK, sheet));
  const parsed = Papa.parse<RawRow>(csv, { header: true, skipEmptyLines: true });
  return parsed.data.filter((r) => r && Object.keys(r).length > 1);
}

function mapKakao(rows: RawRow[]): AdRow[] {
  return rows
    .map((row): AdRow | null => {
      const g = makeGetter(row);
      const date = toISO(g("일"));
      if (!date) return null;
      const campaign = g("캠페인 이름").replace(/^보고서명.*?캠페인 이름/, "").trim() || "(미상)";
      return {
        media: "kakao",
        date,
        campaign,
        exec: parseExec(campaign),
        channelType: g("캠페인 유형") || "기타",
        classification: g("캠페인 목표") || "",
        subMedia: "전체",
        spend: num(g("비용")),
        impressions: num(g("노출수")),
        clicks: num(g("클릭수")),
        reach: num(g("도달수")),
        purchases: num(g("구매 (7일)", "구매(7일)")),
        convRevenue: num(g("구매금액 (7일)", "구매금액(7일)")),
        hasRevenue: true,
      };
    })
    .filter((x): x is AdRow => x !== null);
}

function mapNaver(rows: RawRow[]): AdRow[] {
  return rows
    .map((row): AdRow | null => {
      const g = makeGetter(row);
      const date = toISO(g("수기입력 사항 일자", "일자"));
      if (!date) return null;
      const campaign = g("캠페인 이름") || "(미상)";
      const division = g("광고 구분") || "기타"; // 검색광고 / 디스플레이 광고
      const classification = (g("캠페인 분류") || "기타").trim() || "기타"; // 파워링크/쇼핑검색/브랜드검색/ADVoost 등
      return {
        media: "naver",
        date,
        campaign,
        exec: parseExec(campaign),
        channelType: division,
        classification,
        subMedia: classification, // 네이버 세분화 = 광고유형(캠페인 분류)
        spend: num(g("총비용")),
        impressions: num(g("노출수")),
        clicks: num(g("클릭수")),
        reach: 0,
        purchases: num(g("총 전환수", "총전환수")),
        convRevenue: num(g("총 전환매출액", "총전환매출액")),
        hasRevenue: true,
      };
    })
    .filter((x): x is AdRow => x !== null);
}

function mapMeta(media: MediaKey, rows: RawRow[]): AdRow[] {
  return rows
    .map((row): AdRow | null => {
      const g = makeGetter(row);
      const date = toISO(g("보고 시작", "보고시작"));
      if (!date) return null;
      const campaign = g("캠페인 이름") || "(미상)";
      const roas = num(g("구매 ROAS", "구매roas"));
      const spend = num(g("지출 금액", "지출금액"));
      const hasRev = media === "meta_naver";
      const convRevenue = hasRev && roas > 0 ? (roas / 100) * spend : 0;
      return {
        media,
        date,
        campaign,
        exec: parseExec(campaign),
        channelType: g("플랫폼") || "기타",
        classification: g("노출 위치", "노출위치") || "",
        subMedia: "전체",
        spend,
        impressions: num(g("노출")),
        clicks: num(g("링크 클릭", "고유 링크 클릭", "링크클릭")),
        reach: num(g("도달")),
        purchases: num(g("구매")),
        convRevenue,
        hasRevenue: hasRev,
      };
    })
    .filter((x): x is AdRow => x !== null);
}

// 네이버 브랜드검색 (정액 계약제) — RAW_NAVER_BRAND
// 계약비를 계약기간 일수로 나눠 일별 비용으로 배분. 비용만 추가(노출/클릭은 RAW_NAVER에 이미 존재 → 중복 방지)
function mapNaverBrand(rows: RawRow[]): AdRow[] {
  const out: AdRow[] = [];
  for (const row of rows) {
    const g = makeGetter(row);
    const status = (g("계약 상태") || "").trim();
    if (status !== "집행 중" && status !== "종료") continue; // 집행대기·집행전취소 제외
    const period = g("계약 기간") || "";
    const m = period.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2}).*?[~\-](\s*)(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
    if (!m) continue;
    const start = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    const end = `${m[5]}-${m[6].padStart(2, "0")}-${m[7].padStart(2, "0")}`;
    const net = num(g("계약 광고비")) - num(g("환급액"));
    if (net <= 0) continue;
    const startMs = Date.parse(start + "T00:00:00Z");
    const endMs = Date.parse(end + "T00:00:00Z");
    const days = Math.round((endMs - startMs) / 86400000) + 1;
    if (!Number.isFinite(days) || days <= 0) continue;
    const daily = net / days;
    const campaign = (g("계약 이름") || "브랜드검색").trim();
    const todayISO = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < days; i++) {
      const iso = new Date(startMs + i * 86400000).toISOString().slice(0, 10);
      // 2026년 집행분 + 오늘 이전(완료된 날)만 반영 (오늘/미래 미완성일 제외)
      if (iso < "2026-01-01" || iso >= todayISO) continue;
      out.push({
        media: "naver",
        date: iso,
        campaign,
        exec: "상시·라이브",
        channelType: "검색광고",
        classification: "브랜드검색/신제품검색",
        subMedia: "브랜드검색/신제품검색",
        spend: daily,
        impressions: 0,
        clicks: 0,
        reach: 0,
        purchases: 0,
        convRevenue: 0,
        hasRevenue: true,
      });
    }
  }
  return out;
}

export async function fetchAdRows(): Promise<AdRow[]> {
  const [kakao, naver, mima, metaNaver, naverBrand] = await Promise.all([
    fetchAdSheet("RAW_KAKAO"),
    fetchAdSheet("RAW_NAVER"),
    fetchAdSheet("RAW_META_MIMA"),
    fetchAdSheet("RAW_META_NAVER"),
    fetchAdSheet("RAW_NAVER_BRAND"),
  ]);
  return [
    ...mapKakao(kakao),
    ...mapNaver(naver),
    ...mapMeta("meta_mima", mima),
    ...mapMeta("meta_naver", metaNaver),
    ...mapNaverBrand(naverBrand),
  ];
}
