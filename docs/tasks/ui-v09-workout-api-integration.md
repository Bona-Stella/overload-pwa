# 운동 UI 2차 — 기존 API 연동 작업 기록

상태: **일반 운동 구현·실제 API 연동·사용자 피드백·코드 로컬 커밋 완료 / 2026-11-13 문서 동기화 완료**
기준: UI 1차 승인 커밋 `e2965d8`, Task 009 v1.0 및 현행 세션·루틴·추가 부하 계약.
검증일: 2026-11-13. 최초 연동은 기존 API만 사용했으며, 아래 검수 피드백에서 읽기 전용 잠정 평가 API와 표준 운동 시드를 수정했다. DB 스키마·Flyway 이력은 변경하지 않았다.

## 연결 경로

`WorkoutWorkspace → LocalWorkoutScreen → LocalWorkoutController → WorkoutSynchronizer → WorkoutApi → AuthController.workoutRequest`를 재사용한다.
새 요청 큐나 저장소를 만들지 않았다. DB3 / 로컬 문서 schema2의 기존 직렬 트랜잭션·writer epoch·data generation·Web Locks와 고정 요청/ACK 경계를 유지한다.

승인된 `workout-flow` 컴포넌트에 실제 로컬 세션의 표시 모델을 전달한다. Mock 검토 경로는 별도로 유지하며 운영 경로에서 Mock 세션·평가를 가져오지 않는다.
숫자·UUID·소유자/세대 검증은 기존 API 클라이언트를 사용한다. 중량은 소수 문자열을 유지하고 요약 볼륨만 BigInt로 정확히 표시 계산한다. 평가 자격과 중량 판단은 서버가 소유한다.

| API | 연결 역할 |
| --- | --- |
| GET /api/v1/routines, /api/v1/routines/{id} | 실제 루틴 목록·계획·승인 중량 |
| GET /api/v1/standard-exercises/search-data, /cardio-choices, /{id}; GET /api/v1/manufacturers | 운동 검색·유산소 선택·유지된 비선택 종목 이름·장비 |
| GET /api/v1/workout-settings | 기존 세 구간 휴식 시간 |
| POST /api/v1/workout-sessions | 기존 고정 START 요청으로 운동 시작 |
| GET /api/v1/workout-sessions/active, /{id}, /closed | 진행 확인·복원·종료 기록. 기존 기기 전환은 POST /{id}/takeover 재사용 |
| PUT /api/v1/workout-sessions/{id}/snapshot | AppliedPlan 순서·목표·추가 종목, 완료 세트·유산소·삭제 UUID·승인 요청 저장 |
| POST /api/v1/workout-sessions/{id}/approval-resolutions | 기존 승인 충돌 해결. 정상 승인 요청은 snapshot에 포함 |
| POST /api/v1/workout-sessions/{id}/finish | 최초 실제 종료 시각·스냅샷을 고정해 중복 방지. ACK의 로컬 보존 후에만 종료 요약 |
| GET /api/v1/workout-sessions/{id}/progress-assessment | 서버 확인 ACTIVE 종목별 잠정 평가 |
| GET /api/v1/workout-sessions/{id}/assessment, /record-change-events | 최초 평가·현재 서버 평가·변경 이력 |
| PATCH /api/v1/workout-sessions/{id}/records | 기존 종료 기록 정정·논리 삭제. 요약과 서버 평가 갱신 |
| POST /api/v1/workout-sessions/{id}/recoveries, /closed-approval-resolutions; DELETE /api/v1/workout-sessions/{id} | 기존 기록 관리의 선택 복구·승인 해결·운동 논리 삭제 경로 보존 |

최근 기록의 반복 횟수 참고는 첫 페이지 최대 20개 종료 세션에서 같은 표준 종목·장비를 찾는다. 공식 벤치마크/증감 판단으로 사용하지 않으며, 명시적으로 입력하거나 비운 초안을 덮어쓰지 않는다.
이미 입력된 초안·진행 중량·현재 선택·타이머·준비운동 여부는 기존 기기 사본에서 복원한다. 다른 기기의 미확정 입력이나 실행 중 타이머를 서버 저장으로 표시하지 않는다.

## 미연동 및 경계

- **기구 세팅 메모 서버 저장은 미구현.** 현재 Backend 컨트롤러·요청/응답·마이그레이션에는 메모 항목이 없다. 임의 API/컬럼을 추가하지 않았다. 메모는 해당 기기의 해당 세션에만 보관하고 화면에도 이를 명시한다. 실패한 메모 입력은 메모 버퍼에서 재시도하며, snapshot 및 서버 revision에는 포함하지 않는다. 기기 내 재진입은 검증했지만 다른 기기·새 세션의 서버 복원은 지원하지 않는다.
- 서버 메모 구현 전 저장 단위(표준 종목/루틴 배치/세션), 소유권, 길이, 변경 충돌 및 장비 문맥 정책을 확정하고 API·DB 영향 범위를 별도 검토해야 한다. 이번 작업에서 스키마 변경이나 마이그레이션을 만들지 않았다.
- 최초 연동에서 빠졌던 진행 중 잠정 증감 안내는 아래 피드백으로 실제 서버 평가에 연결했다. 종료 후 공식 평가와 구분하며 승인 중량을 자동 변경하지 않는다.
- 디로딩 전용 시작·소속·혼재 세션 연동은 기존 G6 후속 범위다. 일반 운동을 디로딩으로 위장하거나 홈의 일반 쓰기 보호를 해제하지 않는다.
- 휴식 알림의 기존 기본 표시/효과음을 재사용한다. 서버의 휴식 시간 API에는 독립 알림 토글 필드가 없으므로 토글의 서버 동기화를 구현한 것으로 처리하지 않는다.
- `routine-preview?review=workout` 및 다른 검토 화면의 Mock/Fixture는 유지한다. 운영 일반 운동의 루틴·수행·유산소·종료·평가는 실제 API 자료다.

## 구현 파일

- 표시 연결: `src/features/workout-local/LocalWorkoutFlow.tsx`, `flow-data.ts`, `LocalWorkoutScreen.tsx`, `ApprovalControls.tsx`
- 기기 내 UI 상태/입력 보호: 같은 폴더의 `controller.ts`, `model.ts`, `types.ts`, `validation.ts`
- 실제 화면 선택·참고 기록·종료 관리: `src/features/workout-online/WorkoutWorkspace.tsx`, `ClosedWorkout.tsx`, `summary-data.ts`
- 기존 컴포넌트의 실제 자료/저장 오류 지원: `src/features/workout-flow/WeightFocus.tsx`, `CardioFocus.tsx`, `WorkoutDialogs.tsx`, `WorkoutSummary.tsx`, `types.ts`
- 화면 표시 유무와 키보드/예약 공간 경계: `src/app/AppShell.module.css`, `src/features/workout-flow/WorkoutFrame.tsx`, `WorkoutFlow.module.css`
- 기존 효과음 공유: `src/features/workout-flow/useRestAudio.ts`, `src/review/useRestAudio.ts`(재수출)
- 회귀 검증: `tests/workout-flow-api.test.mjs`, `workout-local.test.mjs`, `workout-online-ui.test.mjs`, `workspace-boundary.test.mjs`, `tests/fixtures/verify-workout-flow-api.mjs`
- 최초 연동의 Backend 수정 파일: 없음. 후속 피드백 수정은 아래에 기록한다.

## 검증

- `npm test`: **575/575 통과**. 승인 기준 565건에 입력 보존·표시 매핑·정확한 볼륨·타이머 경계 등 10건 추가. 기존 UI 테스트는 승인된 공통 컴포넌트 기준으로 갱신했다.
- `npm run lint`: 통과(경고 0), `npx tsc -b`: 통과, `npm run build`: 통과. Vite의 기존 500kB 청크 크기 경고는 남아 있다.
- `node tests/fixtures/verify-workout-flow-api.mjs <runId>`: 현행 Backend와 production dist를 연결한 Chrome 검증 **11개 통과**. 기존 HomeReviewEnvironment/V22 소유권 검증, 별도 OTP 계정, tmpfs PostgreSQL, 전용 브라우저 프로필을 사용했다. 개인·공유·보존 DB를 사용하지 않았다.
- 실제 서버 확인: 루틴 조회/시작, 운동 순서와 현재 UUID 보존, 전송 전 장애에서 입력 보존·동일 계정 재확인 후 저장, 진행 중량 승인과 실제 루틴 갱신, 세트 취소/새 UUID 재완료/중간 세트 제외·추가, 메모 기기 내 재진입과 본문/하단 액션, 명시적 맨몸 추가 부하, 유산소 일시정지/재실행/실측 저장, FINISH 응답 유실 후 같은 요청 해시/duplicate ACK/단일 종료, 종료 후 실제 기록 정정과 최초 평가 불변, 새로고침 후 종료 기록.
- 브라우저 표시 폭: 320px·393px·1280px 가로 넘침 없음. 키보드 관련 기존 자동 시뮬레이션 회귀 테스트 통과.
- 유산소 START가 직전 250ms 표시 tick보다 뒤에 저장되면 표시 계산이 예외를 내던 문제를 수정했다. 화면의 경과 시간만 0에서 시작하며, 실제 시각 역행을 차단하는 모델 검증은 유지한다.
- **실제 iPhone Safari의 이번 API 연동 후 검증은 미실시.** 이전 UI 1차 실기기 승인을 이번 통합의 실기기 검증으로 재사용하지 않는다.

일회용 API 검증의 runId는 `70939343-e7b9-430b-9abb-e127604c9524`이며 요청 상태·고정 요청 해시·브라우저 정리 결과는 Git 제외 `logs/verification-v22/<runId>/`에 있다. 비밀 키나 OTP는 이 문서에 기록하지 않는다.

검증 후 해당 Java 프로세스·전용 Chrome·tmpfs DB 컨테이너를 종료·제거하고 3000·4173·6260·4854 포트 해제를 확인했다. 기존 다른 개발/DB 프로세스는 종료하지 않았다. 정리 근거는 같은 디렉터리의 `workout-flow-api-cleanup.json`이다.

## 후속 문서 최신화 대상

전체 연동 최종 확인 후 Frontend 현황(실제 운동 UI 연결/로컬 메모 경계), UI·Backend 연동 설계(공식 평가 시점/서버 미지원 항목), 작업 검토 기록(통합 검증과 실기기 확인 구분)을 갱신한다.
Backend 계약에는 후속 추가한 progress-assessment를 기록했다. 별도 메모 정책/API는 미정이며 기기 내 보관 경계를 유지한다.
이번 기록은 UI 1차 승인을 재개하거나 API 전체 완료를 선언하는 문서 마감이 아니다. Git 커밋·Push 및 신규 UI 개발은 진행하지 않는다.

## 일반 운동 API 검수 1차 피드백 — 반영 및 재검수 대기

2026-11-13 사용자 요청 7건에 한정했다. 아이소래터럴 등 모델/특성은 사용자가 이번 범위에서 제외했으며 후속 데이터 검수로 남긴다. 메모 서버 저장은 추가하지 않았다.

| 피드백 | 원인과 반영 |
| --- | --- |
| 수동 휴식 종료 1초/효과음 | 종료 시각을 Date.now로 바꾸는 동안 이전 250ms 표시 tick과 새 알림 키가 결합해 1초로 계산됐다. 즉시 표시 종료와 직렬 로컬 rest 제거로 바꾸고, 해당 휴식의 예정·재생 중 tone을 차단한다. 진행 중 연장 뒤에도 종료를 큐에 넣어 유실하지 않는다. 자동 5..1초 알림 정책은 유지한다. |
| 긴 운동명 | 실제 h1의 번호·이름 전체 DOM Range 폭을 측정해 기존 크기에서 최소 16px까지 축소한다. 기존 한 줄 높이·버튼 경계를 보존하고 최소 크기에서도 넘치는 경우만 말줄임한다. ResizeObserver·폰트 로딩에 대응한다. |
| 증량/감량 안내 | 기존 평가 GET은 종료 세션만 허용하므로 ACTIVE 안내 호출이 없었다. GET /api/v1/workout-sessions/{id}/progress-assessment를 추가해 기존 첫 N개·승인 문맥·반복 범위 판정을 재사용한다. ACTIVE는 종목별 잠정이며 FINISH의 전체 원계획 완료 요건·공식 평가 보존은 유지한다. |
| 유산소 완료 | 실제 화면·Mock·접근성/브라우저 검증의 버튼 문구를 '유산소 완료'로 통일했다. 동작과 스타일은 유지한다. |
| 정상 저장 안내 | SAVED 성공 문구와 비어 있는 aside를 렌더하지 않는다. 오류·연결 대기·미저장 입력·승인 충돌·명시 재시도는 유지한다. 동기화 상태기는 제거하지 않았다. |
| 공통 검색 | Settings CatalogView, 루틴 생성/교체, 세션 추가/교체가 동일 ExerciseSearch를 사용한다. 기존 Settings 검색·별칭·부위 필터·목록·32px 아이콘·PRIMARY 정보를 공유한다. 별도 세션 select와 변형 라벨 헬퍼·미사용 목록 CSS를 제거했다. |
| 표준 운동 | 제조사별 머신 숄더 프레스 2 UUID 중 기존 운동 기록이 있는 f6fc6164-3d3c-863e-83d2-0068d1da9aac를 단일 표준으로 사용한다. Hammer 루틴 배치를 이 UUID로 정리하고 원래 장비·중량·근육 매핑은 유지했다. 카탈로그는 31→30종(웨이트 29→28, 유산소 2)이며 같은 표준명 중복은 추가로 없었다. |

잠정 평가는 CLEAN, localRevision=serverRevision인 실제 저장 사실만 읽는다. 응답 사용자·세대·sessionId·writerEpoch·revision·version을 대조하고 오래된 응답을 취소/배제한다. 미전송 변경·완료 취소·오늘만 중량은 안내를 숨긴다. 조회 실패 시 수행을 보존하고 수동 재시도를 제공한다. 비교 벤치마크나 승인 중량 변경을 잠정 결과로 생성하지 않는다.

### 수정 범위

- Frontend: workout-flow의 WeightFocus/WorkoutFrame/WorkoutDialogs/스타일, useFitWorkoutTitle/useRestAudio; workout-local의 LocalWorkoutFlow/LocalWorkoutScreen/useProgressAssessment; workout-online의 API/types/WorkoutWorkspace 및 공통 검색·카탈로그. 기존 메모 키보드 로직은 보존했다.
- Backend: WorkoutAssessment, WorkoutRecordData, WorkoutRecordService, WorkoutSessionController 및 대응 단위/HTTP 통합 테스트. API 계약은 workout-sessions.md에 추가했다.
- 시드/Fixture: catalog.json/catalog-plan.sql/preview.mjs, ApprovedCatalogReviewSeed, V22BrowserEnvironment 및 PWA 승인 카탈로그 개수 검증. 격리 테스트용 routine-plans.local.json의 두 장비 배치는 같은 표준 UUID를 사용한다. 개인 설정 파일은 Git 제외다.
- 검토 DB만 변경했다. runId 93028565-a41d-401a-8551-e74af9450991의 named volume과 loopback 1789 소유권을 확인하고 변경 전 별도 pg_dump를 남겼다. 루틴 version 증가와 새 계획 이력을 기록했다. 기존 수행·세션·장비·Flyway 이력 불변을 확인했다. 원본 V35 백업과 개인/보존 DB는 변경하지 않았다.

### 이번 검증

- Frontend 전체 자동 테스트 **579/579**. 추가 회귀: 잠정 DTO 검증, 정상 성공 안내/빈 공간 제거와 오류 유지, 잠정 권고 표시/제외, 실제 Chrome의 수동 종료·빠른 반복·1초·연장 저장 경합·자동 알림 및 운동명 폭. 잠정 훅의 이전 응답 취소·동일 revision 중복 요청 방지·dirty 상태 안내 제거도 별도 Chrome 재실행으로 통과했다.
- Lint 통과(경고 0), TypeScript 검사 통과, Production Build 통과. 기존 500kB 번들 크기 경고 1건은 남아 있다.
- Backend 전체 단위 **447/447**, 관련 PostgreSQL 통합 **180/180**(세션 163, 평가 이력 16, 정규화 시드 1). 제조사-표준 분리의 SQL 정리 후 시드 통합 1건을 다시 실행해 통과했다.
- 현재 검토 환경의 실제 인증 API Chrome **7개 검증 그룹 통과**: 단일 숄더/독립 장비 루틴 START, ACTIVE 증량·감량·유지와 미완료 전체 상태, 공통 검색/추가한 TODAY_ONLY 안내 제외, 유산소 실측 저장, FINISH 공식 평가, Settings/세션의 동일 행 스타일·별칭 단일 결과·320/393/1280px 표시. 기존 루틴 불변 및 ACTIVE 세션이 남지 않음을 확인했다.
- 별도 tmpfs DB·전용 계정·Production 빌드 Chrome **11개 검증 그룹 통과**: 저장 장애/재시도와 입력 보존, 실제 승인, 세트 취소/제외/추가, 잠정 평가, 메모 기기 내 복원, 맨몸 추가 부하, 유산소, FINISH 응답 유실/동일 요청 중복 방지, 기록 정정과 새로고침. 검증 runId 7b4232a6-8cca-4945-9b8a-cc5093ff37a7. 전용 Chrome/Java/tmpfs DB를 종료·제거했고 3000 포트도 해제됐다.
- 테스트 보완 중 기존 picker의 구형 행 모서리 기대값을 승인된 공통 카탈로그 기준으로 수정했고, 새로고침 검증이 이전 문서를 읽던 경합은 새 문서의 프레임을 기다리도록 수정했다.
- 검토 증거는 Git 제외 logs/workout-api/ 및 .local-backups/workout-api-review/<runId>/feedback-*.json에 있다. OTP·비밀 키를 문서에 기록하지 않는다.

### 검토 환경과 미검증 경계

현재 Frontend PID 98392 / 4173, Backend PID 81144 / 2251, 격리 PostgreSQL 1789 및 보호 미디어 4181을 유지한다. 동일 origin과 인증키를 보존한 Backend/Frontend만 안전하게 재시작했다.

- PC: http://127.0.0.1:4173/
- iPhone LAN: http://192.168.0.3:4173/

**실제 iPhone Safari는 이번 변경에서 에이전트 미검증**이다. 320·393px Chrome은 실기기 검증이 아니다. LAN HTTP는 secure context/Web Locks가 없어 운동 편집이 제한되며 인증 우회는 하지 않았다. 사용자는 인증서 설치 대신 PC 실제 API 검증을 우선하도록 지시했다. 모델 특성과 메모 서버 저장 정책은 후속 논의다.

사용자 최종 API 승인 전이다. 검토 환경을 유지하며 커밋·Push·운영 배포·문서 최종 마감은 하지 않았다.

## 실제 API 2차 UI 피드백 — 반영 및 사용자 재검수 대기

2026-11-13 요청 4건의 표시·매핑만 수정했다. Backend 소스·API·스키마·Flyway·메모 저장 정책은 이번 단계에서 변경하지 않았다.

- **진행 중 하단 높이:** 증량/감량 카드가 있는 footer에만 최소 64px의 동일 grid 행 높이(`minmax(64px,1fr)`)를 적용했다. 카드와 버튼의 실제 내용 높이가 커지면 같은 크기로 늘어나며 기존 6px 간격·상태색·버튼 스타일을 유지한다. 다른 화면/일반 버튼의 높이는 바꾸지 않았다.
- **운동 직후 요약:** 운동 수행 상세 목록과 기록 관리 펼침 영역을 제거했다. 시간·완료 세트·총 볼륨·날짜/요일·전체 완료 상태·중량 검토와 기록으로 돌아가기를 유지한다. 수행 기록은 삭제하지 않았다.
- **중량 검토:** 현재 세션/서버 version과 일치하는 평가에서 eligible한 INCREASE/DECREASE만 표시한다. 평가의 수행 UUID/반복을 실제 세트와 연결하며 실제 kg·반복·완료 세트 수를 표시한다. 같은 값은 한 줄로 묶고 다른 값은 구별한다. 승인 중량으로 대체하지 않는다. 정상 빈 결과, 평가 없음/불일치, 수행 연결 오류를 구분한다.
- **기록 관리:** 운동 종료 직후 진입과 이력 선택 진입을 구분했다. 기존 정정·복구·전체 삭제·평가/변경 이력 기능은 과거 기록 상세 오른쪽 `⋮`에서 제공한다. 기록 정정 선택 시 기존 관리 화면을 열고, 누락 복구/전체 삭제는 기존 확인 다이얼로그를 사용한다. 기록 관리 기능이나 서버 계약을 새로 개발하지 않았다. 기존 관리 화면은 정정과 평가·변경 이력을 함께 제공하는 형태로 유지했으며, RECORD-04~06 전체 화면의 추가 재설계는 하지 않았다.

수정 파일:
- `src/features/workout-flow/WorkoutFlow.module.css`, `WorkoutSummary.tsx`
- `src/features/workout-online/summary-data.ts`, `ClosedWorkout.tsx`, `WorkoutWorkspace.tsx`
- `tests/workout-online-ui.test.mjs`, `workout-feedback-ui.test.mjs`, `tests/fixtures/workout-feedback-ui.jsx`, `workout-review-checks.mjs`, `verify-workout-flow-api.mjs`
- 현행 UI 역할을 반영한 `docs/product/ui-ux.md`와 이 작업 기록. 최종 문서 마감은 아니다.

최종 확인:
- Frontend 전체 **584/584 통과**. 요약 데이터 필터·실제 수행 표시·빈 결과/오류 구분·상세 메뉴 역할에 회귀 5건을 추가했다. 정상 승인 첫 N개 외에 중량이 다른 추가 세트가 있어도 실제 수행을 왜곡하지 않는 표시를 별도 26건 단위 재실행으로 확인했다.
- Chrome의 안내 높이 회귀에서 320·393·1280px, 증량/감량, 긴 중량 문자열에 카드/버튼 외부 크기 동일·최소 64px·간격 6px·텍스트 잘림 없음을 확인했다.
- 현재 검토 환경의 실제 API 브라우저 **8개 그룹 통과**. 2세트씩 수행한 INCREASE/DECREASE/MAINTAIN, 변동 반복 표시, 유지 제외, 요약 상세 영역 제거, 실제 FINISH·공식 평가, 기록 이력→상세→정정 메뉴를 확인했다. 추가 읽기 전용 검증 **1개 그룹**으로 상세의 320·393·1280px 가로 넘침/제목-메뉴 비중첩/44px 메뉴, 기존 복구·전체 삭제 확인창의 열기/취소를 확인했다. 원래 루틴은 변경하지 않았다.
- 최종 Production 빌드와 별도 tmpfs DB·전용 계정의 실제 API 검증 **11개 그룹 통과**. 운동 시작·순서 변경·저장 장애/재시도·실제 승인·세트 편집·메모 로컬 복원·유산소·FINISH 응답 유실/중복 방지·기록 상세 정정/새로고침을 확인했다. runId `2d7fdb98-bd4f-42fd-a26e-a675aea699b1`의 Java PID107200·전용 Chrome·DB 컨테이너를 정리했고 검토 환경은 유지했다.
- Lint 통과(경고 0), 별도 `tsc -b` 통과, Production Build 통과. 기존 500kB 청크 경고는 유지한다. Backend 코드는 이번에 변경하지 않아 Backend 테스트를 재실행하지 않았다.
- 구형 Mock의 요약 상세 목록 기대값을 현재 요청에 맞췄다. 디로딩 요약의 기존 평가 제외 안내는 유지했다. 브라우저 검증의 숨겨진 루틴 카드/이력 로딩/복원된 상세 상태/닫기 접근성 라벨 선택자를 보완한 뒤 통과했다.
- 표본: Git 제외 `.local-backups/workout-api-review/93028565-a41d-401a-8551-e74af9450991/feedback2-*.png`, `feedback2-browser-checks.json`, `feedback2-detail-checks.json`. 320·393px 요약과 상세 이미지를 직접 열어 확인했다.

Frontend PID98392(4173), Backend PID81144(2251), 격리 PostgreSQL1789 및 미디어4181을 재시작 없이 유지했다. PC는 http://127.0.0.1:4173/, LAN은 http://192.168.0.3:4173/ 이다. 실제 iPhone Safari는 이번 변경에서 미검증이며 Chrome 모바일 폭 검증과 구분한다. LAN HTTP의 secure context/Web Locks 제한은 유지한다.

사용자의 API 최종 승인 전이다. 커밋·Push·운영 배포·검토 서버 종료·문서 최종 마감을 하지 않았다.

## 실제 API 운동 기록 UI 통합 수정 — 사용자 재검수 대기

2026-11-13 최신 요청 및 정책 답변을 적용했다. 앞선 2차 기록에서 수행 목록 전체를 숨겼던 표현/구현은 이번 요청으로 대체한다. **운동 수행 제목만 제거하고 실제 WEIGHT/CARDIO 부모 카드와 전부의 수행 내역을 복원**했다.

### 표시와 연결

- 순서: 운동 기록 요약 → 이번 운동의 중량 검토 → WEIGHT/CARDIO 실제 수행 → 기록으로 돌아가기. 날짜/요일·완료 상태·시간·완료 세트·총 볼륨과 실제 장비·실적·유산소 측정값을 보존한다.
- 중량 검토는 첫 행에 운동명과 `기존 45kg ↑/↓`, 둘째 행에 완료/계획 수와 실제 반복 목록을 표시한다. `이번 수행`, 중복 세트 수, 유지 검토 목록은 제거했다. 증량의 기여 반복은 초록, 하한 미달 반복만 노랑, 미완료 세트 수는 노랑이다. 화살표에 의미 라벨을 제공한다.
- 평가와 실제 수행 UUID·ordinal·reps·세션/version을 대조한다. 유지·자료 부족·조회 실패·연결 오류를 구분한다. 실제 카드 목표의 기준값은 당시 InitialPlan의 승인 중량이며 현재 루틴 값으로 과거를 덮어쓰지 않는다. 중량 검토의 기존 값은 해당 판정의 서버 승인 문맥에서 가져온다.
- 과도한 운동명 위아래 간격의 원인은 초기 CSS reset에 h4가 빠져 남은 브라우저 기본 margin이었다. summary 안의 h4 margin을 0으로 제한하고 첫 항목 간격만 줄였다. 세트 행·종목 구분선·카드 패딩은 유지했다.
- 운동명과 오른쪽 세트·총 볼륨은 Grid의 가변 영역/내용 영역으로 나눴다. 14px/700/기본 본문색을 공유하고 숫자 요약은 nowrap이다. 극단적인 긴 수치도 값을 자르거나 다른 행으로 나누지 않으며 행 내부 가로 스크롤로 보존한다.
- 메뉴는 44px 이상 목록형 행·가벼운 구분선·삭제 위험 색상·Hover/Pressed/Focus 및 외부 터치/ESC 닫힘을 제공한다. 화면 전환 시 팝오버를 닫거나 컴포넌트와 함께 해제한다.
- 정정 화면은 날짜·완료 상태·실제 시작/종료·기록 새로고침과 종목별 수행을 구분한다. 공통 장비만 종목에 묶으며 서로 다른 장비는 세트별로 유지한다. 세트 번호/실제 값/시각/정정 액션을 분리했다.
- 정정 창은 대상 운동/세트·원래 실제 기록과 허용된 입력만 표시하고 저장/취소/삭제를 구분한다. 맨몸 수행은 승인용 weightKg를 추가 부하로 대신 표시하지 않으며 실제 명시적 추가 부하/미확인을 구분한다. 실패 시 입력을 보존하고 입력을 수정하면 지난 검증 오류를 해제한다. 시간·장비·원본 문맥의 편집 권한을 늘리지 않았다.
- 복구는 원래 기기에 남은 실제 완료 원본 중 선택 가능한 누락 수행만 제공한다. 충돌/이미 저장/삭제 기록은 별도 확인 영역에서 비활성으로 유지한다. API·UUID·중복/충돌/기대 version 정책은 기존 모델/컨트롤러를 재사용한다.
- 평가 이력은 최초/현재 **공식 기준 기록 평가**와 실제 수행 변경 전후·시각·사유를 표시한다. 서버가 제공하지 않는 과거 권고 스냅샷이나 평가 변화를 임의 생성하지 않는다. 원시 JSON/DTO/요청 카운터는 표시하지 않는다.

### 확인된 정책과 API 변경

사용자가 질문에 `중량 검토 권고만 변경, 공식 기준 기록 자격 유지`로 답했다. 기존 공식 평가의 전체 원계획 완료 조건과 미완료 감량 요청을 혼합하지 않았다.

- 새 경로 없이 기존 GET /api/v1/workout-sessions/{id}/assessment에 필수 nullable `weightReview`를 추가했다. schemaVersion1/ruleVersion workout-weight-review-v1과 판정 기준·승인 중량·실제 수행·기여 여부를 제공한다.
- 정상 문맥의 미완료 또는 하한 미달은 DECREASE, 전체 계획의 첫 N개가 모두 상한 이상이면 INCREASE, 나머지는 MAINTAIN이다. 오늘만/혼합/승인 미확인/목표 불일치/무수행은 자료 부족으로 제외한다. 추가 세트는 실제 기록에 보존하되 기존 첫 N개 판단을 임의로 확장하지 않는다.
- 완료 스냅샷과 공식 benchmark eligibility·벤치마크 선택·승인 중량·기록 저장 규칙은 변경하지 않았다. 미완료 감량이 기준 기록으로 승격되지 않음을 검증했다.
- 읽기 전용 repeatable-read 결과이며 DB 스키마/Flyway/기존 평가 스냅샷 마이그레이션은 없다. 메모 서버 저장·새 종목 모델 계약·신규 의존성은 추가하지 않았다.

### 이번 수정 파일

- FRONT: workout-flow/WorkoutSummary.tsx, WorkoutFlow.module.css; workout-online/ClosedWorkout.tsx, summary-data.ts, types.ts, validation.ts, api.ts; review/WorkoutRecordReview.tsx.
- BACKEND: workoutsession/WorkoutAssessment.java, WorkoutRecordData.java, WorkoutRecordService.java.
- 회귀: WorkoutAssessmentTests.java, WorkoutAssessmentHistoryIntegrationTests.java; tests/workout-online-ui.test.mjs, workout-online.test.mjs, workout-feedback-ui.test.mjs 및 관련 JSX/브라우저 검증 Fixture.
- 계약/진행 기록: Backend docs/api/workout-sessions.md, engineering/backend.md; Frontend ui-ux.md, Decision Log, frontend.md 및 이 문서. 전체 문서 최종 마감은 하지 않았다.

### 검증

- Frontend 전체 **585/585 통과**. API DTO의 필수/버전/중량/세트 증거 검증을 추가했다. 최종 사용자 명칭 정리 후 요약/기록 표시 26건도 별도 통과했다.
- Backend 단위 **453/453**, 관련 PostgreSQL 통합 **180/180**(세션 163, 평가 이력 17). 미완료 감량 권고가 공식 자격/기준 기록/최초 평가를 바꾸지 않고 읽기만 수행함을 확인했다.
- 별도 tmpfs DB·전용 계정·Production 빌드 실제 API **14개 검증 그룹 통과**. 시작/진행/오류 재시도/승인/세트 편집/메모/유산소/FINISH 중복 방지/기록 정정과 함께, 증량/하한 감량/미완료 감량·기여 색상·기준 중량·메뉴 외부/ESC·공식 평가 이력·실제 로컬 누락 수행 복구 및 중복 복구 차단을 검증했다.
- 정정의 잘못된 입력은 서버 저장 없이 유지되며 올바르게 수정한 뒤 이전 오류가 해제되고 실제 저장됨을 확인했다.
- 320·393·1280px에서 전체 가로 넘침, 긴 운동명/수치 독립 영역, 동일한 글자 크기·두께·nowrap, h4/목표 행 간격과 강조 색상을 DOM으로 확인했다. 긴 이름의 격리 컴포넌트와 실제 API 표본을 구분해 사용했다. 결과 PNG를 직접 열어 확인했다.
- Lint 통과(경고 0), 별도 TypeScript 검사와 Production Build 통과. 기존 500kB 청크 경고는 유지한다.
- 현재 검토 환경에서도 새 전용 브라우저로 실제 로그인/프록시/assessment DTO를 읽기 전용 검증했다. 기존 진행 세션에 쓰기 요청 0건이다. 증거는 Git 제외 integrated-current-checks.json 및 logs/workout-api/에 있다.

### 검토 환경 유지와 미검증

확인 시 기존 Frontend/Backend PID가 종료되어 4173/2251에 리스너가 없었고 DB/미디어만 살아 있었다. 종료 PID·비어 있는 포트·격리 볼륨/라벨을 확인한 뒤 **DB·인증키·포트·진행 세션을 그대로 사용하여** Frontend PID28184 / Backend PID105916으로 복구했다. 4173·2251·격리 PostgreSQL1789·미디어4181을 유지한다.

PC: http://127.0.0.1:4173/
iPhone LAN: http://192.168.0.3:4173/

일회용 API 검증 프로세스/Chrome/tmpfs 컨테이너는 정리했다. 사용자 검토 환경은 종료하지 않았다. 최종 실행 runId와 정리 근거는 logs/workout-api/feedback-isolated-cleanup.json에 있다. 개인/보존 DB·원본 백업·실제 사용자 브라우저 IndexedDB는 변경하지 않았다.

**실제 iPhone Safari는 에이전트 미검증**이다. Chrome의 320·393px 검증을 실기기 승인으로 표시하지 않는다. LAN HTTP의 secure context/Web Locks 편집 제한은 유지한다. 사용자 최종 승인을 기다리며 커밋·Push·운영 배포·검토 서버 종료·문서 최종 마감을 하지 않았다.

## 최종 마감 — 2026-11-13

사용자가 현재 구현 상태를 확인하고 코드 마감을 요청한 뒤, 별도로 전체 문서 동기화와 문서 커밋을 요청했다. 위의 재검수 대기·서버 유지·커밋 전 문장은 각 검수 당시 기록이며 현재 상태는 이 절을 따른다.

| 단계 | 결과 |
|---|---|
| React UI 1차 | 사용자 실제 iPhone Safari 정상 작동 확인·명시 승인. 기준 커밋 e2965d8. |
| 일반 운동 실제 API·피드백 | 루틴/진행/복원/세트·중량/휴식/종목 편집/유산소/종료·기록/정정·복구/권고 연결 완료. 승인 UI와 메모 키보드 충돌 수정 유지. |
| Frontend 코드 | 15a0f6bee4421f799cd691fa435bc8103c1e28e2 · feat(workout): integrate live workout APIs and refine workout UI ·49개 코드/테스트/스크립트 파일. |
| Backend 코드 | a56103e39e9821657da3ef98b047f3ce136116c8 · feat(workout): support workout review and record assessment ·13개 구현/테스트/실행형 시드 파일. |
| 당시 검증 | 2026-11-13 구현 검증 보고: Frontend585/585, Backend 단위453/453, PostgreSQL 통합180/180, 실제 API14개 그룹, Lint·TypeScript·Production Build 통과. 아래 코드 커밋 단계 및 이번 문서 단계에서 재실행하지 않았다. |
| 문서 동기화 | 2026-11-13 기존 HTML·Decision Log·Theme·UI/UX·FRONT/BACK 현황·API/DB/카탈로그·Task·환경 기록을 현행 구현에 맞춤. 문서 전용 로컬 커밋을 코드 커밋과 분리한다. |

### 서버와 데이터 보존

2026-11-13 15:16 KST에 runId 93028565-a41d-401a-8551-e74af9450991 검토 환경을 종료했다. Frontend28184는 명령/리스너 소유권 재확인 후 종료, Backend105916은 전용 stop marker로 정상 종료했다. 전용 DB·미디어 컨테이너를 정지하고4173/2251/1789/4181의 리스너 해제를 확인했다. DB named volume·백업·공유 read-only GIF 원본·개인/보존 환경은 보존했고 컨테이너/볼륨 제거·재시드는 하지 않았다. 현재 검토 링크는 실행 중인 주소가 아니다. 상세 운영 근거는 Git 제외 종료 기록에만 보관한다. 이번 문서 작업에서 서버를 재시작하지 않았다.

### 후속 경계

- 메모 서버 저장은 미구현이다. 해당 기기·세션의 IndexedDB 상태만 보관하며 API·DB 계약과 서버 revision에 포함하지 않는다.
- 디로딩 전용 G6·혼재 세션, HTTPS/운영·설치형 PWA 검증은 별도다. Web Locks/secure context 편집 제한을 우회하지 않는다.
- UI 1차의 사용자 iPhone 승인은 유지한다. API 연동 후 native 키보드/✓ 보조 영역·관성·Safari 툴바·회전·Done blur 및 설치형 PWA는 에이전트가 직접 검증하지 않았다. Chrome320/393px 및 모의 VisualViewport 검증을 실기기 검증으로 표시하지 않는다.
- 메모 저장 단위/장비 문맥·모델 계약은 후속 정책 확정 대상이다. 아이소래터럴 등 모델 특성은 이번 표준화에서 제외했다.
- 코드 커밋 당시와 이번 문서 작업은 추가 기능/DB 변경/Push/배포를 하지 않았다. 일반 운동 단계 완료는 전체 제품 출시 준비 완료를 뜻하지 않는다.

### 이번 문서 전용 검증

기존 HTML의50개 화면 메뉴 전환·설명 패널,320/393px 및 PC 폭, 홈 시작/준비운동/세트 휠/중량 적용·취소/휴식·수동 종료/완료 취소/순서 초안·확정/종목 검색·추가/메모 포커스·복원/유산소 단계/종료/기록 정정 오류·복구 중복 차단을 file:// 임시 Chrome에서 점검했다. JavaScript 파싱·런타임 오류와 HTTP/API 요청은0건이다. 무채색 스타일·기존 화면 ID를 유지하고 실제 API/IndexedDB나 검토 서버를 실행하지 않았다. Chrome 창 포커스 에뮬레이션은 문서 포커스 동작용이며 실제 iPhone 키보드 검증이 아니다. 최종 캡처/검증 산출물은 Git 제외 logs/workout-doc-sync에 보관하고 임시 Chrome은 종료한다. 제품 전체 테스트·Lint·타입 검사·빌드를 다시 실행한 결과가 아니다.

### 문서 동기화 대상

아래24개 문서만 이번 문서 커밋 대상으로 선정했다. 구현 소스·Migration·실행형 시드·비밀 설정·임시 점검 산출물은 제외했다.

| 저장소 | 경로 | 반영 내용 |
|---|---|---|
| overload-pwa | [docs/engineering/backend-ui-v0.9.md](../engineering/backend-ui-v0.9.md) | 일반 운동 소비 완료와 G6 경계 |
| overload-pwa | [docs/engineering/frontend.md](../engineering/frontend.md) | 현행 상태·컴포넌트·저장/복원·Viewport |
| overload-pwa | [docs/product/Overload_UI_Baseline_Wireframe_v0.9.html](../product/Overload_UI_Baseline_Wireframe_v0.9.html) | 기존 무채색 운동/기록 화면과 시연 |
| overload-pwa | [docs/product/Overload_UI_Decision_Log_v0.9.md](../product/Overload_UI_Decision_Log_v0.9.md) | 10.20 최신 결정과 과거 이력 구분 |
| overload-pwa | [docs/product/Overload_UI_Visual_Theme_Spec_v0.9.md](../product/Overload_UI_Visual_Theme_Spec_v0.9.md) | 실제 토큰·권고색·글자/메뉴/하단 위계 |
| overload-pwa | [docs/product/assets/exercise-icons/README.md](../product/assets/exercise-icons/README.md) | 공통 검색 원본32px 아이콘 |
| overload-pwa | [docs/product/requirements.md](../product/requirements.md) | 초기 로드맵/메모 목표와 현재 구현 구분 |
| overload-pwa | [docs/product/ui-ux.md](../product/ui-ux.md) | 운동·요약·기록의 현재 사용자 흐름 |
| overload-pwa | [docs/tasks/ui-v09-workout-review.md](../tasks/ui-v09-workout-review.md) | UI 승인 이후 실제 API 단계 참조 |
| overload-pwa | [docs/tasks/ui-v09-workout-api-integration.md](../tasks/ui-v09-workout-api-integration.md) | 개발/검수/검증/코드 커밋/종료·문서 마감 |
| overload-server | [docs/api/approved-weight-growth.md](../../../overload-server/docs/api/approved-weight-growth.md) | 화면 권고와 공식 승인 성장 사건 구분 |
| overload-server | [docs/api/routine-management.md](../../../overload-server/docs/api/routine-management.md) | 루틴 출처와 세션 변경 분리 |
| overload-server | [docs/api/standard-exercise-catalog.md](../../../overload-server/docs/api/standard-exercise-catalog.md) | 공개/선택·표준 운동/장비 독립 |
| overload-server | [docs/api/workout-online-write.md](../../../overload-server/docs/api/workout-online-write.md) | 휴식 설정·기본 알림과 서버 설정 경계 |
| overload-server | [docs/api/workout-sessions.md](../../../overload-server/docs/api/workout-sessions.md) | 잠정/공식/weightReview·필수 nullable DTO |
| overload-server | [docs/database/erd.md](../../../overload-server/docs/database/erd.md) | V35 관계 유지·계산 DTO는 테이블 아님 |
| overload-server | [docs/database/schema.md](../../../overload-server/docs/database/schema.md) | 표준/제조사·기록 관계·메모 컬럼 없음 |
| overload-server | [docs/dev-data/overload-31-catalog/README.md](../../../overload-server/docs/dev-data/overload-31-catalog/README.md) | 원본31개/현행30종 시드·보존 |
| overload-server | [docs/engineering/backend.md](../../../overload-server/docs/engineering/backend.md) | 구현 현황·평가/기록 연결 마감 |
| overload-server | [docs/engineering/standard-exercise-handoff.md](../../../overload-server/docs/engineering/standard-exercise-handoff.md) | 숄더 프레스 표준화·제조사/모델 경계 |
| overload-server | [docs/engineering/test-environment.md](../../../overload-server/docs/engineering/test-environment.md) | 검토 서버 종료·영구 볼륨/백업 보존 |
| overload-server | [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md) | 공식 자격 유지·사용자 권고 분리 |
| overload-server | [docs/tasks/task-009-final-integration-report.md](../../../overload-server/docs/tasks/task-009-final-integration-report.md) | 과거 검증과 후속 구현 마감 참조 |
| overload-server | [docs/tasks/task-009-redesign-v1.0.md](../../../overload-server/docs/tasks/task-009-redesign-v1.0.md) | 기존 보호 정책과 후속 현재 계약 참조 |
