# 서버 세션 인증 — Task 007-1D-1 / 1D-2A

`/`는 실제 인증 API를 사용하는 React 화면이다. 최종 로그인 여부의 근거는 GET session의 서버 응답뿐이다.
`/account`는 인증된 계정의 로그인 수단 조회·대표 이메일 등록·이메일 재인증 화면이다.
Google/이메일 로그인 수단 연결·해제·대표 이메일 변경·운동 API는 포함하지 않는다.

## 디자인 기준

Task 005.5의 `src/features/auth-preview/AuthScreens.tsx`, `auth-preview.css` 및
`docs/tasks/evidence/task-0055-entry-375.jpg`를 확인했다. 기존 목업의 워드마크·제목·Google 우선 배치·구분선·폼·OTP 카드,
타이포그래피·버튼/입력창 크기를 유지한다. 현재 앱의 `index.css`/`App.css` 색상을 우선해 파란 primary를 사용한다.
실제 화면은 가상 계정 선택·개발 패널·테스트 코드·연결/해제 및 가상 가입 동의를 포함하지 않는다.
약관/개인정보 문서는 아직 준비 중이며 임의 법적 동의나 닉네임 저장 성공을 만들지 않는다.

## 구조와 상태

- `api.ts`: 자격정보 포함/no-store fetch, 타임아웃, 응답 검증, 서버 headerName/token, 오류와 Retry-After.
- `controller.ts`: 메모리 전용 상태와 요청 직렬화. checking / anonymous / authenticated / unavailable 및 처리 중 종류를 구분한다.
- `AuthProvider`: StrictMode 시작 중복 방지·서버 복원, bfcache 복귀 시 재조회. 알려진 OAuth 복귀 경로는 `/`로 정리한다.
- `LoginScreens` / `AuthApp`: 기존 로그인·OTP 구조와 연결 확인·인증된 준비 화면·로그아웃 확인 상태.

session 401만 정상 비로그인으로 해석한다. OTP verify 401 OTP_INVALID는 코드 오류/만료로 표시한다.
네트워크·5xx·응답 파싱 오류는 unavailable로 구분해 로그인하지 않았다고 추정하지 않는다.
인증·CSRF·이메일/challenge는 메모리에만 두고 쿠키·OAuth token은 읽거나 저장하지 않는다.
OTP 입력은 검증 제출·성공·취소·화면 종료 때 비우며 URL·로그·분석 도구에 넣지 않는다.

## 연결 API

| 요청 | 계약 |
|---|---|
| GET `/api/v1/auth/session` | 200 `{userId}` / 401 비로그인 |
| GET `/api/v1/auth/csrf` | 200 `{headerName,token}` |
| POST `/api/v1/auth/email-otp/request` | `{email}` → 202 `{status:"ACCEPTED",challengeId}` |
| POST `/api/v1/auth/email-otp/verify` | `{email,challengeId,code}` → 204, 새 세션 재조회 |
| POST `/api/v1/auth/logout` | CSRF + `{}` → 204, session 401 확인 및 새 CSRF |
| GET `/oauth2/authorization/google` | 버튼의 top-level navigation, fetch 사용 안 함 |

모든 POST는 서버가 준 CSRF 헤더를 사용한다. 204 검증/로그아웃 뒤에는 기존 토큰을 비우고 새로 조회한다.
403 CSRF_INVALID에서도 토큰을 비우며 쓰기 재시도는 사용자가 명시적으로 요청할 때만 한다.
요청 중 중복 클릭을 막고 5분·60초는 안내용 타이머로 표시한다. 429 Retry-After는 재요청 대기시간에 반영한다.
주소 변경/취소로 현재 메모리의 대기시간을 우회하지 않는다. 새로고침 후에도 서버 제한은 그대로 적용된다.
요청 실패·타임아웃·응답 불확실 시 자동 재발송하지 않는다. 새 challenge가 수락되지 않았으면 코드 검증을 허용하지 않는다.
코드 검증의 429는 검증 버튼과 발송 모두 Retry-After까지 막는다. 검증 결과가 네트워크/5xx 등으로 불확실하면
challenge를 비우고 연결 확인 상태에서 서버 세션만 재조회한다. 소비됐을 수 있는 OTP를 자동/무조건 재제출하지 않는다.
백엔드는 오답·만료를 모두 OTP_INVALID로 응답한다. 임의의 별도 서버 오류를 만들지 않고, 프론트의 알려진 5분 만료만 별도 안내한다.

## 로컬 실행과 Google 복귀

1. 기존 서버 `.env`와 Compose 개발 PostgreSQL은 백엔드 실행 문서대로 준비한다. 실메일·Google LIVE는 별도 승인 작업이다.
2. 서버의 기본 Google 성공은 기존 `/api/v1/auth/session`, 실패는 기존 `/auth/google/failure`를 유지한다.
   PWA 복귀를 사용할 때만 서버 실행 환경에 `AUTH_FRONTEND_RETURN_URI=http://localhost:3000/auth/complete`를 명시한다.
   실제 `.env`는 이번 작업에서 바꾸지 않았다. local 프로필의 이 값은 위 주소만 허용하고 실패는 같은 origin의 `/auth/failed`다.
3. 기존 Google Console LOGIN 콜백 `http://localhost:8080/login/oauth2/code/google`는 그대로다.
   CONTACT/LINK 콜백과 이번 LOGIN 복귀를 혼용하지 않으며 GOOGLE_REAUTH_ENABLED=false를 유지한다.
4. 프론트 저장소에서 `npm run dev`, 브라우저는 **http://localhost:3000/** 를 사용한다.
   `/api`와 Google 시작 경로는 Vite가 `http://127.0.0.1:8080`으로 전달하고, Google 콜백은 기존 8080으로 돌아온다.
   host-only SESSION은 localhost 호스트에서 포트 사이에 유지된다([RFC 6265 §8.5](https://datatracker.ietf.org/doc/html/rfc6265#section-8.5)). 브라우저에서 localhost와 127.0.0.1/LAN IP를 섞지 않는다.
5. 프론트 복귀는 고정 경로만 사용한다. 임의 next/returnUrl·OAuth code/state/token을 복귀 URL에 넣지 않는다.
   complete 경로만으로 성공하지 않고 session을 다시 확인한다. 실패 복귀도 실제 로그인 성공으로 추정하지 않는다.

기존 Vite host:true LAN 데모 설정은 유지했다. iPhone/LAN Google 인증·HTTPS는 이번에 검증하지 않았다.
Vite 프록시는 개발 전용이다. 운영은 동일 호스트 HTTPS에서 `/api`·OAuth 시작/콜백을 백엔드로 라우팅하고,
프론트 고정 `/auth/complete`·`/auth/failed`는 SPA로 라우팅해야 한다. 비로컬 복귀 설정은 명시적 HTTPS 고정 경로만 허용한다.
임의의 다른 호스트 CORS·쿠키 Domain 공유·Secure/SameSite 완화는 추가하지 않았다. 운영은 별도 검증 대상이다.

## 데모 데이터와 검증

기존 `overload.core.v1` 데이터와 운동 소스는 수정/삭제하지 않는다. 기본 인증 화면은 운동 저장소를 import/마운트하지 않는다.
운동 데모는 개발 빌드의 `/demo`에서 계정과 무관한 기기 데모임을 명시하며 별도 실행한다.
인증된 UUID로 데모 키를 연결·자동 업로드하지 않는다. `/auth-preview`도 기존 개발용 가상 목업으로 보존한다.
로그아웃 후 계정 메모리 상태를 비우지만 데모 저장 데이터는 유지한다. 생산 JS에는 데모 저장소/가상 인증 코드를 포함하지 않는다.

```powershell
npm test
npx tsc -b
npm run lint
npm run build
```

테스트는 기존 Node test·React SSR을 사용한다. `tests/fixtures/auth-server.mjs`는 브라우저 검증 전용 loopback HTTP 가짜 서버이며,
메일·Google·DB에 접속하지 않고 생산 코드에서 import하지 않는다. 테스트 OTP는 이 fixture에만 존재한다.
서명된 OIDC와 실제 PostgreSQL은 백엔드 Testcontainers 회귀에서 별도로 검증한다.
설치형 PWA·오프라인 서비스 워커·실제 iPhone 및 실서비스 Google/Resend 브라우저 검증은 별도 후속 작업이다.

공식 참고: [React 외부 상태 구독](https://react.dev/reference/react/useSyncExternalStore),
[Vite 프록시 설정](https://vite.dev/config/server-options.html#server-proxy),
[쿠키 속성](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

## Task 007-1D-2A: 계정·대표 이메일·재인증

기존 AuthController 안의 `account` 상태를 사용하고 별도 인증 저장소를 만들지 않는다.
연결된 수단은 GET `/api/v1/auth/identities`의 소문자 provider로 표시하며 UUID는 내부 동작에만 사용한다.
GET `/api/v1/auth/reauth/email/contact`의 VERIFIED/REQUIRED와 `maskedEmail`만 표시한다.
원문 주소·Google sub/issuer·토큰을 수신 DTO의 추가 필드에서 복사하지 않는다.
현재 서버의 `첫 문자 + ***@***` 마스크 계약과 UUID/provider 형식을 검증한다.

- 일반 재인증: POST `/api/v1/auth/reauth/email/request` `{}` → 202 challengeId.
- 최초 등록 발급: POST `/api/v1/auth/reauth/email/registration/request` `{candidateId}` → 202 challengeId.
- 검증: 각 경로의 `/verify`에 `{challengeId,code}`, 등록만 candidateId 추가 → 204.
- 등록 취소: POST `/api/v1/auth/reauth/email/registration/cancel` `{}` → 204 후 서버 상태 재조회.

수신 주소/userId/선택적 legacy EMAIL identityId는 OTP 본문에 넣지 않는다.
모든 쓰기 전에 같은 UUID의 서버 세션·새 CSRF·서버 연락처/후보를 확인한다.
검증 성공 후 회전된 세션 UUID가 같은지 다시 확인하고 CSRF와 계정 데이터를 새로 조회한다.
204 이후 조회 실패/네트워크·5xx 등 결과 불확실은 challenge를 버리고 연결 확인 상태로 전환한다.
성공으로 추정하거나 소비됐을 수 있는 OTP를 자동 재제출하지 않는다.

OTP는 메모리 전용이고 입력은 제출/닫기/후보 변경/화면 종료 시 비운다. 5분/60초/5회와 Retry-After를 안내하며
클릭 직렬화·발급/검증 대기를 적용한다. 화면을 닫았다 다시 열어도 같은 메모리의 발급 대기는 유지한다.
전체 새로고침 이후 제한은 서버가 최종 판단한다. 자동 발송/재발송은 없다.
401 OTP_INVALID는 오답/만료/바인딩 오류이며 로그아웃으로 단정하지 않는다. 인증 세션 401은 비로그인이다.
계정 GET 5xx/네트워크 오류는 재조회 안내이며 정상 비로그인과 구분한다.

Google-only REQUIRED에서는 현재 서버가 반환한 Google identity로 확인 form을 준비한다.
새 CSRF를 받은 후 `<form method="post" action="/oauth2/contact/google">`에 hidden identityId와 `_csrf`를 넣고
사용자가 계속 버튼을 눌러 일반 브라우저 이동을 수행한다. OAuth 시작을 fetch로 추적하거나 GET으로 바꾸지 않는다.
Vite는 이 경로도 기존 loopback API target에 프록시한다.
서버에 `AUTH_CONTACT_FRONTEND_RETURN_URI=http://localhost:3000/account/contact/complete`를 명시한 경우
확인 성공/실패는 각각 고정 complete/failed 경로로 복귀한다. 기존 LOGIN 복귀 설정과 독립적이다.
복귀 URL은 인증 근거가 아니며 session/identities/contact를 다시 조회하고 `/account`로 URL을 정리한다.
후보만 있으면 계속 REQUIRED다. 사용자가 후보 발급을 요청하고 OTP를 검증해야 VERIFIED가 된다.
EMAIL-only REQUIRED는 정상 EMAIL OTP 재로그인으로 실제 소유권을 다시 입증하도록 안내하며 새 등록 API를 만들지 않는다.

일반 Google 로그인·VERIFIED 주소만으로 최근 이메일 소유 증명을 추정하지 않는다.
`confirmedAt`은 이번 화면의 204·같은 UUID·CSRF·VERIFIED 재조회까지 완료한 뒤 표시하는 메모리 피드백이다.
10분 안내는 서버 인가가 아니다. 서버 EmailOwnershipProof를 복제/재구성하지 않으며 새로고침하면 이 안내도 초기화한다.
뒤로가기/popstate/bfcache 복귀는 계정/OTP/form/최근 표시를 지우고 서버를 다시 확인한다.
진행 중 응답은 세대 번호와 UUID 전후 검사로 오래된 계정 데이터에 적용하지 않는다.

320px 약관은 인증 전용 `.auth-legal` 세로 배치를 사용하며 375px 이상은 기존 가로 배치를 유지한다.
공통 `.row > button`, 운동 소스/데모 저장소/Task 005.5 목업은 변경하지 않는다.
CONTACT 시작 자체가 CSRF/신원 오류로 거절되면 서버 JSON이 브라우저에 표시될 수 있다. 뒤로 돌아와 서버 상태를 재조회한다.
CSRF 우회나 일반 LOGIN 실패 처리로 기존 인증 세션을 폐기하는 대안은 사용하지 않는다.

실제 Google/Resend/개발 DB는 이번 구현 테스트에서 사용하지 않는다.
결과·비식별 화면·후속 LIVE 범위는 [1D-2A 보고서](../tasks/task-007-1d-2a-validation-report.md)를 따른다.
