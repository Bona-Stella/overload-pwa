# FRONT 18 · 7-A 초기값·확정값·미확정 상태 통합 분석

2026-11-28 KST · FRONT `d79f3e1` · BACKEND `5a12b1c`

## 결과와 기준

운영 화면·하위 흐름 20개와 공통 숫자 조작을 조사해 70개 사용처를 확인했다. 우선 수정점은 이전 반복 및 루틴 평균의 확정 처리, 유산소 선택값의 0 표시, 동일값 확인과 외부 취소의 결합, 기록 정정에서 변경한 수치의 색이다. 기존 API로 이 범위를 적용할 수 있다. 과거 실측 기반 유산소 초기값을 어떤 조작에서 현재 수행으로 인정할지와 종목별 과거값을 전체 상세 조회에 의존하지 않고 공급하는 범위는 별도 판단이 필요하다. 전체 사용처와 확인 수준은 [현황표](front-18-7-a-value-state-inventory.md)에 있다.

| 분류 | A 일치 | B 색·문구 | C 초기값 | D 확정·취소 | E 필수·NULL | F 비동기 | G 유지·예외 | H BACKEND | I 판단·검증 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 사용처 | 47 | 34 | 9 | 39 | 22 | 9 | 47 | 8 | 9 |

복수 분류다. 한 사용처에서 정상 저장을 보존하면서 표시를 바꾸는 경우 A와 B가 함께 붙는다. H는 서버 판단·계약과 이미 보류된 이슈에 걸치는 사용처 수다. I에는 같은 판단이 영향을 주는 여러 입력이 포함된다.

- FRONT와 BACKEND 모두 조사 시작 시 `main`과 로컬 추적 참조 `origin/main`이 일치했고, staged·unstaged·untracked가 없었다. FRONT 6-5는 소스 `45ce324`와 문서 `d79f3e1`에서 마감됐다. 당시 TypeScript·ESLint·758건 회귀·운영 및 4174 빌드와 실제 격리 계정 결과는 6-5의 기록으로 인용한다. [현행 현황](../engineering/frontend.md#front18-stage6)
- 첨부된 7-A 사용자 확정 정책을 값의 의미와 조작의 기준으로 사용하고 10.25·10.46, ST-19, 최신 UI 및 API 계약을 함께 적용했다. 코드와 기존 테스트의 차이는 구현 상태로 기록했다. [Decision Log](../product/Overload_UI_Decision_Log_v0.9.md#front18-stage6-decision) · [UI 동작](../product/ui-ux.md#front18-common-ux) · [Visual Theme](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#front18-number-visual) · [통계·추적 v1.4](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md#31-하루-종목-완료-기준)
- 제품 진입점과 숫자 휠·직접 입력·증감·슬라이더·기간 선택·완료·저장 호출부를 대조했다. 기존 6단계 정적 UI 재조사는 생략했다. 데모용 `RoutineEditor`·`CardioScreen`·`SettingsScreen`, 별도 Preview의 목표 심박·케이던스·휴식 4구간은 현행 제품 데이터 입력 집계에서 제외했다. 그 노출 경계는 현황표 10·60에 기록했다. [운영 진입점](../../src/main.tsx) · [검수 분기](../../vite.config.ts) · [5단계 현황](../engineering/frontend.md#front-18--5단계-버튼입력-마감--2026-11-26)

## 현행 초기값 결정과 비교 기준

| 흐름 | 실제 결정 순서와 가공 | 7단계 변경 범위 |
| --- | --- | --- |
| 새 웨이트 루틴 | 시작 중량 빈 값, 본세트 3·최소 6·최대 10. 종목 교체는 본세트와 범위를 유지하고 조합이 바뀌면 중량을 비운다. 기존 루틴은 저장된 계획과 승인 중량을 그대로 읽는다. | 3·6·10은 시스템 초기값으로 표시한다. NEW의 시작 중량에는 10.25.6의 최근 실제값 및 기록 없음과 조회 실패의 구분이 필요하다. 기존 승인값에 우선 적용하지 않는다. |
| 진행 웨이트 중량 | IndexedDB에 있던 현재 진행값/세트 초안을 먼저 사용한다. 서버로 다시 구성하면 같은 세션의 최대 순번 완료 중량 → 최초 승인 중량 → 0이다. 세션에 새로 추가하거나 대체하면 0으로 시작한다. 과거 날짜의 세트 중량은 비교 자료로 읽히지만 진행 중량에 넣지 않는다. | 기존 저장·복원과 명시적으로 선택한 진행 중량을 보호한다. 미확정 첫 중량과 과거 유효 중량을 적용하는 지점을 도메인에서 정한다. 수행 중량을 승인값으로 간주하지 않는다. |
| 진행 웨이트 반복 | 낙관적 초안 → IndexedDB 초안 → 이전 매칭 세션의 **같은 순번**의 유효 정수 → 내부 공란이다. 같은 순번이 없으면 더 오래된 다른 세션의 동일 순번을 가져오지 않는다. 휠이 공란일 때 화면은 `Math.round((min+max)/2)`를 표시한다. 8~12는 10, 8~9는 9다. 유효 범위가 없으면 표시용 0이다. | 이전 실적과 루틴 평균을 동일한 초기 상태로 표시하고 유효 표시는 세트 완료 시 함께 확정한다. 필수 0은 화면에서만 쓰고 실제 반복 검증은 양의 정수를 유지한다. |
| 유산소 루틴·세션 목표 | 새 시간과 모든 목표는 빈 초안이다. 기존 목표는 정확한 저장 초·decimal 문자열을 복사한다. 운동 중 편집은 AppliedPlan만 변경한다. 활동 종류 교체는 호환되는 목표 초안을 유지한다. | 저장 계획은 흰색을 유지한다. 새 목표 시간의 0 표시와 선택값의 NULL 표현을 적용한다. 거리를 이유로 불변 원계획이나 기존 실제값을 재작성하지 않는다. |
| 유산소 실측 | 현재 타이머의 누적 활동시간, 보존된 초안 및 수동 값이 실제 입력의 원천이다. 과거 실적은 찾지 않는다. 거리 추정 ON이면 목표 거리에서 가져온 숫자를 로컬 초안에만 표시한다. 거리와 실측 시간으로 보이는 평균 속도는 확인용 계산이다. | 실제 시간과 명시 수동값을 우선하고 과거/목표는 미확정 후보와 출처를 분리한다. 기존 추정값을 자동 실적으로 확정하지 않으며 ST-19의 기록 비교와 출처 계약을 유지한다. |

[루틴 초안](../../src/features/workout-online/RoutineForm.tsx#L126) · [진행 초기화](../../src/features/workout-local/model.ts#L18) · [이전 반복 입력](../../src/features/workout-local/flow-data.ts#L22) · [평균](../../src/features/workout/reps.ts#L3) · [유산소 초안](../../src/features/workout-online/cardio-draft.ts#L18) · [실측/추정](../../src/features/workout-online/cardio-measurement.ts#L14)

**이전 세트와 공식 Benchmark는 독립이다.** 종료 목록을 받은 순서로 삭제되지 않은 FINISHED 상세를 조사한다. 표준 운동 ID와 실제 완료 세트의 제조사·부하 방식이 현재와 같은 첫 세션을 선택한다. 승인 중량 일치, 루틴 일치, 현재 중량 일치, 계획 수 충족은 이전 반복 선택의 조건에 없다. 같은 세션에 같은 조합·순번이 여러 번 존재하면 현재 `Map` 생성 순서의 뒤 항목이 이긴다. 공식 유효성·동률 규칙으로 이 동작을 일반화할 근거는 없다. Benchmark는 원배치·조합·승인/목표 및 평가 자격이 맞는 단일 기록의 첫 N개 평가 세트를 사용한다. 총 반복 내림차순, 종료 최신순, UUID 오름차순이다. [이전 기록](../../src/features/workout-local/flow-data.ts#L22) · [Benchmark](../../src/features/workout-online/reference-reminder.ts#L10) · [공식 결정](../product/Overload_UI_Decision_Log_v0.9.md#10252-benchmark-동점--정책-3-2)

**실제 추천 기능이 있다.** 종료 후 증량·감량 검토에서 BACKEND가 봉인한 `recommendedWeightKg`를 내려준다. 정규 웨이트에서 자격이 있는 경우 기준 중량에 장비별 5kg(원판·스택) 또는 2kg(기타)을 증감하고 하한을 0으로 적용한다. FRONT의 진행 중 잠정 권고는 별도 평가·Benchmark이며, 종료 검토의 저장값만 명시 승인할 수 있다. 기존 UI는 방향별 색과 승인 상태 표현을 사용한다. 7단계의 숫자 추천색 규격은 해당 기존 추천의 표시와 일반 입력을 구별하는 데 적용할 수 있다. 이전 반복·범위 평균·최근 실제 중량·목표 거리 유래 추정은 각각 입력 후보 또는 추정이며 추천 알고리즘을 추가할 근거가 없다. 디로딩의 분석 권고는 프로그램 상태로 숫자 초안과 분리한다. [서버 권고 생성](../../../overload-server/src/main/java/com/overload/overload_server/workoutsession/WorkoutReviewService.java#L56) · [종료 검토](../../src/features/workout-online/SavedWeightReview.tsx#L64) · [잠정 표시](../../src/features/workout-local/LocalWorkoutFlow.tsx#L365)

## 필수·선택과 숫자 조작

| 값 | 실제 저장 형식과 범위 | 현재 표시와 유지할 차이 |
| --- | --- | --- |
| 웨이트 실제·계획·승인 중량 | 필수 0 이상 decimal 문자열, 정수 최대 14자리·소수 6자리. 입력은 공백·후행 0을 정규화하고 반올림하지 않는다. | 저장 0kg는 유효하다. 신규 루틴 빈 중량과 서버 복원 0의 상태는 다르다. 승인 문맥은 수행 kg와 독립이다. |
| 세트 수·반복 목표·실제 반복 | 필수 JSON 정수 1~2147483647, min≤max. | 0은 수행·계획 저장 불가다. 20개 미완료 구간 렌더링은 큰 계획 수를 실제로 자르는 동작과 무관하다. |
| 맨몸 추가 중량 | 선택 decimal, 0 유효. 미입력 완료는 객체 생략, 정정에서 명시 제거는 `{additionalWeightKg:null}`. | 빈 값의 표현을 고쳐도 과거 미기록과 명시 0, 명시 제거 및 통계 계산을 유지한다. |
| 유산소 목표 | 시간 정수 초 1~86400 필수. 거리 0.001~1000 km, SPEED 0.1~100, PACE 0.1~120, 경사 0~50, 저항 1~100은 종류별 선택/null. | 거리·속도·경사는 0.0, 페이스는 0:00, 저항은 0으로 미설정을 표시한다. 유효 경사 0과 NULL은 별개다. 기존 거리·속도는 한 자리 표시, 페이스는 초 표시, 경사·저항 옵션은 각각 소수 한 자리·정수 격자다. 표시용 반올림에서 원시값을 복사해 저장하면 정밀도가 손실된다. |
| 유산소 실제 | 완료 활동 1~86400000 ms 필수, timerMs 원본 보존. 직접 거리 0.001~1000 km, 실제 속도 decimal 0 이상, 평균 심박 20~300 정수는 선택. 거리 계산 0은 유효하며 출처로 구분한다. | 수동 완료 정정은 정수 초, 종료 후 정정은 최대 소수 3자리 초를 ms로 정확 변환한다. 시간 0과 초안 표시 0을 구별한다. 평균 심박 미입력이 `0 BPM`으로 보이고, 실제 거리 공란에는 `미입력`이 보인다. |
| 일반 설정·OTP | 휴식 3개 정수 초 1~2147483647, 볼륨 0~100%와 시점은 기기별 설정, OTP는 6자리 문자열이다. | 저장 설정값·슬라이더·선택 버튼·OTP 전용 표현을 보존한다. 숫자로 보이는 날짜·기간 선택은 조회 필터다. |

[루틴 수치 계약](../../../overload-server/docs/api/routine-management.md#수치-계약--이번-사용자-승인으로-확정) · [세션 스냅샷](../../../overload-server/docs/api/workout-sessions.md#snapshot-정확한-요청-계약) · [추가 부하](../../../overload-server/docs/api/bodyweight-additional-load.md) · [유산소 실측](../../../overload-server/docs/api/cardio-actual-measurements.md) · [휴식](../../../overload-server/docs/api/workout-online-write.md) · [FRONT 파서](../../src/features/workout-online/validation.ts#L90)

- `NumberWheel`은 값 문자열과 `suggestion`·`pending`·`describeBlank`를 받는다. 값 출처나 확정 상태를 갖고 있지 않다. 최초 열기는 `wheelSeed → value → suggestion → start`의 순서로 휠만 만들고, 직접 입력은 별도 문자 초안으로 남는다. 기존 버튼은 `aria-label`이 숫자 이름을 대체하는 경로가 있고 `describeBlank`가 있는 경우만 값 또는 `미입력` 설명이 붙는다. 거리·시간 행은 값 노드와 수정 버튼이 분리되어 수정 버튼에서 값 상태 설명이 빠진다. [NumberWheel](../../src/components/NumberWheel.tsx#L12) · [행 렌더링](../../src/features/workout-flow/CardioValueRow.tsx#L8)
- `+`/ `−`는 부모 콜백을 즉시 호출한다. 휠 확인은 조작하지 않으면 기본으로 콜백 없이 닫히고, `confirmUnchanged`를 사용하는 진행 반복만 무조작 확인 시 시작값을 적용한다. 같은 플래그가 바깥 클릭 닫기를 제어한다. 직접 입력 확인이나 Enter는 검증 후 적용하지만 반복의 빈 직접 초안은 그대로 닫는다. `CardioNumberField`·BPM·바깥 시간 적용도 같은 값 콜백을 걸러낸다. 이 결합을 풀어야 동일값 확정과 원시값 보존, 필드별 닫기·취소 계약을 함께 충족할 수 있다. [확인 처리](../../src/components/NumberWheel.tsx#L116) · [시간 적용](../../src/features/workout-online/CardioTimeField.tsx#L12) · [유산소 수치](../../src/features/workout-online/CardioNumberField.tsx#L26)
- 공통 컴포넌트에는 값 표시 상태와 접근성 설명을 전달하고, 수치 조작은 값의 변경·확정·취소를 분리하는 방향이 적절하다. 도메인 부모가 유효성·출처·원시값 및 완료/저장을 관리한다. `--text-muted`(Onyx `#A9ADB7`), `--text-primary`(`#F0F1F4`), `--accent`(`#6C93C6`, 디로딩에서는 녹색으로 재정의), `--status-warning`(`#D6BC65`)이 있다. 가장 밝은 기본 단색 표면 `--surface-input` 대비는 회색 6.58:1, 흰색 13.08:1, 파랑 4.66:1, 노랑 7.91:1이다. 일반 accent를 그대로 쓰면 디로딩에서 추천이 녹색이 된다. 후속 구현에서는 숫자만 바꾸고 기존 글자·배경·테두리·배치를 사용한다. 초기/미입력/추천/변경 상태를 스크린리더 설명으로 전달한다. 그라데이션과 불투명도가 적용된 실제 조합의 대비는 적용 후 검증한다. [테마 토큰](../../src/app/theme.module.css) · [숫자 CSS](../../src/components/NumberWheel.module.css)

## 저장·늦은 응답·유산소 보호

- **웨이트.** 초안이 있는 경우 `state.drafts`와 IndexedDB가 history보다 우선한다. 완료 렌더링은 기존 사실을 사용한다. 다만 `onDraft`가 수정한 필드 하나와 당시의 다른 필드 값을 묶어 세트 초안 전체를 저장한다. 먼저 맨몸 추가 중량을 조작하면 당시 공란인 반복까지 보호되어 늦게 온 참고 반복이 표시되지 않을 수 있다. 조회 대기는 반복 조작을 잠그는 방식이라 사용자가 먼저 그 필드를 확정할 수 없다. 별개로 새로운 조회 세대 때문에 `pending`이 다시 true로 바뀌면 이미 열린 휠의 내부 `seed`는 유지되지만 부모 value/disabled가 바뀔 수 있고, 열린 Dialog에서 확인할 때 상태를 재검증하는 경계가 없다. 이 마지막 경우는 소스상 가능성이다. 현행의 세션·순번·계정 보호를 유지하면서 값 단위의 확정/편집 범위를 둘 필요가 있다. [입력 우선순위](../../src/features/workout-local/flow-data.ts#L49) · [초안 복사](../../src/features/workout-local/LocalWorkoutFlow.tsx#L462) · [초안 큐](../../src/features/workout-local/controller.ts#L162) · [휠 seed](../../src/components/NumberWheel.tsx#L29)
- **실제 저장.** 세트 완료는 현재 적용 계획·편집권·입력 검증을 거치고, 미저장 초안을 먼저 확정/보존한다. 이전 동일 순번이 실제 draft에 들어가면 별도 입력 없이 완료할 수 있으나, 루틴 평균은 화면에만 있어서 같은 경로에서 반복 입력 오류가 난다. IndexedDB 트랜잭션 후 완료와 휴식이 나타나며 이후 snapshot/FINISH ACK가 서버 저장을 확정한다. 취소는 완료의 값·문맥을 보존해 미완료로 돌아가고 서버 존재 여부에 따라 tombstone을 보낸다. 진행 중 값의 출처 표시는 전송 스냅샷, 고정 재전송 원문, 원계획/승인 사실의 변경을 요구하지 않는다. [세트 완료](../../src/features/workout-local/LocalWorkoutFlow.tsx#L308) · [미저장 보호](../../src/features/workout-local/controller.ts#L194) · [취소](../../src/features/workout-local/model.ts#L166) · [로컬 계약](../engineering/frontend.md#12-진행-운동의-로컬-보호-및-복원)
- **유산소.** 실제 timerMs와 수동 activeMs를 분리하며, 기존 설정 ON의 목표 거리 유래 `estimated`는 완료에 실적으로 들어가지 않는다. 현재 코드에서 명시 수동 거리와 심박·속도는 노란색이고, 수동 시간은 자동값에서 달라졌을 때 노란색이다. 직접 입력을 같은 추정 거리로 확인해도 부모가 동일 숫자를 걸러 출처가 수동으로 바뀌지 않는다. `CALCULATED`는 실제 속도×활동시간을 소수 6자리 HALF_UP으로 계산한다. 계산을 확인용으로 보이는 평균 속도는 기본 저장값이 아니다. 자동 거리·속도·심박 센서 연결도 확인되지 않았다. 기존 추정이 보이는 상태에서 새 초기값을 추가할 경우 표시와 저장 출처를 분리해야 한다. [실측 표시](../../src/features/workout-online/CardioActualFields.tsx#L16) · [완료 검증](../../src/features/workout-local/completion-input.ts#L26) · [계산/출처](../../src/features/workout-online/cardio-measurement.ts#L31)
- **정정.** 웨이트 중량·반복·맨몸 부하는 원본과 달라져도 일반 색이다. 유산소의 거리·속도·심박은 초안과 원본 값을 비교하지만, 활동 시간은 `corrected`만 색으로 쓰므로 이미 정정돼 저장된 시간도 이번 편집에서 바꾸기 전부터 노란색이다. 또한 저장된 출처 미확인 거리를 변경했다 원 숫자로 복귀하면 색은 원복되나 `distanceSource=manual`이 남을 수 있다. 유효 정규값과 시각 표시에 쓰는 변경 여부를 따로 비교하고, 출처 태그와 의미 있는 감사 이력을 보존한다. 변경 없는 제출이 기록 변경으로 남지 않도록 원본과 정규 요청을 대조한다. [정정 초안·직렬화](../../src/features/workout-online/ClosedWorkout.tsx#L296) · [정정 시간](../../src/features/workout-online/ClosedWorkout.tsx#L362) · [서버 정정 계약](../../../overload-server/docs/api/workout-sessions.md#선택-수행-정정삭제)

## FRONT와 BACKEND 책임 및 후속 범위

| 구분 | 현재 책임과 후속 수정 범위 |
| --- | --- |
| BACKEND 조회 | `GET /api/v1/workout-sessions/closed`는 본인·현재 세대의 FINISHED/AUTO_CLOSED 메타만 내려준다. 기본 20, 최대 50, `closedAt DESC → UUID DESC` 커서 순서다. `GET /api/v1/workout-sessions/{id}`는 현재 유효 실제 수행과 저장된 계획/승인 문맥을 내려준다. 초기값·루틴 평균·조합별 최신 실적 전용 결과는 제공하지 않는다. 공식 평가와 종료 후 권고는 assessment/progress-assessment/weight-review의 별개 책임이다. |
| FRONT 조회·가공 | START 준비·재시도·ACTIVE에서 history를 시작하고, 6-E는 다음 페이지를 미리 조회하면서 상세를 최대 4개씩 병렬 요청하고 목록 순서대로 공개한다. 삭제와 AUTO_CLOSED를 제외한다. 최신 상세가 실패하면 더 오래된 결과를 이전으로 건너뛰어 제시하지 않는다. 공유 cache/in-flight는 API 인스턴스, 사용자·세대·기록 ID·version·상태를 키로 사용하며 독립 취소를 지원한다. 적용 계산, 범위 평균, 수치 표현, 거리/속도 표시 계산의 일부는 FRONT다. |
| 현재 비효율 | 처음 필요한 매칭 기록을 확보한 뒤에도 전체 페이지의 전체 상세를 읽는다. 조합별 반복 조회와 별개로 동종 루틴 Benchmark 평가를 위해 전체 상세 완료 후 해당 루틴·assessment 요청이 따라온다. 같은 상세 GET 일부는 캐시가 공유하지만 목록 페이지와 별도 평가 요청은 그대로다. 새 입력마다 이 조회를 복제하지 않는다. |
| 공통 수정 | `NumberWheel`·`DurationWheel`·`KgWheel/WeightWheelFields` 및 유산소 행에 상태와 접근성 값 설명을 전달한다. 동일값 확인을 바깥 클릭과 분리하고 기존 원시 값에 기반해 처리한다. 유효성 검증과 출처 전환은 필드 계약에 둔다. 기존 옵션 최대 DOM·스냅·키보드·초점 복귀를 유지한다. |
| 개별 수정 | 루틴 NEW 및 운동 추가·교체·복원 경로의 후보 규칙, 웨이트 실시간 draft/완료, CardioPlan/Actual의 빈 값과 출처, 정정의 실제 diff/원복, 기존 추천 중량의 표현을 적용한다. 설정·로그인·읽기 기록에는 현재 계약을 적용하고, 기존 정상 직접 입력·저장·버전·충돌·타이머·승인을 재사용한다. |
| 서버 일괄 개선 보류 | 10.25.6 최근 실제 중량의 정확한 조합/최신 유효 마지막 세트와 유산소 초기 후보에 필요한 데이터를 기존 상세로 검토할 수 있다. 정책에 맞는 값의 효율적 직접 제공 및 전체 이력 조회 비용은 BACKEND 일괄 검토 대상이다. 기존 계약으로 지원하지 않는 실제 페이스·경사·저항·심박 센서 출처·케이던스/추가 목표는 저장하지 않는다. ST-19에서 실제 거리 null을 미확인으로 처리하는 남은 양쪽 구현, 교체 원슬롯 완료 연결·NEW 서버 강제, 6-5 유산소 배치 삭제 409, 10.25.6 조합 메모 및 독립 집계는 기존 보류로 추적한다. |

[6-E 조회](../../src/features/workout-online/workout-history.ts) · [공유 캐시](../../src/features/workout-online/closed-record-read.ts) · [조합·평가 호출](../../src/features/workout-online/WorkoutWorkspace.tsx#L613) · [종료 목록 계약](../../../overload-server/docs/api/workout-sessions.md#종료-운동-목록--frontend-5d-최소-읽기-계약) · [6-5 보류](../engineering/frontend.md#front18-stage6)

## 추가 판단 및 집중 확인 항목

1. **과거값의 세부 매칭.** 반복은 확인된 최신 매칭 세션의 같은 순번 규칙을 기준으로 삼을 수 있다. 같은 조합이 한 세션에 중복 배치됐을 때와 최신 매칭 세션에 해당 순번이 없을 때의 선택, 10.25.6의 실제 종료 `endedAt`과 목록 `closedAt` 차이 및 마지막 세트·종료 동률은 추가 판단 지점이다. 유산소는 종류 외 표준 운동·활동 연결·장비의 비교 기준과 평균 대상·기간·단위를 현행 구현에서 확인할 수 없다. [정책 3-6](../product/Overload_UI_Decision_Log_v0.9.md#10256-최근-실제-중량과-조합-메모--정책-3-6)
2. **과거/목표 기반 실제 입력 후보의 수동 실적 확정.** 웨이트의 유효한 표시값은 완료 때 일괄 확정한다. 유산소는 기존 자동 추정의 저장 배제와 최신 ST-19가 있으므로, 완료 한 번으로 과거 거리·속도·심박 후보를 수동 실적으로 인정하는 범위와 기존 추정 토글의 표시 우선순위에 추가 판단이 필요하다. 개별 확인을 일반화할 이유는 없으며 실제 측정 우선은 확정 정책이다. 맨몸 추가 부하도 기존 명시 입력 계약이 과거/체중 자동 채움을 금지한다. 별도 초안 후보의 표시까지 허용하는 범위를 확인한다. [ST-19](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md#31-하루-종목-완료-기준) · [맨몸 추가 부하](../../../overload-server/docs/api/bodyweight-additional-load.md)
3. **속도/계산 거리 계약 불일치.** 서버는 유효 시간과 실제 속도만으로 거리를 계산할 수 있다. FRONT 실측 완료·정정은 빈 거리와 수동 속도 조합을 막는 경로가 있고, 기존 계산 거리의 시간을 바꾸면 재계산된 거리와 보존 초안의 차이로 제출이 막힐 수 있다. 기존 UI의 직접 거리 요구를 유지할 승인 근거와 새 정정 경로에서의 명시 제거·재계산 동작을 확인한다. 결론에 따라 FRONT 계약 정합화가 가능하며 신규 실측 항목을 추가하는 사유는 없다. [FRONT 저장 검증](../../src/features/workout-online/cardio-measurement.ts#L48) · [서버 계산](../../../overload-server/docs/api/cardio-actual-measurements.md#선택적인-수행-결과-확장)

## 이번 검증 범위

- **Mac 4174 실제 환경.** 앱 루트·Spring health·합성 Preview 주소가 200이었다. 전용 검수 Chrome 프로필에서 실제 검수 OTP 발급 202·검증 204와 루틴·휴식·카탈로그·세션 조회 200을 확인했다. 조회 당시 ACTIVE가 없었다. 새 웨이트 루틴에서 3·6·10 및 `입력`의 기본 색 `rgb(240,241,244)`, 무조작 휠 확인, 직접 입력 `21.234567` 취소, 재입력 후 증감 `22.234567`를 확인했다. AX에서 설정 중량 대화상자와 버튼 이름을 확인했다.
- **실제 유산소 루틴 초안.** 목표 시간 `00:00:00`, 거리·속도·경사 `0.0`, 페이스 `0:00`의 숫자 computed color는 해당 검수 화면에서 `rgb(240,241,244)`였다. 속도·경사 버튼은 AX에 `미입력` 설명이 붙고, 거리·시간 수정 버튼에는 설명이 없었다. 같은 목표 시간 적용과 빈 페이스의 휠 확인은 초안을 그대로 유지했다. 브라우저 조작은 저장 전까지다.
- **실제 휴식과 기록 정정.** 휴식의 서버값 180·120·90초가 흰색으로 열렸다. 0 입력 저장 시 `aria-invalid=true`가 설정되고 변경을 버리면 기존 설정 화면으로 돌아왔다. 실제 기록 정정에서 중량 90→92.5kg 변경 전후의 computed color가 같은 흰색이고, 취소로 대화상자가 닫혔다. 서버 데이터 쓰기는 발생하지 않았다.
- **합성 Preview.** 같은 4174의 별도 Preview에서 `추가 목표 설정`과 `미지원 목표 범위 · Preview`의 별도 노출을 DOM으로 확인했다. 실제 목표 저장이나 측정 지원의 근거로 사용하지 않았다.
- **집중 자동 테스트.** `workout-history`, `cardio-measurement`, `routine-contract`, `workout-local`, `workout-sync`, `workout-finish`에서 관련 29건을 골라 전부 통과했다. 최신 기록 순서·조회 실패/공유/취소, 정밀도와 0/null, 추정 제외, 초안 저장 실패·취소·재진입, 고정 snapshot과 응답 유실 정정 복구를 검증했다. 별도 파일 없이 기존 fixture를 사용한 10개 assertion으로 화면 전용 반복 평균, 중복·누락 순번, 다른 필드 변경 후 늦은 반복 차단, 추정 제외, 계산 거리 시간 변경 및 속도 단독 입력의 오류를 재현했다.
- 이번 4174 실제 세트 완료·루틴/운동/정정/휴식의 서버 저장과 운동 재진입, Safari·설치형 iPhone PWA 및 전체 빌드·회귀는 미실행이다. 6-E/6-5의 당시 격리 쓰기와 758건 결과는 [기존 마감](../engineering/frontend.md#front18-stage6)에 있다. 실제 사용자 운동·루틴·기록에는 쓰지 않았다. 4174는 기존 실행을 유지하고 조사에 사용한 전용 Chrome 프로필과 프로세스를 정리했다.
