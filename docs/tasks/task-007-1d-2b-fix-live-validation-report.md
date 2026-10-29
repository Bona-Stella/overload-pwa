# Task 007-1D-2B-FIX-LIVE — EMAIL 로그인 연결 버튼 집중 검증

작성일: 2026-10-29 (Asia/Seoul).

**최종 집중 검증에서 실제 201 LINKED와 React의 ‘대표 이메일의 로그인 수단을 연결했습니다.’가 일치함을 확인했다.**
사용자는 표시 시점에 문구를 그대로 전달했고, 새로고침 전에 실패 안내 없음·EMAIL 연결됨·해제 버튼 표시를 확인했다.
새로고침 후에도 Google·EMAIL 둘 다 연결 상태가 유지됐다. EMAIL은 자동 해제하지 않고 연결 상태로 보존했다.
이번 정상 경로에서는 과거의 일반 실패 안내가 관찰되지 않았다. **과거 LIVE의 정확한 원인은 여전히 미확정**이다.

아래 **1~6절은 앞선 1차 검증 기록**, **7절은 이번 집중 후속 검증의 최종 결과**다.
1차에서는 서버 연결·복원만 확인됐고 UI 문구가 미확정이었다. 그 원본 JSON을 보존하며 후속 증거를 별도 파일로 추가했다.

## 1. 수정 적용·시작 환경

| 저장소 | 브랜치 | 시작·종료 HEAD | 시작 상태 |
|---|---|---|---|
| overload-pwa | main | 32c96ae6baceb4275597d4bdeeeb797f2b96930f | clean |
| overload-server | main | 41ba84904c9c212b4b514512461a173e512549c0 | clean |

양쪽 AGENTS.md, Task 006, FIX/LIVE 보고서, EMAIL identity·세션·CSRF 계약을 확인했다.
FIX 커밋과 controller.ts 내부 EMAIL_LINK_STATUS_UNCONFIRMED 로직, 실제 제공되는 React 모듈 반영을 확인했다.
선행 프론트엔드 279/279 통과 로그를 확인했으며 이번 LIVE에서 전체 자동화를 재실행하지 않았다.
서버 bootJar는 커밋된 소스로 UP-TO-DATE 빌드였고 local Health 및 React 프록시 Health는 UP였다.

기존 Overload PostgreSQL만 시작했다. 사용자 4명·identity 4개·대표 이메일 4개·운동 종목 80개·설정 4개,
성공한 Flyway V1~V8을 사전 확인했다. 새 마이그레이션은 없었다.
이전 LIVE 백업의 생성 시점과 이후 Google identity 행을 대조해 직전 복원 대상 전용 계정을 유일하게 식별했다.
사용자도 같은 전용 Google 계정을 직접 선택할 수 있으며 LOGIN 콜백 등록이 유지됨을 확인했다.
시작 상태는 Google 1개·EMAIL 0개·VERIFIED였다. 다른 계정과 기존 실제 사용자 데이터는 변경 대상이 아니었다.

새 DB 백업은 Windows CurrentUser DPAPI로 암호화했다. 복호화 왕복·PGDMP 헤더·pg_restore 목록을 검증했다.
실제 DB 복원은 수행하지 않았다. Git 제외 경로인
overload-server/build/pwa-identity-fix-live-20261029/database-before.dump.dpapi에 보존한다.

서버는 Java 25/local/127.0.0.1:8080, 브라우저 URL은 localhost:3000/localhost:8080으로 사용했다.
프로세스 전용 고정 React 복귀 설정과 OTP_EMAIL_ENABLED=true를 적용했고 GOOGLE_REAUTH_ENABLED=false를 유지했다.
실제 .env는 해시 비교로 불변을 확인했다. 제품 코드는 수정하지 않았다.

## 2. 별도 승인과 실제 결과

정확한 전용 계정·대표 이메일·목적·변경 결과는 사용자 PC의 로컬 승인 창에서만 표시했다.
사용자는 MAIL·LINK·UNLINK를 각각 별도로 승인한 뒤 React에서 직접 실행했다. 승인 자체는 쓰기를 실행하지 않았다.
Google 계정 선택 및 OTP 입력도 사용자 직접 수행이며, 원문을 채팅·로그·증거에 저장하지 않았다.

| 작업 | 실행 횟수 | 실제 서버 결과 |
|---|---:|---|
| EMAIL REAUTH 메일 | 1 | 202, 사용자 실제 메일 1통 수신 확인 |
| REAUTH OTP 검증 | 1 | 204, EMAIL_REAUTH 서버 증명 확인 |
| EMAIL LINK | 1 | **201 LINKED**, 같은 사용자에 EMAIL identity 생성 |
| EMAIL UNLINK | 1 | **204**, 이번에 추가한 EMAIL만 제거 |

새 Google 로그인 세션에는 이메일 proof가 없었다. 따라서 미승인 연결 요청을 먼저 보내지 않고 OTP 재인증 후 LINK 한 번을 진행했다.
Google 해제·재연결, 다른 계정 변경, 새 가입, 추가 메일, 장애 주입 및 전체 A→B→C→D 반복은 하지 않았다.

## 3. 집중 요청 추적

임시 loopback 보호 장치는 GET을 정상 전달하고, 승인 없는 쓰기는 즉시 거절하도록 구성했다.
요청 순서·method·path·상태·비식별 차단 사유만 수집했다. 원문 헤더/본문/쿠키/OTP/토큰은 기록하지 않았다.
사용자 로그인 전 발견한 임시 Vite 미들웨어 등록 순서 문제는 도구에서만 수정하고 Health 프록시로 검증했다.
승인 때문에 실제 React 요청을 대기시키지 않았다.

| 순서 | 요청 | 상태 |
|---:|---|---:|
| 41 | POST /api/v1/auth/identities/email/link | 201 |
| 42 | GET /api/v1/auth/session | 200 |
| 43 | GET /api/v1/auth/identities | 200 |
| 44 | GET /api/v1/auth/reauth/email/contact | 200 |
| 45 | GET /api/v1/auth/session | 200 |
| 57 | POST /api/v1/auth/identities/email/unlink | 204 |

LINK 이후 수동 읽기 재조회, UNLINK 이후 재조회 및 마지막 페이지 새로고침에서도 현재 상태를 확인했다.
**보호 장치 차단은 0건**이다. 추가 LINK POST나 자동 재발송·재시도는 관찰되지 않았다.
상세 순서는 [비식별 실제 검증 JSON](evidence/task-007-1d-2b-fix-live/live-checks.json)에 보존한다.

## 4. React 안내와 이전 오류 판정

연결 직후 사용자는 정상 처리와 버튼 변경을, 읽기 전용 재조회 후에는 EMAIL·Google·VERIFIED 유지를 답했다.
다만 정확한 완료 안내와 실패 안내의 부재를 마지막으로 확인했을 때는 현재 복원 상태와 앞선 작업의 구분이 불확실했다.
실제 사용자 브라우저를 직접 캡처하거나 UI 문자열을 도구로 수집하지 않았으므로 다음과 같이 구분한다.

- 연결 상태 표시·재조회 유지: 진행 중 사용자 확인 및 서버 GET/DB로 확인.
- 기대 완료 문구 ‘대표 이메일의 로그인 수단을 연결했습니다.’의 실제 표시: **미확정**.
- ‘요청을 완료하지 못했습니다’ 안내의 이번 비표시: **미확정**.
- 서버·추적 결과: 201 및 정상 후속 GET, 차단 0건으로 정상 경로 통과.
- 과거 오류 원인과 이번 UI 오류 재발 여부: 확정 불가. 과거 원인 미확정 기록을 유지.

201 후 GET 실패 분기는 기존 격리 자동화 결과이며 실제 계정에서 강제로 만들지 않았다.
정확한 UI 문구를 확인하기 위한 추가 LIVE는 별도 승인 범위다. 이번에는 다시 연결하지 않았다.

## 5. 복원·기존 데이터·세션

LINK 뒤 Google identity 원본과 소유권이 보존되고 EMAIL 1개가 같은 사용자에 추가됐음을 먼저 확인했다.
그 후 별도 UNLINK 승인을 받았고, 서버는 유효한 이메일 proof와 남는 Google 수단을 재검사한 뒤 204를 반환했다.
사용자는 오류 없는 해제와 마지막 새로고침 후 Google 연결됨·EMAIL 미연결·VERIFIED 유지를 확인했다.

| 항목 | 시작 | LINK 후 | 최종 |
|---|---:|---:|---:|
| 사용자 | 4 | 4 | 4 |
| 전체 identity | 4 | 5 | 4 |
| 대표 이메일 | 4 | 4 | 4 |
| 운동 종목 | 80 | 80 | 80 |
| 휴식 설정 | 4 | 4 | 4 |
| Flyway 이력 | 8 | 8 | 8 |
| 전용 계정 Google / EMAIL | 1 / 0 | 1 / 1 | 1 / 0 |

사용자 UUID·사용자 행·운동·설정·대표 이메일은 읽기 전용 fingerprint 비교로 불변이었다.
원래 Google identity 행과 다른 계정 identity 및 기존 다른 계정의 인증 세션도 보존됐다. 새 사용자는 없다.
현재 JDBC 세션의 90일 기간 검사와 활성 상태를 확인했고 LINK 직전 대비 LINK/UNLINK 이후 세션 metadata·proof bytes는 동일했다.
LINK/UNLINK로 시작·절대 만료·재인증 시각·증명을 연장하거나 바꾸지 않았다. 실행 시점의 EMAIL_REAUTH proof는 10분 이내였다.

관찰기의 첫 세션 기준에는 준비 중 조회된 기존 브라우저 세션이 포함됐고, 그 후 사용자 직접 새 Google 로그인이 있었다.
증거의 initialLoginUnchanged=false는 그 두 로그인 세션을 비교한 값이다. LINK/UNLINK 보존 판정은 선택된 쓰기 세션의
metadataUnchangedSinceLink/proofUnchangedSinceLink=true로 구분했다. 원래 브라우저를 임의 로그아웃하지 않았다.

별도 세션 원문 검사 도구 실행은 자동 승인 검토에서 민감 인증·개인정보 접근 범위가 과하다는 이유로 거절됐다.
해당 추가 도구는 실행하지 않고 제거했으며, 기존 비식별 감사 API로 대체했다. 추가 원문 비교를 완료했다고 주장하지 않는다.

## 6. 1차 검증 종료·당시 Git·미확인 사항

이번에 시작한 Spring Boot·Vite·승인/관찰기 및 자식 프로세스를 종료했고 3000/8080/8091 리스너 부재를 확인했다.
전용 PostgreSQL은 시작 전 exited 상태로 되돌렸다. 컨테이너·볼륨·개발 DB·계정·암호화 백업은 보존했다.
프로세스 전용 실메일 활성화도 서버 종료와 함께 끝났다. .env와 기존 제품/정책/마이그레이션/보고서는 변경하지 않았다.
사용자 브라우저를 강제로 닫거나 추가 로그아웃하지 않았다.

프론트엔드 변경은 본 보고서와 증거 JSON **2개 신규 파일**뿐이며 백엔드는 clean이다.
양쪽 main·HEAD는 위 표와 같고 staging·Commit·Push는 수행하지 않았다.
남은 항목은 정확한 UI 완료/실패 안내 직접 확인, 과거 LIVE 원인 규명 및 실제 장애 분기 재검증이다.
실행하지 않은 UI 확인이나 장애 분기를 성공으로 표시하지 않았다.

## 7. EMAIL 로그인 연결 버튼 집중 후속 검증 — 최종

### 시작·범위

양쪽 main·HEAD와 수정된 controller.ts 제공을 다시 확인했다. 기존 미커밋 보고서/증거는 보존했다.
시작은 동일 전용 Google 사용자 UUID, Google 1개·EMAIL 0개·대표 이메일 VERIFIED였다.
기존 .env·제품 코드·정책·Flyway는 변경하지 않았으며 기존 279개 테스트 통과 로그를 확인했다.
신규 대표 이메일 등록, EMAIL 로그아웃/재로그인, Google 해제/재연결, 새 가입 및 다른 계정 변경은 하지 않았다.

새 암호화 백업은 overload-server/build/pwa-email-link-focus-live-20261029/database-before.dump.dpapi에 보존했다.
DPAPI 왕복·PGDMP 헤더·pg_restore 목록을 확인했고 복원은 하지 않았다.
사용자 4명·identity 4개·연락처 4개·운동 종목 80개·설정 4개·성공한 V1~V8을 사전 기준으로 삼았다.

### 최근 증명과 실제 요청

VERIFIED를 최근 EmailOwnershipProof로 간주하지 않았다. 현재 읽기 API는 최근 proof 유효 여부를 제공하지 않으므로,
사용자가 별도 승인한 LINK의 **기존 서버 계약**으로 판정했다. 이번 도구는 JDBC 세션 원문·직렬화 속성을 조회하지 않았다.

| 순서 | 사용자 별도 승인 및 직접 실행 | 서버 결과 |
|---:|---|---|
| 21 | LINK 1회 | **403 EMAIL_OWNERSHIP_PROOF_REQUIRED**, 연결 생성 없음 |
| 31 | 정확한 대표 수신처·EMAIL REAUTH·추가 1통 승인 후 발송 | 202 |
| 36 | 사용자가 실제 수신 OTP를 React에 직접 입력 | 204 |
| 50 | 재인증 후 별도 승인한 LINK 1회 | **201 LINKED** |
| 51 | GET /api/v1/auth/session | 200 |
| 52 | GET /api/v1/auth/identities | 200 |
| 53 | GET /api/v1/auth/reauth/email/contact | 200 |
| 54 | GET /api/v1/auth/session | 200 |

LINK POST는 총 **2건**이다. 첫 건은 proof 부족으로 거절됐고 두 번째는 재인증 후 새 승인을 받아 실행했다.
각 승인된 클릭에서 POST는 1건이었다. 자동 재시도·의도치 않은 중복 POST·승인 보호 장치 차단은 **0건**이다.
현재 집중 실행의 실제 메일은 승인된 REAUTH **1통**이며 사용자가 실제 수신 후 직접 입력했다고 확인했다.
1차 검증의 메일 1통과는 별개이므로 두 검증 합계는 2통이다. 자동 재발송은 없다.

### 실제 표시 시점의 UI 확인

사용자는 각 버튼 클릭 직후 다른 조작을 멈추고 현재 화면 위쪽의 안내를 그대로 전달했다.
나중의 기억이나 제품 소스만으로 실제 표시 문구를 추정하지 않았다.

| 현재 표시 시점 | 사용자가 그대로 전달한 문구 / 확인 |
|---|---|
| 첫 LINK의 proof 부족 | ‘최근 10분 이내의 이메일 소유 확인이 필요합니다. 대표 이메일로 재인증한 뒤 원하는 연결·해제를 다시 선택해 주세요.’ |
| 재인증 후 LINK 201 | **‘대표 이메일의 로그인 수단을 연결했습니다.’** |
| 새로고침 전 같은 성공 화면 | **실패 안내 없음·EMAIL 연결됨·해제 버튼 표시** |
| 마지막 새로고침 | **EMAIL·Google 둘 다 연결 유지** |

첫 403 안내는 서버의 정상 재인증 요구와 일치하므로 제품 오류로 분류하지 않았다.
201 뒤에는 ‘요청을 완료하지 못했습니다’가 함께 표시되지 않았음을 현재 화면에서 확인했다.
관찰 방법은 **사용자의 즉시 문구 전사·확인**이며 에이전트의 DOM/스크린샷 직접 캡처는 아니다.
직전 검증의 불확실한 회상 답변을 이번 결과로 소급해서 확정하지 않는다.

### 최종 데이터·환경·판정

최종 구성은 **같은 전용 사용자에 Google 1개 + EMAIL 1개**, 기존 대표 이메일 VERIFIED다.
연결 후 자동 UNLINK는 하지 않았으며 이번 집중 실행에는 UNLINK 요청이 없다.
전체 identity는 승인한 EMAIL 1개 추가로 4→5개다. 사용자 4명·연락처 4개·운동 80개·설정 4개·마이그레이션 8개는 동일하다.
사용자/운동/설정/대표 이메일 fingerprint, 원래 Google identity 행과 소유권, 다른 계정 identity는 모두 보존됐다.
새 사용자 생성·계정 병합·기존 identity 이동은 없다. .env는 해시 비교로 불변을 확인했다.

상세 증거는 [집중 후속 검증 JSON](evidence/task-007-1d-2b-fix-live/email-link-focus-checks.json)이다.
기존 [1차 JSON](evidence/task-007-1d-2b-fix-live/live-checks.json)은 그대로 보존했다.
HTTP method/path/status/order·비식별 차단 사유·현재 UI 안내만 기록하고 실제 주소/UUID/OTP/쿠키/CSRF/토큰은 기록하지 않았다.

이번 정상 시나리오에서는 **실제 서버 결과와 사용자에게 보이는 React 안내의 일치**라는 핵심 조건을 통과했다.
과거 LIVE의 정확한 원인을 확정하거나 GET 장애 분기까지 실계정으로 검증했다고 주장하지 않는다.
201 뒤 GET 실패 분기는 기존 격리 자동화 결과이며 실제 계정에는 장애를 주입하지 않았다.

집중 실행의 서버·관찰기·자식 프로세스를 종료하고 PostgreSQL을 원래 exited 상태로 되돌렸다.
컨테이너·볼륨·DB·계정·이번에 연결한 EMAIL·암호화 백업을 보존한다. 추가 로그아웃이나 해제는 하지 않았다.
프로세스 전용 실메일 활성화도 서버 종료와 함께 끝났다.

최종 프론트엔드 Git 변경은 본 보고서와 JSON 2개, **총 3개 미커밋 파일**뿐이며 백엔드는 clean이다.
양쪽 HEAD 불변, staging·Commit·Push 없음. 제품 코드 변경 없이 보고서와 증거만 보완했다.
