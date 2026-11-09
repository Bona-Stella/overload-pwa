<div align="center">
  <h1>🏋️ overload-app</h1>

  <h3>꾸준한 운동을 데이터로, 성장의 과정을 기록으로.</h3>

  <p>
    웨이트 트레이닝 기록 및 관리를 위한<br>
    <strong>Overload</strong> 앱의 프론트엔드 프로젝트
  </p>

  <p>
    운동 기록부터 루틴 관리, 성장 분석까지<br>
    언제 어디서나 편리하게 사용할 수 있는 서비스를 목표로 합니다.
  </p>

  <img src="https://img.shields.io/badge/React-19.3.1-61DAFB?style=flat-square&amp;logo=react&amp;logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-6.0.3-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8.3.5-646CFF?style=flat-square&amp;logo=vite&amp;logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/PWA-App_Shell-5A0FC8?style=flat-square&amp;logo=pwa&amp;logoColor=white" alt="PWA App Shell">
  <img src="https://img.shields.io/badge/Status-UI_v0.9_Foundation-6B7280?style=flat-square" alt="Status">
</div>

---

## 📌 프로젝트 소개

**Overload**는 웨이트 트레이닝을 하는 사용자가 자신의 운동을 기록하고, 루틴을 관리하며, 운동 데이터를 통해 **점진적 과부하(Progressive Overload)**를 확인할 수 있도록 돕는 앱입니다.

`overload-app`은 사용자가 운동 정보를 직관적으로 입력하고 기록의 변화를 쉽게 확인할 수 있도록 하는 프론트엔드 프로젝트입니다.

React와 TypeScript를 기반으로 개발하며, **PWA(Progressive Web App)** 기술을 적용하여 별도의 앱스토어 설치 없이 모바일 기기에서 앱처럼 사용할 수 있도록 설계합니다.

### 🎯 프로젝트 목표

- 빠르고 간편한 웨이트 트레이닝 기록
- 사용자별 운동 루틴 관리
- 운동 데이터 기반 성장 추적
- 모바일 환경에 최적화된 UI/UX
- iPhone 및 Android 홈 화면 설치 지원
- 네트워크가 불안정한 환경에서도 운동 기록 유지

> Task 009 5E에서 설치형 Manifest와 정적 오프라인 앱 셸을 연결했습니다. 현재 지원 범위와 검증 결과는 [오프라인 기록 관리](#오프라인-기록-관리)를 참고하세요. 단계별 기록은 [5A](docs/tasks/task-009-frontend-5a-report.md), [5B](docs/tasks/task-009-frontend-5b-report.md), [5C](docs/tasks/task-009-frontend-5c-report.md), [5D](docs/tasks/task-009-frontend-5d-report.md), [5E 구현·검증 보고서](docs/tasks/task-009-frontend-5e-report.md), [인증 연동 및 로컬 실행](docs/engineering/authentication.md)에 있습니다.

### PWA 빌드·배포

아래 단계별 DB 적용 표기는 당시 검증 기록입니다. 개인 개발 DB의 마지막 확인 기록은V17 적용/V18~V22 미적용이며6A에서는 접속·재확인하지 않았습니다. 현재 앱·테스트 구현과 실제 DB 적용·브라우저·실기기 검증을 구분합니다.

[통계·추적 2E](../overload-server/docs/tasks/statistics-tracking-phase-2e-report.md)에서 맨몸 운동의 명시적 추가 중량 기록·정정·오프라인 보존과 실제 반복 기반 총중량 계산을 연결했습니다. 기존 숫자 중량이나 체중을 추가 부하로 해석하지 않고, 근거가 없으면 세트·반복만 표시합니다. 승인 평가와 근육 다중 매핑/대분류 중복 제거를 유지합니다. [실제 DB/API 계약](../overload-server/docs/api/bodyweight-additional-load.md)을 따르며 개인 DB V18~V22는 미적용입니다. 운영 분류·디로딩3단계·실기기 검증은 남아 있습니다.

[통계·추적 2D](../overload-server/docs/tasks/statistics-tracking-phase-2d-report.md)에서 실제 유산소 속도·활동 시간, 직접 입력 우선/계산 거리와 출처, 정정·오프라인 기록 및 종류별 누적 거리를 연결했습니다. 목표 속도로 실제값을 만들지 않으며 기존 기록·고정 요청을 보존합니다. V21과 개인 DB V18~V20은 미적용입니다. 실제 계약은 [유산소 측정](../overload-server/docs/api/cardio-actual-measurements.md)을 따르며 디로딩 구분·혼재 연결은3단계입니다.

[통계·추적 2C](../overload-server/docs/tasks/statistics-tracking-phase-2c-report.md)에서 기존 승인 사건의 기간별(1/3/6개월·전체) 검색·루틴 배치 선택·승인 중량 변화 그래프를 연결했습니다. 다른 배치를 하나의 성장선으로 합치지 않으며 기록 없는 기간의 값을 만들지 않습니다. 실제 API·보존/디로딩 한계는 [조회 계약](../overload-server/docs/api/approved-weight-growth.md)을 따릅니다. 개인 DB V18~V20 적용·운영 카탈로그 검증·디로딩3단계 연결은 이번 완료 범위가 아닙니다.

[다중 주간 프리셋 API](../overload-server/docs/api/weekly-schedule.md)는 Backend에 구현됐습니다. 과거 계획·최초 START·최초 MISS는 서버 내부 이력과 overview에 보존합니다. 현재 PWA의 단일 일정 경로를 교체하는 범위는 [T02 실제 API 전환](docs/engineering/backend-ui-v0.9.md#t02-b-현재-api-소비)에서 확인합니다.

[통계·추적 2A](../overload-server/docs/tasks/statistics-tracking-phase-2a-report.md)에서 실제 계정의 이번 주 요약 → 주/월 운동 현황·근육별 상세·최근3건/기존 이력 연결을 추가했습니다. 서버가 확인한 종료 기록을 사용하며 미전송 로컬 실적은 포함하지 않습니다. 2A 당시 미완료였던 주간 전체 계획/달성률은 위 2B에서 구현했습니다. 성장선은2C에서 구현했고 유산소 계산 거리 저장은2D에서 구현했고 디로딩 연결은 후속입니다. 개인 DB V18 미적용·운영 카탈로그 분류 검토 미완료 상태를 유지합니다.

현재 계정 화면은 Backend V17의 표준 운동명·별칭 검색과 선택형 제조사/부하를 사용합니다. 완료 세트에는 완료 당시 장비를 보존합니다. 계획·평가·로컬 운동 문서는 schema2, IndexedDB는 DB3입니다. 이전 DB1/2의 출시 전 테스트 데이터는 이번 전환에서 한 번만 정리하며, 이미 DB3인 기록은 앱 업데이트마다 초기화하지 않습니다. [Frontend 3단계](docs/tasks/standard-exercise-catalog-frontend-phase-3-report.md) 이후 [4단계 실제 개발 DB V17 적용·앱 검증](../overload-server/docs/tasks/standard-exercise-catalog-dev-phase-4-report.md)도 완료했습니다. 이 과정에서 접근 허용의 nonce 갱신 경쟁·강제 종료 내구성을 보강했고 로그아웃·계정/세대 차단은 유지합니다.

`npm run build`가 `dist/manifest.webmanifest`, 아이콘, 빌드 파일 목록·SHA-256을 포함한 `dist/sw.js`를 생성합니다. 개발 서버에는 Service Worker를 등록하지 않습니다. 루트 경로(`/`)의 HTTPS 정적 배포가 필요합니다(검증용 loopback HTTP는 브라우저가 secure context로 취급). `/`와 `/account`만 앱 진입 HTML로 연결하고 `/api`·OAuth/인증 복귀 경로는 실제 Backend/인증 라우팅을 유지하세요. `/sw.js`는 JavaScript MIME·재검증 가능한 캐시 정책으로 제공해야 합니다. 해시가 있는 자산과 index를 같은 릴리스로 배포하고, 열려 있는 이전 앱을 위해 이전 자산도 유지하세요. 사용자별 HTML 주입이나 파일 변환으로 원래 빌드 바이트가 바뀌면 오프라인 준비가 실패하도록 설계했습니다.

새 버전은 기존 창을 강제로 새로고침하지 않습니다. 입력의 기기 저장을 확인하고 모든 Overload 창을 닫았다가 다시 열어 적용합니다. API·인증 응답은 Service Worker 캐시에 저장하지 않습니다.

---

## ✨ 주요 기능

아래 체크리스트는 초기 로드맵입니다. 기능별 구현과 후속 작업은 [프론트엔드 현황](docs/engineering/frontend.md#87-v09-적용-범위와-구현-상태)에서 확인합니다. 기존 검토 환경의 보존 및 재개는 [AGENTS.md 3절](AGENTS.md#3-required-engineering-documents)을 따릅니다.

### 🏠 홈 대시보드

- [ ] 사용자별 운동 현황 표시
- [ ] 최근 운동 기록 조회
- [ ] 주간 운동 횟수 표시
- [ ] 빠른 운동 시작 기능
- [ ] 운동 루틴 바로가기

### 🏋️ 운동 기록 관리

- [ ] 운동 세션 생성 및 종료
- [ ] 운동 종목 검색 및 선택
- [ ] 세트별 중량(kg) 입력
- [ ] 세트별 반복 횟수(Reps) 입력
- [ ] 세트 추가 및 삭제
- [ ] 이전 운동 기록 참고
- [ ] 운동 시간 및 메모 기록
- [ ] 운동 완료 후 결과 확인

### 📋 운동 루틴 관리

- [ ] 사용자별 운동 루틴 생성
- [ ] 루틴에 운동 종목 추가
- [ ] 운동 순서 및 목표 세트 설정
- [ ] 저장된 루틴 조회 및 수정
- [ ] 루틴을 활용한 운동 시작

### 📅 운동 이력 관리

- [ ] 캘린더 기반 운동 기록 조회
- [ ] 날짜별 운동 내역 확인
- [ ] 운동 종목별 기록 검색
- [ ] 이전 운동 기록 상세 조회
- [ ] 운동 이력 수정 및 삭제

### 📊 운동 통계 및 성장 분석

- [ ] 주간 및 월간 운동 빈도 조회
- [ ] 운동 종목별 중량 변화 그래프
- [ ] 운동 볼륨(Volume) 분석
- [ ] 개인 최고 기록(PR) 표시
- [ ] 기간별 운동 데이터 비교
- [ ] 점진적 과부하 추적

### 📱 PWA 지원

- [x] 앱 아이콘과 독립 실행형(Standalone) Manifest 설정
- [x] Service Worker 기반 정적 앱 셸 캐싱
- [x] 진행 중 운동의 오프라인 저장·복원
- [x] 네트워크 복구 후 서버 동기화
- [x] 새 버전 대기 상태 안내
- [ ] 실제 모바일 홈 화면 설치·실행 및 Service Worker 버전 교체 검증

---

## 🛠 기술 스택

React와 TypeScript를 기반으로 모바일 중심의 웹 애플리케이션을 개발합니다.

### Core

| Category | Technology | Version |
|:---|:---|:---|
| Language | TypeScript | 6.0.3 |
| UI Library | React | 19.3.1 |
| Build Tool | Vite | 8.3.5 |
| PWA | Web App Manifest + Service Worker | Vite 빌드에서 생성 |

### UI & Styling (UI v0.9 적용 기준)

| Category | Technology | Description |
|:---|:---|:---|
| Styling | CSS Custom Properties + CSS Modules | 일반·디로딩 공통 테마 토큰 |
| UI Components | 자체 컴포넌트 | 기존 컴포넌트 우선 |
| Icons | [추출 원본 PNG 6종](docs/product/assets/exercise-icons/README.md) | 32 CSS px 공통 표시·번들 포함, 검색 분류 매핑은 후속 |
| Charts | Recharts | 채택 완료, 실제 통계 UI 구현 단계에서 설치 |

적용 범위와 현재 구현의 구분은 [프론트엔드 개발 규칙](docs/engineering/frontend.md#8-ui-및-스타일링-규칙)을 따릅니다.

### State Management & Networking (현재 구현 / 검토 도구)

| Category | Technology | Description |
|:---|:---|:---|
| Routing | React 화면 상태 | React Router 미도입, 채택 검토 |
| Server State | 기능별 controller | TanStack Query 미도입, 채택 검토 |
| Client State | React 상태·useSyncExternalStore | Zustand 미도입, 채택 검토 |
| HTTP Client | fetch | 쿠키·CSRF·취소·계정 경계 적용. Axios 미도입 |
| Local Database | native IndexedDB | 진행 운동 DB3/schema2. Dexie.js 미도입 |

### Testing & Deployment (현재 구현 / 검토 도구)

| Category | Technology | Description |
|:---|:---|:---|
| Unit Test | Node.js 내장 test | Vitest 미도입 |
| Component Test | TypeScript 변환 + React SSR | React Testing Library 미도입 |
| Browser Test | 격리 Chrome/CDP 검증 | Playwright 미도입, 실제 iPhone 검증은 별도 |
| Hosting | Cloudflare Pages | 배포 예정 |

> 현재 React, TypeScript, Vite, ESLint와 Node.js 내장 테스트 러너를 사용하며, 계정 셸·공통 표현은 CSS Custom Properties + CSS Modules, 기존 기능 패널은 일반 CSS를 함께 사용합니다. 버전 표는 `package-lock.json` 기준입니다. 미도입 라이브러리는 현재 필수 도구가 아니며 채택 여부를 별도로 검토합니다. 실제 구성은 `package.json`과 [프론트엔드 개발 규칙](docs/engineering/frontend.md)을 확인합니다. 운동 쓰기·진행 세션·복구의 현행 기준은 [Task 009 v1.0](../overload-server/docs/tasks/task-009-redesign-v1.0.md)입니다. 온라인 관리·START, IndexedDB·snapshot 동기화, FINISH·사후 정정/선택 복구까지 연결했습니다. 범용 Outbox와 Dexie.js는 도입하지 않았습니다.

---

## 📱 PWA 설계

Overload는 **모바일 퍼스트(Mobile First)** 방식을 기반으로 설계합니다.

특히 iPhone에서 자주 사용하는 환경을 고려하여 터치 인터페이스, 화면 전환, 빠른 데이터 입력에 집중합니다.

### PWA 핵심 구성

| Feature | Description |
|:---|:---|
| Web App Manifest | 앱 이름, 아이콘, 실행 방식 설정 |
| Service Worker | 정적 리소스 캐싱 및 오프라인 지원 |
| Standalone Mode | 브라우저 UI 없이 앱처럼 실행 |
| Responsive UI | 모바일, 태블릿, PC 화면 대응 |
| IndexedDB | 진행 운동과 고정 요청을 사용자·세대별로 보관 |
| Data Synchronization | 로컬 데이터와 서버 데이터 동기화 |

### iPhone 설치 방법

배포 후 홈 화면 설치를 검증할 때 사용하는 절차입니다.

1. iPhone에서 Safari 실행
2. 배포된 Overload 웹사이트 접속
3. 공유 메뉴에서 **홈 화면에 추가** 선택
4. 지원되는 iOS 버전에서는 **웹 앱으로 열기** 활성화
5. 홈 화면에서 Overload 실행

> PWA는 앱스토어 등록 없이 배포할 수 있지만, 일부 브라우저 및 운영체제 기능에는 제약이 있을 수 있습니다.

### 오프라인 기록 관리

실제 계정의 운동은 `overload.workout.v1` IndexedDB 버전 3에 로컬 운동 문서 schema 2로 저장합니다. 사용자·세대별로 데이터를 격리하며, 명시적 로그아웃 후에는 같은 계정으로 재인증하기 전까지 해당 로컬 운동을 표시하지 않습니다. 개발 전용 `/demo` 기록은 별도의 `localStorage`에 저장하며 실제 계정으로 이전하거나 전송하지 않습니다.

최초 접속과 앱 셸 준비는 온라인에서 이루어집니다. 새 운동 START, 종료 후 기록 정정·복구, 종목/루틴/설정 관리와 로그아웃도 온라인 기능입니다. 오프라인에서는 이미 시작한 운동의 수행·입력 초안·타이머·종료 의도를 보존하고, 사용자가 명시적으로 이어갈 수 있습니다. 진행 운동의 확정 변경은 전체 스냅샷으로 동기화하며 초안과 타이머 tick은 전송하지 않습니다.
한 사용자당 진행 운동 하나, 명시적 편집 권한 이전, epoch/revision 검사를 적용하며 자동 병합은 하지 않습니다.
24시간 서버 미갱신 시 마지막 서버 완료 기록을 자동 종료·보존합니다.
오프라인 종료 선택의 원래 시각과 최종 상태를 보존하고, 재연결 시 선행 요청을 확인한 뒤 FINISH를 처리합니다. AUTO_CLOSED·다른 편집권·삭제가 확인되면 자동 전송을 중단합니다. 종료 후 복구는 원래 사본에서 사용자가 선택한 완료 수행만 보냅니다. 최초 평가와 현재 평가는 구분합니다.

6B의 실제 데스크톱 Chrome 검증에서 Service Worker의 정적 앱 셸 캐시, 오프라인 앱 셸 복구, 브라우저 재시작 후 수행·초안 등 로컬 운동 복원, 재연결 후 Backend 동기화와 계정 격리를 확인했습니다. 서버 커밋 후 snapshot·FINISH ACK가 유실돼도 동일한 고정 요청을 재전송하며, 서버는 중복 기록 없이 처리합니다. 서버 반영은 유효한 ACK 또는 계약이 허용하는 서버 확인 결과를 로컬에 저장한 뒤 표시합니다.

---

## 🖥 주요 화면 구성

### 1. Home

운동 현황을 한눈에 확인하는 메인 화면입니다.

- 오늘의 운동
- 최근 운동 내역
- 주간 운동 횟수
- 운동 시작 버튼

### 2. Workout

실제 운동 중 사용하는 기록 화면입니다.

- 운동 종목 선택
- 중량 및 반복 횟수 입력
- 세트 추가 및 완료 처리
- 운동 세션 종료

### 3. Routine

사용자가 반복적으로 수행하는 운동 루틴을 관리합니다.

- 루틴 생성 및 수정
- 운동 종목 및 순서 관리
- 루틴 기반 운동 시작

### 4. History

이전에 수행한 운동 기록을 조회합니다.

- 캘린더 기반 운동 이력
- 날짜별 운동 상세 기록
- 이전 운동 데이터 비교

### 5. Statistics

운동 기록의 변화를 그래프로 시각화합니다.

- 운동 중량 변화
- 총 운동 볼륨
- 운동 빈도
- 개인 최고 기록

### 6. My Page

사용자 정보 및 앱 설정을 관리합니다.

- 사용자 프로필
- 계정 정보 관리
- 앱 환경 설정

---

## 🧩 시스템 아키텍처

프론트엔드와 백엔드를 분리하여 REST API 기반으로 통신합니다.

```text
                   Client
                     │
                     ▼
            ┌─────────────────┐
            │   overload-app  │
            │                 │
            │ React + Vite    │
            │ TypeScript      │
            │ PWA             │
            └────────┬────────┘
                     │
                     │ HTTPS / REST API
                     │ JSON
                     ▼
            ┌─────────────────┐
            │ overload-server │
            │                 │
            │ Java 25         │
            │ Spring Boot     │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │   PostgreSQL    │
            │                 │
            │ Users           │
            │ Workouts        │
            │ Routines        │
            └─────────────────┘
```

### Repository

| Repository | Description |
|:---|:---|
| `overload-pwa` | React PWA 프론트엔드 저장소 (npm 패키지명: `overload-app`) |
| `overload-server` | Spring Boot 기반 REST API 서버 |

---

## 📁 프로젝트 구조

Git 저장소 루트가 npm·Vite 프로젝트 루트입니다. 주요 구조는 다음과 같습니다.

```text
overload-pwa/
├── AGENTS.md
├── docs/
│   ├── engineering/frontend.md
│   └── reference/bootstrap/
│       ├── frontend.gitignore.txt
│       └── vite-template.md
├── public/
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── app/                     # 계정 4탭 셸, 테마·개발 검증 화면
│   ├── assets/
│   ├── components/              # 기존 입력·Dialog, 공통 UI·운동 아이콘
│   ├── features/auth/           # 실제 인증·계정 관리
│   ├── features/auth-preview/   # 개발 전용 인증 Mock
│   ├── features/health/          # 기존 API 및 진단 패널
│   ├── features/routine/        # 데모 루틴 편집
│   ├── features/workout/        # 개발 데모 운동
│   ├── features/history/        # 데모 완료 기록 상세
│   ├── features/workout-online/ # 계정 API·루틴·기록·IndexedDB
│   ├── features/workout-local/  # 진행 운동 입력·타이머·동기화
│   ├── features/statistics/     # 실제 통계·성장·일정
│   ├── pwa/                    # 정적 앱 셸·설치·업데이트
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── eslint.config.js
├── tests/                      # 도메인·인증·SSR·브라우저 검증
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── .gitignore
└── README.md
```

실행·빌드는 저장소 루트에서 수행하며 npm 패키지명 `overload-app`은 유지합니다.

### 향후 디렉터리 역할

| Directory | Description |
|:---|:---|
| `app` | 현재 계정 셸·테마·개발 검증 화면. React Router 미도입 |
| `assets` | 이미지 및 정적 리소스 |
| `components` | 공통 UI 컴포넌트 |
| `features` | 도메인별 화면과 기능 |
| `hooks` | 재사용 가능한 React Hooks |
| `services` | 백엔드 API 통신 |
| `stores` | 클라이언트 상태 관리 |
| `types` | TypeScript 타입 정의 |
| `utils` | 공통 유틸리티 함수 |

> 역할 표의 미생성 디렉터리는 향후 참고안이며, 사용하지 않는 계층을 미리 추가하지 않습니다. 실제 계정 API·상태·저장은 기능별 모듈에 있고, `routine`, `workout`, `history`는 개발 데모와 구분합니다. T01에서 새 프레임워크를 설치하지 않았습니다.

---

## 🔗 Backend API 연동

개발 전용 `/demo`의 설정 → 서버 연결 진단은 `fetch`로 기존 `overload-server`의 `GET /api/v1/health`를 호출합니다. HTTP 200과 JSON의 `status: "UP"`를 확인한 경우에만 연결 성공으로 표시합니다. HTTP 오류, 네트워크 오류, 잘못된 응답 및 5초 시간 초과는 연결 실패로 표시하며, **다시 확인** 버튼으로 재시도할 수 있습니다. 확인 중에는 버튼을 비활성화하고, 화면이 해제되면 진행 중인 요청을 취소합니다. 응답은 캐시하지 않습니다.

이 검사는 애플리케이션의 HTTP 응답 여부만 확인하며 데이터베이스와 외부 서비스 상태를 보장하지 않습니다.

### API Base URL

```text
/api/v1
```

[UI v0.9 화면 명세](docs/product/ui-ux.md)와 [디로딩 v1.7](docs/product/Overload_Deloading_Design_Specification_v1.7.md)은 후속 적용 기준입니다. 현재 계약과 신규 연동 범위는 [백엔드 연동 설계](docs/engineering/backend-ui-v0.9.md)에 정리했습니다.

### 현재 주요 API

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/v1/standard-exercises/search-data`, `/api/v1/manufacturers` | 표준 운동·제조사 조회 |
| GET / PATCH | `/api/v1/workout-settings` | 현재 사용자 휴식 설정 |
| POST | `/api/v1/workout-sessions` | 운동 시작 |
| GET | `/api/v1/workout-sessions/active`, `/api/v1/workout-sessions/closed`, `/api/v1/workout-sessions/{id}` | 진행·종료 목록·상세 |
| GET | `/api/v1/routines` | 운동 루틴 조회 |
| POST | `/api/v1/routines` | 운동 루틴 생성 |
| GET | `/api/v1/statistics/overview` | 기간별 통계·계획 근거 |
| GET | `/api/v1/statistics/growth/exercises` | 성장 종목 검색 |
| GET | `/api/v1/statistics/growth/exercises/{standardId}` | 루틴 배치 선택 |
| GET | `/api/v1/statistics/growth/exercises/{standardId}/placements/{placementId}` | 승인 중량 이력 |

요청·응답·query·인증·CSRF 조건은 Backend의 [통계·화면 계약](../overload-server/docs/api/statistics.md), [성장 조회](../overload-server/docs/api/approved-weight-growth.md), [주간 일정](../overload-server/docs/api/weekly-schedule.md), [세션](../overload-server/docs/api/workout-sessions.md), [휴식 설정](../overload-server/docs/api/workout-online-write.md)을 따릅니다. 개인 운동 GET과 이전 `/api/v1/statistics`는 제거됐으며 개인 운동 POST/PATCH는 차단 경계만 유지합니다. `/workouts`와 통계 volume 경로는 초기 예시이고 현재 호출하지 않습니다.

통계는 기존 온라인 인증 transport를 사용합니다. 현재 PWA의 일정 transport·응답 검증·홈·루틴은 T02-B 단일 일정 계약을 사용합니다. 최신 Backend는 쿼리 없는 프리셋 GET과 프리셋별 쓰기를 제공하므로 현재 일정 호출과 호환되지 않습니다. [T02 실제 API 전환](docs/engineering/backend-ui-v0.9.md#t02-b-현재-api-소비)에서 연결하고, 실제 개발 DB V30 적용과 통합 환경 검증은 별도로 진행합니다.

### 개발 환경 Proxy

브라우저는 Vite와 같은 Origin의 상대 경로 `/api/v1/health`로 요청합니다. `vite.config.ts`의 개발 프록시가 `/api` 경로를 그대로 `http://127.0.0.1:8080`의 Spring Boot에 전달합니다. 개발 연동을 위해 백엔드 CORS 설정을 추가하지 않습니다.

```text
React → http://127.0.0.1:3000/api/v1/health
      → Vite Proxy → http://127.0.0.1:8080/api/v1/health
```

이 프록시는 Vite 개발 서버에만 적용됩니다. `/oauth2/authorization/google`도 같은 백엔드로 전달합니다. 기본 대상은 `http://127.0.0.1:8080`이며 `OVERLOAD_DEV_API_TARGET`으로 loopback 테스트 서버를 지정할 수 있습니다. 운영은 동일 호스트의 HTTPS 역방향 프록시가 필요하며 배포는 하지 않았습니다. Google 복귀 및 쿠키 설정은 [인증 연동 문서](docs/engineering/authentication.md)를 따릅니다.

### 로컬 통합 확인 (Windows)

화면 검토와 사용자 승인까지는 [Frontend 기본 UI 개발 절차](docs/engineering/frontend.md#181-기본-ui-개발-절차)를 따릅니다. 실제 API 연결은 [테스트 환경 안내](../overload-server/docs/engineering/test-environment.md)에서 승인된 Backend와 Flyway 이력, 전용 테스트 계정, 프록시 대상과 안전 종료를 확인한 뒤 진행합니다.

이미 확인된 테스트 프록시의 기본 포트를 사용하는 경우 `curl.exe -i http://127.0.0.1:3000/api/v1/health`로 HTTP 200과 `{"status":"UP"}`를 확인할 수 있습니다. 실제 계정 검증은 분리된 테스트 브라우저의 `/`에서 진행합니다.

---

## 🚀 로컬 실행

> 아래 명령어는 `package.json`이 있는 Git 저장소 루트에서 실행합니다.

### Requirements

- Node.js 24 LTS 권장 (로컬 확인 버전: 24.13.0)
- npm
- Git

### Clone Repository

```bash
git clone https://github.com/Bona-Stella/overload-pwa.git

cd overload-pwa
```

저장소 이름은 `overload-pwa`, npm 패키지 이름은 `overload-app`입니다.

### Install Dependencies

```bash
npm ci
```

위 설치 명령은 새로 Clone한 환경을 위한 것입니다. 구조 이동 시에는 기존 `node_modules/`를 재사용하며 재설치하지 않습니다.

### Run Development Server

```bash
npm run dev
```

인증 연동용 개발 서버 주소 (Google 콜백과 같은 localhost 호스트 사용):

```text
http://localhost:3000
```

개발 서버는 `host: true`로 LAN 접속을 허용하며, 같은 네트워크의 iPhone에서는 `http://<PC의 LAN IP>:3000`으로 접속합니다. 네트워크·방화벽에서 해당 접속을 허용해야 합니다. `port: 3000`, `strictPort: true`이므로 3000번 포트가 사용 중이면 실행에 실패합니다. iPhone에서도 API 요청은 같은 Origin의 `/api`를 사용하며, 기존 Vite 프록시가 PC의 `http://127.0.0.1:8080`으로 전달합니다.

### Production Build

Google 인증은 위 localhost 주소와 [고정 PWA 복귀 설정](docs/engineering/authentication.md)을 사용합니다.
LAN/iPhone 안내는 개발 데모 `/demo` 확인용이며 실제 Google·HTTPS 검증을 완료했다는 의미가 아닙니다.

```bash
npm run build
```

빌드 결과물은 기본적으로 `dist/` 디렉터리에 생성됩니다.

### 정적 검사

```bash
npm run lint
node node_modules/typescript/bin/tsc -b
npm test
```

빌드 명령에도 strict TypeScript 검사(`tsc -b`)가 포함됩니다. `npm test`는 Node.js 24 내장 테스트 러너로 `tests/*.test.mjs`를 실행하며, 테스트 개수와 성공 여부는 해당 실행 결과로 확인합니다. 렌더링 테스트는 기존 TypeScript 컴파일러와 `react-dom/server`를 사용합니다. DOM 클릭·키보드 상호작용이나 브라우저 E2E 검증을 대체하지 않습니다. 별도 `typecheck` 스크립트와 E2E 도구는 도입하지 않았습니다.

### Preview Build

```bash
npm run preview
```

실제 PWA 설치·홈 화면 실행, Service Worker 버전 교체, iPhone Safari·Android Chrome 실기기, Firefox는 아직 검증하지 않았습니다. IndexedDB 1/2 → 3의 실제 브라우저 업그레이드와 운영 환경의 장기 데이터 보존 검증도 남아 있습니다.

---

## ☁️ 배포 계획

프론트엔드는 정적 웹 호스팅을 활용하여 배포할 예정입니다.

### Deployment

| Category | Technology |
|:---|:---|
| Source Control | GitHub |
| Frontend Hosting | Cloudflare Pages (예정) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Protocol | HTTPS |

### 배포 흐름

```text
Local Development
        │
        ▼
    GitHub Push
        │
        ▼
 Cloudflare Pages
        │
        ▼
    Vite Build
        │
        ▼
    Static Hosting
        │
        ▼
  iPhone / Android
        │
        ▼
  Add to Home Screen
```

프론트엔드는 정적 호스팅으로 운영하며, 백엔드 서버와 데이터베이스는 별도로 배포할 예정입니다.

---

## 🗺 개발 로드맵

초기 단계 구분을 보존한 로드맵입니다. 현재 기능별 구현 상태는 위 현황 문서와 T01 보고서를 따르며, 미체크를 현재 기능 부재로 해석하지 않습니다.

### Phase 1. 프로젝트 기반 구축

- [x] React + TypeScript + Vite 프로젝트 생성
- [x] 계정 4탭 기본 레이아웃 및 Onyx 테마 구성 (T01)
- [ ] React Router 채택 검토 (현재 상태 기반 전환)
- [x] 공통 컴포넌트 기반 구성 (T01)
- [x] Spring Boot API 통신 환경 구성

### Phase 2. 운동 기록 MVP

- [x] 일반 모드 홈 화면 및 실제 API 연동 (T02-A, 디로딩 제외)
- [ ] 운동 종목 조회 화면
- [ ] 운동 세션 생성
- [ ] 중량 및 반복 횟수 입력 UI
- [ ] 세트 추가 및 삭제
- [ ] 운동 기록 저장
- [ ] 운동 이력 조회

### Phase 3. 사용자 및 루틴 관리

- [ ] 로그인 및 회원가입 화면
- [ ] 인증 상태 관리
- [ ] 운동 루틴 생성 및 수정
- [ ] 저장된 루틴으로 운동 시작
- [ ] 사용자 프로필 화면

### Phase 4. 운동 통계 및 분석

- [ ] 캘린더 기반 운동 이력
- [ ] 운동 볼륨 그래프
- [ ] 종목별 중량 변화
- [ ] 개인 최고 기록 시각화
- [ ] 기간별 운동 데이터 비교

### Phase 5. PWA 및 배포

- [x] Web App Manifest 및 PWA 아이콘 구성
- [x] Service Worker 정적 앱 셸 적용
- [x] 진행 중 운동의 오프라인 저장 및 서버 동기화
- [ ] iPhone Safari 사용성 테스트
- [ ] Cloudflare Pages 배포

### Phase 6. 안정화 및 개선

**디로딩(Deloading)은 V1 출시 필수 기능입니다.** 현재 제품에 연결되지 않았으며, Backend·Frontend 구현과 통합 검증을 모두 완료한 뒤 V1을 출시합니다. 그때까지 출시 준비는 미완료입니다.

- [ ] 단위 및 컴포넌트 테스트
- [ ] 모바일 UI/UX 개선
- [ ] 접근성 개선
- [ ] 성능 최적화
- [ ] 오류 처리 및 사용자 피드백 개선

---

## 📚 참고 문서

개발은 [AGENTS.md 3절](AGENTS.md#3-required-engineering-documents)에서 작업별 현행 계약을 찾고 [Frontend 개발 규칙](docs/engineering/frontend.md)을 적용합니다.

- 화면·조작은 [UI/UX 적용 지점](docs/product/ui-ux.md), 실제 색상·토큰은 [Visual Theme Spec](docs/product/Overload_UI_Visual_Theme_Spec_v0.9.md), 배치·클릭 검토는 [현재 HTML](docs/product/Overload_UI_Baseline_Wireframe_v0.9.html)을 참조합니다.
- 현행 구현은 [Frontend 8.7절](docs/engineering/frontend.md#87-v09-적용-범위와-구현-상태)을 확인합니다. 다중 프리셋과 G6는 PWA 미연동이며, 휴식 타이머 알림은 [결정 10.17절](docs/product/Overload_UI_Decision_Log_v0.9.md#1017--휴식-타이머-시각효과음-알림)에 확정되어 T03.5에서 구현합니다.
- 변경 이유나 당시 검증이 필요하면 [문서 감사 기록](docs/tasks/documentation-audit-2026-11-09.md)에서 이전 버전·핸드오프·보고서를 찾습니다.

- [React 공식 문서](https://react.dev/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [Vite 공식 문서](https://vite.dev/)
- [Vite PWA 공식 문서](https://vite-pwa-org.netlify.app/)
- [TanStack Query 공식 문서](https://tanstack.com/query/latest)
- [Zustand 공식 문서](https://zustand.docs.pmnd.rs/)
- [React Router 공식 문서](https://reactrouter.com/)
- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)

---

<div align="center">
  <strong>Overload — Track your lifts. Own your progress. 💪</strong>
</div>
