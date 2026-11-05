# T02-A 홈 최종 디테일 — 구분선·공식 웨이트 배지·간격

2026-11-06. 기존 미커밋 작업과 검토 환경을 유지한 시각 수정이다. Backend/API/스키마·달성 판정·기록 필터·헤더는 변경하지 않았다. commit/push/스테이징은 하지 않았다.

이후 사용자 iPhone 최종 승인과 [T02-A 마감·DB 보존·안전 종료](ui-v09-t02a-closeout.md)를 완료했다. 아래 미커밋/실행 중/실기기 검토 대기 표기는 이 수정 단계 당시의 이력이다.

## 적용 결과

| 항목 | 변경 |
|---|---|
| 제목 아래 선 | 루틴명 아래/WEIGHT 위에1px. 기존 WEIGHT–CARDIO의 border 색·두께·좌우 폭·margin15px/padding5px 규칙을 공유 |
| 공식 웨이트 배지 | 사용자 제공 `docs/product/assets/exercise-icons/Overload_Weight_Badge_OnePlate.svg`를 URL import로 직접 사용 |
| PNG 원본 | 같은 폴더 `Overload_Weight_Badge_32.png` 확인·보존. 현재 UI는 SVG 우선 |
| 표시 크기 | 웨이트/기존 running.png 모두18×18 CSS px, 같은 inline-flex 중앙 정렬 |
| 아이콘–수치 | gap3px→5px. 웨이트·유산소 동일 |
| 정보 그룹/오른쪽 | 그룹 사이8px, 행 요소 사이6px 유지. 수치13px·행46px·이름 말줄임 유지 |

기존 빈 WEIGHT/CARDIO 제목과 안내 문구는 유지한다. 구분선은 내용 구획의 윗 border이므로 각 제목 위에 한 번씩만 나타나며, 루틴 미지정/휴식 안내 카드에는 추가되지 않는다. 화면 구조와 종목 정보의 정렬을 바꾸지 않았다.

기존 Lucide 아령의 inline path는 최근 운동 컴포넌트에서 제거했다. 새 원형 배지의 gradient·circle·아령 rect를 수정하지 않았다. 최근 운동 전용 컴포넌트만 변경해 검색·선택 아이콘6종의32px 표현에는 영향이 없다. 달리기·공식 달 자산도 유지한다. 새 패키지는 설치하지 않았다.

## 원본 보존

사용자 자산은 작업 시작 시 미추적 파일이었다. 전후 SHA256:

- `Overload_Weight_Badge_OnePlate.svg`: `16d03e56b17225f3db3c79fa5badd8bd366676d7c0d91afa756785418ddab3d3`
- `Overload_Weight_Badge_32.png`: `369ed930ef31cc47427a2496ae653c97ae30c6218c805215f12a57fee9aef331`

Vite의 SVG URL 인라인 처리에서 공백/주석 직렬화가 달라질 수 있어 브라우저 검증은 원본 도형과 gradient/stop/circle/group/rect의 모든 속성을 비교했다. 원본 파일 자체는 바이트 변경이 없다.

## 화면과 실제 데이터

| 폭 | 전체 홈 | 오늘 카드 | 최근 운동·두 아이콘과 수치 |
|---|---|---|---|
| 393px | [홈](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-polish-20261106/home-393.png) | [전체 카드](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-polish-20261106/today-card-393.png) | [확대](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-polish-20261106/recent-393.png) |
| 320px | [홈](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-polish-20261106/home-320.png) | [전체 카드](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-polish-20261106/today-card-320.png) | [확대](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-polish-20261106/recent-320.png) |

기존 실제 혼합 루틴을 ‘오늘만 선택’해서 캡처했다. 선택 후 자동 닫힘과 기존 기록 상세 이동을 확인했다. 일정·루틴은 저장하지 않았다. 기존 혼합 검토 세션 `41f8c4b6-cbfb-43d5-9e50-bbc78d70a7c1`의 웨이트2/2·유산소1/1·✓와 뒤의 웨이트 전용 기록을 사용한다. 이번에는 새 운동/fixture 기록을 만들거나 기존 수행을 정정·삭제하지 않았다. 문서와 최근 카드 모두 가로 overflow가 없고 완료 표시·화살표를 유지한다. 실제 iPhone은 사용자의 최종 검토 대상으로 남아 있고 캡처는 headless Chrome의 CSS viewport 검증이다.

## 검증 및 환경

- `npm test`: 533/533 통과
- `npm run build`: TypeScript/Vite 성공. 새 SVG는 기존 URL 자산 로딩 경로로 production bundle에도 포함
- `npm run lint`: 성공
- `node tests/fixtures/run-t01-browser.mjs`: 분리된 fixture8개 보호 회귀 통과. 저장 실패 이동 차단·초안/타이머/고정 snapshot/writerEpoch·ACK·계정/세대·6종 원본·production SW 오프라인 유지
- `node tests/fixtures/run-home-review-browser.mjs --polish`: 정상 OTP 로그인 이후 운동 API는 GET만 사용. 구분선/공식 도형/18px·5px·8px·6px/실제 달성/393·320/선택 닫힘/상세 이동/공식 HTML 및 기존 데이터 전후 비교4시나리오 통과
- `git diff --check`, 공식 HTML inline JS 구문 검사, 공식 배지/달 원본 hash 및 보고서 로컬 링크 검사

검증 대기 두 곳을 보완했다. SVG outerHTML 비교는 Vite의 공백/주석 차이까지 비교하던 것을 도형 속성 비교로 수정했고, 상세에서 홈 복귀 후 새 렌더를 기다리도록 했다. 제품 코드의 판정·보호 조건을 완화하지 않았다.

반복 로그인으로 검토 이메일의 요청 한도에 걸려 기존 격리 계정 전용 `home-review-login-budget.mjs`를1회 실행했다. 이 이메일의 발급 요청 budget만 정리했으며 OTP 검증/실패/IP 제한·세션·운동 데이터는 유지했다. 정상 OTP 발급/검증 흐름을 사용하며 앱 인증 정책을 변경하지 않았다.

동일 run `b4972e78-a439-42c0-8a28-2f345d767eac`, 검토 DB `overload_v22_isolated`:32800·V1~V22, Backend6818, 프론트엔드3000 유지. DB 초기화/전체 seed/Backend 중지/`-Action Stop`은 실행하지 않았다. LAN `http://192.168.0.3:3000/` 및 간편 로그인 설정은 HTTP200을 확인했다. 이번 LAN 확인은 읽기 전용이며 새 LAN OTP 발급을 반복하지 않았다. 사용자 브라우저·IndexedDB·오프라인 원본을 초기화하지 않았다. 테스트 브라우저/임시 fixture 서버는 종료하고 사용자 검토 환경은 계속 실행한다.

## 변경 파일과 Git

- `src/components/AchievementIcon.tsx`: 공식 SVG 참조, Lucide inline 제거
- `src/features/home/Home.module.css`: 공유 구분선 selector·gap5px
- `docs/product/Overload_UI_Decision_Log_v0.9.md`: 10.12절의 이번 세 항목만 보완
- `docs/product/Overload_UI_Baseline_Wireframe_v0.9.html`: 홈 제목 아래 기존 separator·공식 배지·gap5px
- `tests/fixtures/home-polish-checks.mjs`, `run-home-review-browser.mjs`: 읽기 전용 시각/회귀 경로와 요청 method 수집
- 이 보고서, 이전 보고서의 이력 안내 및 frontend 현황의 해당 아이콘 설명

기존 미커밋 작업을 보존했다. 새 배지2종은 사용자 제공 파일 그대로 미추적 상태다. PWA main HEAD `ad8d664a1a5ef60caea96d5787a12bfe01875988`, index는 비어 있다. 서버 main `523eb00` 및 기존 미커밋3파일은 그대로이며 이번 서버 코드 수정은 없다. 새 브랜치·commit·push는 없다. 사용자 iPhone 시각 확정 외 승인 대기 사항은 없다.
