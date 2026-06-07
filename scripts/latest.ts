import { fetchSalesRows, fetchAdRows } from "../lib/sheets";

async function main() {
  const [sales, ad] = await Promise.all([fetchSalesRows(), fetchAdRows()]);
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  console.log("오늘(KST):", today, "→ 어제(D-1)는 이 날짜 미만의 최신일");

  const sDates = [...new Set(sales.map((r) => r.date))].sort();
  console.log("\n매출 시트 최신 8일 (시트 원본, 오늘 제외 전):");
  for (const d of sDates.slice(-8)) {
    const rows = sales.filter((r) => r.date === d);
    const salesRows = rows.filter((r) => r.saleType === "판매");
    const rev = salesRows.reduce((s, r) => s + r.gross, 0);
    console.log(`  ${d}: 판매 ${salesRows.length}건 / 판매금액 ${Math.round(rev).toLocaleString()} (총 ${rows.length}행)`);
  }

  const aDates = [...new Set(ad.map((r) => r.date))].sort();
  console.log("\n광고 데이터 최신 8일:");
  for (const d of aDates.slice(-8)) {
    const sp = ad.filter((r) => r.date === d).reduce((s, r) => s + r.spend, 0);
    console.log(`  ${d}: 광고비 ${Math.round(sp).toLocaleString()}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
