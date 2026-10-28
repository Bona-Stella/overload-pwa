# Task 007-1D-1 — React 인증 연동 검증 보고서

작성일: 2026-10-28 (Asia/Seoul). 구현·자동화·격리 브라우저 검증·자체 검토 완료.
실제 Google/Resend·개발 DB 변경·Commit·Push·배포는 수행하지 않았다.

## 1. 시작 상태와 목업 기준

- 프론트: main, HEAD `f90c8f1f26478af516b0c8586e0de5447477031d`, 시작 clean.
- 백엔드: main, HEAD `09bddbf26c9d82fc1931713b4ebd86f7044ab43c`, 시작 clean.
- 선행 3B-LIVE 보고서는 위 서버 HEAD에서 커밋 완료 상태였다.
- 양쪽 AGENTS.md·기술 규칙과 서버 Task 006 v0.3.1·현재 계정/OTP/Google/세션 구현을 확인했다.
- 목업은 `src/features/auth-preview/AuthScreens.tsx`, `auth-preview.css`, Task 005.5 제품/검증 문서,
  `task-0055-entry-375.jpg`를 확인했다. 목업이 누락된 상태에서 새로운 디자인을 만들지 않았다.

로그인 제목·워드마크·Google 우선 배치·구분선·폼·OTP 카드 구조와 타이포그래피, 입력창/버튼 형태를 유지했다.
사용자의 추가 지침에 따라 목업의 붉은 테마 대신 기존 앱 `index.css`/`App.css`의 파란색을 우선했다.
가상 코드·개발 시나리오·가상 계정 관리 UI는 실제 인증 화면으로 가져오지 않았다. 기존 목업 소스는 변경하지 않았다.

## 2. React 구조와 상태

`src/features/auth`에 AuthApi, AuthController, AuthContext/AuthProvider, LoginScreens, AuthApp 및 스타일을 추가했다.
기존 React 19·TypeScript·Vite·일반 CSS·Node test/React SSR을 유지했고 의존성·package/lockfile은 바꾸지 않았다.

상태는 checking / anonymous / authenticated / unavailable와 request·verify·logout·google·restore 처리 중을 구분한다.
StrictMode의 시작 중복을 막고 페이지 새로고침·OAuth 복귀·bfcache 복귀 시 서버를 확인한다.
session 401은 비로그인, 네트워크/5xx/잘못된 응답은 연결 확인 실패로 처리한다. 알려진 UUID를 실패 때문에 다른 계정으로 바꾸지 않는다.
복귀 URL 자체·localStorage 불리언·OAuth token은 인증 근거로 쓰지 않는다.

## 3. 실제 연결 API와 CSRF

| API | 사용 계약 |
|---|---|
| GET `/api/v1/auth/session` | 200 `{userId}`, 401 비로그인 |
| GET `/api/v1/auth/csrf` | 200 `{headerName,token}`, 메모리 전용 |
| POST `/api/v1/auth/email-otp/request` | `{email}` → 202 ACCEPTED/challengeId |
| POST `/api/v1/auth/email-otp/verify` | `{email,challengeId,code}` → 204 후 session/CSRF 재조회 |
| POST `/api/v1/auth/logout` | CSRF 포함 → 204 후 session 비로그인 확인·새 CSRF |
| GET `/oauth2/authorization/google` | 고정 경로 top-level navigation, fetch 아님 |

모든 fetch는 credentials include/no-store이고 모든 POST는 서버가 제공한 헤더명/토큰을 사용한다.
OTP 성공/로그아웃 뒤 기존 CSRF를 폐기한다. 403 CSRF_INVALID도 캐시를 비우며 다음 명시 요청에서 새로 조회한다.
메일 발송·검증·로그아웃을 자동 재실행하지 않는다. 클릭 연속 입력은 하나의 처리 잠금으로 차단한다.
발송 실패/응답 불확실 시에도 즉시 재발송하지 않으며 60초 대기·429 Retry-After를 반영한다.
취소/주소 변경으로 메모리 대기를 초기화하지 않는다. 서버 제한이 최종 기준이며 새로고침으로 우회하지 못한다.
코드 검증에 대한 429도 별도 검증 대기를 적용하고 발송/검증 양쪽을 제한한다.
검증 결과가 네트워크/5xx 등으로 불확실하면 challenge를 비우고 서버 세션을 읽기 전용으로 다시 확인한다.
수락된 challenge가 없으면 코드 확인을 허용하지 않고 활성 코드 유효시간도 표시하지 않는다.
OTP 입력은 제출·성공·취소·화면 종료 때 비운다. 이메일·OTP를 URL/로그/분석/브라우저 영구 저장소에 넣지 않는다.

백엔드는 오답/만료를 모두 OTP_INVALID로 응답한다. 이를 다른 서버 오류라고 추정하지 않고 통합 안내하며,
프론트에서 이미 지난 5분만 별도 ‘코드 만료’로 표시한다. 프론트 타이머는 안내용이다.

## 4. Google 고정 복귀와 포트·쿠키

서버 변경은 일반 Google LOGIN 성공/실패의 선택적 복귀에 한정했다.
AUTH_FRONTEND_RETURN_URI가 빈 기본값이면 기존 성공 session JSON/기존 실패 경로를 그대로 유지한다.
local에서 명시적으로 설정할 수 있는 값은 `http://localhost:3000/auth/complete` 하나이며,
실패는 같은 origin의 `/auth/failed`다. 비로컬은 신뢰 가능한 명시적 HTTPS origin의 같은 고정 경로만 허용한다.
userinfo·query·fragment·CRLF·다른 포트/경로·상대 URI·인코딩 우회를 거절하고 잘못된 설정 원문도 출력하지 않는다.
next/returnUrl·Host/forwarded header를 목적지로 사용하지 않으며 code/state/token을 프론트 복귀에 붙이지 않는다.
기존 LOGIN 콜백 localhost:8080과 CONTACT/LINK/기본 비활성 REAUTH 경계는 유지한다.

PWA는 localhost:3000을 사용하고 Vite가 `/api`와 Google 시작만 기본 loopback:8080으로 전달한다.
콜백은 기존 localhost:8080이며 host-only SESSION을 같은 localhost에서 유지한다. localhost·127.0.0.1·LAN IP를 혼용하지 않는다.
실제 `.env`는 바꾸지 않았으므로 PWA 복귀를 사용할 후속 LIVE에서만 해당 서버 설정을 명시해야 한다.
운영은 동일 호스트 HTTPS 역방향 프록시와 SPA 복귀 라우팅이 필요하며 배포하지 않았다.
쿠키 Domain·HttpOnly·SameSite·Secure·90일·CORS·CSRF는 완화하지 않았다.

## 5. 데모 기록 및 계정 분리

기존 `overload.core.v1`, App.tsx/App.css/index.css 및 운동 모델/저장 로직은 변경하지 않았다.
기본/인증된 화면은 운동 저장소를 마운트하지 않고 로그인 준비 화면만 보여 준다.
기존 데모는 개발 전용 `/demo`에서 ‘계정 데이터 아님·기기 저장·서버 전송 없음’ 배너와 함께 독립 실행한다.
인증 UUID를 기존 데모 키와 연결하거나 기존 기록을 서버에 업로드/이전하지 않는다.
다른 계정으로 로그인해도 그 계정의 운동 기록인 것처럼 보여 주지 않는다.
로그아웃은 인증 메모리 상태를 비우고 기존 데모 데이터는 보존한다. `/auth-preview`는 기존 가상 목업 그대로다.
생산 JS 검사에서 데모 저장 키·UX PREVIEW·브라우저 fixture 코드가 없음을 확인했다.

## 6. 자동화 결과

| 실행 | 결과 |
|---|---|
| 프론트 `npm test` | **173개 통과**, 실패/취소/skip 0; 기존 142개 보존 + 신규 31개 |
| `npx tsc -b` | 통과 |
| `npm run lint` | 통과 |
| `npm run build` | 통과, Vite 8.3.5, strict 타입 검사 포함 |
| 서버 `gradlew.bat test integrationTest build --no-daemon --console=plain` | **388개 통과**, 실패/error/skip 0 |
| 서버 단위/통합 구분 | 61 / 327, 기존 364개 + 신규 24개 |

프론트는 초기 401·세션 복원·202/204·UUID 유지·오답/만료·429/503·네트워크/응답/헤더·타임아웃,
중복 발송·CSRF 교체/403 자동 재시도 금지·로그아웃 확인·Google 이동/실패·storage 미접근·목업/데모 경계를 검증했다.
프론트 네이티브 fetch 호출 문맥과 첫 타이머 tick, 수락되지 않은 코드 표시 경계도 회귀에 포함했다.
검증 429 대기와 응답 불확실 시 OTP 재제출 차단·읽기 전용 세션 복구도 별도 회귀로 확인했다.
서버는 실제 PostgreSQL 18.6 Testcontainers와 서명된 테스트 OIDC/가짜 sender를 사용해 고정 복귀 성공·실패,
기존 JSON 기본값·주입/미승인 설정 거부와 기존 전체 인증 회귀를 검증했다. Google 검증을 우회하지 않았다.

## 7. 브라우저 동작 및 디자인 검증

CUA 브라우저는 자체 Vite localhost:3057과 loopback 가짜 API만 사용했다. 실제 외부 메일/OAuth/DB 호출은 0이다.
가짜 OTP 오답 후 입력 삭제·성공·새로고침 복원·로그아웃 확인과 결과, 가짜 Google 성공/실패 복귀,
503 연결 실패/복구·429의 120초 대기·CSRF 실패와 자동 발송 금지를 확인했다.
별도 fixture 실행에서는 시작 3057 → callback 3305 → 복귀 3057 경로를 만들고,
브라우저가 같은 호스트의 HttpOnly 쿠키를 callback에 전달했음을 fixture가 일치 검사했다.
이 fixture는 실제 Google OIDC 검증을 대체하지 않으며 해당 부분은 위 서버 통합 테스트와 구분한다.

| 폭 | 가로 넘침 | 앱 너비 | 버튼/입력 터치 영역 | primary |
|---:|---|---:|---|---|
| 320 | 없음 | 320 | 모두 44px 이상 | 기존 #3b82f6 |
| 375 | 없음 | 375 | 모두 44px 이상 | 동일 |
| 390 | 없음 | 390 | 모두 44px 이상 | 동일 |
| 1440 | 없음 | 520 | 모두 44px 이상 | 동일 |

기존 목업과 공통 스타일 블록을 비교하고 모바일/데스크톱 화면을 직접 확인했다.
주요 로그인 버튼 54px·입력창 48px·OTP 필드 64px와 원래 글꼴·제목 크기·배치·구분선·모서리를 유지했다.
변경된 컬러는 사용자 지침에 따른 기존 앱 파란색이며 새로운 테마를 확정하지 않았다.

증거: [로그인 375](evidence/task-007-1d-1-entry-375.jpg), [OTP 390](evidence/task-007-1d-1-code-390.jpg),
[인증된 화면](evidence/task-007-1d-1-signed-in-390.jpg), [연결 실패](evidence/task-007-1d-1-connection-390.jpg),
[Google 실패](evidence/task-007-1d-1-google-failed-390.jpg), [데스크톱](evidence/task-007-1d-1-desktop-1440.jpg),
[실측 JSON](evidence/task-007-1d-1-layout-checks.json).

## 8. 발견한 문제와 해결

- 실제 브라우저의 기본 fetch를 AuthApi 메서드 수신자로 호출하면 연결이 실패했다. 전역 fetch를 호출하는 wrapper로 고쳐
  실제 브라우저에서 복구를 확인했고 수신자 회귀 테스트를 추가했다.
- 첫 timer tick보다 요청 완료가 늦으면 5:01/61초가 잠깐 보였다. 상태 갱신 시각을 기준으로 5:00/60초 이하를 표시하도록 수정했다.
- 실패/429 요청에서 미수락 코드가 활성 유효시간처럼 보이는 안내를 수정하고 해당 입력을 차단하는 테스트를 추가했다.
- 작업 중 브라우저 연결 중단은 도구 세션을 재연결해 이어갔다. 코드 검증을 생략하거나 다른 자동화 도구로 우회하지 않았다.
- 최종 secret 검사 도구의 기본 cp949 인코딩 오류는 UTF-8 명시로 재실행했다. 최종 검사에 실패한 항목은 없다.
- 후속 실제 환경에서 PWA 복귀 설정이 켜져도 기존 Google 회귀의 기본 JSON 계약이 흔들리지 않도록,
  관련 테스트 4개 클래스의 실행 인자에도 빈 AUTH_FRONTEND_RETURN_URI를 명시했다. 테스트를 끄거나 보안 조건을 바꾸지 않았다.

## 9. 변경 범위·Git·프로세스 정리

프론트: 인증 기능 7개 파일, main/Vite 설정, 공개 `.env.example`, 기존 README/기술 규칙,
인증 기술 문서·본 보고서, 테스트 3개 파일과 위 디자인 증거를 변경/추가했다.
백엔드: GoogleFrontendReturn 및 단위 테스트 추가, GoogleOidcSecurity·기존 OIDC 통합 테스트·공개 `.env.example`·기술 문서와
기존 Google/EMAIL/공통 재인증 통합 테스트 4개의 복귀 설정 격리 인자만 변경했다.
V1~V8·Task 006·선행 LIVE 보고서·실제 `.env`·프론트 운동 소스·package/lockfile은 보존했다.

프론트 총 24개 파일:

- `.env.example`, `README.md`, `vite.config.ts`, `src/main.tsx`.
- `src/features/auth/`의 `api.ts`, `controller.ts`, `context.ts`, `AuthProvider.tsx`, `AuthApp.tsx`, `LoginScreens.tsx`, `auth.css`.
- `tests/auth.test.mjs`, `tests/auth-ui.test.mjs`, `tests/fixtures/auth-server.mjs`.
- `docs/engineering/frontend.md`, `docs/engineering/authentication.md`, 본 보고서, 위 증거 7개 파일.

백엔드 총 10개 파일:

- `.env.example`, `docs/engineering/google-oidc.md`.
- `src/main/java/com/overload/overload_server/auth/google/GoogleFrontendReturn.java`, `GoogleOidcSecurity.java`.
- `src/test/java/com/overload/overload_server/auth/google/`의 `GoogleFrontendReturnTests.java`, `GoogleOidcIntegrationTests.java`,
  `CommonReauthenticationEmailIntegrationTests.java`, `EmailIdentityIntegrationTests.java`, `GoogleIdentityIntegrationTests.java`, `GoogleReauthenticationIntegrationTests.java`.

Vite 검증 프로세스(최종 node PID 82876)와 가짜 API(초기 153592, 최종 154992)를 종료했고 3057/3305 리스너가 없음을 확인했다.
브라우저 탭을 닫고 viewport override를 복원했다. Gradle은 no-daemon 실행 후 종료했고 Testcontainers/테스트 서버도 정리됐다.
기존 Compose PostgreSQL은 계속 exited 상태이며 실행하거나 개발 데이터에 접속하지 않았다.
실제 비밀값은 출력 없이 변경 파일과 대조해 미포함을 확인했다. Git staging·Commit·Push·운영 배포는 수행하지 않았다.
양쪽 main과 시작 HEAD를 유지하며 관련 변경만 미커밋으로 남긴다. 최종 목록/공백 검사도 확인했다.

## 10. 후속 LIVE와 미구현 범위

- 실제 Google/Resend를 React 화면에서 사용하는 LIVE는 이번에 금지된 범위다. 고정 복귀 설정 후 별도 승인으로 검증해야 한다.
- 브라우저 테스트는 fake HTTP fixture, 백엔드는 실제 PostgreSQL/서명 OIDC를 별도로 검증했다. 실제 개발 서버와 브라우저를 결합한 실서비스 E2E 성공으로 주장하지 않는다.
- 실제 iPhone Safari의 키보드·one-time-code 자동 완성·Safe Area·설치형 PWA·HTTPS/오프라인 실행은 미검증이다.
- 운동 계정 API·계정 수단 관리 UI·대표 이메일 변경/복구·데모 마이그레이션·닉네임 저장·정식 약관/동의 기록은 구현하지 않았다.
- 별도 주요 의존성/보안 정책 변경 승인은 불필요했다. 차단된 구현이나 미해결 테스트 실패는 없다.

실행/계약 상세는 [인증 기술 문서](../engineering/authentication.md),
서버 복귀 설정은 [Google OIDC 문서](../../../overload-server/docs/engineering/google-oidc.md)를 따른다.
