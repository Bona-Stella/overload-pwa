# T02-A 홈 설계 일치 및 iPhone 검토 환경 개선

2026-11-05. 기존 T02-A 미커밋 변경과 검토 DB를 보존한 후속 수정이다. 공식 HTML·Decision Log·Visual Theme Spec·아이콘 원본은 수정하지 않았다. commit/push하지 않았다.

이 문서는 11월5일 검증 기록이다. 헤더·날짜·글자 크기·최근 운동 표시는 11월6일 확정된 [홈 세부 개선](ui-v09-t02a-home-details-report.md) 및 Decision Log 10.12절로 갱신되었다. 아래 볼륨 표시와 이전 헤더 설명은 당시 결과이며 현재 기준이 아니다.

## 1. 수정된 UI

- 브랜드/큰 인사말/별도 날짜 행을 제거했다. HTML처럼 왼쪽 게이지 영역, 오른쪽 `11.05 목` 형식의 실제 날짜를 배치한다.
- 오늘 카드의 한국어 kicker·22px 루틴명·WEIGHT/CARDIO 구획·각각 1부터 시작하는 번호·오른쪽 저장 계획값·구분선·내부 여백을 맞췄다. 카드의 `주간 일정` 문구와 임의 합계 줄은 제거했다. 실제 계획이 0개인 구획도 제목·총 0종목·빈 안내를 유지한다.
- START는 카드 밖 전체 폭으로 유지하고 기존 실제 controller를 호출한다. 오늘만 선택은 왼쪽 제목/오른쪽 `+`의 테두리 버튼, 열리면 `−`와 두 줄 옵션 목록이다. 배정 요일과 대표 운동 최대 2개는 실제 저장값을 사용한다.
- 주간 날짜 셀은 78px, 날짜 숫자/요일 또는 확인된 상태/루틴명의 3단 구조다. 전체 이름·상태는 선택 날짜 상세에 표시한다. 기존 기록 링크와 예약 적용 안내·관리 버튼은 압축된 상세/하단에 유지했다.
- 최근 운동은 개별 Onyx 카드 3개, 파란 날짜·말줄임 루틴명·실제 수행 수치·화살표의 한 줄이다.

## 2. HTML 일치도와 차이

동일한 393 CSS px 폭에서 원본 HTML과 실제 React를 캡처했다. 비교용 캡처는 원본의 외부 문서 toolbar/notes/phone frame만 숨기고 phone 폭을 393px로 맞췄다. 내부 HTML·스타일·원본 파일을 변경하지 않았다. 색은 HTML의 무채색 대신 Visual Theme Spec의 Onyx/Dusty Blue/그라데이션이다.

| 항목 | HTML | React | 판단 |
|---|---:|---:|---|
| 헤더 x/y/폭/높이 | 15/18/363/36 | 15/18/363/36 | 동일 |
| 오늘 카드 시작 x/y/폭 | 15/66/363 | 15/66/363 | 동일 |
| 오늘만 선택 높이 | 56 | 56 | 동일 |
| 주간 날짜 셀 | 78 | 78 | 동일 |
| 주요 카드 간격 | 13 | 13 | 동일 |
| 최근 실제 기록 카드 | HTML은 단일 안내 placeholder | 실제 3개, 각각 44px | 이번 요청의 압축형 구성 적용 |

오늘 카드 높이는 HTML의 PUSH 예시(웨이트 4개+유산소 1개)와 실제 혼합 루틴(웨이트 2개+유산소 1개)의 데이터 차이 때문에 다르다. 긴 실제 루틴명은 줄바꿈/말줄임 정책을 따른다. 주간 카드에는 실제 예약 변경·관리와 해당 날짜 기록 링크가 추가돼 HTML 180px보다 높으며, 검토 데이터에서는 약 244.5px이다. 별도의 큰 설명 블록은 두지 않았다. START는 공통 터치 크기를 보존해 HTML과 약 1~2px 차이가 있다. 하단 탭은 실제 앱에서 고정되고 HTML에서는 문서 흐름 안에 있다.

정확한 좌표·높이·글자 크기는 아래 `layout-comparison.json`에 보존했다. 새로운 디자인을 제안한 결과가 아니라 확정 HTML의 구조를 실제 데이터에 적용한 결과다.

## 3. 실제 데이터와 임시 표시 분리

| 영역 | 공급원 | 쓰기·판정 사용 |
|---|---|---|
| 오늘 루틴·운동 순서·계획 | 기존 루틴 목록/상세 API | 기존 START에서 재조회·버전 확인 |
| 주간 일정·완료/미수행/휴식 | 기존 일정/overview API | 서버 근거 유지, UNKNOWN/UNVERIFIABLE 추정 금지 |
| 최근 날짜·이름·세트·유산소·볼륨 | 기존 overview/세션 snapshot | 현재 실제 수행만 집계 |
| 디로딩 `5.2/8주`·65%·주황 | `src/review/sample.ts` | 표시 전용, API·IDB·자격·권한·통계에 사용하지 않음 |

명시적으로 실행한 개발 서버만 `DEV && VITE_HOME_REVIEW === 'true'`로 lazy review entry를 연다. `HomeReviewContext`에는 표시용 ReactNode만 있고 세션·계획·권한 필드는 없다. production build에는 샘플 값, 검토 로그인 버튼 및 전달 endpoint 호출 코드가 포함되지 않는 것을 빌드 결과에서 검사했다. 운영 홈에는 실제 디로딩 분석 OFF/0주를 만들어 넣지 않는다.

## 4. 게이지 대표 시안

HTML의 대표 `디로딩 5.2/8주`, 가는 5px 트랙, 65% 채움과 Visual Theme Spec의 주황 후보 `#D98D55`를 표시한다. 작은 `시안` 표식·접근 가능한 이름·tooltip으로 개발 검토값임을 확인할 수 있다. 클릭/탭/키보드 동작이 없는 표시 요소이며 실제 시작 버튼처럼 만들지 않았다. 주수 계산·분석 설정·자격/기간 전환·디로딩 API는 구현하지 않았다.

## 5. 최근 운동 한 줄 결과

393px 실제 데이터에서 최근 3건 모두 44px 높이, 가로 스크롤 없이 한 줄이다. 현재 DB에는 초기 샘플 이후 추가된 11/05의 무수행 종료 기록도 있으므로 이를 삭제하거나 샘플로 덮지 않았다.

- 11/05 혼합 루틴: 0세트·유산소 0건·중량 미확인.
- 11/02 상체 PUSH: 5세트·유산소 0건·2,760kg.
- 10/29 하체·등: 7세트·유산소 0건·4,180kg.

볼륨은 현재 snapshot의 실제 중량×실제 반복을 정확한 6자리 정수 스케일(BigInt)로 합산한다. BODYWEIGHT는 명시적 추가 중량만 사용하고 기존 weight/체중을 재해석하지 않는다. 0kg와 근거 없음은 구분한다. 일부 부하만 확인되면 `†`와 전체 설명을 제공하고, 전부 확인 불가/완료 세트 없음은 숫자를 추정하지 않는다. 자동 종료 표식·아주 큰 소수 볼륨 등 한 줄을 초과하는 조합은 수치 영역 줄바꿈을 허용한다. 이런 극단 조합의 실제 모바일 시각 검증은 남아 있으며 현재 실제 3건의 한 줄 결과와 구분한다. 긴 루틴명 전체와 수치는 접근 가능한 이름/상세에서 확인 가능하다.

## 6. PC/iPhone 접속 환경

- PC: **http://localhost:3000/** (기존 127.0.0.1 production PWA 캐시와 다른 출처로 새 시안 확인).
- 기존 loopback 주소 `http://127.0.0.1:3000/`도 서버 접속을 유지한다. 이전 PWA를 설치/실행한 브라우저는 위 localhost 주소로 검토한다.
- 같은 Wi-Fi의 iPhone Safari: **http://192.168.0.3:3000/**
- 실제 Backend: loopback `6818`; PostgreSQL: loopback `32800/overload_v22_isolated`.
- 기존 실행 UUID `b4972e78-a439-42c0-8a28-2f345d767eac`, 같은 Backend·컨테이너·V1~V22 DB를 유지했다. 시드 재생성·DB 재시작/초기화하지 않았다.

Vite 검토 서버 한 개를 `0.0.0.0:3000`에 바인딩하고 loopback/선택한 LAN 서브넷과 정확한 Host만 허용한다. API는 여전히 loopback Backend로 전달하며 요청을 보낼 동일 연결에서 실행 UUID/PID/instance와 제어 채널 신원을 확인한다. 개발용 개인 `.env`를 읽지 않는다. 외부 터널·공용 배포·라우터 포트 포워딩을 추가하지 않았다. 현재 Windows 네트워크는 Public 프로필이고 기존 Node Inbound Allow 규칙이 활성인 것을 읽기 전용으로 확인했다. OS 보안 설정/방화벽을 변경하지 않았다.

실제 LAN IP 경로에서 HTTP 200, OTP 발급/검증, 세션 쿠키, CSRF 보호 요청, 실제 루틴/일정/기록, 새로고침 후 로그인 유지를 자동화된 Chrome으로 확인했다. **물리 iPhone에서 직접 열어 본 결과는 아니다.** Wi-Fi 단말 격리 등 실제 기기 경로는 사용자가 위 URL로 확인해야 한다.

HTTP LAN에는 Web Locks·Service Worker·`crypto.randomUUID`가 없다. 로그인/기기 식별 초기화를 위해 기존 데모의 `getRandomValues` 기반 UUID v4 함수를 `src/id.ts`로 공통화했다. 저장소와 오프라인 계정 fence의 기본 UUID 공급만 재사용하며 암호학적 난수·UUID 형태·nonce 비교/차단 정책은 유지한다. Math.random·약한 ID·잠금 우회는 추가하지 않았다. [Web Cryptography 표준](https://www.w3.org/TR/webcrypto/)의 난수 API와 실제 브라우저 capability 결과를 확인했다.

HTTP LAN 홈의 새 START는 Web Locks 등 편집 기능이 없으면 비활성이다. **홈/로그인/기록 조회 검토와 실제 운동 편집은 구분한다.** 운동 입력·START는 PC localhost에서 검증했다. 설치형 PWA/오프라인/실기기 Safe Area는 production build+신뢰된 HTTPS로 별도 검증해야 한다. 현재 검토 서버는 Vite development 실행이며 Service Worker를 등록하지 않는다.

## 7. 간편 로그인과 실행

위 URL에서 **검토 계정으로 로그인**만 누르면 된다. 이메일/코드를 복사하거나 PC PowerShell을 실행할 필요가 없다. 검토 계정은 `home-b4972e78@example.test`이다. 실제 `/auth/email-otp/request` → test mail delivery → `/auth/email-otp/verify` → 서버 세션/CSRF 순서다. 이미 유효한 쿠키가 있으면 다시 발급하지 않는다.

전용 서버만 로컬 mailbox에서 이 계정의 현재 활성 코드 하나를 전달한다. 임의 challenge·다른 이메일·교차 출처 전달 요청은 거부한다. 코드는 hardcode/URL/localStorage/보고서/Git에 저장하지 않는다. 일반 인증/메일 정책·OTP 검증/만료·실패/요청/IP 제한·세션 소유권은 유지한다. 다른 계정으로 로그인할 수 없다. 운영 앱/서버에 전달 endpoint를 만들지 않았다.

PWA 폴더의 PowerShell 명령:

```powershell
cd C:\Users\Home\Desktop\Study\overload-pwa
.\scripts\home-review.ps1 -Action Status
.\scripts\home-review.ps1 -Action Start -LanAddress 192.168.0.3
```

현재 이미 실행 중이므로 iPhone에서는 URL만 열면 된다. 프론트엔드 재실행은 아래처럼 하며 DB/Backend를 보존한다.

```powershell
.\scripts\home-review.ps1 -Action StopFrontend
.\scripts\home-review.ps1 -Action Start -LanAddress 192.168.0.3
```

`-Action Stop`은 기존처럼 **임시 DB까지 종료·폐기**하는 명령이므로 이번 작업에서는 실행하지 않았다. LAN IP가 바뀌면 StopFrontend 후 새 주소로 Start한다. 실제 OTP의 60초 재발급 대기·시간당 발급 제한은 유지한다. PC 로그인 직후 새 iPhone 로그인을 시도해 제한에 걸리면 화면의 대기 시간이 지난 뒤 다시 누른다.

반복 자동화 검증이 소모한 전용 이메일의 발급 예산은 명시적 테스트 도구 `node scripts/home-review-login-budget.mjs`로 정리했다. 이 도구는 live identity·컨테이너 UUID 라벨·정확한 DB명·실행별 검토 이메일을 검증한 후 그 이메일의 LOGIN 요청 bucket/최근 발급 시각만 초기화한다. 앱이나 프록시에서 자동 호출하지 않는다. 검증 실패 예산·IP 예산·다른 이메일·세션·운동 데이터를 바꾸지 않는다. 검토 DB를 초기화하거나 정상 계정 정책을 완화한 것이 아니다.

## 8. 테스트·API·스크린샷

- 전체 `npm test`: **523개 통과**. 신규 볼륨/맨몸/0·미확인, 개발 로그인 접근 제한, HTTP CSPRNG UUID를 포함한다.
- `npm run build`, `npm run lint`, 양쪽 `git diff --check` 통과.
- `node tests/fixtures/run-t01-browser.mjs`: 기존 보호 흐름 **8개 묶음 통과**. 동일 편집기 DOM·초안·타이머·고정 snapshot·ACK·계정/세대·로그아웃·PWA 아이콘 캐시. 이 검사는 HTTP fixture다.
- `node tests/fixtures/run-home-review-browser.mjs --design`: 실제 검토 DB/API 검증 **6개 묶음 통과**. 새 LAN 실제 OTP 로그인, 쿠키/CSRF, 동일 폭 비교, 실제 수행 수치, 오늘만 선택 후 일정 불변, PC 실제 START, production·IDB·세션의 시안 값 부재, 통계/최근 원본 불변, 다른 계정/알 수 없는 코드 거부, HTTP START 비활성 포함.
- 테스트가 생성한 세션만 실제 FINISH/논리 삭제 API로 정리했다. 기존 기록/주간 일정/통계는 검증 전후 동일했다. 테스트 Chrome/회귀 프리뷰는 종료하고 사용자 검토 Vite·기존 Backend/DB만 남겼다.

산출물: `logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/design-review/` (로컬 파일, Git 제외).

| 파일 | 내용 |
|---|---|
| `react-home-393.png`, `official-wireframe-393.png` | 같은 폭의 실제 React / 공식 무채색 HTML |
| `react-today-393.png`, `react-week-393.png`, `react-chooser-393.png` | 실제 오늘 카드·주간 일정·선택 목록 |
| `react-home-320.png`, `react-home-desktop.png` | 작은 화면 가로 overflow 없음 / 데스크톱 |
| `real-start-entry.png` | 실제 PC START 후 기존 편집기 |
| `lan-home-393.png` | 실제 LAN 출처·서버 데이터, HTTP 기능 안내 |
| `layout-comparison.json`, `design-result.json` | 실제 레이아웃 수치·API 상태·브라우저 capability·검증 결과 |

초기 Host 위조 테스트는 fetch 클라이언트가 Host를 바꾸지 않아 native HTTP request로 수정했다. 캡처 검사에서는 전역 줄 높이와 실제 기록 링크가 만드는 높이를 확인해 조정했다. 실제 LAN 검증에서 OTP 후 fence 초기화의 UUID 의존 문제를 발견해 기존 CSPRNG 함수를 재사용했다. 테스트 브라우저 재시작 시 남은 DevToolsActivePort는 제거하고 유효 세션을 재사용하도록 정리했다. 실패를 숨기거나 인증 제한을 없애지 않았다.

## 9. 미구현·후속 연결

실제 분석 ON/OFF, 유효 주수, 디로딩 자격/기간/시작·완료·취소 API는 여전히 미구현이다. 이 게이지를 실제 상태로 연결하는 작업은 T03/T04에서 진행한다. 휴식 타이머 효과음/깜빡임, 다른 T02 화면 전체 재설계, 새 패키지는 추가하지 않았다. 실제 iPhone Safari·신뢰된 HTTPS·설치형 PWA·극단적인 긴 수치 조합의 최종 밀도 검토는 남아 있다.

## 10. 파일과 Git 상태

PWA의 이번 주요 변경은 `src/features/home/*`, `src/review/*`, `src/main.tsx`, `src/app/AppShell*`, 공통 `src/id.ts` 및 그 사용처(기존 demo id 파일 이동 포함), `scripts/home-review*`, 관련 tests/문서다. `offline-access.ts`와 `storage.ts`는 기본 UUID 공급만 교체했다. 타이머·snapshot/finish payload·ACK·writerEpoch·잠금 구현·DB 버전/스키마·서버 운영 코드·패키지/lockfile은 변경하지 않았다.

시작 때 존재한 T02-A 미커밋 변경은 그대로 포함·보존했다. 서버 저장소의 기존 V22 검토 fixture 3개 변경도 보존했고 이번 수정에서 추가로 서버 코드를 바꾸지 않았다. 양쪽 `main`, PWA HEAD `ad8d664a1a5ef60caea96d5787a12bfe01875988`, 서버 HEAD `523eb00`을 유지한다. stage/commit/push·브랜치 생성은 하지 않았다. 개인 DB는 계속 중지 상태이며 연결하거나 수정하지 않았다.
