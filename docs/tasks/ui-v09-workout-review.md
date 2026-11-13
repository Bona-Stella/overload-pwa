
# 운동하기 UI 검토

2026-11-13 기준 **운동 UI 1차 승인 완료 · 검토 단계 공식 종료**. 사용자가 실제 iPhone Safari에서 최종 수정 사항의 정상 작동을 확인하고 명시적으로 승인했다. 실제 API 연결은 별도 후속 단계다.

아래 구현·피드백·검증 절은 당시 기록을 보존한다. 당시의 승인 대기·실기기 미검증·서버 실행 표기는 문서 끝의 승인 및 종료 기록으로 갱신하며, 개별 미검증 항목을 새로 검증한 것으로 확대하지 않는다.

## 확인 기준

- Frontend HEAD는 `07531aa`, 직전 구현은 `9c276d5`다.
- Backend HEAD는 `97b76df`, 직전 구현은 `ed70174`다. 시작 시 두 작업 트리는 깨끗했다.
- [현행 UI/UX](../product/ui-ux.md), [Decision Log](../product/Overload_UI_Decision_Log_v0.9.md)의 10.10·10.11·10.17·10.18·10.19절, [v0.9 HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html), [Visual Theme](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)를 적용했다.
- [Frontend 규칙](../engineering/frontend.md), [연동 지침](../engineering/backend-ui-v0.9.md), 양쪽 AGENTS와 Backend 개발·테스트 환경 및 세션·유산소 계약을 확인했다.

## 화면과 상호작용

| 화면 | 검토할 동작 |
| --- | --- |
| HOME-01 | 기존 홈에서 운동 시작, 오늘만 루틴 선택, 휴식일·빈 루틴의 시작 제한, 진행 세션 이어가기, 초기화 |
| WORKOUT-01 | 준비 안내, 세트 기록 없음, 다음 종목, 준비 완료. 유산소 전용 루틴은 유산소 준비로 바로 진입 |
| WORKOUT-02 | 3열 시간 바, 현재 탐색 위치의 누적 구간, 이전·다음·목록, 읽기 전용 장비, 승인·진행 중량, 기존/이번 세트 표, 원형 완료 표시, 완료 취소 확인, 메모 |
| WORKOUT-03 | 중량 ±2.5·휠·직접 입력, 오늘만/진행 중량 변경, 확인·취소. 새 중량의 근거가 없으면 반복 입력은 빈 상태 |
| WORKOUT-04 | 웨이트·유산소별 목록, 현재 종목, 완료 수, 선택 이동, 그룹 내 위/아래 정렬 |
| WORKOUT-05 | 인라인 세트 편집·추가·제외, 종목 추가·교체·제외, 유산소 추가, 제조사·부하 방식의 오늘만 적용 |
| WORKOUT-06 | 기존 표준 운동 검색 행과 아이콘·이름·별칭 검색 재사용, 부위 필터, 선택·취소. 완료 세트가 없는 종목만 교체 |
| CARDIO-01 | 종류·시간·선택 거리·속도/페이스·경사/저항 입력과 검증, 추가·취소 |
| CARDIO-02 | 준비·시작·일시정지·재개·완료 확인, 실제 거리/속도·심박·시간 정정, 완료 취소·기록 확정 |
| RECORD-01 | 시간·완료 세트·볼륨, 원래 계획 대비 수행, 세트별 당시 장비·볼륨, 유산소 계획/실측, 당시 중량 검토 예시, 기록 탭에서 재열기 |

세트 마지막 완료에서는 휴식을 시작하지 않는다. 이전 종목의 마지막 완료 시각을 종목 전환 경과시간의 근거로 유지한다. 수동 탐색으로 타이머를 다시 시작하지 않는다. 휴식은 실제 종료 예정 시각으로 계산하고, 유산소 활동 시간은 일시정지 구간을 제외한다.

모든 종목 완료 뒤 종료 버튼은 곧바로 요약으로 이동한다. 일반 운동을 중간 종료할 때는 미완료 수행을 안내하는 확인창을 제공한다. 디로딩은 미완료 상태에서도 직접 종료할 수 있다.

장비 변경은 이후 완료 세트에 반영한다. 완료 세트의 당시 장비·중량·반복을 보존하며, 완료 취소 확인을 거쳐 입력 상태로 복귀한다. 시작 당시 계획과 현재 적용 구성은 별도로 유지한다. 종목 교체 시 UUID와 장비 조건으로 합성 과거 수행을 조회하고, 기록이 없으면 중량·반복을 비워 둔다.

## 구성과 재사용 경계

- 기존 `AppShell`, `HomeView`, `RecentWorkout`, `SettingsMain`, `Dialog`, `Button`, `Card`, `Help`, `ExerciseSearch`, `EquipmentFields`, `CardioPlanFields`와 Onyx 토큰·원본 운동 아이콘을 재사용한다.
- 기존 `WorkoutWorkspace`, `LocalWorkoutScreen`, `ClosedWorkout`, 구 개발 데모의 세트·중량·타이머 로직을 조사했다. 실제 계정의 Controller·저장소와 결합된 컴포넌트는 독립적인 UI 검토 진입점으로 직접 실행하지 않는다.
- 새 표시 컴포넌트는 [workout-flow](../../src/features/workout-flow/)의 `WorkoutFrame`, `WeightFocus`, `CardioFocus`, `WorkoutSummary`와 운동용 모달이다. 데이터와 콜백을 받으며 인증·저장소·API에 접근하지 않는다.
- [NumberWheel](../../src/components/NumberWheel.tsx)은 초안용 공통 숫자 조작이다. ±, 세로 스냅, 선택 강조와 내부 직접 입력을 제공한다. 빈 값을 열기만 해서는 확정하지 않으며 소수 입력을 2.5kg 격자로 반올림하지 않는다.
- `Dialog`는 중첩 휠을 지원하도록 제목 ID를 개별 생성하고, Escape 전파와 포커스 복귀를 보완했다.
- [WorkoutReview](../../src/review/WorkoutReview.tsx)와 [workout-model](../../src/review/workout-model.ts)이 메모리 상태·조작을 소유한다. [WorkoutRecordReview](../../src/review/WorkoutRecordReview.tsx)가 같은 표시 컴포넌트에 종료 결과를 전달한다.
- 검토 알림 설정은 기존 전체 설정 메뉴에서 접근한다. 화면 깜빡임 ON·5초 전·효과음 ON이 기본이다. 화면 바 반전과 마지막 5초의 탭 내 효과음을 제공한다. reduced-motion에서는 반복 반전을 정적인 테두리로 대체한다.

## 검토 환경

- PC는 [운동 검토 홈](http://127.0.0.1:4173/routine-preview?tab=home&review=workout)에서 시작한다.
- 같은 LAN의 iPhone은 [운동 검토 홈](http://192.168.0.3:4173/routine-preview?tab=home&review=workout)을 사용한다.
- 홈의 검토 상태에서 웨이트+유산소, 웨이트만, 중간 편집 후 이어가기, 휴식일 또는 디로딩 진행 중을 선택한다. 기존 신규·미배정·로딩·조회 실패 시나리오도 유지한다.
- 운동 전 홈의 휴식 검토에서 12초 시연 또는 실제 180/120/90초를 선택한다. 설정 탭의 휴식 타이머 알림에서 화면·시작 시점·효과음을 바꾼다.
- 홈의 검토 초기화나 새로고침으로 다시 시작한다. 합성 시연 날짜는 기존 홈과 같은 2026-11-11이다.
- 검토 서버는 `ui-review` 모드, PID **70244**, 포트 **4173**, LAN **192.168.0.3**으로 실행 중이다. 표준 출력·오류·PID는 Git 제외 `logs/workout-review/`에 있다.
- 최종 UI 승인까지 서버를 유지한다. 일회용 자동 검증 서버와 Chrome 프로필은 종료·정리했다.

## 검증

- `npm test`에서 **565건 통과**, 실패·건너뜀 0건.
- 최종 표시 보완 뒤 운동 모델과 브라우저 회귀 6건을 별도로 재확인했다.
- `npm run lint` 통과.
- `npm run build`에서 TypeScript 검사와 production build 통과. 기존 500kB 초과 chunk 안내는 남아 있다.
- 기존 홈·루틴·설정·카탈로그 브라우저 검증에 전체 운동 흐름 회귀를 추가했다. 중첩 모달 Escape·포커스, 소수 입력, 빈 값 보존, 완료 후 장비 재적용, 휴식 연장·자연 종료·탭 내 효과음, 유산소 정정과 결과 재열기를 확인했다.
- Chrome의 320px·393px 모바일 크기와 1280px PC 화면을 확인했다. 캡처는 Git 제외 `logs/workout-review/`에 보존했다.
- 실제 iPhone Safari·설치형 PWA의 휠 관성·키보드·Safe Area·VoiceOver·음악 동시 재생·화면 잠금/백그라운드는 실기기 검토 대기다.

## 데이터 격리와 후속 연동

자동 브라우저 검증에서 운동 흐름의 **API 요청 0건**, **IndexedDB open/delete 접근 0건**, 새 DB 0개를 확인했다. PC·LAN 양쪽에서 검토 페이지 200과 실제 세션 API 차단 404를 확인했다. 합성 상태는 React 메모리에만 존재한다. Backend·PostgreSQL·보존 DB를 시작하거나 변경하는 단계는 수행하지 않았다.

실제 연동에서는 기존 `WorkoutWorkspace → LocalWorkoutScreen` 진입점이 새 `workout-flow` 표시 컴포넌트를 사용하도록 현재 Controller·스냅샷을 화면 데이터/콜백에 연결해야 한다. START·snapshot·승인 요청/ACK·FINISH·기록 조회, InitialPlan/AppliedPlan, 계정·세대·잠금·IndexedDB 보호를 기존 계약으로 연결하고 별도 통합 검증한다. 검토 상태 모델은 실제 계정 저장 모델로 사용하지 않는다.

기존 계정 화면의 실제 운동·인증·동기화 동작은 현행 경로에 있다. 최종 UI 승인 이후 후속 연동에서 같은 표시 컴포넌트를 적용해 화면 구조를 일치시킨다. 알림 설정의 재실행 후 유지와 iPhone 오디오 검증도 해당 후속 범위다.

제품 정책 충돌로 보류한 구현은 없다. 종목 교체는 10.18.4절의 완료 기록 보호·빈 초기값을 적용했고, 숫자 입력은 10.19절을 반영했다. 휠의 관성·행 간격·선택 반영 시점과 실제 iPhone 동작의 최종 확정은 사용자 검토가 필요하다.

현재 승인 상태는 **사용자 UI 피드백 대기**다. Git 커밋·Push·최종 마감은 별도 지시에 따라 진행한다.

## 1차 웨이트 UI 피드백 반영

2026-11-12 사용자 요청을 기존 와이어프레임·테마보다 우선해 아래 표시와 조작을 수정했다. 운동하기 전체 UI는 계속 검토 중이다.

| 항목 | 반영 결과 |
| --- | --- |
| 1. 시간 영역의 폭·가독성 | 좌우 시간 영역을 넓히고 시간 숫자를 확대했다. 진행바는 가운데 운동 진행 영역에만 둔다. |
| 2. 상단 고정 | 시간 영역을 스크롤 상단에 고정하고 Safe Area를 반영했다. 하단 액션도 유지한다. |
| 3. 상단 내비게이션 | 홈·정확한 가운데 루틴명·종료를 같은 글자 크기와 굵기로 표시한다. 긴 루틴명은 한 줄 말줄임이다. |
| 4. 운동명·종목 이동 | 운동명과 이전·다음 이름을 한 줄 말줄임으로 표시하고 전체 이름을 접근성 레이블·title에 유지한다. 이전·다음의 박스 배경을 제거했다. |
| 5. 진행 중량 카드 | 장비를 카드 오른쪽의 밝은 글자로 옮겼다. 왼쪽에 진행·승인 중량과 작은 보조 중량 변경 버튼을 둔다. |
| 6. 반복·세트 목표 | 현재 적용 구성의 반복 범위와 세트 수를 세트 기록 카드 상단 중앙에 표시한다. |
| 7. 완료 후 스크롤 | 세트 완료 뒤에만 고정 시간 영역의 실제 높이를 측정해 진행 중량 카드를 바로 아래에 배치한다. reduced-motion에서는 즉시 이동한다. |
| 8. 숫자 휠 | 중앙 선택 강조 영역을 고정하고 숫자만 스크롤한다. 숫자를 확대했고 중량 휠의 확인·취소와 직접 입력을 제공한다. 휠 확인은 상위 중량 초안에만 적용한다. |
| 9. 중량 변경 모달 | −2.5·좁은 중량 칸·+2.5의 높이를 맞추고 최종 버튼을 확인으로 줄였다. |
| 10. 세트 표 | 번호·기존 반복·이번 반복·완료 상태만 표시한다. 완료 중량과 당시 장비는 결과 데이터와 종료 요약에 유지한다. |
| 11. 세트 편집 | 반복 입력과 완료 취소 보호를 유지한다. 제외 버튼을 넓히고 마지막 행에 같은 크기의 세트 추가·제외를 둔다. 하단 중복 추가를 없애고 다음 종목 추가로 변경했다. 편집 닫기는 하단 고정 액션이다. |
| 12. 중량 권고 | 증량·감량의 규격·폭·패딩을 통일하고 각각 기존 녹색·노란색 토큰을 적용했다. 판단 로직은 기존 구현을 사용한다. |

Chrome 320px·393px·1280px에서 배치와 캡처를 확인했다. 브라우저 회귀는 상단 고정, 가운데 정렬, 완료 스크롤 위치, 휠 선택 영역의 위치 불변·상위 초안 보존·확인·취소, 마지막 편집 버튼의 동일 크기, 권고의 규격·색상과 종료 결과의 원본 보존을 확인한다. 전체 자동 테스트 565건, Lint, TypeScript 검사와 build를 통과했다. 기존 chunk 크기 안내는 유지된다.

검토 서버 PID 70244와 포트 4173을 재사용했다. iPhone Safari 실기기 검토·전체 UI 최종 승인·실제 API 연결은 대기 상태다.

## 2차 운동하기 UI 피드백 반영

2026-11-12 사용자 요청에 따라 다음 7개 영역을 수정했다. 계속 사용자 피드백 단계로 관리한다.

| 항목 | 반영 결과 |
| --- | --- |
| 1. 준비운동의 다음 운동 | 현재 Mock 계획의 종목명·예정 중량·반복 범위·세트 수·제조사·부하 방식을 표시한다. |
| 2. 최초 진입부터 고정된 상태 바 | 시간 바를 처음부터 화면 상단의 fixed 영역에 두고 실제 높이만큼 본문 공간을 확보한다. 오른쪽은 제목과 값의 두 줄이며 휴식 중 남은 휴식/시간, 비휴식 중 휴식 시간/휴식 없음, 종목 전환 중 이전 종목 완료/완료를 표시한다. 타이머 원본과 전환 시각은 유지한다. |
| 3. 휴식 하단 액션 | 준비 안내와 버튼 행의 전체 폭·좌우 기준을 맞추고 두 버튼의 너비·높이를 통일한다. |
| 4. 중량 카드 | 중량 변경 버튼을 카드 상단 오른쪽 끝에 두고, 장비는 오른쪽 아래에 정렬한다. |
| 5. 웨이트 내비게이션 | 상단에 이전·루틴명·다음과 운동명을 표시한다. 제목 옆의 종목 보기/변경으로 기존 모달을 연다. 운동 종료는 기구 세팅 메모 바로 아래로 이동한다. |
| 6. 종목 순서 미리보기·확정 | 위/아래 이동은 모달 내부의 ID 순서에만 반영한다. 변경하기로 적용하며 목록 닫기·X·Escape는 초안을 폐기한다. 적용 순서로 현재 위치·누적 진행바·이전/다음·목록을 함께 계산한다. |
| 7. 중량 휠 | 상단 X로 선택을 취소한다. 하단은 같은 크기의 직접 입력/확인 두 버튼이다. 휠 확인은 중량 변경 초안에만 반영하며 최종 중량 변경 확인과 구분한다. |

주요 수정 컴포넌트는 `WorkoutFrame`·`Warmup`, `WeightFocus`, `ExerciseList`, `WorkoutReview`, `NumberWheel`과 관련 CSS다. 기존 정렬 함수를 모달 초안 처리로 옮겼다.

브라우저 검증에서 완료 세트가 있는 현재 벤치 프레스를 첫 번째에서 두 번째로 이동했다. 적용 전에는 현재 1/3과 진행바가 유지되며, 적용 후에는 현재 2/3·두 구간 채움·이전/다음 대상이 함께 갱신되고 벤치 프레스와 그 세트·중량·장비 원본은 유지됨을 확인했다. 다시 열기, 다른 종목으로 이동 후 복귀, 순서를 되돌렸을 때 적용 버튼 비활성화, 목록 닫기와 X의 변경 폐기도 확인했다.

전체 자동 테스트 **565건 통과**, 실패·건너뜀 0건이다. Lint·TypeScript·production build·diff 및 내부 문서 링크를 검증했다. 기존 500kB 초과 chunk 안내는 남아 있다. PC 1280px·Chrome 393px·320px 캡처를 확인했으며 실제 iPhone Safari의 Safe Area·터치·키보드·관성은 실기기 검토 대기다. 운동 검토 흐름의 API 요청·IndexedDB 접근은 각각 0건이다.

검토 주소와 서버 PID 70244·4173 포트를 유지한다. 전체 UI 최종 승인과 개발 문서 최종 마감은 대기 상태다.

## 3차 운동하기 UI 피드백 반영

2026-11-12의 사용자 요청으로 다음 다섯 영역을 수정했다. 실제 실행 중인 4173번 검토 서버를 새 Chrome 프로필로 열어 결과를 확인했다.

| 항목 | 반영 결과 |
| --- | --- |
| 1. 상단 여백 | fixed 래퍼 안에 12px + Safe Area 여백을 둔다. 본문 공간과 완료 후 스크롤 계산에도 래퍼의 전체 높이를 사용한다. 최초 표시와 스크롤 후 카드 상단은 Chrome에서 동일한 12px이다. |
| 2. 운동 종료 | 메모 아래 버튼의 글자만 기존 위험 색상 토큰으로 변경했다. 배경·테두리·크기·위치는 유지한다. |
| 3. 드래그 정렬 | 주간 일정 전체 편집의 Pointer Events·pointer capture·삽입 공간 계산을 공통 useDragOrder로 추출하고 기존 핸들과 행 스타일을 재사용했다. 종목 목록의 화살표 버튼을 제거하고 긴 이름을 한 줄 말줄임으로 표시한다. |
| 4. 중량·반복 횟수 휠 | 공통 NumberWheel의 확인 모드 분기를 제거했다. 두 진입점 모두 X 취소, 직접 입력과 확인을 제공하며 선택 중에는 상위 값을 바꾸지 않는다. 숫자 단위·증감 간격·검증은 유지한다. |
| 5. 휴식 액션 높이 | 안내와 휴식 종료·+30초 버튼에 같은 50px 규격·패딩·수직 정렬을 적용했다. 실제 DOM 측정도 50/50/50px이다. |

이전 반복 횟수 휠에 수정이 보이지 않은 원인은 공통 컴포넌트의 confirmSelection 옵션을 중량 호출에만 전달했고, 반복 횟수 호출에는 기본 분기가 남아 있었기 때문이다. 해당 분기에서 직접 입력·돌아가기와 자동 반영을 사용했다. 이번에는 분기를 제거하고 WORKOUT-02에서 반복 횟수 8 → 휠 선택 9 → X 취소 시 8 유지, 다시 선택·확인 시 9 반영, 직접 입력·확인을 실제 검토 경로에서 확인했다. 중량 변경 모달의 선택·X 취소·확인·최종 모달 취소도 재검증했다.

드래그는 마우스·터치, 이동 중 행과 삽입 공간의 시각 피드백, Escape·touchCancel, WEIGHT/CARDIO 간 이동 제한, 목록 닫기·X의 초안 폐기를 검증했다. 완료 세트가 있는 현재 종목을 1번에서 2번으로 옮겨 확정하면 같은 종목·기록을 유지한 채 현재 2/3·진행바·이전/다음 대상이 함께 갱신된다. 기존 주간 일정의 드래그·키보드 정렬도 회귀 검증했다.

전체 자동 테스트 **565건 통과**, 실패·건너뜀 0건이다. 실행 중인 실제 검토 서버에서 브라우저 검증을 수행하는 선택형 테스트 경로를 사용했으며 서버를 종료하지 않았다. Lint·TypeScript·production build를 통과했고 기존 chunk 크기 안내는 남아 있다. PC·Chrome 320px·393px의 캡처에서 상단 여백, 빨간 종료 글자, 드래그, 두 휠, 휴식 액션을 확인했다.

캡처와 실행 결과는 Git 제외 logs/workout-review에 있다. 주요 캡처는 third-reps-wheel-320, third-drag-active-320, third-end-button-320, rest-320이다. 실제 iPhone Safari의 터치·관성·Safe Area·키보드는 사용자 실기기 검토 대기다. 전체 UI 최종 승인과 최종 마감은 계속 대기 상태다.

## 4차 운동하기 UI 피드백 반영

2026-11-13 사용자 요청의 8개 항목을 기존 Mock 상태와 실행 중인 검토 서버에 반영했다. 이전 절은 당시 검증 기록이며 상단 여백·폰트·종료 버튼·웨이트 하단 공간의 현재 값은 이 절을 따른다.

| 항목 | 반영 결과 |
| --- | --- |
| 1. 시간 카드 외부 여백 | 위쪽 추가 여백을 12px → 6px로, fixed 래퍼 아래 패딩을 6px → 4px로, 본문과 래퍼 사이를 14px → 8px로 줄였다. 카드 내부 규격은 유지한다. Chrome에서 최초·스크롤 후 카드 위쪽 6px, 카드와 내비게이션 사이 12px을 확인했다. Safe Area는 기존 env 보정을 유지한다. |
| 2. 가운데 루틴명 | 가운데만 13px → 15px로 확대했다. 이전·다음은 13px이며 굵기·색상·대칭 그리드·한 줄 말줄임을 유지한다. |
| 3. 현재 종목 번호 | WorkoutReview의 확정 items 순서와 현재 ID에서 구한 index + 1을 제목에도 전달한다. 01. 벤치 프레스 형식이며 목록 번호도 두 자리로 맞췄다. |
| 4. 진행 중량 카드 | 상하 패딩은 12px, 두 행 간격은 10px → 4px로 줄였다. 좌우 패딩·폰트·버튼 터치 크기·좌우 정보 정렬은 유지한다. 별도 외부 마진은 없어 화면 공통 14px 간격을 유지했다. |
| 5. 세트 기록 헤더 | 세 항목을 13px로 맞췄다. 목표는 12px → 13px, 완료 수는 10px → 13px이며 320px에서 한 줄 표시와 겹침 없음을 확인했다. |
| 6. 반복 횟수 증감 | WORKOUT-02 호출에만 plainSteps를 적용해 좌우 테두리를 제거했다. 중앙 1px 테두리와 44px 이상 터치 영역, 공통 포커스 토큰·눌림 배경을 유지한다. 중량 변경의 ±2.5 버튼 테두리 1px은 그대로다. |
| 7. 운동 종료 테두리 | 해당 버튼에만 글자와 같은 status-danger-text 색상의 2px 테두리를 적용했다. 상하 패딩을 1px씩 조정해 기존 버튼 높이·폭·배경을 유지했다. |
| 8. 마지막 버튼 아래 공간 | 웨이트 화면에서 footer의 실제 높이를 ResizeObserver로 측정한다. Safe Area를 포함한 footer 높이 + keyboard inset + 8px만 확보하며, 바깥 AppShell의 중복 하단 패딩을 상쇄한다. 일반·휴식 안내·편집 상태에서 맨 아래로 스크롤하면 종료 버튼과 footer 사이가 8px임을 확인했다. |

큰 하단 여백의 원인은 flow의 고정 190px + Safe Area + keyboard inset 예약과 AppShell의 28px + Safe Area 패딩이 겹친 것이다. margin-bottom은 기존에 없었고, AppShell의 min-height: 100dvh는 짧은 화면의 최소 높이를 위한 설정이었다. 웨이트의 긴 본문에서는 고정 예약량과 중복 패딩이 불필요한 공간을 만들었다. footer의 Safe Area와 키보드 보정은 유지하고 실제 footer 높이 변화에 따라 예약량을 갱신한다. 다른 준비운동·유산소 화면의 하단 예약은 이번 변경 범위에서 유지했다.

브라우저에서 완료 세트가 있는 벤치 프레스를 드래그했다. 이동 중·목록 닫기에는 01.과 현재 1/3을 유지하고, 변경하기 이후 02.·현재 2/3·누적 두 구간·이전/다음 대상이 함께 갱신된다. 다른 종목으로 이동한 뒤 복귀해도 02.와 완료 기록을 유지하며, 확정 순서를 되돌리면 01.로 복원된다. 긴 제목의 한 줄 말줄임과 전체 title도 재검증했다.

주요 변경은 WorkoutFrame·WeightFocus·WorkoutReview·ExerciseList, NumberWheel의 선택적 표시 속성, WorkoutFlow.module.css·NumberWheel.module.css 및 기존 브라우저 회귀 검증이다. 신규 의존성·API·저장 모델 변경은 없다.

검증 결과는 다음과 같다.

- 실행 중인 실제 4173번 서버를 OVERLOAD_WORKOUT_REVIEW_ORIGIN으로 지정해 전체 npm test **565건 통과**, 실패·건너뜀 0건을 확인했다. 관련 선행 실행 6건도 통과했다.
- npm run lint와 npm run build를 통과했다. build에 포함된 tsc -b 타입 검사도 통과했다. 기존 553.71kB chunk 크기 안내는 유지된다.
- PC 1280px·Chrome 320px·393px 캡처를 확인했다. 기존 완료·취소·자동 스크롤·휴식·두 숫자 휠·드래그·편집·유산소·종료 요약과 주간 일정 정렬 회귀도 통과했다.
- 검토 브라우저의 API 요청·IndexedDB open/delete 접근은 각각 0건이며 생성된 DB도 0개다. 실제 API·Backend·DB·개인 운동 데이터는 변경하지 않았다.
- git diff --check와 관련 문서 링크를 확인했다. 캡처·명령 출력은 Git 제외 logs/workout-review의 fourth-feedback 로그와 weight-320·feedback-weight-393·weight-desktop·fourth-end-gap-320 등에 있다.

검토 서버 PID **70244**, 포트 **4173**, LAN **192.168.0.3**을 실제 프로세스와 리스너로 재확인했다. PC와 LAN 검토 URL은 모두 HTTP 200이다. 일회성 Chrome 검증 프로세스는 종료하며 기존 검토 서버는 유지한다.

- PC: <http://127.0.0.1:4173/routine-preview?tab=home&review=workout>
- iPhone: <http://192.168.0.3:4173/routine-preview?tab=home&review=workout>

실제 iPhone Safari의 노치·Safe Area·하단 UI·키보드·터치·휠 관성은 실기기 미검증이다. 전체 UI는 최종 승인 전이며 사용자 피드백을 기다린다. Git 커밋·Push·검토 서버 최종 종료·개발 문서 최종 마감·실제 API 연동은 수행하지 않았다.

## 5차 메모 입력과 고정 액션 충돌 수정

2026-11-13 UI 1차 승인 전 마지막 수정 요청을 반영했다. 4차의 디자인·본문 구성은 유지하고 기구 세팅 메모의 포커스·키보드 전환·하단 액션에만 변경을 한정했다. UI 1차 승인 여부는 사용자 판단 대기다.

원인은 WorkoutFrame이 메모 입력 여부를 구분하지 않고 VisualViewport로 계산한 keyboard inset만큼 footer를 올렸다는 점이다. 키보드 위에서도 액션이 계속 표시되고, 본문에는 footer의 전체 높이가 예약돼 입력 영역과 충돌할 수 있었다.

수정 파일과 역할은 다음과 같다.

- `src/features/workout-flow/WeightFocus.tsx`: 기존 textarea에 data-workout-memo 식별 속성만 추가했다. 값·onChange·행 수·디자인은 유지한다.
- `src/features/workout-flow/WorkoutFrame.tsx`: 해당 메모의 focusin부터 footer의 hidden 속성을 적용한다. blur 이후에도 키보드가 줄인 viewport가 남아 있으면 숨김을 유지하며, viewport 변화가 160ms 동안 안정된 뒤 복원한다. 현재 layout/visual viewport의 높이 차이와 offsetTop을 함께 고려한다. 보이는 footer의 측정값을 보존하고 복원 직후 다시 측정해 높이 0으로 인한 예약 공간 변동을 막는다.
- `src/features/workout-flow/WorkoutFlow.module.css`: 숨긴 footer는 display: none이며 클릭·키보드 탐색 대상에서도 빠진다. 메모 활성 중에는 footer 높이 예약을 빼고 keyboard inset + Safe Area + 8px만 확보한다. 종료 후에는 4차의 실제 footer 높이 기반 예약으로 복원한다.
- `tests/fixtures/workout-review-checks.mjs`: 기존 실제 검토 서버 회귀에 메모 포커스·키보드 전환 모의·입력 보존·복원 검증을 추가했다.
- 이 검토 기록을 갱신했다. 다른 화면·진행 중량·세트·제목·진행바 디자인은 변경하지 않았다.

입력창 가시성 보정은 포커스와 viewport resize가 120ms 동안 안정된 후에만 실행한다. textarea가 실제 보이는 viewport와 고정 시간 영역 사이를 벗어나면 필요한 거리만 스크롤한다. viewport scroll 이벤트에서는 자동 위치 보정을 반복하지 않아 사용자의 스크롤을 되돌리지 않는다. 타이머·리스너는 화면 해제 시 정리하며 메모나 운동 상태를 초기화하지 않는다.

실제 4173번 검토 서버의 Chrome에서 다음을 검증했다.

- 320px·393px에서 기본 액션 표시 → 메모 focus → footer의 hidden/display: none 및 표시 사각형 0 → 입력값 보존 → blur/키보드 닫힘 → 기존 액션의 크기·패딩·간격·위치·예약 공간 복원을 확인했다.
- VisualViewport 높이 300px 축소와 offsetTop 40px 이동을 모의해 textarea 가시성을 측정했다. 각 모바일 폭에서 열기·닫기를 3회 반복했고, blur가 먼저 발생하는 경우·키보드 일부만 닫힌 경우·키보드가 닫혀도 메모가 계속 포커스된 경우를 구분했다. 브라우저 자체 높이가 852px에서 732px로 바뀐 뒤에도 복원됨을 확인했다. 이 검증은 실제 모바일 키보드 실행이 아니다.
- 메모 중 수동 스크롤이 재보정되지 않고 입력값·현재 제목이 보존됨을 확인했다. PC 1280px에서도 숨김·복원과 입력 보존을 확인했다. 입력 종료 후 마지막 버튼과 footer 사이 8px 회귀도 통과했다.
- 초기 헤드리스 검증에서는 창 포커스가 비활성 상태여서 focusin이 발생하지 않았다. 테스트에서 Chrome의 포커스 에뮬레이션을 활성화한 뒤 실제 focus/blur 이벤트로 재검증했다.
- 전체 `npm test` **565건 통과**, 실패·건너뜀 0건이다. `npm run lint`, `npm run build`와 그 안의 `tsc -b` 타입 검사를 통과했다. 기존 553.71kB chunk 크기 안내는 유지된다.
- 기존 운동 전체 흐름·주간 일정 회귀와 Mock의 API 요청 0건·IndexedDB open/delete 접근 0건·생성 DB 0개 확인을 유지했다. 실제 API·Backend·DB·IndexedDB·개인 운동 데이터는 변경하지 않았다.

로그와 캡처는 Git 제외 logs/workout-review의 fifth-feedback 파일과 fifth-memo-viewport-simulated-320·393, fifth-memo-focus-desktop에 있다. 모의 viewport 캡처를 iPhone 실기기 검증 근거로 간주하지 않는다.

기존 PID 70244·포트 4173 검토 서버와 PC·LAN 주소를 유지한다. 일회성 Chrome 테스트 프로세스는 종료한다. 커밋·Push·실제 API 연동·DB 변경·검토 서버 최종 종료·개발 문서 최종 마감은 수행하지 않는다.

실제 iPhone Safari에서 키보드 표시·닫힘 애니메이션, Done 동작의 포커스 해제, Safari 하단 UI·Safe Area와 viewport 이동은 **실기기 미검증**이다. 해당 검토와 UI 1차 승인은 남아 있다.

참고 근거는 [VisualViewport의 높이·이동량과 resize/scroll 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [키보드와 layout/visual viewport의 관계](https://developer.chrome.com/blog/viewport-resize-behavior/)다. 문서상 브라우저 동작과 실제 iPhone 실기기 결과를 구분한다.

## UI 1차 승인 전 최종 두 가지 레이아웃 피드백

2026-11-13 사용자가 iPhone Safari에서 확인한 메모 카드 간격과 준비운동·유산소 하단 여백에 대한 후속 수정이다. 1~5차 기록은 당시 결과이며 이번 변경도 사용자 검토 단계다. UI 1차 승인·완료 또는 최종 마감으로 처리하지 않는다.

### 메모 카드 전체와 입력 전 스크롤 위치

이전에는 textarea 경계에 8px만 더해 가시성을 계산했다. 카드 제목·하단 안내는 계산 대상이 아니었으며 입력 보조 영역과의 충분한 간격도 없었다. 스크롤 소유자는 window/document.scrollingElement이며 일반 운동 화면에 별도 중첩 스크롤 컨테이너는 없다. 모달은 native dialog의 자체 overflow로 구분한다.

WeightFocus의 기존 메모 Card에 현재 종목 ID를 가진 data-workout-memo-card 속성을 추가하고, WorkoutFrame에서 카드 전체 경계를 측정한다. 가시 영역 위쪽은 VisualViewport.offsetTop과 기존 고정 시간 영역 중 아래쪽에 8px을 더한 지점이다. 아래쪽은 VisualViewport의 하단에서 48px을 뺀 지점으로 잡아 카드와 키보드 입력 보조 영역 사이의 여유를 확보한다. 별도의 큰 고정 하단 패딩은 추가하지 않는다.

기존 120ms resize 안정 대기와 최소 거리 보정을 재사용했다. 동일한 viewport에서 카드 전체가 이미 보이면 후속 스크롤을 하지 않으며, 사용자의 scroll 이벤트에서도 위치를 강제로 되돌리지 않는다. 하단 액션의 hidden/display: none과 메모 활성 중 예약 공간 동기화는 유지한다.

pointerdown 캡처 또는 Tab keydown에서 브라우저의 native focus 스크롤 이전 위치를 저장한다. blur와 키보드 닫힘이 160ms 동안 안정된 다음 액션을 복원하고, layout effect에서 현재 footer 높이를 측정한 뒤 입력 전 위치를 현재 스크롤 범위 안으로 제한해 한 번 복원한다. 저장된 종목 ID와 현재 카드 ID가 다르면 이전 위치를 적용하지 않아 종목 이동의 기존 상단 이동을 덮어쓰지 않는다. 메모 값과 세트·중량·타이머 상태는 변경하지 않는다.

### 공통 하단 예약과 중복 패딩

준비운동·유산소에는 flow의 고정 190px + Safe Area + keyboard inset 예약이 남아 있었고, 바깥 AppShell의 28px + Safe Area도 더해졌다. 4차 웨이트만 별도의 음수 하단 마진으로 바깥 패딩을 상쇄하고 있었다.

이번에는 AppShell의 main에 직접 WorkoutFrame이 있는 경우 하단 패딩을 0으로 처리해 예약 공간 소유권을 Frame 한 곳에 둔다. flow의 고정 190px과 웨이트 전용 음수 하단 마진을 제거했다. 모든 Frame은 표시되는 실제 footer 높이 + keyboard inset + 8px을 예약한다. footer의 높이는 Safe Area를 포함하므로 중복 가산하지 않는다. 액션이 없으면 footer를 렌더링하지 않고 Safe Area + keyboard inset + 8px만 확보한다. 메모 중 숨긴 액션의 높이도 예약에서 제외한다.

Chrome의 Safe Area 0 환경에서 일반 footer는 약 68.59px, 예약은 약 76.59px이었다. 휴식 준비 안내가 있는 footer는 125px, 예약은 133px이다. 스크롤이 필요한 화면의 마지막 콘텐츠와 footer 사이는 약 8px이며, 일반 main의 추가 하단 패딩과 flow의 하단 마진은 모두 0px이다.

짧은 준비운동·유산소 화면에는 화면 높이에서 콘텐츠를 뺀 자연스러운 공간이 남는다. 예를 들어 393px 폭 준비운동은 추가 스크롤 범위가 0이고, 카드와 고정 footer 사이 약 121.8px은 최소 viewport 높이와 기존 버튼 위치에 따른 공간이다. 이를 없애려고 버튼을 올리거나 카드·간격을 늘리지 않았다. 불필요한 padding 때문에 마지막 콘텐츠 이후로 더 스크롤되는 꼬리 공간과 자연 여유를 구분한다.

CARDIO-01 추가 모달은 dialog의 기존 23px 하단 패딩과 form의 0px 패딩을 유지한다. RECORD-01 요약에는 WorkoutFrame/footer가 없고 summary 자체 하단 패딩도 0px이다. 기존 전역 하단 내비게이션을 위한 AppShell 여백은 보존하며 운동 액션 예약이나 keyboard inset이 남지 않음을 확인했다. 원래 계정 화면의 과거 App.css workout-content/cardio-content는 이번 Mock 경로에 적용되지 않아 변경하지 않았다.

### 수정 및 검증 기록

수정 파일은 다음 여섯 개다.

- `src/features/workout-flow/WorkoutFrame.tsx`: 카드 가시성·스크롤 저장/복원·액션 유무/높이 처리.
- `src/features/workout-flow/WeightFocus.tsx`: 기존 메모 카드의 종목 ID 표시 속성.
- `src/features/workout-flow/WorkoutFlow.module.css`: 공통 실제 footer 예약 및 고정 190px·음수 하단 마진 제거.
- `src/app/AppShell.module.css`: WorkoutFrame이 소유하는 예약과 겹치는 main 하단 패딩 제거.
- `tests/fixtures/workout-review-checks.mjs`: 카드 전체·48px 여유·긴 입력·복원·종목 이동 및 화면별 하단 공간 회귀.
- 이 검토 기록.

실행 중인 실제 4173번 서버를 재사용해 `npm test` **565건 통과**, 실패·건너뜀 0건을 확인했다. 관련 선행 실행 6건도 통과했다. `npm run lint`, `npm run build` 및 그 안의 `tsc -b` 검사를 통과했다. 기존 553.71kB chunk 크기 안내는 남아 있다. git diff --check와 문서 링크를 확인했다.

Chrome에서 준비운동·휴식·세트 편집·유산소 준비/수행/일시정지/완료 확인/확정 상태를 각각 320px·393px·PC 1280px로 측정했다. 기존 웨이트와 전체 Mock 흐름도 통과했다. 모의 VisualViewport 축소·offsetTop 이동·브라우저 높이 변화, 모바일 폭별 반복 열기/닫기, 긴 텍스트 실제 input 이벤트, 카드 전체 가시성과 48px 여유, 동일 viewport의 위치 불변, 0이 아닌 입력 전 위치 복원, 종목 이동 시 오래된 위치 적용 방지를 확인했다. 고정 시간 카드 위치와 종료 버튼 디자인·기존 기록 보호 회귀를 유지했다.

API 요청 0건·IndexedDB open/delete 접근 0건·생성 DB 0개를 확인했다. 실제 API·Backend·DB·개인 IndexedDB·운동 저장/동기화는 변경하지 않았다. 검사 중 수정해야 할 오류는 없었다.

수치와 캡처는 Git 제외 logs/workout-review의 final-layout-metrics.json, final-feedback 로그, final-memo-card-viewport-simulated-320·393 및 final-bottom-*에 있다. 모의 키보드 캡처를 실제 iPhone 실행 결과로 간주하지 않는다.

검토 서버의 PID 70244·포트 4173·LAN 192.168.0.3과 PC/LAN HTTP 200 응답을 확인했다. 일회성 Chrome 검증 프로세스는 종료하고 기존 검토 서버는 유지한다.

- PC: <http://127.0.0.1:4173/routine-preview?tab=home&review=workout>
- iPhone: <http://192.168.0.3:4173/routine-preview?tab=home&review=workout>

이번 수정의 실제 iPhone Safari 재검증은 **미실시**다. 실제 ✓ 입력 보조 영역과 48px 여유의 적절성, 키보드·Safari 하단 UI 애니메이션, Safe Area와 포커스/스크롤 복원은 사용자 실기기 검토가 필요하다. 명시적 UI 1차 승인 전이며 서버 종료·커밋·Push·실제 API 연동·DB 변경·개발 문서 최종 마감은 수행하지 않았다.

## iPhone Safari 메모 팬 이동과 자동 스크롤 충돌 후속 수정

2026-11-13 사용자가 실제 iPhone에서 카드 위치와 심한 스크롤 떨림을 재확인했다. 앞 절의 자동화 통과는 해당 실제 증상이 해결됐다는 근거가 아니었다. 이번에는 기존 코드에서 빠졌던 수동 입력 + VisualViewport 팬 이동 + resize 조합을 먼저 실패로 재현한 뒤 수정했다. 실제 iPhone 재검증과 UI 1차 승인은 계속 대기다.

### 조사와 재현된 충돌

- 페이지 스크롤 소유자는 window/document.documentElement다. AppShell에는 별도 내부 페이지 스크롤이 없고, textarea 내부의 긴 텍스트 스크롤과 모달의 자체 스크롤은 독립적으로 유지한다.
- 이전 Frame의 viewport scroll 콜백은 offsetTop을 뺀 keyboard inset을 본문 padding에 매번 반영했다. 팬 이동만으로 문서 높이와 최대 스크롤 범위가 줄었다.
- resize 콜백은 수동 스크롤 여부나 완료된 보정 상태를 구분하지 않고 다시 자동 보정을 예약했다. 팬·툴바 resize와 Safari 기본 입력 이동에 앱의 scrollBy가 추가로 개입할 수 있는 구조였다.
- 기존 완료 후 smooth scroll은 세트 완료 때만, issue scrollIntoView는 검증 오류가 바뀔 때만 실행된다. 이번 메모 재현 중에는 이 경로가 실행되지 않았고 해당 기능은 변경하지 않았다. 상단 fixed 헤더·하단 액션의 시각 규격도 원인이 아니어서 보존했다.

기존 서버에서 320px 폭의 모의 viewport 팬을 발생시키면 다음과 같았다.

| 값 | 수정 전 | 수정 후 같은 재현 |
| --- | --- | --- |
| 팬 전/후 본문 하단 패딩 | 308 → 286px | 308 → 308px |
| 팬 전/후 문서 높이 | 1306 → 1284px | 1306 → 1306px |
| 사용자가 정한/최종 scrollY | 327 → 409px | 327 → 327px |

이는 앱의 충돌 경로를 재현한 수치이며 실제 iPhone의 이벤트 추적 결과는 아니다. 기존 테스트는 단일 scroll 이벤트와 고정된 viewport 값을 사용해 이 결합 상황을 놓쳤다.

### 변경한 제어 방식

WorkoutFrame의 메모 처리를 하나의 160ms 안정 대기 작업으로 통합했다. 키보드 열림 초기에는 resize와 Safari 팬 이동이 잠잠해질 때까지 관찰한다. 안정된 실제 크기에서 카드가 이미 보이면 스크롤하지 않고, 필요할 때만 window를 즉시 한 번 보정한다. 기존에 따로 동작하던 reveal/restore 타이머는 제거했다.

메모 중에는 offsetTop 변화로 global keyboard inset이나 본문 높이를 다시 쓰지 않는다. 메모 전용 임시 공간은 layout/visual viewport 높이 차이를 기준으로 한 번 확보하고, 키보드가 열려 있는 동안 팬으로 줄이지 않는다. 카드 목표까지 필요한 거리와 실제 최대 스크롤 범위를 비교해 부족한 거리만 추가한다. 48px 여유는 확대하지 않았다. 카드 전체가 물리적으로 맞지 않는 작은 영역에서는 제목을 포함한 label과 입력 영역을 우선한다.

wheel·touchmove·누른 pointer 이동·페이지 이동 키를 감지하면 사용자에게 위치 제어권을 넘긴다. 예약된 위치 보정을 취소하고, 같은 입력 회차의 offsetTop·툴바 높이 변화에는 페이지를 되돌리지 않는다. 회전은 layout viewport 폭 변경으로 구분하며, 회전 또는 재포커스 시에만 필요한 카드 보정을 다시 검토한다. 사용자 제어 전의 실제 키보드 높이 변화는 안정 대기 후 최소 보정한다. 앱의 메모 보정에는 진행 중인 smooth animation이 남지 않는다.

입력 종료와 키보드 닫힘이 모두 안정된 뒤 액션을 복원한다. 수동 이동이 없으면 현재 종목의 입력 전 위치를 유효 범위로 제한해 한 번 복원하며, 사용자가 이동했다면 예전 위치로 강제 이동하지 않고 현재 위치의 자연스러운 범위 제한을 따른다. 종목을 바꿨을 때는 이전 위치를 적용하지 않는다.

키보드가 닫혔지만 포커스가 남은 경우에는 임시 공간만 해제하고 기존 포커스 숨김 정책을 유지한다. 이후 새 focus 이벤트 없이 키보드를 다시 열어도 새 크기에서 보정할 수 있다. 사용자 이동 이력이 있으면 닫힌 시점의 위치를 새 기준으로 사용한다. DOM의 임시 CSS 값뿐 아니라 내부 예약 높이도 초기화해 다음 회차에 공간이 누적되지 않도록 했다.

### 파일과 검증

이번 변경 파일은 다음 네 개다. WeightFocus와 AppShell은 조사했으며 추가 변경하지 않았다.

- `src/features/workout-flow/WorkoutFrame.tsx`: 단일 안정 대기·사용자 제어권·실제 스크롤 범위·작은 영역·복원 처리.
- `src/features/workout-flow/WorkoutFlow.module.css`: 메모 입력만 전용 임시 공간을 사용하도록 분리. 기존 일반 화면·액션·테마 스타일은 유지.
- `tests/fixtures/workout-review-checks.mjs`: 결합 팬/resize, 실제 입력 이벤트, 자동 스크롤 호출 추적과 반복 개폐 회귀.
- 이 검토 기록.

320px·393px에서 번갈아 위/아래 팬, offsetTop 이동, 작은 높이 흔들림과 96px 툴바 높이 변화 뒤에도 사용자가 지정한 위치·문서 높이·예약 공간이 유지되고 앱의 추가 scrollTo가 0회임을 확인했다. 열림 보정 대기 중의 touch로 예약 작업을 취소하는 경우, 가로폭 변경 후 재보정, 280px 가시 높이에서 제목/입력 우선 표시, 포커스가 남은 상태의 닫힘/재개방, 네 회차의 포커스 반복과 임시 공간 비누적을 검증했다. 메모 값·현재 종목·헤더 위치와 기존 숫자 휠·운동 전체 흐름 회귀도 유지했다.

기존 하단 여백 검사가 폭 변경 직후 ResizeObserver 반영 전에 측정해 휴식 액션 과도기를 실패로 읽는 경우가 있어 두 animation frame 뒤에 끝 위치를 측정하도록 테스트를 동기화했다. 휴식 UI 코드는 변경하지 않았다. 초기 팬 회귀는 수정 전 실패하고 수정 후 통과했다.

실제 4173번 서버를 지정한 전체 `npm test` **565건 통과**, 실패·건너뜀 0건이다. 관련 선행 6건, `npm run lint`, `npm run build`와 그 안의 `tsc -b` 타입 검사도 통과했다. 기존 553.71kB chunk 크기 안내는 유지한다. API 요청·IndexedDB open/delete는 각각 0건이며 생성 DB도 0개다. 실제 Backend·DB·개인 운동 기록·저장/동기화는 변경하지 않았다.

재현 로그와 비교 수치는 Git 제외 logs/workout-review의 memo-conflict-before.log, memo-scroll-pan-before-320.json, memo-scroll-pan-diagnostic-320·393.json, memo-conflict-tests/lint/build.log에 있다. 캡처의 viewport는 모의 상태이며 실제 iPhone 실행으로 간주하지 않는다.

검토 서버 PID 70244·포트 4173·LAN 192.168.0.3과 PC/LAN 링크 HTTP 200을 확인했다. 임시 Chrome 검증 프로세스는 종료하고 기존 서버를 유지한다. 커밋·Push·실제 API 연동·DB 변경·최종 문서 마감은 수행하지 않았다.

실제 iPhone Safari의 native 키보드/✓ 영역·관성 스크롤·툴바 애니메이션·Done의 blur 시점은 **직접 미검증**이다. 확인된 것은 앱 코드의 충돌 재현과 자동화 회귀 해소이며, 사용자의 실제 iPhone 최종 확인 전에는 UI 1차 승인으로 처리하지 않는다.

## UI 1차 승인 및 검토 단계 종료

2026-11-13 사용자가 실제 iPhone Safari에서 운동 UI 최종 수정 사항의 정상 작동을 확인했으며, **운동 UI 1차 승인을 명시적으로 완료**했다. 이에 따라 운동 UI 1차 검토 단계를 공식 종료한다. 사용자의 실기기 확인을 반영한 승인 기록이며, 이 마감 작업에서 추가 실기기 검증을 수행한 것은 아니다.

- 검토 서버는 실행 명령과 4173번 리스너의 소유 PID가 70244인 것을 확인한 뒤 해당 프로세스만 종료했다.
- 종료 후 PID 70244가 실행 중이지 않고, 포트 4173의 LISTEN 리스너가 0개임을 확인했다. 다른 개발 서버와 프로세스는 종료하지 않았다.
- 기존 전체 테스트 565건·Lint·TypeScript·Production Build 통과 기록은 유지했다. 사용자 지시에 따라 이번 마감에서는 해당 검증을 재실행하지 않았다.
- UI·기능·코드의 추가 수정이나 리팩터링은 하지 않았다. 현재 브랜치 main을 유지하고 실제 API·DB·IndexedDB·저장/동기화는 변경하지 않았다.
- git status와 diff를 확인해 운동 UI 검토 및 그 공통 컴포넌트·홈/설정 진입·Mock·회귀 검증에 해당하는 아래 30개 파일을 커밋 범위로 선정했다. 별개의 변경 파일은 확인되지 않았으며 로그·캡처·빌드 결과물은 커밋에서 제외한다.
- 로컬 커밋 메시지는 `fix(workout): finalize workout UI first review`다. Push는 수행하지 않는다.

### 커밋 포함 파일 30개

주간 일정 편집기의 변경은 3차 피드백에서 기존 드래그 구현을 종목 정렬과 공유하도록 추출한 부분이다. 홈·설정 파일은 운동 진입/이어가기와 휴식 알림 검토에 필요한 변경이며 함께 포함한다.

- `docs/tasks/ui-v09-workout-review.md`
- `src/app/AppShell.module.css`
- `src/components/Dialog.tsx`
- `src/components/NumberWheel.module.css`
- `src/components/NumberWheel.tsx`
- `src/components/ui.tsx`
- `src/components/useDragOrder.ts`
- `src/features/home/HomePanel.tsx`
- `src/features/settings/SettingsMain.tsx`
- `src/features/workout-flow/CardioFocus.tsx`
- `src/features/workout-flow/WeightFocus.tsx`
- `src/features/workout-flow/WorkoutDialogs.tsx`
- `src/features/workout-flow/WorkoutFlow.module.css`
- `src/features/workout-flow/WorkoutFrame.tsx`
- `src/features/workout-flow/WorkoutSummary.tsx`
- `src/features/workout-flow/types.ts`
- `src/features/workout-online/PresetOrderEditor.tsx`
- `src/review/RoutinePreview.tsx`
- `src/review/SettingsReview.tsx`
- `src/review/WorkoutRecordReview.tsx`
- `src/review/WorkoutResumeDetails.tsx`
- `src/review/WorkoutReview.tsx`
- `src/review/routine-samples.ts`
- `src/review/useRestAudio.ts`
- `src/review/useReviewClock.ts`
- `src/review/workout-model.ts`
- `src/review/workout-samples.ts`
- `tests/fixtures/workout-review-checks.mjs`
- `tests/preset-review.test.mjs`
- `tests/workout-review.test.mjs`

이 승인은 React UI 1차 검토의 종료다. 실제 Backend API 연결이나 데이터 저장·동기화 통합을 완료한 것으로 처리하지 않는다.

## 후속 실제 API 연동과 문서 동기화 — 2026-11-13

UI 1차 승인 커밋은 `e2965d8`이며 앞선 565건 검증/사용자 실기기 승인 기록을 보존한다. 이후 실제 API 및 사용자 피드백 구현은 PWA `15a0f6bee4421f799cd691fa435bc8103c1e28e2`, Backend `a56103e39e9821657da3ef98b047f3ce136116c8`로 별도 커밋했다. 이번 문서 동기화에서 기존 무채색 v0.9 HTML과 제품/개발/계약 문서를 갱신했다. [후속 작업의 최종 범위·검증·종료 상태](ui-v09-workout-api-integration.md#최종-마감--2026-11-13)를 참조한다. UI 1차 실기기 승인을 최신 API·HTTPS 운영 검증으로 확대하지 않는다. 이번 문서 작업은 제품 코드·DB 변경이나 테스트 재실행을 포함하지 않는다.
