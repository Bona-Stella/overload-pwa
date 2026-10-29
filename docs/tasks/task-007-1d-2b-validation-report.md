# Task 007-1D-2B — EMAIL·Google 로그인 수단 관리 UI 검증

작성일: 2026-10-29 (Asia/Seoul).
기능 구현·격리 자동화·브라우저 검증을 수행했다. 실제 Google/Resend 요청, 개발 DB 변경, Git staging·Commit·Push는 수행하지 않았다.

## 1. 시작 상태와 범위

| 저장소 | 브랜치 | 시작 HEAD | 상태 |
|---|---|---|---|
| overload-pwa | main | 2c847818f371d7758d39248057ac4dc9793c25fd | clean |
| overload-server | main | 3b24789378a2ae70a4d51f150b6a341f25d96d09 | clean |

선행 1D-2A 구현과 2A-LIVE 보고서·증거는 커밋되어 있었다. 기존 미커밋 작업은 없었다.
양쪽 AGENTS.md, 기술 규칙, Task 006, 2A/2A-LIVE 보고서, 계정·OTP·Google·대표 이메일·세션 계약을 확인했다.
기존 AuthApi/AuthController/AuthProvider/AccountSettings를 확장하고 IdentityManagement 표시 컴포넌트를 추가했다.
별도 인증 저장소·새 의존성·새 DB 모델·마이그레이션은 도입하지 않았다.

## 2. UI와 API

| UI 동작 | 실제 서버 계약 | 완료 표시 조건 |
|---|---|---|
| 이메일 로그인 연결 | POST /api/v1/auth/identities/email/link, 빈 JSON | 201 LINKED 또는 200 ALREADY_LINKED를 검증하고 같은 UUID의 identities/contact 재조회 |
| EMAIL 해제 | POST /api/v1/auth/identities/email/unlink, identityId만 | 명시적 최종 확인·204 후 대상 부재 재조회 |
| Google 연결/추가 연결 | HTML form POST /oauth2/link/google, _csrf만 | 고정 React 복귀 후 session/identities/contact 재조회 |
| Google 해제 | POST /api/v1/auth/identities/google/unlink, identityId만 | 명시적 최종 확인·204 후 대상 부재 재조회 |

VERIFIED 대표 이메일과 EMAIL 로그인 연결 여부는 별도 표시한다. 연락처 등록만으로 EMAIL identity를 표시하거나 생성하지 않는다.
연결 주소 입력창을 만들지 않았으며 서버의 대표 이메일만 사용한다. identity UUID는 요청 내부 값으로만 사용한다.
응답의 원문 주소·Google sub 등 추가 속성은 UI DTO로 복사하지 않는다.

해제 확인에는 대상 제공자와 1개 신원을 표시하고 다음을 안내한다.

- 해제한 이메일/Google로 재로그인하면 새 계정이 생성될 수 있고 이전 계정 기록에 접근할 수 없다.
- 대표 재인증 이메일과 운동 기록은 보존한다.
- 다른 기기의 기존 인증 세션을 즉시 모두 로그아웃시키는 동작은 아니다.
- 마지막 사용 가능한 로그인 수단의 제거는 서버가 거절한다.

최종 확인 전에는 쓰기를 보내지 않으며 취소는 해제 API를 호출하지 않는다.
서버가 실제 기능 설정까지 고려한 409 LAST_LOGIN_IDENTITY를 반환하면 그대로 거절 안내한다.
프론트가 단순 identity 개수로 로그인 가용성을 판정하지 않는다.
타 계정 EMAIL 소유 충돌은 “이 이메일 로그인은 이미 다른 계정에 연결되어 있습니다. 계정은 자동으로 합쳐지지 않습니다.”로 안내한다.
신원 이전·자동 병합·타 계정 삭제 경로는 없다.

## 3. 실제 이메일 증명과 상태 관리

서버 EmailOwnershipProof의 현재 사용자·세션·VERIFIED 연락처·주소 해시·실제 OTP 출처·10분 정책을 그대로 사용한다.
일반 SSO 시각이나 화면 confirmedAt으로 변경 권한을 추정하지 않는다. 기존 EMAIL LOGIN/REAUTH/CONTACT_ENROLL 증명도 서버가 판단한다.
UI는 유효한 증명이 있을 수 있으므로 재발송을 강제하지 않고 요청을 서버에 전달해 최종 검사받는다.
403 EMAIL_OWNERSHIP_PROOF_REQUIRED는 기존 공통 재인증 섹션으로 안내한다.
새 OTP 화면이나 자동 발송을 추가하지 않았다. OTP 완료 뒤에도 연결·해제는 자동 실행하지 않고 사용자가 다시 선택해야 한다.

쓰기 전후 서버 UUID와 비동기 세대를 검사하고 fresh CSRF를 사용한다. 계정이 바뀌면 이전 대상을 적용하지 않는다.
UNLINK 직전에 서버 목록을 다시 읽어 대상 부재·복수 대상도 거절한다.
모든 쓰기는 직렬화해 중복 클릭을 막는다. POST의 CSRF 오류도 자동 재시도하지 않는다.
네트워크/시간 초과/잘못된 응답/5xx 후에는 읽기 전용 재조회로 현재 상태만 표시하며 성공을 단정하지 않는다.
후속 읽기도 실패하면 오래된 identities/contact를 숨기고 다시 조회하도록 한다.

로그아웃·다른 사용자·뒤로가기·새로고침·bfcache 복귀는 해제 확인과 Google LINK form을 폐기한다.
OTP·CSRF·identity/계정 대기 상태는 메모리 전용이다. localStorage/sessionStorage에 인증정보를 기록하지 않는다.
운동 데모의 저장소·계정 귀속·업로드 기능은 변경하지 않았다.

## 4. Google LINK React 복귀

기존 기본 계약은 성공 /api/v1/auth/identities, 실패 JSON 또는 /auth/google/link/failure다.
새 서버 설정 AUTH_LINK_FRONTEND_RETURN_URI의 기본값은 빈 값이며 기본 계약을 유지한다.
명시적으로 설정했을 때만 다음 고정 목적지를 사용한다.

| 프로필 | 성공 | 실패 |
|---|---|---|
| local | http://localhost:3000/account/link/complete | http://localhost:3000/account/link/failed |
| non-local/production 혼합 | 운영자가 설정한 HTTPS origin의 /account/link/complete | 같은 origin의 /account/link/failed |

기존 LOGIN/CONTACT의 URI 검증을 재사용한다. userinfo·query·fragment·CRLF·임의 포트·다른/인코딩 경로를 거부한다.
요청 Host/forwarded/next/returnUrl을 사용하지 않고 OAuth code/state/token·주소·sub·실패 사유를 복귀 URL에 싣지 않는다.
성공 URL 방문만으로 새 연결 완료를 선언하지 않는다. 서버 session/identities/contact를 재조회하고 현재 Google 연결 상태만 안내한다.
이미 Google이 연결된 계정에서는 이번에 추가된 구체적 Google 계정을 안전하게 식별할 계약이 없어 새 연결 대상을 추측하지 않는다.
실패 URL은 취소·충돌·5분 Pending/10분 proof 만료 등을 안전하게 구분할 수 없어 일반 안내만 표시한다.
익명 복귀는 성공을 표시하지 않고 로그인 필요/일반 실패를 안내한다.

변경은 GoogleLinkSecurity 목적지와 고정 설정뿐이다. issuer/sub·state/nonce/PKCE·서명·원본 세션/proof·해제 세대 검증은 보존했다.
LINK/UNLINK는 기존 사용자 UUID·최초 로그인·90일 절대 만료·대표 이메일·proof·CSRF를 연장하거나 회전하지 않는다.
기존 OTP 재인증의 세션 회전/CSRF 갱신 계약도 유지한다. GOOGLE_REAUTH_ENABLED 기본 false는 변경하지 않았다.

## 5. 오류와 안전한 제한

401 AUTHENTICATION_REQUIRED, 403 CSRF_INVALID/EMAIL_OWNERSHIP_PROOF_REQUIRED,
404 IDENTITY_NOT_FOUND, 409 REAUTH_EMAIL_REQUIRED/IDENTITY_ALREADY_OWNED/LAST_LOGIN_IDENTITY/IDENTITY_CHANGE_SUPERSEDED,
503 IDENTITY_CHANGE_UNAVAILABLE/GOOGLE_LINK_UNAVAILABLE를 기존 계약에 따라 처리한다.
401 OTP_INVALID를 세션 만료로 취급하지 않는 기존 동작을 보존했다.

서버는 같은 provider의 여러 identity를 허용한다. 현재 읽기 API는 id/provider만 제공한다.
따라서 해당 provider가 복수면 개별 EMAIL/Google 해제를 제한한다. UUID·이름·주소로 임의 대상을 꾸미지 않는다.
Google-contact도 복수 Google 신원에서 첫 신원을 임의 선택하지 않는다.
향후 복수 신원을 개별 해제하려면 서버가 안전하게 식별 가능한 표시/확인 계약을 제공해야 한다.

OAuth 시작의 인증/CSRF 필터 401/403, 잘못된 form 400, Google 비활성 503은 기존 JSON 거절 계약이다.
이 경우 브라우저에서 JSON을 볼 수 있다. 뒤로 돌아와 상태를 재조회하며 GET 전환·CSRF 우회·자동 재시작으로 감추지 않는다.
이 제한과 일반 실패 사유의 구분 불가는 제품 권한 검증을 완화하지 않고 문서화했다.

## 6. 자동화·빌드

| 명령 | 최종 결과 |
|---|---|
| npm test | 257개 통과: 기존 215개 보존 + 신규 42개 |
| npx tsc -b | 통과 |
| npm run lint | 통과 |
| npm run build | 통과 |
| gradlew.bat test integrationTest build --no-daemon --console=plain | 441개 통과: 기존 409개 보존 + 신규 32개 |
| 서버 구분 | 단위 95개·PostgreSQL 통합 346개, 실패/error/skip 0 |

프론트는 API 상태/응답 검증·201/200·소유권 충돌·재인증 후 명시적 재시도·해제 확인/취소·마지막 수단 거절·복수 신원,
UUID 변경·CSRF·401/403/404/409/503·불확실 응답 재조회·중복/뒤로가기/로그아웃·storage 미접근을 검사했다.
서버는 PostgreSQL 18.6 Testcontainers·서명된 테스트 OIDC·fake sender를 사용했다.
새 LINK 성공/일반 실패, 충돌, OAuth 취소·bad signature·wrong state·Pending/proof 만료·proof 교체,
callback 목적 혼용 거절, 원본 principal/metadata/proof/개인 데이터 보존과 token 비저장을 검사했다.
기존 기본 JSON 계약 회귀는 LINK 복귀 변수를 빈 값으로 명시해 향후 실제 로컬 설정과 격리했다.
기존 테스트를 제거·비활성화하거나 보안 조건을 완화하지 않았다. 최종 검증 실패는 없다.

## 7. 브라우저·디자인

실제 React 코드와 테스트 전용 loopback fake API로 EMAIL-only/Google-only/혼합/REQUIRED/복수 신원을 확인했다.
201/200, 최종 해제·취소, 마지막 수단 거절, 증명 요구→기존 재인증→명시적 재시도,
Google HTML form POST(_csrf만)·고정 복귀 재조회·일반 실패, 충돌·불확실 응답·새로고침 준비 상태 폐기·로그아웃을 확인했다.
취소 후 unlink 요청 0회, OTP 완료 후 변경 요청 자동 반복 없음, form 준비 후 새로고침 쓰기 0회를 fixture 집계로 확인했다.
이는 실 Google/Resend/개발 DB LIVE 결과가 아니다. 테스트 OTP와 표시 마스크만 사용했다.

320/375/390/1440px 모두 가로 넘침 없음, 최소 버튼 48px, primary rgb(59,130,246)=#3B82F6였다.
기존 카드·제목·간격·Dialog·입력을 재사용했고 로그인 목업·공통 운동 CSS·파란색을 보존했다.
320px 로그인 약관의 세로 배치·nowrap과 가로 넘침 없음을 다시 확인했다.
320px 해제 Dialog도 가로 넘침 없이 표시되고 버튼은 최소 48px이며 기존 overflow-y:auto 계약을 유지했다.
긴 페이지 fullPage 캡처의 이미지 왜곡은 viewport 캡처로 교체했다. 초기 sandbox 서버 접근 오류는 로컬 실행 권한 범위를 조정해 해결했다.

증거는 실제 개인정보·OTP 입력값·쿠키·CSRF·토큰이 보이지 않는 격리 화면이다.

- 계정 설정: [320](evidence/task-007-1d-2b/account-320.jpg), [375](evidence/task-007-1d-2b/account-375.jpg), [390](evidence/task-007-1d-2b/account-390.jpg), [1440](evidence/task-007-1d-2b/account-1440.jpg).
- 연결·해제: [EMAIL 연결](evidence/task-007-1d-2b/email-linked-390.jpg), [EMAIL 확인 320](evidence/task-007-1d-2b/unlink-confirm-320.jpg), [EMAIL 확인 390](evidence/task-007-1d-2b/unlink-confirm-390.jpg), [Google 확인](evidence/task-007-1d-2b/google-unlink-confirm-390.jpg), [마지막 수단](evidence/task-007-1d-2b/last-identity-390.jpg).
- 상태: [증명 필요](evidence/task-007-1d-2b/proof-required-390.jpg), [소유권 충돌](evidence/task-007-1d-2b/ownership-conflict-390.jpg), [불확실 결과](evidence/task-007-1d-2b/uncertain-390.jpg), [복수 신원](evidence/task-007-1d-2b/ambiguous-390.jpg), [연락처 REQUIRED](evidence/task-007-1d-2b/contact-required-390.jpg).
- OAuth: [LINK form](evidence/task-007-1d-2b/google-link-form-390.jpg), [일반 실패](evidence/task-007-1d-2b/google-link-failed-390.jpg).
- [320px 로그인](evidence/task-007-1d-2b/login-320.jpg), [비식별 브라우저 실측](evidence/task-007-1d-2b/browser-checks.json).

## 8. 보존·종료·후속 LIVE

Task 006·Flyway V1~V8·이전 LIVE 보고서·실제 .env·의존성/lockfile·공통 운동 소스는 변경하지 않았다.
기존 개발 DB·사용자·연락처·identity에 접근해 변경하지 않았다. 기존 Overload PostgreSQL은 exited 상태 그대로다.
검증은 일회성 Testcontainers에서만 데이터를 생성·정리했다. 기존 컨테이너·볼륨을 삭제하지 않았다.
브라우저용 fake API/Vite와 관련 자식 프로세스는 종료하고 3000/18081 리스너가 없음을 확인했다.
검증 브라우저 viewport를 복구하고 정상 검증 탭을 닫았다. 초기 연결 오류 임시 탭은 도구의 data URL 접근 제한으로 명시 종료가 제한되어 turn 종료 자동 정리 대상이다.

후속 승인 LIVE에는 기존 LOGIN/CONTACT 콜백을 유지하고 Google Console의 LINK 콜백
http://localhost:8080/login/oauth2/code/google-link 등록 상태를 사용자에게 확인받는다.
서버 프로세스에 LOGIN·CONTACT 복귀와 별개로 AUTH_LINK_FRONTEND_RETURN_URI=http://localhost:3000/account/link/complete를 적용한다.
GOOGLE_REAUTH_ENABLED=false를 유지한다. React 복귀 주소를 Google Console 콜백으로 등록하지 않는다.
전용 테스트 계정·미연결 Google 신원·정확한 OTP 수신처를 확인하고, 실제 발송과 각 연결/해제를 별도 승인받아야 한다.
실제 Google·메일·기존 계정 변경·iPhone HTTPS·운영 배포는 이번에 검증하지 않았다.

## 9. 최종 변경 파일·Git

양쪽 main 및 HEAD는 시작과 동일하며 staging은 비어 있다. Git Commit·Push는 수행하지 않았다.
변경은 아래 이번 작업 파일에만 한정한다. 전체 목록과 개수는 최종 Git 검사로 확인한다.
양쪽 git diff --check 및 git diff --cached --check는 통과했다.
보고서의 증거 18개(스크린샷 17개·JSON 1개) 참조가 실제 파일과 일치한다.
모든 스크린샷을 육안 검토하고 EXIF 부재·비식별 JSON 및 실제 환경 비밀값 미포함을 확인했다.

### overload-pwa — 31개

- `docs/engineering/authentication.md`
- `docs/tasks/evidence/task-007-1d-2b/account-1440.jpg`
- `docs/tasks/evidence/task-007-1d-2b/account-320.jpg`
- `docs/tasks/evidence/task-007-1d-2b/account-375.jpg`
- `docs/tasks/evidence/task-007-1d-2b/account-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/ambiguous-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/browser-checks.json`
- `docs/tasks/evidence/task-007-1d-2b/contact-required-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/email-linked-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/google-link-failed-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/google-link-form-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/google-unlink-confirm-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/last-identity-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/login-320.jpg`
- `docs/tasks/evidence/task-007-1d-2b/ownership-conflict-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/proof-required-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/uncertain-390.jpg`
- `docs/tasks/evidence/task-007-1d-2b/unlink-confirm-320.jpg`
- `docs/tasks/evidence/task-007-1d-2b/unlink-confirm-390.jpg`
- `docs/tasks/task-007-1d-2b-validation-report.md`
- `src/features/auth/AccountSettings.tsx`
- `src/features/auth/AuthProvider.tsx`
- `src/features/auth/IdentityManagement.tsx`
- `src/features/auth/account.ts`
- `src/features/auth/api.ts`
- `src/features/auth/auth.css`
- `src/features/auth/controller.ts`
- `tests/auth-ui.test.mjs`
- `tests/fixtures/identity-browser.mjs`
- `tests/identity-management.test.mjs`
- `vite.config.ts`

### overload-server — 11개

- `.env.example`
- `docs/engineering/google-identities.md`
- `src/main/java/com/overload/overload_server/auth/google/GoogleFrontendReturn.java`
- `src/main/java/com/overload/overload_server/auth/google/GoogleLinkSecurity.java`
- `src/test/java/com/overload/overload_server/auth/google/CommonReauthenticationEmailIntegrationTests.java`
- `src/test/java/com/overload/overload_server/auth/google/EmailIdentityIntegrationTests.java`
- `src/test/java/com/overload/overload_server/auth/google/GoogleContactFrontendIntegrationTests.java`
- `src/test/java/com/overload/overload_server/auth/google/GoogleIdentityIntegrationTests.java`
- `src/test/java/com/overload/overload_server/auth/google/GoogleLinkFrontendIntegrationTests.java`
- `src/test/java/com/overload/overload_server/auth/google/GoogleLinkFrontendReturnTests.java`
- `src/test/java/com/overload/overload_server/auth/google/GoogleOidcIntegrationTests.java`
