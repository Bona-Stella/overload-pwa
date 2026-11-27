# FRONT 18 — 6-1 전체 드롭다운 및 선택 UI 현황 조사

2026-11-26~27 · PWA `4f92880` · [전체 사용처 현황표](evidence/front-18-6-1/selection-inventory.md)

## 결과

서비스 소스의 26개 흐름에서 선택 UI 92개를 식별했다. `ConnectedDropdown`은 홈의 **오늘만 다른 루틴 선택** 1곳에 사용한다. 393px에서 홈 트리거는 56px·모서리 4px, 루틴 태그는 44px·10px, 운동 현황 검색 범위는 42px·캡슐이었다. 홈은 필터와 두 줄의 루틴 후보를 겹쳐 표시한다. 루틴 태그는 설명과 함께 별도 목록을 열고, 검색 범위는 짧은 목록을 위아래로 배치한다.

4174 전용 검수 계정에서 예정 휴식일과 당일 임시 휴식의 `운동 시작`은 비활성이었다. 전체 필터의 루틴 13개가 선택 가능했고 한 루틴을 선택한 뒤 START 버튼이 활성화됐다. 이전의 전체 목록 잠금과 START 동시 활성 증상은 재현되지 않았으며 직접 원인은 미확정이다.

| 대표 분류 | 사용처 | 예 |
| --- | ---: | --- |
| A 연결형 | 1 | 오늘만 다른 루틴 선택 |
| B 단일 선택 공통화 비교 | 13 | 루틴 태그, 저장된 루틴 필터, 편집 대상 프리셋, 부하 방식, 검색 범위 |
| C 검색 또는 긴 목록 | 24 | 요일별 배정 7개, 제조사 3개, 종목·기록 검색 |
| D 다중 또는 계층형 | 4 | 일정 포함·제외/순서, 복구 기록, 운동 순서, 승인 대상 |
| E 기능 전용 | 12 | 업무 메뉴, 기록 탐색·정정, 활동 계획 Dialog |
| F 기존 특수 조작 | 38 | 칩, 달력, 분할, 숫자 휠, 토글, 세트 체크 |
| G 추가 확인만으로 분류한 행 | 0 | 공통 논의 및 미확인 범위는 아래 표에 기록 |
| 합계 | **92** | 연결형 미적용 91 |

텍스트 검색 14곳, 네이티브 select 18곳(소스 선언 8개), 자체 값 드롭다운 4곳(구현 3개)이다. 루틴 태그 목록을 생성·편집에서 공유하며, 일정 후보의 배정·태그 팝오버는 개별 코드다. 운동 현황과 전체 이력에는 별도 공용 `SearchScopePopover` 1개를 공유한다. 업무용 메뉴·검색 목록·특수 조작은 각각의 분류에 있다.

5-4의 402개 고유 조작 위치 중 **135개**가 이번 표와 대응한다. B/I의 `sameLocationAs` 중복을 한 번 세고, N 번호는 참고 색인으로 사용했다. 이번 표는 고정 요일 슬롯과 흐름별 재사용을 개별로 기록한다. 같은 화면에서 데이터 개수로 늘어나는 카드·세트·배치마다 번호를 부여하는 방식은 사용하지 않았다. [5-1 조사](front-18-5-1-control-audit.md) · [5-4 현황](front-18-5-4-control-rollout.md) · [5단계 적용 현황](../engineering/frontend.md#front18-stage5)

## 범위와 근거

`2145d1c` 구현 다음의 `4f92880`은 공식 문서와 5단계 근거를 정리했다. UI-18 홈 선택은 2026-11-23에 승인됐고 구현은 `46524bc`에 반영됐다. UI-23 타 화면 확장이 이번 조사 범위다. 일반 입력 48px·5px·좌우 12px와 검색 44px·캡슐·원형 X를 비교 기준으로 사용했다. 홈의 기존 56px와 기능별 예외도 함께 확인했다. [AGENTS](../../AGENTS.md) · [Frontend 규칙과 현황](../engineering/frontend.md#87-v09-적용-범위와-구현-상태) · [화면별 UI/UX](../product/ui-ux.md) · [Decision Log 10.25](../product/Overload_UI_Decision_Log_v0.9.md#1025--2026-11-16-최신-정책-확정과-구현-경계) · [Visual Theme](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#front18-controls-visual)

운영 진입점 `main → AuthApp → WorkoutWorkspace / SettingsMain`에서 JSX select, listbox, 펼침·체크·라디오·토글·휠, 메뉴와 Dialog로 이어지는 사용처를 역추적했다. 차트 포인터/방향키 툴팁은 수치 읽기로 보았다. 공용 `SearchList`의 네이티브 범위 fallback은 서비스에서 `scopes`를 전달하는 양쪽 호출이 `renderScope`를 제공해 도달하지 않는다.

| 별도 확인 | 도달 범위 |
| --- | --- |
| `RoutineTagList` 검색형 태그 선택 | `TagPickerExamples` Preview. 서비스 `RoutineForm`은 `TagPicker`를 호출한다. |
| `RoutineEditor`, `ExercisePicker`, `WorkoutScreen`, `CardioScreen`, `CardioPlanEditor` | 과거 `DemoApp` 계열. 시연 요일 복수 선택과 유산소 종류·강도의 네이티브 select 2개를 확인했다. 서비스 운동 화면은 `LocalWorkoutScreen`과 `WorkoutDialogs`를 사용한다. |
| `SettingsScreen`, 과거 `SessionDetail`, `ClosedWorkoutList` | 프로토타입/현재 진입점에서 미사용. 서비스에는 설정, `RecordFeed`, `ClosedWorkout`을 집계했다. |
| 디로딩 홈 선택 시안, 목표 심박·케이던스 범위, 4개 휴식 구간, 기기 상태 select | Preview 조건 및 상태 전환 도구. 현재 홈 디로딩 헤더는 읽기 상태 표시이며, 기간 보호는 일반 선택 조건에 반영된다. |

[운영 진입점](../../src/main.tsx) · [인증 앱](../../src/features/auth/AuthApp.tsx) · [운동 워크스페이스](../../src/features/workout-online/WorkoutWorkspace.tsx) · [공통 Preview](../../tests/fixtures/review/CommonUiPreview.tsx) · [태그 시안](../../tests/fixtures/review/TagPickerExamples.tsx) · [과거 데모](../../tests/fixtures/review/DemoApp.tsx)

요일 필터와 기존 배정값, 장비 변경과 이전 조합의 측정, 진행 세션 수정과 완료 기록 권한은 각각 보호해야 한다. 전체 과거 운동별 이력 검색과 선택 대상 일별 추이는 제품 결정과 구현의 차이가 남아 있다. 서버 조회 지원은 전체 UI·UX 확정 이후 검토할 과제다. [일정 계약](../../../overload-server/docs/api/weekly-schedule.md) · [카탈로그와 장비](../../../overload-server/docs/api/standard-exercise-catalog.md) · [ST-19와 통계 정책](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md) · [통계 현행 구현](../../../overload-server/docs/api/statistics.md)

## 공통 모듈 분석

### ConnectedDropdown과 홈

- 공개 props는 `label: string`, `className?: string`, `children: (close) => ReactNode`다. 루트·패널 ref, `useId`, `open`은 공용이다. 선택값·옵션 형식·동적 조회·placeholder·항목 비활성·검색은 자식에서 결정한다. 서비스 호출은 `HomeView` 한 곳이며 전용 `className`을 추가한다.
- 트리거로 토글하고 자식이 `close()`를 호출하면 닫으면서 트리거에 초점을 돌린다. 열린 동안 `aria-controls`가 트리거로 이름이 붙은 `region`을 가리킨다. 외부 포인터와 실제 다른 요소로의 초점 이탈은 패널을 닫는다. 내부 Escape는 전파를 중지하고 닫는다. 공용은 버튼 기본 Enter/Space·Tab 순서를 사용하고, 방향키·Home/End·현재값 자동 스크롤을 제공하지 않는다.
- 루트 바로 아래에 절대 배치한다. 높이는 `min(340px, max(0, visualViewport 하단 또는 nav 상단 − 트리거 하단 − 8px))`이다. 열 때 최대 200px 공간을 목표로 문서 스크롤을 시도한다. 부모와 nav의 크기, window와 VisualViewport의 resize/scroll을 구독한다. 상향 전환, 상위 스크롤 컨테이너 경계 추적, 닫기 전 스크롤 위치 복원은 코드에 없다.
- 공용 패널의 패딩은 상하 5px·좌우 6px이며 자체 overflow를 사용한다. 홈 CSS는 flex·`overflow:hidden`·좌우 0으로 덮고, 필터를 고정한 채 `choices`에서 세로 스크롤한다. 항목은 두 줄·말줄임·강조 배경과 제목·`aria-pressed`·네이티브 `disabled`를 사용한다. 선택값/필터를 목록 부품으로 옮길 경우 부분 조회 실패, 복귀, 당일 상태를 함께 보존해야 한다. [공용 TSX](../../src/components/common-ui/ConnectedDropdown.tsx) · [공용 CSS](../../src/components/common-ui/ConnectedDropdown.module.css) · [홈 호출부](../../src/features/home/HomePanel.tsx#L341) · [홈 CSS](../../src/features/home/Home.module.css#L33)

### 다른 선택 구현과 재사용 지점

| 구현 | 공유 범위와 동작 | 비교할 점 |
| --- | --- | --- |
| `TagPicker` | 생성/편집 11개 고정 태그. 외부·초점 이탈·Escape·선택 닫기. 방향키와 Home/End로 옵션 버튼에 초점을 이동한다. | 홈과 두 줄 글자 CSS 공유. 크기·아래 가용 공간 계산은 별개다. 고정 `aria-label`에 현재 태그명이 없다. |
| `SearchScopePopover` | 이력 2개, 운동 현황 4개. 트리거에 범위명을 넣고 listbox 초점·`aria-activedescendant`·방향키 순환·Home/End·Enter/Space·Escape·Shift+Tab을 사용한다. | 열 때만 가용 공간을 계산해 위아래를 정한다. 새 범위는 부모의 검색·선택·태그를 재설정한다. |
| `SearchList` / `SearchResults` | `IDLE/EDITING/SELECTED`를 내부에서 관리하고 query, 옵션, 선택, 필터와 상태를 부모에서 받는다. 선택 행과 상세 버튼이 따로 있다. | 인라인 영역이다. 방향키로 활성 행/상세 버튼을 이동하고 결과에서 Home/End를 쓴다. Escape는 검색을 닫고 X로 초점을 보낸다. 상위 피커에서도 Escape를 처리하면 닫힘 범위가 달라진다. |
| 일정 후보 칩 | 배정 2개, 태그는 현재 루틴에서 추출한다. 하향 절대 배치, 외부 클릭·Escape·선택 후 트리거 복귀. | 버튼 그룹에 전용 방향키 탐색은 없다. 필터 밖의 현재 배정값을 요일 select에 별도로 보존한다. |
| 네이티브 select | 기본 OS 조작, 장비는 `EquipmentFields` 공유. | 짧고 고정된 부하 방식, 긴 제조사/요일 루틴, 선택 후 초안/조회 등 책임이 다르다. |
| `Dialog` | React 트리 안의 네이티브 `showModal()` top layer. 제목/지정 요소 초점과 이전 요소 복귀. | 복구의 체크·확인, 운동 탐색·정렬, 세션 계획에서 기능 경계를 제공한다. 바깥 클릭 닫기는 사용처가 명시했을 때 적용된다. |

[태그](../../src/features/workout-online/TagPicker.tsx) · [공통 목록 글자](../../src/components/common-ui/RoutineOptionText.module.css) · [범위 팝오버](../../src/features/statistics/SearchScopePopover.tsx) · [검색](../../src/components/SearchList.tsx) · [일정 배정](../../src/features/statistics/WeeklySchedulePanel.tsx) · [장비](../../src/features/workout-online/EquipmentFields.tsx) · [Dialog](../../src/components/Dialog.tsx)

## 브라우저 계측

기존 [Mac 앱](http://127.0.0.1:4174/), [공통 Preview](http://127.0.0.1:4174/common-ui-preview.html), [LAN 앱](http://192.168.0.9:4174/)에서 HTTP 200을 확인했다. 실제 앱은 전용 검수 계정과 Spring 읽기 응답을 사용했다. Preview는 기존 `?front18=1`의 운영 컴포넌트와 합성 데이터다. Chrome 158.0.8127.37의 CSS viewport 너비 320·375·393·430·1280px에서 높이 852px를 기본으로 사용했다. 짧은 높이에서는 고정 헤더/푸터와 가용 공간을 확인했다. 표의 치수와 조작 영역은 DOM 상자와 computed style 기준이다.

| 393px 대표 표본 | 닫힌 트리거 | 열린 목록·옵션 | 비교 |
| --- | --- | --- | --- |
| 홈, 실제 앱 | 353×56, 모서리 4, 좌우 12, 1px 경계, 14px·700 왼쪽, +/− 19px·줄 높이 20, gap 8 | 간격 0, 1개 표본 패널 124px, 13개 표본 340px. 항목 58~59px. 제목 14px·900, 부제 12px·400. 개방 시 트리거 하단 모서리·경계 제거 | 48px 일반 입력보다 8px 높다. 값은 오늘 카드에서 확인한다. |
| 루틴 태그, Preview | 327×44, 10px, 좌우 12, 1px, 14px·400, ▾, 상단에 ‘루틴 태그 · 선택’ | 327×360, 간격 4px, 반경 10px, 패딩 5px, 첫 항목 67.6px, 전체 스크롤 높이 753px, 태그 10개와 미지정 | 일반 입력보다 4px 낮고 반경은 5px 크다. 이름과 설명을 두 줄 이상으로 배치할 수 있다. |
| 저장된 루틴 필터, 실제 | 118×36, 최대 폭 145, 좌우 6, 10px, 1px, 16px·400 | 옵션 5개, 계측 시 배정 관련 2개 비활성. UI CSS상 프리셋 헤더에서는 최소 44px | 환경/일정 데이터 상태에 따라 높이와 표기가 다르다. OS 팝업은 미계측이다. |
| 일정 폼, Preview | 프리셋 353×44, 월요일 301×44, 반경 10, 좌우 12, 1px, 16px | 프리셋 3개, 요일별 후보 5개. 배정 칩 80.5×44, 목록 110×104, 간격 4px, 반경 5px, 최대 260px, 옵션 44px. 태그 후보 3개, 152px | 일정 필터의 칩 외형 36px와 클릭 높이 44px를 구분한다. |
| 운동 현황의 검색 범위, 실제 | 84×42, 캡슐, 좌우 12, 무테, 12px·650, 12px SVG, gap 4 | 132×188, 6px 틈, 12px 반경, 1px 경계, 패딩 5px, 44px ×4 | 범위 버튼과 44px 검색 입력의 높이가 다르다. |
| 표준 운동 검색, Preview | 입력 279×44, 좌우 12, 캡슐, 16px, X 42×42, 반경 50%, SVG 18px, 간격 6px | 12개, 결과 뷰 327×496.3, scrollHeight 695. 첫 선택 상자 279×57, 상세 36×44, 버튼 사이 4px | 카탈로그 전용 flex가 목록 높이를 제한한다. 운동 현황/성장의 입력은 같은 44px이지만 무테다. |
| 누락 복구 Dialog, Preview | 네이티브 311×48, 반경 10, 좌우 12, 16px | Dialog 359×488.1, 반경 18, 사본 1개, 체크박스 20×24 및 행 label | 사본과 수행 행을 별도로 고른다. 여러 사본과 OS 팝업은 미확인이다. |

기본 Onyx에서 홈과 기능 Dialog는 `#1B1D22`, 폼·태그/범위 팝오버는 `#25282E` 입력 표면을 쓴다. 일반 경계는 1px `#353941` 계열이다. 홈·태그·범위에 선택 체크 아이콘은 없으며, 홈은 `aria-pressed`와 배경/제목, 태그·범위는 `aria-selected`와 배경을 쓴다. 범위 팝오버는 키보드 활성 행의 경계를 추가한다. 조사 범위는 일반/선택/비활성/키보드 초점과 목록 표면이다. hover·pressed의 모든 전환 프레임 및 입력 오류 연결의 호출부별 스크린리더 전달은 미확인이다. [홈 CSS](../../src/components/common-ui/ConnectedDropdown.module.css) · [폼 CSS](../../src/features/workout-online/Routine.module.css) · [범위 CSS](../../src/features/statistics/Activity.module.css) · [카탈로그 CSS](../../src/features/workout-online/PublicCatalog.module.css)

### 공간, 스크롤, 겹침

| 재현 | 관찰 |
| --- | --- |
| 실제 홈 393×852, 활성 일정과 전체 필터 | 1개 후보에서 124px, 전체 13개에서 340px. 전체의 내부 스크롤은 284px 뷰/776px 콘텐츠. 내부 scrollTop 200 이동 시 문서 scrollY는 0→0, 다시 열면 0. 같은 너비와 경계로 바로 연결되며 주간 일정의 문서상 위치를 밀지 않는다. |
| 실제 홈 320×285, 전체 필터, 트리거 아래 공간 12px | 패널을 열자 문서가 89→285px 스크롤됐다. 트리거는 y=-35.2~20.8로 일부만 남았고, 목록 200px은 고정 nav 직전(y=220.8, nav y=229)까지 보였다. 너비 320px, 높이 852px로 복원하면 목록은 340px로 재계산됐다. 아래에 공간을 확보하는 현행 방식은 고정 헤더 쪽의 트리거 가시성을 고려하지 않는다. |
| 루틴 생성 태그 320×420 및 393×420 | 트리거 하단 y=329.6, 팝오버 y=333.6~522.6, 고정 nav 상단 y=364. 아래 방향을 유지해 열린 직후 첫 항목도 화면의 고정 하단 영역과 겹친다. 852px 높이에서는 목록이 보였다. 문서를 스크롤해 더 노출할 수 있지만 열기 직후 가용 공간에 맞추지 않는다. |
| 전체 이력 검색 범위, 320/393px | 852px에서는 아래에 100px, 410px에서는 위에 100px로 배치했다. 열린 채 295px로 줄여도 기존 방향과 최대 높이 계산을 유지했다. 이 표본에서는 상향 옵션이 보였지만 일부 폭에서 트리거 하단이 nav 뒤로 내려갔다. 열린 상태 재계산 부재는 소스에서도 확인했다. |
| 카탈로그 검색 | 검색 결과가 페이지의 흐름을 차지한다. 일반 높이에서는 393×852에서 합성 터치로 목록 scrollTop 0→198, 문서 scrollY 0→0을 확인했다. 320×560에서는 709px 전체 결과가 인라인으로 놓이고 overflow가 visible로 바뀌었다. 검색어로 결과가 사라지면 빈 상태로 바뀌고 결과를 지우면 목록이 복귀한다. |
| Dialog 내 선택 | 복구 사본은 native select, 수행 항목은 행 체크다. 모달과 내부 스크롤이 별도로 있고, Escape로 닫혔다. 별도 웨이트 추가 Dialog는 검색 입력 44px, 3개 결과 173px, Dialog 359×535.8px였다. 결과에서 Escape를 누르면 검색 결과가 닫히고 X에 초점이 돌아오며 Dialog는 유지됐다. |

팝오버의 위아래 공간 계산과 고정 요소의 겹침은 서로 다른 문제다. 홈의 y 보정은 목록을 사용할 공간을 확보하지만 버튼을 가릴 수 있다. 루틴 태그는 주변 콘텐츠를 움직이지 않지만 푸터 뒤로 열린다. 범위 팝오버는 아래 공간이 부족할 때 상향으로 바뀐다. 인라인 검색은 결과가 길어질수록 화면을 차지하지만 다중 상태와 오류를 같은 흐름으로 제공한다. 서비스 선택 코드에 React Portal을 사용하는 경로는 확인되지 않았다. 기능 Dialog는 네이티브 top layer를 사용한다.

### 검색과 상태

- 웨이트/유산소 검색은 이름·별칭과 부위/유형 필터를 사용한다. 웨이트는 카탈로그의 검색 정규화와 분류 규칙, 유산소는 정규화된 문자열 포함 검색 후 카탈로그 순서·ID 중복 제거를 사용한다. 일반 검색은 결과 영역에 이름·설명과 별도 상세 접근을 표시한다. 규모는 카탈로그와 필터에 따라 달라진다. 12개는 카탈로그 **합성 표본**이다. [웨이트 검색](../../src/features/workout-online/ExerciseSearch.tsx) · [카탈로그 탐색](../../src/features/workout-online/catalog-browse.ts) · [유산소 검색](../../src/features/workout-online/CardioSearch.tsx) · [정규화](../../src/features/workout-online/catalog.ts)
- X의 의미는 편집 중 검색어 지우기, 공란이면 검색 닫기, 선택 완료면 선택 해제다. 카탈로그에서 검색어 입력→빈 결과→X→결과 복귀→Escape를 확인했다. 카탈로그 상세 이동은 검색 상태와 복귀 초점을 유지하며 일반 운동 피커는 선택 뒤 query를 초기화하고 닫는다. 범위 변경은 선택과 검색어를 지운다. 이력은 닫을 때 입력을 확정 선택값으로 되돌린다. 공통 컴포넌트의 입력 라벨은 숨김 label이며 placeholder와 별개다. [공통 검색](../../src/components/SearchList.tsx) · [카탈로그 상세 복귀](../../src/features/workout-online/PublicCatalog.tsx) · [전체 이력](../../src/features/history/RecordFeed.tsx)
- 성장 추적은 서버 검색과 페이지 추가 조회를 사용한다. 현재 검색 키와 일치하지 않는 보존 결과는 비활성으로 두고, 초기 오류에서는 임베디드 오류와 새로고침을 제공한다. 합성 실패→새로고침→검색 결과 복구를 확인했다. 추적 배치는 옵션이 2개 이상일 때만 나타나며 단일 배치 Preview에서는 펼침을 확인할 수 없었다. [성장 검색/배치](../../src/features/statistics/GrowthPanel.tsx)
- 일정 폼은 합성 재조회 실패에서 월요일과 편집 프리셋을 비활성화하고 새로고침을 표시했다. 현재 배정이 필터에 없으면 기존 배정 옵션을 남긴다. 제조사에서 목록에 없는 기존값도 임시 옵션으로 보존하며 미지정으로 되돌릴 수 있다. 신규 선택/배정 저장 초안의 수명과 실제 저장은 각 상위 폼이 관리한다. [일정 편집](../../src/features/statistics/WeeklySchedulePanel.tsx) · [장비 선택](../../src/features/workout-online/EquipmentFields.tsx)

## 홈 간헐 증상 대조

| 구분 | 근거 |
| --- | --- |
| 트리거와 옵션 | 데이터가 있으면 트리거를 렌더하고, 공용 트리거의 disabled prop은 없다. 항목 차단은 상세의 시작 가능 구성, 해당 루틴 재조회, busy/action/ACTIVE/미확인 START/확정 디로딩 보호로 결정한다. |
| 조회와 복구 | 최초 로딩은 skeleton. 확인 전 후보를 기다리며, 조회 실패/빈 구성은 분리한다. 일부 상세 실패 후보에는 ‘구성 조회 실패’를 표시한다. 선택한 상세 또는 가용 전체를 확인하지 못하면 복구 UI를 사용한다. |
| START | 최신 선택 루틴 버전, 빈 구성 여부, 읽기와 `training.canWrite`, 로컬 준비와 편집 지원이 필요하다. 화면의 버튼 존재와 실행 가능 상태는 별개다. 시작 결과 미확인의 재확인과 실제 신규 START도 조건이 다르다. |
| 실제 값 전달 | 후보를 누르면 `{date, routineId}`, 휴식은 `routineId: null`을 해당 날짜 화면 상태에 둔다. 원래 일정 복귀는 override를 지운다. 임시 선택이 사라진 후보를 가리키면 유효한 일정 값으로 돌아간다. |
| 편집 잠금 확인 범위 | 과거 4174 LAN 허용 출처 결함과 그 수정은 5단계 근거다. 이번에는 LAN HTTP 응답과 Mac 루프백에서의 읽기/선택을 확인했다. 운동 시작, 잠금 획득, 쓰기 재시도 및 디로딩 ACTIVE 조합은 실행 범위 밖이다. |

[HomePanel 조건](../../src/features/home/HomePanel.tsx#L252) · [워크스페이스 상태 연결](../../src/features/workout-online/WorkoutWorkspace.tsx#L680) · [5단계 적용 현황](../engineering/frontend.md#front18-stage5) · [LAN 이력](front-18-5-3-final-refinement.md#mac-4174-재검수)

## 접근성 및 조작

| 유형 | 확인한 구조 및 키 | 남은 확인/한계 |
| --- | --- | --- |
| 홈 연결형 | 버튼 이름·`aria-expanded`·열린 `aria-controls`, `region` 이름, 필터와 루틴의 `aria-pressed`, 네이티브 비활성. 393px에서 Enter·Space 개방, Tab으로 필터 진입, Escape 닫기와 초점 복귀, 트리거 재토글을 확인했다. Chrome 터치로 트리거 개방과 옵션 선택·닫기도 확인했다. | 목록 역할 및 방향키·Home/End 탐색이 없다. 비활성 버튼은 기본 Tab 순서에서 빠진다. 목록 갱신이 현재 초점을 없애는 경계는 소스로 확인해야 한다. |
| 루틴 태그 | 버튼·listbox·option·선택 상태. Space 개방, End→마지막, ArrowDown→첫 옵션, Enter 확정, Escape/바깥 클릭 닫기를 확인했다. | 닫힐 때도 `aria-controls`가 조건부 DOM을 참조한다. 레이블이 현재 값 정보를 대체한다. 항목 포커스와 선택은 분리된다. |
| 검색 범위 | 목록 자체에 초점, `aria-activedescendant`로 옵션 이동, Enter로 범위 확정과 트리거 복귀, Escape 닫기. | 실제 VoiceOver 읽기와 키보드 활성 중 크기 변화의 전달은 미확인이다. |
| 일정 후보 | 누르면 `aria-expanded`, 현재 값에 따라 `aria-pressed`, Escape 후 해당 트리거. | 닫힌 상태에서도 일부 ID 참조가 남는다. 목록의 이름과 옵션 목록 의미가 버튼 그룹만으로 표현된다. |
| 검색 결과 | 입력은 연결 label, 일반 목록과 두 종류 버튼, 검색 상태/로딩 표시. 카탈로그에서 ArrowDown으로 결과 진입, Home 및 Escape 종료를 확인했다. | 큰 가상 키보드에서 포커스/스크롤과 인라인·Dialog의 Escape 전파는 별개다. |
| 네이티브/다중/모달 | label 또는 `aria-label`, native selected/disabled/checked와 DOM 순서, Dialog title ID. | native 옵션 팝업의 조작, VoiceOver, 여러 복구 후보와 비활성 필드의 보조 기술 전달은 미확인이다. |

## 6-2 논의 항목

| 논의 | 결정할 사항 | 현재 구현 | 실제 문제와 근거 | 검토 가능한 방향 | 적용 범위 |
| --- | --- | --- | --- | --- | --- |
| 01 | 가용 공간·고정 영역 처리 | 홈 하향 및 문서 스크롤, 태그 고정 하향, 범위 최초 상향 계산 | 320×285 홈 트리거 일부 가림, 320/393×420 태그가 푸터 아래, 범위에 열린 상태 재계산 없음 | 홈 형태를 유지하며 헤더·푸터·스크롤 컨테이너 보정 검토. 태그의 필요 시 상향/목록 높이 축소를 비교 | UI001, UI015, UI023, UI042~043, UI049, UI059 |
| 02 | 공통 트리거와 상태 이름 | 56px·4px 홈 제목, 44px·10px 태그, 36px 네이티브 필터, 42px 캡슐 범위 | 값이 고정 이름에 가려지거나 다른 위치에서 표시되는 유형, 토큰과 조작 영역 차이 | 루틴 필터·부하 방식·프리셋처럼 짧은 단일 선택의 공통 표면부터 비교. 48px 입력과의 정렬 및 값/레이블/아이콘 역할 결정 | UI006, UI019, UI029, UI034, UI046, UI057, UI076 및 태그 |
| 03 | 키보드·초점·현재값 | 홈은 그룹, 태그는 개별 옵션 초점, 범위는 활성 ID | 홈의 방향키 부재, 태그/일정의 닫힌 ID 참조, 초점·선택의 시각 차이 | 짧은 listbox는 범위 구현 참조. 필터가 같이 있는 홈에서는 그룹과 루틴 목록의 탐색 경계부터 결정 | A/B 유형 |
| 04 | 긴 목록 검색과 스크롤 | 이미 검색이 있는 카탈로그, 긴 목록 UI인 홈, 네이티브 제조사·요일 | 13개 홈 후보에서 내부 스크롤 필요. 제조사/요일의 실제 규모는 계정마다 다르고 기존값 복원 필요 | 일정 후보 필터와 카탈로그 검색을 참고해 고정 검색/필터, 목록 최대 높이, 재개 시 스크롤을 결정 | UI001, UI018, UI028, UI035~041, UI075와 C 유형 |
| 05 | 실패·잠금·보존 값 표시 | 내부 옵션 비활성, 최근값 + 오류/새로고침, 별도 START 가드 | 실제 휴식일에서 과거 증상 미재현. 합성 일정 조회 실패는 select 비활성과 새로고침을 확인 | 각 잠금의 이유 표시와 확인된 값/캐시 구분을 검토. 새로고침과 START·보호 조건을 유지하며 UI 표면만 비교 | 홈, 일정, 성장, 장비, 복구 |
| 06 | 현재 구조를 유지할 선택 | 기능 Dialog, 다중/계층, 날짜·수치·토글 | 순서와 선택, 초안과 적용, 복구 불가 조건의 의미가 다름 | 기존 레이어와 승인 조작을 유지하는 범위에서 시각 토큰과 접근성만 비교 | D/E/F 중심 |

공용 확대의 위험은 운동 선택 하나가 계획 조합, 기록 승인, 저장과 연결되는 경우에 크다. 짧고 반복되는 단일 목록은 트리거·포커스·위치 계산을 비교하기 적합하다. 검색형과 업무형의 선택은 기존 `SearchList`/Dialog의 부모 상태 계약을 보존하는 쪽이 변경 범위를 줄인다. 여기의 방향은 6-2 논의 후보이며 제품 규격 승인은 남아 있다.

## 대표 표본과 검증 범위

| 표본 | 상태 |
| --- | --- |
| 홈 연결형 및 전체 13개 | 전용 검수 계정 |
| 홈 320px 짧은 화면 | 285px 높이에서 트리거 일부 가림 |
| 루틴 태그와 하단 목록 | 합성 옵션, 정상/푸터 겹침 |
| 운동 현황 및 전체 이력의 검색 범위 | 실제 4옵션/합성 2옵션 |
| 카탈로그 검색과 성장 검색 오류 | 합성 검색 목록/재조회 |
| 일정 후보와 비활성 상태 | 합성 네이티브/필터/쓰기 보호 |
| 복구 사본과 운동 추가 검색 | 합성 사본 1개와 체크 선택 / 웨이트 검색 결과 3개 |
| 홈 휴식 선택 | 실제 검수 계정에서 임시 휴식 및 비활성 START |

Chrome DevTools Protocol을 통한 DOM·computed style·스크린샷 검증이다. 폭 5종은 대표 사용처 비교 범위다. 실제 iPhone Safari·설치형 PWA, VoiceOver, OS 네이티브 메뉴, 가상 키보드 표시·닫기, 기기 회전, 고속 연속 터치와 모든 비활성 조합은 미확인이다. 실제 앱의 카탈로그 화면 진입은 자동 조작의 라벨 탐색 단계에서 완료되지 않아 소스와 기존 카탈로그 Preview를 근거로 삼았다. 홈의 외부 클릭은 스크롤과 겹친 좌표에서 실측이 성립하지 않아 소스로 확인했다. 4174에서는 인증 요청·검수용 OTP와 조회 요청을 허용했고 운동·루틴·설정의 변경 요청은 차단했다. 시험 운동을 새로 만들거나 종료하지 않았다. 현행 UI에서 데이터 변경 없이 도달하기 어려운 상태는 기존 Preview를 사용했다.

이번 차수에는 HTTP 응답, 소스 경로, 44개 브라우저 표본, PNG 14개, Markdown 표 번호와 링크, 작업 전후 Git diff를 검증했다. 스플래시 해제 전 터치·초점 표본은 해제 후 재검증 결과로 대체했다. 5단계의 전체 735/735, 집중 회귀 182/182와 빌드는 이전 결과다. 이번 조사에서는 전수 테스트와 빌드를 반복하지 않았다. 계측용 Chrome 세션을 종료했고, 기존 4174는 유지했다.
