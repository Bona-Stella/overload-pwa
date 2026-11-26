# FRONT 18 · 5-5B/C 검수 자료 정리와 공식 문서 갱신

2026-11-26. 사용자가 5-3C와 5-4의 최종 디자인을 승인했다. 구현 커밋은 `2145d1c`이며, 이 마감의 문서와 자료 변경은 별도 검토를 위해 작업 트리에 두었다. [최종 결정과 승인](../product/Overload_UI_Decision_Log_v0.9.md#front18-stage5-decision)

## 정리 전후

집계 범위는 5-1, 5-3A/B/C, 5-4의 Git 추적 검수 자료와 이 작업에 대응하는 로컬 재생성 캡처다. 보고서와 별도 백업본은 집계에서 제외했다.

| 범위 | 전 PNG | 전 JSON | 후 PNG | 후 JSON | 전 바이트 | 후 바이트 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Git 추적 자료 | 24 | 20 | 22 | 20 | 7,836,523 | 7,769,562 |
| 로컬 재생성 캡처 | 3 | 0 | 0 | 0 | 109,962 | 0 |
| 합계 | 27 | 20 | 22 | 20 | 7,946,485 | 7,769,562 |

47개에서 42개로 줄었고 PNG 5개의 정리로 176,923바이트를 줄였다. 추적 PNG 중에서는 5-3A의 초기 휠 캡처 `front-18-5-3/5-3-wheel-393.png`와 5-3B의 중간 유산소 목표 캡처 `front-18-5-3-refinement/goal-editor-393.png`를 보관본으로 옮겼다. 로컬에서는 `logs/common-ui-preview/`의 재생성 가능한 초기 5-3 캡처 3개를 정리했다. 5-1의 원본 계측을 포함한 JSON 20개와 남긴 PNG 22개는 모두 원본 SHA-256과 일치한다.

백업은 `.local-backups/front-18-5-5-bc-2026-11-26/`에 있다. `manifest.json`에 정리 전 목록과 SHA-256을 기록했고 `verification-after.json`에 검증 결과를 남겼다. `original/`의 14개 사본은 공식 문서와 보고서 8개, 정리한 캡처 5개, 5-1 계측 원본 1개다. 보존한 자료의 해시와 사본의 무결성을 대조했다. 백업 디렉터리는 Git에서 제외되며 운영 빌드와 Service Worker의 자산 수집은 별도의 빌드 출력만 사용한다.

## 보존 근거

- 401개 위치 조사표와 최종 402개 현황표, 56개 확대 적용의 판정 근거를 보존했다. [5-1 조사](front-18-5-1-control-audit.md) · [402개 적용 현황표](evidence/front-18-5-4/control-inventory.json) · [5-4 적용 보고서](front-18-5-4-control-rollout.md)
- 393px 숫자 입력과 정정 전후, 320px 종료·중량 변경 비교, 휴식 설정 4열, 유산소 추가 목표와 심박수·케이던스 Preview의 대표 근거를 보존했다. [5-3A](front-18-5-3-control-foundation.md#chrome-및-격리-preview) · [5-3B](front-18-5-3-user-refinement.md#검수-주소와-이미지) · [5-3C](front-18-5-3-final-refinement.md#chrome-검수) · [5-4](front-18-5-4-control-rollout.md#검증-결과)
- 홈 상세와 디로딩 조회 실패의 재현·복구, 4174 LAN HTTP START, 종료 후 재승인 UUID, 실제 Spring 연동, Chrome 최종 계측, 회귀·빌드와 Service Worker 결과를 보존했다. [5-3B 재현](front-18-5-3-user-refinement.md#홈-루틴-선택시작-오류) · [4174 재검수](front-18-5-3-final-refinement.md#mac-4174-재검수) · [5-4 최종 검증](evidence/front-18-5-4/test-results.json)

## 공식 문서 갱신

| 문서 | 갱신 범위 |
| --- | --- |
| [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#front18-controls-visual) | 20절에서 버튼·일반 입력·검색·숫자 휠 치수와 기능성 예외를 확정했다. 휴식 푸터 간격은 8px을 적용했다. |
| [Decision Log](../product/Overload_UI_Decision_Log_v0.9.md#front18-stage5-decision) | 10.45절에 최종 승인, 숫자 chevron 철회, 페이스 5초 휠, 경사도 0.1%p와 후속 계약을 기록했다. |
| [UI/UX](../product/ui-ux.md#312-공통-숫자-입력) | 숫자의 탐색·확인·취소, 부모 초안, 웨이트와 유산소 편집·실측 및 실제 휴식 설정 조작을 갱신했다. |
| [Frontend 개발 지침](../engineering/frontend.md#front18-stage5) | 구현·승인, 공통 컴포넌트·데이터 보호, 확인된 오류의 처리와 검증, 기존 Mac 4174 사용 절차를 기록했다. |

위 공식 문서 4개와 [5-3A 공통 모듈](front-18-5-3-control-foundation.md), [5-3B 사용자 피드백](front-18-5-3-user-refinement.md), [5-3C 최종 보완](front-18-5-3-final-refinement.md), [5-4 전체 적용](front-18-5-4-control-rollout.md) 보고서의 참조 또는 승인 상태를 갱신했다. 이 마감 보고서 1개를 추가하고 위의 추적 PNG 2개를 보관본으로 옮겼다.

## 검증과 다음 단계

변경한 문서의 상대경로·이미지 참조·Markdown 표, 백업 SHA-256, 추적 자료 변경 범위 및 `git diff --check`를 확인했다. 읽기 전용으로 보존한 5-1 조사표의 B156·B157 소스 줄 번호는 당시 기준 커밋 `87b585a`에서 확인했다. 기존 검수의 전체 735/735, 집중 182/182, Chrome 5개 화면 폭, 타입·ESLint·빌드·Service Worker·Spring 결과는 5-4에서 실행한 기록이다. 이번에는 문서와 자료를 검증했으며 기존 Mac 4174 게이트웨이를 유지했다. Mac에서 LAN 앱·Preview의 HTTP 200과 Spring health의 `UP`을 확인했다. [5-4 실행 결과](front-18-5-4-control-rollout.md#검증-결과)

5단계는 사용자 승인과 문서·자료 정리를 마쳤다. 휴식일의 간헐적 START 불일치와 운동 저장 상태 실패의 직접 원인, iPhone Safari 및 설치형 PWA 실기기 검증은 남아 있다. 휴식 4구간과 목표 심박수·케이던스 범위는 Preview이며 서버 계약은 전체 UI·UX 확정 이후 검토한다. 6단계 ConnectedDropdown 확대는 착수 대기다. [구현 상태와 후속 범위](../engineering/frontend.md#front18-stage5)
