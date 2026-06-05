import Papa from "papaparse";

const AD_BOOK = "1fBShNEzCga_OZ9HRzf4tB0gOdX5NJi5XBTemY-ZmwgU";
const TARGET = "2026-06-04";

const num = (v: unknown) => Number(String(v ?? "").replace(/[, ₩\s]/g, "").replace(/[^0-9.\-]/g, "")) || 0;

async function main() {
  const url = `https://docs.google.com/spreadsheets/d/${AD_BOOK}/gviz/tq?tqx=out:csv&sheet=RAW_NAVER`;
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
  const csv = await res.text();
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((r) => r && Object.keys(r).length > 1);
  console.log("총 행수:", rows.length);
  console.log("헤더:", Object.keys(rows[0] || {}).join(" | "));

  const dateKey = Object.keys(rows[0]).find((k) => k.includes("일자")) || "수기입력 사항 일자";
  const revKey = Object.keys(rows[0]).find((k) => k.replace(/\s/g, "").includes("전환매출")) || "총 전환매출액";
  const costKey = Object.keys(rows[0]).find((k) => k.replace(/\s/g, "").includes("총비용")) || "총비용";
  const convKey = Object.keys(rows[0]).find((k) => k.replace(/\s/g, "").includes("총전환수")) || "총 전환수";
  const nameKey = Object.keys(rows[0]).find((k) => k.includes("캠페인 이름")) || "캠페인 이름";
  const clsKey = Object.keys(rows[0]).find((k) => k.includes("캠페인 분류")) || "캠페인 분류";

  console.log(`\n키 — 날짜:[${dateKey}] 비용:[${costKey}] 전환수:[${convKey}] 전환매출:[${revKey}]`);

  // 날짜 분포
  const dates = [...new Set(rows.map((r) => (r[dateKey] || "").trim().slice(0, 10)))].sort();
  console.log("\n네이버 날짜 범위:", dates[0], "~", dates[dates.length - 1], `(${dates.length}일)`);

  const day = rows.filter((r) => (r[dateKey] || "").trim().slice(0, 10) === TARGET);
  console.log(`\n=== ${TARGET} 네이버 행: ${day.length}개 ===`);
  let totCost = 0, totRev = 0, totConv = 0;
  for (const r of day) {
    const cost = num(r[costKey]), rev = num(r[revKey]), conv = num(r[convKey]);
    totCost += cost; totRev += rev; totConv += conv;
    if (rev > 0 || cost > 0)
      console.log(`  [${(r[clsKey] || "").trim()}] ${(r[nameKey] || "").trim().slice(0, 30)} | 비용 ${cost.toLocaleString()} | 전환 ${conv} | 전환매출 ${rev.toLocaleString()}`);
  }
  console.log(`\n${TARGET} 합계 — 비용 ${totCost.toLocaleString()} / 전환수 ${totConv} / 전환매출 ${totRev.toLocaleString()}`);
  console.log("→ 우리 대시보드 '어제 네이버 전환매출'과 비교");
}
main().catch((e) => { console.error(e); process.exit(1); });
