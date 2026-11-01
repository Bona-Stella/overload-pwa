# Task 009 — Frontend 5E 구현·검증 보고서

작성일: 2026-11-01 (Asia/Seoul).

## 범위와 시작 상태

- Frontend `42c6743d0e3c365f238fba7c98ce111fc3599b2f` (`feat(workout): add workout finish and recovery UI`), Backend `fc2db21e41637886abfd58e577175f2f33b5ba8b` (`feat(workout): add closed workout session listing`). **양쪽 5D 커밋과 clean을 확인하고** 시작했다.
- 양쪽 AGENTS/Engineering, Task 006 v0.3.1·Task 008 운동/휴식/인증 정책, Task 009 v1.0, Backend V14/V15 계약, Frontend 5A~5D 보고서와 실제 인증·IndexedDB·Web Locks·동기화·종료/복구 코드를 확인했다.
- 5E만 구현했다. Backend 제품 코드·마이그레이션·개인 `overload_dev`·의존성/lockfile 변경 없음. 기존 평가·승인·복구 정책과 운동 저장/송신 코어를 재작성하지 않았다. 범용 Outbox/명령/동기화 엔진, 전체 Task 009 완료 문서는 추가하지 않았다.
- 스테이징·커밋·Push하지 않았다. 실기기에 접근할 수 없어 iPhone/Android 설치 성공을 주장하지 않는다.

## 변경 파일

| 파일 | 변경 |
| --- | --- |
| `public/manifest.webmanifest`, `public/favicon.svg`, `public/icons/*.png` | 이름, 루트 start/scope/id, standalone, 테마, 192/512/maskable/Apple 180 아이콘 |
| `scripts/generate-icons.ps1` | 외부 이미지 없이 브랜드 색과 바벨 도형으로 아이콘 재생성 |
| `scripts/pwa-build.ts`, `vite.config.ts`, `src/pwa/worker.js` | 프로덕션 파일 목록·해시 생성, 정적 앱 셸, 안전한 업데이트 |
| `src/pwa/registration.ts`, `PwaStatus.tsx`, `src/main.tsx`, `index.html` | 프로덕션 등록, 설치 안내, 준비·업데이트 상태 |
| `src/features/workout-local/offline-access.ts`, `offline.ts`, `OfflineResume.tsx` | 계정/세대/사본에 결합된 명시적 로컬 진입과 폐기 가능한 허용 정보 |
| `src/features/workout-online/storage.ts` | 기존 schema v2의 meta에 허용 포인터, 원본·최신 서버 사본 확인 |
| `src/features/auth/controller.ts`, `AuthProvider.tsx`, `AuthApp.tsx` | 로그아웃/401 경계, 네트워크 장애 구분, 초안 저장 후 재연결 확인 |
| `WorkoutWorkspace.tsx`, `LocalWorkoutScreen.tsx` | 기존 화면 재사용, 서버 확인 전 송신 차단, 준비 완료 후 허용 저장 |
| `workout-local/lock.ts`, `workout-online/controller.ts` | takeover 잠금 해제 완료 후 새 편집기 공개, 확실한 계정/세대 오류의 로컬 진입 차단 |
| `tests/pwa-offline.test.mjs` | 새 권한·저장 실패·취소 경계·Service Worker 테스트 18개 |
| `tests/fixtures/pwa-production-server.mjs`, `run-pwa-browser.mjs` | 실제 dist·Edge·격리 V15 Backend/PG 검증, 테스트 전용 네트워크/응답 장애 |
| `AGENTS.md`, `README.md`, `docs/engineering/frontend.md`, 이 보고서 | 현행 상태·배포·캐싱·플랫폼·검증 계약 |

## PWA와 캐시 계약

1. Vite/React 구조와 기존 모바일 safe-area/100dvh 레이아웃을 유지한다. 새 프레임워크나 패키지가 없다. 배포 base는 `/`로 제한한다.
2. 프로덕션 빌드가 index, 해당 빌드의 JS/CSS 및 고정 manifest/favicon/아이콘에 대한 경로·SHA-256 목록을 worker에 넣는다. 개발 서버는 등록하지 않는다.
3. install에서 credentials=omit, redirect=error로 파일을 받고 **모든 바이트 해시가 맞은 후** 전용 버전 캐시에 쓴다. API·런타임 HTML·로그인 응답을 추가하는 runtime cache가 없다. 잘못된 배포·개인화 HTML·로그인 페이지 응답은 해시가 달라 준비에 실패한다.
4. 동일 origin GET의 정확한 허용 경로만 캐시한다. query가 없는 `/`와 `/account` navigation은 캐시의 공개 index로 연다. `/api`, `/oauth2`, OAuth/인증 복귀 URL, 외부 Google 페이지, query가 붙은 요청은 worker가 가로채지 않는다. 쿠키·OTP·CSRF·인증 응답을 Cache Storage에 쓰지 않는다.
5. 최초 접속의 캐시 준비 전 오프라인 방문은 지원하지 않는다. 이미 준비된 앱 셸의 재실행과 새로고침을 지원한다. 캐시 소실은 자동 복구를 보장하지 않는다.
6. skipWaiting·clients.claim·controllerchange 강제 reload가 없다. 새 버전은 waiting에 머물고 사용자가 기기 저장을 확인한 뒤 **모든 탭/앱 창을 닫고 다시 열어** 적용한다. 업데이트 확인은 registration.update만 호출한다.
7. install 시 운동 DB의 버전만 조회해 v2 이하인지 확인한다. 없는 DB를 여는 upgrade는 abort하며 DB를 생성하거나 운동을 읽어 병합/작성하지 않는다. 알 수 없는 이후 schema, 저장소 오류, 파일/캐시 오류는 새 worker 설치를 중단하고 기존 설치를 유지한다. activate에서는 이전 worker의 창이 닫힌 표준 생명주기 뒤 **전용 정적 캐시만** 교체한다.
8. 배포는 HTTPS와 루트 scope, 올바른 MIME, 동일 릴리스의 index/해시 자산이 필요하다. `/api`·OAuth/복귀 경로를 SPA HTML로 바꾸지 않는다. SW는 재검증 가능하게 제공하고 이전 창을 위해 이전 해시 자산을 유지한다. 사용자별 HTML 변경은 지원하지 않는다.

## 온라인·오프라인 진입과 인증 경계

- 온라인 로그인과 bootstrap/현재 세션 조회, 서버 사본 보존, 실제 로컬 운동 문서 생성이 완료된 같은 writer만 오프라인 진입 허용을 얻는다. 새로운 서버 START는 계속 온라인에서만 한다.
- `overload.workout.v1` **schema version 2 유지**. meta의 `offlineResume`에는 userId/dataGeneration/sessionId/editorDeviceId/writerEpoch + nonce/confirmedAt의 7개 필드만 저장한다. 운동 데이터를 복제하지 않는다.
- localStorage `overload.offline.access.v1`에는 userId/dataGeneration/nonce/allowed의 작은 로컬 진입 표식만 저장한다. 인증·토큰·중량·수행은 저장하지 않는다. 표식과 IDB 포인터의 nonce/계정/세대가 일치해야 한다. 이는 **로컬 UI 제한이며 인증/암호화가 아니다.**
- 읽을 때 기존 device UUID, 정확한 compound key의 문서, 최신 서버 사본의 ACTIVE/미삭제/같은 writer, 불변 InitialPlan/시작 시각을 검사한다. 임의 계정/세대/세션을 탐색하는 UI는 없다. 서버에서 FINISH가 확인된 문서는 오프라인 진행 운동으로 열지 않는다.
- 명시 로그아웃은 HTTP보다 먼저 동기 표식을 차단하고 IDB 허용 포인터를 해제한다. 원본을 삭제하지 않는다. 한 저장 경로가 실패하면 다른 차단 경로를 사용하며 둘 다 실패하면 로그아웃 성공으로 표시하지 않는다. BroadcastChannel과 storage 이벤트로 다른 탭도 차단한다.
- 확실한 401/anonymous session, 다른 계정, 알려진 세대/소유권 불일치도 cold 재실행 허용을 해제한다. 401 뒤 CSRF fetch만 네트워크 실패해도 cold 오프라인으로 취급하지 않는다. 기존 5B의 **이미 열어 둔 같은 계정** 운동 보호는 별개로 유지한다.
- 앱 재실행의 실제 NETWORK/TIMEOUT에서만 unavailable 화면과 `이 기기의 운동 이어가기`를 제공한다. 자동 authenticated 처리·자동 로컬 공개가 없다. 503/잘못된 응답·확실한 거부는 이 경로로 들어가지 않는다.
- 사용자가 이어가기를 선택하면 기존 LocalWorkoutScreen/Controller와 Web Locks를 사용한다. Web Locks가 없거나 다른 탭이 잠금을 보유하면 읽기 전용이다. 표식 취소 후에는 저장 가드도 실패한다.

## 원본·타이머·종료 의도와 재연결

- 기존 InitialPlan/AppliedPlan, 원래 UUID·origin·승인 문맥, 초안 문자열, 완료/취소/UNKNOWN/삭제 원본, 타이머 segments/누적 시간/앵커, revision, pendingSnapshot/pendingResolution, FINISH 의도/고정 요청/ACK를 그대로 읽는다. 허용 포인터는 localRevision을 올리지 않는다.
- 입력과 완료는 기존 단일 IndexedDB 트랜잭션 완료 후에만 확정한다. 실패하면 UI 완료를 표시하지 않는다. 기존 decimal 정규화/원본 초안 정책을 바꾸지 않았다.
- 유산소는 원래 앵커와 segments, 휴식은 endsAt으로 재계산한다. tick으로 DB/서버에 쓰지 않는다. 기기 시각 모순은 기존 검증을 따르고 원래 발생 시각을 보정하지 않는다. 실제 OS 백그라운드 실행은 보장하지 않는다.
- 오프라인 편집기의 송신 online 조건은 항상 false다. FINISH 버튼은 기존 의도 저장 기능을 재사용한다. endedAt/완료 기록을 먼저 로컬 저장하고 서버 FINISHED/AUTO_CLOSED를 만들거나 주장하지 않는다.
- online/foreground 이벤트 또는 명시 재확인은 초안 flush를 기다린 뒤 실제 auth session/CSRF를 조회한다. 반복 타이머·heartbeat·백그라운드 전송을 추가하지 않았다. 재확인 중 기존 로컬 선택 화면은 보존하되 pending으로 송신을 차단한다.
- 인증 확인 뒤 Workspace가 bootstrap(계정/세대), ACTIVE/상세와 편집권을 확인·보존한다. 그동안 기존 송신의 online 조건도 false다. 이후 기존 5C/5D 단일 송신으로 선행 고정 요청을 확인하고 같은 요청을 재전송한다.
- FINISHED의 원래 FINISH 비교, AUTO_CLOSED의 명시 복구 안내, 외부 writer/이전 사본 보존, 삭제 시 차단은 기존 계약을 따른다. 다른 사용자·세대·epoch 원본을 자동 복사/retag/병합하지 않는다.

## 검증 중 발견·해결한 경계

- 기기 ID를 아직 읽지 못한 transient 상태를 다른 writer로 간주해 오프라인 허용을 취소하던 경쟁: ID 조회 완료와 비동기 취소 직전의 최신 상태를 확인한다. 실제 온라인 새로고침 후 cold 재실행으로 검증했다.
- 네트워크 보류·재인증으로 취소된 과거 요청을 SESSION_CHANGED로 오인해 새 인증/허용을 취소하던 경쟁: 실제 서버의 계정 변경과 `REQUEST_SUPERSEDED`를 구분한다. 기존 고정 요청을 유지하며 무단 재전송하지 않는다.
- foreground 재확인 동안 오프라인 선택 화면이 사라지던 문제: 확인이 pending인 동안 선택을 유지하고 결과가 확정되면 전환한다.
- takeover 요청 잠금이 해제되기 전에 새 epoch 편집기가 열려 읽기 전용이 되던 경쟁: Web Lock request 완료를 기다린 뒤 서버 사본을 공개한다. 실제 다른 기기 takeover → 명시 가져오기에서 새 빈 사본과 구 미전송 원본 분리를 확인했다.
- 브라우저 자체의 idempotent PUT 재시도가 ACK 유실 주입을 통과해 버리는 테스트 문제: 해당 장애 구간의 모든 ACK를 차단한 뒤 재연결에서 해제했다. 운영 재시도 정책을 확대하지 않았다.

## 실제 브라우저·격리 Backend/PostgreSQL

실제 프로덕션 `dist`를 loopback 정적 서버에서 제공하고 전용 headless **Edge 156.0.4314.58** 프로필·CDP를 사용했다. V15까지 적용된 기존 Testcontainers fixture의 **새 PostgreSQL 18.6**, 사용자 0명으로 시작한 Backend, 실제 OTP/쿠키/CSRF/세션 API를 사용했다. 개인 DB와 분리되었음을 ready.json의 origin/container/migration/initialUsers로 확인했다. 인증 우회·운영 보안 완화 없음.

주 흐름 12항목, 추가 경계 4항목 통과:

1. 실제 빌드 Manifest/SW 제어·정적 전용 Cache Storage.
2. 정적 서버를 완전히 중지하고 Edge를 종료한 뒤 동일 프로필 재실행: 선택 전 원본 비공개, 선택 후 원본 초안·미확인 Snapshot 복원.
3. 실제 IDB put 실패: 저장된 완료 수와 snapshot 불변, 완료 UI 미확정.
4. 오프라인 완료 후 강제 프로세스 종료·재시작: 기록·유산소 앵커·고정 요청 보존.
5. 오프라인 실제 두 탭: 두 번째 탭 읽기 전용, 동일 Web Lock.
6. 오프라인 FINISH 후 강제 종료·재실행: 원래 endedAt/최종 상태 보존, 서버 종료 성공 미표시.
7. 재연결: 인증·현재 namespace/세션 조회가 첫 쓰기보다 선행, 원래 Snapshot JSON 동일 전송 후 최종 FINISH.
8. 업데이트 worker waiting: 열린 운동/FINISH 원본 불변, 강제 교체 없음.
9. **격리 DB의 last_workout_synced_at만 25시간 전으로 설정**해 실제 AUTO_CLOSED: 자동 Snapshot/FINISH 없음, 오프라인 종료/복구 원본 보존.
10. 실제 다른 device의 takeover: 구 epoch 자동 송신 없음, 미전송 원본 보존.
11. 명시적으로 가져오기: 새 epoch 사본은 서버 사실만 포함하고 구 epoch 수행을 합치지 않음.
12. 명시 로그아웃 후 서버 중지·cold 재실행: 원본은 남고 로컬 열람/편집 진입 없음.
13. 같은 프로필에서 실제 다른 OTP 계정 로그인: 이전 계정들의 모든 문서 불변, 화면/권한 격리.
14. 390×844 모바일 **viewport 에뮬레이션**: 가로 overflow 없음, CDP Manifest/설치 가능성 오류 0, PNG 확인.
15. **세대 전환은 테스트 프록시의 읽기 응답 계약 주입**: 새 namespace와 뒤따른 이전 세대 응답 불일치로 원본 격리·cold 차단 확인. DB 세대/FK/마이그레이션은 변경하지 않았다. 실제 사용자 데이터 초기화 API의 end-to-end 검증으로 표현하지 않는다.
16. fixture의 실제 서버 세션 폐기 후 401: 네트워크 장애와 구분, cold 허용 해제, 이후 서버 중지/재실행에서도 이전 원본 비공개·보존.

실행 근거(ignored 로컬 산출물): `logs/task-009-5e/browser-result.json`, `boundary-browser-result.json`, `mobile-workout.png`, 빌드/회귀 로그. 주 흐름 Edge 5회 실행(그중 강제 종료 2회), 추가 경계 3회 실행. 기존 5A~5D 브라우저 전체를 반복하지 않았다. Backend 제품 변경이 없으므로 기존 105개 통합 테스트를 다시 실행했다고 주장하지 않는다.

재현 명령:

```powershell
# overload-server: 개인 DB 설정을 읽지 않는 기존 일회성 fixture
$env:JAVA_HOME='C:\Users\Home\.jdks\temurin-25.0.5'
.\gradlew.bat --offline --no-daemon -I scripts/task-008-1c-browser.init.gradle workoutBrowserEnvironment
# overload-pwa: 별도 셸
npm run build
node tests/fixtures/run-pwa-browser.mjs
# 위 결과 JSON의 전용 profile 경로로, 주 흐름을 반복하지 않고 추가 경계만 실행
node tests/fixtures/run-pwa-browser.mjs --boundaries --profile=logs/task-009-5e/profile-<위 실행 UUID>
```

## Frontend 전체 회귀

- `npm test`: **437/437 통과**, 실패/skip 0 (기존 419 + 신규 18).
- `npm run lint`: 통과.
- `npm run build`: TypeScript·프로덕션 Vite·SW 생성 통과. 기존 의존성 그대로 사용. 브라우저 통과 후 잠금 Promise의 let→const 선언만 정리하고 전체 회귀·lint·build를 최종 확인했다.
- worker 모델 테스트는 해시 불일치 설치 중단, 인증/API 경로 통과, v2 허용/이후 schema 거부/없는 DB upgrade abort, 강제 claim/업데이트/운동 쓰기 부재를 검증한다. 허용 테스트는 logout/grant 경합, 두 저장 장벽 실패, 401 뒤 CSRF 장애, account/generation fence, 취소된 요청·재인증, 잠금 해제 완료를 검증한다.
- React effect lint 오류는 직접 상태 변경을 비동기 저장 결과 처리로 옮겨 해결했고, 잠금 해제 Promise는 재할당하지 않는 const 선언으로 정리했다. 최종 검사 비활성화 없음.

## 플랫폼 지원·남은 검증

현재 Vite의 실제 기본 build target은 Chrome/Edge 111, Firefox 114, Safari/iOS 16.4다. Web Locks만 지원한다고 더 오래된 Safari 전체 지원을 주장하지 않는다. Web Locks 미지원·권한 제한 환경은 읽기 전용이다.

| 환경 | 확인한 내용 | 미검증 |
| --- | --- | --- |
| Windows Chromium/Edge | 실제 SW/IDB/두 탭/종료·강제 재시작/업데이트 대기/설치 진단/모바일 viewport | OS 설치 창을 통한 수동 설치 전체 |
| Android PWA | 표준 Manifest, SW, 설치 안내·실행 구조 준비 | 실기기 홈 화면 설치/standalone cold 실행/화면 잠금·배터리 정책·업데이트 |
| iPhone Safari/홈 화면 | 현재 WebKit 공식 문서 확인, Apple 아이콘, safe-area/dvh, 기능 감지·분리 저장 안내 | 실제 Safari/홈 화면 설치·저장 영역·키보드·잠금/복귀·업데이트·저장소 정리 |

- [WebKit Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)는 Web Locks와 동적 viewport 단위를 도입했다. 실제 지원 버전/설정은 기기에서 추가 확인해야 한다.
- [WebKit Safari 17.2](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/)에 따르면 홈 화면 추가 시 쿠키를 복사할 수 있지만 다른 로컬 저장은 복사하지 않고 이후 웹사이트 데이터도 공유하지 않는다. Safari 탭의 운동이 설치 앱에 자동으로 나타난다고 가정하지 않는다. 홈 화면 앱 자체에서 온라인 인증·운동 열기를 먼저 수행하도록 안내한다.
- [WebKit 저장 정책](https://webkit.org/blog/14403/updates-to-storage-policy/)은 IndexedDB/Cache/SW 등이 용량·사용·기기 저장 압박에 따라 정리될 수 있음을 설명한다. 로컬 미전송 기록은 저장소 삭제 후 서버에서 복구할 수 없다. 영구 보존·백그라운드 실행/동기화를 보장하지 않는다.
- [설치 방식](https://web.dev/learn/pwa/installation/)은 브라우저/OS마다 다르다. iOS는 Safari 공유 메뉴의 홈 화면 추가를 안내하고, Android 설치 결과나 실제 standalone 동작을 에뮬레이션 통과로 대체하지 않는다.
- [Service Worker 생명주기](https://developer.chrome.com/docs/workbox/service-worker-lifecycle)는 열린 기존 창이 있는 동안 새 worker가 waiting에 남는 방식을 뒷받침한다.

정책을 임의 변경한 부분은 없다. 실기기 설치/잠금/백그라운드·플랫폼 저장소 검증과 실제 배포 HTTPS/라우팅 점검, Task 009 최종 통합 검증은 남아 있다. 브라우저 저장소의 사용자 삭제/eviction이나 모든 저장 장벽이 실패하는 환경에서는 강제 종료를 넘는 보존·접근 차단을 무조건 보장할 수 없다.

## 최종 Git·프로세스

Frontend HEAD는 시작 커밋을 유지하고 **수정 15개·신규 17개, 총 32개 파일**이 미커밋·미스테이징이다. Backend HEAD도 그대로이며 작업 트리 clean이다. 기존 migration과 개인 overload_dev 변경 없음. 커밋·Push 없음.

브라우저 runner는 자신이 실행한 전용 Edge/정적 서버를 finally에서 종료했다. 최종 Backend fixture도 stop 명령으로 정상 종료(BUILD SUCCESSFUL)했다. 3080/11941/14471 listener와 전용 Edge/Node/Backend 프로세스가 없고 ready/OTP 파일이 정리되었음을 확인했다. 일회성 PostgreSQL/Ryuk 컨테이너는 종료됐고 기존 사용자의 Docker 컨테이너 5개는 유지했다.
