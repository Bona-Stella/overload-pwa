# UI v0.9 T02-B 루틴 관리 2차 구현·검증 보고서

> **역사 보고서:** 아래는 2차 구현 당시의 예약 방식·미커밋 상태·검증 기록이다. 현재 T02-B는 `85ec10f50e59`, 일정은 G2~G3 immediate-v1이며 최신 공식 기준은 [Decision Log10.14절](../product/Overload_UI_Decision_Log_v0.9.md#1014--2026-11-07-t02-b-최신-ui-통합-기준)과 [Frontend8.7절](../engineering/frontend.md#87-v09-적용-범위와-구현-상태)이다. 당시 결과를 재실행·최종 실기기 승인으로 해석하지 않는다.

작성: 2026-11-06. **React/API 통합 검증 완료, iPhone 최종 시각 승인 전. commit/push 없음.** T02-A 승인은 유지한다.

## 1. 구현한 화면과 공식 WF 대응

| WF | React / 동작 |
|---|---|
| ROUTINE-01 | RoutineCards: YOUR TRAINING PLAN / 나의 루틴 / + 새 루틴, 동일 위치 월~일 현재 배정, 기존 카드 상세·편집·삭제·웨이트/유산소 구성 유지 |
| 목록 필터 | 날짜 셀 재선택 토글, 전체·월~일·미배정 선택기, × 해제, 제목 옆 개수. 같은 카드 집합만 필터링하며 생성일 최신순 고정 |
| ROUTINE-02 | RoutineForm: 이름, 태그, 복수 요일, WEIGHT B안, 제조사/부하 방식·승인 의미 보존, 순서/제거, 표준 운동 검색, 공통 유산소 계획, 저장·닫기/폐기 확인 |
| ROUTINE-03 | 충돌한 모든 요일과 기존 루틴명을 Dialog에 표시. 취소는 요청 전송 없음, 교체는 선택한 요일만 대체 |
| ROUTINE-04 | 기존 expectedVersion 삭제 및 확인 흐름 재사용. 과거 운동은 보존 |

HTML은 무채색을 유지하고 목록 필터·태그 설명·유산소 상하위 분류·WEIGHT 3열과 중량 행·우측 제거를 동기화했다. 실제 색상은 Visual Theme Spec Onyx/Dusty Blue다. Decision Log 10.13에 사용자 결정을 기록했으며 모바일 최종 승인으로 표시하지 않았다.

## 2. 최신 결정과 데이터 구조

- 태그는 PUSH/PULL/LEGS/FRONT/BACK/FULL/UPPER/LOWER/CARDIO/MIXED 중 nullable 하나. 이름+사용자 제공 설명을 선택기에 표시하고 선택 후 이름만 표시한다. 미지정/키보드 이동/Escape/포커스 복원을 지원한다. 자동 추정 없음.
- 생성·수정 요청의 tag 생략/명시 null을 구분한다. 생성 생략은 null, 수정 생략은 기존 값 보존, null은 해제. 목록/상세에 tag, createdAt을 응답한다. 기존 created_at을 사용하고 수정으로 최신순을 바꾸지 않는다. 같은 생성 시각은 id DESC, 프론트 비교는 마이크로초 자릿수를 정규화한다.
- 표준 검색 데이터는 실제 exercise_muscle + muscle의 id/groupCode/name/role 배열을 추가했다. PRIMARY 부위/근육만 주 설명으로 표시하고 매핑이 없는 운동은 중립적으로 남긴다. 실제 아이콘6종을 재사용한다.
- 인증된 GET /api/v1/cardio-activities는 category(RUNNING/WALKING/CYCLING), 세부 id/name/kind를 조회한다. 러닝머신/야외·트랙 러닝, 실내·야외 걷기/등산, 실내·야외 자전거8개 관계를 V23에 등록했다. 기존 종목에 ID를 추정 부여하지 않았다.
- CardioPlanFields + cardio-draft는 제어형 공통 폼이다. 카탈로그ID와 별도의 배치ID를 유지한다. 시간·거리·속도/페이스, kind에 맞는 경사/저항만 저장한다. ID가 있는 요청은 카탈로그 kind/name 일치 검증을 거친다. 과거7필드 JSON은 ID 생략으로 그대로 보존한다.
- WEIGHT: 실제 이름·근육 설명/우측 제거 → 동일3열 세트/최소/최대 → 새 배치 최초 중량 −2.5/직접 입력/+2.5 → 제조사·부하 방식. 중량은 문자열+BigInt로 정확히 조절하고0 미만을 막는다. 기존 배치의 최초 중량은 불변, 승인 변경은 명시 체크/승인으로 유지한다.

## 3. 저장·일정·보호 처리

기존 루틴 CRUD와 Weekly Schedule PUT을 유지했다. 루틴 저장 성공을 확인한 뒤 일정 단계로 넘어간다. 일정 실패 시 루틴 성공/일정 미반영을 알리고 같은 고정 일정만 재확인한다. 루틴을 다시 생성하지 않는다.

편집 시작 시 일정 version·적용일·예약 배정을 고정한다. 매 시도 전 최신 조회로 확인하며 다른 version/적용일을 자동 병합하지 않는다. 같은 배정·원래 적용일을 조회로 확인한 ACK 유실만 중복 PUT 없이 확정한다. 동일 UUID 루틴의 응답 유실도 전체 고정 구성 일치로만 인정한다. 중복 클릭 guard와 취소 신호·기존 인증/CSRF/소유권/dataGeneration 경계를 유지한다.

최초 일정 등록은 당일부터, 기존 변경은 다음 월요일부터다. 현재 배정과 예약 배정을 혼동하지 않는다. 이번 검토에서 추가한 배정은 **2026-11-09부터**이며 이번 주와 과거 이력을 소급 변경하지 않았다.

IndexedDB3/schema2, 고정 snapshot 요청과 hash, ACK, writerEpoch, 입력·타이머·계정 경계는 바꾸지 않았다. Dialog 닫기 버튼을 type=button으로 명시해 편집 form이 제출되지 않도록 했다.

## 4. 검토 DB와 실제 API 결과

- 대상: 보존 컨테이너/영구 볼륨 overload-home-review-b4972e78, DB overload_v22_isolated. 개인/운영 DB 변경 없음.
- 최초 V23 적용 전후 routines/배치/계획이력/일정이력/세션/수행/승인/변경이력12개 테이블의 기존 행 지문이 동일했다. V1~V22 migration 파일과 기존 봉인 JSON을 수정하지 않았다.
- 원래 데이터: 루틴3, 세션15, 웨이트 수행28, 유산소 수행1. 현재: 루틴6(원래3 + 이번 검토3), 세션15, 활성 세션0, 웨이트 수행28, 유산소 수행1, migration23.
- 이번에만 만든 검토 루틴3개의 이름은 [T02-B 검토] 태그·웨이트·달리기다. d4c90a30-6872-4e21-b55e-42db07d8978c 및 b6493888-ace9-4487-a42f-ef934b47a3c0는 생성 응답 정밀도/ACK 확인 중 저장된 미배정 검토 기록이며 삭제하지 않았다. 최종 통합 루틴은 **d1e06ff6-4473-44a1-a31d-b6450644f17e**다.
- 최종 루틴: MIXED, 웨이트1종 최초22.500001kg/3세트/6~10회, 러닝머신20분/속도8km/h/카탈로그ID ca000000-0000-4000-8000-000000000001. 태그 생성→null 해제→MIXED 재설정/재조회와 생성일 정렬을 실제 API로 확인했다.
- 실제 UI 충돌 취소/교체와 예약 일정 반영을 확인했다. 최종 검증 기준 이전 루틴5개 및 모든 세션15개 DTO가 재조회 전후 동일했다. 원래3개 루틴도 이 집합에 포함된다. 현재 주간 일정은 그대로이고 새 다음 주 예약에만 검토 배정을 넣었다.
- T02-A 실제 홈 회귀는 원래 수행·최근3건·공식 아령/달 아이콘·구분선·오늘만 선택 자동 닫힘·상세 이동·현재/예약 일정 불변을 확인했으며 운동 쓰기를 하지 않았다.

실제 API 검증과 합성 fixture 검증은 구분한다. 에러/ACK 유실/버전 충돌/계정·세대 변경/부분 저장 실패는 자동 fixture 테스트, 정상 저장 및 DB 보존은 실제 검토 환경과 격리 PostgreSQL 통합 테스트로 확인했다.

## 5. 백업·재개·로그인

원본 V22 backup review.dump(131087 bytes, SHA256 b282baa89d00029d2769aebec52d972d93947e356bd690733b26d8b133f5a7b5)는 그대로 보존했다. 현재 V23 별도 backup:

- .local-backups/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/review-t02b-v23.dump
- 138130 bytes, SHA256 aba855a83aabe4cf917a8afab7ef1bf3096b88367a1b06de549fcfcc659527c5
- pg_restore --list 성공. 영구 명명 볼륨·AutoRemove=false·restart=no 확인. 백업 및 비밀 설정은 Git 제외. 새 백업은 목록/해시를 검증했으며 별도 전체 복원 실험은 실행하지 않았다. 원본 V22는 이전 종료 작업에서 전체 복원 지문 검증을 완료했다.

현재 Vite/Backend/DB는 실행 중이다. PC: http://localhost:3000, iPhone 같은 Wi-Fi: http://192.168.0.3:3000. 검토 계정 간편 로그인은 실제 OTP·세션·CSRF를 사용한다. HTTP LAN의 보안 컨텍스트 제한으로 운동 START는 이전과 같이 PC localhost에서 확인한다. 우회하지 않았다.

재시작은 수동 scripts/home-review-resume.ps1 -Action Start -AfterT02BFirstUi다. V23 적용은 이미 끝났으므로 -MigrateT02BV23이 필요 없다. 기존 DB/볼륨을 재사용하며 시드/초기화가 없다. 구형 home-review.ps1 -Action Stop 및 원본 tmpfs 컨테이너는 사용하지 않는다. 안전 종료가 필요하면 새 resume 스크립트의 Stop으로 정상 종료하되 삭제하지 않는다.

반복 브라우저 검증으로 발송 요청 제한이 소진됐다. 자동 승인 검토가 localhost 카운터 준비를 거절한 뒤 사용자의 명시 승인을 받았다. 아카이브/컨테이너/DB/계정을 검증하는 수동 도구로 **격리 검토 이메일·127.0.0.1 발송 요청 카운터만** 준비했다. 정책·OTP 검증/실패 제한·세션·운동 데이터·다른 DB는 바꾸지 않았다. 앱은 도구를 자동 호출하지 않는다.

## 6. 검증 결과

| 검증 | 결과 |
|---|---|
| npm test | **543/543**, 실패/생략0 |
| npm run build | 성공. Vite 단일 청크 약504kB 경고는 남음 |
| npm run lint | 성공 |
| T01 공통 앱/인증/IndexedDB/ACK/오프라인 실제 브라우저 | 8/8 성공 |
| Backend 전체 test | 322/322 성공 |
| Backend 전체 integrationTest | 638개 통합 테스트 성공(격리 PostgreSQL, 2 forks) |
| 생성 시각 정밀도 보완 후 | 전체 단위322 및 루틴 통합27 성공 |
| Backend bootJar | 성공 |
| 실제 보존 DB/API | 태그/웨이트/유산소/충돌/예약/기존 데이터 비교 성공 |
| 실제 T02-A 홈 회귀 | 4개 검증 그룹 성공, 운동 쓰기 없음 |
| 393/320 React + HTML | 가로 overflow 없음, 아래 PNG 생성/직접 확인 |
| 양쪽 git diff --check | 성공 |

중간 실패는 해결했다: 새 GET의 인증 클라이언트 허용 경로 누락, createdAt 마이크로초 정밀도, V23 테이블/필드 수 기대값, 고정 시계의 생성일 정렬 fixture, Vite 테스트 캐시 공유. 보호 검증을 삭제해 통과시키지 않았다.

## 7. 스크린샷과 시각 비교

경로: logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/

- [React 목록393](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/routine-list-393.png), [목록320](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/routine-list-320.png)
- [React 편집393](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/routine-editor-393.png), [편집320](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/routine-editor-320.png)
- [HTML 목록393](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/html-routine-list-393.png), [HTML 목록320](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/html-routine-list-320.png), [HTML 편집393](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/html-routine-editor-393.png)
- [충돌 확인](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/routine-conflict-393.png), [실제 카탈로그 검색](../../logs/home-review/c3855ff8-972f-424f-b388-2a14df0ae601/routine-review-20261106/exercise-picker-393.png)

HTML/React 모두 hero→주간 배정→필터→저장 카드, 편집 기본정보/태그/요일→WEIGHT→CARDIO→저장 순서다. HTML은 무채색 합성, React는 실제 조회 카탈로그/Onyx다. 최종 편집 캡처는 실제 카탈로그로 작성한 저장 전 초안이며 추가 DB 쓰기를 하지 않았다. 실제 API 저장 결과는 routine-result.json에 별도 남겼다. iPhone Safari 실기기 승인은 사용자가 진행해야 한다.

## 8. 수정 모듈과 Git 상태

PWA main HEAD afd6ed95245cadae1a6c4212dd12a2c365c1dd2d, Backend main HEAD 80327ca3b7db52e9cdedbbca8a153a667f021752 유지. 이전 T02-B 1차 미커밋 변경과 AGENTS.md 변경을 보존했다. 스테이징/커밋/푸시 없음. 공식 달·아령·운동 아이콘 원본 및 Visual Theme Spec은 변경하지 않았다.

주요 PWA: RoutineCards/RoutineForm/Routine.module.css, TagPicker, ExerciseSearch/catalog-label, CardioPlanFields/cardio-draft, routine-schedule/match/order, API/types/validation/controller, Workspace, Home tag 표시, 인증 transport의 단일 GET 경로, Dialog, DEV preview/테스트/검토 스크립트, HTML/Decision Log/Frontend 문서.

주요 Backend: Routine entity/placement/requests/responses/service/repository, 표준 카탈로그 근육 조회/응답, CardioCatalogController, snapshot 신규 catalogID 검증, V23, 보존 검토 재개 검사, 관련 테스트/최신 schema 기대값/API 문서.

## 9. T02-C 잔여 범위

공통 유산소 폼은 루틴에 실제 연결했다. 기존 세션 addCardio/updateCardioPlan에 새 계획을 넣고 최초 계획/고정 요청을 보존하는 호환성 테스트를 추가했다. **기존 LocalWorkoutScreen 전체 또는 그 추가 UI를 이번에 교체하지 않았다.** T02-C에서 이 공통 폼을 진행 화면에 장착하고 실제 START/로컬 입력/타이머/오프라인·종료 동기화를 통합 검증한다. 디로딩·통계 새 화면·다른 T02 화면 재설계는 하지 않았다.

T02-B 다음 단계는 위 LAN 주소에서 iPhone 목록/태그/검색/중량·유산소/요일 충돌 밀도를 최종 검토하는 것이다. 최종 승인 후에만 요청된 커밋을 진행한다.

## 2026-11-07 공식 UI 문서 통합 기록

최신 요구사항은 Decision Log10.14절, HTML v0.9 T02-B 개정, Theme Spec7절, UI/UX3.2~3.4절, Frontend8.7절로 통합했다. v0.9 이름을 유지하며 개정일·변경 이력으로 관리한다. 수정 전 HTML은 같은 디렉터리에 byte 단위 보존본으로 남긴다. T02-A 승인 상태를 유지하며 T02-B 최종 사용자 실기기 승인은 별도다. React·CSS·TypeScript·Backend·DB와 공식 아이콘 원본은 이번 문서 작업 대상이 아니다.

### 조사한 자료와 관리 역할

| 실제 경로 | 역할·처리 |
|---|---|
| `docs/product/Overload_UI_Baseline_Wireframe_v0.9.html` | 유일한 현행 원본·독립 HTML 시연. 홈 주간 상태/루틴 관련 구조·동작 갱신 |
| `docs/product/Overload_UI_Baseline_Wireframe_v0.9_before_T02B_2026-11-07.html` | 이번 개정 직전 원문 보존. 최신 지침으로 사용하지 않음 |
| `docs/product/Overload_UI_Decision_Log_v0.9.md` | 최신10.14절, 과거10.13절 대체/보존 구분·변경 이력 |
| `docs/product/Overload_UI_Visual_Theme_Spec_v0.9.md` | 실제 Onyx/토큰의 단일 비주얼 가이드.7절에 재사용·가로/세로·배정 배경·모바일 밀도 반영 |
| `docs/product/ui-ux.md`, `requirements.md` | 화면 흐름/제품 요구와 최신 기준 링크. 초기 Task 시연 기록과 현재 UI 구분 |
| `docs/engineering/frontend.md`, `backend-ui-v0.9.md` | 실제 컴포넌트·상태/소비 API와 후속 디로딩 계약 구분 |
| `README.md`, `AGENTS.md` | 문서 인덱스·진입점 최신10.14 링크. 별도 docs/index 파일은 없음 |
| `docs/tasks/ui-v09-t01-foundation-report.md` | 디자인 토큰/공통 셸 당시 구현 기록, 원문 유지 |
| `docs/tasks/ui-v09-t02a-home-report.md`, `ui-v09-t02a-design-review-report.md`, `ui-v09-t02a-home-details-report.md`, `ui-v09-t02a-home-final-visual-report.md`, `ui-v09-t02a-home-polish-report.md`, `ui-v09-t02a-closeout.md` | T02-A 단계 검증·최종 승인·DB 보존 기록. 승인된 UI·당시 검증/백업 기록 유지 |
| `docs/tasks/ui-v09-t02b-first-ui-report.md`, 본 보고서 | 당시1·2차 구현 기록. 현재 미연동·예약 상태의 안내와 구분 |
| `docs/product/assets/exercise-icons/README.md`·`manifest.json`·공식 SVG/PNG, `assets/deload-icons/` | 원본 운동6종·달·아령. 새 자산 제작/원본 변경 없음 |
| `docs/product/Overload_Deloading_Design_Specification_v1.6.md` | 디로딩 도메인 기준, 이번 개정에서 재설계하지 않음 |
| `docs/product/auth-preview.md`, `docs/engineering/authentication.md`, `docs/handoff/`, `docs/tasks/task-00*-*` | 인증/초기 설계·과거 검증 기록. T02-B 최신 레이아웃의 근거와 구분, 원문 유지 |
| `tests/fixtures/routine-ui.jsx`, `routine-list-ui.jsx`, `src/app/FoundationPreview.tsx`, 기존 `/demo` | 개발용 React fixture/기반 검토/과거 데모 코드. 공식 문서 원본이 아니며 이번에는 수정하지 않음 |
| `dist/`, `logs/routine-ui/` | 빌드·브라우저 검증 산출물, 공식 문서/최신 기준 링크로 사용하지 않음 |
| Backend `docs/api/routine-management.md`, `weekly-schedule.md`, `statistics.md`, `docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md` | 현재 nullable 태그/즉시 적용/G3 판정·통계 계약 확인만 수행, Backend 무변경 |

별도 '디자인 특징' 파일은 발견되지 않아 기존 Theme Spec에 통합했다. 과거 v0.1~v0.8 HTML은 Decision Log의 역사 참조에만 있으며 현재 저장소에 존재한다고 안내하지 않는다. 새 프로젝트 체크리스트는 만들지 않는다.

### 코드 대조 결과와 시연 한계

확정 요구사항의 가로/세로·요일 잠금·단일 목록 필터·카드/메뉴·공통 상세/편집·태그·웨이트 검색/교체·일정 후보 필터·즉시 저장은 현재 PWA와 일치한다. 이전 문서의 태그 미저장/요일 미연동·예약 정책·제거 버튼 위치·독립 상세는 폐기 안내로 구분했다.

HTML은 합성 메모리 시연으로 실제 카탈로그ID·정밀한 승인 사건·고정 요청/ACK·API 부분 성공·서버 G3 실행을 재현하지 않는다. UI 구조 대응을 데이터 무결성 통합검증이나 모바일 최종 승인으로 표현하지 않는다. 기존 실제 PWA의 승인 중량 입력은 명시 체크박스이며 문서의 과거 '변경 버튼 확장' 설명을 현재 계약으로 남기지 않는다.

### 이번 문서 개정의 검증

- 격리 headless Chrome에서 파일 URL만 열어 393px·320px 홈/가로/세로/상세/검색/일정 편집 렌더링, 가로 overflow 없음, 요일 잠금·해제/보기 공유/읽기 전용/11개 태그 옵션/검색 포커스/새 종목 초기값/후보 전환의 선택값·크기 보존/메모리 일정 저장을 검사했다. 전체48개 화면 선택 항목도 렌더링 오류가 없었다. 실제 API나 DB에는 접근하지 않았다.
- 변경 Markdown의 상대 파일·제목 링크와 HTML 자산 경로252개, 인라인 JS 문법, 수정 전 HTML과 HEAD 원문 일치를 확인했다. 상세 로그·이미지는 Git 제외 대상인 `logs/t02b-docs/`에 있다.
- React·TypeScript·CSS·패키지·Backend·DB 무변경이다. 문서 작업이므로 npm 전체 테스트/build/lint는 재실행하지 않았다. 이전 코드의548건 통과는 이전 검증 기록으로만 표기한다.
- `git diff --check`를 통과했고 문서 변경 범위(11개 수정·HTML 보존본1개 추가)를 확인했다. commit/push하지 않으며 기존 서버를 시작·종료·재시작하지 않는다. 이번 검증에서 시작한 headless Chrome만 종료한다.
