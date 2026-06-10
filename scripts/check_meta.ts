import Papa from "papaparse";
import { fetchAdRows } from "../lib/sheets";
const AD_BOOK = "1fBShNEzCga_OZ9HRzf4tB0gOdX5NJi5XBTemY-ZmwgU";
const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");

async function main() {
  // 1) 원본에서 구매 ROAS 값 크기 확인 (배수인지 퍼센트인지)
  const url = `https://docs.google.com/spreadsheets/d/${AD_BOOK}/gviz/tq?tqx=out:csv&sheet=RAW_META_NAVER`;
  const csv = await (await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } })).text();
  const rows = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data;
  const roasKey = Object.keys(rows[0] || {}).find((k) => k.includes("구매 ROAS"))!;
  const spendKey = Object.keys(rows[0] || {}).find((k) => k.includes("지출 금액"))!;
  const buyKey = Object.keys(rows[0] || {}).find((k) => k.includes("공유항목이 포함된 구매"))!;
  console.log("구매ROAS 컬럼:", roasKey, "/ 구매 컬럼:", buyKey);
  const nz = rows.filter((r) => r[roasKey] && parseFloat(r[roasKey]) > 0).slice(0, 8);
  console.log("\n구매ROAS>0 행 (원본):");
  for (const r of nz) console.log(`  지출 ${r[spendKey]} | 구매ROAS ${r[roasKey]} | 공유구매 ${r[buyKey] || "-"}`);

  // 2) 집계 후 메타 수치
  const ad = await fetchAdRows();
  for (const m of ["meta_mima", "meta_naver"] as const) {
    const r = ad.filter((x) => x.media === m);
    console.log(`\n[${m}] 광고비 ${won(r.reduce((s, x) => s + x.spend, 0))} | 구매 ${r.reduce((s, x) => s + x.purchases, 0)} | 전환매출 ${won(r.reduce((s, x) => s + x.convRevenue, 0))}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
