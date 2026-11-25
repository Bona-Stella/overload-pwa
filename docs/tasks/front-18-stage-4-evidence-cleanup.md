# FRONT 18 — 4단계 검수 자료 정리

2026-11-26 · 사용자가 전체 카드 디자인을 승인한 뒤 Git 커밋을 준비하기 위해 작성했다.

## 정리 전후

범위는 4단계 검수 자료 6개 폴더와 소유가 확인된 4단계 로컬 출력이다. 4단계 보고서 6개 및 이 정리 보고서는 표에서 제외했다. 확보 용량은 검수 경로에서 제거한 원본의 바이트 합계이며 압축 백업 용량은 별도다.

| 파일 유형 | 정리 전 | 삭제 | 최종 | 확보 바이트 |
| --- | ---: | ---: | ---: | ---: |
| PNG 검수 이미지 | 145 | 121 | 24 | 2,352,713 |
| 계측·관리 JSON | 29 | 6 | 23 | 2,726,409 |
| 검수 로그 | 61 | 53 | 8 | 530,703 |
| 기타 파일(실행 스크립트·해시 목록) | 11 | 0 | 11 | 0 |
| 합계 | 246 | 180 | 66 | 5,609,825 |

전체 검수 자료는 **16,721,004바이트 → 11,111,179바이트**다. 원본 이미지에 SHA-256 중복 16그룹이 있었고, 그중 4개 파일은 보존 이미지와 바이트가 같아 보고서 링크를 그 이미지로 통합했다. 이외에는 화면 단계·상태가 반복되거나 수치로 설명할 수 있는 캡처를 정리했다. 완전 중복 그룹에서 화면 대표 증거로 고른 파일은 그룹당 최대 한 장만 남겼다.

## 대표 스크린샷

- [home-selected.png](evidence/front-18-4-3-final/live-after/home-selected.png) · 홈 날짜 선택과 중첩 카드
- [12-assigned.png](evidence/front-18-4-5/393/12-assigned.png) · 루틴 상세·긴 일정명·배정 행
- [weight-footer.png](evidence/front-18-4-3-buttons/after/weight-footer.png) · 진행 운동의 고정 푸터
- [record-detail.png](evidence/front-18-4-1/record-detail.png) · 기록 상세·수행 정보. 4-3 이미지와 SHA-256 일치
- [52-search-open.png](evidence/front-18-4-5/393/52-search-open.png) · 운동량 차트와 검색
- [58-populated.png](evidence/front-18-4-5/393/58-populated.png) · 성장 추적의 승인 중량 이력
- [install-closed.png](evidence/front-18-4-3-final/live-after/install-closed.png) · 설정의 설치·오프라인 준비
- [rest-settings.png](evidence/front-18-4-3-buttons/after/rest-settings.png) · 세트 사이 휴식 설정과 소형 액션
- [workout-dialog.png](evidence/front-18-4-3-final/after/workout-dialog.png) · 메시지형 Dialog의 동일 너비 액션

### 비교와 예외 근거

- [schedule-order.png](evidence/front-18-4-1/schedule-order.png) · 일정 전체 편집 최초 외곽
- [schedule-order.png](evidence/front-18-4-3/schedule-order.png) · 일정 전체 편집 간격 보완
- [growth.png](evidence/front-18-4-1/growth.png) · 성장 분석 중첩 외곽 변경 전
- [growth.png](evidence/front-18-4-3/growth.png) · 성장 분석 중첩 외곽 변경 후
- [home-selected.png](evidence/front-18-4-3-final/live-before/home-selected.png) · 같은 날짜의 홈 중첩 카드 변경 전
- [install-closed.png](evidence/front-18-4-3-final/live-before/install-closed.png) · 설치 카드 접힘 변경 전
- [weight-footer.png](evidence/front-18-4-3-buttons/before/weight-footer.png) · 운동 푸터 반경 변경 전
- [workout-dialog.png](evidence/front-18-4-3-final/before/workout-dialog.png) · 메시지형 Dialog 액션 너비 보완 전
- [created.png](evidence/front-18-4-4/before/created.png) · 일반 카드 18px·21px 최초 상태
- [created.png](evidence/front-18-4-4/after/created.png) · 일반 카드 5px·12px 적용 후
- [devices.png](evidence/front-18-4-4/after/devices.png) · 기기 요약과 반복 기기 행
- [otp.png](evidence/front-18-4-4/after/otp.png) · 일반 인증 입력 표면
- [auth-error.png](evidence/front-18-4-4/after/auth-error.png) · 로그인 연결 오류의 상태 패딩
- [49-weight-original.png](evidence/front-18-4-5/393/49-weight-original.png) · 정정 Dialog의 18px 예외 표면
- [A2-workout-approval.png](evidence/front-18-4-5/393/A2-workout-approval.png) · 진행 운동 승인 재확인의 18px·21/16px 예외

## 핵심 계측

- 4-1 최초 외곽·간격 및 사용처 조사 원본과 [최초 계측](evidence/front-18-4-1/chrome-card-audit.json)
- 4-3 소형 버튼 [15개 비교 및 실앱 요약](evidence/front-18-4-3-buttons/comparison.json), 운동 푸터·포인터 밝기 [변경 전 프레임](evidence/front-18-4-3-final/before/measurements.json)과 [변경 후 프레임](evidence/front-18-4-3-final/after/measurements.json), [실제 운동 응답과 프레임](evidence/front-18-4-3-final/live-workout/measurements.json)
- [4-4의 78개 적용표](front-18-4-4-card-coverage.md#78개-사용처-적용표), [직접 실측 63개와 승인 예외 표본](evidence/front-18-4-4/after/measurements.json) 및 [실제 앱 계측](evidence/front-18-4-4/live/measurements.json)
- [4-5의 80개 최종 적용표](front-18-4-5-card-final-review.md#최종-사용처-적용표), [신규 계측 17개](evidence/front-18-4-5/matrix.json), [재조회 좌표](evidence/front-18-4-5/stability.json) 및 [실제 앱](evidence/front-18-4-5/live.json)
- [Toast 보완 전](evidence/front-18-4-5/repeat-toast-before.json)과 [보완 후](evidence/front-18-4-5/repeat-toast.json), [저장 상태 독립 검증](evidence/front-18-4-5/repeat-save.json), [회귀 실행 결과](evidence/front-18-4-5/test-results.json), [PWA 사전 캐시 검증](evidence/front-18-4-5/production-cache.json)
- [당시 151개 파일의 SHA-256 기록](evidence/front-18-4-5/prior-integrity.json)과 [4-5의 정리 후보 기록](evidence/front-18-4-5/cleanup-inventory.json)은 과거 시점의 목록이다. 이번에 제거한 경로와 복구 원본은 아래에 별도로 남겼다.

## 보존한 실행 결과

### 4-4 간헐 실패 기록

- `front18-44-complete.log`의 공통 UI Preview 회귀. 초기 데이터가 없는 최근 기록의 명시적 재시도 후 `Timed out: 연결할 수 없어요. 다시 시도해 주세요.`가 기록됐다.
- `front18-44-full.log`의 운동 저장 상태 회귀. `unconfirmed repetitions and explicit failures stay independent of durable save status`에서 기대값 `saved` 대신 `saving`이 관측됐다.

원문은 로컬 `logs/`에 보존했다. [4-5 조사와 반복 결과](front-18-4-5-card-final-review.md#간헐적-실패-조사)

### 4-5 검사 기록

최근 기록 새로고침은 보완 전 실패 4/10, 보완 후 실패 0/10이었다. 운동 저장 상태 집중 검사는 실패 0/10이고 4-4의 원인은 미확정으로 기록했다. 전체 처리 중 Dialog 호버 색상과 키보드 종료 직후 푸터 관측의 별도 실패는 실행 요약에 유지했다. [실행 요약](evidence/front-18-4-5/test-results.json)

- `front18-45-full-closeout.log` · ℹ tests 728 · ℹ pass 728 · ℹ fail 0 · ℹ skipped 0
- `front18-45-protection-final.log` · ℹ tests 27 · ℹ pass 27 · ℹ fail 0 · ℹ skipped 0

전체 실행과 집중 실행의 최종 로그, 두 관측 실패의 원문은 로컬 `logs/`에 보존했다. 이번 자료 정리에서는 이전 검사 결과를 인용했다.

### 빌드 기록

TypeScript와 운영 빌드, 4173 검수 빌드는 4-5에서 성공했다. PostCSS `from` 옵션과 Vite 청크 크기 경고가 기록됐다. 이 기록의 원문 `front18-45-build-final.log`, `front18-45-review-build.log`는 로컬 `logs/`에 보존했다. [운영 사전 캐시와 Preview 제외](evidence/front-18-4-5/production-cache.json)

## 참조와 백업

바이트가 동일한 캡처는 실제 보존 이미지로 연결했다. 나머지 캡처 링크는 같은 단계의 계측·비교 자료 또는 아래 원본 목록으로 연결했다. 로컬 전용 로그 링크는 저장소의 검사 기록으로 연결했다. 기존 보고서의 수치, 실패 이력, 결정과 SHA-256 결과는 당시 기록을 유지한다.

원본은 `.local-backups/front-18-stage-4-evidence-2026-11-26/originals.zip`에 상대 경로 그대로 저장했다. 삭제 파일 180개와 링크 수정 전 보고서 6개를 포함한다. 옆의 `manifest.json`에 경로·바이트·SHA-256이 있다. 재실행이 필요한 역사적 검수 스크립트는 로그 폴더에 보존했다. 과거 시점의 자료 전체를 읽는 스크립트를 실행하려면 아카이브에 기록된 원본 경로를 별도 검수 복제본에 복원한다.

삭제 파일과 링크 변경 전 보고서를 포함한 ZIP 원본 186개를 SHA-256으로 대조했다. 삭제 경로의 부재와 보존 자료의 일치를 확인했다. 상대 링크 682개의 대상이 존재하고 4-1·4-4·4-5 적용표의 78·78·80개 번호가 일치한다. 기존 보고서 6개의 링크 이외 본문은 ZIP 원본과 일치한다. 제품·정적 자산·테스트·검수 스크립트·공식 문서를 포함한 501개 파일의 SHA-256 및 Git HEAD와 인덱스가 일치했고 diff 공백 검사를 통과했다. 제품, 테스트와 저장소의 검수 스크립트에서 삭제 경로를 참조하는 곳은 0건이다. 보존 증거 47개와 보고서 7개는 미추적 상태이며 스테이징은 비어 있다. 기존 4173 프로세스에서 실제 앱과 두 Preview가 HTTP 200을 반환했다.

## 다음 검수와 커밋 준비

공식 문서, 단계별 보고서, 자동화 테스트 및 fixture는 계속 보존한다. 승인 후에는 실제로 달라진 디자인의 비교, 대표 최종 화면, 재현하기 어려운 오류의 기록을 선별한다. 반복 스크린샷, 중간 계측과 디버깅 출력은 링크를 대조한 뒤 정리한다. 이 작업은 저장소의 추적 및 무시 규칙을 유지한다.

커밋을 준비할 때는 카드 구현, 테스트, 6개 단계 보고서, 아래 선별 증거와 이 정리 보고서를 확인한다. 원본 아카이브와 실행 로그는 기존 무시 경로에 있다. 4-1 조사표도 현재 미추적 상태이므로 커밋 파일을 고를 때 함께 확인한다.

## 삭제한 파일

파일명은 작업 폴더에 대한 경로다. 가까운 검증 근거는 위에서 연결하며 원본 복구 경로는 아카이브의 동일한 상대 경로다.

### front-18-4-1

| 삭제 경로 | 바이트 | 이유 또는 보존본 |
| --- | ---: | --- |
| `docs/tasks/evidence/front-18-4-1/account.png` | 23,019 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/activity.png` | 26,897 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/catalog-detail.png` | 9,777 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/catalog.png` | 44,666 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/devices.png` | 31,871 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/home-today.png` | 37,459 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/home-week.png` | 10,928 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/record-list-context.png` | 6,720 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/record-list.png` | 6,773 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/record-main.png` | 14,220 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/rest-alerts.png` | 36,610 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/rest-edit.png` | 25,267 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/rest-settings.png` | 13,351 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/routine-detail.png` | 20,849 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/routine-edit.png` | 24,985 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/routine-list.png` | 52,472 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/routine-week.png` | 21,701 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/settings-main.png` | 21,262 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/workout-cardio.png` | 34,710 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/workout-rest.png` | 5,320 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/workout-summary.png` | 32,366 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-1/workout-weight.png` | 17,654 | 부가 상태·중간 단계 또는 반복 캡처 |

### front-18-4-3

| 삭제 경로 | 바이트 | 이유 또는 보존본 |
| --- | ---: | --- |
| `docs/tasks/evidence/front-18-4-3/account.png` | 23,058 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/activity.png` | 26,897 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/app-4173.json` | 330,117 | 4-3 초기 실앱 점검 전체 출력. 보고서 결과, 4-4·4-5 실앱 및 운동 프레임 근거 유지 |
| `docs/tasks/evidence/front-18-4-3/catalog-detail.png` | 9,131 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/catalog.png` | 44,788 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/chrome-card-foundation.json` | 1,097,864 | 4-3 공통화 중간 계측. 4-3 보고서 요약과 4-4·4-5 최종 계측을 유지 |
| `docs/tasks/evidence/front-18-4-3/home-today.png` | 37,568 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/home-week.png` | 10,997 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/record-correction.png` | 31,357 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/record-detail.png` | 34,551 | 동일본 [record-detail.png](evidence/front-18-4-1/record-detail.png) |
| `docs/tasks/evidence/front-18-4-3/record-empty.png` | 8,420 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/record-list-context.png` | 6,596 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/record-main.png` | 13,987 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/rest-edit.png` | 25,267 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/rest-settings.png` | 13,351 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/routine-detail.png` | 19,153 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/routine-edit.png` | 24,987 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/routine-list.png` | 52,405 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/routine-week.png` | 21,722 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/settings-main.png` | 21,223 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/workout-cardio.png` | 34,710 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/workout-rest.png` | 5,320 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/workout-summary.png` | 32,417 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3/workout-weight.png` | 17,654 | 부가 상태·중간 단계 또는 반복 캡처 |

### front-18-4-3-buttons

| 삭제 경로 | 바이트 | 이유 또는 보존본 |
| --- | ---: | --- |
| `docs/tasks/evidence/front-18-4-3-buttons/after/cardio-footer.png` | 4,645 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/cardio-list.png` | 2,603 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/exercise-list.png` | 4,302 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/finish-footer.png` | 5,174 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/home-return.png` | 26,926 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/measurements.json` | 307,898 | 버튼 전후 비교표에 통합된 최종 폭별 상세 출력 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/record-return.png` | 27,153 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/rest-footer.png` | 5,320 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/routine-detail-header.png` | 2,931 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/routine-detail.png` | 1,260 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/start-footer.png` | 2,602 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/after/warmup-footer.png` | 3,733 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/cardio-footer.png` | 6,400 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/cardio-list.png` | 3,121 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/exercise-list.png` | 4,932 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/finish-footer.png` | 6,944 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/home-return.png` | 26,926 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/measurements.json` | 284,840 | 버튼 전후 비교표에 통합된 초기 폭별 상세 출력 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/record-return.png` | 27,153 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/rest-footer.png` | 5,320 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/rest-settings.png` | 6,150 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/routine-detail.png` | 1,658 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/before/warmup-footer.png` | 4,591 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-buttons/live/measurements.json` | 51,676 | 버튼 전후 비교표의 실제 앱 항목과 작업 보고서로 요약된 초기 실앱 계측 |

### front-18-4-3-final

| 삭제 경로 | 바이트 | 이유 또는 보존본 |
| --- | ---: | --- |
| `docs/tasks/evidence/front-18-4-3-final/after/exercise-title.png` | 5,680 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/home-selected.png` | 12,608 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/home-today.png` | 10,964 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/install-closed.png` | 5,800 | 동일본 [install-closed.png](evidence/front-18-4-3-final/live-after/install-closed.png) |
| `docs/tasks/evidence/front-18-4-3-final/after/install-open.png` | 30,857 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/new-routine.png` | 17,052 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/presets.png` | 2,574 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/rest-edit.png` | 5,601 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/routine-date.png` | 5,037 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/routine-edit.png` | 2,921 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/after/settings-divider.png` | 18,503 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/exercise-title.png` | 5,709 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/home-selected.png` | 11,339 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/home-today.png` | 10,964 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/install-closed.png` | 5,800 | 동일본 [install-closed.png](evidence/front-18-4-3-final/live-after/install-closed.png) |
| `docs/tasks/evidence/front-18-4-3-final/before/install-open.png` | 30,857 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/new-routine.png` | 16,666 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/presets.png` | 2,574 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/rest-edit.png` | 5,601 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/routine-date.png` | 3,681 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/routine-edit.png` | 2,921 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/before/settings-divider.png` | 18,491 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-after/home-today.png` | 8,871 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-after/install-open.png` | 26,109 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-after/new-routine.png` | 17,052 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-after/presets.png` | 2,442 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-after/routine-date.png` | 4,429 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-after/settings-divider.png` | 21,643 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-before/home-today.png` | 7,195 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-before/install-open.png` | 26,394 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-before/new-routine.png` | 16,666 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-before/presets.png` | 1,401 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-before/routine-date.png` | 3,267 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/live-before/settings-divider.png` | 21,462 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/recommendation-after/recommendation.png` | 6,553 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-3-final/recommendation-before/recommendation.png` | 6,633 | 부가 상태·중간 단계 또는 반복 캡처 |

### front-18-4-4

| 삭제 경로 | 바이트 | 이유 또는 보존본 |
| --- | ---: | --- |
| `docs/tasks/evidence/front-18-4-4/after/approval.png` | 22,250 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-4/before/approval.png` | 23,738 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-4/before/auth-error.png` | 18,672 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-4/before/devices.png` | 5,477 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-4/before/measurements.json` | 654,014 | 4-4 비교 JSON에 주요 전후 수치가 통합된 보완 전 일괄 계측 |
| `docs/tasks/evidence/front-18-4-4/before/otp.png` | 16,297 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-4/before/settings-closed.png` | 5,800 | 동일본 [install-closed.png](evidence/front-18-4-3-final/live-after/install-closed.png) |
| `docs/tasks/evidence/front-18-4-4/before/settings-open.png` | 29,704 | 부가 상태·중간 단계 또는 반복 캡처 |

### front-18-4-5

| 삭제 경로 | 바이트 | 이유 또는 보존본 |
| --- | ---: | --- |
| `docs/tasks/evidence/front-18-4-5/393/13-create.png` | 36,751 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/14-edit-weight.png` | 37,641 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/15-weight-and-cardio.png` | 33,311 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/16-add-search.png` | 34,984 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/34-open.png` | 76,118 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/35-pending.png` | 78,016 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/42-month.png` | 43,818 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/43-multi-row.png` | 43,818 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/46-unknown.png` | 46,818 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/50-period.png` | 40,050 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/52-chart.png` | 39,811 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/65-registered.png` | 51,933 | 부가 상태·중간 단계 또는 반복 캡처 |
| `docs/tasks/evidence/front-18-4-5/393/A1-empty.png` | 51,109 | 부가 상태·중간 단계 또는 반복 캡처 |

### logs

| 삭제 경로 | 바이트 | 이유 또는 보존본 |
| --- | ---: | --- |
| `logs/front18-43-build.log` | 1,804 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-43-data-protection.log` | 3,228 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-43-full-final.log` | 76,966 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-43-full.log` | 83,429 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-43-layout-retry.log` | 851 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-43-lint-scoped.log` | 0 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-43-lint.log` | 43 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-43-review-build.log` | 7,417 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-after.log` | 339 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-before.log` | 297 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-build.log` | 1,804 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-cards-final.log` | 281 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-data.log` | 3,228 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-44-extra.log` | 283 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-final.log` | 76,912 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-lint.log` | 43 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-live-catalog.log` | 9 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-live-routine.log` | 9 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-live.log` | 75 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-more.log` | 264 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-protected.log` | 76 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-release-lint.log` | 43 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-44-release.log` | 77,647 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-44-review.log` | 7,417 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-small-state-final.log` | 269 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-small-state.log` | 663 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-44-verified-lint.log` | 43 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-44-verified.log` | 76,934 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-45-build.log` | 1,804 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-full-followup.log` | 76,956 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-45-lint-final.log` | 0 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-lint.log` | 78 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-live-final.log` | 117 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-live-release.log` | 175 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-45-live.log` | 202 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-matrix-centers.log` | 1,585 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-matrix-final.log` | 5,428 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-matrix-last.log` | 4,066 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-matrix-states.log` | 1,386 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-matrix.log` | 9,138 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-previews-final.log` | 50 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-previews-verified.log` | 0 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-45-previews.log` | 51 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-protection.log` | 3,230 | 중간·반복 실행 출력. 핵심 실패와 최종 결과 보존 |
| `logs/front18-45-record-filter.log` | 1,997 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-save-run.log` | 394 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-save.log` | 116 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-stability.log` | 61 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-toast-corrected.log` | 984 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-toast-final.log` | 1,863 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-toast-fixed.log` | 151 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-toast-run.log` | 377 | 일회성 디버깅 또는 재생성 가능한 출력 |
| `logs/front18-45-toast.log` | 120 | 일회성 디버깅 또는 재생성 가능한 출력 |
