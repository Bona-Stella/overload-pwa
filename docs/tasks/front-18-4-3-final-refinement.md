# FRONT 18 — 4-3 최종 추가 보완

2026-11-25 · 기존 4173 검수 게이트웨이 반영

## 변경 전후 계측

표의 수치는 Chrome 393px 기준 CSS px이다. 화면·상태별 원본과 320·375·393·430·1280px 비교를 보존했다. [비교 요약과 프레임 수](evidence/front-18-4-3-final/comparison.json) · [격리 Preview 전](evidence/front-18-4-3-final/before/measurements.json) · [격리 Preview 후](evidence/front-18-4-3-final/after/measurements.json) · [실제 앱 전](evidence/front-18-4-3-final/live-before/measurements.json) · [실제 앱 후](evidence/front-18-4-3-final/live-after/measurements.json)

| 작업 항목 | 실제 원인 | 변경 전 | 변경 후 | 적용 범위 | 검증 결과 |
| --- | --- | --- | --- | --- | --- |
| 중량 권고 높이 | 별도 64px 최소 높이와 상하 10px 패딩. 닫기 버튼을 포함해 66px 렌더링 | 권고 66, 운동 시작 50 | 권고와 운동 시작 50, 기존 간격 6. 닫기 조작 44 | 운동 푸터의 증량·감량 권고, 이전 기준 기록과 현재 판정 | 합성 `85kg → 90kg` 표본의 렌더링이 다섯 폭 모두 50px. 직전 CSS 수치 재현과 최종 컴포넌트 비교. [전 · 계측](evidence/front-18-4-3-final/recommendation-before/measurements.json) · [후 · 계측](evidence/front-18-4-3-final/recommendation-after/measurements.json) |
| 운동 버튼 전환 | 전역 `:hover` 밝기 1.13이 움직이지 않은 포인터 아래의 다음 액션에 적용. `1002370`의 예외는 휴식 종료와 일부 세트 완료에만 적용 | 종목 시작 후 첫 세트, 휴식 종료 후 다음 세트에 마우스 이동 없이 밝기 1.13 | 교체된 버튼의 필터 `none`. 의도적인 마우스 이동 시 기존 hover 표시 | `WorkoutFrame`의 고정 푸터 액션. 시작·휴식·세트 완료 및 다른 동작으로 교체되는 행 | Chrome 입력 이벤트로 시작→1세트→휴식→2세트→휴식을 실행. 전환 8개의 각 201~203프레임에서 배경·불투명도·하단 좌표·50px 높이 및 푸터 외곽 유지. [전](evidence/front-18-4-3-final/before/measurements.json) · [후](evidence/front-18-4-3-final/after/measurements.json) |
| 종목명과 보조 버튼 | 제목의 위 7px, 아래 4px 마진이 flex 가운데 정렬에 포함 | 제목과 캡슐 중심 차이 1.5 | 중심 차이 0, 캡슐 30, 조작 높이 48 | 웨이트 종목명 행. WEIGHT 라벨과 근육 설명은 별도 행 | 다섯 폭에서 실측. 루틴 상세와 휴식 설정도 제목·설명 그룹, 캡슐 및 조작 영역 중심 일치. [종목 전 · 계측](evidence/front-18-4-3-final/before/measurements.json) · [종목 후 · 계측](evidence/front-18-4-3-final/after/measurements.json) · [루틴 전 · 계측](evidence/front-18-4-3-final/before/measurements.json) · [루틴 후 · 계측](evidence/front-18-4-3-final/after/measurements.json) · [휴식 전 · 계측](evidence/front-18-4-3-final/before/measurements.json) · [휴식 후 · 계측](evidence/front-18-4-3-final/after/measurements.json) |
| 메시지형 Dialog | flex 항목의 테두리 두께와 패딩이 서로 달라 외곽 너비에도 차이가 남음 | 운동 종료 확인 157×48, 141×48 | 각각 149×48, 간격 8 | 공통 `Dialog`의 가로 두 액션 행. 운동 종료, 삭제·폐기, 저장·일정 변경, 복구·재확인 및 인계 확인 계열 | 340px 상한, 반경 5px, 설명 아래 20px, 중립 2px 테두리와 의미별 색상 보존. [전](evidence/front-18-4-3-final/before/workout-dialog.png) · [후](evidence/front-18-4-3-final/after/workout-dialog.png) |
| 설정 행 구분선 | 두 행 사이의 Toast 접근성 상태 노드가 인접 선택자 `.row + .row`를 끊음 | 운동 종목 보기 위 구분선 0 | 기존 `#353941` 1px, 행 높이 64 및 좌우 경계 동일 | 설정 메인 운동 설정 카드의 인접 행. Toast는 카드 다음에 위치 | 실제 앱에서 자동 추정과 종목 보기 사이 실측. [전 · 계측](evidence/front-18-4-3-final/live-before/measurements.json) · [후 · 계측](evidence/front-18-4-3-final/live-after/measurements.json) |
| 앱 설치 카드 | 전역 `.card`의 18px과 설정 선택자의 우선순위가 같아 실제 앱의 CSS 로딩 순서에서 전역 값이 적용 | 모서리 18px, 테두리 1px, 배경 `#1B1D22` | 모서리 5px, 테두리 `1px solid #353941`, 배경 `#1B1D22` | 설정의 설치·오프라인 준비 `details` | 접힘과 펼침 모두 공통 외곽과 좌우 경계 유지. [접힘 전](evidence/front-18-4-3-final/live-before/install-closed.png) · [후](evidence/front-18-4-3-final/live-after/install-closed.png) · [펼침 전 · 계측](evidence/front-18-4-3-final/live-before/measurements.json) · [후 · 계측](evidence/front-18-4-3-final/live-after/measurements.json) |
| 루틴 요일 선택 | 루틴의 선택은 자체 사각 테두리에 의존 | 선택 테두리 사각 | 홈과 같은 2px Dusty Blue, 999px 반경의 외곽 | 루틴 가로 타일·세로 행의 선택 표시와 홈 날짜의 공통 외곽 규칙 | 320px에서 7개 타일이 콘텐츠 안에 표시됨. 실제 홈의 오늘 2px와 다른 날짜 선택 시 오늘 1px·선택 날짜 2px 확인. [루틴 전 · 계측](evidence/front-18-4-3-final/live-before/measurements.json) · [후 · 계측](evidence/front-18-4-3-final/live-after/measurements.json) · [홈 선택 후](evidence/front-18-4-3-final/live-after/home-selected.png) |
| 새 루틴 | 일반 캡슐형 클래스 누락 및 설명이 버튼 행 바깥에 위치 | 반경 10, 약 96.31×48 | 반경 999, 약 96.31×48 | 루틴 강조 헤더의 `+ 새 루틴` | 제목·설명 그룹 중심에 정렬하고 기존 배경과 조작을 유지. [전 · 계측](evidence/front-18-4-3-final/live-before/measurements.json) · [후 · 계측](evidence/front-18-4-3-final/live-after/measurements.json) |
| 일정 번호와 추가 | 일반 버튼 규칙이 50% 반경과 44px 높이를 덮음 | 실제 앱 44×48, 반경 10 | 44×44, 반경 50%, 간격 5 | 주간 일정 프리셋의 모든 번호와 추가 버튼 | 실제 앱 다섯 폭에서 정원, Dusty Blue 선택과 비선택 색상 및 가로 넘침 확인. [전 · 계측](evidence/front-18-4-3-final/live-before/measurements.json) · [후 · 계측](evidence/front-18-4-3-final/live-after/measurements.json) |

## 운동 전환과 데이터 보호

- `4bad8dd`의 지연 로딩 표시와 `1002370`의 완료·휴식 중복 방지 흐름을 유지했다. 푸터에서 실제 `pointerType=mouse` 이동이 현재 버튼에 도달한 경우에만 hover 밝기를 적용하고, 포인터가 떠나거나 같은 DOM의 문구가 다음 동작으로 바뀔 때 이를 해제한다. 버튼 재마운트에 의존하지 않아 기존 키보드 포커스와 네이티브 비활성화가 유지된다.
- Chrome 터치 에뮬레이션에서는 변경 전에도 측정한 구간에서 밝기 변화가 없었다. 마우스에서는 일부 진입에서 밝기가 다음 액션까지 남았고 변경 후의 새 액션에서는 사라졌다. 기존 전역 탭 하이라이트 억제와 키보드 포커스는 유지했다. 실제 iPhone Safari에서 보고된 순간 어두워짐의 재현 여부는 실기기에서 확인해야 한다.
- 휴식 임박의 `다음 세트 준비` 안내는 이미 같은 50px 토큰을 쓴다. 저장 상태 재확인과 지원용 Toast는 각각 고유 표시를 유지한다. 85kg 등 일반 안내는 50px이며 예외적으로 긴 중량은 두 문구를 표시할 공간만큼 안내 행이 커질 수 있다.
- 4173 전용 검수 계정의 활성 운동이 0건임을 확인한 뒤 기존 `[연결 확인 전용] 운동 API` 루틴으로 실제 START `201`, 세트 snapshot `200`, 일반 휴식 진입과 종료·다음 세트를 확인했다. 일반 휴식은 180초 설정으로 계측 시점에 2분 59초였다. 이번 실행에서 만든 세션만 종료 `200` 및 앱의 기록 삭제 계약 `200`으로 정리했고 활성 운동은 다시 0건이었다. [실제 서버 응답 및 프레임](evidence/front-18-4-3-final/live-workout/measurements.json)

## 공통 컴포넌트와 기존 규격

- 제목·액션은 기존 `RecordSubpageHeader`의 grid, 휴식 설정 헤더의 정렬 grid 및 공통 `Button`의 내부 가운데 정렬을 재사용했다. 계정 설정의 항목 행, 로그인 기기, 루틴 편집의 종목 제목 및 액션, 기록 상단과 요약, 운동 분석·통계 제목 행의 CSS 배치도 점검했다. 제목 글자 크기, 소형 캡슐 규격, 각 행의 기존 높이와 옵션을 유지했다.
- 공통 메시지 모달의 가로 액션에만 균등 열을 적용했다. 한 버튼 전체폭과 기존 세로 액션은 해당 레이아웃을 유지한다. 숫자 휠과 기능형 입력 Dialog는 메시지형 모달과 별도의 스타일을 사용한다.
- 기본 카드 모서리 5px, 패딩 12px, 배경과 테두리, 8/12/16/20px 간격, 강조 카드 그라데이션을 유지했다. 홈의 오늘 강조와 선택 상세, 루틴 일정의 데이터·편집·전환 동작도 기존 흐름을 사용한다. 기존 보고서 세 개와 검수 자료를 포함한 83개 파일은 SHA-256이 일치한다.

## 자동 검사 및 검수 환경

- 최종 FRONT 전체 회귀 **728/728 통과**. 공통 UI와 FRONT 18 Preview의 메시지 모달, 카드, Toast와 조회 지연, 격리 홈·루틴·운동의 일정 전환, 운동 제목·권고 경계, 휴식 전환과 중복 입력 보호를 포함했다. 중량 안내의 이전 64px 하한 기대값을 현재 50px 규격으로 갱신하고, 마우스 이동에 따른 hover와 교체된 버튼의 외형을 검증하도록 보완했다.
- TypeScript, 전체 `npm run lint`, `eslint src tests`, 운영 빌드와 4173 검수 빌드, `git diff --check`를 통과했다. 운영 배포와 Service Worker 사전 캐시의 Preview 항목은 0개이며 공개 자산 32개의 SHA-256이 일치했다. 기존 PostCSS `from` 옵션과 Vite 500kB 초과 청크 경고가 남아 있다.
- 계정·데이터 세대·오프라인·늦은 응답 보호 집중 검사는 27/27 통과했다. 기존 휴식 테스트 ON 12초와 OFF 일반 180초 및 효과음 경로는 격리 Chrome에서 확인했다.
- [실제 앱](http://127.0.0.1:4173/) · [공통 UI Preview](http://127.0.0.1:4173/common-ui-preview.html) · [FRONT 18 Preview](http://127.0.0.1:4173/common-ui-preview.html?front18=1)

4173 검수 환경은 사용자 확인용으로 유지한다. iPhone Safari와 설치형 PWA는 실기기 검증 대기 상태다. 백엔드 소스·API 계약·DB 스키마와 기존 작업 트리 및 스테이징을 보존했다. Git 커밋·Push와 공식 디자인 문서 갱신은 사용자 승인 단계에 남겨 뒀다.
