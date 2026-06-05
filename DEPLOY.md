# 미마 대시보드 배포 가이드 (Vercel)

링크로 공유 + 매일 오전 10시(KST) 자동 갱신.

## 1단계 — GitHub에 코드 올리기

이미 로컬에 git 저장소가 초기화되어 있고 첫 커밋이 완료되어 있습니다.
GitHub에서 빈 저장소(예: `mima-dashboard`)를 새로 만든 뒤, 그 주소로 push만 하면 됩니다.

```bash
# (GitHub에서 New repository → 이름만 만들고 README 등은 체크 해제)
git remote add origin https://github.com/<내계정>/mima-dashboard.git
git branch -M main
git push -u origin main
```

> gh CLI가 있다면 한 번에: `gh repo create mima-dashboard --private --source=. --push`
> (단, 데이터를 완전 공개로 쓰실 거면 저장소는 private이어도 무방 — 공개되는 건 배포된 웹 링크입니다.)

## 2단계 — Vercel에 연결 (클릭 몇 번)

1. https://vercel.com 로그인 (GitHub 계정으로 가능)
2. **Add New… → Project** → 방금 만든 `mima-dashboard` 저장소 **Import**
3. 프레임워크가 **Next.js**로 자동 인식됨 → 그대로 **Deploy**
4. 1~2분 후 `https://mima-dashboard-xxxx.vercel.app` 링크 발급 → 이 링크를 공유하면 됩니다.

## 3단계 — 매일 오전 10시 자동 갱신 (자동 적용)

- `vercel.json`에 Cron이 설정되어 있어, 배포되면 **자동으로** 매일 `01:00 UTC = 10:00 KST`에
  `/api/cron`이 실행되어 구글 시트 데이터를 새로 불러옵니다.
- (선택) 외부에서 cron 엔드포인트를 못 건드리게 하려면 Vercel 프로젝트
  **Settings → Environment Variables**에 `CRON_SECRET` 값을 추가하세요. (없어도 동작)

## 데이터 연동

- 현재는 **링크 공개된 구글 시트**를 인증 없이 읽습니다 (서비스계정 불필요).
- 더 안전하게 하려면 추후 서비스계정(googleapis) 방식으로 `lib/sheets.ts`의 `fetchCsv`만 교체하면 됩니다.

## 갱신 시각을 바꾸려면

`vercel.json`의 `schedule`(cron 표현식, UTC 기준)을 수정하세요.
예) 매일 09:00 KST = `0 0 * * *`, 매일 11:00 KST = `0 2 * * *`.
