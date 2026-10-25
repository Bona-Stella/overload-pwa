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
  <img src="https://img.shields.io/badge/Tailwind_CSS-Planned-06B6D4?style=flat-square&amp;logo=tailwindcss&amp;logoColor=white" alt="Tailwind CSS Planned">
  <img src="https://img.shields.io/badge/PWA-Planned-5A0FC8?style=flat-square&amp;logo=pwa&amp;logoColor=white" alt="PWA Planned">
  <img src="https://img.shields.io/badge/Status-Initial_Setup-6B7280?style=flat-square" alt="Status">
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

> 🚧 현재 React·TypeScript·Vite 초기 프로젝트와 ESLint가 구성되어 있으며 기본 카운터 화면을 표시합니다. 업무 화면·API 연동·인증·PWA는 아직 구현되지 않았습니다. 아래 주요 기능은 개발 목표입니다.

---

## ✨ 주요 기능

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

- [ ] 모바일 홈 화면 설치
- [ ] 앱 아이콘 및 스플래시 화면 구성
- [ ] 독립 실행형(Standalone) 화면 지원
- [ ] Service Worker 기반 정적 리소스 캐싱
- [ ] 오프라인 운동 기록 임시 저장
- [ ] 네트워크 복구 후 서버 데이터 동기화
- [ ] 앱 업데이트 안내

---

## 🛠 기술 스택

React와 TypeScript를 기반으로 모바일 중심의 웹 애플리케이션을 개발합니다.

### Core

| Category | Technology | Version |
|:---|:---|:---|
| Language | TypeScript | 6.0.3 |
| UI Library | React | 19.3.1 |
| Build Tool | Vite | 8.3.5 |
| PWA | vite-plugin-pwa | 도입 예정 |

### UI & Styling (도입 예정)

| Category | Technology | Description |
|:---|:---|:---|
| Styling | Tailwind CSS | 유틸리티 기반 스타일링 |
| UI Components | shadcn/ui | 재사용 가능한 UI 컴포넌트 |
| Icons | Lucide React | UI 아이콘 |
| Charts | Recharts | 운동 기록 및 통계 시각화 |

### State Management & Networking (도입 예정)

| Category | Technology | Description |
|:---|:---|:---|
| Routing | React Router | 페이지 라우팅 |
| Server State | TanStack Query | 서버 데이터 및 캐싱 |
| Client State | Zustand | 클라이언트 상태 관리 |
| HTTP Client | Axios | REST API 통신 |
| Local Database | Dexie.js | IndexedDB 기반 로컬 데이터 관리 |

### Testing & Deployment (도입 예정)

| Category | Technology | Description |
|:---|:---|:---|
| Unit Test | Vitest | 단위 테스트 |
| Component Test | React Testing Library | 컴포넌트 테스트 |
| E2E Test | Playwright | 브라우저 테스트 |
| Hosting | Cloudflare Pages | 정적 웹 애플리케이션 배포 |

> React, TypeScript, Vite 및 ESLint만 현재 구성되어 있습니다. 버전 표는 `package-lock.json` 기준이며, 나머지 도구는 개발 단계에 따라 도입할 예정입니다. 스타일은 현재 일반 CSS를 사용합니다.

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
| Local Storage | 오프라인 데이터 임시 보관 |
| Data Synchronization | 로컬 데이터와 서버 데이터 동기화 |

### iPhone 설치 방법

PWA 배포 완료 후 다음 방법으로 설치할 수 있습니다.

1. iPhone에서 Safari 실행
2. 배포된 Overload 웹사이트 접속
3. 공유 메뉴에서 **홈 화면에 추가** 선택
4. 지원되는 iOS 버전에서는 **웹 앱으로 열기** 활성화
5. 홈 화면에서 Overload 실행

> PWA는 앱스토어 등록 없이 배포할 수 있지만, 일부 브라우저 및 운영체제 기능에는 제약이 있을 수 있습니다.

### 오프라인 기록 관리

운동 중 네트워크 연결이 불안정하더라도 기록을 유지할 수 있도록 로컬 저장 방식을 검토하고 있습니다.

```text
User Input
    │
    ▼
React Application
    │
    ▼
IndexedDB (Local Storage)
    │
    ▼
Network Available?
    │
    ├── No  → Keep Local Data
    │
    └── Yes → Sync with Backend
                  │
                  ▼
            Spring Boot API
                  │
                  ▼
             PostgreSQL
```

서버 데이터는 최종 원본으로 관리하며, 동기화 실패 및 데이터 충돌 상황에 대한 처리 방식을 설계할 예정입니다.

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
| `overload-pwa` | React 프론트엔드 저장소 (npm 패키지명: `overload-app`, PWA 도입 예정) |
| `overload-server` | Spring Boot 기반 REST API 서버 |

---

## 📁 프로젝트 구조

Git 저장소 루트가 npm·Vite 프로젝트 루트입니다. 현재 구조는 다음과 같습니다.

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
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── eslint.config.js
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

기존 하위 `overload-app/dist/`는 이전 빌드 결과 보존용이며 현재 실행 경로가 아닙니다. 기존 `node_modules/`는 저장소 루트로 이동해 재사용합니다. npm 패키지명 `overload-app`은 유지합니다.

### 향후 디렉터리 역할

| Directory | Description |
|:---|:---|
| `app` | 라우터 및 전역 Provider |
| `assets` | 이미지 및 정적 리소스 |
| `components` | 공통 UI 컴포넌트 |
| `features` | 도메인별 화면과 기능 |
| `hooks` | 재사용 가능한 React Hooks |
| `services` | 백엔드 API 통신 |
| `stores` | 클라이언트 상태 관리 |
| `types` | TypeScript 타입 정의 |
| `utils` | 공통 유틸리티 함수 |

> 위 역할 표는 향후 설계안입니다. `features`, `services`, 라우터와 Store 등은 아직 생성하지 않았습니다.

---

## 🔗 Backend API 연동

`overload-app`은 향후 `overload-server`의 REST API와 연동할 예정입니다. 현재 HTTP Client, 개발 프록시, API 요청·응답 타입 및 호출 코드는 없습니다.

### API Base URL

```text
/api/v1
```

### 주요 API

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/v1/exercises` | 운동 종목 조회 |
| POST | `/api/v1/workouts` | 운동 세션 생성 |
| GET | `/api/v1/workouts` | 운동 이력 조회 |
| GET | `/api/v1/workouts/{id}` | 운동 상세 기록 조회 |
| POST | `/api/v1/workouts/{id}/sets` | 운동 세트 추가 |
| GET | `/api/v1/routines` | 운동 루틴 조회 |
| POST | `/api/v1/routines` | 운동 루틴 생성 |
| GET | `/api/v1/statistics/volume` | 운동 볼륨 통계 |

> API 경로는 초기 설계 예시입니다. 실제 API 명세는 백엔드 구현에 맞춰 변경될 수 있습니다.

### 환경변수 구성 예시

API Client 도입 이후 사용할 환경변수 예시입니다. 현재 코드는 이 환경변수를 읽지 않으며, 환경 파일도 포함하지 않습니다.

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

환경변수를 기반으로 개발 환경과 운영 환경의 API 주소를 분리할 예정입니다.

> `VITE_` 접두사가 붙은 환경변수는 브라우저에 노출될 수 있으므로 비밀번호, API 비밀키 등의 민감 정보는 저장하지 않습니다.

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

기본 개발 서버 주소:

```text
http://127.0.0.1:3000
```

개발 서버는 `127.0.0.1`에만 바인딩하며 `strictPort: true`이므로 3000번 포트가 사용 중이면 실행에 실패합니다. 현재 설정으로는 다른 기기의 iPhone에서 직접 접속할 수 없습니다.

### Production Build

```bash
npm run build
```

빌드 결과물은 기본적으로 `dist/` 디렉터리에 생성됩니다.

### 정적 검사

```bash
npm run lint
```

빌드 명령에는 TypeScript 검사(`tsc -b`)가 포함됩니다. 별도의 `test`, `typecheck` 스크립트와 단위·컴포넌트·E2E 테스트는 아직 없습니다.

### Preview Build

```bash
npm run preview
```

실제 PWA 설치 동작과 오프라인 기능은 배포 환경 또는 HTTPS 테스트 환경에서 검증할 예정입니다.

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

### Phase 1. 프로젝트 기반 구축

- [x] React + TypeScript + Vite 프로젝트 생성
- [ ] Tailwind CSS 설정
- [ ] 기본 레이아웃 및 테마 구성
- [ ] React Router 설정
- [ ] 공통 컴포넌트 구성
- [ ] Spring Boot API 통신 환경 구성

### Phase 2. 운동 기록 MVP

- [ ] 홈 화면 구현
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

- [ ] Web App Manifest 설정
- [ ] Service Worker 적용
- [ ] PWA 아이콘 및 실행 화면 구성
- [ ] 오프라인 데이터 저장
- [ ] 서버 동기화 로직 구현
- [ ] iPhone Safari 사용성 테스트
- [ ] Cloudflare Pages 배포

### Phase 6. 안정화 및 개선

- [ ] 단위 및 컴포넌트 테스트
- [ ] 모바일 UI/UX 개선
- [ ] 접근성 개선
- [ ] 성능 최적화
- [ ] 오류 처리 및 사용자 피드백 개선

---

## 📚 참고 문서

- [React 공식 문서](https://react.dev/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [Vite 공식 문서](https://vite.dev/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)
- [Vite PWA 공식 문서](https://vite-pwa-org.netlify.app/)
- [TanStack Query 공식 문서](https://tanstack.com/query/latest)
- [Zustand 공식 문서](https://zustand.docs.pmnd.rs/)
- [React Router 공식 문서](https://reactrouter.com/)
- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)

---

<div align="center">
  <strong>Overload — Track your lifts. Own your progress. 💪</strong>
</div>
