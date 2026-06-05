import { getDashboardData } from "../lib/data";
const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");
async function main() {
  const d = await getDashboardData();
  console.log("=== 우리 대시보드 5월 광고비 (매체별) ===");
  const may = d.byMonthMedia.filter((r) => r.month === 5);
  let tot = 0;
  for (const m of may) { console.log(`  ${m.label}: ${won(m.spend)}`); tot += m.spend; }
  console.log("  합계:", won(tot));
  console.log("\n=== 네이버 5월 광고유형별 (검색 비용 미보고 확인용) ===");
  const naverSub = d.byDaySub.filter((r) => r.media === "naver" && r.date.slice(5,7) === "05");
  const byCls: Record<string, number> = {};
  for (const r of naverSub) byCls[r.subMedia] = (byCls[r.subMedia] || 0) + r.spend;
  for (const k of Object.keys(byCls)) console.log(`  ${k}: ${won(byCls[k])}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
