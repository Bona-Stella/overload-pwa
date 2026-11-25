# FRONT 18 — 4-3 버튼 형태 및 소형 보조 버튼 보완

2026-11-25 · 기존 4173 검수 환경에 반영

## 적용 범위

- `WorkoutFrame`의 고정 푸터 버튼에 공통 조작 모서리 `5px`을 적용했다. 3단계 캡슐 적용 커밋 `18b44d7`의 부모 커밋과 Visual Theme Spec의 운동 CTA 규격에서 기존 값을 확인했다. 준비운동 완료, 종목 시작, 세트 완료, 편집 닫기, 휴식 종료·연장, 유산소 일시정지·재개·완료·기록 확정, 다음 종목, 유산소 추가, 운동 종료·요약 및 저장·종료 결과 재확인이 이 푸터를 사용한다. 기존의 휴식 버튼은 이미 5px이었다.
- `WorkoutSummary` 하단의 뒤로가기 액션은 공통 `Button`의 캡슐형을 사용한다. 홈 최근 운동의 상세, 기록의 상세, 운동 종료 요약, 진입 화면이 돌아갈 곳을 지정하는 요약이 같은 컴포넌트를 사용한다. 상단 화살표는 `RecordSubpageHeader`의 기존 조작을 사용한다.
- `Button`에 `compact` 변형을 추가했다. 가운데에 위치한 30px 높이의 캡슐은 좌우 12px 패딩, `1px solid #353941` 테두리와 기존 투명 배경을 사용한다. 네이티브 버튼은 기존 48px 높이를 유지하고 최소 너비는 44px이다. 글자색과 굵기를 유지했으며, 글자 크기는 휴식·루틴 13px, 웨이트 11px, 유산소 12px이다. 공통 버튼의 포커스, 비활성화, `aria-busy`, 로딩 표시 로직을 사용한다.
- `compact`를 직접 적용한 곳은 세트 사이 휴식 카드의 `편집`·`취소`, 루틴 상세의 `편집`, 웨이트 진행의 `종목 보기/변경`, 유산소 진행의 `종목 목록`이다. 유산소의 고정 80px 너비를 문구에 따라 정해지도록 바꿨다. 운동 종목 전환 중의 프리뷰와 로컬 복원 화면도 같은 운동 컴포넌트를 사용한다.

## 변경 전후 화면 및 계측

Chrome 320·375·393·430·1280px에서 측정했다. 표는 393px의 실측값이며 크기는 너비×높이, 단위는 CSS px이다. [전후 비교표 원본](evidence/front-18-4-3-buttons/comparison.json) · [변경 전 계측 · 비교 요약](evidence/front-18-4-3-buttons/comparison.json) · [변경 후 계측 · 비교 요약](evidence/front-18-4-3-buttons/comparison.json) · [실제 앱 계측 · 비교 요약](evidence/front-18-4-3-buttons/comparison.json)

| 적용 대상 | 변경 전 | 변경 후 | 검증 결과 |
| --- | --- | --- | --- |
| 웨이트 고정 푸터 | `353×50`, 반경 999 | `353×50`, 반경 5 | 버튼 색상·패딩·간격과 푸터 크기·고정 위치 동일. [전](evidence/front-18-4-3-buttons/before/weight-footer.png) · [후](evidence/front-18-4-3-buttons/after/weight-footer.png) |
| 준비운동·유산소·휴식 고정 푸터 | 준비운동·종료 `353×50`, 반경 999. 휴식 두 버튼 각각 `172.5×50`, 반경 5 | 같은 크기와 반경 5 | [준비운동 전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [유산소 전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [휴식 전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후 · 계측](evidence/front-18-4-3-buttons/comparison.json) |
| 홈으로 돌아가기 | `353×49.59`, 반경 5 | 같은 크기와 반경 999 | 홈 이동, 기존 색상·테두리·패딩 확인. [전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후 · 계측](evidence/front-18-4-3-buttons/comparison.json) |
| 기록으로 돌아가기 | `353×49.59`, 반경 5 | 같은 크기와 반경 999 | 기록 목록 이동, 기존 색상·테두리·패딩 확인. [전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후 · 계측](evidence/front-18-4-3-buttons/comparison.json) |
| 세트 사이 휴식 `편집`·`취소` | 외곽과 조작 영역 `49.92×48` | 외곽 `49.92×30`, 조작 영역 `49.92×48` | 카드 좌표·크기와 카드 헤더 정렬 동일. [전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후](evidence/front-18-4-3-buttons/after/rest-settings.png) |
| 루틴 상세 `편집` | 외곽과 조작 영역 `49.92×48` | 외곽 `49.92×30`, 조작 영역 `49.92×48` | 헤더 배치 유지. [전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [변경 후 전체 헤더 · 계측](evidence/front-18-4-3-buttons/comparison.json) |
| 웨이트 `종목 보기/변경` | 외곽과 조작 영역 `86.64×48` | 외곽 `94.64×30`, 조작 영역 `94.64×48` | 종목 목록 열기와 제목 배치 확인. [전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후 · 계측](evidence/front-18-4-3-buttons/comparison.json) |
| 유산소 `종목 목록` | 외곽과 조작 영역 `80×48` | 외곽 `73.48×30`, 조작 영역 `73.48×48` | 버튼이 문구에 맞춰 줄어들고 양쪽 이동 버튼의 조작 영역과 겹치지 않음. [전 · 계측](evidence/front-18-4-3-buttons/comparison.json) · [후 · 계측](evidence/front-18-4-3-buttons/comparison.json) |

소형 버튼의 캡슐 바깥 위·아래도 같은 버튼에 닿는 것을 Chrome에서 확인했다. 다섯 폭에서 가로 넘침, 문구 잘림, 주변 버튼 조작 영역의 겹침이 없었다. 393px에서 키보드 포커스의 2px 링도 확인했다. 격리 운동 Preview의 `운동 시작하기`도 다섯 폭 모두에서 반경 5px이었다. [종목 시작 푸터 · 계측](evidence/front-18-4-3-buttons/comparison.json)

## 4173 실제 앱 검수

- 기존 4173의 PC 루프백 및 LAN, 연결된 Spring이 Health `UP`을 반환했다. 실제 앱에 로그인해 세트 사이 휴식과 루틴 상세의 편집 버튼을 다섯 폭에서 확인했다. 검수 계정에 이미 진행 중인 운동 1건이 있어 이 세션의 편집권과 데이터를 보존했다. 실제 서버의 새 운동 START·저장·종료와 실제 앱의 휴식 ON·OFF는 이번 보완에서 재실행하지 않았다. 4-3 최초 보고서에는 당시 다른 세션으로 수행한 서버 검증이 기록돼 있다.

## Preview 및 회귀 검사

- 최종 전체 FRONT 회귀 **728/728 통과**. 4-3 최초 보고서에도 당시 코드 기준의 728/728 결과가 있다. 보완 작업 중 격리 Preview에서 발견한 푸터 CSS 우선순위를 수정하고, 돌아가기 규격과 푸터 요소를 검사하는 회귀 테스트를 갱신한 뒤 전체 검사를 다시 통과했다.
- [공통 UI Preview](http://127.0.0.1:4173/common-ui-preview.html), [FRONT 18 Preview](http://127.0.0.1:4173/common-ui-preview.html?front18=1)와 격리 Chrome을 사용했다. 운동 진행, 두 돌아가기 경로와 운동 종료 요약을 확인했다. 격리된 휴식 회귀에서 ON 12초와 OFF 일반 180초, 종료·연장과 효과음 알림 경로를 확인했다. 운동 UI 및 휴식 집중 회귀는 13개, 데이터 보호 집중 회귀는 27개를 통과했다.
- 공통 카드의 반경 5px, 패딩 12px, `#1B1D22` 배경, `#353941` 1px 테두리 및 8/12/16/20px 간격 규격을 보존했다. 반복 구간 휴식 카드의 상자 계측도 전후 동일했다. 공통 Dialog·Toast·새로고침, 숫자 휠, 하단 내비게이션, 세트 표와 저장·복구는 기존 공통 UI 및 운동 회귀로 확인했다.
- TypeScript, 전체 `npm run lint`, `eslint src tests`, 프로덕션 빌드와 4173 검수 빌드 모두 통과했다. 프로덕션 배포 파일과 Service Worker 사전 캐시에서 Preview 파일 0개, 사전 캐시 공개 자산 32개 SHA-256 일치. Vite의 500kB 초과 청크 및 PostCSS `from` 옵션 경고가 남아 있다.
- `git diff --check`와 보고서 링크 검증을 통과했다. 4-1과 4-3의 기존 보고서·검수 자료 54개는 SHA-256이 일치한다. 기존 스테이징을 보존했다. [이번 검수 자료](evidence/front-18-4-3-buttons/)

## 승인 및 검증 범위

4173 검수 서버를 사용자 확인용으로 유지했다. 일회성 Chrome·격리 서버와 프로필을 정리했다. iPhone Safari와 설치형 PWA는 실기기 검수가 남아 있다. 백엔드 소스·API 계약·DB 스키마, 정식 디자인 문서, Git 커밋과 Push는 이번 보완 범위에서 제외했다. 4-4와 5단계 작업은 시작하지 않았다.
