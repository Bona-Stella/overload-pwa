# Task 007-1D-2A — 계정 설정·대표 이메일·재인증 검증 보고서

작업일: 2026-10-28~29 (Asia/Seoul). 구현·격리 자동화·브라우저 검증 완료.
실제 Google 인증·Resend 발송·개발 DB 접속/변경·Git staging·Commit·Push·배포는 수행하지 않았다.

## 1. 시작 상태 및 보존 범위

| 저장소 | 브랜치 / 시작 HEAD | 작업 트리 |
|---|---|---|
| overload-pwa | main / `367e22f15dbb8b0807c52665cd48a551b875f5b1` | clean |
| overload-server | main / `fa19afef06241766cb54748c1a22d8a33cde7f5e` | clean |

선행 1D-1-LIVE 보고서·증거 8개는 프론트 HEAD에서 커밋 완료였고 변경하지 않았다.
양쪽 AGENTS.md·기술별 규칙, Task 006 v0.3.1, Task 005.5 목업, 1D-1 구현/LIVE 보고서,
계정 프로비저닝·Google OIDC·EMAIL OTP·공통 재인증·EmailOwnershipProof/JDBC 회전 계약을 확인했다.
목업 구조와 기존 파란색 #3B82F6, 기존 일반 로그인/로그아웃/운동 데모를 유지했다.

실제 `.env`는 수정하지 않았다. V1~V8·Task 006·기존 LIVE 보고서·운동 모델/저장소·공통 App.css/index.css,
Task 005.5 목업·package/lockfile·인증 정책은 변경하지 않았다. 새 의존성·새 API·새 마이그레이션은 없다.

## 2. 계정 화면과 조회 계약

로그인된 기본 화면에 ‘계정 설정’ 버튼을 추가했다. `/account`를 직접 열거나 새로고침해도
서버 session을 먼저 확인한다. 익명은 계정 데이터를 읽거나 표시할 수 없다.

기존 AuthProvider/AuthController/AuthApi를 확장하고 `account` 상태를 같은 Controller 안에 두었다.
별도 인증 저장소나 브라우저 영구 저장소는 추가하지 않았다.

| API | 사용한 계약 |
|---|---|
| GET `/api/v1/auth/session` | 200 `{userId}`, 401 비로그인 |
| GET `/api/v1/auth/identities` | `{identities:[{id,provider}]}`, provider는 email/google |
| GET `/api/v1/auth/reauth/email/contact` | VERIFIED+maskedEmail 또는 REQUIRED+선택적 candidate |
| GET `/api/v1/auth/csrf` | 기존 `{headerName,token}` |

EMAIL-only/GOOGLE-only/복수 수단/신원 없음·조회 중·조회 실패를 구분한다.
각 수단은 읽기 전용 연결 상태만 표시하며 연결/해제 API를 호출하는 버튼은 없다.
UUID는 내부 form/검증용이고 화면의 텍스트에는 표시하지 않는다.
응답의 추가 원문 이메일·sub·issuer·토큰 필드는 복사하지 않는다.
현재 서버의 `첫 문자 + ***@***` 마스킹 형식, provider/UUID/응답 상태를 검증한다.

VERIFIED 대표 이메일은 등록 상태일 뿐이다. 일반 Google SSO나 VERIFIED 주소만으로
최근 이메일 OTP 소유 증명이 있다고 표시하지 않는다.

## 3. 공통 이메일 재인증

| 목적 | 발급 입력 / 응답 | 검증 입력 / 응답 |
|---|---|---|
| REAUTH | POST `/api/v1/auth/reauth/email/request` `{}` → 202 ACCEPTED/challengeId | POST `/api/v1/auth/reauth/email/verify` `{challengeId,code}` → 204 |
| CONTACT_ENROLL | POST `/api/v1/auth/reauth/email/registration/request` `{candidateId}` → 202 ACCEPTED/challengeId | POST `/api/v1/auth/reauth/email/registration/verify` `{candidateId,challengeId,code}` → 204 |

모든 발급은 사용자 클릭으로만 수행한다. 수신 주소/userId/legacy EMAIL identityId를 본문에 넣지 않는다.
서버가 고른 VERIFIED 연락처 또는 현재 세션의 후보 하나만 사용한다.
5분 수명·60초 재발송 대기·최대 5회 오답을 안내하며 실제 제한은 서버가 판단한다.
중복 클릭을 직렬화하고 429 Retry-After는 발급/검증 대기에 반영한다. 자동 발송/재발송은 없다.

쓰기 전 서버 UUID·새 CSRF·연락처/후보를 재확인한다. 204 이후 기존 challenge와 CSRF를 폐기하고
회전된 서버 세션이 같은 UUID인지 검사한 뒤 새 CSRF·identities·contact를 조회한다.
조회까지 VERIFIED로 확인한 경우에만 최근 완료 피드백을 표시한다.
이는 이 화면에서 확인한 결과의 10분 안내이며 서버의 EmailOwnershipProof/권한 판단을 대체하지 않는다.
서버의 최초 로그인 시각·90일 절대 만료·재인증 세션 회전 구현은 수정하지 않았다.

오답/만료 401 OTP_INVALID는 로그아웃으로 단정하지 않는다. 세션 인증 401은 비로그인으로 처리한다.
CSRF_INVALID는 재확인을 안내하고 요청을 자동 재실행하지 않는다. 503·네트워크·타임아웃·잘못된 응답도 구분한다.
검증이 소비됐을 수 있는 불확실한 응답 또는 204 후 조회 실패는 challenge를 비우고 연결 확인 상태로 전환한다.
같은 OTP를 자동 재제출하거나 성공으로 추정하지 않는다.

코드 입력은 제출·닫기·새 challenge·사용자 변경·화면 종료 때 비운다. URL/로그/localStorage/sessionStorage에 저장하지 않는다.
뒤로가기/popstate/bfcache 복귀 시 계정/OTP/form/최근 표시를 초기화하고 서버를 다시 읽는다.
진행 중 요청은 세대 번호 및 전후 UUID 검사로 이전 계정 데이터에 반영되지 않게 한다.
같은 화면의 단순 재조회는 브라우저 history에 중복 `/account` 항목을 만들지 않는다.
실제 세션 ID는 React에서 읽지 않으며 같은 UUID의 다른 세션에서 코드를 사용할 수 없는 최종 경계는 기존 서버 바인딩이다.

## 4. Google-only 최초 대표 이메일 등록

1. REQUIRED 상태에서 서버가 반환한 기존 Google identity로만 확인 form을 준비한다.
2. 현재 세션과 새 CSRF를 확인한 뒤 고정 `/oauth2/contact/google` form POST를 보여 준다.
3. 사용자가 ‘Google에서 이메일 확인 계속’을 누르면 hidden identityId와 `_csrf`를 일반 브라우저 navigation으로 전송한다.
4. 서버가 기존 issuer/sub 및 서명된 email/email_verified를 확인하고 후보를 생성한다.
5. 고정 React 복귀 뒤 session/identities/contact를 새로 읽는다. 후보는 아직 REQUIRED다.
6. 사용자가 후보 발급을 명시 요청하고 실제 OTP를 검증해야 VERIFIED로 표시한다.

Google 비밀번호 강제 재인증이라고 안내하지 않는다. `auth_time` 재인증은 기본 비활성을 유지한다.
주소 입력창·Google LINK·Google REAUTH 우회·자동 EMAIL identity 생성/계정 병합은 없다.
등록 취소는 기존 cancel API를 호출하고 후보를 새로 조회한다. 이미 VERIFIED인 연락처는 바꾸지 않는다.
취소/다른 Google 신원/검증 실패의 콜백은 고정 실패 화면으로 안내하며 등록 완료를 표시하지 않는다.
후보가 만료돼 사라지면 새 Google 확인부터 진행하도록 안내한다.

EMAIL-only REQUIRED는 기존 서버 정책상 검증된 EMAIL OTP 로그인으로 소유권을 다시 입증하도록 안내한다.
기존 계정을 로그아웃 후 같은 EMAIL로 로그인하면 서버의 verifiedEmailLogin 경로가 최초 등록을 시도한다.
주소가 다른 기존 대표 연락처를 덮어쓰거나 존재하지 않는 별도 이메일 등록 API를 만들지 않았다.
신원이 아예 없는 응답에는 로그인 수단 재조회를 안내한다.

## 5. 최소 백엔드 변경: CONTACT 복귀

`AUTH_CONTACT_FRONTEND_RETURN_URI`를 추가했다. 빈 기본값은 기존 CONTACT 성공 API/실패 경로를 유지한다.
local의 허용 값은 `http://localhost:3000/account/contact/complete` 하나이며 실패는 같은 origin의 `/account/contact/failed`다.
production 혼합 프로필을 포함한 비로컬에서는 운영자가 명시한 HTTPS origin의 같은 고정 경로/기본 HTTPS 포트만 허용한다.
기존 LOGIN 검증 함수를 공유해 userinfo/query/fragment/CRLF/다른 경로/포트/인코딩 변형을 거절한다.
요청 Host/next/returnUrl이나 email/sub/token/code/state로 목적지를 만들지 않는다.

LOGIN의 `AUTH_FRONTEND_RETURN_URI`와 독립적이며 LINK/조건부 REAUTH에는 적용하지 않았다.
CONTACT POST/CSRF·공식 OIDC 검증·기존 identity/세션 바인딩·후보 생성 경계를 유지한다.
Google Console의 기존 localhost:8080 CONTACT 콜백도 그대로다. React 경로로 대신 등록하지 않는다.
현재 실제 `.env`에는 새 값을 쓰지 않았으며 후속 승인 LIVE에서 해당 서버 프로세스에 적용하면 된다.
기존 기본 경로를 검증하는 통합 테스트 5개 클래스에는 새 설정의 빈 인자를 명시해 로컬 설정과 격리했다.

## 6. 320px 및 디자인 검증

인증 하단에 `.auth-legal`만 추가했다. 350px 이하에서는 세로 배치, 그 이상에서는 기존 가로 배치를 유지한다.
라벨에 nowrap을 적용해 ‘개인정보 처리방침’의 마지막 글자 단독 줄바꿈을 제거했다.
공통 `.row > button`이나 운동 UI CSS는 변경하지 않았다.

| 폭 | 로그인/계정 가로 넘침 | 약관 배치 | 계정 버튼 최소 높이 |
|---:|---|---|---:|
| 320 | 없음 | 세로, 문구 중간 끊김 없음 | 48px |
| 375 | 없음 | 기존 가로 | 48px |
| 390 | 없음 | 기존 가로 | 48px |
| 1440 | 없음 | 기존 가로 | 48px |

primary 실측은 rgb(59,130,246), 즉 #3B82F6이다. 기존 글꼴·타이포그래피·카드·버튼·입력창 스타일을 재사용한다.

## 7. 자동화 및 브라우저 결과

| 실행 | 결과 |
|---|---|
| `npm test` | **215개 통과**, 기존 173 + 신규 42, 실패/취소/skip 0 |
| `npx tsc -b` | 통과 |
| `npm run lint` | 통과 |
| `npm run build` | 통과, Vite 8.3.5 |
| `gradlew.bat test integrationTest build --no-daemon --console=plain` | **409개 통과**, 기존 388 + 신규 21 |
| 서버 구분 | 단위 74 / PostgreSQL 통합 335, 실패/error/skip 0 |

프론트는 계정 종류/익명/마스킹/REQUIRED/후보/취소, 수신 주소 미입력, 202→204, UUID 혼용 방지·CSRF 갱신,
중복/대기·오답·만료·429·503·네트워크·204 후 조회 실패·뒤로가기 중 응답·로그아웃·storage 미접근을 검사했다.
서버는 PostgreSQL 18.6 Testcontainers와 서명된 테스트 OIDC로 CONTACT 고정 복귀, form CSRF, 취소/다른 sub,
미검증 이메일/잘못된 서명/만료/wrong state, 메타데이터/기존 사용자 보존과 기본 LOGIN·기존 전체 회귀를 검사했다.
기존 테스트를 제거하거나 보안 조건을 완화하지 않았다. 최종 검증 실패는 없다.

브라우저는 실제 React 코드와 **격리 fake API**만 사용했다. EMAIL 로그인/재인증 오답 후 입력 삭제/성공,
새로고침 최근 표시 초기화, Google LOGIN, CONTACT form POST/후보/취소/실패/등록 OTP 성공,
복수 수단·429 120초 대기·계정 GET 503·뒤로가기·로그아웃을 직접 확인했다.
이 fixture 브라우저 결과를 실제 Google/Resend/개발 DB LIVE 성공으로 보고하지 않는다.
임시 Vite는 외부 CLI 주입을 피하도록 기존 Node API와 독립 캐시로 실행했다.
긴 페이지 전체 캡처의 하단이 비는 도구 현상은 viewport/스크롤 화면 재캡처로 처리하고 불완전한 임시 증거를 제외했다.
변경 파일 검사 보조 스크립트의 Git 상태 선행 공백 처리 오류는 경로 파싱을 보정해 재실행했다. 최종 링크·민감정보·파일 수 검사는 모두 통과했다.

## 8. 비식별 화면 증거

모든 주소는 가짜 마스킹 표시 또는 빈 로그인 placeholder이며 실제 사용자 식별자는 없다.
캡처에 OTP 입력값·쿠키·CSRF·OAuth code/state/token은 포함하지 않았다.

- 로그인: [320](evidence/task-007-1d-2a/login-320.jpg), [375](evidence/task-007-1d-2a/login-375.jpg), [390](evidence/task-007-1d-2a/login-390.jpg), [1440](evidence/task-007-1d-2a/login-1440.jpg).
- 계정: [320](evidence/task-007-1d-2a/account-320.jpg), [375](evidence/task-007-1d-2a/account-375.jpg), [390](evidence/task-007-1d-2a/account-390.jpg), [1440](evidence/task-007-1d-2a/account-1440.jpg), [복수 수단](evidence/task-007-1d-2a/account-mixed-390.jpg).
- 등록: [Google REQUIRED](evidence/task-007-1d-2a/google-required-390.jpg), [후보](evidence/task-007-1d-2a/contact-candidate-390.jpg), [OTP 등록 완료](evidence/task-007-1d-2a/contact-registered-390.jpg).
- 재인증: [오답/빈 입력](evidence/task-007-1d-2a/reauth-error-390.jpg), [완료](evidence/task-007-1d-2a/reauth-success-390.jpg), [429](evidence/task-007-1d-2a/reauth-limited-390.jpg), [계정 조회 오류](evidence/task-007-1d-2a/account-error-390.jpg).
- [비식별 브라우저 검사 JSON](evidence/task-007-1d-2a/browser-checks.json).

## 9. 변경 파일·Git·프로세스

프론트 31개: 기존 인증 6개(api/controller/AuthProvider/AuthApp/LoginScreens/auth.css),
새 account.ts/AccountSettings.tsx, Vite 설정, 기존 auth-ui 테스트/fake 서버, 새 account 테스트,
인증 기술 문서·본 보고서와 증거 17개다.

백엔드 13개: .env.example, GoogleFrontendReturn/GoogleContactSecurity/GoogleBoundOidcSecurity,
기존 복귀 단위 테스트와 신규 GoogleContactFrontendIntegrationTests,
기본 복귀 인자를 격리한 기존 통합 테스트 5개, Google OIDC/공통 대표 이메일 기술 문서다.
모두 이 작업 관련 변경만 미커밋으로 남긴다. 양쪽 main과 시작 HEAD를 유지하며 staged 파일은 없다.

격리 UI/API 첫 PID 162020 및 증거 재캡처용 PID 161192는 종료했다. 3057/3305 리스너가 없고
브라우저 탭·viewport override도 정리했다. Gradle은 no-daemon 실행 후 종료했고 임시 테스트 서버/Testcontainers는 종료됐다.
기존 개발 PostgreSQL은 시작 전/종료 후 모두 exited이며 실행하지 않았다. Docker 컨테이너/볼륨·실제 사용자 데이터를 삭제하지 않았다.
테스트 로그/캐시/빌드 산출물은 Git 제외 경로에만 있으며 인증정보·실제 .env는 변경 파일에 포함하지 않았다.
양쪽 diff 공백 검사·민감정보·증거 링크·제품 번들의 fixture/데모 분리 검사를 확인했다.

## 10. 제한과 후속 검증

- 실제 Google CONTACT의 계정 선택/동의·공식 클레임·Google Console 콜백, Resend 수신/OTP·실제 JDBC 회전은 별도 승인 LIVE가 필요하다.
- CONTACT form 시작 자체가 CSRF/신원 문제로 403/404이면 브라우저에 서버 JSON이 표시될 수 있다. 뒤로 돌아와 새 상태를 조회한다.
  GET 우회/CSRF 제외/임의 redirect나 기존 세션 폐기로 이를 감추지 않았다.
- 같은 UUID의 다른 브라우저 세션 식별은 프론트가 쿠키를 읽어서 판단하지 않는다. 기존 서버 세션·후보/OTP 바인딩이 최종 방어선이다.
- 클라이언트 최근 표시와 서버 EmailOwnershipProof의 유효 여부를 동일시하지 않는다. 새로고침 후 서버 증명을 조회하는 API를 임의 추가하지 않았다.
- 기존 데모 데이터는 인증 화면에서 읽거나 전송하지 않는다. source/자동화 격리 검증이며 사용자의 실제 localStorage를 덤프·해시 비교한 것은 아니다.
- 실제 iPhone 키보드/자동 완성·HTTPS·설치형 PWA·오프라인은 미검증이다.
- 1D-2B에 로그인 수단 연결/해제·대상 확인·최근 서버 이메일 증명 확인·마지막 수단/기존 소유권 충돌 UI가 남는다.
- 대표 이메일 변경·분실 복구·계정 병합·운동 API·데모 이전·운영 배포는 미구현/이번 제외 범위다.

새 주요 의존성/보안 정책/파괴적 변경 승인은 필요하지 않았다. 허용된 최소 CONTACT 복귀 수정 외 범위 확대나 보류 중인 필수 구현은 없다.
