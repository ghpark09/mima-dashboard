# Mima Analytics 대시보드 — 인수인계 가이드

> 다른 담당자(및 Claude)가 이 대시보드를 이어받아 관리/통합하기 위한 문서입니다.
> 데이터가 **어디서 어떻게 오는지**, **어떤 로직으로 가공되는지**, **어떻게 배포/수정**하는지 전부 담았습니다.

---

## 0. 한눈에 보기

| 항목 | 내용 |
|------|------|
| 무엇 | 미마(Mima) 광고비·매출 통합 대시보드 (7개 탭) |
| 기술 스택 | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS 3 · shadcn/ui · Tremor · Recharts |
| 코드 저장소 | GitHub: `ghpark09/mima-dashboard` |
| 배포 | Vercel → **https://mima-dashboard.vercel.app** (공개) |
| 자동 갱신 | 매일 **오전 10시(KST)** Vercel Cron + 수기 새로고침 버튼 |
| 데이터 소스 | 구글 시트 2개 워크북 (현재 **링크 공개 CSV**로 인증 없이 읽음) |
| 운영 방식 | 시트에 데이터만 채우면 자동 반영. 코드 수정 시 `git push` → Vercel 자동 재배포 |

**중요 전역 규칙**
- ROAS는 **퍼센트**로 표기 (예: 590%, 절대 5.9x 아님)
- 숫자 **약어 금지** (₩12,418,000 / 절대 ₩12.4M·K 아님)
- 매출 = **판매금액(VAT 포함, 판촉 제외)** 기준
- **오늘(KST) 데이터는 미완성으로 보고 제외** → D-1(어제)까지만 집계

---

## 1. 데이터 소스 (가장 중요)

### 1-1. 매출 워크북
- **워크북 ID**: `1ckzRQ_TJ56rMEi9_OM_KCSLXU_z9Bz-VTrSCO-BMXmQ`
- **탭**: `Raw` (gid `1131251018`) — 매출현황(주문 단위)
- **읽는 방법**: `https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid=1131251018`

### 1-2. 광고 워크북
- **워크북 ID**: `1fBShNEzCga_OZ9HRzf4tB0gOdX5NJi5XBTemY-ZmwgU`
- **탭 5개**:
  - `RAW_KAKAO` — 카카오모먼트 (일별)
  - `RAW_NAVER` — 네이버 (검색/디스플레이, 일별)
  - `RAW_META_MIMA` — 메타(미마 계정, 일별)
  - `RAW_META_NAVER` — ※이름은 네이버지만 실제 **메타 광고** 데이터 (일별)
  - `RAW_NAVER_BRAND` — 네이버 브랜드검색 (**정액 계약제**, 계약 단위)
- **읽는 방법**: `https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet={탭이름}`

### 1-3. 인증 / 함정
- 현재 두 워크북 모두 **"링크가 있는 사람은 누구나 보기"** 상태라 인증 없이 fetch 가능.
  운영 강화가 필요하면 `lib/sheets.ts`의 `fetchCsv()` 한 곳만 **서비스계정(googleapis Sheets API)** 으로 교체하면 됨.
- **카카오 함정**: `RAW_KAKAO`는 `/export?format=csv&sheet=...` 가 **다른 탭**을 반환함 → 반드시 **gviz** 엔드포인트로 읽을 것.

---

## 2. 각 시트 구조 & 파싱 (`lib/sheets.ts`)

### 2-1. 매출 Raw (가장 까다로움)
- **헤더가 3행에 있음** (1~2행은 `#N/A`, `수식` 등 쓰레기) → CSV를 `header:false`로 읽고 **인덱스 4행(0-based index 3)부터** 데이터.
- **컬럼 인덱스 맵** (헤더가 비어있는 칸이 많아 위치로 매핑):
  | idx | 의미 | idx | 의미 |
  |-----|------|-----|------|
  | 1 | 판매처 | 13 | 채널 구분1(정규화) |
  | 4 | 주문일(날짜, YYYY-MM-DD) | 14 | 채널 구분2(온라인/오프라인) |
  | 6 | 상품명 | 16 | 연 |
  | 7 | 수량 | 17 | 월 |
  | 8 | 판매가(VAT 포함, gross) | 18 | 일 |
  | 9 | 구분(SKU) | 19 | 주차 |
  | 11 | 모델명 | 20 | 판매가(-vat) (VAT 제외, net) |
  | 12 | 모델명2 | 21 | 판매구분(판매/판촉) |
- **정제 규칙**:
  - 금액은 텍스트(콤마/공백 포함) → `num()`으로 콤마·공백 제거 후 숫자화 (특히 idx20은 앞뒤 공백 있음)
  - **판촉(판매구분=판촉)은 매출 0** → 매출 집계 시 `판매`만, 또는 net(idx20)은 판촉이 이미 0이라 안전
  - 모델명2의 `선데이 베이지`/`선데이베이지` 같은 공백 중복은 정규화

### 2-2. 광고 시트 공통
- gviz는 1행 헤더. **`makeGetter()`** 로 헤더명을 공백제거+부분일치로 찾아 컬럼 접근(헤더 표기 흔들림 대응).
- 매체별 매핑 함수: `mapKakao` / `mapNaver` / `mapMeta` → 공통 스키마 `AdRow`(media, date, campaign, channelType, classification, subMedia, spend, impressions, clicks, reach, purchases, convRevenue, hasRevenue)로 통일.
- **카카오 날짜** `2026.05.27` → `toISO()`로 `2026-05-27` 정규화.
- **네이버**: `광고 구분`(검색/디스플레이), `캠페인 분류`(파워링크/쇼핑검색/브랜드검색/ADVoost 등)를 `subMedia`로 사용 → "네이버 광고유형별" 분해의 근거.
  - ⚠️ **네이버 검색광고(브랜드검색/파워컨텐츠 등)는 RAW_NAVER에서 비용이 비어있음(미보고)** → 비용 0으로 잡힘.
- **메타**: `RAW_META_NAVER`도 실제로는 메타 광고. `meta_mima`는 전환매출 컬럼이 없어 `hasRevenue=false`.

### 2-3. RAW_NAVER_BRAND (네이버 브랜드검색 — 정액 계약)
- 컬럼: `계약 상태`, `계약 기간`(예: `2026.05.07.~2026.06.05.`), `계약 광고비`, `환급액`, 노출/클릭 등.
- 파싱 로직(`mapNaverBrand`):
  - **`집행 중`·`종료`만** 반영 (`집행 대기`·`집행 전 취소` 제외, 취소는 전액 환급)
  - 순비용 = `계약 광고비 - 환급액`
  - **계약기간 일수로 균등 일별 안분** → 일별 `네이버/브랜드검색` 비용으로 추가
  - **비용만** 추가 (노출·클릭은 RAW_NAVER에 이미 있어 중복 방지 위해 0)
  - **2026-01-01 이후 & 오늘(KST) 이전** 날짜만 반영

---

## 3. 집계 로직 (`lib/transform.ts` → `assembleDashboard`)

입력: 정제된 `SalesRow[]`, `AdRow[]` → 출력: `DashboardData`

- **진입 시 오늘(KST) 제외**: `salesRows`/`adRows`에서 `date >= 오늘(KST)` 제거 → 자정 전까지 D-1까지만.
- 생성 데이터:
  - `daily` — 일별(매출 net/gross, 주문수, 판촉수, 매체별 광고비, 노출/클릭/전환매출 합)
  - `byMedia` / `byMediaSub`(네이버는 광고유형별) — 매체 단위 집계
  - `byMonthMedia`, `byDayMedia`, `byDaySub`(일×매체×유형), `byDayCampaign`(일×캠페인) — **기간 필터용 granular**
  - `salesLite`(판매 행 경량), `channelYesterday`, `channelThisMonth`, `salesByChannel1/Vendor/Model/Product`, `onlineOffline`, `monthly`, `weekly`
  - `campaigns`, `insights`(근거 기반 자동 제안)
  - `today`(KST, D-1 판정용), `range`, `totals`, `latestDay`, `prevDay`
- **지표 정의 (반드시 유지)**:
  - 종합/판매처/추세 매출 = **판매금액(gross, VAT포함, 판촉제외)**
  - **종합 ROAS = 판매금액 ÷ 광고비**(실매출 기준, 예: 어제 60%)
  - **매체효율 ROAS = 매체 보고 전환매출 ÷ 광고비** → **과대치(기여기간·중복)라 "참고용"으로 회색 표기**
  - 광고비율 = 광고비 ÷ 판매금액, CTR = 클릭/노출, CPC = 광고비/클릭, CPA = 광고비/구매
  - **비율(CTR/CPC/ROAS/빈도)은 절대 합산 금지** → 집계 후 분자/분모로 재계산 (`lib/period.ts`의 `totalOf`, `byMediaInRange` 등)
  - **도달(reach)은 비가산**, 기여기간은 **7일** 일관

---

## 4. 화면 (`components/`)

- `dashboard.tsx` — 셸(헤더, 탭 네비, 활성 탭만 렌더, KST 갱신시각, 새로고침 버튼)
- `tabs/` — 7개 탭:
  1. `home.tsx` — 종합 요약(⚡어제 성과 + 📅이번 달 + 일별추이 + 채널 + 개선제안 + **데이터 신선도 경고**)
  2. `daily.tsx` — 일별 성과(기간 필터)
  3. `media-efficiency.tsx` — 매체 광고효율(어제 요약 + 기간 필터 + 합계행 + 네이버 광고유형별)
  4. `sales-channel.tsx` — 판매처별 매출(기간 필터)
  5. `trend.tsx` — 추세·누적
  6. `monthly-media.tsx` — 월별 매체 리포트(기간 필터 + Excel 다운로드)
  7. `campaign.tsx` — 채널·캠페인 분석(기간 필터)
- `period-picker.tsx` — 공통 기간 필터(어제/7일/30일/이번달/전체 + 직접선택)
- `refresh-button.tsx` — 수기 새로고침

---

## 5. 파일 구조 요약

```
lib/
  sheets.ts      구글시트 fetch + 파싱 (← 데이터 소스/인증 변경은 여기)
  transform.ts   정제 데이터 → 집계 (← 지표/인사이트 로직)
  types.ts       전체 타입
  period.ts      기간 필터 재집계 유틸
  format.ts      ₩/%/숫자 포맷 (약어 금지 규칙)
  data.ts        getDashboardData() = fetch + assemble
app/
  page.tsx       서버 컴포넌트(데이터 fetch, revalidate=3600)
  api/cron       매일 10시 cron (revalidate)
  api/refresh    수기 새로고침 (revalidateTag 'sheets')
  api/export     월별 매체 리포트 Excel(.xlsx) 다운로드 (exceljs)
components/      위 화면들
vercel.json      cron 스케줄 (0 1 * * * = UTC 01:00 = KST 10:00)
```

데이터 캐시: fetch에 `tags:['sheets']` + `revalidate:3600`. 새로고침/cron이 `revalidateTag('sheets')`로 강제 재요청.

---

## 6. 배포 & 운영

- **수정 흐름**: 코드 수정 → `git push` (main) → **Vercel 자동 재배포** (링크 불변).
- **데이터 갱신**: 시트만 채우면 매일 10시 자동. 늦으면 헤더 **새로고침** 버튼.
- **갱신 시각 변경**: `vercel.json`의 cron(UTC) 수정. 예) KST 09시 = `0 0 * * *`.
- **로컬 실행**: `npm install` → `npm run dev`. 빌드 검증 `npm run build`.
  - ⚠️ **스택 주의**: 최신 shadcn은 Tailwind v4 기반이라 Tremor(v3)와 충돌. 이 프로젝트는 **Tailwind 3 + shadcn(v3 형식) + Tremor + Recharts**로 고정해둠. 버전 올릴 때 주의.
  - `tailwind.config.ts`는 `relative:true`, `postcss.config.mjs`는 절대경로 — cwd 달라도 동작하도록 처리됨.

---

## 7. 알려진 한계 / 주의 (통합 시 꼭 인지)

1. **네이버 검색광고 비용 미보고**: RAW_NAVER의 검색유형(파워링크/쇼핑검색/파워컨텐츠 등)은 비용이 비어있음. 현재 **브랜드검색만** `RAW_NAVER_BRAND`로 보정. 나머지 검색유형 비용을 반영하려면 별도 정액/비용 시트 필요.
2. **메타 전환매출**: 미마 계정은 전환매출 컬럼 없음(N/A), 네이버 계정은 희박. 매체 ROAS는 과대치라 "참고용".
3. **매체↔판매채널 매핑**: 공통키 없음. 카카오/네이버는 비교적 명확, 메타는 저신뢰(상단퍼널).
4. **기간 불일치**: 매출은 1~6월, 광고는 매체별로 시작일 다름(브랜드검색은 1월~, 나머지 5월~).
5. **개인 식별 불가**: 공개 대시보드(로그인 없음)라 "누가 봤/새로고침했나"는 기록 불가.

---

## 8. 자주 하는 수정 (다른 Claude에게 주는 팁)

- **새 광고 시트/매체 추가**: `lib/sheets.ts`에 `fetch + map함수` 추가 → `fetchAdRows()`에 합치기. 나머지(집계·화면)는 자동으로 따라옴.
- **새 지표/탭 추가**: `types.ts`(타입) → `transform.ts`(집계) → `components/tabs/`(화면) 순.
- **매출 기준(VAT) 변경**: 화면들이 `grossRevenue`(VAT포함) 사용 중. `netRevenue`로 바꾸려면 탭에서 필드만 교체.
- **검증**: 데이터 의심 시 `scripts/`의 `verify.ts`, `diag*.ts`, `latest.ts`를 `npx tsx scripts/xxx.ts`로 실행하면 시트 원본·집계 수치를 콘솔로 확인 가능.

---

## 9. 다른 Claude 세션 시작 멘트 (복붙용)

> 이 레포(`ghpark09/mima-dashboard`)는 미마 광고비·매출 통합 대시보드입니다. 데이터는 구글시트 2개 워크북(매출 1개 탭 + 광고 5개 탭)을 `lib/sheets.ts`에서 공개 CSV로 읽어 `lib/transform.ts`에서 집계합니다. `ONBOARDING.md`에 데이터 소스·파싱·지표 규칙·배포가 전부 정리돼 있으니 먼저 읽어주세요. 수정은 `git push` 하면 Vercel이 자동 배포합니다.
