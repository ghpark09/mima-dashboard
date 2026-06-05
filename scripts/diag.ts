// 매출시트 원본 구조 진단 — 컬럼 정렬/값 확인
import Papa from "papaparse";

const SALES_BOOK = "1ckzRQ_TJ56rMEi9_OM_KCSLXU_z9Bz-VTrSCO-BMXmQ";
const SALES_GID = "1131251018";

async function main() {
  const url = `https://docs.google.com/spreadsheets/d/${SALES_BOOK}/export?format=csv&gid=${SALES_GID}`;
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
  console.log("HTTP", res.status, res.headers.get("content-type"));
  const csv = await res.text();
  console.log("CSV length:", csv.length);
  const parsed = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: false });
  const rows = parsed.data;
  console.log("총 행수:", rows.length);

  console.log("\n=== 1~3행 (헤더 영역) — [인덱스]값 ===");
  for (let i = 0; i < 3; i++) {
    console.log(`행${i + 1}:`, (rows[i] || []).map((c, j) => `[${j}]${(c || "").trim()}`).join(" | "));
  }
  console.log("\n=== 4~6행 (데이터) ===");
  for (let i = 3; i < 6; i++) {
    console.log(`행${i + 1}:`, (rows[i] || []).map((c, j) => `[${j}]${(c || "").trim()}`).join(" | "));
  }

  // 마지막 데이터 5행
  console.log("\n=== 마지막 5행 ===");
  for (let i = Math.max(3, rows.length - 5); i < rows.length; i++) {
    console.log(`행${i + 1}:`, (rows[i] || []).slice(0, 22).map((c, j) => `[${j}]${(c || "").trim()}`).join(" | "));
  }

  // 현재 매핑(E=4 날짜, U=20 net, V=21 판매구분, I=8 gross) 기준 집계
  let net = 0, gross = 0, salesCnt = 0, promoCnt = 0;
  const byDate: Record<string, number> = {};
  const num = (v: string) => Number(String(v || "").replace(/[, ₩\s]/g, "").replace(/[^0-9.\-]/g, "")) || 0;
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const date = (r[4] || "").trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const type = (r[21] || "").trim();
    const n = num(r[20]);
    net += n;
    if (type === "판매") { gross += num(r[8]); salesCnt++; } else promoCnt++;
    byDate[date] = (byDate[date] || 0) + n;
  }
  console.log("\n=== 현재 매핑 기준 집계 ===");
  console.log("순매출 합(col20):", net.toLocaleString(), "| gross 합(col8, 판매):", gross.toLocaleString());
  console.log("판매행:", salesCnt, "/ 판촉행:", promoCnt);
  const dates = Object.keys(byDate).sort();
  console.log("날짜범위:", dates[0], "~", dates[dates.length - 1]);
  console.log("최근 7일 순매출:");
  for (const d of dates.slice(-7)) console.log("  ", d, byDate[d].toLocaleString());
}
main().catch((e) => { console.error(e); process.exit(1); });
