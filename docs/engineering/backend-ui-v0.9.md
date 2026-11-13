# Overload UI v0.9 — 백엔드 연동 설계

**역할 · G6 PWA 연동 보조 지침.** 화면은 [UI/UX 적용 지점](../product/ui-ux.md), 도메인은 [디로딩 v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md), HTTP는 아래 서버 계약을 적용한다. G4/G5 Backend와 일반 계정의 다중 프리셋 경로는 구현됐다. G6 전체 PWA 연동, 실제 DB 적용과 혼재 기록의 실기기 검증은 후속이다.

## 확인한 계약과 적용 범위

| 영역 | 기존 구조 그대로 사용 가능 | 수정 또는 추가 검토 |
|---|---|---|
| 루틴·주간 일정 | [루틴 관리](../../../overload-server/docs/api/routine-management.md)와 [다중 프리셋 API](../../../overload-server/docs/api/weekly-schedule.md)가 현재 서버 계약이다. 과거 적용 근거는 내부 이력과 overview에서 읽는다. | T02의 계정 경로는 V30·V31 프리셋 계약을 사용한다. 디로딩 임시 일정·원본과 일반 일정은 분리한다. |
| 세션·기록 | `WorkoutSessionController`의 START, ACTIVE/상세/종료 목록, snapshot, FINISH, takeover, 종료 후 정정·논리 삭제·선택 복구·평가·변경 이력. `InitialPlan`과 `AppliedPlan`, 완료 세트 장비·부하 방식, 유산소 실제값을 제공한다. | 디로딩 START와 세션 소속은 서버 계약을 따른다. G6에서 기간별 조회와 혼재 세션 검증기를 연결한다. |
| 볼륨·카탈로그 | V17 표준 운동 ID와 장비 원본, V18 `joint_type` 및 PRIMARY/SECONDARY 링크, V21 유산소 실제 측정과 V22 `bodyweightLoad`. 기존 세션 상세의 실제 수행값과 계획으로 일반 운동 요약·상세 볼륨 UI를 구성한다. | 공식 볼륨과 동일한 산식으로 파생한다. 일반 운동은 summary-data의 BigInt 소수 표시 계산을 사용하며, 별도 저장 볼륨 컬럼을 전제로 삼지 않는다. 6종 대표 아이콘 매핑과 운영 카탈로그 분류를 확인한다. |
| 통계·성장 | `StatisticsController`의 `/api/v1/statistics/overview`와 `/api/v1/statistics/growth/exercises` 및 배치별 조회. 전체·종목·대분류·세부 근육과 역할별 집계, 기간별 실제 수행 및 계획 근거, 승인 사건을 재사용한다. | 그래프 필터에 대응하는 날짜별 종목·근육 집계 및 제조사별 참고 통계는 현재 응답의 제공 범위를 넘는다. 추가 조회 또는 응답 확장을 검토한다. 디로딩 연결 뒤 전체 실적 집계와 해당 기간만 조회하는 화면을 구분하고, 일반 계획 달성·유효 주수 및 승인 경로에는 일반 실적만 적용한다. |
| 설정 | `GET/PATCH /api/v1/workout-settings`로 고정된 세 휴식 시간(초)을 읽고 한 번에 변경할 수 있다. 로그인 세션과 CSRF 계약을 유지한다. | 분석 설정과 추천 누적은 기존 휴식 API와 분리한다. 홈의 분석 조회는 연결했다. 분석 설정 쓰기와 별도 기간 자격 조회는 G6에서 연결한다. |

나머지 계약은 [세션](../../../overload-server/docs/api/workout-sessions.md)·[카탈로그](../../../overload-server/docs/api/standard-exercise-catalog.md)·[통계](../../../overload-server/docs/api/statistics.md)·[성장](../../../overload-server/docs/api/approved-weight-growth.md)·[휴식 설정](../../../overload-server/docs/api/workout-online-write.md)을 확인한다. 구현·DB 적용·실기기 경계는 [Frontend 8.7절](frontend.md#87-v09-적용-범위와-구현-상태)과 [Backend 12.4~12.5절](../../../overload-server/docs/engineering/backend.md#124-ui-v09와-디로딩-v17-연동)에 있다.

## 표준 운동 사용자 UI의 V35 연결 경계

- 설정의 일반 검색은 `/catalog` 목록을 소비한다. 웨이트·유산소 신규 선택은 각각 `/search-data`와 `/cardio-choices`를 소비한다. 신규 유산소 선택은 표준 운동 UUID와 기록 설정 `activityId`를 모두 유지한다. 기존 루틴·세션 재개는 저장된 참조를 사용한다.
- CATALOG-02는 인증 전송 허용 목록의 UUID 상세 GET을 사용한다. 선택 UUID와 응답을 검증하고, 정렬된 PRIMARY·SECONDARY와 `instructionSteps`를 표시한다. 일반 조회와 루틴 추가 가능 여부는 독립적이다.
- 공개 상세 응답에는 보호 GIF 경로가 없다. V35 내부 검토에서는 검토 전용 매핑으로 하이 로우 한 종목을 동일 출처의 보호 전송에 연결했다. 정식 제공용 경로 전달은 후속 계약이다. 일반 정보와 GIF 상태를 독립적으로 처리하며 보호 미디어는 오프라인 캐시에서 제외한다. [내부 검토와 배포 경계](../../../overload-server/docs/api/standard-exercise-catalog.md#보호-gif-전송과-ui-계약)
- 근육 통계는 `contributionSets`와 `groupActuals`를 소비한다. 현행 유산소 통계 화면은 `cardioByKind`를 사용하며, Backend의 `cardioByCategory`는 화면에 아직 연결하지 않았다. [표준 운동 인수인계](../../../overload-server/docs/engineering/standard-exercise-handoff.md#다음-작업인-사용자-ui-연결)

<a id="t02-b-현재-api-소비"></a>

## HOME·ROUTINE의 현재 API 소비

[프리셋 API](../../../overload-server/docs/api/weekly-schedule.md)의 루트 GET은 쿼리 없이 전체 상태를 반환한다. 과거 적용 근거는 내부 이력과 통계 overview에서 읽는다. 시간대 쿼리·루트 PUT·공개 이력 GET은 T02-B 당시 단일 일정 경로다.

- [WeeklyScheduleApi](../../src/features/statistics/weekly-schedule.ts)는 `POST /presets`, `DELETE /presets/{id}`, `PUT /active`, `PUT /rotation`, `PUT /presets/{id}/assignments`, V31 `PUT /presets/{id}/name`을 공통 접두어 아래 호출한다. 순환 쓰기에 포함 여부와 전체 순서를 전달한다. 루틴 CRUD와 요일 배정은 독립 요청이다.
- 기존 인증 transport와 CSRF를 사용한다. 세대와 `expectedStateVersion`, 대상별 쓰기의 `expectedPresetVersion`을 확인한다. [useTrainingSchedule](../../src/features/workout-online/useTrainingSchedule.ts)은 서버가 확인한 스냅샷을 HOME·ROUTINE에 공유한다. 번호 조회와 편집 초안은 로컬 UI 상태다. 충돌이나 저장 결과 불확실 시 재조회하고, 편집 입력은 유지한다. 충돌한 쓰기를 자동 재전송하거나 병합하지 않는다.
- 현재 디로딩 기간과 분석은 읽기 연결을 적용했다. 디로딩 ACTIVE·완료 당일에는 일반 일정·루틴 변경과 새 일반 START를 차단하며, 보호 상태를 확인하지 못하면 쓰기를 열지 않는다. 디로딩 상세·기간 변경·세션·혼재 기록과 동기화는 G6 범위다.
- 계정 앱은 인증된 서버 응답을 사용한다. 개발용 `/routine-preview`는 합성 데이터만 사용하고, 격리 실제 OTP 검토 경로와 분리한다. [검토·종료 기록](../../../overload-server/docs/engineering/test-environment.md#home-routine-검토-종료-기록)

## 디로딩 구현 요구사항

2026-11-07 정책 통합: [v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md)과 [실제 Backend 현황 분석](../tasks/deload-v17-backend-readiness-analysis.md)을 따른다. G0~G5-3 Backend와 G6 PWA 작업, 실제 DB 적용을 구분한다.

### 시작 자격과 누적 분석

- 시작 자격은 v1.7 DL-15/80~84의 네 조건을 사용한다. 현재 계획2일 이상 조건은 폐기했으며 서버가 인증 사용자·현재 세대, 계정 시간대 기준 오늘 제외 직전 7일의 일반 실제 수행과 이전 완료 이후 신규 수행, 오늘 실제 수행 및 활성 세션을 확인한다. 웨이트 실제 1세트나 양의 실제 유산소 활동 1건이 증거가 된다. 미리보기는 조회이며 시작 요청에서 최신 근거와 원본·일정 변경을 재검사한다. 일반 START와 디로딩 시작이 경합할 때 한쪽만 성립하도록 상태 검사·전이를 함께 보호한다.
- 서버가 보유한 최신 상태와 클라이언트에 남은 미동기화 원본의 범위가 다르다. 오늘의 미전송 수행을 배제하고 시작을 확정하거나, 최근 실제 수행을 업로드 날짜로 판단하지 않는다. 서버 ACTIVE와 접속 기기가 아는 원본을 보호하며 타 기기 미지 상태용 전역 잠금을 도입하지 않는다.
- 유효 주수는 DL-05~14를 적용한다. 현재 주간 일정의 유효 버전과 일반 세션의 `InitialPlan`, 현재 유효한 완료 세트·실제 유산소 목표 증거를 비교한다. 일반 주간 일정의 현재 적용과 기록 근거는 [주간 일정 계약](../../../overload-server/docs/api/weekly-schedule.md)을 따른다. G4가 디로딩 추천 누적을 제공한다. 일반 일정에는 구 설계의 다음 월요일 예약 문구를 적용하지 않는다. 하루 최대 1일, 주 최대 1주, 월~일 실제 일반 수행/확정MISS 날짜의 E/N, E≤1 RESET·E>1 ADD, 다음 월요일04시 이후 검사 완료 확정, OFF/재활성화, 디로딩 중 정지, 완료 후 0·무수행 취소 시 누적 보존을 적용한다. 완료 후 분석의 평가 날짜와 해당 주 분모는 DL-13과 [분석 재개 계약](../../../overload-server/docs/api/deload-analysis.md#g5-3-완료와-취소-후-분석-재개)을 따른다.
- 현재 통계의 종목 완료 판정은 재사용하되 ST-17~23의 예정 루틴 후보와 G4의 예정 외·휴식일 일반 세션 후보는 분리한다. 추천 분석의 활성 기간과 초기화 이력, 디로딩 제외·재개는 별도로 적용한다. 재동기화나 기록 정정·논리 삭제·복구 후 수행일을 기준으로 재계산하며, 확인 불가한 유산소 목표나 과거 일정을 임의로 채우지 않는다.

### 기간·임시 루틴·세션 소속

- 서버가 시작일, 기간과 방식, 진행·완료·취소와 종료 사유·날짜를 관리한다. 권장 7일은 안내 기준이고 10일차 종료가 자동 완료 경계다. 직접 완료는 고정 시간대 기준 다음 날, 무수행 취소는 성공 즉시 복귀한다. 자동 완료가 지연되면 ACTIVE 보호를 유지하고 서버가 실제 종료 처리한 뒤 복귀한다. 완전 휴식 정상 완료도 기간 이력을 남긴다. [기간 종료 계약](../../../overload-server/docs/api/deload-periods.md#완료취소자동-종료--g5-3)
- 생성은 원본 계획·배치와 승인 중량(없으면 초기 중량)을 참조한다. 임시 계획은 독립적으로 보존한다. 분할·세부 PRIMARY·다관절 정렬과 상한, 웨이트 중량 85%·장비별 내림·세트 50%·반복 보정, 유산소 속도 85%·시간 50% 및 배치 예외는 v1.7 4~8절(기존 v1.6 수치 보존)의 기준을 그대로 사용한다. 미분류는 `OTHER`와 구별한다. 완료한 날짜와 수행 원본은 고정하며, 8~10일차에는 기존 미수행 임시 루틴을 이동·수정할 수 있다. 전체 임시 루틴 삭제와 기간 취소는 별개다.
- 일반 보기의 선택값은 클라이언트의 탐색 상태다. 서버는 조회 탭과 관계없이 활성 디로딩 중 원본 루틴 및 일반 기록의 변경·삭제와 일반 운동 실행을 막아야 한다. 공통 계정·휴식 설정은 기존 권한에 따른다.
- 디로딩과 일반 운동에 하나의 활성 세션 제약을 공유한다. 수행 후 정정·논리 삭제가 일어나도 디로딩 취소·방식 변경을 막는 수행 사실을 보존한다. 활성 운동은 완료·취소·방식 변경이나 기간 경계에서 임의로 종료하지 않는다. 무수행 취소 세션을 정리할 때 다른 기기와 미전송 원본을 보호한다.

### 기록·평가·동기화

- 세트의 당시 제조사·부하 방식과 최초 계획·봉인 계획을 보존한다. 실제 수행만 이력 및 근육 통계에 포함한다. 일반 기록은 전체 실적을 조회할 수 있고 디로딩 전용 조회는 해당 기간에 연결된 기록으로 제한한다. 동일 세트는 대분류 안에서 중복 집계하지 않으며 PRIMARY와 SECONDARY를 분리한다.
- 웨이트는 실제 완료 세트의 kg×반복, BODYWEIGHT는 명시적 추가 중량만 사용한다. 유산소는 실제 활동 시간과 [거리 출처](../../../overload-server/docs/api/cardio-actual-measurements.md)를 보존하고 종류별로 표시한다. [맨몸 추가 부하](../../../overload-server/docs/api/bodyweight-additional-load.md)와 같은 규칙을 상세 UI와 통계에 적용한다.
- 디로딩은 일반 증량·유지·감량 평가, 승인 요청/해결, 공식 성장 사건을 생성하지 않도록 서버에서 차단한다. 세션 시작·스냅샷·종료·종료 후 정정/복구·승인 해결 경로에서 소속을 검사한다. 일반 승인 사건의 배치와 불변 원본은 유지하고, 디로딩 실제 수행을 승인 사건이나 성장선의 점으로 사용하지 않는다. 디로딩에서만 수행한 종목을 성장 검색 후보에 노출할지는 조회 계약에서 확정한다.
- 기존 IndexedDB DB3/schema2의 고정 START/snapshot/FINISH, UUID, `writerEpoch`·revision·ACK, 종료 후 `expectedVersion`과 tombstone을 보호한다. 24시간 세션 AUTO_CLOSED와 10일차 기간 자동 완료는 별개의 전이다. 늦은 전송·takeover·자동 완료가 겹쳐도 동일 세션의 소속과 확정 기록을 바꾸지 않고 기존 정정·선택 복구 경계를 유지한다.

## G6가 사용할 서버 계약

- [분석](../../../overload-server/docs/api/deload-analysis.md)은 GET과 설정 PUT을 제공한다. 추천과 미확정 상태는 서버 값으로 표시한다.
- [기간·임시 계획](../../../overload-server/docs/api/deload-periods.md)은 자격·옵션·미리보기·시작, 편집, 현재/이력, 완료·취소를 제공한다. [운동 세션](../../../overload-server/docs/api/workout-sessions.md#g5-2-디로딩-세션)은 디로딩 START와 기간별 조회, 공통 스냅샷·기록 보호를 제공한다.

### G6 실제 연동 선행조건

현재 PWA는 `InitialPlan.routineId`를 UUID로 검증하므로 혼재 세션 응답을 연결하기 전에 다음을 구현·검증한다. [세션 소속과 InitialPlan 계약](../../../overload-server/docs/api/workout-sessions.md#g5-2-디로딩-세션)

- 일반 세션은 원본 루틴 UUID를 유지한다. 디로딩 세션에서만 schemaVersion 2의 `routineId=null`을 허용하며, `deloadOrigin`의 기간·계획·버전·날짜·시간대·봉인 출처를 서버 계약대로 검증한다. 임시 계획은 디로딩 계획 API에서 다룬다.
- 공통 ACTIVE·상세·종료 목록에서 두 소속을 처리하고, 이어하기·기간별 조회·기록 정정·선택 복구 경로에서 원래 소속과 소유권을 유지한다. ACTIVE 운동의 종료·무수행 정리는 기간 전이와 분리하며 서버 상태와 ACK를 확인한다.
- 기존 DB3/schema2의 로컬 원본, 계정·세대·편집 권한, 고정 START/snapshot/FINISH 요청과 재전송 규칙을 보호한다. 미동기화 완료 수행이 남아 있으면 기간 시작·취소·종료 경합에서 그 원본을 먼저 확인한다. 혼재 응답의 검증이나 전송 실패 시에도 원본을 유지한다.

## 추가 결정과 검증

- **설계 출처.** 현재 화면은 [UI/UX 적용 지점](../product/ui-ux.md), 디로딩 정책과 수용 기준은 [v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md)을 적용한다. HTML의 예시 날짜·샘플 수치는 시연 자료다.
- **입력 경계.** v0.9의 반복 입력은 0 미만을 막도록 명시하고, 현재 UI/세션 쓰기는 새 완료에 양의 정수를 요구한다. 0회 초안 허용 여부를 확정할 때 새 완료 검증과 기존 기록 읽기를 구분한다. HTML 예시의 완료 세트 수를 계획 세트 분모로 재사용하지 않는다.
- **성장 검색.** v0.8의 별칭 검색 요구는 유지된다. 서버 성장 검색은 현재 표준명·수행 당시명·승인 당시명을 사용하며 카탈로그 별칭은 성장 검색 쿼리에 연결되어 있지 않다. 별칭을 추가해도 실제 수행 또는 승인 근거가 있는 종목으로 검색 범위를 제한한다.
- **집계 입력.** UI의 필터별 시계열/제조사별 세트·볼륨은 제공 범위를 검토한다. 복수 일반 세션이 있는 날의 추천 계산에는 기존 달성률의 최고 단일 세션 규칙을 재사용할 수 있는지 확인한다. 근육 대분류 합계를 세부 행의 단순 합으로 만들지 않는다. 목표 유산소를 실제 기록으로 채우지 않고, 확인된 일부 볼륨과 근거 없음은 구분한다.
- **기술 경계.** CHECK-04/05의 정수화·반복 보정, CHECK-06의 운영 분류, CHECK-07/09 및 DL-84의 시간대·서버/로컬 전이, 타 기기 미전송·중복 시작·ACK 유실·10일차 활성 세션 처리와 8일차 안내의 1회 범위를 검증한다. 현재 일정의 고정 IANA 시간대와 세션 시작 당시 시간대가 다를 수 있으므로 계정 로컬 날짜 판정에 사용할 기준과 변환을 확정한다. 자정과 뒤늦은 동기화에서 원래 수행 증거 및 완료일/복귀일을 보호한다.
- **수용 시나리오.** [v1.7 수용 테스트](../product/Overload_Deloading_Design_Specification_v1.7.md#12-핵심-수용-테스트-예상-결과)에 더해 일반/디로딩 혼재 계정의 세션 소유권, 서버 직접 쓰기 제한, 승인 사건 미발생, 취소 후 누적 보존, 완전 휴식 종료 이력, 실제 기록 정정·복구 후 통계를 통합 검증한다.

### 2026-11-07 디로딩 정책 표현 정정

초기 ON과 OFF→ON epoch, 시작 자격·누적 계산은 [제품 v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md)과 [G4 분석 API](../../../overload-server/docs/api/deload-analysis.md)를 적용한다.

## 일반 운동 연결 마감 — 2026-11-13

일반 START/ACTIVE/상세/snapshot/FINISH와 종료 기록 정정·복구·평가 UI는 실제 계정 경로에 연결됐다. ACTIVE progress-assessment는 잠정 안내, 종료 assessment의 weightReview는 화면 권고이며 공식 기준 자격을 바꾸지 않는다. [Frontend 구현 구조](frontend.md#일반-운동-실제-api-연결--2026-11-13), [마감·검증 기록](../tasks/ui-v09-workout-api-integration.md#최종-마감--2026-11-13)을 따른다. 메모 서버 저장과 G6 혼재 세션·디로딩 전용 연동은 완료 범위 밖이다. 초기 설계 표의 가능/예정 표현을 현재 일반 운동 미구현으로 해석하지 않는다.
