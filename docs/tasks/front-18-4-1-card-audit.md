# FRONT 18 · 4-1 전체 카드 유형과 디자인 규격 조사

2026-11-25 · FRONT `5bd76e3` · BACKEND 참조 `8304b2a` · 양쪽 `main`의 조사 시작 작업 트리 깨끗함

## 1. 조사 결과

- 실제 앱의 화면·주요 하위 화면 **34개**, 카드·카드형 표면 사용처 **78개**, 기능 기준 유형 **8개**를 소스에서 확인했다. 반복 항목 수, 같은 카드의 로딩·갱신·선택·팽창, 동일 생성/편집 또는 종료/상세 구현은 사용처를 추가하지 않는다. 같은 역할·외곽의 병렬 그룹은 표 한 행으로 묶었다. 공통 피드백·로딩 2개는 범용 사용처로 한 번씩 포함했다.
- 범용 `Card` **1개**를 55개 사용처에서 사용한다. 별도 마크업·스타일 경로의 사용처는 **23개**다. 이 수치는 CSS 셀렉터 수와 별개다. 목록의 `SessionRecordCard`, 기기의 `DeviceCard`, 운동의 `MuscleCard`는 기능별 반복 구현이다.
- 일반 카드에서 가장 자주 확인한 조합은 **5px + Onyx `#1B1D22` + `1px solid #353941`**이다. 내부 패딩은 12px 계열이 가장 흔하다. 본문 카드 세로 간격은 12–16px, 반복 목록은 7–10px가 자주 보인다. 18px은 표준 운동 카탈로그·인증·복구·일정 전체 편집 등에 남아 있다. 넓은 페이지 상자의 모서리보다 카드 목록의 밀도를 먼저 맞추는 편이 효과가 크다.
- **불일치 및 개선 후보 11건**, **기존 공통 구조/공통화 후보 7개 묶음**, **보호할 특수·상태 표면 25개 표 행(†)**을 기록했다. 넓은 여백이나 최소 높이는 역할과 상태 변화에 필요한 경우 유지 대상으로 보았다.
- 일반 카드 기준 후보는 **루틴 ‘이번 주 일정’의 외곽**과 **‘반복 구간별 휴식 시간’의 12px 내부 기준점**이다. 홈 주간 일정은 첫 후보와 외곽이 일치하고 기록 주간 요약은 통계형 밀도의 참고 사례다. 4-2에서 요소별 기준을 결정한다.

최신 3단계 결정은 메시지형 Dialog의 5px·340px·설명과 액션 20px, 공통 새로고침과 레이아웃 보존에 적용된다. 테마 문서의 일반 카드 18px 토큰과 화면별 5px 규칙은 적용 위치가 다르다. 1·2단계의 페이지 경계와 운동 프레임 보존을 전제로 조사했다. 3-6C 사용자 최종 승인과 iPhone Safari·설치형 실기기 기록은 기존 문서에서도 대기다. [개발 현황](../engineering/frontend.md#front18-stage3) · [UI/UX](../product/ui-ux.md#front18-feedback) · [최신 결정](../product/Overload_UI_Decision_Log_v0.9.md#front18-stage3-decision) · [Visual Theme 18절](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#front18-feedback-visual) · [3-6 검수 기록](front-18-3-6-preview-review.md). 통계·달성은 10.25절과 ST-19의 기존 데이터를 표시하는 구조까지 확인했다. [현행 정책 10.25절](../product/Overload_UI_Decision_Log_v0.9.md#1025--2026-11-16-최신-정책-확정과-구현-경계) · [Backend ST-19](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md#31-하루-종목-완료-기준)

## 2. 화면 범위와 집계 기준

`main.tsx → AuthApp → AppShell / WorkoutWorkspace` 및 각 본문에서 열리는 하위 화면을 추적했다. 기록·루틴 하위 화면은 URL뿐 아니라 history state로도 이동한다. 같은 상세 화면으로 진입하는 홈/기록/검색 링크는 하나의 화면으로 세었다. 설정 메인 안의 앱 설치 펼침, 운동 중 휴식·이전 수행 표, 검색 결과·기간 선택 팝오버는 상위 화면의 상태 또는 조작이다. [진입점](../../src/main.tsx) · [인증 및 탭](../../src/features/auth/AuthApp.tsx) · [업무 화면](../../src/features/workout-online/WorkoutWorkspace.tsx) · [내비게이션](../../src/app/navigation.ts)

| 영역 | 실제 화면·하위 화면 |
| --- | --- |
| 홈·재진입 2 | A01 홈(오늘·ACTIVE·주간 계획·최근 운동), A02 오프라인 이어가기 |
| 루틴 및 일정 7 | B01 나의 루틴·주간 일정, B02 루틴 상세, B03 생성, B04 편집, B05 주간 일정 배정 편집, B06 일정 전체 편집·순환, B07 주간 근육 계획 |
| 운동 진행 6 | C01 준비운동, C02 웨이트, C03 유산소, C04 이번 운동 편집, C05 종료 직후 요약, C06 읽기 전용 세션·기기 인계 |
| 운동 기록 6 | D01 기록 메인·최근 운동, D02 전체 이력·검색, D03 기록 상세, D04 기록 정정, D05 누락 수행 복구(기능 대화상자), D06 평가 변경 이력 |
| 분석 3 | E01 운동 현황 및 종목별 추이·유산소, E02 성장 추적·승인 이력, E03 주간 근육 통계. 근육 계획은 B07에서 집계 |
| 설정·인증 10 | F01 설정, F02 내 계정·이메일 인증·연결 수단, F03 로그인된 기기, F04 세트 사이 휴식, F05 휴식 타이머 알림, F06 표준 운동 목록, F07 표준 운동 상세, F08 로그인 시작, F09 이메일 코드, F10 연결 문제·인증 상태 재확인 |

- **카드 없는 본문도 확인했다.** B05는 요일·후보·저장 조작을 가진 열린 폼으로 폼 gap 14px, 요일 gap 9px이다. F08은 로그인 안내와 열린 폼의 stack이다. 홈의 운동 시작 버튼은 독립 액션이고 ‘오늘만 다른 루틴 선택’은 `ConnectedDropdown`이다. 운동 계획의 종목은 리스트 행, 휴식 설정의 각 줄은 읽기/입력 행, 설정의 운동 종목 결과는 선택 행이다. [일정 배정](../../src/features/statistics/WeeklySchedulePanel.tsx) · [로그인](../../src/features/auth/LoginScreens.tsx) · [홈](../../src/features/home/HomePanel.tsx) · [공통 검색](../../src/components/SearchList.tsx)
- **서비스 경계.** 장비·중량은 루틴 상세·편집과 운동 진행 안에서 관리한다. 설정의 디로딩·운동 데이터 상태·내보내기·초기화·탈퇴는 비활성 행이다. 현행 루틴·홈의 디로딩 조회 보호와 Onyx 테마 분기는 확인했다. 전용 디로딩 상세·임시 일정·시작 비교와 전용 디로딩 기록 화면은 제품 설계에는 있으나 이번 HEAD의 탐색 경로에서 찾지 못했다. `SettingsScreen`·`HealthPanel`·`SessionDetail`의 구형 카드·중량 추천은 개발 Demo에서만 연결되는 근거를 확인했다. [설정 메뉴](../../src/features/settings/SettingsMain.tsx) · [일반/디로딩 상태](../../src/features/workout-online/WorkoutWorkspace.tsx) · [디로딩 설계](../product/ui-ux.md#311-디로딩--확정-화면-흐름) · [개발 Demo](../../tests/fixtures/review/DemoApp.tsx)
- 검색 결과의 행, 태그·날짜 캡슐, 일반 버튼과 입력, 토스트, 숫자 휠, 독립 기능형 Dialog 외곽은 카드 사용처 수에서 제외했다. 분석 진입·운동 기록 행은 카드형 메타데이터와 목적지 정보를 제공하므로 목록형이다. 사용자용 휴식 시연은 제품 기능이므로 특수 표면으로 포함했다. Preview 도구 상자와 서비스 호출이 없는 공통 `ConnectionBanner`는 사용처 집계에서 제외했다.

## 3. 소스에서 확인한 카드 규격

모든 수치는 CSS px다. 패딩은 **상/우/하/좌** 순서이고 단일 값은 네 방향에 같다. `V`는 일반 `--space-card`의 18px, 374px 이하 14px이다. 크기 전폭은 보통 상위 본문 폭을 채우고 `min-width:0`이 기본이다. 일반 본문은 셸 최대 520px에서 좌우 여백을 빼며, 카드 자체의 고정 높이·최대 높이는 명시한 예외 외에 없다. 외부 간격은 행에 적은 부모 또는 margin이 만든다.

`S`는 `#1B1D22` 표면과 1px solid `#353941`, `I`는 `#25282E` 입력 표면과 같은 선, `H`는 일반 Onyx 142° hero 그라데이션과 `#3B4453` 선을 뜻한다. 예외는 행에 기재했다. `T`는 입력용 유산소 타이머의 강조 혼합(표면 12%, 테두리 20%), `A`는 `--accent-soft` 강조 채움과 일반선이다. `C`는 공통 `Card` 호출 또는 그 컴포넌트를 직접 사용하는 전용 카드, `I` 구현 칸은 개별 외곽을 나타낸다. 일반 본문 카드 기본 그림자·outline은 없고, 버튼 카드와 접이형 summary의 키보드 포커스는 기존 가시 규칙을 따른다. [공통 Card](../../src/components/ui.tsx#L26) · [공통 카드 CSS](../../src/components/ui.module.css#L9) · [테마](../../src/app/theme.module.css) · [셸](../../src/app/AppShell.module.css)

| # | 화면 | 카드·표면 | 유형 | 크기 | 패딩 상/우/하/좌 | 외부 간격 | 내부 간격과 구조 | 모서리·외곽 | 구현 | 구현 위치 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | A01 | 오늘의 루틴·진행 중인 운동 | 강조 | 전폭·자동, 일반 계획 최소 176 | 16/13/16/13 | 홈 13 | kicker 하단 10, 제목 9/5 margin, 운동 행 세로 padding 9. 진행 상태 요약 10/10 margin + 하단 padding 10 | 5 H | C | [HomePanel.tsx](../../src/features/home/HomePanel.tsx) · [Home.module.css](../../src/features/home/Home.module.css) |
| 02 | A01 | 이번 주 일정 | 기본 | 전폭·자동 | 13 | 홈 13 | 제목 가로 9, 요일 위 margin 11·가로 gap 3, 날짜 상세 위 margin 8 | 5 S | C | [HomePanel.tsx](../../src/features/home/HomePanel.tsx) · [Home.module.css](../../src/features/home/Home.module.css) |
| 03 | A01 | 선택 날짜 상세 | 중첩 | 부모 내부·자동 | 10 | 요일 아래 8 margin | 문장 줄바꿈·기록 링크 인라인 | 0 I | I | [HomePanel.tsx](../../src/features/home/HomePanel.tsx) · [Home.module.css](../../src/features/home/Home.module.css) |
| 04 | A01 | 홈 최근 운동 항목 | 목록 | 전폭·최소 44 | 10 | 최근 목록 7 | 가로 6, 수행 수치 8, 좁은 화면 flex | 5 S | I | [HomePanel.tsx](../../src/features/home/HomePanel.tsx) · [Home.module.css](../../src/features/home/Home.module.css) |
| 05 | A02 | 오프라인 운동 이어가기 제안 | 특수† | 전폭·자동 | 21 | 위아래 margin 18 + 상위 stack | stack 18, 복귀 액션 | 18 S | I | [OfflineResume.tsx](../../src/features/workout-local/OfflineResume.tsx) · [App.css](../../src/App.css) |
| 06 | B01 | 나의 루틴 헤더 | 강조 | 전폭·자동 | 16/14/16/14 | 목록 13 | 제목 행 가로 8, 제목 상하 margin 6, 추가 액션 | 5 H (일반선) | I | [RoutineCards.tsx](../../src/features/workout-online/RoutineCards.tsx) · [Routine.module.css](../../src/features/workout-online/Routine.module.css) |
| 07 | B01 | 이번 주 일정 | 기본 | 전폭·자동 | 13 | 목록 13 | 카드 flex gap 10, 요일 묶음 margin 11, 행 gap 5·내부 6, 선택 accent | 5 S | I | [RoutineCards.tsx](../../src/features/workout-online/RoutineCards.tsx) · [Routine.module.css](../../src/features/workout-online/Routine.module.css) |
| 08 | B01 | 저장된 루틴 항목 | 목록 | 전폭·자동 | 10/12/10/12 | 카드 목록 9 | 상단 8, 이름·요약 4, 종목 줄 8, 이름 말줄임 | 5 S/H | I | [RoutineCards.tsx](../../src/features/workout-online/RoutineCards.tsx) · [Routine.module.css](../../src/features/workout-online/Routine.module.css) |
| 09 | B01 | 새 루틴 일정 배정 제안 | 기본† | 전폭·자동 | 21 | 위아래 margin 18 + 상위 stack | stack 18, 액션 별도 | 18 S | I | [PresetControls.tsx](../../src/features/workout-online/PresetControls.tsx) · [Presets.module.css](../../src/features/workout-online/Presets.module.css) |
| 10 | B02 | 루틴 요약 | 강조 | 전폭·자동 | 12 | 화면 20 | gap 20 + 지표 위 padding 20·구분선, 제목 최대 2줄 | 5 H | C | [RoutineDetail.tsx](../../src/features/workout-online/RoutineDetail.tsx) · [RoutineDetail.module.css](../../src/features/workout-online/RoutineDetail.module.css) |
| 11 | B02 | 웨이트·유산소 종목 상세 | 목록 | 전폭·자동 | 12 | 그룹 10, 그룹 간 20 | gap 12, 지표 위 margin 6 + padding 16, 메모 안쪽 8 | 5 S | C | [RoutineDetail.tsx](../../src/features/workout-online/RoutineDetail.tsx) · [RoutineDetail.module.css](../../src/features/workout-online/RoutineDetail.module.css) |
| 12 | B02 | 주간 일정 배정 상세 | 기본 | 전폭·자동 | 12 | 그룹 10 | 배정 행 최소 32, 반복 행 margin 12 + padding 12, 요일 칩 4 | 5 S | C | [RoutineDetail.tsx](../../src/features/workout-online/RoutineDetail.tsx) · [RoutineDetail.module.css](../../src/features/workout-online/RoutineDetail.module.css) |
| 13 | B03/B04 | 이름·태그 입력 컨테이너 | 입력 | 전폭·자동 | 14 | 폼 16 | gap 10, 라벨→조작 gap 6 | 5 S | I | [RoutineForm.tsx](../../src/features/workout-online/RoutineForm.tsx) · [RoutineEdit.module.css](../../src/features/workout-online/RoutineEdit.module.css) |
| 14 | B03/B04 | 웨이트·유산소 구성 카드 | 입력 | 전폭·자동 | 12 | fieldset 12 | 카드 12, 입력 그리드 8·윗 padding 12, 액션 가로 6 | 5 S | C | [RoutineForm.tsx](../../src/features/workout-online/RoutineForm.tsx) · [RoutineEdit.module.css](../../src/features/workout-online/RoutineEdit.module.css) |
| 15 | B03 | 새 루틴의 종목 없음 슬롯 | 상태† | 전폭·최소 78 | 8 | fieldset 12 | gap 4, 작은 EmptyState | 5 S 점선 | C | [RoutineForm.tsx](../../src/features/workout-online/RoutineForm.tsx) · [RoutineEdit.module.css](../../src/features/workout-online/RoutineEdit.module.css) |
| 16 | B03/B04 | 웨이트 선택·교체 검색 컨테이너 | 입력 | 전폭·자동 | 14 | fieldset 12 | formbox와 stack 겹침, 결과 행 구분선·스크롤. 유산소 선택 행도 검색 조작 | 5 S | I | [RoutineForm.tsx](../../src/features/workout-online/RoutineForm.tsx) · [RoutineEdit.module.css](../../src/features/workout-online/RoutineEdit.module.css) |
| 17 | B06 | 자동 순환 포함·제외 그룹 | 입력 | 전폭·자동 | 21 | stack 18 + 각 margin 위/아래 18 | stack 18, 프리셋 행 가로 9 | 18 S | I | [PresetOrderEditor.tsx](../../src/features/workout-online/PresetOrderEditor.tsx) · [Presets.module.css](../../src/features/workout-online/Presets.module.css) |
| 18 | B07 | 분류·프리셋 선택 표면 | 입력 | 전폭·자동 | 14/12/14/12 | 화면 16 | gap 12, 라벨 6, 세그먼트 gap 4 | 5 S | C | [MuscleAnalysis.tsx](../../src/features/statistics/MuscleAnalysis.tsx) · [WeeklyMusclePlan.module.css](../../src/features/statistics/WeeklyMusclePlan.module.css) |
| 19 | B07 | 주간 계획 요약 | 통계 | 전폭·자동, 내부 2열 | 14/12/14/12 | 화면 16 | 열 gap 0·구분선 1, 라벨 6 | 5 S | C | [MuscleAnalysis.tsx](../../src/features/statistics/MuscleAnalysis.tsx) · [WeeklyMusclePlan.module.css](../../src/features/statistics/WeeklyMusclePlan.module.css) |
| 20 | B07 | 계획 세트 분포 | 통계 | 전폭·자동 | 14/12/14/12 | 화면 16 | block 하위 그룹 margin 20, 행 padding 8, 가로 8 | 5 S | C | [MuscleAnalysis.tsx](../../src/features/statistics/MuscleAnalysis.tsx) · [WeeklyMusclePlan.module.css](../../src/features/statistics/WeeklyMusclePlan.module.css) |
| 21 | C01 | 준비운동 시간 | 특수† | 전폭·자동 | 34/V/34/V | 진행 본문 stack | 공통 gap 12·중앙 정렬, 마크 54 | 5 H | C | [WorkoutFrame.tsx](../../src/features/workout-flow/WorkoutFrame.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 22 | C01 | 준비운동 안내 | 특수† | 전폭·자동 | V | 진행 본문 stack | 공통 gap 12 | 5 S | C | [WorkoutFrame.tsx](../../src/features/workout-flow/WorkoutFrame.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 23 | C02 | 진행 중량·장비·한쪽 원판 | 특수† | 전폭·자동 | 12/V/12/V | 스와이프 본문 14 | 4×10, 장비 조건으로 2→3열, 장비·중량 줄바꿈 | 5 H | C | [WeightFocus.tsx](../../src/features/workout-flow/WeightFocus.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 24 | C02 | 세트 입력·이전 세트 | 특수† | 전폭·자동, 표 확보 | 12/8/12/8 | 스와이프 본문 14 | gap 7, 제목 grid 4, 표 좌우 margin 3. 이전 기록은 열·참조이며 추가 카드 없음 | 5 S | C | [WeightFocus.tsx](../../src/features/workout-flow/WeightFocus.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 25 | C02/C03 | 운동 시계·휴식 상태 / 하단 진행 액션 | 특수† | 셸 전폭, 시계 셀 최소 62, 하단 조작 50 | 시계 셀 8/4/8/4, 하단 9/페이지좌우/9+Safe Area/페이지좌우 | 독립 고정 프레임 | 상단 3열 gap 2·구분선, 하단 gap 6, 임박 휴식 바만 5px 제어 표면 | 0 S/페이지 | I | [WorkoutFrame.tsx](../../src/features/workout-flow/WorkoutFrame.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 26 | C03 | 당시 유산소 계획 | 특수† | 전폭·자동, 내부 3열 | 12 | 스와이프 본문 12 | gap 12, 지표 내부 좌우 5·구분선 | 5 S | C | [CardioFocus.tsx](../../src/features/workout-flow/CardioFocus.tsx) · [CardioFocus.module.css](../../src/features/workout-flow/CardioFocus.module.css) |
| 27 | C03 | 유산소 측정 타이머 | 특수† | 전폭·최소 126 | 12 | 스와이프 본문 12 | 중앙 gap 6, 측정·정지 상태색 | 5 T | C | [CardioFocus.tsx](../../src/features/workout-flow/CardioFocus.tsx) · [CardioFocus.module.css](../../src/features/workout-flow/CardioFocus.module.css) |
| 28 | C03 | 유산소 확인 입력 | 입력† | 전폭·자동, 내부 2열 | 12 | 스와이프 본문 12 | 카드 12, 입력 8, 실측 시간 줄 6, 최소 54 | 5 S | C | [CardioFocus.tsx](../../src/features/workout-flow/CardioFocus.tsx) · [CardioFocus.module.css](../../src/features/workout-flow/CardioFocus.module.css) |
| 29 | C03 | 유산소 실제 완료 기록 | 특수† | 전폭·자동 | 12 | 진행 stack | 카드 12 및 기록 그룹 구분 | 5 S | C | [CardioFocus.tsx](../../src/features/workout-flow/CardioFocus.tsx) · [CardioFocus.module.css](../../src/features/workout-flow/CardioFocus.module.css) |
| 30 | C04 | 이번 운동만 수정 안내·조작 | 입력† | 전폭·자동 | V | 운동 편집 위치 | 공통 12, 변경·제외·세트 작업. 웨이트·유산소가 다른 작업을 표시 | 5 S | C | [LocalWorkoutFlow.tsx](../../src/features/workout-local/LocalWorkoutFlow.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 31 | C04 | 기구 변경 폼·유산소 재구성 | 입력† | 전폭 또는 Dialog 내부·자동 | V 또는 12 | 진행·기능 Dialog 레이아웃 | 인라인 장비 폼 gap 12, 유산소 입력과 조건부 행 | 5 S¹ | C | [WorkoutDialogs.tsx](../../src/features/workout-flow/WorkoutDialogs.tsx) · [RoutineEdit.module.css](../../src/features/workout-online/RoutineEdit.module.css) |
| 32 | C05/D03 | 운동 요약 헤더 | 강조 | 전폭·자동 | 10/12/14/12 | 형제 margin 16 | gap 8, 요약 지표 상단 12, 3열 | 5 H | C | [WorkoutSummary.tsx](../../src/features/workout-flow/WorkoutSummary.tsx) · [WorkoutRecordDetail.module.css](../../src/features/workout-flow/WorkoutRecordDetail.module.css) |
| 33 | C05/D03 | 웨이트·유산소 수행 | 기본 | 전폭·자동 | 14/12/14/12 | 형제 margin 16, 검토 인접 10 | gap 12, 종목 위 20 margin+24 padding, 첫 종목 20+4 | 5 S | C | [WorkoutSummary.tsx](../../src/features/workout-flow/WorkoutSummary.tsx) · [WorkoutRecordDetail.module.css](../../src/features/workout-flow/WorkoutRecordDetail.module.css) |
| 34 | C05/D03 | 과거 중량 검토 접이형·내부 행 | 통계 | 전폭·자동, 트리거 최소 44 | 0/12/0/12 | 형제 margin 10 | 열면 gap 6, 내부 Card padding 0·투명·테두리 0, 검토 행 상하 8 | 5 S (내용 0선) | C | [WorkoutSummary.tsx](../../src/features/workout-flow/WorkoutSummary.tsx) · [WorkoutRecordDetail.module.css](../../src/features/workout-flow/WorkoutRecordDetail.module.css) |
| 35 | C05/D03 | 승인 대기 검토 | 입력† | 전폭·자동 | 8/12/8/12 | 형제 margin 16 | gap 6 또는 8, 좁은 화면·긴 제목 말줄임 | 5 S | C | [WorkoutSummary.tsx](../../src/features/workout-flow/WorkoutSummary.tsx) · [WorkoutRecordDetail.module.css](../../src/features/workout-flow/WorkoutRecordDetail.module.css) |
| 36 | C05/D03 | 기록 보존 안내 | 기본 | 전폭·자동 | 14/12/14/12 | 형제 margin 16 | gap 10, 제목·본문 margin 0 | 5 S | C | [WorkoutSummary.tsx](../../src/features/workout-flow/WorkoutSummary.tsx) · [WorkoutRecordDetail.module.css](../../src/features/workout-flow/WorkoutRecordDetail.module.css) |
| 37 | C06 | 읽기 전용 세션·기기 인계 | 특수† | 전폭·자동 | 21 | margin 18 + 상위 흐름 | stack 18, 원계획·서버 계획 접이형, 재확인 | 18 S | I | [WorkoutWorkspace.tsx](../../src/features/workout-online/WorkoutWorkspace.tsx) · [App.css](../../src/App.css) |
| 38 | D01 | 이번 주 요약 | 통계 | 전폭·자동 | 16/14/14/14 | 메인 섹션 22 | gap 0, 핵심 지표 margin 14·진척 9, 지표 상자 묶음 18+16 | 5 S | C | [StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx) · [RecordMain.module.css](../../src/features/statistics/RecordMain.module.css) |
| 39 | D01 | 주간 요약 지표 타일 | 중첩 | 3등분, 최소 76 | 9/8/9/8 | 가로 7 | justify-content는 내용별, 외곽 무선 | 5 I 무선 | I | [StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx) · [RecordMain.module.css](../../src/features/statistics/RecordMain.module.css) |
| 40 | D01 | 운동 분석 진입 타일 | 목록† | 2등분, 최소 107 | 12 (320에서 10) | 가로·세로 8 | 아이콘→텍스트 flex gap 16, 제목→설명 3 | 5 S 투명선 | I | [StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx) · [RecordMain.module.css](../../src/features/statistics/RecordMain.module.css) |
| 41 | D01 | 기록 탭 최근 운동 항목 | 목록 | 전폭·자동 | 12 | 최근 묶음 8 | 카드 grid 8, 날짜·상태 6 (좁으면 4) | 5 S | I | [RecordFeed.tsx](../../src/features/history/RecordFeed.tsx) · [RecordMain.module.css](../../src/features/statistics/RecordMain.module.css) |
| 42 | D02 | 월·일정/종목 필터 외곽 | 입력 | 전폭·자동 | 14/12/14/12 | 전체 이력 stack | 외부 gap 12, 기간 조작 카드 안에서 투명(중첩 테두리 없음) | 5 S | C | [RecordFeed.tsx](../../src/features/history/RecordFeed.tsx) · [RecordMain.module.css](../../src/features/statistics/RecordMain.module.css) |
| 43 | D02 | 전체 운동 이력 항목 | 목록 | 전폭·자동 | 12 | 목록 stack 9/13² | 같은 SessionRecordCard, 상단·하단 구성은 데이터·호출 맥락에 따름 | 5² S | I | [RecordFeed.tsx](../../src/features/history/RecordFeed.tsx) · [RecordMain.module.css](../../src/features/statistics/RecordMain.module.css) |
| 44 | D04/D06 | 정정·평가 이력 요약 | 강조 | 전폭·자동 | V | 상위 summary stack | 공통 12·날짜와 상태 | 18 H | C | [ClosedWorkout.tsx](../../src/features/workout-online/ClosedWorkout.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 45 | D04 | 완료 수행 컨테이너 | 입력 | 전폭·자동 | V | 상위 summary stack | 종목별 행·구분선, 각 수치/수행 액션 | 18 S | C | [ClosedWorkout.tsx](../../src/features/workout-online/ClosedWorkout.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 46 | D03/D04/D06 | 변경 결과 미확인·재확인 | 상태† | 전폭·자동 | V | 해당 본문 stack | 공통 12, 상태 안내와 조회 액션 | 18 S | C | [ClosedWorkout.tsx](../../src/features/workout-online/ClosedWorkout.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 47 | D06 | 공식 평가·변경 이력 | 통계 | 전폭·자동 | V | 관리 화면 stack | 종료 당시·현재 평가 그룹, 종목/이력 섹션 내부 구분 | 18 S | C | [ClosedWorkout.tsx](../../src/features/workout-online/ClosedWorkout.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 48 | D04/D06 | 기록 관리의 승인 확인 필요 | 상태† | 전폭·자동 | 21 | summary gap 14 + 카드 margin 18 | stack 18, 현재 승인 확인 | 18 S | I | [ClosedWorkout.tsx](../../src/features/workout-online/ClosedWorkout.tsx) · [App.css](../../src/App.css) |
| 49 | D04 | 정정 Dialog 내부 원본 사실 | 입력† | Dialog 내부·자동 | V | 기능 Dialog stack | 공통 12, 원본 사실과 실제 수정 필드 | 18 S | C | [ClosedWorkout.tsx](../../src/features/workout-online/ClosedWorkout.tsx) · [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css) |
| 50 | E01 | 기간 선택 외곽 | 입력 | 전폭·자동 | 14/12/14/12 | 화면 16 | 카드 12, 달력·기간 그리드 4 | 5 S | I | [PeriodControls.tsx](../../src/features/statistics/PeriodControls.tsx) · [Activity.module.css](../../src/features/statistics/Activity.module.css) |
| 51 | E01 | 완료 세트·총중량 타일 | 통계 | 2등분, 최소 86 | 14/12/14/12 | 가로 8, 제목과 묶음 10 | flex gap 12, 주 값 줄바꿈 | 5 S | C | [StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx) · [Activity.module.css](../../src/features/statistics/Activity.module.css) |
| 52 | E01 | 운동량 추이·검색 | 통계 | 전폭·자동, 차트 슬롯 최소 220 | 14/12/14/12 | 화면 16 | 카드 12, 차트 제목 상단 padding 12, 검색 입력 가로 6 | 5 S | C | [StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx) · [Activity.module.css](../../src/features/statistics/Activity.module.css) |
| 53 | E01 | 달성 현황·주간 타일 | 통계 | 전폭·자동 | 14/12/14/12 | 화면 16 | 카드 12, 날짜 그리드 4, 요약 슬롯 최소 46 | 5 S, 내부 I | C | [StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx) · [Activity.module.css](../../src/features/statistics/Activity.module.css) |
| 54 | E01 | 유산소 현황·상세 | 통계 | 전폭·자동, 지표 내부 최소 82 | 14/12/14/12 | 화면 16 | 카드 12, 지표 flex 16, 가운데 구분선 | 5 S | C | [StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx) · [Activity.module.css](../../src/features/statistics/Activity.module.css) |
| 55 | E02 | 분석할 운동 검색 | 입력 | 전폭·자동 | 14/12/14/12 | 화면 16 | gap 12, 검색 margin 0, 결과 스크롤 | 5 S | C | [GrowthPanel.tsx](../../src/features/statistics/GrowthPanel.tsx) · [Growth.module.css](../../src/features/statistics/Growth.module.css) |
| 56 | E02 | 성장 분석·중량 그래프 | 통계 | 전폭·자동 | 14/12/14/12 | 화면 16 | gap 12, 차트 내부 gap 4·별도 그림 영역 | 5 S | C | [GrowthPanel.tsx](../../src/features/statistics/GrowthPanel.tsx) · [Growth.module.css](../../src/features/statistics/Growth.module.css) |
| 57 | E02 | 최신 공식 승인 중량 요약 | 중첩 | 부모 내부·자동 | 12 | 상위 gap 12 | 자체 gap 12, 마지막 행 padding-top 10 + 구분선 | 5 A | I | [GrowthPanel.tsx](../../src/features/statistics/GrowthPanel.tsx) · [Growth.module.css](../../src/features/statistics/Growth.module.css) |
| 58 | E02 | 승인 중량 변경 이력 | 목록 | 전폭·자동 | 14/12/14/12 | 화면 16 | 카드 12·이력 행 구분선, 선택 기록 상세로 연결 | 5 S | C | [GrowthPanel.tsx](../../src/features/statistics/GrowthPanel.tsx) · [Growth.module.css](../../src/features/statistics/Growth.module.css) |
| 59 | E03 | 기간·보기 방식 컨트롤 | 입력 | 전폭·자동 | 14/12/14/12 | 화면 16 | gap 12, 기간 가로 12, 컨트롤 정보 6 | 5 S | C | [MuscleAnalysis.tsx](../../src/features/statistics/MuscleAnalysis.tsx) · [WeeklyMusclePlan.module.css](../../src/features/statistics/WeeklyMusclePlan.module.css) |
| 60 | E03 | 주간 세트 달성 | 통계 | 전폭·자동 | 14/12/14/12 | 화면 16 | 카드 gap 14, 게이지 행 12 | 5 S | C | [MuscleAnalysis.tsx](../../src/features/statistics/MuscleAnalysis.tsx) · [WeeklyMusclePlan.module.css](../../src/features/statistics/WeeklyMusclePlan.module.css) |
| 61 | E03 | 근육별·분류별 달성 분포 | 통계 | 전폭·자동 | 14/12/14/12 | 화면 16 | 그룹 margin 20, 행 padding 8, 수치 줄바꿈 | 5 S | C | [MuscleAnalysis.tsx](../../src/features/statistics/MuscleAnalysis.tsx) · [WeeklyMusclePlan.module.css](../../src/features/statistics/WeeklyMusclePlan.module.css) |
| 62 | F01 | 내 계정 요약 | 강조 | 전폭·자동, 지표 최소 48 | 16 | 화면 16 | gap 12, 첫 행 가로 12, 지표 행 8 | 5 H | C | [SettingsMain.tsx](../../src/features/settings/SettingsMain.tsx) · [SettingsMain.module.css](../../src/features/settings/SettingsMain.module.css) |
| 63 | F01 | 운동 설정 / 데이터 및 앱 / 계정·데이터 삭제 그룹 | 기본 | 전폭·자동, 내부 행 최소 64 | 0/12/0/12 | 화면 16 | gap 0, 개별 행 구분선, 제목→설명 3 | 5 S | C | [SettingsMain.tsx](../../src/features/settings/SettingsMain.tsx) · [SettingsMain.module.css](../../src/features/settings/SettingsMain.module.css) |
| 64 | F01 | 앱 설치·오프라인 준비 | 기본 | 전폭·자동, 접힌 트리거 최소 64 | 0/12/0/12 | 이전 그룹과 8 (16−8 margin) | 닫힌 행과 펼친 stack, 열면 본문 증가 | 5 S | I | [PwaStatus.tsx](../../src/pwa/PwaStatus.tsx) · [SettingsMain.module.css](../../src/features/settings/SettingsMain.module.css) |
| 65 | F02 | 내 이메일·인증 / 로그인 수단 / 보안 / 기기 링크 | 입력 | 전폭·자동 | 12 | 화면 16 | card 12, 글 3, provider 10, 액션 열 8, 인증은 동일 카드 변형. 기기 링크는 세로 패딩 0 | 5 S | C | [AccountSettings.tsx](../../src/features/auth/AccountSettings.tsx) · [AccountSettings.module.css](../../src/features/auth/AccountSettings.module.css) |
| 66 | F03 | 기기 요약 | 통계 | 전폭·자동 | 12 | 화면·묶음 12 | gap 12, 지표 영역 상태별 | 5 #202630·hero선 | C | [LoggedInDevices.tsx](../../src/features/auth/LoggedInDevices.tsx) · [LoggedInDevices.module.css](../../src/features/auth/LoggedInDevices.module.css) |
| 67 | F03 | 현재 및 다른 기기 항목 | 목록 | 전폭·자동 | 12 | 기기 묶음 12 | 카드 12, 현재 기기 배지, 긴 기기명·정보 줄바꿈 | 5 S | C | [LoggedInDevices.tsx](../../src/features/auth/LoggedInDevices.tsx) · [LoggedInDevices.module.css](../../src/features/auth/LoggedInDevices.module.css) |
| 68 | F04 | 반복 구간별 휴식 시간 | 입력 | 전폭·자동 | 12 | 페이지 14, form 12 | 자체 gap 0, 제목→설명 4, 경계 padding 12, 읽기 행/편집 열 8 | 5 S | C | [RestSettings.tsx](../../src/features/settings/RestSettings.tsx) · [RestSettings.module.css](../../src/features/settings/RestSettings.module.css) |
| 69 | F05 | 알림 옵션 그룹 | 입력 | 전폭·자동 | 0/12/0/12 | 화면 12 | gap 0, 분할 행 padding 8/12, 행 내부 10, 제목·토글 6 | 5 S | C | [RestAlertSettings.tsx](../../src/features/settings/RestAlertSettings.tsx) · [RestAlertSettings.module.css](../../src/features/settings/RestAlertSettings.module.css) |
| 70 | F05 | 실서비스 알림 시연 표면 | 특수† | 전폭·자동, 2열 | 10/12/12/12 | 화면 12 | gap 9, 상/하단 자체 경계와 상태 차이 | 5 S/I | C | [RestAlertSettings.tsx](../../src/features/settings/RestAlertSettings.tsx) · [RestAlertSettings.module.css](../../src/features/settings/RestAlertSettings.module.css) |
| 71 | F06 | 표준 운동 검색·목록 외곽 | 입력 | 전폭·가용 높이 제약³ | V | 화면 14 | 카드 14, 결과 내부 스크롤과 행 구분선 | 18 S | C | [PublicCatalog.tsx](../../src/features/workout-online/PublicCatalog.tsx) · [PublicCatalog.module.css](../../src/features/workout-online/PublicCatalog.module.css) |
| 72 | F07 | 운동 식별·기구/분류 / 주요·보조 근육 | 기본 | 전폭·자동 | V | 화면 14 | 카드 12, 목록 행 padding 8, 근육명/역할 8 | 18 S | C | [PublicCatalog.tsx](../../src/features/workout-online/PublicCatalog.tsx) · [PublicCatalog.module.css](../../src/features/workout-online/PublicCatalog.module.css) |
| 73 | F07 | 자세 미디어 슬롯과 상위 카드 | 특수† | 전폭·미디어 1:1 | V (미디어 0) | 화면 14 | 카드 12, 미디어 dashed 1·radius 10, 보호 미디어 확인 별개 | 18 S / 10 I | C | [PublicCatalog.tsx](../../src/features/workout-online/PublicCatalog.tsx) · [PublicCatalog.module.css](../../src/features/workout-online/PublicCatalog.module.css) |
| 74 | F07 | 운동 방법 접이형 | 기본 | 전폭·자동, 트리거 최소 52 | 0/V/0/V | 화면 14 | 트리거 가로 8, 열면 구분선+12 padding, 절차 행 margin 6 | 18 S | C | [PublicCatalog.tsx](../../src/features/workout-online/PublicCatalog.tsx) · [PublicCatalog.module.css](../../src/features/workout-online/PublicCatalog.module.css) |
| 75 | F09 | 이메일 인증코드 입력 | 입력 | 전폭·자동 | 21 | 부모 stack + margin 18 | stack 18, OTP 필드 최소 64 | 18 S | I | [LoginScreens.tsx](../../src/features/auth/LoginScreens.tsx) · [auth.css](../../src/features/auth/auth.css) |
| 76 | F10 | 로그인 상태 조회 오류(연결 재확인) | 상태† | 전폭·자동 | 21 | 부모 stack + margin 18 | stack 18, 시작 화면 내 설명·조작 | 18 S | I | [AuthApp.tsx](../../src/features/auth/AuthApp.tsx) · [auth.css](../../src/features/auth/auth.css) |
| 77 | 공통 | 독립 EmptyState·조회 오류 | 상태† | 전폭·최소 222 | 20/16/20/16 | 호출 레이아웃 | gap 6 + 아이콘·액션 margin 4, embedded는 padding 16/0·선 0·min 0 | 18 S, embedded 투명 | I | [ContentFeedback.tsx](../../src/components/common-ui/ContentFeedback.tsx) · [ContentFeedback.module.css](../../src/components/common-ui/ContentFeedback.module.css) |
| 78 | 공통 | 초기 로딩 skeleton 묶음 | 상태† | 전폭·슬롯별 min-height | 슬롯별 12~14 | region 12 | 보이는 자리표시자, 정상 콘텐츠 높이/위치를 추정 | 5 S/I | C | [LoadingSkeleton.tsx](../../src/components/LoadingSkeleton.tsx) · [LoadingSkeleton.module.css](../../src/components/LoadingSkeleton.module.css) |

¹ 인라인 장비 폼은 `.flow`의 5px 토큰을 상속했다. 유산소 구성은 `RoutineEdit`에서 5px을 직접 지정한다. 기능형 모달 외곽은 별도 승인 범위다.
² `SessionRecordCard`에는 전용 모듈과 `statistics.css`의 0px→`--radius-control` 선언이 공존한다. 실제 맥락의 승자는 아래 Chrome 결과로 확인했다. 독립 FRONT 18 RecordFeed의 부모는 실제 기록 탭과 다르다. 두 맥락에서 `RecordMain` 모듈의 5px이 관찰됐다. [전역 기록 CSS](../../src/features/statistics/statistics.css)
³ 카탈로그 목록 상위 `max-block-size: calc(100dvh - 상하 inset)` 및 결과 목록 스크롤. 높이 600px 이하에서는 상위 제한을 풀어 페이지를 스크롤한다. `--space-card`는 좁은 폭에서 바뀌며 미디어 높이는 가용 너비에 따라 달라진다.

## 4. 카드 유형과 구현 차이

| 유형 | 주요 사용처 | 현재 규격·차이 | 공통화 가능 범위 | 기능상 예외 |
| --- | --- | --- | --- | --- |
| 기본 | 양쪽 주간 일정, 루틴 상세 배정, 설정 그룹, 운동 상세 | 5·18px, 패딩 12·13·18, 설정 일부 0/12 | 외곽 토큰과 빈 행 없는 레이아웃 | 날짜 그리드·접이형 본문과 독립 스크롤 |
| 강조 | 홈 오늘·ACTIVE, 루틴/운동 요약, 내 계정 | 대부분 5px, 패딩 10/12/14부터 16까지, H | hero 색·선과 외곽 공유 | 순서를 표현하는 기록 헤더, 디로딩 hero 색 |
| 목록 | 루틴·최근 운동·전체 이력·기기·분석 진입 | 패딩 10·10/12·12, gap 7–12, 높이 밀도 상이 | 외곽/포커스 공유, 기존 도메인 컴포넌트 유지 | 홈 한 줄 요약, 기록 카드의 행 수, 분석 2열 |
| 중첩 | 날짜 상세·요약 지표·성장 최신 수치 | 입력·accent-soft 표면, 0·5px, 테두리 0 또는 1 | 패딩·표면·경계 토큰 | 데이터 위계를 전달하는 강조 슬롯 |
| 통계 | 기록 주간 요약·차트·근육·기기 요약 | 주로 5px, 14/12, 카드 외부 16. 기록 주간 요약은 16/14/14/14 | 같은 본문 패딩과 제목–본문 규칙 | 차트 최소 높이, 수치 타일 정렬·셀 분할 |
| 입력 | 루틴 구성·기록 검색·휴식·계정·카탈로그 | 5·18px, 12·14·18·21, 행마다 격자 다름 | 외곽만 공유. 동일 루틴 폼은 기존 컴포넌트 | 키보드와 고정 저장 푸터, 유산소 단위·편집 |
| 특수 | 운동 준비·카드·타이머·프레임, 오프라인 복구 | 0·5·18px, 프레임은 셸 전폭. 카드 높이 가변 및 타이머 하한 | 일부 테마 토큰만 공유 | 세트 4열·기기 인계·미디어 비율·고정 프레임 |
| 상태 | EmptyState, 오류, skeleton, 미확인 | 독립 18px·222px, embedded 투명, skeleton 5px | 상태 경계·자리 유지 기준 | 응답 이전 자리·재시도·기존 데이터 보존 |

### 5px과 18px의 적용 경로

- **5px의 두 경로.** 테마의 `--radius-card-compact:5px`를 루틴 주간 일정과 휴식 카드가 직접 사용한다. 홈 오늘·이번 주·최근, 루틴 목록·폼·상세, 기록 메인과 기록 상세, 운동 현황·성장·근육, 설정 메인·계정·기기·알림은 화면 CSS가 대체로 5px을 직접 선언한다. 운동 프레임 내부는 `.flow`가 `--radius-card`와 `--radius-control`을 5px로 재정의한다. skeleton 컨테이너도 자기 범위의 5px을 적용한다. [테마](../../src/app/theme.module.css) · [운동 프레임](../../src/features/workout-flow/WorkoutFlow.module.css#L29) · [초기 로딩](../../src/components/LoadingSkeleton.module.css)
- **18px의 두 경로.** `.app-card`의 테마 기본값으로 표준 운동 목록·상세(정보·미디어·방법·근육), 정정·복구 화면의 기본 Card, 외부 EmptyState·오류·일부 보호 배너에 남아 있다. 전역 `.card` 표면에서는 로그인 코드·연결 실패, 오프라인 이어가기, 읽기 전용 세션, 일정 전체 편집 그룹·새 루틴 배정 제안 등이 18px이다. 전역 `.card`은 패딩 21px와 margin 18px를 갖고 테마가 배경·선을 다시 지정한다. `.app-card` 기본 18/14px 패딩에는 그 margin이 없다. 이 차이는 기능별 과거 구현과 화면 승인 범위에서 비롯된다. [전역 CSS](../../src/App.css#L5) · [공통 CSS](../../src/components/ui.module.css#L9) · [공통 상태 CSS](../../src/components/common-ui/ContentFeedback.module.css) · [Visual Theme 기존 규칙](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)
- **문서와의 관계.** Visual Theme 10~14절은 운동 5px, 루틴 상세·편집 5px, 계정 5px/12px, 설정 메인 16px와 설치 인접 8px, 반복 휴식 5px/12px을 화면별로 기록한다. 18절이 대체한 과거 규격은 **메시지형 Dialog에 적용하던 18px**이다. 카탈로그나 레거시 표면의 18px을 기능적으로 필수라고 정한 근거는 확인하지 못했다. 승인된 운동 규칙과 실제 적용치는 아래 4-2 후보를 검토할 때 구분한다. [Visual Theme 18절](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#front18-feedback-visual) · [결정 이력](../product/Overload_UI_Decision_Log_v0.9.md#front18-stage3-decision)

### 상태 변화와 중첩 구조

| 상태 또는 구조 | 코드에서 확인한 변화 | 4-2 판단 근거 |
| --- | --- | --- |
| 정상 → 최초 로딩 | 홈 오늘·주간·최근에 대응하는 별도 슬롯, 루틴/기록/카탈로그에 로딩 또는 skeleton. 홈은 정상 루틴과 기간·종목 수에 따라 더 커짐 | 높이 일치 자체보다 첫 번째 주요 콘텐츠와 동작 버튼 위치 보존 |
| 기존 데이터 재조회·실패 | 동일 화면의 데이터 및 입력을 유지하는 분기, 대기 중 액션의 크기 유지, 결과 통지 Toast | 기존 카드가 있다면 새 장식 외곽이나 상단 margin 삽입을 피하는 기준 |
| 최초 빈 상태·최초 실패 | 독립 표면은 최소 222px와 패딩 20/16, embedded는 최소 0·테두리 없음. 제목·아이콘·액션과 오류 톤이 달라짐 | 정상 빈 목록과 실패·재시도 구분 유지. 본문 안에서는 embedded 구조를 먼저 검토 |
| 편집, 선택, 펼침 | 휴식 읽기↔편집은 같은 outer padding 안에서 행/버튼이 교체됨. 주간 선택은 색·선과 날짜 상세, 루틴 배정은 hero, 설치·운동 방법·중량 검토는 펼친 본문만 증가 | 의도적인 정보량 증가. 5px·선·경계와 기존 저장/취소 위치 보존 |
| 긴 제목·항목 증가 | 루틴 상세 2줄, 루틴 목록/홈 최근은 말줄임, 운동 요약은 줄바꿈이나 화면별 한 줄, 통계·근육·메모는 줄바꿈. 카탈로그만 가용 높이 후 목록 스크롤 | 데이터가 늘어나는 정상 높이 차이. 목록 여러 열을 고정 높이로 맞출 이유 없음 |
| 성장 요약·주간 지표 | 성장에 외부 카드+accent-soft 내부 카드+내부 구분선. 주간 지표는 입력색 타일 3개에 별도 테두리 없음 | 성장의 최신 값을 구분하는 배경은 가치가 있다. 4-2에 외부·내부 두 겹의 선을 유지할지 검토 |
| 일정·날짜 상세 | 홈은 카드→날짜 조작→입력색 상세와 테두리. 루틴의 세로 날짜 행은 클릭 대상 자체에 선과 선택색, 카드 아래 선택 정보 | 홈 상세는 색이나 한 줄 구분선만으로 날짜 결과 귀속이 명확한지 확인. 선택 행 경계는 조작 단서 |
| 운동 상세의 과거 중량 검토 | JSX Card 안의 Card이지만 내부는 이미 투명·패딩 0·선 0. 펼침 gap 6 | 시각 중복 없음. 공통 내부 카드를 적용해 안쪽 선을 되살리지 않도록 한다 |
| 루틴 편집·설정 그룹 | edit 카드 내부의 폼·메모·액션 구분선, 휴식 옵션·일반 설정을 한 외곽 안에서 행으로 분할 | 같은 외곽 안에 필요한 그룹. 개별 행마다 카드 프레임을 추가할 이유가 없음 |

## 5. 불일치와 개선 후보

| 번호 | 화면 및 카드 | 문제와 원인 | 사용자 영향 | 우선순위 | 4-2 검토 방향 |
| --- | --- | --- | --- | --- | --- |
| 1 | 루틴 일정·휴식·설정·기록과 카탈로그 | 같은 Onyx·1px 외곽에서 반경 5/18과 padding 12–18 혼용. compact·직접 지정·기본 상속이 각각 작동 | 일반 서비스 화면 이동 시 둥근 정도·내용 들여쓰기가 달라짐 | P1 | 5px 일반 외곽 후보, 카탈로그 목록과 상세에서 먼저 시각 비교 |
| 2 | 일정 순환 그룹·인계·오프라인·OTP, 공통 외곽 | 전역 `.card`의 21px과 margin 18이 위치 제어까지 담당. `.app-card`에는 같은 margin 없음 | 외곽 상자와 양쪽 레이블 정렬이 다름. grid의 두 18px margin과 18px gap은 인접 상자 간 선언 합계 54px | P1 | 상위 gap 하나를 기준으로 하고 로딩 및 복구 여유를 화면별 검토 |
| 3 | 홈↔루틴의 이번 주 일정과 일반 기본 카드 | 홈 flex 열 gap 13, 루틴 내부 gap 10과 행 시작 margin 11, 휴식 설정은 카드 gap 0·내부 구획으로 구현 | 같은 외곽 안에서 제목 다음 콘텐츠 시작점과 밀도가 달라짐 | P2 | 둘의 13px을 비교 기준으로 보존하거나 일반 12px/제목–본문 12px 변형 설정 |
| 4 | 홈 최근·기록 최근·전체 이력·루틴 리스트 | 카드 간 7·8·9/13과 padding 10·10/12·12. 기록은 전역·모듈 cascade도 얽힘 | 역할은 반복 이력인데 외곽과 스캔 속도가 화면별 차이 | P2 | 같은 기록 컴포넌트의 반경부터 정렬. 홈 압축 행과 루틴 행은 밀도 변형 |
| 5 | 기록 상세 수행 및 루틴 요약 지표 | 수행 종목 사이 margin 20+padding 24, 요약에는 gap 20+지표 상단 padding 20 | 상세에서 여러 종목·지표가 한꺼번에 밀려 스크롤 증가 | P2 | 제목–본문과 구분선 양옆 공간을 한 곳에서 제어. 기록 세트·장비 문맥 유지 |
| 6 | 기록 메인과 상세, 루틴 상세 | 주요 섹션 22·20, 상세 형제 margin 16 또는 10, 다른 목록은 8–16 | 템플릿이 바뀔 때 호흡이 달라짐. 메인 주요 섹션과 한 목록의 반복 간격은 역할 차이가 있음 | P2 | 섹션 20과 카드 12/16을 구분해 후보 선정. 검토 접이형의 10은 위계 확인 |
| 7 | 홈 날짜 상세, 성장 최신 중량 | 바깥·안쪽 모두 선을 쓰고 성장에는 내부 구분선을 더함 | 320px에서 내용보다 경계 층이 두드러질 수 있음 | P3 | 입력색/강조 배경을 유지하고 내측 선 또는 중복 구분선 한 층 검토 |
| 8 | 기록 주간 타일·분석 진입·운동 현황 및 오류 | 76·107·86·222는 주로 min-height. 고정 220 계열은 차트 슬롯, 운동 영역은 타이머·고정 조작 | 의도된 균형·로딩 안정성. 번역·긴 값 증가도 허용 | P3 | 일반 카드에는 고정치 추가를 피하고, 해당 슬롯은 하한과 넘침만 확인 |
| 9 | 운동 진행 중량 및 세트, 요약 헤더 | Visual Theme 운동 절의 화면 전용 5px과 요약 14/12. 진행 중량의 좌우는 공통 18/14, 세트는 8, 요약 헤더 상단 10 | 좁은 세트 표 가독성과 요약 compact 헤더에 필요한 변형일 수 있음 | P2 | 출처별 실제 패딩 표기 후 운동 표·프레임 예외를 보존. 4-2에서 승인 적용 위치 확인 |
| 10 | 기록 CSS 및 레거시 전역 CSS | 동일 카드에 전역 0/제어 반경과 Module 5가 공존, 일반 카드도 기록 CSS에서 5→18 후 모듈 재정의 | 호출부·import 맥락에 따라 계산값을 추적하기 어려움 | P3 | 중복 셀렉터는 selector match 근거로만 4-3 후보 검토. 전역 카드는 인증·복구에 사용 중 |
| 11 | 320px의 루틴·통계·요약과 가로 타일 | 374·350·360px별 규칙과 2/3/7열, 드롭다운·목록 내부 스크롤이 공존 | 좁은 화면의 경계·내용 시작점이 바뀜. 수치 줄바꿈과 내부 스크롤은 정상 | P3 | 셸 14px과 용도별 지역 축소를 보존. 고정 수치 통일 전에 내용과 포커스 확인 |

### 현재 소스에서 확인한 중복과 미연결 스타일

`Routine.module.css`의 `.card`와 공통 `.app-card`는 같은 일반 배경·선·모서리 조합을 별도로 정의한다. 루틴 모듈의 `.hero`는 나의 루틴 헤더, `.targets`는 세트·반복 폼에서 사용한다. `.cardSummary`와 `.categories`는 제품 및 Preview TSX에서 모듈 참조를 찾지 못했다. 런타임 매칭이나 동적 클래스를 확인한 이후에만 삭제를 결정할 수 있다. `App.css`의 `.today-card` 20px과 옛 Demo용 `.card` 규칙은 해당 경로의 진입점을 확인해야 한다. 전역 `.card` 자체는 서비스에서도 쓰인다. [루틴 모듈](../../src/features/workout-online/Routine.module.css) · [공통 카드](../../src/components/ui.module.css) · [개발 Demo](../../tests/fixtures/review/DemoApp.tsx)

## 6. 기준 카드 후보

| 후보 | 실제 서비스의 선언 | 사용 범위 | 기준으로 좋은 점 | 보완할 점 | 적합성 |
| --- | --- | --- | --- | --- | --- |
| 루틴 ‘이번 주 일정’ | 5px·1px `#353941`·`#1B1D22`, 패딩 13, 내부 flex gap 10, 본문 목록 gap 5 + 상단 margin 11 | 루틴 탭에서 상시 노출, 7요일 두 보기 | 3단계 메시지 외곽 결정에 쓰인 서비스 카드, 무강조 기본 카드 | 일정 전용 행·메뉴·프리셋 배치는 바깥 기준만 공유 | 외곽 1순위 |
| 반복 구간별 휴식 시간 | 같은 외곽, 패딩 12, 제목→설명 4, 헤더 아래 padding 12, 읽기와 편집 8 | 휴식 설정 주 카드, 모드 공용 | 4방향 기준이 명확하고 읽기·편집 양쪽에 맞음 | 폼 자체의 gap 0과 행 구분선은 적용 위치 제한 | 패딩·제목 1순위 |
| 홈 ‘이번 주 일정’ | 같은 외곽, 패딩 13, 제목 아래 margin 11, 날짜 상세 앞 8 | 홈의 상시 일반 카드 | 홈 경계와 기본 카드의 정렬을 바로 비교 | 날짜 상세 중첩 및 7칸 밀도 | 일반 외곽 교차 확인 |
| 홈 ‘오늘의 루틴’ | 5px·hero선·hero 그라데이션, 패딩 16/13, 리스트 내용에 따라 증가 | 홈 강조, ACTIVE 같은 영역 | 강조형 실제 사례 | 기본 카드와 제목·CTA 역할이 다름 | 강조형 기준 |
| 기록 ‘이번 주 요약’ | 5px·일반 표면, 16/14/14/14, 3열 타일 gap 7 | 기록 탭 상시 통계 | 지표의 위계와 다열 반응형 비교 | 지표 위 18+16은 다른 기본 카드에 과함 | 통계형 비교 |
| 계정·기기 기본 카드 및 루틴 상세 종목 | 5px, 12px, 본문 gap 12. 기기 요약만 색·선 달리 적용 | 여러 하위 화면 반복 | 12px 동일 기준을 실서비스 여러 경로가 재사용 | 계정·기기·종목 내부 기능과 높이가 다름 | 공통 기본 패딩 확인 |

## 7. 4-2에서 논의할 권장 규격

아래 값은 결정용 제안이다. 표에 없는 고정 너비·높이는 계속 콘텐츠와 상위 배치에서 결정한다. 레이아웃 수정 시 가로·세로 본문 경계와 기존 스크롤·상태 보존을 검증 범위에 둔다.

| 항목과 유형 | 현재 사용값 | 권장안 | 선정 근거와 변경 영향 |
| --- | --- | --- | --- |
| 일반 외곽 | 5 및 18 | 반경 **5**, 선 **1px solid `#353941`**, 배경 **`#1B1D22`**, 기본 그림자 없음 | 루틴·휴식·홈 일정이 같은 외곽을 사용한다. 우선 카탈로그·일정 전체 편집·관리 카드의 유지 여부를 시각적으로 결정 |
| 일반 패딩 | 12·13·14/12, 구형 18·21 | **12/12/12/12**. 일정 대표는 **13/13/13/13** 유지안과 12 통일안을 비교 | 휴식·계정·기기·루틴 상세에 12px 구현, 13→12는 외곽에서 내용 한쪽 1px 변화 |
| 주요 카드/섹션 사이 | 카드 12–16, 홈 13, 메인 섹션 20–22, 전역 margin 별도 | 부모 gap **12**(같은 그룹), **16**(분리 카드), **20**(주요 섹션). 섹션 시작은 현행 페이지 헤더 기준 | 카드 margin과 겹치는 원인을 줄임. 22→20은 기록 승인 밀도를 비교 후 결정 |
| 제목, 설명, 본문 | 문장 3·4·6, 본문 10·12·14·20 | 제목→설명 **4**, 제목 또는 설명 블록→본문 **12**, 보조 정보/본문 행 **8**, 일반 가로 정렬 **8** | 휴식 4/12 및 공통 Card 12. 제목 높이는 기존 줄바꿈과 현재 타이포그래피 유지 |
| 목록 카드 | 7–12 외부, padding 10 또는 10/12·12 | 반복 gap **8**, 외곽 **5**, 한 줄 **10/12/10/12** 후보, 상세 메타데이터 **12**. 행 내부 **4–8** | 홈 7, 기록 8, 루틴 9에서 작은 조정. 홈 제목·상태가 320px에서 들어가는지 비교 |
| 강조 | 12·16·16/13, hero선/gradient | 외곽 **5**, **16/12/16/12** 또는 기존 16/13 유지. 내부 **8–12**, 기존 테마 hero·선 | 홈과 계정의 높이가 자연스럽게 늘어날 수 있음. 기록 요약 헤더는 이미 compact한 예외 |
| 통계 | 14/12, 16/14/14/14, 차트 슬롯 220, 타일 76·86·107 | 분석 본문 **14/12/14/12**, 외부 **16**, 본문 **12**, 타일 gap **8**, 콘텐츠 자동 + 기존 역할별 최소 | 운동 현황·성장·근육 규격 재사용. 기록 메인의 주간 요약은 헤더/타일 높이를 비교 후 별도 결정 |
| 입력 | 0/12, 12, 14, 21 | 일반 필드 그룹 **12**, 칸 간 **8**, 제목→필드 **12**, 다중 입력 섹션 **12–16**. 행 자체가 padding을 가지면 외곽 세로 **0** | 휴식·루틴 폼의 실제 값. 고정 저장 프레임과 키보드 여백은 제품 동작 경계 |
| 중첩 | 외부 gap 7–12, 내부 padding 9/8·10·12, 선 유무 혼용 | 카드 안의 표면 gap **8** 또는 본문 같은 **12**, padding **8–12**, 반경 **5**, 입력색·강조 배경 먼저 사용. 테두리 1px은 구획 식별에 필요한 곳 | 카드 안의 카드에서 중복 선을 줄일 때 타일·선택·전용 상태를 각각 확인 |
| 상태와 특수 | 5·18, 78/126/222 하한, 고정 프레임 | 상태의 외곽 변경 전 기존/없음/진행을 같은 위치에서 비교. 특수 표면은 기존 역할별 높이, 프레임과 미디어 비율 | 빈 상태와 조회 실패 명확성, 12초/일반 휴식, 미저장 입력과 조회·복구 정책 보존 |
| 반응형 | 최대 셸 520, 좌우 20/14, 국소 350/360/374 분기 | **부모 가용 폭**, `min-width:0`, 본문 자동 높이, 320px 열/텍스트 보호. 일반 카드 별도 max-width 없음 | 1·2단계 레이아웃과 화면별 정보 위계를 직접 재사용. 차트·검색·미디어만 기존 가용 공간 제약 검증 |

**사용자 결정 항목.** 기본 외곽을 루틴 일정 5px 기준으로 삼을 범위, 기본 패딩 12px과 일정 13px의 관계, 일반/반복/주요 섹션의 12/8/20px 및 화면별 16px 보존, 카탈로그·정정·상태 카드의 18px 범위, 홈 상세·성장의 내측 테두리, 기록·운동의 승인된 밀도 예외가 4-2 안건이다.

## 8. 공통화 후보

| 대상 | 현재 구현 | 권장 방식 | 적용 후보 | 제외·유지 범위 |
| --- | --- | --- | --- | --- |
| 기본 `Card`·hero | `.app-card`와 hero, 테마 기본/모듈 덮어쓰기 | 기존 공통 구조 유지 | 일반 정보·설정·통계·루틴 상세 | 헤더·목록의 별도 의미와 인터랙션 |
| 루틴·홈의 일정 외곽 | 공통 Card 1곳과 개별 section 1곳 | 공통 스타일 또는 compact 외곽 토큰 | 일정 기본 표면·일반 배경·선·반경 | 두 화면의 7열과 세로 일정 인터랙션 |
| 기록·루틴 목록 | `SessionRecordCard` 재사용, 홈 최근/루틴 article 별개 | 기존 기록 컴포넌트 재사용, 토큰을 목록 CSS에 공유 | 최근 ↔ 전체 기록, 같은 행 외곽·포커스 | 홈 한 줄과 루틴 메뉴 구조 |
| 계정·휴식·카탈로그 외곽 | 여러 Module이 개별 padding/반경. 일부 범용값 상속 | 공통 스타일 또는 토큰 | 입력 컨테이너 12px, 일반 외곽 | 편집/조회/접이형 로직 |
| 분석 카드 | `Activity`·`Growth`·`WeeklyMusclePlan`의 14/12·5·gap12 복제 | 외곽 스타일 공유, 화면별 차트와 제어 유지 | 분석 서브페이지, 기간 셸 | 도표·타일 하한·필터·기록 메인 |
| 피드백 | 공통 `EmptyState`, `ContentError`, `LoadingSkeleton`이 독립/embedded 지원 | 기존 구조 유지, 배치 슬롯과 반경 검토 | 상태 표면과 정상 카드 경계 | 오류의 텍스트·동작, 기존 데이터, 공통 Dialog·Toast |
| 워크아웃 | frame·focus·timer·footer 별도 배치 | 개별 구현 유지, 색·선·반경 일부 공유 | 운동 카드 외관만 | 고정 프레임, 세트 입력, 이전 기록, 휴식, 장비, 미디어 |

5단계는 일반 버튼·입력 및 정렬, 6단계는 ConnectedDropdown 확대, 7단계는 숫자 입력 제안값, 8단계는 폰트·아이콘, 9단계는 통합 검증이다. 4-1의 조사에는 기존 메시지/기능형 Dialog, Toast, 반시계 회전, 숫자 휠, 휴식 토글·ON 12초/OFF 일반 휴식과 효과음, START·저장·오프라인·미저장 보호의 개정이 포함되지 않는다.

## 9. Chrome 계측과 시각 비교

### 환경과 범위

- 기존 검수의 `http://127.0.0.1:4173/` 및 전용 Spring Health(기록된 loopback 2251)에 연결하지 못했다. Docker 상태 조회는 로컬 파이프 접근 오류였다. 동일 저장소의 기존 **격리 Vite Preview**를 임시 loopback에서 열어 Chrome **158.0.8127.38**로 확인했다. FRONT 18 Preview는 서비스 React 컴포넌트와 CSS를 사용하고 API 응답·쓰기는 탭 메모리 표본이다. 일반 기록·카탈로그는 라우팅 맥락이 같은 Routine Preview, 휴식 푸터는 기존 Rest Audio Preview의 서비스 운동 뷰를 사용했다. [4173 절차](../engineering/frontend.md#review-4173) · [격리 Vite 진입점](../../tests/fixtures/review-server.mjs) · [FRONT 18 검수](front-18-3-6-preview-review.md)
- **54개 경로·상태 표본** 중 40개는 다섯 폭, 14개는 393px 상태에서 계측해 총 **214개 렌더링 표본**을 남겼다. 폭은 320·375·393·430·1280px, CSS viewport 높이 852, DPR 1이다. 이 표본 수에는 같은 화면의 여러 상태와 Preview 진입 경로가 포함된다. mobile viewport는 430px 이하에서 사용했다. 계측은 `getBoundingClientRect()`, `getComputedStyle()`, 부모·형제·자식 좌표와 `scrollWidth`로 수행했다. 고정 프레임의 문서 y에는 측정 순간 스크롤 위치가 합산된다. Raw JSON의 `rect`는 [x, 문서 y, 너비, 높이]다. Preview 조작 패널로 달라지는 절대 y 대신 카드·제목·형제의 좌표 차를 비교했다. 숨김 요소와 Preview 도구 컨테이너는 시각 표본에서 배제했다. [원시 계측과 실행 종료 기록](evidence/front-18-4-1/chrome-card-audit.json)
- 가로 넘침은 이번 표본의 **문서 수준**에서 관찰되지 않았다. 좁은 폭의 고정 열·태그·검색 결과에는 의도된 말줄임과 자체 스크롤이 있다. 1280px 데스크톱에서 셸은 520px이다. 전역 데스크톱 셸의 좌우 테두리 1px씩을 빼면 `main`이 518px이고, 여기에 페이지 패딩 20px씩을 빼면 카드가 478px이다. 세로 스크롤바 15px 때문에 셸의 가로 중앙은 뷰포트의 632.5px, 카드 x는 393.5px이었다. 운동 고정 프레임은 같은 중심에서 셸 전폭 520px을 사용했다.

### 다섯 폭의 일반 카드 경계

| 화면 폭 | 일반 본문/전폭 카드 너비 | 카드 x | 셸 페이지 한쪽 패딩 | 운동 상·하단 고정 프레임 너비 |
| --- | ---: | ---: | ---: | ---: |
| 320 | 292 | 14 | 14 | 320 |
| 375 | 335 | 20 | 20 | 375 |
| 393 | 353 | 20 | 20 | 393 |
| 430 | 390 | 20 | 20 | 430 |
| 1280 | 478 | 393.5 | 20 | 520 |

상단 기본 `main` padding은 홈·루틴·기록 메인·설정의 18px과 하위 페이지의 20px이다. 393px의 실제 기록 메인은 제목/상단 영역을 포함해 첫 카드 y=84, 기록 상세 요약 y=80, 설정 메인은 계정 카드 y=18로 관찰됐다. 하단 `main` padding은 공통 하단 탭이 있을 때 72px, 탭 없는 일반 상세 28px, 운동 고정 프레임은 0px로 해당 화면이 자체 여백을 확보했다. 루틴 workspace처럼 추가 margin을 주는 부모는 카드 자체 마진과 별도로 원시 데이터에 남겼다. [페이지 기준](../../src/app/AppShell.module.css) · [운동 고정 영역](../../src/features/workout-flow/WorkoutFlow.module.css)

### 393px 대표 실측

| 대상 | 실측 너비 × 높이 | 상/우/하/좌 | 반경 · 선 · 배경 | 실측 간격 및 내용 기준 |
| --- | ---: | --- | --- | --- |
| 루틴 주간 일정, 세로 | 353 × 511 | 13/13/13/13 | 5 · 1px 일반선 · S | 상단 첫 콘텐츠 y+14, 형제 13, 주간 행 사이 5 |
| 홈 주간 일정 | 353 × 184.5 | 13/13/13/13 | 5 · 1px 일반선 · S | 상단 첫 콘텐츠 y+14, 요일 y+46, 날짜 상세 y+132, 형제 13 |
| 반복 구간별 휴식, 읽기 | 353 × 243 | 12/12/12/12 | 5 · 1px 일반선 · S | 제목 영역 y+13, 첫 데이터 묶음 y+74 |
| 반복 구간별 휴식, 편집 | 353 × 374.19 | 12/12/12/12 | 5 · 1px 일반선 · S | 제목 영역 y+13, 본문 y+74, 하단 다음 액션까지 12 |
| 홈 오늘의 루틴 | 353 × 285.8 | 16/13/16/13 | 5 · 1px hero선 · H | 첫 줄 y+17, 루틴 제목 y+44. 정상 계획에 최소 176 |
| 기록 이번 주 요약 | 353 × 272.39 | 16/14/14/14 | 5 · 1px 일반선 · S | 제목 y+17, 아래 섹션까지 22. 지표 한 칸 103 × 83.8 |
| 홈 최근 운동 한 줄 / 기록 탭 최근 | 353 × 44 / 353 × 102.8 | 10 / 12 | 양쪽 5 · 일반선 · S | 홈 내부 가로 6·목록 7, 기록 내부 세로/목록 8 |
| 전체 이력 항목, 기록 탭 내 | 353 × 102.8 | 12 | 5 · 일반선 · S | 형제 9, 주 구분 제목은 별도. `SessionRecordCard`가 모듈 5px을 사용 |
| 루틴 목록 첫 항목 / 배정 항목 | 353 × 149.75 / 353 × 171.94 | 10/12/10/12 | 5 · 일반선 · S/H | 같은 컴포넌트, 형제 9. 배정 표시 콘텐츠의 차이 |
| 일정 전체 편집 ‘포함’ | 353 × 197.94 | 21 | 18 · 1px 일반선 · S | 첫 콘텐츠 y+22, ‘제외’ 카드까지 54 |
| 카탈로그 검색 목록 | 353 × 702 | 18 | 18 · 1px 일반선 · S | 제목 y+19; 헤더→검색 영역의 flex gap 14 |
| 기록 정정 ‘완료 수행’ | 353 × 398.92 | 18 | 18 · 1px 일반선 · S | 위 요약과 14, 제목 y+19. 일반 상세와 다른 본문 |
| 성장 분석 / 최신 승인 중량 | 353 × 609.02 / 327 × 144.19 | 14/12/14/12 / 12 | 양쪽 5 · 1px 일반선 · S/A | 분석 카드 형제 16, 내부 강조 상자의 좌우 시작 13px |
| 운동 진행 중량 / 세트 | 353 × 117.97 / 353 × 275.8 | 12/18/12/18 / 12/8/12/8 | 양쪽 5 · 1px hero/일반선 · H/S | 스와이프 본문 형제 14, 각각 안쪽 gap 4·7 |
| 유산소 타이머 | 353 × 126 | 12 | 5 · 1px 테마 혼합 · T | min-height 126, 내부 gap 6. 앞·뒤 본문 12 |
| 운동 푸터 기본 / 휴식 임박 | 393 × 69 / 393 × 125 | 9/20/9/20 | 0 · 위 경계 1px · 페이지색 | 둘 다 fixed. 50px 조작과 간격 6, 임박 알림 바가 한 줄 추가 |

홈 오늘과 루틴 일정의 높이는 요일 보기와 데이터 양을 반영한다. 루틴 일정의 가로 보기는 같은 13px 패딩·5px 외곽에 353 × 237px이었다. 휴식 편집 320px에서는 설명/폼 줄바꿈으로 392.19px까지 늘었고 읽기 243px은 일정했다. 카탈로그는 320px에서 패딩만 18→14, 성장/운동 현황/근육과 기록 상세는 일부 좌우 12→10, 분석 진입 타일은 12→10이다. 393px의 2열 분석 타일 172.5px는 320px에서 142px이 되고 최소 높이 107px은 유지됐다. 운동 진행 중량의 좌우 18→14는 테마 토큰의 결과다.

### 대표 스크린샷

모두 393px Chrome에서 캡처한 서비스 표면의 이미지다. 검수 도구 panel은 비교에서 제외했다. 제목이나 테두리를 설명하는 수치는 위 계산값을 따른다.

| 비교 | 이미지 | 읽는 기준 |
| --- | --- | --- |
| 기준 외곽 | [루틴 주간 일정 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [반복 구간 휴식 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [홈 주간 일정 · 계측](evidence/front-18-4-1/chrome-card-audit.json) | 5px과 동일 선, 패딩 13/12/13 |
| 강조·통계 | [홈 오늘 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [기록 주간 요약 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [설정 계정 요약 · 계측](evidence/front-18-4-1/chrome-card-audit.json) | 내부 16/13·16/14/14/14·16, hero와 Onyx |
| 목록과 패딩 차이 | [루틴 목록 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [전체 이력 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [카탈로그 검색 · 계측](evidence/front-18-4-1/chrome-card-audit.json) | 반복 9, 기록 12 패딩, 카탈로그 18 패딩·반경 |
| 외부 간격 | [일정 전체 편집](evidence/front-18-4-1/schedule-order.png) · [기기 목록 · 계측](evidence/front-18-4-1/chrome-card-audit.json) | 순환 그룹 54px, 같은 기기 묶음 내 12px |
| 중첩과 편집 | [성장 분석·강조 수치](evidence/front-18-4-1/growth.png) · [루틴 편집 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [휴식 편집 · 계측](evidence/front-18-4-1/chrome-card-audit.json) | 외부/내부 테두리, 입력 그룹의 구분선, 콘텐츠 높이 증가 |
| 운동 예외 | [진행 중량 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [유산소 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [임박 휴식 푸터 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [종료 요약 · 계측](evidence/front-18-4-1/chrome-card-audit.json) | 5px 운동 카드와 0px 고정 푸터, 126px 유산소 타이머 하한 |

추가 표본은 [루틴 상세 · 계측](evidence/front-18-4-1/chrome-card-audit.json), [기록 상세](evidence/front-18-4-1/record-detail.png), [독립 이력 예시 · 계측](evidence/front-18-4-1/chrome-card-audit.json), [운동 현황 · 계측](evidence/front-18-4-1/chrome-card-audit.json), [계정 설정 · 계측](evidence/front-18-4-1/chrome-card-audit.json), [휴식 타이머 알림 · 계측](evidence/front-18-4-1/chrome-card-audit.json), [표준 운동 상세 · 계측](evidence/front-18-4-1/chrome-card-audit.json)에서 확인할 수 있다.

### 상태와 범위 한계

- **홈.** 첫 로딩에서 오늘 115px·일정 134px, 데이터 도착 후 오늘 285.8px·일정 184.5px이었다. 같은 정상 데이터를 다시 조회해 실패시킨 뒤에는 393px에서 오늘·일정·상세·최근 행의 네 좌표와 크기가 유지됐다. ACTIVE는 같은 외곽에서 391.8px로 높아졌다. 오늘만 다른 루틴 선택을 펼쳤을 때 양쪽 카드 좌표는 유지됐다. 최초 로딩은 임시 자리에서 실제 데이터 높이로 성장하므로 목록의 세로 이동을 기존 데이터 소실과 같은 문제로 판단하지 않았다.
- **기록과 루틴.** 최근 운동 정상 및 기존 데이터가 있는 재조회 대기에서 353×104.39px 행의 좌표가 같았다. 최근 기록이 없는 경우, 최초 조회 실패, 실패 뒤 새로고침 대기는 모두 353×222px을 확보했다. 루틴의 빈 정상 목록과 최초 오류는 embedded이며 두 상태의 본문 높이는 각각 141.3px, 168.5px이었다. 주요 일정 외곽은 두 상태에서 위치와 높이가 같았다.
- **성장·설정·운동.** 성장에서는 검색을 펼칠 때 검색 표면이 늘었다. 기존 27.5kg 데이터가 있는 재조회 대기에서는 검색·분석·내측 요약·승인 이력의 좌표와 크기가 모두 같았다. 설정의 설치 카드는 66→310.38px, 카탈로그 운동 방법은 54→158.17px로 증가했다. 휴식 모드 편집·운동 세트 편집도 필요한 조작·필드만큼 본문이 늘어났다. 운동 상하단은 진행 중에도 셸 전폭을 사용했다. [원시 비교 결과](evidence/front-18-4-1/chrome-card-audit.json)

- Chrome 결과는 서비스 코드를 렌더링한 격리 표본이다. 이번에 실제 4173 계정의 START/FINISH, OTP·Google 콜백, 실제 보호 GIF, 운영 API·DB, 설치·오프라인 재실행과 PWA 업데이트 네트워크, iPhone Safari·홈 화면 설치·효과음을 검증한 기록은 없다. 3단계의 일반 180초·테스트 12초 및 실제 START 기록은 기존 보고서에 있다. 실제 장비·정정·복구의 모든 조합, 사용자 장문과 다양한 실데이터 양, 저높이(600px 이하) 레이아웃 및 접근성 포커스 조합은 소스 판단과 제한된 표본만 포함했다. [과거 실제 4173 검증](front-18-3-6-preview-review.md#front18-review-evidence)
- 보고서와 계측·스크린샷만 생성했다. 제품·Preview·CSS·토큰·기준 문서·계정 데이터·API·DB와 기존 변경에는 손대지 않았고 Git 커밋 및 Push 없이 마감했다. 이번 검수용 Chrome과 Vite를 종료했고 Chrome 임시 프로필을 정리했다.
