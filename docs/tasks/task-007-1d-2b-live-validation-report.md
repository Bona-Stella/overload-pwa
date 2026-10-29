# Task 007-1D-2B-LIVE — 실제 로그인 수단 관리 검증

작성일: 2026-10-29 (Asia/Seoul).
실제 React·Spring Boot·PostgreSQL·Google OIDC·Resend로 승인된 A→B→C→D를 완료했다.
전용 Google 테스트 계정의 로그인 수단 구성은 시작과 같은 **Google 연결·EMAIL 미연결**로 돌아왔다.
제품 코드·실제 .env·마이그레이션을 변경하지 않았고 Git staging·Commit·Push는 수행하지 않았다.

## 1. 시작 Git·실행 환경

| 저장소 | 브랜치 | 시작·종료 HEAD | 시작 상태 |
|---|---|---|---|
| overload-pwa | main | 42dfedc1d567316881b4b943faf10328cc152135 | clean |
| overload-server | main | 41ba84904c9c212b4b514512461a173e512549c0 | clean |

AGENTS.md, Task 006, 1D-2B 보고서, EMAIL/Google identity·EmailOwnershipProof·세션 문서를 확인했다.
선행 자동화는 프론트엔드 257개·백엔드 441개(단위 95개·PostgreSQL 통합 346개) 통과다.
이번 LIVE에서 이를 재실행하지 않았다. 자동화 결과와 아래 실제 서비스 결과는 구분한다.

Java 25/Spring Boot local/localhost:8080과 기존 Vite Node API/localhost:3000을 사용했다.
Vite CLI는 사용하지 않았으며 실제 main 모듈에서 외부 개발 도구 주입 표식이 없음을 확인했다.
백엔드 및 프론트 프록시 Health는 UP였다. CSRF API는 실제 사용자 브라우저에서 200으로 동작했다.
사용자가 Google Console의 LOGIN·CONTACT·LINK 콜백 3개 등록 유지를 확인했다.
React 복귀 URI로 Google Console 콜백을 대체하지 않았다.

이번 서버 프로세스에만 다음을 명시했다. 실제 .env는 해시 비교로 불변을 확인했다.

- AUTH_FRONTEND_RETURN_URI=http://localhost:3000/auth/complete
- AUTH_CONTACT_FRONTEND_RETURN_URI=http://localhost:3000/account/contact/complete
- AUTH_LINK_FRONTEND_RETURN_URI=http://localhost:3000/account/link/complete
- GOOGLE_OIDC_ENABLED=true, GOOGLE_REAUTH_ENABLED=false
- EMAIL_LOGIN_ENABLED=true, OTP_EMAIL_ENABLED=true

Google 비밀번호·2FA·OTP 입력과 계정 선택은 사용자가 자신의 브라우저에서 직접 수행했다.
에이전트가 사용자 쿠키를 다른 브라우저로 옮기거나 로그인·인증을 우회하지 않았다.

## 2. DB 사전 조건과 새 백업

기존 Overload PostgreSQL 컨테이너만 시작했다. 시작 상태는 exited였고 다른 Docker 프로젝트는 사용하지 않았다.
읽기 전용으로 사용자 4명·identity 4개·대표 이메일 4개·운동 종목 80개·휴식 설정 4개를 확인했다.
Flyway V1~V8의 성공 이력과 소스 checksum이 일치했고 새 마이그레이션은 없었다.

기존 실제 사용자 2개를 과거 암호화 기준 백업과 대조해 보호 대상으로 식별했다.
그 외 기존 전용 계정 중 Google-only·VERIFIED인 유일한 대상 계정을 선정했다.
해당 계정은 EMAIL 미연결이며 대표 주소를 다른 UUID의 EMAIL identity가 소유하지 않았다.
사용자는 이전 2A-LIVE에서 등록한 동일한 전용 Google 계정을 사용할 수 있음을 확인했다.

새 pg_dump를 Windows CurrentUser DPAPI로 암호화했다. 기존 백업은 덮어쓰지 않았다.
암호화 왕복·PGDMP 헤더·pg_restore 목록 읽기를 확인했으며 실제 DB 복원은 수행하지 않았다.
백업은 서버의 Git 제외 위치 build/pwa-identity-live-20261029-1/database-before.dump.dpapi에 보존한다.
이 백업은 해당 Windows 사용자 DPAPI 환경에서 읽는 형식이며 다른 PC의 복원까지 검증한 것은 아니다.

## 3. 별도 승인·실제 메일

계획 승인과 실제 변경 승인을 구분했다. 다음 5건은 각각 실행 직전 로컬 승인 창에서 정확한 전용 UUID·대상·결과를 보여 주고 명시적으로 승인받았다.
승인 호출 자체는 메일을 보내거나 신원을 변경하지 않았다. 사용자가 실제 React 버튼을 눌러 실행했다.
임시 보호 장치는 각 승인과 현재 사용자·세션·해제 identity를 바인딩하고 1회만 전달했다.

| 승인 | 실제 실행 | 결과 |
|---|---|---|
| EMAIL REAUTH 메일 1통 | request 202 → verify 204 | Resend 수락·사용자 실제 수신·직접 입력 완료 |
| A: 대표 EMAIL 로그인 연결 | 1회 | 201 LINKED |
| B: 원래 Google 로그인 해제 | 1회 | 204 |
| C: 동일 Google 신원 재연결 | form POST 1회·사용자 직접 OIDC | 고정 React 복귀·원래 credential DB 확인 |
| D: EMAIL 로그인 해제 | 1회 | 204 |

실제 외부 메일은 **REAUTH 1통**뿐이다. 추가 LOGIN·CONTACT_ENROLL·재발송은 없었다.
신규 REAUTH challenge는 ACCEPTED·CONSUMED·소비 시각 및 verifier 0 초기화를 확인했다.
OTP를 보고서/증거/로그에 저장하거나 자동 재제출하지 않았다.

## 4. A→B→C→D 실제 결과

| 단계 | EMAIL | Google | 사용자·대표 이메일·운동/설정 |
|---|---:|---:|---|
| 시작·실제 Google LOGIN | 0 | 1 | 기존 UUID·VERIFIED 확인 |
| 실제 EMAIL REAUTH | 0 | 1 | 동일 UUID, 이메일 증명 및 세션 회전 |
| A 완료 | 1 | 1 | 동일 UUID·데이터 보존 |
| B 완료 | 1 | 0 | EMAIL 대체 수단·현재 세션 유지 |
| C 완료 | 1 | 1 | 원래 Google issuer/sub가 동일 UUID에 복구 |
| D 완료·새로고침 | 0 | 1 | 시작과 같은 구성·VERIFIED 유지 |

초기 실제 Google LOGIN은 예상 기존 UUID였으며 새 사용자는 생성되지 않았다.
일반 SSO 직후 EmailOwnershipProof는 없었다. 실제 REAUTH OTP 소비 후에만 EMAIL_REAUTH 증명을 확인했다.

A의 EMAIL 주소는 서버의 VERIFIED 대표 이메일이며 다른 사용자 소유 신원을 가져오지 않았다.
B 전에는 EMAIL identity 소유권·대표 주소 일치, EMAIL_LOGIN_ENABLED 및 Google/HMAC/sender 가용성 계약을 확인했다.
같은 수신처의 실제 REAUTH 발송·소유 검증도 완료했다. 추가 메일이 필요한 별도 EMAIL LOGIN까지 실험한 것은 아니다.
Google 해제 후에는 일반 Google LOGIN을 시도하지 않고 기존 EMAIL 수단과 현재 세션을 유지했다.

C는 POST /oauth2/link/google의 HTML form과 CSRF를 유지했다. 사용자가 원래 전용 Google 계정만 직접 선택했다.
React /account/link/complete 복귀 요청에 code/state/token/email/sub query가 없었다.
복귀 주소만으로 판정하지 않고 서버 identities와 DB의 원래 issuer/sub·동일 UUID 소유권을 확인했다.
다른 계정 identity는 이전되지 않았으며 새 사용자는 없었다.

D는 C의 실제 credential 복구를 확인한 후 별도 승인해 진행했다.
최종 새로고침 후 Google 연결됨·EMAIL 연결 안 됨·VERIFIED 유지는 사용자와 독립 HTTP/DB 양쪽에서 확인했다.
EMAIL/Google의 해제 경고(새 가입 가능성, 기존 기록·대표 이메일 보존, 다른 기기 세션 미철회)와 파란색 UI도 사용자가 확인했다.

**복원은 credential 구성의 복원이다.** 해제된 Google 행을 직접 되살리지 않았으며 C에서 identity 행 UUID는 새로 발급됐다.
원래 Google issuer/sub와 Overload 사용자 UUID는 동일하다. DB 전체가 시작 전과 비트 단위로 같다고 주장하지 않는다.

## 5. JDBC·90일·10분·CSRF

- 각 주요 단계에서 현재 principal과 DB 세션이 예상 사용자에 일치했고 독립 세션 요청 2회가 200이었다.
- 실제 REAUTH는 새 JDBC 세션으로 교체됐다. 이전 세션 삭제·이전 쿠키 401·이전 CSRF 403·새 CSRF 통과를 확인했다.
- CSRF 비교는 상태 변경이 없는 GET 전용 identities 경로의 POST를 사용했다. 유효 토큰은 CSRF 검사를 통과한 뒤 405였다.
- 최초 로그인 시각과 정확한 90일 절대 만료는 OTP 재인증과 A~D 전후 모두 불변이다. 실제 90일 대기 실험은 아니다.
- A~D 당시 이메일 증명은 현재 사용자·세션·VERIFIED 연락처·주소 해시·EMAIL_REAUTH 출처에 바인딩됐고 10분 이내였다.
- LINK/UNLINK 자체는 세션 ID·재인증 시각·proof·CSRF 저장값을 바꾸지 않았다. REAUTH 이후 세션 속성 bytes도 불변이었다.
- 최종 새로고침을 검사할 때는 10분이 지나 최근 증명은 false였으나 로그인 세션·VERIFIED·원래 만료는 유지됐다.
  이를 추가 OTP로 갱신하거나 만료된 증명으로 새 민감 쓰기를 시도하지 않았다.
- 기존 인증 세션 행과 속성을 보존했으며 임의 전역 로그아웃은 하지 않았다. 현재 테스트 세션도 명시적으로 로그아웃하지 않았다.
- 쿠키의 HttpOnly·SameSite=Lax·host-only를 관찰했다. local HTTP의 Secure=false는 기존 정책이다.
- JDBC 속성에서 OAuth token/OIDC 사용자 객체 및 JWT 형태의 값이 장기 저장되지 않았음을 확인했다.

## 6. 최종 데이터 보존과 예상 이력

| 항목 | 시작 | 종료 | 판단 |
|---|---:|---:|---|
| 사용자 | 4 | 4 | 기존 행 동일 |
| 로그인 identity | 4 | 4 | A/D EMAIL 추가·삭제, B/C 같은 Google credential 제거·재연결만 발생 |
| 대표 이메일 | 4 | 4 | 모든 행 동일 |
| 운동 종목 | 80 | 80 | 모든 행 동일·전용 사용자 20개 |
| 휴식 설정 | 4 | 4 | 모든 행 동일 |
| Flyway 이력 | 8 | 8 | V1~V8 동일 |
| OTP challenge | 10 | 11 | 승인한 실제 REAUTH 1개 추가 |
| JDBC 세션 | 12 | 13 | 새 로그인·재인증 과정, 기존 인증 세션 보존 |
| Google 해제 세대 행 | 1 | 2 | 대상 계정의 정상 해제 세대 기록 추가 |

기존 실제 2개 계정과 다른 계정의 identity 소유권·개인 데이터·인증 세션/속성은 보존됐다.
기존 LOGIN claim 이력은 동일하다. Google 해제에 따라 대상의 과거 candidate 1개와 CONTACT_ENROLL 이력 1개는
기존 구현대로 live identity FK를 retired 참조로 전환했다. 원래 payload·소비 상태·verifier·실패 예산 등은 보존됐다.
이 참조 퇴역·해제 세대와 정상 인증 제한 이력 증가는 예상된 변경이며 데이터 삭제/초기화가 아니다.

## 7. UI 오류 1건과 판정 한계

A 단계에서 사용자가 ‘대표 이메일 로그인 연결 확인’을 누른 뒤 요청을 완료하지 못했다는 안내를 보고했다.
쓰기를 재실행하지 않고 읽기 전용으로 조사한 결과, 실제 서버의 승인된 EMAIL LINK 1회는 201이었고 DB에도 연결돼 있었다.
해당 구간에 임시 승인 보호 장치가 차단한 요청 1건이 있었으며 외부 전달은 없었다.
사용자는 버튼을 한 번만 눌렀다고 확인했다.

차단 요청의 경로·세부 원인을 기록하지 않아 이것을 추가 클릭, 앱 중복 요청 또는 제품 결함으로 단정할 수 없다.
실제 연결 상태를 확정한 뒤 B~D를 진행해 최종 구성은 안전하게 복원했다.
**상태 확인은 해결됐으나 그 UI 오류의 정확한 원인은 미해결**이다.
후속 승인 LIVE에서는 개인정보 없는 요청 순서·경로·보호 장치 차단 사유를 추가 관찰하는 것이 최소 진단 방안이다.
재현 근거 없이 제품 코드를 수정하거나 승인 횟수 제한을 완화하지 않았다.
별도로 임시 Vite 실행기의 Windows ESM 경로 오류는 실제 인증 시작 전에 file URL 변환으로 해결했다.
이 수정은 Git 제외 임시 도구에만 적용했고 제품 코드나 실제 .env는 바꾸지 않았다.

## 8. UI·미실행 범위

실제 React 상태·OIDC 복귀·재인증·해제 경고·최종 새로고침은 사용자 직접 조작과 실제 API/DB로 확인했다.
실계정 브라우저에 직접 연결한 도구 측정/캡처는 수행하지 않았으며 새 계정 스크린샷도 저장하지 않았다.
따라서 이번 실계정의 320/375/390/1440px 레이아웃, 터치 영역·스크롤의 직접 실측은 **미검증**이다.
기존 [1D-2B 자동화·격리 화면 증거](task-007-1d-2b-validation-report.md)는 이전 결과이며 실계정 LIVE 증거로 대체하지 않는다.
기존 코드·CSS·데모 저장소를 바꾸지 않았고, 데모 운동을 계정 데이터로 업로드하거나 귀속시키지 않았다.
사용자 브라우저 localStorage의 전후 해시를 직접 대조한 것은 아니다.

마지막 수단 거절, 타 계정 EMAIL/Google 충돌, 만료 proof 쓰기, CSRF 오류 쓰기, OAuth 취소·강제 네트워크 장애는
이번 실제 계정에서 의도적으로 발생시키지 않았다. 추가 승인 없는 민감 POST·메일·OAuth 반복은 하지 않았다.
EMAIL 별도 LOGIN 및 복구 후 일반 Google LOGIN도 재실행하지 않았다. 일반 Google LOGIN은 시작 단계에서 실제 성공했다.

## 9. 정리·Git·증거

이번에 실행한 Spring Boot·Vite·임시 승인/관찰 프로세스와 자식 프로세스를 종료했고 3000/8080/8091 리스너 부재를 확인했다.
Overload PostgreSQL은 시작 전 exited 상태로 되돌렸다. 기존 컨테이너·볼륨·계정·DB·새 암호화 백업은 보존한다.
사용자 브라우저를 강제로 닫거나 테스트 계정을 추가 로그아웃하지 않았다.
프로세스 전용 실메일 설정은 서버 종료와 함께 종료됐고 실제 .env는 그대로다.
임시 승인 파일·세션/OTP 스냅샷·도구는 정리하고 암호화 DB 백업만 Git 제외 위치에 유지한다.

최종 Git 변경은 프론트의 이 보고서와 [비식별 실제 검증 JSON](evidence/task-007-1d-2b-live/live-checks.json) 2개 신규 파일뿐이다.
백엔드 작업 트리는 clean이고 양쪽 main·HEAD는 시작과 같다. staging은 비어 있다.
제품 코드·Task 006·Flyway V1~V8·기존 LIVE 보고서·실제 비밀 설정은 변경하지 않았다.
실제 이메일·사용자 UUID·Google sub·OTP·쿠키·CSRF·토큰·비밀키는 이 보고서/증거/Git에 포함하지 않았다.
Git Commit·Push 및 운영 배포는 수행하지 않았다.
