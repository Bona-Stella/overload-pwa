# 서버 세션 인증 — Task 007-1D-1

`/`는 실제 인증 API를 사용하는 React 화면이다. 최종 로그인 여부의 근거는 GET session의 서버 응답뿐이다.
Google/이메일 로그인 수단 관리·대표 이메일 변경·운동 API는 이 단계에 포함하지 않는다.

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
