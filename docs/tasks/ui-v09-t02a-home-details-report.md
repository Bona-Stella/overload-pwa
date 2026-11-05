# T02-A 홈 UI 세부 개선 및 최근 운동 종목 달성 표시

2026-11-06. 기존 미커밋 T02-A 작업과 실행 중인 검토 환경을 이어서 수정했다. commit/push·스테이징은 하지 않았다. Backend API·스키마·다른 T02 화면은 변경하지 않았다.

후속 [최종 시각 보완·달리기 검토 기록](ui-v09-t02a-home-final-visual-report.md)에서 브랜드는700/자간0.06em, 아령은 채움 표현으로 보완했고 실제 격리 DB에 혼합 완료 기록1건을 추가했다. 아래600/outline·당시 최근3건·로그인 bucket 정리 미실행 표기는 이 단계의 검증 이력이다.

## 1. 적용 결과

| 항목 | 현재 구현 |
|---|---|
| 상단 ON | OVERLOAD(18px/600) → 공식 달(24px) → 5.2/8주 → 남은 폭의 5px 게이지 |
| 상단 OFF | 같은 위치의 OVERLOAD, 오른쪽 끝에 같은 공식 달. 주수·트랙 없음 |
| 오늘 카드 | TODAY'S ROUTINE(13px/강조색), 오른쪽 실제 날짜. 헤더 날짜 제거 |
| 주요 글자 | 루틴명22px, 운동명14px, 계획값12px, START15px, 선택 버튼14px. 좁은 주간 셀은 유지 |
| 오늘만 선택 | 실제 루틴 상세가 카드에 반영된 후 details를 닫음. 미조회 루틴은 비활성화하고 오류/재시도 흐름 유지 |
| 최근 운동 | 최대3개, 날짜·말줄임 이름·웨이트/유산소 종목 달성 수·✓/×/?·화살표의 한 줄 Onyx 카드 |
| 주간 일정 | 실제 이름 말줄임과 선택 날짜 전체 이름 유지. 선택형 태그의 표현 함수만 준비 |

기존 카드·그라데이션·Onyx·Dusty Blue와 공통 컴포넌트를 유지했다. 실제 API 화면에 가짜 태그/달성 수를 넣지 않았다. 화면에 ‘시안’ 배지는 없다. ON/OFF는 개발 검토 앱의 `?analysis=off` 표시 상태이며 실제 분석 설정/API를 만들지 않았다. 일반 production 홈은 미연동 상태를 OFF로 판정하지 않고 설명 레이블이 있는 공식 달만 표시한다.

## 2. 공식 달 자산

`docs/product/assets/deload-icons/thick_white_crescent_moon.svg`를 CSS alpha mask로 직접 참조한다. 원본 path·stroke·viewBox를 바꾸지 않고 배경색 `#6C93C6`, 표시 크기24px만 적용했다. WebKit mask도 지정했다. ON/OFF에서 동일 컴포넌트를 사용한다. 문자·Lucide Moon·새로 생성한 달은 사용하지 않았다.

사용자가 제공한 원본 SVG/투명 PNG는 작업 시작 시 미추적 상태였고 그대로 보존했다. SHA256:

- SVG: `043694e57681bb08c38e0effd537d2e040e017193d52cf3ad95f7664dbbf0698`
- PNG: `c716e5909ee150fe0e6733213d20ec433f15a8efaa12c1f41c61cd6d955d020a`

최근 운동의 아령은 Lucide 공식 dumbbell 경로를 사용하며 ISC 고지는 [라이선스](../licenses/lucide-dumbbell.txt)에 보존했다. 유산소는 기존 running.png를 작은 메타데이터 아이콘으로 재사용한다. 운동 검색·선택용 원본6종/32px 정책은 바꾸지 않았다. 패키지 설치는 없다.

## 3. 종목 달성 수와 상태의 근거

분모는 각 종료 세션의 불변 `initialPlan.weightExercises/cardioActivities`다. 현재 루틴, 적용 계획 축소, 현재 승인 중량으로 과거 분모를 다시 만들지 않는다. 분자는 상세 GET의 현재 유효 snapshot 수행으로 계산하므로 정정·명시 복구 후 재조회에 반응한다. 최초 completionAssessment를 현재 수행으로 덮어쓰거나 승인 eligible을 종목 완료로 해석하지 않는다.

[기존 주간 일정 계약](../../../overload-server/docs/api/weekly-schedule.md)과 서버 `statistics/PlanningCalculator.judge`의 현재 종목 판정을 표시 계층에 투영했다. 새 제품 판정 기준을 도입하지 않았다.

- 웨이트: 같은 sessionExerciseId의 유효 수행 세트 수가 InitialPlan setCount 이상인 종목 수. 반복/중량 승인 성공 수와 구분한다. 추가 종목은 기존 분모의 완료 수를 부풀리지 않는다.
- 유산소: 같은 sessionActivityId의 COMPLETED 수행이 최초 목표 활동 시간과 확인 가능한 거리·속도/페이스를 충족해야 한다. 필요한 측정이 없거나 경사/저항 실제 근거가 없으면 미확인이다. 계획 속도를 실제 속도로 채우지 않는다. 소수 비교는 정수 스케일로 처리한다.
- 전 계획 종목이 확인 가능하고 모두 완료한 경우만 녹색 ✓. 확인 가능한 미완료는 붉은 ×. 필요한 근거가 없거나 최초 계획이 비어 있으면 중립 ?. 상세 조회 실패도 중립으로 남긴다.
- 종류별 계획이 없으면 해당 구획을 생략한다. 0/0을 표시하지 않는다. 전체 이름·종류별 완료/계획·미확인 설명은 버튼의 접근 가능한 이름과 상세 링크에서 확인한다.

기존 홈 전용 볼륨 계산 모듈과 그 모듈에만 해당하는 테스트2개는 표시 변경으로 미사용이 되어 제거했다. 통계·기록의 실제 볼륨 계산/계약은 변경하지 않았다.

## 4. 무수행 홈 필터와 조회 한도

수행 세트가 하나라도 있거나 COMPLETED 유산소에 양의 활동 시간/양의 실제 거리가 있으면 부분 수행으로 유지한다. 세트가 없고 양의 유산소 활동도 없는 종료 기록은 홈에서만 제외한다. SKIPPED만 있는 기록은 실제 활동으로 세지 않는다. 조회 실패를 무수행으로 단정해 숨기지 않는다.

기존 `GET /api/v1/workout-sessions/closed?limit=20`과 cursor, 기존 상세 GET을 재사용한다. 종료 목록의 서버 closedAt 내림차순으로 최대3페이지/60개 메타데이터, 상세 동시4개까지 읽으며 표시3건이 확보되면 멈춘다. 전체 이력을 무제한 읽거나 전역 startedAt 정렬을 보장하지 않는다. 한도 도달/일부 상세 실패는 화면에 알린다. 삭제·ACTIVE 상세는 후보에서 제외한다. 소유권/세대/인증 오류는 전체 결과를 차단한다.

실제 검토 DB에서 11월5일 무수행 기록 `dde16b05-49ad-4510-b547-389bd9edc693`은 홈에서 빠지고, 기존 11월2일·10월29일·10월26일 수행 기록3건이 표시됐다. 기존 세 기록은 각각 최초 계획 웨이트2종목 중2종목 완료로 확인됐다. 이 기록들을 원하는 예시 수치로 바꾸지 않았다. 무수행 원본은 서버에 남아 있고 기록 탭의 조회 구현/필터는 변경하지 않았다.

## 5. 태그와 T02-B 잔여 계약

`RoutineTag`와 `scheduleRoutineLabel(name, tag?)`는 PUSH/PULL/LEGS/FRONT/BACK/FULL/UPPER/LOWER/CARDIO/MIXED 중 선택값 하나 또는 실제 이름을 반환한다. 현재 서버 DTO에 태그가 없으므로 실제 화면은 이름을 전달한다. 이름·첫 운동·순서로 추정하거나 기본 태그를 넣지 않는다. HTML의 선택형 표시 입력도 기본값 없이 준비했다.

T02-B에서 루틴 생성/수정의 선택·해제 UI, nullable 저장 계약·검증·DTO·서버 저장/조회 및 일정 투영을 확정해야 한다. 이번에는 태그 저장 API·DB 변경을 하지 않았다.

## 6. 공식 문서와 HTML 비교

[Decision Log 10.12](../product/Overload_UI_Decision_Log_v0.9.md#1012--2026-11-06-홈-가독성헤더최근-운동-최종-보완)에 최신 사용자 결정을 추가했다. [공식 HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html)의 홈 헤더·오늘 카드·최근 운동·태그 표시 준비와 홈에 한정한 글자 스타일을 동기화했다. HTML은 무채색을 유지하며 Visual Theme Spec은 수정하지 않았다. ui-ux와 AGENTS/Frontend/README의 우선순위·현황 참조도 갱신했다. 이전 보고서는 당시 검증 기록으로 표시했다.

HTML 캡처는 외부 toolbar/notes/frame만 숨기고 콘텐츠 폭을393px로 맞췄다. 검토 HTTP 응답의 base만 지정해 원본 상대 자산을 읽는다. 내부 구조는 공식 파일 그대로다. HTML의 PUSH 예시와 React의 실제 혼합 루틴은 종목 수/이름이 다르므로 카드 높이가 다르다. React는 실제 예약 일정 안내와 고정 탭도 유지한다. 다른 화면 흐름을 재설계하지 않았다.

캡처 폴더: `logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/`

| 실제 API React | 공식 HTML / 별도 fixture |
|---|---|
| [ON 전체393px](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/home-on-393.png) | [HTML ON393px](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/official-home-on-393.png) |
| [OFF 전체393px](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/home-off-393.png) | [HTML OFF393px](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/official-home-off-393.png) |
| [320px](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/home-320.png) | [종류/상태별 컴포넌트 fixture393px](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/component-fixtures-393.png) |
| [실제 부분 수행](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/actual-api-partial-393.png) | fixture는 별도 명시한 합성 props이며 실제 계정/DB에 저장하지 않음 |
| [실제 명시 복구 후](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-details-20261106/actual-api-recovery-393.png) | 실제 기록과 fixture 캡처를 혼용하지 않음 |

393/320px 가로 overflow 없음, 최근 행46px(약44px), 루틴명 말줄임, 헤더18px/달24px/운동명14px/계획12px를 브라우저 측정과 이미지로 확인했다.

## 7. 검증 결과

| 검증 | 결과 |
|---|---|
| `npm test` | 533/533 통과. 홈 종목 판정/부분 수행/미확인/페이지 한도/태그 및 기존 전체 테스트 |
| `npm run build` | TypeScript + Vite 성공 |
| `npm run lint` | 성공 |
| `node tests/fixtures/run-home-review-browser.mjs --details` | 실제 API UI·ON/OFF·선택 닫힘·320/393·무수행 제외·START/FINISH·정정/복구·최초 계획/평가 보존 통과. 별도 컴포넌트 fixture 포함 |
| `node tests/fixtures/run-home-review-browser.mjs --design` | 실제 OTP/CSRF·한 줄 달성·HTML 비교·일정 불변·START·샘플 격리·LAN 로그인/유지6개 시나리오 통과 |
| `node tests/fixtures/run-t01-browser.mjs` | 분리된 fixture8개 보호 시나리오 통과: 저장 실패 이동 차단·입력/타이머/snapshot/epoch 보존·ACK 재시도·계정/세대·테마/아이콘·production SW 오프라인 |
| 기타 | `git diff --check`, HTML inline JS 구문 검사, 달 원본 SHA256, production JS의 검토 계정/OTP경로/5.2샘플 미포함 확인 |

실제 API 테스트는 이 검증이 만든 세션에만 1세트 수행/종료, 해당 수행의 정정 제거, 별도 미전송 수행의 명시 복구를 적용한 후 해당 세션만 정상 API로 논리 삭제했다. 기존 세션·루틴·일정·통계를 바꾸거나 DB를 초기화하지 않았다. fixture 테스트는 실제 DB/API 검증과 별개다.

검증 중 첫 UI 재조회가 이전 DOM을 먼저 읽는 테스트 대기 오류를 발견해 새 문서와 새 홈 데이터 렌더를 기다리도록 수정했다. 전체 테스트 첫 실행은 샌드박스의 로컬 포트 EACCES/브라우저 대기로4개가 실패해 같은 명령을 로컬 통신 허용 환경에서 재실행했고 전부 통과했다. 제품 판정/요구사항을 완화하지 않았다. 이 작업에서는 로그인 제한 bucket 초기화 스크립트를 실행하지 않았다.

실제 iPhone Safari/홈 화면 설치 검증은 사용자가 수행할 단계로 남아 있다. 이번 캡처는 headless Chrome의 CSS viewport 에뮬레이션이다.

## 8. 유지 중인 검토 환경

- iPhone: `http://192.168.0.3:3000/` / OFF: `http://192.168.0.3:3000/?analysis=off`
- PC 실제 START: `http://localhost:3000/`
- 동일 네트워크에서 ‘검토 계정으로 로그인’을 누르면 기존 실제 OTP·세션 경로를 사용한다. LAN에서 새로고침 후 로그인 유지와 실제 API 조회를 재검증했다. 사용자의 기존 브라우저 세션/저장소는 초기화하지 않았다.
- 동일 run `b4972e78-a439-42c0-8a28-2f345d767eac`, Backend6818, 검토 PostgreSQL32800·V1~V22 유지. 최초 seed 날짜는11월5일이며 시계는 현재 UTC, 화면 날짜는 일정 시간대의11월6일이다. 금요일 휴식인 실제 일정을 바꾸지 않고 캡처에서만 오늘 선택으로 기존 혼합 루틴을 보여줬다.
- HTTP LAN에는 secure context/Web Locks/SW가 없어 기존 정책대로 START를 비활성화한다. 보안·편집 잠금을 우회하지 않았다. 실제 START 검증은 loopback에서 했다. HTTPS 설치형 iPhone PWA는 별도 검증 대상이다.
- `home-review.ps1 -Action Stop`은 실행하지 않았다. 프론트엔드만 재시작했고 DB·Backend는 계속 실행 중이다. 테스트용 headless Chrome과 별도 fixture 서버는 종료했다. 검토용 PWA는 사용자 확인을 위해 계속 실행한다.

## 9. 변경 파일과 Git

이번 수정의 중심:

- `src/features/home/{HomePanel.tsx,Home.module.css,load.ts,achievement.ts,recent.ts,RecentWorkout.tsx,tags.ts}`
- `src/components/{DeloadMoon.tsx,DeloadMoon.module.css,AchievementIcon.tsx}`, `src/review/{ReviewApp.tsx,ReviewHeader.tsx,Review.module.css,sample.ts}`
- `scripts/home-review-server.mjs`의 HTML 상대 자산 base
- `tests/{home.test.mjs,home-achievement.test.mjs}`, `tests/fixtures/{home-details-checks.mjs,home-cases.jsx,home-design-checks.mjs,run-home-review-browser.mjs}`
- 공식 Decision Log/HTML/ui-ux, README/Frontend/AGENTS 참조, 이 보고서와 이전 검토 보고서의 이력 안내, Lucide 고지

PWA main HEAD `ad8d664a1a5ef60caea96d5787a12bfe01875988` 유지, index는 비어 있고 모든 변경은 미커밋이다. 기존 AppShell·운동 연결·UUID·검토 서버/로그인·README/Frontend 등의 미커밋 작업을 보존했다. 공식 달 원본2개는 사용자 제공 미추적 파일 그대로 남아 있다. package.json/lock·Visual Theme Spec·운동 아이콘 원본은 변경하지 않았다.

서버 main HEAD `523eb00` 유지. 기존 `V22BrowserEnvironment.java`, `HomeReviewEnvironment.java`, `scripts/home-review.gradle`의 미커밋 상태를 유지했고 이번 작업에서 Backend 파일은 수정하지 않았다. 추가 승인 대기 작업은 없다. 최종 iPhone 화면 밀도 피드백과 T02-B 태그 저장 계약이 남아 있다.
