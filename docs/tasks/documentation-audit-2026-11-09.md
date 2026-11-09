# Overload 문서 감사 · 2026-11-09

기준은 PWA `4aa5de9568e018b26856e3e9e0b492d251a3f926`와 Backend `37dbe51d448a7bf426c073af9dd24825f70087f4`다. 두 `main`에서 실제 HEAD와 clean 상태를 확인했다. 목록은 당시 Git 추적 범위의 루트 안내와 두 `docs/` 전체를 다룬다. Backend의 로컬 `overload-server/HELP.md`는 Git에서 제외된 생성 템플릿(E)으로, 개수와 추적 목록에서는 뺐다. 새 개발의 진입점은 [Frontend AGENTS.md](../../AGENTS.md#3-required-engineering-documents)와 [Backend AGENTS.md](../../../overload-server/AGENTS.md#3-required-engineering-documents)의 작업별 표다. 이 감사 기록은 참조용이다.

## 적용 기준과 구현 상태

| 영역 | 기준 | 확인 결과 |
|---|---|---|
| 주간 프리셋 | [일정 API](../../../overload-server/docs/api/weekly-schedule.md) · [UI 결정 10.16절](../product/Overload_UI_Decision_Log_v0.9.md#1016--다중-주간-루틴-일정과-자동-순환) | Backend V30 저장·가입 기본값·관리·수동 적용·자동 순환·복구·G5 연동 완료. PWA는 T02-B 단일 일정 구현 상태이며 신규 API 연동은 후속 |
| 일반 운동 통계와 기록 | [통계 v1.4](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md) · [Overview](../../../overload-server/docs/api/statistics.md) · [세션](../../../overload-server/docs/api/workout-sessions.md) | G3는 일정과 당시 근거로 일별 검사. 일반 계획 달성률과 전체 실제 실적을 분리. 승인·성장·유산소·맨몸 계산은 각 API에 연결 |
| G4/G5 및 G6 | [디로딩 v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md) · [G4](../../../overload-server/docs/api/deload-analysis.md) · [G5](../../../overload-server/docs/api/deload-periods.md) · [G6](../engineering/backend-ui-v0.9.md) | G4 분석·G5 기간과 프리셋 복귀 구현. G6 API와 혼재 기록의 실제 PWA 연동 미완료. 기존 DB 전환과 비소급 T_adopt는 별도 승인 |
| UI와 실제 테마 | [화면별 기준](../product/ui-ux.md) · [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md) · [무채색 시안](../product/Overload_UI_Baseline_Wireframe_v0.9.html) | T02-A 일반 홈 실기기 최종 승인, T02-B 사용자 최종 실기기 승인 별도. 시안은 화면·조작 참조 |
| 휴식 타이머 | [UI 결정 10.17절](../product/Overload_UI_Decision_Log_v0.9.md#1017--휴식-타이머-시각효과음-알림) · [T03.5 구현 범위](../engineering/frontend.md#t035-휴식-타이머-시각효과음-알림) | 설계·HTML 시연 완료. 웨이트 세트 간 3열 시간 바 전체를 매초 짧게 반전 후 복귀. 시각·효과음 독립 기본 ON, 시각 시작 10/5초 선택(기본 5초), 효과음 5·4·3·2·1초. 전체 화면 플래시 금지와 기존 휴식 시간 설정 분리. 실제 PWA는 T03.5 예정 |

[Backend 12.5절](../../../overload-server/docs/engineering/backend.md#125-다중-주간-일정-프리셋)에 최종 감사와 전체 격리 회귀의 단위 438건·PostgreSQL 통합 840건 통과, 실패·건너뜀 0, 빈 DB V1~V30 및 V24→V30 검증이 기록돼 있다. [G0~G5-3 1차 검증](deload-v17-backend-readiness-analysis.md)의 432/816건은 그 이전 체크포인트다. 이 감사에서는 기능 테스트를 재실행하지 않았다.

## 구·현행 충돌과 중복

충돌은 파일별 반복을 묶은 11개 주제이며, 별도로 역할이 겹치는 4개 통합 후보와 깨진 로컬 참조 3개를 확인했다.

| 주제 | 구 정책·표기 | 현행 기준과 적용 | 처리 |
|---|---|---|---|
| 일정 적용 시점 | [통계 v1.2](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.2.md)의 다음 월요일 예약, v1.3의 기존 일정 변경 예약 | [일정 계약](../../../overload-server/docs/api/weekly-schedule.md)의 실제 적용 시각과 과거 근거 보호. 월요일 순환 대상 시각과 수동 변경의 효력은 별개 | 이전 버전 표시, 현재 표에서 현행 계약 연결 |
| 단일 일정 HTTP | [PWA README](../../README.md)와 [G6 지침](../engineering/backend-ui-v0.9.md)의 루트 PUT·이력 GET | [V30 프리셋 API](../../../overload-server/docs/api/weekly-schedule.md)에서 루트 GET 교체, 루트 PUT과 이력 GET 제거, 내부 이력 유지 | 구 호출은 기존 PWA 교체 대상으로 표시 |
| 요일 배정 소유권 | [10.14절](../product/Overload_UI_Decision_Log_v0.9.md#1014--2026-11-07-t02-b-최신-ui-통합-기준)의 개별 폼과 단일 일정 | [10.16절](../product/Overload_UI_Decision_Log_v0.9.md#1016--다중-주간-루틴-일정과-자동-순환)의 프리셋 배정 편집과 조회 중 프리셋 필터 | UI 적용 표에서 범위를 나눔 |
| 제외 그룹 순서 | [10.16절](../product/Overload_UI_Decision_Log_v0.9.md#1016--다중-주간-루틴-일정과-자동-순환)의 이전 예외와 [HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html) | [자동 순환 설정](../../../overload-server/docs/api/weekly-schedule.md#자동-순환-설정)에서 ON이면 제외 그룹만 재정렬해도 첫 포함 프리셋으로 이동 | 로그·합성 시연을 서버 계약에 맞춤 |
| 비포함 프리셋 삭제 | [10.16절](../product/Overload_UI_Decision_Log_v0.9.md#1016--다중-주간-루틴-일정과-자동-순환)과 [HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html)의 포함 구성 변경 시에만 순환 재시작 | [자동 순환 설정](../../../overload-server/docs/api/weekly-schedule.md#자동-순환-설정)에서 ON의 유효한 삭제 후 첫 포함으로 이동 | 로그·합성 시연 일치 |
| 프리셋과 G5 구현 상태 | [v1.7 10.5절](../product/Overload_Deloading_Design_Specification_v1.7.md#105-주간-일정-프리셋-연동)과 [10.16절](../product/Overload_UI_Decision_Log_v0.9.md#1016--다중-주간-루틴-일정과-자동-순환)의 Backend 미구현 표기 | [G5 원본·복귀](../../../overload-server/docs/api/deload-periods.md#주간-일정-프리셋과-순환-복귀)와 [최종 Backend 검증](../../../overload-server/docs/engineering/backend.md#125-다중-주간-일정-프리셋) | 서버 완료, PWA 연동·실제 DB 적용은 후속으로 분리 |
| 일반 통계 경로와 분모 | [2A 기록](../../../overload-server/docs/api/statistics.md#과거-2a-계약-기록--get-apiv1statistics-제거됨)의 루트 GET, 시작 세션만의 계획 합계 | [Overview](../../../overload-server/docs/api/statistics.md#get-apiv1statisticsoverview--2b)의 당시 주간 일정·계획과 날짜별 최고 단일 세션 | 현행 요청·스키마를 먼저 읽고 2A는 펼쳐서 확인 |
| 디로딩 시작 자격 | [v1.6](../product/Overload_Deloading_Design_Specification_v1.6.md) 및 구 HTML의 계획 2일·5조건 | [v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md)의 실제 수행 기반 4조건. ACTIVE 기간 중복은 별도 상태 제한 | 구 버전과 시안 예시는 역사로 분리 |
| 디로딩 기본값·누적 | [이전 디로딩 설계](../../../overload-server/docs/product/Overload_Deloading_Design_Specification_v1.3.md) 및 [준비 기록](deload-v17-backend-readiness-analysis.md)의 이전 경계 | [v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md)과 [G4 API](../../../overload-server/docs/api/deload-analysis.md)에서 신규 기본 ON·초기 0과 OFF→ON 새 epoch, 기존 계정 비소급 이행을 분리 | 중복 정정 본문은 기준 링크로 대체 |
| 실제 UI 컬러 | [초기 토큰](../product/ui-ux.md#4-기본-다크-디자인-토큰시작점)과 무채색 시안 | [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)의 Onyx·상태·완료 표현 | 구 색상을 초기 이력으로 표시 |
| 휴식 타이머 무음 | [Task 001~005 핸드오프](../handoff/Overload-Project-Handoff-Task001-005.md) 6절의 소리 없음 | [10.17절](../product/Overload_UI_Decision_Log_v0.9.md#1017--휴식-타이머-시각효과음-알림)의 독립 효과음과 3열 바 알림 | 핸드오프 첫머리에 대체 결정 링크. 10.17절과 휴식 시연 동작 보존 |

일정·디로딩 정책의 이미 결정된 우선순위와 구현 상태를 반영했다. G6 문서의 성장 별칭, 제조사별 집계, 0회 초안처럼 별도 제품 판단 또는 계약 확인이 필요한 항목은 그 상태를 유지했다.

## 통합·보관·제거 검토

| 대상 | 비교와 보존할 내용 | 권장 조치 및 영향 |
|---|---|---|
| [UI/UX](../product/ui-ux.md) + [초기 요구사항](../product/requirements.md) + [인증 프리뷰](../product/auth-preview.md) | 홈·루틴·계정 UX가 겹친다. 초기 동선과 제품 의도, 초기화·탈퇴의 구분 및 고유 수용 기준에 보존 가치가 있다. | 화면별 정책 소유권은 UI/UX 진입점과 로그를 사용한다. 제품 원칙·계정 정책의 고유 근거를 추출하고, 초안·목업 본문은 보관하는 작업을 별도로 검토한다. |
| [008 도메인/API v0.1](../../../overload-server/docs/tasks/task-008-0-domain-and-api-contract-v0.1.md) + [008 공통 HTTP v0.1](../../../overload-server/docs/tasks/task-008-0d-common-api-contract-v0.1.md) + [008 JPA 설계](../../../overload-server/docs/tasks/task-008-0-jpa-persistence-design.md) | 같은 008 계열이지만 DTO/도메인, 공통 성공·오류·Request ID, JPA/JDBC 경계가 다르다. 공통 HTTP의 유효 부분은 Backend 규칙, 실제 DTO는 기능별 API와 비교한다. | 공통 HTTP 중복만 통합 검토. 구 쓰기·조회 DTO와 JPA 검증 이력은 별도로 보존. |
| Backend `docs/tasks/task-009-0-write-domain-api-design-v0.1.md` / `…-v0.2.md` | Git `227640e`에서 비교했다. v0.1은 미승인 제안, v0.2는 1A 보완·기반 구현 기록으로 operationId·영수증·Outbox가 남는다. [v1.0](../../../overload-server/docs/tasks/task-009-redesign-v1.0.md)이 그 구조를 대체한다. | `9ddbde7`에서 제거된 상태와 Git 보존 유지. 옛 승인의 추적에만 사용한다. |
| `4-01` / `4-02` | 두 저장소의 추적 문서·이름과 로컬 Git 문서 이력에서 이 명칭의 문서 쌍을 확인하지 못했다. 유사 범위인 [G4-1](../../../overload-server/docs/tasks/deload-g4-1-report.md)은 설정/epoch/API/DDL, [G4-2](../../../overload-server/docs/tasks/deload-g4-2-report.md)는 InitialPlan 판정기와 정확 분수를 검증한다. | 역할이 달라 분리 보존. 현행 분석에는 [G4 API](../../../overload-server/docs/api/deload-analysis.md) 하나로 진입한다. |
| [즉시 적용 분석](../../../overload-server/docs/tasks/weekly-schedule-immediate-application-analysis.md) + [구현 계획](../../../overload-server/docs/tasks/weekly-schedule-immediate-implementation-plan.md) + [Backend 준비 분석](deload-v17-backend-readiness-analysis.md) | 제안, 승인 이후 단계 순서, 1차 코드·데이터 검증은 목적이 다르다. G4/G5·G3 설명은 현재 명세와 중복된다. | 구현 입구에서 제외. 승인·검증 이력을 보존하면서 상태 안내의 중복만 제거한다. |
| 디로딩 v1.1~v1.3 및 v1.6, 통계 v1.1~v1.3, Task 001~006 핸드오프 | 이전 계산·자격·예약·환경과 당시 결정이 고유하다. 현재 계약은 [v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md)·[v1.4](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md)·작업별 API에 있다. | 이력 링크와 외부 북마크 영향을 피하도록 원래 위치에 보관. 버전 비교나 승인 근거가 필요할 때만 확인한다. |
| [T02-B 이전 HTML](../product/Overload_UI_Baseline_Wireframe_v0.9_before_T02B_2026-11-07.html) 및 Vite/Spring·gitignore 템플릿 | 구 HTML은 동작 비교 원본이며 역참조가 있다. 템플릿은 현재 README/규칙과 중복되며 고유 제품 정책이 없다. | 템플릿은 Git 이력으로 이전 가능한 제거 후보. 구 HTML은 비교 링크를 대체할 근거가 확보될 때만 Git 보관 검토. 이번 감사에서 이동·삭제하지 않았다. |

## 개발 경로 평가

기본 경로는 각 저장소의 AGENTS.md, 기술 규칙, 작업에 해당하는 현재 정책과 계약이다. 날짜별 계획의 분모를 작업한다면 통계 v1.4와 Overview를 보고, 순환 동작을 변경한다면 주간 일정 API를 본다. 화면을 구현할 때만 관련 UI 결정과 시각 규격을 함께 확인한다. 과거 정책을 비교할 때는 아래 목록을 사용한다.

과거 보고서는 검색 결과에 계속 나타나며 일부 설계 파일 안에 당시 표현과 예시가 남아 있다. 이력 표시와 현행 진입 링크로 적용 범위를 구분했다. 남은 통합의 이점은 초기 요구사항·프리뷰에서 반복되는 문장을 줄이는 데 있다. API·제품·시각·검증 기록의 독립적인 변경 주기는 유지할 가치가 있다.

## 변경 파일

- overload-pwa · 16개와 이 감사 기록
  - [AGENTS.md](../../AGENTS.md)
  - [README.md](../../README.md)
  - [docs/engineering/backend-ui-v0.9.md](../engineering/backend-ui-v0.9.md)
  - [docs/engineering/frontend.md](../engineering/frontend.md)
  - [docs/handoff/Overload-Project-Handoff-Task001-005.md](../handoff/Overload-Project-Handoff-Task001-005.md)
  - [docs/handoff/Overload-Task006-Design-Handoff.md](../handoff/Overload-Task006-Design-Handoff.md)
  - [docs/product/Overload_Deloading_Design_Specification_v1.6.md](../product/Overload_Deloading_Design_Specification_v1.6.md)
  - [docs/product/Overload_Deloading_Design_Specification_v1.7.md](../product/Overload_Deloading_Design_Specification_v1.7.md)
  - [docs/product/Overload_UI_Baseline_Wireframe_v0.9.html](../product/Overload_UI_Baseline_Wireframe_v0.9.html)
  - [docs/product/Overload_UI_Decision_Log_v0.9.md](../product/Overload_UI_Decision_Log_v0.9.md)
  - [docs/product/auth-preview.md](../product/auth-preview.md)
  - [docs/product/requirements.md](../product/requirements.md)
  - [docs/product/ui-ux.md](../product/ui-ux.md)
  - [docs/tasks/deload-v17-backend-readiness-analysis.md](deload-v17-backend-readiness-analysis.md)
  - [docs/tasks/task-004-final-ux-polish-report.md](task-004-final-ux-polish-report.md)
  - [docs/tasks/ui-v09-t02a-closeout.md](ui-v09-t02a-closeout.md)
- overload-server · 15개
  - [AGENTS.md](../../../overload-server/AGENTS.md)
  - [README.md](../../../overload-server/README.md)
  - [docs/api/statistics.md](../../../overload-server/docs/api/statistics.md)
  - [docs/api/weekly-schedule.md](../../../overload-server/docs/api/weekly-schedule.md)
  - [docs/engineering/backend.md](../../../overload-server/docs/engineering/backend.md)
  - [docs/product/Overload_Deloading_Design_Specification_v1.1.md](../../../overload-server/docs/product/Overload_Deloading_Design_Specification_v1.1.md)
  - [docs/product/Overload_Deloading_Design_Specification_v1.2.md](../../../overload-server/docs/product/Overload_Deloading_Design_Specification_v1.2.md)
  - [docs/product/Overload_Deloading_Design_Specification_v1.3.md](../../../overload-server/docs/product/Overload_Deloading_Design_Specification_v1.3.md)
  - [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.1.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.1.md)
  - [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.2.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.2.md)
  - [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.3.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.3.md)
  - [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md)
  - [docs/tasks/task-006-model-mapping-report.md](../../../overload-server/docs/tasks/task-006-model-mapping-report.md)
  - [docs/tasks/task-008-0c-jpa-jdbc-validation-report.md](../../../overload-server/docs/tasks/task-008-0c-jpa-jdbc-validation-report.md)
  - [docs/tasks/weekly-schedule-immediate-implementation-plan.md](../../../overload-server/docs/tasks/weekly-schedule-immediate-implementation-plan.md)

## 검증

- 로컬 상대경로와 Markdown/HTML 앵커, HTML 자산 참조를 검사했다. 외부 URL은 조사 목록과 분리했다.
- 두 HTML의 인라인 JavaScript 구문, 현재 시안의 프리셋 순서 변경·삭제 시나리오 6개, 아이콘 manifest의 파일 크기·해시·치수와 HTML 내장 이미지 6종을 확인했다.
- UI 결정 10.17절과 휴식 시연 함수, 두 AGENTS.md의 3절 밖, 제품 소스·테스트·DB migration은 기준 커밋과 동일함을 확인했다. 문서 변경 범위에서 `git diff --check`를 실행했다.

## 파일별 분류와 참조

A 현행 기준 · B 필요할 때 읽는 보조 참조 · C 이력 · D 통합 후보 · E 제거 검토 후보. 참조 수는 이 감사 문서 자체를 제외하고 정리 후 Markdown/HTML에서 해당 파일을 가리키는 서로 다른 문서 수다. 코드, manifest 내부, 평문 경로, 외부 링크는 이 수치에서 제외한다. 0은 이 범위에서 링크가 없다는 뜻이다.

| 저장소 | 문서 | 기타 | A | B | C | D | E |
|---|---:|---:|---:|---:|---:|---:|---:|
| overload-pwa | 57 | 119 | 7 | 18 | 146 | 2 | 3 |
| overload-server | 87 | 2 | 17 | 13 | 56 | 2 | 1 |

문서는 Markdown·HTML·TXT, 기타는 자산·검증 증거·개발 참조 SQL이다. 분류 합계에는 기타 파일도 포함한다.

### overload-pwa

<details>
<summary>문서 57개</summary>

| 경로 | 분류 | 참조 | 근거와 권장 처리 |
|---|---|---:|---|
| [AGENTS.md](../../AGENTS.md) | A | 8 | 공통 개발·승인 규칙과 작업별 기준 진입점을 유지 |
| [README.md](../../README.md) | B | 0 | 프로젝트 소개와 실행 방법을 유지. 현재 상태와 정책은 연결된 기준에서 확인 |
| [docs/engineering/authentication.md](../engineering/authentication.md) | A | 8 | 서버 세션 인증 — Task 007-1D-1 / 1D-2A의 전문 구현·운영 절차 참조 |
| [docs/engineering/backend-ui-v0.9.md](../engineering/backend-ui-v0.9.md) | B | 6 | G6 화면 연결·혼재 세션 검증 지침. 정책/HTTP는 각 원본 참조 |
| [docs/engineering/frontend.md](../engineering/frontend.md) | A | 12 | React·TypeScript·PWA·로컬 보호 규칙과 현재·후속 범위 |
| [docs/handoff/Overload-Project-Handoff-Task001-005.md](../handoff/Overload-Project-Handoff-Task001-005.md) | C | 3 | Overload — 프로젝트 인수인계 (Task 001–005)의 당시 인계 근거를 보존 |
| [docs/handoff/Overload-Task006-Design-Handoff.md](../handoff/Overload-Task006-Design-Handoff.md) | C | 4 | Overload — Task 005.5 최종 정책 및 Task 006 설계 인계의 당시 인계 근거를 보존 |
| [docs/licenses/lucide-dumbbell.txt](../licenses/lucide-dumbbell.txt) | B | 1 | 라이선스 고지. 자산 출처·배포 의무 보존 |
| [docs/product/Overload_Deloading_Design_Specification_v1.6.md](../product/Overload_Deloading_Design_Specification_v1.6.md) | C | 4 | 디로딩 이전 합의·당시 시작/누적·UI를 버전 이력으로 보존 |
| [docs/product/Overload_Deloading_Design_Specification_v1.7.md](../product/Overload_Deloading_Design_Specification_v1.7.md) | A | 29 | 디로딩 정책·자격·분석·기간·프리셋 연결의 단일 제품 기준 |
| [docs/product/Overload_UI_Baseline_Wireframe_v0.9.html](../product/Overload_UI_Baseline_Wireframe_v0.9.html) | B | 12 | 무채색 조작 시안. 런타임/실제 토큰과 역할 분리 |
| [docs/product/Overload_UI_Baseline_Wireframe_v0.9_before_T02B_2026-11-07.html](../product/Overload_UI_Baseline_Wireframe_v0.9_before_T02B_2026-11-07.html) | E | 2 | T02-B 이전 비교 원본. 현 시안과 중복되나 링크와 승인 추적 때문에 우선 보존 |
| [docs/product/Overload_UI_Decision_Log_v0.9.md](../product/Overload_UI_Decision_Log_v0.9.md) | A | 18 | 확정 UI 절과 과거 결정이 공존. 표의 현행 절을 직접 읽고 구 절은 추적용 |
| [docs/product/Overload_UI_Visual_Theme_Spec_v0.9.md](../product/Overload_UI_Visual_Theme_Spec_v0.9.md) | A | 13 | Overload UI v0.9 — Visual Theme Specification에서 후속 계약이 대체한 부분을 제외한 확정 정책 유지 |
| [docs/product/assets/exercise-icons/README.md](../product/assets/exercise-icons/README.md) | B | 8 | 검색·선택용 6종 원본과 32px 표시 지침 |
| [docs/product/auth-preview.md](../product/auth-preview.md) | D | 6 | 초기 계정/삭제 UX의 근거 및 목업. 세션 계약은 Task 006과 현행 인증 문서 |
| [docs/product/requirements.md](../product/requirements.md) | D | 4 | 초기 요구와 현행 UI가 섞임. 제품 원칙·고유 요구를 보존하며 중복만 통합 검토 |
| [docs/product/ui-ux.md](../product/ui-ux.md) | A | 11 | 화면별 UI 탐색과 유지되는 공통 흐름. 단일 일정과 초기 계정 예시는 구 범위 |
| [docs/reference/bootstrap/frontend.gitignore.txt](../reference/bootstrap/frontend.gitignore.txt) | E | 0 | 초기 ignore 템플릿. 적용 규칙은 루트 .gitignore |
| [docs/reference/bootstrap/vite-template.md](../reference/bootstrap/vite-template.md) | E | 0 | Vite 템플릿 소개. 현행 의존성·개발 규칙은 Frontend 지침 |
| [docs/tasks/deload-v17-backend-readiness-analysis.md](deload-v17-backend-readiness-analysis.md) | C | 11 | G4/G5 1차 검증·데이터 보존 근거. 이후 프리셋 최종 결과는 Backend 12.5절 |
| [docs/tasks/standard-exercise-catalog-frontend-phase-3-report.md](standard-exercise-catalog-frontend-phase-3-report.md) | C | 4 | 표준 운동 카탈로그 — Frontend 3단계 구현·검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-002-core-ui-report.md](task-002-core-ui-report.md) | C | 0 | Task 002 — Core UI Prototype의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-003-core-ux-report.md](task-003-core-ux-report.md) | C | 0 | Task 003 — Core UX Refinement 결과의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-003-last-set-followup-report.md](task-003-last-set-followup-report.md) | C | 1 | Task 003 후속 — 마지막 세트 완료 후 휴식 제거의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-004-final-ux-polish-report.md](task-004-final-ux-polish-report.md) | C | 0 | Task 004 최종 UX 보완 결과의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-004-followup-ux-report.md](task-004-followup-ux-report.md) | C | 0 | Task 004 후속 — iPhone 피드백 및 UX 개선의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-004-iphone-manual-checklist.md](task-004-iphone-manual-checklist.md) | C | 2 | Task 004 — 실제 iPhone Safari 수동 체크리스트의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-004-iphone-usability-report.md](task-004-iphone-usability-report.md) | C | 1 | Task 004 — iPhone 사용성 및 로컬 기록 안정성 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-004-progression-followup-report.md](task-004-progression-followup-report.md) | C | 0 | Task 004 최종 후속 — 진행 중량 사후 변경과 증량 재안내의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-004-progression-history-report.md](task-004-progression-history-report.md) | C | 0 | Task 004 — 진행 중량 변경 이력 및 빠른 중량 입력 결과의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-004-rest-warning-visibility-report.md](task-004-rest-warning-visibility-report.md) | C | 0 | Task 004 — 휴식 종료 임박 안내 가시성 개선의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-0055-auth-preview-report.md](task-0055-auth-preview-report.md) | C | 2 | Task 005.5 — 인증·계정 인터랙티브 목업 결과의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1d-1-live-validation-report.md](task-007-1d-1-live-validation-report.md) | C | 0 | Task 007-1D-1-LIVE — React 로그인 실제 통합 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1d-1-validation-report.md](task-007-1d-1-validation-report.md) | C | 1 | Task 007-1D-1 — React 인증 연동 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1d-2a-live-validation-report.md](task-007-1d-2a-live-validation-report.md) | C | 0 | Task 007-1D-2A-LIVE — 실제 계정 설정·공통 이메일 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1d-2a-validation-report.md](task-007-1d-2a-validation-report.md) | C | 2 | Task 007-1D-2A — 계정 설정·대표 이메일·재인증 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1d-2b-fix-live-validation-report.md](task-007-1d-2b-fix-live-validation-report.md) | C | 1 | Task 007-1D-2B-FIX-LIVE — EMAIL 로그인 연결 버튼 집중 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1d-2b-fix-validation-report.md](task-007-1d-2b-fix-validation-report.md) | C | 1 | Task 007-1D-2B-FIX — EMAIL 연결 결과 안내 진단·최소 수정의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1d-2b-live-validation-report.md](task-007-1d-2b-live-validation-report.md) | C | 0 | Task 007-1D-2B-LIVE — 실제 로그인 수단 관리 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1d-2b-validation-report.md](task-007-1d-2b-validation-report.md) | C | 3 | Task 007-1D-2B — EMAIL·Google 로그인 수단 관리 UI 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-008-1b-workout-read-integration-report.md](task-008-1b-workout-read-integration-report.md) | C | 1 | Task 008-1B — 인증 사용자 운동 정보 조회 연동의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-008-1c-real-backend-integration-report.md](task-008-1c-real-backend-integration-report.md) | C | 0 | Task 008-1C — 실제 Backend + Frontend 운동 조회 통합 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-frontend-5a-report.md](task-009-frontend-5a-report.md) | C | 2 | Task 009 — Frontend 5A 구현 및 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-frontend-5b-report.md](task-009-frontend-5b-report.md) | C | 2 | Task 009 — Frontend 5B 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-frontend-5c-report.md](task-009-frontend-5c-report.md) | C | 2 | Task 009 — Frontend 5C 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-frontend-5d-report.md](task-009-frontend-5d-report.md) | C | 3 | Task 009 — Frontend 5D 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-frontend-5e-report.md](task-009-frontend-5e-report.md) | C | 3 | Task 009 — Frontend 5E 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/ui-v09-t01-foundation-report.md](ui-v09-t01-foundation-report.md) | C | 1 | UI v0.9 T01 — 공통 앱 셸·디자인 기반의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/ui-v09-t02a-closeout.md](ui-v09-t02a-closeout.md) | B | 4 | T02-A 승인·당시 인계 이력과 계속 적용하는 승인 후 수동 재개 절차 |
| [docs/tasks/ui-v09-t02a-design-review-report.md](ui-v09-t02a-design-review-report.md) | C | 2 | T02-A 홈 설계 일치 및 iPhone 검토 환경 개선의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/ui-v09-t02a-home-details-report.md](ui-v09-t02a-home-details-report.md) | C | 3 | T02-A 홈 UI 세부 개선 및 최근 운동 종목 달성 표시의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/ui-v09-t02a-home-final-visual-report.md](ui-v09-t02a-home-final-visual-report.md) | C | 2 | T02-A 홈 최종 시각 보완 · 달리기 검토 기록의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/ui-v09-t02a-home-polish-report.md](ui-v09-t02a-home-polish-report.md) | C | 2 | T02-A 홈 최종 디테일 — 구분선·공식 웨이트 배지·간격의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/ui-v09-t02a-home-report.md](ui-v09-t02a-home-report.md) | C | 1 | UI v0.9 T02-A — 실제 API 홈과 격리 검토 환경의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/ui-v09-t02b-first-ui-report.md](ui-v09-t02b-first-ui-report.md) | C | 0 | T02-B 루틴 관리 1차 React UI의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/ui-v09-t02b-second-report.md](ui-v09-t02b-second-report.md) | C | 2 | UI v0.9 T02-B 루틴 관리 2차 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |

</details>

<details>
<summary>자산·증거·SQL 119개</summary>

| 경로 | 분류 | 참조 | 근거와 권장 처리 |
|---|---|---:|---|
| [docs/product/assets/deload-icons/thick_white_crescent_moon.png](../product/assets/deload-icons/thick_white_crescent_moon.png) | B | 1 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/deload-icons/thick_white_crescent_moon.svg](../product/assets/deload-icons/thick_white_crescent_moon.svg) | B | 3 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/Overload_Icons_v0.9_Extracted_Preview.png](../product/assets/exercise-icons/Overload_Icons_v0.9_Extracted_Preview.png) | B | 1 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/Overload_Weight_Badge_32.png](../product/assets/exercise-icons/Overload_Weight_Badge_32.png) | B | 1 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/Overload_Weight_Badge_OnePlate.svg](../product/assets/exercise-icons/Overload_Weight_Badge_OnePlate.svg) | B | 3 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/back.png](../product/assets/exercise-icons/back.png) | B | 0 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/chest.png](../product/assets/exercise-icons/chest.png) | B | 0 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/cycling.png](../product/assets/exercise-icons/cycling.png) | B | 0 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/legs.png](../product/assets/exercise-icons/legs.png) | B | 0 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/manifest.json](../product/assets/exercise-icons/manifest.json) | B | 2 | 추출 PNG 원본과 해시의 manifest를 보존 |
| [docs/product/assets/exercise-icons/running.png](../product/assets/exercise-icons/running.png) | B | 2 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/product/assets/exercise-icons/walking.png](../product/assets/exercise-icons/walking.png) | B | 0 | 시안·공식 아이콘과 추출 미리보기 자산을 보존 |
| [docs/tasks/evidence/task-004-browser-checks.json](evidence/task-004-browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-004-followup-browser-checks.json](evidence/task-004-followup-browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-004-followup-home.jpg](evidence/task-004-followup-home.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-followup-increase.jpg](evidence/task-004-followup-increase.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-history-browser-checks.json](evidence/task-004-history-browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-004-history-events.jpg](evidence/task-004-history-events.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-history-review.jpg](evidence/task-004-history-review.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-history-storage-checks.json](evidence/task-004-history-storage-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-004-history-weight-input.jpg](evidence/task-004-history-weight-input.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-mobile.jpg](evidence/task-004-mobile.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-polish-browser-checks.json](evidence/task-004-polish-browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-004-polish-reps-375.jpg](evidence/task-004-polish-reps-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-polish-rest-reps.jpg](evidence/task-004-polish-rest-reps.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-progression-browser-checks.json](evidence/task-004-progression-browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-004-progression-editor.jpg](evidence/task-004-progression-editor.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-progression-reminder.jpg](evidence/task-004-progression-reminder.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-rest-warning-375.jpg](evidence/task-004-rest-warning-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-004-rest-warning-browser-checks.json](evidence/task-004-rest-warning-browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-005-cardio-browser-checks.json](evidence/task-005-cardio-browser-checks.json) | C | 0 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-005-cardio-mixed-history.jpg](evidence/task-005-cardio-mixed-history.jpg) | C | 0 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-005-cardio-running-375.jpg](evidence/task-005-cardio-running-375.jpg) | C | 0 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-0055-browser-checks.json](evidence/task-0055-browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-0055-entry-375.jpg](evidence/task-0055-entry-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-0055-layout-checks.json](evidence/task-0055-layout-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-0055-logout-390.jpg](evidence/task-0055-logout-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-0055-settings-390.jpg](evidence/task-0055-settings-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-0055-workout-expired-390.jpg](evidence/task-0055-workout-expired-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-code-390.jpg](evidence/task-007-1d-1-code-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-connection-390.jpg](evidence/task-007-1d-1-connection-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-desktop-1440.jpg](evidence/task-007-1d-1-desktop-1440.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-entry-375.jpg](evidence/task-007-1d-1-entry-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-google-failed-390.jpg](evidence/task-007-1d-1-google-failed-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-layout-checks.json](evidence/task-007-1d-1-layout-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-1-live/connection-390.png](evidence/task-007-1d-1-live/connection-390.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-live/layout-checks.json](evidence/task-007-1d-1-live/layout-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-1-live/live-checks.json](evidence/task-007-1d-1-live/live-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-1-live/login-1440.png](evidence/task-007-1d-1-live/login-1440.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-live/login-320.png](evidence/task-007-1d-1-live/login-320.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-live/login-375.png](evidence/task-007-1d-1-live/login-375.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-live/login-390.png](evidence/task-007-1d-1-live/login-390.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-1-signed-in-390.jpg](evidence/task-007-1d-1-signed-in-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a-live/connection-390.jpg](evidence/task-007-1d-2a-live/connection-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a-live/layout-checks.json](evidence/task-007-1d-2a-live/layout-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2a-live/live-checks.json](evidence/task-007-1d-2a-live/live-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2a-live/login-1440.jpg](evidence/task-007-1d-2a-live/login-1440.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a-live/login-320.jpg](evidence/task-007-1d-2a-live/login-320.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a-live/login-375.jpg](evidence/task-007-1d-2a-live/login-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a-live/login-390.jpg](evidence/task-007-1d-2a-live/login-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/account-1440.jpg](evidence/task-007-1d-2a/account-1440.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/account-320.jpg](evidence/task-007-1d-2a/account-320.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/account-375.jpg](evidence/task-007-1d-2a/account-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/account-390.jpg](evidence/task-007-1d-2a/account-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/account-error-390.jpg](evidence/task-007-1d-2a/account-error-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/account-mixed-390.jpg](evidence/task-007-1d-2a/account-mixed-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/browser-checks.json](evidence/task-007-1d-2a/browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2a/contact-candidate-390.jpg](evidence/task-007-1d-2a/contact-candidate-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/contact-registered-390.jpg](evidence/task-007-1d-2a/contact-registered-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/google-required-390.jpg](evidence/task-007-1d-2a/google-required-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/login-1440.jpg](evidence/task-007-1d-2a/login-1440.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/login-320.jpg](evidence/task-007-1d-2a/login-320.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/login-375.jpg](evidence/task-007-1d-2a/login-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/login-390.jpg](evidence/task-007-1d-2a/login-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/reauth-error-390.jpg](evidence/task-007-1d-2a/reauth-error-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/reauth-limited-390.jpg](evidence/task-007-1d-2a/reauth-limited-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2a/reauth-success-390.jpg](evidence/task-007-1d-2a/reauth-success-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b-fix-live/email-link-focus-checks.json](evidence/task-007-1d-2b-fix-live/email-link-focus-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2b-fix-live/live-checks.json](evidence/task-007-1d-2b-fix-live/live-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2b-fix/confirmed-1440.jpg](evidence/task-007-1d-2b-fix/confirmed-1440.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b-fix/confirmed-375.jpg](evidence/task-007-1d-2b-fix/confirmed-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b-fix/current-state-390.jpg](evidence/task-007-1d-2b-fix/current-state-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b-fix/isolated-checks.json](evidence/task-007-1d-2b-fix/isolated-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2b-fix/layout-checks.json](evidence/task-007-1d-2b-fix/layout-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2b-fix/uncertain-320.jpg](evidence/task-007-1d-2b-fix/uncertain-320.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b-live/live-checks.json](evidence/task-007-1d-2b-live/live-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2b/account-1440.jpg](evidence/task-007-1d-2b/account-1440.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/account-320.jpg](evidence/task-007-1d-2b/account-320.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/account-375.jpg](evidence/task-007-1d-2b/account-375.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/account-390.jpg](evidence/task-007-1d-2b/account-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/ambiguous-390.jpg](evidence/task-007-1d-2b/ambiguous-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/browser-checks.json](evidence/task-007-1d-2b/browser-checks.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-007-1d-2b/contact-required-390.jpg](evidence/task-007-1d-2b/contact-required-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/email-linked-390.jpg](evidence/task-007-1d-2b/email-linked-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/google-link-failed-390.jpg](evidence/task-007-1d-2b/google-link-failed-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/google-link-form-390.jpg](evidence/task-007-1d-2b/google-link-form-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/google-unlink-confirm-390.jpg](evidence/task-007-1d-2b/google-unlink-confirm-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/last-identity-390.jpg](evidence/task-007-1d-2b/last-identity-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/login-320.jpg](evidence/task-007-1d-2b/login-320.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/ownership-conflict-390.jpg](evidence/task-007-1d-2b/ownership-conflict-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/proof-required-390.jpg](evidence/task-007-1d-2b/proof-required-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/uncertain-390.jpg](evidence/task-007-1d-2b/uncertain-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/unlink-confirm-320.jpg](evidence/task-007-1d-2b/unlink-confirm-320.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-007-1d-2b/unlink-confirm-390.jpg](evidence/task-007-1d-2b/unlink-confirm-390.jpg) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1b/workout-generation-mismatch-390.png](evidence/task-008-1b/workout-generation-mismatch-390.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1b/workout-read-320.png](evidence/task-008-1b/workout-read-320.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1b/workout-read-390.png](evidence/task-008-1b/workout-read-390.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1b/workout-read-desktop.png](evidence/task-008-1b/workout-read-desktop.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1b/workout-rest-390.png](evidence/task-008-1b/workout-rest-390.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1b/workout-settings-missing-390.png](evidence/task-008-1b/workout-settings-missing-390.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1c/a-edited-top.png](evidence/task-008-1c/a-edited-top.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1c/a-relogin-rest.png](evidence/task-008-1c/a-relogin-rest.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1c/actual-account-settings.png](evidence/task-008-1c/actual-account-settings.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1c/actual-database-503.png](evidence/task-008-1c/actual-database-503.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1c/actual-http.json](evidence/task-008-1c/actual-http.json) | C | 1 | 당시 검증 결과·레이아웃 증거 JSON 보존 |
| [docs/tasks/evidence/task-008-1c/actual-revoked-session.png](evidence/task-008-1c/actual-revoked-session.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1c/actual-settings-missing.png](evidence/task-008-1c/actual-settings-missing.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1c/b-isolated-rest.png](evidence/task-008-1c/b-isolated-rest.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |
| [docs/tasks/evidence/task-008-1c/final-logout.png](evidence/task-008-1c/final-logout.png) | C | 1 | 당시 브라우저 화면 캡처 보존 |

</details>

### overload-server

<details>
<summary>문서 87개</summary>

| 경로 | 분류 | 참조 | 근거와 권장 처리 |
|---|---|---:|---|
| [AGENTS.md](../../../overload-server/AGENTS.md) | A | 4 | 공통 개발·승인 규칙과 작업별 기준 진입점을 유지 |
| [README.md](../../../overload-server/README.md) | B | 0 | 프로젝트 소개와 실행 방법을 유지. 현재 상태와 정책은 연결된 기준에서 확인 |
| [docs/api/approved-weight-growth.md](../../../overload-server/docs/api/approved-weight-growth.md) | A | 8 | Approved Weight Growth API — Phase 2C의 현재 기능별 계약 유지 |
| [docs/api/bodyweight-additional-load.md](../../../overload-server/docs/api/bodyweight-additional-load.md) | A | 11 | Bodyweight Additional Load — Phase 2E의 현재 기능별 계약 유지 |
| [docs/api/cardio-actual-measurements.md](../../../overload-server/docs/api/cardio-actual-measurements.md) | A | 11 | Actual Cardio Speed and Distance — Phase 2D의 현재 기능별 계약 유지 |
| [docs/api/deload-analysis.md](../../../overload-server/docs/api/deload-analysis.md) | A | 16 | 디로딩 분석 설정·epoch·확정 누적 API — G4의 현재 기능별 계약 유지 |
| [docs/api/deload-periods.md](../../../overload-server/docs/api/deload-periods.md) | A | 15 | G5 기간, 자격, 임시 계획, 소속 원본과 순환 복귀 HTTP 계약 |
| [docs/api/routine-management.md](../../../overload-server/docs/api/routine-management.md) | A | 15 | 루틴 관리 온라인 API — Task 009의 현재 기능별 계약 유지 |
| [docs/api/standard-exercise-catalog.md](../../../overload-server/docs/api/standard-exercise-catalog.md) | A | 8 | 표준 운동 카탈로그 조회 API — Backend 1단계의 현재 기능별 계약 유지 |
| [docs/api/statistics.md](../../../overload-server/docs/api/statistics.md) | A | 16 | Overview 현행 계약을 앞에 두고 제거된 2A GET은 별도 보관 |
| [docs/api/weekly-schedule.md](../../../overload-server/docs/api/weekly-schedule.md) | A | 25 | 프리셋 적용·순환·G3 날짜 근거 및 HTTP 계약 |
| [docs/api/workout-online-write.md](../../../overload-server/docs/api/workout-online-write.md) | A | 9 | 일반 온라인 휴식 설정과 개인 운동 접근 경계의 현재 기능별 계약 유지 |
| [docs/api/workout-sessions.md](../../../overload-server/docs/api/workout-sessions.md) | A | 28 | 운동 세션 API — Task 009 / 표준 운동 V17의 현재 기능별 계약 유지 |
| [docs/engineering/account-provisioning.md](../../../overload-server/docs/engineering/account-provisioning.md) | B | 5 | 계정 프로비저닝·운영 초기값 (Task 007-1B)의 전문 구현·운영 절차 참조 |
| [docs/engineering/backend.md](../../../overload-server/docs/engineering/backend.md) | A | 12 | Java·Spring·DB 규칙과 G4/G5 및 프리셋 최종 검증 상태 |
| [docs/engineering/email-identities.md](../../../overload-server/docs/engineering/email-identities.md) | B | 6 | EMAIL 로그인 수단과 이메일 소유 증명 — Task 007-1C-3B-3A의 전문 구현·운영 절차 참조 |
| [docs/engineering/email-otp.md](../../../overload-server/docs/engineering/email-otp.md) | B | 6 | 이메일 OTP 로그인·Resend (Task 007-1C-2)의 전문 구현·운영 절차 참조 |
| [docs/engineering/email-reauthentication.md](../../../overload-server/docs/engineering/email-reauthentication.md) | B | 5 | 계정 신원 조회·이메일 OTP 재인증 (Task 007-1C-3B-1)의 전문 구현·운영 절차 참조 |
| [docs/engineering/google-identities.md](../../../overload-server/docs/engineering/google-identities.md) | B | 6 | Google 로그인 수단 연결·해제 — Task 007-1C-3B-3B의 전문 구현·운영 절차 참조 |
| [docs/engineering/google-oidc.md](../../../overload-server/docs/engineering/google-oidc.md) | B | 9 | Google OIDC 로그인 (Task 007-1C-3A)의 전문 구현·운영 절차 참조 |
| [docs/engineering/google-reauthentication.md](../../../overload-server/docs/engineering/google-reauthentication.md) | B | 3 | Google OIDC 최근 재인증 — Task 007-1C-3B-2의 전문 구현·운영 절차 참조 |
| [docs/engineering/local-postgresql.md](../../../overload-server/docs/engineering/local-postgresql.md) | B | 4 | 로컬 PostgreSQL · Flyway의 전문 구현·운영 절차 참조 |
| [docs/engineering/reauthentication-email.md](../../../overload-server/docs/engineering/reauthentication-email.md) | B | 6 | 공통 대표 재인증 이메일 — Task 007-1C-3B 보완의 전문 구현·운영 절차 참조 |
| [docs/engineering/security-session.md](../../../overload-server/docs/engineering/security-session.md) | A | 7 | 보안·JDBC 세션 기반 (Task 007-1C-1)의 전문 구현·운영 절차 참조 |
| [docs/product/Overload_Deloading_Design_Specification_v1.1.md](../../../overload-server/docs/product/Overload_Deloading_Design_Specification_v1.1.md) | C | 1 | 디로딩 이전 합의·당시 시작/누적·UI를 버전 이력으로 보존 |
| [docs/product/Overload_Deloading_Design_Specification_v1.2.md](../../../overload-server/docs/product/Overload_Deloading_Design_Specification_v1.2.md) | C | 5 | 디로딩 이전 합의·당시 시작/누적·UI를 버전 이력으로 보존 |
| [docs/product/Overload_Deloading_Design_Specification_v1.3.md](../../../overload-server/docs/product/Overload_Deloading_Design_Specification_v1.3.md) | C | 3 | 디로딩 이전 합의·당시 시작/누적·UI를 버전 이력으로 보존 |
| [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.1.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.1.md) | C | 5 | 일반 통계 이전 합의·당시 집계와 일정 효력를 버전 이력으로 보존 |
| [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.2.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.2.md) | C | 1 | 일반 통계 이전 합의·당시 집계와 일정 효력를 버전 이력으로 보존 |
| [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.3.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.3.md) | C | 7 | 일반 통계 이전 합의·당시 집계와 일정 효력를 버전 이력으로 보존 |
| [docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md) | A | 15 | 일반 통계 제품 기준. 일정/순환과 HTTP는 별도 API 소유 |
| [docs/reference/bootstrap/backend.gitignore.txt](../../../overload-server/docs/reference/bootstrap/backend.gitignore.txt) | E | 0 | 초기 ignore 템플릿. 적용 규칙은 루트 .gitignore |
| [docs/tasks/deload-g4-1-report.md](../../../overload-server/docs/tasks/deload-g4-1-report.md) | C | 4 | G4-1 디로딩 분석 설정·epoch·API·DDL 구현의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/deload-g4-2-report.md](../../../overload-server/docs/tasks/deload-g4-2-report.md) | C | 3 | G4-2 공통 InitialPlan 운동 완료 판정 추출의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/deload-g4-3-report.md](../../../overload-server/docs/tasks/deload-g4-3-report.md) | C | 3 | G4-3 독립 운동 후보·주간 E/N 계산의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/deload-g4-4-report.md](../../../overload-server/docs/tasks/deload-g4-4-report.md) | C | 2 | G4-4 주간 확정·RESET/ADD·내부 누적의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/deload-g4-5-report.md](../../../overload-server/docs/tasks/deload-g4-5-report.md) | C | 2 | G4-5 과거 정정·후속 주 재계산의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/deload-g4-6-report.md](../../../overload-server/docs/tasks/deload-g4-6-report.md) | C | 2 | G4-6 디로딩 분석 조회 API 및 전체 통합 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/deload-g5-1-report.md](../../../overload-server/docs/tasks/deload-g5-1-report.md) | C | 3 | G5-1 디로딩 시작·최초 임시 계획 구현의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/deload-g5-2-report.md](../../../overload-server/docs/tasks/deload-g5-2-report.md) | C | 3 | G5-2 디로딩 운동 실행·기록·임시 계획 관리의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/deload-g5-3-report.md](../../../overload-server/docs/tasks/deload-g5-3-report.md) | C | 2 | G5-3 디로딩 완료·취소·자동 종료와 분석 재개의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/standard-exercise-catalog-backend-phase-1-report.md](../../../overload-server/docs/tasks/standard-exercise-catalog-backend-phase-1-report.md) | C | 1 | 표준 운동 카탈로그 — Backend 1단계 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/standard-exercise-catalog-backend-phase-2-report.md](../../../overload-server/docs/tasks/standard-exercise-catalog-backend-phase-2-report.md) | C | 1 | 표준 운동 카탈로그 — Backend 2단계 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/standard-exercise-catalog-design-analysis.md](../../../overload-server/docs/tasks/standard-exercise-catalog-design-analysis.md) | C | 2 | 표준 운동 카탈로그 최종 연결 설계 — Backend V15 / Frontend 5E의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/standard-exercise-catalog-dev-phase-4-report.md](../../../overload-server/docs/tasks/standard-exercise-catalog-dev-phase-4-report.md) | C | 9 | 표준 운동 카탈로그 — 4단계 개발 DB 적용·실제 앱 통합 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/statistics-deload-phase-0-1-report.md](../../../overload-server/docs/tasks/statistics-deload-phase-0-1-report.md) | C | 4 | 통계·추적 및 디로딩 — 0단계 조사 / 1단계 카탈로그 정비의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/statistics-tracking-phase-2a-report.md](../../../overload-server/docs/tasks/statistics-tracking-phase-2a-report.md) | C | 3 | 통계·추적 — 2A 실제 기록 읽기 집계와 화면의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/statistics-tracking-phase-2b-report.md](../../../overload-server/docs/tasks/statistics-tracking-phase-2b-report.md) | C | 3 | 통계·추적 — 2B 주간 일정·계획 이력·달성률의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/statistics-tracking-phase-2c-report.md](../../../overload-server/docs/tasks/statistics-tracking-phase-2c-report.md) | C | 3 | 통계·추적 — 2C 승인 중량 성장 추적의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/statistics-tracking-phase-2d-report.md](../../../overload-server/docs/tasks/statistics-tracking-phase-2d-report.md) | C | 4 | 통계·추적 — 2D 유산소 실제 속도·거리의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/statistics-tracking-phase-2e-report.md](../../../overload-server/docs/tasks/statistics-tracking-phase-2e-report.md) | C | 3 | 통계·추적 — 2E 맨몸 운동 명시적 추가 중량의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-006-integrated-design-v0.3.1.md](../../../overload-server/docs/tasks/task-006-integrated-design-v0.3.1.md) | A | 13 | Overload — Task 006 통합 설계 명세 v0.3.1 (최종 확정본)에서 후속 계약이 대체한 부분을 제외한 확정 정책 유지 |
| [docs/tasks/task-006-model-mapping-report.md](../../../overload-server/docs/tasks/task-006-model-mapping-report.md) | C | 1 | Task 006-A — TypeScript 모델과 PostgreSQL 논리 모델 대응 분석의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1a-validation-report.md](../../../overload-server/docs/tasks/task-007-1a-validation-report.md) | C | 0 | Task 007-1A 구현·검증 결과의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1b-validation-report.md](../../../overload-server/docs/tasks/task-007-1b-validation-report.md) | C | 0 | Task 007-1B 구현·검증 결과의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-1-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-1-validation-report.md) | C | 0 | Task 007-1C-1 구현·검증 결과의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-2-live-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-2-live-validation-report.md) | C | 0 | Task 007-1C-2-LIVE — Resend 실메일·OTP 로그인 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-2-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-2-validation-report.md) | C | 1 | Task 007-1C-2 구현 및 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3a-live-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3a-live-validation-report.md) | C | 3 | Task 007-1C-3A-LIVE — Google 실제 로그인 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3a-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3a-validation-report.md) | C | 2 | Task 007-1C-3A Google OIDC 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3b-1-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3b-1-validation-report.md) | C | 1 | Task 007-1C-3B-1 — 신원 조회·이메일 OTP 재인증 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3b-2-design-review.md](../../../overload-server/docs/tasks/task-007-1c-3b-2-design-review.md) | C | 0 | Task 007-1C-3B-2 — Google 재인증 설계 재검토의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3b-2-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3b-2-validation-report.md) | C | 2 | Task 007-1C-3B-2 — Google OIDC 최근 재인증 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3b-3a-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3b-3a-validation-report.md) | C | 0 | Task 007-1C-3B-3A — EMAIL 로그인 수단·이메일 소유 증명 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3b-3b-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3b-3b-validation-report.md) | C | 1 | Task 007-1C-3B-3B — Google 로그인 수단 연결·해제 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3b-common-email-live-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3b-common-email-live-validation-report.md) | C | 0 | Task 007-1C-3B-COMMON-EMAIL-LIVE 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3b-common-email-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3b-common-email-validation-report.md) | C | 3 | Task 007-1C-3B 보완 — 공통 대표 이메일 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-007-1c-3b-live-validation-report.md](../../../overload-server/docs/tasks/task-007-1c-3b-live-validation-report.md) | C | 0 | Task 007-1C-3B-LIVE — EMAIL·Google 로그인 수단 실제 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-008-0-domain-and-api-contract-v0.1.md](../../../overload-server/docs/tasks/task-008-0-domain-and-api-contract-v0.1.md) | C | 5 | 과거 운동 도메인 DTO·쓰기 후보. 휴식 조회는 현행 휴식 API에서 확인 |
| [docs/tasks/task-008-0-jpa-persistence-design.md](../../../overload-server/docs/tasks/task-008-0-jpa-persistence-design.md) | B | 5 | JPA/JDBC 혼용 근거 보존. 구 명령 쓰기와 개인 카탈로그 경로는 대체됨 |
| [docs/tasks/task-008-0c-jpa-jdbc-validation-report.md](../../../overload-server/docs/tasks/task-008-0c-jpa-jdbc-validation-report.md) | C | 3 | Task 008-0C — JPA/JDBC 런타임 호환성 검증의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-008-0d-common-api-contract-v0.1.md](../../../overload-server/docs/tasks/task-008-0d-common-api-contract-v0.1.md) | D | 4 | 공통 HTTP 합의·Request ID. 현행 Backend 9.7절과 중복 구간 통합 검토 |
| [docs/tasks/task-008-1a-workout-read-api-report.md](../../../overload-server/docs/tasks/task-008-1a-workout-read-api-report.md) | C | 3 | Task 008-1A — 운동 종목·휴식 설정 조회 API의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-dev-v15-rebuild-report.md](../../../overload-server/docs/tasks/task-009-dev-v15-rebuild-report.md) | C | 7 | Task 009 — 개인 개발 DB 초기화 및 V15 재구성의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-final-integration-report.md](../../../overload-server/docs/tasks/task-009-final-integration-report.md) | C | 1 | Task 009 — 최종 통합 검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-online-write-phase-1-report.md](../../../overload-server/docs/tasks/task-009-online-write-phase-1-report.md) | C | 0 | Task 009 — 일반 온라인 쓰기 API 1차 구현의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-phase-1-cleanup-report.md](../../../overload-server/docs/tasks/task-009-phase-1-cleanup-report.md) | C | 1 | Task 009 — 1차 구조 정리 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-redesign-v1.0.md](../../../overload-server/docs/tasks/task-009-redesign-v1.0.md) | A | 20 | Task 009 — 운동 쓰기·진행 세션·복구 설계 v1.0에서 후속 계약이 대체한 부분을 제외한 확정 정책 유지 |
| [docs/tasks/task-009-routine-management-report.md](../../../overload-server/docs/tasks/task-009-routine-management-report.md) | C | 0 | Task 009 — 루틴 관리 API 구현 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-session-phase-1-report.md](../../../overload-server/docs/tasks/task-009-session-phase-1-report.md) | C | 0 | Task 009 — 운동 세션 1단계 구현·검증 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-session-phase-2-report.md](../../../overload-server/docs/tasks/task-009-session-phase-2-report.md) | C | 0 | Task 009 — 운동 세션 2단계 구현 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-session-phase-3-report.md](../../../overload-server/docs/tasks/task-009-session-phase-3-report.md) | C | 0 | Task 009 — 운동 세션 3단계 구현 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-session-phase-4-report.md](../../../overload-server/docs/tasks/task-009-session-phase-4-report.md) | C | 0 | Task 009 — 종료 후 기록 정정·복구 4단계 구현 보고서의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/task-009-v10-local-application-report.md](../../../overload-server/docs/tasks/task-009-v10-local-application-report.md) | C | 2 | Task 009 — 개인 로컬 DB V8→V9→V10 실제 적용의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/weekly-schedule-g0-g1-report.md](../../../overload-server/docs/tasks/weekly-schedule-g0-g1-report.md) | C | 2 | 주간 루틴 정책 전환 — G0 계약 정리·G1 기존 보호 보완의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/weekly-schedule-immediate-application-analysis.md](../../../overload-server/docs/tasks/weekly-schedule-immediate-application-analysis.md) | C | 1 | 주간 루틴 즉시 변경·04시 자동 미수행 판정 영향 분석의 단계별 구현·제약·검증 근거 보존 |
| [docs/tasks/weekly-schedule-immediate-implementation-plan.md](../../../overload-server/docs/tasks/weekly-schedule-immediate-implementation-plan.md) | D | 2 | G0~G6 작업 순서와 승인 배경. 현행 절차와 혼동 방지 후 보관 |

</details>

<details>
<summary>자산·증거·SQL 2개</summary>

| 경로 | 분류 | 참조 | 근거와 권장 처리 |
|---|---|---:|---|
| [docs/dev-data/standard-exercise-catalog-quality-audit.sql](../../../overload-server/docs/dev-data/standard-exercise-catalog-quality-audit.sql) | B | 1 | 운영 분류 품질 검토용 SQL. 결과·정책과 구분 |
| [docs/dev-data/standard-exercise-catalog.sql](../../../overload-server/docs/dev-data/standard-exercise-catalog.sql) | B | 2 | 표준 카탈로그 개발 seed SQL. 개발 절차 참조용 |

</details>
