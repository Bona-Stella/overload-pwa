# Task 007-1D-1-LIVE — React 로그인 실제 통합 검증

작성일: 2026-10-28 (Asia/Seoul). 실제 EMAIL OTP·Google 로그인, React 복귀·새로고침·로그아웃 검증 완료.
제품 소스·설정 파일·인증 수단은 변경하지 않았으며 Git staging·Commit·Push는 하지 않았다.

## 1. 시작 상태

| 저장소 | 브랜치 / HEAD | 시작 상태 |
|---|---|---|
| overload-server | main / `fa19afef06241766cb54748c1a22d8a33cde7f5e` | clean, 선행 인증 복귀 구현 커밋 완료 |
| overload-pwa | main / `2cb0e84fef2a77c81e1c1773256130dce5ce8b12` | clean, 선행 React 인증 구현 커밋 완료 |

양쪽 AGENTS.md·기술 규칙, Task 006 v0.3.1, 기존 인증 기술 문서와 프론트 구현 보고서를 확인했다.
선행 자동화는 프론트 173개, 백엔드 388개 통과 상태다. 기존 백엔드 XML도 단위 61개·통합 327개,
실패/error/skip 0으로 확인했다. **이번 LIVE에서 전체 자동화 테스트·빌드를 다시 실행한 것은 아니다.**

실제 서버 `.env`의 Google·Resend·OTP 설정을 값 노출 없이 확인했다. 실제 파일의 최종 해시는 시작 시와 같다.
프론트 실제 `.env`/`.env.local`은 없으며 새로 만들지 않았다.

## 2. 실행 환경과 DB 보호

- Java 25, 기존 Spring Boot local jar와 기존 React/Vite 소스를 사용했다.
- 사용자 브라우저 주소는 `http://localhost:3000`, API/콜백은 `http://localhost:8080`으로 유지했다.
- 서버는 loopback에만 바인딩하고 Google LOGIN 활성, `GOOGLE_REAUTH_ENABLED=false`를 실행 인자로 적용했다.
- 해당 프로세스에서만 `AUTH_FRONTEND_RETURN_URI=http://localhost:3000/auth/complete`와 실메일 허용을 적용했다.
- Vite `/api`·Google 시작 프록시의 목적지는 이번 프로세스에서 localhost:8080으로 지정했다. 제품 설정 파일은 그대로다.
- Google Console 콜백은 기존 `http://localhost:8080/login/oauth2/code/google`를 사용했다.
  React 복귀 경로를 Google 콜백으로 대신 등록하거나 OAuth 설정을 변경하지 않았다.
- 기존 Overload Compose PostgreSQL 컨테이너만 `start`했다. 시작 전 stopped였으며 종료 후 다시 stopped다.
  컨테이너·볼륨을 재생성/삭제하거나 다른 프로젝트 Docker 리소스에 접근하지 않았다.
- Flyway V1~V8은 이미 성공 적용된 상태였다. 각 저장소 마이그레이션의 checksum과 DB 이력이 일치했고 추가 적용은 없었다.
- 읽기 전용으로 DB 기준값을 보관하고 새 pg_dump 백업을 Windows CurrentUser DPAPI로 암호화했다.
  암호화 왕복·PGDMP 헤더·`pg_restore --list` 읽기를 확인했다. DB 복원은 수행하지 않았다.
  백업은 서버의 Git 제외 `build/pwa-auth-live-20261028/database-before.dump.dpapi`에 보존한다.

시작/종료 핵심 데이터는 사용자 4명, 로그인 신원 4개, 운동 종목 80개, 휴식 설정 4개, 대표 연락처 3개로 동일하다.
행 전체 비교로 사용자·신원·운동·설정·대표 연락처·후보·Google 변경 버전·Flyway 이력 보존을 확인했다.
기존 두 실제 계정과 별도 전용 EMAIL/Google 계정의 UUID는 서로 합쳐지지 않았다.

## 3. 실제 React EMAIL OTP 로그인

사용자가 제어하는 기존 전용 EMAIL 계정을 사용했다. 정확한 주소는 채팅이나 보고서에 기록하지 않았다.
로컬 승인 창에서 수신 대상·EMAIL LOGIN 목적·실제 1통을 사용자에게 확인받았다.

| 단계 | 실제 결과 |
|---|---|
| React 이메일 입력 → 메일 요청 | CSRF 포함 POST, 202 |
| 실제 수신 | 사용자 확인 완료 |
| React 6자리 OTP 직접 입력 → 검증 | CSRF 포함 POST, 204 |
| 인증 후 서버 세션 조회 | 200, 기존 전용 EMAIL UUID 일치 |
| 인증된 React 화면 | 사용자가 ‘로그인되었습니다’ 확인 |
| 페이지 새로고침 | 사용자 화면 유지, DB 세션 메타데이터 동일 |
| 로그아웃 및 확인 UI | POST 204, 이어 session 401, 비로그인 화면 복귀 |
| 로그아웃 이후 독립 요청 | 이전 쿠키 401, 해당 JDBC 세션 제거 |

실제 발송 전달은 **승인된 1통**이다. Resend 수락을 반영하는 challenge accepted 시각과 사용자의 실제 수신을 함께 확인했다.
LOGIN challenge는 CONSUMED, 소비 시각 존재, verifier 제거 상태다. 자동 재발송·추가 REAUTH 메일은 없다.
검증 전용 프록시에는 승인 수신처·1회 한도의 추가 차단을 두었다. 승인 전 합성 요청 1건은 로컬에서만 403으로 차단했으며
백엔드/Resend로 전달되지 않았다. 이 차단 검사는 실제 메일 API 보안 검증을 대체하지 않는다.

## 4. 실제 Google 로그인과 React 복귀

사용자가 React Google 버튼을 누르고 기존 전용 Google 신원을 직접 선택했다.
Google 비밀번호·2FA·동의 화면은 사용자가 처리했으며 에이전트가 인증정보를 입력/수집하지 않았다.

- 브라우저 top-level Google 시작 요청 302 → 기존 Spring Boot 콜백 → 고정 React `/auth/complete` 복귀를 확인했다.
- 복귀 호스트는 localhost:3000이고, 프론트 복귀 요청 query에 code/state/access token/ID token/token이 없었다.
- 이후 session API는 기존 전용 Google UUID로 200을 반환했다. 사용자도 인증된 React 화면을 확인했다.
- 새 사용자 생성 없이 사용자 수는 4명으로 유지됐다. EMAIL 계정과 자동 병합되지 않았다.
- 새로고침 후 화면·UUID·세션 메타데이터가 유지됐다.
- React 로그아웃 후 204 → session 401 → 비로그인 화면, DB 세션 삭제 및 이전 쿠키 401을 확인했다.
- 일반 Google SSO에는 EmailOwnershipProof가 없었다. EMAIL OTP 로그인에는 실제 증명이 있었다.

## 5. JDBC 세션·CSRF·만료

두 로그인 모두 실제 PostgreSQL의 Spring Session principal과 SessionMetadata가 예상 UUID에 일치했다.
쿠키를 메모리에서만 사용하는 별도 HTTP 연결 두 번으로 각각 session 200과 동일 UUID를 확인했다.
두 세션 모두 최초 로그인부터 절대 만료까지 정확히 90일이며 새로고침 전후 메타데이터가 같다.

로그인 이전 CSRF를 새 인증 세션에서 사용한 안전한 미지원 메서드 요청은 403이었다.
새 CSRF는 같은 요청에서 CSRF 검사를 통과한 뒤 메서드 불일치 405를 반환했다.
이 검사는 GET 전용 identities 경로의 POST였으며 로그인 수단을 변경하지 않았다.
실제 React의 모든 관찰된 POST에 CSRF 헤더가 있었고 로그인/로그아웃 후 새 CSRF 조회가 있었다.
로그아웃 세션 자체도 무효화되어 이전 쿠키로 보호된 응답을 복원할 수 없었다.

관찰된 SESSION 설정은 HttpOnly, host-only, Path=/, SameSite=Lax였다. Secure=false는 기존 local HTTP 정책이다.
Google 콜백의 직접 8080 응답 헤더를 별도로 보관하지 않았으며, 프록시에서 관찰한 헤더와 실제 포트 간 인증 유지,
기존 공통 쿠키 정책을 근거로 구분한다. OAuth 토큰·쿠키·OTP 원문은 증거 파일에 저장하지 않았다.

### 기존 브라우저 세션에 대한 예외

초기 요청에서 예상 전용 계정 외의 기존 인증 상태가 관찰되어 원인을 확인했다.
사용자는 새 시크릿 창 대신 **기존 로그인 창에서 직접 로그아웃한 뒤** 전용 EMAIL로 로그인했다고 답했다.
그 결과 시작 시 있던 JDBC 세션 9개 중 해당 인증 세션 1개가 제거됐다.
나머지 8개의 행과 속성은 정확히 보존됐다. 이 수동 로그아웃은 제품 결함이나 계정 삭제로 분류하지 않는다.
‘모든 기존 세션이 불변’이라고 보고하지 않으며, 이후 두 전용 로그인 UUID는 예상 계정과 독립적으로 일치 확인했다.
에이전트가 기존 브라우저를 임의로 로그아웃하거나 계정을 수정한 작업은 없다.

## 6. UI 디자인 및 연결 실패

Task 005.5 목업과 현재 로그인 소스를 비교하고, 개인정보 없는 별도 익명 브라우저에서 실제 PWA를 확인했다.

| viewport | 가로 넘침 | 앱 실측 너비 |
|---|---|---:|
| 375×812 | 없음 | 375px |
| 390×844 | 없음 | 390px |
| 320×740 | 없음 | 305px (브라우저 스크롤바 제외) |
| 1440×900 | 없음 | 518px |

기존 목업의 워드마크·제목·Google 버튼·구분선·이메일 폼 순서를 유지했다.
primary 실측은 rgb(59,130,246), 즉 **#3B82F6**이고 붉은 목업 테마로 회귀하지 않았다.
주요 버튼 54px, 입력창 48px, 하단 버튼 48px로 터치 영역을 확보한다.

실제 백엔드를 종료하고 익명 PWA를 새로고침했을 때 ‘연결을 확인해 주세요’와 상태 재확인 버튼을 표시했다.
서버 장애를 정상 비로그인 화면으로 처리하지 않았다. 해당 오류 화면도 가로 넘침이 없다.

개인정보 없는 LIVE 증거:
[375px](evidence/task-007-1d-1-live/login-375.png),
[390px](evidence/task-007-1d-1-live/login-390.png),
[320px](evidence/task-007-1d-1-live/login-320.png),
[데스크톱](evidence/task-007-1d-1-live/login-1440.png),
[실제 서버 종료 오류](evidence/task-007-1d-1-live/connection-390.png),
[레이아웃 실측](evidence/task-007-1d-1-live/layout-checks.json),
[비식별 실제 검증 결과](evidence/task-007-1d-1-live/live-checks.json).

사용자의 OTP 입력·Google 계정 선택 화면은 개인정보 보호를 위해 캡처하지 않았다.
실제 인증 성공/새로고침/로그아웃 화면은 사용자 확인과 API·DB 증거로 검증했다.
로딩·OTP 오류·타이머·가상 Google 실패 등의 기존 자동화/fixture 결과는 선행 보고서의 결과이며 이번 LIVE 성공과 혼동하지 않는다.

## 7. 데모 데이터 경계

제품 소스·기존 `App.tsx`, `App.css`, `index.css`, 운동 모델 및 저장 코드는 변경하지 않았다.
인증된 화면은 계정 연동 준비 화면이며 운동 데모를 실제 계정 기록처럼 표시하지 않는다.
기본 인증 경로가 운동 저장소를 마운트하지 않고 개발용 `/demo`가 별도 배너/경로를 사용하는 기존 구조도 유지한다.
이번 흐름에서 운동 업로드 API·identity 변경 API는 실행하지 않았고 서버 운동 데이터 전체 행은 불변이다.

사용자의 실제 PC localStorage를 별도 덤프하거나 전후 해시 비교하지는 않았다.
따라서 해당 브라우저 저장값의 바이트 단위 보존까지 직접 검증했다고 주장하지 않는다.
저장소 미접근·자동 업로드 없음은 기존 173개 자동화, 변경 없는 소스 경계와 이번 실행 경로를 근거로 한다.

## 8. 문제·미검증 범위

- 인증 기능 결함은 발견하지 않았다. 다만 320px의 하단 약관 버튼에 경미한 표시 문제를 발견했다.
  재현: Windows 브라우저 320×740에서 세로 스크롤바가 있는 로그인 화면 → ‘개인정보 처리방침’의 마지막 글자가 다음 줄로 내려간다.
  기대: 라벨이 어절 중간에서 끊기지 않고 읽힌다. 실제: 마지막 ‘침’이 단독으로 줄바꿈된다.
  원인 위치는 프론트의 공통 `.row > button { flex: 1; }`과 좁은 가용 너비이며 인증/보안 영향은 없다.
  최소 수정안은 인증 화면 하단 버튼에만 전용 클래스를 두어 좁은 화면의 세로 배치 또는 라벨 줄바꿈 규칙을 조정하는 것이다.
  공통 운동 UI CSS는 건드리지 않는 범위로 별도 승인 후 320/375/390px 회귀가 필요하다. 이번에는 제품 코드를 수정하지 않았다.
- 설치된 Vite CLI에 외부 Console Ninja 주입 코드가 있어, 비밀정보를 사용하는 LIVE는 CLI 대신 기존 Vite Node API로 실행했다.
  별도 캐시·silent 로그·loopback 바인딩만 프로세스에 적용했다. 실제 제공된 인증 모듈에 해당 주입 표식이 없음을 확인했다.
  의존성 파일이나 전역 도구 설정은 변경하지 않았다.
- PC Chrome 브라우저 직접 연결 도구는 사용할 수 없어 실제 인증은 사용자가 PC에서 진행했고,
  익명 모바일 검증만 별도 in-app 브라우저를 사용했다. 로그인 검증을 가짜 OIDC로 대체하지 않았다.
- 임시 감사 도구의 HTTP 모듈 이름 충돌과 쿠키 표현 처리 오류를 수정 후 재검증했다.
  제품 코드 오류가 아니며 메일/OTP/Google 요청을 재실행하지 않았다.
- 실기기 iPhone 키보드·OTP 자동 완성·설치형 PWA·HTTPS·운영 reverse proxy·오프라인 동작은 미검증이다.
- 실제 오답·만료·추가 재발송·재인증 메일은 실행하지 않았다. 선행 자동화로 검증된 범위와 구분한다.
- 운동 API 연동·대표 연락처 변경·인증 수단 연결/해제·계정 병합·복구·운영 배포는 수행하지 않았다.

## 9. 종료 및 Git 상태

Spring Boot PID 157956, Vite/관찰기 PID 159776 및 메일 승인 프로세스가 종료됐다.
3000/8080/8091 리스너가 없고 에이전트 검증 탭과 viewport override도 정리했다.
기존 Overload PostgreSQL은 원래의 stopped 상태로 돌렸으며 DB·컨테이너·영속 볼륨·암호화 백업은 보존했다.
임시 소스·클래스·캐시·감사 스냅샷·승인 파일은 정리하고 재현에 필요한 비식별 증거만 문서에 남겼다.
일시적으로 실행 인자에 적용한 실메일/React 복귀 설정은 프로세스 종료와 함께 해제됐다. 실제 `.env`는 불변이다.

최종 Git은 양쪽 main과 시작 HEAD를 유지한다. 서버 작업 트리는 clean이다.
프론트는 본 보고서 1개와 증거 7개, 총 8개 새 파일만 미추적 상태로 남긴다.
양쪽 `git diff --check`와 `git diff --cached --check`는 통과했고 staged 변경은 없다.
V1~V8·Task 006·기존 LIVE 보고서·제품 코드·의존성·비밀 설정은 Git 변경에 포함되지 않는다.
문서/JSON의 실제 비밀값·개인 식별자 포함 여부를 확인했다. Commit·Push는 수행하지 않았다.
