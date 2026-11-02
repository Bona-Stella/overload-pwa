# 표준 운동 카탈로그 — Frontend 3단계 구현·검증

작성일: 2026-11-02 (Asia/Seoul).

## 기준과 경계

Frontend 시작 HEAD: 984899c2d5545483026b6014a0361e91a18ade96. Backend HEAD: e664564081fb5a61bbaa9a0f02635b6b9c9957f7. 양쪽 시작 작업 트리는 clean이었다. 실제 V17 Java DTO·엄격한 nullable validation을 기준으로 구현했다.

Frontend 제품 코드·테스트·문서만 변경한다. Backend 제품 코드·migration·개인 overload_dev DB를 변경하지 않았다. 의존성 추가·commit·push가 없다. 기존 개발 전용 /demo는 실제 계정 데이터와 분리된 목업으로 유지한다. 과거 개인 조회 전용 Overview는 실제 제품 화면에서 제거하고 현재 bootstrap 휴식 설정을 표시한다.

## 제품 변경

| 파일 | 내용 |
| --- | --- |
| src/features/workout-online/types.ts, validation.ts | standardExerciseId 단일 ID, InitialPlan/AppliedPlan/평가 schema2, 필수 nullable 장비와 네 부하 코드 |
| src/features/workout-online/api.ts, controller.ts | 로그인 후 표준 search-data/제조사 bootstrap, 메모리 재사용, 개인 생성/이름 변경 메서드 제거, 루틴 삭제/제거 배치 조회 |
| src/features/auth/api.ts, AuthApp.tsx | 정확한 카탈로그 GET 경로만 허용, 구 개인 목록 Overview 제품 진입 제거 |
| src/features/workout-online/catalog.ts, ExerciseSearch.tsx | NFKC·Unicode 공백·소문자 검색, 이름/별칭, UUID 중복 제거, 최대20개, IME Enter 보호·키보드·터치·빈 목록 |
| src/features/workout-online/equipment.ts, EquipmentFields.tsx | 독립 nullable 제조사/부하, 비활성/목록 밖 기존 제조사 보존, 표시 |
| src/features/workout-online/RoutineForm.tsx, routine-weights.ts, WorkoutWorkspace.tsx, online.css | 표준 검색 재사용, NEW/EXISTING/RESTORE 정확한 장비 키, 동일 배치/중량 보존, 명시 승인·고정 제출·충돌 유지 |
| src/features/workout-local/model.ts, types.ts, validation.ts, LocalWorkoutScreen.tsx, local.css | 문서 schema2, 현재 장비 명시 변경, 완료 순간 값 복사, 완료 원본 변경 차단, 추가 운동 검색 |
| src/features/workout-online/closed-model.ts, ClosedWorkout.tsx | 복구 동일성·감사·종료 UI에 당시 장비 포함, 정정에는 장비 입력 없음 |
| src/features/workout-online/storage.ts | DB3 일회성 upgrade, 원자 초기화·blocked/versionchange 실패 보호 |
| src/pwa/worker.js | 읽기 전용 DB 호환 경계를3까지 조정, 기존 waiting 정책 유지 |
| tests/standard-catalog.test.mjs, tests/fixtures/standard-catalog* | 새 계약·장비·검색 단위/브라우저·실제 V17 통합 검증 |
| tests/fixtures/seed-standard-catalog.mjs, run-standard-catalog-browser.mjs | 검증된 V17 일회성 컨테이너만 seed, 개인 브라우저와 분리된 Edge 프로필 |
| 기존 tests/fixtures의 5B/5C/5D/PWA, workout-online-data.mjs 및 관련 단위 fixture | 표준 UUID/schema2/명시 nullable 전환, 기존 회귀 유지 |
| tests/pwa-offline.test.mjs | worker DB3 허용·DB4 거부 |
| eslint.config.js | 생성된 logs 브라우저 프로필을 검사 대상에서 제외 |
| AGENTS.md, README.md, docs/engineering/frontend.md, 이 보고서 | 현재 계약·전환·검증 경계 |

## 장비와 기존 동기화 보존

START 입력에는 장비를 추가하지 않는다. 서버의 InitialPlan/AppliedPlan을 그대로 보존한다. 장비 편집은 현재 AppliedPlan만 변경하며 작업 중량·weightContext·승인 요청·원래 루틴을 바꾸지 않는다. 완료 시 manufacturerId/loadType을 세트 자체에 복사한다. 과거 완료 세트를 현재 계획으로 재계산하지 않는다. 첫 두 세트가 A, 다음 세트가 B이면 각 원본이 그대로 남는다.

snapshot 전체 직렬화와 고정 requestJson에는 새 필드가 포함된다. 미확인 pending 요청을 새 장비 설정으로 재생성하지 않는다. FINISH/ACK·UNKNOWN·취소 원본·타이머·writerEpoch/revision·Web Locks·takeover·계정/세대·최초/현재 평가 구조를 유지한다. 복구의 같은 UUID 판정은 장비도 비교하며 UNVERIFIED 승인 주장도 장비 원본을 잃지 않는다. 서버 공식 비교 Context에는 장비를 추가하지 않는다.

## IndexedDB·PWA

이름 overload.workout.v1 유지, 버전3. oldVersion이1 또는2인 versionchange 트랜잭션에서 확인된 meta/startAttempts/sessionCopies/localWorkouts만 clear한다. meta의 과거 offlineResume도 함께 제거한다. 이 포인터가 없으면 이전 localStorage fence만으로 진입할 수 없다. 다른 앱의 IndexedDB·localStorage·Cache Storage를 초기화하지 않는다.

신규 설치(oldVersion0)와 이미 DB3인 열기는 초기화를 실행하지 않는다. 실패하면 version과 모든 store가 함께 롤백된다. blocked는 실패로 반환하고, 그 요청이 나중에 unblocked되어도 upgrade를 abort한다. versionchange에서 기존 연결을 닫고, 구 앱의 DB2 open은 VersionError로 새 데이터를 쓰지 못한다. 새 START·서버 사본·schema2 로컬 문서가 정상 보존된 뒤 기존 OfflineAccess 검증으로 허용을 다시 발급한다.

worker는 DB 버전만 확인하며 workout 데이터를 직접 읽어 삭제하거나 마이그레이션하지 않는다. skipWaiting/claim/강제 reload 없음. 기존 waiting과 모든 Overload 창 종료 후 적용 정책을 유지한다. API/인증 응답을 정적 캐시에 저장하지 않는다.

## 검증

최종 검증은 다음과 같다. 기존 테스트를 비활성화하거나 요구 조건을 낮추지 않았다. 반복 실행한 횟수는 합산하지 않았다.

| 명령/검증 | 최종 결과 |
| --- | --- |
| npm test | 450개 통과, 실패·skip·취소0 (기존437 + 신규13) |
| npm run lint | 통과 |
| npm run build | TypeScript + Vite 성공, JS425.35kB / gzip122.10kB |
| node tests/fixtures/run-standard-catalog-browser.mjs | 9개 검증 묶음 통과: 실제 IDB 전환/실패/재실행/구 앱, 검색·IME·터치·루틴 장비/RESTORE |
| 같은 runner --integration | 4개 검증 묶음 통과: 실제 V17 루틴·START·장비 혼합·중복/충돌·종료/정정/복구/삭제 |
| node tests/fixtures/run-workout-sync-browser.mjs | 5C 18항목 통과, 강제 종료/재실행3회 |
| 같은 runner --edge | 5C 유산소·재인수 추가2항목 통과 |
| 같은 runner --finish | 5D 14항목 통과, 강제 종료/재실행3회 |
| 같은 runner --finish --edge | FINISHED 복구/평가·세대 추가2항목 통과 |
| node tests/fixtures/run-pwa-browser.mjs | 실제 dist PWA12항목 통과, 서버 완전 중지/cold 재실행·두 탭·waiting·FINISH·takeover·로그아웃 |
| 같은 runner --boundaries --profile=(방금 생성한 격리 프로필) | 계정 전환·390px/installability·세대·실제401 추가4항목 통과 |
| git diff --check / 수정 문서 로컬 링크 | 통과 |

브라우저 검증은 설치된 Edge의 별도 headless 프로필과 CDP를 사용했다. 실기기 검증으로 간주하지 않는다. UI의 한국어 IME는 합성 composition/keydown 이벤트, 모바일 선택은 실제 CDP touch 이벤트로 검사했다. 카탈로그 입력 변경은 React 메모리 필터만 수행하며 매 입력 HTTP가 없다.

실제 Backend 실행은 기존 WorkoutBrowserEnvironment의 testClasses와 runtimeClasspath를 사용했다. 별도 Gradle init은 Frontend logs 아래 두고 runtime classpath만 생성했다. 새 PostgreSQL18.6 컨테이너 c8ccc3ff271a85f27fcc411de6f94674e7924fca7e4f69a3a57f0a3f3a3bc57f, 초기 사용자0, migration17, production SystemClock을 ready.json으로 확인한 뒤에만 카탈로그 fixture를 등록했다. 개인 DB를 대신 사용하지 않았다.

원본 근거는 ignored logs의 catalog-tests-final-report.log, catalog-lint-verified.log, catalog-build-verified.log, catalog-sync-browser-final3.log, catalog-sync-edge.log, catalog-finish-browser.log, catalog-finish-edge.log, catalog-pwa-browser.log, catalog-pwa-boundaries.log와 standard-catalog/result.json, standard-catalog-v17/result.json, task-009-5e/*browser-result.json이다. 화면 확인용 standard-catalog/mobile.png도 생성했다. 테스트 결과물·프로필은 Git 대상에 넣지 않았다.

### 검증 중 해결한 오류

- EquipmentFields의 표시 함수를 함께 export하여 Fast Refresh lint가 실패했다. 순수 표시 함수/상수는 equipment.ts로 분리했고 최종 lint가 통과했다.
- 기본 sandbox의 loopback/Edge/Docker 접근 제한은 자동 승인된 검증 실행 권한으로 해결했다. 개인 브라우저나 개인 DB로 우회하지 않았다.
- 기존 5C fixture의 본문 수집 시점을 프록시 전으로 옮기되 request.pause로 전송 전 body 소비를 막았다. 브라우저의 내장 PUT 재시도가 장애 주입을 바꾸지 않도록, 격리 프록시는 서버 성공 커밋 뒤 성공 ACK를 숨기고503을 반환한다. 앱의 동일 본문 재송신·UNKNOWN 검증은 그대로 유지한다. PWA 검증에서는 실제 연결 종료와 서버 완전 중지도 별도로 수행했다.
- 서버 완료 세트 배열을 ordinal 순서로 가정한 기존 브라우저 검증을, 계약상 집합의 ordinal을 정렬하여 비교하도록 수정했다. 수행 UUID·내용·취소·원문 검증은 유지한다.
- upgrade 도중 강제 abort의 예외를 명시 처리해 일부 clear 이후 실패도 원자 롤백하며 전역 unhandled 오류를 남기지 않도록 했다.

### 자원 정리와 승인 상태

검증용 Vite 서버, static PWA host, 모든 기록된 Edge PID와 자식 프로세스, Java fixture를 종료했다. remainingOwned/remainingFixtureJava가 모두 빈 배열임을 확인했다. 일회성 PostgreSQL과 Ryuk도 제거되었으며 기존 사용자 컨테이너5개(81a6b4d6aca2, 908b9728eec1, 97473d622cad, 1079a897c476, 927921a2c15b)는 같은 ID로 유지되었다. 마지막 Node 단위 테스트 실행도 정상 종료했다.

요청된 Frontend 구현·일회성 테스트 데이터 전환·격리 검증 범위 안에서 완료했다. 추가 승인 대기·보류 작업은 없다. Backend 작업 트리는 clean이며 개인 DB 적용·배포·commit/push를 하지 않았다.

## 남은 경계

검증 대상은 새 Testcontainers PostgreSQL18.6·실제 V17 Backend·실제 OTP/쿠키/CSRF·격리 Edge다. 개인 개발 DB 적용·초기 카탈로그 운영 등록·배포는 이 작업에 포함하지 않는다. 실제 iPhone/Android 설치·네이티브 IME·화면 잠금/OS 백그라운드 검증은 수행하지 않았다. 합성 IME 조합 이벤트와 모바일 에뮬레이션을 실기기 검증으로 취급하지 않는다.

## 실제 변경 파일 전체 (47개)

저장소 overload-pwa 기준.

- AGENTS.md
- README.md
- docs/engineering/frontend.md
- docs/tasks/standard-exercise-catalog-frontend-phase-3-report.md
- eslint.config.js
- src/features/auth/AuthApp.tsx
- src/features/auth/api.ts
- src/features/workout-local/LocalWorkoutScreen.tsx
- src/features/workout-local/local.css
- src/features/workout-local/model.ts
- src/features/workout-local/types.ts
- src/features/workout-local/validation.ts
- src/features/workout-online/ClosedWorkout.tsx
- src/features/workout-online/EquipmentFields.tsx
- src/features/workout-online/ExerciseSearch.tsx
- src/features/workout-online/RoutineForm.tsx
- src/features/workout-online/WorkoutWorkspace.tsx
- src/features/workout-online/api.ts
- src/features/workout-online/catalog.ts
- src/features/workout-online/closed-model.ts
- src/features/workout-online/controller.ts
- src/features/workout-online/equipment.ts
- src/features/workout-online/online.css
- src/features/workout-online/routine-weights.ts
- src/features/workout-online/storage.ts
- src/features/workout-online/types.ts
- src/features/workout-online/validation.ts
- src/pwa/worker.js
- tests/fixtures/pwa-production-server.mjs
- tests/fixtures/run-pwa-browser.mjs
- tests/fixtures/run-standard-catalog-browser.mjs
- tests/fixtures/seed-standard-catalog.mjs
- tests/fixtures/standard-catalog-v17.html
- tests/fixtures/standard-catalog-v17.ts
- tests/fixtures/standard-catalog.html
- tests/fixtures/standard-catalog.tsx
- tests/fixtures/task-009-5b-backend.tsx
- tests/fixtures/task-009-5c-sync.tsx
- tests/fixtures/task-009-5d-finish.tsx
- tests/fixtures/workout-online-data.mjs
- tests/fixtures/workout-online-vite.mjs
- tests/fixtures/workout-sync-vite.mjs
- tests/pwa-offline.test.mjs
- tests/standard-catalog.test.mjs
- tests/workout-finish.test.mjs
- tests/workout-online-ui.test.mjs
- tests/workout-online.test.mjs
