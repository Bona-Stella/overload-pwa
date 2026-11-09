# T02-A 완료 · 검토 DB 보존 · T02-B 인계

> **T02-A 완료 및 당시 인계 기록.** 아래 V22 복원과 V23 재개 옵션은 당시 절차다. 백업·볼륨 보호와 명시적 재개 승인은 유지한다. 이후 V24 확인 기록, 현재 소스의 호환성, V30 통합 경로는 [테스트 환경 안내](../../../overload-server/docs/engineering/test-environment.md)를 따른다. 구현 현황은 [Frontend 8.7절](../engineering/frontend.md#87-v09-적용-범위와-구현-상태)에서 확인한다.

2026-11-06(Asia/Seoul). 사용자의 iPhone 실기기 최종 검토로 **T02-A 일반 홈 UI/UX를 승인·확정**했다. T02-B 구현은 시작하지 않았다. push하지 않는다.

## 확정 범위

- OVERLOAD18px/700/자간0.06em, 공식 달24px·Dusty Blue, 개발 검토 ON/OFF 배치
- TODAY'S ROUTINE·오른쪽 실제 날짜, 루틴명 아래 및 WEIGHT–CARDIO의 공통1px 구분선
- 실제 계획/주간 일정·오늘만 루틴 선택 후 닫힘·기존 START/이어하기 보호
- 최근 최대3건의 InitialPlan 기준 웨이트/유산소 종목 달성 수, ✓/×/?, 홈에서만 무수행 제외
- 공식 원형 웨이트 SVG와 기존 달리기18px·수치 gap5px, 그룹8px, 압축형 행
- 주간 태그 표현 준비. 실제 루틴 태그 저장/추정은 없음

Decision Log10.12와 HTML 홈 화면/설명을 동기화했다. 공식 달 SVG/PNG 및 공식 아령 SVG/PNG는 원본 그대로 커밋 대상이다. Visual Theme Spec과 검색 아이콘6종은 변경하지 않았다. 디로딩 운영 API·다른 T02 화면·HTTPS 설치형 PWA 전체 검증의 완료를 뜻하지 않는다.

## DB 보존 확인

기존 run `b4972e78-a439-42c0-8a28-2f345d767eac`의 PostgreSQL은 `/var/lib/postgresql` **tmpfs**였고 Docker 볼륨은 없었다. 재시작 시 메모리 데이터가 남지 않으며 Testcontainers/Ryuk 및 Java 종료 훅의 자동 정리 대상이었다. 원래 컨테이너를 내일 그대로 시작해서 사용하면 안 된다.

원본에 읽기 전용 repeatable-read snapshot을 열고 그 snapshot으로 pg_dump와 모든 public 테이블의 행 수/정렬된 행 지문을 생성했다. 기존 DB에는 INSERT/UPDATE/DELETE/스키마 쓰기를 하지 않았다. 동일 image ID로 만든 **새 영구 named volume DB**에 실제 복원해 모든 테이블의 수/지문이 일치함을 확인했다.

| 보존 데이터 | 값 |
|---|---:|
| 루틴 | 3 |
| 전체 운동 세션 | 15 |
| 논리 삭제되지 않은 종료 세션 | 5 |
| 진행 세션 | 0 |
| 수행 세트 | 28 |
| 유산소 수행 | 1 |
| 성공 migration | 22 |

혼합 달리기 검토 세션 `41f8c4b6-cbfb-43d5-9e50-bbc78d70a7c1`, 무수행 원본·과거 논리 삭제·정정/복구·InitialPlan·snapshot/승인 문맥도 보존했다. 홈에 보이는3건만 백업한 것이 아니다.

PC의 영구 백업:

`C:\Users\Home\Desktop\Study\overload-pwa\.local-backups\home-review\b4972e78-a439-42c0-8a28-2f345d767eac\review.dump`

- 131,087bytes, custom pg_dump
- SHA256 `b282baa89d00029d2769aebec52d972d93947e356bd690733b26d8b133f5a7b5`
- 같은 폴더의 `snapshot-audit.json`: 전체 테이블 검증 결과
- `archive.json`, `database.env`: **로컬 전용 설정/비밀 포함**. Git/업로드 대상 아님
- `.gitignore`의 `.local-backups/`로 백업·설정·기동 상태를 모두 제외

영구 복원 DB:

- 컨테이너/볼륨: `overload-home-review-b4972e78`
- image: 원본의 고정 image ID(archive.json에 기록)
- mount: named volume → `/var/lib/postgresql`, tmpfs 아님
- volume 위치: Docker Desktop Linux VM의 `/var/lib/docker/volumes/overload-home-review-b4972e78/_data`(Docker 데이터 디스크에 영구 보관)
- AutoRemove=false, restart policy=`no`, Testcontainers 자동 정리 label 없음
- DB명 `overload_v22_isolated`, loopback 전용. 재기동 시 포트는 inspect에서 갱신

운영/개인 DB 및 다른 프로젝트 컨테이너는 변경하지 않았다. PC 백업과 Docker 영구 볼륨을 함께 보존한다. `docker rm`, `docker volume rm`, `down -v`, prune, 기존 데이터 위 pg_restore/seed/초기화는 사용하지 않는다.

## 안전 종료 절차

1. `node scripts/home-review-preserve.mjs verify`: 덤프 해시·영구 볼륨·복원 테이블 지문 확인
2. `node scripts/home-review-preserve.mjs stop-legacy`: 이미 실행 중인 구형 환경의 데이터 삭제 경로를 차단한 후 종료
3. `node scripts/home-review-preserve.mjs stop-db`: 복원 영구 PostgreSQL 정상 종료
4. 컨테이너 존재/Stopped·볼륨 존재·관련 PID/포트 비활성 확인

구형 JVM은 이미 로드된 disposable 종료 훅을 갖고 있어 일회성 JDK attach agent로 **close 메서드의 컨테이너 폐기만 가드**하고 Testcontainers 등록을 해제한다. 정확한 main class/run/PID·보존 marker가 맞아야 적용된다. 자동 정리 보조 Ryuk만 최종 prune을 실행할 수 없도록 종료하고, Vite는 기존 SIGINT 핸들러, Java는 정상 Spring 종료 훅, PostgreSQL은 docker stop으로 종료한다. DB 컨테이너는 삭제하지 않는다. 보존 후 원래 tmpfs 컨테이너는 재개 대상이 아니다.

`home-review.ps1 -Action Stop`은 사용하지 않으며 해당 폐기 액션 자체도 차단했다. 영구 archive가 있으면 기존 `-Action Start`의 새 seed 경로도 차단한다. 내일부터는 아래 수동 재개만 사용한다.

## 내일: T02-B 1차 UI 완료 전에는 서버를 켜지 않는다

> 당시 V22/V23 환경의 인계와 재개 절차다.

초기 작업은 코드·설계·fixture 기반으로 루틴 관리 목록/상세/생성·편집1차 UI를 작성한다. 기존 `WorkspaceView`, `RoutineEditor`, `WeeklySchedulePanel`, 온라인 controller/API·version/소유권·저장 실패 보호를 재사용한다. 실제 수정 대상 이름은 착수 시 현재 파일을 다시 확인한다. 기존 홈과 운동/기록 보호를 보존하며 새 태그 API/DB 저장을 UI 작업만으로 임의 확정하지 않는다.

태그는 PUSH/PULL/LEGS/FRONT/BACK/FULL/UPPER/LOWER/CARDIO/MIXED 중 optional1개다. 선택/해제·저장 DTO/validation·서버/일정 투영은 T02-B의 명시 계약 범위로 구분한다. 디로딩 API를 시작하지 않는다.

1차 UI 코드가 끝나 실제 API/모바일 검토가 필요해졌을 때만, PWA 폴더에서:

```powershell
pwsh -NoProfile -File scripts/home-review-resume.ps1 -Action Status
pwsh -NoProfile -File scripts/home-review-resume.ps1 -Action Start -AfterT02BFirstUi -LanAddress 192.168.0.3
```

LAN IP는 그날 실제 주소를 확인한다. 기본 Action은 Status이고 `-AfterT02BFirstUi` 없는 Start는 실패하도록 실제 검증했다. 로그인 작업·build·앱 진입이 이 스크립트를 자동 호출하지 않는다. 오늘 종료 후 재기동/재기동 스모크는 하지 않는다.

이 명령은 기존 보존 컨테이너만 시작하고 test-classpath의 `HomeReviewResumeEnvironment`를 사용한다. 새 Testcontainers/seed/schema migrate를 실행하지 않고 Flyway validate와 JPA validate를 사용한다. Backend/control/inbox는 새 프로세스 포트를 사용하고 프론트엔드는3000을 사용한다. 동일 사용자의 루틴/기록/세대는 보존하며 간편 로그인은 새 정상 OTP 발급/검증을 사용한다. HTTP LAN의 기존 START 제한과 loopback 실제 START 정책은 유지한다.

재개한 환경을 다시 종료할 때:

```powershell
pwsh -NoProfile -File scripts/home-review-resume.ps1 -Action Stop
```

이 Stop은 새 보존 진입점의 Spring/HTTP만 닫고 named volume PostgreSQL을 stop한다. 구형 폐기 Stop과 다르며 컨테이너/볼륨을 삭제하지 않는다. 이후 새 검토 데이터를 추가했다면 PC 덤프도 새 파일로 갱신한다. 기존 덤프를 덮어쓰지 않는다.

## 컨테이너/볼륨 장애 시 복원

일반 재개는 복원 작업이 필요 없다. 컨테이너만 없어지고 named volume이 남았으면 `archive.json`의 image/env-file과 같은 볼륨으로 **새 컨테이너**를 만든다. 기존 컨테이너를 지우거나 덤프를 기존 데이터 위에 적용하지 않는다.

볼륨까지 없을 때는 먼저 `Get-FileHash <review.dump> -Algorithm SHA256`을 위 값과 비교한다. **새 이름의 빈 볼륨/컨테이너**를 같은 image·DB명·전용 loopback 포트·`database.env`로 초기화한 후:

```powershell
docker cp <review.dump의 절대경로> <새컨테이너>:/tmp/review.dump
docker exec <새컨테이너> pg_restore -U overload_test -d overload_v22_isolated --exit-on-error --no-owner --no-privileges /tmp/review.dump
```

위 pg_restore 절차는 이번 실제 복원 검증에 사용했다. 복원 테이블 지문을 `snapshot-audit.json`과 비교한 뒤에만 archive의 containerId/volume/port를 갱신한다. 기존 데이터가 존재하면 복원을 중단한다. 이 장애 복원 역시 T02-B1차 UI 완료 후 필요한 때 수동으로 한다.

## 검증 및 커밋 기록

- PWA `npm test`533/533, build/TypeScript, lint 성공
- 분리된 T01 브라우저8개 보호 회귀 성공; 실제 iPhone 시각 검토는 사용자 최종 승인으로 완료
- Backend `gradlew test homeReviewClasspath`320개 테스트 및 test-classpath 컴파일 성공. 별도 전체 PostgreSQL integrationTest는 이번 마감에서 재실행하지 않았고, 보존 DB의 실제 전체 복원 검증을 수행
- 시작 차단 gate, Node/PowerShell 구문, 공식 HTML 구문, Git diff·공식 자산 보존·백업 Git 제외 확인
- 재개 진입점은 컴파일/정적 검증했으며 실제 재기동 API 스모크는 사용자 지시에 따라 T02-B1차 후에 수행

## 실제 종료·커밋 확인

- PWA 기능/공식 문서·자산 커밋: `60a6dce9707c861926b0690e47a421db21c91ae2` — `feat(ui): complete v0.9 home integration`(60파일)
- 서버 검토 fixture·보존/재개 커밋: `80327ca3b7db52e9cdedbbca8a153a667f021752` — `test(review): preserve and resume approved home data`(5파일)
- 이어지는 마감 커밋에는 이 종료 기록과 Windows inspector의 변형 URL 대신 실제 PID/실행 경로를 확인하는 보완을 포함한다. 기능 구현 해시는 위 값이며 현재 마감 HEAD는 `git log -1 --oneline` 또는 백업 폴더의 `handoff.json`에서 확인한다(문서가 자신의 커밋 해시를 포함하는 순환 참조를 피함).
- 2026-11-06 03:17 KST: Vite PID284252·Backend PID265828 모두 없음. Spring `applicationStopped=true`, `containerPreserved=true` 확인
- 원래 `strange_darwin` 및 영구 `overload-home-review-b4972e78` 모두 **exited**, AutoRemove=false·Restart=no. 원래 DB 컨테이너 삭제 없음
- 영구 DB의 마지막 로그: 체크포인트 완료 및 `database system is shut down`. named volume과 PC dump/해시 유지
- 포트3000/6818/2744/2746/32800/11793/9229에서 검토 프로세스 listener0개. 다른 프로젝트 컨테이너는 유지
- 종료 후 어떤 검토 서버도 재시작하지 않았고 자동 시작 등록도 하지 않음. 두 저장소 모두 main, push하지 않음
- 공식 달·아령 SVG/PNG4개는 커밋 blob과 원본 작업 파일의 바이트 동일성을 확인. 백업·설정은 Git 제외

이제 PC를 정상 종료해도 PC dump와 Docker 영구 볼륨을 이용해 기존 검토 데이터를 이어 사용할 수 있다. 재개는 반드시 T02-B1차 UI가 끝난 뒤 위 수동 명령을 실행한다.
