# FRONT 18 — 4-4 전체 카드 사용처 적용 및 예외 정리

## 적용 결과

4-1과 4-3 표의 78개 전체를 현재 소스와 대조했다. 적용 이력은 **이번 수정 7개**, **4-3 직접 적용 42개**, **4-3 공통 모듈 반영 5개**, **기존 규격 유지 2개**, **승인 예외 22개**다. 별도로 발견한 2개 사용처 중 루틴 목록 빈 상태의 외곽을 공통화하고, 진행 운동의 승인 확인 카드는 기능형 Dialog 예외로 확인했다. [4-1 조사표](front-18-4-1-card-audit.md) · [4-3 최초 적용표](front-18-4-3-card-foundation.md) · [4-3 버튼 보완](front-18-4-3-button-refinement.md) · [4-3 최종 보완](front-18-4-3-final-refinement.md)

| 기존 번호 | 현재 상태와 이번 처리 | 393px 변경 전후 | 화면 |
| --- | --- | --- | --- |
| 09 새 루틴 배정 제안 | 공통 `Card`로 옮기고 카드 margin을 상위 레이아웃의 간격으로 대체. `나중에`와 `배정하기` 배치 유지 | 반경 **18→5**, 패딩 **21→12**, 내부 gap **18→12**, 카드 높이 **180.47→150.47px** | [전](evidence/front-18-4-4/before/created.png) · [후](evidence/front-18-4-4/after/created.png) |
| 48 기록 관리 승인 확인 | 공통 외곽 사용. 승인 안내의 21px 패딩과 18px 폼 간격, 본문 글자 크기, 읽기 전용·재승인 동작 유지 | 반경 **18→5**, 위·아래 margin **18→0**, 높이 **395.72px** 동일 | [전 · 계측](evidence/front-18-4-4/comparison.json) · [후 · 계측](evidence/front-18-4-4/after/measurements.json) |
| 64 앱 설치·오프라인 준비 | 4-3에서 복원한 5px 외곽을 네이티브 `details`의 공통 카드 표면으로 옮김. 데이터 카드와 설치 카드 묶음이 간격 소유 | 외곽 **5px**, 패딩 **0/12px**, 간격 **8px** 동일. 이전 **16px gap −8px margin**을 **8px gap**으로 정리 | 전후 화면 이미지가 동일해 한 벌을 보존. [접힘](evidence/front-18-4-3-final/live-after/install-closed.png) · [펼침 · 계측](evidence/front-18-4-4/comparison.json) · [전후 수치](evidence/front-18-4-4/comparison.json) |
| 66 기기 요약 | 통계 패딩 토큰 적용. 3열 지표 위의 별도 6px margin을 제거하고 12px 카드 gap으로 정렬. 기존 짙은 요약 배경과 강조선 유지 | 패딩 **12→14/12px**, 상자 높이 **119.19→117.19px** | [전 · 계측](evidence/front-18-4-4/comparison.json) · [후](evidence/front-18-4-4/after/devices.png) |
| 67 현재·다른 기기 항목 | 카드 외곽과 12px 패딩을 공통 값으로 사용. 다른 기기 반복 목록에 8px 적용, 현재 기기와 다른 기기 제목의 섹션 간격 유지 | 반복 간격 **12→8px**, 다른 기기 카드 높이 **217.56px** 동일 | [전·후 기기 계측](evidence/front-18-4-4/comparison.json) |
| 75 이메일 OTP | 공통 입력 카드 적용. 첫 콘텐츠 시작과 숫자 입력, 만료, 재발송, 검증 제한을 유지 | 반경 **18→5**, 패딩 **21→12**, 카드 높이 **672.81→618.81px**. 오류 안내가 없는 OTP 첫 카드 시작 **Y=38px** 동일 | [전 · 계측](evidence/front-18-4-4/comparison.json) · [후](evidence/front-18-4-4/after/otp.png) |
| 76 로그인 연결 오류 | 공통 외곽 적용. 기존 21px 패딩과 내부 18px, 로그인 상태 다시 확인과 오프라인 이어가기 흐름 유지 | 반경 **18→5**, 오류 알림과 카드 사이 중복 margin **18→0**, 카드 높이 **274.13px** 동일 | [전 · 계측](evidence/front-18-4-4/comparison.json) · [후](evidence/front-18-4-4/after/auth-error.png) |

추가 발견분의 루틴 빈 상태는 기존 중첩 `EmptyState`를 공통 12px 카드에 넣고 루틴 모듈의 중복 외곽을 제거했다. 진행 운동의 승인 재확인은 `데이터 저장 상태` 기능형 Dialog 안의 18px 외곽과 21px 패딩, 374px 이하의 16px 패딩을 유지했다. 기록 승인 확인과 로그인 연결 오류도 이 기존 반응형 패딩을 공유 토큰으로 보존했다. 오프라인 제안과 읽기 전용 기기 인계의 18px도 보존했다. `WorkoutHistory`의 옛 외곽과 Preview가 사용하는 연결 상태 배너는 실제 서비스 호출이 확인되지 않아 별도 서비스 사용처로 세지 않았다.

## 중첩 카드와 보호 규격

- 홈 날짜 상세와 성장 최신 중량의 배경·정보 위계 및 단일 외곽을 유지했다. 루틴 상세 지표는 4-3에서 이미 12px gap과 지표 상단 8px으로 정리됐다. 기록 상세 수행 항목은 구분선 위 20px와 구분선 아래 24px가 승인된 배치다. 첫 항목의 4px 패딩, 웨이트·유산소 사이 12px, 세트 표의 정보 열을 함께 보존했다. [기존 기록 상세 시안](../product/Overload_UI_Baseline_Wireframe_v0.9.html) · [기록·루틴 실측](evidence/front-18-4-4/after/measurements.json)
- 운동 준비, 진행 중량과 원판 정보, 세트 표와 이전 기록, 유산소 타이머 하한, 숫자 휠, 저장 복구와 미디어 비율, 차트 하한을 바꾸는 공통 CSS 변경은 없다. 설치 행의 64px 조작 영역과 구분선, 푸터 5px·50px, **30/48px** 소형 버튼, **44×44px** 원형 프리셋, 홈·루틴 날짜 외곽과 돌아가기 버튼을 기존 검수 규격으로 확인했다. 운동 종료 모달은 393px에서 **149px씩**이며 기존 간격과 340px 상한을 사용한다.
- 운동은 격리 Chrome에서 시작→세트 완료→휴식 종료→다음 세트를 실제 클릭·터치 이벤트로 실행했다. 전환 후 새 버튼의 색상, opacity, 높이와 푸터 위치를 프레임별로 확인했다. 증량·감량 권고 50px과 긴 값, 장시간 요청의 로딩, 입력 중복 방지, 휴식 ON 12초·OFF 180초 및 효과음 경로는 운동 회귀로 확인했다. iPhone Safari에서 보고된 화면 변화와 설치형 PWA는 실제 기기에서 추가 확인이 필요하다. [운동 프레임](evidence/front-18-4-4/after/measurements.json)
- 실제 4173은 기존 검수 계정으로 로그인해 화면의 읽기 경로를 확인했다. 4-4의 카드 계측은 실제 서버 운동 시작·저장 요청을 다시 실행할 필요가 없어 격리 운동을 사용했다. 4-3의 실제 서버 `201/200`과는 별개다. 검수 계정의 루틴·운동·설정에 쓰기 요청을 보내지 않았다. [실제 앱 계측](evidence/front-18-4-4/live/measurements.json)

## 검증과 4-5 검수 범위

Chrome 320·375·393·430·1280px에서 대상 카드의 실제 외곽·패딩·좌표를 확인했다. 정상·로딩·빈 상태·조회 실패, 휴식 읽기·편집, 설치 접기·펼치기, 긴 기기 이름과 반복 항목을 포함했다. 기존 데이터 재조회와 응답 지연, 동일 버튼의 중복 요청 방지 및 복구는 전체 회귀에 포함된다. 실제 렌더링의 직접 계측 여부는 아래 표에서 구분한다. 다섯 폭의 실측이 없는 조건부 표면, iPhone Safari 및 설치형 PWA 조작을 4-5에서 확인한다. [검증 원본](evidence/front-18-4-4/)

4-5에서는 표의 미계측 행 중 편집·평가·통계의 조건부 카드와 새로고침 전후 외곽을 비교할 수 있다. 이번 소스 대조에서 추가 사용자 결정이 필요한 디자인 충돌은 발견되지 않았다. 4-4의 작업 검증과 4-5의 실제 기기·사용자 최종 승인은 별도 기록이다.

| 검사 | 4-4 최종 결과 |
| --- | --- |
| 전체 FRONT | **728/728 통과**. 배포된 공통 UI 및 FRONT 18 Preview, 루틴·설정·운동 흐름, 기록, 휴식과 저장 복구를 포함했다. 앞선 실행에서 Toast 대기와 운동 저장 상태 타이밍 검사에 각각 간헐 실패가 있었으며 제품 동작을 수정하지 않고 재실행하여 최종 통과했다. |
| 카드·버튼·Dialog 집중 | 루틴 배정 카드, 설치 카드 개폐, 기기 패딩·목록 gap의 계산값 검사를 기존 브라우저 회귀에 추가했다. 운동 시작·세트·휴식의 프레임 자료와 보조 버튼 및 모달 계산값을 별도로 확인했다. |
| 데이터 보호 | 조회 취소·늦은 응답·PWA 오프라인·작업 영역 경계 **27/27 통과**. 휴식 ON 12초와 OFF 일반 180초 및 알림 경로는 격리 운동 회귀에서 확인했다. |
| TypeScript와 배포 | 프로덕션 `tsc -b` 및 Vite 빌드와 4173 검수 빌드 통과. 운영 배포 및 Service Worker 사전 캐시의 Preview 경로 0개, 공개 사전 캐시 자산 SHA-256 32개 일치. 기존 PostCSS `from` 옵션과 Vite 500kB 초과 청크 경고는 남아 있다. |
| ESLint | `npm run lint -- --ignore-pattern '.local-backups/**'` 및 `eslint src tests` 통과. 검수용 보존 복제본은 검사 범위에서 제외했다. |
| 변경·기록 무결성 | `git diff --check`, 78행의 번호·열, 상대 링크와 PNG·JSON 확인. |

기존 보고서와 스크린샷·계측 자료 **134개**는 SHA-256이 일치한다. 4173은 검수용으로 유지했다. [실제 앱](http://127.0.0.1:4173/) · [공통 UI Preview](http://127.0.0.1:4173/common-ui-preview.html) · [FRONT 18 Preview](http://127.0.0.1:4173/common-ui-preview.html?front18=1)

기존 스테이징과 공식 설계 문서를 보존했다. 문서에는 이 보고서와 별도 검수 자료를 추가했다. 작업 트리와 4173은 사용자 검수 대기 상태로 남겼다.

## 78개 사용처 적용표

수치는 CSS px이며 외부 그룹이나 행에 명시된 수치는 실제 호출 문맥에 따른다. `실측`은 아래 행에서 명시한 표본의 다섯 폭에서 직접 렌더링했다는 뜻이다. 같은 행에 복수 변형이 묶인 경우 계측 표본만 근거로 삼는다. `소스` 또는 `기존 자료`는 이번 변경 후 해당 표면의 실제 외곽을 별도 계측하지 않았다는 뜻이다. 이전 적용표의 영문 표본명과 같이 보면 각 경로를 재확인할 수 있다.
<!-- CARD-COVERAGE-TABLE -->

이번 다섯 폭에서 직접 계측한 기존 행은 **63/78개**다. 실제 앱 표본 **18개**, 격리 Chrome 표본 **45개**이며 중복 없이 집계했다. **15개**는 소스 확인, 기능 회귀 또는 기존 실측 근거만 있고 이번 카드 외곽 직접 계측에서는 제외했다. 이번 변경 일곱 곳은 모두 직접 계측했다. [집계·비교 JSON](evidence/front-18-4-4/comparison.json)

| 기존 번호 | 화면 및 카드 | 카드 유형 | 최종 규격 | 적용 방식 | 예외 여부 | 검증 근거 | 최종 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | A01 오늘의 루틴·진행 중인 운동 | 강조 | 5px · 16/12/16/12 · 홈 12 | 4-3 직접 적용 | — | [실제 앱 · home](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 02 | A01 이번 주 일정 | 기본 | 5px · 12 · 홈 12 | 4-3 직접 적용 | — | [실제 앱 · home](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 03 | A01 선택 날짜 상세 | 중첩 | 5px · 10 · 위 8 · 입력 배경, 외곽선 제거 | 4-3 직접 적용 | — | [실제 앱 · home](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 04 | A01 홈 최근 운동 항목 | 목록 | 5px · 10/12 · 반복 8 | 4-3 직접 적용 | — | [실제 앱 · home](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 05 | A02 오프라인 운동 이어가기 제안 | 특수 | 18px · 21 · 복원 안내 배치 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · offline-offer](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 06 | B01 나의 루틴 헤더 | 강조 | 5px · 16/12 · 루틴 목록 gap 12, 강조 배경·기존 일반선 | 4-3 직접 적용 | — | [실제 앱 · routine](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 07 | B01 이번 주 일정 | 기본 | 공통 Card · 5px · 12 · 외부 12, 목록 모드 유지 | 4-3 직접 적용 | — | [실제 앱 · routine](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 08 | B01 저장된 루틴 항목 | 목록 | 공통 외곽 · 5px · 압축 10/12 · 항목 gap 8 | 4-3 직접 적용 | — | [실제 앱 · routine-list](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 09 | B01 새 루틴 일정 배정 제안 | 기본 | 5px · 12px · 내부 12px · margin 0 | 4-4 일반 Card 적용 | — | [격리 Chrome · created](evidence/front-18-4-4/after/measurements.json) | 4-4 적용 · 실측 |
| 10 | B02 루틴 요약 | 강조 | 5px · 16/12 · 본문 gap 12 · 지표 상단 8 | 4-3 직접 적용 | — | [실제 앱 · routine-detail](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 11 | B02 웨이트·유산소 종목 상세 | 목록 | 5px · 12 · 기존 10의 종목 그룹과 데이터 표시 | 4-3 직접 적용 | — | [실제 앱 · routine-detail](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 12 | B02 주간 일정 배정 상세 | 기본 | 5px · 12 · 배정 행과 구분선 유지 | 4-3 직접 적용 | — | [소스](../../src/features/workout-online/RoutineDetail.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 13 | B03/B04 이름·태그 입력 컨테이너 | 입력 | 공통 외곽 · 5px · 12 · 내부 gap 12 | 4-3 직접 적용 | — | [소스](../../src/features/workout-online/RoutineEdit.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 14 | B03/B04 웨이트·유산소 구성 카드 | 입력 | 5px · 12 · 입력 그룹 12, 편집 푸터 고정 | 4-3 직접 적용 | — | [소스](../../src/features/workout-online/RoutineEdit.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 15 | B03 새 루틴의 종목 없음 슬롯 | 상태 | 5px · 패딩 8 · 최소 78px · 점선 슬롯 | 기존 보호 스타일 | 기존 기능 규격 | [소스](../../src/features/workout-online/RoutineEdit.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 승인 예외 유지 · 실측 미확인 |
| 16 | B03/B04 웨이트 선택·교체 검색 컨테이너 | 입력 | 공통 formbox · 5px · 12 · 검색 조작 자체 유지 | 4-3 직접 적용 | — | [소스](../../src/features/workout-online/RoutineEdit.module.css) · [이전 추적표](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 17 | B06 자동 순환 포함·제외 그룹 | 입력 | 공통 Card · 5px · 12 · 부모 gap 12 · 카드 margin 0 | 4-3 직접 적용 | — | [격리 Chrome · schedule-order](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 18 | B07 분류·프리셋 선택 표면 | 입력 | 5px · 14/12 통계 화면의 조작 셸 · 내부 12 | 4-3 직접 적용 | — | [격리 Chrome · muscle-plan](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 19 | B07 주간 계획 요약 | 통계 | 5px · 14/12 · 16 · 수치 2열 유지 | 4-3 직접 적용 | — | [격리 Chrome · muscle-plan](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 20 | B07 계획 세트 분포 | 통계 | 5px · 14/12 · 독립 16 | 4-3 직접 적용 | — | [격리 Chrome · muscle-plan](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 21 | C01 준비운동 시간 | 특수 | 5px · 상하 34 · 좌우 18 또는 14 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · warmup](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 22 | C01 준비운동 안내 | 특수 | 5px · 18 또는 14 · 준비 정보 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · warmup](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 23 | C02 진행 중량·장비·한쪽 원판 | 특수 | 5px · 상하 12 · 좌우 18 또는 14 · 진행 중량 레이아웃 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · workout](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 24 | C02 세트 입력·이전 세트 | 특수 | 5px · 상하 12/좌우 8 · 세트 gap 7 · 이전 기록 열 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · workout](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 25 | C02/C03 운동 시계·휴식 상태 / 하단 진행 액션 | 특수 | 전폭 고정 · 상단 63px 예시 · 하단 gap 6 · 안전 영역 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · workout](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 26 | C03 당시 유산소 계획 | 특수 | 5px · 12 · 3열 당시 계획 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · cardio-complete](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 27 | C03 유산소 측정 타이머 | 특수 | 5px · 12 · 타이머 최소 126과 강조색 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · cardio-complete](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 28 | C03 유산소 확인 입력 | 입력 | 5px · 12 · 입력·미저장 동작 유지 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · cardio-review](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 29 | C03 유산소 실제 완료 기록 | 특수 | 5px · 12 · 기록 행 정보 유지 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · cardio-complete](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 30 | C04 이번 운동만 수정 안내·조작 | 입력 | 5px · 18 또는 14 · 수정 도구·조작 계속 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · workout-edit](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 31 | C04 기구 변경 폼·유산소 재구성 | 입력 | 인라인 장비 5px · 기존 공간 · 기능형 Dialog 보존 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · workout-edit](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 32 | C05/D03 운동 요약 헤더 | 강조 | 5px · 상/우/하/좌 10/12/14/12 · compact 요약 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · record-detail](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 33 | C05/D03 웨이트·유산소 수행 | 기본 | 5px · 14/12 · 승인된 요약 행과 좁은 폭 예외 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · record-detail](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 34 | C05/D03 과거 중량 검토 접이형·내부 행 | 통계 | 5px · 상하 0 · 내부 카드 투명/무선 유지 | 기존 보호 스타일 | 기존 기능 규격 | [소스](../../src/features/workout-flow/WorkoutRecordDetail.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 승인 예외 유지 · 실측 미확인 |
| 35 | C05/D03 승인 대기 검토 | 입력 | 5px · 8/12 · 기록 승인 조작·가드 | 기존 보호 스타일 | 기존 기능 규격 | [소스](../../src/features/workout-flow/WorkoutRecordDetail.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 승인 예외 유지 · 실측 미확인 |
| 36 | C05/D03 기록 보존 안내 | 기본 | 5px · 14/12 · 기록 보존 설명의 기존 위치 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · record-detail](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 37 | C06 읽기 전용 세션·기기 인계 | 특수 | 18px · 21 · 세션 인계와 편집권 흐름 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · handoff](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 38 | D01 이번 주 요약 | 통계 | 5px · 요약 패딩 예외 16/14/14/14 유지 · 섹션 20 | 4-3 직접 적용 | — | [격리 Chrome · statistics-main](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 39 | D01 주간 요약 지표 타일 | 중첩 | 5px · 타일 간격 7→8 · 3열 최소 높이 유지 | 4-3 직접 적용 | — | [격리 Chrome · statistics-main](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 40 | D01 운동 분석 진입 타일 | 목록 | 5px · 2열 타일 gap 8 · 제목/설명 4 · 하한 보존 | 4-3 직접 적용 | — | [격리 Chrome · statistics-main](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 41 | D01 기록 탭 최근 운동 항목 | 목록 | 5px · 공통 외곽 · 12 · 목록 8 | 4-3 직접 적용 | — | [격리 Chrome · statistics-main](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 42 | D02 월·일정/종목 필터 외곽 | 입력 | 5px · 통계 필터 조합 14/12 · 기간 조작은 투명 | 4-3 직접 적용 | — | [소스](../../src/features/statistics/RecordMain.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 43 | D02 전체 운동 이력 항목 | 목록 | 5px · 공통 외곽 · 12 · 항목 8 | 4-3 직접 적용 | — | [소스](../../src/features/statistics/RecordMain.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 44 | D04/D06 정정·평가 이력 요약 | 강조 | 18→5px · 강조 16/12 · 정정/평가 메뉴 유지 | 4-3 공통 Card | — | [격리 Chrome · record-correction](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 45 | D04 완료 수행 컨테이너 | 입력 | 18→5px · 18/14px 가변 기본값→12px | 4-3 공통 Card | — | [격리 Chrome · record-correction](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 46 | D03/D04/D06 변경 결과 미확인·재확인 | 상태 | 5px · 이전 상태 표면 패딩 18/14 유지 | 4-3 직접 적용 | — | [소스](../../src/features/workout-online/ClosedWorkout.tsx) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 47 | D06 공식 평가·변경 이력 | 통계 | 18→5px · 통계 14/12 · 설명·행 유지 | 4-3 직접 적용 | — | [격리 Chrome · record-evaluation](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 48 | D04/D06 기록 관리의 승인 확인 필요 | 상태 | 5px · 상태 폼 21px/좁은 폭 16px · 내부 18px · margin 0 | 4-4 공통 Card 및 상태 폼 패딩 유지 | 상태 폼 패딩 21/16 | [격리 Chrome · approval](evidence/front-18-4-4/after/measurements.json) | 4-4 적용 · 실측 |
| 49 | D04 정정 Dialog 내부 원본 사실 | 입력 | 기능형 Dialog 안 카드의 18px · 이전 18/14 패딩 | 기존 보호 스타일 | 기존 기능 규격 | [소스](../../src/features/workout-online/ClosedWorkout.tsx) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 승인 예외 유지 · 실측 미확인 |
| 50 | E01 기간 선택 외곽 | 입력 | 공통 Card 기간 외곽 5px · 통계 셸 패딩 14/12 | 4-3 직접 적용 | — | [소스](../../src/features/statistics/Activity.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 51 | E01 완료 세트·총중량 타일 | 통계 | 5px · 14/12 · 타일 8 · 최소 86 유지 | 4-3 직접 적용 | — | [격리 Chrome · activity](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 52 | E01 운동량 추이·검색 | 통계 | 5px · 14/12 · 독립 16 · 차트 220 하한 유지 | 4-3 직접 적용 | — | [소스](../../src/features/statistics/Activity.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 53 | E01 달성 현황·주간 타일 | 통계 | 5px · 14/12 · 독립 16 · 날짜 조작 스타일 보존 | 4-3 직접 적용 | — | [격리 Chrome · activity](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 54 | E01 유산소 현황·상세 | 통계 | 5px · 14/12 · 독립 16 | 4-3 직접 적용 | — | [격리 Chrome · activity](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 55 | E02 분석할 운동 검색 | 입력 | 5px · 검색 외곽 12 · 본문 gap 12 | 4-3 직접 적용 | — | [격리 Chrome · growth](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 56 | E02 성장 분석·중량 그래프 | 통계 | 5px · 14/12 · 독립 16 · 그래프 구조 유지 | 4-3 직접 적용 | — | [격리 Chrome · growth](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 57 | E02 최신 공식 승인 중량 요약 | 중첩 | 5px · 12 · 내부 gap 8 · 강조 배경 유지, 중복선 제거 | 4-3 직접 적용 | — | [격리 Chrome · growth](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 58 | E02 승인 중량 변경 이력 | 목록 | 5px · 12 · 기존 이력 행/구분선 | 4-3 직접 적용 | — | [소스](../../src/features/statistics/Growth.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 59 | E03 기간·보기 방식 컨트롤 | 입력 | 5px · 14/12 통계 화면의 조작 셸 · 내부 12 | 4-3 직접 적용 | — | [격리 Chrome · muscle-statistics](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 60 | E03 주간 세트 달성 | 통계 | 5px · 14/12 · 독립 16 · 달성 수치 구조 | 4-3 직접 적용 | — | [격리 Chrome · muscle-statistics](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 61 | E03 근육별·분류별 달성 분포 | 통계 | 5px · 14/12 · 독립 16 · 근육 분포 표시 | 4-3 직접 적용 | — | [격리 Chrome · muscle-statistics](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 62 | F01 내 계정 요약 | 강조 | 공통 hero · 5px · 16/12 · 기존 그룹 16 | 4-3 직접 적용 | — | [실제 앱 · settings-closed](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 63 | F01 운동 설정 / 데이터 및 앱 / 계정·데이터 삭제 그룹 | 기본 | 5px · 세로 0/좌우 12 · 행 자체 패딩과 64px 유지 | 기존 규격 유지 | — | [실제 앱 · settings-closed](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 64 | F01 앱 설치·오프라인 준비 | 기본 | 5px · 0/12px · 인접 8px · margin 0 | 4-4 details에 카드 표면 재사용 · 부모 gap | 행 패딩 별도 | [실제 앱 · settings-open](evidence/front-18-4-4/live/measurements.json) | 4-4 적용 · 실측 |
| 65 | F02 내 이메일·인증 / 로그인 수단 / 보안 / 기기 링크 | 입력 | 5px · 12 · 제목/설명 4, 독립 카드 16 · 기기 링크 세로 0 | 4-3 직접 적용 | — | [소스](../../src/features/auth/AccountSettings.module.css) · [이전 근거](front-18-4-3-card-foundation.md#4-1-사용처별-적용-추적) | 기존 적용 · 실측 미확인 |
| 66 | F03 기기 요약 | 통계 | 5px · 14/12px · 내부 12px · 요약 강조 배경·선 유지 | 4-4 통계 패딩 토큰 · 지표 margin 제거 | 요약 강조 배경·선 | [실제 앱 · devices](evidence/front-18-4-4/live/measurements.json) | 4-4 적용 · 실측 |
| 67 | F03 현재 및 다른 기기 항목 | 목록 | 5px · 12px · 다른 기기 반복 8px · 현재 기기 섹션 12px | 4-4 공통 Card와 반복 gap | — | [격리 Chrome · devices](evidence/front-18-4-4/after/measurements.json) | 4-4 적용 · 실측 |
| 68 | F04 반복 구간별 휴식 시간 | 입력 | 공통 5px · 12 · 제목–설명 4 · 헤더 구분선 | 4-3 직접 적용 | — | [실제 앱 · rest-edit](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 69 | F05 알림 옵션 그룹 | 입력 | 5px · 상하 0/좌우 12 · 행과 스위치 유지 | 기존 규격 유지 | — | [격리 Chrome · rest-alerts](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 70 | F05 실서비스 알림 시연 표면 | 특수 | 5px · 10/12/12/12 · 실제 알림 시연 구조 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · rest-alert-preview](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
| 71 | F06 표준 운동 검색·목록 외곽 | 입력 | 18→5px · 12 · 카드 내부 12 · 스크롤 컨테이너 유지 | 4-3 직접 적용 | — | [실제 앱 · catalog](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 72 | F07 운동 식별·기구/분류 / 주요·보조 근육 | 기본 | 18→5px · 18/14px 가변 기본값→12px | 4-3 공통 Card | — | [실제 앱 · catalog-detail](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 73 | F07 자세 미디어 슬롯과 상위 카드 | 특수 | 바깥 18→5px/12 · 안쪽 정사각형 미디어 외곽 유지 | 4-3 공통 Card | 미디어 비율·안쪽 슬롯 | [실제 앱 · catalog-detail](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 74 | F07 운동 방법 접이형 | 기본 | 18→5px · 세로 0/좌우 12 · 접이형 summary | 4-3 공통 Card | — | [실제 앱 · catalog-detail](evidence/front-18-4-4/live/measurements.json) | 기존 적용 · 실측 |
| 75 | F09 이메일 인증코드 입력 | 입력 | 5px · 12px · 내부 12px · 초기 상단 위치·폼 유지 | 4-4 입력 Card 적용 | 인증 시작점·내부 폼 | [격리 Chrome · otp](evidence/front-18-4-4/after/measurements.json) | 4-4 적용 · 실측 |
| 76 | F10 로그인 상태 조회 오류(연결 재확인) | 상태 | 5px · 상태 폼 21px/좁은 폭 16px · 내부 18px · 중복 margin 제거 | 4-4 공통 Card 및 상태 패딩 유지 | 복구 폼 패딩 21/16 | [격리 Chrome · auth-error](evidence/front-18-4-4/after/measurements.json) | 4-4 적용 · 실측 |
| 77 | 공통 독립 EmptyState·조회 오류 | 상태 | 18→5px · 20/16 · 최소 222 · embedded 투명/0선 | 4-3 직접 적용 | — | [격리 Chrome · devices-error](evidence/front-18-4-4/after/measurements.json) | 기존 적용 · 실측 |
| 78 | 공통 초기 로딩 skeleton 묶음 | 상태 | 5px · 슬롯별 높이 유지 · 주간 요약 섹션 gap 20 일치 | 기존 보호 스타일 | 기존 기능 규격 | [격리 Chrome · devices-loading](evidence/front-18-4-4/after/measurements.json) | 승인 예외 유지 · 실측 |
