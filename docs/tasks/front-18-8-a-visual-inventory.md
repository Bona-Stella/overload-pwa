# FRONT 18 · 8-A 시각 인벤토리

기준은 7-E 마감 커밋 `6fe66fb`이다. 화면별 수치는 대표 상태의 Chrome computed style이다. 소스 표의 선언은 상속·우선순위와 상태 조건을 포함해 해석하며, DOM을 직접 확인한 사례와 경계값의 범위는 [조사 보고서](front-18-8-a-visual-audit.md)에 기록했다.

[역할별 현재 규격](#역할별-현재-규격과-목표) · [아이콘과 그래픽](#ui-아이콘과-그래픽) · [TSX 사용처](#소스-사용처-찾아보기) · [CSS 선언](#css-선언-찾아보기)

## 역할별 현재 규격과 목표

크기·굵기·줄 높이 순이다. 18px 메인 제목과 22px 하위 제목은 사용자 확정값이다. 나머지 목표와 공통화 판단은 8-B 논의용이다.

| 역할 | 현재 대표 규격 및 사용처 | 8단계 기준과 적용 판단 |
| --- | --- | --- |
| 메인 페이지 제목 | 홈의 OVERLOAD 워드마크, 루틴의 ‘나의 루틴’ `h2`, 기록의 ‘운동 분석’과 워드마크, 설정의 이름 있는 `section`과 계정 카드. 기존 모든 탭에 텍스트 `h1`이 있는 구조는 아니다. | **18px/600/1.3**. 제목 역할의 기존 텍스트에 적용 검토. 이름을 새로 배치하거나 기존 워드마크를 글자로 교체하는 것은 추가 결정. |
| 공통 하위 헤더 | [RecordSubpageHeader](../../src/components/RecordSubpageHeader.tsx) **22px/750/1.4** 및 상속 자간 −.045em. 루틴 생성·편집·상세·로딩, 일정 배정·전체 편집 로딩, 운동 진행 접근 상태·요약 대기, 운동 요약·기록 상세, 기록 전체 이력·운동 현황·주간 근육 계획·통계, 성장 추적, 계정·로그인 기기, 휴식 설정·알림, 카탈로그 목록·상세에서 사용한다. 실제 일정 편집 본문의 `h2`와 선택한 프리셋의 별도 분석 진입은 소스 위치표 참조. | **22px/600/1.3**. 44px 뒤로가기, 제목 그리드, 긴 제목 줄바꿈과 마지막 액션 폭을 유지하고 줄 수로 높이를 비교한다. |
| 20px/22px 분류 | [statistics.css](../../src/features/statistics/statistics.css#L59)의 `.record-screen h1,.muscle-analysis h1` 20px 선언과 뒤 22px 선언이 공존하고, 공통 헤더의 모듈 규칙이 자체 굵기·줄 높이를 갖는다. 20px 실사용은 기록 메인의 ‘운동 분석’·‘최근 운동’ 섹션과 루틴 상세 카드의 루틴명 등이다. 22px에는 홈 오늘 루틴명, 유산소 종목명 선언, 기록 요약 헤더 및 통계 수치·팝오버 기호도 포함된다. [RecordMain](../../src/features/statistics/RecordMain.module.css#L20) · [RoutineDetail](../../src/features/workout-online/RoutineDetail.module.css#L14) · [Home](../../src/features/home/Home.module.css#L21) | 선택자의 역할을 확인한 뒤 통합한다. 루틴 고유명·통계 수치·메뉴 기호·모달 닫기·휠 값은 각 역할에 남긴다. |
| 주요 영역 제목 | 홈 ‘이번 주 일정’·‘최근 운동’ 14px/700, 기록 ‘운동 분석’·‘최근 운동’ 20px/600/1.25. 일반 `h2` 기본은 17.92px/700/1.5. 카탈로그·성장·계정·설정에는 기능별 재정의가 있다. | 18px/600/1.3. 홈 일정 제목 옆 기간과 액션, 기록 제목 옆 워드마크 영역의 폭을 재검증한다. |
| 카드 제목·종목명 | 루틴 상세 고유명 20px/1.25의 두 줄 제한, 운동 기록 상세 고유명 18px/700/1.4, 웨이트 세트 카드 13px/700/1.5, 유산소 카드 15px, 휴식 설정 15px, 휴식 알림·설정 행 14px. 운동 종목 제목은 별도 22~29px/750/1.2 및 웨이트 이름 맞춤. | 카드 16px/500/1.3. 압축 표·형식 고정 카드와 종목명은 별도 검수. |
| 본문·보조 | 일반 본문 기본 16px/400/1.6. `.small`·`small`·`Metadata`와 모듈이 10~14px를 나눠 사용한다. 기존 기록·장비·값 출처·레이블·카드 설명·차트 축·비활성 문구가 포함된다. | 본문 14·16px/400/1.5, 보조 12·14px/400/1.4. 8~11px를 사용하는 저장 스트립·표·가시 상태 기호·차트부터 예외 여부 확인. |
| 입력·버튼 | 입력 기본 16px, 공통 버튼은 상속된 16px/650/1.6과 액션별 11~16px. 일반 입력 48px, 검색 44px, 소형 외형/터치 30/48px, 웨이트 푸터 50px. 숫자 휠 진입 16/20px, 휠 행 12~24px/400, 선택 행 12~30px/700, 52px 고정 줄 상자. | 입력 16px/500/1.2, 버튼 크기 유지 및 500/1.2. 기존 휠 포커스·선택 위계·줄 상자, 소형 보조 터치, OTP·검색·네이티브 컨트롤·휴식 직접 입력 유지. |
| 핵심 수치·시간 | 웨이트 진행 중량 30px/700/1.2, 원판쪽 24~30px. 유산소 카드 타이머 25px/750/1.35. 운동 고정 상단 14.72~22px/700/1.3 및 완료 상태 12px, 디머 56~84px/1.15, 기록 통계 별도 16~26px. | 핵심 30px/600/1.2, 주요 타이머 24px/600/1.2. 고정 3열과 디머는 예외 후보. 표시 단위·시간 정밀도는 기존 계약 적용. |
| 색·위계 | 공통 `--text-primary` #F0F1F4, `--text-muted` #A9ADB7. Onyx 강조 #6C93C6, 디로딩 강조 #78B89A. 기본 글자색, 미확정·확정·수정 상태, 추천·완료/부분/실패색을 테마에서 흡수한다. 설정의 #9FBCE3·#8E9CAF, 계정 아바타 #BCD5F7, 카드의 `color-mix()`, 일부 옛 전역 폼 색과 투명도가 별도로 있다. | 공통 텍스트 색으로 내부 재정의 정리 가능. 의미색·상태·고유 그림 및 승인된 대비는 대응 관계를 검증한 후 유지. |
| 그룹 간격과 기준선 | 제목–설명 공통 4px, 보통 내부 12px·압축 8px, 독립 카드 16px·섹션 20px. 운동 프레임 14px, 유산소 12px, 실측 편집 행 6px, 운동 표 1/3px, 준비 중량 4×10px, 상단 저장 3px 등이 기능별로 적용된다. 숫자와 단위는 공백·붙임 문자열·별도 `small`(유산소 목표 3px)·외부 단위로 혼재한다. | 2·4·8·12·16·20·24px를 일반 내부 그룹에서 검토. 숫자+단위는 기본 4px 및 baseline. 입력 외부 단위, 압축 표, 고정 푸터와 페이지 여백은 현행 승인값 우선. |

## UI 아이콘과 그래픽

운영 소스에서 도달 가능한 **인라인 SVG 90개 구현 변형**을 집계했다. 파일 하나에 여러 의미가 있는 경우 각 분기를 센다. 이전·다음 기간과 이전·다음 달처럼 별도 태그에 복제된 도형도 각각 포함했다. 활성 탭의 채움·선 굵기 변화는 같은 네비게이션 아이콘의 상태다. CSS·문자·제품 자산과 사용 경로가 없는 정의는 아래 표에서 확인할 수 있다. 기본 제안은 24 viewBox의 2 선 굵기 및 12/16/20/24/32px 크기이며 기존 도형과 표현 예외의 판단이 우선이다.

| 구현 변형 | 기능·대표 사용처와 원본 | viewBox · 그림 · 선 굵기 | 색·조작·상태·중앙화 판단 |
| --- | --- | --- | --- |
| 4 | 홈·루틴·기록·설정 하단 탭. [AppShell](../../src/app/AppShell.tsx#L10) · [CSS](../../src/app/AppShell.module.css#L106) | 24 · 24px · 1.6/활성 3, 홈·설정 활성 채움 | `currentColor`, 46px 높이 버튼, 접힘 46px 너비 및 비활성 탭 inert/축소. 이름과 `aria-current`는 버튼. 경로 공유 가능, 상태·전환 유지. |
| 12 | 닫기, 체크, 심각, 오류, 주의, 삭제, 안내, 오프라인, 동기화, 루틴 빈 상태, 기록 빈 상태, 검색 빈 상태. Toast·Dialog·조회 오류 및 재조회·운동 저장 표시·홈/루틴/기록/통계 검색. [FeedbackIcon](../../src/components/common-ui/FeedbackIcon.tsx) · [Dialog](../../src/components/Dialog.tsx#L9) · [Toast](../../src/components/common-ui/Toast.tsx#L74) · [운동 저장](../../src/features/workout-flow/WorkoutSaveLabel.tsx) | 24 · 10/16/18/22/24px · 1.8 | 숨김 SVG 및 주변 의미색. Toast 닫기·새로고침·운동 상태의 투명 버튼은 자체 접근성 이름/영역을 사용한다. 회전·모션 감소 정적 표시와 위치 유지. `upload` 정의는 운영 호출 경로를 찾지 못했다. 기존 공통 원본 확장 후보. |
| 14 | 다음·펼침·방패·기기·타이머·벨·웨이트·설정 슬라이더·DB·다운로드·휴대폰·초기화·탈퇴·로그아웃. [SettingsMain](../../src/features/settings/SettingsMain.tsx#L105) · [CSS](../../src/features/settings/SettingsMain.module.css) | 24 · 14/15/16/18px · 1.65 | 상속·#9FBCE3·#8E9CAF. 행 자체가 조작(일반 최소 64px), 기기·방패 통계는 정보. 설치 `summary` 펼침에서 chevron 회전. 미구현 행의 고정 대비와 disabled 보호. |
| 14 | 이메일·방패·기기·연결·체크·안내·다음·휴대폰·태블릿·컴퓨터·운동·눈·로그아웃·화면 종료. 계정/로그인 수단/기기 상태. [AccountDetailUi](../../src/features/auth/AccountDetailUi.tsx#L4) · [LoggedInDevices](../../src/features/auth/LoggedInDevices.tsx#L78) · [CSS](../../src/features/auth/AccountSettings.module.css) | 24 · 기본 15px/상태 12px/상자 18px/기기 20px · 1.65 | 텍스트·상태색 상속. 기기/보안 배지는 독립 터치 없음, 계정 행·로그아웃·연결 버튼이 조작. `refresh`는 운영 호출이 없는 경로다. 방패·다음·휴대폰·웨이트·로그아웃은 설정과 동일 path. |
| 11 | 어둡게 켜짐/꺼짐, 깜빡임 켜짐/꺼짐, 소리 켜짐/꺼짐, 작은 소리, 중간 알림 켜짐/꺼짐, 재생·정지. [RestAlertSettings](../../src/features/settings/RestAlertSettings.tsx#L14) · [CSS](../../src/features/settings/RestAlertSettings.module.css#L6) | 24 · 15/16/18px · 1.65, 달의 반쪽 채움 | 꺼짐 muted, 켜짐·샘플 #9FBCE3. 샘플 44×44px, 스위치 최소 56×44px. 이름/켜짐은 버튼 제공. 각 ON/OFF 도형과 설정 미리보기 유지. |
| 7 | 운동 현황·성장·주간 계획·근육 통계·시계·웨이트·발자국. 기록 메인 메뉴·이번 주 요약·유산소 요약. [StatisticsPanel](../../src/features/statistics/StatisticsPanel.tsx#L47) | 24 · 기본 20px(유산소 요약 15px) · 1.6 | 상속·accent, 정보 장식 또는 메뉴 카드 전체가 조작. 설정 웨이트 및 달력과 의미가 겹치나 원형을 명시해서 재사용 여부 결정. |
| 1 | 공통 하위 헤더 뒤로가기. [RecordSubpageHeader](../../src/components/RecordSubpageHeader.tsx#L8) | 24 · 24px · 1.8 | 기본 글자색, 44×44px. 기간 이전 화살표와 path 동일. 버튼 이름·포커스 유지. |
| 1 | 연결형 선택 드롭다운 chevron. [ConnectedDropdown](../../src/components/common-ui/ConnectedDropdown.tsx#L112) | 16 · 14px · 1.5 | 상속, 토글 전체 44px 이상 문맥/전용 치수, `aria-expanded`와 메뉴 상태. 휠의 제거된 chevron과 별개. |
| 2 | 검색 돋보기와 지우기/닫기 X. [SearchList](../../src/components/SearchList.tsx#L47) | 24 · 18px · 1.8 | 상속, 검색 입력 높이 44px, 아이콘 버튼 42×42px 및 상태별 접근성 이름. 빈 결과 Feedback 돋보기·Toast X와 도형 차이. |
| 2 | 휴식 구간 삭제와 안내. [RestSettings](../../src/features/settings/RestSettings.tsx#L146) | 24 · 16/14px · 1.6 | 삭제는 미구현 disabled(44×44px), 설명 안내는 비조작. 루틴 휴지통·Feedback 안내와 도형 차이. |
| 1 | 주간 근육 통계 기간의 달력. [MuscleAnalysis](../../src/features/statistics/MuscleAnalysis.tsx#L76) | 24 · 16px · 1.8 | 상속, 기간 텍스트 전용. 달력 열기와 도형·의미 구별. |
| 5 | 기간 이전·다음·달력 및 달력 이전·다음 달. [PeriodControls](../../src/features/statistics/PeriodControls.tsx#L42) | 24 · 18px · 1.8 | 상속, 이름은 버튼. 현황 날짜 버튼의 36px 장식 면과 실제 날짜 조작 영역은 별도. 이전·다음 path 각 2중 구현. |
| 1 | 승인 중량 변경 이력의 시계/회전 화살표. [GrowthPanel](../../src/features/statistics/GrowthPanel.tsx#L68) | 24 · 16px · 1.6 | 상속, 정보 표지. 기록 탭·Feedback 기록과 의미 겹침 및 도형 차이. |
| 1 | 웨이트 기구 세팅 메모 펼침. [WeightFocus](../../src/features/workout-flow/WeightFocus.tsx#L134) | 16 · 16px · 1.5 | 버튼 내 상속, `aria-expanded`, 메모와 연결 및 회전. 설정 펼침/승인 이력과 도형 차이. |
| 2 | 유산소 완료 확인 클립보드와 실제 활동 시간 타이머. [CardioFocus](../../src/features/workout-flow/CardioFocus.tsx#L58) · [CSS](../../src/features/workout-flow/CardioFocus.module.css#L53) | 20 · 18/16px · 1.5 | accent, 주변 텍스트와 함께 표시, 독립 터치 없음. 기존 도형 보존. |
| 1 | 유산소 계획·완료·정정의 시간/값 수정 연필. [CardioValueRow](../../src/features/workout-flow/CardioValueRow.tsx#L13) | 20 · 16px · 1.5 | 상속, CSS의 44px 너비·최소 높이 44px, 검수 실측 44×48px. 버튼의 열기 이름과 확장·값 설명 유지. 기구 메모 수정 도형과 의미 비슷하나 도형 다름. |
| 1 | 요약·기록 상세 중량 승인 이력 펼침. [WorkoutSummary](../../src/features/workout-flow/WorkoutSummary.tsx#L39) | 24 · 18px · 1.8 | muted, `summary` 조작 최소 44px, 열린 상태 180° 회전. 설정 펼침과 동일 path. |
| 1 | 기구 세팅 메모 수정. [CombinationMemo](../../src/features/workout-online/CombinationMemo.tsx#L23) | 24 · 14px · 1.7 | 상속, 메모 접근성 이름과 기존 편집 조작 보존. |
| 3 | 루틴 편집 삭제, 웨이트 없음, 유산소 없음. [RoutineForm](../../src/features/workout-online/RoutineForm.tsx#L51) | 24 · 14px/28×24px · 1.7/1.4 | 삭제는 텍스트 액션에 상속, 빈 목록은 비조작. 풋프린트·웨이트 계열이 기록 메뉴와 도형 다름. |
| 1 | 루틴 상세 삭제. [RoutineDetail](../../src/features/workout-online/RoutineDetail.tsx#L115) | 24 · 16px · 1.7 | 삭제 색 상속, 텍스트 액션. 루틴 편집 휴지통과 동일 path, 크기만 다름. |
| 2 | 루틴 주간 일정 가로/세로 표시 모드. [RoutineCards](../../src/features/workout-online/RoutineCards.tsx#L57) | 24 · 20px · 1.7 | 상속, 토글 접근성 이름과 표시 모드 연계, 같은 슬롯 크기 유지. |
| 3 | 일정 보기 눈, 전환 화살표, 자동 순환. [PresetControls](../../src/features/workout-online/PresetControls.tsx#L18) · [CSS](../../src/features/workout-online/Presets.module.css#L9) | 24 · 15px · CSS 1.8 | 상속. 보기/진행 표식과 전환의 조작 여부가 다름. 일정 액션 승인 영역 및 고정 76px 상태 슬롯 유지. 눈·순환은 계정/Feedback과 도형 차이. |

### 문자·CSS·파일 자산

| 종류와 의미 | 원본·사용처 | 크기·조작·접근성·제안 |
| --- | --- | --- |
| `×`, `?`, `⋯`·`⋮`, `›`·`‹` | [공통 Dialog](../../src/components/Dialog.tsx#L47), [Help](../../src/components/ui.tsx#L59), [ConnectedDropdown](../../src/components/common-ui/ConnectedDropdown.tsx#L112)과 루틴·일정·기록 메뉴, [SearchList 상세](../../src/components/SearchList.tsx#L17), [홈 최근](../../src/features/home/RecentWorkout.tsx#L20), [기록 최근](../../src/features/history/RecordFeed.tsx#L55), [성장 상세](../../src/features/statistics/GrowthPanel.tsx#L283), [운동 프레임](../../src/features/workout-flow/WorkoutFrame.tsx#L95), [로그인](../../src/features/auth/LoginScreens.tsx#L17), [기록 정정](../../src/features/workout-online/ClosedWorkout.tsx#L225), [일정 분석 복귀](../../src/features/workout-online/WorkoutWorkspace.tsx#L364) | 닫기·더보기의 대표 가시 글자 22px, 버튼 44px. 도움 원형 16px·글자 11px와 별도 터치 영역. 검색 상세 화살표 전용 36×44px. 텍스트 버튼의 조합 문구와 별도 접근성 이름 유지. 도형으로 치환할 때 baseline 및 터치 테스트 필요. |
| `✓`, `△`, `?`, `·` 등, `↗`, `▼`, `→` | [CircleCheck](../../src/components/common-ui/CircleCheck.tsx), [요약](../../src/features/workout-flow/WorkoutSummary.tsx#L77), [일정](../../src/features/home/HomePanel.tsx#L380), [기간 달력](../../src/features/statistics/PeriodControls.tsx#L43), [기록 상태](../../src/features/workout-online/record-summary.ts), [프리셋](../../src/features/workout-online/PresetControls.tsx#L19), [통계 메뉴](../../src/features/statistics/StatisticsPanel.tsx#L108), [게이지 지표](../../src/features/statistics/RecordChart.tsx#L45), [중량 검토](../../src/features/workout-flow/WeightReview.tsx#L23) | 체크는 같은 원형 면에서 글리프 표시만 전환하고 웨이트 조작 44×44px. 일반 상태의 기호는 주변 레이블로 설명하며 중복 기호를 숨긴다. 완료·일부·미확인 표현 및 권고 방향을 유지. |
| `+`, `−`, `↑`, `↓`와 텍스트 | [NumberWheel](../../src/components/NumberWheel.tsx#L51), [루틴 이동/추가](../../src/features/workout-online/RoutineForm.tsx#L51), [프리셋 추가](../../src/features/workout-online/PresetControls.tsx#L77), [운동·휴식 푸터](../../src/features/workout-flow/WorkoutFrame.tsx#L178) | 수량 조작과 이동·추가 의미. 휠 증감 48px 또는 압축표 44px, 일정 원형 기본 44px. 수치·단위·접근성 이름과 연결된 현행 조작. |
| 상태 점·스피너·스위치 | [유산소 상태 점](../../src/features/workout-flow/CardioFocus.module.css#L60), [공통 버튼](../../src/components/ui.module.css#L35), [모달 액션](../../src/components/common-ui/ActionButton.module.css#L84), [새로고침 모션 감소](../../src/components/common-ui/ContentFeedback.module.css#L80), [통계 기간 대기](../../src/features/statistics/Activity.module.css#L5), [휴식 스위치·볼륨](../../src/features/settings/RestAlertSettings.module.css#L11), [계획 토글](../../src/features/statistics/WeeklyMusclePlan.module.css#L21) | 점 7px, 스피너 표면별 `1em`·진행 표시, 휴식 레일 내부 스위치 8/11px. 각 조작/상태 영역 내부에서 유지. 장식은 음성 상태와 중복되지 않게 처리하며 회전·모션 감소·대기 폭 보존. |
| 네이티브 표지·레이아웃 | 버튼 선택 면, 탭 표시판, `details` 기본 마커, 네이티브 `select`와 검색 입력 지우기, 날짜 고리, 진행 `progress`, 세그먼트, 권장선·차트 범례. [AppShell](../../src/app/AppShell.module.css#L87) · [Home](../../src/features/home/Home.module.css#L62) · [Progress](../../src/features/workout-flow/WorkoutFlow.module.css#L49) · [Growth 범례](../../src/features/statistics/Growth.module.css#L47) | 플랫폼/인터랙션별 표시와 스크린리더 의미를 가진 컨트롤. CSS 면·복합 데이터 표현은 일반 SVG 카탈로그 적용 범위 밖. |
| 디로딩 초승달 | [DeloadMoon](../../src/components/DeloadMoon.tsx) · [mask CSS](../../src/components/DeloadMoon.module.css) · [원본 SVG](../product/assets/deload-icons/thick_white_crescent_moon.svg). 홈 헤더/기간 상태. | 마스크 24×24px, 고정 #6C93C6, `role=img`·‘디로딩’. 원본·색을 승인된 별도 자산으로 보존. |
| 운동·장비 관련 그림 | [ExerciseIcon](../../src/components/ExerciseIcon.tsx) 흉부/등/어깨/팔/다리/코어 6종과 달리기/걷기/자전거 및 ETC·점 fallback. 운동/유산소 검색, 성장 추적, 운동 종목 보기·통계 종류. [원본 안내](../product/assets/exercise-icons/README.md) · [AchievementIcon](../../src/components/AchievementIcon.tsx) 원판 배지 SVG와 러닝 PNG, 홈 최근·루틴 배정 종목 수. | 운동 선택 원본 32px, 통계 종류 그림 20px, 달성 배지 18px. 그림은 비조작이며 부모의 이름·설명 활용. 보호 운동 GIF 180px 스테이지와 장비·시연 이미지는 SVG UI 카탈로그 변경 대상에서 제외. [Catalog](../../src/features/workout-online/PublicCatalog.tsx#L197) |
| 브랜드·복합 그래픽 | 홈·기록·일부 공통 헤더 워드마크, 시작 화면, Google `G` 및 계정 두문자, favicon·홈 화면/설치 아이콘, Recharts와 직접 SVG에 표시하는 데이터. [index.html](../../index.html) · [manifest](../../public/manifest.webmanifest) · [활동 차트](../../src/features/statistics/ActivityTrendChart.tsx) · [기록 차트](../../src/features/statistics/RecordChart.tsx) | 워드마크·아이콘 파일·차트 geometry와 장식 여부를 기존대로 유지. Google 글자/아바타는 해당 브랜드·신원 역할에 한정. 차트에는 현재 SVG 텍스트·aria label·대체 수치 목록의 계약을 적용. |

운영 의존성 [package.json](../../package.json)에 아이콘 전용 라이브러리는 없다. Recharts는 차트 전용이다. 소스에 정의만 된 `StatusText`의 온라인/오프라인 점·13px 연결 체크, `ConnectionBanner`의 20px 오프라인/동기화와 프로토타입 탭·기존 웨이트/유산소 화면은 운영 아이콘 합계에서 제외했다. 운영 컴포넌트를 재사용하는 Preview 예시는 원본 위치에 합쳤다.

동일 path를 확인한 9개 도형군은 방패·앞으로·휴대폰·웨이트·로그아웃·펼침·왼쪽·오른쪽 chevron·루틴 휴지통이다. 왼쪽 chevron은 헤더와 두 기간 조작을 합쳐 3곳에 있어 중복 정의는 총 10개다. 이 원본들의 경로를 공유할 수 있고, 체크·오류·메뉴·달력·휴지통·펼침·타이머·검색·수정처럼 목적이 같은 다른 도형은 초기에 병존할 수 있다. 8-B 구조 제안은 [조사 보고서](front-18-8-a-visual-audit.md#svg-중앙-관리-제안)에 있다.

## 소스 사용처 찾아보기

운영 진입점 `src/main.tsx`의 정적 import 그래프를 따라가며 텍스트 역할을 가진 JSX 태그 및 공통 조작의 선언 위치를 집계했다. 이름이 없는 `span`, 아이콘과 CSS로만 배치된 상태 표현은 아래 시각 선택자 표 및 아이콘 표에서 추적한다. 같은 줄의 중복 태그는 원문에 남겨 두었다. 조건부 분기, 숨겨진 상태, 일부 미사용 export도 소스 위치 수에 포함된다.

| 소스 (총 73개) | JSX 태그·공통 부품과 줄 번호 (총 1485곳) |
| --- | --- |
| [app/AppShell.tsx](../../src/app/AppShell.tsx) | `span` 134, 136 · `button` 143 |
| [components/common-ui/ActionButton.tsx](../../src/components/common-ui/ActionButton.tsx) | `button` 21 · `span` 31, 32, 33 |
| [components/common-ui/ActionDialog.tsx](../../src/components/common-ui/ActionDialog.tsx) | `Dialog` 37 |
| [components/common-ui/ActionMenu.tsx](../../src/components/common-ui/ActionMenu.tsx) | `ConnectedDropdown` 19 · `button` 21 |
| [components/common-ui/CircleCheck.tsx](../../src/components/common-ui/CircleCheck.tsx) | `span` 11 · `label` 14 · `input` 15 · `Button` 21 |
| [components/common-ui/ConnectedDropdown.tsx](../../src/components/common-ui/ConnectedDropdown.tsx) | `button` 107 · `span` 111, 112, 113 |
| [components/common-ui/ContentFeedback.tsx](../../src/components/common-ui/ContentFeedback.tsx) | `span` 11, 20, 31, 32, 51, 65, 82 · `p` 50, 67, 83, 83 · `h2` 66 · `EmptyState` 73 |
| [components/common-ui/RefreshButton.tsx](../../src/components/common-ui/RefreshButton.tsx) | `button` 19 · `span` 29, 29, 30 · `Toast` 31 |
| [components/common-ui/SelectDropdown.tsx](../../src/components/common-ui/SelectDropdown.tsx) | `ConnectedDropdown` 26 · `button` 29 · `strong` 32 · `small` 32 · `p` 34 · `span` 41 · `SelectDropdown` 42 |
| [components/common-ui/Toast.tsx](../../src/components/common-ui/Toast.tsx) | `span` 25, 26 · `p` 76 · `button` 77 |
| [components/DeloadMoon.tsx](../../src/components/DeloadMoon.tsx) | `span` 5 |
| [components/Dialog.tsx](../../src/components/Dialog.tsx) | `span` 46 · `h2` 47 · `button` 48 |
| [components/DurationWheel.tsx](../../src/components/DurationWheel.tsx) | `span` 19 · `NumberWheel` 19 |
| [components/ExerciseIcon.tsx](../../src/components/ExerciseIcon.tsx) | `span` 16 |
| [components/LoadingSkeleton.tsx](../../src/components/LoadingSkeleton.tsx) | `span` 19, 22, 22, 22, 23, 23, 24, 24, 24 · `Card` 21 |
| [components/NumberWheel.tsx](../../src/components/NumberWheel.tsx) | `Button` 51, 52, 56, 138, 139, 173, 178 · `span` 54 · `small` 54, 134, 166 · `Dialog` 125 · `label` 132 · `input` 133 · `p` 136, 170 · `button` 163 |
| [components/RecordSubpageHeader.tsx](../../src/components/RecordSubpageHeader.tsx) | `Button` 10 · `h1` 13 |
| [components/SearchExerciseDetails.tsx](../../src/components/SearchExerciseDetails.tsx) | `Toast` 69 |
| [components/SearchList.tsx](../../src/components/SearchList.tsx) | `button` 16, 17, 52, 56 · `span` 16, 17, 50, 51, 56 · `strong` 16 · `small` 16 · `label` 50, 51 · `select` 50 · `option` 50 · `input` 51 · `p` 56 · `ContentError` 61 · `EmptyState` 61 |
| [components/ui.tsx](../../src/components/ui.tsx) | `button` 21, 59 · `span` 26, 27, 28, 29, 31, 41, 47, 58, 59, 60 · `p` 38, 44 · `h1` 38 · `label` 41 |
| [components/useConfirmation.tsx](../../src/components/useConfirmation.tsx) | `Dialog` 47 · `Button` 52, 53 |
| [features/auth/AccountDetailUi.tsx](../../src/features/auth/AccountDetailUi.tsx) | `span` 29, 30, 31, 37, 41 · `strong` 31 · `small` 31 · `p` 41 |
| [features/auth/AccountSettings.tsx](../../src/features/auth/AccountSettings.tsx) | `RefreshButton` 53 · `ContentError` 58 · `Card` 61, 96, 104 · `h2` 62, 87, 97 · `Button` 67, 72, 80, 81, 84, 92, 93 · `p` 69, 69, 71, 73, 75, 79, 82, 83, 89, 90, 91 · `input` 77, 78, 88 · `label` 88 · `button` 105 · `Toast` 116 |
| [features/auth/AuthApp.tsx](../../src/features/auth/AuthApp.tsx) | `Card` 152 · `p` 152, 152, 167, 170, 171, 174 · `h1` 152 · `Button` 152, 172, 173, 174 · `Toast` 164 · `Dialog` 168 |
| [features/auth/AuthFeedback.tsx](../../src/features/auth/AuthFeedback.tsx) | `p` 6 |
| [features/auth/IdentityManagement.tsx](../../src/features/auth/IdentityManagement.tsx) | `Card` 12 · `h2` 12 · `p` 13, 31, 37, 40, 45, 46, 47 · `Button` 18, 21, 32, 33, 34, 48, 49 · `input` 30 · `Dialog` 43 |
| [features/auth/LoggedInDevices.tsx](../../src/features/auth/LoggedInDevices.tsx) | `time` 57 · `span` 61, 62, 77, 79, 81, 130 · `Card` 76, 116, 124 · `h3` 80 · `p` 80, 83, 91, 115, 148, 149, 151, 152 · `dt` 85, 86, 119, 120, 121 · `dd` 85, 86, 119, 120, 121 · `strong` 90 · `Button` 93, 136, 139, 153, 154 · `h2` 117, 130 · `ContentError` 126 · `RefreshButton` 126 · `EmptyState` 133 · `Dialog` 146 |
| [features/auth/LoginScreens.tsx](../../src/features/auth/LoginScreens.tsx) | `Card` 16 · `button` 17, 39, 39 · `p` 18, 19, 20, 27, 30, 31, 31, 38 · `h1` 18, 31 · `label` 22, 35 · `input` 22, 35 · `span` 23, 23, 30, 31, 32 · `Button` 24, 25, 32, 36 |
| [features/history/RecordFeed.tsx](../../src/features/history/RecordFeed.tsx) | `time` 40, 55 · `span` 40, 40, 40, 41, 42, 55, 55, 57, 162, 181 · `h4` 41, 56 · `button` 54 · `b` 55, 181 · `RefreshButton` 160 · `h2` 162 · `Button` 162, 183 · `Card` 163 · `p` 170, 172 · `EmptyState` 171, 175 · `ContentError` 174 · `Toast` 185 |
| [features/home/HomePanel.tsx](../../src/features/home/HomePanel.tsx) | `span` 41, 45, 45, 45, 50, 64, 64, 65, 65, 85, 85, 87, 88, 329, 331, 347, 348, 349, 350, 355, 367, 367, 375, 387 · `Card` 52, 54, 84, 327, 373 · `h3` 64, 65 · `strong` 64, 65, 87, 88, 355, 367, 387 · `p` 64, 65, 332, 333, 334, 359, 390, 404 · `h2` 86, 330, 375, 397 · `Button` 90, 340, 358, 371, 394, 397 · `RefreshButton` 321, 338 · `ContentError` 328, 337, 374, 402 · `time` 329 · `ConnectedDropdown` 345 · `button` 347, 348, 349, 350, 353, 365, 382 · `small` 355, 367, 387 · `EmptyState` 358, 360, 399 · `Metadata` 401 · `Toast` 406 |
| [features/home/HomeTrainingHeader.tsx](../../src/features/home/HomeTrainingHeader.tsx) | `span` 6, 6, 7, 9, 9, 18, 20 · `b` 19 · `i` 20 |
| [features/home/RecentWorkout.tsx](../../src/features/home/RecentWorkout.tsx) | `button` 17 · `span` 18, 19, 19, 19, 19, 20, 20, 20 · `strong` 18 |
| [features/settings/RestAlertSettings.tsx](../../src/features/settings/RestAlertSettings.tsx) | `span` 37, 37, 59, 71, 72, 83, 185, 198, 199, 218 · `h2` 46, 218 · `Button` 47, 49, 61, 70, 215, 220 · `i` 72, 72, 72, 80, 82, 82, 87 · `strong` 82, 89, 198 · `b` 89 · `Card` 177, 217 · `p` 179, 183, 203, 211, 222, 223 · `label` 197 · `input` 199 · `StatusNotice` 214, 216 · `Dialog` 225 |
| [features/settings/RestSettings.tsx](../../src/features/settings/RestSettings.tsx) | `dt` 32 · `dd` 32 · `strong` 32 · `p` 60, 130, 153, 167 · `Card` 126 · `h2` 129 · `Button` 132, 146, 152, 162 · `span` 135, 135, 135, 138, 157 · `input` 137, 139, 140 · `ContentError` 166 · `RefreshButton` 166 · `Toast` 169 |
| [features/settings/SettingsMain.tsx](../../src/features/settings/SettingsMain.tsx) | `RefreshButton` 28 · `Card` 35, 50, 66, 75 · `button` 36, 53, 88 · `span` 37, 38, 60, 91, 92, 100, 101 · `strong` 39, 101 · `small` 40, 101 · `dt` 45, 46 · `dd` 45, 46 · `ContentError` 48 · `Button` 79 · `Toast` 80 |
| [features/statistics/ActivityTrendChart.tsx](../../src/features/statistics/ActivityTrendChart.tsx) | `text` 49, 61, 62 · `p` 70 |
| [features/statistics/GrowthPanel.tsx](../../src/features/statistics/GrowthPanel.tsx) | `Button` 32, 135, 225 · `span` 43, 49, 56, 61, 68, 79, 279, 281, 281, 283 · `strong` 44, 62 · `small` 44, 62 · `Card` 55, 88, 243, 264 · `h2` 56, 89, 243, 264 · `time` 63, 280 · `p` 73, 80, 97, 223, 269 · `h3` 79 · `EmptyState` 95, 244 · `RefreshButton` 134, 217, 224 · `Toast` 136, 230 · `ContentError` 222 · `b` 281 |
| [features/statistics/MuscleAnalysis.tsx](../../src/features/statistics/MuscleAnalysis.tsx) | `strong` 34, 52, 53, 84 · `span` 34, 52, 53, 61, 64, 76, 76, 80, 81, 86, 86, 91, 94 · `p` 37, 69, 70, 99, 100 · `Card` 44, 51, 59, 79, 83, 89 · `Button` 47, 48, 80, 80, 81, 81 · `small` 52, 77 · `h2` 56, 61, 64, 84, 88, 91, 94 · `label` 57 · `button` 57 · `i` 57 · `time` 76, 76 · `EmptyState` 163 · `RefreshButton` 164 · `ContentError` 167 · `Toast` 169 |
| [features/statistics/PeriodControls.tsx](../../src/features/statistics/PeriodControls.tsx) | `h2` 34 · `button` 35, 42, 42, 42, 43, 43, 43, 43 · `b` 42, 43 · `span` 43, 43 · `small` 43 |
| [features/statistics/RecordChart.tsx](../../src/features/statistics/RecordChart.tsx) | `i` 44 · `span` 45 · `p` 65 |
| [features/statistics/SearchScopePopover.tsx](../../src/features/statistics/SearchScopePopover.tsx) | `SelectDropdown` 5 |
| [features/statistics/StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx) | `button` 78, 78, 108 · `EmptyState` 79, 206 · `strong` 80, 93, 97, 98, 99, 108, 160, 161, 181, 194, 200, 201, 205 · `span` 80, 92, 93, 94, 108, 108, 108, 158, 160, 161, 164, 172, 182, 185, 186, 194, 196, 196, 196, 200, 201, 204, 220, 425 · `small` 83, 97, 98, 99, 108, 160, 161, 205, 213 · `Card` 91, 160, 161, 164, 180, 198 · `h2` 92, 104, 158, 164, 181, 198, 429 · `p` 95, 171, 173, 178, 184, 188, 196, 208, 210, 212, 421, 423, 429, 435 · `Button` 165, 165, 198, 210, 220, 429 · `b` 172 · `time` 194 · `h3` 203 · `RefreshButton` 414, 422 · `ContentError` 422, 428 · `Toast` 434 |
| [features/statistics/StatisticsWait.tsx](../../src/features/statistics/StatisticsWait.tsx) | `StatusNotice` 9 |
| [features/statistics/WeeklySchedulePanel.tsx](../../src/features/statistics/WeeklySchedulePanel.tsx) | `p` 31, 48, 80 · `h2` 47 · `button` 47, 55 · `SelectDropdown` 51, 53, 69 · `span` 55, 68 · `Button` 77, 78, 85, 85 · `Dialog` 79 |
| [features/workout-flow/CardioFocus.tsx](../../src/features/workout-flow/CardioFocus.tsx) | `Card` 20, 56, 98, 105 · `dt` 23, 27, 31, 32, 101 · `dd` 24, 28, 31, 32, 101 · `small` 25, 28, 29, 31, 32, 101, 103, 113 · `span` 28, 31, 32, 92 · `h2` 58, 99 · `Button` 74, 118, 120 · `p` 91, 106 · `h1` 95 · `strong` 112 |
| [features/workout-flow/CardioValueRow.tsx](../../src/features/workout-flow/CardioValueRow.tsx) | `span` 5, 13 · `strong` 14 · `button` 15 |
| [features/workout-flow/WeightFocus.tsx](../../src/features/workout-flow/WeightFocus.tsx) | `NumberWheel` 33, 105 · `label` 59 · `textarea` 59 · `small` 61, 80, 86, 111, 114 · `p` 64, 69, 70, 81, 129 · `h1` 66 · `Button` 67, 76, 121, 122, 130, 133, 139, 153 · `Card` 72, 90, 149 · `span` 74, 75, 79, 88, 88, 91, 96, 96, 96, 96, 103 · `strong` 79, 86, 104 · `h2` 91, 150 · `b` 91, 102 · `progress` 92 · `CircleCheck` 117 · `Help` 151 |
| [features/workout-flow/WeightReview.tsx](../../src/features/workout-flow/WeightReview.tsx) | `span` 21, 22, 23, 24, 34, 82, 83, 83, 88, 91 · `strong` 25, 125 · `b` 26 · `p` 56, 75, 76, 76, 104, 104, 125, 127 · `Card` 66 · `h2` 68 · `Button` 69, 99, 104, 104, 127, 127 · `h3` 86, 98 · `CircleCheck` 96 · `Dialog` 104, 125 · `NumberWheel` 126 |
| [features/workout-flow/WeightWheelFields.tsx](../../src/features/workout-flow/WeightWheelFields.tsx) | `span` 14, 23 · `NumberWheel` 24 |
| [features/workout-flow/WorkoutDialogs.tsx](../../src/features/workout-flow/WorkoutDialogs.tsx) | `Dialog` 25, 41, 86, 124, 142 · `p` 26, 44, 56, 57, 89, 90, 127, 151, 159 · `button` 27, 105 · `Button` 28, 58, 58, 100, 114, 115, 129, 160, 160 · `legend` 49 · `label` 50, 52 · `input` 50, 52 · `span` 51, 54, 99, 102, 107 · `b` 51, 54 · `small` 51, 54, 102, 157 · `h3` 95 · `strong` 102 · `Card` 154 |
| [features/workout-flow/WorkoutFrame.tsx](../../src/features/workout-flow/WorkoutFrame.tsx) | `small` 86, 87, 92, 97, 99, 101, 136, 150, 152, 162, 169 · `strong` 86, 88, 92, 99, 139, 169, 178 · `span` 90, 99, 132, 169 · `Button` 96, 98, 100, 102, 150, 151, 152, 163, 181, 182 · `Card` 131, 138 · `p` 133, 135, 139, 140, 141 · `h1` 134 · `b` 161, 178 |
| [features/workout-flow/WorkoutSaveLabel.tsx](../../src/features/workout-flow/WorkoutSaveLabel.tsx) | `small` 23 · `span` 26 · `button` 27 |
| [features/workout-flow/WorkoutSummary.tsx](../../src/features/workout-flow/WorkoutSummary.tsx) | `Card` 38, 72, 109, 144 · `summary` 39 · `h2` 39, 81, 144 · `p` 73, 76, 99, 107, 120, 126, 127, 137, 138, 139, 144 · `span` 77, 78, 117, 124, 135 · `b` 77, 78, 112, 113, 118, 133, 133 · `h3` 84, 85, 86, 88, 90, 92, 111, 132 · `strong` 84, 84, 85, 85, 86, 86, 88, 89, 90, 91, 92, 93, 122 · `small` 84, 84, 85, 85, 86, 86, 88, 89, 90, 91, 92, 93, 101, 123, 135 · `dt` 95, 96, 97, 100, 100 · `dd` 95, 96, 97, 100, 100 · `h4` 117, 135 · `Button` 145 |
| [features/workout-local/ApprovalControls.tsx](../../src/features/workout-local/ApprovalControls.tsx) | `p` 14, 36, 45, 52 · `h3` 44 · `Button` 46, 50 |
| [features/workout-local/LocalWorkoutFlow.tsx](../../src/features/workout-local/LocalWorkoutFlow.tsx) | `Button` 365, 370, 371, 385, 387, 391, 392, 399, 404, 416, 417, 493, 493, 494, 495, 502, 502, 503, 504, 544, 545, 546, 554, 558, 559, 560 · `StatusNotice` 432, 460, 541, 547 · `Card` 492, 501 · `p` 492, 501, 534, 540, 542, 551, 552, 553, 562 · `Toast` 509 · `ActionDialog` 531 · `Dialog` 537 |
| [features/workout-local/LocalWorkoutScreen.tsx](../../src/features/workout-local/LocalWorkoutScreen.tsx) | `ActionDialog` 129 · `p` 130, 146, 149, 150, 151 · `StatusNotice` 135, 147 · `Button` 136 · `RefreshButton` 152 |
| [features/workout-local/OfflineResume.tsx](../../src/features/workout-local/OfflineResume.tsx) | `StatusNotice` 14 · `p` 16, 17, 17 · `h2` 17 · `Button` 17 |
| [features/workout-online/CardioActualFields.tsx](../../src/features/workout-online/CardioActualFields.tsx) | `span` 49 · `NumberWheel` 50 · `small` 59, 60 |
| [features/workout-online/CardioNumberField.tsx](../../src/features/workout-online/CardioNumberField.tsx) | `span` 27, 32, 32 · `NumberWheel` 28 |
| [features/workout-online/CardioPlanFields.tsx](../../src/features/workout-online/CardioPlanFields.tsx) | `small` 39, 52 · `summary` 41 · `Button` 44, 45 · `span` 63, 78 · `NumberWheel` 64, 79 |
| [features/workout-online/CardioTimeField.tsx](../../src/features/workout-online/CardioTimeField.tsx) | `span` 21 · `DurationWheel` 26 · `Button` 29, 30 |
| [features/workout-online/ClosedWorkout.tsx](../../src/features/workout-online/ClosedWorkout.tsx) | `small` 63, 83, 84, 85, 87, 88 · `h4` 63, 68, 397 · `p` 63, 64, 64, 67, 69, 70, 71, 113, 113, 114, 206, 226, 227, 237, 268, 286, 290, 360, 364, 373, 377, 398, 401, 405, 409 · `span` 63, 68, 245 · `h3` 67, 236, 244, 290, 349 · `strong` 82, 86 · `time` 85, 88 · `h2` 112, 232, 251, 252 · `RefreshButton` 112, 172, 192, 202, 229 · `button` 115 · `Button` 116, 204, 205, 209, 225, 240, 246, 273, 275, 291, 293, 378, 379, 381, 381, 382, 410, 411, 423, 424 · `ContentError` 170, 192 · `StatusNotice` 173, 198, 199, 200, 203, 269, 375, 407 · `Toast` 191 · `Card` 203, 226, 232, 251, 252, 290, 349 · `ActionMenu` 212 · `h1` 227 · `dt` 228, 228 · `dd` 228, 228 · `b` 238 · `EmptyState` 248, 252 · `Dialog` 266, 348, 400 · `label` 365, 396 · `input` 365, 396 · `summary` 406 |
| [features/workout-online/CombinationMemo.tsx](../../src/features/workout-online/CombinationMemo.tsx) | `p` 23 · `span` 25, 27 · `small` 25, 28 · `label` 27 · `textarea` 27 · `button` 29 |
| [features/workout-online/ExerciseEditHeading.tsx](../../src/features/workout-online/ExerciseEditHeading.tsx) | `b` 7 · `h3` 9 · `small` 10 · `button` 12 |
| [features/workout-online/PresetControls.tsx](../../src/features/workout-online/PresetControls.tsx) | `span` 18, 19, 19, 20, 26, 46, 46, 49, 50, 56 · `button` 22, 28, 75, 77 · `strong` 26, 49 · `ActionMenu` 32 · `Card` 62 · `h2` 63 · `p` 64, 84, 84 · `Button` 65, 66 · `b` 84 |
| [features/workout-online/PresetOrderEditor.tsx](../../src/features/workout-online/PresetOrderEditor.tsx) | `p` 29, 56, 57, 62, 80 · `h2` 55 · `span` 55, 69, 69, 74 · `Card` 61 · `h3` 61 · `small` 61, 69 · `strong` 69 · `button` 71, 72 · `Button` 81, 82, 83 |
| [features/workout-online/PublicCatalog.tsx](../../src/features/workout-online/PublicCatalog.tsx) | `RefreshButton` 98, 174 · `Card` 116, 185, 196, 200, 230 · `h2` 117, 187, 197, 231 · `span` 117, 189, 190, 191, 202, 202, 222, 233, 234 · `ContentError` 118, 128, 176 · `p` 122, 138, 187, 194, 204, 206, 207, 222, 224, 225, 235 · `Toast` 125, 129, 176 · `summary` 202 · `Metadata` 231, 233 · `strong` 233 |
| [features/workout-online/RoutineCards.tsx](../../src/features/workout-online/RoutineCards.tsx) | `button` 56, 74, 80, 84, 109 · `h2` 63 · `p` 63, 84 · `Button` 64 · `Card` 67, 98 · `strong` 69, 75, 81, 90 · `b` 75, 111, 111 · `span` 75, 75, 76, 76, 76, 81, 103, 103, 103, 111, 111, 111, 111, 111 · `SelectDropdown` 90 · `EmptyState` 98, 99 · `ActionMenu` 104 |
| [features/workout-online/RoutineDetail.tsx](../../src/features/workout-online/RoutineDetail.tsx) | `dt` 20 · `dd` 21 · `small` 21 · `h3` 27 · `span` 28, 29, 48, 62, 72, 73, 86, 92, 101, 104, 105, 106, 107 · `Button` 44, 114 · `Card` 45, 69, 90, 102 · `h2` 49, 62, 86, 101 · `p` 51, 63, 87, 110 · `time` 52 |
| [features/workout-online/RoutineForm.tsx](../../src/features/workout-online/RoutineForm.tsx) | `span` 42, 274 · `NumberWheel` 42 · `button` 54, 55, 56, 290, 300, 310, 323 · `Card` 64, 265, 312 · `p` 68, 141, 227 · `h2` 252 · `label` 254 · `input` 254 · `h3` 257, 301 · `small` 257, 274, 301 · `summary` 325 · `Button` 327, 328, 329, 334, 335 · `Toast` 338 |
| [features/workout-online/SavedWeightReview.tsx](../../src/features/workout-online/SavedWeightReview.tsx) | `RefreshButton` 63 · `ContentError` 64 · `h3` 80 · `span` 81 · `Toast` 85 · `p` 112 |
| [features/workout-online/WorkoutWorkspace.tsx](../../src/features/workout-online/WorkoutWorkspace.tsx) | `h2` 73 · `span` 73 · `p` 74, 77, 80, 81, 83, 84, 85, 86, 87, 88, 89, 290, 332, 439, 442, 447, 455, 456, 833 · `time` 74 · `StatusNotice` 75, 82, 82, 367, 792, 824, 842, 844 · `button` 76, 90, 353, 354, 364, 443, 449, 457, 458, 878, 879 · `summary` 83, 85, 841 · `Metadata` 83, 88 · `RefreshButton` 311, 318, 320, 403, 440, 791, 815, 829 · `ContentError` 313, 336, 366, 376, 420, 421, 791, 815, 828 · `Button` 317, 401, 405, 450 · `Dialog` 423, 454 · `label` 435 · `input` 435 · `Toast` 463, 876, 877 · `ActionDialog` 832 |
| [pwa/PwaStatus.tsx](../../src/pwa/PwaStatus.tsx) | `summary` 15 · `p` 16, 17, 18, 19, 20, 22 · `Button` 17, 21 |

## CSS 선언 찾아보기

운영 진입점이 읽는 스타일에서 글꼴·줄 높이·자간·글자·SVG 색·불투명도·숫자·줄바꿈과 해당 역할 주변의 간격·정렬·조작 치수를 수집했다. 42개 파일에 해당 선택자 1094개가 있으며 955개에 타이포그래피·색·줄바꿈 선언이 있다. `—`는 해당 규칙에 명시값이 없다는 뜻이다. 소스 선언은 브라우저 우선순위, 상속, 조건부 속성과 함께 읽어야 한다. 동일 규격은 아래에서 한 행에 묶었으며 CSS가 로드되지만 활성 DOM에서 사용하지 않는 옛 전역 선택자도 표에 포함한다.

### [App.css](../../src/App.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [2](../../src/App.css#L2) `.brand-dot` | `color #68a2ff` | — |
| [4](../../src/App.css#L4) `.app-controls` | — | `min-width 0` · `padding 0` · `margin 0` |
| [9](../../src/App.css#L9) `.section-heading` | — | `align-items center` · `gap 10px` |
| [10](../../src/App.css#L10) `.section-heading h2`<br>[74](../../src/App.css#L74) `.weight-field`<br>[172](../../src/App.css#L172) `.session-list-item .list-button` | — | `min-width 0` |
| [11](../../src/App.css#L11) `.section-heading h1` | — | `margin-bottom 0` |
| [12](../../src/App.css#L12) `.eyebrow` | `font-size .66rem` · `color #94a4bb` · `letter-spacing .16em` · `font-weight 700` | — |
| [13](../../src/App.css#L13) `.muted` | `color var(--muted)` | — |
| [14](../../src/App.css#L14) `.small`<br>[25](../../src/App.css#L25) `.home-greeting > p:last-child`<br>[176](../../src/App.css#L176) `.history-card > span:nth-child(3)` | `font-size .78rem` | — |
| [15](../../src/App.css#L15) `.intro` | `font-size .85rem` | `margin 12px 0 25px` |
| [16](../../src/App.css#L16) `.primary` | `color white` | — |
| [19](../../src/App.css#L19) `.danger` | `color #ff9d9d` | — |
| [21](../../src/App.css#L21) `.icon-button` | `font-size 23px` | `width 44px` · `height 44px` · `padding 0` |
| [22](../../src/App.css#L22) `.badge` | `font-size .65rem` · `color #bcd4fa` | `padding 5px 9px` |
| [24](../../src/App.css#L24) `.home-greeting h1` | `font-size clamp(1.6rem, 6.2vw, 2rem)` · `line-height 1.5` | `margin 12px 0 14px` |
| [27](../../src/App.css#L27) `.home-greeting.compact h1` | `font-size 1.25rem` | `margin 8px 0` |
| [29](../../src/App.css#L29) `.today-card h2` | `font-size 1.9rem` · `font-weight 800` · `letter-spacing -.03em` | `margin-top 20px` |
| [30](../../src/App.css#L30) `.today-card > .muted` | `font-size .8rem` | `margin 4px 0 0` |
| [33](../../src/App.css#L33) `.today-exercises > div` | `font-size .84rem` | `grid-template-columns 27px minmax(0, 1fr) auto` · `gap 8px` · `align-items center` · `padding 14px 0` |
| [34](../../src/App.css#L34) `.today-exercises > div > span:nth-child(2)`<br>[88](../../src/App.css#L88) `.picker button`<br>[89](../../src/App.css#L89) `.session-list-item .list-button`<br>[108](../../src/App.css#L108) `.cardio-content .exercise-heading h1` | `overflow-wrap anywhere` | — |
| [35](../../src/App.css#L35) `.today-exercises small` | `color #9caec6` · `font-size .68rem` | `margin-top 3px` |
| [36](../../src/App.css#L36) `.today-exercises > div > span:last-child` | `white-space nowrap` · `text-align right` | — |
| [38](../../src/App.css#L38) `.index` | `color #83b3fd` · `font-size .75rem` | `margin-right 10px` |
| [39](../../src/App.css#L39) `.routine-select` | `font-size .7rem` · `color #abbdd5` | `margin-top 10px` |
| [40](../../src/App.css#L40) `.routine-select select` | `font-size .82rem` | `min-height 44px` |
| [42](../../src/App.css#L42) `.week button` | — | `padding 6px 0` · `min-width 0` |
| [44](../../src/App.css#L44) `.schedule > div` | `text-align center` | `min-height 89px` · `padding 9px 1px` · `gap 3px` |
| [45](../../src/App.css#L45) `.schedule span` | `font-size .75rem` · `color var(--muted)` | — |
| [46](../../src/App.css#L46) `.schedule strong` | `font-size 12px` · `color #74839a` | — |
| [47](../../src/App.css#L47) `.schedule small` | `font-size .51rem` · `letter-spacing -.025em` · `overflow-wrap anywhere` | — |
| [49](../../src/App.css#L49) `.schedule .today strong, .schedule .today span` | `color #8bb9ff` | — |
| [51](../../src/App.css#L51) `.tab-bar button` | `color #96a3b7` · `font-size .68rem` | `gap 1px` · `justify-items center` · `min-height 56px` · `padding 3px` |
| [52](../../src/App.css#L52) `.tab-bar button > span` | `font-size 23px` | `height 29px` |
| [53](../../src/App.css#L53) `.tab-bar button[aria-current=page]` | `color #7eb0ff` | — |
| [54](../../src/App.css#L54) `.notice` | `font-size .8rem` | `padding 13px 15px` · `margin 16px 0` |
| [55](../../src/App.css#L55) `.error` | `color #ffc0c7` | — |
| [56](../../src/App.css#L56) `.success` | `color #a0e7b7` | — |
| [57](../../src/App.css#L57) `.warning`<br>[85](../../src/App.css#L85) `.review-warning` | `color #f9ce87` | — |
| [58](../../src/App.css#L58) `.success-text` | `color #8addaa` | — |
| [61](../../src/App.css#L61) `.resume-card button` | — | `margin-top 16px` |
| [62](../../src/App.css#L62) `.resume-timer` | `color #a8caff` · `font-size .82rem` | — |
| [63](../../src/App.css#L63) `.settings-menu .list-button` | — | `min-height 72px` |
| [64](../../src/App.css#L64) `.empty` | `text-align center` · `color var(--muted)` | `padding 40px 18px` |
| [65](../../src/App.css#L65) `.empty > span` | `color #7eafff` · `font-size 36px` | `margin-bottom 15px` |
| [66](../../src/App.css#L66) `.empty h2` | `color #e6edf8` | `margin-bottom 10px` |
| [67](../../src/App.css#L67) `.empty-inline` | `font-size .8rem` | `padding 15px 0` |
| [68](../../src/App.css#L68) `.recent` | `text-align left` | `align-items center` · `gap 10px` |
| [69](../../src/App.css#L69) `.local-label` | `font-size .57rem` · `color #9ba7b8` · `text-align center` · `letter-spacing .02em` | `margin-top 30px` |
| [70](../../src/App.css#L70) `.routine-card h2` | `font-size 1.5rem` | `margin 8px 0` |
| [71](../../src/App.css#L71) `.routine-names` | `color #d1d9e6` · `font-size .82rem` | `margin 16px 0` |
| [75](../../src/App.css#L75) `.weight-field > .field-label` | — | `margin-bottom 8px` |
| [77](../../src/App.css#L77) `.weight-input > button` | `font-size .8rem` | `min-height 52px` · `padding 4px` |
| [79](../../src/App.css#L79) `.weight-value input` | `text-align center` · `font-size 1.15rem` · `font-weight 700` | `min-height 52px` · `padding 8px 28px 8px 4px` |
| [80](../../src/App.css#L80) `.weight-unit` | `font-size .75rem` | — |
| [81](../../src/App.css#L81) `.review-item` | `overflow-wrap anywhere` | `padding 15px 0` |
| [83](../../src/App.css#L83) `.review-item h3` | `font-size 1rem` | `margin-bottom 5px` |
| [84](../../src/App.css#L84) `.review-item > p` | `font-size .8rem` | `margin-top 4px` |
| [86](../../src/App.css#L86) `.field-label` | `font-size .82rem` | — |
| [90](../../src/App.css#L90) `.list-button` | `text-align left` | `width 100%` · `align-items center` · `gap 8px` · `padding 13px 5px` |
| [91](../../src/App.css#L91) `.list-button small` | `color var(--muted)` | `margin-top 5px` |
| [93](../../src/App.css#L93) `.bottom-actions > button` | — | `min-height 52px` |
| [94](../../src/App.css#L94) `.timer-bar` | — | `grid-template-columns 1fr 1fr` · `padding calc(12px + env(safe-area-inset-top)) 22px 14px` |
| [95](../../src/App.css#L95) `.timer-bar > div:last-child` | `text-align right` | — |
| [96](../../src/App.css#L96) `.timer-bar span` | `font-size .65rem` · `color #b4bfce` | — |
| [97](../../src/App.css#L97) `.timer-bar strong` | `font-size 1.45rem` · `letter-spacing .03em` | — |
| [98](../../src/App.css#L98) `.timer-bar .rest-clock strong` | `color #8bbaff` | — |
| [99](../../src/App.css#L99) `.timer-bar .rest-warning strong` | `color #ffd08a` | — |
| [105](../../src/App.css#L105) `.cardio-clock` | `text-align center` | — |
| [106](../../src/App.css#L106) `.cardio-clock > strong` | `font-size clamp(2.2rem, 10vw, 3rem)` · `font-variant-numeric tabular-nums` | `margin 20px 0` |
| [109](../../src/App.css#L109) `.warmup-hero` | `text-align center` | `padding 35px 0` |
| [110](../../src/App.css#L110) `.orbit` | `color #92bdff` · `font-size 55px` | `margin 10px auto 30px` |
| [111](../../src/App.css#L111) `.warmup-hero h1` | `font-size 1.85rem` | `margin 15px 0` |
| [112](../../src/App.css#L112) `.warmup-hero > p:not(.eyebrow)` | `color #a8b3c2` | `margin-bottom 22px` |
| [113](../../src/App.css#L113) `.progress-caption` | `color #a3b1c6` · `font-size .7rem` | `margin-top 25px` |
| [114](../../src/App.css#L114) `progress` | — | `width 100%` · `height 4px` · `margin 10px 0 28px` |
| [117](../../src/App.css#L117) `.exercise-heading h1` | `font-size 1.8rem` | `margin-top 9px` |
| [119](../../src/App.css#L119) `.exercise-navigation button`<br>[123](../../src/App.css#L123) `.weight-card button`<br>[127](../../src/App.css#L127) `.benchmark-advice button` | `font-size .8rem` | — |
| [121](../../src/App.css#L121) `.weight-card strong` | `font-size 2rem` · `line-height 1.7` | — |
| [122](../../src/App.css#L122) `.weight-card strong small` | `font-size 1rem` · `color #a8b3c2` | — |
| [124](../../src/App.css#L124) `.hint` | `font-size .76rem` · `color #b3c3da` | `padding 0 4px 10px` |
| [129](../../src/App.css#L129) `.set-row` | `text-align center` | `grid-template-columns 28px minmax(34px, .7fr) minmax(148px, 1.8fr) 54px` · `gap 4px` · `align-items center` · `padding 13px 3px` |
| [130](../../src/App.css#L130) `.set-header` | `font-size .65rem` · `color #aebcd0` | `padding 10px 3px` |
| [131](../../src/App.css#L131) `.set-number` | `font-size .9rem` · `font-weight 700` | — |
| [132](../../src/App.css#L132) `.benchmark` | `font-size 1.12rem` · `color #b1bdd0` · `overflow-wrap anywhere` | — |
| [133](../../src/App.css#L133) `.benchmark small`<br>[138](../../src/App.css#L138) `.reps-input > span:last-child` | `font-size .6rem` | — |
| [134](../../src/App.css#L134) `.reps-control` | — | `grid-template-columns 44px minmax(0, 1fr) 44px` · `gap 4px` · `min-width 0` · `align-items center` |
| [135](../../src/App.css#L135) `.reps-control > button` | `font-size .8rem` | `width 44px` · `height 44px` · `padding 0` |
| [137](../../src/App.css#L137) `.reps-input input` | `text-align center` · `font-size 1.05rem` · `font-weight 700` | `min-height 44px` · `padding 7px 14px 7px 2px` |
| [139](../../src/App.css#L139) `.set-check` | `font-size .65rem` | `padding 7px 3px` · `min-height 46px` |
| [140](../../src/App.css#L140) `.checked` | `color #a4e8bf` | — |
| [141](../../src/App.css#L141) `.completed .reps-input input` | `opacity 1` · `color #a4e8bf` | — |
| [142](../../src/App.css#L142) `.current .set-number` | `color #8dbaff` | — |
| [143](../../src/App.css#L143) `.actual-note` | `text-align right` | `padding 5px` |
| [145](../../src/App.css#L145) `.rest-preparation-card` | `color #ffdda3` | `align-items center` · `gap 12px` · `min-height 72px` · `padding 10px 16px` |
| [146](../../src/App.css#L146) `.rest-preparation-card > span` | `font-size .95rem` · `font-weight 700` | — |
| [147](../../src/App.css#L147) `.rest-preparation-card strong` | `font-size 2rem` · `line-height 1.15` · `font-variant-numeric tabular-nums` · `white-space nowrap` | — |
| [148](../../src/App.css#L148) `.rest-preparation-card small` | `color inherit` · `font-size .9rem` | `margin-left 4px` |
| [149](../../src/App.css#L149) `.workout-actions > p` | `text-align center` · `font-size .8rem` | — |
| [150](../../src/App.css#L150) `.workout-actions .increase-banner` | `color #a4e8bf` · `font-size .72rem` · `line-height 1.5` | — |
| [151](../../src/App.css#L151) `.increase-banner strong` | `font-size .86rem` | — |
| [154](../../src/App.css#L154) `dialog` | `color #f5f7fa` | `padding 23px` |
| [165](../../src/App.css#L165) `dialog > .section-heading` | — | `margin-bottom 22px` |
| [166](../../src/App.css#L166) `button.modal-neutral` | — | `padding 9px 14px` |
| [170](../../src/App.css#L170) `.radio-option small` | `color #b1bdcf` | `margin-top 5px` |
| [173](../../src/App.css#L173) `.session-list-item .icon-button` | `font-size 20px` | — |
| [174](../../src/App.css#L174) `.history-card` | `text-align left` | `gap 8px` · `padding-right 40px` |
| [175](../../src/App.css#L175) `.history-card > strong` | `font-size 1.25rem` | — |
| [177](../../src/App.css#L177) `.history-arrow` | `color #8ab6ff` · `font-size 23px` | — |
| [180](../../src/App.css#L180) `.metrics span` | `color var(--muted)` · `font-size .75rem` | — |
| [181](../../src/App.css#L181) `.metrics strong` | `font-size 1.6rem` | `margin-top 5px` |
| [182](../../src/App.css#L182) `.history-set` | `font-size .78rem` | `padding 14px 0` · `gap 10px` |
| [184](../../src/App.css#L184) `.health-page p` | `font-size .8rem` · `color #b8c5d8` | `margin 10px 0` |

### [app/AppShell.module.css](../../src/app/AppShell.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/app/AppShell.module.css#L1) `.shell` | `color var(--text-primary)` | `min-height 100dvh` · `margin-inline auto` |
| [62](../../src/app/AppShell.module.css#L62) `.tabTrack` | — | `inset auto var(--track-inset) 0` · `height var(--tab-height)` |
| [102](../../src/app/AppShell.module.css#L102) `.shell .tabs button` | `color #d1d5dd` | `inset 0 auto 0 50%` · `width 100%` · `padding 0` · `height var(--tab-height)` · `min-height var(--tab-height)` |
| [118](../../src/app/AppShell.module.css#L118) `.tabs[data-collapsed='true'] .tabSlot button` | — | `width var(--tab-height)` |
| [119](../../src/app/AppShell.module.css#L119) `.shell .tabs button[inert]` | `opacity 0` | — |
| [130](../../src/app/AppShell.module.css#L130) `.shell .tabs button[data-tab='home']` | `color #fff` | — |
| [131](../../src/app/AppShell.module.css#L131) `.shell .tabs button[aria-current='page']` | `color #000` | — |

### [app/theme.module.css](../../src/app/theme.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/app/theme.module.css#L1) `.theme` | `font-family var(--font-family-app)` · `--surface-page #111216` · `--surface-card #1B1D22` · `--surface-input #25282E` · `--text-primary #F0F1F4` · `--text-muted #A9ADB7` · `--accent #6C93C6` · `--numeric-recommendation #6C93C6` · `--on-accent #111820` · `--accent-soft #6C93C615` · `--status-done #74A68A` · `--status-missed #B17B83` · `--status-warning #D6BC65` · `--status-danger-text #F0B7BF` · `--status-danger-icon #F06473` · `--surface-danger #302127` · `--surface-warning #302B20` · `--font-metadata 11px` · `--chart-primary var(--accent)` · `--surface var(--surface-input)` · `--muted var(--text-muted)` | `--card-padding 12px` · `--card-gap 12px` |
| [55](../../src/app/theme.module.css#L55) `.theme :global([data-numeric-value='initial']), .theme :global([data-numeric-value='empty'])`<br>[69](../../src/app/theme.module.css#L69) `.theme :global(button.quiet), .theme :global(button.icon-button)`<br>[87](../../src/app/theme.module.css#L87) `.theme :global(input::placeholder)`<br>[88](../../src/app/theme.module.css#L88) `.theme :global(label), .theme :global(.muted), .theme :global(.eyebrow), .theme :global(.auth-divider)`<br>[95](../../src/app/theme.module.css#L95) `.theme :global(.timer-bar span)` | `color var(--text-muted)` | — |
| [56](../../src/app/theme.module.css#L56) `.theme :global([data-numeric-value='confirmed'])`<br>[68](../../src/app/theme.module.css#L68) `.theme :global(button.outline)`<br>[74](../../src/app/theme.module.css#L74) `.theme :global(button[data-modal-neutral])`<br>[82](../../src/app/theme.module.css#L82) `.theme :global(button.destructive-action)`<br>[86](../../src/app/theme.module.css#L86) `.theme :global(input), .theme :global(select), .theme :global(textarea)`<br>[91](../../src/app/theme.module.css#L91) `.theme :global(.notice)`<br>[98](../../src/app/theme.module.css#L98) `.theme :global(dialog)` | `color var(--text-primary)` | — |
| [57](../../src/app/theme.module.css#L57) `.theme :global([data-numeric-value='modified'])` | `color var(--status-warning)` | — |
| [58](../../src/app/theme.module.css#L58) `.theme[data-theme='deload']` | `--accent #78B89A` · `--accent-soft #78B89A15` | — |
| [66](../../src/app/theme.module.css#L66) `.theme :global(button)` | `color var(--text-primary)` | `min-height 44px` |
| [67](../../src/app/theme.module.css#L67) `.theme :global(button.primary)`<br>[75](../../src/app/theme.module.css#L75) `.theme :global(button.warning-action)` | `color var(--on-accent)` | — |
| [70](../../src/app/theme.module.css#L70) `.theme :global(button[data-close-text])`<br>[71](../../src/app/theme.module.css#L71) `.theme :global(button.danger)`<br>[92](../../src/app/theme.module.css#L92) `.theme :global(.notice.error)` | `color var(--status-danger-text)` | — |
| [76](../../src/app/theme.module.css#L76) `.theme :global(button.recovery-action), .theme :global(button[data-appearance='recovery']:is(:not(:disabled), [data-button-pending]))` | `color var(--surface-page)` | — |
| [85](../../src/app/theme.module.css#L85) `.theme :global(button.auth-google)` | `color #242125` | — |
| [89](../../src/app/theme.module.css#L89) `.theme :global(.brand-dot), .theme :global(.auth-wordmark span)`<br>[96](../../src/app/theme.module.css#L96) `.theme :global(.online-session-badge), .theme :global(.badge)`<br>[101](../../src/app/theme.module.css#L101) `.theme :global(a)` | `color var(--accent)` | — |
| [100](../../src/app/theme.module.css#L100) `.theme :global(.local-set-equipment)` | `color var(--text-muted)` · `font-size var(--font-metadata)` · `font-weight 400` | — |
| [106](../../src/app/theme.module.css#L106) `.theme :global(dialog)` | `font-family var(--font-family-app)` · `font-size 14px` · `line-height 1.6` | — |
| [107](../../src/app/theme.module.css#L107) `.theme :global(dialog h2)` | `font-size 18px` · `font-weight 700` | — |
| [108](../../src/app/theme.module.css#L108) `.theme :global(svg text),.theme :global(.recharts-tooltip-wrapper)` | `font-family var(--font-family-app)` | — |

### [components/common-ui/ActionButton.module.css](../../src/components/common-ui/ActionButton.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/components/common-ui/ActionButton.module.css#L1) `button.button[data-appearance]` | `color var(--text-primary)` · `font-size 14px` · `line-height 1.35` · `font-weight 650` | `min-width 0` · `min-height 48px` · `padding calc(7px - var(--button-border)) calc(var(--button-padding-inline) + 1px - var(--button-border))` |
| [19](../../src/components/common-ui/ActionButton.module.css#L19) `button.button[data-appearance='primary']`<br>[24](../../src/components/common-ui/ActionButton.module.css#L24) `button.button[data-appearance='warning']` | `color var(--on-accent)` | — |
| [26](../../src/components/common-ui/ActionButton.module.css#L26) `button.button[data-appearance='danger-outline']` | `color var(--status-danger-text)` | — |
| [33](../../src/components/common-ui/ActionButton.module.css#L33) `button.button[data-appearance='danger-primary']` | `color var(--text-primary)` | — |
| [40](../../src/components/common-ui/ActionButton.module.css#L40) `button.button[data-size='modal']` | — | `min-height 44px` |
| [41](../../src/components/common-ui/ActionButton.module.css#L41) `button.button[data-size='small']` | `font-size 13px` | `min-height 36px` |
| [57](../../src/components/common-ui/ActionButton.module.css#L57) `button.button:disabled:not([data-button-pending])` | `opacity 1` · `color color-mix(in srgb, var(--text-muted) 65%, var(--surface-input))` | — |
| [70](../../src/components/common-ui/ActionButton.module.css#L70) `.content` | `overflow-wrap anywhere` | `align-items center` · `gap 7px` |
| [81](../../src/components/common-ui/ActionButton.module.css#L81) `.content[data-progress-hidden]` | `opacity 0` | — |

### [components/common-ui/ActionDialog.module.css](../../src/components/common-ui/ActionDialog.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [13](../../src/components/common-ui/ActionDialog.module.css#L13) `.description` | `color var(--text-muted)` · `font-size 14px` · `line-height 1.55` | — |

### [components/common-ui/CircleCheck.module.css](../../src/components/common-ui/CircleCheck.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/components/common-ui/CircleCheck.module.css#L1) `.control.control` | — | `width 44px` · `height 44px` · `min-height 44px` · `padding 0` |
| [10](../../src/components/common-ui/CircleCheck.module.css#L10) `.mark` | `font-size var(--circle-check-glyph-size, 14px)` · `line-height 1` | — |
| [21](../../src/components/common-ui/CircleCheck.module.css#L21) `.control[data-done] .mark` | `color var(--status-done)` | — |
| [23](../../src/components/common-ui/CircleCheck.module.css#L23) `.choice > input` | `opacity 0` | `min-height 0` · `margin 0` |
| [35](../../src/components/common-ui/CircleCheck.module.css#L35) `.choice:has(input:disabled)` | `opacity .42` | — |

### [components/common-ui/ConnectedDropdown.module.css](../../src/components/common-ui/ConnectedDropdown.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [14](../../src/components/common-ui/ConnectedDropdown.module.css#L14) `.root > .trigger` | `color var(--text-primary)` · `font-size inherit` · `font-weight inherit` · `text-align start` | `align-items center` · `min-height 48px` · `padding 0` |
| [41](../../src/components/common-ui/ConnectedDropdown.module.css#L41) `.value` | `white-space nowrap` · `text-overflow ellipsis` | — |
| [42](../../src/components/common-ui/ConnectedDropdown.module.css#L42) `.indicator` | `color var(--text-muted)` | — |
| [45](../../src/components/common-ui/ConnectedDropdown.module.css#L45) `.root[data-dropdown='value'] > .trigger` | `font-size 16px` | — |
| [46](../../src/components/common-ui/ConnectedDropdown.module.css#L46) `.root[data-dropdown='content'] > .trigger` | `font-size 14px` · `font-weight 700` | — |
| [58](../../src/components/common-ui/ConnectedDropdown.module.css#L58) `.root[data-dropdown='filter'] > .trigger` | `font-size 12px` · `font-weight 650` | `min-height 44px` |
| [60](../../src/components/common-ui/ConnectedDropdown.module.css#L60) `.trigger[data-selected='true'] > .surface` | `color var(--on-accent)` | — |
| [61](../../src/components/common-ui/ConnectedDropdown.module.css#L61) `.trigger[data-selected='true'] .indicator` | `color inherit` | — |
| [63](../../src/components/common-ui/ConnectedDropdown.module.css#L63) `.root[data-dropdown='scope'] > .trigger` | `font-size 12px` · `font-weight 650` | `min-height 42px` |
| [68](../../src/components/common-ui/ConnectedDropdown.module.css#L68) `.root[data-dropdown='action'] > .trigger` | `font-size 22px` · `line-height 1` · `color var(--text-muted)` | `min-height 44px` |
| [110](../../src/components/common-ui/ConnectedDropdown.module.css#L110) `.scroll > button.item` | `color var(--text-primary)` · `text-align start` · `white-space normal` · `overflow-wrap anywhere` · `line-height 1.35` · `font-size 14px` · `font-weight inherit` | `gap 4px` · `width 100%` · `min-width 0` · `min-height 48px` · `padding 6px 12px` |
| [129](../../src/components/common-ui/ConnectedDropdown.module.css#L129) `.scroll > button.item[data-description]` | — | `min-height 60px` |
| [131](../../src/components/common-ui/ConnectedDropdown.module.css#L131) `.scroll > button.item:is([aria-selected='true'], [aria-pressed='true'])` | `color var(--accent)` | — |
| [132](../../src/components/common-ui/ConnectedDropdown.module.css#L132) `.scroll > button.item[data-danger]` | `color var(--status-danger-text)` | — |
| [140](../../src/components/common-ui/ConnectedDropdown.module.css#L140) `.empty` | `color var(--text-muted)` · `font-size 13px` | `padding 10px 12px` |
| [141](../../src/components/common-ui/ConnectedDropdown.module.css#L141) `.field` | `color var(--text-muted)` · `font-size 13px` | `min-width 0` · `gap 4px` |

### [components/common-ui/ContentFeedback.module.css](../../src/components/common-ui/ContentFeedback.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [18](../../src/components/common-ui/ContentFeedback.module.css#L18) `@keyframes breathe › to` | `opacity .6` | — |
| [23](../../src/components/common-ui/ContentFeedback.module.css#L23) `.fieldError` | `color var(--status-danger-text)` · `font-size 13px` · `line-height 1.45` | `align-items flex-start` · `gap 6px` |
| [32](../../src/components/common-ui/ContentFeedback.module.css#L32) `.fieldError:not(:empty)` | — | `margin-top 8px` |
| [33](../../src/components/common-ui/ContentFeedback.module.css#L33) `.fieldError svg` | — | `margin-top 2px` |
| [35](../../src/components/common-ui/ContentFeedback.module.css#L35) `.empty` | `text-align center` | `gap 6px` · `min-height 222px` · `padding 20px 16px` |
| [48](../../src/components/common-ui/ContentFeedback.module.css#L48) `.emptyIcon, .bannerIcon` | `color color-mix(in srgb, var(--accent) 72%, var(--text-primary))` | — |
| [57](../../src/components/common-ui/ContentFeedback.module.css#L57) `.empty h2` | `color var(--text-primary)` · `font-size 15px` | — |
| [58](../../src/components/common-ui/ContentFeedback.module.css#L58) `.empty p` | `color var(--text-muted)` · `font-size 13px` | — |
| [59](../../src/components/common-ui/ContentFeedback.module.css#L59) `.empty h2, .empty p` | `word-break keep-all` · `overflow-wrap anywhere` | — |
| [61](../../src/components/common-ui/ContentFeedback.module.css#L61) `.empty[data-content-state='error'] .emptyIcon` | `color var(--status-danger-icon)` | — |
| [64](../../src/components/common-ui/ContentFeedback.module.css#L64) `button.refresh[data-refresh]` | `color var(--text-muted)` · `white-space nowrap` | `align-items center` · `gap 8px` · `min-height 44px` · `padding 0 12px` |
| [77](../../src/components/common-ui/ContentFeedback.module.css#L77) `button.refresh[data-refresh][aria-busy='true']` | `opacity 1` | — |
| [82](../../src/components/common-ui/ContentFeedback.module.css#L82) `@media (prefers-reduced-motion: reduce) › button.refresh[aria-busy='true'] .refreshIcon::after` | — | `inset 3px` |
| [91](../../src/components/common-ui/ContentFeedback.module.css#L91) `.banner` | `color var(--text-muted)` · `font-size 13px` · `line-height 1.4` | `grid-template-columns auto minmax(0, 1fr)` · `gap 12px` · `padding 12px` |
| [106](../../src/components/common-ui/ContentFeedback.module.css#L106) `.bannerIcon` | `color color-mix(in srgb, var(--banner-tone) 75%, var(--text-primary))` | — |
| [113](../../src/components/common-ui/ContentFeedback.module.css#L113) `.banner .bannerTitle` | `color var(--text-primary)` · `font-size 15px` · `font-weight 700` | `margin-bottom 2px` |

### [components/common-ui/FilterTags.module.css](../../src/components/common-ui/FilterTags.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [11](../../src/components/common-ui/FilterTags.module.css#L11) `.strip > button[aria-pressed], .chip.chip[aria-pressed]` | `font-size 12px` · `font-weight 650` · `line-height 1.6` · `white-space nowrap` | `align-items center` · `min-width 53px` · `min-height 44px` · `padding 0` |
| [26](../../src/components/common-ui/FilterTags.module.css#L26) `.strip > button > span, .chip > span` | — | `min-height 36px` · `padding-inline 12px` |
| [36](../../src/components/common-ui/FilterTags.module.css#L36) `.strip > [aria-pressed='true'] > span, .chip[aria-pressed='true'] > span` | `color var(--on-accent)` | — |

### [components/common-ui/RoutineOptionText.module.css](../../src/components/common-ui/RoutineOptionText.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/components/common-ui/RoutineOptionText.module.css#L1) `.title` | `font-size 14px` · `font-weight 900` | — |
| [6](../../src/components/common-ui/RoutineOptionText.module.css#L6) `.description` | `color var(--text-muted)` · `font-size 12px` · `font-weight 400` | — |

### [components/common-ui/SegmentedControl.module.css](../../src/components/common-ui/SegmentedControl.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [10](../../src/components/common-ui/SegmentedControl.module.css#L10) `.segment > button[aria-pressed]` | `color var(--text-primary)` · `font-size 14px` · `font-weight 600` | `min-width 0` · `min-height 48px` · `height auto` · `padding 8px 4px` |
| [14](../../src/components/common-ui/SegmentedControl.module.css#L14) `.segment > button[aria-pressed='true']` | `color var(--on-accent)` | — |

### [components/common-ui/Toast.module.css](../../src/components/common-ui/Toast.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/components/common-ui/Toast.module.css#L1) `.toast` | `color var(--toast-tone)` | `grid-template-columns auto minmax(0, 1fr) auto` · `align-items center` · `gap 10px` · `min-height 52px` · `margin-inline auto` · `padding 3px 4px 3px 15px` |
| [26](../../src/components/common-ui/Toast.module.css#L26) `.toast p` | `color var(--text-primary)` · `font-size 14px` · `line-height 1.45` | — |
| [28](../../src/components/common-ui/Toast.module.css#L28) `.toast button.close` | `color var(--text-muted)` | `width 44px` · `min-height 44px` · `padding 0` |
| [39](../../src/components/common-ui/Toast.module.css#L39) `@keyframes appear › from` | `opacity 0` | — |

### [components/Dialog.module.css](../../src/components/Dialog.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [7](../../src/components/Dialog.module.css#L7) `.functional > :global(.section-heading)` | — | `margin-bottom 16px` |
| [9](../../src/components/Dialog.module.css#L9) `.functional [data-dialog-actions] > button[data-action-shape='pill']` | `line-height 1.2` | `min-height 48px` · `padding 6px 16px` |
| [20](../../src/components/Dialog.module.css#L20) `.message > .messageHeading` | `text-align center` | `gap 5px` · `padding-inline 28px` · `margin 0 0 10px` |
| [30](../../src/components/Dialog.module.css#L30) `.messageHeading h2` | `line-height 1.4` | `margin 0` |
| [31](../../src/components/Dialog.module.css#L31) `.messageHeading h2, .message > [data-dialog-description], .message > p, .message > :global(.stack) > p` | `text-align center` · `word-break keep-all` · `overflow-wrap anywhere` | — |
| [36](../../src/components/Dialog.module.css#L36) `:is(.message, .message > :global(.stack)) > :is([data-dialog-description], p, ul, :global(.notice)):has(+ :is([data-dialog-actions], :global(.row), button))` | — | `margin-block-end 0` |
| [39](../../src/components/Dialog.module.css#L39) `.message > :is([data-dialog-description], p, ul, :global(.notice)) + :is([data-dialog-actions], :global(.row), button)` | — | `margin-block-start 20px` |
| [42](../../src/components/Dialog.module.css#L42) `.message > :global(.stack) > :is([data-dialog-description], p, ul, :global(.notice)) + :is([data-dialog-actions], :global(.row), button)` | — | `margin-block-start 2px` |
| [46](../../src/components/Dialog.module.css#L46) `:is(.message, .message > :global(.stack)) > :is([data-dialog-actions], :global(.row)):has(> button + button):not(:has(> :nth-child(3)))` | — | `grid-template-columns repeat(2, minmax(0, 1fr))` · `gap 8px` · `align-items stretch` · `justify-items stretch` |
| [53](../../src/components/Dialog.module.css#L53) `.message[data-message-tone] :is([data-dialog-actions], :global(.row)) > button` | `white-space normal` · `overflow-wrap anywhere` | `min-width 0` · `min-height 48px` · `padding 8px 16px` |
| [56](../../src/components/Dialog.module.css#L56) `.messageHeading .symbol` | `color var(--accent)` | — |
| [57](../../src/components/Dialog.module.css#L57) `.message[data-message-tone='success'] .symbol` | `color var(--status-done)` | — |
| [58](../../src/components/Dialog.module.css#L58) `.message[data-message-tone='warning'] .symbol` | `color var(--status-warning)` | — |
| [59](../../src/components/Dialog.module.css#L59) `.message:is([data-message-tone='error'], [data-message-tone='critical'], [data-message-tone='destructive']) .symbol` | `color var(--status-danger-icon)` | — |
| [60](../../src/components/Dialog.module.css#L60) `.messageHeading button:global(.icon-button)[data-close-text]` | `color var(--text-muted)` · `font-size 22px` · `font-weight 400` | `inset -8px -8px auto auto` · `width 44px` · `min-height 44px` · `padding 0` |
| [70](../../src/components/Dialog.module.css#L70) `.message :global(.stack) > button[data-action-shape='pill']` | `white-space normal` · `overflow-wrap anywhere` | `min-width 0` |

### [components/ExerciseIcon.module.css](../../src/components/ExerciseIcon.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/components/ExerciseIcon.module.css#L1) `.icon, .placeholder` | — | `width 32px` · `height 32px` |
| [2](../../src/components/ExerciseIcon.module.css#L2) `.placeholder` | `color var(--text-muted)` · `font-size 20px` | — |
| [3](../../src/components/ExerciseIcon.module.css#L3) `.other` | `font-size 9px` · `font-weight 700` | — |

### [components/NumberWheel.module.css](../../src/components/NumberWheel.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [2](../../src/components/NumberWheel.module.css#L2) `.control` | — | `grid-template-columns 48px minmax(0, 1fr) 48px` · `gap 2px` · `width 100%` |
| [3](../../src/components/NumberWheel.module.css#L3) `.control > button[data-action-shape]` | `text-align center` · `overflow-wrap anywhere` · `font-size 16px` · `font-variant-numeric tabular-nums` | `min-width 0` · `min-height 48px` · `padding 0 2px` |
| [8](../../src/components/NumberWheel.module.css#L8) `.control > button > small` | `font-size 10px` | — |
| [13](../../src/components/NumberWheel.module.css#L13) `.compactStepper > button.valueButton[aria-label]` | `font-size 20px` | `padding 4px` |
| [16](../../src/components/NumberWheel.module.css#L16) `.valueButton small` | `font-size 12px` · `color var(--text-muted)` · `font-weight 400` | — |
| [17](../../src/components/NumberWheel.module.css#L17) `.control > button[data-wheel-empty]` | `color var(--text-muted)` | — |
| [18](../../src/components/NumberWheel.module.css#L18) `.field` | `text-align center` · `font-size 12px` · `color var(--text-muted)` | `gap 4px` · `min-width 0` |
| [26](../../src/components/NumberWheel.module.css#L26) `.viewport .scroll > button` | `color var(--text-muted)` · `font-size clamp(12px, calc((100cqi - 36px) / var(--digits)), 24px)` · `font-weight 400` · `line-height 52px` · `white-space nowrap` · `opacity .65` | `width 100%` · `height 52px` · `min-height 52px` · `padding 0 4px` |
| [27](../../src/components/NumberWheel.module.css#L27) `.viewport .scroll > button small` | `font-size 13px` | — |
| [28](../../src/components/NumberWheel.module.css#L28) `.viewport .scroll > button[aria-pressed='true']` | `color var(--text-primary)` · `opacity 1` · `font-size clamp(12px, calc((100cqi - 36px) / var(--digits)), 30px)` · `font-weight 700` | — |
| [29](../../src/components/NumberWheel.module.css#L29) `.footer` | — | `gap 10px` · `padding-bottom env(safe-area-inset-bottom)` |
| [31](../../src/components/NumberWheel.module.css#L31) `.actions > button` | — | `min-width 0` |
| [34](../../src/components/NumberWheel.module.css#L34) `.viewport .scroll > button[data-distance='1']` | `opacity .62` | — |
| [35](../../src/components/NumberWheel.module.css#L35) `.viewport .scroll > button[data-distance='2']` | `opacity .35` | — |
| [36](../../src/components/NumberWheel.module.css#L36) `.viewport .scroll > button[data-distance='3']` | `opacity .2` | — |
| [37](../../src/components/NumberWheel.module.css#L37) `.viewport .scroll > button:focus-visible` | `opacity 1` | — |

### [components/RecordSubpageHeader.module.css](../../src/components/RecordSubpageHeader.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [2](../../src/components/RecordSubpageHeader.module.css#L2) `.header .back` | `color var(--text-primary)` | `min-height 44px` · `margin-left -12px` · `padding 0` |
| [4](../../src/components/RecordSubpageHeader.module.css#L4) `.header .title` | `color var(--text-primary)` · `font-size 22px` · `font-weight 750` · `line-height 1.4` · `overflow-wrap anywhere` | `min-width 0` · `margin 0` |
| [8](../../src/components/RecordSubpageHeader.module.css#L8) `.header:has(.brand) .title` | `word-break keep-all` | — |

### [components/SearchList.module.css](../../src/components/SearchList.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/components/SearchList.module.css#L1) `.search .controls` | — | `grid-template-columns 84px minmax(0,1fr) 42px` · `gap 6px` · `align-items center` |
| [2](../../src/components/SearchList.module.css#L2) `.search .controls[data-expanded]` | — | `grid-template-columns minmax(0,1fr) 42px` |
| [4](../../src/components/SearchList.module.css#L4) `.search .controls input` | — | `height 44px` · `min-height 44px` · `padding 8px 12px` |
| [5](../../src/components/SearchList.module.css#L5) `.search .controls select` | — | `height 42px` · `min-height 42px` · `padding 8px` |
| [6](../../src/components/SearchList.module.css#L6) `.search .controls > .disclosure` | `color var(--accent)` · `line-height 1` | `width 42px` · `height 42px` · `min-height 42px` · `padding 0` |
| [12](../../src/components/SearchList.module.css#L12) `.search .results > li > button:first-child` | — | `min-width 0` |
| [13](../../src/components/SearchList.module.css#L13) `.search .results > li > .detail` | `color var(--text-muted)` · `font-size 22px` · `line-height 1` | `min-height 44px` · `padding 0 8px 0 0` |
| [20](../../src/components/SearchList.module.css#L20) `.search .results > li > button:first-child` | — | `min-height 60px` · `padding 6px 12px` |
| [28](../../src/components/SearchList.module.css#L28) `.search .results > li > button:first-child > span:last-child` | — | `gap 4px` |

### [components/ui.module.css](../../src/components/ui.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/components/ui.module.css#L1) `.button` | — | `min-height 44px` · `padding 11px 16px` |
| [2](../../src/components/ui.module.css#L2) `.button[data-modal-neutral]` | — | `padding 10px 15px` |
| [3](../../src/components/ui.module.css#L3) `.button[data-action-shape='pill']:where(:not([data-button-size]))` | `text-align center` · `overflow-wrap anywhere` | `min-height 48px` · `padding 8px 16px` · `align-items center` |
| [11](../../src/components/ui.module.css#L11) `.button[data-modal-neutral]:where([data-action-shape='pill'])` | — | `padding 8px 16px` |
| [12](../../src/components/ui.module.css#L12) `:global(.row):has(> .button[data-action-shape='pill'] + .button[data-action-shape='pill'])` | — | `gap 8px` |
| [13](../../src/components/ui.module.css#L13) `.button[data-button-size='compact'][data-action-shape]` | — | `min-width 44px` · `min-height 48px` · `padding 0` |
| [22](../../src/components/ui.module.css#L22) `.compactSurface` | `white-space nowrap` | `align-items center` · `padding-inline 12px` |
| [33](../../src/components/ui.module.css#L33) `.loadingButton` | `color transparent !important` | — |
| [34](../../src/components/ui.module.css#L34) `.loadingButton:not([data-button-size='compact']) > :not([data-button-spinner]), .loadingButton .compactLabel` | `opacity 0` | — |
| [36](../../src/components/ui.module.css#L36) `.buttonSpinner` | — | `inset 0` · `margin auto` · `width 1em` · `height 1em` |
| [38](../../src/components/ui.module.css#L38) `.loadingContent .buttonSpinner` | — | `margin 0` |
| [57](../../src/components/ui.module.css#L57) `.heading` | — | `align-items center` · `gap 12px` · `margin-bottom 20px` |
| [58](../../src/components/ui.module.css#L58) `.heading h1` | `font-size 24px` | `margin 4px 0 0` |
| [59](../../src/components/ui.module.css#L59) `.eyebrow` | `font-size 10px` · `color var(--text-muted)` · `letter-spacing .14em` | — |
| [60](../../src/components/ui.module.css#L60) `.field` | `color var(--text-muted)` | `gap 4px` |
| [61](../../src/components/ui.module.css#L61) `.input.input` | `font-size 16px` · `text-align start` | `min-height 48px` · `padding 8px 12px` |
| [63](../../src/components/ui.module.css#L63) `.metadata` | `color var(--text-muted)` · `font-size var(--font-metadata)` · `font-weight 400` | — |
| [66](../../src/components/ui.module.css#L66) `.helpTrigger > span` | `color var(--text-muted)` · `font-size 11px` · `line-height 14px` · `font-weight 400` | — |
| [67](../../src/components/ui.module.css#L67) `.popover` | `color var(--text-primary)` · `font-size 12px` · `font-weight 400` | `padding 12px` |

### [features/auth/AccountSettings.module.css](../../src/features/auth/AccountSettings.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [3](../../src/features/auth/AccountSettings.module.css#L3) `.page h2` | `font-size 15px` | `margin 0` |
| [4](../../src/features/auth/AccountSettings.module.css#L4) `.heading, .item` | — | `align-items center` · `gap 10px` · `min-width 0` |
| [5](../../src/features/auth/AccountSettings.module.css#L5) `.heading > .status, .item > .status` | — | `margin-inline-start auto` |
| [6](../../src/features/auth/AccountSettings.module.css#L6) `.itemText` | `overflow-wrap anywhere` | `gap var(--card-gap-title)` |
| [7](../../src/features/auth/AccountSettings.module.css#L7) `.itemText strong` | `font-size 14px` · `font-weight 650` | — |
| [8](../../src/features/auth/AccountSettings.module.css#L8) `.itemText small, .note, .status` | `color var(--text-muted)` · `font-size 12px` · `line-height 1.5` | — |
| [9](../../src/features/auth/AccountSettings.module.css#L9) `.icon` | — | `width 15px` · `height 15px` |
| [10](../../src/features/auth/AccountSettings.module.css#L10) `.iconBox` | `color #9fbce3` · `font-weight 750` | `width 36px` · `height 36px` |
| [14](../../src/features/auth/AccountSettings.module.css#L14) `.iconBox .icon` | — | `width 18px` · `height 18px` |
| [16](../../src/features/auth/AccountSettings.module.css#L16) `.status[data-positive]` | `color var(--status-done)` | — |
| [17](../../src/features/auth/AccountSettings.module.css#L17) `.status .icon, .note .icon` | — | `width 12px` · `height 12px` |
| [19](../../src/features/auth/AccountSettings.module.css#L19) `.note .icon` | — | `align-self start` · `margin-top 3px` |
| [23](../../src/features/auth/AccountSettings.module.css#L23) `.page .action, .page .refresh` | `font-size 13px` · `overflow-wrap anywhere` | `align-items center` · `gap 7px` · `min-height 44px` · `padding 6px 8px` |
| [29](../../src/features/auth/AccountSettings.module.css#L29) `.page .action:disabled` | `color var(--text-muted)` | — |
| [32](../../src/features/auth/AccountSettings.module.css#L32) `.devices .deviceLink` | `text-align start` | `min-height 64px` · `padding 0` |

### [features/auth/auth.css](../../src/features/auth/auth.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [3](../../src/features/auth/auth.css#L3) `.auth-wordmark` | `font-size 1.4rem` · `font-weight 850` · `letter-spacing -.07em` | — |
| [4](../../src/features/auth/auth.css#L4) `.auth-wordmark span` | `color #68a2ff` | — |
| [5](../../src/features/auth/auth.css#L5) `.auth-entry-heading` | — | `margin 20px 0 12px` |
| [6](../../src/features/auth/auth.css#L6) `.auth-entry h1` | `font-size clamp(1.7rem, 6.3vw, 2.1rem)` | `margin 14px 0 16px` |
| [7](../../src/features/auth/auth.css#L7) `.auth-google` | `color #242125` | `align-items center` · `gap 16px` |
| [10](../../src/features/auth/auth.css#L10) `.auth-google > span` | `font-size 1.25rem` · `font-weight 800` | — |
| [11](../../src/features/auth/auth.css#L11) `.auth-divider` | `color var(--muted)` · `font-size .75rem` | `align-items center` · `gap 16px` |
| [13](../../src/features/auth/auth.css#L13) `.auth-app button` | — | `min-height 48px` |
| [18](../../src/features/auth/auth.css#L18) `.auth-code` | `text-align center` · `letter-spacing .3em` · `font-size 1.7rem` | `min-height 64px` |
| [19](../../src/features/auth/auth.css#L19) `.auth-code-caption` | `color var(--muted)` · `font-size .75rem` | — |
| [20](../../src/features/auth/auth.css#L20) `.auth-address`<br>[32](../../src/features/auth/auth.css#L32) `.auth-account .small` | `overflow-wrap anywhere` | — |
| [22](../../src/features/auth/auth.css#L22) `.auth-legal > button` | `white-space nowrap` | — |
| [27](../../src/features/auth/auth.css#L27) `.auth-account h1` | `font-size 1.8rem` | — |
| [30](../../src/features/auth/auth.css#L30) `.auth-account .auth-status span` | `color var(--muted)` · `font-size .8rem` | — |
| [31](../../src/features/auth/auth.css#L31) `.auth-account h2` | `font-size 1rem` | — |
| [34](../../src/features/auth/auth.css#L34) `.auth-proof-link` | `color #87b5ff` | `min-height 48px` · `align-items center` |
| [36](../../src/features/auth/auth.css#L36) `.demo-banner` | `font-size .8rem` | `margin 0 auto` · `padding 14px 20px` |
| [37](../../src/features/auth/auth.css#L37) `.demo-banner a` | `color #87b5ff` | `min-height 44px` · `align-items center` |

### [features/auth/LoggedInDevices.module.css](../../src/features/auth/LoggedInDevices.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [3](../../src/features/auth/LoggedInDevices.module.css#L3) `.page h2` | `font-size 14px` · `font-weight 650` | — |
| [7](../../src/features/auth/LoggedInDevices.module.css#L7) `.row > span`<br>[12](../../src/features/auth/LoggedInDevices.module.css#L12) `.metrics dt`<br>[45](../../src/features/auth/LoggedInDevices.module.css#L45) `.preview` | `color var(--text-muted)` · `font-size 12px` | — |
| [8](../../src/features/auth/LoggedInDevices.module.css#L8) `.summary .row > svg`<br>[15](../../src/features/auth/LoggedInDevices.module.css#L15) `.deviceIcon` | `color #9fbce3` | — |
| [10](../../src/features/auth/LoggedInDevices.module.css#L10) `.metrics > div` | `text-align center` | `gap 3px` |
| [13](../../src/features/auth/LoggedInDevices.module.css#L13) `.metrics dd` | `font-weight 750` · `font-size 20px` · `font-variant-numeric tabular-nums` | `margin 0` |
| [20](../../src/features/auth/LoggedInDevices.module.css#L20) `.deviceName` | `overflow-wrap anywhere` | — |
| [21](../../src/features/auth/LoggedInDevices.module.css#L21) `.deviceName h3` | `font-size 15px` | — |
| [22](../../src/features/auth/LoggedInDevices.module.css#L22) `.deviceName p` | `font-size 12px` · `color var(--text-muted)` | `margin-top 3px` |
| [23](../../src/features/auth/LoggedInDevices.module.css#L23) `.presence, .row > .presence` | `color var(--text-muted)` · `font-size 12px` | `align-items center` · `gap 5px` |
| [25](../../src/features/auth/LoggedInDevices.module.css#L25) `.presence[data-presence='online']` | `color #a5cdb1` | — |
| [27](../../src/features/auth/LoggedInDevices.module.css#L27) `.thisDevice` | `color #b9d3fa` · `font-size 11px` | `padding 2px 7px` |
| [29](../../src/features/auth/LoggedInDevices.module.css#L29) `.times > div` | `font-size 12px` | `align-items baseline` · `gap 8px` · `padding-block 8px` |
| [30](../../src/features/auth/LoggedInDevices.module.css#L30) `.times dt` | `color var(--text-muted)` | — |
| [31](../../src/features/auth/LoggedInDevices.module.css#L31) `.times dd` | `text-align end` · `font-variant-numeric tabular-nums` | `margin 0` |
| [32](../../src/features/auth/LoggedInDevices.module.css#L32) `.workout` | `color #c2d9f5` · `font-size 13px` | `align-items flex-start` · `gap 7px` · `padding 11px` |
| [37](../../src/features/auth/LoggedInDevices.module.css#L37) `.workout[data-read-only]` | `color #d7dce5` | — |
| [38](../../src/features/auth/LoggedInDevices.module.css#L38) `.workout p` | `font-size 12px` · `color var(--text-muted)` | `margin-top 4px` |
| [39](../../src/features/auth/LoggedInDevices.module.css#L39) `.footer` | — | `gap 8px` · `min-width 0` |
| [40](../../src/features/auth/LoggedInDevices.module.css#L40) `.page .action` | `font-size 13px` | `align-items center` · `gap 6px` · `padding 6px 10px` · `min-height 44px` |
| [44](../../src/features/auth/LoggedInDevices.module.css#L44) `.page .danger` | `color var(--status-danger-text)` | — |
| [46](../../src/features/auth/LoggedInDevices.module.css#L46) `.warning` | `color #e3b7a0` | — |

### [features/home/Home.module.css](../../src/features/home/Home.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/features/home/Home.module.css#L1) `.home` | `line-height normal` | `gap var(--card-gap)` |
| [2](../../src/features/home/Home.module.css#L2) `.home h2` | `font-size 13px` | `margin 0` |
| [15](../../src/features/home/Home.module.css#L15) `.kicker` | `font-size 13px` · `font-weight 750` · `color var(--accent)` | `align-items center` · `gap 8px` · `margin 0 0 10px` |
| [16](../../src/features/home/Home.module.css#L16) `.kicker time` | `font-size 12px` · `font-weight 400` · `color var(--text-muted)` | — |
| [18](../../src/features/home/Home.module.css#L18) `.activeStatus` | `font-size 12px` · `font-weight 500` · `text-align end` · `color var(--text-muted)` · `overflow-wrap anywhere` | — |
| [19](../../src/features/home/Home.module.css#L19) `.activeSummary` | `color var(--text-muted)` · `font-size 12px` | `align-items center` · `gap 4px 12px` · `margin-block 10px` · `padding-bottom 10px` |
| [20](../../src/features/home/Home.module.css#L20) `.activeSummary strong` | `color var(--text-primary)` · `font-variant-numeric tabular-nums` | — |
| [21](../../src/features/home/Home.module.css#L21) `.today h2` | `font-size 22px` · `line-height 1.4` · `overflow-wrap anywhere` | `margin 9px 0 5px` |
| [22](../../src/features/home/Home.module.css#L22) `.planSection h3` | `font-size 13px` · `font-weight 750` · `letter-spacing .055em` · `color var(--accent)` | `align-items center` · `margin 10px 0 5px` |
| [23](../../src/features/home/Home.module.css#L23) `.planSection h3 span` | `color var(--text-muted)` · `letter-spacing 0` · `font-size 11px` · `font-weight 400` | — |
| [26](../../src/features/home/Home.module.css#L26) `.planSection li` | `font-size 14px` | `grid-template-columns 16px minmax(0, 1fr) auto` · `align-items baseline` · `gap 4px` · `padding 9px 0` |
| [27](../../src/features/home/Home.module.css#L27) `.planSection li::before` | `color var(--text-primary)` · `font-weight 600` | — |
| [28](../../src/features/home/Home.module.css#L28) `.planSection li > span` | `text-overflow ellipsis` · `white-space nowrap` · `font-weight 600` | — |
| [29](../../src/features/home/Home.module.css#L29) `.planSection li > strong` | `font-size 12px` · `font-weight 600` · `white-space nowrap` · `font-variant-numeric tabular-nums` | — |
| [30](../../src/features/home/Home.module.css#L30) `.emptyPlan` | `font-size 11px` · `color var(--text-muted)` · `line-height 1.55` | `margin 11px 0` |
| [31](../../src/features/home/Home.module.css#L31) `.home :is(.start, .resume)` | `font-size 15px` · `font-weight 700` | `min-height 48px` · `padding 8px 16px` |
| [34](../../src/features/home/Home.module.css#L34) `.chooserContent > p` | `font-size 12px` · `color var(--text-muted)` | `margin 8px 10px` |
| [35](../../src/features/home/Home.module.css#L35) `.chooserContent > button` | — | `align-self flex-start` · `margin-inline 6px` |
| [37](../../src/features/home/Home.module.css#L37) `.choiceTitle strong, .choiceTitle + small` | `text-overflow ellipsis` · `white-space nowrap` | — |
| [42](../../src/features/home/Home.module.css#L42) `.sectionTitle > span` | `font-size 11px` · `color var(--text-muted)` | — |
| [43](../../src/features/home/Home.module.css#L43) `.sectionTitle > button` | `font-size 11px` | — |
| [45](../../src/features/home/Home.module.css#L45) `.home .days button` | `color var(--text-primary)` | `align-items center` · `min-height 78px` · `min-width 0` · `padding 8px 1px` |
| [46](../../src/features/home/Home.module.css#L46) `.days small` | `font-size 11px` · `color var(--text-muted)` · `line-height 14px` | — |
| [47](../../src/features/home/Home.module.css#L47) `.days strong` | `line-height 17px` · `font-size 13px` · `font-weight 700` | `min-height 17px` · `margin-top 5px` |
| [48](../../src/features/home/Home.module.css#L48) `.days strong[data-status='complete']` | `color var(--status-done)` · `font-size 17px` | — |
| [49](../../src/features/home/Home.module.css#L49) `.days strong[data-status='missed']` | `color var(--status-missed)` · `font-size 17px` | — |
| [50](../../src/features/home/Home.module.css#L50) `.days [data-past='true']` | `color #858A94` | — |
| [51](../../src/features/home/Home.module.css#L51) `.days span` | `text-overflow ellipsis` · `white-space nowrap` · `font-size 8px` · `text-align center` | `margin-top 7px` |
| [54](../../src/features/home/Home.module.css#L54) `.days button[aria-current='date'] > small, .days button[data-pointer-highlight] > small, .days:not([data-pointer-input]) button:not([aria-current='date']):focus-visible > small` | `color var(--accent)` | — |
| [57](../../src/features/home/Home.module.css#L57) `.days button[aria-current='date'] > :is(strong, span)` | `color var(--text-primary)` | — |
| [62](../../src/features/home/Home.module.css#L62) `.dateSelection > button:is([aria-current='date'], [data-pointer-highlight], [data-selected-day])::after` | — | `inset -1px` |
| [70](../../src/features/home/Home.module.css#L70) `.days button[aria-current='date']::after` | — | `inset -2px` |
| [75](../../src/features/home/Home.module.css#L75) `.days:is(:has(> button[data-pointer-highlight]), :not([data-pointer-input]):has(> button:not([aria-current='date']):focus-visible)) button[aria-current='date'] > small` | `opacity .9` | — |
| [78](../../src/features/home/Home.module.css#L78) `.days:is(:has(> button[data-pointer-highlight]), :not([data-pointer-input]):has(> button:not([aria-current='date']):focus-visible)) button[aria-current='date'] > :is(strong, span)` | `color var(--text-muted)` | — |
| [81](../../src/features/home/Home.module.css#L81) `.dayDetail` | `font-size 11px` · `line-height 1.5` · `overflow-wrap anywhere` | `margin var(--card-gap-dense) 0 0` · `padding 10px` |
| [82](../../src/features/home/Home.module.css#L82) `.home button.dayLink` | `font-size 11px` · `color var(--accent)` | `min-height 24px` · `padding 2px 4px` |
| [84](../../src/features/home/Home.module.css#L84) `.home .record` | `text-align left` · `color var(--text-primary)` | `grid-template-columns minmax(0,1fr) max-content 18px 6px` · `align-items center` · `gap 6px` · `min-height 44px` · `padding var(--card-padding-compact)` |
| [85](../../src/features/home/Home.module.css#L85) `.recordDate` | `font-size 11px` · `white-space nowrap` · `color var(--accent)` | — |
| [86](../../src/features/home/Home.module.css#L86) `.recordName` | `text-overflow ellipsis` · `white-space nowrap` · `font-size 13px` · `font-weight 600` | — |
| [87](../../src/features/home/Home.module.css#L87) `.recordFacts` | `color var(--text-primary)` · `font-size 13px` · `line-height 18px` | `gap 8px` |
| [88](../../src/features/home/Home.module.css#L88) `.recordFacts > span` | `white-space nowrap` | `grid-template-columns 18px minmax(0,1fr)` · `gap 5px` · `align-items center` |
| [90](../../src/features/home/Home.module.css#L90) `.recordState` | `font-size 16px` · `color var(--text-muted)` | — |
| [91](../../src/features/home/Home.module.css#L91) `.recordState[data-state='complete']` | `color var(--status-done)` | — |
| [92](../../src/features/home/Home.module.css#L92) `.recordState[data-state='incomplete']`<br>[108](../../src/features/home/Home.module.css#L108) `.recordState[data-state='missed']` | `color var(--status-missed)` | — |
| [93](../../src/features/home/Home.module.css#L93) `.home .sectionTitle h2` | `font-size 14px` | — |
| [95](../../src/features/home/Home.module.css#L95) `.tools > button` | `font-size 11px` | `padding 6px` · `min-height 32px` |
| [96](../../src/features/home/Home.module.css#L96) `.tools > span` | `font-size 10px` | — |
| [97](../../src/features/home/Home.module.css#L97) `.httpNote` | `font-size 11px` · `line-height 1.5` · `color var(--text-muted)` | `margin 0` |
| [99](../../src/features/home/Home.module.css#L99) `.routineTag` | `color var(--accent)` · `font-size 11px` | `margin-bottom 8px` |
| [100](../../src/features/home/Home.module.css#L100) `.trainingGauge` | `font-size 12px` | `align-items center` · `gap 6px` |
| [101](../../src/features/home/Home.module.css#L101) `.trainingGauge b` | `white-space nowrap` | — |
| [105](../../src/features/home/Home.module.css#L105) `.recordState` | `line-height 18px` | — |
| [106](../../src/features/home/Home.module.css#L106) `.recordState small` | `font-size 9px` · `white-space nowrap` | — |
| [107](../../src/features/home/Home.module.css#L107) `.recordState[data-state='partial']` | `color var(--status-warning)` | — |
| [118](../../src/features/home/Home.module.css#L118) `.recordDate` | `white-space nowrap` · `font-size 10px` | — |
| [120](../../src/features/home/Home.module.css#L120) `.recordFacts` | `font-size 11px` | `gap 5px` |

### [features/settings/RestAlertSettings.module.css](../../src/features/settings/RestAlertSettings.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [6](../../src/features/settings/RestAlertSettings.module.css#L6) `.settingHeading h2` | `font-size 14px` | `align-items center` · `gap 8px` · `margin 0` |
| [7](../../src/features/settings/RestAlertSettings.module.css#L7) `.settingHeading svg` | `color var(--text-muted)` | — |
| [8](../../src/features/settings/RestAlertSettings.module.css#L8) `.settingHeading h2[data-on] svg`<br>[10](../../src/features/settings/RestAlertSettings.module.css#L10) `.page .settingHeading .sample svg` | `color #9fbce3` | — |
| [12](../../src/features/settings/RestAlertSettings.module.css#L12) `.switchMark` | `color var(--text-muted)` · `font-size 9px` · `font-weight 750` · `line-height 1.3` · `letter-spacing .02em` | `align-items center` · `gap 4px` · `padding 3px 5px` |
| [18](../../src/features/settings/RestAlertSettings.module.css#L18) `.switchMark[data-on]` | `color var(--on-accent)` | — |
| [19](../../src/features/settings/RestAlertSettings.module.css#L19) `.setting p, .note` | `color var(--text-muted)` · `font-size 12px` · `line-height 1.5` | `margin 0` |
| [20](../../src/features/settings/RestAlertSettings.module.css#L20) `.field` | `color var(--text-muted)` · `font-size 12px` | `gap 6px` · `min-width 0` |
| [22](../../src/features/settings/RestAlertSettings.module.css#L22) `.page .location:global(.outline)` | `text-align start` · `font-size 11px` | `gap 8px` · `align-items center` · `min-height 70px` · `padding 7px` |
| [27](../../src/features/settings/RestAlertSettings.module.css#L27) `.locationHeading` | `line-height 1.35` | `align-items center` · `gap 3px` |
| [28](../../src/features/settings/RestAlertSettings.module.css#L28) `.locationHeading .switchMark` | `font-size 8px` | `padding 2px 3px` · `gap 2px` |
| [37](../../src/features/settings/RestAlertSettings.module.css#L37) `.page .segments button` | `white-space nowrap` · `font-size 12px` | `min-height 38px` · `padding 4px 2px` |
| [38](../../src/features/settings/RestAlertSettings.module.css#L38) `.page .segments button[aria-pressed='true']` | `color var(--text-primary)` | — |
| [39](../../src/features/settings/RestAlertSettings.module.css#L39) `.volume` | `font-size 12px` | `gap 4px` |
| [41](../../src/features/settings/RestAlertSettings.module.css#L41) `.volume strong` | `color #b9d3fa` · `font-variant-numeric tabular-nums` | — |
| [52](../../src/features/settings/RestAlertSettings.module.css#L52) `.page .previewButton` | `font-size 14px` | `align-items center` · `gap 6px` · `min-height 44px` |
| [56](../../src/features/settings/RestAlertSettings.module.css#L56) `.previewHeading h2` | `font-size 14px` | `margin 0` |
| [57](../../src/features/settings/RestAlertSettings.module.css#L57) `.previewHeading > span, .slotLabel` | `color var(--text-muted)` · `font-size 11px` | — |
| [60](../../src/features/settings/RestAlertSettings.module.css#L60) `.previewSlot[data-muted]` | `opacity .6` | — |
| [67](../../src/features/settings/RestAlertSettings.module.css#L67) `.mockClock` | `text-align center` | `grid-template-columns repeat(3, minmax(0,1fr))` · `align-items stretch` |
| [68](../../src/features/settings/RestAlertSettings.module.css#L68) `.mockClock > *` | `font-size 10px` | `min-height 25px` |
| [71](../../src/features/settings/RestAlertSettings.module.css#L71) `.progressStub` | — | `height 4px` |
| [72](../../src/features/settings/RestAlertSettings.module.css#L72) `.mockPrepare` | `color var(--status-warning)` · `font-size 9px` | `align-items center` · `gap 3px` · `min-height 40px` · `padding 4px` |
| [73](../../src/features/settings/RestAlertSettings.module.css#L73) `.mockPrepare strong` | `white-space nowrap` | — |
| [79](../../src/features/settings/RestAlertSettings.module.css#L79) `.dimPreview :global(dialog > .section-heading)` | — | `margin 0` |
| [80](../../src/features/settings/RestAlertSettings.module.css#L80) `.dimPreview :global(dialog [data-dialog-heading])` | `white-space nowrap` | `width 1px` · `height 1px` |

### [features/settings/RestSettings.module.css](../../src/features/settings/RestSettings.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [2](../../src/features/settings/RestSettings.module.css#L2) `.cardAction` | `font-size 13px` | — |
| [9](../../src/features/settings/RestSettings.module.css#L9) `.cardHeading h2` | `font-size 15px` | — |
| [10](../../src/features/settings/RestSettings.module.css#L10) `.cardHeading p, .labels, .hint` | `color var(--text-muted)` · `font-size 12px` | — |
| [12](../../src/features/settings/RestSettings.module.css#L12) `.readRow` | `font-size 12px` · `text-align center` | `min-height 52px` |
| [13](../../src/features/settings/RestSettings.module.css#L13) `.times .readRow strong` | `color var(--accent)` · `font-variant-numeric tabular-nums` · `white-space normal` · `overflow-wrap anywhere` | — |
| [16](../../src/features/settings/RestSettings.module.css#L16) `.labels` | `text-align center` | `padding-top 10px` |
| [18](../../src/features/settings/RestSettings.module.css#L18) `.page .editRow input, .page .unbounded` | `text-align center` · `font-size 16px` · `font-variant-numeric tabular-nums` | `min-height 36px` · `margin 0` · `padding 0 4px` |
| [23](../../src/features/settings/RestSettings.module.css#L23) `.page .unbounded` | `color var(--text-muted)` | — |
| [29](../../src/features/settings/RestSettings.module.css#L29) `.page .add` | `font-size 13px` | `min-height 36px` · `margin-top 6px` · `padding 4px 8px` |
| [30](../../src/features/settings/RestSettings.module.css#L30) `.hint` | `line-height 1.5` | `align-items flex-start` · `gap 6px` · `margin 10px 0 0` |
| [32](../../src/features/settings/RestSettings.module.css#L32) `.page .save:global(.outline)` | `color var(--surface-page)` · `font-size 14px` | `min-height 48px` · `padding-block 8px` |

### [features/settings/SettingsMain.module.css](../../src/features/settings/SettingsMain.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [7](../../src/features/settings/SettingsMain.module.css#L7) `.page .accountLink, .rows .row, .install > summary` | `color var(--text-primary)` · `text-align start` | `align-items center` · `grid-template-columns auto minmax(0, 1fr) auto` · `gap 12px` · `padding 0` |
| [13](../../src/features/settings/SettingsMain.module.css#L13) `.avatar` | `color #bcd5f7` · `font-size 21px` · `font-weight 750` | — |
| [17](../../src/features/settings/SettingsMain.module.css#L17) `.accountLink strong` | `font-size 16px` | — |
| [19](../../src/features/settings/SettingsMain.module.css#L19) `.accountStats` | `text-align center` | `grid-template-columns repeat(2, minmax(0, 1fr))` · `margin 0` · `padding-top 12px` |
| [25](../../src/features/settings/SettingsMain.module.css#L25) `.accountStats dt`<br>[50](../../src/features/settings/SettingsMain.module.css#L50) `.estimateStatus` | `color var(--text-muted)` · `font-size 12px` | — |
| [26](../../src/features/settings/SettingsMain.module.css#L26) `.accountStats dd` | `font-size 14px` · `font-weight 700` | `align-items center` · `gap 7px` · `margin 0` |
| [30](../../src/features/settings/SettingsMain.module.css#L30) `.accountStats svg` | `color #9fbce3` | — |
| [34](../../src/features/settings/SettingsMain.module.css#L34) `.rows .row[data-unavailable]` | `color #b0b5bf` · `opacity 1` | — |
| [35](../../src/features/settings/SettingsMain.module.css#L35) `.text` | `line-height 1.4` | `gap var(--card-gap-title)` |
| [36](../../src/features/settings/SettingsMain.module.css#L36) `.text strong, .text small` | `text-overflow ellipsis` · `white-space nowrap` | — |
| [37](../../src/features/settings/SettingsMain.module.css#L37) `.text strong` | `font-weight 650` | — |
| [38](../../src/features/settings/SettingsMain.module.css#L38) `.row .text strong, .install .text strong` | `font-size 14px` | — |
| [39](../../src/features/settings/SettingsMain.module.css#L39) `.text small` | `color var(--text-muted)` · `font-size 12px` · `font-weight 400` | — |
| [40](../../src/features/settings/SettingsMain.module.css#L40) `.iconBox` | `color #9fbce3` | `width 36px` · `height 36px` |
| [44](../../src/features/settings/SettingsMain.module.css#L44) `.iconBox svg` | — | `width 18px` · `height 18px` |
| [45](../../src/features/settings/SettingsMain.module.css#L45) `.row[data-unavailable] .iconBox` | `color #798391` | — |
| [46](../../src/features/settings/SettingsMain.module.css#L46) `.row[data-danger] .iconBox` | `color #aa858f` | — |
| [47](../../src/features/settings/SettingsMain.module.css#L47) `.row[data-danger] .text strong` | `color #c6b0b7` | — |
| [48](../../src/features/settings/SettingsMain.module.css#L48) `.accountLink > svg, .row > svg, .install summary > svg` | `color #8e9caf` | — |
| [49](../../src/features/settings/SettingsMain.module.css#L49) `.status` | `color var(--text-muted)` · `font-size 11px` · `white-space nowrap` | — |
| [51](../../src/features/settings/SettingsMain.module.css#L51) `.row[aria-checked='true'] .estimateStatus` | `color var(--accent)` | — |
| [52](../../src/features/settings/SettingsMain.module.css#L52) `.row[role='switch'] .text small` | `white-space normal` | — |
| [57](../../src/features/settings/SettingsMain.module.css#L57) `.page .logout` | `color #d4a0ab` | `align-items center` · `gap 8px` · `min-height 48px` · `padding 8px 16px` |
| [63](../../src/features/settings/SettingsMain.module.css#L63) `.detailHeader h1` | `font-size 24px` | `margin 0` |

### [features/statistics/Activity.module.css](../../src/features/statistics/Activity.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [5](../../src/features/statistics/Activity.module.css#L5) `.page :global(.record-period[data-layout='activity'] > .record-tabs > button[data-wait='true'])::after` | — | `inset-inline-end 14px` · `inset-block 0` · `margin-block auto` · `width 10px` · `height 10px` |
| [11](../../src/features/statistics/Activity.module.css#L11) `.page :global(.record-period[data-layout='activity'] .record-period-row > button)` | `color var(--text-primary)` | `min-width 44px` · `min-height 44px` · `height auto` |
| [12](../../src/features/statistics/Activity.module.css#L12) `.page :global(.record-period[data-layout='activity'] .record-period-row > button)::before` | — | `inset 0` · `margin auto` · `width 36px` · `height 36px` |
| [14](../../src/features/statistics/Activity.module.css#L14) `.page :global(.record-period[data-layout='activity'] .record-period-row .record-calendar-trigger[aria-expanded='true'])` | `color var(--on-accent)` | — |
| [16](../../src/features/statistics/Activity.module.css#L16) `.page :global(.record-period-row b)` | `font-size 14px` · `line-height 1.5` · `white-space nowrap` | — |
| [19](../../src/features/statistics/Activity.module.css#L19) `.page .sectionHeading h2` | `font-size 18px` · `font-weight 600` · `line-height 1.4` | `margin 0` |
| [20](../../src/features/statistics/Activity.module.css#L20) `.sectionHeading > span`<br>[57](../../src/features/statistics/Activity.module.css#L57) `.weekday` | `color var(--text-muted)` · `font-size 11px` | — |
| [21](../../src/features/statistics/Activity.module.css#L21) `.sectionHeading > strong` | `font-size 19px` | — |
| [24](../../src/features/statistics/Activity.module.css#L24) `.summaryGrid > section > span` | `font-size 12px` · `color var(--text-muted)` | — |
| [25](../../src/features/statistics/Activity.module.css#L25) `.summaryGrid strong` | `font-size 25px` · `line-height 1.3` · `overflow-wrap anywhere` · `font-variant-numeric tabular-nums` | — |
| [26](../../src/features/statistics/Activity.module.css#L26) `.summaryGrid strong small` | `font-size 12px` · `font-weight 400` | `margin-left 3px` |
| [33](../../src/features/statistics/Activity.module.css#L33) `.page .trend :global(.record-search-inputs input)`<br>[79](../../src/features/statistics/Activity.module.css#L79) `@media (max-width:350px) › .page .sectionHeading h2` | `font-size 16px` | — |
| [34](../../src/features/statistics/Activity.module.css#L34) `.page .trend :global(.record-search-inputs input::placeholder)`<br>[58](../../src/features/statistics/Activity.module.css#L58) `.page .achievement :global(.record-day time)` | `font-size 12px` | — |
| [35](../../src/features/statistics/Activity.module.css#L35) `.page .trend :global(.record-search[data-search-state='IDLE'] .search-disclosure)` | `color var(--text-muted)` | — |
| [37](../../src/features/statistics/Activity.module.css#L37) `.page .trend :global(.record-search [role='group'] > button > span)` | `white-space nowrap` | `min-height 36px` · `padding-inline 12px` |
| [43](../../src/features/statistics/Activity.module.css#L43) `.activityTrendPlot` | `font-size 10px` · `fill var(--text-muted)` | — |
| [45](../../src/features/statistics/Activity.module.css#L45) `.activityTrendHit` | `fill transparent` | — |
| [46](../../src/features/statistics/Activity.module.css#L46) `.activityTrendPoint[data-active='true'] .activityTrendHit` | `fill var(--accent-soft)` | — |
| [48](../../src/features/statistics/Activity.module.css#L48) `.progress` | — | `height 6px` |
| [49](../../src/features/statistics/Activity.module.css#L49) `.progress > span` | — | `height 100%` |
| [50](../../src/features/statistics/Activity.module.css#L50) `.achievementSummary` | `font-size 11px` · `color var(--text-muted)` | `align-items baseline` · `gap 6px` |
| [53](../../src/features/statistics/Activity.module.css#L53) `.achievementSummary > span:last-child` | `white-space nowrap` | — |
| [59](../../src/features/statistics/Activity.module.css#L59) `.page .achievement :global(.record-day strong)` | `font-size 18px` · `line-height 1.5` | `min-height 1.5em` · `margin 0` |
| [60](../../src/features/statistics/Activity.module.css#L60) `.page .sectionHeading > button` | `color var(--accent)` · `font-size 12px` | — |
| [64](../../src/features/statistics/Activity.module.css#L64) `.cardioMetrics > div > span` | `font-size 11px` · `color var(--text-muted)` | `align-items center` · `gap 4px` |
| [65](../../src/features/statistics/Activity.module.css#L65) `.cardioMetrics svg` | `color var(--accent)` | — |
| [66](../../src/features/statistics/Activity.module.css#L66) `.cardioMetrics strong` | `font-size 19px` · `line-height 1.4` · `font-variant-numeric tabular-nums` · `overflow-wrap anywhere` | — |
| [68](../../src/features/statistics/Activity.module.css#L68) `.cardioKinds h3` | `font-size 12px` · `font-weight 400` · `color var(--text-muted)` | `margin 0` |
| [69](../../src/features/statistics/Activity.module.css#L69) `.cardioKind` | `font-size 13px` | `align-items center` · `gap 8px` |
| [70](../../src/features/statistics/Activity.module.css#L70) `.cardioKind > span` | `overflow-wrap anywhere` | `align-items center` · `gap 7px` |
| [72](../../src/features/statistics/Activity.module.css#L72) `.cardioKind > strong` | `text-align right` · `font-size 13px` | — |
| [73](../../src/features/statistics/Activity.module.css#L73) `.cardioKind > strong > small` | `color var(--text-muted)` · `font-size 11px` · `font-weight 400` | `margin-inline-end 8px` |
| [80](../../src/features/statistics/Activity.module.css#L80) `@media (max-width:350px) › .page .sectionHeading > span` | `font-size 10px` | — |
| [81](../../src/features/statistics/Activity.module.css#L81) `@media (max-width:350px) › .summaryGrid strong` | `font-size 22px` | — |
| [83](../../src/features/statistics/Activity.module.css#L83) `@media (max-width:350px) › .cardioMetrics strong` | `font-size 17px` | — |

### [features/statistics/Growth.module.css](../../src/features/statistics/Growth.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [4](../../src/features/statistics/Growth.module.css#L4) `.screen h2` | `font-size 18px` · `font-weight 600` · `line-height 1.4` | `margin 0` |
| [5](../../src/features/statistics/Growth.module.css#L5) `.screen .searchCard h2` | `font-size 15px` | — |
| [7](../../src/features/statistics/Growth.module.css#L7) `.screen .searchCard :global(.record-search input)` | `font-size 16px` | `padding-inline 12px` |
| [8](../../src/features/statistics/Growth.module.css#L8) `.screen .searchCard :global(.record-search input::placeholder)`<br>[25](../../src/features/statistics/Growth.module.css#L25) `.placement`<br>[65](../../src/features/statistics/Growth.module.css#L65) `@media (max-width: 350px) › .screen .periods > button` | `font-size 12px` | — |
| [9](../../src/features/statistics/Growth.module.css#L9) `.screen .searchCard :global(.record-search[data-search-state='IDLE'] .search-disclosure)`<br>[36](../../src/features/statistics/Growth.module.css#L36) `.countRow svg` | `color var(--text-muted)` | — |
| [12](../../src/features/statistics/Growth.module.css#L12) `.screen .searchCard :global(.record-search [role='group'] > button > span)` | `white-space nowrap` | `min-height 36px` · `padding-inline 12px` |
| [13](../../src/features/statistics/Growth.module.css#L13) `.heading` | — | `align-items center` · `gap 8px` |
| [14](../../src/features/statistics/Growth.module.css#L14) `.heading > span` | `color var(--text-muted)` · `font-size 11px` | — |
| [21](../../src/features/statistics/Growth.module.css#L21) `.screen .periods > button` | `color var(--text-primary)` · `font-size 13px` · `font-weight 600` | `min-width 0` · `min-height 40px` · `padding 8px 2px` |
| [22](../../src/features/statistics/Growth.module.css#L22) `.screen .periods > button[aria-pressed='true']` | `color var(--on-accent)` | — |
| [30](../../src/features/statistics/Growth.module.css#L30) `.latest > span, .latest time` | `color var(--text-muted)` · `font-size var(--latest-label-font)` | — |
| [31](../../src/features/statistics/Growth.module.css#L31) `.latest > span` | `line-height var(--latest-label-line)` | — |
| [32](../../src/features/statistics/Growth.module.css#L32) `.latest strong:global(.growth-latest)` | `font-size 26px` · `line-height 1.25` · `overflow-wrap anywhere` · `font-variant-numeric tabular-nums` | `margin 0` |
| [33](../../src/features/statistics/Growth.module.css#L33) `.latest strong small` | `font-size 15px` | `margin-inline-start 3px` |
| [34](../../src/features/statistics/Growth.module.css#L34) `.countRow` | `font-size 13px` | `align-items center` · `gap 8px` · `padding-top 10px` |
| [37](../../src/features/statistics/Growth.module.css#L37) `.countRow > span:last-child` | `font-weight 600` | — |
| [38](../../src/features/statistics/Growth.module.css#L38) `.delta` | `font-size 11px` · `line-height 1.35` · `overflow-wrap anywhere` · `font-variant-numeric tabular-nums` | `align-items center` · `padding 3px 7px` |
| [39](../../src/features/statistics/Growth.module.css#L39) `.delta[data-direction='increase']` | `color var(--status-done)` | — |
| [40](../../src/features/statistics/Growth.module.css#L40) `.delta[data-direction='decrease']` | `color var(--status-warning)` | — |
| [41](../../src/features/statistics/Growth.module.css#L41) `.comparison` | `font-size 16px` | `gap 3px` · `margin-block-start calc(var(--latest-label-font) * var(--latest-label-line) + var(--latest-gap))` · `margin-inline-start auto` · `padding 7px 9px` |
| [42](../../src/features/statistics/Growth.module.css#L42) `.comparison small` | `font-size 10px` | — |
| [45](../../src/features/statistics/Growth.module.css#L45) `.chart h3` | `font-size 15px` · `font-weight 600` | `margin 0` |
| [49](../../src/features/statistics/Growth.module.css#L49) `.chart .plot > p:not(:global(.sr-only))` | `color var(--text-muted)` · `font-size 12px` | `padding 8px` |
| [53](../../src/features/statistics/Growth.module.css#L53) `.screen .historyList .event` | `color var(--text-primary)` · `text-align start` · `font-size 12px` · `font-weight 400` | `grid-template-columns minmax(0,1fr) 12px` · `align-items center` · `gap 6px` · `min-height 52px` · `padding 9px 0` |
| [57](../../src/features/statistics/Growth.module.css#L57) `.event time` | `color var(--text-muted)` · `font-size 11px` · `white-space nowrap` | — |
| [58](../../src/features/statistics/Growth.module.css#L58) `.weights` | `color var(--text-muted)` · `overflow-wrap anywhere` | — |
| [59](../../src/features/statistics/Growth.module.css#L59) `.weights b` | `color var(--text-primary)` · `font-weight 650` | — |
| [60](../../src/features/statistics/Growth.module.css#L60) `.detail` | `color var(--text-muted)` · `font-size 18px` · `text-align center` | — |
| [64](../../src/features/statistics/Growth.module.css#L64) `@media (max-width: 350px) › .screen h2` | `font-size 16px` | — |

### [features/statistics/RecordMain.module.css](../../src/features/statistics/RecordMain.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [4](../../src/features/statistics/RecordMain.module.css#L4) `.summaryHeading h2` | `color var(--accent)` | — |
| [5](../../src/features/statistics/RecordMain.module.css#L5) `.summaryHeading > span` | `font-size 11px` · `color var(--text-muted)` · `font-variant-numeric tabular-nums` | — |
| [7](../../src/features/statistics/RecordMain.module.css#L7) `.achievement strong` | `font-size 38px` · `line-height 1.2` · `font-variant-numeric tabular-nums` | — |
| [9](../../src/features/statistics/RecordMain.module.css#L9) `.achievement > span` | `font-size 12px` | — |
| [10](../../src/features/statistics/RecordMain.module.css#L10) `.progress` | — | `height 7px` · `margin-top 9px` |
| [11](../../src/features/statistics/RecordMain.module.css#L11) `.progress > span` | — | `height 100%` |
| [12](../../src/features/statistics/RecordMain.module.css#L12) `.main .completion` | `font-size 12px` | `margin-top 8px` |
| [15](../../src/features/statistics/RecordMain.module.css#L15) `.metrics svg` | `color var(--accent)` | `margin-bottom 10px` |
| [16](../../src/features/statistics/RecordMain.module.css#L16) `.metrics strong` | `font-size 16px` · `line-height 1.3` · `font-variant-numeric tabular-nums` · `overflow-wrap anywhere` | — |
| [17](../../src/features/statistics/RecordMain.module.css#L17) `.metrics small` | `font-size 10px` · `color var(--text-muted)` | `margin-top 4px` |
| [20](../../src/features/statistics/RecordMain.module.css#L20) `.main .analysisHeading h2, .main .recentHeading h2` | `color var(--text-primary)` · `font-size 20px` · `font-weight 600` · `line-height 1.25` | — |
| [23](../../src/features/statistics/RecordMain.module.css#L23) `.main .analysisCard` | `color var(--accent)` · `text-align left` · `font-weight 400` | `gap 16px` · `min-height 107px` · `padding 12px` |
| [25](../../src/features/statistics/RecordMain.module.css#L25) `.analysisTop > span` | `font-size 12px` · `color var(--text-muted)` | — |
| [27](../../src/features/statistics/RecordMain.module.css#L27) `.analysisText strong` | `font-size 15px` · `font-weight 600` · `line-height 1.4` · `color var(--text-primary)` | — |
| [28](../../src/features/statistics/RecordMain.module.css#L28) `.analysisText small` | `font-size 12px` · `font-weight 400` · `line-height 1.4` · `color var(--text-muted)` | — |
| [30](../../src/features/statistics/RecordMain.module.css#L30) `.recentRange` | `font-size var(--font-metadata)` · `color var(--text-muted)` · `white-space nowrap` · `font-variant-numeric tabular-nums` | — |
| [31](../../src/features/statistics/RecordMain.module.css#L31) `.main .recentHeading > button` | `font-size 12px` · `color var(--accent)` | — |
| [34](../../src/features/statistics/RecordMain.module.css#L34) `.recentCard:global(.session-record-card)` | `text-align left` · `color var(--text-primary)` | `grid-template-columns minmax(0, 1fr)` · `gap var(--card-gap-dense)` · `padding var(--card-padding)` |
| [40](../../src/features/statistics/RecordMain.module.css#L40) `.recentCard .recentCardHeading time` | `white-space normal` · `overflow-wrap anywhere` · `font-size 11px` · `font-variant-numeric tabular-nums` | — |
| [41](../../src/features/statistics/RecordMain.module.css#L41) `.recentCardHeading .recentStatus` | `font-size 11px` · `line-height 1.5` · `white-space nowrap` | `align-items center` · `gap 4px` · `margin 0` |
| [42](../../src/features/statistics/RecordMain.module.css#L42) `.recentStatus b` | `font-size 14px` · `font-weight 400` | — |
| [43](../../src/features/statistics/RecordMain.module.css#L43) `.recentCardHeading > span:last-child` | `color var(--text-muted)` | — |
| [44](../../src/features/statistics/RecordMain.module.css#L44) `.recentCard h4` | `text-overflow ellipsis` · `white-space nowrap` · `font-size 14px` · `font-weight 650` · `line-height 1.45` | `margin 0` |
| [45](../../src/features/statistics/RecordMain.module.css#L45) `.recentFacts` | `font-size 11px` · `line-height 1.5` · `color var(--text-muted)` · `overflow-wrap anywhere` | — |
| [50](../../src/features/statistics/RecordMain.module.css#L50) `@media (max-width: 350px) › .main .recentHeading > button` | — | `margin-block 0` |
| [54](../../src/features/statistics/RecordMain.module.css#L54) `@media (max-width: 350px) › .metrics strong` | `font-size 14px` | — |
| [57](../../src/features/statistics/RecordMain.module.css#L57) `@media (max-width: 350px) › .recentCard .recentCardHeading time, .recentCardHeading .recentStatus` | `font-size 10px` | — |
| [60](../../src/features/statistics/RecordMain.module.css#L60) `.recordPlaceholder` | `color transparent` | — |

### [features/statistics/statistics.css](../../src/features/statistics/statistics.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [2](../../src/features/statistics/statistics.css#L2) `.statistics-summary > div` | `overflow-wrap anywhere` | `gap 4px` |
| [3](../../src/features/statistics/statistics.css#L3) `.statistics-summary strong` | `font-size 1.6rem` | — |
| [4](../../src/features/statistics/statistics.css#L4) `.statistics-summary span, .statistics-row small` | `color var(--muted, #666)` | — |
| [5](../../src/features/statistics/statistics.css#L5) `.statistics-row`<br>[12](../../src/features/statistics/statistics.css#L12) `.record-screen, .muscle-analysis, .record-feed` | `overflow-wrap anywhere` | — |
| [13](../../src/features/statistics/statistics.css#L13) `.record-screen h1, .muscle-analysis h1` | `font-size 23px` | — |
| [15](../../src/features/statistics/statistics.css#L15) `.record-menu button` | `text-align left` | `gap 8px` · `min-height 114px` · `padding 16px` |
| [16](../../src/features/statistics/statistics.css#L16) `.record-menu strong` | `font-size 16px` | — |
| [17](../../src/features/statistics/statistics.css#L17) `.record-menu button > span:last-child` | `text-align right` · `color var(--accent)` | — |
| [18](../../src/features/statistics/statistics.css#L18) `.record-menu .small` | `font-size 9px` · `letter-spacing .08em` | — |
| [20](../../src/features/statistics/statistics.css#L20) `.record-tabs:not([data-period-tabs]) > button` | — | `min-width 0` |
| [21](../../src/features/statistics/statistics.css#L21) `.record-tabs:not([data-period-tabs]) [aria-pressed='true']`<br>[183](../../src/features/statistics/statistics.css#L183) `.record-period .record-period-row .record-calendar-trigger`<br>[184](../../src/features/statistics/statistics.css#L184) `.record-screen .app-card .record-menu button`<br>[185](../../src/features/statistics/statistics.css#L185) `.record-screen .record-back > button.quiet,.record-screen .recent-records > .section-heading > button`<br>[186](../../src/features/statistics/statistics.css#L186) `.record-screen .eyebrow` | `color var(--accent)` | — |
| [22](../../src/features/statistics/statistics.css#L22) `.record-period-row` | `text-align center` | `grid-template-columns 36px minmax(0,1fr) 36px` · `align-items center` · `gap 4px` |
| [23](../../src/features/statistics/statistics.css#L23) `.record-period-row button` | `font-size 23px` | `padding-inline 0` |
| [24](../../src/features/statistics/statistics.css#L24) `.record-period-row b`<br>[78](../../src/features/statistics/statistics.css#L78) `.record-period-row b`<br>[87](../../src/features/statistics/statistics.css#L87) `.record-search li strong`<br>[98](../../src/features/statistics/statistics.css#L98) `.session-record-card .section-heading`<br>[233](../../src/features/statistics/statistics.css#L233) `.session-record-card .record-total` | `font-size 12px` | — |
| [25](../../src/features/statistics/statistics.css#L25) `.record-calendar`<br>[47](../../src/features/statistics/statistics.css#L47) `.analysis-toggle` | `font-size 11px` | `align-items center` · `gap 6px` |
| [32](../../src/features/statistics/statistics.css#L32) `.record-trend b, .record-trend small` | `font-size 9px` · `white-space nowrap` | — |
| [35](../../src/features/statistics/statistics.css#L35) `.record-day` | `font-size 10px` · `text-align center` | `align-items center` · `gap 7px` |
| [36](../../src/features/statistics/statistics.css#L36) `.record-day strong`<br>[114](../../src/features/statistics/statistics.css#L114) `.growth-latest`<br>[149](../../src/features/statistics/statistics.css#L149) `.record-screen h1,.muscle-analysis h1` | `font-size 22px` | — |
| [37](../../src/features/statistics/statistics.css#L37) `.record-day small` | `font-size 9px` · `-webkit-line-clamp 2` | — |
| [38](../../src/features/statistics/statistics.css#L38) `.record-day button` | `font-size 10px` | `width 100%` · `padding-inline 0` |
| [39](../../src/features/statistics/statistics.css#L39) `.record-day [data-state='complete']`<br>[159](../../src/features/statistics/statistics.css#L159) `.record-card-status[data-state='complete']`<br>[191](../../src/features/statistics/statistics.css#L191) `.growth-event .growth-after[data-approval-direction='increase']`<br>[198](../../src/features/statistics/statistics.css#L198) `.record-calendar-grid [data-state='complete']` | `color var(--status-done)` | — |
| [40](../../src/features/statistics/statistics.css#L40) `.record-day [data-state='missed']`<br>[160](../../src/features/statistics/statistics.css#L160) `.record-card-status[data-state='missed']`<br>[200](../../src/features/statistics/statistics.css#L200) `.record-calendar-grid [data-state='missed']` | `color var(--status-missed)` | — |
| [41](../../src/features/statistics/statistics.css#L41) `.record-week` | `color var(--text-muted)` · `font-size 11px` | `gap 7px` · `align-items center` · `margin-top 10px` |
| [42](../../src/features/statistics/statistics.css#L42) `.record-week b, .record-week span` | `white-space nowrap` | — |
| [44](../../src/features/statistics/statistics.css#L44) `.session-record-card > span:nth-child(3)`<br>[66](../../src/features/statistics/statistics.css#L66) `.record-screen .small,.muscle-analysis .small`<br>[88](../../src/features/statistics/statistics.css#L88) `.record-search li small`<br>[120](../../src/features/statistics/statistics.css#L120) `@media (max-width:374px) › .analysis-row`<br>[157](../../src/features/statistics/statistics.css#L157) `.record-day time` | `font-size 11px` | — |
| [53](../../src/features/statistics/statistics.css#L53) `.analysis-group h2` | `font-size 13px` · `color var(--text-muted)` | — |
| [54](../../src/features/statistics/statistics.css#L54) `.analysis-row` | `font-size 12px` | `padding 10px 0` |
| [55](../../src/features/statistics/statistics.css#L55) `.analysis-row span` | `color var(--text-muted)` | — |
| [57](../../src/features/statistics/statistics.css#L57) `.analysis-start` | `font-size 11px` · `line-height 12px` · `color var(--accent) !important` | — |
| [59](../../src/features/statistics/statistics.css#L59) `@media (max-width:374px) › .record-menu button` | — | `padding 12px` |
| [59](../../src/features/statistics/statistics.css#L59) `@media (max-width:374px) › .record-menu strong`<br>[148](../../src/features/statistics/statistics.css#L148) `.record-screen h2,.muscle-analysis h2`<br>[163](../../src/features/statistics/statistics.css#L163) `.session-record-card h4` | `font-size 14px` | — |
| [59](../../src/features/statistics/statistics.css#L59) `@media (max-width:374px) › .muscle-analysis h1` | `font-size 20px` | — |
| [63](../../src/features/statistics/statistics.css#L63) `.record-screen h1,.muscle-analysis h1` | `font-size 20px` · `line-height 1.3` | `margin 0` |
| [64](../../src/features/statistics/statistics.css#L64) `.record-screen h2,.muscle-analysis h2` | `font-size 13px` · `line-height 1.4` · `font-weight 700` | `margin 0` |
| [65](../../src/features/statistics/statistics.css#L65) `.record-screen p,.muscle-analysis p` | `line-height 1.55` | `margin 0` |
| [67](../../src/features/statistics/statistics.css#L67) `.record-week-label` | — | `margin-top -7px !important` · `margin-bottom 4px !important` |
| [70](../../src/features/statistics/statistics.css#L70) `.statistics-summary small` | `font-size 10px` · `color var(--text-muted)` | — |
| [71](../../src/features/statistics/statistics.css#L71) `.statistics-summary strong` | `font-size 17px` · `line-height 1.3` | — |
| [73](../../src/features/statistics/statistics.css#L73) `.record-menu button` | `font-size 12px` · `font-weight 650` · `text-align center` | `min-height 46px` · `padding 15px 4px` |
| [75](../../src/features/statistics/statistics.css#L75) `.record-tabs:not([data-period-tabs]) > button` | `font-size 12px` | `min-height 34px` · `padding 7px 5px` |
| [77](../../src/features/statistics/statistics.css#L77) `.record-period-row > button` | `font-size 18px` | `min-width 44px` · `min-height 44px` · `height 44px` · `padding 0` |
| [80](../../src/features/statistics/statistics.css#L80) `.record-calendar-grid` | `text-align center` | `grid-template-columns repeat(7,minmax(0,1fr))` · `gap 3px` · `margin-top 9px` |
| [81](../../src/features/statistics/statistics.css#L81) `.record-calendar-grid > *` | `font-size 11px` | `padding 5px 1px` |
| [82](../../src/features/statistics/statistics.css#L82) `.record-calendar-grid button` | — | `min-height 32px` |
| [83](../../src/features/statistics/statistics.css#L83) `.record-pair` | `font-size 12px` | `align-items center` · `gap 8px` |
| [86](../../src/features/statistics/statistics.css#L86) `.record-search li button` | `font-size 12px` | `min-height 57px` · `padding 10px 2px` · `gap 10px` |
| [92](../../src/features/statistics/statistics.css#L92) `.record-trend b,.record-trend small`<br>[111](../../src/features/statistics/statistics.css#L111) `.analysis-toggle` | `font-size 10px` | — |
| [95](../../src/features/statistics/statistics.css#L95) `.record-day time,.record-day small` | `font-size 9px` | — |
| [96](../../src/features/statistics/statistics.css#L96) `.record-day strong` | `font-size 18px` | `margin-top 2px` |
| [99](../../src/features/statistics/statistics.css#L99) `.session-record-card h4` | `font-size 15px` | `margin 8px 0` |
| [100](../../src/features/statistics/statistics.css#L100) `.session-record-card .record-pair` | `font-size 11px` | `margin-top 9px` |
| [101](../../src/features/statistics/statistics.css#L101) `.record-week` | `font-size 11px` | `margin 7px 0 0` |
| [103](../../src/features/statistics/statistics.css#L103) `.recent-records > .section-heading button,.record-screen .section-heading > button` | `font-size 11px` | `padding 3px 6px` · `min-height 30px` |
| [104](../../src/features/statistics/statistics.css#L104) `.analysis-row` | `font-size 12px` | `padding 8px 0` |
| [106](../../src/features/statistics/statistics.css#L106) `.analysis-row strong`<br>[127](../../src/features/statistics/statistics.css#L127) `.record-screen .session-record-card`<br>[128](../../src/features/statistics/statistics.css#L128) `.record-screen .session-record-card .record-pair` | `font-weight 400` | — |
| [107](../../src/features/statistics/statistics.css#L107) `.analysis-row > div:first-child > span` | `font-weight 700` · `white-space nowrap` | — |
| [112](../../src/features/statistics/statistics.css#L112) `.growth-picker` | `text-align left` · `font-size 12px` | `align-items center` · `gap 8px` · `min-height 42px` · `padding 8px 10px` |
| [117](../../src/features/statistics/statistics.css#L117) `.growth-graph svg text` | `fill var(--text-muted)` · `font-size 11px` | — |
| [118](../../src/features/statistics/statistics.css#L118) `.record-preview-controls` | `font-size 10px` · `color var(--text-muted)` | `margin-top -10px` |
| [120](../../src/features/statistics/statistics.css#L120) `@media (max-width:374px) › .record-screen h1,.muscle-analysis h1` | `font-size 18px` | — |
| [120](../../src/features/statistics/statistics.css#L120) `@media (max-width:374px) › .record-menu button` | `font-size 11px` | `padding 15px 2px` |
| [120](../../src/features/statistics/statistics.css#L120) `@media (max-width:374px) › .statistics-summary strong` | `font-size 15px` | — |
| [122](../../src/features/statistics/statistics.css#L122) `.record-review-banner` | `font-size 10px !important` | `padding 6px 9px !important` · `margin-bottom 0 !important` |
| [124](../../src/features/statistics/statistics.css#L124) `.record-preview-controls` | `font-size 10px` | `margin 0` |
| [126](../../src/features/statistics/statistics.css#L126) `.record-screen` | `line-height 1.5` | — |
| [129](../../src/features/statistics/statistics.css#L129) `.record-screen .record-menu button` | — | `height 48px` · `min-height 48px` · `padding 12px 4px` |
| [133](../../src/features/statistics/statistics.css#L133) `.record-screen .record-back button` | `font-size 11px` | `width auto` · `min-height 30px` · `height 30px` · `padding 4px 8px` |
| [134](../../src/features/statistics/statistics.css#L134) `.record-screen .record-tabs:not([data-period-tabs]) > button` | `font-size 11px` · `font-weight 400` | `min-height 35px` · `height 35px` · `padding 7px 2px` |
| [135](../../src/features/statistics/statistics.css#L135) `.record-screen .record-tabs:not([data-period-tabs]) > button[aria-pressed='true']` | `font-weight 700` | — |
| [137](../../src/features/statistics/statistics.css#L137) `.record-screen .record-note` | `font-size 11px` · `line-height 1.5` · `font-weight 400` | — |
| [142](../../src/features/statistics/statistics.css#L142) `.approval-toolbar button` | `font-size 12px` · `line-height 1.35` | `min-height 44px` · `padding 7px 9px` · `width auto` |
| [144](../../src/features/statistics/statistics.css#L144) `.record-screen .record-calendar-grid button` | — | `min-height 44px` |
| [145](../../src/features/statistics/statistics.css#L145) `.record-calendar-grid button small` | `font-size 10px` · `color var(--text-muted)` | `margin-top 2px` |
| [150](../../src/features/statistics/statistics.css#L150) `.record-screen .record-menu button` | `font-size 13px` | — |
| [151](../../src/features/statistics/statistics.css#L151) `.record-screen .record-tabs:not([data-period-tabs]) > button[aria-pressed='true']`<br>[195](../../src/features/statistics/statistics.css#L195) `.muscle-analysis .record-tabs:not([data-period-tabs]) > button[aria-pressed='true']`<br>[197](../../src/features/statistics/statistics.css#L197) `.record-period .record-period-row .record-calendar-trigger[aria-expanded='true']` | `color var(--on-accent)` | — |
| [152](../../src/features/statistics/statistics.css#L152) `.record-period-row > button` | `line-height 1` | — |
| [156](../../src/features/statistics/statistics.css#L156) `.record-weekday-head` | `font-size var(--font-metadata)` · `color var(--text-muted)` · `text-align center` | `grid-template-columns repeat(7,minmax(0,1fr))` · `margin-bottom 2px` |
| [158](../../src/features/statistics/statistics.css#L158) `.record-day [data-state='partial'],.record-card-status[data-state='partial']`<br>[192](../../src/features/statistics/statistics.css#L192) `.growth-event .growth-after[data-approval-direction='decrease']`<br>[199](../../src/features/statistics/statistics.css#L199) `.record-calendar-grid [data-state='partial']` | `color var(--status-warning)` | — |
| [161](../../src/features/statistics/statistics.css#L161) `.record-card-status` | `color var(--text-muted)` · `font-size 10px` · `font-weight 400` · `white-space nowrap` | `margin-left auto` |
| [162](../../src/features/statistics/statistics.css#L162) `.session-record-card time` | `font-size var(--font-metadata)` · `font-weight 400` · `color var(--text-muted)` | — |
| [164](../../src/features/statistics/statistics.css#L164) `.muscle-analysis .analysis-controls`<br>[179](../../src/features/statistics/statistics.css#L179) `.record-search > .section-heading` | — | `gap 8px` |
| [165](../../src/features/statistics/statistics.css#L165) `.analysis-controls label` | `font-size var(--font-metadata)` | `gap 5px` |
| [166](../../src/features/statistics/statistics.css#L166) `.analysis-controls select` | `font-size 12px` | `height 36px` · `min-height 36px` · `padding 6px 9px` |
| [167](../../src/features/statistics/statistics.css#L167) `.analysis-subtotal` | `white-space nowrap` · `font-size 11px` · `font-weight 600` | `margin-left auto` |
| [171](../../src/features/statistics/statistics.css#L171) `.record-chart-tooltip` | `color var(--text-primary)` · `font-size 12px` | `padding 8px` |
| [175](../../src/features/statistics/statistics.css#L175) `.growth-event` | `font-size 11px` | `grid-template-columns 38px minmax(0,1fr) max-content 24px` · `align-items center` · `gap 6px` · `padding 10px 0` |
| [176](../../src/features/statistics/statistics.css#L176) `.growth-event > strong` | `text-overflow ellipsis` · `white-space nowrap` · `font-weight 400` | — |
| [177](../../src/features/statistics/statistics.css#L177) `.growth-event > b`<br>[221](../../src/features/statistics/statistics.css#L221) `.session-record-card time`<br>[225](../../src/features/statistics/statistics.css#L225) `.session-record-card .record-card-heading time` | `white-space nowrap` · `font-size 11px` | — |
| [180](../../src/features/statistics/statistics.css#L180) `.record-search > .section-heading > span` | `text-overflow ellipsis` · `white-space nowrap` | `min-width 0` |
| [188](../../src/features/statistics/statistics.css#L188) `.growth-screen .growth-event` | `color var(--text-primary)` · `text-align left` · `font-size 11px` · `font-weight 400` | `grid-template-columns 35px minmax(0,1fr) max-content 16px` · `min-height 44px` · `gap 6px` · `padding 10px 0` |
| [189](../../src/features/statistics/statistics.css#L189) `.growth-event .growth-weights` | `white-space nowrap` · `color var(--text-primary)` | — |
| [190](../../src/features/statistics/statistics.css#L190) `.growth-event .growth-after` | `font-size inherit` · `font-weight 650` | — |
| [193](../../src/features/statistics/statistics.css#L193) `.growth-event .growth-detail` | `color var(--accent)` · `font-size 22px` · `text-align right` | — |
| [218](../../src/features/statistics/statistics.css#L218) `.record-gauge-guide` | `font-size 10px` · `line-height 18px` · `color var(--text-muted)` | — |
| [220](../../src/features/statistics/statistics.css#L220) `.session-record-card > .section-heading` | — | `grid-template-columns minmax(0,1fr) auto` · `gap 4px` |
| [224](../../src/features/statistics/statistics.css#L224) `.session-record-card .record-card-heading` | — | `grid-template-columns minmax(0,1fr) 18px 6px` · `align-items center` · `gap 6px` |
| [226](../../src/features/statistics/statistics.css#L226) `.record-card-heading .record-card-status` | `font-size 16px` · `line-height 18px` | `width 18px` · `height 18px` · `margin 0` |
| [228](../../src/features/statistics/statistics.css#L228) `.session-record-card .record-durations` | `white-space normal` · `overflow-wrap anywhere` · `line-height 1.5` | — |
| [229](../../src/features/statistics/statistics.css#L229) `.session-record-card .record-exercise-line` | `font-size 11px` | `align-items baseline` · `gap 4px 8px` |
| [230](../../src/features/statistics/statistics.css#L230) `.record-exercise-line > span:last-child:not(:first-child)`<br>[232](../../src/features/statistics/statistics.css#L232) `.session-record-card .record-pair > :last-child:not(:first-child)` | `text-align right` | `margin-left auto` |

### [features/statistics/WeeklyMusclePlan.module.css](../../src/features/statistics/WeeklyMusclePlan.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [3](../../src/features/statistics/WeeklyMusclePlan.module.css#L3) `.page .controls label` | `font-size 12px` · `color var(--text-muted)` | `gap 6px` · `min-width 0` |
| [4](../../src/features/statistics/WeeklyMusclePlan.module.css#L4) `.page .controls select` | `color var(--text-primary)` · `font-size 16px` · `text-overflow ellipsis` | `width 100%` · `min-width 0` · `min-height 44px` · `padding 8px 30px 8px 12px` |
| [8](../../src/features/statistics/WeeklyMusclePlan.module.css#L8) `.page .segment > button` | `color var(--text-primary)` · `font-size 14px` · `font-weight 600` | `min-width 0` · `min-height 48px` · `padding 8px 4px` |
| [9](../../src/features/statistics/WeeklyMusclePlan.module.css#L9) `.page .segment > button[aria-pressed='true']` | `color var(--on-accent)` | — |
| [14](../../src/features/statistics/WeeklyMusclePlan.module.css#L14) `.summary > div > span` | `color var(--text-muted)` · `font-size 12px` | — |
| [15](../../src/features/statistics/WeeklyMusclePlan.module.css#L15) `.summary strong` | `font-size 19px` · `line-height 1.4` · `overflow-wrap anywhere` · `font-variant-numeric tabular-nums` | — |
| [16](../../src/features/statistics/WeeklyMusclePlan.module.css#L16) `.summary strong small` | `font-size 12px` · `font-weight 400` | `margin-left 3px` |
| [18](../../src/features/statistics/WeeklyMusclePlan.module.css#L18) `.page .distributionHeading h2` | `font-size 18px` · `font-weight 600` · `line-height 1.4` | `margin 0` |
| [19](../../src/features/statistics/WeeklyMusclePlan.module.css#L19) `.page .toggle` | `font-size 11px` · `white-space nowrap` | `gap 6px` |
| [20](../../src/features/statistics/WeeklyMusclePlan.module.css#L20) `.page .toggle button` | — | `align-items center` · `width 40px` · `height 44px` · `min-height 44px` · `padding 0 3px` |
| [21](../../src/features/statistics/WeeklyMusclePlan.module.css#L21) `.toggle button::before` | — | `inset 10px 0` |
| [23](../../src/features/statistics/WeeklyMusclePlan.module.css#L23) `.page .toggle button i` | — | `width 18px` · `height 18px` |
| [29](../../src/features/statistics/WeeklyMusclePlan.module.css#L29) `.page .groupHeading h2` | `color var(--text-primary)` · `font-size 14px` · `font-weight 600` · `overflow-wrap anywhere` | `margin 0` |
| [31](../../src/features/statistics/WeeklyMusclePlan.module.css#L31) `.page .groupHeading > span` | `color var(--text-muted)` · `font-size 11px` | `margin 0` |
| [32](../../src/features/statistics/WeeklyMusclePlan.module.css#L32) `.page :global(.analysis-row)` | `font-size 13px` | `padding 8px 0` |
| [34](../../src/features/statistics/WeeklyMusclePlan.module.css#L34) `.page :global(.analysis-row > div:first-child > strong)` | `font-weight 400` · `overflow-wrap anywhere` | — |
| [35](../../src/features/statistics/WeeklyMusclePlan.module.css#L35) `.page :global(.analysis-row > div:first-child > span)` | `font-size 12px` | `margin-left auto` |
| [36](../../src/features/statistics/WeeklyMusclePlan.module.css#L36) `.notes` | `color var(--text-muted)` · `font-size 11px` · `line-height 1.5` | `gap 6px` |
| [40](../../src/features/statistics/WeeklyMusclePlan.module.css#L40) `@media (max-width: 350px) › .page .distributionHeading h2` | `font-size 16px` | — |
| [42](../../src/features/statistics/WeeklyMusclePlan.module.css#L42) `@media (max-width: 350px) › .page .groupHeading > span` | `font-size 10px` | — |

### [features/statistics/WeeklyMuscleStatistics.module.css](../../src/features/statistics/WeeklyMuscleStatistics.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L1) `.period` | `font-size 13px` | `align-items center` · `gap 12px` · `min-height 28px` |
| [2](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L2) `.period > span` | `font-variant-numeric tabular-nums` | `align-items center` · `gap 7px` |
| [3](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L3) `.period svg` | `color var(--text-muted)` | — |
| [4](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L4) `.period small` | `color var(--text-muted)` · `font-size 11px` | `padding 3px 12px` |
| [5](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L5) `.controls > div` | — | `gap 6px` · `min-width 0` |
| [6](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L6) `.controlLabel` | `color var(--text-muted)` · `font-size 12px` | — |
| [9](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L9) `.page .achievement h2` | `font-size 14px` · `font-weight 600` | `margin 0` |
| [10](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L10) `.achievement strong` | `color var(--text-muted)` · `font-size 16px` | — |
| [11](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L11) `.achievement > div > span:last-child` | `color var(--text-muted)` · `font-size 11px` · `font-variant-numeric tabular-nums` | — |
| [13](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L13) `.page :global(.analysis-subtotal)`<br>[14](../../src/features/statistics/WeeklyMuscleStatistics.module.css#L14) `.page :global(.analysis-row > div:first-child > span)` | `white-space normal` · `overflow-wrap anywhere` · `text-align right` | — |

### [features/workout-flow/CardioFocus.module.css](../../src/features/workout-flow/CardioFocus.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/features/workout-flow/CardioFocus.module.css#L1) `.heading` | — | `grid-template-columns minmax(0, 1fr) auto` · `align-items center` · `gap 12px 8px` · `padding-top 4px` |
| [8](../../src/features/workout-flow/CardioFocus.module.css#L8) `.heading p` | `color var(--accent)` · `font-size 12px` · `font-weight 650` | — |
| [9](../../src/features/workout-flow/CardioFocus.module.css#L9) `.heading h1` | `font-size 22px` | `margin 0` |
| [10](../../src/features/workout-flow/CardioFocus.module.css#L10) `.phase` | `color color-mix(in srgb, var(--accent) 68%, var(--text-primary))` · `font-size 11px` · `line-height 1.5` | `padding 2px 8px` |
| [18](../../src/features/workout-flow/CardioFocus.module.css#L18) `.phase[data-phase='running']`<br>[58](../../src/features/workout-flow/CardioFocus.module.css#L58) `.timerStatus[data-phase='running']` | `color color-mix(in srgb, var(--status-done) 65%, var(--text-primary))` | — |
| [22](../../src/features/workout-flow/CardioFocus.module.css#L22) `.phase[data-phase='paused']`<br>[43](../../src/features/workout-flow/CardioFocus.module.css#L43) `.modifiedValue`<br>[59](../../src/features/workout-flow/CardioFocus.module.css#L59) `.timerStatus[data-phase='paused']` | `color var(--status-warning)` | — |
| [23](../../src/features/workout-flow/CardioFocus.module.css#L23) `.phase[data-phase='skipped']` | `color var(--text-muted)` | — |
| [25](../../src/features/workout-flow/CardioFocus.module.css#L25) `.card` | `font-variant-numeric tabular-nums` | `padding 12px` · `gap 12px` |
| [26](../../src/features/workout-flow/CardioFocus.module.css#L26) `.card :is(h2, h5)` | `font-size 15px` | `margin 0` |
| [27](../../src/features/workout-flow/CardioFocus.module.css#L27) `.goals` | `text-align center` | `grid-template-columns repeat(3, minmax(0, 1fr))` · `margin 0` |
| [35](../../src/features/workout-flow/CardioFocus.module.css#L35) `.goals dt, .goals small` | `color var(--text-muted)` · `font-size 11px` | — |
| [36](../../src/features/workout-flow/CardioFocus.module.css#L36) `.goals dd` | `font-size 18px` · `font-weight 700` · `line-height 1.3` | `margin 3px 0 0` |
| [37](../../src/features/workout-flow/CardioFocus.module.css#L37) `.goals small` | `font-weight 400` | `margin-inline-start 3px` |
| [45](../../src/features/workout-flow/CardioFocus.module.css#L45) `.card.timer` | `text-align center` | `min-height 126px` · `justify-items center` · `gap 6px` |
| [54](../../src/features/workout-flow/CardioFocus.module.css#L54) `.timer p` | `color var(--text-muted)` · `font-size 13px` | `align-items center` · `gap 6px` |
| [55](../../src/features/workout-flow/CardioFocus.module.css#L55) `.timer svg, .reviewHeading svg` | `color var(--accent)` | — |
| [56](../../src/features/workout-flow/CardioFocus.module.css#L56) `.timer strong` | `font-size 25px` · `font-weight 750` · `line-height 1.35` | — |
| [57](../../src/features/workout-flow/CardioFocus.module.css#L57) `.timerStatus` | `color var(--text-muted)` · `font-size 12px` | `align-items center` · `gap 7px` |
| [60](../../src/features/workout-flow/CardioFocus.module.css#L60) `.timerStatus:is([data-phase='running'], [data-phase='paused'])::before` | — | `width 7px` · `height 7px` |
| [79](../../src/features/workout-flow/CardioFocus.module.css#L79) `.recordedTime > span, .recordedTime small` | `font-size 12px` · `color var(--text-muted)` | — |
| [80](../../src/features/workout-flow/CardioFocus.module.css#L80) `.recordedTime strong` | `color var(--text-primary)` · `font-size 16px` · `line-height 1.25` · `font-variant-numeric tabular-nums` · `white-space nowrap` | — |
| [83](../../src/features/workout-flow/CardioFocus.module.css#L83) `.reviewActions button` | `font-size 13px` | `width 100%` |

### [features/workout-flow/WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [2](../../src/features/workout-flow/WorkoutFlow.module.css#L2) `.flow, .summary` | `overflow-wrap anywhere` · `word-break keep-all` | `gap 14px` |
| [25](../../src/features/workout-flow/WorkoutFlow.module.css#L25) `.flow h1, .summary h1` | `font-size clamp(22px, 6.5vw, 29px)` · `line-height 1.2` | — |
| [26](../../src/features/workout-flow/WorkoutFlow.module.css#L26) `.flow h2, .summary h2` | `font-size 16px` | — |
| [27](../../src/features/workout-flow/WorkoutFlow.module.css#L27) `.summary h4`<br>[216](../../src/features/workout-flow/WorkoutFlow.module.css#L216) `.completedRecords h3, .recordForm h3` | `font-size 14px` | `margin 0` |
| [28](../../src/features/workout-flow/WorkoutFlow.module.css#L28) `.eyebrow` | `color var(--accent)` · `font-size 11px` · `font-weight 700` · `letter-spacing .11em` | — |
| [29](../../src/features/workout-flow/WorkoutFlow.module.css#L29) `.clockDock` | — | `width min(100%, 520px)` · `padding env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left)` |
| [30](../../src/features/workout-flow/WorkoutFlow.module.css#L30) `.clock` | — | `grid-template-columns repeat(3, minmax(0, 1fr))` |
| [31](../../src/features/workout-flow/WorkoutFlow.module.css#L31) `.clock > div` | `text-align center` | `align-items center` · `gap 2px` · `padding 8px 4px` · `min-width 0` · `min-height 62px` |
| [33](../../src/features/workout-flow/WorkoutFlow.module.css#L33) `.clock small`<br>[109](../../src/features/workout-flow/WorkoutFlow.module.css#L109) `.workingLabel` | `font-size 10px` · `color var(--text-muted)` | — |
| [35](../../src/features/workout-flow/WorkoutFlow.module.css#L35) `.clock .saveLabel` | `white-space nowrap` | `align-items center` · `gap 3px` |
| [37](../../src/features/workout-flow/WorkoutFlow.module.css#L37) `.saveLabel[data-workout-save-status='saved'] svg`<br>[164](../../src/features/workout-flow/WorkoutFlow.module.css#L164) `.recommendation[data-direction='increase']`<br>[199](../../src/features/workout-flow/WorkoutFlow.module.css#L199) `.doneText`<br>[205](../../src/features/workout-flow/WorkoutFlow.module.css#L205) `[data-weight-review] [data-direction='increase']`<br>[263](../../src/features/workout-flow/WorkoutFlow.module.css#L263) `:global([data-approval-direction='increase'])`<br>[281](../../src/features/workout-flow/WorkoutFlow.module.css#L281) `.achievementTag[data-state='complete']` | `color var(--status-done)` | — |
| [38](../../src/features/workout-flow/WorkoutFlow.module.css#L38) `.saveLabel[data-workout-save-status='waiting'] svg`<br>[70](../../src/features/workout-flow/WorkoutFlow.module.css#L70) `.restCountdown[data-warning] > strong`<br>[165](../../src/features/workout-flow/WorkoutFlow.module.css#L165) `.recommendation[data-direction='decrease']`<br>[206](../../src/features/workout-flow/WorkoutFlow.module.css#L206) `[data-weight-review] [data-direction='decrease']`<br>[210](../../src/features/workout-flow/WorkoutFlow.module.css#L210) `.reviewValues [data-incomplete]`<br>[264](../../src/features/workout-flow/WorkoutFlow.module.css#L264) `:global([data-approval-direction='decrease'])`<br>[282](../../src/features/workout-flow/WorkoutFlow.module.css#L282) `.achievementTag[data-state='partial']` | `color var(--status-warning)` | — |
| [39](../../src/features/workout-flow/WorkoutFlow.module.css#L39) `.saveLabel[data-workout-save-status='failed'] svg`<br>[178](../../src/features/workout-flow/WorkoutFlow.module.css#L178) `.flow[data-cardio-focus] .topNav > button:last-child` | `color var(--status-danger-text)` | — |
| [40](../../src/features/workout-flow/WorkoutFlow.module.css#L40) `.clock .saveDetails` | — | `inset 0` · `width 100%` · `min-height 0` · `padding 0` |
| [42](../../src/features/workout-flow/WorkoutFlow.module.css#L42) `.clock strong` | `font-size clamp(17px, 4.6vw, 22px)` · `line-height 1.3` · `white-space nowrap` · `font-variant-numeric tabular-nums` | — |
| [43](../../src/features/workout-flow/WorkoutFlow.module.css#L43) `.clock > div:nth-child(2) strong`<br>[85](../../src/features/workout-flow/WorkoutFlow.module.css#L85) `.focusTitle .listTrigger`<br>[169](../../src/features/workout-flow/WorkoutFlow.module.css#L169) `.recommendation small` | `font-size 11px` | — |
| [44](../../src/features/workout-flow/WorkoutFlow.module.css#L44) `.clock > div:last-child strong` | `white-space normal` · `font-size 12px` | — |
| [45](../../src/features/workout-flow/WorkoutFlow.module.css#L45) `.clock > div:last-child strong[data-time]` | `white-space nowrap` · `font-size clamp(13px, 4.6vw, 22px)` | — |
| [54](../../src/features/workout-flow/WorkoutFlow.module.css#L54) `@keyframes rest-alert › 0%`<br>[55](../../src/features/workout-flow/WorkoutFlow.module.css#L55) `@keyframes rest-alert-text › 0%` | `color var(--surface-page)` | — |
| [54](../../src/features/workout-flow/WorkoutFlow.module.css#L54) `@keyframes rest-alert › 18%, 100%` | `color var(--rest-text-off)` | — |
| [55](../../src/features/workout-flow/WorkoutFlow.module.css#L55) `@keyframes rest-alert-text › 18%, 100%`<br>[173](../../src/features/workout-flow/WorkoutFlow.module.css#L173) `.listSelect small`<br>[197](../../src/features/workout-flow/WorkoutFlow.module.css#L197) `.recordSet small`<br>[214](../../src/features/workout-flow/WorkoutFlow.module.css#L214) `.recordTimes dt`<br>[300](../../src/features/workout-flow/WorkoutFlow.module.css#L300) `.reviewApprovalState:not([data-approval-direction]), .reviewApprovalState[data-approval-direction='same']` | `color var(--text-muted)` | — |
| [66](../../src/features/workout-flow/WorkoutFlow.module.css#L66) `.restCountdown` | `color var(--text-primary)` · `text-align center` | `gap 4px` |
| [67](../../src/features/workout-flow/WorkoutFlow.module.css#L67) `.restCountdown > span`<br>[76](../../src/features/workout-flow/WorkoutFlow.module.css#L76) `.topNav strong` | `font-size 15px` | — |
| [68](../../src/features/workout-flow/WorkoutFlow.module.css#L68) `.restCountdown > strong` | `font-size clamp(56px, 17vw, 84px)` · `line-height 1.15` · `font-variant-numeric tabular-nums` | — |
| [69](../../src/features/workout-flow/WorkoutFlow.module.css#L69) `.restCountdown small` | `font-size .27em` | `margin-inline-start .25em` |
| [71](../../src/features/workout-flow/WorkoutFlow.module.css#L71) `.topNav` | `text-align center` | `grid-template-columns 52px minmax(0, 1fr) 52px` · `align-items center` · `gap 4px` · `padding-bottom 4px` |
| [72](../../src/features/workout-flow/WorkoutFlow.module.css#L72) `.topNav button, .topNav strong` | `font-size 13px` · `font-weight 650` · `line-height 1.35` | — |
| [73](../../src/features/workout-flow/WorkoutFlow.module.css#L73) `.topNav button` | — | `padding-inline 0` · `width 100%` |
| [74](../../src/features/workout-flow/WorkoutFlow.module.css#L74) `.topNav button:first-child`<br>[92](../../src/features/workout-flow/WorkoutFlow.module.css#L92) `.exerciseNav button:first-child`<br>[304](../../src/features/workout-flow/WorkoutFlow.module.css#L304) `@media (max-width:360px) › .summaryHeader:has(.recordColumns) .headingRow .recordDate` | `text-align left` | — |
| [75](../../src/features/workout-flow/WorkoutFlow.module.css#L75) `.topNav button:last-child`<br>[93](../../src/features/workout-flow/WorkoutFlow.module.css#L93) `.exerciseNav button:last-child`<br>[209](../../src/features/workout-flow/WorkoutFlow.module.css#L209) `.reviewEvidence` | `text-align right` | — |
| [77](../../src/features/workout-flow/WorkoutFlow.module.css#L77) `.topNav strong > span` | `white-space nowrap` · `text-overflow ellipsis` | — |
| [79](../../src/features/workout-flow/WorkoutFlow.module.css#L79) `.topNav small` | `font-size 10px` · `color var(--text-muted)` · `white-space nowrap` · `text-overflow ellipsis` | `margin-top 4px` |
| [80](../../src/features/workout-flow/WorkoutFlow.module.css#L80) `.flow .warmup` | `text-align center` | `padding-block 34px` |
| [81](../../src/features/workout-flow/WorkoutFlow.module.css#L81) `.warmupMark` | `color var(--accent)` · `font-size 28px` | — |
| [86](../../src/features/workout-flow/WorkoutFlow.module.css#L86) `.flow .exerciseTitle` | `font-size var(--workout-title-size, clamp(22px, 6.5vw, 29px))` · `white-space nowrap` · `text-overflow ellipsis` | `min-height calc(clamp(22px, 6.5vw, 29px) * 1.2)` · `margin-bottom 4px` |
| [88](../../src/features/workout-flow/WorkoutFlow.module.css#L88) `.equipment` | `font-size 11px` · `line-height 1.4` · `text-align right` · `color var(--text-primary)` | `gap 2px` |
| [91](../../src/features/workout-flow/WorkoutFlow.module.css#L91) `.exerciseNav button` | `font-size 12px` · `line-height 1.25` | `min-width 0` · `padding 4px 0` |
| [94](../../src/features/workout-flow/WorkoutFlow.module.css#L94) `.exerciseNav small` | `white-space nowrap` · `text-overflow ellipsis` · `color var(--text-muted)` · `font-size 10px` | `margin-top 3px` |
| [100](../../src/features/workout-flow/WorkoutFlow.module.css#L100) `.working:has(.plateSide) .workingValues > strong` | `overflow-wrap anywhere` | `align-self baseline` |
| [102](../../src/features/workout-flow/WorkoutFlow.module.css#L102) `.working:has(.plateSide) .equipment` | `overflow-wrap anywhere` | — |
| [104](../../src/features/workout-flow/WorkoutFlow.module.css#L104) `.workingValues > strong` | `font-size 30px` · `line-height 1.2` | — |
| [105](../../src/features/workout-flow/WorkoutFlow.module.css#L105) `.workingValues > strong small`<br>[117](../../src/features/workout-flow/WorkoutFlow.module.css#L117) `.setsHeading h2`<br>[166](../../src/features/workout-flow/WorkoutFlow.module.css#L166) `.recommendation b` | `font-size 13px` | — |
| [106](../../src/features/workout-flow/WorkoutFlow.module.css#L106) `.plateLabel, .plateSide > strong` | `text-align center` | — |
| [107](../../src/features/workout-flow/WorkoutFlow.module.css#L107) `.plateSide > strong` | `font-size clamp(24px, 6.5vw, 30px)` | — |
| [110](../../src/features/workout-flow/WorkoutFlow.module.css#L110) `.workingHead .weightChange[data-button-size='compact']` | `font-size 11px` | `width max-content` · `margin-block -10px` |
| [112](../../src/features/workout-flow/WorkoutFlow.module.css#L112) `.headingRow`<br>[237](../../src/features/workout-flow/WorkoutFlow.module.css#L237) `.recordForm label:has(> input[type='checkbox']):not(.recoveryRow)` | — | `align-items center` · `gap 8px` |
| [113](../../src/features/workout-flow/WorkoutFlow.module.css#L113) `.headingRow > span, .headingRow > b` | `font-size 12px` | — |
| [114](../../src/features/workout-flow/WorkoutFlow.module.css#L114) `.headingRow button` | — | `padding-inline 10px` |
| [118](../../src/features/workout-flow/WorkoutFlow.module.css#L118) `.setsHeading > span` | `text-align center` · `font-size 13px` · `font-weight 650` · `white-space nowrap` | — |
| [119](../../src/features/workout-flow/WorkoutFlow.module.css#L119) `.setsHeading > b` | `text-align right` · `font-size 13px` · `white-space nowrap` | — |
| [120](../../src/features/workout-flow/WorkoutFlow.module.css#L120) `.sets > :is(div, progress)` | — | `margin-inline 3px` |
| [121](../../src/features/workout-flow/WorkoutFlow.module.css#L121) `.setProgress` | — | `width calc(100% - 6px)` · `margin-block 0` |
| [122](../../src/features/workout-flow/WorkoutFlow.module.css#L122) `.setHead, .setRow` | `text-align center` | `grid-template-columns minmax(var(--set-number-min, 26px), .5fr) minmax(44px, .85fr) minmax(176px, 2fr) 44px` · `gap 3px` · `align-items center` |
| [125](../../src/features/workout-flow/WorkoutFlow.module.css#L125) `@media (max-width: 350px) › .setHead, .setRow` | — | `column-gap 1px` |
| [127](../../src/features/workout-flow/WorkoutFlow.module.css#L127) `.setHead` | `color var(--text-muted)` · `font-size 10px` | `padding 9px 0 3px` |
| [128](../../src/features/workout-flow/WorkoutFlow.module.css#L128) `.setRow` | `font-size 12px` | `padding-block 6px` |
| [130](../../src/features/workout-flow/WorkoutFlow.module.css#L130) `.prior` | `font-size 12px` · `color var(--text-muted)` | — |
| [132](../../src/features/workout-flow/WorkoutFlow.module.css#L132) `.flow button.editClose[data-close-text]` | `color var(--text-primary)` | — |
| [135](../../src/features/workout-flow/WorkoutFlow.module.css#L135) `.flow .memoToggle` | `line-height 24px` · `color var(--text-primary)` · `text-align start` | `align-items center` · `min-height 0` · `padding 10px 0` |
| [141](../../src/features/workout-flow/WorkoutFlow.module.css#L141) `.flow :global(button.outline).endWorkout` | `color var(--status-danger-text)` | `padding-block 8px` |
| [143](../../src/features/workout-flow/WorkoutFlow.module.css#L143) `.setActions > button` | `font-size 12px` | `min-width 0` · `min-height 44px` · `padding 7px 6px` |
| [144](../../src/features/workout-flow/WorkoutFlow.module.css#L144) `.footer` | — | `width min(100%, 520px)` · `gap 6px` · `padding 9px var(--space-page) calc(9px + env(safe-area-inset-bottom))` |
| [145](../../src/features/workout-flow/WorkoutFlow.module.css#L145) `.footer > button[data-action-shape], .footer > .actions > button` | `text-align center` | `align-items center` · `height var(--workout-action-height)` · `min-height var(--workout-action-height)` · `padding 0 12px` |
| [150](../../src/features/workout-flow/WorkoutFlow.module.css#L150) `.footer > *` | — | `width 100%` · `min-width 0` · `margin 0` |
| [154](../../src/features/workout-flow/WorkoutFlow.module.css#L154) `.actions > button` | — | `min-width 0` · `min-height 46px` · `padding-inline 7px` |
| [155](../../src/features/workout-flow/WorkoutFlow.module.css#L155) `.prepare` | `color var(--status-warning)` | `align-items center` · `min-height var(--workout-action-height)` · `padding 0 12px` |
| [156](../../src/features/workout-flow/WorkoutFlow.module.css#L156) `:is(.restProtected, .checkCell[data-completion-protected] > button):disabled` | `opacity 1` | — |
| [162](../../src/features/workout-flow/WorkoutFlow.module.css#L162) `.prepare strong` | `font-size 18px` | `padding-inline 5px` |
| [163](../../src/features/workout-flow/WorkoutFlow.module.css#L163) `.recommendation` | `color var(--text-muted)` | `grid-template-columns minmax(0, 1fr) auto` · `align-items center` · `gap 2px` · `min-height var(--workout-action-height)` · `padding 2px 14px` |
| [168](../../src/features/workout-flow/WorkoutFlow.module.css#L168) `.recommendation > button` | — | `min-width 44px` · `min-height 44px` · `padding 6px` |
| [171](../../src/features/workout-flow/WorkoutFlow.module.css#L171) `.exerciseOrderRow .listSelect` | `text-align left` | `padding 5px 8px` |
| [181](../../src/features/workout-flow/WorkoutFlow.module.css#L181) `.flow[data-cardio-focus] .footer button`<br>[235](../../src/features/workout-flow/WorkoutFlow.module.css#L235) `.evaluation h3` | `font-size 14px` | — |
| [187](../../src/features/workout-flow/WorkoutFlow.module.css#L187) `.metrics dt` | `font-size 11px` · `color var(--text-muted)` | — |
| [188](../../src/features/workout-flow/WorkoutFlow.module.css#L188) `.metrics dd` | `font-size 15px` · `font-weight 700` | `margin 0` |
| [191](../../src/features/workout-flow/WorkoutFlow.module.css#L191) `.recordHead > h4, .recordHead > b` | `font-size 14px` · `font-weight 700` · `color var(--text-primary)` | — |
| [192](../../src/features/workout-flow/WorkoutFlow.module.css#L192) `.recordHead > b` | `white-space nowrap` · `text-align right` | — |
| [193](../../src/features/workout-flow/WorkoutFlow.module.css#L193) `.recordGoal` | `color var(--text-muted)` · `font-size 12px` | `margin 2px 0 4px` |
| [196](../../src/features/workout-flow/WorkoutFlow.module.css#L196) `.recordSet` | `font-size 12px` | `padding 4px 0` |
| [198](../../src/features/workout-flow/WorkoutFlow.module.css#L198) `.recordSet > span` | `color var(--text-muted)` · `text-align right` | — |
| [203](../../src/features/workout-flow/WorkoutFlow.module.css#L203) `.reviewChange` | `font-size 11px` · `font-weight 400` · `line-height 1.6` · `color var(--text-primary)` | — |
| [204](../../src/features/workout-flow/WorkoutFlow.module.css#L204) `.reviewResult > strong` | `font-size 13px` · `font-weight 700` | — |
| [207](../../src/features/workout-flow/WorkoutFlow.module.css#L207) `.reviewValues` | `font-size 12px` · `font-weight 400` · `line-height 1.6` | `gap 8px` · `align-items baseline` |
| [208](../../src/features/workout-flow/WorkoutFlow.module.css#L208) `.reviewChange, .reviewEvidence` | `white-space nowrap` | — |
| [212](../../src/features/workout-flow/WorkoutFlow.module.css#L212) `.recordTimes` | `font-size 12px` | `gap 6px` · `margin 0` |
| [219](../../src/features/workout-flow/WorkoutFlow.module.css#L219) `.recordEditRow > b` | `font-size 12px` · `font-weight 600` | — |
| [220](../../src/features/workout-flow/WorkoutFlow.module.css#L220) `.recordEditRow > button` | `font-size 12px` | `padding-inline 0` |
| [222](../../src/features/workout-flow/WorkoutFlow.module.css#L222) `.recordFacts strong` | `font-size 14px` · `color var(--text-primary)` | — |
| [223](../../src/features/workout-flow/WorkoutFlow.module.css#L223) `.recordFacts small` | `color var(--text-muted)` · `font-size 11px` | — |
| [226](../../src/features/workout-flow/WorkoutFlow.module.css#L226) `.recordForm h4` | `font-size 14px` · `color var(--text-primary)` | `margin 0` |
| [227](../../src/features/workout-flow/WorkoutFlow.module.css#L227) `.recordForm label` | `font-size 13px` | `gap 6px` |
| [233](../../src/features/workout-flow/WorkoutFlow.module.css#L233) `.changeEntry h4` | `font-size 14px` | `margin 4px 0` |
| [234](../../src/features/workout-flow/WorkoutFlow.module.css#L234) `.changeEntry p` | `font-size 12px` | `margin-block 4px` |
| [241](../../src/features/workout-flow/WorkoutFlow.module.css#L241) `.summary h1` | `font-size 22px` · `line-height 1.3` | — |
| [242](../../src/features/workout-flow/WorkoutFlow.module.css#L242) `.summary h2` | `font-size 14px` · `line-height 1.4` | — |
| [243](../../src/features/workout-flow/WorkoutFlow.module.css#L243) `.summary > :global(.app-card):where(:not(.approvalConfirmation)) > p` | `font-size 12px` · `line-height 1.5` | — |
| [244](../../src/features/workout-flow/WorkoutFlow.module.css#L244) `.summary .recordItem h3,.summary .recordItem h4,.summary .recordHead > b` | `font-size 14px` · `font-weight 650` | — |
| [245](../../src/features/workout-flow/WorkoutFlow.module.css#L245) `.summary .recordSet strong` | `font-size 13px` · `font-weight 650` | — |
| [246](../../src/features/workout-flow/WorkoutFlow.module.css#L246) `.summary .recordSet small,.summary .recordGoal,.summary .recordTimes` | `font-size var(--font-metadata)` · `font-weight 400` · `color var(--text-muted)` | — |
| [248](../../src/features/workout-flow/WorkoutFlow.module.css#L248) `.summary :global(.approval-toolbar) h2` | `white-space normal` · `word-break keep-all` | — |
| [249](../../src/features/workout-flow/WorkoutFlow.module.css#L249) `.summary .approveButton` | `white-space nowrap` · `font-size 12px` | `min-height 36px` · `padding 4px 6px` |
| [250](../../src/features/workout-flow/WorkoutFlow.module.css#L250) `.summary .approveButton:enabled` | `color var(--on-accent)` | — |
| [254](../../src/features/workout-flow/WorkoutFlow.module.css#L254) `.summary .approvalRow > label` | — | `justify-items start` |
| [255](../../src/features/workout-flow/WorkoutFlow.module.css#L255) `.summary :is(.weightReviewHead, .approvalRow) > h3` | `font-size 14px` · `font-weight 650` · `line-height 1.6` · `color var(--text-primary)` | `margin 0` |
| [256](../../src/features/workout-flow/WorkoutFlow.module.css#L256) `.summary .approvalRow > h3`<br>[279](../../src/features/workout-flow/WorkoutFlow.module.css#L279) `.summary .recordRoutineRow .recordRoutine` | `text-overflow ellipsis` · `white-space nowrap` | — |
| [260](../../src/features/workout-flow/WorkoutFlow.module.css#L260) `:global(.duration-wheels) > div` | `text-align center` · `font-size 12px` | `gap 4px` |
| [262](../../src/features/workout-flow/WorkoutFlow.module.css#L262) `:global(.approval-draft-value)` | `font-size 14px` · `line-height 1.6` | — |
| [266](../../src/features/workout-flow/WorkoutFlow.module.css#L266) `.summary .reviewButton` | `font-size 12px` · `font-weight 650` · `line-height 1.2` · `white-space nowrap` | `min-height 36px` · `padding 4px 6px` |
| [269](../../src/features/workout-flow/WorkoutFlow.module.css#L269) `.summaryHeader .headingRow h1` | — | `margin 0` |
| [270](../../src/features/workout-flow/WorkoutFlow.module.css#L270) `.summary .summaryHeader .recordDate` | `font-size 12px` · `color var(--text-muted)` | `margin 0` |
| [271](../../src/features/workout-flow/WorkoutFlow.module.css#L271) `.summary .summaryHeader .recordRoutine` | `font-size 18px` · `font-weight 700` · `line-height 1.4` · `overflow-wrap anywhere` | `margin 0` |
| [273](../../src/features/workout-flow/WorkoutFlow.module.css#L273) `.summaryHeader .headingRow` | — | `grid-template-columns auto minmax(0,1fr) auto` · `align-items center` · `gap 6px` |
| [274](../../src/features/workout-flow/WorkoutFlow.module.css#L274) `.summaryHeader .headingRow h1` | `font-size clamp(16px,4.3vw,22px)` · `white-space nowrap` | — |
| [275](../../src/features/workout-flow/WorkoutFlow.module.css#L275) `.summaryHeader .headingRow .recordDate` | `text-align right` · `font-size 10px` · `white-space nowrap` | — |
| [276](../../src/features/workout-flow/WorkoutFlow.module.css#L276) `.summaryHeader .headingRow > :last-child:not(.recordDate)` | — | `min-width 20px` · `min-height 30px` · `padding 2px` |
| [280](../../src/features/workout-flow/WorkoutFlow.module.css#L280) `.achievementTag` | `font-size 11px` · `white-space nowrap` · `color var(--text-muted)` | `padding 3px 6px` |
| [283](../../src/features/workout-flow/WorkoutFlow.module.css#L283) `.achievementTag[data-state='missed']` | `color var(--status-missed)` | — |
| [287](../../src/features/workout-flow/WorkoutFlow.module.css#L287) `.recordColumns h3` | `font-size 12px` | `margin 0 0 5px` |
| [288](../../src/features/workout-flow/WorkoutFlow.module.css#L288) `.recordColumns strong` | `font-size clamp(14px,4vw,18px)` · `white-space nowrap` | — |
| [290](../../src/features/workout-flow/WorkoutFlow.module.css#L290) `.recordColumns small` | `font-size 10px` · `color var(--text-muted)` · `text-align center` | — |
| [292](../../src/features/workout-flow/WorkoutFlow.module.css#L292) `.performanceHeading b` | `font-size 12px` · `text-align right` | `margin-left auto` |
| [295](../../src/features/workout-flow/WorkoutFlow.module.css#L295) `.achievementReason` | `font-size 12px` · `color var(--achievement-color)` | `margin-block 4px` |
| [296](../../src/features/workout-flow/WorkoutFlow.module.css#L296) `.recordItem[data-achievement] .recordHead > b` | `color var(--achievement-color)` | — |
| [297](../../src/features/workout-flow/WorkoutFlow.module.css#L297) `.reviewHistoryValues` | `font-size 12px` | `gap 5px` · `align-items baseline` |
| [299](../../src/features/workout-flow/WorkoutFlow.module.css#L299) `.reviewApprovalState` | `font-size 11px` | `margin-left auto` |
| [303](../../src/features/workout-flow/WorkoutFlow.module.css#L303) `@media (max-width:360px) › .summaryHeader:has(.recordColumns) .headingRow` | — | `grid-template-columns minmax(0,1fr) auto` |

### [features/workout-flow/WorkoutRecordDetail.module.css](../../src/features/workout-flow/WorkoutRecordDetail.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [8](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L8) `.detail .summaryTop .date` | `font-size 11px` · `line-height 1.5` · `color var(--text-muted)` · `overflow-wrap anywhere` | `margin 0` |
| [12](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L12) `.menu > :global([data-dropdown='action']) > button[aria-haspopup]` | — | `justify-items end` |
| [13](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L13) `.menu > :global([data-dropdown='action']) > button[aria-haspopup] > span` | — | `inset-block-start 50%` · `inset-inline-end var(--record-menu-outset)` |
| [20](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L20) `.status` | `color var(--text-muted)` · `font-size 11px` · `white-space nowrap` | `align-items center` · `gap 4px` |
| [21](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L21) `.status b` | `font-size 14px` · `font-weight 400` | — |
| [22](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L22) `.status[data-state='complete']` | `color var(--status-done)` | — |
| [23](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L23) `.status[data-state='partial']` | `color var(--status-warning)` | — |
| [24](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L24) `.status[data-state='missed']` | `color var(--status-missed)` | — |
| [25](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L25) `.detail .routine` | `-webkit-line-clamp 2` · `white-space normal` | — |
| [27](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L27) `.detail :global([aria-label='운동 기록 요약'])` | — | `margin-block 0` · `padding-top 12px` |
| [28](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L28) `.detail :global([aria-label='운동 기록 요약']) strong` | `font-size 16px` · `white-space normal` · `overflow-wrap anywhere` · `text-align center` | — |
| [29](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L29) `.detail :global([aria-label='운동 기록 요약']) section` | — | `padding-inline 4px` |
| [33](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L33) `.detail .reviewTitle` | `font-size 16px` · `font-weight 700` · `line-height 1.4` · `color var(--text-primary)` | `margin 0` |
| [36](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L36) `.review > details > summary svg` | `color var(--text-muted)` | — |
| [47](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L47) `.detail :global([aria-label='웨이트 수행']) > div:first-child, .detail :global([aria-label='유산소 수행']) > div:first-child` | — | `align-items center` · `gap 8px` |
| [49](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L49) `.detail :global([aria-label='웨이트 수행']) > div:first-child h3, .detail :global([aria-label='유산소 수행']) > div:first-child h3` | `letter-spacing 0` · `font-size 12px` | `margin 0` |
| [52](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L52) `.detail :global([aria-label='웨이트 수행']) > section, .detail :global([aria-label='유산소 수행']) > section` | — | `margin-top 20px` · `padding-top 24px` · `padding-bottom 0` |
| [54](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L54) `.detail :global([aria-label='웨이트 수행']) > section:first-of-type, .detail :global([aria-label='유산소 수행']) > section:first-of-type` | — | `margin-top 20px` · `padding-top 4px` |
| [56](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L56) `.detail :global([aria-label='웨이트 수행']) + :global([aria-label='유산소 수행'])` | — | `margin-top 12px` |
| [57](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L57) `.detail :global([aria-label='웨이트 수행']) > section > div:first-child` | — | `align-items baseline` · `gap 6px 10px` |
| [58](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L58) `.detail :global([aria-label='웨이트 수행']) > section > div:first-child h4` | — | `min-width 100px` |
| [59](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L59) `.detail :global([aria-label='웨이트 수행']) > section > div:first-child > b` | `white-space normal` · `font-size 12px` | `margin-left auto` |
| [60](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L60) `.number` | `color var(--text-muted)` · `font-size 12px` · `font-weight 400` · `font-variant-numeric tabular-nums` | `margin-right 7px` |
| [61](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L61) `.detail :global([aria-label='웨이트 수행']) > section > p:first-of-type` | — | `margin-top 10px` · `margin-bottom 12px` |
| [62](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L62) `.detail :global([aria-label='웨이트 수행']) > section > div:not(:first-child)` | — | `grid-template-columns minmax(0,1.15fr) minmax(0,1fr) minmax(0,.7fr)` · `align-items baseline` · `gap 8px` · `padding 6px 0` |
| [63](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L63) `.detail :global([aria-label='웨이트 수행']) > section > div:not(:first-child) strong` | `font-size 13px` | — |
| [64](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L64) `.detail :global([aria-label='웨이트 수행']) > section > div:not(:first-child) > small` | `font-size 10px` · `color var(--text-muted)` · `text-align center` · `overflow-wrap anywhere` | `min-width 0` |
| [65](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L65) `.detail :global([aria-label='웨이트 수행']) > section > div:not(:first-child) > span` | `font-size 11px` · `overflow-wrap anywhere` | `min-width 0` |
| [71](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L71) `.preservation h2`<br>[75](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L75) `@media (max-width:350px) › .detail :global([aria-label='운동 기록 요약']) strong` | `font-size 14px` | — |
| [74](../../src/features/workout-flow/WorkoutRecordDetail.module.css#L74) `@media (max-width:350px) › .detail .summaryTop .date,.status` | `font-size 10px` | — |

### [features/workout-online/CardioFields.module.css](../../src/features/workout-online/CardioFields.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/features/workout-online/CardioFields.module.css#L1) `.fields` | — | `grid-template-columns repeat(2, minmax(0, 1fr))` · `gap 8px` · `min-width 0` |
| [9](../../src/features/workout-online/CardioFields.module.css#L9) `.planFields label` | `font-size 12px` | `gap 4px` · `min-width 0` · `margin 0` |
| [10](../../src/features/workout-online/CardioFields.module.css#L10) `.planFields select` | `font-size 16px` | `min-height 44px` · `padding 8px` |
| [11](../../src/features/workout-online/CardioFields.module.css#L11) `.goalTime` | `color var(--text-muted)` · `font-size 12px` | `gap 4px` |
| [14](../../src/features/workout-online/CardioFields.module.css#L14) `.intensity > button` | `white-space nowrap` | — |
| [16](../../src/features/workout-online/CardioFields.module.css#L16) `.timeActions > button` | `font-size 13px` | `min-width 0` |
| [19](../../src/features/workout-online/CardioFields.module.css#L19) `.note` | `color var(--text-muted)` | — |
| [20](../../src/features/workout-online/CardioFields.module.css#L20) `.extra summary` | `color var(--text-muted)` · `font-size 13px` | `padding-block 8px` |
| [21](../../src/features/workout-online/CardioFields.module.css#L21) `.extra .fields` | — | `padding-block 4px` |

### [features/workout-online/online.css](../../src/features/workout-online/online.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [2](../../src/features/workout-online/online.css#L2) `.online-session-badge` | `color #a9caff` · `font-size .75rem` | `padding 2px 10px` |
| [3](../../src/features/workout-online/online.css#L3) `.online-fieldset` | — | `padding 0` · `margin 0` · `min-width 0` |
| [5](../../src/features/workout-online/online.css#L5) `.online-routine select` | `color inherit` · `font inherit` · `font-size 16px` | `padding .8rem` |
| [8](../../src/features/workout-online/online.css#L8) `.workout-online time` | `overflow-wrap anywhere` · `font-size .85rem` | — |

### [features/workout-online/Presets.module.css](../../src/features/workout-online/Presets.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/features/workout-online/Presets.module.css#L1) `.titleRow` | — | `align-items center` · `gap 8px` |
| [2](../../src/features/workout-online/Presets.module.css#L2) `.kicker` | `font-size 12px` · `color var(--text-muted)` | — |
| [5](../../src/features/workout-online/Presets.module.css#L5) `.presetIdentity strong,.orderInfo > *` | `white-space nowrap` · `text-overflow ellipsis` | — |
| [6](../../src/features/workout-online/Presets.module.css#L6) `.number` | `font-size 11px` | — |
| [8](../../src/features/workout-online/Presets.module.css#L8) `.header .tools > button` | `color var(--text-muted)` | `width 44px` · `height 44px` · `min-height 44px` · `padding 0` |
| [9](../../src/features/workout-online/Presets.module.css#L9) `.titleRow .status` | `font-size 11px` · `font-weight 650` · `white-space nowrap` | `align-items center` · `gap 3px` · `width 76px` · `min-width 76px` · `height 32px` · `min-height 32px` · `padding 0 4px` |
| [11](../../src/features/workout-online/Presets.module.css#L11) `.titleRow button.status::after` | — | `inset -6px 0` |
| [12](../../src/features/workout-online/Presets.module.css#L12) `.status > span` | `font-size 15px` | — |
| [14](../../src/features/workout-online/Presets.module.css#L14) `.status[data-mode='active'] > span` | `color var(--status-done)` | — |
| [15](../../src/features/workout-online/Presets.module.css#L15) `.status[data-mode='preview']`<br>[28](../../src/features/workout-online/Presets.module.css#L28) `.orderInfo small` | `color var(--text-muted)` | — |
| [16](../../src/features/workout-online/Presets.module.css#L16) `.tools svg,.status svg` | `fill none` · `stroke currentColor` | — |
| [17](../../src/features/workout-online/Presets.module.css#L17) `.header .tools > button[aria-pressed='true']`<br>[18](../../src/features/workout-online/Presets.module.css#L18) `.navigation [aria-pressed='true']`<br>[23](../../src/features/workout-online/Presets.module.css#L23) `.membership b` | `color var(--accent)` | — |
| [20](../../src/features/workout-online/Presets.module.css#L20) `.navigation[role='group'] > button` | — | `width 44px` · `height 44px` · `min-height 44px` · `padding 0` |
| [21](../../src/features/workout-online/Presets.module.css#L21) `.membership` | `color var(--text-muted)` · `font-size 12px` · `overflow-wrap anywhere` | `gap 3px` · `margin-top 7px` |
| [26](../../src/features/workout-online/Presets.module.css#L26) `.orderRow .number` | `font-size 13px` · `font-weight 650` | — |
| [27](../../src/features/workout-online/Presets.module.css#L27) `.orderInfo` | `font-size 13px` | — |
| [31](../../src/features/workout-online/Presets.module.css#L31) `.orderActions .dragHandle` | `color var(--text-muted)` · `font-size 17px` | `min-height 44px` · `padding 0` |
| [43](../../src/features/workout-online/Presets.module.css#L43) `.createdMessage` | `overflow-wrap anywhere` | `margin 0` |
| [46](../../src/features/workout-online/Presets.module.css#L46) `.loadingSlot` | `color transparent` | — |

### [features/workout-online/PublicCatalog.module.css](../../src/features/workout-online/PublicCatalog.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/features/workout-online/PublicCatalog.module.css#L1) `.screen` | `overflow-wrap anywhere` · `word-break keep-all` | `gap 14px` |
| [10](../../src/features/workout-online/PublicCatalog.module.css#L10) `.description, .aliases` | `color var(--text-muted)` · `font-size 13px` | — |
| [36](../../src/features/workout-online/PublicCatalog.module.css#L36) `.results .result` | `text-align left` | `gap 10px` · `align-items center` · `padding 10px 4px` |
| [46](../../src/features/workout-online/PublicCatalog.module.css#L46) `.resultText` | `line-height 1.4` | `gap 2px` |
| [53](../../src/features/workout-online/PublicCatalog.module.css#L53) `.resultText strong` | `font-size 14px` | — |
| [54](../../src/features/workout-online/PublicCatalog.module.css#L54) `.arrow` | `color var(--text-muted)` · `font-size 21px` · `line-height 1` | — |
| [64](../../src/features/workout-online/PublicCatalog.module.css#L64) `.detailHeader h2` | `font-size 19px` · `line-height 1.3` | — |
| [65](../../src/features/workout-online/PublicCatalog.module.css#L65) `.eyebrow` | `color var(--text-muted)` · `font-size 10px` · `letter-spacing .14em` | — |
| [67](../../src/features/workout-online/PublicCatalog.module.css#L67) `.tag, .coreTag` | `color var(--text-muted)` · `font-size 11px` · `font-weight 650` · `white-space nowrap` | `padding 2px 8px` |
| [78](../../src/features/workout-online/PublicCatalog.module.css#L78) `.gifPlaceholder` | `color var(--text-muted)` · `text-align center` · `font-size 13px` · `font-weight 650` | `min-height 0` · `padding 0` |
| [96](../../src/features/workout-online/PublicCatalog.module.css#L96) `.gifPlaceholder > span` | `font-size 20px` | — |
| [100](../../src/features/workout-online/PublicCatalog.module.css#L100) `.instructions summary` | `font-weight 700` | `align-items center` · `gap 8px` · `min-height 52px` |
| [120](../../src/features/workout-online/PublicCatalog.module.css#L120) `.steps ol` | `font-size 14px` | `margin 0` · `padding-inline-start 22px` |
| [123](../../src/features/workout-online/PublicCatalog.module.css#L123) `.muscleLabel` | `font-size 14px` | `align-items baseline` · `gap 2px 8px` |
| [124](../../src/features/workout-online/PublicCatalog.module.css#L124) `.coreTag` | `color var(--accent)` | — |
| [128](../../src/features/workout-online/PublicCatalog.module.css#L128) `.filterLabel` | `color var(--text-muted)` · `font-size 13px` · `font-weight 600` | — |

### [features/workout-online/Routine.module.css](../../src/features/workout-online/Routine.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [2](../../src/features/workout-online/Routine.module.css#L2) `.editor h2` | `font-size 22px` | — |
| [3](../../src/features/workout-online/Routine.module.css#L3) `.editor label` | `font-size 12px` | — |
| [5](../../src/features/workout-online/Routine.module.css#L5) `.editor fieldset`<br>[71](../../src/features/workout-online/Routine.module.css#L71) `.scheduleEditor fieldset` | — | `padding 0` · `margin 0` · `min-width 0` |
| [9](../../src/features/workout-online/Routine.module.css#L9) `.editor h3` | `font-size 15px` · `overflow-wrap anywhere` | — |
| [10](../../src/features/workout-online/Routine.module.css#L10) `.editor button` | `font-size 14px` | — |
| [11](../../src/features/workout-online/Routine.module.css#L11) `.group` | `color var(--accent)` | `align-items center` · `padding-top 15px` |
| [12](../../src/features/workout-online/Routine.module.css#L12) `.group small` | `font-size 11px` · `font-weight 400` · `color var(--text-muted)` | — |
| [17](../../src/features/workout-online/Routine.module.css#L17) `.hero h2` | `font-size 24px` | `margin 6px 0` |
| [19](../../src/features/workout-online/Routine.module.css#L19) `.eyebrow` | `color var(--accent)` · `font-size 12px` · `font-weight 700` | — |
| [20](../../src/features/workout-online/Routine.module.css#L20) `.title` | — | `align-items center` · `gap 8px` |
| [22](../../src/features/workout-online/Routine.module.css#L22) `.days button` | — | `min-width 0` · `padding 4px` · `min-height 44px` |
| [23](../../src/features/workout-online/Routine.module.css#L23) `.days [aria-pressed='true']`<br>[26](../../src/features/workout-online/Routine.module.css#L26) `.week [aria-pressed='true']`<br>[26](../../src/features/workout-online/Routine.module.css#L26) `.categories [aria-pressed='true']`<br>[58](../../src/features/workout-online/Routine.module.css#L58) `.assignedCard .eyebrow` | `color var(--accent)` | — |
| [26](../../src/features/workout-online/Routine.module.css#L26) `.week button` | `font-size 12px` | `min-width 0` · `padding 9px 2px` · `gap 7px` |
| [26](../../src/features/workout-online/Routine.module.css#L26) `.week span` | `text-overflow ellipsis` · `white-space nowrap` · `font-size 10px` | — |
| [26](../../src/features/workout-online/Routine.module.css#L26) `.filters label` | `font-size 12px` | `gap 5px` |
| [26](../../src/features/workout-online/Routine.module.css#L26) `.weightAdjust button` | — | `min-height 44px` · `padding 6px` |
| [26](../../src/features/workout-online/Routine.module.css#L26) `.categories button` | — | `align-items center` · `gap 6px` · `min-width 0` · `padding 8px 3px` |
| [35](../../src/features/workout-online/Routine.module.css#L35) `.list .weekSection .weekTiles button` | — | `min-height 64px` |
| [36](../../src/features/workout-online/Routine.module.css#L36) `.weekTiles .weekName` | `text-overflow ellipsis` · `white-space nowrap` · `font-size 9px` | — |
| [38](../../src/features/workout-online/Routine.module.css#L38) `.weekRows .weekRow` | `text-align left` · `font-size 13px` | `grid-template-columns 24px minmax(0,1fr) max-content` · `align-items center` · `gap 6px` · `min-height 44px` · `padding 6px 7px` |
| [39](../../src/features/workout-online/Routine.module.css#L39) `.weekDay` | `color var(--accent)` | `align-self stretch` |
| [40](../../src/features/workout-online/Routine.module.css#L40) `.weekInfo` | `white-space nowrap` | `align-items center` · `gap 6px` · `padding-inline-start 4px` |
| [41](../../src/features/workout-online/Routine.module.css#L41) `.weekInfo > strong` | `text-overflow ellipsis` · `white-space nowrap` · `font-size 13px` | — |
| [42](../../src/features/workout-online/Routine.module.css#L42) `.planCounts` | `white-space nowrap` · `font-size 12px` | `align-items center` · `gap 8px` |
| [46](../../src/features/workout-online/Routine.module.css#L46) `.selectedDay` | `font-size 13px` · `overflow-wrap anywhere` | `align-items center` · `gap var(--card-gap-dense)` · `margin 0` |
| [48](../../src/features/workout-online/Routine.module.css#L48) `.listHeading` | `font-size 14px` | `align-items center` · `gap 8px` · `margin-bottom 10px` |
| [52](../../src/features/workout-online/Routine.module.css#L52) `.filters label` | — | `min-width 0` |
| [53](../../src/features/workout-online/Routine.module.css#L53) `.filters select` | `font-size 13px` | — |
| [56](../../src/features/workout-online/Routine.module.css#L56) `.compactCard .eyebrow` | `white-space nowrap` · `color var(--text-muted)` · `font-size 11px` | — |
| [60](../../src/features/workout-online/Routine.module.css#L60) `.tag` | `font-size 11px` · `color var(--accent)` | — |
| [62](../../src/features/workout-online/Routine.module.css#L62) `.compactCard .cardBody` | `text-align left` · `color var(--text-primary)` · `font-weight 400` · `line-height 1.4` | `gap 4px` · `padding 0` |
| [63](../../src/features/workout-online/Routine.module.css#L63) `.cardName` | `font-size 18px` · `font-weight 650` · `white-space nowrap` · `text-overflow ellipsis` | — |
| [64](../../src/features/workout-online/Routine.module.css#L64) `.cardDays` | `text-overflow ellipsis` · `white-space nowrap` · `color var(--text-muted)` · `font-size 12px` | — |
| [65](../../src/features/workout-online/Routine.module.css#L65) `.exerciseLine` | `font-size 13px` | `gap 8px` · `align-items baseline` |
| [66](../../src/features/workout-online/Routine.module.css#L66) `.exerciseLine b` | `color var(--accent)` · `font-size 11px` | — |
| [67](../../src/features/workout-online/Routine.module.css#L67) `.exerciseLine > span` | `white-space nowrap` · `text-overflow ellipsis` | — |
| [74](../../src/features/workout-online/Routine.module.css#L74) `.editor .tagField :global([data-dropdown='value']) > button` | `font-size 14px` · `font-weight 400` | — |
| [75](../../src/features/workout-online/Routine.module.css#L75) `.editor .identityField` | `font-size 12px` · `font-weight 400` · `line-height 18px` · `color var(--text-muted)` | `gap 4px` |
| [76](../../src/features/workout-online/Routine.module.css#L76) `.tagDescription` | `color var(--text-muted)` · `font-size 12px` | `margin-top 6px` |
| [78](../../src/features/workout-online/Routine.module.css#L78) `.detailActions button` | — | `min-height 44px` · `padding 8px` |
| [82](../../src/features/workout-online/Routine.module.css#L82) `.exerciseActions button` | — | `min-width 0` · `min-height 44px` · `padding 8px 3px` |
| [85](../../src/features/workout-online/Routine.module.css#L85) `.scheduleDay` | `font-size 14px` | `grid-template-columns 44px minmax(0,1fr)` · `align-items center` · `gap 8px` |

### [features/workout-online/RoutineDetail.module.css](../../src/features/workout-online/RoutineDetail.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [7](../../src/features/workout-online/RoutineDetail.module.css#L7) `.edit` | `font-size 13px` | — |
| [10](../../src/features/workout-online/RoutineDetail.module.css#L10) `.detail .date, .detail .date time` | `color var(--text-muted)` · `font-size var(--font-metadata)` | `margin 0` |
| [11](../../src/features/workout-online/RoutineDetail.module.css#L11) `.date` | `text-align end` · `white-space nowrap` | `padding-top 4px` |
| [13](../../src/features/workout-online/RoutineDetail.module.css#L13) `.routineTitle h2` | `-webkit-line-clamp 2` · `overflow-wrap anywhere` · `font-size 20px` · `line-height 1.25` | `margin 0` |
| [24](../../src/features/workout-online/RoutineDetail.module.css#L24) `.tag, .weekdays > span` | `color var(--text-primary)` | — |
| [29](../../src/features/workout-online/RoutineDetail.module.css#L29) `.tag` | `font-size 10px` | `margin-block 2px` · `padding 2px 8px` |
| [32](../../src/features/workout-online/RoutineDetail.module.css#L32) `.groupHeading h2` | `color var(--accent)` · `font-size 13px` · `font-weight 700` | `margin 0` |
| [33](../../src/features/workout-online/RoutineDetail.module.css#L33) `.groupHeading > span` | `color var(--text-muted)` · `font-size 12px` | — |
| [35](../../src/features/workout-online/RoutineDetail.module.css#L35) `.exerciseHeading` | `font-size 17px` · `line-height 1.4` | `align-items baseline` · `gap 8px` · `margin 0` |
| [36](../../src/features/workout-online/RoutineDetail.module.css#L36) `.number` | `color var(--accent)` · `font-size 13px` · `font-variant-numeric tabular-nums` | — |
| [37](../../src/features/workout-online/RoutineDetail.module.css#L37) `.truncate` | `text-overflow ellipsis` · `white-space nowrap` | — |
| [38](../../src/features/workout-online/RoutineDetail.module.css#L38) `.metadata` | `color var(--text-muted)` · `font-size 12px` | `align-items baseline` · `gap 8px` |
| [39](../../src/features/workout-online/RoutineDetail.module.css#L39) `.metadata > span` | `overflow-wrap anywhere` | — |
| [40](../../src/features/workout-online/RoutineDetail.module.css#L40) `.metadata > span + span` | `font-size 10px` · `text-align end` | — |
| [41](../../src/features/workout-online/RoutineDetail.module.css#L41) `.metrics` | `text-align center` | `margin 6px 0 0` · `padding-top 16px` |
| [51](../../src/features/workout-online/RoutineDetail.module.css#L51) `.metrics dt` | `color var(--text-muted)` · `font-size 10px` · `font-weight 400` | — |
| [52](../../src/features/workout-online/RoutineDetail.module.css#L52) `.summary dt` | `font-size 12px` | — |
| [53](../../src/features/workout-online/RoutineDetail.module.css#L53) `.metrics dd` | `overflow-wrap anywhere` · `font-size 18px` · `font-weight 700` · `line-height 1.3` · `font-variant-numeric tabular-nums` | `margin 0` |
| [54](../../src/features/workout-online/RoutineDetail.module.css#L54) `.metrics dd small` | `color var(--text-muted)` · `font-size 10px` · `font-weight 400` · `white-space nowrap` | — |
| [55](../../src/features/workout-online/RoutineDetail.module.css#L55) `.metrics dd[data-missing]` | `color var(--text-muted)` | — |
| [57](../../src/features/workout-online/RoutineDetail.module.css#L57) `.memo` | `font-size 12px` | `align-items baseline` · `gap 8px` · `margin 0` · `padding 8px` |
| [58](../../src/features/workout-online/RoutineDetail.module.css#L58) `.memo svg` | `color var(--text-muted)` | `align-self flex-start` · `margin-top 2px` |
| [59](../../src/features/workout-online/RoutineDetail.module.css#L59) `.memo span` | `overflow-wrap anywhere` · `white-space pre-wrap` | — |
| [60](../../src/features/workout-online/RoutineDetail.module.css#L60) `.memo small` | `color var(--text-muted)` · `font-size 10px` | — |
| [62](../../src/features/workout-online/RoutineDetail.module.css#L62) `.schedule li` | `font-size 14px` | `grid-template-columns auto minmax(0, 1fr) auto` · `align-items center` · `gap 8px` · `min-height 32px` |
| [65](../../src/features/workout-online/RoutineDetail.module.css#L65) `.weekdays > span` | `font-size 11px` | — |
| [66](../../src/features/workout-online/RoutineDetail.module.css#L66) `.empty` | `color var(--text-muted)` · `font-size 12px` | `margin 0` · `padding 8px 4px` |
| [68](../../src/features/workout-online/RoutineDetail.module.css#L68) `.actions .delete` | `font-size 14px` | `align-items center` · `gap 8px` |

### [features/workout-online/RoutineEdit.module.css](../../src/features/workout-online/RoutineEdit.module.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [7](../../src/features/workout-online/RoutineEdit.module.css#L7) `.form:global(.online-routine) :is(input:not([type='checkbox']), textarea)` | `font-size 16px` | — |
| [20](../../src/features/workout-online/RoutineEdit.module.css#L20) `.form .group` | `color var(--accent)` · `font-size 14px` | `align-items baseline` · `gap 8px` · `margin 8px 0 0` · `padding-inline 4px` |
| [24](../../src/features/workout-online/RoutineEdit.module.css#L24) `.group small` | `color var(--text-muted)` · `font-size var(--font-metadata)` · `font-weight 400` | — |
| [28](../../src/features/workout-online/RoutineEdit.module.css#L28) `.form > fieldset` | — | `gap var(--card-gap)` |
| [30](../../src/features/workout-online/RoutineEdit.module.css#L30) `.exerciseHeading > b` | `color var(--accent)` · `font-size 13px` · `font-variant-numeric tabular-nums` | — |
| [32](../../src/features/workout-online/RoutineEdit.module.css#L32) `.exerciseHeading .exerciseName h3` | `text-overflow ellipsis` · `white-space nowrap` · `font-size 17px` · `line-height 1.4` | `margin 0` |
| [33](../../src/features/workout-online/RoutineEdit.module.css#L33) `.exerciseName small` | `color var(--text-muted)` · `font-size 12px` · `overflow-wrap anywhere` | — |
| [39](../../src/features/workout-online/RoutineEdit.module.css#L39) `.form .exercise label` | — | `gap 4px` · `min-width 0` · `margin 0` |
| [45](../../src/features/workout-online/RoutineEdit.module.css#L45) `.weight > div:first-child > span`<br>[70](../../src/features/workout-online/RoutineEdit.module.css#L70) `.restore` | `color var(--text-muted)` · `font-size 12px` | — |
| [46](../../src/features/workout-online/RoutineEdit.module.css#L46) `.weight > div:first-child > small` | `color var(--text-muted)` · `font-size var(--font-metadata)` | — |
| [48](../../src/features/workout-online/RoutineEdit.module.css#L48) `.form .exerciseActions button` | `color var(--text-primary)` · `font-size 13px` | `min-width 0` · `padding 4px 8px` |
| [52](../../src/features/workout-online/RoutineEdit.module.css#L52) `.form .exerciseActions button:disabled` | `color var(--text-muted)` · `opacity .45` | — |
| [53](../../src/features/workout-online/RoutineEdit.module.css#L53) `.form .exerciseActions button:global(.danger)` | `color var(--status-danger-text)` | `margin-inline-start auto` |
| [56](../../src/features/workout-online/RoutineEdit.module.css#L56) `.exerciseHeading > button.cardAction, .form .exercise .cardAction` | `font-size 12px` | `align-items center` · `gap 5px` · `width 78px` · `height 32px` · `min-height 32px` · `padding 0 6px` |
| [64](../../src/features/workout-online/RoutineEdit.module.css#L64) `.create .emptyList` | `color var(--text-muted)` · `text-align center` · `font-size 13px` | `min-height 78px` · `padding 8px` · `gap 4px` |
| [69](../../src/features/workout-online/RoutineEdit.module.css#L69) `.emptyList svg` | `color color-mix(in srgb, var(--accent), var(--text-muted))` | — |
| [73](../../src/features/workout-online/RoutineEdit.module.css#L73) `.footer` | — | `inset auto 0 0` · `width min(100%, 520px)` · `margin-inline auto` · `grid-template-columns repeat(2, minmax(0, 1fr))` · `gap 8px` · `padding var(--save-padding) 12px calc(var(--save-padding) + env(safe-area-inset-bottom))` |
| [79](../../src/features/workout-online/RoutineEdit.module.css#L79) `.form .footer button` | — | `min-width 0` · `min-height var(--save-height)` |

### [index.css](../../src/index.css)

| 선택자 및 조건 | 글자·색·줄바꿈 | 관련 간격·정렬·치수 |
| --- | --- | --- |
| [1](../../src/index.css#L1) `:root` | `--font-family-app -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif` · `font-family var(--font-family-app)` · `color #f5f7fa` · `font-synthesis none` · `text-rendering optimizeLegibility` · `-webkit-font-smoothing antialiased` · `line-height 1.6` · `font-variant-numeric tabular-nums` · `--muted #a8b3c2` | — |
| [6](../../src/index.css#L6) `button, input, textarea, select` | `font inherit` | — |
| [11](../../src/index.css#L11) `button:disabled` | `opacity .42` | — |
| [12](../../src/index.css#L12) `button[data-button-pending]:disabled` | `opacity 1` | — |
| [28](../../src/index.css#L28) `p, h1, h2, h3` | `overflow-wrap anywhere` | `margin 0` |
| [29](../../src/index.css#L29) `h1` | `font-size 1.9rem` · `line-height 1.35` · `font-weight 750` · `letter-spacing -.045em` | `margin 7px 0 12px` |
| [30](../../src/index.css#L30) `h2` | `font-size 1.12rem` · `line-height 1.5` · `letter-spacing -.025em` | — |
| [31](../../src/index.css#L31) `small` | `font-size .75rem` · `font-weight 400` | — |
| [32](../../src/index.css#L32) `button` | `color #f5f7fa` · `font-weight 650` | `min-height 44px` · `padding 10px 15px` |
| [34](../../src/index.css#L34) `input, textarea, select` | `color #f5f7fa` · `font-size 16px` | `min-height 48px` · `padding 10px 12px` |
| [35](../../src/index.css#L35) `input::placeholder, textarea::placeholder` | `color #8996a7` | — |
| [37](../../src/index.css#L37) `label` | `color #c3cbd8` · `font-size .82rem` · `font-weight 550` | `gap 8px` |
| [38](../../src/index.css#L38) `.sr-only` | `white-space nowrap` | `padding 0` · `margin -1px` |
| [40](../../src/index.css#L40) `button[data-close-text]` | `color var(--status-danger-text,#F0B7BF)` | — |
