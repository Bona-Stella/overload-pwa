# FRONT 18 6-1 전체 선택 UI 현황표

2026-11-26~27 · PWA 소스 `4f92880` · [통합 보고서](../../front-18-6-1-dropdown-audit.md)

26개 흐름에서 92개 사용처를 확인했다. 같은 컴포넌트를 다른 흐름에서 사용하면 각 흐름에 기록했다. 월~일처럼 주소가 독립된 고정 필드는 7건으로 세고, 데이터에 따라 반복되는 카드·세트·장비 필드는 슬롯 하나로 센다. 이미 승인된 숫자 휠·분할·토글은 표에서 목적과 저장 단위가 같은 필드군을 묶었다. 범용 탐색·확인/취소·페이지네이션은 선택 목록으로 집계하지 않고, 루틴/세션 등 구체 대상을 고르는 목록과 전용 ⋯ 업무 목록은 포함했다.

분류는 A 연결형, B 단일 선택 공통화 비교, C 검색/긴 목록 검토, D 다중/계층, E 기능 전용 선택, F 승인된 특수 조작, G 추가 확인이다. G는 집계보다 논의가 필요한지와 별개다. 한 행에 대표 분류 하나를 부여했다. B는 13행이며, 실제 검색 입력은 14행이다. 네이티브 select 18행은 다른 분류에도 걸쳐 있다. 연결형과 별개로 자체 구현한 값 드롭다운은 4행이다. 별도 공용 `SearchScopePopover` 2행, 업무 액션 메뉴·검색 목록·필터 등은 각각의 유형으로 본다.

기존 번호 열은 [5-1](../../front-18-5-1-control-audit.md) 및 [5-4](../front-18-5-4/control-inventory.json)의 대응을 표시한다. †는 5-4에서만 식별되는 위치다. B/I의 `sameLocationAs`에 따라 합치면 **135개**가 5-4의 402개 현행 고유 위치와 대응한다. 번호 연결은 진입점과 선택 본체를 포함한다. N 번호는 참고 색인으로 합계에 더하지 않았다. —는 직접 대응 번호를 확인하지 못한 행이다.

## 표 읽기

첫 표는 화면·접근·목적·선택 방식을, 두 번째 표는 같은 UI 번호의 상태·계측·발견 사항을 보여 준다. 방향의 UA는 운영체제/브라우저에 위임한 네이티브 팝업이다. 검색 열의 ‘아니요·필터’는 텍스트 입력 없이 선행 필터를 사용하는 경우다. 규모 열의 상한은 소스 또는 현재 계약에서 확인한 범위이며, 실측 표본 수는 [보고서의 계측](../../front-18-6-1-dropdown-audit.md#브라우저-계측) 및 JSON에 있다.

| 기호 | 시각 근거 |
| --- | --- |
| H | 홈 연결형. 트리거 CSS 56px·4px·좌우 12px, 행 최소 56px, 홈의 내부 스크롤 |
| T | 루틴 태그. 트리거 CSS 44px·좌우 12px, 항목 최소 54px, 4px 띄운 목록 |
| N | 닫힌 네이티브 select. 측정된 화면별 수치는 JSON 참조, OS 팝업 디자인은 미확인 |
| P | 일정 후보 칩. CSS 외형 36px, 팝오버 간격 4px·최대 260px |
| O | 검색 범위 팝오버. CSS 트리거 최소 42px, 행 최소 44px, 간격 6px |
| Q | SearchList. 공통 검색 수치 및 화면 유형별 실제 차이는 보고서 참조 |
| W | 휠 공통 승인 사양과 소스. 숫자 진입 기본 48px, 휠 52px 행, 직접 입력 48px·5px |
| D | 기능형 Dialog/체크/라디오. 소스와 복구 Dialog 표본 참고 |
| S | 별도 브라우저 계측 미확인 |

검증은 S(현 HEAD 소스), LIVE(4174 실제 검수), PR(루틴 Preview), PS(일정 Preview), PO(이력 Preview), PC(카탈로그 Preview), PG(성장 Preview), PD(복구 Preview), PW(운동 중 검색 Preview)로 표기한다. ‘공용’ 표기는 같은 부품의 다른 호출부를 직접 열지 않은 경우다. 실기기 및 OS 네이티브 팝업은 미확인이다.

## 사용처와 선택 구조

| 조사 번호 | 흐름 | 화면·접근 경로 | 선택 목적 | 소스 | 분류·구현 | 데이터·검색 | 규모 | 기존 번호 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UI001 | H1 | 홈 · 홈 → 오늘만 다른 루틴 선택 | 오늘만 루틴 또는 휴식 적용 | [HomePanel:341](../../../../src/features/home/HomePanel.tsx#L341) | A · ConnectedDropdown·단일 | 서버 일정·루틴 요약과 상세 + 휴식 1 / 아니요·필터 | 후보·상세·필터에 따라 변동 | B062 B067 B069 I010 I015 I016 |
| UI002 | H1 | 홈 · 드롭다운 → 상단 칩 | 전체·미배정·프리셋별·휴식 후보 전환 | [HomePanel:343](../../../../src/features/home/HomePanel.tsx#L343) | F · 칩 스트립·단일 필터 | 서버 프리셋 + 고정 3종 / 아니요 | 최대 7칩 | B063 B064 B065 B066 I011 I012 I013 I014 |
| UI003 | H1 | 홈 · 오늘만 다른 루틴 선택 → 오늘의 원래 일정으로 | 당일 임시 선택 해제 | [HomePanel:367](../../../../src/features/home/HomePanel.tsx#L367) | F · 선택 복원 액션 | 일정 기본값 / 아니요 | 1 | — |
| UI004 | H2 | 홈 · 홈 → 이번 주 일정 날짜 | 당일 조회 상세 전환 | [HomePanel:378](../../../../src/features/home/HomePanel.tsx#L378) | F · 날짜 타일·단일 | 주 7일·서버 일별 근거 / 아니요 | 7 | B071 I017 |
| UI005 | H4 | 홈 최근 운동 · 홈 → 최근 운동 카드 | 세션 상세 탐색 | [RecentWorkout:12](../../../../src/features/home/RecentWorkout.tsx#L12) | E · 반복 카드·단일 탐색 | 서버 종료 세션 / 아니요 | 홈 최대 3 | — |
| UI006 | R1 | 루틴 목록 · 루틴 → 저장된 루틴 | 정렬·현재 일정 배정 필터 | [RoutineCards:105](../../../../src/features/workout-online/RoutineCards.tsx#L105) | B · 네이티브·단일 | 정적 + 선택 요일 표시 / 아니요 | 5, 요일 고정 시 표시 옵션 1 추가 | I093 |
| UI007 | R1 | 루틴 목록 · 루틴 → 주간 일정 요일 | 요일로 카드 필터링 | [RoutineCards:89](../../../../src/features/workout-online/RoutineCards.tsx#L89) | F · 요일 타일/행·단일 | 서버 주간 배정 / 아니요 | 7, 가로/세로 두 표현 | B292 B293 B294 I091 I092 |
| UI008 | R1 | 루틴 목록 · 루틴 → 일정 보기 전환 | 가로 타일/세로 행 보기 | [RoutineCards:71](../../../../src/features/workout-online/RoutineCards.tsx#L71) | F · 보기 토글 | 정적 / 아니요 | 2 | B290 I090 |
| UI009 | R1 | 루틴 목록 · 루틴 카드 → ⋯ | 편집·삭제 | [RoutineCards:112](../../../../src/features/workout-online/RoutineCards.tsx#L112) | E · details 액션 목록 | 정적·권한 조건 / 아니요 | 최대 2 | B295 B296 B297 |
| UI010 | R1 | 루틴 목록 · 저장된 루틴 카드→ 상세 | 조회 루틴 선택 | [RoutineCards:117](../../../../src/features/workout-online/RoutineCards.tsx#L117) | E · 카드 탐색·단일 | 서버 루틴 요약 / 아니요 | 변동 | B298 |
| UI011 | R2 | 루틴 목록 · 루틴 → 일정 번호 | 조회할 일정 프리셋 | [PresetControls:64](../../../../src/features/workout-online/PresetControls.tsx#L64) | F · 번호 버튼·단일 | 서버 프리셋 / 아니요 | 최대 4 | B278 I089 |
| UI012 | R2 | 루틴 목록 · 루틴 → 일정 상단 | 자동 순환 ON/OFF | [PresetControls:32](../../../../src/features/workout-online/PresetControls.tsx#L32) | F · 상태 토글 | 서버 순환 상태 / 아니요 | 2 | B269 I088 |
| UI013 | R2 | 루틴 목록 · 일정 카드 → ⋯ | 계획 분석·이름 변경·전체 편집·삭제 | [PresetControls:36](../../../../src/features/workout-online/PresetControls.tsx#L36) | E · details 액션 목록 | 조건부 항목 / 아니요 | 최대 4개 업무 | B270 B271 B272 B274 B275 |
| UI014 | R2 | 루틴 목록 · 일정 카드 → 보기/전환 | 조회 중인 프리셋을 현재 일정으로 할지 결정 | [PresetControls:26](../../../../src/features/workout-online/PresetControls.tsx#L26) | E · 확인형 업무 선택 | 서버·순환 조건 / 아니요 | 프리셋 최대 4 | B268 |
| UI015 | R3 | 루틴 생성 · 루틴 → + 새 루틴 → 루틴 태그 | 초안 태그 지정·해제 | [TagPicker:25](../../../../src/features/workout-online/TagPicker.tsx#L25) | B · 커스텀 listbox·단일 | 정적 태그 + 미지정 / 아니요 | 11 | — |
| UI016 | R3 | 루틴 생성 · + 웨이트 종목 추가 | 웨이트 표준 종목 추가 | [RoutineForm:275](../../../../src/features/workout-online/RoutineForm.tsx#L275) | C · ExerciseSearch·검색 단일 | 부트스트랩 카탈로그·로컬 필터 / 이름·별칭·부위 | 카탈로그에서 변동 | B306 B307 B267 I087 |
| UI017 | R3 | 루틴 생성 · + 유산소 종목 추가 | 카탈로그 활동 선택 | [RoutineForm:287](../../../../src/features/workout-online/RoutineForm.tsx#L287) | C · CardioSearch·검색 단일 | 활동 카탈로그·로컬 / 이름·별칭·대분류 | 변동 | B235 B308 B309 I075 |
| UI018 | R3 | 루틴 생성 · 웨이트 종목 선택 → 제조사 | 선택 제조사 지정·해제 | [EquipmentFields:10](../../../../src/features/workout-online/EquipmentFields.tsx#L10) | C · 네이티브·단일 | 계정 부트스트랩 제조사 / 아니요 | 1 + 제조사 수 + 없는 기존값 조건 | I085 |
| UI019 | R3 | 루틴 생성 · 웨이트 종목 선택 → 부하 방식 | 방식 지정·해제 | [EquipmentFields:15](../../../../src/features/workout-online/EquipmentFields.tsx#L15) | B · 네이티브·단일 | 정적 4방식 + 미지정 / 아니요 | 5 | I086 |
| UI020 | R3 | 루틴 생성 · CARDIO → 추가 목표 설정 | 속도/페이스 단위 | [CardioPlanFields:83](../../../../src/features/workout-online/CardioPlanFields.tsx#L83) | F · 분할 단일 | 장비 capability + 정적 2종 / 아니요 | 2, 속도/페이스 모두 지원 시 | I071 B234 |
| UI021 | R3 | 루틴 생성 · 웨이트 배치 → 목표 수치 | 본세트·최소·최대 반복·설정 중량 | [RoutineForm:256](../../../../src/features/workout-online/RoutineForm.tsx#L256) | F · NumberWheel·단일 수치 4필드 | 범위·간격·직접 입력 / 아니요 | 필드별 범위 | I095 I096 I001 I002 B005 N09 N10 N11 |
| UI022 | R3 | 루틴 생성 · 유산소 목표 계획 | 시간·거리·속도/페이스·경사/저항 | [CardioPlanFields:77](../../../../src/features/workout-online/CardioPlanFields.tsx#L77) | F · NumberWheel/DurationWheel·다중 수치 필드 | 지원 지표 범위·직접 입력 / 아니요 | 지원 지표별 변화 | I069 I070 I072 I073 I074 N17 N18 N19 N20 N21 N22 |
| UI023 | R4 | 루틴 편집 · 루틴 상세 → 편집 → 루틴 태그 | 기존 태그 변경·미지정 복원 | [TagPicker:25](../../../../src/features/workout-online/TagPicker.tsx#L25) | B · 커스텀 listbox·단일 | 정적 태그 + 미지정 / 아니요 | 11 | — |
| UI024 | R4 | 루틴 편집 · 웨이트 하단 → 추가 | 웨이트 표준 종목 추가 | [RoutineForm:275](../../../../src/features/workout-online/RoutineForm.tsx#L275) | C · ExerciseSearch·검색 단일 | 부트스트랩·로컬 / 이름·별칭·부위 | 변동 | B306 B267 I087 |
| UI025 | R4 | 루틴 편집 · 웨이트 카드 → 변경 | 표준 종목 교체 | [RoutineForm:276](../../../../src/features/workout-online/RoutineForm.tsx#L276) | C · ExerciseSearch·검색 단일 | 부트스트랩·로컬 / 이름·별칭·부위 | 변동 | B266 B306 B267 I087 |
| UI026 | R4 | 루틴 편집 · CARDIO → 추가 | 카탈로그 활동 추가 | [RoutineForm:287](../../../../src/features/workout-online/RoutineForm.tsx#L287) | C · CardioSearch·검색 단일 | 활동 카탈로그·로컬 / 이름·별칭·대분류 | 변동 | B235 B309 I075 |
| UI027 | R4 | 루틴 편집 · CARDIO 카드 → 변경 | 카탈로그 활동 교체 | [RoutineForm:287](../../../../src/features/workout-online/RoutineForm.tsx#L287) | C · CardioSearch·검색 단일 | 활동 카탈로그·로컬 / 이름·별칭·대분류 | 변동 | B235 B266 I075 |
| UI028 | R4 | 루틴 편집 · 웨이트 배치 카드 → 제조사 | 기존 조합 변경 | [EquipmentFields:10](../../../../src/features/workout-online/EquipmentFields.tsx#L10) | C · 네이티브·단일 | 서버 제조사 / 아니요 | 1 + 제조사 수 + 예외 | I085 |
| UI029 | R4 | 루틴 편집 · 웨이트 배치 카드 → 부하 방식 | 기존 조합 변경 | [EquipmentFields:15](../../../../src/features/workout-online/EquipmentFields.tsx#L15) | B · 네이티브·단일 | 정적 / 아니요 | 5 | I086 |
| UI030 | R4 | 루틴 편집 · CARDIO → 추가 목표 설정 | 속도/페이스 단위 | [CardioPlanFields:83](../../../../src/features/workout-online/CardioPlanFields.tsx#L83) | F · 분할 단일 | capability + 정적 / 아니요 | 2 | I071 B234 |
| UI031 | R4 | 루틴 편집 · 제거한 종목 복원 → 복원 후보 조회 | 제외 배치의 초안 복원 | [RoutineForm:307](../../../../src/features/workout-online/RoutineForm.tsx#L307) | E · details·서버 후보 액션 | 제거 배치 서버 조회 / 아니요 | 가변, 웨이트/유산소 분리 | B310 B311 B312 B313 |
| UI032 | R4 | 루틴 편집 · 웨이트 배치 → 목표 수치 | 본세트·최소·최대 반복·설정 중량 | [RoutineForm:256](../../../../src/features/workout-online/RoutineForm.tsx#L256) | F · NumberWheel·단일 수치 4필드 | 범위·간격·직접 입력 / 아니요 | 필드별 범위 | I095 I096 I001 I002 B005 N09 N10 N11 |
| UI033 | R4 | 루틴 편집 · 유산소 목표 계획 | 기존 목표 시간·거리·강도·장비 수치 | [CardioPlanFields:77](../../../../src/features/workout-online/CardioPlanFields.tsx#L77) | F · NumberWheel/DurationWheel·다중 수치 필드 | 지원 지표 범위·직접 입력 / 아니요 | 지원 지표별 변화 | I069 I070 I072 I073 I074 N17 N18 N19 N20 N21 N22 |
| UI034 | S1 | 주간 일정 편집 · 루틴 → 주간 일정 편집 / 생성 후 배정 → 편집할 일정 | 편집 대상 프리셋 | [WeeklySchedulePanel:102](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L102) | B · 네이티브·단일 | 서버 현재 또는 기준 일정 / 아니요 | 최대 4 | I054 |
| UI035 | S1 | 주간 일정 편집 · 주간 일정 편집 → 월요일 루틴 | 월요일 루틴/휴식 배정 | [WeeklySchedulePanel:66](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L66) | C · 네이티브·단일 | 서버 요약·필터·우선 후보 / 아니요·후보 필터 별도 | 휴식 1 + 필터 후보 + 보존 옵션, 행별 변동 | I053 |
| UI036 | S1 | 주간 일정 편집 · 주간 일정 편집 → 화요일 루틴 | 화요일 루틴/휴식 배정 | [WeeklySchedulePanel:66](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L66) | C · 네이티브·단일 | 서버 요약·필터·우선 후보 / 아니요·후보 필터 별도 | 휴식 1 + 필터 후보 + 보존 옵션, 행별 변동 | I053 |
| UI037 | S1 | 주간 일정 편집 · 주간 일정 편집 → 수요일 루틴 | 수요일 루틴/휴식 배정 | [WeeklySchedulePanel:66](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L66) | C · 네이티브·단일 | 서버 요약·필터·우선 후보 / 아니요·후보 필터 별도 | 휴식 1 + 필터 후보 + 보존 옵션, 행별 변동 | I053 |
| UI038 | S1 | 주간 일정 편집 · 주간 일정 편집 → 목요일 루틴 | 목요일 루틴/휴식 배정 | [WeeklySchedulePanel:66](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L66) | C · 네이티브·단일 | 서버 요약·필터·우선 후보 / 아니요·후보 필터 별도 | 휴식 1 + 필터 후보 + 보존 옵션, 행별 변동 | I053 |
| UI039 | S1 | 주간 일정 편집 · 주간 일정 편집 → 금요일 루틴 | 금요일 루틴/휴식 배정 | [WeeklySchedulePanel:66](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L66) | C · 네이티브·단일 | 서버 요약·필터·우선 후보 / 아니요·후보 필터 별도 | 휴식 1 + 필터 후보 + 보존 옵션, 행별 변동 | I053 |
| UI040 | S1 | 주간 일정 편집 · 주간 일정 편집 → 토요일 루틴 | 토요일 루틴/휴식 배정 | [WeeklySchedulePanel:66](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L66) | C · 네이티브·단일 | 서버 요약·필터·우선 후보 / 아니요·후보 필터 별도 | 휴식 1 + 필터 후보 + 보존 옵션, 행별 변동 | I053 |
| UI041 | S1 | 주간 일정 편집 · 주간 일정 편집 → 일요일 루틴 | 일요일 루틴/휴식 배정 | [WeeklySchedulePanel:66](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L66) | C · 네이티브·단일 | 서버 요약·필터·우선 후보 / 아니요·후보 필터 별도 | 휴식 1 + 필터 후보 + 보존 옵션, 행별 변동 | I053 |
| UI042 | S1 | 주간 일정 편집 · 루틴 후보 필터 → 배정 유무 | 배정 여부로 후보 줄이기 | [WeeklySchedulePanel:55](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L55) | B · 칩 트리거·커스텀 단일 | 정적 / 아니요 | 2 | B143 B144 I048 I049 |
| UI043 | S1 | 주간 일정 편집 · 루틴 후보 필터 → 태그 | 루틴 태그 기준 후보 제한 | [WeeklySchedulePanel:59](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L59) | B · 칩 트리거·커스텀 단일 | 서버 루틴에서 존재하는 태그 / 아니요 | 0~10 | B145 B146 I050 I051 |
| UI044 | S1 | 주간 일정 편집 · 루틴 후보 필터 → 전체 보기 | 현재 후보 필터 해제 | [WeeklySchedulePanel:62](../../../../src/features/statistics/WeeklySchedulePanel.tsx#L62) | F · 필터 버튼 | 정적 / 아니요 | 1 | B147 I052 |
| UI045 | S2 | 일정 전체 편집 · 주간 일정 ⋯ → 주간 일정 전체 편집 | 포함·제외 그룹 이동 및 순서 | [PresetOrderEditor:71](../../../../src/features/workout-online/PresetOrderEditor.tsx#L71) | D · 다중 포함·그룹별 드래그/키보드 정렬 | 서버 프리셋 / 아니요 | 최대 4 | B280 B281 |
| UI046 | S3 | 주간 근육 계획 · 기록 → 주간 근육 계획 / 루틴 일정 ⋯ → 계획 분석 | 분석 대상 프리셋 | [MuscleAnalysis:44](../../../../src/features/statistics/MuscleAnalysis.tsx#L44) | B · 네이티브·단일 | 서버 현재 프리셋 / 아니요 | 최대 4 | I035 |
| UI047 | S3 | 주간 근육 계획 · 분류별/근육별 → 0세트 포함 | 계획 집계 표시 단위·표시 범위 | [MuscleAnalysis:46](../../../../src/features/statistics/MuscleAnalysis.tsx#L46) | F · 분할+조건부 토글 | 정적 조건 / 아니요 | 2 + 토글 | B113 B114 B115 I036 I037 I038 |
| UI048 | S4 | 주간 근육 통계 · 기록 → 주간 근육 통계 | 분류별/근육별, 세트/총중량 | [MuscleAnalysis:79](../../../../src/features/statistics/MuscleAnalysis.tsx#L79) | F · 분할 단일 ×2 | 정적 조건 / 아니요 | 2×2 | B116 B117 B118 B119 I039 I040 I041 I042 |
| UI049 | K1 | 운동 현황 · 기록 → 운동 현황 → 운동량 추이 | 검색 범위 선택 | [StatisticsPanel:166](../../../../src/features/statistics/StatisticsPanel.tsx#L166) | B · SearchScopePopover·단일 | 정적 전체/운동/분류/근육 / 아니요 | 4 | B129 B130 |
| UI050 | K1 | 운동 현황 · 운동량 추이 → 이름 검색 | 운동·분류·근육 추이 대상 | [StatisticsPanel:165](../../../../src/features/statistics/StatisticsPanel.tsx#L165) | C · SearchList·검색 단일 | 서버 집계/정의에서 로컬 후보 구성 / 예·범위별 이름/별칭·필터 | 집계에 따라 변동 | B134 I047 I004 |
| UI051 | K1 | 운동 현황 · 운동량 추이 → 운동 부위/근육 그룹 | 검색 후보 필터 | [StatisticsPanel:168](../../../../src/features/statistics/StatisticsPanel.tsx#L168) | F · 칩 스트립·단일 | 운동 분류 고정/근육 그룹 동적 / 아니요 | 범위별 변동 | B011 I005 |
| UI052 | K1 | 운동 현황 · 기간 → 주간/월간 및 달력 | 조회 기간 선택 | [PeriodControls:35](../../../../src/features/statistics/PeriodControls.tsx#L35) | F · 분할 + 날짜 그리드·단일 | 달력·조회 가능한 기간 / 아니요 | 모드 2 + 월별 날짜 | B121 B124 B125 B126 B127 B128 I043 I044 |
| UI053 | K1 | 운동 현황 · 운동량 추이 → 세트/총중량 | 그래프 지표 | [StatisticsPanel:164](../../../../src/features/statistics/StatisticsPanel.tsx#L164) | F · 분할 단일 | 정적 / 아니요 | 2 | B132 B133 I045 I046 |
| UI054 | K1 | 운동 현황 · 운동량 집계 → 지표 | 세트/총중량 표 보기 | [StatisticsPanel:77](../../../../src/features/statistics/StatisticsPanel.tsx#L77) | F · 버튼 단일 | 정적 / 아니요 | 2, 총중량 제공 시 | — |
| UI055 | K2 | 성장 추적 · 기록 → 성장 추적 → 과거 운동 검색 | 승인 중량 성장 추적 운동 | [GrowthPanel:127](../../../../src/features/statistics/GrowthPanel.tsx#L127) | C · SearchList·서버 검색 단일 | Growth API · 지연/페이지 / 예·운동 명칭과 부위 | 동적, 더 보기 | B106 B108 I033 I004 |
| UI056 | K2 | 성장 추적 · 검색 결과 → 운동 부위 필터 | 성장 대상 후보 제한 | [GrowthPanel:127](../../../../src/features/statistics/GrowthPanel.tsx#L127) | F · 칩 스트립·단일 | 운동 분류 / 아니요 | 전체 + 카탈로그 분류 | B011 I005 |
| UI057 | K2 | 성장 추적 · 운동 선택 → 추적할 루틴 배치 | 같은 운동의 어느 배치를 추적할지 선택 | [GrowthPanel:211](../../../../src/features/statistics/GrowthPanel.tsx#L211) | B · 네이티브·단일 | 서버 운동별 배치 / 아니요 | 2개 이상일 때 표시, 동적 | I034 |
| UI058 | K2 | 성장 추적 · 운동 선택 → 기간 | 전체/개월 그래프 기간 | [GrowthPanel:31](../../../../src/features/statistics/GrowthPanel.tsx#L31) | F · 분할 단일 | 정적 periods / 아니요 | 4 (1·3·6·전체) | B105 I032 |
| UI059 | K3 | 전체 운동 이력 · 기록 → 최근 운동 전체 보기 → 범위 | 루틴별/운동별 검색 | [RecordFeed:131](../../../../src/features/history/RecordFeed.tsx#L131) | B · SearchScopePopover·단일 | 정적 / 아니요 | 2 | B129 B130 |
| UI060 | K3 | 전체 운동 이력 · 전체 보기 → 이름 검색 | 루틴명 또는 운동 대상 | [RecordFeed:130](../../../../src/features/history/RecordFeed.tsx#L130) | C · SearchList·검색 단일 | 현재 루틴 기록 페이지·운동 정의 / 예·이름·운동 부위 | 현재 페이지와 카탈로그에 따라 변동 | I009 I004 |
| UI061 | K3 | 전체 운동 이력 · 운동별 범위 → 운동 부위 | 후보 운동 필터 | [RecordFeed:133](../../../../src/features/history/RecordFeed.tsx#L133) | F · 칩 스트립·단일 | 카탈로그 분류 / 아니요 | 전체 + 분류 | B011 I005 |
| UI062 | K3 | 전체 운동 이력 · 기간 → 달력 | 조회 월 선택 | [RecordFeed:129](../../../../src/features/history/RecordFeed.tsx#L129) | F · PeriodControls·월간 날짜 | 달력·현재 월 / 아니요 | 월별 가변 | B124 B125 B126 B127 B128 I044 |
| UI063 | K4 | 기록 목록/상세 · 기록 최근 운동·전체 이력 → 기록 카드 | 세션 상세 탐색 | [RecordFeed:45](../../../../src/features/history/RecordFeed.tsx#L45) | E · 반복 카드·단일 탐색 | 서버 종료 세션 / 목록 내 별도 검색 | 최근7일/전체 가변 | — |
| UI064 | K5 | 기록 상세/정정 · 기록 상세 → ⋮ | 정정·누락 복구·삭제·이력 | [ClosedWorkout:212](../../../../src/features/workout-online/ClosedWorkout.tsx#L212) | E · details·액션 목록 | 서버/로컬 상태 / 아니요 | 4 | B242 B243 B244 B245 B246 |
| UI065 | K5 | 기록 상세/정정 · 상세 ⋮ → 기록 정정 → 세트/유산소 | 정정할 수행 행 | [ClosedWorkout:243](../../../../src/features/workout-online/ClosedWorkout.tsx#L243) | E · 행 액션 → Dialog·단일 | 현재 서버 수행 / 아니요 | 실제 수행 수 | B249 B250 |
| UI066 | K5 | 기록 상세/정정 · 유산소 정정 Dialog | 활동 시간 정정 여부·값 | [ClosedWorkout:365](../../../../src/features/workout-online/ClosedWorkout.tsx#L365) | F · 체크박스+DurationWheel | 정적 + 기존 활동 시간 / 아니요 | 2 + 수치 | I080 I081 N08 |
| UI067 | K5 | 기록 상세/정정 · 세트/유산소 정정 또는 명시 재승인 | 정정 중량·반복·추가 하중·거리·속도·심박 및 승인 중량 | [ClosedWorkout:353](../../../../src/features/workout-online/ClosedWorkout.tsx#L353) | F · NumberWheel 계열·수치 | 현재 서버·지원 지표 / 아니요 | 대상별 수치 범위 | I066 I067 I068 I076 I077 I078 I079 N12 N13 N14 N16 N23 N24 N25 N26 N27 N28 |
| UI068 | K6 | 누락 수행 복구 · 상세 ⋮ → 누락 수행 복구 | 어느 보관 운동 기록을 비교할지 선택 | [ClosedWorkout:399](../../../../src/features/workout-online/ClosedWorkout.tsx#L399) | E · Dialog 내 네이티브·단일 | IndexedDB 사본 / 아니요 | 가변, 표본 별도 | I083 |
| UI069 | K6 | 누락 수행 복구 · 사본 선택 → 복구 가능한 행 체크 | 세트·유산소 다중 선택 | [ClosedWorkout:393](../../../../src/features/workout-online/ClosedWorkout.tsx#L393) | D · 체크박스·다중 | 사본과 서버 기록 대조 / 아니요 | 가변 | I082 B260 B261 B264 |
| UI070 | W1 | 운동 진행 · 진행 헤더 → 운동 목록 | 종목 이동 및 적용 순서 | [WorkoutDialogs:64](../../../../src/features/workout-flow/WorkoutDialogs.tsx#L64) | D · Dialog·그룹/정렬+단일 이동 | 현재 적용 계획 웨이트/유산소 / 아니요 | 가변 | B191 |
| UI071 | W1 | 운동 진행 · 좌우 스와이프/운동 헤더 | 이전·다음 종목 선택 | [ExerciseSwipe:1](../../../../src/features/workout-flow/ExerciseSwipe.tsx#L1) | F · 스와이프·순차 선택 | 현재 계획 / 아니요 | 동적 | — |
| UI072 | W1 | 운동 진행 · 웨이트 세트 표 | 개별 세트 완료·완료 취소 | [WeightFocus:116](../../../../src/features/workout-flow/WeightFocus.tsx#L116) | F · CircleCheck·개별 체크 | 세션 집행 상태 / 아니요 | 세트 수 | I059 |
| UI073 | W2 | 운동 중 웨이트 편집 · 편집 → 다음 종목 추가 | 오늘만 웨이트 추가 | [WorkoutDialogs:118](../../../../src/features/workout-flow/WorkoutDialogs.tsx#L118) | C · Dialog + ExerciseSearch | 카탈로그·선택 가능 정의 / 이름·별칭·부위 | 가변 | B213 B217 B267 I087 |
| UI074 | W2 | 운동 중 웨이트 편집 · 편집 → 현재 종목 교체 | 오늘만 표준 종목 교체 | [WorkoutDialogs:118](../../../../src/features/workout-flow/WorkoutDialogs.tsx#L118) | C · Dialog + ExerciseSearch | 카탈로그·선택 가능 정의 / 이름·별칭·부위 | 가변 | B215 B267 I087 |
| UI075 | W2 | 운동 중 웨이트 편집 · 편집 → 장비 정보 | 제조사 지정·해제 | [WeightFocus:152](../../../../src/features/workout-flow/WeightFocus.tsx#L152) | C · EquipmentFields·네이티브 단일 | 서버 제조사 / 아니요 | 1 + 제조사 + 없는 현재값 | I085 |
| UI076 | W2 | 운동 중 웨이트 편집 · 편집 → 장비 정보 | 부하 방식 지정·해제 | [WeightFocus:152](../../../../src/features/workout-flow/WeightFocus.tsx#L152) | B · EquipmentFields·네이티브 단일 | 정적 / 아니요 | 5 | I086 |
| UI077 | W2 | 운동 중 웨이트 편집 · 편집/수행 표·중량 변경 | 목표 및 실제 중량·반복·추가 하중 선택 | [WeightFocus:106](../../../../src/features/workout-flow/WeightFocus.tsx#L106) | F · NumberWheel·수치 | 세트·부하 범위 / 아니요 | 항목별 | I056 I057 I058 I062 I065 N01 N02 N03 N04 N05 N15 |
| UI078 | W2 | 운동 중 웨이트 편집 · 중량 변경 Dialog | 오늘만 변경/현 승인 정책 적용 | [WorkoutDialogs:47](../../../../src/features/workout-flow/WorkoutDialogs.tsx#L47) | F · 네이티브 라디오·단일 | 정적 2개·서버 승인 가능 조건 / 아니요 | 2 | I063 I064 |
| UI079 | W3 | 운동 중 유산소 편집 · 편집/종료 전 → 유산소 추가 | 활동 선택 | [WorkoutDialogs:149](../../../../src/features/workout-flow/WorkoutDialogs.tsx#L149) | C · Dialog + CardioSearch | 활동 카탈로그 / 이름·별칭·유형 | 가변 | B203 B214 B218 B235 I075 |
| UI080 | W3 | 운동 중 유산소 편집 · 편집 → 유산소 계획 편집 → 변경 | 기존 활동 종류 교체 | [WorkoutDialogs:149](../../../../src/features/workout-flow/WorkoutDialogs.tsx#L149) | C · Dialog + CardioSearch | 활동 카탈로그 / 이름·별칭·유형 | 가변 | B219 B235 I075 |
| UI081 | W3 | 운동 중 유산소 편집 · 계획 Dialog → 추가 목표 설정 | 속도/페이스 단위와 목표 수치 | [CardioPlanFields:77](../../../../src/features/workout-online/CardioPlanFields.tsx#L77) | F · 분할 + 휠 | capability 및 수치 범위 / 아니요 | 2 단위, 수치 가변 | I069 I070 I071 I072 I073 I074 B234 N17 N18 N19 N20 N21 N22 |
| UI082 | W3 | 운동 중 유산소 편집 · 계획 Dialog → 활동 목표 | 계획 변경을 적용할지 선택 | [WorkoutDialogs:139](../../../../src/features/workout-flow/WorkoutDialogs.tsx#L139) | E · 단계형 Dialog | 세션 초안 / 별도 활동 검색 | 활동마다 필드 가변 | B219 |
| UI083 | W4 | 유산소 완료 확인 · 완료 → 시간 수정 또는 실제 측정 | 정정 시간·평균심박 등 실제값 | [CardioFocus:52](../../../../src/features/workout-flow/CardioFocus.tsx#L52) | F · DurationWheel/NumberWheel 수치 | 실측/초안·지원 지표 / 아니요 | 대상별 | I055 I066 I067 I068 N07 N23 N24 N25 N26 N27 N28 |
| UI084 | W5 | 종료 요약/중량 검토 · 종료 후 권고 목록 | 승인 대상과 예정 중량 | [WeightReview:96](../../../../src/features/workout-flow/WeightReview.tsx#L96) | D · 체크 다중 + 수치 휠 | 서버 평가·선택 그룹 / 아니요 | 가변 | B169 I060 I061 N06 |
| UI085 | E1 | 설정·운동 종목 보기 · 설정 → 운동 종목 보기 | 표준 운동 상세 탐색 | [PublicCatalog:104](../../../../src/features/workout-online/PublicCatalog.tsx#L104) | C · ExerciseSearch + 상세·검색 단일 | 공용 카탈로그·로컬 필터 / 이름·별칭·부위 | 가변·표본 별도 | I004 |
| UI086 | E1 | 설정·운동 종목 보기 · 운동 종목 보기 → 운동 부위 | 카탈로그 결과 필터 | [ExerciseSearch:22](../../../../src/features/workout-online/ExerciseSearch.tsx#L22) | F · 칩 스트립·단일 | 정적 분류 / 아니요 | 전체 + 분류 | B011 I005 |
| UI087 | E2 | 설정 메인 · 설정 → 유산소 거리 자동 추정 | 자동 추정 표시 설정 | [SettingsMain:53](../../../../src/features/settings/SettingsMain.tsx#L53) | F · switch | 기존 사용자 설정 / 아니요 | 2 | B097 I031 |
| UI088 | E3 | 휴식 타이머 알림 · 설정 → 휴식 타이머 알림 | 어둡게·깜빡임·효과음·중간 알림·휴식 테스트 | [RestAlertSettings:178](../../../../src/features/settings/RestAlertSettings.tsx#L178) | F · 개별 switch 묶음 | 저장된 앱 설정 / 아니요 | 5 스위치 | B076 B077 B081 B082 B084 I018 I019 I023 I025 I027 |
| UI089 | E3 | 휴식 타이머 알림 · 깜빡임 켬 → 표시 위치 | 화면 위치 옵션 선택 | [RestAlertSettings:187](../../../../src/features/settings/RestAlertSettings.tsx#L187) | F · 버튼 switch 2종 | 고정 위치 / 아니요 | 2 | B078 B079 I020 I021 |
| UI090 | E3 | 휴식 타이머 알림 · 깜빡임/중간 알림 켬 → 시작 시점 | 몇 초 전 알림인지 선택 | [RestAlertSettings:191](../../../../src/features/settings/RestAlertSettings.tsx#L191) | F · 인라인 단일 배타 ×2 | 정적 / 아니요 | 깜빡임 3, 중간 알림은 별도 상수 | B080 B083 I022 I026 |
| UI091 | E3 | 휴식 타이머 알림 · 효과음 켬 → 효과음 볼륨 | 볼륨 범위 | [RestAlertSettings:199](../../../../src/features/settings/RestAlertSettings.tsx#L199) | F · 네이티브 range·수치 | 정적 범위 / 아니요 | 연속/스텝 범위 | I024 N34 |
| UI092 | E4 | 계정/로그인 · 로그인 화면 또는 설정 → 계정 | 인증 수단·연결/해제 후속 흐름 | [IdentityManagement:20](../../../../src/features/auth/IdentityManagement.tsx#L20) | E · 액션/확인 Dialog | 연결된 인증 수단 / 아니요 | 이메일/Google | — |


## 상태와 검증

| 조사 번호 | 초기 상태 | 펼침·방향 | 닫힘 | 비활성/대기 | 디자인 | 확인된 차이·제약 | 적용 판단 후보 | 검증 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UI001 | 당일 기본/임시 값은 카드에 표시, 트리거 제목 고정 | 절대·아래 | 선택·재토글·외부·Escape·초점 이탈 | 상세 실패·빈 구성·개별 재조회·chooserLocked, 초기 데이터는 스켈레톤 | H | 그룹 버튼·aria-pressed, 방향키 전용 탐색 없음 | 현행 기준·6-2 보강 | LIVE |
| UI002 | 활성 프리셋 기본, 사용자 필터는 프리셋/방문 문맥 유지 | 패널 내부·가로 스크롤 | 선택 시 패널 유지 | 프리셋 필터가 없으면 숨김 | H | 휴식 필터와 휴식 확정 2단계 | 전용 유지 | LIVE |
| UI003 | 당일 임시 선택 시 표시 | 오버레이 안 | 복원 후 패널 유지 | 임시 선택 없으면 숨김 | H | 화면 상태만 갱신 | 전용 유지 | LIVE · 표시만 |
| UI004 | 오늘·선택 날짜 | 인라인 상세 아래 | 다른 날짜·이동 | 조회 실패/근거 불명은 상태 표기 | S | 날짜 선택과 기록 열기 구분 | 전용 유지 | S |
| UI005 | 없음 | 별도 상세 | 뒤로 | 상세 대기·오류 | S | 복귀 위치 보존, 홈 카드 별도 구현 | 전용 유지 | S |
| UI006 | 전체·기존 필터 | OS 팝업·UA | 선택·OS 취소 | 요일을 선택하면 비활성, 해제 후 복귀 | N | 헤더 전용 너비·높이 | 우선 비교 | LIVE, PR |
| UI007 | 없음 | 인라인 | 재선택·해제 | 일정 없음 | S | 요일 필터가 정렬 select 잠금 | 전용 유지 | S |
| UI008 | 현재 표시 모드 | 인라인 | 해당 없음 | 일정 뷰 조건 | S | 레이아웃 전환 | 전용 유지 | S |
| UI009 | 닫힘 | 절대·아래 | 토글·액션·다른 목록 열기 | 관리 블록·busy | S | 카드별 반복, 삭제는 확인 별도 | 액션 메뉴 유지 | S |
| UI010 | 없음 | 전체 목록·별도 상세 | 뒤로·화면 이동 | 상세 조회 실패·재시도 | S | 선택값 입력 없이 상세 탐색 | 전용 유지 | S |
| UI011 | 현재 보는 일정 | 인라인 | 즉시 표시 | 로드/편집 조건 | S | 조회와 실제 일정 활성화 구분 | 전용 유지 | S |
| UI012 | 서버 설정 | 인라인 | 확인·취소 | busy·서버 쓰기 제한 | S | 서버 변경 액션 | 전용 유지 | S |
| UI013 | 닫힘·값 없음 | 절대·아래 | 항목/summary 토글·화면 이동 | 쓰기 제한·활성 일정 삭제 보호 | S | 탐색과 위험 액션 혼합 | 액션 메뉴 유지 | S |
| UI014 | 현재 활성/조회 상태 | 카드 → 확인 Dialog | 확인·취소 | 순환/쓰기 잠금·기존 활성 | S | 조회만 하는 경우와 즉시 변경 분리 | 전용 유지 | S |
| UI015 | 미지정 | 절대·아래·독립 패널 | 선택·재토글·외부·blur·Escape | 편집 차단은 상위 가드 | T | 닫힌 aria-controls 미해결, 현재값이 고정 aria-label에 포함되지 않음 | 우선 비교 | PR |
| UI016 | 공란·전체 | 인라인·아래 | 선택·닫기·상세 Dialog 복귀 | 쓰기 가드·선택 가능 표준 종목만 | Q | 추가 후 카드 배치 및 헤더 아래 스크롤 | SearchList 중심 | S |
| UI017 | 공란·전체 | 인라인·아래 | 선택 후 계획 필드·닫기 | 활동 없음·관리/저장 잠금 | Q | 빈 카드 초안과 선택 완료 구분 | SearchList 중심 | S |
| UI018 | 미지정 | OS·UA | 선택·OS 취소 | 상위 쓰기 잠금 또는 disabled | N | 없는 제조사 값 보존, 목록 규모는 환경별 | 검색 필요성 실데이터 확인 | S |
| UI019 | 미지정 | OS·UA | 선택·OS 취소 | 상위 쓰기 잠금 또는 disabled | N | 방식별 중량·휠 규칙에 연결 | 우선 비교 | S |
| UI020 | 현재 강도 단위 | 인라인·details 아래 | 계속 표시 | 미지원/잠금 | S | 단위 전환과 초안 강도 입력의 연동 | 전용 유지 | S |
| UI021 | 각 초안·기본값 | Dialog | 완료·취소·Escape | 폼 잠금·유효값 범위 | W | 다른 숫자 필드 재사용 | 승인 예외 | S |
| UI022 | 공란·활동별 초안 | Dialog | 완료·취소·Escape | 미지원 지표·폼 잠금 | W | 공란과 0 분리 | 승인 예외 | S |
| UI023 | 기존 값 또는 미지정 | 절대·아래·독립 패널 | 선택·재토글·외부·blur·Escape | readOnly prop 지원, 이 호출부는 상위 가드 | T | 열림 시 초기 포커스 행동과 선택 강조가 홈과 다름 | 우선 비교 | S/PR 공용 |
| UI024 | 공란·전체 | 인라인·아래 | 선택·토글·품목 상세 복귀 | 관리/저장 잠금 | Q | 추가 후 스크롤과 변경 후 유지 구분 | SearchList 중심 | S |
| UI025 | 새 검색 | 인라인·아래 | 선택·토글/닫기 | 관리/저장 잠금 | Q | 조합 변경 시 NEW 저장 규칙 | 초안 계약 보호 | S |
| UI026 | 공란·전체 | 인라인·아래 | 선택 후 필드·닫기 | 활동 없음·관리/저장 잠금 | Q | 선택 시 세부 목표 입력으로 전환 | SearchList 중심 | S |
| UI027 | 공란·전체 | 인라인·아래 | 선택 후 필드·닫기 | 관리/저장 잠금 | Q | 활동 변경 시 가능한 지표 달라짐 | 초안 계약 보호 | S |
| UI028 | 기존/미지정, 없는 기존값 보존 | OS·UA | 선택·OS 취소 | 상위 저장/관리 잠금 | N | 구성 변경 시 새 배치 | 보존 조건 확인 | S |
| UI029 | 기존/미지정 | OS·UA | 선택·OS 취소 | 상위 저장/관리 잠금 | N | 변경 즉시 폼 구성이 바뀔 수 있음 | 우선 비교 | S |
| UI030 | 기존 강도 단위 | 인라인·아래 | 계속 표시 | 미지원/잠금 | S | 현재 단위를 그대로 선택하면 변경 없음 | 전용 유지 | S |
| UI031 | 닫힘·미조회 | 인라인·아래 | 복원한 행 후보 제외·다른 후보 유지 | 조회 전/실패·이미 초안에 있음 | S | 한 행씩 복원, 저장 전 취소 가능 | 기능 구조 유지 | S |
| UI032 | 기존 값 | Dialog | 완료·취소·Escape | 폼 잠금·유효값 범위 | W | 설정 중량 승인 확인 별도 | 승인 예외 | S |
| UI033 | 기존/공란 | Dialog | 완료·취소·Escape | 미지원 지표·폼 잠금 | W | 직접 입력 정밀값 보호 | 승인 예외 | S |
| UI034 | 진입 프리셋 | OS·UA | 선택·OS 취소, dirty는 폐기 확인 | busy·최신 일정 없음·readRetry | N | 대상 전환과 draft 폐기 보호 | 우선 비교 | PS |
| UI035 | 기존 배정/휴식 | OS·UA | 선택 후 초안, OS 취소 | busy·readOnly fieldset·최신 조회 필요 | N | 필터 밖에 있는 기존값·사용 불가 값 보존 | 긴 후보 평가 | PS |
| UI036 | 기존 배정/휴식 | OS·UA | 선택 후 초안, OS 취소 | busy·readOnly fieldset·최신 조회 필요 | N | 필터 밖에 있는 기존값·사용 불가 값 보존 | 긴 후보 평가 | PS |
| UI037 | 기존 배정/휴식 | OS·UA | 선택 후 초안, OS 취소 | busy·readOnly fieldset·최신 조회 필요 | N | 필터 밖에 있는 기존값·사용 불가 값 보존 | 긴 후보 평가 | PS |
| UI038 | 기존 배정/휴식 | OS·UA | 선택 후 초안, OS 취소 | busy·readOnly fieldset·최신 조회 필요 | N | 필터 밖에 있는 기존값·사용 불가 값 보존 | 긴 후보 평가 | PS |
| UI039 | 기존 배정/휴식 | OS·UA | 선택 후 초안, OS 취소 | busy·readOnly fieldset·최신 조회 필요 | N | 필터 밖에 있는 기존값·사용 불가 값 보존 | 긴 후보 평가 | PS |
| UI040 | 기존 배정/휴식 | OS·UA | 선택 후 초안, OS 취소 | busy·readOnly fieldset·최신 조회 필요 | N | 필터 밖에 있는 기존값·사용 불가 값 보존 | 긴 후보 평가 | PS |
| UI041 | 기존 배정/휴식 | OS·UA | 선택 후 초안, OS 취소 | busy·readOnly fieldset·최신 조회 필요 | N | 필터 밖에 있는 기존값·사용 불가 값 보존 | 긴 후보 평가 | PS |
| UI042 | 전체 보기/기존 필터 | 절대·아래 | 선택·재토글·Escape·외부·다른 필터 | fieldset busy/readOnly | P | 별도 목록 role 없음, 닫히면 aria-controls 대상 없음 | 작은 팝오버 비교 | PS |
| UI043 | 미선택 또는 현재 태그 | 절대·아래 | 선택·재토글·Escape·외부·다른 필터 | 태그 0 또는 fieldset 잠금 | P | 배정/태그는 한 필터 상태를 대체 | 작은 팝오버 비교 | PS |
| UI044 | 전체 보기 | 인라인 | 열린 후보 팝오버 닫힘 | fieldset 잠금 | P | 날짜별 초안은 그대로 | 전용 유지 | PS |
| UI045 | 서버 순서·포함 상태 | 기능 화면 | 변경사항 저장·취소·폐기 확인 | busy·stale·잠금·최소 포함 수 | S | 그룹 이동과 순서가 초안의 일부 | 전용 유지 | S |
| UI046 | 선택/활성 프리셋 | OS·UA | 즉시 조회 전환·OS 취소 | 프리셋 없으면 숨김 | N | 조회 중 기존 계획 표시와 최신 조회 구분 | 우선 비교 | S |
| UI047 | 현재 화면 보기 | 인라인 | 계속 표시 | 0세트 제어는 특정 보기 | S | 집계 단위와 필터 유지 | 전용 유지 | S |
| UI048 | 현재 화면 보기 | 인라인 | 계속 표시 | 집계 근거에 따른 표시 | S | 두 축 독립 | 전용 유지 | S |
| UI049 | 현재 범위, 최초 운동별 | 절대·아래 또는 위 | 선택·Escape·외부·blur·재토글 | 조회 화면 조건 | O | 재배치가 open 시점에 한정 | 키보드 패턴 참조 | LIVE, PO 공용 |
| UI050 | 검색 공란/기존 대상 | 인라인·아래 | 선택·X·Escape·외부 | 결과 대기/조회 실패/빈 결과 | Q | 범위/태그 바꾸면 선택·검색 초기화 | SearchList 중심 | S |
| UI051 | 전체 | 인라인·가로 스크롤 | 선택 시 검색 유지 | 다른 범위에서 숨김 | Q | 필터 조작과 그래프 대상 지정 구분 | 전용 유지 | S |
| UI052 | 현재 기간 | 인라인 달력 | 날짜 선택·닫기 | 범위·미래 날짜 조건 | S | 기간 대기와 이전 결과 보존 | 전용 유지 | S |
| UI053 | 세트 또는 기존 | 인라인 | 계속 표시 | 조회 근거 제한 | S | 서로 다른 단위의 그래프 | 전용 유지 | S |
| UI054 | 세트 | 인라인 | 표 갱신 | 총중량 자료에 조건 | S | 추이 카드 지표와 별도 상태 | 전용 유지 | S |
| UI055 | 공란 또는 선택 운동 | 인라인·아래 | 선택·X·외부·Escape | 응답 대기·조회 실패·빈 결과 | Q | 조회 오류에 새로고침, 현재 운동·기간 초안 보존 | 서버 검색 참조 | PG |
| UI056 | 전체 | 인라인·가로 스크롤 | 검색 유지 | 검색 상태 조건 | Q | 페이지 조회와 화면 필터 구분 | 전용 유지 | PG |
| UI057 | 현재/서버 결과 기준 | OS·UA | 선택·OS 취소 | 조회 상태·배치 목록 조건 | N | 기간 변경·사라진 배치·삭제 표기 보존 | 동적 select 후보 | S · PG에서 배치 1개로 숨김 |
| UI058 | 현재 기간 | 인라인 | 계속 표시 | 조회 중 이전 그래프 표시 | S | 기간과 배치 함께 조회 | 전용 유지 | S |
| UI059 | 루틴별 기본/기존 | 절대·위/아래 | 선택·Escape·외부·blur·재토글 | 화면/조회 조건 | O | 최초 배치만 계산, 크기 변화 실측 | 키보드 패턴 참조 | PO |
| UI060 | 공란/현재 선택 | 인라인·아래 | 선택·X·Escape·외부 | 조회/결과 공란 | Q | 계약상 전체 과거 검색과 현재 검색 범위 차이 | 동작 보존·계약 후속 | PO |
| UI061 | 전체 | 인라인 | 검색 유지 | 루틴별이면 숨김 | Q | 운동별 검색에만 표시 | 전용 유지 | S |
| UI062 | 현재 조회 월 | 인라인·아래 | 선택·닫기 | 월/날짜 범위 | S | 검색 해제 후 선택 월 복귀 문맥 | 전용 유지 | PO |
| UI063 | 없음 | 별도 상세 | 뒤로 | 상세 대기·오류 | S | 복귀 위치 보존, 홈 카드 별도 구현 | 전용 유지 | S |
| UI064 | 닫힘 | 절대·아래 | 토글·액션, 메뉴별 확인·이동 | 기록 소유/쓰기/사본 조건 | S | 값 선택이 아닌 후속 업무 메뉴 | 전용 유지 | PD |
| UI065 | 선택 전 없음 | 인라인 목록·Dialog | 정정 Dialog 취소/확인 | 쓰기·busy·삭제 상태 | S | 초안과 서버 저장/삭제 확인 분리 | 전용 유지 | S |
| UI066 | 체크 해제, 현재 시간 바탕 | Dialog 내부/휠 | 취소·확인 | 체크 해제면 시간 편집 비활성 | W | false/미측정과 수치 구분 | 전용 유지 | S |
| UI067 | 확정값/공란 | Dialog·내부 휠 | 취소·확인 | 삭제·저장·권한 조건 | W | 승인과 정정의 서버 의미 분리 | 승인 예외 | S |
| UI068 | 첫 사본 | OS·UA, Dialog 내부 | 선택·OS 취소 | locked/확인 단계 | N | 사본 바꾸면 행 선택/오류 초기화 | 기능 구조 유지 | PD |
| UI069 | 미선택 | Dialog 내부 목록 | 체크 후 확인 단계, Escape/취소 | 충돌·비복구·잠금·확인 중 | D | 복구 불가 행은 별도 details | 전용 유지 | PD |
| UI070 | 현재 종목 | Dialog 내부 목록 | 행 선택·목록 닫기·변경하기 | 드래그 중 이동 막음·저장 상태 | D | 웨이트/유산소 그룹, 순서 적용과 이동 구분 | 전용 유지 | S |
| UI071 | 현재 종목 | 인라인 | 전환 완료 | 편집/전환 상태 제한 | S | 숫자 휠·목록 스크롤과 제스처 구분 | 전용 유지 | S |
| UI072 | 현재 결과 | 인라인 | 즉시 기록/취소 흐름 | 잠금·진행 단계 | S | 무관 행 다중 배치 선택과 구분 | 전용 유지 | S |
| UI073 | 공란 | Dialog 내부·아래 | 선택 시 부모 로컬 처리·취소 | 쓰기/저장·세션 잠금 | Q | 모달 내 검색과 인라인의 스크롤/초점 차이 | SearchList 중심 | PW |
| UI074 | 새 검색 | Dialog 내부·아래 | 선택 시 부모 로컬 처리·취소 | 완료 세트 있으면 교체 불가 | Q | 대체와 공식 평가 정책 연결 | 초안/보호 계약 유지 | S |
| UI075 | 조합 현재값/미지정 | OS·UA | 선택·OS 취소, 상위 변경 확인 | 완료 수행·쓰기·저장 상태 | N | 표준 상세와 별도, 세션 조합 변경 | 장비 공용 보호 | S |
| UI076 | 현재/미지정 | OS·UA | 선택·OS 취소, 상위 변경 확인 | 완료 수행·쓰기·저장 상태 | N | 방식과 허용 중량 입력 연동 | 장비 공용 비교 | S |
| UI077 | 초안/승인·실제 값 | Dialog | 완료·취소 | 완료 세트·저장·잠금 | W | 압축 세트 표 전용 조작 | 승인 예외 | S |
| UI078 | 오늘만 변경 | Dialog 내부 | 확인·취소·Escape | progressionAllowed false이면 승인 옵션 차단 | D | 단순 중량 입력과 공식 승인 구분 | 전용 유지 | S |
| UI079 | 공란 | Dialog 내부·아래 | 선택 후 계획 화면·취소 | 편집/저장 상태 | Q | 선택 후 즉시 세션 저장 대신 계획 확인 | SearchList 중심 | S |
| UI080 | 기존 계획·선택 단계에서 공란 | Dialog 내부·아래 | 선택 후 계획 화면·취소 | 완료/건너뜀·쓰기 상태 | Q | 계획과 실제 기록 구분 | SearchList 중심 | S |
| UI081 | 현재/활동별 초안 | Dialog 안 인라인·추가 휠 Dialog | 완료·취소 | 미지원/잠금 | W | 모달 안의 선택 레이어와 복귀 초점 | 승인 예외 | S |
| UI082 | 현재 계획 또는 공란 | 모달 | 계획 확인·취소 | 유효 초안·저장 상태 | S | 종목 선택 뒤 확인 단계 유지 | 전용 유지 | S |
| UI083 | 현재 시간/공란 | Dialog·복수 필드 | 확인·취소 | 진행/저장 제한 | W | 원계획 목표와 분리 | 승인 예외 | S |
| UI084 | 기본 포함·예정 중량 | 기능 Dialog/리뷰 | 취소·승인 확인 | saving·권고 없음·승인 가능 조건 | D/W | 체크 선택·변경 중량·확정 별도 | 전용 유지 | S |
| UI085 | 공란·전체, 선택 시 목록 복귀 상태 유지 | 인라인 검색 → 별도 상세 | 뒤로·검색 닫기/X/Escape | 가용 목록·검색/상세 조회 오류 | Q | 상세에서 SELECTED 전환 없이 검색 목록과 초점 복귀 | 검색 패턴 참조 | PC |
| UI086 | 전체 | 인라인·가로 스크롤 | 검색 유지 | 검색 닫힘 | Q | 32px 운동 아이콘과 필터 의미 유지 | 전용 유지 | PC |
| UI087 | 현재 값 | 인라인 | 즉시 설정 갱신 | 계정 조건 | S | 도메인 기록과 UI 환경설정 구분 | 전용 유지 | S |
| UI088 | 현재 값/기본 | 인라인 | 즉시 설정 갱신 | 미리보기 실행 잠금·상위 활성 상태 | S | 타이머 미리보기와 설정 구분 | 전용 유지 | S |
| UI089 | 현재 위치 | 인라인 | 즉시 설정 갱신 | 깜빡임 꺼짐/미리보기 잠금 | S | 버튼 토글·레이아웃 전용 | 전용 유지 | S |
| UI090 | 기존 값 | 인라인 | 즉시 설정 갱신 | 상위 알림 비활성/미리보기 중 | S | 이미 승인한 기능형 선택 | 전용 유지 | S |
| UI091 | 저장 값 | 인라인 | 즉시 설정 갱신 | 효과음 상태·미리보기 | S | 드래그·키보드 범위 입력 | 전용 유지 | S |
| UI092 | 서버 연결 상태 | 별도 경로/확인 | 완료·취소 | 재인증·계정 잠금·마지막 수단 정책 | S | 인증 업무 선택, 값 필드 없음 | 전용 유지 | S |
