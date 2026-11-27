# FRONT 18 · 7-A 전체 사용처 현황표

2026-11-28 KST · FRONT `d79f3e1` · BACKEND `5a12b1c`. 판정과 수정 경계는 [통합 분석](front-18-7-a-value-state-audit.md)에 있다.

**집계 기준**은 제품 경로의 화면·하위 흐름 20개와 공통 입력 1묶음이다. 같은 폼을 쓰더라도 생성·기존 설정·운동 중 계획·실측·정정에서 값의 의미나 저장 시점이 달라지면 각각 센다. 반복 렌더링되는 세트·루틴·통계 행은 한 번씩 세고, 승인된 예외·읽기 전용 비교·지원하지 않는 항목도 경계 확인용 사용처로 센다.

**분류** A 정책 일치 · B 색상·문구 · C 초기값 · D 확정·취소 · E 필수·NULL · F 비동기 보호 · G 승인 예외·유지 · H BACKEND·API · I 세부 판단·검증. 복수 표기를 허용한다. **확인 상태** `S` 소스·계약, `M` 4174 실제 앱·격리 Spring에서 읽기 또는 저장 전 조작, `T` 이번에 실행한 집중 fixture/자동 테스트, `P` 4174 합성 Preview. 실제 기기 iPhone은 전체 미검증이다. 행의 `M`은 해당 행의 저장 경로까지 확인했다는 뜻으로 사용하지 않는다.

## S01 루틴 생성

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | 새 웨이트 시작 중량 | 필수 decimal, 0 허용 | 빈 초안, 휠 시작 0 | 증감·직접 입력·변경 선택 후 루틴 저장 | 흰 `입력`, 빈 값 제출 실패 | B C D E H I | 최근 유효 중량, 미조회·없음 구분, 회색 0 | [RoutineForm](../../src/features/workout-online/RoutineForm.tsx#L277) · [newWeights](../../src/features/workout-online/routine-weights.ts#L7) | S M T |
| 02 | 새 웨이트 본세트 수 | 필수 정수 ≥1 | 3 | 휠 변경·직접 입력, 루틴 저장 | 흰 3, 저장 가능 | B D | 회색 기본 표시와 확정 분리 | [RoutineTargetFields](../../src/features/workout-online/RoutineForm.tsx#L38) | S M |
| 03 | 새 웨이트 최소 반복 | 필수 정수 ≥1 | 6 | 휠 변경·직접 입력, 루틴 저장 | 흰 6, min≤max 검증 | B D | 기본 표시와 확정 분리 | [RoutineForm](../../src/features/workout-online/RoutineForm.tsx#L38) · [newWeights](../../src/features/workout-online/routine-weights.ts#L9) | S M |
| 04 | 새 웨이트 최대 반복 | 필수 정수 ≥1 | 10 | 휠 변경·직접 입력, 루틴 저장 | 흰 10, min≤max 검증 | B D | 기본 표시와 확정 분리 | [RoutineForm](../../src/features/workout-online/RoutineForm.tsx#L277) | S M |
| 05 | 종목 추가·교체·장비 조합 | 시작 중량 필수, 장비 선택 | 새 종목의 기본 수치, 교체는 세트·반복 유지, 조합 변경 중량 공란 | 선택은 양식 초안, 기존 조합 변경은 NEW | 기존 승인값 복사 없이 새 시작 중량을 요구, 서버 EXISTING 장비 변경 경계 별도 | A C E H | NEW 보호와 입력 추천 분리, 최근 유효 조합 중량 근거 확보 | [RoutineForm](../../src/features/workout-online/RoutineForm.tsx#L254) · [교체](../../src/features/workout-online/RoutineForm.tsx#L277) | S |
| 06 | 새 유산소 목표 시간 | 필수 정수 초 1~86400 | 빈 초안 | 시간 부분 휠과 바깥 시간 적용, 루틴 저장 | 흰 `00:00:00`, 빈 상태와 0은 저장 거절 | B D | 회색 0과 확인 상태 분리, 유효성 유지 | [CardioTimeField](../../src/features/workout-online/CardioTimeField.tsx#L12) · [cardioPlan](../../src/features/workout-online/cardio-draft.ts#L108) | S M T |
| 07 | 새 유산소 목표 거리 | 선택 decimal 0.001~1000 km | 빈 초안 | 휠·직접 입력, 0 격자 선택은 제거 | 흰 `0.0 km`, 저장 null | B D E | 빈 `—`, 0 격자와 null 분리 및 접근성 설명 | [CardioNumberField](../../src/features/workout-online/CardioNumberField.tsx#L14) | S M T |
| 08 | 새 유산소 목표 속도·페이스 | 선택 decimal 속도 0.1~100, 페이스 0.1~120 | 빈 초안, 단위 SPEED | 각각 휠·직접 입력, 기존 값의 단위 선택은 즉시 환산 | `0.0`·`0:00`, AX 미입력, 저장 null | B D E | 빈 `—`와 원시 값 보존 | [CardioPlanFields](../../src/features/workout-online/CardioPlanFields.tsx#L26) · [페이스](../../src/features/workout-online/CardioPlanFields.tsx#L58) | S M |
| 09 | 새 유산소 목표 경사·저항 | 선택 decimal 경사 0~50, 저항 1~100 | 빈 초안 | 휠·직접 입력, 저항 0 선택은 빈 값 | `0.0`·`0`, 저장 null, 경사 명시 0 허용 | B D E | null과 유효 경사 0의 표기 및 선택 경로 구별 | [AdditionalGoal](../../src/features/workout-online/CardioPlanFields.tsx#L72) | S M(경사) |
| 10 | 목표 심박·케이던스, 루틴별 휴식 | 지원 필드 없음 | 없음 | 없음 | 심박·케이던스 범위는 Preview, 휴식은 계정 정책 | G H | 지원 범위 유지, 새 저장은 기존 보류 판단에 따름 | [CardioPlan 계약](../../../overload-server/docs/api/routine-management.md#수치-계약--이번-사용자-승인으로-확정) · [5단계 현황](../engineering/frontend.md#front-18--5단계-버튼입력-마감--2026-11-26) | S P(별도 영역 진입 확인) |

## S02 루틴 편집

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | 기존 웨이트 본세트·최소·최대 | 필수 정수 | 저장된 계획 | 변경 휠 또는 직접 입력, 루틴 저장 | 기존 흰 값, 정수 및 min≤max | A G | 그대로 유지, 공통 확인 계약만 공유 | [RoutineForm](../../src/features/workout-online/RoutineForm.tsx#L126) | S |
| 12 | 기존 승인 중량·다음 승인 입력 | 필수 decimal 0 허용 | 현재 승인 중량 | 승인값과 달라지면 별도 확인 후 저장 | 흰 일반 편집, 원값이면 승인 요청 제거, 루틴 version | A G | 명시 승인·원복·정밀도 유지 | [RoutineForm](../../src/features/workout-online/RoutineForm.tsx#L198) · [중량](../../src/features/workout-online/RoutineForm.tsx#L259) | S |
| 13 | 기존 유산소 목표 시간 | 필수 정수 초 | 저장 초 그대로 | 부분 휠 → 시간 적용 → 루틴 저장 | 원시 초 유지, 같은 값은 콜백 생략 | A D G | 정밀도와 원본 보존, 공통 동일값 확인만 연결 | [CardioTimeField](../../src/features/workout-online/CardioTimeField.tsx#L12) · [draftCardio](../../src/features/workout-online/cardio-draft.ts#L19) | S T |
| 14 | 기존 유산소 목표 거리 | 선택 decimal | 저장 km 또는 null→빈 초안 | 수정 휠·직접 입력·계획 저장 | 한 자리 표기, 원시 최대 6자리, null은 `0.0` | A B D E | 저장값 흰색, 빈 선택값만 회색 `—` | [CardioNumberField](../../src/features/workout-online/CardioNumberField.tsx#L14) | S T |
| 15 | 기존 유산소 목표 속도·페이스 | 선택 decimal | 저장 intensity 및 단위 | 직접·휠 또는 단위 전환, 루틴 저장 | 빈 값은 0처럼 표시, 편집 전 저장값 유지 | A B D E | 환산·범위·정밀도 보호 | [CardioPlanFields](../../src/features/workout-online/CardioPlanFields.tsx#L24) | S |
| 16 | 기존 유산소 목표 경사·저항 | 선택 decimal | 저장값 또는 null→빈 초안 | 직접·휠, 루틴 저장 | 경사 한 자리와 저항 정수 표시, null과 0 유사 | A B D E | 표시 격자와 원시 값을 구별 | [AdditionalGoal](../../src/features/workout-online/CardioPlanFields.tsx#L72) | S |
| 17 | 기존 배치 교체·복원 | 필수·선택은 각 계획 계약 | 호환 목표 유지, 제거된 배치의 실제 저장 계획·승인값 복원 | NEW/EXISTING/RESTORE로 저장 | 웨이트 교체는 새 조합, 유산소는 종류 부적합 값 제거, 기존 삭제 409 경계 | A G H | 교체 직전 값과 저장 복원 신뢰, 기존 서버 보류 분리 | [RoutineForm](../../src/features/workout-online/RoutineForm.tsx#L145) · [복원](../../src/features/workout-online/RoutineForm.tsx#L306) | S |

## S03 루틴 상세

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | 저장 중량·반복 목표·유산소 목표 | 읽기 전용 | 루틴 응답 | 해당 없음 | 계획·미설정 표기, 편집 초안 없음 | A G | 계획 표현 유지 | [RoutineDetail](../../src/features/workout-online/RoutineDetail.tsx) | S |

## S04 진행 웨이트

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 19 | 진행 중량·세트 중량 | 필수 decimal 0 허용 | 동일 세션 승인/복구 수행값·로컬 입력, 새 운동은 시작 승인값, 추가는 0 | 중량 변경 적용 또는 세트 완료 | 화면 잠금값 흰색, 저장은 실제 kg와 승인 문맥 분리 | B C F | 이전 유효값의 적용 범위와 사용자·복원값 우선 보존 | [createLocalWorkout](../../src/features/workout-local/model.ts#L18) · [completeSet](../../src/features/workout-local/model.ts#L141) | S T |
| 20 | 이번 반복 · 이전 동일 순번 | 필수 정수 ≥1 | 최신 매칭 세션의 해당 순번 → 입력 초안 | 조작 없이도 세트 완료 가능, 늦게 온 값은 초안이 없을 때 표시 | 기본 흰색, 출처 상태 없음 | B F I | 회색 출처·확정 및 필드별 늦은 응답 보호, 중복 순번 판단 | [flow-data](../../src/features/workout-local/flow-data.ts#L22) · [완료](../../src/features/workout-local/LocalWorkoutFlow.tsx#L308) | S T |
| 21 | 이번 반복 · 루틴 평균/참조 없음 | 필수 정수 ≥1 | `Math.round((min+max)/2)`, 범위 무효 시 표시 0 | 증감·휠 확인 필요, 표시값 그대로 완료하면 빈 초안 거절 | 회색 숫자·`(미정)`, 유효 평균은 표시 전용 | B C D E F | 유효 평균의 일괄 완료, 0 저장 거절, 대기 중 입력 보호 | [WeightFocus](../../src/features/workout-flow/WeightFocus.tsx#L106) · [평균](../../src/features/workout/reps.ts#L3) · [검증](../../src/features/workout-local/completion-input.ts#L16) | S T |
| 22 | 이전 세트·Benchmark·비교 없음 안내 | 읽기 전용 | 이전 매칭 세트와 별도 평가 API | 해당 없음 | 이전 반복/대시와 비교 설명, Benchmark 독립 기준 | A G | 과거 사실·공식 비교 기준과 입력 후보 분리 | [WeightFocus](../../src/features/workout-flow/WeightFocus.tsx#L51) · [Benchmark](../../src/features/workout-online/reference-reminder.ts#L10) | S T |
| 23 | 맨몸 추가 중량 | 선택 decimal 0 허용 | 빈 초안, 복원된 직접 입력 | 증감·직접·휠 후 세트 완료 | `입력`, 빈 값은 객체 생략, 0은 기록 | B D E G I | `—` 전환, 실제 추가 부하의 명시 입력 계약 유지 범위 확인 | [WeightFocus](../../src/features/workout-flow/WeightFocus.tsx#L110) · [추가 부하 계약](../../../overload-server/docs/api/bodyweight-additional-load.md) | S T |
| 24 | 세트 추가·제외, 종목 추가·교체 | 계획 세트·반복 필수 | 기존 계획 또는 새 3/6/10, 추가 중량 0; 편집한 반복 목표 입력은 없음 | 명시 버튼·선택 후 AppliedPlan 변경 | 세트 수 상한·완료 이력·불변 InitialPlan 보호 | A C F G H | 새 ID·순번별 초기값 재평가, 원슬롯 서버 보류 유지 | [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx#L462) · [model](../../src/features/workout-local/model.ts#L213) | S |
| 25 | 세트 완료·완료 취소·휴식 연장 | 완료는 유효 수치, 휴식은 동작 | 확정 스냅샷과 복원 초안 | 완료는 로컬 커밋, 취소 확인, 휴식 +30초 | 초안·사실·tombstone 분리, 휴식 앵커만 변경 | A D G | 원자적 완료·취소 유지, 유효 표시 초기값 확정 경계 추가 | [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx#L267) · [model](../../src/features/workout-local/model.ts#L166) | S T |

## S05 진행 중량 변경 모달

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 26 | 오늘만 변경 중량 | 필수 decimal 0 허용 | 현재 진행 중량 | 휠→바깥 확인 | 흰색, 미완료 세트만 갱신, TODAY_ONLY | A D G | 오늘만 적용 및 완료 세트 보호 | [WeightChange](../../src/features/workout-flow/WorkoutDialogs.tsx#L33) · [changeWeight](../../src/features/workout-local/model.ts#L180) | S |
| 27 | 진행 중량 승인 요청 | 필수 decimal 0 허용 | 현재 진행 중량, 승인값 읽기 전용 | 진행 중량 변경 선택 후 명시 확인 | 요청 ID·버전·순서 고정, 승인과 실제값 분리 | A D G | 일반 입력 흰색과 명시 승인 경계 유지 | [WeightChange](../../src/features/workout-flow/WorkoutDialogs.tsx#L33) · [changeWeight](../../src/features/workout-local/model.ts#L184) | S T |

## S06 세션 유산소 계획 편집

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 28 | 계획 목표 시간·세션 유산소 추가 | 필수 정수 초 | 기존 AppliedPlan 또는 신규 빈 값 | 내부 시간 적용 후 계획 저장 | 흰 0 시간·빈 저장 거절, 저장은 AppliedPlan | B D G | 새 빈 상태 구분, 기존 시각과 최초 계획 보호 | [SessionCardioPlan](../../src/features/workout-flow/WorkoutDialogs.tsx#L131) · [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx#L585) | S T |
| 29 | 계획 목표 거리 | 선택 decimal | 기존 AppliedPlan 또는 빈 값 | 수정 휠·계획 저장 | 빈 값 `0.0`→null, 추정 사용 시 타이머 초안 재계산 가능 | B D E F | 공통 선택 표시, 추정과 입력 분리 | [CardioNumberField](../../src/features/workout-online/CardioNumberField.tsx#L14) · [updateCardioPlan](../../src/features/workout-local/model.ts#L234) | S T |
| 30 | 계획 목표 속도·페이스 | 선택 decimal | 기존 AppliedPlan 또는 빈 값 | 휠·직접·단위 선택 후 계획 저장 | 빈 값 0 표기, 실제 속도로 복사 안 함 | A B D E | 공통 선택 표시·정밀도 유지 | [CardioPlanFields](../../src/features/workout-online/CardioPlanFields.tsx#L24) | S T |
| 31 | 계획 목표 경사·저항 | 선택 decimal | 기존 AppliedPlan 또는 빈 값 | 휠·직접 후 계획 저장 | 경사 0과 미설정이 유사, 실제 측정 키 없음 | A B D E G | 공통 선택 표시, 목표/실측 경계 | [AdditionalGoal](../../src/features/workout-online/CardioPlanFields.tsx#L72) | S |
| 32 | 종목 교체·종류 전환 | 필수 시간과 종류별 선택 | 호환 목표 초안 | 시작 전 새 세션 활동 ID | 기존 실제/시작 데이터 보호, 원계획 유지 | A G | 종류별 초기화와 ID 범위 유지 | [selectCardio](../../src/features/workout-online/cardio-draft.ts#L85) · [replaceCardio](../../src/features/workout-local/model.ts#L252) | S T |

## S07 진행 유산소

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 33 | 당시 계획·거리·속도/페이스·경사/저항 | 읽기 전용 | AppliedPlan | 해당 없음 | 목표 값과 미설정 대시, 계획 유지 | A G | 읽기 전용 계획 색 유지 | [CardioFocus](../../src/features/workout-flow/CardioFocus.tsx#L89) | S |
| 34 | 활동 시간·일시정지·이어하기 | 완료 시 필수 ms | 현재 기기 타이머 앵커·누적 활동 | 사용자의 시작/정지 후 완료 | 준비 0, 정지 시간 제외, 원본 timerMs 불변 | A G | 현재 실제 측정 우선 유지 | [timerAction](../../src/features/workout-local/model.ts#L281) · [CardioFocus](../../src/features/workout-flow/CardioFocus.tsx#L96) | S T |
| 35 | 건너뜀·완료 취소 | 완료 여부, 실측 선택 | 기존 기록·현 타이머 | 명시 조작 | SKIPPED는 result null, 취소는 tombstone과 타이머 보존 | A G | 미수행을 0 실측으로 생성하지 않음 | [model](../../src/features/workout-local/model.ts#L303) · [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx#L594) | S T |

## S08 유산소 완료 검토

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | 실제 활동 시간·수동 수정 | 필수 ms 1~86400000 | 실제 timerMs 우선, 수동 휠은 반올림한 정수 초 | 시간 적용 후 완료 저장, 기준 초 복귀 시 원래 ms | 자동 흰색·변경 노란색, 원래 정밀도 보호 | A D G | 현 측정 우선, 동일값 확인으로 ms 변환 방지 | [CardioReview](../../src/features/workout-flow/CardioFocus.tsx#L42) · [완료 검증](../../src/features/workout-local/completion-input.ts#L26) | S T |
| 37 | 실제 거리·목표 추정 | 선택 decimal, 직접 0.001~1000 | 현재 수동/계산/복원, 설정 ON일 때 목표 거리 추정, 과거 조회 없음 | 수동 확인·완료, 같은 추정 숫자 확인은 수동 전환 생략 | 기본 `미입력`, 추정값·출처 표시, untouched 추정 저장 제외 | A B C D E F I | 출처별 초기값과 실적 분리, 같은 값의 명시 확인 규칙 적용 | [CardioActualFields](../../src/features/workout-online/CardioActualFields.tsx#L16) · [측정](../../src/features/workout-online/cardio-measurement.ts#L14) | S T |
| 38 | 실제 평균 속도·계산 미리보기 | 선택 decimal 0 이상 | 복원/수동, 거리÷시간 계산 표시, 과거 없음 | 휠·직접 후 완료, FRONT는 속도만 수동 입력 시 오류인 경로 있음 | 값 없는 자동 계산 속도는 저장되지 않음, 수동 노랑 | A B C D E I | 표현·초안 분리, 현재 API와 속도 단독 저장 검증 대조 | [CardioActualFields](../../src/features/workout-online/CardioActualFields.tsx#L16) · [actualCardioMeasurement](../../src/features/workout-online/cardio-measurement.ts#L48) | S T |
| 39 | 실제 평균 심박수 | 선택 정수 20~300 BPM | 복원/수동, 기본 빈 값, 센서·과거 없음 | 휠·직접 후 완료 | `0 BPM`이 빈 값, 유효 수동값 노랑, 빈 값 null | A B C D E I | 빈 `—`, 유효한 현재 입력과 과거 후보 분리 | [CardioActualFields](../../src/features/workout-online/CardioActualFields.tsx#L29) · [BPM 검증](../../src/features/workout-online/cardio-measurement.ts#L92) | S T |
| 40 | 실제 페이스·경사·저항·케이던스 | 별도 필드 없음 | 해당 없음 | 없음 | 경사 저장 불가 안내, 실제 속도와 목표 페이스는 별개 | G H | 현재 미지원 유지, 새 유형은 후속 범위 | [CardioActualFields](../../src/features/workout-online/CardioActualFields.tsx#L40) · [실측 계약](../../../overload-server/docs/api/cardio-actual-measurements.md) | S |
| 41 | 완료 검토 취소·일괄 완료 | 시간 필수, 실측 선택 | 타이머·복원된 입력 | 취소는 일시정지 복귀, 명시 완료 후 고정 snapshot | UI 출처별 직렬화, 장비 종류·시간·출처 검증 | A D F G | 검토·취소의 보존 유지, 지연 후보를 자동 실측으로 전송 금지 | [CardioReview](../../src/features/workout-flow/CardioFocus.tsx#L55) · [completeCardio](../../src/features/workout-local/model.ts#L295) | S T |

## S09 운동 복원·재진입

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 같은 기기 이어하기·오프라인 | 기존 초안/사실 | IndexedDB에 값·타이머·편집권·동기화 원본 | 진입은 읽기, 로컬 변경 후 명시 완료 | 초안과 완료 상태 분리, 필드별 초기/확정 출처 없음 | A F G | 저장 초안과 미접촉 필드의 구분, 계정·세션 범위 유지 | [LocalWorkoutScreen](../../src/features/workout-local/LocalWorkoutScreen.tsx) · [controller](../../src/features/workout-local/controller.ts#L162) | S T |
| 43 | 로컬 초안 없는 서버 재진입 | 서버 저장 사실 + 새 초안 | 서버 스냅샷, 해당 세션 최대 순번 실제 중량·초기 승인값·0 | 진입으로 확정 안 함 | 미완료 원문·타이머는 서버 복원 자료 없음 | A C G | 서버 복원을 과거 첫 초기화와 구분 | [createLocalWorkout](../../src/features/workout-local/model.ts#L18) | S T |

## S10 종료 요약·중량 검토

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 44 | 종료 요약 계획·실제 세트·유산소 | 읽기 전용 | 확정 snapshot·서버 View | 해당 없음 | 실적/계획 구별. 정정 시간 노랑, 거리 출처·미입력은 사실 표기 | A G H | 읽기 표현 유지, ST-19 달성 판정은 별도 보류 | [WorkoutSummary](../../src/features/workout-flow/WorkoutSummary.tsx#L109) · [CardioActual](../../src/features/workout-flow/CardioFocus.tsx#L16) | S |
| 45 | 종료 후 추천 중량·수정 | 선택 승인 대상, 선택 시 필수 decimal | 서버 봉인 recommendedWeightKg, 기존 계산 경로/개별 초안 | 무게 수정 확인·개별/전체 승인 확인 | 방향·승인 상태 색 사용, 추천 상태 파랑으로 통일되지 않음 | A B D G | 현행 실제 추천의 숫자 표현만 적용, 승인 체계 보존 | [WeightReview](../../src/features/workout-flow/WeightReview.tsx#L39) · [SavedWeightReview](../../src/features/workout-online/SavedWeightReview.tsx#L66) | S |
| 46 | 진행 종료 전 잠정 권고·Benchmark 알림 | 읽기 전용 | ACTIVE 잠정 평가 또는 이전 Benchmark | 표시·닫기, 승인 없음 | 방향·기준·근거 표시 | A G | 숫자 입력 초기값 정책과 구별 | [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx#L365) | S |

## S11 기록 상세·변경 이력

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 47 | 상세의 중량·반복·추가 중량·실측 | 읽기 전용 | 서버 상세와 불변 원계획 | 해당 없음 | 실제 값·계획·거리 출처, 미기록과 0 구분 | A G | 표시 반올림을 저장 정밀도와 분리 유지 | [WorkoutSummary](../../src/features/workout-flow/WorkoutSummary.tsx#L109) · [RecordFacts](../../src/features/workout-online/ClosedWorkout.tsx#L80) | S T |
| 48 | 승인 이력·변경 전후·당시/현재 평가 | 읽기 전용 | 봉인 평가·승인 사건·서버 정정 이력 | 해당 없음 | 승인 상태·시간·정정 내역 의미 있는 문구 | A G | 입력 상태 문구 제거의 적용 밖인 감사 사실 유지 | [ClosedWorkout](../../src/features/workout-online/ClosedWorkout.tsx#L63) · [평가/이력](../../src/features/workout-online/ClosedWorkout.tsx#L251) | S T |

## S12 기록 정정

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 49 | 실제 중량 | 필수 decimal | 기존 저장값 | 휠·직접·증감 후 2단계 정정 확인 | 변경 후에도 일반 색, 기존 approval 문맥 유지 | B D G | 정규화 비교로 달라진 숫자만 노랑 | [CorrectionDialog](../../src/features/workout-online/ClosedWorkout.tsx#L296) · [입력](../../src/features/workout-online/ClosedWorkout.tsx#L351) | S M T |
| 50 | 실제 반복 횟수 | 필수 정수 ≥1 | 기존 저장 reps | 휠·직접·증감 후 2단계 확인 | 변경 후에도 일반 색, 0 거절 | B D G | 원본과 숫자 비교, 복귀 즉시 일반 색 | [RecordedRepsField](../../src/features/workout-flow/WeightWheelFields.tsx#L20) | S M(기존값 조회) |
| 51 | 실제 맨몸 추가 중량 | 선택 decimal/명시 null | 기존 값 또는 빈 초안 | 선택/제거 후 2단계 확인, touched 추적 | 기존과 달라도 일반 색, 생략은 보존·공란 제거 명시 | B D E G | 달라진 값만 노랑, 0·제거·미입력 표현 | [CorrectionDialog](../../src/features/workout-online/ClosedWorkout.tsx#L313) · [입력](../../src/features/workout-online/ClosedWorkout.tsx#L354) | S T |
| 52 | 유산소 활동 시간·정정 여부 | 필수 ms | 기존 activeMs·timerMs·corrected | 토글과 시간 적용 후 정정 확인 | `modified={corrected}`; 기존 정정 안 바꿔도 노랑 | B D G | 유효 입력의 원래 ms와 비교, 토글과 출처 보존 | [CorrectionDialog](../../src/features/workout-online/ClosedWorkout.tsx#L319) · [시간](../../src/features/workout-online/ClosedWorkout.tsx#L362) | S T |
| 53 | 실제 거리 | 선택 decimal/null | 기존 저장값과 출처 | 변경과 공란 처리 후 정정 확인 | 변경 문자열이면 노랑, 예전 출처 복귀는 색과 별개, derived 불일치 가능 | A B D E I | 정규값/출처/명시 제거를 각각 비교, 계산 거리 시간 변경 정합성 | [CardioActualFields](../../src/features/workout-online/CardioActualFields.tsx#L16) · [측정](../../src/features/workout-online/cardio-measurement.ts#L42) | S T |
| 54 | 실제 평균 속도 | 선택 decimal/null | 저장값 또는 거리÷시간 표시값 | 직접·휠 후 정정 확인 | 변경 문자열이면 노랑, 자동 계산 표시만으로 저장 안 함 | A B D E I | 거리와 동일한 출처 보호, 속도 제거·재계산 검증 | [CardioActualFields](../../src/features/workout-online/CardioActualFields.tsx#L16) · [prepare](../../src/features/workout-online/ClosedWorkout.tsx#L319) | S T |
| 55 | 실제 평균 심박수 | 선택 정수 BPM/null | 기존 저장값 또는 빈 초안 | 휠·직접 후 정정 확인 | 값 비교 후 노랑, 원복은 기존색, 공란은 0 표시·저장 null | A B D E | 빈 `—` 및 접근성, 원복 비교 유지 | [CardioActualFields](../../src/features/workout-online/CardioActualFields.tsx#L29) | S T |

## S13 누락 수행 복구

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 56 | 보관 원본·복구 대상 선택 | 선택, 숫자 읽기 전용 | 기존 기기 보관 완료값 | 원본 선택 및 명시 복구 확인 | 기존 UUID·값·보존 근거, 중복·삭제 거절 | A G | 복구 수치에 새 초기값 주입 방지 | [RecoveryDialog](../../src/features/workout-online/ClosedWorkout.tsx#L383) · [복구 계약](../../../overload-server/docs/api/workout-sessions.md#누락-완료-수행-복구) | S |

## S14 승인 충돌 해결

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 57 | 진행 중 재승인 중량 | 재승인 시 필수 decimal | 선행 요청의 next 또는 공란 | 휠 후 현재 유지/재승인 명시 확인 | 선행 요청 값은 흰색, 오래된 ACK·권한 보호 | A B D G | 운영 중량과 별도 승인 입력, 승인 출처 유지 | [ApprovalControls](../../src/features/workout-local/ApprovalControls.tsx#L19) | S |
| 58 | 종료 후 재승인 중량 | 재승인 시 필수 decimal | 빈 초안, 현재/선행 요청 별도 | 휠 후 명시 확인 | 흰 `입력`, 공란 요청 불가, 기존 기록 문맥 유지 | B D E G | 유효한 후보와 미입력 표현, 자동 승인 금지 | [ClosedApproval](../../src/features/workout-online/ClosedWorkout.tsx#L280) | S |

## S15 세트 사이 휴식 설정

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 59 | 3구간 휴식 시간 | 3개 필수 정수 초 1~2147483647 | GET 계정 저장값을 직접 입력 초안에 복사 | 직접 편집 후 저장 | 일반 색, 실패 입력 유지·최신값 재조회, PATCH 3개 원자 저장 | A G | 일반 설정·저장값 유지 | [RestSettings](../../src/features/settings/RestSettings.tsx#L75) · [휴식 API](../../../overload-server/docs/api/workout-online-write.md) | S M |
| 60 | 시작·끝 범위, 취소·최신 설정 확인 | 범위 숫자 읽기 전용 | 화면 구간의 반복 상한, 최신값은 서버 GET | 범위 고정, 취소는 초안 폐기 확인, 충돌 후는 저장 없이 최신값 조회 | 최신 조회에도 초안 유지, 현재 세션 휴식 앵커 독립 | A G | 범위·취소·재확인 유지, 4구간 Preview 제외 | [RestSettings](../../src/features/settings/RestSettings.tsx#L126) · [restSeconds](../../src/features/workout-local/model.ts#L53) | S M(취소) |

## S16 휴식 타이머 알림

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 61 | 효과음 볼륨 0~100% | 로컬 정수, 0 무음 | 저장값, 신규 70 | 슬라이더 변경 즉시 저장 | 범위 5 단위, AX 값, 서버 미전송 | A G | 네이티브 슬라이더 예외 유지 | [RestAlertSettings](../../src/features/settings/RestAlertSettings.tsx#L195) · [기본값](../../src/features/workout-flow/rest-alerts.ts#L19) | S |
| 62 | 깜빡임 3/5/10초·중간 알림 20/30/60초 | 로컬 숫자 선택 | 저장값 또는 5초/30초 | 선택 즉시 저장 | 분할 선택·활성 상태, null 없음 | A G | 숫자 선택의 기존 선택 표현 유지 | [RestAlertSettings](../../src/features/settings/RestAlertSettings.tsx#L190) | S |
| 63 | 12초 테스트 모드·시연 시간 | 전용 토글·읽기 시간 | 저장 토글·고정 테스트 초 | 즉시 로컬 적용, 시연 명시 시작 | 정규 휴식 API와 분리 | A G | 시연/실제 테스트 모드 구분 유지 | [RestAlertSettings](../../src/features/settings/RestAlertSettings.tsx#L210) | S |

## S17 설정 메인

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 64 | 거리 추정 토글·디로딩 설정 진입 | 추정은 로컬 boolean, 디로딩 수치 입력 없음 | 계정별 기기 저장값, 신규 OFF | 토글 즉시 저장 | 완료 검토의 목표 추정 표시만 영향, 설정 도입 상태는 현행 메뉴 기준 | G I | 추정 표시와 7단계 초기값 공존 방식 확인 | [SettingsMain](../../src/features/settings/SettingsMain.tsx#L26) · [useCardioEstimate](../../src/features/settings/useCardioEstimate.ts#L14) | S |

## S18 기록·통계와 기간 탐색

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 65 | 현황·성장·근육·요일/기간·차트 수치 | 집계 읽기 전용, 기간 필터 | 서버 Overview/성장 등·현재 날짜 | 필터 선택은 조회 범위만 변경 | 단위·0·null·미확인에 각 계약 적용 | A G H | 초기값 색 범위 제외, 기존 달성/독립 집계는 계약대로 후속 | [StatisticsPanel](../../src/features/statistics/StatisticsPanel.tsx) · [PeriodControls](../../src/features/statistics/PeriodControls.tsx) | S |

## S19 로그인·계정 인증

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 66 | 로그인·계정 확인 OTP | 필수 6자리 문자열 | 빈 입력·자동완성 가능 | 인증코드 확인 | 선행 0 유효, 수치·운동 저장 없음 | A G | OTP 전용 디자인·인증 흐름 유지 | [LoginScreens](../../src/features/auth/LoginScreens.tsx#L22) · [AccountSettings](../../src/features/auth/AccountSettings.tsx#L88) | S M(전용 검수 인증) |

## S20 홈·주간 일정

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 67 | 홈 계획량·요일·오늘 루틴 | 수치는 읽기 전용, 날짜·루틴 선택 | 당시/선택 계획·진행/기록·달력 | 루틴/날짜 선택, 명시 START | 수치 입력 초안 없음, START가 불변 계획 생성 | A G | 계획 수치·날짜와 운동 입력 상태 분리 | [HomePanel](../../src/features/home/HomePanel.tsx) · [세션 START](../../../overload-server/docs/api/workout-sessions.md#http인증) | S M(조회) |

## 공통 숫자 입력

| 번호 | 화면·입력 항목 | 필수·선택 | 초기값 출처 | 현재 확정 방식 | 표시·저장 상태 | 분류 | 개선 방향 | 소스 위치 | 확인 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 68 | NumberWheel 진입·동일값·외부 닫기 | 호출부 계약 | wheelSeed > value > suggestion > start | 기본 untouched 확인은 호출 없음, 반복만 confirmUnchanged | 바깥 클릭 허용도 confirmUnchanged에 결합, 일부 호출부는 동일값을 걸러냄 | B D F G | 확정 이벤트와 닫기·변경 여부 분리, 원본 정밀도 보존 | [NumberWheel](../../src/components/NumberWheel.tsx#L29) · [확인](../../src/components/NumberWheel.tsx#L116) | S M |
| 69 | 직접 입력·+/-·공란 | 호출부 계약 | 휠은 원시 값, 증감은 value/suggestion | 유효 직접 확인/Enter 또는 증감 즉시 부모 콜백 | 중간 문자/취소는 내부 초안만, 빈 입력 처리와 색/AX 상이 | A B D E G | 상태 전달을 공통화, 현 호출부 검증 유지 | [NumberWheel](../../src/components/NumberWheel.tsx#L36) · [직접 입력](../../src/components/NumberWheel.tsx#L120) | S M T |
| 70 | DurationWheel 시·분·초 | 각 부분은 전체 시간 계약 적용 | 시간 초를 부분으로 분해 | 내부 확인→부모 시간 적용, 취소 분리 | 동일값 생략, 정정 소수 최대 3자리 초 | A D G | 동일값 확정과 원시 ms 보존 및 필드 취소 | [DurationWheel](../../src/components/DurationWheel.tsx#L5) · [CardioTimeField](../../src/features/workout-online/CardioTimeField.tsx#L12) | S M T |
