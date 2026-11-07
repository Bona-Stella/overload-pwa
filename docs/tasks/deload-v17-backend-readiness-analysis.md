# 디로딩 v1.7 정책 통합·Backend 구현 현황 분석

2026-11-07 (Asia/Seoul). 기능 개발이 아닌 소스·계약·테스트·보존 환경의 현황 분석이다. G0~G3 기반은 구현되어 있지만 **G4 분석 엔진·G5 실제 디로딩 실행 엔진은 미구현**이다. 재사용 가능한 일반 기능을 실제 디로딩 구현으로 계산하지 않는다. 최초 분석은 Backend를 읽기 전용으로 조사했다. 이후 사용자 요청에 따른 이번 정정은 양쪽 활성 문서에만 반영하며 검증 후 독립 문서 커밋한다. 기능 소스·migration·DB는 변경하지 않는다.

## 1. 기준·Git 체크포인트·조사 범위

| 대상 | 확인한 기준 |
|---|---|
| PWA UI 구현 | `85ec10f50e595467622f1f562c1430e1896baf24` |
| 이번 1단계 UI 문서 커밋 | **`6b13ff8167ebed4ebf575032837fc4666173c4f6`** / `docs: synchronize T02-B UI specifications and wireframe` |
| Backend | `2d37f8b7ce0445d5246ba47e8a37dac227372cdc` |
| 양쪽 브랜치 | `feature/weekly-schedule-daily-review-t02b` |
| 현행 디로딩 정책 | [v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md) |
| 보존 정책 원본 | [v1.6](../product/Overload_Deloading_Design_Specification_v1.6.md), Backend의 [v1.3](../../../overload-server/docs/product/Overload_Deloading_Design_Specification_v1.3.md) 및 이전 버전 |
| 일반 통계 정책 | [통계·추적 v1.4](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md), 특히 ST-12/15/17~23 및14절 |
| 설계·단계 기록 | [최종 구현 계획](../../../overload-server/docs/tasks/weekly-schedule-immediate-implementation-plan.md), [G0~G1 보고서](../../../overload-server/docs/tasks/weekly-schedule-g0-g1-report.md), [초기 통계·디로딩 조사](../../../overload-server/docs/tasks/statistics-deload-phase-0-1-report.md) |
| UI·PWA | [Decision Log](../product/Overload_UI_Decision_Log_v0.9.md)10.12/10.14 및 디로딩 정정10.15, [현재 HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html), [Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md), [Frontend8.7절](../engineering/frontend.md#87-v09-적용-범위와-구현-상태) |
| 엔지니어링·원본 보호 | 양쪽 AGENTS.md, [Backend 규칙](../../../overload-server/docs/engineering/backend.md), [Task009 v1.0](../../../overload-server/docs/tasks/task-009-redesign-v1.0.md), [세션 계약](../../../overload-server/docs/api/workout-sessions.md) |

이전 보고서의 당시 예약/미구현/테스트 합계를 현재 구현으로 복사하지 않았다. 현재 Java·SQL·DTO·테스트 소스와 로컬 JUnit XML을 직접 대조했다. 새 패키지·migration·기능 코드는 만들지 않았고 실제 미수행 작업을 호출하지 않았다.

### 1.1 UI 보존본 공백의 좁은 예외

1단계의 12개 staged 파일만 커밋했다. 수정 전 `85ec10f:docs/product/Overload_UI_Baseline_Wireframe_v0.9.html`, 새 보존본의 인덱스 blob, 필터 없는 파일 blob은 모두 **`f42a8e1835723972a89c9b57098e74b22a03111f`**다. 정규화 비교만이 아니라 Git blob/실제 파일 바이트가 일치했다.

원래 `git diff --cached --check`의 오류는 보존본365행 `trailing whitespace` **정확히1건**이었다. 원본은 수정하지 않았다. 다른 파일은 다음과 같이 정상 검사했고 exit0이었다.

```text
git diff --cached --check -- . :(exclude)docs/product/Overload_UI_Baseline_Wireframe_v0.9_before_T02B_2026-11-07.html
```

해당 pathspec 인수는 실제 실행에서 별도 인수로 전달했다. 전역/로컬 Git whitespace 설정·hook·다른 파일 예외를 추가하지 않았다. 12개 문서 외 소스·로그·캡처·백업·환경/인증 파일은 포함하지 않았고 commit 직후 PWA는 clean이었다. push·amend·rebase·reset은 수행하지 않았다.

## 2. 정책 통합 결과

상세 DL 식별자별 추적은 v1.7의15절이 단일 기준이다. 기존 **DL-01~90 전부**를 유지했고 감량·편성 규칙의 숫자를 임의로 재작성하지 않았다.

| 항목 | 유지·수정·폐기 |
|---|---|
| 철학·표시 | 직접 피로도 측정이 아닌 실제 일반 수행 기반의 간접 훈련 주기. 목표8주·비강제·완전휴식 유지. 주중 가산 없이 마지막 확정 게이지 표시 |
| 분석 ON/OFF | OFF는 디로딩 분석만 중단. 일반 기록·G3·통계 유지. 재ON은 새 epoch/0, 진행 기간은 토글과 독립 |
| 하루 값 | InitialPlan 종목 완료 기준 유지, 추가종목 제외·최고 단일 세션 유지. 예정 외/휴식일의 일반 세션도 자기 InitialPlan으로 평가하도록 후보 확대 |
| 주간 값 | 계획일 분모 폐기. 실제/확정MISS의 distinct 날짜 N·유효값 E. E≤1 RESET, E>1 min(1,E/N) ADD. 다음 월04시/일별 검사 완료 뒤 확정 |
| 일정·과거 | 다음 월요일 예약 폐기·즉시 적용. 현재 템플릿 변경으로 과거를 재분류하지 않음. 늦은 원본 정정에 따른 파생 재평가는 별개 |
| RESET·epoch | 주간 RESET은 가역 파생값, 재ON·정상/자동완료는 hard 경계. 정정 시 영향 주 이후 같은 epoch를 순서대로 다시 계산 |
| 시작 자격 | 계획≥2일 조건 폐기. 최근7일 실제 일반 수행/이전 완료 이후 새 수행/오늘 수행 없음/ACTIVE 일반 세션 없음의4조건 |
| 기간 | 권장7·최대10·7일 자동종료 없음·10일차 종료 자동완료·언제든 직접완료·완료 다음날 복귀 유지. 실제 수행이 한 번도 없을 때만 취소·누적 보존 |
| 편성·감량 | 원본 빈도 초과 압축 금지, PPL/전후면/균등, PRIMARY·원순서 메인·다관절 정렬·커버·상한·라운드로빈, 중량85%·세트50%·홀수 반복·유산소 감량/배치 등 유지 |
| 기록·권한 | 실제 디로딩 운동량/이력 포함, 일반 승인·증감 평가 제외. 기간 소속·최초 계획·원승인·오프라인 원본 보호·일반 보기 읽기 전용 유지 |

ST-17~23의 일반 계획 이행률과 디로딩 후보는 분리한다. PUSH 예정일에 PULL을 전부 수행하면 일반 PUSH 달성률은0이지만 디로딩은 PULL 자기 InitialPlan으로1이다. 같은 날짜 최초 MISS와 실제 수행을 N2로 세지 않는다. UNKNOWN은 실패0으로 바꾸지 않는다.

## 3. 실제 Backend 구조와 구현 판정

Java25/Spring Boot4.1.2, Spring Data JPA+JdbcTemplate, 동일 `workoutTransactionManager`, PostgreSQL/Flyway, JUnit/Testcontainers 구조다. HTTP 인증·CSRF·principal·소유권·dataGeneration 경계는 기존 계약을 사용한다. 일정·통계·세션은 기능별 패키지이고 디로딩 전용 패키지는 없다.

```mermaid
flowchart TD
  Schedule[즉시 배정·시각 이력 G2] --> Start[START 출처·InitialPlan G1/G3]
  Start --> Facts[기존 실제 세트·유산소·정정·복구]
  Schedule --> Daily[날짜 근거·MISS·dirty G3]
  Facts --> Daily
  Facts --> Judge[InitialPlan 종목 판정 기반]
  Daily --> General[현재 일반 계획 통계]
  Judge --> General
  Judge -. 재사용 예정 .-> Analysis[미구현 G4: 독립 후보·epoch·주별 E/N]
  Daily -. 근거 재사용 예정 .-> Analysis
  Period[미구현 G5: 기간·임시 계획·세션 소속] -. 정지·복귀 경계 .-> Analysis
  Analysis -. 실제 API 후속 .-> PWA[G6 실제 게이지·기간 UI]
```

| 영역 | 판정 | 실제 근거·한계 |
|---|---|---|
| G0 현재 계약 | 구현 및 테스트 확인 | `WeeklyScheduleRequests`/DTO/Controller, Routine·세션·통계 계약 존재. immediate-v1 전환 마커·형식·세대/version·CSRF 등. G4/G5 DTO·DDL까지 확정됐다는 뜻은 아님 |
| G1 START/관리 경합 | 구현 및 테스트 확인 | START·관리 쓰기 owner FOR UPDATE/READ_COMMITTED, 실제 원본 구성/삭제·일정 변경409. 승인·이름/태그·no-op·운동 내부 쓰기는 별도 유지 |
| G2 즉시 일정·이력 | 구현 및 테스트 확인 | version/appliedAt/assignments, V24 경계·recorded_at/동일 시각version정렬, 역행 거부·삭제의 즉시 배정 제외·이력 보존 |
| G3 일별 판정 | 구현 및 테스트 확인 | 04시 due·최초 START/MISS 근거·PERFORMED/MISSED/PENDING_ACTIVE/UNKNOWN/EMPTY·dirty/retry/cursor·분할 배치·재시작/동시성 |
| G4 분석 설정/epoch | **미구현·문서만 존재** | UserWorkoutSettings는 휴식초뿐. 분석 토글/활성구간/epoch 저장·API 없음 |
| G4 독립 후보/주간 E/N | **미구현**, 종목 판정·날짜 근거 재사용 가능 | 현재 PlanningCalculator는 예정 루틴만. 주별ADD/RESET·월04시 publication·revision/누적재계산 저장·API 없음 |
| G5 기간/임시 루틴/자격/종료 | **미구현**, 공통 카탈로그/세션/동기화 재사용 가능 | 기간·임시 계획·소속·권한·감량/편성·4조건 자격·10일 완료·취소 수행사실 없음 |
| G6 분석/기간 PWA | **표현 기반 일부 구현**, 실제 연동 미구현 | 공식 달·Onyx/Mint 토큰·개발용 헤더 시안은 있음. 실제 분석/기간 API·디로딩 START·임시 일정·완료/취소 연결 없음 |

`src/main`·`src/test` 전체에서 deload/epoch/period 계열 책임을 검색했다. deload 언급은 성장 Repository의 “향후 디로딩이 일반 승인 사건을 만들면 안 됨” 주석뿐이었다. 최신 migration은 V24이며 디로딩 저장소가 없는 것과 실제 DB 적용 여부를 별도로 확인했다.

### 3.1 코드·DB 모델·주요 함수 근거

아래 Java 기본 위치는 `overload-server/src/main/java/com/overload/overload_server`다.

| 파일/주요 함수 | 확인한 실제 책임 | G4/G5에 대한 재사용·부족 |
|---|---|---|
| [WorkoutSessionService](../../../overload-server/src/main/java/com/overload/overload_server/workoutsession/WorkoutSessionService.java) `start`, [Repository](../../../overload-server/src/main/java/com/overload/overload_server/workoutsession/WorkoutSessionRepository.java) `lockOwnerForStart` | owner 잠금 후 최신 원본 복사, 같은 UUID START 재확인, `calendars.origin/recordStart`, 기존 단일ACTIVE/만료 처리 | 새 디로딩 시작·일반 START 차단을 같은 경합 경계에 넣어야 함. 아직 기간/세션 유형 검사 없음 |
| [RoutineService](../../../overload-server/src/main/java/com/overload/overload_server/routine/RoutineService.java) `update` 구성 비교, [RoutineRepository](../../../overload-server/src/main/java/com/overload/overload_server/routine/RoutineRepository.java) `requireEditableSource` | ACTIVE 원본의 실질 변경만 차단. 승인/메타/no-op 분리. 삭제·이력 쓰기 원자 처리 | G5의 ACTIVE 기간 중복 생성 차단은 네 운동 자격과 별도 상태 제약이다. 기간 중 일반 보기 read-only는 더 넓은 정책이며 현재 ACTIVE guard로 대체 불가 |
| [WeeklyScheduleService](../../../overload-server/src/main/java/com/overload/overload_server/routine/WeeklyScheduleService.java) `save/view/history`, [Requests](../../../overload-server/src/main/java/com/overload/overload_server/routine/WeeklyScheduleRequests.java) | 현재 배정 즉시 저장, expectedVersion·세대/시간대·ACTIVE·no-op, 저장 후 scope DTO, history20개 | 디로딩 임시 일정은 일반 배정을 덮지 않고 독립 기간에 연결해야 함 |
| [RoutinePlanHistory](../../../overload-server/src/main/java/com/overload/overload_server/routine/RoutinePlanHistory.java) `record/removeFromSchedule` | 버전별 불변 계획·시각 검증·삭제시 즉시 새배정, owner 잠금 참여 | 과거 판정/편성 출처 재사용. 과거 근거를 현재 루틴으로 교체하지 않음 |
| [WorkoutCalendarRepository](../../../overload-server/src/main/java/com/overload/overload_server/routine/WorkoutCalendarRepository.java) `control/origin/recordStart` | 경계 version·시간대·reviewFrom/cursor와 START 당시 일정 출처·첫 예정 START 고정 | 검사 메타데이터이며 분석 설정/epoch 아님. 미등록 계정은 control이 없을 수 있음 |
| [V24 SQL](../../../overload-server/src/main/resources/db/migration/V24__immediate_weekly_schedule_and_daily_review.sql) | 일정 월요일제약 제거·범위index·최신 저장 의도 승격, nullable 불변 schedule_version_at_start, daily 테이블·dirty trigger | 신규 디로딩 테이블/열 없음. 기존 migration 수정·재실행 없이 후속 DDL 설계 |
| [DailyTrainingReviewService](../../../overload-server/src/main/java/com/overload/overload_server/statistics/DailyTrainingReviewService.java) `dueDate/reviewBatch/review`, [Job](../../../overload-server/src/main/java/com/overload/overload_server/statistics/DailyTrainingReviewJob.java) | 기본60초/20owner/31일창, owner SKIP LOCKED, 04시·dirty/10분retry·cursor, 무수행 휴식 영구REST행 안 만듦 | 같은 job의 주별 호출 확장 가능. 현재 주별 확정·epoch·기간정지 검사는 없음 |
| [PlanningRepository](../../../overload-server/src/main/java/com/overload/overload_server/statistics/PlanningRepository.java) `read` | 구 effective_from/신 recorded_at 경계와 frozen START/MISS·루틴 버전·ACTIVE/dirty 조회 | UI history20개와 분리된 판정 SQL 재사용. 일반 예정 근거와 디로딩 후보 근거의 UNKNOWN은 별도 판단 |
| [PlanningCalculator](../../../overload-server/src/main/java/com/overload/overload_server/statistics/PlanningCalculator.java) `calculate/firstStart/judge/Fraction` | 예정 루틴만 후보·각자 InitialPlan·최고 단일·정확분수·미확인 유산소 하한/상한 | `judge`/Candidate는 private이며 G4 소비가 생길 때 작은 공유 함수로 추출/노출. `calculate` 결과 effectiveDay를 디로딩 값으로 복사하면 안 됨 |
| [StatisticsRepository](../../../overload-server/src/main/java/com/overload/overload_server/statistics/StatisticsRepository.java) `read`, [Service](../../../overload-server/src/main/java/com/overload/overload_server/statistics/StatisticsService.java) `overview` | 종료·미삭제 세션, 유효 실제 세트/COMPLETED 유산소, immutable 날짜, 일반 계획일 분모/통계 집계 | 수행 사실·세트/유산소 조회 재사용. ACTIVE를 제외하고 기간/일반 유형 필터는 아직 없음 |
| [WorkoutSession](../../../overload-server/src/main/java/com/overload/overload_server/workoutsession/WorkoutSession.java), [InitialPlan](../../../overload-server/src/main/java/com/overload/overload_server/workoutsession/InitialPlan.java) | sourceRoutineId 필수, schema2 최초 JSON·시작날짜/시간대·소유권·writerEpoch | deloadPeriodId/일반·디로딩 소속 필드 없음. 임시 원본의 저장/START 계약을 실제로 설계해야 함 |
| [SnapshotService](../../../overload-server/src/main/java/com/overload/overload_server/workoutsession/WorkoutSnapshotService.java) `save/applySnapshot/finish/resolve/resolveClosed`, [RecordService](../../../overload-server/src/main/java/com/overload/overload_server/workoutsession/WorkoutRecordService.java) `edit/recover/assessment`, [WorkoutAssessment](../../../overload-server/src/main/java/com/overload/overload_server/workoutsession/WorkoutAssessment.java) | 고정 요청/hash·ACK·종료 최초평가·현재평가·승인해결·정정·논리삭제·명시복구 | 일반 승인평가를 디로딩에 연결하지 않도록 모든 쓰기/사후 경로에 불변 소속 검사 필요. 기존 승인 평가 eligible은 InitialPlan 종목 완료와 다름 |
| [StandardExercise](../../../overload-server/src/main/java/com/overload/overload_server/catalog/StandardExercise.java), V18/V23·카탈로그 Repository | jointType COMPOUND/ISOLATION/OTHER, null 미분류; PRIMARY/SECONDARY·카디오 카탈로그·장비/중량 데이터 존재 | 자동 분할/대표 선정/감량 엔진은 없음. 분류 컬럼 존재가 운영 분류품질 완료를 뜻하지 않음 |
| [UserWorkoutSettings](../../../overload-server/src/main/java/com/overload/overload_server/workoutsettings/UserWorkoutSettings.java) | rest_low/medium/high_seconds와 버전 | 분석/epoch/cursor를 휴식 설정에 섞을 근거가 없음 |

### 3.2 G3와 G4의 중요한 차이

G3 PERFORMED는 “실제 수행 있음”이다. 최초 계획 종목을 하나도 완성하지 못한1세트도 PERFORMED이며 날짜의 유효값은0일 수 있다. PERFORMED를1로 변환하면 안 된다. REST인 날짜의 실제 수행도 G3는 보존하지만 현재 일반 overview의 effectiveDay는0이다. 이것을 G4가 그대로 쓰면 휴식일 후보를 놓친다.

V24 source trigger는 실제 세트·유산소·상태/논리삭제 변화와 같은 transaction에서 revision을 늘리고 dirty를 켠다. GET·고정 ACK/no-op에는 새 사실을 만들지 않는다. G4는 이 입력 revision/dirty를 이용해 주 평가를 깨워야 하며 별도의 동일 목적 일별 데이터/Outbox/feed를 추가하지 않는다. 현재 Job에는 G4 호출이 없으므로 이 재사용 가능성을 “주별 재평가 구현됨”으로 보고하지 않는다.

현재 `judge`는 실제 속도와 시간/거리 목표를 비교하고, 목표 경사/저항이나 필요한 측정 근거가 없으면 UNKNOWN을 보존한다. G4가 이를 임의 완료로 바꾸지 않는다. `Fraction.decimal()`의12자리 반올림은 표시용이며 E≤1 판정·후속 누적의 입력값으로 재사용하지 않는다.

현재 G3 Job의 owner 탐색은 `workout_calendar_control`을 기준으로 한다. 반복 일정 미등록/계획0인 계정의 실제 일반 운동도 G4 후보이므로 분석 활성 계정을 기존 control 유무만으로 누락시키지 않는 탐색·시간대 계약이 필요하다. 이를 위해 가짜 휴식 일정을 등록하지 않는다.

## 4. API 준비 상태

| 소비 책임 | 실제 존재 | 부족한 계약 |
|---|---|---|
| 일반 루틴/일정·통계 | `/api/v1/routines`, `/api/v1/weekly-schedule`, `/api/v1/statistics/overview` 및 이력/성장·카탈로그 | G4 주간 E/N·분석epoch·누적을 일반 계획 달성률로 대체 불가 |
| 분석 ON/OFF·실제 게이지 | 없음 | 실제 활성구간/epoch·expectedVersion·상태/미확정·마지막 확정값·8주 도달 조회/저장 |
| 시작 자격 | 없음 |4조건별 허용/차단 이유와 최종 재검증, 기준 시각/시간대·현재 세대·ACTIVE/알려진 로컬 원본 |
| 미리보기/시작 | 없음 | 원본 버전·선택 횟수/분할/요일·감량 대비·미리보기와 확정 사이 변경 거부·중복 시작 방지 |
| 기간/임시 계획/일정 | 없음 | 기간 version·임시 계획 소속·미수행 수정/교환/삭제·일반 read-only 정책 |
| 완료/취소/자동 종료 | 없음 | 종료 시각·사유·10일 경계·누적reset/preserve·ever-performed·ACTIVE/지연동기화 원자성 |

설정 이력이 없는 신규 계정의 최초 기본ON/OFF는 확정 근거가 없는 **제품 결정**이며 G4 전에 정해야 한다. HTML 초기ON/개발 시안은 근거가 아니다. 경로·DTO·오류 enum은 아직 미확정인 기술 계약이며 예시 endpoint를 실제 계약으로 선언하지 않는다. 기존 AuthApi/WorkoutTransport·쿠키/CSRF·code-only 오류·scope/version·no-store를 재사용할 수 있다. 새 API가 필요하다는 정책과 실제 breaking 변경/DB 적용 승인은 구분한다.

PWA [HomePanel](../../src/features/home/HomePanel.tsx)은 일반 계정에서 분석 미연동 아이콘을 표시한다. [HomeReviewContext](../../src/review/context.ts)·[ReviewHeader](../../src/review/ReviewHeader.tsx)의5.2주는 개발 표시이며 서버 상태·권한·통계/IndexedDB에 저장되지 않는다. 실제 게이지·분석 토글·기간 UI는 G4/G5 API 이후 별도 G6 작업이다.

## 5. G4 개발 범위·의존성·검증 계획

기존 C+A 최소 확장 방향을 유지한다. 아래 이름은 기존 계획의 **책임 후보**이며 지금 생성한 테이블/서비스가 아니다.

| 작업 | 대상·재사용 | 완료 근거·핵심 검증 |
|---|---|---|
| M2 계약/저장 | 분석 ON/OFF·경계용 `deload_analysis_versions`, 주별 `deload_weekly_assessments` 최소2책임. user/세대·시간대·version·epoch·ruleVersion/입력revision·확정/보류/E/N/ADD·RESET | 최초 설정/재ON·주중 경계·OFF의 일반G3/통계 지속. 설정 이력과 별도 current 설정/epoch/현재누적 표를 중복 생성하지 않음 |
| 단일 세션 완료 판정 공유 | PlanningCalculator의 private judge/Fraction를 실제 소비가 생길 때 최소 추출; 실제 세트/유산소 원본 조회 재사용 | InitialPlan 세트전부/유산소 목표, 추가종목 제외, 서로 다른 반쪽 합산금지, 실제부분0·UNKNOWN과missing구분 |
| 독립 후보·E/N | 일반 ST-17~23 유지, 일반 세션 유형/epoch 구간·자기InitialPlan·workoutDate 최고단일; G3 confirmedMISS와 날짜집합 합집합 | 예정A 대신B,휴식일,계획0/1일,동일날 MISS+실제N1,START만/삭제/유효실제없음 처리 |
| 주간 확정 | 기존 DailyTrainingReviewJob→일별검사 완료→주간 평가 호출. 새 중복 자정/월요일 scheduler 없음 | 월03:59:59 미가산·04시 gate, 일요일ACTIVE/UNKNOWN보류,다중worker/재시작/31일catch-up/실패재시도·중복가산없음 |
| 정정·재평가 | 기존 source trigger/dirty/revision에 주별 invalidation 연결, 같은epoch의 가장 이른 영향 주 이후 순서 folding | RESET→0.75ADD 뒤4.75복원, 새hardepoch오염없음,동일주 반복/idempotence,원본/최초MISS불변 |
| 조회 | 마지막 확정값·현재 재계산 상태·8주 도달·버전/시각을 명확히 반환. 정확 유리수 계산 후 표시만 문자열 | 미확정0/설정OFF로위장금지·UI반올림으로E임계판정금지·권한/세대/CSRF/invalid값/네트워크 실패 |
| G5 정지·종료 연결 | 실제 기간 소속/정지·완료hardreset·취소보호 날짜를 후속 통합 | 기간 없이 분석만 구현한 단계에서 정지/완료/취소가 실제 동작한다고 노출하지 않음 |

일별 전체 계획·성과를 새 표에 복제하거나 매 실행 현재누적에 `+=`를 적용하지 않는다. 최소 주별 결과를 날짜순으로 계산하고 별도 projection/cache·이벤트 프레임워크는 실측 필요가 없으면 도입하지 않는다. 원래 source table의 JSON/hash/고정 요청을 재작성하는 migration은 계획하지 않는다.

인수 예: E0/1/1.5/2, [1]/[1,0]/[0.5,0.5] RESET,3/4=0.75·3.5/5=0.7·4/5=0.8,정상N0RESET/UNKNOWN보류/전체정지무적용,1.000000000001>1의 정확 비교,같은 주 재ON,OFF일반미수행 유지,완료주 잔여2일E2/N2=1·잔여1일RESET 등이다. 기존 분수 단위 테스트와 일별 격리 PostgreSQL fixture에 추가한다.

## 6. G5 개발 범위·의존성·검증 계획

| 작업 | 실제 남은 책임 | 재사용·검증 |
|---|---|---|
| 기간 저장 | `deload_periods` 후보의 실제 시작일/시간대·종료일/사유·상태/version·소유권/세대·ever-performed·원본참조·정지 경계 | 기존 owner 트랜잭션/잠금·DB제약 재사용. 분석ON/OFF와독립·중복기간/START경합·같은요청재확인 |
| 시작4조건 | 최근7달력날짜의 실제일반수행,이전완료이후새수행,오늘수행없음,ACTIVE일반없음 | 실세트1건/양의 실제유산소·START0제외.계획0/1/6일·OFF/게이지0 모두 동일조건,자정/시간대/미전송경계 |
| 원본·미리보기 | 현재 일반 일정/배정루틴/승인중량·카탈로그 참조를 고정하고 선택 방식/날짜·원본대비 제시 | 저장 원본을 자동수정하지 않음.미리보기와 시작 사이 루틴/일정version변경·자격변경 실패/초안유지 |
| 자동 편성 | DL-23~39·44~45·47~59/CHECK-08의 원본출처·PPL/전후면/균등·PRIMARY·메인·다관절·상한·유산소분배 | jointType/PRIMARY 존재 재사용,분류 추정금지.원본부위누락·다중PRIMARY·중복웨이트금지·유산소예외·상한/균등순서 검증 |
| 감량 | 승인중량 우선/최초중량85%,장비별내림/0kg방지,세트50%반올림최소1·홀수반복·유산소85%/50% | v1.6 숫자그대로.100PLATE→85,3×10→2×8,7.5km/h·35분→6.4·18분 등.장비미지정/소중량/경계 사례 |
| 임시 계획·일정 | 기간이 소유한 임시 계획/버전,미수행변경·삭제·날짜교환·8~10일이동,7일후신규자동생성금지 | 원본 루틴 CRUD/계획 자료구조를 재사용할 범위 확인.일반 목록에 임시계획을 섞거나 일반 assignments를 덮지 않음 |
| 세션 소속 | 일반/디로딩·기간/임시계획 출처를 START부터 권위 있게 고정. sourceRoutineId 필수 FK와 DTO 전환 설계 | 기존 InitialPlan/AppliedPlan·writerEpoch·단일ACTIVE·고정snapshot/ACK/FINISH/정정/명시복구 유지.뷰테마로분류금지 |
| 완료·취소 | 언제든완료·10일차종료자동완료·완료다음날일반복귀·정상/자동누적0; 실제수행한적없을때만취소/누적보존 | 실제수행 후논리삭제해도취소불가,완전휴식0회완료·기간이력,ACTIVE/미전송과날짜경합,취소정지주소급RESET금지 |
| 권한·평가·통계 | 기간 중 일반 원본/일반기록 read-only·일반START차단,공통설정유지; 디로딩일반승인/증감평가/성장사건금지 | RoutineService뿐 아니라snapshot승인/finish최초평가/사후현재평가/승인해결/정정/복구의 모든 진입점.실제운동량/근육통계 포함·기간별조회 분리 |
| G6 통합 | 실제 API가 준비된 뒤 샘플과 분리해 게이지/자격·미리보기/임시루틴/완료취소 연결 | iPhone/HTTPS/오프라인·타기기/계정세대·저장실패차단,원본·백업지문,별도적용승인 |

임시 계획의 구체적 저장 방식은 현재 routine FK/버전/소유권 제약과 비교해 최소 구조로 정해야 한다. 기간·임시계획·세션소속의 실제 책임을 분석 epoch 한 행으로 대체할 수 없다. 반대로 기능별로 무조건 새 표/서비스를 만들 필요도 없다. 아직 없는 자격·편성·기간 기능을 데모 응답으로 성공 처리하지 않는다.

## 7. 개발 착수 전 확정·검증할 기술 사항

확정된 E/N·후보·시작4조건을 다시 제품 질문으로 되돌리지 않는다. 신규 계정의 최초 분석 ON/OFF 기본값은 G4 설정 계약 전에 확정할 별도 제품 결정이다. 그 외 남은 실제 계약·기술 검증은 다음과 같다.

1. **구간과 시간대:** 분석 미설정/미등록계획 계정의 활성화 시각·고정 시간대,세션 시작시각과 epoch 포함,기간시작/종료의 날짜 경계. 기존 workoutDate를 새 시간대로 재작성하지 않는다.
2. **정확 수치/재평가:** 정확 유리수 저장/전송,주별 유일키·입력revision·보류/확정,현재epoch folding의조회비용·경합,dirty일별검사와주별확정 원자성. current-total 별도캐시는 기본안이 아니다.
3. **G4/G5 선행:** G4 순수분석은 기존 일반 세션 기반으로 개발 가능하나 실제 정지/완료/취소 효과의 배포는 G5 기간과 연결되어야 한다. 기간 없는 부분 배포를 전체완료로 표시하지 않는다.
4. **기존 편성의 미확정 세부값:** 평균 종목/세트 상한 정수화(CHECK-04),종목별 서로 다른 반복 범위의 홀수보정(CHECK-05),미분류PRIMARY/jointType(CHECK-06),BODYWEIGHT 추가부하와 속도 외 pace/거리/경사·저항 목표의감량은 기존 수치만으로 임의 공식화하지 않는다.일반 정책과 실제 카탈로그/측정 계약을 보며착수시기술계약으로확정한다.
5. **10일 경계와 ACTIVE/오프라인:** 자동완료와활성writer/늦은snapshot/FINISH가경합해도원본·소속·실제날짜유지.기존24시간AUTO_CLOSED는기간10일종료를대체하지않는다.기간을임의연장하거나미전송사실을버리는구현은금지하며원자적완료·허용쓰기경계를계약/격리테스트로명확히한다.
6. **최소 DDL/API:** M2/M3는논리단계명,다음Flyway번호는착수시확인한다.현재최신은V24이나이번에V25/V26을만들지않는다.분석/기간endpoint·DTO·오류·쓰기version·세션원본참조의breaking전환과클라이언트동시전환범위를검토한다.
7. **보존 DB 적용:** 실제대상/새백업·격리복원검증·기존세션/수행/승인/이력지문·재개순서·rollback을별도승인한다.개인DB·다른DB로적용범위를넓히지않는다.

## 8. 테스트 근거와 실행 범위

이번 문서 작업에서는 Gradle/npm 테스트·build·lint를 재실행하지 않았다. 기존 테스트 **소스와 JUnit XML을 읽어 확인**했다. 실행 당시의 격리 DB 검증을 현재 실제 검토 DB에 재실행하지 않았다.

| 현재 확인 가능한 실행 산출물 | 실제 결과·시각(UTC) |
|---|---|
| Backend `build/test-results/test` |29suite/323건,실패·오류·skip0,주요 suite2026-11-06T12:20대 |
| DailyTrainingReviewTests |2건/04시·DST경계,2026-11-06T12:20:23.927Z |
| PlanningCalculatorTests |9건/InitialPlan·최고단일·부분·미확인·계획근거,12:20:23.931Z |
| StatisticsCalculatorTests |8건/실제집계,12:20:23.947Z |
| 현재 남아 있는 integrationTest XML |2suite/169건=WorkoutSession147+Statistics22,실패·오류·skip0,12:20:27~12:21:09Z |
| 과거 전체665건 보고 |이전 실행에 대한 참고.현재 XML은2suite뿐이므로이번에665건을확인/실행했다고표시하지않음 |
| PWA548건/build/lint |이전코드검증기록이며이번실행아님.기능소스무변경 |

직접 확인한 핵심 테스트 소스:

- [DailyTrainingReviewTests](../../../overload-server/src/test/java/com/overload/overload_server/statistics/DailyTrainingReviewTests.java): `midnightDoesNotReplaceTheFourAmPublicationBoundary`, `storedTimeZoneDeterminesTheBoundaryAcrossDaylightSaving`.
- [PlanningCalculatorTests](../../../overload-server/src/test/java/com/overload/overload_server/statistics/PlanningCalculatorTests.java): `partialSetsAndAddedExercisesDoNotSatisfyInitialPlanEvenWhenAppliedPlanIsLowered`, `bestSingleSessionWinsWithoutCombiningDisjointHalfSessionsAndRestDayDoesNotFillPlan`, `cardioTimeAndDistanceUseInitialTargetsAndMissingActualIntensityRemainsUnverifiable` 등9건.
- [WorkoutSessionIntegrationTests](../../../overload-server/src/test/java/com/overload/overload_server/workoutsession/WorkoutSessionIntegrationTests.java): START-first/관리-first 경쟁,04시 전/후·다음날02시변경비소급,첫예정START불변,휴식행생성안함·실패rollback,ACTIVE보류/expiry후dirty,늦은부분수행/정정/삭제/복구,예정외/휴식일실제보존,UNKNOWN보류,저장시간정밀도·역행거부,실제job재시작catch-up. 각 assertion을 코드에서 확인했다.
- [StatisticsIntegrationTests](../../../overload-server/src/test/java/com/overload/overload_server/statistics/StatisticsIntegrationTests.java): `firstThursdayRegistrationStartsTodayAndEditsApplyImmediatelyWithoutChangingStartedPlans`, `routineDeletionImmediatelyRemovesAssignmentsWithoutErasingPastPlannedDays`, version/CSRF/세대·동시저장/no-op·이력페이지·원자rollback.
- [RoutineIntegrationTests](../../../overload-server/src/test/java/com/overload/overload_server/workout/RoutineIntegrationTests.java), [JpaJdbcCompatibilityIntegrationTests](../../../overload-server/src/test/java/com/overload/overload_server/persistence/JpaJdbcCompatibilityIntegrationTests.java): 관리 원본/승인·같은transaction 경계. 현재 전체실행 XML이 없어이번에최신실행성공을새로선언하지않는다.
- [PostgresMigrationTests](../../../overload-server/src/test/java/com/overload/overload_server/database/PostgresMigrationTests.java)의 `v24PromotesLatestIntentOnceAndNeverRewritesLegacyReservationRows`: 격리V23→V24,기존Flywaychecksum/구예약·세션JSON/hash불변·신규nullable출처·최신의도1회승격·재실행멱등성·이력불변을검증하는소스존재.현재integrationXML두suite에는이클래스가없으므로실행근거와분리한다.

G4/G5 기능 테스트 클래스·주별/기간 fixture·실제 디로딩 혼재 회귀는 없다. 기존 통계/승인 테스트가 통과했다는 사실만으로 디로딩 일반평가 제외나 기간정지가 검증됐다고 보지 않는다. 향후 추가/실행할 범위는5~7절에 기술했다.

## 9. 실제 DB·서버·백업 보존 확인

기존 영구 보존 라벨이 있는 `overload-home-review-b4972e78`의 컨테이너 ID/라벨·Running/AutoRemove=false·볼륨을 확인한 뒤 `psql`의 **BEGIN READ ONLY** 안에서 조회했다. 컨테이너 생성/시작/종료/볼륨변경·seed·Flyway실행·평가job호출·데이터수정은 없었다.

| 대상 | 이번 직접 확인 |
|---|---|
| 격리 홈·루틴 검토 DB | `overload_v22_isolated`,Flyway max success **V24**,deload 이름의테이블0 |
| 도메인 데이터 |루틴9/웨이트배치13/유산소배치6/루틴계획이력11/일정버전7/세션15/수행세트28/유산소결과1 |
| G3 검사 메타 |control1,reviewFrom2026-11-07,reviewedThrough2026-11-06,Asia/Seoul,daily행0 |
| 자동 검사 설정 |`application-integration.yaml`에서 review/expiry OFF. G3 실제운영job 코드와 검토환경설정은 별개 |
| 실제 개인DB |이번에 접속·migration·코드실행하지 않음. 과거 문서의개인DBV18~미적용표기를오늘실측결과로승격하지않음 |
| 백업 |기존 `.local-backups/`의dump4개SHA-256보존대조.자격/환경archive내용은문서에노출하지않음 |
| 소스·migration |양쪽추적중기능/테스트/설정/자산파일의SHA-256보존대조,새migration없음 |

API 문서의 “이번에는V24미적용”은 G2~G3 개발 당시 작업 제한이다. **현재 특정 격리 검토 DB는 이미V24**라는 직접 조회와 구분한다. 이번 요청에서 적용한 것이 아니며 다른 개인/운영DB의적용을추정하지않는다. 최초 분석 당시 Backend AGENTS의 통계v1.3/디로딩v1.6/예약 안내가 남아 있었다. 이번 정정에서 해당 활성 진입점을 통계v1.4·디로딩v1.7/즉시 적용으로 갱신했고 역사 원본은 보존했다.

활성 HTML의 계획2일 조건식을 제거하고 계획0/1일 통과·무활동 차단 사례를 정정했다. 현재 시연은 네 자격과 별도 중복 기간 차단을 따른다. 새 화면·CSS·T02-A/B 레이아웃은 만들거나 바꾸지 않는다. 과거 자격/예약 문구는 명시된 역사 이력에서만 보존한다. 시연은 실제 API 결과가 아니며 G6 서버 연결은 미구현이다.

## 10. 권장 착수 순서와 종료 상태

1. v1.7과 본 보고서를 검토하고 G4의 정확한 API/DDL·epoch·주별 확정 계약을 정한다. 확정된 제품 정책은 다시 묻지 않는다.
2. G4의 공유 종목 판정·독립 후보 선택·정확한 E/N·주별 RESET/ADD·후속 주 재평가를 격리 테스트로 개발한다. G3의 날짜 판정을 중복 구현하지 않는다.
3. G5의 기간·네 조건 자격·원본 미리보기/자동 편성·임시 계획/세션 소속·종료/취소·쓰기 권한·일반 평가 제외를 개발하고 G4의 정지/epoch를 연결한다.
4. G6 실제 PWA 연결과 오프라인·동시성·모바일 검토를 수행한 뒤 승인된 검토 DB의 적용 단위와 별도 승인을 확인한다.

**최초 분석 당시 종료:** UI 문서12개를 로컬 커밋하고 디로딩 명세·분석 보고서와 현행 기준 링크 갱신은 미커밋으로 남겼다. 이후 사용자가 요청한 이번 정정에서는 그 변경을 보존하고 양쪽 활성 문서 불일치를 정리해 각각 문서 커밋한다. 기능 코드·DB·migration·서버·백업·IndexedDB는 변경하지 않으며 push와 다음 기능 개발은 수행하지 않는다. 이번 검증은12절을 따른다.

## 11. 최초 분석 완료 당시 검증 기록

아래는 이번 정정 전의 분석 검증 기록이다. 현재 문서 상태와 정정 내용은12절 및 최종 커밋 보고를 따른다.

- 변경/신규 Markdown의 상대 경로·제목 링크 **287개**에 누락이 없고 코드 fence가 균형을 이룬다. 신규2파일의 전체 줄과 기존7파일의 diff 공백 검사를 통과했다. 역사 HTML 외 새 공백 예외는 없다.
- v1.7의 DL 정의는90개이며 v1.6의90개와 누락/중복 없이 대응한다. DL-40~59의 웨이트·유산소 감량/배치 본문은 줄 끝 공백을 제외하고 원본과 동일하다.9개 유리수 예와1.000000000001 임계값 검산을 통과했다.
- v1.6은 변경하지 않았다. 역사 HTML의 필터 없는 파일blob은 여전히 f42a8e1835723972a89c9b57098e74b22a03111f다. 현재 HTML·공식 SVG/PNG도2단계에서 변경하지 않았다.
- 양쪽 추적 기능/테스트/설정·자산491개SHA-256에 변화가 없다. 격리 검토DB의10개 도메인·판정 표의 행수/지문,기존dump4개SHA-256,동일컨테이너/볼륨 모두 분석 전후 일치한다. 기존Backend60208/java·PWA63500/node 프로세스를 유지했다.
- UI문서 커밋은6b13ff8167eb이고 부모는85ec10f50e59다. Backend HEAD2d37f8b7ce04·clean,양쪽브랜치 유지.2단계는문서7개수정+2개신규,staged없음이다.원격참조변화가없고push를호출하지않았다.
- 전체 Gradle/npm 테스트·build·lint는 문서 작업이므로 재실행하지 않았다. 기존 JUnit 실행 근거와 이번 문서·해시·읽기 전용 DB 검증을 구분한다. 새 검토 서버/컨테이너/마이그레이션을 실행하지 않았다.

## 12. 2026-11-07 활성 문서 불일치 전수 정정

최초 분석의 미커밋7개 수정·2개 신규를 보존하고 아래 실제 불일치를 정정했다. 새 체크리스트/중복 보고서는 만들지 않았다. 소스 구현은 G0~G3 확인/G4·G5 미구현/G6 시안 일부·실제 미연동으로 통일한다.

| 발견한 불일치 | 정정 위치·결과 |
|---|---|
| HTML의 실제 계획2일 gate·5개 체크와 0일 차단 사례 | dlEligibility 체크4개, 계획0/1일도 다른조건 충족시 통과. 무활동/최근기록없음/당일/ACTIVE일반세션은 차단 |
| 활성 요구사항·Backend engineering의 계획2일·분모/예약 안내 | PWA requirements·양쪽 AGENTS·Backend README/engineering·현재 통계/API 진입점을 즉시 적용·독립 E/N·월04시 확정으로 통일 |
| 최초 분석 기본값의 결정 상태 누락 | v1.7 2.1절·수용 테스트·15절·본 보고서/API 준비 범위·양쪽 개발 문서에 미확정 **제품 결정**으로 기록. G4 이전 결정 필요 |
| 기간 중복 생성과 운동 자격의 책임 혼재 | DL-17/18·DL-80 주변 설명·G5·HTML 시작핸들러. 이미 ACTIVE면 신규 기간을 만들지 않으며 운동 자격은4개 그대로 |
| 유산소 기록1건/실제활동 문구 혼용 | DL-81·수용 테스트·UI/Backend 설명을 미삭제 COMPLETED·activeMs>0의 실제 결과로 통일. START/SKIPPED/활동없는 결과 제외. 목표 달성과 별개 |
| jointType을 추가 예정으로 안내 | DL-37/CHECK-06·15절과 본 보고서. V18 컬럼/enum은 구현, COMPOUND/ISOLATION/OTHER·NULL 의미 확인. 분류 데이터 품질/자동 편성 엔진은 별도 |
| Backend 현행 진입점의 통계v1.3·디로딩v1.6 및 이전 적용 제한 | 통계v1.4·디로딩v1.7 참조, 검토 DB의 V24와 개인/운영 DB 구분. 당시 보고서·이전 제품 원본은 변경하지 않음 |
| HTML 상세의 계획 기반 누적 설명·설정 OFF 의미 | 기록 E/N·E≤1 RESET·월04시 이후 확정·주중 미가산, OFF에도 G3/일반통계 지속, 초기ON은 시연이라는 설명으로 정정 |
| Decision Log의 과거5조건을 최신처럼 읽을 위험 |10.9에 역사 표기,10.15 현행 정정절·우선순위 추가. 과거 결정/버전 변경 이력은 원문 유지 |
| 이전 보고서의 “Backend clean/읽기전용·HTML 미동기화” 상태가 현재 정정과 혼재 | 최초 분석 시점으로 구분하고 이번 활성 문서 수정·커밋 범위를 별도 기록 |

### 최초 분석 기본값의 근거 확인

PWA의 v1.6·v1.7·UI Decision Log, Backend의 과거 디로딩v1.1~v1.3·통계v1.4·최종 구현 계획에서 명시적인 신규 계정 기본ON/OFF 확정 기록을 찾지 못했다. 기존 HTML의 deloadAnalysisOn=true와 개발 헤더의 기본 인수는 표현 시연이며 서버 설정 계약이 아니다. **기본값은 미확정**으로 유지하며 이 사실은 문서 커밋을 막지 않는다. 이미 확정된 E/N·OFF/재ON·네 자격을 다시 미정으로 돌리지 않는다.

### 유산소 실제 수행의 기존 서버 근거

WorkoutSnapshotRequests.cardioNumbers는 COMPLETED의 activeMs를 검증하고, WorkoutRecordRequests도 정정/복구에 같은 실제 활동 필드를 사용한다. StatisticsRepository와 DailyTrainingReviewService는 미삭제 유효 결과·양의 activeMs를 실제 수행 근거로 사용한다. 따라서 별도 거리·속도·최소운동시간을 만들 필요가 없다. 이는 현재 실제 수행 존재의 의미를 통일한 것으로 G5 자격 API가 구현되었다는 뜻은 아니다.

### 보존한 역사 기록

디로딩v1.6 및 Backend v1.1~v1.3, 통계v1.1~v1.3, 원본 HTML 보존본, 단계별 과거 작업 보고서는 그대로 둔다. 현재 활성 구현 계획은 현행 진입점/기본값 결정 상태만 보완하고 당시 G0~G3 계획·비교 표는 역사 범위로 구분한다. Decision Log와 v1.7의 구버전 변경 이력 속5조건/예약은 삭제하지 않는다.

### 정정 검증 결과

- 양쪽 변경 문서22개(PWA11·Backend11)의 상대 경로·anchor447개와 Markdown fence를 확인했다. DL-01~90은 누락·중복이 없고 DL-40~59의 기존 편성·감량 본문은 줄 끝 공백을 제외하고 v1.6과 같다. E/N 유리수 예9개와1.000000000001 임계값을 정수 분수 연산으로 다시 검산했다.
- 로컬 HTML의48개 시연 화면을 오류 없이 렌더링했다. 320px·393px 검사와 수정 전후 캡처16장의 바이트 비교가 일치한다. CSS 전체와 승인된 루틴·운동 입력 렌더러24개가 동일하다.
- 분석 ON/OFF 각각에서 계획0/1일·게이지0이어도 네 자격 충족 시 통과하며, 무활동·최근 수행 없음·이전 완료 이후 새 수행 없음·당일 수행·ACTIVE 일반 세션은 차단된다. ACTIVE 디로딩 중복 시작은 기존 기간 상태를 초기화하지 않는다. 이는 파일 기반 시연 검증이며 실제 API 검증이 아니다.
- 기능·테스트·설정·자산491개와 역사 원본196개의 SHA-256을 보존했다. 기존 격리 DB의10개 표 행수/지문·V24·컨테이너/볼륨 및 dump4개 해시는 작업 전후 같았다. 신규 서버·컨테이너·migration은 실행하지 않았다.
- 두 저장소의 diff 공백 검사와 신규 문서 전체 줄 검사를 통과했다. 역사 HTML은 이번 변경·스테이징 대상이 아니며 새 공백 예외는 없다. 로그·캡처·백업·환경 파일은 커밋에서 제외한다.
- 문서 전용 작업으로 Gradle/npm 기능 테스트·build·lint는 재실행하지 않았다. 기존 JUnit 결과와 이번 문서/HTML 검증을 구분한다. 검증용 Chrome은 종료하고 기존 Backend·PWA 검토 프로세스는 유지한다.
