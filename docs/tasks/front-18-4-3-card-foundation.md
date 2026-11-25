# FRONT 18 · 4-3 공통 카드 모듈 및 디자인 규격 적용

2026-11-25 · FRONT 기준 `5bd76e3` · 승인 범위 4-2 규격의 대표 서비스 적용

## 구현 결과

- 4-1의 **78개** 카드 사용처를 모두 소스에서 확인했다. 직접 적용은 **42개**, 공통 `Card`의 기본값으로 반영된 곳은 **5개**다. 기존 규격과 일치한 **2개**, 전용 규격을 보존한 **22개**, 추가 적용 후보 **7개**를 아래 표에서 확인할 수 있다. 집계 단위는 화면·상태의 반복 인스턴스를 묶은 4-1 표 행이다.
- 일반 카드의 공통 외곽을 **Onyx `#1B1D22`, `1px solid #353941`, 5px, 12px 패딩**으로 지정했다. 루틴 주간 일정과 순환 그룹은 기존 `Card`를 사용한다. 루틴 목록·폼과 기록 버튼은 동일 외곽 클래스를 재사용하고 콘텐츠 구조는 각 기능에서 관리한다.
- 카드 크기는 부모 가용 폭과 콘텐츠로 결정한다. 외부 간격은 부모 컨테이너의 gap을 사용한다. 주간 일정 전체 편집은 두 그룹의 카드 margin을 없애 **54→12px**로 조정했다.
- 홈 선택 날짜 상세와 성장 추적의 최신 공식 승인 중량은 기존 배경색으로 위계를 유지하고 중첩 외곽선 한 겹을 걷었다. 선택 날짜 버튼 경계와 성장 요약 안의 행 구분선은 유지했다.
- 기존 카드 기본 스타일은 기능별 재정의가 우선하도록 구성했다. 공통 변경의 첫 검증에서 카탈로그 목록의 flex 배치와 웨이트 세트 표 패딩에 회귀가 발견됐다. `:where()`로 공통 스타일 우선순위를 낮추고 기록 버튼에는 5px 경계를 명시해 테마 버튼 값이 덮어쓰지 않도록 수정했다.
- 4-1 원본의 보고서·계측값·스크린샷을 지문으로 대조했다. 정식 제품 문서는 최종 승인 대기 상태다. [4-1 기준 자료](front-18-4-1-card-audit.md) · [공통 Card](../../src/components/ui.tsx#L26) · [공통 외곽](../../src/components/ui.module.css#L9) · [Onyx 토큰](../../src/app/theme.module.css)

## 공통 규격

| 유형 | 적용 규격 | 적용 및 예외 |
| --- | --- | --- |
| 기본 | 5px · 12px · 일반 그룹 12px | Onyx 표면·1px 일반선. 설정 메뉴처럼 행이 세로 여백을 가지면 카드 상하 0 |
| 강조 | 5px · 16px 12px · 일반 그룹 12px | 기존 hero 색·그라데이션·테두리와 디로딩 테마. 운동 요약의 압축 상단 유지 |
| 목록 | 5px · 12px 또는 10px 12px · 반복 8px | 루틴·최근·전체 이력의 템플릿과 자연 높이 유지 |
| 중첩 | 5px · 8–12px · 반복 8px 또는 본문 12px | 보조 정보는 배경으로 구분. 선택·입력의 경계와 내부 구분선 유지 |
| 통계 | 5px · 14px 12px · 독립 16px | 가로 타일 8px. 좁은 폭의 분석 패딩, 기록 주간 요약 패딩과 차트 하한 유지 |
| 입력 | 5px · 일반 12px · 입력 그룹 12px | 화면에 필요한 열·행·고정 저장 영역 및 버튼/입력 자체 규격 유지 |
| 특수 목적 | 기존 외곽·패딩·간격 | 준비운동·진행 중량·세트 표·유산소·프레임·기능형 Dialog 및 미디어 |
| 상태 표시 | 독립 외곽 5px · 기존 패딩과 하한 | embedded 배경·테두리 없음. skeleton, 새로고침, Toast, 기존 데이터·스크롤 보호 |

테마의 기존 `--surface-card`, `--border-card`, `--radius-card-compact`, hero 색을 재사용했다. `--card-padding`(12), `--card-padding-compact`(10/12), `--card-padding-hero`(16/12), `--card-padding-statistics`(14/12)을 추가했다. `--card-gap-dense`(8), `--card-gap`(12), `--card-gap-independent`(16), `--card-gap-section`(20), `--card-gap-title`(4)은 호출부 배치와 내부 정보 그룹에 적용한다. `--space-card` 18/14와 `--radius-card` 18은 이전 전용 경로에서 사용하며, `--card-padding-override`는 진행 운동과 기능형 Dialog 콘텐츠에 기존 간격을 공급한다. 기능형 모달 안의 카드에는 반경 예외도 전달한다. 기존 `.card`의 적용 범위에는 인증·복구·Demo가 포함된다. [테마](../../src/app/theme.module.css) · [운동 프레임](../../src/features/workout-flow/WorkoutFlow.module.css)

## 4-1 사용처별 적용 추적

기존 패딩의 `V`는 당시 일반 카드의 18px, 374px 이하 14px이다. 아래 검증 열의 영문 표본명은 [Chrome 원시 계측 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3)의 표본 키다. ‘소스’는 해당 사용처의 직접 렌더링 계측이 미검증임을 뜻한다. 회귀 검사는 해당 기능 동작을 렌더링한 범위다.

| 4-1 번호 · 화면 및 카드 | 카드 유형 | 기존 규격과 특이점 | 적용 규격 | 방식 | 검증 근거 |
| --- | --- | --- | --- | --- | --- |
| 01 · A01 오늘의 루틴·진행 중인 운동 | 강조 | 5 H, 패딩 16/13/16/13, 홈 13 | 5px · 16/12/16/12 · 홈 12 | 직접 적용 | home-today · home-active |
| 02 · A01 이번 주 일정 | 기본 | 5 S, 패딩 13, 홈 13 | 5px · 12 · 홈 12 | 직접 적용 | home-week · 실제 홈 |
| 03 · A01 선택 날짜 상세 | 중첩 | 0 I, 패딩 10, 요일 아래 8 margin | 5px · 10 · 위 8 · 입력 배경, 외곽선 제거 | 직접 적용 | home-week |
| 04 · A01 홈 최근 운동 항목 | 목록 | 5 S, 패딩 10, 최근 목록 7 | 5px · 10/12 · 반복 8 | 직접 적용 | home-today |
| 05 · A02 오프라인 운동 이어가기 제안 | 특수 | 18 S, 패딩 21, 위아래 margin 18 + 상위 stack | 18px · 21 · 복원 안내 배치 | 보호 대상 | 소스 |
| 06 · B01 나의 루틴 헤더 | 강조 | 5 H (일반선), 패딩 16/14/16/14, 목록 13 | 5px · 16/12 · 루틴 목록 gap 12, 강조 배경·기존 일반선 | 직접 적용 | 소스 · 실제 루틴 |
| 07 · B01 이번 주 일정 | 기본 | 5 S, 패딩 13, 목록 13 | 공통 Card · 5px · 12 · 외부 12, 목록 모드 유지 | 직접 적용 | routine-week · 실제 루틴 |
| 08 · B01 저장된 루틴 항목 | 목록 | 5 S/H, 패딩 10/12/10/12, 카드 목록 9 | 공통 외곽 · 5px · 압축 10/12 · 항목 gap 8 | 직접 적용 | routine-list · 실제 루틴 |
| 09 · B01 새 루틴 일정 배정 제안 | 기본 | 18 S, 패딩 21, 위아래 margin 18 + 상위 stack | 18px · 21 · 전역 margin 경로. 제안 표면 이관 후보 | 4-4 후속 대상 | 소스 |
| 10 · B02 루틴 요약 | 강조 | 5 H, 패딩 12, 화면 20 | 5px · 16/12 · 본문 gap 12 · 지표 상단 8 | 직접 적용 | routine-detail |
| 11 · B02 웨이트·유산소 종목 상세 | 목록 | 5 S, 패딩 12, 그룹 10, 그룹 간 20 | 5px · 12 · 기존 10의 종목 그룹과 데이터 표시 | 직접 적용 | routine-detail |
| 12 · B02 주간 일정 배정 상세 | 기본 | 5 S, 패딩 12, 그룹 10 | 5px · 12 · 배정 행과 구분선 유지 | 직접 적용 | routine-detail |
| 13 · B03/B04 이름·태그 입력 컨테이너 | 입력 | 5 S, 패딩 14, 폼 16 | 공통 외곽 · 5px · 12 · 내부 gap 12 | 직접 적용 | routine-create · routine-edit |
| 14 · B03/B04 웨이트·유산소 구성 카드 | 입력 | 5 S, 패딩 12, fieldset 12 | 5px · 12 · 입력 그룹 12, 편집 푸터 고정 | 직접 적용 | routine-edit |
| 15 · B03 새 루틴의 종목 없음 슬롯 | 상태 | 5 S 점선, 패딩 8, fieldset 12 | 5px · 패딩 8 · 최소 78px · 점선 슬롯 | 보호 대상 | routine-create |
| 16 · B03/B04 웨이트 선택·교체 검색 컨테이너 | 입력 | 5 S, 패딩 14, fieldset 12 | 공통 formbox · 5px · 12 · 검색 조작 자체 유지 | 직접 적용 | 소스 |
| 17 · B06 자동 순환 포함·제외 그룹 | 입력 | 18 S, 패딩 21, stack 18 + 각 margin 위/아래 18 | 공통 Card · 5px · 12 · 부모 gap 12 · 카드 margin 0 | 직접 적용 | schedule-order |
| 18 · B07 분류·프리셋 선택 표면 | 입력 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 통계 화면의 조작 셸 · 내부 12 | 직접 적용 | muscle-plan |
| 19 · B07 주간 계획 요약 | 통계 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 · 16 · 수치 2열 유지 | 직접 적용 | muscle-plan |
| 20 · B07 계획 세트 분포 | 통계 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 · 독립 16 | 직접 적용 | muscle-plan |
| 21 · C01 준비운동 시간 | 특수 | 5 H, 패딩 34/V/34/V, 진행 본문 stack | 5px · 상하 34 · 좌우 18 또는 14 | 보호 대상 | workout-warmup |
| 22 · C01 준비운동 안내 | 특수 | 5 S, 패딩 V, 진행 본문 stack | 5px · 18 또는 14 · 준비 정보 | 보호 대상 | workout-warmup |
| 23 · C02 진행 중량·장비·한쪽 원판 | 특수 | 5 H, 패딩 12/V/12/V, 스와이프 본문 14 | 5px · 상하 12 · 좌우 18 또는 14 · 진행 중량 레이아웃 | 보호 대상 | workout-weight |
| 24 · C02 세트 입력·이전 세트 | 특수 | 5 S, 패딩 12/8/12/8, 스와이프 본문 14 | 5px · 상하 12/좌우 8 · 세트 gap 7 · 이전 기록 열 | 보호 대상 | workout-weight · workout-edit · 다섯 폭 회귀 |
| 25 · C02/C03 운동 시계·휴식 상태 / 하단 진행 액션 | 특수 | 0 S/페이지, 패딩 시계 셀 8/4/8/4, 하단 9/페이지좌우/9+Safe Area/페이지좌우, 독립 고정 프레임 | 전폭 고정 · 상단 63px 예시 · 하단 gap 6 · 안전 영역 | 보호 대상 | workout-weight · workout-rest |
| 26 · C03 당시 유산소 계획 | 특수 | 5 S, 패딩 12, 스와이프 본문 12 | 5px · 12 · 3열 당시 계획 | 보호 대상 | workout-cardio |
| 27 · C03 유산소 측정 타이머 | 특수 | 5 T, 패딩 12, 스와이프 본문 12 | 5px · 12 · 타이머 최소 126과 강조색 | 보호 대상 | workout-cardio |
| 28 · C03 유산소 확인 입력 | 입력 | 5 S, 패딩 12, 스와이프 본문 12 | 5px · 12 · 입력·미저장 동작 유지 | 보호 대상 | 소스 · 운동 회귀 |
| 29 · C03 유산소 실제 완료 기록 | 특수 | 5 S, 패딩 12, 진행 stack | 5px · 12 · 기록 행 정보 유지 | 보호 대상 | workout-cardio |
| 30 · C04 이번 운동만 수정 안내·조작 | 입력 | 5 S, 패딩 V, 운동 편집 위치 | 5px · 18 또는 14 · 수정 도구·조작 계속 | 보호 대상 | workout-edit |
| 31 · C04 기구 변경 폼·유산소 재구성 | 입력 | 5 S¹, 패딩 V 또는 12, 진행·기능 Dialog 레이아웃 | 인라인 장비 5px · 기존 공간 · 기능형 Dialog 보존 | 보호 대상 | workout-edit · 기능형 Dialog 회귀 |
| 32 · C05/D03 운동 요약 헤더 | 강조 | 5 H, 패딩 10/12/14/12, 형제 margin 16 | 5px · 상/우/하/좌 10/12/14/12 · compact 요약 | 보호 대상 | record-detail · workout-summary |
| 33 · C05/D03 웨이트·유산소 수행 | 기본 | 5 S, 패딩 14/12/14/12, 형제 margin 16, 검토 인접 10 | 5px · 14/12 · 승인된 요약 행과 좁은 폭 예외 | 보호 대상 | record-detail · workout-summary |
| 34 · C05/D03 과거 중량 검토 접이형·내부 행 | 통계 | 5 S (내용 0선), 패딩 0/12/0/12, 형제 margin 10 | 5px · 상하 0 · 내부 카드 투명/무선 유지 | 보호 대상 | 소스 · 요약 브라우저 회귀 |
| 35 · C05/D03 승인 대기 검토 | 입력 | 5 S, 패딩 8/12/8/12, 형제 margin 16 | 5px · 8/12 · 기록 승인 조작·가드 | 보호 대상 | workout-summary |
| 36 · C05/D03 기록 보존 안내 | 기본 | 5 S, 패딩 14/12/14/12, 형제 margin 16 | 5px · 14/12 · 기록 보존 설명의 기존 위치 | 보호 대상 | record-detail · workout-summary |
| 37 · C06 읽기 전용 세션·기기 인계 | 특수 | 18 S, 패딩 21, margin 18 + 상위 흐름 | 18px · 21 · 세션 인계와 편집권 흐름 | 보호 대상 | 소스 · FRONT 18 회귀 |
| 38 · D01 이번 주 요약 | 통계 | 5 S, 패딩 16/14/14/14, 메인 섹션 22 | 5px · 요약 패딩 예외 16/14/14/14 유지 · 섹션 20 | 직접 적용 | record-main |
| 39 · D01 주간 요약 지표 타일 | 중첩 | 5 I 무선, 패딩 9/8/9/8, 가로 7 | 5px · 타일 간격 7→8 · 3열 최소 높이 유지 | 직접 적용 | record-main |
| 40 · D01 운동 분석 진입 타일 | 목록 | 5 S 투명선, 패딩 12 (320에서 10), 가로·세로 8 | 5px · 2열 타일 gap 8 · 제목/설명 4 · 하한 보존 | 직접 적용 | record-main |
| 41 · D01 기록 탭 최근 운동 항목 | 목록 | 5 S, 패딩 12, 최근 묶음 8 | 5px · 공통 외곽 · 12 · 목록 8 | 직접 적용 | record-main |
| 42 · D02 월·일정/종목 필터 외곽 | 입력 | 5 S, 패딩 14/12/14/12, 전체 이력 stack | 5px · 통계 필터 조합 14/12 · 기간 조작은 투명 | 직접 적용 | record-list-context |
| 43 · D02 전체 운동 이력 항목 | 목록 | 5² S, 패딩 12, 목록 stack 9/13² | 5px · 공통 외곽 · 12 · 항목 8 | 직접 적용 | record-list-context |
| 44 · D04/D06 정정·평가 이력 요약 | 강조 | 18 H, 패딩 V, 상위 summary stack | 18→5px · 강조 16/12 · 정정/평가 메뉴 유지 | 공통 모듈 반영 | record-correction · record-evaluation |
| 45 · D04 완료 수행 컨테이너 | 입력 | 18 S, 패딩 V, 상위 summary stack | 18→5px · 18/14px 가변 기본값→12px | 공통 모듈 반영 | record-correction |
| 46 · D03/D04/D06 변경 결과 미확인·재확인 | 상태 | 18 S, 패딩 V, 해당 본문 stack | 5px · 이전 상태 표면 패딩 18/14 유지 | 직접 적용 | 소스 · FRONT 18 복구 회귀 |
| 47 · D06 공식 평가·변경 이력 | 통계 | 18 S, 패딩 V, 관리 화면 stack | 18→5px · 통계 14/12 · 설명·행 유지 | 직접 적용 | record-evaluation |
| 48 · D04/D06 기록 관리의 승인 확인 필요 | 상태 | 18 S, 패딩 21, summary gap 14 + 카드 margin 18 | 18px · 21 · 기존 승인 결과 재확인 경로 그대로 | 4-4 후속 대상 | 소스 |
| 49 · D04 정정 Dialog 내부 원본 사실 | 입력 | 18 S, 패딩 V, 기능 Dialog stack | 기능형 Dialog 안 카드의 18px · 이전 18/14 패딩 | 보호 대상 | 소스 · 공통 UI 회귀 |
| 50 · E01 기간 선택 외곽 | 입력 | 5 S, 패딩 14/12/14/12, 화면 16 | 공통 Card 기간 외곽 5px · 통계 셸 패딩 14/12 | 직접 적용 | activity |
| 51 · E01 완료 세트·총중량 타일 | 통계 | 5 S, 패딩 14/12/14/12, 가로 8, 제목과 묶음 10 | 5px · 14/12 · 타일 8 · 최소 86 유지 | 직접 적용 | activity |
| 52 · E01 운동량 추이·검색 | 통계 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 · 독립 16 · 차트 220 하한 유지 | 직접 적용 | activity |
| 53 · E01 달성 현황·주간 타일 | 통계 | 5 S, 내부 I, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 · 독립 16 · 날짜 조작 스타일 보존 | 직접 적용 | activity |
| 54 · E01 유산소 현황·상세 | 통계 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 · 독립 16 | 직접 적용 | activity |
| 55 · E02 분석할 운동 검색 | 입력 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 검색 외곽 12 · 본문 gap 12 | 직접 적용 | growth |
| 56 · E02 성장 분석·중량 그래프 | 통계 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 · 독립 16 · 그래프 구조 유지 | 직접 적용 | growth |
| 57 · E02 최신 공식 승인 중량 요약 | 중첩 | 5 A, 패딩 12, 상위 gap 12 | 5px · 12 · 내부 gap 8 · 강조 배경 유지, 중복선 제거 | 직접 적용 | growth |
| 58 · E02 승인 중량 변경 이력 | 목록 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 12 · 기존 이력 행/구분선 | 직접 적용 | growth |
| 59 · E03 기간·보기 방식 컨트롤 | 입력 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 통계 화면의 조작 셸 · 내부 12 | 직접 적용 | muscle-statistics |
| 60 · E03 주간 세트 달성 | 통계 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 · 독립 16 · 달성 수치 구조 | 직접 적용 | muscle-statistics |
| 61 · E03 근육별·분류별 달성 분포 | 통계 | 5 S, 패딩 14/12/14/12, 화면 16 | 5px · 14/12 · 독립 16 · 근육 분포 표시 | 직접 적용 | muscle-statistics |
| 62 · F01 내 계정 요약 | 강조 | 5 H, 패딩 16, 화면 16 | 공통 hero · 5px · 16/12 · 기존 그룹 16 | 직접 적용 | settings-main · 실제 설정 |
| 63 · F01 운동 설정 / 데이터 및 앱 / 계정·데이터 삭제 그룹 | 기본 | 5 S, 패딩 0/12/0/12, 화면 16 | 5px · 세로 0/좌우 12 · 행 자체 패딩과 64px 유지 | 기존 유지 | settings-main · 실제 설정 |
| 64 · F01 앱 설치·오프라인 준비 | 기본 | 5 S, 패딩 0/12/0/12, 이전 그룹과 8 (16−8 margin) | 5px · 세로 0/좌우 12 유지 · 설치 카드 인접 8의 margin 조합 | 4-4 후속 대상 | settings-main · 실제 설정 |
| 65 · F02 내 이메일·인증 / 로그인 수단 / 보안 / 기기 링크 | 입력 | 5 S, 패딩 12, 화면 16 | 5px · 12 · 제목/설명 4, 독립 카드 16 · 기기 링크 세로 0 | 직접 적용 | account |
| 66 · F03 기기 요약 | 통계 | 5 #202630·hero선, 패딩 12, 화면·묶음 12 | 5px · 12 · 기기 요약 통계 패딩 변형 검토 | 4-4 후속 대상 | 소스 |
| 67 · F03 현재 및 다른 기기 항목 | 목록 | 5 S, 패딩 12, 기기 묶음 12 | 5px · 12 · 기존 기기 항목 gap 12, 반복 간격 검토 | 4-4 후속 대상 | 소스 |
| 68 · F04 반복 구간별 휴식 시간 | 입력 | 5 S, 패딩 12, 페이지 14, form 12 | 공통 5px · 12 · 제목–설명 4 · 헤더 구분선 | 직접 적용 | rest-settings · rest-edit · 실제 휴식 설정 |
| 69 · F05 알림 옵션 그룹 | 입력 | 5 S, 패딩 0/12/0/12, 화면 12 | 5px · 상하 0/좌우 12 · 행과 스위치 유지 | 기존 유지 | 소스 · 공통 UI 회귀 |
| 70 · F05 실서비스 알림 시연 표면 | 특수 | 5 S/I, 패딩 10/12/12/12, 화면 12 | 5px · 10/12/12/12 · 실제 알림 시연 구조 | 보호 대상 | 소스 · 휴식 알림 브라우저 회귀 |
| 71 · F06 표준 운동 검색·목록 외곽 | 입력 | 18 S, 패딩 V, 화면 14 | 18→5px · 12 · 카드 내부 12 · 스크롤 컨테이너 유지 | 직접 적용 | catalog · catalog-context |
| 72 · F07 운동 식별·기구/분류 / 주요·보조 근육 | 기본 | 18 S, 패딩 V, 화면 14 | 18→5px · 18/14px 가변 기본값→12px | 공통 모듈 반영 | catalog-detail |
| 73 · F07 자세 미디어 슬롯과 상위 카드 | 특수 | 18 S / 10 I, 패딩 V (미디어 0), 화면 14 | 바깥 18→5px/12 · 안쪽 정사각형 미디어 외곽 유지 | 공통 모듈 반영 | catalog-detail |
| 74 · F07 운동 방법 접이형 | 기본 | 18 S, 패딩 0/V/0/V, 화면 14 | 18→5px · 세로 0/좌우 12 · 접이형 summary | 공통 모듈 반영 | catalog-instructions-expanded |
| 75 · F09 이메일 인증코드 입력 | 입력 | 18 S, 패딩 21, 부모 stack + margin 18 | 18px · 21 · OTP 입력 패널 외곽 정리 후보 | 4-4 후속 대상 | 소스 |
| 76 · F10 로그인 상태 조회 오류(연결 재확인) | 상태 | 18 S, 패딩 21, 부모 stack + margin 18 | 18px · 21 · 로그인 연결 실패 일반 외곽 후보 | 4-4 후속 대상 | 소스 |
| 77 · 공통 독립 EmptyState·조회 오류 | 상태 | 18 S, embedded 투명, 패딩 20/16/20/16, 호출 레이아웃 | 18→5px · 20/16 · 최소 222 · embedded 투명/0선 | 직접 적용 | record-empty · record-error · record-refresh-pending |
| 78 · 공통 초기 로딩 skeleton 묶음 | 상태 | 5 S/I, 패딩 슬롯별 12~14, region 12 | 5px · 슬롯별 높이 유지 · 주간 요약 섹션 gap 20 일치 | 보호 대상 | home-loading · 로딩 회귀 |

## 4-4 추가 적용 목록

- **09** 새 루틴 배정 제안과 **48** 기록 승인 확인 카드의 전역 `.card`을 공통 외곽으로 옮길 때, 삽입 위치와 재확인/나중에 조작의 배치를 확인한다.
- **64** 설정의 앱 설치·오프라인 카드의 인접 8px 배치와 margin 구현을 검토한다. **66–67** 기기 요약 통계형 패딩과 반복 기기 항목 간격을 비교한다.
- **75–76** OTP와 로그인 연결 오류에서 인증 폼, 만료·재요청, 최초 오류 복구를 보존하며 일반 외곽을 적용할 수 있는지 확인한다.
- **05·37·49·70·78**처럼 전용 보호 규칙이 있는 항목은 위 추적표를 기준으로 검수한다. 카탈로그의 헤더 정렬을 유지하는 14px 화면 간격, 통계 카드의 좁은 폭·슬롯 예외, 루틴의 5px 일정 조작 행은 이번 기본값 구현과 별개로 개별 레이아웃을 확인한다.

## 수정 위치

- 공통 기반 및 상태 표면은 [theme.module.css](../../src/app/theme.module.css), [ui.tsx](../../src/components/ui.tsx), [ui.module.css](../../src/components/ui.module.css), [ContentFeedback.module.css](../../src/components/common-ui/ContentFeedback.module.css), [LoadingSkeleton.module.css](../../src/components/LoadingSkeleton.module.css)이다.
- 홈·루틴·일정은 [Home.module.css](../../src/features/home/Home.module.css), [RoutineCards.tsx](../../src/features/workout-online/RoutineCards.tsx), [Routine.module.css](../../src/features/workout-online/Routine.module.css), [RoutineDetail.module.css](../../src/features/workout-online/RoutineDetail.module.css), [RoutineEdit.module.css](../../src/features/workout-online/RoutineEdit.module.css), [PresetOrderEditor.tsx](../../src/features/workout-online/PresetOrderEditor.tsx), [Presets.module.css](../../src/features/workout-online/Presets.module.css)이다.
- 기록과 분석은 [PeriodControls.tsx](../../src/features/statistics/PeriodControls.tsx), [RecordMain.module.css](../../src/features/statistics/RecordMain.module.css), [statistics.css](../../src/features/statistics/statistics.css), [Activity.module.css](../../src/features/statistics/Activity.module.css), [GrowthPanel.tsx](../../src/features/statistics/GrowthPanel.tsx), [Growth.module.css](../../src/features/statistics/Growth.module.css), [WeeklyMusclePlan.module.css](../../src/features/statistics/WeeklyMusclePlan.module.css), [ClosedWorkout.tsx](../../src/features/workout-online/ClosedWorkout.tsx)이다.
- 설정·계정·카탈로그와 운동 보호는 [RestSettings.module.css](../../src/features/settings/RestSettings.module.css), [SettingsMain.tsx](../../src/features/settings/SettingsMain.tsx), [SettingsMain.module.css](../../src/features/settings/SettingsMain.module.css), [AccountSettings.module.css](../../src/features/auth/AccountSettings.module.css), [PublicCatalog.module.css](../../src/features/workout-online/PublicCatalog.module.css), [WorkoutFlow.module.css](../../src/features/workout-flow/WorkoutFlow.module.css)이다.
- 공통 회귀 검사의 실제 Preview에 카드 외곽과 운동 세트 표의 치수를 추가했다. [check-front18-preview.mjs](../../tests/fixtures/review/check-front18-preview.mjs)

## 393px 변경 전후

양쪽 스크린샷은 같은 393px 폭의 동일 검수 시나리오다. 데이터와 검수 패널 높이에 영향을 받는 페이지 전체 y 대신 카드 크기, 카드에 대한 상대 좌표 및 형제의 경계를 비교했다. `x / w`는 일반 카드 좌우 경계와 너비를 뜻한다. 320·375·393·430·1280px의 소스 경계와 브라우저 계산값은 계측 파일에 있다.

| 대표 카드 | 4-1 | 4-3 | 스크린샷 |
| --- | --- | --- | --- |
| 홈 오늘 | 353×285.8 · 16/13 · 5px | 353×285.8 · 16/12 · 5px. 시작 y=333.56 동일 | [전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 홈 주간 일정·날짜 상세 | 353×184.5 · 13px. 날짜 상세 선 1px·반경 0 | 353×181.5 · 12px. 날짜 상세 배경 유지·선 0·반경 5 | [전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 루틴 주간 일정 | 353×511 · 13px · 외부 13 | 353×516 · 12px · 외부 12. 요일 행 터치치수와 선택 스타일 유지 | [전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 루틴 요약 | 353×148.58 · 12px · 지표 앞 gap 20 + 상단 padding 20 | 353×136.58 · 16/12 · gap 12 + 상단 padding 8. 첫 카드 y 동일 | [전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 루틴 목록·전체 운동 이력 | 반복 gap 9 · 압축 10/12 또는 12 | 반복 gap 8 · 두 종류 패딩 및 5px 모서리 유지 | [루틴 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [루틴 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [이력 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [이력 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 일정 전체 편집 | 순환 그룹 18px · 21px · 54px 외부 간격 | 5px · 12px · 실제 간격 12px. 393px 포함 그룹 197.94→167.94px | [전](evidence/front-18-4-1/schedule-order.png) · [후](evidence/front-18-4-3/schedule-order.png) |
| 기록 이번 주 요약과 운동 현황 | 요약 섹션 간격 22 · 분석 카드 14/12 | 요약 섹션 간격 20 · 분석 카드 14/12와 16 간격 유지 | [요약 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [요약 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [현황 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [현황 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 성장의 최신 승인 중량 | 327×144.19 · 외곽선 1px | 327×140.19 · 외곽선 0 · 내부 gap 8 · 강조색 유지 | [전](evidence/front-18-4-1/growth.png) · [후](evidence/front-18-4-3/growth.png) |
| 내 계정·루틴 폼·반복 휴식 | 계정 16px · 편집 정보 폼 14px · 휴식 12px | 계정 16/12 · 편집 정보 폼 12 · 휴식은 읽기 243px/편집 374.19px 및 12px 유지 | [설정 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [설정 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [편집 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [편집 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [휴식 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [휴식 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [휴식 편집 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [휴식 편집 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 표준 운동 목록·상세 | 18px · 목록 패딩 18px · 353×702 | 5px · 목록 패딩 12px · 353×702. 첫 카드 y=364.38 동일, 미디어 비율·스크롤 유지 | [목록 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [목록 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [상세 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [상세 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 기록 정정·독립 빈/오류 | 정정 18px · V 패딩, 독립 빈 상태 18px · 최소 222 | 정정 5px 및 12px, 독립 상태 5px 및 222px 유지 | [정정 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [빈 상태 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |
| 운동의 세트·유산소·고정 푸터 | 세트 353×275.8 · 12/8 · gap 7, 유산소 126px, 휴식 임박 푸터 393×125 | 같은 치수·패딩과 고정 위치 제약. 준비운동 34/18과 운동 종료 요약의 압축 헤더도 동일 | [웨이트 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [웨이트 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [유산소 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [유산소 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [휴식 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [휴식 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [요약 전 · 계측](evidence/front-18-4-1/chrome-card-audit.json) · [요약 후 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) |

보조 스크린샷은 [내 계정 상세 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3)와 [운동 기록 상세](evidence/front-18-4-1/record-detail.png)에 있다. 4-1의 보호 표시 25개 행은 78개 추적표에서 확인했다. 상태 카드처럼 바깥 규격을 적용한 곳도 상태별 열, 저장·확인 조작과 높이 보호를 유지했다.

## 브라우저 검증

### 4173 실제 앱

- 기존 전용 Spring과 4173 게이트웨이에서 루프백 및 LAN Health가 HTTP 200 `UP`이었다. 실행 중인 동일 게이트웨이에 전용 빌드만 갱신했다. 새 Chrome 프로필에서 전용 검수 계정 OTP 로그인을 거쳐 최종 실행에서 홈·루틴·기록·운동 현황·설정·휴식을 다섯 폭에서 확인했다. 앞선 조회 실행에서는 실제 카탈로그와 기존 ACTIVE 상태의 기록 탭도 확인했다. [실제 앱 계측 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3) · [PC 실제 앱](http://127.0.0.1:4173/) · [LAN 실제 앱](http://192.168.0.3:4173/)
- 첫 조회 실행에서는 기존 활성 운동 1건과 기록 탭의 진행 안내를 확인하고 같은 운동을 보존했다. 이후 활성 운동 0건인 상태에서 연결 확인 전용 루틴으로 진행했다. 실제 Spring START **201**, 세트 snapshot **200**, FINISH **200**을 확인했다. 휴식 테스트 **OFF 180초**, **ON 12초**가 실제 운동의 고정 프레임에 표시됐다. 이번 검수에서 생성한 운동만 논리 삭제했으며 최종 ACTIVE는 0건이었다. 실제 운동 저장 확인은 PC 루프백에서 진행했다. 4173은 기존 서버를 유지한다.

### 두 Preview 및 반응형 계측

- 공개된 [공통 UI Preview](http://127.0.0.1:4173/common-ui-preview.html)와 [FRONT 18 Preview](http://127.0.0.1:4173/common-ui-preview.html?front18=1)에서 실제 컴포넌트를 확인했다. 성장·운동 현황·기록과 유산소/휴식의 추가 표본 일부는 기존 격리 Vite 루틴/운동 Preview를 사용했다. 응답은 합성 데이터에 격리했다.
- Chrome 158에서 **38개 경로·상태** 중 32개를 5폭, 6개를 393px에서 확인해 **166개 Preview 레이아웃**을 계측했다. 실제 앱은 별도의 **32개 레이아웃**이다. 393px에서 일반 전폭 카드는 x=20 및 353px였다. 320·375·393·430·1280px의 일반 전폭은 각각 292·335·353·390·478px로 4-1의 셸 경계와 일치했다. 측정 폭에서 문서 가로 넘침은 관찰되지 않았다. [Chrome 계산값 · 원본 보관 위치](front-18-stage-4-evidence-cleanup.md#front-18-4-3)
- 정상, 홈 최초 로딩, 홈과 기록의 기존 데이터 재조회, 빈 상태·실패·새로고침 대기, 요일 세로 보기, 루틴 편집, 휴식 읽기/편집, 카탈로그 접이형, 긴 루틴 목록, 운동 진행·편집 및 종료 요약을 확인했다. 홈 조회 실패, 최근 기록 재조회 대기에서는 기존 카드의 전체 좌표가 유지됐다. 빈 상태와 실패·새로고침 대기는 같은 222px 높이를 사용했다. 긴 제목과 사용자 입력 전체 조합, iPhone Safari 및 설치형 PWA 실기기는 미검증이다.

## 자동 검사와 산출물 확인

| 검사 | 결과 |
| --- | --- |
| 전체 FRONT | 수정과 재검사 후 **728/728 통과**. 첫 실행에서 카탈로그 가로 넘침과 좁은 폭 전환이 각각 실패했고, 공통 CSS 우선순위를 수정한 뒤 두 집중 회귀와 전체 검사를 다시 실행했다. |
| 공통 카드·공통 UI | 실제 공개 Preview의 일반 표면 패딩·선·반경, FRONT 18의 휴식 설정 읽기/편집, 5개 폭의 세트 표 12/8 패딩과 7px 내부 gap 검사를 추가했다. 기존 Toast·Dialog, 반시계 새로고침, 검수용 2.7초 지연과 데이터 복구 시나리오도 전체 통과에 포함됐다. |
| 휴식·데이터 보호 | 격리 브라우저에서 테스트 ON 12초, OFF 일반 180초, 기존 종료 시각·연장·저장과 알림 처리 검사를 통과했다. 계정·데이터 세대·늦은 응답·오프라인 보호 집중 검사 **27/27**도 통과했다. |
| TypeScript·ESLint | `npm run build`의 `tsc -b`, 전체 `npm run lint`, 최종 변경 후 `eslint src tests` 통과. |
| 프로덕션 및 검수 빌드 | 프로덕션과 4173의 실제 앱·Preview 검수 빌드 통과. 운영 파일 및 Service Worker 사전 캐시에서 Preview 파일 0개, 사전 캐시의 공개 자산 32개 SHA-256 일치. 빌드 출력에는 500kB 초과 청크와 PostCSS `from` 옵션 경고가 있다. |
| Git·문서 및 근거 | `git diff --check`, 78행 번호·열 검증, Markdown 링크와 PNG 파일 확인. 4-1 원본 27개 SHA-256 동일. |

검수용 임시 스크립트와 Chrome 프로필은 정리했다. 빌드·테스트 일회성 로그는 Git 제외 `logs/front18-43-*.log`에 있으며 검수 자료와 별개다. 변경 후 결과는 `docs/tasks/evidence/front-18-4-3/`에 스크린샷 24개와 계측 JSON 2개로 보존한다. 이 자료와 정식 문서 승인 경계는 4-4 및 4-5에도 사용한다.

백엔드 소스·API 계약·DB 스키마와 실제 사용자 데이터는 변경하지 않았다. 4-1 보존 자료, 기존 스테이징, 정식 디자인 문서와 검수 서버를 보존했다. 4-3에서 마감하며 Git 커밋과 Push는 하지 않았다.
