import { getDashboardData } from "@/lib/data";
import { Dashboard } from "@/components/dashboard";

// 매일 갱신 컨셉: 1시간마다 재검증 (cron으로 보강 가능)
export const revalidate = 3600;

export default async function Page() {
  let data;
  try {
    data = await getDashboardData();
  } catch (e) {
    return (
      <main className="mx-auto max-w-2xl p-10">
        <h1 className="text-xl font-bold text-red-600">데이터를 불러오지 못했습니다</h1>
        <p className="mt-2 text-sm text-slate-600">
          구글 시트 접근에 실패했습니다. 시트 공유 설정 또는 네트워크를 확인해 주세요.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded bg-slate-100 p-3 text-xs text-slate-700">
          {String(e)}
        </pre>
      </main>
    );
  }
  return <Dashboard data={data} />;
}
