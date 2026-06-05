import { fetchAdRows, fetchSalesRows } from "./sheets";
import { assembleDashboard } from "./transform";
import { DashboardData } from "./types";

/** 5개 시트를 읽어 통합 대시보드 데이터로 집계 */
export async function getDashboardData(): Promise<DashboardData> {
  const [salesRows, adRows] = await Promise.all([fetchSalesRows(), fetchAdRows()]);
  return assembleDashboard(salesRows, adRows);
}
