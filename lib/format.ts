import { MediaKey } from "./types";

/** ₩ + 천단위 콤마 (약어 금지) */
export const won = (n: number | null | undefined): string =>
  n == null ? "—" : "₩" + Math.round(n).toLocaleString("ko-KR");

/** 천단위 콤마 정수 */
export const int = (n: number | null | undefined): string =>
  n == null ? "—" : Math.round(n).toLocaleString("ko-KR");

/** ROAS 등: 정수 % */
export const roasPct = (n: number | null | undefined): string =>
  n == null ? "—" : Math.round(n).toLocaleString("ko-KR") + "%";

/** CTR 등 소수 % */
export const ratePct = (n: number | null | undefined, digits = 2): string =>
  n == null ? "—" : n.toFixed(digits) + "%";

/** 증감 표시 */
export const delta = (cur: number, prev: number): { sign: string; pct: string; up: boolean } => {
  const d = cur - prev;
  const p = prev !== 0 ? (d / prev) * 100 : 0;
  return { sign: d >= 0 ? "▲" : "▼", pct: Math.abs(p).toFixed(1) + "%", up: d >= 0 };
};

export const MEDIA_COLOR: Record<MediaKey, string> = {
  kakao: "amber",
  naver: "emerald",
  meta_mima: "blue",
  meta_naver: "violet",
};

export const monthLabel = (m: number) => `${m}월`;
