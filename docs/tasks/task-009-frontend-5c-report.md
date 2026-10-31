# Task 009 — Frontend 5C 구현·검증 보고서

작성일: 2026-11-01 (Asia/Seoul).

## 범위와 기준

- Frontend 시작/현재 HEAD: `4e6989f830f7d3f935b12df85624446e4ded8441` — `feat(workout): add local workout recording and timers`. **5B 커밋 완료와 두 저장소 clean을 확인한 뒤** 5C를 시작했다.
- Backend 시작/현재 HEAD: `9598fa1ba899f47e595c2c70421b8973c2e0c106`.
- 양쪽 AGENTS/Engineering, Task 006 v0.3.1·Task 008 휴식/인증 정책, Task 009 v1.0, V12~V15 세션 API와 5A/5B 보고서·실제 코드를 확인했다.
- 승인된 5C만 구현했다. Backend 제품 코드·마이그레이션, 개인 `overload_dev`, 의존성·lockfile은 변경하지 않았다. 커밋·스테이징·Push하지 않았다.
- FINISH·종료 후 정정/복구 UI·Service Worker·설치형 PWA·범용 Outbox/Command/Receipt/Feed는 추가하지 않았다.

## 실제 사용자 흐름

1. 기존 온라인 START·ACTIVE/상세 조회와 5B 모바일 입력·타이머를 사용한다. 같은 계정/세대/세션/편집 기기의 Web Lock을 얻은 탭만 편집한다. 잠금 미지원 환경은 읽기 전용이다.
2. 수행 완료·취소·현재 계획·명시 승인 요청의 의미 있는 변경을 먼저 IndexedDB에 원자 저장한다. 로컬 트랜잭션 실패는 완료로 확정하지 않는다.
3. 현재 전체 snapshot을 별도 고정 요청으로 저장한 뒤 V13 PUT을 보낸다. 로컬 저장, 전송 중, 서버 저장을 구분한다. 초안·종목 이동·휴식/유산소 타이머 조작·tick은 snapshot 전송을 만들지 않는다.
4. 전송 중 완료/취소가 추가되어도 고정 본문은 바뀌지 않는다. ACK 저장 후 최신 상태가 다르면 최신 전체 snapshot을 보낸다. 과거 응답으로 현재 수행·계획·초안·타이머를 덮지 않는다.
5. 연결/응답 유실 시 원문을 유지한다. 상세 조회로 상태를 확인한 뒤 같은 요청을 한 번 재전송하며, 다시 불명확하면 자동 반복을 중단한다. 재연결 또는 `서버 저장 상태 다시 확인`이 다음 확인을 시작한다.
6. 중량 변경은 기본 `오늘만 변경`이다. 명시 승인 요청만 전송하며 적용됨/APPLIED, 승인 확인 필요/PENDING, 적용하지 않음/NOT_APPLIED를 구분한다. PENDING이어도 실제 수행은 저장한다.
7. PENDING 종목에서 현재 루틴 중량 유지/KEEP_CURRENT 또는 입력한 중량으로 지금 재승인/REAPPROVE를 확인하고 선택한다. 과거 수행의 최초 승인 문맥은 바뀌지 않는다. 해결 중 같은 종목의 추가 승인 요청은 결과 확인까지 차단하며, 오늘만 변경·수행 입력은 계속할 수 있다.
8. 다른 기기/epoch 또는 서버 종료가 확인되면 쓰기를 중단하고 원본을 남긴다. `이 기기로 편집 가져오기`는 확인 후에만 takeover를 호출한다. 새 epoch는 서버 상태의 별도 사본이며 이전 epoch의 미전송 기록을 복사하지 않는다.
9. 인증 만료 시 이미 열린 같은 계정의 로컬 입력만 유지한다. 재인증 후 세대·상태·편집권을 다시 확인하고 재개한다. 명시 로그아웃/다른 계정 전환은 기존 데이터를 숨기고 늦은 응답을 차단한다.

사용자 화면에는 저장/승인/편집권 상태를 표시하고 내부 epoch·revision·hash는 노출하지 않는다. 공식 평가·과거 benchmark는 계속 Backend 책임이다.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/features/workout-local/sync-state.ts` | 고정 snapshot 생성, ACK/서버 관측, 전달 거절, 승인 해결의 순수 전이 |
| `src/features/workout-local/sync.ts` | 세션별 단일 송신, 제한된 재확인, 승인 해결 송신/사실 확인, 상태 안내 |
| `src/features/workout-local/controller.ts` | 기존 로컬 직렬 트랜잭션 뒤 송신 연결·중단·재시도 |
| `src/features/workout-local/model.ts` | 승인 해결 중 동일 종목의 승인 sequence 충돌 방지 |
| `src/features/workout-local/types.ts`, `validation.ts` | version 2 호환 optional 고정 요청/ACK/삭제 확인 메타와 격리 검증 |
| `src/features/workout-local/LocalWorkoutScreen.tsx` | 저장 상태, 명시 승인 해결, ACK 시 편집 화면 유지 |
| `src/features/workout-online/storage.ts` | 고정 요청/ACK CAS 저장, 불명확한 ACK의 복원, 고정 takeover 메타 |
| `src/features/workout-online/controller.ts`, `WorkoutWorkspace.tsx` | 서버 관측·인증 경계·명시 takeover·새 epoch 화면 |
| `tests/workout-sync.test.mjs` | 5C 전용 Node 테스트 26개 |
| `tests/workout-online-ui.test.mjs` | 현재 저장 안내와 기술 용어 비노출 회귀 |
| `tests/fixtures/workout-sync-vite.mjs` | 일회성 V15 Backend 전용 프록시·응답 유실/지연·격리 만료 주입 |
| `tests/fixtures/task-009-5c-sync.html`, `task-009-5c-sync.tsx` | 실제 IndexedDB/API/제품 UI 브라우저 시나리오 |
| `tests/fixtures/run-workout-sync-browser.mjs` | 독립 Edge 프로필·강제 종료 3회·결과 수집·프로세스 정리 |
| `AGENTS.md`, `README.md`, `docs/engineering/frontend.md`, 이 보고서 | 현재 구현과 후속 범위 구분 |

## IndexedDB 고정 요청·ACK 계약

`overload.workout.v1` **DB version 2를 유지**한다. 새 object store나 migration은 없다. 5B가 기록한 optional 필드 없는 문서도 그대로 읽는다. localWorkouts 복합 키는 `[userId,dataGeneration,sessionId,editorDeviceId,writerEpoch]`이다.

| 필드/저장 위치 | 계약 |
|---|---|
| `localWorkouts.pendingSnapshot` | 정확한 V13 request, 직렬화한 `requestJson`, 이번에 제출한 LOCAL_ONLY ID, 선택적 authoritative rejection 표시. 한 개만 유지 |
| `localWorkouts.pendingResolution` | 명시 해결 request/JSON, 해결 전 작업 중량 선택, 선택적 거절 표시. snapshot과 같은 송신 슬롯 사용 |
| `lastAck`, `serverRevision`, `serverVersion` | 검증한 ACK와 서버 확정 경계. 고정 요청 해제·수행 확인·삭제 확인과 같은 트랜잭션에 커밋 |
| `confirmedDeletedSetIds`, `confirmedDeletedCardioIds` | ACK로 확인한 삭제. 아직 미전송인 삭제 의도와 분리 |
| `presence`, `cancelled` | LOCAL_ONLY/SERVER_CONFIRMED/UNKNOWN 및 취소 원본 보존. ACK 확인 전 삭제/정리 없음 |
| `meta`의 takeover 키 | `['takeover',userId,dataGeneration,sessionId,targetDevice]`에 고정 expected epoch request/JSON. 서버 사본 저장 때 성공한 시도를 함께 해제 |

- InitialPlan·startedAt은 불변이고 AppliedPlan은 별도다. decimal/count의 wire 정규화는 기존 문자열/BigInt 검증을 사용한다. 입력 `'60.000000'`, `'0001.250000'`은 초안/타이머 원문에 남는다. JS 부동소수 계산 결과로 바꾸지 않는다.
- 고정 요청 저장이 실패하면 HTTP를 보내지 않는다. ACK 저장 실패는 성공으로 표시하지 않고 원래 요청·UNKNOWN을 유지한다. 재시작은 상세 확인 후 정확히 같은 revision/본문의 duplicate ACK로 확정한다.
- 낮은 서버 revision 조회는 요청 실패의 증거가 아니다. 같은 revision 조회도 snapshot ACK 자체를 대체하지 않는다. 예상보다 높은 서버 revision, 고정 요청이 없는 UNKNOWN, 확인되지 않은 수행 문맥은 원본을 보존하고 확인 필요로 중단한다.
- 전송 시작 시 새 수행을 UNKNOWN으로 바꾸고, ACK된 고정 요청에 들어 있던 ID만 SERVER_CONFIRMED로 바꾼다. ACK 이후 생긴 수행은 여전히 미전송이다.
- 서버 확인 수행의 취소는 V13 삭제 ID로 보낸다. LOCAL_ONLY 취소는 cancelled에만 남긴다. UNKNOWN 취소는 원래 고정 요청을 먼저 확인한 다음 삭제를 전송한다. UUID 자동 재생성·재번호·재사용은 없다.
- 400/404/422의 확정 거절은 해당 고정 요청의 신규 수행만 LOCAL_ONLY로 되돌리고 존재하지 않는 서버 삭제 ID를 제거할 수 있다. 원문은 rejected 요청/cancelled에 남긴다. 실제 수정 없이 새 revision을 발급해 반복하지 않는다.
- `editVersion` CAS와 Web Lock을 함께 적용한다. snapshot 의미 변경만 localRevision을 증가시킨다. 고정 요청 저장·ACK·초안·타이머 tick은 snapshot revision을 올리지 않는다. 재승인 결과의 새 승인 사실이 snapshot에 추가되면 그 의미 변경은 다음 revision으로 보존한다.

## 승인 충돌과 takeover

승인 UUID·종목별 sequence·선행 UUID·전후 중량·발생 시각을 모두 전송한다. 여러 요청을 마지막 값으로 합치지 않는다. 해결 요청은 해당 종목의 전체 PENDING ID와 현재 session version/revision을 사용한다. REAPPROVE는 현재 루틴 배치의 version/승인값을 다시 조회하고 새 UUID를 만든다.

해결 응답이 사라지면 상세의 NOT_APPLIED reason/resolvedAt/resolvedByRequestId 및 새 재승인 요청의 불변 필드를 확인한다. 확인되지 않으면 기존 고정 요청을 유지한다. 충돌 거절 뒤에는 새 사용자 선택으로만 새 expected version을 만든다. 서버 recordedContexts는 사실로만 읽고 과거 수행 문맥을 수정하지 않는다.

takeover도 로컬에 고정한 원래 expected epoch로 재확인한다. 응답 유실 사이 제3기기가 다시 인수하면 기존 요청은 409이고, 최신 상세를 관측해 해당 시도를 거절로 표시한다. 그다음 **새 명시 선택**에만 현재 epoch의 새 인수 요청을 만든다. 자동 재기준/자동 병합은 없다. 모든 구 epoch 사본과 미전송 원본은 남는다.

## 실제 검증

### Frontend 전체 회귀

- `npm test`: **393/393 통과**. 기존 367개 + 5C 26개. Node 내장 테스트 러너와 기존 의존성만 사용했다.
- `npm run lint`: 통과.
- `npm run build`: TypeScript 및 Vite production build 통과.
- `git diff --check`: 통과.
- 새 브라우저 fixture의 `prefer-const` 오류 1건을 수정하고 lint/build를 다시 통과했다. 테스트 비활성화·요구사항 축소 없음.

Node 테스트는 고정 DTO/본문·저장 전 HTTP 차단·ACK 저장 실패·연속 revision·전송 중 추가 완료/삭제·낮거나 예상 밖 revision·고정 요청 재시작·재시도 상한·승인 체인/해결·두 번 선택 경쟁·유산소 삭제/재완료·로그아웃·세대/편집권/종료 경계를 검증한다.

### 실제 Edge IndexedDB + 격리 Backend/PostgreSQL

기존 Backend `scripts/task-008-1c-browser.init.gradle`의 `workoutBrowserEnvironment`를 그대로 사용했다. Testcontainers **PostgreSQL 18.6**, V1~V15, 시작 시 사용자 0명인 `overload_browser_isolated`만 사용했다. Backend `127.0.0.1:8946`, 전용 Vite `127.0.0.1:3077`, 개발자 env 파일을 읽지 않는 프록시였다. 개인 `127.0.0.1:5433/overload_dev`에 접속하거나 V12~V15를 적용하지 않았다.

실제 AuthApi·WorkoutApi·WorkoutStore·Web Locks·LocalWorkoutController 및 StrictMode 제품 UI를 사용했다. EMAIL OTP는 기존 테스트 발송기에서만 읽었고 60초 재발급 제한을 준수했다. 인증/권한 우회는 없다. `overload.core.v1` 접근은 테스트 가드가 즉시 실패시킨다.

실행 명령:

```powershell
$env:JAVA_HOME='C:\Users\Home\.jdks\temurin-25.0.5'
.\gradlew.bat --offline --no-daemon -I scripts/task-008-1c-browser.init.gradle workoutBrowserEnvironment
# Frontend 저장소의 별도 프로세스
node tests/fixtures/workout-sync-vite.mjs
node tests/fixtures/run-workout-sync-browser.mjs
node tests/fixtures/run-workout-sync-browser.mjs --edge
```

주요 검증 결과:

- 주 흐름 **18개 통과**, 독립 브라우저 프로세스 **강제 종료·재시작 3회**: 고정 요청 저장 후 전송 전, 서버 반영 후 ACK 두 번 유실, ACK IndexedDB 트랜잭션 abort 후 재시작.
- 완료 즉시 실제 V13 수행 저장, 고정 원문 duplicate ACK, 전송 중 UNKNOWN 취소·추가 완료의 최신 snapshot과 삭제 이력, ACK 저장 실패 시 성공 미확정.
- 초안/이동/휴식 조절/조회 추가 PUT 0건, 두 번째 실제 탭의 제품 controller 읽기 전용·추가 전송 없음.
- 외부 루틴 version 변경 뒤 연속 승인 두 건 PENDING 및 실제 수행 보존, 제품 KEEP_CURRENT/REAPPROVE 명시 해결, 해결 응답 유실 확인, 과거 recordedContexts 불변.
- 다른 기기 인수 후 구 sender 중단, 제품 takeover 응답 유실 재확인, 구 미전송 수행의 새 epoch 자동 복사 없음.
- 격리 DB 한 세션의 마지막 동기화 시각만 25시간 전으로 이동해 실제 Backend AUTO_CLOSED를 확인했다. 늦은 snapshot 차단과 원본 보존을 검증했다. 클라이언트가 종료를 결정하지 않는다.
- 실제 세대 불일치 응답, 서버 세션 revoke/401, 같은 계정 재인증 후 전송 재개, 제품 로그아웃/계정 B 전환과 늦은 응답 차단.
- 추가 경계 **2개 통과**: 실제 유산소 완료/확인 삭제/새 UUID 재완료와 decimal 원문, 인수 응답 유실 중 제3기기 재인수→원래 요청 재확인→새 명시 선택. takeover가 lastWorkoutSyncedAt을 연장하지 않음을 확인했다.
- SQL 읽기 집계로 수행 tombstone·record_change_events·유산소 삭제·KEPT_CURRENT/REAPPROVED/APPLIED·최초 PENDING 수행 문맥 보존을 재확인했다. 축적된 일회성 테스트 데이터이며 실제 사용자 데이터가 아니다.

산출물은 gitignored `logs/task-009-5c/`의 `npm-test.log`, `browser-result.json`, `edge-browser-result.json`, `http.jsonl`, `checkpoint.json`, `trace.jsonl`, `postgres-verification.log`이다. 테스트 전용 원문 요청 목록은 fixture 메모리에 있고 OTP·쿠키·인증 비밀을 커밋하지 않는다.

초기 강제 재시작 검증에서 Edge의 복원 탭과 새 탭이 테스트를 중복 시작해 하네스가 대기했다. 하네스 전용 Web Lock으로 실행자를 하나로 제한해 해결했다. 제품의 Web Lock을 우회하지 않았으며 기존 5A/5B 브라우저 전체 시나리오는 재실행하지 않았다.

검증 종료 후 전용 Vite·Backend fixture·독립 Edge를 종료했다. 검증 프로세스 0개와 포트 3077/8946 listener 0개, Backend ready 파일 제거를 확인했다. 격리 PostgreSQL/Ryuk은 제거되었고 기존 사용자 컨테이너 5개는 그대로 유지했다. 기본 sandbox의 Docker/CIM 읽기 제한은 격리 대상 확인용 권한으로 재조회했으며 종료 확인을 생략하지 않았다.

## 제한·후속 작업

- 중요한 미확정 정책을 새로 결정한 항목은 없다. 서버 계약 밖의 예상 revision/확인 불가 문맥은 안전하게 중단하고 원본을 보존한다.
- FINISH·종료 후 온라인 정정/복구 UI, 구 epoch 미전송 원본의 선택 복구는 5D 범위다. AUTO_CLOSED를 확인해 차단하지만 재개/정정 성공으로 표현하지 않는다.
- Service Worker·설치형 PWA·완전 오프라인 cold restart는 5E 범위다. 이번 검증은 Windows headless Edge이며 iPhone Safari/설치형 앱 실기 검증을 대체하지 않는다.
- 타이머 tick/heartbeat/주기적 재시도는 없다. 재연결 이벤트 또는 명시 확인이 필요하며 브라우저 영구 보존/백그라운드 실행을 보장하지 않는다.
- Backend 제품 변경이 없어 Backend 전체 회귀를 다시 실행하지 않았다. 실제 V15 격리 서버/API/DB 검증과 Frontend 전체 회귀를 수행했다.
- 사용자 검토 전 커밋/Push 없음. 5D~5E는 별도 승인 이후 진행한다.
- 최종 Frontend Git 상태: 수정 12개·신규 8개, 모두 unstaged이며 index는 비어 있다. HEAD는 `4e6989f` 그대로다. Backend는 HEAD `9598fa1` 그대로, 작업 트리 clean이다.
