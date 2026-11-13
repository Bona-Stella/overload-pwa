# v0.9 일반 운동 와이어프레임 실제 구현 대조

상태: **HTML 수정·정적 검증 완료 / 사용자 재검수 대기**. 2026-11-13. 사용자 승인·최종 문서 마감·커밋은 하지 않았다.

기준은 PWA 코드 `15a0f6bee4421f799cd691fa435bc8103c1e28e2`이며 현 HEAD는 문서 커밋 `725a9be8bf53e275a2a090c0e7e0afb85e4a7c85`다. 이전 문서의 전체 일치 표기는 이번 점검의 근거로 사용하지 않는다. Backend·DB·API 검토 서버는 실행하지 않으며 구현 코드는 변경하지 않는다.

## 수정 전 대조표

| 화면 | 분류 | 실제 컴포넌트·CSS 근거 | 확인된 차이 |
|---|---|---|---|
| HOME-01 진입 | 수정 필요 | HomePanel, LocalWorkoutFlow | 선택 루틴에서 생성한 계획과 이후 요약의 임의 예시 변환이 연결되지 않음 |
| WORKOUT-01 | 수정 필요·소스 표현 확인 | WorkoutFrame.Warmup, LocalWorkoutFlow, warmup CSS | 장비 누락. 중량 미지정 시 소스 target에도 `미지정kg` 가능성이 있어 HTML은 사용자 지시에 따라 단위 분리 필요 |
| WORKOUT-02 | 수정 필요 | WeightFocus, useFitWorkoutTitle, working/workingValues/equipment, NumberWheel.plainSteps | 실측 제목 축소 누락, 장비 좌정렬, ± 테두리, 비교 기록/상태 원형 체크 위계, 종료 버튼 DOM 순서 불일치 |
| WORKOUT-03 | 수정 필요 | WeightChange, NumberWheel, NumberWheel.module.css | 중량 ±2.5·변경 방식 설명/허용 조건·취소/확인, 휠 중앙 선택·직접 입력 모드의 가로 액션 누락 |
| WORKOUT-04 | 수정 필요 | ExerciseList, useDragOrder, Presets orderRow | 번호/이름·상태/오른쪽 핸들 구조, WEIGHT/CARDIO 구획·dirty/드래그 중 비활성 조건 누락 |
| WORKOUT-05 | 수정 필요 | WeightFocus.setActions, EquipmentEditor, LocalWorkoutFlow | 마지막 세트 추가/제외 가로 배치, 완료 제외 제한, 종목 추가/교체·제외와 닫기 조건 불일치 |
| WORKOUT-06 | 부분 일치·수정 필요 | SessionExerciseSearch, ExerciseSearch, PublicCatalog CSS | 공통 검색은 재사용하나 모달 문구/취소/선택 후 입력 및 빈 결과·부위 메타 검증 부족 |
| CARDIO-01 | 수정 필요 | AddCardio, CardioPlanFields | 실제 분류/이름·별칭/세부 종목/시간·거리·강도·경사/저항 입력 누락, 시연 입력 미반영 |
| CARDIO-02 | 수정 필요 | CardioFocus, CardioActual, LocalWorkoutFlow | 진행 내비게이션·누적 실적·정정 시간·거리 출처·완료 취소, 계획/실측 시간 하드코딩 모순 |
| RECORD-01 | 부분 일치·수정 필요 | WorkoutSummary, summary-data, metrics/recordHead/recordGoal | 섹션 순서는 일치하나 완료 예시 강제 변환·총량/실제 시각·권고 증거·CARDIO 계획/실적 결합 불일치 |
| RECORD-02 | 수정 필요 | ClosedWorkout.WorkoutHistory | 과거 통계 카드의 월/총량 목록과 실제 종료 운동 이력 버튼·새로고침·빈 상태가 다름 |
| RECORD-03 | 수정 필요 | ClosedWorkoutView, WorkoutSummary(detail) | 메뉴 기본 구조는 부분 일치. 종료 상태/시작·종료 시각·공식 평가/권고·오류/삭제 상태 연결 미흡 |
| RECORD-04 | 수정 필요 | ClosedWorkoutView correction, RecordFacts, CorrectionDialog | 완료 사실/ordinal 유지·중량/장비/시각 묶음·개별 삭제·유산소 정정·실패 초안 보존 미흡 |
| RECORD-05 | 수정 필요 | DeleteDialog | 실제 제목·대상 문구·단일 삭제 버튼과 X 취소, 삭제 후 상세/이력 상태 불일치 |
| RECORD-06 | 수정 필요 | RecoveryDialog, recoveryRows | 원본을 임의로 만들어 보이는 흐름. 실제 보관 사본 선택·복구 불가 구획·선택 비활성/확인과 결과 연결 필요 |
| 평가 변경 이력 | 수정 필요 | ClosedWorkoutView history, Evaluation, ChangeEntry | 상세 아래 임의 설명 대신 날짜·완료 상태·최초/현재 공식 평가·실제 변경 전후 화면 필요 |

다른 루틴·통계·디로딩·설정은 기존 ID/렌더러/상태를 보존하고 회귀를 별도로 확인한다. 저충실도 색상 차이를 구조 차이의 근거로 사용하지 않는다.

## 비교 방법과 미확인 경계

실제 React 소스·CSS·표시 조건·데이터 매핑을 먼저 읽고, 해당 컴포넌트를 합성 데이터로 독립 렌더링한 정적 파일과 기존 HTML을 비교한다. 가능한 경우 320/393px/PC 캡처와 DOM 수치/행·버튼·실적을 확인한다. 로그인한 실제 앱·실제 사용자 데이터와 비교했다고 보고하지 않는다. 서버/API/IndexedDB 접근은 금지한다. native Safari 키보드/관성 스크롤은 이 문서 검증으로 확인할 수 없다.

이번 결과는 미커밋으로 남기며 사용자 승인이나 전체 문서 마감을 선언하지 않는다.

## 수정 후 화면별 결과

기존 50개 ID와 메뉴를 유지했다. 집중 수정 범위는 WORKOUT 6개·CARDIO 2개·RECORD 6개인 **14개 화면**, HOME-01의 시작/재개 연결, RECORD-03 안의 평가 변경 이력 상태다. 아래의 ‘비교 확인’은 현재 소스와 합성 데이터 기반 정적 시연의 확인 범위를 뜻하며 인증된 실제 앱/API 검증을 뜻하지 않는다.

| 화면 | 수정 내용 | 비교 결과·경계 |
|---|---|---|
| HOME-01 진입 | 선택한 루틴의 이름·계획으로 시작, 진행 상태 재개, 같은 실제 수행 사실을 종료/이력에 전달 | 소스·시연 동작 확인. 실제 HomePanel 전체 시각 비교는 미실시 |
| WORKOUT-01 | 다음 운동의 중량·목표 범위·세트·제조사/부하 방식 표시. 미지정 중량은 kg와 분리 | Warmup 정적 렌더와 비교 확인. 미지정 문구는 아래 소스 불일치 참조 |
| WORKOUT-02 | Range로 번호/제목 실측, 최소16px 축소. 중량/승인 왼쪽·장비 오른쪽. ± 테두리 제거, 완료 체크, 메모→종료 DOM 순서 | WeightFocus와 비교 확인. 320px 최소 글꼴 말줄임 제한은 아래 명시 |
| WORKOUT-03 | ±2.5·오늘만/진행 변경 초안·승인 안내·취소/확인. 휠 중앙 선택과 두 입력 모드의 가로 액션 | WeightChange 및 실제 NumberWheel 두 모드 정적 렌더와 비교. 미조작 휠은 빈 초안 유지 |
| WORKOUT-04 | 번호/이름·상태/우측 핸들, WEIGHT/CARDIO 구획, dirty/원복/드래그 중 확정 제한 | ExerciseList 비교. 실제 포인터 드래그·키보드 이동·초안 취소/확정 검증 |
| WORKOUT-05 | 마지막 세트 추가/제외 가로 배치, 완료/최소1세트 제외 제한, 장비 두 열, 세션 전용 추가/교체/제외 | WeightFocus 편집 상태·EquipmentEditor 비교. 완료 수행과 장비 원본 보존 |
| WORKOUT-06 | 공통 검색 재사용, 이름·별칭/부위 필터·공식32px 자산·분류·빈 결과·취소, 선택 후 현재 위치 연결 | SessionExerciseSearch/ExerciseSearch 비교. 신규0kg는 소스와 정책 문서 불일치로 별도 기록 |
| CARDIO-01 | 분류·별칭 검색·종목 선택·필수 시간·거리·속도/페이스·경사/저항을 계획에 바인딩 | AddCardio/CardioPlanFields 비교. 입력한 계획이 수행 화면에 유지 |
| CARDIO-02 | 준비→활동→일시정지/재개→유산소 완료→기록 확인/취소→확정, 시간 정정·거리 출처·평균 심박 | CardioFocus 준비 상태 직접 비교, 나머지는 소스/시연 검증. 계획과 실제 활동 시간 분리 |
| RECORD-01 | 요약→중량 검토→WEIGHT/CARDIO 부모 카드→돌아가기. 실제 완료 사실만 합산, 증량 기여 전체/미달 횟수/미완료 수만 강조 | WorkoutSummary 정적 렌더와 동일 합성 사실 대조. 공식 평가와 권고 분리 |
| RECORD-02 | 종료 운동 이력 제목·재조회·날짜/루틴/상태/시간과 개별 상세 이동, 실제로 종료한 합성 기록 보존 | WorkoutHistory 소스/시연 확인. 이력 컴포넌트 전체 직접 렌더는 미실시 |
| RECORD-03 | 시작·종료 시각/상태, 수행 묶음, 하나의 목록형 ⋮, 삭제·오류 상태, 상세→정정/이력 전환 | ClosedWorkoutView 정적 렌더와 비교. 상세·정정·평가 상태 분리 |
| RECORD-04 | 완료한 사실과 실제 ordinal만 정정, 중량/횟수/장비/시각, 유산소 항목, 개별 삭제, 검증·저장 실패 시 초안 유지 | 실제 정정 화면 비교. 9/10세트 중9개만 정정하며 변경 후 요약·이력 수치 연동 |
| RECORD-05 | 실제 제목·날짜/루틴·단일 삭제 버튼/X 취소, 삭제 후 상세 유지·쓰기 금지 | DeleteDialog 정적 렌더와 비교. 취소/확정 및 원본 사실 보존 검증 |
| RECORD-06 | 보관 사본 선택·실제 누락 후보·복구 불가 펼침·빈 선택 비활성·확인. 없는 원본을 새로 만들지 않음 | RecoveryDialog 정적 렌더와 비교. 원본 UUID 1회 복원·값/세트 위치 충돌 제한 검증 |
| 평가 변경 이력 | 종료 당시 평가 고정, 현재 평가 재계산, 정정/삭제/복구의 실제 변경 전후 | 실제 history 모드 정적 렌더와 비교. 정정 전12회→후10회/46kg와 양쪽 평가가 구분됨 |

## 실제 비교 근거

- 화면: `WorkoutFrame.tsx`의 Warmup/RestActions/ExerciseNavigation, `WeightFocus.tsx`와 EquipmentEditor, `WorkoutDialogs.tsx`의 WeightChange/ExerciseList/SessionExerciseSearch/AddCardio, `CardioFocus.tsx`, `WorkoutSummary.tsx`, `ClosedWorkout.tsx`의 상세/정정/삭제/복구/평가 이력.
- 공통 입력: `NumberWheel.tsx`, `Dialog.tsx`, `ExerciseSearch.tsx`, `CardioPlanFields.tsx`, `EquipmentFields.tsx`, `useDragOrder.ts`, `useFitWorkoutTitle.ts`.
- 데이터/상태: `LocalWorkoutFlow.tsx`, `workout-local/model.ts`, `summary-data.ts`, `closed-model.ts`, `cardio-measurement.ts`, `catalog-label.ts`. 계획·승인 문맥·실제 완료 사실·화면 초안을 구분했다.
- 스타일: `WorkoutFlow.module.css`, `NumberWheel.module.css`, `AppShell.module.css`, `PublicCatalog.module.css`, `Presets.module.css`, `ui.module.css`, `theme.module.css`, `App.css`, `index.css`. 저충실도의 회색·기존 폰트 계열·프레임·모서리 표현은 유지하고 운동 영역의 그리드/정렬/글자 위계/터치 크기를 소스에 맞췄다.

현재 소스 파일을 import한 독립 비교 파일은 합성 props만 공급했다. 실제 API 컨트롤러나 인증·브라우저 저장소를 초기화하지 않았다. 실제 컴포넌트의 원래 CSS/Onyx 표시와 HTML의 무채색 표시를 나란히 비교했으며 색상을 복제하지 않았다.

## 검증 기록

2026-11-13 Chrome headless/CDP 정적 검증 결과 **17개 시나리오 그룹 통과**, 런타임 오류0, HTTP/API 요청0, IndexedDB open/delete0. API·DB·검토 서버는 시작하지 않았다. 자체 실행한 임시 Chrome은 종료했다.

1. 50개 기존 화면 ID/메뉴와 연결된 설명·이미지 디코딩, 기존 홈/루틴/기록/설정 탭 클릭 이동.
2. 준비운동 정보, 중량/장비 좌우 정렬·테두리 없는±, 메모 다음 종료 버튼 DOM 순서.
3. 숫자 휠/직접 입력/취소/확정, 빈 값 보존. 초기 휠 정렬 스크롤을 사용자 선택으로 오인하지 않음.
4. 완료/취소의 동일 세트 ID 유지, 휴식 연장·수동 즉시 종료와 자연 종료 구분. 기존 독립 알림 미리보기 열기/연장/닫기 회귀도 확인. 실제 소리는 재생하지 않음.
5. 실제 포인터 드래그로 행 이동, 키보드 원복, dirty·드래그 중 확정 방지, 완료 세트 제외 제한·마지막 행 가로 액션.
6. 공통 별칭 검색·빈 결과·선택 후0kg·메모 포커스 시 액션 숨김과 입력값 유지.
7. 유산소 계획 입력 반영, 일시정지/재개/완료 확인 취소/확정 후 실제 시간·거리·측정값 유지.
8. 시작/준비운동/재개/종료 후 같은 수행 사실과 시각이 이력에 보존됨. 미완료 유산소를 완료로 만들지 않음.
9. 동일한 9/10세트·총3,755kg 예시를 요약/상세/정정에 사용. 증량12/12/13 전부, 미달12/12/7 중7만, 미완료3/4 수만 강조. 존재하지 않는4번째 완료 세트를 만들지 않음.
10. 정정 검증 실패/합성 저장 실패 시 초안 유지, 실제46kg/10회 변경과 최초/현재 평가·변경 이력 연결.
11. 누락한 원본 ID 단1회 복구, 동일ID 값 충돌·다른ID 같은 위치 충돌 제한. 전체 삭제의 취소/확정·삭제 후 쓰기 금지.
12. 핵심14개 화면 × 320/393/1280px에서 페이지/내부 스크롤 가로 넘침과 제목/버튼 겹침 없음. 작은 화면에서도 기록 우측 요약과 모달 액션 구조 유지.
13. 브라우저 네이티브 HTML DOM 파싱과 inline JavaScript 구문 검사. 별도 HTML 표준 적합성 검사기를 설치하거나 실행한 결과는 아님.

비교 캡처는 **36장**: 수정 전3장, 실제 컴포넌트/수정 HTML의16상태32장, 320px1장. 실제 비교 상태는 준비운동·웨이트·중량 모달·휠/직접 입력·순서·세트 편집·검색·유산소 추가/준비·요약·상세·정정·평가·복구·삭제다. 운영 보조 자료는 Git 제외된 `logs/wireframe-parity/`에만 남겼다.

- [비교 갤러리](../../logs/wireframe-parity/comparison.html)
- [기계 검증 결과](../../logs/wireframe-parity/verification.json)
- [수정 전 웨이트](../../logs/wireframe-parity/before-weight.png) / [수정 후](../../logs/wireframe-parity/after-weight.png) / [실제 컴포넌트](../../logs/wireframe-parity/actual-weight.png)
- [수정 전 요약](../../logs/wireframe-parity/before-result.png) / [수정 후](../../logs/wireframe-parity/after-result.png) / [실제 컴포넌트](../../logs/wireframe-parity/actual-result.png)

갤러리/캡처는 이 작업 환경의 로컬 검수 자료이며 저장소에 커밋되는 문서 자산은 아니다. Frontend/Backend 테스트·Lint·TypeScript·Production Build는 문서 전용 변경이므로 다시 실행하지 않았다. 독립 비교 컴포넌트 번들 생성은 제품 Production Build 검증과 구분한다. 다른36개 화면은 진입·자산·기존 렌더러 보존과 탭 이동 수준의 회귀 확인이며 모든 조합의 기능 검증을 뜻하지 않는다.

## 남은 차이·미검증 및 후속 판단

1. **구현과 정책 문서 충돌:** `model.addWeight`는 새/교체 종목의 중량을 `'0'`으로 초기화한다. Decision Log10.18.4와10.19의 빈 값 설명과 다르다. 이번 비교 기준에 따라 HTML은 현재 소스를 재현했다. 이 작업에서 제품 정책을 새로 결정하거나 실제 코드를 수정하지 않았으며 관련 원문 이력도 보존했다.
2. **명시적 문구 예외:** LocalWorkoutFlow의 Warmup target 문자열은 중량이 없을 때 `중량 미지정kg`를 만들 수 있다. HTML은 사용자 요구대로 `중량 미지정`으로 표시한다. 실제 앱의 해당 문구는 별도 수정 대상으로 남는다.
3. **320px 긴 제목:** 실제 최소16px·한 줄 정책을 유지한다. 기본 긴 예시의 실측 텍스트208.28px가 가용208px를 약간 넘는 환경에서는 말줄임이 남는다. 393px/PC에서는 자동 축소 후 전체 예시가 들어간다. 기존 저충실도 폰트 계열을 보존하여 실제 앱의 글리프 폭과 완전히 같지 않으며 모든 긴 제목의 무말줄임을 보장하지 않는다.
4. 인증된 실제 앱 전체·실제 계정/API 데이터와 직접 비교하지 않았다. HOME-01 전체, RECORD-02 전체, 유산소의 모든 상태는 실제 실행 화면 시각 비교 대신 소스와 합성 시연을 확인했다. 이전 실기기 검수 스크린샷과의 일대일 대조는 미실시다.
5. 메모는 메모리 시연이며 서버 저장을 추가하지 않았다. 실제 iPhone Safari 키보드/입력 보조 영역/VisualViewport/관성 스크롤·음악과 휴식 알림 동시 재생은 미검증이다. HTML의 단순 포커스/액션 숨김을 실제 앱의 안정화 로직 검증으로 표시하지 않는다.
6. 무채색·저충실도 프레임/폰트 계열/테두리와 합성 데이터·메모리 동작은 의도적으로 유지한다. 실제 저장/네트워크 요청이 성공했다는 검증 결과는 없다.

## 변경 범위와 보존

- 변경: [기존 HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html), 이 대조/검증 문서. 문서24개 재정리는 하지 않았다.
- 제품 Frontend/Backend 소스·API·DB·패키지/Lockfile·설정은 변경하지 않았다. 다른 기능 렌더러와 기존 확정 문서 이력을 보존했다.
- 기존 양쪽 HEAD 및 브랜치를 유지했고 staging·commit·amend·push·배포를 하지 않았다. 사용자 재검수 전 승인 처리나 전체 문서 마감을 하지 않는다.
