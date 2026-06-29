import { getDashboardData } from "@/lib/data";
import { Dashboard } from "@/components/dashboard";

// 사용 중단: 자동 재검증 끔(정적). 데이터는 빌드 시점 1회만 가져옴.
// (수기 새로고침 버튼을 누를 때만 갱신됨)
export const revalidate = false;

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
