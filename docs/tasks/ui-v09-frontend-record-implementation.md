# UI v0.9 후속 Frontend 구현 — 2026-11-14

## 범위와 상태

[최종 HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html), [Decision Log 10.21~10.24](../product/Overload_UI_Decision_Log_v0.9.md#1024--기록-탭-최종-개편--2026-11-14), [현재 API 지원 범위](../../../overload-server/docs/api/statistics.md#기록-탭-최종-ui의-지원-범위--2026-11-14)를 적용했다. HTML·Backend·SQL·API 계약은 수정하지 않았다. 새 의존성·DB 초기화·마이그레이션·Stage·Commit·Push를 실행하지 않았다.

**React UI 구현 및 PC 검토 / 사용자 최종 UI 승인 전.** 기존 읽기 API 연결 코드와 합성 검토를 구분한다. 실제 인증 계정·격리 Backend/DB를 실행하지 않았으므로 실제 API 통합 검증 완료가 아니다. 미지원 항목은 준비/확인 필요로 표시하며 저장·승인 성공이나 공식 완료를 만들지 않는다.

## 기능별 결과

| 기능 | 재사용과 Frontend 구현 | Backend 추가·확인 필요 |
|---|---|---|
| ① 주간 근육 계획 | 프리셋·루틴·카탈로그 GET, 두 진입 경로, 현재 반복 월~일, 분류/근육 탭·전체 보기 OFF·상태 유지 | 운동 자체의 검수 부위, 전체 근육 마스터, 제품 권장 범위와 공식 계획 집계 계약 |
| ② 개별·일괄 승인 | 기존 종료 요약·weightReview·NumberWheel/Dialog. 전체/선택 체크·예정 초안, 권고 5/2kg·수동 2.5/1kg, 취소·확인 | 일반 종료 후 승인 계약 없음. 승인 버튼은 비활성. 기존 PENDING 해결은 유지 |
| ③ 대체 운동 | 기존 교체/제외·추가·장비 UI. 원계획 슬롯 로컬 연결·계획 세트 보존·수행 표시, 변경 세션 검토 숨김 | 네 분류·연결의 서버 판정과 세션 전체 공식 제외. 불명확한 슬롯 완료를 인정하지 않음 |
| ④ iOS 뒤로가기 | History API/popstate, 탭·분석·기록·루틴 편집·모달 복귀, 계정/세대별 문맥·기존 이탈/flush 보호 | iPhone Safari·설치형 PWA 실기기 검증. 자체 스와이프 감지는 추가하지 않음 |
| ⑤ 포커스 | 공통 Dialog의 기본 제목 포커스, 명시 initialFocus·트리거 복원·Tab/Escape·focus-visible 유지 | iOS 터치 실기기 검증 |
| ⑥ 조합 중량·메모 | RoutineForm/EquipmentFields/textarea, 장비 변경 NEW 배치, 승인 원본 분리, 조합별 메모 초안·A→B→A 복원·지우기 | 최근 실제 중량·서버 공유 메모 API 없음. 미저장 입력으로 표시하며 없음/0kg·저장 성공으로 가장하지 않음 |
| ⑦ 기록 탭 | 2×2, 공통 기간/달력, 이번 주 고정 근육 통계, 네 범위 후보 검색, 최근7일·월간 피드·주차 구분·검색 해제 복원 | 선택 항목 일별 시계열, 완전한 기간/이름 검색·요약, 여러 날짜의 UI △ 근거와 복수 세션 선택 |

## 계산·데이터·승인 보호

- 현재 계획은 선택 프리셋 배정과 현재 루틴을 읽고 반복 요일을 각각 포함한다. 프리셋 활성화 쓰기는 호출하지 않는다. 고유 카탈로그 상세는 최대 4개씩 병렬 조회한다.
- 전면/후면·PPL은 확인된 계획 원본에서 독립 계산하고 세부 근육만 PRIMARY 1.0/SECONDARY 0.5로 표시한다. 근육 groupCode는 세부 목록 묶음이며 운동 자체 부위로 역산하지 않는다. 한 분류의 누락이 다른 독립 수준의 확인된 값을 지우지 않는다.
- 실제 기여는 기존 Overview를 사용한다. 계획 참여 정수를 새 계획 기여로 가장하거나 총중량에 0.5를 적용하지 않는다. 실제 0·계획 없음 —·당시 계획 확인 필요는 별개다.
- 제품 권장값이 없으므로 실제 경로는 확인 필요다. 검토 화면의 별도 합성 4~12 가이드는 ▼·수치 보존·막대 제한의 표현만 확인한다.
- 전체 일별 추이는 Overview로 연결한다. 항목 선택은 연결 대기로 구분하고 기간 합계를 날짜별 값으로 만들지 않는다. 후보 검색 입력은 통계 재집계를 호출하지 않는다.
- 종료 목록은 기존 20개 cursor를 명시적으로 추가 조회한다. 자동 전체 다운로드·카드별 상세 N+1을 추가하지 않았다. 불러온 범위만 필터·정렬하며 다음 cursor가 있으면 불완전 가능성을 안내한다. 운동별 전체 기간 검색은 연결 대기다.
- UI 부분 달성의 50%·min(2, 원계획 세트)·시간/거리 AND·혼합 기준을 구현했다. 홈과 기록은 같은 dayStatus를 사용하고 effectiveDay 소수를 △로 치환하지 않는다. 실제 근거가 부족하면 미확정이다. 공식 완료율·G4·중량 평가 계산은 변경하지 않았다.
- 복수 세션 선택, 대체 분류·연결, 자동 종료/종료 시각 없음·삭제, 운동 날짜 귀속과 종료 정렬은 기존 확인 필요 사항이다.
- replacementSlots·originalCombinationChanged는 optional 로컬 UI 메타데이터다. IndexedDB 버전·서버 snapshot schema를 바꾸지 않는다. 실제 원계획 슬롯만 연결하고 임시 추가 종목에 연결을 만들지 않는다. 연속 교체의 최초 슬롯·원래 목표와 InitialPlan·수행을 보존한다.
- 이 기기의 장비 변경·재전환은 로컬 사본과 종료 중량 검토 숨김에 재사용한다. 서버 공식 제외나 다른 기기의 확인 사실이 아니다. 기기 간 일관성은 후속 계약 사항이다.
- 기존 기록 정정·최초/현재 평가·승인 사건·PENDING KEEP_CURRENT/REAPPROVE는 유지한다. 일반 전체/선택 승인에 records PATCH나 PENDING 해결을 전용하지 않았다.
- 메모 초안은 계정/세대 Context에 있으며 snapshot·루틴 승인 요청에 섞지 않는다. 이전 입력은 첫 조합의 초안으로 표시하며 공유 저장 완료로 처리하지 않는다.

## 주요 변경 파일

| 영역 | 파일 |
|---|---|
| 기록·분석 | [StatisticsPanel](../../src/features/statistics/StatisticsPanel.tsx), [MuscleAnalysis](../../src/features/statistics/MuscleAnalysis.tsx), [집계 모델](../../src/features/statistics/muscle-analysis.ts), [UI 부분 달성](../../src/features/statistics/display-achievement.ts), [PeriodControls](../../src/features/statistics/PeriodControls.tsx), [RecordFeed](../../src/features/history/RecordFeed.tsx) |
| 검색 | [SearchList](../../src/components/SearchList.tsx)의 행·스크롤을 [ExerciseSearch](../../src/features/workout-online/ExerciseSearch.tsx)와 기록 검색에서 공유 |
| 이동·포커스 | [navigation](../../src/app/navigation.ts), [Dialog](../../src/components/Dialog.tsx), [AuthApp](../../src/features/auth/AuthApp.tsx), [Workspace](../../src/features/workout-online/WorkoutWorkspace.tsx) |
| 승인 | [WeightReview](../../src/features/workout-flow/WeightReview.tsx), [WorkoutSummary](../../src/features/workout-flow/WorkoutSummary.tsx), [ClosedWorkout](../../src/features/workout-online/ClosedWorkout.tsx), [summary-data](../../src/features/workout-online/summary-data.ts) |
| 조합·진행 | [RoutineForm](../../src/features/workout-online/RoutineForm.tsx), [CombinationMemo](../../src/features/workout-online/CombinationMemo.tsx), [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx), [로컬 모델](../../src/features/workout-local/model.ts)·[검증](../../src/features/workout-local/validation.ts) |
| 시연·회귀 | [RecordPreview](../../src/review/RecordPreview.tsx), [신규 UI 테스트](../../tests/record-ui.test.mjs), 기존 통계·홈·로컬 운동·종료 UI·브라우저 회귀 |

## 검토 환경과 검증

- 기존 /routine-preview 안에 같은 컴포넌트를 합성 읽기 transport로 연결했다. 인증·개인 IndexedDB·실제 API 쓰기를 사용하지 않는다. 정상·빈 목록·지연·오류 및 기존 홈/루틴/설정/운동 시연을 유지한다.
- [PC 검토](http://127.0.0.1:4173/routine-preview?tab=history), [같은 사설 LAN](http://192.168.0.3:4173/routine-preview?tab=history). 사용자 UI 검토 전이므로 Mock Vite만 유지한다. 실행 세션 69802·확인한 listener PID 160820. 일회용 검증 프로세스는 기존 테스트 finally 절차로 종료했다.
- Browser Use에서 계획·종료 요약의 320/375/390/430px 가로 넘침 없음, 전체 보기 기본 OFF·탭/프리셋 유지·0세트, 검색 선택/뒤로가기, 월간 피드, 승인 모달 초안·2.5kg 간격·취소·트리거 복원·키보드 focus-visible/Escape, A→B→A 메모 복원을 확인했다. 320px의 body 최소 폭으로 생긴 scrollbar 넘침을 수정했다.
- 마지막 합성 루틴 편집 취소의 native confirm에서 내장 브라우저 제어가 시간 초과되어 그 확인창 종료·viewport 원복은 재확인하지 못했다. 다른 제어 방식으로 우회하지 않았다. 별도 자동 브라우저 회귀의 취소·저장·요약·기록 재진입은 전체 테스트에 포함된다.
- npm test **600/600 통과**, npm run build·npm run lint 통과. 기존 500kB 초과 번들 경고는 남아 있다.
- iPhone Safari·설치형 PWA·실제 Backend/DB 통합 검증과 사용자 최종 UI 승인은 미실행이다. HTML SHA-256은 작업 전과 동일하다. Backend의 기존 Markdown 5개 변경분을 보존했다.
