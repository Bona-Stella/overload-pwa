# UI v0.9 T01 — 공통 앱 셸·디자인 기반

2026-11-05 (Asia/Seoul). `main`에서 구현했다. 초기 구현 시에는 미커밋으로 보고했으며, 이후 사용자 요청에 따라 아래 최종 검토와 로컬 커밋 범위를 확정했다. 원격 push는 하지 않는다.

## 결과와 범위

실제 계정 경로에 홈/루틴/기록/설정 4탭과 Onyx 디자인 기반을 적용했다. 기존 화면별 기능 패널을 재배치하며 인증·API·운동 controller/model·IndexedDB·동기화 계약을 재사용한다. T01은 화면별 v0.9 전체 구현 또는 디로딩 구현 완료를 의미하지 않는다.

- 로그인 전에는 기존 로그인·OTP 화면을 유지하며 계정 탭과 PWA 설치 패널을 표시하지 않는다.
- 홈에는 기존 루틴 선택 경로, 진행 운동 이어가기, 미확인 START 재확인, 일반 일정 패널을 제공한다. 오늘의 루틴 전체 UI나 과거 일정의 완료 판정은 추가하지 않았다.
- 루틴 탭에서 기존 조회·생성·편집·삭제·중량 승인과 일정 패널을 사용한다.
- 기록 탭에서 기존 통계·성장 조회·종료 이력·상세·정정·논리 삭제·선택 복구에 접근한다. 다섯 번째 통계 탭은 만들지 않았다.
- 설정 탭에 기존 계정 관리, 조회된 휴식 시간, PWA 설치/업데이트 안내와 하단 로그아웃을 배치했다. 휴식 시간 편집 API를 새로 연결하거나 미구현 설정을 추가하지 않았다.
- 운동 집중 화면과 루틴 편집에서는 하단 탭을 숨긴다. 집중 화면의 세션 메타 패널은 펼쳐 확인할 수 있으며 다른 기기의 읽기 전용 세션에서는 처음부터 펼친다.

## 상태와 데이터 보호

`AuthProvider`, 인증 controller, 운동 API/controller/model, IndexedDB version 3 / local schema 2, 고정 요청·ACK·writerEpoch 계약은 그대로 사용한다.

탭 전환과 운동 홈 복귀는 기존 exit guard의 초안 저장 결과를 기다린다. 실패하면 화면 이동을 보류하고 초안을 유지한다. 비동기 저장 대기 후에도 계정·가드 식별이 같은지 확인한다. 운동 집중 화면을 벗어나도 편집기는 같은 계정/세대/세션/기기/epoch key로 마운트를 유지한다. 일정·루틴·기록 패널도 탭 숨김만으로 초안을 버리지 않는다. 계정 상세 진입·로그아웃은 기존 저장 확인 및 인증 경계를 따른다.

계정/세대 변경 시 기존 패널의 데이터와 편집기 접근은 기존 scope 검증으로 제거한다. 서버 세대는 API 재조회로 확인하며, 인증 session 응답에 없는 세대 정보를 추정하지 않는다. 로컬 원본을 삭제하거나 다시 쓰지 않는다.

## 디자인 시스템과 아이콘

- CSS Custom Properties + CSS Modules. 페이지 `#111216`, 카드 `#1B1D22`, 내부/입력 `#25282E`.
- 본문 `#F0F1F4`, 보조 `#A9ADB7`, 일반 강조 `#6C93C6`, 디로딩 표시 강조 `#78B89A`, CTA 글자 `#111820`.
- Visual Theme Spec의 두 강조 카드 그라데이션·상태색, 경계·초점·차트·간격·모서리·장비 보조 글자 토큰을 준비했다.
- 계정 셸 안에서 기존 기능 CSS를 역할 토큰으로 연결한다. `/demo`, `/auth-preview`의 전역 CSS를 다시 작성하지 않았다.
- 공통 Button/Card/SectionHeading/Field/StatusNotice/Metadata/Help와 AppShell을 추가했다. Dialog/RepsInput/WeightInput의 기존 동작은 재사용한다.
- 도움말은 시각 지름 16px, 버튼 44px이다. 재터치·바깥 터치·Escape로 닫을 수 있다. 필수 저장 실패 경고는 팝오버 안으로 옮기지 않았다.
- 원본 PNG 6종을 Vite asset URL로 참조하고 32 CSS px로 표시한다. 검색 API에 근육 분류가 없으므로 실제 검색 결과에는 중립 플레이스홀더를 사용한다. 이름으로 근육/아이콘을 추측하지 않는다.
- 운영 셸은 일반 테마만 사용한다. 개발 전용 `/ui-foundation`에서 두 색상과 공통 입력·타이머·아이콘을 검증한다. 이 경로에는 인증·운동 저장·디로딩 상태 연결이 없으며 프로덕션 JavaScript에서 제거된다.

## 생성·수정 파일

| 구분 | 파일 |
|---|---|
| 신규 앱 기반 | `src/app/AppShell.tsx`, `AppShell.module.css`, `theme.module.css`, `types.ts` |
| 신규 개발 검증 | `src/app/FoundationPreview.tsx`, `FoundationPreview.module.css` |
| 신규 공통 표현 | `src/components/ui.tsx`, `ui.module.css`, `ExerciseIcon.tsx`, `ExerciseIcon.module.css` |
| 계정 셸 연결 | `src/features/auth/AuthApp.tsx`, `AccountSettings.tsx` |
| 기존 운동 패널 배치·표시 | `src/features/workout-online/WorkoutWorkspace.tsx`, `ExerciseSearch.tsx`, `online.css`; `src/features/workout-local/LocalWorkoutScreen.tsx`의 장비 보조 글자 표현 |
| 진입점·PWA 색상 | `src/main.tsx`, `index.html`, `public/manifest.webmanifest` |
| 자동 테스트 | 신규 `tests/app-shell.test.mjs`; 수정 `tests/auth-ui.test.mjs`, `tests/fixtures/workspace-boundary.jsx` |
| 브라우저 검증 | 신규 `tests/fixtures/t01-app.jsx`, `tests/fixtures/run-t01-browser.mjs` |
| 보고서 | 이 문서 |
| 최종 검토 문서 | `README.md`, `docs/engineering/frontend.md` |

## 검증 결과

| 검증 | 결과 |
|---|---|
| `npm run build` | TypeScript와 Vite production build 통과 |
| `npm run lint` | 통과 |
| `npm test` | 507개 통과, 실패/skip 0 |
| `node tests/fixtures/run-t01-browser.mjs` | 격리된 headless Chrome의 8개 검증 그룹 통과 |
| `git diff --check` | 통과 |
| 원본 아이콘 | 빌드된 6 PNG의 SHA-256이 공식 manifest와 일치 |
| 프로덕션 PWA | 실제 서비스 워커가 제어하는 페이지에서 네트워크를 끊고 6 PNG를 캐시에서 조회, 각 SHA-256 일치 |

브라우저 검증은 393×852 CSS px 모바일 뷰포트에서 수행했다. 실제 AuthController/WorkoutWorkspace/LocalWorkoutScreen/IndexedDB를 사용하되 HTTP 응답만 테스트 fixture에서 제공했다. 개인 DB·실제 Backend·외부 인증 서버에 접속하지 않았다.

검증한 시나리오:

1. 로그인 전 탭·설치 패널 숨김과 기존 인증 조작 유지.
2. 로그인 후 4탭, 루틴·통계·계정·PWA 접근, 루틴 편집 중 탭 숨김.
3. IndexedDB 저장 실패 후 운동 홈 이동 차단과 화면 초안 보존.
4. 홈/기록/설정 왕복 후 동일 운동 입력 DOM·정확한 초안·시작 시각·휴식 종료 시각·epoch·고정 snapshot 원문 유지.
5. 서버 실패 이후 기존 동기화 재시도와 ACK 수용.
6. 로그아웃 안전 확인, API 재조회 후 세대 경계 및 계정 전환의 화면 차단과 IndexedDB 원본 보존.
7. 두 테마 전환 후 입력 DOM·입력값·경과 시간 유지, 아이콘 32px/원본 128px, Help Escape 및 Dialog 초점 복귀, 가로 넘침 없음.
8. 프로덕션 번들 및 서비스 워커의 원본 아이콘 오프라인 제공.

스크린샷은 `logs/ui-v09-t01/`의 `login-393.png`, `home-393.png`, `settings-393.png`, `workout-393.png`, `logout-393.png`, `blue-preview-393.png`, `mint-preview-393.png`다. 기계 판독 결과는 같은 디렉터리의 `browser-result.json`이다. logs/dist는 Git 제외 산출물이다.

초기 전체 테스트의 loopback 연결은 샌드박스에서 EACCES로 거부되어 권한이 허용된 로컬 테스트 실행으로 검증했다. 기존 인증 화면 기대값과 통계 fixture의 진입 위치는 새 셸/기록 탭에 맞춰 수정했다. 신규 브라우저 fixture의 저장 경로·평가 문자열·클릭 초점 문제도 수정한 뒤 최종 통과했다. 제품의 저장 검증을 완화하지 않았다.

최종 시각 검토에서 설정 카드 간격을 보완한 뒤 build/lint와 브라우저 검증을 다시 통과했다. 실행한 서버와 테스트 Chrome은 종료하고 생성한 전용 임시 프로필만 정리했다.

실제 iPhone 15 Safari·홈 화면 설치형 PWA, 실제 OTP/Google 인증, 실제 Backend·개인 DB 통합은 이번 검증에 포함하지 않았다. 이들을 모바일 Chrome 시뮬레이션이나 SSR 결과와 동일하게 취급하지 않는다.

## T02 및 이후 잔여 작업

- 오늘 루틴의 실제 일정 기반 선택·구획·두 줄 목록, 주간 7열 날짜와 확정 수행 상태.
- 루틴 편집 전체 배치·요일 교체 확인과 별도 저장 API의 부분 성공 처리.
- 운동 준비 단계, 기준 기록 조회/표, 3열 타이머와 누적 종목 위치, 완료 세트 컨트롤·종목 이동 및 종료 동선.
- 결과·과거 상세의 종목/세트 볼륨과 WEIGHT/CARDIO 구획, 정정/복구 UI 정리.
- Recharts 설치와 필터별 날짜 시계열·제조사별 집계·성장 별칭 조회 계약.
- 휴식 온라인 편집 상세, 카탈로그 근육·분류·상세·아이콘 매핑 계약.
- 디로딩 분석·자격·기간·임시 일정·세션 소속·권한·동기화 계약과 서버 구현. 이번 테마 토큰은 해당 구현을 뜻하지 않는다.

## 기존 변경 및 Git

작업 시작 시 PWA는 `main` / `fb33d44`였으며 `README.md`, `docs/engineering/frontend.md`만 미커밋이었다. 두 파일의 기존 변경(합계 24줄 추가/24줄 삭제)은 수정하지 않았다. package/lockfile 및 공식 아이콘 원본도 변경하지 않았다.

백엔드 저장소는 변경하지 않았다. 신규 브랜치·A/B 복구·패키지 설치·실제 DB 변경·commit/push는 수행하지 않았다. 결과는 미커밋 작업 트리로 남긴다.

위 두 문단은 초기 T01 구현 종료 시점의 기록이다.

## 최종 검토·로컬 커밋 범위

사용자 요청으로 T01 구현·테스트·보고서와 기존 `README.md`, `docs/engineering/frontend.md` 변경을 함께 검토했다. 두 문서의 기존 변경은 CSS Modules 채택·자체 컴포넌트·Recharts 후속 설치 등 T01 설계와 관련돼 있으며, 무관하거나 별도의 미완성 작업은 확인되지 않았다.

README의 일반 CSS 전용 설명·프로토타입 중심 구조·도입 예정 도구 표기·기반 구축 체크, frontend 문서의 T01 이전 배치 및 삭제된 A/B 작업 트리를 현재 자료처럼 안내하는 문구를 실제 구현에 맞춰 정리했다. 현재 계정 셸과 후속 화면 구현, 운영 테마와 개발 검증 테마를 구분했다. 공식 UI 설계·아이콘 원본·API·백엔드는 변경하지 않고 T02 구현도 시작하지 않는다.

전체 테스트·build·lint·브라우저·문서 내부 링크·diff 검증 후 관련 변경만 스테이징하여 `feat(ui): establish v0.9 app shell and design system` 메시지로 로컬 커밋한다. 초기 보고서의 두 문서 무수정·미커밋 표기는 이 최종 검토 단계와 구분하며, 커밋 해시와 최종 Git 상태는 커밋 결과로 보고한다.

최종 재검증은 자동 테스트 507/507, build·lint, 브라우저 8개 검증 그룹, 세 문서의 내부 파일/제목 링크 74개 모두 통과했다. 공식 제품 문서·자산과 package/lockfile은 변경하지 않았다. 실제 iPhone·Backend·개인 DB 검증 범위는 위 제한을 유지한다.
