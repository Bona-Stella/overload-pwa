# Task 007-1D-2A-LIVE — 실제 계정 설정·공통 이메일 검증

작성일: 2026-10-29 (Asia/Seoul).
실제 React·Spring Boot·PostgreSQL·Google OIDC·Resend로 Google-only 대표 이메일 최초 등록과 EMAIL 재인증을 완료했다.
제품 코드·실제 .env·인증 정책은 변경하지 않았다. Git staging·Commit·Push는 수행하지 않았다.

## 1. 시작 상태와 선행 검증

| 저장소 | 브랜치 | 시작 및 종료 HEAD | 시작 상태 |
|:---|:---|:---|:---|
| overload-server | main | 3b24789378a2ae70a4d51f150b6a341f25d96d09 | clean |
| overload-pwa | main | 15524e0ca48296175c67b3be5928f77d53ab4595 | clean |

AGENTS.md, Task 006 확정 설계, 관련 계정·인증·세션 기술 문서와 1D-2A 보고서를 확인했다.
선행 자동화 결과는 프론트엔드 **215개**, 백엔드 **409개**(단위 74개·PostgreSQL 통합 335개) 통과다.
이번 LIVE에서 전체 테스트·빌드는 재실행하지 않았다. 아래 실제 서비스 결과와 구분한다.

## 2. 환경과 DB 보호

- Java 25, Spring Boot local, 실제 React Vite를 사용했다. 브라우저 주소는 localhost:3000/8080으로 통일했다.
  서버는 loopback에 바인딩했고 실제 Vite API·OAuth 프록시를 사용했다.
- 일반 Google LOGIN 활성, GOOGLE_REAUTH_ENABLED=false를 유지했다.
  LOGIN/CONTACT 고정 React 복귀 URI는 이번 프로세스 환경에만 적용했다.
- 사용자가 Google Console의 기존 LOGIN·CONTACT 콜백 등록 유지를 확인했다. Console과 실제 .env는 변경하지 않았다.
  필수 비밀 설정은 실제 값 출력 없이 유효성을 확인했다.
- 기존 Overload PostgreSQL 18.6 컨테이너만 시작했다. 시작 상태는 exited였다. 다른 프로젝트 리소스는 사용하지 않았다.
  V1~V8 성공 이력·소스 checksum이 일치했고 추가 마이그레이션은 없었다.
- 사전 데이터 기준을 읽기 전용으로 확보했다. 새 pg_dump는 Windows CurrentUser DPAPI로 암호화했다.
  암호화 왕복·PGDMP 헤더·pg_restore 목록 읽기를 확인했으며 실제 복원은 실행하지 않았다.
  서버 Git 제외 위치 build/pwa-account-live-20261029/database-before.dump.dpapi에 보존한다.

## 3. 승인과 발송

원 요청의 REAUTH 1통·CONTACT_ENROLL 1통 외에 EMAIL 브라우저가 비로그인 상태여서 사용자가
**LOGIN 1통 추가, 전체 최대 3통**을 별도로 승인했다. 전용 Google 계정의 최초 대표 이메일 등록도 명시적으로 승인했다.

각 발송 직전 정확한 수신처·목적·1통을 로컬 승인 창에서 확인했다.
사용자가 실제 React 버튼으로 발송하고 메일함에서 받은 OTP를 React 입력란에 직접 입력했다.
임시 보호 장치는 승인된 사용자·세션·목적·후보·1회 한도에 맞는 요청만 전달했다.
제품의 인증·CSRF·후보·OTP 검증은 우회하지 않았다.

| 목적 | Resend 수락·실제 전달 | 사용자 수신 확인 | OTP 결과 |
|:---|:---|:---|:---|
| CONTACT_ENROLL | 1통 | 확인 | 204, 최초 등록 완료 |
| EMAIL LOGIN | 1통 | 확인 | 204, 기존 계정 로그인 |
| EMAIL REAUTH | 1통 | 확인 | 204, 재인증 완료 |

합계 **3통**, 목적별 각 1통이며 자동 재발송은 없었다.
추가 요청 2건은 로컬 승인 보호 장치에서 외부 전달 전에 차단했다.
사용자는 승인 순서 및 중복 조작 실수였다고 확인했다. 실제 추가 발송이나 제품 자동 재시도로 집계하지 않는다.

## 4. Google-only 최초 등록

1. 기존 전용 Google 계정으로 실제 로그인하고 고정 /auth/complete로 복귀했다.
   기존 UUID를 재사용했으며 신규 사용자·로그인 identity는 생성되지 않았다.
2. React 기본 화면의 ‘계정 설정’에서 Google 연결됨·대표 이메일 REQUIRED를 확인했다.
3. 사용자 직접 POST /oauth2/contact/google을 시작했다. form POST의 CSRF·인증 세션을 유지했다.
   공식 Google 확인 후 고정 /account/contact/complete로 복귀했다.
4. 기존 Google identity에 일치하는 OIDC 확인으로 서버 후보가 생성되고 마스킹 주소가 표시됐다.
   React 복귀 URL에 code/state/token/email/sub query가 없었다.
   후보 단계에서는 VERIFIED 연락처나 이메일 소유 증명을 만들지 않았다.
5. 서버 후보 수신처를 로컬 승인한 뒤 등록 request 202·verify 204를 확인했다.
   승인 수신처·challenge·새 연락처 주소의 해시가 일치했다.
6. 해당 기존 Google UUID에 VERIFIED 대표 이메일 1개가 생성됐다. EMAIL 로그인 identity는 자동 생성되지 않았다.
   사용자는 실제 수신·등록 완료 및 새로고침 후 VERIFIED·Google 연결 유지까지 확인했다.

일반 Google SSO 직후 이메일 소유 증명은 없었다. CONTACT_ENROLL OTP 성공 후에만
현재 user/session/contact/emailHash에 바인딩된 EmailOwnershipProof가 저장됐다.
후보 생성만으로 재인증 시각을 갱신하지 않았고 OTP 성공 때 갱신했다.
이 흐름은 Google 강제 비밀번호 재인증 검증이 아니다.

## 5. EMAIL 로그인·재인증

Google 테스트 세션을 React 로그아웃·확인으로 종료한 뒤 EMAIL 단계를 진행했다.
별도 승인한 LOGIN 1통으로 기존 전용 EMAIL 계정에 로그인하고 EMAIL 연결됨·VERIFIED를 확인했다.
기존 Google 테스트 계정과 서로 다른 기존 UUID이며 계정·연락처가 혼용되지 않았다.

대표 이메일 REAUTH 1통을 별도 로컬 승인했다. request 202·verify 204와 사용자 수신·검증 완료를 확인했다.
수신처는 서버의 VERIFIED 대표 이메일이며 클라이언트 임의 주소로 바꾸지 않았다.
LOGIN 때 EMAIL_LOGIN, 재인증 후 EMAIL_REAUTH 출처의 실제 소유 증명이 저장됐다.
사용자는 새로고침 후 EMAIL 연결됨·VERIFIED 유지를 확인했다.
마지막 React 로그아웃·확인 후 로그인 화면으로 돌아온 것까지 확인했다.

## 6. JDBC 세션·CSRF·OTP

- 실제 JDBC principal이 각 예상 사용자와 일치했고 독립 HTTP 요청 2회로 인증 복원을 확인했다.
- CONTACT_ENROLL 및 EMAIL REAUTH 성공 시 세션 ID가 회전했다.
  이전 JDBC 세션 삭제·이전 쿠키 401·새 쿠키 인증 응답 200을 확인했다.
- 로그인 시작 시각과 최초 로그인 기준 정확한 90일 절대 만료는 전후 동일했다.
  OTP 성공 시 재인증 시각만 갱신됐다. 실제 90일 대기 실험은 아니다.
- 이전 CSRF는 403이었다. 새 CSRF는 검사를 통과해 GET 전용 identities 경로의 POST에서 405가 됐다.
  이 비변경 검사에서 연결·해제 API는 호출하지 않았다.
- 증명의 사용자·세션·대표 연락처·이메일 해시 바인딩과 검증 직후 10분 유효성을 확인했다.
  Google 단계의 긴 사용자 대기 후 증명은 10분을 지나 최근 증명으로 인정되지 않았지만 VERIFIED·로그인 세션은 유지됐다.
  정확한 경계값·다른 기기 공격 실험은 이번 LIVE에서 재실행하지 않았다.
- 신규 challenge 3개 모두 목적별 단일 소비, CONSUMED·소비 시각·verifier 제거를 확인했다.
  실제 OTP를 재제출하는 재사용 실험은 하지 않았다.
- 쿠키는 HttpOnly·SameSite=Lax·host-only·Path=/였다. Secure=false는 기존 local HTTP 정책이다.
  JDBC 속성에 OAuth token/OIDC 사용자 객체·JWT 형태 값이 저장되지 않았음을 확인했다.
- 두 전용 테스트 세션의 로그아웃은 CSRF 포함 204였다. 이후 세션 조회 401,
  이전 쿠키의 identities/contact 조회 401과 DB 세션 제거를 확인했다.

## 7. 데이터 보존

| 항목 | 시작 | 종료 | 결과 |
|:---|---:|---:|:---|
| 사용자 | 4 | 4 | 기존 행 동일 |
| 로그인 identity | 4 | 4 | 소유권·행 동일 |
| 운동 종목 | 80 | 80 | 행 동일, 전용 사용자별 20개 |
| 휴식 설정 | 4 | 4 | 행 동일 |
| 대표 이메일 | 3 | 4 | 기존 3개 동일, 승인한 Google 등록만 추가 |
| Flyway 이력 | 8 | 8 | V1~V8 동일 |
| OTP challenge | 7 | 10 | 기존 ID 유지, 목적별 1개 추가 |

기존 실제 EMAIL/Google 두 계정의 개인 데이터·신원·대표 연락처 및 세션 행·속성은 보존됐다.
기존 candidate 행도 동일하다. 신규 후보·OTP 제한/인증 이력·익명 세션은 정상 인증 과정에서 증가했다.
세션 수는 10→12이며 사전 세션 9개 행·속성은 그대로다.
제거된 사전 세션 1개는 Google 로그인 과정의 익명 세션이다. 기존 인증 계정을 임의 로그아웃한 결과가 아니다.
계정 병합·identity 연결/해제·기존 데이터 삭제는 수행하지 않았다.

## 8. UI 증거와 검증 한계

별도 익명 in-app 브라우저에서 실제 React·실제 서버의 로그인 화면을 측정했다.
320/375/390/1440px 모두 가로 넘침이 없고 최소 버튼 높이 48px, primary #3B82F6였다.
320px 개인정보 처리방침 영역은 세로 배치·nowrap이며 다른 너비는 기존 가로 배치를 유지했다.
320px 캡처는 도구에서 305×172 축소 이미지로 저장돼 글자 판독 증거로는 부족하다.
320px 결과는 별도 DOM 실측 JSON으로 확인하며 원해상도 화면 증거는 미확보다.
실제 백엔드 종료 후 390px에서 연결 오류 화면·Google 시작 버튼 미표시를 확인해 정상 비로그인 화면과 구분했다.

실계정 Google·OTP 조작은 사용자 PC Edge에서 수행했다.
계정 설정·후보·등록·재인증·새로고침·로그아웃 상태는 사용자 확인과 실제 API/DB로 검증했다.
**실계정 계정 설정 화면의 모바일 캡처·정확한 반응형 실측은 미완료**다.
네이티브 도구가 현재 브라우저 URL을 확실히 판단하지 못해 캡처를 중단했다.
사용자는 탭을 독립 창으로 옮겼을 뿐 F11 전체화면은 실행하지 않았다.
초기에 전체화면을 원인으로 추정한 안내는 정정했다. 원인은 도구의 URL 확인 제한으로 기록한다.
네이티브 캡처를 우회하거나 가상 화면을 실계정 증거로 대체하지 않았다.
선행 1D-2A의 계정 반응형 자동화 결과는 이번 실제 화면 측정과 구분한다.

증거 7개:

- [로그인 320px 캡처 축소본](evidence/task-007-1d-2a-live/login-320.jpg)
- [로그인 375px](evidence/task-007-1d-2a-live/login-375.jpg)
- [로그인 390px](evidence/task-007-1d-2a-live/login-390.jpg)
- [로그인 1440px](evidence/task-007-1d-2a-live/login-1440.jpg)
- [서버 연결 오류 390px](evidence/task-007-1d-2a-live/connection-390.jpg)
- [반응형 실측](evidence/task-007-1d-2a-live/layout-checks.json)
- [비식별 LIVE·보존·정리 검증](evidence/task-007-1d-2a-live/live-checks.json)

## 9. 문제와 미검증 범위

제품 결함은 발견하지 않았고 제품 코드를 수정하지 않았다.
등록 후 ‘몇 초 후 요청 가능’ 카운트다운은 60초 발송 대기 표시이며 등록 실패가 아니다.
로컬 승인 전/중복 요청 2건은 외부 전달 없이 차단했고 사용자 조작 경위를 확인했다.
네이티브 실계정 화면 캡처 제한은 위와 같이 미검증으로 남긴다.

Google 계정의 일반 REAUTH 실메일, 대표 이메일 변경·복구, 로그인 수단 연결·해제,
다른 기기 증명 재사용·동시성·정확한 만료 경계는 이번 LIVE에서 실행하지 않았다.
최초 등록 성공을 Google 계정 일반 REAUTH 실발송까지 검증한 것으로 확대하지 않는다.
Google-contact 시작의 403/404 JSON 노출은 자연 발생하지 않았으며 인위적으로 재현하지 않았다.
사용자 Edge의 localStorage 데모 데이터는 원문 수집이나 전후 해시 대조를 하지 않았다.
인증 화면과 데모의 분리 코드는 그대로지만, 해당 브라우저 데모 저장소의 전후 동일성은 이번 LIVE의 직접 검증 범위가 아니다.
운동 API 연동·업로드·계정 귀속 작업은 수행하지 않았다.

## 10. 종료·파일·Git

자신이 실행한 Spring Boot·Vite·임시 관찰/승인 프로세스와 관련 자식 프로세스를 종료했고
3000/8080/8091 리스너가 없음을 확인했다. 에이전트의 임시 브라우저 탭을 닫고 viewport를 복구했다.
사용자 브라우저 창은 닫지 않았다.
Overload PostgreSQL은 최초 exited 상태로 되돌렸다. 컨테이너·볼륨·DB·승인한 등록 결과는 보존한다.
임시 helper·인증 스냅샷·승인 파일은 정리하고 위 암호화 백업만 Git 제외 위치에 유지한다.
실제 .env 해시와 양쪽 HEAD는 시작 전후 동일하다. 프로세스 전용 설정은 서버 종료와 함께 종료됐다.

최종 변경은 프론트엔드 보고서 1개·증거 7개, 총 8개 신규 파일뿐이다.
백엔드 작업 트리는 clean이고 양쪽 staging은 비어 있다.
제품 코드·Task 006·V1~V8·이전 LIVE 보고서·의존성·실제 비밀 설정은 변경하지 않았다.
양쪽 git diff --check·git diff --cached --check 및 상대 증거 경로를 확인했다.
Git Commit·Push는 수행하지 않았다.
