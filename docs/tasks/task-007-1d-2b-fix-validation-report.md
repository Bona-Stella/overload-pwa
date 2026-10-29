# Task 007-1D-2B-FIX — EMAIL 연결 결과 안내 진단·최소 수정

작성일: 2026-10-29 (Asia/Seoul).

**과거 LIVE 오류의 정확한 원인은 여전히 미확정이다.** 당시 추가 차단 요청의 경로·원인·시점이 남아 있지 않아
제품의 중복 POST, 사용자 추가 조작, 승인 도구 또는 후속 조회 중 무엇이 원인이었는지 확정할 수 없다.
이번에는 별도로 **201 성공 후 조회 오류를 연결 실패처럼 표시하는 제품 경로**를 격리 재현하고 프론트엔드만 수정했다.
기존 LIVE 보고서와 JSON은 수정하지 않았다. 실제 계정·개발 PostgreSQL·Google·Resend는 사용하지 않았다.

## 1. 시작 상태와 확인 범위

| 저장소 | 브랜치 | 시작·종료 HEAD | 시작 상태 |
|---|---|---|---|
| overload-pwa | main | d7a5eb4b9ef0ece65ce04baa89347164768fe656 | clean |
| overload-server | main | 41ba84904c9c212b4b514512461a173e512549c0 | clean |

양쪽 AGENTS.md와 기술 규칙, 서버 Task 006 확정 정책, 1D-2B 구현/LIVE 보고서,
AuthApi·AuthController·AuthProvider·IdentityManagement, EMAIL identity 컨트롤러 및 세션/CSRF 계약을 확인했다.
커밋된 LIVE JSON의 AUiIssue에는 서버 201·DB 연결·차단 1건·사용자 단일 클릭 확인만 있다.
Git 제외 임시 디렉터리에는 암호화 백업만 남아 있었다. 백업을 열거나 복호화하지 않았고 삭제된 기록 복구,
실제 .env·비밀값 조회 및 실제 사용자 DB 접근을 하지 않았다.

## 2. 실제 제품 요청 흐름

한 번의 EMAIL 연결 이벤트는 다음 순서로 진행된다. 재조회 중 identities/contact는 병렬이다.

1. 기존 계정 재조회: GET session → GET identities/contact → GET session.
2. 쓰기 직전 소유권·CSRF 확인: GET session → GET csrf → GET session.
3. POST /api/v1/auth/identities/email/link **1회**, 빈 JSON과 CSRF 헤더.
4. 응답 계약 검사: 201 LINKED 또는 200 ALREADY_LINKED, email provider 및 유효한 identity ID.
5. 같은 계정 재조회: GET session → GET identities/contact → GET session.
6. POST가 응답한 identity와 현재 목록을 대조한 뒤 완료 안내.
7. 오류가 발생하면 기존 구현은 읽기 전용 계정 재조회를 한 번 더 시도한다. POST는 재실행하지 않는다.

AuthApi에는 쓰기 재시도 루프가 없다. 버튼에는 단일 onClick만 있으며 OTP form의 submit과 분리돼 있다.
AuthController.running은 첫 await 전에 설정돼 빠른 중복 클릭을 차단한다.
AuthProvider의 effect는 세션 복원만 수행하고 start는 중복 실행을 막는다. StrictMode의 effect 재실행이
EMAIL 연결 POST를 시작하는 경로는 발견되지 않았다. 실제 StrictMode 격리 화면의 더블클릭에서도 POST는 1회였다.

## 3. 재현된 제품 결함과 LIVE 원인의 구분

수정 전에는 하나의 try/catch에서 쓰기 응답과 후속 조회를 함께 처리했다.
201을 이미 받았어도 후속 GET 오류를 일반 실패로 처리했고, catch의 두 번째 GET으로 연결을 확인해도
원래 오류를 accountFailure로 다시 표시했다. 두 번째 조회까지 실패하면 오래된 목록을 숨기면서 조회 오류를
그대로 표시해 사용자가 연결 자체의 실패로 이해할 수 있었다. POST 응답 유실 후 GET에 연결이 나타나도
현재 확인된 상태와 응답 불확실성을 구분하지 못했다.

최초 격리 HTTP 테스트 15개 중 8개가 수정 전 실패했다. 정상 연결·계정 변경 방어·중복 쓰기 차단은 통과했고,
201 뒤 일시적/지속적 503·네트워크 오류·403 및 응답 유실 처리에서 새 기대 동작과 달랐다.
이는 재현 가능한 제품 오류 처리 문제의 증거이며 **그 경로가 과거 LIVE에서 실행됐다는 증거는 아니다.**

임시 승인 보호 장치의 기록은 차단 건수만 제공하며 어떤 요청이 차단됐는지 알 수 없다.
별도 격리 대조군에서 도구의 임의 승인 거절 코드(409)를 반환하면 기존의 일반 실패 문구가 표시되는 것도 확인했다.
따라서 같은 문구만으로 제품 또는 승인 도구를 지목할 수 없다. 이 대조군은 과거 도구의 복원이나 원인 재현이 아니다.
도구 거절을 성공으로 바꾸거나 보안·승인 제한을 완화하지 않았다.

## 4. 최소 제품 수정과 결과 계약

변경한 제품 파일은 src/features/auth/controller.ts 하나다. API·컴포넌트·CSS·서버는 변경하지 않았다.
EMAIL LINK의 유효한 응답 영수증을 지역 변수로 구분하고 기존 읽기 전용 복구 결과를 반영한다.

| 결과 | 최종 UI |
|---|---|
| 201과 같은 계정의 정확한 identity 조회 성공 | 연결 완료 |
| 200 ALREADY_LINKED와 정확한 identity 조회 성공 | 이미 같은 계정에 연결됨 |
| 첫 후속 조회 실패, 기존 한 번의 복구 조회에서 정확한 identity 확인 | 오래된 오류를 제거하고 완료 표시 |
| POST 응답 불확실, 같은 계정 GET에 EMAIL 연결 확인 | **현재 연결 상태 확인**. 새 연결 요청 성공 영수증이 있다고 주장하지 않음 |
| 유효한 POST 성공 응답 후 조회 계속 실패 또는 응답 identity 불일치 | 처리 응답은 받았으나 현재 상태 재확인 필요 |
| POST와 GET 모두 불확실 | 연결 결과 미확인, 읽기 전용 상태 확인 요청 |
| 401 또는 다른 사용자/세대 감지 | 기존 인증·소유권 안전 차단 우선, 성공 표시 금지 |
| proof·CSRF·다른 계정 소유권 등 명시적 쓰기 거절 | 기존 오류 유지, 성공 추정·자동 재요청 없음 |

EMAIL_LINK_STATUS_UNCONFIRMED는 프론트엔드 내부 표시 코드다. 새 서버 API/오류 계약이 아니다.
GET 실패 시 기존 목록을 숨겨 오래된 연결 상태에서 쓰기 버튼을 누르지 못하게 한다.
‘계정 정보 다시 확인’은 기존 GET만 수행하며 연결 POST를 자동 재시도하지 않는다.
UNLINK 결과·Google 연결 흐름 및 보안 정책은 유지했다.

## 5. 격리 자동화와 브라우저 결과

실제 AuthApi/Controller에 인메모리 HTTP 응답을 제공하는 22개 회귀 테스트를 추가했다.
기존 테스트 257개를 삭제·비활성화하지 않았다. 기존 불확실 응답 테스트 4개는
‘새 연결 성공을 단정하지 않음·1회 쓰기·GET 재조회’를 보존하면서 현재 상태 확인 문구와 오래된 오류 제거를 검증하도록 갱신했다.

| 시나리오 | 격리 검증 결과 |
|---|---|
| A: 201 + 정상 identities | 완료, POST 1회 |
| B: 201 + identities 503 | 일시 오류 복구 시 완료; 지속 오류는 상태 미확인 |
| C: 201 + GET 네트워크 실패 | 상태 미확인, 자동 쓰기 없음 |
| D: 서버 반영 뒤 POST 응답 유실 | GET으로 현재 연결 확인; 새 연결 영수증 성공 주장 없음 |
| E: 201 뒤 다른 GET 403 | 복구되면 완료; 지속 403은 상태 재확인 안내 |
| F: 진행 중 새로고침·뒤로가기 | 쓰기 재실행 없음, 읽기 복원, 오래된 완료/의도 제거 |
| F: 계정 변경·세션 만료 | 성공 차단, 이전 계정 identity 숨김 |
| G: 빠른 다중 호출/실제 더블클릭 | POST 1회 |
| H: StrictMode 및 중복 start | 마운트 시 읽기만, 클릭 쓰기 1회 |

추가로 contact/session GET 장애, 일회성 다른 UUID 응답, 201과 실제 상태 불일치,
200 ALREADY_LINKED 복구, proof 거절, GET만으로 수동 복구를 검증했다.
브라우저 F~H도 실제 React 화면에서 수행했고 계정 변경은 격리 fake principal만 사용했다.
해제 POST나 이메일 발송은 이 브라우저 시나리오에서 실행하지 않았다.

네트워크 실패는 Node HTTP 계약 테스트에서 fetch 예외로 검증했다. 브라우저에서는 fake 서버 소켓을 끊었으며,
Vite 프록시가 500/불완전 응답으로 변환할 수 있다. 브라우저 자체 오프라인과 동일하다고 주장하지 않는다.

[비식별 요청 증거](evidence/task-007-1d-2b-fix/isolated-checks.json)는 순서·method·path·응답 상태·격리 장애 분류와
emailLinked/googleLinked boolean만 포함한다. 소켓 단절/클라이언트 취소로 응답이 끝나지 않은 경우 status는 null이다.
본문·헤더·쿠키·이메일·사용자/identity UUID·토큰·OTP·비밀값은 수집하지 않았다.

## 6. 필수 명령과 레이아웃

| 명령 | 결과 |
|---|---|
| npm test | **279/279 통과**, 실패·skip 0 |
| npx tsc -b | 통과 |
| npm run lint | 통과 |
| npm run build | 통과, Vite production build |
| git diff --check | 통과 |

백엔드 수정이 없어 백엔드 테스트는 재실행하지 않았다. 기존 441개는 선행 결과로 구분한다.

브라우저 viewport override가 실제 DOM 폭에 반영되지 않아 테스트 도구의 same-site iframe으로 실제 CSS viewport를 만들었다.
320/375/390/1440px에서 window.innerWidth를 각각 확인했다. 스크롤바를 제외한 clientWidth/scrollWidth는
305/305, 360/360, 375/375, 1425/1425로 **제품 내부 가로 넘침 없음**이다. 버튼 높이는 모두 48 CSS px다.
1440px 증거는 CSS viewport를 유지한 채 표시만 75% 축소했다. iPhone/실계정 LIVE 화면 검증은 아니다.
iframe 키보드 조작은 Tab/Enter로 수행했다. 브라우저 도구의 iframe 클릭 대상 오류를 제품 결함으로 분류하지 않았다.

- [실측 JSON](evidence/task-007-1d-2b-fix/layout-checks.json)
- [320px 처리 응답 후 상태 미확인](evidence/task-007-1d-2b-fix/uncertain-320.jpg)
- [375px 연결 완료](evidence/task-007-1d-2b-fix/confirmed-375.jpg)
- [390px 응답 유실 후 현재 연결 확인](evidence/task-007-1d-2b-fix/current-state-390.jpg)
- [1440px 연결 완료, 75% 표시](evidence/task-007-1d-2b-fix/confirmed-1440.jpg)

스크린샷은 합성 테스트 계정 화면이며 실제 개인정보가 없다. 기존 기본 파란색 변수 #3B82F6과
제목 점의 기존 밝은 파란색 #68A2FF, 화면 구조와 운동 데모 UI/CSS는 변경하지 않았다.

## 7. 보존·변경 파일·정리

프론트엔드 변경은 총 11개 파일이다.

- src/features/auth/controller.ts
- tests/identity-management.test.mjs
- tests/identity-link-recovery.test.mjs (신규)
- tests/fixtures/identity-browser.mjs
- docs/tasks/task-007-1d-2b-fix-validation-report.md (본 보고서)
- 위 evidence의 JSON 2개와 JPEG 4개 (신규 6개)

서버 작업 트리는 clean이고 Task 006·Flyway V1~V8·실제 .env·기존 LIVE 보고서/JSON은 변경하지 않았다.
10분 proof, 90일 절대 만료, CSRF, 마지막 로그인 수단·타 계정 소유권 검사 및 Google 고정 복귀 정책을 변경하지 않았다.
실제 개발 DB/컨테이너·볼륨에 접근하거나 변경하지 않았다. 백엔드·실제 Google·Resend 서버 프로세스도 실행하지 않았다.
격리 도구는 envDir:false/configFile:false 및 loopback fake API만 사용했다.
이번에 실행한 Node/Vite 도구의 PID를 추적해 종료했고 브라우저 탭·뷰포트 override를 정리했다.
최종 프론트엔드는 위 변경을 미커밋 상태로 보존하며 staging·Commit·Push는 수행하지 않았다.

## 8. 남은 위험과 후속 검증

과거 LIVE A 오류의 정확한 근본 원인은 미해결이다. 이번 수정으로 그 사건이 해결됐다고 확정하지 않는다.
후속 LIVE가 필요하면 별도 승인 후 정확한 요청 순서·경로·상태·비식별 차단 사유만 기록해야 한다.
추가 승인 없는 실제 메일·OAuth·identity 변경 재검증은 하지 않았다.
현재 상태를 확인하는 GET은 한 시점의 관찰이며 다른 기기의 후속 변경까지 잠그거나 보장하지 않는다.
401/UUID 변경은 성공 복구보다 우선하며 세션 안전 차단을 유지한다.
실기기 Safari·실제 네트워크 중단 및 수정 후 실제 승인 보호 장치와의 통합은 미검증이다.
