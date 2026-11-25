# FRONT 18 — 4-5 카드 디자인 최종 검수 및 마감 준비

2026-11-26 · FRONT 기준 `5bd76e3` 및 4-5 작업 트리 · 최종 사용자 승인 대기

## 검수 결과

기존 **78개** 중 4-4의 63개 실측을 재사용하고 미계측 15개를 Chrome 320·375·393·430·1280px에서 직접 렌더링했다. 별도 발견한 루틴 목록 빈 상태와 진행 운동 승인 재확인도 다섯 폭에서 측정했다. 4-4에서 분류한 승인 예외 22개는 아래 적용표에서 확인 근거와 함께 추적했다. 직접 실측은 각 행에 명시한 상태와 샘플 범위에 적용한다. [4-4 원본 적용표](front-18-4-4-card-coverage.md#78개-사용처-적용표) · [4-5 원본 실측](evidence/front-18-4-5/matrix.json) · [393px 스크린샷](evidence/front-18-4-5/393/)

기존 서비스 컴포넌트를 4173의 실제 앱과 Preview, 격리 Vite의 루틴·기록 Preview 및 기존 운동 fixture에서 사용했다. 실측에 카드의 모서리·배경·테두리·그림자·사방 패딩, 기준 부모 및 콘텐츠 좌표, 행 간격, 최소 높이, 상태와 선택 표시를 기록했다. Chrome의 가로 스크롤바 영역 때문에 데스크톱 `scrollWidth - innerWidth`가 음수인 표본은 가로 넘침이 0인 경우다. Preview의 상태 제어 외곽과 메뉴는 서비스 카드 집계에서 제외했다.

## 적용 규격 및 이번 보완

| 유형 | 모서리 | 패딩 | 기본 카드 간격 |
| --- | --- | --- | --- |
| 기본·입력 | 5px | 12px | 12px |
| 강조 | 5px | 상하 16px, 좌우 12px | 12px |
| 목록 | 5px | 12px, 압축형 상하 10px·좌우 12px | 반복 8px |
| 중첩 | 5px | 8~12px | 8px 또는 12px |
| 통계 | 5px | 상하 14px, 좌우 12px | 독립 16px |
| 상태 및 특수 목적 | 일반 상태 외곽 5px, 특수 목적의 승인값 | 상태·용도별 승인값 | 각 화면의 호출 문맥 |

일반 외곽은 `#1B1D22`와 `1px solid #353941`, 그림자 없음, 부모 폭과 콘텐츠 기반 자연 높이를 사용한다. 제목·설명 4px, 제목 영역과 본문 및 일반 그룹 12px, 정보 반복과 일반 가로 배치 8px, 주요 섹션 20px을 적용한다. 투명 정보 행, 강화 배경, 구획선, 스켈레톤 하한 등은 적용표의 역할별 예외를 따른다. [공통 Card](../../src/components/ui.tsx) · [공통 표면](../../src/components/ui.module.css) · [Onyx 토큰](../../src/app/theme.module.css)

| 대상 | 관측값과 보완 결과 |
| --- | --- |
| 전체 이력 필터, 현황 기간, 운동량 추이(42·50·52) | 320px에서 좌우 10px이 되던 축소 규칙을 해당 세 표면에서 제외했다. 다섯 폭 모두 상하 14px·좌우 12px이다. 추이 전후 카드 간격은 16px, 차트 컨테이너와 실제 그래프는 최저 220px이다. 같은 화면의 다른 좁은 폭 카드에는 기존 압축 규칙이 적용된다. |
| 승인 대기(35) | 320px에서 8/10px이던 패딩을 8/12px로 맞췄다. 선택 표시와 승인 버튼 활성·비활성 상태를 격리 운동 데이터로 확인했다. |
| 변경 결과 미확인·재확인(46) | 상세의 공통 패딩이 덮고 있던 상태 카드에 자체 반응형 패딩 우선순위를 적용했다. 320px 14px, 375px 이상 18px이다. 기록 삭제, 웨이트 정정, 누락 수행 복구에서 결과 미확인, 재확인 액션, 카드 제거를 확인했다. |
| 최근 기록 새로고침 Toast | 요청을 시작하는 클릭 처리에서 `busy`를 발행하도록 수정했다. 요청 취소, 읽기 제한, 데이터 유지 및 실패 메시지는 기존 경로를 따른다. |

[운동 현황 스타일](../../src/features/statistics/Activity.module.css) · [기록 상세 스타일](../../src/features/workout-flow/WorkoutRecordDetail.module.css) · [기록 조회](../../src/features/history/RecordFeed.tsx) · [재계측](evidence/front-18-4-5/matrix.json)

### 추가 발견 및 보호 규격

- 루틴 목록 빈 상태는 5px·12px 외곽 안의 투명·무선 embedded 슬롯이다. 새 루틴의 두 종목 없음 슬롯은 각각 5px·8px·최소 78px 및 점선이다. [빈 루틴 목록 · 계측](evidence/front-18-4-5/matrix.json) · [종목 없음 · 계측](evidence/front-18-4-5/matrix.json)
- 진행 운동 승인 재확인은 기능형 Dialog 내부 18px·21px, 374px 이하 16px 패딩이다. 기록 관리 승인 확인과 로그인 연결 오류는 일반 외곽 5px에 동일한 21/16px 상태 폼을 사용한다. 정정 Dialog의 웨이트·유산소 원본 정보는 18px 외곽과 18/14px 패딩이다. [진행 운동 승인 재확인](evidence/front-18-4-5/393/A2-workout-approval.png) · [정정 원본 정보](evidence/front-18-4-5/393/49-weight-original.png) · [기록 승인·인증 오류 검증](evidence/front-18-4-4/after/measurements.json)
- 오프라인 이어가기와 읽기 전용 기기 인계 18px, 독립 EmptyState 최소 222px 및 20/16px 패딩, 슬롯별 Skeleton과 수행 영역 구분선 위 20px·아래 24px을 추적했다. 세트 표와 정보 열, 준비운동 배치, 유산소 타이머의 하한, 자세 미디어 비율의 근거는 적용표에 연결했다. [4-4 예외 실측](evidence/front-18-4-4/after/measurements.json)
- 과거 중량 검토(34)는 접힘·펼침과 승인 이력 예시를 확인했다. 외곽 위아래 패딩 0px, 안쪽 검토 카드 배경 투명·테두리 0px이다. 외곽의 기존 320px 좌우 10px 압축을 확인했다. 승인 대기 카드(35)는 좌우 12px을 요구하는 별도 표면이다. [실측](evidence/front-18-4-5/matrix.json)

## 간헐적 실패 조사

### 조회 실패 Toast

4-4의 `independent common UI preview renders reusable controls and handles interaction`은 `tests/fixtures/review/check-front18-preview.mjs`의 초기 데이터 없는 최근 기록에 대한 명시적 재시도 실패에서 `연결할 수 없어요. 다시 시도해 주세요.`를 기다리다 실패했다. 4-5는 매번 Preview를 다시 열고 이전 요청·Toast를 제거해 독립 시도했다. 보완 전 **10회 중 4회**에서 첫 시간 초과 시나리오의 버튼이 비활성에서 정상으로 돌아왔지만, DOM 변경 기록에 오류 Toast가 올라오지 않았다. 해당 네 시도는 첫 실패에서 종료됐다. 나머지 여섯 시도는 명시적 재시도 실패와 복구까지 통과했다. [4-4 실패 로그](front-18-stage-4-evidence-cleanup.md#4-4-간헐-실패-기록) · [4-5 보완 전 DOM 추적](evidence/front-18-4-5/repeat-toast-before.json)

`RefreshButton`은 클릭 요청과 부모의 `loading` 표시를 연결한다. 기존 `RecordFeed`는 첫 마이크로태스크를 넘긴 뒤 `busy`를 발행했고, Chrome에서 클릭 다음 프레임이 부모 로딩 커밋보다 앞서면 첫 프레임의 가드 해제와 함께 재시도 이력을 잃을 수 있었다. 버튼이 실제로 회전했고 응답 뒤에도 Toast 노드가 없었던 관측은 이 경합과 일치한다. 수동 클릭 업데이트 안에서 `busy`를 발행하도록 수정했다. 기존 초기 로딩의 effect는 취소 검사를 거친 뒤 조회를 시작한다. 과거 로그에는 프레임 순서가 없어 당시 명시적 실패의 내부 순서까지는 확정할 수 없다. [RefreshButton](../../src/components/common-ui/RefreshButton.tsx) · [RecordFeed](../../src/features/history/RecordFeed.tsx)

보완 후 독립 **10회 모두 통과**했다. 각 시도에서 더블 클릭, 시간 초과 Toast, 새로 구성한 초기 오류의 명시적 실패 Toast, 성공 복구를 수행했다. Preview의 약 2.7초 대기 동안 실제 SVG를 여섯 차례 샘플링해 반시계 1.25초 회전, 아이콘 중심, 버튼·레이블 좌표를 확인했다. 실패 이력과 테스트 기대값을 보존했다. [보완 후 반복 증거](evidence/front-18-4-5/repeat-toast.json)

### 운동 저장 상태

4-4의 `workout feedback keeps manual rest silent through queued writes and fits actual title widths` 중 `unconfirmed repetitions and explicit failures stay independent of durable save status`는 반복 수 미확정 상태에서 완료 버튼을 두 경로로 누른 뒤 `saved` 대신 `saving`을 관측했다. 오류 여부와 서버 작업 횟수, 로컬 리비전은 별도 검증 대상이다. [4-4 실패 로그](front-18-stage-4-evidence-cleanup.md#4-4-간헐-실패-기록) · [운동 회귀](../../tests/workout-feedback-ui.test.mjs)

독립 **10회, 실패 0회**였다. 매번 새 격리 컨트롤러에서 다섯 폭을 순회했고, 각 폭에서 완료 두 경로, Toast 1개, 저장 표시 `saved`, 요청 0건 및 리비전·레이아웃 일치를 확인했다. 관측한 초기 경로는 무게 가시성 기록 대기 `saving / pending=1` → 로컬 기록 확정 `saving / pending=0` → `saved`였다. 과거 로그만으로는 이 초기 로컬 기록과 실패한 테스트의 실행 순서를 연결할 수 없다. 당시 부하, 렌더 타이밍과 가상 타이머의 영향도 확정하지 못했다. 보완 범위는 이 조회·카드 작업에 한정하고 저장 경로와 해당 검사의 조건을 유지했다. [독립 실행 추적](evidence/front-18-4-5/repeat-save.json)

### 전체 실행 중 발견한 별도 관측 실패

- 첫 실행에서 `common-ui-preview.test.mjs`의 삭제 Dialog 버튼 호버가 입력 직후 기본색 `rgb(168, 49, 67)`으로 관측됐다. 기존 색상 기대값인 호버 `rgb(180, 55, 74)` 및 눌림 `rgb(137, 38, 55)`을 각각 브라우저 상태와 함께 기다리도록 바꿨다. CSS에는 150ms 색상 전환 선언이 있고 브라우저 입력과 실제 상태 적용은 별개다. [첫 실행](front-18-stage-4-evidence-cleanup.md#4-5-검사-기록) · [색상 회귀](../../tests/common-ui-preview.test.mjs)
- 보완 후 전체 실행 중에 메모 키보드 종료의 `footer waits for settled dismissal`가 한 번 실패했다. 가상 viewport 종료 이벤트와 즉시 숨김 관측이 별도 CDP 호출이라 브라우저의 180ms 정착 타이머 이후를 즉시 상태로 읽을 수 있었다. 같은 브라우저 호출에서 이벤트 전송과 즉시 읽기를 수행하고, 이후 표시 복원과 위치 검증은 별도로 유지했다. 제품의 키보드 코드와 타이머를 유지했다. [실패 기록](front-18-stage-4-evidence-cleanup.md#4-5-검사-기록) · [운동 검수 코드](../../tests/fixtures/workout-review-checks.mjs)

## 상태 전환과 UI 회귀

- 최근 기록의 기존 데이터 유지형 재조회에서 제목, 카드, 내부 콘텐츠의 문서 좌표 및 스크롤이 320·375·393·430·1280px 모두 전·중·후 일치했다. 393px의 최초 로딩, 정상, 빈 상태, 무데이터 실패, 실패 중 재조회와 복구도 계측했다. 실패에서 재조회로 넘어갈 때 오류 외곽이 유지됐고, 복구한 기록 좌표는 정상 상태와 일치했다. 초기 로딩·오류·빈 슬롯은 실제 상태별 구조를 사용한다. [좌표 계측](evidence/front-18-4-5/stability.json)
- 루틴 이름·태그는 생성·편집 각각 12px, 웨이트·유산소는 생성·편집 각각 입력 그룹 12px이다. 제목과 설명을 포함한 블록과 ‘변경’ 버튼의 중심 차이는 다섯 폭 각각 최대 0.01px이다. 검색의 추가·교체를 따로 열어 목록 표시와 선택을 확인했다. 운동 이력은 달력 열기와 월 변경을 구분했고, 월 이동에 따른 항목 증가와 같은 주 항목의 8px 간격을 확인했다. 차트 검색의 열림과 운동 선택을 직접 실행했다. [변형별 계측](evidence/front-18-4-5/matrix.json)
- 고정 푸터는 모서리 5px, 시작·세트·휴식 기본 50px 및 권고 50px이다. 포인터 밝기 전달, 불필요한 opacity 변화, 고정 위치는 시작·세트 완료·휴식 종료의 클릭·터치 **6개 전환 시퀀스, 총 825프레임**을 재사용했고 운동 회귀도 실행했다. 진행 요청 중 중복 차단, 휴식 ON 12초·OFF 180초 및 효과음은 해당 운동 회귀에서 확인했다. [4-4 프레임과 반복 자료](evidence/front-18-4-4/comparison.json) · [4-3 전환 원본](evidence/front-18-4-3-final/after/measurements.json)
- 일반 액션, 홈·기록 복귀와 새 루틴은 캡슐형이다. 소형 보조 버튼은 외곽 30px, 좌우 12px, 실제 조작 48px, 회색 1px 선과 제목 블록의 중심을 확인했다. 메시지형 Dialog는 5px, 최대 340px, 설명과 액션 20px, 두 액션 1:1을 유지한다. 설정 설치 카드 5px·인접 8px, 설정 행 64px와 자동 추정 아래 1px 구분선, 날짜 선택 디자인과 일정 전환 44×44px 원형은 기존 계측과 회귀 근거를 사용했다. [버튼 실측](evidence/front-18-4-3-buttons/comparison.json) · [설정·날짜·Dialog 계측](evidence/front-18-4-3-final/comparison.json)

## 393px 대표 비교

| 확인 대상 | 393px 관측 및 조건 | 연결 자료 |
| --- | --- | --- |
| 일반 카드·공통 패딩 | 루틴 배정 제안 18px→5px, 패딩 21px→12px, 높이 180.47px→150.47px. 동일한 합성 생성 제안 상태다. | [전](evidence/front-18-4-4/before/created.png) · [후](evidence/front-18-4-4/after/created.png) |
| 일정 전체 편집 | 순환 그룹의 외곽 18px→5px, 패딩 21px→12px, 그룹 간 54px→12px. | [4-1](evidence/front-18-4-1/schedule-order.png) · [4-3](evidence/front-18-4-3/schedule-order.png) |
| 홈 선택 날짜 | 날짜 상세의 중첩 외곽선을 제거하고 정보 배경 및 선택 상태를 유지했다. 4-1의 주간 화면과 다른 선택 상태가 섞이지 않도록 같은 날짜 선택 전후 자료를 연결했다. | [전](evidence/front-18-4-3-final/live-before/home-selected.png) · [후](evidence/front-18-4-3-final/live-after/home-selected.png) |
| 성장 추적 | 최신 공식 승인 중량 카드의 내부 1px 외곽→0px, 내부 8px 및 강조색 유지. 승인 이력 행의 경계는 별도 역할이다. | [4-1](evidence/front-18-4-1/growth.png) · [4-3](evidence/front-18-4-3/growth.png) · [4-5 이력](evidence/front-18-4-5/393/58-populated.png) |
| 설정 설치 | 열린 상태 패딩 0/12px, 외곽 5px 및 좌표·높이는 4-4 양쪽에서 동일하다. 인접 간격 8px도 동일하다. 그룹 자체의 간격으로 구현 책임을 옮겼다. | [4-3 접힘](evidence/front-18-4-3-final/live-after/install-closed.png) · [4-4 전후 좌표](evidence/front-18-4-4/comparison.json) · [열림 실측](evidence/front-18-4-4/live/measurements.json) |
| 기기 요약 및 목록 | 4-4 동일 합성 상태에서 요약 12px→14/12px, 목록의 반복 간격 8px이다. 실계정 목록 수는 별도 데이터다. | [전 · 계측](evidence/front-18-4-4/comparison.json) · [후](evidence/front-18-4-4/after/devices.png) |
| OTP와 로그인 연결 오류 | OTP 18px·21px→5px·12px. 오류는 18px→5px이며 21/16px 패딩 유지. 각각 동일한 인증 시나리오 안에서 대조했다. | [OTP 전 · 계측](evidence/front-18-4-4/comparison.json) · [OTP 후](evidence/front-18-4-4/after/otp.png) · [오류 전 · 계측](evidence/front-18-4-4/comparison.json) · [오류 후](evidence/front-18-4-4/after/auth-error.png) |
| 특수 목적 카드 | 기록 관리 승인 외곽 18px→5px와 상태 패딩 유지. 진행 운동의 승인 재확인과 정정 원본은 18px 표면이다. 두 승인 경로는 별개 상태다. | [기록 승인 전 · 계측](evidence/front-18-4-4/comparison.json) · [기록 승인 후 · 계측](evidence/front-18-4-4/after/measurements.json) · [진행 운동 재확인](evidence/front-18-4-5/393/A2-workout-approval.png) |
| 운동 푸터·보조 버튼 | 운동 전환은 정적 이미지와 함께 입력별 프레임을 사용했다. 소형 액션은 30px 외곽·48px 조작 영역이다. | [푸터 전](evidence/front-18-4-3-buttons/before/weight-footer.png) · [푸터 후](evidence/front-18-4-3-buttons/after/weight-footer.png) · [보조 버튼 및 전환 프레임](evidence/front-18-4-3-final/comparison.json) |

## 자동 검사와 빌드

| 검사 | 4-5 결과 |
| --- | --- |
| 전체 FRONT | **728/728 통과**. 0 실패, 0 건너뜀. 기존 728건에서 검사 수 변화 0. [최종 로그](front-18-stage-4-evidence-cleanup.md#4-5-검사-기록) |
| 공통 Card·Button·Dialog, Toast | 전체 실행의 4173 공통 UI·FRONT 18 Preview 경로와 4-5 집중 계측 포함. [실행 결과](evidence/front-18-4-5/test-results.json) |
| 운동 저장·푸터, 루틴, 기록, 날짜·일정 | 운동 저장·키보드·휴식 및 루틴 생성·편집, 승인·정정·재확인과 날짜·일정 전환 회귀 포함. 휴식 ON 12초, OFF 180초 및 효과음 경로 검증. |
| 데이터 보호 집중 | **27/27 통과**. 조회 시간 제한·취소·늦은 응답·PWA 오프라인·계정 및 작업 영역 경계. [최종 로그](front-18-stage-4-evidence-cleanup.md#4-5-검사-기록) |
| TypeScript·빌드 | `tsc -b`, Vite 운영 빌드 및 4173 검수 빌드 통과. PostCSS `from` 옵션과 Vite 500kB 초과 청크 경고가 현재도 표시된다. [운영 빌드](front-18-stage-4-evidence-cleanup.md#4-5-검사-기록) · [검수 빌드](front-18-stage-4-evidence-cleanup.md#빌드-기록) |
| ESLint·diff 검사 | `npm run lint -- --ignore-pattern .local-backups/**` 및 `eslint src tests`, `git diff --check`와 스테이징 diff 검사 통과. 기존 줄바꿈 변환 안내가 표시된다. |
| 운영 빌드 및 Service Worker | Preview 경로 0개. 운영 사전 캐시의 32개 공개 자산 SHA-256 일치. [빌드 자산 검사](evidence/front-18-4-5/production-cache.json) |

## 4173 사용자 검수 안내

[실제 앱](http://127.0.0.1:4173/) · [공통 UI Preview](http://127.0.0.1:4173/common-ui-preview.html) · [FRONT 18 Preview](http://127.0.0.1:4173/common-ui-preview.html?front18=1) · [LAN 실제 앱](http://192.168.0.3:4173/)

| 대표 진입 | 확인할 핵심 |
| --- | --- |
| 홈과 루틴 | 홈 주간 일정에서 날짜 선택, 루틴 탭에서 저장된 루틴 상세와 편집. 중첩 외곽과 날짜 선택·일정 전환을 한 번에 확인할 수 있다. |
| 기록 | 최근 운동 상세와 기록 탭의 운동 현황·성장 추적. 운동량 차트와 승인 중량 이력을 확인할 수 있다. 정정과 결과 재확인 상태는 FRONT 18 Preview의 격리 기록 시나리오를 사용한다. |
| 설정 | ‘세트 사이 휴식’, ‘앱 설치 · 오프라인 준비’, ‘내 계정 → 로그인된 기기 관리’. 구분선, 설치 카드 간격과 기기 카드의 밀도를 확인할 수 있다. |
| 안정성 표본 | FRONT 18 Preview의 ‘최근 운동·전체 이력 조회’에서 오류 후 새로고침, ‘운동 진행 검수’에서 푸터 전환. |

실제 앱의 전용 인증 이후 읽기 요청만 허용한 격리 Chrome으로 화면을 열었다. 휴식 테스트 설정 조작은 격리 운동 회귀에서만 수행했다. iPhone Safari와 설치형 PWA는 실기기 접근이 없어 미검증이다. 승인 전에 실제 기기에서 대표 카드와 푸터 전환, 홈 화면에서 시작한 앱의 화면·내비게이션을 확인할 수 있다. HTTP LAN 주소는 화면 확인에 사용할 수 있고 설치형 동작 판단에는 신뢰된 HTTPS가 필요하다. [HTTP·대표 화면·요청 증거](evidence/front-18-4-5/live.json)

## 검수 자료 보존

4-4까지의 단계별 Markdown과 스크린샷·계측 자료 **151개**에서 SHA-256이 일치했다. 4-1 최초 조사표와 원본, 4-3 공통화 및 버튼·푸터의 전후 자료, 4-4 적용표, 4-5 계측과 반복 실행·회귀 결과를 보존한다. 같은 바이트의 PNG **15그룹, 후보 19개(292,786바이트)**와 일회용 조사 로그를 분류했다. 목록에 각 경로·용량·대체 파일과 기존 보고서의 참조를 기록했다. 참조가 걸린 후보는 링크와 단계별 근거를 모두 확인해야 한다. [SHA-256 대조](evidence/front-18-4-5/prior-integrity.json) · [정리 후보와 연결 경로](evidence/front-18-4-5/cleanup-inventory.json)

## 최종 승인 이후의 공식 문서 반영안

| 문서 | 반영 내용 |
| --- | --- |
| [Frontend 개발 현황](../engineering/frontend.md) | 공통 Card·Button·Dialog의 적용 위치와 사용처 80개, 예외 구현 위치, 4173 검토 및 Chrome 검증 범위, 실제 기기 상태와 회귀·데이터 보호 결과. |
| [UI/UX 적용 지점](../product/ui-ux.md) | 홈·루틴 날짜 선택과 일정 전환, 기록·통계 카드의 중첩 정책, 설정 설치 카드와 64px 행, 보조 버튼과 화면별 특수 목적 표면의 역할. |
| [UI Decision Log](../product/Overload_UI_Decision_Log_v0.9.md) | 사용자 승인 날짜와 적용 범위, 일반 외곽 및 기존 특수 예외의 적용 경계, 운동 푸터 전환·일반/소형 액션·메시지형 Dialog의 결정과 승인 근거. 기존 결정과 달라진 범위의 링크. |
| [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md) | 카드 유형별 외곽 색·모서리·패딩·gap, 내부/외부 간격과 중첩 무선, 5px·50px 운동 푸터/권고 높이, 30/48px 소형·캡슐형 일반 버튼, 메시지 Dialog의 340px·1:1, 설정·날짜·44×44px 일정 및 특수 예외 규격. |

최종 검수는 기존 4173을 유지한 사용자 승인 대기 상태에서 마감한다. 직접 확인 범위와 남은 변형은 아래 표에 기록했다.

## 최종 사용처 적용표

‘4-4 재사용’은 당시 다섯 폭 표본의 근거를 재사용했다는 뜻이다. ‘4-5 직접’은 이번에 해당 변형을 다섯 폭에서 직접 렌더링했다는 뜻이다. 실제 앱과 달리 격리 Chrome의 조작은 합성 데이터로 실행했다. 변형은 표본을 확인한 범위로 제한한다.

| 번호 | 화면 및 카드 | 최종 규격 | 적용 상태 | 검증 환경 | 직접 계측 여부 | 예외 및 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | A01 오늘의 루틴·진행 중인 운동 | 5px · 16/12/16/12 · 홈 12 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · home](evidence/front-18-4-4/live/measurements.json) |
| 02 | A01 이번 주 일정 | 5px · 12 · 홈 12 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · home](evidence/front-18-4-4/live/measurements.json) |
| 03 | A01 선택 날짜 상세 | 5px · 10 · 위 8 · 입력 배경, 외곽선 제거 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · home](evidence/front-18-4-4/live/measurements.json) |
| 04 | A01 홈 최근 운동 항목 | 5px · 10/12 · 반복 8 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · home](evidence/front-18-4-4/live/measurements.json) |
| 05 | A02 오프라인 운동 이어가기 제안 | 18px · 21 · 복원 안내 배치 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · offline-offer](evidence/front-18-4-4/after/measurements.json) |
| 06 | B01 나의 루틴 헤더 | 5px · 16/12 · 루틴 목록 gap 12, 강조 배경·기존 일반선 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · routine](evidence/front-18-4-4/live/measurements.json) |
| 07 | B01 이번 주 일정 | 공통 Card · 5px · 12 · 외부 12, 목록 모드 유지 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · routine](evidence/front-18-4-4/live/measurements.json) |
| 08 | B01 저장된 루틴 항목 | 공통 외곽 · 5px · 압축 10/12 · 항목 gap 8 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · routine-list](evidence/front-18-4-4/live/measurements.json) |
| 09 | B01 새 루틴 일정 배정 제안 | 5px · 12px · 내부 12px · margin 0 | 4-4 일반 Card 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · created](evidence/front-18-4-4/after/measurements.json) |
| 10 | B02 루틴 요약 | 5px · 16/12 · 본문 gap 12 · 지표 상단 8 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · routine-detail](evidence/front-18-4-4/live/measurements.json) |
| 11 | B02 웨이트·유산소 종목 상세 | 5px · 12 · 기존 10의 종목 그룹과 데이터 표시 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · routine-detail](evidence/front-18-4-4/live/measurements.json) |
| 12 | B02 주간 일정 배정 상세 | 5px · 12 · 배정 행과 구분선 유지 | 4-3 규격 확인 | 루틴 FRONT 18 | 4-5 직접 | 2개 일정의 배정 행·요일 및 행 사이 구분선 · [393px](evidence/front-18-4-5/393/12-assigned.png) |
| 13 | B03/B04 이름·태그 입력 컨테이너 | 공통 외곽 · 5px · 12 · 내부 gap 12 | 4-3 규격 확인 | 루틴 FRONT 18·격리 Vite | 4-5 직접 | 생성·편집 이름 및 태그 12px gap · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 14 | B03/B04 웨이트·유산소 구성 카드 | 5px · 12 · 입력 그룹 12, 편집 푸터 고정 | 4-3 규격 확인 | 루틴 FRONT 18·격리 Vite | 4-5 직접 | 생성·편집 각각 웨이트·유산소, 입력 그룹 12px. 제목 블록과 변경 버튼 중심 차이 최대 0.01px · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 15 | B03 새 루틴의 종목 없음 슬롯 | 5px · 패딩 8 · 최소 78px · 점선 슬롯 | 승인 예외 유지 | 격리 Vite 루틴 | 4-5 직접 | 웨이트·유산소의 각각 빈 슬롯과 점선·78px 하한 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 16 | B03/B04 웨이트 선택·교체 검색 컨테이너 | 공통 formbox · 5px · 12 · 검색 조작 자체 유지 | 4-3 규격 확인 | 루틴 FRONT 18·격리 Vite | 4-5 직접 | 추가·교체 각각 검색 목록 열기와 선택, 벤치 프레스에서 바벨 스쿼트로 교체 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 17 | B06 자동 순환 포함·제외 그룹 | 공통 Card · 5px · 12 · 부모 gap 12 · 카드 margin 0 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · schedule-order](evidence/front-18-4-4/after/measurements.json) |
| 18 | B07 분류·프리셋 선택 표면 | 5px · 14/12 통계 화면의 조작 셸 · 내부 12 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · muscle-plan](evidence/front-18-4-4/after/measurements.json) |
| 19 | B07 주간 계획 요약 | 5px · 14/12 · 16 · 수치 2열 유지 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · muscle-plan](evidence/front-18-4-4/after/measurements.json) |
| 20 | B07 계획 세트 분포 | 5px · 14/12 · 독립 16 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · muscle-plan](evidence/front-18-4-4/after/measurements.json) |
| 21 | C01 준비운동 시간 | 5px · 상하 34 · 좌우 18 또는 14 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · warmup](evidence/front-18-4-4/after/measurements.json) |
| 22 | C01 준비운동 안내 | 5px · 18 또는 14 · 준비 정보 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · warmup](evidence/front-18-4-4/after/measurements.json) |
| 23 | C02 진행 중량·장비·한쪽 원판 | 5px · 상하 12 · 좌우 18 또는 14 · 진행 중량 레이아웃 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · workout](evidence/front-18-4-4/after/measurements.json) |
| 24 | C02 세트 입력·이전 세트 | 5px · 상하 12/좌우 8 · 세트 gap 7 · 이전 기록 열 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · workout](evidence/front-18-4-4/after/measurements.json) |
| 25 | C02/C03 운동 시계·휴식 상태 / 하단 진행 액션 | 전폭 고정 · 상단 63px 예시 · 하단 gap 6 · 안전 영역 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · workout](evidence/front-18-4-4/after/measurements.json) |
| 26 | C03 당시 유산소 계획 | 5px · 12 · 3열 당시 계획 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · cardio-complete](evidence/front-18-4-4/after/measurements.json) |
| 27 | C03 유산소 측정 타이머 | 5px · 12 · 타이머 최소 126과 강조색 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · cardio-complete](evidence/front-18-4-4/after/measurements.json) |
| 28 | C03 유산소 확인 입력 | 5px · 12 · 입력·미저장 동작 유지 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · cardio-review](evidence/front-18-4-4/after/measurements.json) |
| 29 | C03 유산소 실제 완료 기록 | 5px · 12 · 기록 행 정보 유지 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · cardio-complete](evidence/front-18-4-4/after/measurements.json) |
| 30 | C04 이번 운동만 수정 안내·조작 | 5px · 18 또는 14 · 수정 도구·조작 계속 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · workout-edit](evidence/front-18-4-4/after/measurements.json) |
| 31 | C04 기구 변경 폼·유산소 재구성 | 인라인 장비 5px · 기존 공간 · 기능형 Dialog 보존 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · workout-edit](evidence/front-18-4-4/after/measurements.json) |
| 32 | C05/D03 운동 요약 헤더 | 5px · 상/우/하/좌 10/12/14/12 · compact 요약 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · record-detail](evidence/front-18-4-4/after/measurements.json) |
| 33 | C05/D03 웨이트·유산소 수행 | 5px · 14/12 · 승인된 요약 행과 좁은 폭 예외 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · record-detail](evidence/front-18-4-4/after/measurements.json) |
| 34 | C05/D03 과거 중량 검토 접이형·내부 행 | 5px · 상하 0 · 내부 카드 투명/무선 유지 | 승인 예외 유지 | 격리 운동 fixture | 4-5 직접 | 후보 접힘·펼침, 과거 승인 결과. 안쪽은 투명·무선, 320px 좌우 10px · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 35 | C05/D03 승인 대기 검토 | 5px · 8/12 · 기록 승인 조작·가드 | 4-5 보완 | 격리 운동 fixture | 4-5 직접 | 대기 3개 및 선택 변경, 320px 8/12 복원 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 36 | C05/D03 기록 보존 안내 | 5px · 14/12 · 기록 보존 설명의 기존 위치 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · record-detail](evidence/front-18-4-4/after/measurements.json) |
| 37 | C06 읽기 전용 세션·기기 인계 | 18px · 21 · 세션 인계와 편집권 흐름 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · handoff](evidence/front-18-4-4/after/measurements.json) |
| 38 | D01 이번 주 요약 | 5px · 요약 패딩 예외 16/14/14/14 유지 · 섹션 20 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · statistics-main](evidence/front-18-4-4/after/measurements.json) |
| 39 | D01 주간 요약 지표 타일 | 5px · 타일 간격 7→8 · 3열 최소 높이 유지 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · statistics-main](evidence/front-18-4-4/after/measurements.json) |
| 40 | D01 운동 분석 진입 타일 | 5px · 2열 타일 gap 8 · 제목/설명 4 · 하한 보존 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · statistics-main](evidence/front-18-4-4/after/measurements.json) |
| 41 | D01 기록 탭 최근 운동 항목 | 5px · 공통 외곽 · 12 · 목록 8 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · statistics-main](evidence/front-18-4-4/after/measurements.json) |
| 42 | D02 월·일정/종목 필터 외곽 | 5px · 통계 필터 조합 14/12 · 기간 조작은 투명 | 4-5 보완 | 격리 Vite 기록 | 4-5 직접 | 달력 열기·월 변경, 루틴별에서 운동별로 전환해 검색 및 종목 선택, 320px 14/12 복원 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 43 | D02 전체 운동 이력 항목 | 5px · 공통 외곽 · 12 · 항목 8 | 4-3 규격 확인 | 격리 Vite 기록 | 4-5 직접 | 같은 주 반복 8px, 월 이동 후 항목 1→7개. 이 계측에서 서버 커서 페이지 추가는 미실행 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 44 | D04/D06 정정·평가 이력 요약 | 18→5px · 강조 16/12 · 정정/평가 메뉴 유지 | 4-3 공통 Card | 격리 Chrome | 4-4 재사용 | [격리 Chrome · record-correction](evidence/front-18-4-4/after/measurements.json) |
| 45 | D04 완료 수행 컨테이너 | 18→5px · 18/14px 가변 기본값→12px | 4-3 공통 Card | 격리 Chrome | 4-4 재사용 | [격리 Chrome · record-correction](evidence/front-18-4-4/after/measurements.json) |
| 46 | D03/D04/D06 변경 결과 미확인·재확인 | 5px · 이전 상태 표면 패딩 18/14 유지 | 4-5 보완 | 기록 FRONT 18 | 4-5 직접 | 삭제·정정·누락 수행 복구의 결과 미확인 및 재확인 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 47 | D06 공식 평가·변경 이력 | 18→5px · 통계 14/12 · 설명·행 유지 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · record-evaluation](evidence/front-18-4-4/after/measurements.json) |
| 48 | D04/D06 기록 관리의 승인 확인 필요 | 5px · 상태 폼 21px/좁은 폭 16px · 내부 18px · margin 0 | 4-4 공통 Card 및 상태 폼 패딩 유지 | 격리 Chrome | 4-4 재사용 | 상태 폼 패딩 21/16 · [격리 Chrome · approval](evidence/front-18-4-4/after/measurements.json) |
| 49 | D04 정정 Dialog 내부 원본 사실 | 기능형 Dialog 안 카드의 18px · 이전 18/14 패딩 | 승인 예외 유지 | 기록 FRONT 18 | 4-5 직접 | 웨이트 세트·완료 유산소의 원본 카드 · [393px](evidence/front-18-4-5/393/49-weight-original.png) |
| 50 | E01 기간 선택 외곽 | 공통 Card 기간 외곽 5px · 통계 셸 패딩 14/12 | 4-5 보완 | 격리 Vite 현황 | 4-5 직접 | 기간과 달력 열림, 320px 14/12 복원 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 51 | E01 완료 세트·총중량 타일 | 5px · 14/12 · 타일 8 · 최소 86 유지 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · activity](evidence/front-18-4-4/after/measurements.json) |
| 52 | E01 운동량 추이·검색 | 5px · 14/12 · 독립 16 · 차트 220 하한 유지 | 4-5 보완 | 격리 Vite 현황 | 4-5 직접 | 전체 차트·검색 열림·종목 선택. 독립 16px·차트 하한 220px · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 53 | E01 달성 현황·주간 타일 | 5px · 14/12 · 독립 16 · 날짜 조작 스타일 보존 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · activity](evidence/front-18-4-4/after/measurements.json) |
| 54 | E01 유산소 현황·상세 | 5px · 14/12 · 독립 16 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · activity](evidence/front-18-4-4/after/measurements.json) |
| 55 | E02 분석할 운동 검색 | 5px · 검색 외곽 12 · 본문 gap 12 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · growth](evidence/front-18-4-4/after/measurements.json) |
| 56 | E02 성장 분석·중량 그래프 | 5px · 14/12 · 독립 16 · 그래프 구조 유지 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · growth](evidence/front-18-4-4/after/measurements.json) |
| 57 | E02 최신 공식 승인 중량 요약 | 5px · 12 · 내부 gap 8 · 강조 배경 유지, 중복선 제거 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · growth](evidence/front-18-4-4/after/measurements.json) |
| 58 | E02 승인 중량 변경 이력 | 5px · 12 · 기존 이력 행/구분선 | 4-3 규격 확인 | 격리 운동 fixture | 4-5 직접 | 이력이 있는 상태의 두 행과 1px 구분선 · [393px](evidence/front-18-4-5/393/58-populated.png) |
| 59 | E03 기간·보기 방식 컨트롤 | 5px · 14/12 통계 화면의 조작 셸 · 내부 12 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · muscle-statistics](evidence/front-18-4-4/after/measurements.json) |
| 60 | E03 주간 세트 달성 | 5px · 14/12 · 독립 16 · 달성 수치 구조 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · muscle-statistics](evidence/front-18-4-4/after/measurements.json) |
| 61 | E03 근육별·분류별 달성 분포 | 5px · 14/12 · 독립 16 · 근육 분포 표시 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · muscle-statistics](evidence/front-18-4-4/after/measurements.json) |
| 62 | F01 내 계정 요약 | 공통 hero · 5px · 16/12 · 기존 그룹 16 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · settings-closed](evidence/front-18-4-4/live/measurements.json) |
| 63 | F01 운동 설정 / 데이터 및 앱 / 계정·데이터 삭제 그룹 | 5px · 세로 0/좌우 12 · 행 자체 패딩과 64px 유지 | 기존 규격 유지 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · settings-closed](evidence/front-18-4-4/live/measurements.json) |
| 64 | F01 앱 설치·오프라인 준비 | 5px · 0/12px · 인접 8px · margin 0 | 4-4 details에 카드 표면 재사용 · 부모 gap | 실제 4173 Chrome | 4-4 재사용 | 행 패딩 별도 · [실제 앱 · settings-open](evidence/front-18-4-4/live/measurements.json) |
| 65 | F02 내 이메일·인증 / 로그인 수단 / 보안 / 기기 링크 | 5px · 12 · 제목/설명 4, 독립 카드 16 · 기기 링크 세로 0 | 4-3 규격 확인 | 계정 FRONT 18 | 4-5 직접 | 등록, 후보, OTP 입력, 최근 재인증, 로그인 수단과 기기 링크. 4px 제목·설명 및 16px 카드 간격 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| 66 | F03 기기 요약 | 5px · 14/12px · 내부 12px · 요약 강조 배경·선 유지 | 4-4 통계 패딩 토큰 · 지표 margin 제거 | 실제 4173 Chrome | 4-4 재사용 | 요약 강조 배경·선 · [실제 앱 · devices](evidence/front-18-4-4/live/measurements.json) |
| 67 | F03 현재 및 다른 기기 항목 | 5px · 12px · 다른 기기 반복 8px · 현재 기기 섹션 12px | 4-4 공통 Card와 반복 gap | 격리 Chrome | 4-4 재사용 | [격리 Chrome · devices](evidence/front-18-4-4/after/measurements.json) |
| 68 | F04 반복 구간별 휴식 시간 | 공통 5px · 12 · 제목–설명 4 · 헤더 구분선 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · rest-edit](evidence/front-18-4-4/live/measurements.json) |
| 69 | F05 알림 옵션 그룹 | 5px · 상하 0/좌우 12 · 행과 스위치 유지 | 기존 규격 유지 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · rest-alerts](evidence/front-18-4-4/after/measurements.json) |
| 70 | F05 실서비스 알림 시연 표면 | 5px · 10/12/12/12 · 실제 알림 시연 구조 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · rest-alert-preview](evidence/front-18-4-4/after/measurements.json) |
| 71 | F06 표준 운동 검색·목록 외곽 | 18→5px · 12 · 카드 내부 12 · 스크롤 컨테이너 유지 | 4-3 직접 적용 | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · catalog](evidence/front-18-4-4/live/measurements.json) |
| 72 | F07 운동 식별·기구/분류 / 주요·보조 근육 | 18→5px · 18/14px 가변 기본값→12px | 4-3 공통 Card | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · catalog-detail](evidence/front-18-4-4/live/measurements.json) |
| 73 | F07 자세 미디어 슬롯과 상위 카드 | 바깥 18→5px/12 · 안쪽 정사각형 미디어 외곽 유지 | 4-3 공통 Card | 실제 4173 Chrome | 4-4 재사용 | 미디어 비율·안쪽 슬롯 · [실제 앱 · catalog-detail](evidence/front-18-4-4/live/measurements.json) |
| 74 | F07 운동 방법 접이형 | 18→5px · 세로 0/좌우 12 · 접이형 summary | 4-3 공통 Card | 실제 4173 Chrome | 4-4 재사용 | [실제 앱 · catalog-detail](evidence/front-18-4-4/live/measurements.json) |
| 75 | F09 이메일 인증코드 입력 | 5px · 12px · 내부 12px · 초기 상단 위치·폼 유지 | 4-4 입력 Card 적용 | 격리 Chrome | 4-4 재사용 | 인증 시작점·내부 폼 · [격리 Chrome · otp](evidence/front-18-4-4/after/measurements.json) |
| 76 | F10 로그인 상태 조회 오류(연결 재확인) | 5px · 상태 폼 21px/좁은 폭 16px · 내부 18px · 중복 margin 제거 | 4-4 공통 Card 및 상태 패딩 유지 | 격리 Chrome | 4-4 재사용 | 복구 폼 패딩 21/16 · [격리 Chrome · auth-error](evidence/front-18-4-4/after/measurements.json) |
| 77 | 공통 독립 EmptyState·조회 오류 | 18→5px · 20/16 · 최소 222 · embedded 투명/0선 | 4-3 직접 적용 | 격리 Chrome | 4-4 재사용 | [격리 Chrome · devices-error](evidence/front-18-4-4/after/measurements.json) |
| 78 | 공통 초기 로딩 skeleton 묶음 | 5px · 슬롯별 높이 유지 · 주간 요약 섹션 gap 20 일치 | 승인 예외 유지 | 격리 Chrome | 4-4 재사용 | 기존 기능 규격 · [격리 Chrome · devices-loading](evidence/front-18-4-4/after/measurements.json) |
| A1 | 루틴 목록 빈 상태 | 5px·12px 외곽, 안쪽 투명·무선 | 4-4 공통 Card 적용 확인 | 격리 FRONT 18 | 4-5 직접 | 루틴 목록 정상 빈 상태 · [393px · 계측](evidence/front-18-4-5/matrix.json) |
| A2 | 진행 운동 승인 재확인 | 기능형 Dialog 내부 18px·21px, 374px 이하 16px | 승인 예외 유지 | 격리 FRONT 18 | 4-5 직접 | 데이터 저장 상태에서 승인 재확인 카드 · [393px](evidence/front-18-4-5/393/A2-workout-approval.png) |
