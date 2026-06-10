import Papa from "papaparse";
const AD_BOOK = "1fBShNEzCga_OZ9HRzf4tB0gOdX5NJi5XBTemY-ZmwgU";

async function dump(sheet: string) {
  const url = `https://docs.google.com/spreadsheets/d/${AD_BOOK}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
  const csv = await res.text();
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((r) => r && Object.keys(r).length > 1);
  console.log(`\n========== ${sheet} (HTTP ${res.status}) — 행수 ${rows.length} ==========`);
  const headers = Object.keys(rows[0] || {});
  console.log("헤더(" + headers.length + "개):");
  headers.forEach((h, i) => console.log(`  [${i}] ${h}`));
  console.log("\n--- 샘플 3행 (값 있는 것만) ---");
  for (const r of rows.slice(0, 3)) {
    const o: Record<string, string> = {};
    for (const k of headers) {
      const v = (r[k] || "").trim();
      if (v) o[k] = v;
    }
    console.log(JSON.stringify(o, null, 0));
  }
  // 날짜 컬럼 추정 + 범위
  const dateKey = headers.find((h) => /보고 시작|일자|날짜|시작/.test(h)) || headers[0];
  const dates = [...new Set(rows.map((r) => (r[dateKey] || "").trim()).filter(Boolean))].sort();
  console.log(`\n날짜추정 컬럼: [${dateKey}] / 범위: ${dates[0]} ~ ${dates[dates.length - 1]} (${dates.length}개)`);
}

async function main() {
  await dump("RAW_META_MIMA");
  await dump("RAW_META_NAVER");
}
main().catch((e) => { console.error(e); process.exit(1); });
