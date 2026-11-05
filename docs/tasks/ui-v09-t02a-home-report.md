# UI v0.9 T02-A — 실제 API 홈과 격리 검토 환경

> 아래는 최초 T02-A 구현 시점의 기록이다. 이후 홈 UI·검토 환경은 [설계 일치·iPhone 검토 개선 보고서](ui-v09-t02a-design-review-report.md)에서 수정했다. 현재 접속·로그인·검증 방법과 UI 상태는 이 최신 보고서를 따른다.

검토일: 2026-11-05. PWA `main`, T01 기준 `ad8d664a1a5ef60caea96d5787a12bfe01875988`. 사용자 화면 검토 전이므로 커밋·push하지 않았다.

## 1. 구현 완료 범위

- 실제 로그인 계정의 `AppShell` 안에 일반 모드 홈을 구성했다. Onyx·Dusty Blue·기존 공통 컴포넌트와 CSS Modules를 재사용한다.
- 헤더/실제 날짜 → 오늘 카드 → 카드 밖 운동 시작 → 오늘만 루틴 선택 → 주간 일정 → 최근 기록 순서다. WEIGHT/CARDIO 구획별 총 종목 수와 1부터 시작하는 번호, 오른쪽 저장 계획값을 표시한다. 운동명은 말줄임 처리한다.
- 오늘의 기본 루틴은 현재 적용 일정에서 찾는다. 휴식일·미등록·조회 실패를 구분한다. 오늘만 선택은 날짜가 붙은 UI 상태이며 일정 PUT을 호출하지 않는다. 탭 이동 동안 유지하고 날짜·계정·세대가 바뀌면 다른 날짜/계정 선택을 적용하지 않는다.
- 목록·상세는 실제 API를 읽는다. 상세 성공값은 루틴 ID+버전별로 재사용하고 최대 4개 동시 조회로 제한한다. 새로고침은 목록·일정을 다시 읽고 상세 캐시도 비운다.
- 일정 등록 시간대로 날짜를 계산하고 월~일을 표시한다. 과거 계획은 overview의 확인된 이력을 사용한다. 완료 `✓`, 미수행 `×`, 휴식 `–`, 확인 불가 `?`를 구분한다. 일부 달성은 `△`, 수행 기록이 있지만 달성 0인 경우는 `계획 미달`로 설명한다. 오늘/미래는 요일을 유지한다. 선택 날짜의 전체 이름과 상태, 예약 변경 적용일을 표시한다.
- 최근 3개 종료 기록의 저장된 이름·운동 날짜와 상세 snapshot의 실제 완료 웨이트 세트/유산소 건수를 표시한다. 상세 실패를 0건으로 대체하지 않는다. 기존 기록 상세로 이동한다.
- START는 기존 controller·고정 요청·로컬 저장을 그대로 사용한다. 홈 시작의 중복 실행을 막고 직전 루틴 재조회·버전·계정·세대를 확인한다. 진행 중 운동 이어가기와 미확인 START 재확인을 재사용한다.
- 운동 편집기·입력·타이머·IndexedDB·writerEpoch·snapshot·ACK·오프라인/로그아웃 보호 로직은 교체하지 않았다. 탭 이동으로 운동 편집기를 재마운트하지 않는다.

판정 기준은 Decision Log 10.11, 화면 구조는 Wireframe/UI-UX, 실제 색상은 Visual Theme Spec이다. 공식 설계 문서·아이콘 원본은 변경하지 않았다.

## 2. 실제 연동 API

| API | 홈에서 사용하는 정보/동작 |
|---|---|
| `GET /api/v1/routines`, `GET /api/v1/routines/{id}` | 현재 목록·버전, 저장된 순서·장비/중량·세트·반복 범위·유산소 계획 |
| `GET /api/v1/weekly-schedule?timeZone=…` | 등록 시간대, 현재 일정, 미래 예약과 적용일 |
| `GET /api/v1/statistics/overview?fromDate=…&toDateExclusive=…` | 해당 주의 계획 이력/달성 근거와 기간과 무관한 최근 종료 세션 3개 |
| `GET /api/v1/workout-sessions/{id}` | 최근 실제 수행 및 기존 기록 상세 |
| `GET /api/v1/workout-sessions/active`, `POST /api/v1/workout-sessions` | 기존 controller의 진행 세션 확인·고정 START |
| 기존 인증·CSRF·snapshot·FINISH 등 | 실제 로그인, 쓰기 소유권 확인, 기존 운동 진입·저장 |

일정 쓰기는 기존 루틴 탭의 `WeeklySchedulePanel`에서만 수행한다. DTO·API·운영 서버 코드·스키마를 신설하거나 변경하지 않았다. 최근 목록은 overview가 제공하는 전역 최근 3개이며, 실제 수행 건수는 각 세션 상세를 별도 조회한다. 장비는 기존 운동 진입 화면에서 저장된 계획을 확인할 수 있다.

## 3. 생성·수정 파일

PWA:

- `src/features/home/{HomePanel.tsx,Home.module.css,model.ts,load.ts}` — 홈 표현·날짜/계획 매핑·실제 조회와 캐시.
- `src/features/workout-online/WorkoutWorkspace.tsx` — 기존 controller와 홈 연결, 기존 편집기·탭 보호 유지.
- `tests/home.test.mjs` — 신규 8개 단위/SSR/조회 테스트.
- `tests/fixtures/run-home-review-browser.mjs` — 실제 production PWA/API E2E·스크린샷·테스트 세션 API 정리.
- `tests/fixtures/run-t01-browser.mjs` — T01 보호 검사의 홈 대기 문구만 현행 화면으로 갱신.
- `scripts/home-review.ps1`, `scripts/home-review-server.mjs` — 명시적 검토 실행·상태·수신함·종료, 신원을 확인한 동일 연결로 API 전달.
- `README.md`, `docs/engineering/frontend.md`, 이 보고서 — 구현 현황·사용 안내.

서버(검토 전용):

- `src/test/java/com/overload/testfixture/HomeReviewEnvironment.java` — 기존 실제 OTP/서버와 신규 격리 PostgreSQL을 사용한 HTTP 시드·로컬 메일 수신함.
- `src/test/java/com/overload/testfixture/V22BrowserEnvironment.java` — 기본 실행은 유지하고 추가 test configuration을 넘기는 진입점 및 package-private context 접근 추가.
- `scripts/home-review.gradle` — 명시적 init script로 test runtime classpath 생성. 일반 `bootRun`·운영 패키징에는 들어가지 않는다.

패키지·lockfile·DB migration은 변경하지 않았다.

## 4. 검토 DB와 샘플

현재 실행: `b4972e78-a439-42c0-8a28-2f345d767eac`.

| 항목 | 실제 확인 결과 |
|---|---|
| PostgreSQL | `18.6`, 신규 `overload_v22_isolated`, loopback `32800`, tmpfs 전용, 실행 UUID 라벨 |
| 마이그레이션 | 실제 `flyway_schema_history`의 성공한 V1~V22 및 Hibernate validate 확인 |
| 격리 | 개인 `overload_dev`에 연결하지 않았고 기존 개인 PostgreSQL 컨테이너는 중지 상태로 유지 |
| 계정 | 검토 계정 `home-b4972e78@example.test`, 인프라 검증용 별도 빈 계정 1개 |
| 루틴 | 상체 PUSH(5세트), 하체·등(7세트), 전신 근력+러닝머신 20분/8km/h 혼합(긴 이름) |
| 장비 | 검토용 제조사, PLATE/STACK, 승인 중량·반복 범위를 실제 루틴 API로 저장 |
| 일정 | 월·화·목·토 운동, 수·금·일 휴식. 오늘 목요일에 혼합 루틴. 다음 월요일 11/09 적용 예약 별도 등록 |
| 완료 기록 | 10/26 상체 5세트, 10/29 하체·등 7세트, 11/02 상체 5세트. 실제 중량·반복으로 서버 평가·통계 생성 |
| 이번 주 상태 | 월 완료, 화 미수행, 수 휴식, 목 오늘, 토 예정. 서버 overview 근거로 확인 |
| 진행 운동 | 기본 샘플 없음. E2E START는 FINISH 후 논리 삭제 API로 정리해 현재 활성 세션 없음 |

운동·수행·일정·완료·평가는 실제 인증된 HTTP API로 만들었다. SQL 쓰기는 개발용 표준 운동/제조사/근육 카탈로그 정의에만 사용했다. 과거 일정의 최초 등록과 수행 날짜를 일관되게 준비할 때만 test configuration의 Clock을 사용하고, 준비 완료 전에 시스템 UTC 시각으로 복귀했다. 사용자가 조작하는 서버는 현재 시각으로 동작한다. 실제 API의 루틴 3개·최근 종료 3개를 시드 단계에서 검증한다.

개인 DB의 현재 V18~V22 적용 여부는 조회하지 않았다. 개인 DB의 마지막 기록은 V17이며, 이번 V22 확인은 **전용 신규 검토 DB**에 한정한다. 개인 DB에 후속 migration을 적용한 것으로 해석하지 않는다.

## 5. 실행·접속·인증

현재 검토 DB·Backend·PWA는 사용자 검토를 위해 실행 중이다.

- PWA: **http://127.0.0.1:3000/** (`/demo`가 아닌 실제 계정 앱, production build).
- 실제 Backend: `http://127.0.0.1:6818` (브라우저에서는 PWA의 동일 출처 프록시 사용).
- DB: `127.0.0.1:32800/overload_v22_isolated`. 임시 비밀번호는 저장소·보고서에 기록하지 않는다.

PowerShell에서 PWA 저장소를 현재 디렉터리로 사용한다. Docker Desktop, 설치된 JDK 25, 기존 npm/Gradle 의존성이 필요하다. 이 작업에서 신규 패키지는 설치하지 않았다.

```powershell
cd C:\Users\Home\Desktop\Study\overload-pwa
.\scripts\home-review.ps1 -Action Start
.\scripts\home-review.ps1 -Action Status
```

`Start`가 서버의 test runtime classpath를 빌드하고 신규 PostgreSQL·실제 Spring Boot를 시작한 뒤 API 샘플을 생성한다. 이어 `npm run build`와 Node production preview를 실행한다. 이미 실행 중인 검토 DB는 재시드하지 않는다. JDK 위치가 다르면 `-JavaHome 'JDK 25 경로'`를 지정한다. 배경 창은 숨겨진다.

로그인:

1. PWA의 이메일 주소에 위 검토 계정을 입력하고 **이메일로 계속하기**를 누른다.
2. 로컬 터미널에서 아래 명령을 실행한다.
3. 표시된 `code`를 입력해 **코드 확인**을 누른다. 수신함은 검토 계정의 가장 최근 유효한 미사용 로그인 코드만 표시한다. 요청 전·사용 후·만료 후에는 비어 있다. 새 요청은 이전 코드를 무효화한다.

```powershell
.\scripts\home-review.ps1 -Action Inbox
```

메일 전달만 기존 test FakeSender로 대체했다. OTP 발급·만료·재요청/입력 제한·검증·서버 세션·CSRF·사용자 소유권은 실제 인증 로직이다. Google 외부 인증은 이 격리 환경에서 비활성이다. OTP/쿠키/토큰은 보고서·Git·스크린샷에 포함하지 않는다. 재발송 제한에 걸리면 화면의 서버 대기 시간을 따른다.

초기 상태를 새로 준비하려면:

```powershell
.\scripts\home-review.ps1 -Action Stop
.\scripts\home-review.ps1 -Action Start
```

`Stop`은 신원을 확인한 이 실행의 preview/Backend와 임시 컨테이너만 종료한다. 해당 **검토 데이터는 tmpfs와 함께 사라지고**, `Start`가 새로운 실행 UUID·DB 포트·이메일과 검토 당일 기준 샘플을 만든다. 새 값은 `Status`로 확인한다. 개인 DB 초기화 명령은 없다. 작업 이후 날짜가 바뀌어 당일 샘플을 다시 준비할 때도 이 절차를 사용한다. UI에 초기화 버튼은 추가하지 않았다.

프론트엔드만 다시 빌드하려면 PWA에서 `npm run build`를 실행한 뒤 페이지를 새로고침한다. 백엔드 단독 실행이 필요하면 서버 저장소에서 `gradlew.bat --no-daemon -I scripts/home-review.gradle homeReviewClasspath` 후, 생성된 `build/home-review/classpath.txt`를 `java -cp`에 전달해 `com.overload.testfixture.HomeReviewEnvironment <새 UUID>`를 실행한다. 일반 `bootRun`으로 개인 DB를 대신 사용하지 않는다. 통합 `Start`는 이 과정을 안전하게 자동화한다.

## 6. 직접 확인할 기능

1. 로그인 후 오늘의 혼합 루틴, WEIGHT/CARDIO 각각의 번호·오른쪽 계획과 카드 밖 START를 확인한다.
2. 오늘만 선택 목록을 펼치고 상체/하체로 바꾼다. 카드가 바뀌고 주간 일정의 목요일 원래 계획은 유지되는지 확인한다. 원래 일정으로 되돌릴 수도 있다.
3. 주간 일정의 월/화/수/오늘/토를 각각 누른다. 전체 이름·완료/미수행/휴식/예정과 11/09 예약 적용 안내를 확인한다.
4. 최근 기록을 눌러 기존 실제 기록 상세로 이동한다. 기록·설정·루틴·홈 탭도 확인한다. 일정 편집은 루틴 탭에 있다.
5. 원하는 루틴을 골라 **운동 시작**을 누른다. 기존 준비운동/진행 화면과 세트 입력·타이머를 조작한다. **홈으로 · 운동은 계속 보존** 후 다른 탭을 거쳐 **운동 이어가기**로 돌아온다.
6. 사용자 본인이 시작한 운동은 기존 완료 경로로 종료한다. 초기 샘플로 되돌리고 싶다면 위 전용 `Stop`/`Start`를 사용한다.

## 7. 실제 데이터 스크린샷

로컬 산출물 폴더: `logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/` (Git 제외).

| 파일 | 내용/데이터 출처 |
|---|---|
| `home-full-393.png` | 실제 API로 채운 전체 홈, 393 CSS px 폭 |
| `today-routine-393.png`, `weekly-393.png` | 실제 오늘 카드·주간 상태 |
| `routine-chooser-393.png`, `before-start-393.png` | 실제 루틴 펼침·오늘만 선택 후 시작 전 |
| `workout-entry-393.png` | 실제 START 후 기존 운동 화면 |
| `home-desktop-1440.png` | 실제 데이터, 1440px 데스크톱 |
| `home-small-320.png` | 실제 데이터, 320px 작은 화면 |
| `empty-real-account-393.png` | 실제 별도 빈 계정·실제 API |
| `loading-injected-393.png`, `error-injected-393.png` | 실제 앱에서 **검증 도구가 일정 응답 지연/503을 주입한 사례**. 실제 서버 장애나 실제 샘플 데이터로 오인하지 않는다 |
| `browser-result.json` | 실제 API 경로·응답 상태·6개 검증 결과. OTP/쿠키는 기록하지 않음 |

393×852 및 320px 폭에서 가로 overflow를 확인했다. 전체 페이지 캡처는 고정 하단 탭이 중간 내용을 가리지 않도록 동일 폭에서 캡처 높이만 늘렸다. iPhone Safari·설치형 PWA·실기기 Safe Area 검증은 하지 않았다.

## 8. 검증 결과

- `npm test`: **515/515 통과** (기존 507 + 홈 신규 8). 날짜/시간대·DST·연도 경계, 미확인/부분/0 판정, 소수 정밀도, 상세 캐시·동시 조회 제한·계정/세대 실패를 검증했다.
- `npm run build`: TypeScript 및 production build 통과. JS 약 483 kB / gzip 약 138.5 kB, CSS 약 30.2 kB / gzip 약 7.4 kB. T01 대비 JS gzip 약 3.2 kB 증가, 신규 라이브러리 없음.
- `npm run lint`: 통과.
- `node tests/fixtures/run-t01-browser.mjs`: **8개 보호 흐름 통과**. 입력 저장 실패 시 이동 차단, 동일 편집기 DOM·초안·시작/휴식 시각·epoch·고정 snapshot 유지, ACK 재시도, 로그아웃/계정·세대 경계, 기존 PWA 아이콘 캐시 포함. 이 검사는 HTTP fixture이며 실제 DB 검사와 구분한다.
- `node tests/fixtures/run-home-review-browser.mjs`: **실제 DB/API 6개 흐름 통과**. 실제 OTP, 실제 계획·기록, 기존 기록 상세, 오늘만 선택 후 일정 응답 동일, 실제 START와 로컬 편집기, 지연/503 후 회복, 실제 빈 계정. 검증이 만든 세션은 실제 FINISH·논리 삭제 API로 정리했다.
- 서버 `gradlew.bat test`: **320개 통과**.
- 서버 `gradlew.bat integrationTest --tests com.overload.testfixture.V22BrowserEnvironmentIntegrationTests`: **2개 통과**. 기본 격리 환경·중복 실행/실패 정리 보호 확인.
- 실제 신규 검토 DB V1~V22, 시드 API 건수, 초기/최종 활성 세션 없음 확인. 양쪽 `git diff --check` 통과.

첫 비승격 테스트 실행은 로컬 소켓 EACCES와 브라우저 대기 실패로 3개 실패했고, 로컬 연결이 허용된 동일 전체 테스트는 통과했다. E2E 도구의 DOM 반환 직렬화와 로딩 이전 지연 주입 순서도 수정했다. 실제 OTP 제한은 완화하지 않았고 반복 개발 검증의 한도를 소진한 임시 실행은 전용 종료/신규 실행으로 분리했다. 페이지 요청 취소가 다음 요청에 영향을 주지 않도록 검토 프록시는 요청마다 동일 소켓의 신원을 확인한다.

전체 Backend integrationTest, 실제 iPhone/설치형 PWA, 운영 배포, 실제 개인 DB V18~V22 적용은 이번 검증 범위가 아니다.

## 9. 부족한 계약·남은 범위

- 디로딩 분석 ON/OFF·유효 주수·게이지·현재 기간/일정·시작 자격 등의 서버 계약은 아직 연결되지 않았다. 헤더에 OFF/0주나 활성 디로딩 상태를 만들어 넣지 않았다. T03/T04 범위다.
- 카탈로그 검색 DTO에 대표 아이콘 분류가 없어 이름으로 운동 아이콘을 추정하지 않는다. 원본 6종은 T01 경로를 그대로 보존한다.
- 일반 홈에 필요한 기존 API는 충분했다. 신규 운영 endpoint/DTO/schema 결정은 하지 않았다.
- 루틴 편집/운동 진행/결과·정정/통계 차트/설정의 전체 v0.9 UI 전환은 T02-B~F에 남긴다. 휴식 효과음·깜빡임, Recharts, 디로딩 UI를 추가하지 않았다.
- 샘플은 검토용 실제 도메인 데이터이며 운영 카탈로그 분류가 완료됐다는 근거가 아니다. 날짜 경과 시 자동으로 과거를 재작성하지 않으며, 필요하면 전용 환경만 재생성한다.

## 10. Git·프로세스 상태

양쪽 모두 `main`에서 작업했다. PWA HEAD는 T01 `ad8d664a1a5ef60caea96d5787a12bfe01875988`, 서버 HEAD는 `523eb00`을 유지한다. 작업 시작 시 두 저장소는 clean이었다. 위 관련 파일만 미커밋 변경이며 stage/commit/push·새 브랜치·A/B 실험 복원은 하지 않았다. 공식 제품 설계/아이콘 원본과 개인 DB는 변경하지 않았다.

자동 검증용 Chrome·프리뷰·통합 테스트 컨테이너는 종료했다. 사용자 검토에 필요한 현재 실행의 PostgreSQL·실제 Backend·production PWA만 명시적으로 남겼다. 확인/종료는 `home-review.ps1 -Action Status` / `-Action Stop`을 사용한다. 별도 승인 요청 없이 사용자에게 허용된 구현·격리 샘플·검증 범위에서 수행했다.
