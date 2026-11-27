# FRONT 18 · 6-D 전체 UI 상태 전환 조사

2026-11-27 · Frontend `545b711` · Backend `5a12b1c` · [전체 현황표](front-18-6-d-ui-transition-inventory.md)

## 조사 결과

운영 화면과 독립 하위 흐름, 공통 진입 지점을 **46개 단위**, 상태 전환 사용처를 **84개**로 집계했다. 네 탭의 진입·복귀부터 인증, 루틴·일정, 전체 운동 생명주기, 기록·통계, 검색·카탈로그, 설정·계정, 오류 및 PWA 복귀를 포함했다. 같은 전환의 반복 카드·세트는 한 행으로 셌다. 6-B의 화면 목록은 진입 경로를 대조하는 데 사용했다. 설정에서 비활성인 디로딩 설정·데이터 상태·내보내기·초기화·탈퇴와 운영 진입이 없는 컴포넌트는 사용처 집계에서 제외했다. [6-B 현황표](front-18-6-b-ui-inventory.md) · [엔지니어링 기준](../engineering/frontend.md#103-화면-전환) · [화면별 UX](../product/ui-ux.md#3-화면별-명세) · [확정 정책 10.25](../product/Overload_UI_Decision_Log_v0.9.md#1025--2026-11-16-최신-정책-확정과-구현-경계)

| 분류 | 수 | 현황 |
| --- | ---: | --- |
| A · 정상 | 26 | 탭 셸, 준비된 목적지 전환, 카탈로그 재시도, 최신 마지막 수행·종료 표본 |
| B · 중간 UI | 1 | 최근 기록 카드가 먼저 이름·날짜만 표시하고 평가·수행 요약을 보강 |
| C · 위치·크기 | 3 | 첫 루틴 목록 카드 이동, 운동 접근 및 FINISH 오류 모달 축소 |
| D · 화면 전환·마운트 | 2 | 캐시 없는 루틴 상세의 헤더 단독 구간, 루틴 목록 복귀 포커스 공백 |
| E · 비동기 갱신 | 1 | 워크스페이스 조회 결과와 로컬 행동 가능 상태의 게시 시점 분리 |
| F · 저장·복구 노출 | 2 | 자동 저장·서버 확인 중 정보의 표시 범위 검토 |
| G · 필요한 변화 | 33 | 최초 로딩, 실제 데이터·단계 변경, 인증·편집권·원본 보호 |
| H · 추가 확인 필요 | 16 | 실기기, 쓰기 이후 전환, History·모달 경합 및 일부 조회 실패 |
| **합계** | **84** | 행별 주 분류 하나. E·F는 소스에서 확인한 동작이며 시각 결함의 빈도는 집계에 포함하지 않았다. |

## 페이지 전환 구조

| 전환 유형 | 실제 구조 | 6-D 판단 |
| --- | --- | --- |
| 하단 탭 이동 | `AuthApp.navigate`가 휴식 설정과 로컬 초안 이탈 조건을 확인한다. `navigateTabRoot`가 탭과 자식 키를 History에 쓰고 구독자에게 알린다. 동일 계정의 홈·루틴·기록 중 일부는 숨김 상태로 유지한다. [AuthApp](../../src/features/auth/AuthApp.tsx#L50) · [navigation](../../src/app/navigation.ts#L58) · [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx#L688) | 정상 표본에서 탐색 DOM은 그대로였다. 393×852에서 펼친 탭바는 y=796, 336×56px였다. 흔들림은 탭바 자체보다 개별 페이지의 데이터 공개 시점에서 확인됐다. |
| 하위 페이지 | 루틴 상세는 경로를 먼저 커밋한다. 기록 상세와 START는 각각 읽기 정착과 로컬 편집기 열림까지 출처 표시를 유지한다. 운동 현황·근육 페이지는 일부 데이터가 준비될 때까지 기록 메인을 보여 주고, 카탈로그 상세는 제목과 최초 로딩을 함께 표시한다. [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx#L169) · [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx#L497) · [StatisticsPanel](../../src/features/statistics/StatisticsPanel.tsx#L278) · [PublicCatalog](../../src/features/workout-online/PublicCatalog.tsx#L118) | 같은 최초 읽기라도 출처 유지, 목적지와 로딩의 동시 표시, 헤더 선노출의 세 정책이 섞여 있다. 캐시 없는 루틴 상세에서 헤더 선노출을 재현했다. |
| 뒤로·앞으로와 레이어 | `popstate` 이후 이탈 검사를 거쳐 목적지를 publish한다. 거부 시 History를 되돌린다. Dialog에는 별도 History 엔트리와 닫기 후 실행할 동작 큐가 있다. [navigation](../../src/app/navigation.ts#L74) · [navigation](../../src/app/navigation.ts#L189) | 저장 검사와 뒤로 취소는 유지해야 한다. 경로, 나가는 화면의 표시 상태, 포커스 복귀가 서로 다른 시점에 관리된다. 디바이스별 native 스크롤과 앱의 스크롤 복원도 함께 작동한다. |
| 고정 셸과 마운트 | AppShell의 탭은 집중 경로·키보드 상태로 표시를 계산한다. 상단 여백은 가시 overview DOM으로 결정한다. 운동 프레임은 고정 헤더·푸터 높이를 실제로 측정해 브라우저에 반영한다. [AppShell](../../src/app/AppShell.tsx#L76) · [AppShell CSS](../../src/app/AppShell.module.css#L13) · [WorkoutFrame](../../src/features/workout-flow/WorkoutFrame.tsx#L49) | 탭과 집중 푸터의 교체, 가상 키보드에 따른 가림 방지, 운동 종목 간 높이 차이는 필요한 변화다. 목적 경로에서 표시해야 할 내용과 셸이 같은 시점에 바뀌는지가 중요하다. |
| 계정·복구 경계 | 인증·데이터 세대·세션·기기·writer epoch가 판단에 관여한다. 동일 범위 캐시는 유지할 수 있지만 권한 상실과 범위 변경에서는 화면과 쓰기를 다시 검증한다. [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx#L474) · [ClosedWorkout](../../src/features/workout-online/ClosedWorkout.tsx#L121) · [오프라인 접근](../../src/features/workout-local/offline-access.ts) | 민감한 내용을 빠르게 가리는 동작과 편집권 차단을 보존한다. 중립적인 첫 화면과 같은 범위의 유효 데이터는 표시 규칙을 달리할 수 있다. |

선택 입력마다 상태가 바뀌고 React가 다시 렌더링하는 것은 조사 결과에 포함하지 않았다. 아래 사례는 실제 가시 DOM·위치·설명이나 접근 가능한 포커스의 변화, 또는 코드로 확인 가능한 미검증 분기를 기록한다.

## 원인과 영향

| 원인 | 확인 결과와 적용 범위 | 개선 방향 |
| --- | --- | --- |
| **R1 · 경로와 목적지 준비가 독립적으로 공개됨** | **실제 재현 T21.** 상세 캐시가 없는 루틴에서 읽기를 850ms 지연했다. 목록·탭이 사라지고 `루틴` 헤더만 약 **316ms** 보인 뒤, 스켈레톤과 실제 상세가 차례로 표시됐다. 캐시가 있는 동일 진입의 520ms 재조회에서는 상세가 바로 나왔다. 원인은 `editorRoute`가 셸을 즉시 집중 상태로 바꾸는 반면, 가시 본문은 `editor`와 300ms 지연 표시를 따로 계산하기 때문이다. 복원 운동의 빈 구간, 요약 후 기록 History 변경, 홈→전체 이력의 두 History 갱신, Dialog 후 경로의 프레임 노출은 각 상태에 따라 추가 확인이 필요하다. [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx#L175) · [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx#L313) · [navigation](../../src/app/navigation.ts#L128) | 목적지 준비 신호, 화면 교체, 셸 모드, 스크롤을 한 완료 지점에 연결한다. 최초 조회가 필요한 경로에는 목적지 제목·안정된 로딩 틀을 함께 표시할 수 있다. 사용자 클릭 경로는 동일 범위의 안전한 출처를 유지하는 방식을 우선 비교한다. |
| **R2 · 조회별 게시 상태와 대체 레이아웃이 다름** | **실제 재현 T18.** 바로 루틴 탭에 진입하면 같은 첫 카드가 y **402→570px**로 이동했다. 얇은 초기 일정 스켈레톤을 요일·프리셋·메뉴를 갖춘 카드로 바꾼 레이아웃 변화다. 이후 루틴 미리보기 응답은 같은 카드의 텍스트를 갱신했다. Controller는 bootstrap·active 결과를 게시한 뒤 IndexedDB의 장치·시도·사본을 확인하고 ready가 된다. 그 자체는 데이터 보호에 필요하며 버튼과 슬롯에 다른 준비 상태가 나타날 수 있다. 기록 메인에서는 읽기가 분리돼도 분석 메뉴가 유지됐고, 동일 문맥 캐시 및 기간 대기는 정상 패턴이다. [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx#L141) · [RoutineCards](../../src/features/workout-online/RoutineCards.tsx#L67) · [online controller](../../src/features/workout-online/controller.ts#L115) | 일정 슬롯의 로딩과 완료에 같은 주요 레이아웃 구조를 사용한다. 데이터 유효성, 새 읽기 진행, 사용자 조작 가능 여부를 각각 판단한다. Abort·최신 요청 키·소유권·버전 검사는 유지한다. |
| **R3 · 재시작할 때 업무 상태와 표시 문구를 함께 초기화** | **격리 rAF 재현 T46·T49.** 운동 종료의 오류 뒤 `다시 시도`는 `finishRetryIssue`를 비운다. 로컬 운동 접근 오류 뒤 `다시 확인`은 `checkFailure`를 비운다. 실제 다음 응답 전 일반 설명으로 바뀌며 두 모달 모두 동일 노드·340px 폭·액션 1개를 유지했으나 높이 **216→194px**, y **318→329px**가 됐다가 닫혔다. 공통 Dialog의 재마운트가 아니라 호출부에서 보이는 설명을 새 요청 시작과 함께 바꾼 결과다. 정정·누락 복구·일정 이름의 확인 단계 이동과 오류 추가는 별도 후보이며 같은 치수 증거는 없다. [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx#L337) · [LocalWorkoutScreen](../../src/features/workout-local/LocalWorkoutScreen.tsx#L69) · [ActionDialog](../../src/components/common-ui/ActionDialog.tsx#L28) | 사용자에게 공개한 실패 설명을 재요청 중 유지한다. 액션을 잠그고, 새 실패가 확정되면 메시지를 교체하며, 성공이면 안정된 모달을 그대로 닫는다. 오류 표시 모델은 공유할 수 있고 어떤 오류를 표시할지는 호출부가 판단한다. |
| **R4 · 저장 보호의 내부 단계가 표시 모델과 연결됨** | **소스/격리 T51·T81.** `pending`·`SENDING`·종료 확인이 같은 저장 상태 표시로 합쳐진다. 불완료 종료에는 늦게 서버 종료 확인 문구가 뜰 수 있다. FINISH ACK 유실과 일시 DETAIL 실패는 현재 코드가 먼저 자동 확인한다. 사용자 입력 손실·미전송·권한 충돌은 계속 안내가 필요한 별도 케이스다. [save-status](../../src/features/workout-local/save-status.ts#L11) · [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx#L423) · [sync](../../src/features/workout-local/sync.ts#L143) | '처리 중인 사용자의 조작'과 '조치가 필요한 멈춤'을 사용자 표시 기준으로 삼는다. 정상 자동 확인은 원래 슬롯과 상태를 유지하며, 사용자 조치가 필요한 경우에 같은 공통 피드백을 사용한다. |
| **R5 · 기록 카드의 목록 결과와 평가 정보가 따로 도착** | **실제 재현 T84.** 최근 운동 카드에서 날짜·루틴명 뒤 평가 상태·수행 건수가 한 번 더 표시됐다. 추적된 카드의 노드와 103px 높이는 유지됐다. `RecordFeed`가 닫힌 세션 목록을 먼저 그리고, 상세를 읽은 뒤 버전이 맞는 카드에 정보를 합친다. 통계의 최초 Overview 스켈레톤이나 카탈로그의 최초 읽기는 따로 판단했다. [RecordFeed](../../src/features/history/RecordFeed.tsx#L38) · [RecordFeed](../../src/features/history/RecordFeed.tsx#L98) | 일부만 갖춘 카드의 초기 표시를 허용할지 먼저 정한다. 완성 카드를 요구하는 자리에는 기존 버전 캐시를 적용하거나 필요한 값이 준비된 뒤 한 번에 공개한다. |
| **R6 · 복귀 시 스크롤과 포커스 기준이 화면마다 다름** | **실제 재현 T22·대조 T63·T72.** 루틴 목록 1,028px에서 상세로 열고 Back했을 때 Chrome은 1,028px 위치를 복원했지만 활성화한 행이 여전히 DOM에 있고도 포커스는 BODY로 갔다. 기록 상세는 앱의 위치 복원으로 **738→0→738px**를 관측했다. 카탈로그에서는 제목 포커스 후 Back 때 같은 행에 초점이 돌아왔다. 루틴은 진입 스크롤만 명시하고 포커스를 돌려주는 핸들이 없다. 설치형 iPhone의 뒤로 제스처·키보드는 미확인이다. [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx#L198) · [useRecordDetailHistory](../../src/features/history/useRecordDetailHistory.ts#L30) · [PublicCatalog](../../src/features/workout-online/PublicCatalog.tsx#L85) | 진입·Back·탭 전환의 기준을 구분한다. 출처 행이 연결돼 있으면 `preventScroll`로 포커스를 복원하고 별도 위치 복원과 중복 스크롤을 피한다. 복원이 완료되기 전에 사용자가 움직이면 자동 복원을 중단한다. |

## 유지할 동작과 6-E 논의

- **공통 화면 전환.** History의 이탈·되돌림과 편집권 검사는 그대로 활용할 수 있다. 출처 보존과 목적지 준비, 셸·포커스·스크롤 커밋에 같은 규칙을 적용하는 것이 우선이다. 화면을 새로 여는 방법과 Back으로 돌아오는 방법을 함께 정의한다. 탭 및 기록 상세처럼 이미 가시 콘텐츠가 유지되는 경로를 회귀 기준으로 삼는다.
- **공통 처리·오류.** `Dialog`의 native 포커스, `ActionButton`의 즉시 중복 방지 및 지연 스피너, Toast의 읽기 오류는 유지한다. 공통 상태 규칙을 정한 뒤 **개별**로 종료 오류와 로컬 사본 열기의 설명 초기화, 캐시 없는 루틴 상세의 초기 레이아웃, 루틴 첫 일정 슬롯과 복귀 포커스를 수정 대상으로 좁힐 수 있다. 정정·누락 복구·프리셋의 실패 변형은 실제 재현 후 우선순위를 정한다.
- **사용자 결정이 필요한 범위.** ① 느린 일반 상세 진입에서 이전 목록을 남길지 목적지 로딩 틀로 바로 전환할지, 직접 복원 경로에서도 같은 규칙을 쓸지 ② 카드 일부 정보와 늦게 도착하는 평가를 한 번에 공개할지 ③ 정상 자동 저장 인디케이터의 상시 표시와 사용자 개입이 필요한 시점의 차이를 어디까지 둘지 ④ 복귀 포커스를 각 탭의 출처까지 통일할지 논의가 필요하다.
- **예외와 보호.** 부팅과 최초 조회, 준비운동→종목, 휴식 만료, 유산소 실제값 확인, 확인 단계, 권한·계정 변경, 의도된 탭 접기·스크롤 초기화는 상황에 맞게 유지한다. 데이터 표시 자격은 동일 사용자·세대·문맥·버전과 편집권을 통해 확인한다. 운동 종료는 고정 FINISH 원본·타임스탬프·동일 요청의 재확인·ACK 저장 뒤의 게시를 보존한다. 기존 `5411529`·`545b711`의 복구 및 마지막 수행 안정화도 유지한다. [세션 계약](../../../overload-server/docs/api/workout-sessions.md) · [통계 달성 기준 ST-19](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md#31-하루-종목-완료-기준) · [로컬 보호](../engineering/frontend.md#12-진행-운동의-로컬-보호-및-복원)
- **검증 기준.** 브라우저에서 전환 전·진행 중·완료의 의미 있는 콘텐츠, 버튼 역할, 동일 프레임의 레이아웃과 포커스를 확인한다. 타이머나 애니메이션으로 숨기는 방법, 전체 오버레이, 일괄 고정 높이, 임시 CSS 우회나 범용 메모이제이션은 전환 책임을 해결하지 못한다. 늦은 요청, 오류, 빠른 두 번 클릭, 취소된 Back과 권한 경계는 구현 후 같은 보호를 확인할 표본이다.

## 확인 경로

| 관측 항목 | 접근과 조작 |
| --- | --- |
| 최초 루틴 목록 이동 | 4174 검수 계정으로 새 브라우저 세션에 로그인한 뒤 홈과 주간 일정 읽기가 끝나기 전에 **루틴** 탭을 연다. 일정이 채워질 때 이미 그려진 첫 `저장된 루틴` 카드의 위치를 본다. 캐시 유무에 따라 재현 여부가 달라질 수 있다. |
| 캐시 없는 루틴 상세 | 새 세션에서 **루틴** 첫 방문 시 상세 미리보기가 채워지기 전 카드를 선택한다. 조사에서는 상세 GET을 850ms 지연했다. 목록·탭이 사라진 직후 헤더만 보였다가 스켈레톤·실제 상세가 순서대로 나온다. 대조는 같은 루틴을 캐시가 준비된 후 다시 연다. |
| 루틴 목록 복귀 포커스 | **루틴 → 아래쪽 카드**에서 Tab으로 `상세` 버튼에 포커스를 두고 열기 → 브라우저 뒤로. 검수 Chrome에서는 행 위치가 복원된 상태에서 포커스가 BODY에 남았다. **설정 → 운동 종목 보기 → 검색 결과 → 뒤로**는 같은 선택 행으로 돌아오는 대조 경로다. |
| 오류 모달 축소 | 격리된 운동 접근에서 재요청이 실패해 `현재 운동 상태를 확인하지 못했습니다. 연결을 확인해 주세요.`가 보일 때 **다시 확인**을 누른다. 종료 복구에서는 구체 실패가 표시된 상태에서 **다시 시도**를 누른다. 기존 상세 설명이 짧은 일반 설명으로 교체될 때 높이가 줄었다. 운영 기록에서 오류를 유도할 필요 없이 기존 격리 fixture의 `retry`, `footer-cardio` 단계로 확인할 수 있다. [기존 테스트](../../tests/workspace-boundary.test.mjs#L290) |
| 기록 상세 정상 전환 | **기록 → 최근 운동**에서 아래쪽 카드 선택 → 상세 → 뒤로. 상세·평가·변경 이력·승인 검토가 지연된 표본에서 원래 목록이 유지됐고 이후 상세와 상단 위치가 함께 교체됐다. |

## 검증 범위와 한계

- **기존 Mac 4174**에서 앱 루트와 전용 Spring 계정을 사용했다. 사용한 브라우저는 격리 Chrome 393×852 CSS px이며 Service Worker를 우회했다. 접근성 트리의 main·기본 탐색, DOM 동일성, 좌표/크기, computed style, 요청/응답 및 연속 rAF를 대조했다. 인증은 검수 전용 OTP 흐름을 사용했고 운동·루틴·일정·계정 제품 쓰기는 브라우저에서 차단했다. 서버는 그대로 작동 중이다. 4174 제공 번들은 6-C 관련 문구를 대조했으며 정확한 Git SHA를 번들에서 증명하지는 않았다. [Mac 검수 지침](../engineering/frontend.md#review-4174-mac)
- **실제 앱과 조건 주입을 구분했다.** 루틴 상세 520/850ms, 기록 상세 관련 읽기 550ms, 카탈로그 읽기 470ms·503 및 정상 200 재시도는 브라우저에서만 제어했다. 목록·분석·설정 등의 실제 Spring 읽기는 별도로 관측했다. 지연 수치는 재현 조건이며 정상 환경의 성능 값으로 사용하지 않는다. 별도 4174 공통 Preview는 진입 및 공통 조작 표면을 대조했다. [합성 Preview 진입점](../../scripts/review/common-ui-preview.html)
- **현재 소스 격리 검증.** 기존 `workspace-boundary.test.mjs`의 React Chrome 시나리오 1건과 `node --test --test-reporter=dot tests/workout-finish.test.mjs`의 컨트롤러 검사 41건이 통과했다. 전자는 해당 테스트를 메모리에서 계측해 두 모달의 크기를 추가 확인했고 일부 서브시스템은 fixture로 대체했다. 완료/최종 CTA 외의 중간 라벨, 스피너·전환 이벤트, 종료 중 푸터 교체는 최신 완료·종료 표본에서 관측되지 않았다. PostCSS가 기존 플러그인의 `from` 옵션 경고를 표시했으며 테스트는 통과했다. 실행한 임시 브라우저·fixture 서버는 종료하고 프로필을 정리했다. [브라우저 경계 검사](../../tests/workspace-boundary.test.mjs#L430) · [운동 종료 검사](../../tests/workout-finish.test.mjs)
- **미확인.** iPhone Safari·설치형 PWA의 백그라운드 복귀, 키보드·safe-area·VoiceOver·뒤로 제스처와 보호 GIF, 실제 START/FINISH 쓰기·기기 인계·루틴/배정 저장·실제 정정/복구/삭제의 중간 프레임 및 동시 재요청은 남아 있다. 정정·복구·일정에서 발생 가능한 모달 변형은 소스 후보로 표시했다. 검수 문서 두 건만 작성했고 전체 빌드·전체 회귀·공식 설계 갱신은 생략했다.
