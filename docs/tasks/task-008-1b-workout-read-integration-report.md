# Task 008-1B — 인증 사용자 운동 정보 조회 연동

- 작성일: 2026-10-30 (Asia/Seoul).
- 시작 Git: frontend `main/1c84d23`, backend `main/be3087b`, 양쪽 clean. 008-1A 커밋을 확인하고 시작했다.
- 기준: 양쪽 AGENTS.md, frontend Engineering 문서, [Task 006](../../../overload-server/docs/tasks/task-006-integrated-design-v0.3.1.md), [R 읽기 계약](../../../overload-server/docs/tasks/task-008-0-domain-and-api-contract-v0.1.md), [공통 HTTP 계약](../../../overload-server/docs/tasks/task-008-0d-common-api-contract-v0.1.md), [008-1A 보고서](../../../overload-server/docs/tasks/task-008-1a-workout-read-api-report.md).
- 결과: **Frontend 312개 테스트 통과, lint/build 성공, 로컬 합성 API를 사용한 브라우저 확인 완료. 리뷰 전 미커밋.**

## 1. 실제 화면과 적용 범위

기존 AuthApp의 인증된 메인 영역에 `내 운동 정보 / 조회 전용`을 추가했다. 종목 개수·전체 이름 목록과 실제 저장된 휴식 초를 표시한다. 목표 반복 상한 구간은 **≤10회 / 11~12회 / ≥13회**다. 종목 0개는 정상 빈 상태이며 설정은 그대로 표시한다. 설정 누락과 일반 조회 실패는 별도 오류다. 오류 시 이전 성공 데이터·부분 성공 목록·기본 휴식값으로 대체하지 않는다.

운동 저장·편집을 지원하지 않는다는 안내를 표시하고 관련 동작을 활성화하지 않는다. 기존 계정 설정·로그아웃은 그대로 사용한다. 기존 색상 `--blue: #3B82F6`, 카드/타이포그래피/터치 버튼을 재사용한다. 종목 이름은 React 텍스트와 pre-wrap으로 표시해 공백·Unicode를 보존하고 HTML을 실행하지 않는다. UUID는 목록 key로 원값을 사용하며 다른 UUID로 치환하지 않는다.

## 2. API·응답 검증

`features/workout-read/api.ts`는 두 고정 상대 경로만 GET한다. query·body·사용자 ID header를 보내지 않으며 credentials=include, cache=no-store, redirect=error, Accept=application/json과 요청 취소·10초 timeout을 사용한다. 기존 인증 API/CSRF 코드를 변경하지 않는다.

| 대상 | 검증 |
|---|---|
| 정상 HTTP | 200 JSON, object envelope, 필수 필드 타입; 추가 응답 필드는 무시 |
| userId | UUID 문자열이며 기존 auth session의 userId와 정확히 일치 |
| dataGeneration | 선행 0 없는 비음수 10진 문자열, 0..9223372036854775807; Number 변환 없음 |
| exercises | array, 각 UUID id와 비어 있지 않은 string name, UUID 중복 거절; 원래 순서·이름 보존 |
| settings | 세 필드 모두 1..2147483647의 정수, 누락/문자열/소수/잘못된 값 거절 |
| X-Request-ID | 유효한 UUID header만 문의용으로 사용; 본문에 추적 필드 요구 없음 |

9007199254740993과 Long.MAX_VALUE 문자열 왕복, 잘못된 큰 숫자·음수·선행 0 거절을 검증했다. 다른 owner 응답과 잘못된 성공 응답은 화면에 반영하지 않는다. 받은 객체를 화면 DTO로 투영하며 Entity나 demo 모델을 사용하지 않는다.

HTTP 오류의 json() 파싱 실패는 상태를 지우지 않는다. 빈 본문·HTML·잘못된 JSON·안전하지 않은 code여도 400/401/403/500/503을 유지하며, code는 검증된 문자열 또는 REQUEST_FAILED로 처리한다. 오류 원문·예외 메시지·HTML은 UI로 복사하지 않는다.

## 3. 계정·요청 세대 및 제한 재조회

새 WorkoutReadController는 기존 AuthController의 getSnapshot/subscribe/restore를 사용한다. 인증 Controller/Provider를 재작성하지 않는다. 인증 완료 + pending 없음에서만 조회하며 로그아웃·세션 복원·인증 작업 시작 시 구독 callback이 동기적으로 데이터를 비우고 요청을 abort한다. React 렌더에서도 현재 auth userId/pending을 검사해 효과 실행 전의 이전 데이터를 가린다.

각 조회는 owner와 증가하는 요청 epoch, AbortController에 묶인다. 완료 전에 실제 최신 인증 snapshot도 다시 확인한다. abort가 무시되더라도 늦은 성공·401·503·네트워크 오류가 다른 계정이나 같은 계정의 새 로그인/새 조회를 변경하지 못한다. 연결 해제와 React StrictMode의 effect 정리도 요청 취소·데이터 제거·인증 구독 해제를 수행한다.

두 GET은 allSettled로 함께 수집하며 하나라도 실패하면 부분 데이터를 표시하지 않는다. 동시에 401과 다른 오류가 있으면 401을 우선한다. 성공 응답 둘의 generation이 같을 때만 한 화면 snapshot으로 반영한다.

generation이 다르면 두 GET을 **한 번 더** 요청한다. 한 조회 동작당 최대 2쌍/4 GET이며, 반복 불일치는 데이터 없는 `동기화 확인` 상태로 멈춘다. 자동 timer/backoff/무한 루프는 없다. 이후 사용자의 `다시 조회`만 새 동작을 시작한다.

## 4. 오류별 동작

| 상황 | 화면·인증 처리 |
|---|---|
| 401 | 기존 auth.restore로 한 번 세션 재확인. 같은 사용자로 복원되면 수동 재조회까지 보류해 401 반복 방지 |
| 403 | 접근 권한 오류. 자동 로그아웃/세션 복원 안 함 |
| 400 | 요청 규약 확인 안내 |
| 500 WORKOUT_SETTINGS_MISSING | 저장된 휴식 설정 누락 안내; 기본값을 만들지 않음 |
| 그 밖의 500 | 서버 조회 실패 안내 |
| 503 | 일시적 이용 불가, 수동 재조회 안내; 인증 상태 유지 |
| 네트워크/timeout | 연결 확인 안내; 자동 재시도 없음 |
| owner/응답 형식 불일치 | 데이터 표시 거절, 안전한 확인 안내 |

401에서 auth.restore의 실제 결과에 따라 기존 인증 UI가 익명 또는 연결 확인 화면으로 전환할 수 있다. 운동 조회 오류를 자체적으로 인증 만료나 로그아웃으로 확정하지 않는다. 서버 오류를 운동 데이터 삭제·초기화로 해결하라고 안내하지 않는다.

## 5. 검증 결과

| 실행 | 결과 |
|---|---|
| npm test | **312/312 PASS**, 실패/취소/skipped 0, 약 10.4초 |
| 기존 회귀 | 기존 279개 모두 통과; 인증·계정·identity·demo 도메인/SSR 포함 |
| 신규 API/controller | workout-read.test.mjs 26개 통과 |
| 신규 SSR | workout-read-ui.test.mjs 7개 통과 |
| npm run lint | PASS |
| npm run build | strict TypeScript + Vite production build PASS |

초기 컴파일에서 JSX 분기 별칭만으로 issue nullability가 좁혀지지 않아 명시적 issue guard로 수정했다. 첫 대상 테스트 26개 중 1개는 Node에 localStorage accessor가 있다고 가정한 mock 준비 오류였으며, 테스트에서 getter를 명시적으로 설치·복원하도록 고쳤다. 이후 전체 312개와 최종 lint/build가 통과했다. 검사 비활성화나 의존성 추가는 없다.

신규 테스트는 정상/빈 목록/편집 설정/큰 generation/응답 타입/다른 owner/두 세대 불일치·상한/HTTP 각 오류·비정상 본문/timeout·abort/늦은 응답/같은 계정 재로그인/실제 AuthController의 로그아웃 시작 시점/저장소 비접근/SSR 표시·HTML escaping을 검증한다. SSR을 DOM 상호작용 성공으로 세지 않았다.

### 브라우저 확인 — 일회성 메모리 fixture

브라우저는 이번에 실행한 loopback Vite와 tests/fixtures/auth-server.mjs만 사용했다. 합성 이메일·고정 테스트 OTP·메모리 session/종목/설정이며 PostgreSQL/Google/Resend에 연결하지 않는다. 기존 fixture에 운동 GET 시나리오만 추가했다. 코드 변경 없이 환경의 loopback 제한을 피할 수 있도록 테스트 프로세스를 정상 로컬 실행으로 재시작했다. 최초 제한된 프로세스도 종료했다.

- 390×844: 종목 3개, 긴 한글/영문 이름 줄바꿈, 17/29/43초, 정확한 세 구간, 버튼 높이 48px 확인.
- 320×740: 긴 이름·한국어 안내에 가로 넘침 없음.
- 1280×1000: 기존 최대 520px 앱 폭 유지, 휴식 설정 3열 배치 확인.
- 각 viewport에서 documentElement.scrollWidth와 clientWidth가 일치했다. scrollbar를 제외한 clientWidth는 각각 375/305/1265px이었다.
- 빈 종목에서도 실제 설정 표시, 설정 누락 500의 안전한 안내·Request ID, 세대 불일치 뒤 정지, 503에서 인증 유지 확인.
- 불일치 시 운동 GET 누적 8→12로 정확히 4건 증가했다. 401 시 운동 GET 14→16, session GET 2→3으로 한 번 확인 후 정지했다. 정상 모드 복원 뒤 수동 재조회가 성공했다.
- 기존 계정 설정의 로그인 수단/대표 이메일 조회·복귀 및 로그아웃 확인→로그인 화면을 검증했다. 로그아웃 뒤 운동 정보가 표시되지 않았다.

화면 증거는 합성 데이터만 포함한다.

| 화면 | 증거 |
|---|---|
| 390px 종목 | [PNG](evidence/task-008-1b/workout-read-390.png) |
| 390px 휴식 | [PNG](evidence/task-008-1b/workout-rest-390.png) |
| 320px | [PNG](evidence/task-008-1b/workout-read-320.png) |
| 데스크톱 | [PNG](evidence/task-008-1b/workout-read-desktop.png) |
| 설정 누락 | [PNG](evidence/task-008-1b/workout-settings-missing-390.png) |
| 세대 불일치 | [PNG](evidence/task-008-1b/workout-generation-mismatch-390.png) |

## 6. 데이터 보존·변경 파일·남은 검증

제품의 AuthController/AuthProvider/AuthApi·로그인/identity 처리, App/main의 demo 라우팅, demo 모델/저장소, package.json/lockfile은 불변이다. 새 조회 경로는 localStorage/sessionStorage/IndexedDB를 사용하지 않으며 테스트의 저장소 getter 차단과 소스 의존성 검사도 통과했다. 실제 demo 키를 읽거나 이전·삭제하지 않았다. 쓰기·루틴·세션·Outbox를 도입하지 않았다.

Backend는 be3087b에서 clean이며 제품 코드/설정/DB/migration을 변경하지 않았다. 008-1A의 기존 497개 Backend 테스트를 이번 작업에서 재실행한 것으로 보고하지 않는다. 실제 Java/PostgreSQL+프론트의 통합 로그인 E2E, 실제 Google/이메일 수신, iPhone Safari·설치형 PWA/HTTPS/오프라인은 미검증이다. mock 브라우저 성공만으로 해당 검증을 완료했다고 주장하지 않는다.

Frontend 변경 파일은 16개(기존 추적 3개 수정, 신규 13개)다.

```text
README.md
src/features/auth/AuthApp.tsx
src/features/workout-read/api.ts
src/features/workout-read/controller.ts
src/features/workout-read/WorkoutOverview.tsx
src/features/workout-read/workout-read.css
tests/fixtures/auth-server.mjs
tests/workout-read.test.mjs
tests/workout-read-ui.test.mjs
docs/tasks/task-008-1b-workout-read-integration-report.md
docs/tasks/evidence/task-008-1b/workout-read-390.png
docs/tasks/evidence/task-008-1b/workout-rest-390.png
docs/tasks/evidence/task-008-1b/workout-read-320.png
docs/tasks/evidence/task-008-1b/workout-read-desktop.png
docs/tasks/evidence/task-008-1b/workout-settings-missing-390.png
docs/tasks/evidence/task-008-1b/workout-generation-mismatch-390.png
```

검증 로그·dist·node_modules 산출물은 Git 대상이 아니다. 검증 Vite/API 세션을 종료하고 테스트 포트 3071/2228/5045와 자신이 시작한 API PID 109768/199688의 종료를 확인했다. 기존 사용자 서버나 프로세스는 종료하지 않았다. 브라우저 viewport를 원복하고 정상 검증 탭을 닫았다.

최종 Git: frontend main/1c84d23에서 위 16개 파일이 미스테이징·미커밋 상태이며 backend main/be3087b는 clean이다. Commit/Push하지 않았다. 사용자 리뷰를 기다린다.

## 7. 후속 최종 리뷰 — 증거 파일 형식 정정

사용자 승인 후 커밋 전 바이너리 형식 검사에서 증거 6개의 확장자는 .png이지만 실제 바이트는 JPEG임을 발견했다. 화면을 다시 생성하거나 편집하지 않고 원본을 디코딩해 실제 lossless PNG로 저장했다. 각 파일의 가로·세로 크기와 디코딩된 ARGB 픽셀 SHA-256이 변환 전후 동일함을 확인했다.

정정 후 파일은 각각 134,926~216,765 bytes, 총 1,060,863 bytes(약 1.01 MiB)다. 실제 계정 정보 없이 기존 합성 데이터와 테스트 요청 ID만 포함한다. 제품 코드와 테스트 코드는 추가 수정하지 않았고 승인된 312개 테스트·lint/build 결과를 유지한다. 6절의 Git 상태는 구현 검증 완료 당시의 기록이며, 이번에는 승인된 16개 파일만 로컬 커밋한다. Push하지 않는다.
