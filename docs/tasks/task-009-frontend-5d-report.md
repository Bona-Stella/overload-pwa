# Task 009 — Frontend 5D 구현·검증 보고서

작성일: 2026-11-01 (Asia/Seoul).

## 범위·시작 상태

- Frontend HEAD: `3dd9bf895be33f3a615fd96f133e2a7d5c5ac9ab` — `feat(workout): add session snapshot sync and takeover`. **5C 커밋과 clean을 확인한 뒤** 시작했다.
- Backend HEAD: `9598fa1ba899f47e595c2c70421b8973c2e0c106`, 시작 시 clean.
- 양쪽 AGENTS/Engineering, Task 006 v0.3.1·Task 008 운동/휴식·인증 정책, Task 009 v1.0 및 V14/V15 세션 계약, 5A~5C 보고서·실제 코드를 읽고 연결했다.
- 승인된 5D만 구현했다. Backend 제품 변경은 필요한 **종료 목록 읽기 API**에 한정한다. 기존 FINISH/정정/복구/평가 제품 로직, V1~V15 migration, 개인 `overload_dev`, 의존성·lockfile은 변경하지 않았다.
- Service Worker·manifest·설치형 PWA·완전 오프라인 cold restart, 표준 운동 DB/통계/디로딩 문서, 범용 Outbox/Command/Receipt/Feed는 추가하지 않았다. 스테이징·커밋·Push 없음.

## 실제 사용자 흐름

1. 기존 5B 운동 입력과 5C 동기화를 유지한다. `운동 종료` Dialog에서 확인을 누른 실제 시각을 한 번 선택한다. 초안 저장을 기다리고, 종료 의도·선택 당시 전체 snapshot·endedAt을 IndexedDB에 저장한다. 실패하면 종료를 선택한 것으로 확정하지 않는다.
2. 최초 종료 의도라는 새 확정 상태에 localRevision을 **한 번** 증가시킨다. START/takeover 직후 확인된 hash가 없는 빈 운동도 종료할 수 있다. 재시도·요청 고정·ACK 저장으로 revision을 새로 발급하지 않는다.
3. 종료 선택 뒤 일반 입력을 잠근다. 진행 중 Snapshot/승인 해결이 있으면 기존 단일 송신 슬롯에서 결과를 먼저 확인한다. 불명확하면 원래 요청을 유지하고 FINISH를 진행하지 않는다.
4. 선행 결과가 확인되면 V14 최종 전체 Snapshot + 최초 endedAt 요청을 고정 저장한 뒤 전송한다. 완료한 수행만 포함하고 초안·미완료 유산소·타이머 tick으로 수행을 만들지 않는다. PENDING 승인도 Backend의 종료 허용 정책을 그대로 따른다.
5. 종료 ACK를 로컬에 저장한 후 서버 FINISHED 상세를 표시한다. ACK 유실은 상세를 확인하고 **같은 본문/epoch/revision/endedAt**으로 duplicate FINISH를 확인한다. 로컬 성공과 서버 종료 성공은 구분한다.
6. 오프라인 종료는 원래 의도와 기록을 보존한다. 재연결 시 ACTIVE/같은 편집권이면 선행 확인 후 FINISH한다. AUTO_CLOSED·다른 편집권·삭제는 자동 쓰기를 중단한다. FINISHED는 고정된 같은 요청이 있는 경우에만 명시 확인할 수 있고, 다른 종료를 덮어쓰지 않는다.
7. 종료 이력에서 세션을 선택한다. 실제 endedAt과 서버 closedAt을 구분하고 최초 평가·현재 평가·당시 승인 문맥과 변경 이력을 조회한다. AUTO_CLOSED의 실제 종료 시각과 최초 명시 종료 평가는 계속 없다.
8. 작은 Dialog에서 웨이트 중량/반복, 완료 유산소의 허용 수치를 정정하거나 수행/세션을 논리 삭제한다. 명시 건너뜀 기록은 수치를 만들어 정정하지 않고 삭제만 허용한다. 기록 변경 이력에는 정정 전후 수치를 표시한다.
9. 종료 후 PENDING은 KEEP_CURRENT 또는 현재 루틴을 다시 조회한 새 REAPPROVE로 명시 해결한다. 과거 수행 문맥·최초 평가·기존 승인 사건은 바뀌지 않는다.
10. `이 기기의 누락 완료 수행 비교·복구`에서 보존 사본을 선택한다. 항목별 원본/서버 수치와 시각, 저장됨/없는 후보/값 충돌/삭제/슬롯 충돌/문맥 확인 불가를 확인한다. 선택한 완료 수행만 원래 UUID·시각·종목·origin과 confirm=true로 보낸다.

서버 저장 확인 전에는 종료·정정·복구 성공을 표시하지 않는다. 일반 화면에 epoch/revision/hash를 노출하지 않고 공식 평가 공식을 복제하지 않는다. 이력으로 이동하기 전 대기 초안 저장도 확인한다.

## 변경 파일

| Frontend 파일 | 변경 |
|---|---|
| `src/features/workout-local/types.ts`, `validation.ts` | version 2 호환 종료 의도/고정 FINISH/ACK, 계정·세대·편집 사본 바인딩 검증 |
| `src/features/workout-local/model.ts`, `sync-state.ts` | 최초 종료 revision, 종료 시각/원본 보존, 고정 요청과 ACK 전이 |
| `src/features/workout-local/controller.ts`, `sync.ts` | 기존 직렬 저장/단일 송신에 FINISH 연결·중복 확인·입력 잠금 |
| `src/features/workout-local/LocalWorkoutScreen.tsx` | 종료 Dialog·미확인 종료 안내·종료 선택 시점 타이머 표시 |
| `src/features/workout-online/closed-model.ts` | 복구 비교·원래 문맥 비교·사후 요청 결과의 서버 사실 확인 |
| `src/features/workout-online/closed-controller.ts` | 한 세션의 온라인 사후 변경·고정 요청 저장·버전 충돌/응답 유실·기존 FINISH 확인 |
| `src/features/workout-online/ClosedWorkout.tsx` | 이력·종료 상세/평가/변경 이력·정정/삭제/승인/선택 복구 Dialog |
| `src/features/workout-online/WorkoutWorkspace.tsx`, `controller.ts` | 종료 화면/이력 진입·다른 진행 운동 보존·인증/세대 보호 |
| `src/features/workout-online/storage.ts`, `types.ts`, `api.ts` | 기존 meta에 고정 사후 요청, 구 사본 조회, 종료 ACK 저장, 최소 목록 타입/API |
| `src/features/auth/api.ts` | 새 종료 목록의 제한된 GET query만 기존 인증 전송 허용 경로에 추가 |
| `tests/workout-finish.test.mjs` | 5D 전용 Node 테스트 22개 |
| `tests/workout-online-ui.test.mjs`, `workout-local.test.mjs` | 종료/삭제/평가/변경 이력/건너뜀 SSR 회귀·기존 데모/직접 HTTP 차단 유지 |
| `tests/fixtures/task-009-5d-finish.html`, `task-009-5d-finish.tsx` | 실제 IndexedDB·제품 UI·V14/V15·강제 종료 시나리오 |
| `tests/fixtures/workout-sync-vite.mjs`, `run-workout-sync-browser.mjs` | 기존 5C 하네스 재사용, 독립 5D 포트/프로필·응답 유실·정리 지원 |
| `AGENTS.md`, `README.md`, `docs/engineering/frontend.md`, 이 보고서 | 현재 구현·저장 계약·후속 범위 |

Backend는 `workoutsession/WorkoutSessionController.java`, `WorkoutSessionRequests.java`, `WorkoutSessionService.java`, `WorkoutSessionRepository.java`, `WorkoutSessionResponses.java`에 목록 경로·strict pagination·readOnly 조회·메타 DTO를 추가했다. `WorkoutSessionIntegrationTests.java`와 `docs/api/workout-sessions.md`를 함께 갱신했다. 기존 쓰기 제품 로직이나 schema 변경은 없다.

## IndexedDB·FINISH·ACK 계약

`overload.workout.v1` **DB version 2를 유지**하며 새 object store는 없다. 계정/세대/세션/기기/epoch의 기존 복합 키와 editVersion CAS·Web Locks를 재사용한다. 5B/5C의 optional 종료 필드가 없는 문서도 읽는다.

| 위치 | 의미 |
|---|---|
| `localWorkouts.finish.endedAt` | 최초 성공적으로 저장한 실제 종료 선택 시각. 재시도에 교체하지 않음 |
| `finish.snapshot` | 종료 선택 당시 원본. 이전 Snapshot/승인 해결 확인 중에도 보존 |
| `finish.request`, `requestJson` | 선행 요청 확인 뒤 고정한 정확한 V14 본문. 이후 수정하지 않음 |
| `finish.ack` | 원래 식별과 종료 시각이 일치하는 ACK. 최초 version/평가와 현재 currentVersion을 구분하여 보존 |
| `meta['closedWrite',userId,generation,sessionId]` | 한 건의 사후 온라인 요청 본문/JSON과 결과 확인 상태·직접 받은 ACK. 명령 큐나 자동 재생 엔진이 아님 |

고정 FINISH를 저장하지 못하면 HTTP를 보내지 않는다. ACK 저장 실패는 원래 고정 요청을 남긴다. 동일 FINISHED 조회만으로 다른 로컬 내용을 성공 처리하지 않고 원래 FINISH의 duplicate ACK로 확인한다. ACK를 저장한 후 종료 상세를 게시하므로 서버의 닫힌 상태가 먼저 편집기를 제거해 ACK 저장을 막지 않는다.

선행 Snapshot은 고정 원문으로 확인하고 최신 수행을 응답으로 덮지 않는다. 선행 재승인이 만든 새 승인 사실이 필요하면 기존 snapshot에 그 사실만 추가한 뒤 최종 FINISH를 고정한다. 과거 수행의 UUID/수치/문맥과 최초 endedAt은 변경하지 않는다. 단순 초안·tick·조회·ACK 메타 저장은 revision을 증가시키지 않는다.

FINISHED 뒤의 원래 요청 확인도 동일 세션 Web Lock 아래 기존 송신기를 사용한다. 이미 보유한 잠금을 유지하여 release/ifAvailable 재획득 경합을 피한다. 다른 writer 사본을 선택하면 현재 writer의 종료 요청으로 대신 확인하지 않는다. 논리 삭제된 세션은 자동 재전송·복구를 차단한다.

## 사후 정정·복구·버전 충돌

- 사후 쓰기는 dataGeneration/expectedVersion으로 분리한다. 요청을 먼저 로컬에 고정하고, 읽기/쓰기 전후 현재 계정·세대·잠금을 검사한다. 일반 입력 문자열은 화면에서 유지하고 wire decimal은 기존 문자열/BigInt 검증으로 정확히 정규화한다. float 결과로 원본을 교체하지 않는다.
- 응답 유실은 상세·변경 이력·승인 사실을 조회한다. 정정/삭제 사건의 종류·대상·전후 값·sessionVersion, 복구 사건의 원래 주장, 승인 해결 사실로 확인한다. 버전을 자동 올려 다시 적용하지 않는다.
- 결과가 불명확하면 PENDING 고정 요청을 유지한다. 사용자가 같은 요청을 재확인하거나 최신 서버 기록 검토를 완료하고 **새 변경을 다시 선택**한다. 낮은 버전 조회나 값이 우연히 같다는 이유로 정정 성공을 단정하지 않는다.
- 상세/평가/이력 조회 중 서로 다른 세션 버전이 관측되면 다시 조회하도록 안내한다. 현재 평가는 매번 서버 API를 읽으며 세션 version만으로 전체 benchmark 결과를 캐시하지 않는다.
- 구 사본은 읽기 전용 원본이다. 복구 요청/응답/앱 종료로 덮거나 삭제하지 않는다. 서버 tombstone은 부활시키지 않고 값/슬롯 충돌도 재번호·자동 병합하지 않는다. 같은 UUID의 복구 후 UNVERIFIED 문맥은 RECOVERED 사건의 원래 claim과 비교한다.
- 읽기 DTO로 승인 요청의 ACTIVE 생성 여부를 완전히 증명할 수 없으므로 해당 복구 후보를 확인 불가로 안내한다. 원래 claim을 그대로 보내 Backend가 APPLIED/PENDING/TODAY_ONLY/UNVERIFIED를 판정한다. 클라이언트가 임의 승인하지 않는다.
- AUTO_CLOSED는 선택 복구 후에도 AUTO_CLOSED/endedAt=null/최초 평가=null이다. FINISHED의 선택 복구·사후 정정은 현재 평가에만 반영하고 최초 평가는 유지한다.
- 같은 브라우저 두 탭/잠금 미지원은 사후 변경도 쓰기를 허용하지 않는다. 로그아웃·계정 전환은 늦은 응답 저장을 차단한다. 확인된 세대/소유권 변경은 이전 상세·평가·복구 후보를 화면에서 제거하며 디스크 원본은 보존한다.

## 최소 Backend 목록

종료 목록 API가 없음을 확인하여 승인 범위 안에서 `GET /api/v1/workout-sessions/closed`를 추가했다. 본인 현재 세대의 FINISHED/AUTO_CLOSED와 삭제 메타만 반환한다. 기본20/최대50, 불변 `closedAt DESC → UUID DESC` cursor이며 중복/추가 query·GET body를 거절한다. 루틴 이름은 InitialPlan에서 읽는다.

readOnly REPEATABLE_READ에서 현재 세대와 제한된 행을 읽고 no-store로 반환한다. ACTIVE 만료 전이·운동 저장·평가·수행 요약·통계·달력·메모·새 DB schema를 추가하지 않는다. 기존 모든 세션 경로의 query 계약은 유지하며 새 목록만 명시한 query를 허용한다.

## 검증 결과

### Frontend

- `npm test`: **419/419 통과**. 기존 393개 + 5D 전용 22개 + 종료 UI 회귀 4개.
- `npm run lint`: 통과. 규칙 비활성화 없음.
- `npm run build`: TypeScript/Vite production build 통과.
- `git diff --check`: 통과.

Node 검증은 종료 의도/고정 요청 저장 실패·ACK 저장 실패·동일 재시도, 전송 중 Snapshot/승인 해결 순서, 빈 START/인수 직후 종료, 원래 종료 시각·revision, 자동 종료/삭제/편집권 손실, 사후 버전 경합·응답 유실·세대/로그아웃, 복구 UUID/슬롯/tombstone/claim 비교를 포함한다. SSR 검증을 실제 브라우저 검증과 구분한다.

### Backend/PostgreSQL

```powershell
$env:JAVA_HOME='C:\Users\Home\.jdks\temurin-25.0.5'
.\gradlew.bat --offline --no-daemon integrationTest --tests '*WorkoutSessionIntegrationTests'
```

**105/105 통과**. 추가 목록 테스트는 빈 결과/ACTIVE 제외, 본인·현재 세대, 안정적 페이지/상한/strict query, 삭제 메타, 익명 접근 차단·읽기 무변경을 검증한다. 기존 FINISH·AUTO_CLOSED·V15 정정/삭제/복구·평가 회귀도 통과했다. 해당 범위의 Java 컴파일과 격리 통합 테스트를 수행했으며 Backend 전체 프로젝트 build를 실행했다고 표현하지 않는다.

### 실제 Edge IndexedDB·V14/V15

기존 `workoutBrowserEnvironment`를 사용한 **PostgreSQL 18.6/V1~V15/시작 사용자 0명**의 일회성 환경에서 실행했다. 개인 `overload_dev`/5433에는 접속하지 않았다. Vite는 envDir=false, 전용3078, 검증 Backend만 프록시한다. 실제 AuthApi/쿠키/CSRF/WorkoutApi/WorkoutStore/Web Locks와 StrictMode 제품 UI, 독립 headless Edge 프로필·모바일 크기430×932를 사용했다.

```powershell
# Backend 저장소
.\gradlew.bat --offline --no-daemon -I scripts/task-008-1c-browser.init.gradle workoutBrowserEnvironment
# Frontend 저장소
node tests/fixtures/workout-sync-vite.mjs --finish
node tests/fixtures/run-workout-sync-browser.mjs --finish
node tests/fixtures/run-workout-sync-browser.mjs --finish --edge
```

- **주 흐름 14개 통과, 실제 프로세스 강제 종료·재시작 3회**: 미확인 선행 Snapshot과 오프라인 종료 의도 저장 뒤, FINISH 서버 커밋 후 ACK 두 번 유실, 복구 서버 커밋 후 응답/로컬 ACK 저장 실패.
- 실제 IndexedDB transaction.abort로 종료 의도 실패를 미확정으로 유지하고, 선행 동일 Snapshot 확인 뒤 최종 웨이트2개+유산소1개를 FINISH로 원자 저장했다. 새로운 프로세스가 같은 FINISH 원문/endedAt으로 duplicate ACK를 확정했다.
- 제품 Dialog의 웨이트/유산소 정정·응답 유실, expectedVersion 409와 새 명시 선택, 개별/전체 논리 삭제·tombstone 복구 차단·최초 평가 불변을 확인했다.
- 실제 다른 writer 인수와 격리 세션의 마지막 저장 시각을25시간 전으로 이동한 AUTO_CLOSED를 확인했다. 자동 FINISH 차단, 구 사본의 선택 복구, UNVERIFIED·원래 origin·원본 보존과 앱 재시작 후 이력 확인을 검증했다.
- 사후 Web Locks 경쟁, PENDING을 포함한 FINISH·종료 후 KEEP_CURRENT/REAPPROVE·해결 응답 유실, 실제 로그아웃/계정 B 전환·늦은 응답 차단을 검증했다.
- **추가 경계 2개 통과**: 빈 인수 사본 FINISH와 구 사본 종료 대체 차단, 원본 수치 미리보기 후 FINISHED 선택 복구의 현재 평가 갱신 및 세대 변경 화면 보호.
- 추가 FINISHED 복구는 최초 평가의 eligible=false/반복 합계0/평가 버전2를 그대로 유지하고, 서버 현재 평가가 eligible=true/반복 합계8로 바뀜을 확인했다. 현재 session version3, 서버 epoch1, 복구 origin0이며 종료 메타/최초 평가를 재작성하지 않았다.
- SQL 읽기 검증으로 잘못된 종료 상태0건, 수행/세션 tombstone·CORRECTED/RECOVERED/DELETED 이력·기존 PENDING 문맥·UNVERIFIED·구 origin 보존을 재확인했다. 첫 환경의 집계는 개발 중 여러 실행이 누적된 일회성 데이터다.

처음의 잠금 release/reacquire 경합, 새 목록 query의 인증 전송 차단, 빈 revision0 FINISH를 실제 테스트로 발견하고 수정했다. React 형제 key 중복도 이력 key 분리로 수정하고 브라우저 가드를 추가했다. 기존 5B 직접 HTTP 차단 테스트는 controller를 통한 승인된 FINISH를 허용하도록 범위를 갱신하되 데모/직접 송신 차단은 유지했다. 목록 fixture의 잘못된 세대 초기화는 FK를 준수하는 일회성 정리로 수정했다.

하네스는 복원 탭 중복 실행을 별도 테스트 잠금으로 막고, 이전 결과 파일을 새 결과로 읽지 않으며 세션별 요청 순서를 검사한다. 누적 OTP 발급 제한에 도달한 마지막 독립 검증은 첫 일회성 환경/결과를 보존·종료한 후 새 사용자0명 환경으로 분리했다. 인증 제한/테이블을 우회하거나 제품 설정을 변경하지 않았다. 기존 5A~5C 브라우저 시나리오 전체는 반복하지 않았다.

결과는 gitignored `logs/task-009-5d/`의 `npm-test.log`, `browser-result.json`, `edge-browser-result.json`, `postgres-verification.log`, `postgres-extra-verification.log`, `backend-first-ready.json`, `backend-extra-ready.json`, `http.jsonl`에 있다. Backend는 `build/task-009-5d-integration.log`와 JUnit XML에105개 결과를 남겼다. 테스트 프로필/OTP/인증 비밀은 커밋하지 않는다.

검증 후 두 일회성 Backend/PostgreSQL/Ryuk 환경과 전용 Vite·Edge를 종료했다. 관련 검증 프로세스0개, 전용 포트3078/9556/9251 listener0개, Backend ready 파일 제거를 확인했다. 기존 사용자 컨테이너5개는 그대로 유지했다.

## 제한·Git·후속

- 중요한 미확정 정책을 임의 결정한 항목은 없다. 확인 불가 승인 문맥은 Backend에 원래 주장으로 제출하여 판정받는다. 결과 불명확/충돌은 원본 보존과 사용자 확인으로 처리한다.
- 최초 종료 선택 이후 실제 수행 재개나 종료 시각 교체 UI는 제공하지 않는다. 모순된 기기 시각은 자동 보정하지 않고 원본/오류를 유지한다.
- Service Worker·설치형 PWA·완전 오프라인 cold restart는5E다. Windows Edge 검증은 iPhone Safari/설치형 PWA 실기 검증을 대체하지 않는다. 브라우저 영구 저장·백그라운드 실행도 보장하지 않는다.
- 승인되지 않은 통계/달력/메모/범용 동기화 구조를 추가하지 않았다. 추가 주요 의존성·개인 DB 변경 없음.
- 사용자 검토 전 스테이징·커밋·Push하지 않았다. Frontend HEAD `3dd9bf8`, Backend HEAD `9598fa1`을 유지한다. 변경은 Frontend27개·Backend7개이며 index는 비어 있다. 5E는 별도 승인 이후 진행한다.
