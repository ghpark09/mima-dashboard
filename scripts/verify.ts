import { getDashboardData } from "../lib/data";

const won = (n: number | null) =>
  n == null ? "—" : "₩" + Math.round(n).toLocaleString("ko-KR");

async function main() {
  console.time("fetch+aggregate");
  const d = await getDashboardData();
  console.timeEnd("fetch+aggregate");

  console.log("\n=== 범위 ===");
  console.log("매출:", d.range.salesMin, "~", d.range.salesMax);
  console.log("광고:", d.range.adMin, "~", d.range.adMax);

  console.log("\n=== 합계 ===");
  console.log("순매출(판촉제외):", won(d.totals.netRevenue));
  console.log("총매출(VAT포함):", won(d.totals.grossRevenue));
  console.log("주문수:", d.totals.orders, "/ 수량:", d.totals.units, "/ 판촉:", d.totals.promoCount);
  console.log("총광고비:", won(d.totals.totalSpend));
  console.log("Blended ROAS:", d.totals.blendedRoas ? Math.round(d.totals.blendedRoas) + "%" : "—");
  console.log("AOV:", won(d.totals.aov));

  console.log("\n=== 매체별 ===");
  for (const m of d.byMedia) {
    console.log(
      `${m.label.padEnd(10)} 광고비 ${won(m.spend).padStart(14)} | 전환매출 ${won(m.convRevenue).padStart(14)} | ROAS ${(m.hasRevenue ? Math.round(m.roas) + "%" : "N/A").padStart(7)} | 노출 ${m.impressions.toLocaleString().padStart(12)} | 클릭 ${m.clicks.toLocaleString().padStart(8)} | CTR ${m.ctr.toFixed(2)}%`
    );
  }

  console.log("\n=== 네이버 세분화 ===");
  for (const m of d.byMediaSub.filter((x) => x.media === "naver")) {
    console.log(`  ${m.subMedia.padEnd(14)} 광고비 ${won(m.spend)} | 전환매출 ${won(m.convRevenue)} | ROAS ${Math.round(m.roas)}%`);
  }

  console.log("\n=== 월×매체 (피벗 미리보기) ===");
  for (const r of d.byMonthMedia) {
    console.log(`  ${r.month}월 ${r.label.padEnd(10)} 광고비 ${won(r.spend).padStart(14)} | 전환매출 ${won(r.convRevenue).padStart(14)} | ROAS ${Math.round(r.roas)}%`);
  }

  console.log("\n=== 판매처 TOP5 (순매출) ===");
  for (const c of d.salesByChannel1.slice(0, 5)) {
    console.log(`  ${c.key.padEnd(16)} ${won(c.netRevenue).padStart(14)} | 주문 ${c.orders} | AOV ${won(c.aov)}`);
  }

  console.log("\n=== 월별 매출 추세 ===");
  for (const m of d.monthly) {
    console.log(`  ${m.month}월 ${won(m.netRevenue).padStart(14)} | 주문 ${m.orders} | MoM ${m.momPct == null ? "—" : m.momPct.toFixed(1) + "%"}`);
  }

  console.log("\n=== 캠페인 수:", d.campaigns.length, "===");
  console.log("\n=== 인사이트 ===");
  for (const i of d.insights) console.log(`  [${i.level}] ${i.title}`);

  console.log("\n총 일자 수:", d.daily.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
