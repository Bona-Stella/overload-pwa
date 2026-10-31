# Task 009 — Frontend 5B 구현·검증 보고서

작성일: 2026-10-31 (Asia/Seoul).

- Frontend 시작/현재 HEAD: `57c9ab0` — 5A 온라인 루틴·START·IndexedDB 기반.
- Backend 시작/현재 HEAD: `9598fa1` — V15까지의 세션 계약.
- 시작 시 두 작업 트리 clean. 이번 작업은 Frontend의 승인된 5B만 변경했다. 커밋·스테이징·Push하지 않았다.
- 기준: 양쪽 AGENTS/Engineering, Task 006 v0.3.1의 운동·인증 정책, Task 008 읽기/휴식 계약, Task 009 v1.0과 V13~V15 세션 API, 5A 보고서·실제 코드.
- Backend 제품 코드·마이그레이션·의존성·개인 DB 변경 없음. 폐기된 Outbox/범용 명령/영수증/feed를 추가하지 않았다.

## 실제 사용자 흐름

1. 기존 로그인·루틴 선택·온라인 START를 사용한다. 5A가 저장한 기기 UUID와 서버 InitialPlan/사본을 재사용한다.
2. ACTIVE·현재 기기·현재 계정/세대가 확인된 세션에서 Web Locks 편집 잠금을 얻는다. 다른 탭이나 잠금 미지원 환경은 읽기 전용이다. 읽기 전용에서 잠금이 풀리면 페이지를 다시 열어 확인할 수 있다.
3. 현재 적용 계획의 종목을 표시한다. 웨이트 중량·반복은 문자열 초안으로 매 입력 저장한다. 완료 전에는 수행 UUID/공식 수행을 만들지 않는다.
4. 완료를 누르면 실제 중량/반복·새 수행 UUID·ordinal·완료 시각·당시 선택한 승인 문맥·휴식 앵커·revision·미전송 상태를 한 트랜잭션에 저장한다. **transaction complete 뒤에만 완료로 표시한다.** 실패하면 이전 완료 상태를 유지하고 오류/미확정을 표시한다.
5. 완료 취소는 원래 수행을 취소 원문으로 보존한다. 재완료는 새 UUID다. 서버에 확인된 수행은 삭제 ID를 보존하며, 전달 여부가 불명확한 기록은 UNKNOWN으로 남긴다.
6. 유산소는 시작 → 정지/재개 → 완료 입력 확인 → 명시 확정이다. 확인 취소는 일시정지로 돌아간다. 원본 측정 구간/누적 시간, 선택적 거리/BPM/시간 정정을 구분한다. 미완료를 자동 SKIPPED 처리하지 않는다.
7. 휴식은 목표 반복 상한 ≤10 / 11–12 / ≥13에 현재 계정의 설정값을 적용한다. 종료 시각에서 남은 시간을 계산하며 직접 종료/30초 추가할 수 있다. 화면 tick은 저장·전송하지 않는다.
8. 현재 운동에서 목표 세트/반복 변경, 세트 추가, 본인 정의의 웨이트 추가, 이름/종류/목표 시간을 지정한 유산소 추가, 기존 유산소 목표 시간 변경, 미완료 종목 제외를 할 수 있다. 완료 기록이 있으면 먼저 완료 취소해야 종목을 제외할 수 있다. 원래 루틴과 InitialPlan은 바뀌지 않는다.
9. 종목 목록은 최초 계획의 미완료 웨이트를 먼저 보여 준다. 이동은 현재 종목 포인터만 바꾸고 계획 배열/루틴 순서·초안을 바꾸지 않는다. 계획 슬롯은 UI용 ordinal이며, INTEGER 크기만큼 예정 수행을 생성하지 않는다. 미완료 슬롯 주변 20개와 실제 완료 기록을 표시한다.
10. 온라인 새로고침/같은 계정 재접속에서 서버 세대·상태·epoch 확인 후 기존 로컬 문서를 연다. 서버의 START 상태 재조회가 로컬 수행을 덮어쓰지 않는다. 서버 확인 없는 cold restart는 여전히 열지 않는다.

모바일의 입력 공간을 확보하기 위해 운영 세트 표에서는 반복 수 직접 입력을 사용한다. 기존 RepsInput·Dialog·타이머/카드 스타일을 재사용하며 데모 모델/저장소/평가 산식은 호출하지 않는다.

## IndexedDB 저장 계약

DB 이름 `overload.workout.v1`, DB version **2**. 기존 version 1의 meta/startAttempts/sessionCopies는 유지하고 localWorkouts 하나만 추가한다. 서버 DB migration과 무관하다.

| 저장소 | 키·책임 |
|---|---|
| meta | 기존 브라우저 editorDeviceId UUID |
| startAttempts | 기존 `[userId,dataGeneration]` 고정 START 요청/원문 |
| sessionCopies | 기존 `[userId,dataGeneration,sessionId,editorDeviceId,writerEpoch]` 서버 확인 사본 |
| localWorkouts | 같은 5개 복합 키, schemaVersion=1인 전체 로컬 운동 문서 |

localWorkouts의 주요 필드:

- `initialPlan`, `startedAt`: 서버에서 받은 최초 불변 원본. 원본 루틴/배치/세션 종목 ID를 구분한다.
- `snapshot`: V13 형태의 registry·현재 AppliedPlan·실제 완료 수행·서버 삭제 대상 ID·승인 의도. 초안·진행 중 유산소는 수행 배열에 넣지 않는다. 이 단계는 해당 snapshot을 전송하지 않는다.
- `drafts`: 종목 ID/ordinal별 중량·반복 원문 문자열. 빈 문자열·소수 끝 0·선행 0도 입력 중 보존한다. 완료 시에만 기존 decimal/count 검증으로 정규 수치를 만든다. Decimal을 Number로 변환해 저장하지 않는다.
- `weights`: 작업 중량 원문과 현재 선택 문맥. 별도 명시 승인 없는 변경은 TODAY_ONLY다.
- `timers`: 최초 시작, 진행 구간 앵커, 종료된 원본 구간, 누적 ms, review 상태, 거리/BPM/정정 시간 원문. 완료 결과의 timerMs와 activeMs를 구분한다.
- `rest`, `restPolicy`: 절대 종료 시각과 당시 적용한 휴식 설정. tick으로 시간을 감소시켜 저장하지 않는다.
- `cancelled`: 취소된 세트/유산소의 전체 원문 tombstone. 로컬에서만 생성·취소한 UUID도 재사용하지 않는다.
- `presence`: LOCAL_ONLY / SERVER_CONFIRMED / UNKNOWN. 이 단계에서 새로 만든 수행만 LOCAL_ONLY이며 서버 상세에서 가져온 수행은 SERVER_CONFIRMED다. 누락을 근거로 UNKNOWN을 LOCAL_ONLY로 바꾸지 않는다.
- `recordedContexts`, `approvalResults`: 서버가 확인한 최초 수행/승인 사실을 보존한다. 로컬 승인 의도를 APPLIED로 표시하지 않는다.
- `localRevision`, `serverRevision`, `serverVersion`, `syncState`, `editVersion`: 아래 경계를 따른다.

로컬에서만 완료·취소한 수행의 tombstone은 cancelled에 남기고, 서버에 존재하지 않는 UUID를 서버 삭제 목록에 넣지 않는다. SERVER_CONFIRMED는 snapshot의 삭제 ID에도 넣는다. UNKNOWN은 원문·삭제 의도·UNKNOWN 상태를 보존하므로 5C에서 먼저 전달 여부를 재확인해야 한다. 그 목록을 무조건 전송하는 sender는 없다.

### 순번·원자성

확정 snapshot의 의미가 달라지는 완료/취소/계획/승인 요청 변경만 현재 epoch의 localRevision을 +1 한다. 초안·작업 중량 선택·타이머 시작/정지/확인·휴식 조절·종목 이동은 editVersion만 +1 한다. 타이머 화면 갱신은 둘 다 바꾸지 않는다. 두 Counter는 bigint로 증가시키고 long 한도를 넘으면 실패한다.

서버 사본과 로컬 문서를 같은 readwrite 트랜잭션에서 읽고 편집권/현재 epoch/서버 revision·기대 editVersion을 검사한다. 불변 원본과 revision 증가 규칙도 검사한다. 문서 하나에 완료 사실·휴식·revision·미전송 메타를 저장하고 트랜잭션 완료까지 기다린다. controller는 변경을 직렬화하며 실패한 초안을 과거 저장값으로 대체해 완료하지 않는다.

Web Lock 이름은 계정·세대·세션으로 만든다. 같은 브라우저가 공유하는 기기 UUID나 다른 epoch 때문에 별도 동시 편집 잠금이 생기지 않는다. 잠금 탈취/만료 추정/localStorage lease fallback은 없다. React StrictMode의 setup/cleanup 경합도 검사한다.

### 중량 승인

직접 입력/오늘만 변경으로 승인 요청을 만들지 않는다. 명시 선택한 경우 고정 요청 UUID, 종목별 sequence, 선행 요청 UUID, 공통 기대 routine version, 이전/다음 중량, 발생 시각을 보존한다. 추가 종목에는 원래 루틴 배치 출처를 만들지 않는다. 이전 완료 수행의 문맥·InitialPlan을 다시 쓰지 않는다. 적용 성공·충돌 해결·공식 평가와 benchmark는 Backend 책임이며 5B에는 그 계산/UI를 추가하지 않았다.

## 계정·인증·쓰기 중단

- 명시 로그아웃은 먼저 현재 탭의 대기 초안 저장을 기다린다. 실패하면 입력/화면을 유지하고 로그아웃을 보류한다. 서버 종료나 동기화 성공으로 표시하지 않는다.
- 로그아웃 시작/계정 전환은 화면과 쓰기 허용을 중단한다. IDB 사본·초안·타이머·미전송 수행은 자동 삭제하지 않는다. 다른 탭에도 BroadcastChannel로 로그아웃 경계를 알린다.
- 이미 열어 둔 운동의 401/인증 만료는 메모리의 이전 계정에 한해 로컬 기록을 계속한다. 쿠키·CSRF·OTP 등 인증 비밀을 IDB에 저장하거나 cold restart용 인증 우회를 만들지 않는다.
- OTP/세션 복원으로 재인증하면 만료용 로컬 접근 표식을 지우고 현재 계정·세대·세션을 다시 확인한다. 다른 계정으로 인증되면 이전 운동을 숨긴다.
- 서버에서 다른 writerEpoch/기기 또는 종료 상태가 확인되면 자동 병합/재태깅 없이 편집을 중단한다. 다른 탭이 새 서버 사본을 저장한 경우에도 다음 로컬 트랜잭션에서 구 writer 쓰기를 차단한다. 구 epoch 문서는 보존한다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| `npm test` | **367 통과**, 실패/취소/skip 0 (기존 334 + 신규 33) |
| `npm run lint` | 통과 |
| `npm run build` | TypeScript + Vite production build 통과 |
| `git diff --check` | 통과; 기존 Windows LF→CRLF 안내는 공백 오류와 구분 |
| 실제 Edge IndexedDB | 저장/실패/격리/이관 12개 + 실제 페이지 새로고침 복원 통과 |
| 실제 Edge 두 탭 | Web Locks 동시 편집 차단·해제 후 재획득 통과 |
| 실제 Backend + PostgreSQL + React | 10개 흐름 통과 |
| 모바일 시각 QA | 실제 320/390px iframe viewport 렌더·PNG 확인, 직접 입력/완료 버튼 배치 확인 |

Node/SSR 테스트는 원자 커밋 대기, 실패 후 완료 미확정, 여러 초안 실패/재시도, 연속 수행/long revision, 승인 체인, 취소/재완료 UUID, 확인/불명확 tombstone, 타이머 원본/정정/시계 역전, 계정/인증 경계, 잠금 미지원, StrictMode 경합, 대용량 계획의 유한 렌더를 검증한다.

### 실제 브라우저 저장소

재현: `node tests/fixtures/workout-local-vite.mjs` 실행 후 `node tests/fixtures/run-workout-local-browser.mjs`.
검증 DB는 전용 프로필 안의 `overload.test.task009.5b*`이며 사용자 DB/브라우저 프로필을 읽거나 지우지 않는다.

실제 IDBObjectStore.put 뒤 transaction.abort를 주입해 완료·revision·휴식 전체 롤백과 기존 초안 보존을 확인했다. 제품 controller도 완료로 전환하지 않았다. 서로 다른 두 연결의 CAS, 계정/세대/세션/기기/epoch 격리, v1→v2 데이터 보존 이관, 서버 재조회와 로컬 원본 분리, 구 epoch 쓰기 차단을 확인했다. 페이지를 실제 새로고침한 뒤 새 연결에서 완료 UUID·입력 원문·tombstone·계획·revision·타이머를 읽었다. 같은 headless 브라우저의 별도 두 탭에서 실제 navigator.locks를 경쟁시켰다.

### 실제 격리 Backend

기존 Backend의 `scripts/task-008-1c-browser.init.gradle` / `WorkoutBrowserEnvironment`를 변경 없이 사용했다. 기존 Java 25 경로를 지정하고 `--offline --no-daemon`으로 실행했다. 일회성 PostgreSQL 18.6, DB `overload_browser_isolated`, host DB 포트3606, Backend `127.0.0.1:3618`이며 빈 DB에서 V1~V15를 확인했다. 개인 5432/5433/overload_dev에는 연결하지 않았다.

`workout-online-vite.mjs`의 기존 격리 메타 검사·가짜 이메일 sender·데모 저장소 접근 guard를 재사용했고, fixture에 세션 폐기/결과 수집만 추가했다. `run-workout-local-browser.mjs --backend`가 제품 AuthApp/Workspace를 StrictMode로 렌더한다. fixture의 takeover/세션 폐기는 테스트 조작이며 제품 UI 기능이 아니다.

통과한 10개 흐름: 실제 쿠키/CSRF/5A START, 문자열 중량·반복 완료, 제품 버튼의 IDB abort, 취소/새 UUID 재완료, 종목 이동/초안, 유산소 정지/재개/확인/완료, 실제 서버 세션 폐기·401 뒤 로컬 기록 계속, 재인증·진행 운동 로그아웃/직전 초안 보존/계정 B 격리, 서버 takeover 확인 후 구 사본 보존, 금지된 snapshot/FINISH/승인 해결 전송 0건.

최종 읽기 전용 SQL: 테스트 세션5개(중간 테스트 재실행 포함), performed_sets=0, cardio_results=0, approval_requests=0, 모든 서버 local_revision=0. writer_epoch0 세션3개/epoch1 세션2개는 fixture의 명시 takeover 결과다. 로컬 수행을 서버에 저장했다고 표시하지 않았다.

### 검증 중 수정과 환경 제약

- 인증 성공 상태가 pending=verify에서 먼저 전달될 때 조회가 누락되는 문제를 수정하고 회귀 테스트를 추가했다.
- OTP 재인증에서 이전 계정의 만료용 로컬 접근 표식이 남지 않도록 수정했다. 같은 계정/다른 계정 재인증을 모두 검사한다.
- 실패한 초안 한 건을 다른 초안 저장 성공으로 지우지 않도록 항목별 대기를 유지했다. 실패한 저장 상태를 성공 문구로 표시하지 않는다.
- 모바일 숫자 입력의 간격 충돌은 직접 입력 중심의 로컬 표 스타일로 정리했다.
- 초기 테스트 fixture의 implicit native dialog 선택자·React 렌더 대기, Node navigator.locks 기본값·주석을 실제 접근으로 오인한 검사를 수정했다. 제품 요구사항/검사를 비활성화하지 않았다.
- Windows UI 자동 조작 도구는 현재 URL 확인 실패로 중단됐고 추가 UI 조작을 하지 않았다. 별도 headless Edge 프로필의 일반 자동 테스트로 검증했다. 최초 dump-dom 방식의 비동기 완료 대기 문제는 결과 callback을 기다리는 runner로 수정했다.
- sandbox의 Docker/loopback 실행 제약은 승인된 격리 검증 명령으로 해결했다. 개인 DB로 대체하지 않았다. 새 프레임워크/브라우저/의존성 설치 없음.
- 실제 iPhone Safari·홈 화면 PWA는 검증하지 않았다. headless/iframe QA를 실기기 검증으로 표시하지 않는다. Backend 전체 Java 회귀도 이번 Frontend 작업에서 재실행하지 않았다.

## 변경 파일

- 제품 신규7개: `src/features/workout-local/{types.ts,model.ts,validation.ts,lock.ts,controller.ts,LocalWorkoutScreen.tsx,local.css}`.
- 제품 수정6개: `src/features/auth/{AuthApp.tsx,AuthProvider.tsx,controller.ts}`, `src/features/workout-online/{WorkoutWorkspace.tsx,controller.ts,storage.ts}`.
- 테스트 신규: `tests/workout-local.test.mjs`, `tests/fixtures/{workout-local-vite.mjs,run-workout-local-browser.mjs,task-009-5b-indexeddb.html,task-009-5b-backend.html,task-009-5b-backend.tsx,task-009-5b-preview.html}`.
- 테스트 수정: `tests/workout-online.test.mjs`, `tests/workout-online-ui.test.mjs`, `tests/fixtures/workout-online-vite.mjs`.
- 문서: `AGENTS.md`, `README.md`, `docs/engineering/frontend.md`, 본 보고서.
- 테스트 로그/별도 브라우저 프로필/QA PNG는 gitignored `logs/task-009-5b`에 둔다. 빌드 산출물·의존성·lockfile·데모 파일은 변경하지 않는다.

## 종료·남은 범위·Git

검증 후 직접 시작한 Node/Vite(3075/3076), headless Edge 테스트 프로세스, Backend/Gradle과 일회성 PostgreSQL/Ryuk을 종료했다. fixture stop 명령의 정상 종료·BUILD SUCCESSFUL, 해당 포트 listener 없음과 테스트 Edge 없음, 시작 전 사용자 컨테이너5개만 남았음을 확인했다. 사용자 기존 프로세스를 종료하지 않았다.

5C~5E의 snapshot 전송/ACK·승인 충돌/해결·takeover UI·FINISH/AUTO_CLOSED 복구·종료 후 정정/복구·Service Worker/설치형 PWA/완전 오프라인 재실행은 미구현이다. 공식 평가/과거 benchmark는 계속 Backend 책임이다. 표준 운동 DB·근육별 통계·디로딩 기획 문서도 작성하지 않았다. 서버 API/제품 코드의 추가 연동 변경은 이번에 필요하지 않았다.

승인 상태: 사용자의 5B 구현·격리 검증 요청 범위에서 완료. 대기 중인 승인/보류한 위험 작업 없음. Frontend는 검토할 미커밋 변경이 있고 Backend는 clean이며 양쪽 HEAD는 시작 상태와 같다. 사용자 검토 전 커밋·Push하지 않는다.
