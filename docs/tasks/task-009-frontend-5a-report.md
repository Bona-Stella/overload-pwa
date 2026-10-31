# Task 009 — Frontend 5A 구현 및 검증

기준 Backend HEAD: `9598fa1ba899f47e595c2c70421b8973c2e0c106` (V15).
Frontend 시작 HEAD: `642dcaa2a883ffe8e4b4666ee2603c54de086737`.
사용자가 승인한 5A만 구현한다. Backend 제품 코드·마이그레이션·개인 DB는 변경하지 않는다.

## 현재 가능한 흐름

1. 기존 이메일/Google 로그인과 CSRF·쿠키 세션을 그대로 사용한다.
2. 현재 계정의 루틴·운동 정의·휴식 설정·ACTIVE 세션을 조회한다. 세대가 다르면 표시·적용을 중단한다.
3. 루틴이 없으면 빈 상태를 표시한다. 기존 개인 ExerciseDefinition을 선택하거나 온라인으로 별도 UUID의 개인 종목을 생성한다. 이름으로 병합하거나 데모 루틴을 생성하지 않는다.
4. 웨이트·유산소 루틴 생성/편집을 온라인 API로 저장한다. 기존 배치는 UUID·expectedVersion·최초 중량을 보존하고, 승인 중량 변경은 명시 체크와 저장으로만 제출한다.
5. 루틴을 선택하고 START한다. UUID·실제 시작 시각·현지 날짜·IANA 시간대는 한 번 생성해 먼저 로컬에 저장한다.
6. 서버 InitialPlan·세션 메타를 저장한 뒤 조회 결과를 표시한다. 다른 편집 기기는 읽기 전용으로 안내한다.
7. 새로고침 후 현재 서버 상태를 먼저 조회한다. 미확인 START는 같은 요청으로 재확인하며 새 UUID를 생성하지 않는다.

실제 세트 완료·타이머·snapshot·종료·takeover 조작·사후 정정/복구 UI는 없다. START 전에도 현재 시작/조회만 가능하다고 안내한다. 온라인 관리 폼은 오프라인 대기열을 만들지 않는다.

## API·자료형

원문 계약은 Backend `docs/api/routine-management.md`, `workout-online-write.md`, `workout-sessions.md`다.
`workout-online/types.ts`와 `api.ts`는 V11~V15 DTO·명시적 호출 함수를 정의하되 이번 UI에서 호출하는 것은 종목 생성, 루틴 조회/생성/편집, START·ACTIVE·상세뿐이다. 후속 API의 호출 함수가 존재한다고 UI 기능을 구현한 것으로 보지 않는다.

- 기존 AuthApi의 쿠키/no-store/타임아웃/CSRF 메모리 저장을 재사용한다. AuthController의 기존 계정 재확인·CSRF 갱신·계정 재확인 절차로 쓰기를 준비한다. 로그인 정책·라우팅·인증 방식은 바꾸지 않는다.
- 계정·런타임 요청 경계가 바뀌면 전송/응답 적용을 차단한다. 서버 principal은 Backend가 판단하며 userId를 쓰기 본문에 추가하지 않는다.
- 응답 owner·dataGeneration·대상 UUID와 DTO의 필수/nullable/정수/문자열 필드를 검사한다. 세대 불일치·계정 변경 시 이전 화면 데이터를 비운다.
- Counter는 long 십진 문자열, decimal은 최대 정수14/소수6자리 문자열이다. 입력 정규화에 반올림·JS 부동소수 변환을 사용하지 않는다. 발생 시각은 UTC millisecond, 기존 서버 시각은 microsecond 문자열을 그대로 보존한다.
- 루틴 PUT은 불변 NEW/EXISTING 모드를 구분한다. 제출 본문·승인 발생 시각을 폼에 고정하고 오래된 version을 최신값으로 자동 바꾸지 않는다. 응답이 불명확하면 직접 재확인/재조회한다. 루틴 POST는 같은 UUID의 GET으로 기존 생성 여부를 먼저 확인한다.
- 공식 평가 계산·데모 benchmark·structureModified·자동 승인·자동 SKIPPED를 운영 경로에서 사용하지 않는다.

## 최소 IndexedDB

DB `overload.workout.v1`, version 1. 추가 라이브러리 없음.

| 저장소 | 키·내용 |
|---|---|
| meta | 브라우저 editorDeviceId UUID |
| startAttempts | `[userId,dataGeneration]`, 고정 START 요청과 JSON 원문 |
| sessionCopies | `[userId,dataGeneration,sessionId,editorDeviceId,writerEpoch]`, 서버에서 확인한 세션 DTO |

두 연결의 device 초기화/START 준비는 readwrite 트랜잭션으로 직렬화한다. 같은 계정·세대의 기존 시작 요청을 새 요청으로 덮어쓰지 않는다.
START 전 startAttempts 트랜잭션 complete를 기다린다. START 성공 후 사본 저장과 해당 시작 요청 제거는 하나의 트랜잭션이다. 실패하면 요청이 남으며 사본 보존 완료로 표시하지 않는다. 같은 사본 키의 낮은 서버 version 응답은 높은 version을 덮어쓰지 않는다. 이전 epoch 사본은 자동 제거/병합하지 않는다.

5A에서 로컬 사본은 인증된 동일 계정·서버 확인 세대에서만 조회한다. 서버를 확인할 수 없는 재실행에서는 사본 화면을 열지 않는다. 로그아웃 시작/계정 전환 때 화면을 즉시 숨기고 이전 응답을 적용하지 않는다. 로컬 데이터·미확인 요청·기존 데모를 자동 삭제하지 않는다. 인증 비밀·CSRF·OTP는 IndexedDB에 저장하지 않는다.

## 검증

최종 코드에서 실행한 결과:

| 명령 | 결과 |
|---|---|
| `npm test` | 334개 통과, 실패/건너뜀0 (기존312 + 신규22) |
| `npm run lint` | 통과 |
| `npm run build` | TypeScript·Vite production build 통과 |
| `git diff --check` | 통과 |

기존 Node/SSR 방식에 START 저장 순서/응답 유실/중복 클릭/로그아웃 중 저장/계정·세대 전환/늦은 응답/루틴 생성 응답 유실/PUT 충돌/정밀도/읽기 전용 UI 테스트22개를 추가했다. 새 테스트 프레임워크·PWA 플러그인을 설치하지 않았다. 초기 컴파일의 미사용 import와 ES2023에 없는 `String.isWellFormed` 사용은 기존 타깃을 유지하는 Unicode 검증으로 수정했다. 테스트 비활성화나 요구사항 완화는 없다.

### 실제 IndexedDB 브라우저

`tests/fixtures/task-009-5a-indexeddb.html`에서 다음 7개와 새로고침 후 복원을 확인했다.

- 동시 연결에서 하나의 기기 UUID와 고정 START 요청 보존.
- 실제 readwrite 트랜잭션 abort 시 세션 사본·시작 요청 제거 전체 롤백.
- 성공 사본 저장과 START 요청 제거 원자성.
- START 사전 저장 abort와 요청 미생성.
- 계정·세대별 조회 격리.
- 낮은 서버 version의 늦은 사본 저장 방지.
- 새로고침·새 연결 후 기기 ID·InitialPlan·decimal·서버 microsecond 복원.

### 실제 Backend + PostgreSQL

기존 Backend의 `scripts/task-008-1c-browser.init.gradle` / `WorkoutBrowserEnvironment`를 변경 없이 사용했다. Testcontainers PostgreSQL 18.6, DB `overload_browser_isolated`, 임의 호스트 포트7113, Backend `127.0.0.1:5575`. 새 빈 DB에 V1~V15 적용을 확인했다. 개인 `overload_dev`·5432/5433을 사용하지 않았다. OTP는 기존 FakeSender의 일회용 테스트 코드이며 외부 이메일/Google 호출이 없다.

Frontend fixture `node tests/fixtures/workout-online-vite.mjs`는 ready 메타의 initialUsers=0/migrations=15/loopback 임의 포트를 검사하고 3075에서 해당 Backend만 프록시한다. 운영 경로의 `overload.core.v1` 접근은 테스트 guard로 차단한다. 인증 비밀은 증빙 파일에 기록하지 않는다.

확인한 실제 흐름:

- 신규 계정 A: 기본 개인 종목20개·루틴0개 → 웨이트/유산소 루틴201 생성 → 중량62.5→65 명시 승인 PUT.
- START201 커밋 직후 프록시가 응답 연결을 끊음 → 화면의 미확인 시작 요청 보존 → 새로고침 → 동일 UUID/본문/시각 POST200 재확인.
- 원본 루틴 승인65→70 수정 이후에도 세션 InitialPlan 승인65 보존. 세션 종목 UUID와 루틴 배치 UUID 구분.
- 검증 fixture에서 기존 Backend takeover API로 다른 기기 인수 → 실제 앱 상세 재조회에서 읽기 전용 안내. 제품 UI에는 takeover 기능을 추가하지 않음.
- 로그아웃 뒤 운동 비노출 → 별도 계정 B 로그인에서 루틴0개·ACTIVE 없음, A의 로컬 사본 미노출.
- 계정 B의 개인 종목 생성에서 기존 종목과 같은 이름을 입력해도 다른 UUID가 생성됨을 확인했다. 임시 DB의 해당 계정·이름별 행수2로 이름 기반 자동 병합이 없음을 검증했다.
- 직접 시작한 임시 컨테이너의 읽기 전용 SQL 검증: 세션1/ACTIVE1/수행세트0/명시 승인 사건2/writerEpoch1/localRevision0. snapshot·finish를 호출하지 않음.

브라우저 오류 로그에서 예상하지 않은 오류가 없었다. 실제 iPhone Safari/설치형 PWA는 아직 검증하지 않았다. Backend 전체783개 회귀는 이번 Frontend 작업에서 재실행하지 않았으며 위 실제 HTTP/PG 계약 검증과 구분한다.

검증 후 직접 연 브라우저 탭과 Node/Vite 서버를 닫고 기존 fixture의 stop 명령으로 Backend·Gradle·임시 PostgreSQL/Ryuk을 종료했다. 시작 전 존재한 사용자 컨테이너5개만 남아 있음을 확인했다. sandbox에서 막혔던 Docker/loopback 접근은 승인된 격리 검증 명령의 실행 권한으로 해결했고 개인 DB로 대체하지 않았다.

## 변경 파일

총21개: 기존6개 수정, 신규15개. 종전 데모·의존성·lockfile·Backend 파일은 변경하지 않는다.

- 기존: `AGENTS.md`, `README.md`, `docs/engineering/frontend.md`, `src/features/auth/AuthApp.tsx`, `src/features/auth/api.ts`, `src/features/auth/controller.ts`.
- 신규 제품 코드: `src/features/workout-online/{types.ts,validation.ts,api.ts,storage.ts,controller.ts,RoutineForm.tsx,WorkoutWorkspace.tsx,online.css}`.
- 신규 검증: `tests/workout-online.test.mjs`, `tests/workout-online-ui.test.mjs`, `tests/fixtures/{workout-online-data.mjs,workout-online-vite.mjs,task-009-5a-indexeddb.html,task-009-5a-contract.html}`.
- 신규 문서: 본 보고서.

## 남은 범위

5B~5E의 수행·초안·타이머·snapshot 송신·FINISH·승인 해결/기록 정정/선택 복구 화면, 다중 탭 운동 편집 제어, manifest/Service Worker/오프라인 완전 재실행은 미구현이다. 전체 이력 목록 API·요일 일정·메모·운동 전 과거 수행 요약도 제공된 것으로 표시하지 않는다.
후속 오프라인 완전 재실행은 마지막 인증 계정의 기존 진행 운동에 대한 사용자 명시 선택만 허용하고, 명시 로그아웃 뒤에는 재인증 없이 열람/편집하지 않는다. 로컬 잠금은 실제 인증/암호화가 아니다.

Backend 변경 없음. 현재 개인 DB는 검증 대상이 아니며 실제 사용자 흐름에는 V15까지 갖춘 Backend가 필요하다. 사용자 검토 전 스테이징·커밋·Push하지 않는다.
