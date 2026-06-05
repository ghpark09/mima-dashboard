import Papa from "papaparse";
const AD_BOOK = "1fBShNEzCga_OZ9HRzf4tB0gOdX5NJi5XBTemY-ZmwgU";
async function main() {
  const url = `https://docs.google.com/spreadsheets/d/${AD_BOOK}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("RAW_NAVER_BRAND")}`;
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
  console.log("HTTP", res.status);
  const csv = await res.text();
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((r) => r && Object.keys(r).length > 1);
  console.log("행수:", rows.length);
  console.log("헤더:", Object.keys(rows[0] || {}).join(" || "));
  console.log("\n=== 전체 행 ===");
  for (const r of rows) {
    const o: Record<string, string> = {};
    for (const k of Object.keys(r)) {
      const v = (r[k] || "").trim();
      if (v) o[k.trim()] = v;
    }
    console.log(JSON.stringify(o));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
