# Task 008-1C — 실제 Backend + Frontend 운동 조회 통합 검증

- 검증일: 2026-10-30 (Asia/Seoul).
- 시작 상태: Backend `main/be3087b`, Frontend `main/9cee624`, 양쪽 clean. 008-1A/1B 커밋 완료를 확인했다.
- 결과: **실제 브라우저 검증 대상 12개 PASS. 실제 HTTP 52건과 DB 스냅샷 감사 11개 PASS. Frontend 312개 테스트, lint/build PASS.**
- 새 제품 기능이나 API·인증 정책 변경 없음. 개발 PostgreSQL·실제 계정·Google·Resend 사용 없음. Commit·Push하지 않았다.

## 1. 기준 및 검증 환경

양쪽 AGENTS.md와 engineering 규칙, [Task 006 v0.3.1](../../../overload-server/docs/tasks/task-006-integrated-design-v0.3.1.md), [JPA 설계](../../../overload-server/docs/tasks/task-008-0-jpa-persistence-design.md), [도메인·API 계약](../../../overload-server/docs/tasks/task-008-0-domain-and-api-contract-v0.1.md), [공통 HTTP 계약](../../../overload-server/docs/tasks/task-008-0d-common-api-contract-v0.1.md), [008-1A 보고서](../../../overload-server/docs/tasks/task-008-1a-workout-read-api-report.md), [008-1B 보고서](task-008-1b-workout-read-integration-report.md)를 기준으로 확인했다.

| 구성 | 실제 실행 내용 |
|---|---|
| Backend | 기존 Spring Boot 4.1.2 애플리케이션, Java 25, 실제 Tomcat `http://127.0.0.1:14037` |
| DB | 새 Testcontainers `postgres:18.6-alpine`, 실제 `SHOW server_version=18.6`, DB `overload_browser_isolated`; 시작 사용자 0명 |
| 스키마 | 기존 Flyway V1~V8 8개 적용, Hibernate validate, OSIV false |
| 영속성 | 기존 JDBC 기본 transactionManager + 운동용 workoutTransactionManager, 단일 DataSource·Entity 2개 확인 |
| Frontend | 실제 React/Vite, `http://127.0.0.1:3072`, 모든 `/api`를 위 Backend로 프록시 |
| 브라우저 | ChatGPT in-app Chromium 브라우저. 모바일 viewport 390×844 설정; 캡처별 실제 출력 크기는 PNG 참조 |
| 인증 | 실제 OTP 생성·challenge 저장·검증·CSRF·프로비저닝·세션 회전·Spring Session JDBC 실행 |
| 외부 발송 대체 | test classpath의 FakeSender만 교체. 제품 OtpCrypto가 만든 임시 OTP를 브라우저에 입력. 성공 응답 합성·인증 우회 없음 |
| 시간 | 제품 기본 `java.time.Clock$SystemClock` 확인; 최종 검증에 고정 Clock 사용 없음 |

테스트 런처가 새 컨테이너 URL·임의 비밀번호·임의 OTP HMAC 키를 직접 전달했다. 테스트 classpath의 기존 local 설정은 개발 `.env` import를 하지 않으며, 런타임 property source에도 `.env`가 없음을 검증했다. 실행 셸의 외부 서비스/DB 관련 환경변수를 제거하고 Google을 비활성화했다. 기존 dev DB URL이나 비밀값은 사용하지 않았다.

Vite 검증 런처는 `envDir:false`이고 모든 API target을 격리 Backend로 지정한다. 응답 본문·상태·헤더를 변경하지 않고 수동 브라우저 요청을 관찰한다. 008-1B의 합성 API 서버는 이번에 사용하지 않았다.

## 2. 실제 브라우저 결과

아래 PASS는 이 환경에서 관찰한 범위다. 추가 플랫폼·장기 만료 등의 미검증 범위는 6절에 별도로 기재했다.

| # | 대상 | 결과 | 실제 증거 |
|---|---|---|---|
| 1 | 실제 로그인·세션 형성 | PASS | 초기 session 401 → OTP request 202 → 잘못된 OTP 401 → 실제 발급 OTP verify 204 → session 200. A/B/A 재로그인 총 3회 |
| 2 | exercises 실제 HTTP | PASS | 200 JSON, owner UUID 일치, `dataGeneration:"0"`, 실제 DB의 20개 UUID·이름과 일치 |
| 3 | workout-settings 실제 HTTP | PASS | 200 JSON, owner·generation 일치, DB 저장값 180/120/90 및 17/29/43 모두 확인 |
| 4 | DB seed·화면 표시 | PASS | 실제 가입 프로비저닝으로 사용자별 20종목·1설정. UI 20개·전체 이름·≤10/11~12/≥13 구간 표시 |
| 5 | 세션 쿠키·credentials | PASS | 두 GET에 SESSION 전송. 쿠키 SHA-256과 JDBC session_id의 SHA-256을 메모리/무시 경로에서 대조해 일치 확인 |
| 6 | Request ID·캐시·보안 헤더 | PASS | 실제 응답 52건 모두 UUID X-Request-ID, no-store, nosniff, DENY. Request ID 52개 중복 없음 |
| 7 | 새로고침 복원 | PASS | 브라우저 reload 후 session 200과 두 GET 200, 동일 A UUID·20종목·17/29/43 복원. 운동 행과 timestamp 불변 |
| 8 | 로그아웃 후 비노출 | PASS | 실제 logout 204, session 401, 로그인 화면으로 전환. 이전 종목·설정 비노출, 인증 JDBC 세션 0개 |
| 9 | 다른 계정 격리 | PASS | B는 서로 겹치지 않는 20 UUID와 기본 휴식값. A 전용 이름 비노출. A 재로그인 시 기존 A 데이터 유지, 중복 seed 없음 |
| 10 | 실제 Backend 오류 | PASS | 실제 설정 행 누락 → 500 WORKOUT_SETTINGS_MISSING. 실제 PG 연결 종료 → 503 WORKOUT_DATA_UNAVAILABLE. 세션 유지·부분 데이터/기본값 비표시, 수동 재조회 복구. B 세션 행 폐기 후 실제 401 → 세션 재확인·로그인 화면 |
| 11 | 기존 계정 설정·로그아웃 | PASS | 계정 설정의 실제 session/identities/contact GET 200, EMAIL 연결 및 대표 이메일 VERIFIED 표시. 실제 로그아웃 두 번 성공 |
| 12 | 데모 저장소 분리 | PASS | 로그인·reload·계정 전환·오류·로그아웃 중 demo key 접근 카운터 0. demo 데이터 읽기·이전·삭제·업로드 없음 |

A의 첫 UUID 순 종목을 테스트 제어 명령으로 `격리 검증 A 전용 종목`으로 바꾸고 휴식값을 17/29/43으로 바꿨다. 이는 격리된 일회성 DB의 테스트 준비이며, 운동 쓰기 API를 구현하거나 호출한 것이 아니다. B는 원래 seed와 180/120/90을 유지했다. 마지막 DB 상태는 사용자 2명, 종목 40개, 설정 2개, EMAIL identity 2개, 인증 세션 0개였다. 익명 CSRF 세션은 인증 세션 수에서 제외한다.

설정 누락 테스트는 A 설정 원행 전체를 메모리에 보관한 뒤 삭제했다. 실패 GET 직후에도 설정 0개여서 조회가 자동 생성하지 않음을 확인하고, 원래 PK·generation·timestamp까지 그대로 복구했다. 503은 전체 DB 정지 대신 다음 운동 조회의 실제 PostgreSQL 연결만 종료했다. 실제 JDBC/Hibernate 예외와 기존 ControllerAdvice의 503이 발생했고 기본 풀 설정을 유지한 채 다음 수동 조회가 성공했다.

## 3. HTTP·세션 관찰

- 성공 GET은 `application/json`, owner는 기존 auth session의 userId와 동일했다. 두 API의 generation은 문자열 `"0"`로 유지됐다.
- 로그인 성공 시 익명 요청 쿠키와 다른 SESSION이 발급됐고 실제 두 GET·JDBC 세션에 같은 새 값이 사용됐다. 원문 쿠키는 증거에 보관하지 않는다.
- 쿠키는 `Path=/; HttpOnly; SameSite=Lax`, 로그인 직후 Max-Age 7,775,999초로 90일 상한에 부합했다. 실제 90일 경과나 연장 방지 전체 시나리오를 이번 브라우저 검증에서 재실행한 것은 아니다.
- 실제 로그아웃 응답은 SESSION `Max-Age=0`과 만료 Expires를 반환했다.
- 로컬 HTTP이므로 기존 local 설정대로 Secure는 붙지 않았다. HTTPS/Secure/HSTS 검증 결과로 해석하지 않는다.
- 운동 API 클라이언트는 기존 코드대로 credentials=include/cache=no-store를 사용한다. X-Request-ID 요청 헤더를 직접 지정하지 않는 일반 브라우저 요청에서 서버가 생성한 응답 헤더를 확인했다. 클라이언트 지정 Request ID 수용/교체는 이번 브라우저 시나리오에 포함하지 않았다.
- 실제 500 Request ID `6b8ec92f-7180-4f59-b4ad-cff28992fc4b`, 실제 503 Request ID `e9301bff-2593-44ec-a180-b24dba140163`가 오류 화면의 문의 ID와 일치했다. 오류 JSON은 기존 code-only 계약이다.

[actual-http.json](evidence/task-008-1c/actual-http.json)은 실제 응답 52건의 method/path/status/선택 헤더와 운동·session 응답을 보관한다. 요청 본문·OTP·CSRF 응답·쿠키 값·쿠키 해시는 제외했다. userId와 종목 UUID는 이 실행에서 생성된 임시 값이다. 별도 감사 스크립트 11개 검사와 수동 브라우저 12개 항목을 구분하며 기존 테스트 개수에 합산하지 않는다.

## 4. 증거 화면

| 화면 | 증거 |
|---|---|
| 실제 A 종목 20개·전용 이름 | [a-edited-top.png](evidence/task-008-1c/a-edited-top.png) |
| A 재로그인 후 17/29/43 | [a-relogin-rest.png](evidence/task-008-1c/a-relogin-rest.png) |
| B의 별도 20종목·180/120/90 | [b-isolated-rest.png](evidence/task-008-1c/b-isolated-rest.png) |
| 실제 설정 누락 500 | [actual-settings-missing.png](evidence/task-008-1c/actual-settings-missing.png) |
| 실제 연결 오류 503 | [actual-database-503.png](evidence/task-008-1c/actual-database-503.png) |
| 기존 계정 설정 | [actual-account-settings.png](evidence/task-008-1c/actual-account-settings.png) |
| 실제 세션 폐기 후 로그인 화면 | [actual-revoked-session.png](evidence/task-008-1c/actual-revoked-session.png) |
| 최종 로그아웃·데이터 비노출 | [final-logout.png](evidence/task-008-1c/final-logout.png) |

8개 파일은 캡처된 JPEG를 실제 PNG로 무손실 변환했다. 크기와 모든 decoded pixel 일치를 확인했다. 화면에는 임시 계정과 테스트 데이터만 있다. OTP·세션/CSRF 값은 없다.

## 5. 추가 파일·검증 명령

Backend 신규 3개:

- `src/test/java/com/overload/testfixture/WorkoutBrowserEnvironment.java`: 실제 제품 컨텍스트·일회성 PG·테스트 발송기, 파일 제어 및 안전한 DB snapshot. 제품 HTTP endpoint 추가 없음.
- `scripts/task-008-1c-browser.init.gradle`: 명시적 opt-in JavaExec. 정상 빌드 설정/의존성 변경 없음.
- `scripts/task-008-1c-control.ps1`: 실행 중인 격리 JVM에 snapshot/테스트 준비/stop 명령 전달. 실제 DB URL을 인자로 받지 않음.

Frontend 신규 12개:

- `tests/fixtures/real-backend-vite.mjs`: 실제 프록시·수동 HTTP 감사·demo 접근 차단 계측.
- `tests/fixtures/verify-real-backend.mjs`: HTTP/DB 증거를 읽어 11개 검사 및 비밀값 제외 증거 생성. HTTP/DB 요청 없음.
- 이 보고서, `actual-http.json`, PNG 8개.

실행 결과:

| 명령/검증 | 결과 |
|---|---|
| Backend `gradlew.bat --offline --no-daemon -I scripts/task-008-1c-browser.init.gradle workoutBrowserEnvironment` | testClasses 컴파일·실제 실행·정상 종료, BUILD SUCCESSFUL |
| 실제 컨텍스트 `MixedPersistenceAssertions.verify` 및 초기 users=0/SystemClock 확인 | PASS |
| Frontend `node tests/fixtures/real-backend-vite.mjs` + 실제 브라우저 흐름 | 12개 대상 PASS |
| `node tests/fixtures/verify-real-backend.mjs` | HTTP 52건, 감사 11개 PASS |
| `npm run test` | 312 PASS, 실패/skip 0 |
| `npm run lint` | PASS (감사 스크립트 추가 후 재실행 포함) |
| `npm run build` | TypeScript/Vite PASS |
| 두 신규 mjs `node --check` | PASS |
| Git/신규 텍스트 공백·민감정보 검사 | PASS; 검증 원본 build/logs는 Git 제외 |

Backend 기존 497개 자동 테스트 전체는 이번 실행에서 재실행하지 않았다. 008-1A의 기존 결과를 새 통과 결과로 계산하지 않는다. 이번 Backend 검증은 새 fixture 컴파일, 실제 제품 컨텍스트 및 PostgreSQL/브라우저 실행이다. 제품 코드·기존 테스트·설정 변경은 없다.

재현 시에는 외부 서비스/개발 DB 환경변수를 제거한 별도 셸과 기존 설치 Java 25/Docker를 사용한다. 위 Backend 런처가 ready를 만든 후 Frontend 런처를 실행한다. 실제 발급 테스트 OTP는 무시 경로 `overload-server/build/task-008-1c/otp.json`에만 일시 기록한다. 파일 제어는 Backend 루트에서 `./scripts/task-008-1c-control.ps1 -Action snapshot` 등으로 수행한다. 보관 증거 감사는 명시된 snapshot 라벨과 동일 브라우저 흐름을 전제로 하며 일반화된 E2E 테스트 러너가 아니다. 종료는 Frontend Ctrl+C와 Backend `-Action stop`을 사용한다.

## 6. 발견 문제·제약·정리

- 제품 결함은 발견하지 않았다. 예상한 500/503/401은 통제된 일회성 fixture 준비로 발생했다. 내부 SQL 예외는 서버 로그에만 있고 UI에는 안전한 오류와 Request ID만 표시됐다.
- 초기 준비 런처가 기존 OTP fixture 전체의 고정 Clock까지 가져오는 점을 발견했다. 기존 환경을 종료하고 **발송기만 교체하며 제품 SystemClock을 강제 확인하는 새 컨테이너**로 처음부터 다시 검증했다. 보관 HTTP 52건과 스냅샷·화면은 최종 SystemClock 실행에서 얻었다.
- Windows 파일 제어에서 이전 result를 반복 열면 JVM 교체와 충돌할 수 있었다. 제어 스크립트가 새 수정 시각의 결과만 읽도록 보완하고 실제 snapshot·세션 폐기·종료 명령으로 확인했다.
- 중단 후 브라우저 제어 연결이 오래된 상태여서 제어 도구를 재연결했다. 실제 화면 상태를 확인한 후 계속했고 제품 코드를 수정하지 않았다.
- HTTPS/Secure/HSTS, 실제 Google OAuth/Resend, iPhone Safari·홈 화면 설치·서비스워커·오프라인은 미검증이다. `/demo` 화면 자체의 브라우저 회귀는 재실행하지 않았고 저장소 비접근 및 기존 312개 회귀·소스 불변을 확인했다.
- 빈 목록, 큰 generation, generation 불일치, 400/403/잘못된 JSON/네트워크 단절 및 늦은 응답 경합은 기존 008-1B 자동 테스트에서 재통과했다. 이번 실제 Backend 브라우저 흐름에서 별도로 재현하지 않았으므로 실제 통합 PASS에 추가하지 않는다.
- 기존 인증·보안·Request ID·JPA 설정, Flyway V1~V8, React 제품 코드, auth 구조, demo 데이터·라우팅·저장소, 의존성/lockfile은 Git 기준 불변이다. 신규 파일만 존재하고 staging/Commit/Push 없음.
- 실행한 Backend/Frontend 프로세스를 종료했고 포트 14037/3072의 listener 및 해당 PID가 없음을 확인했다. Testcontainers PG/Ryuk가 제거됐고 시작 전부터 있던 다른 5개 컨테이너는 유지됐다. 임시 OTP/Backend ready 파일도 제거됐다. 검증 브라우저 탭을 닫고 viewport override를 원복했다.

현재는 결과 리뷰 대기 상태다. 미해결 제품 문제나 추가 승인 요청은 없다. 다음 기능 구현은 시작하지 않았다.
