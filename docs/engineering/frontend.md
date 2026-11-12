# Overload Frontend Engineering Rules

맨몸 추가 부하2E는 [공통 DB/API·오프라인 계약](../../../overload-server/docs/api/bodyweight-additional-load.md)을 따른다. PerformedSet/RecordEdit의 optional bodyweightLoad와 SetDraft.additionalWeight를 사용하며 기존 weight에서 채우지 않는다. IndexedDB3/schema2·기존 문서/고정 요청을 재작성하지 않는다. 근거가 없는 총중량은null/숨김이고 승인 평가/중량 변경 기능은 그대로다. 개인 DB V18~V22는 미적용이다.

유산소 실제 측정2D는 [공통 API·오프라인 계약](../../../overload-server/docs/api/cardio-actual-measurements.md)을 따른다. CardioResult/RecordEdit의 optional measurement와 타이머 optional speed는 IndexedDB3/schema2·기존 고정 요청을 재작성하지 않는다. 직접 입력/정정 거리가 우선이고 계획 속도를 실제값에 채우지 않는다.

> Frontend Development Guidelines for AI Coding Agents
>
> Repository: `overload-pwa` (npm project: `overload-app`)
>
> Stack: React / TypeScript / Vite / PWA
>
> Primary Target: iPhone Safari & Home Screen PWA
>
> Status: Initial Engineering Guidelines

---

## 1. 목적 및 적용 범위

UI를 변경할 때는 [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)의 실제 컬러·시각 위계와 [추출 아이콘 원본](../product/assets/exercise-icons/README.md)을 먼저 확인하고 [UI/UX 명세](../product/ui-ux.md)와 [v0.9 적용 범위](#87-v09-적용-범위와-구현-상태)를 확인합니다. 디로딩 도메인·데이터 경계는 [제품 v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md)과 [백엔드 연동 설계](backend-ui-v0.9.md)를 따릅니다.

이 문서는 Overload 프론트엔드의 기술별 개발 규칙을 정의합니다.

AI 코딩 에이전트와 개발자는 프론트엔드 코드의 생성,
수정, 리팩터링, 테스트 및 PWA 기능 개발 시 본 규칙을 준수합니다.

공통 작업 원칙은 저장소 루트 [AGENTS.md](../../AGENTS.md)를 따릅니다.
V1 출시 전 설계 우선·호환성·단순화·리팩터링·테스트 기준은 해당 문서 4절과 13절을 참조합니다.
아래 과거 단계의 구현·보존 기록은 영구적인 구조 유지 의무가 아니며, 제품 정책과 데이터 보호 조건을 구분합니다.

Task 007의 확정 정책과 구현 단계는 [Task 006 최종 설계 v0.3.1](../../../overload-server/docs/tasks/task-006-integrated-design-v0.3.1.md)을 따릅니다.
운동 쓰기·진행 세션·복구는 [Task 009 v1.0](../../../overload-server/docs/tasks/task-009-redesign-v1.0.md)이 우선합니다.
Task 006의 나머지 운동·인증 정책과 기존 Task 008 조회 계약은 유지합니다.

본 문서는 다음 항목에 집중합니다.

현재 운동 계약은 [Frontend 표준 카탈로그 3단계](../tasks/standard-exercise-catalog-frontend-phase-3-report.md)를 따릅니다. 실제 계정 화면은 standardExerciseId 단일 UUID, 명시 nullable 장비, 계획/평가/로컬 문서 schema2와 IndexedDB3을 사용합니다. search-data의 별도 schemaVersion1은 유지합니다. 장비 편집은 완료 세트·중량 승인·공식 비교 Context를 바꾸지 않습니다. DB1/2 테스트 데이터 정리는 원자 upgrade에서 한 번만 실행하며 DB3 반복 열기·일반 앱 업데이트는 초기화하지 않습니다. PWA waiting·계정/세대·고정 요청 원문과 오프라인 재진입 보호를 유지합니다.

[4단계 실제 개발 환경 검증](../../../overload-server/docs/tasks/standard-exercise-catalog-dev-phase-4-report.md)에서 접근 허용의 두 저장소 nonce 불일치를 수정했습니다. 허용 갱신은 직렬화하고 이미 허용된 같은 계정·세대의 nonce를 유지합니다. deny/identity/scope 경계의 즉시 차단, 현재 인가 재검사, 명시 오프라인 진입은 유지합니다. 새 nonce를 매 재진입마다 발급해 독립적으로 커밋되는 IndexedDB/localStorage 쌍을 불필요하게 교체하지 않습니다.

- React 및 TypeScript 코드 작성 규칙
- 컴포넌트 설계 및 아키텍처
- 클라이언트 및 서버 상태 관리
- Spring Boot REST API 연동
- 모바일 중심 UI/UX
- iPhone 및 Safari 호환성
- PWA 및 Service Worker
- 오프라인 데이터 저장 및 동기화
- 사용자 데이터 보호
- 테스트 및 품질 검증
- AI 에이전트의 프론트엔드 작업 기준

### 기본 원칙

- 모바일 환경을 우선하여 설계합니다.
- 사용자의 운동 기록을 보호합니다.
- 기존 구조를 이해하고 최신 확정 설계와 공통 개발 원칙에 따라 개선합니다.
- 단순하고 유지보수 가능한 구현을 우선합니다.
- 요구사항이 확정되지 않은 기능을 임의로 구현하지 않습니다.
- 구현되지 않은 기능을 존재한다고 가정하지 않습니다.
- 브라우저별 기능 지원 여부를 검증합니다.

---

## 2. 기술 스택 및 버전 관리

### 2.1 기본 기술 스택

| Category | Technology |
|:---|:---|
| Language | TypeScript |
| UI Library | React 19.x |
| Build Tool | Vite |
| PWA | vite-plugin-pwa (미도입, 채택 검토) |
| Styling | 계정 셸·공통 표현은 CSS Custom Properties + CSS Modules (T01), 기존 기능 패널은 일반 CSS |
| UI Components | 기존 자체 컴포넌트 우선. 복잡한 조작에는 필요한 primitive만 별도 검토 |
| Routing | React 화면 상태 (현재), React Router (미도입, 채택 검토) |
| HTTP Client | fetch (현재), Axios (미도입, 채택 검토) |
| Server State | 전용 라이브러리 미도입, TanStack Query 채택 검토 |
| Client State | React 상태 (현재), Zustand (미도입, 채택 검토) |
| Local Database | localStorage (개발 목업), 진행 운동 보호용 native IndexedDB (5A~5D 구현), Dexie.js (미도입) |
| Charts | CSS·SVG (현재), Recharts (채택, 통계 구현 단계에서 설치) |
| Unit Testing | Node.js 내장 test (현재), Vitest (미도입, 채택 검토) |
| Component Testing | 기존 TypeScript 컴파일러 + React SSR (현재), React Testing Library (미도입, 채택 검토) |
| E2E Testing | Playwright (미도입, 채택 검토) |
| Hosting | Cloudflare Pages (예정) |

현재 도입 상태는 `package.json`, Lockfile과 실제 코드를 기준으로 확인합니다.
미도입 도구는 현재 필수 도구가 아니며, 이 문서만을 이유로 설치하거나 기존 테스트 체계를 교체하지 않습니다.
추가 도입은 필요성 검토와 `AGENTS.md`의 주요 의존성 승인 기준을 따릅니다.

### 2.2 버전 관리 원칙

- 실제 설치된 버전은 `package.json`을 기준으로 확인합니다.
- 정확한 의존성 버전은 Lockfile을 통해 관리합니다.
- npm을 기본 패키지 관리 도구로 사용합니다.
- `package-lock.json`을 Git에 포함합니다.
- 신규 라이브러리 설치 전 기존 기술로 해결 가능한지 검토합니다.
- 안정적인 릴리스 버전을 우선합니다.
- React, Vite, TypeScript 간 호환성을 확인합니다.
- 라이브러리 업데이트 시 타입 검사와 빌드를 수행합니다.
- 최신 버전이라는 이유만으로 의존성을 변경하지 않습니다.

### 2.3 라이브러리 도입 기준

새로운 라이브러리는 다음 사항을 검토한 후 도입합니다.

1. 실제로 필요한 기능인가?
2. 기존 의존성으로 구현 가능한가?
3. React 및 TypeScript와 호환되는가?
4. 모바일 Safari에서 정상 동작하는가?
5. 유지보수가 지속되고 있는가?
6. 번들 크기 및 성능에 미치는 영향은 적절한가?
7. 대체하거나 제거하기 쉬운가?

단순한 기능 구현을 위해 과도한 의존성을 추가하지 않습니다.

---

## 3. 프론트엔드 아키텍처

### 3.1 기본 구조

Overload 프론트엔드는 기능 중심 구조를 사용합니다.

기능별 코드를 `features` 디렉터리에 배치하고,
여러 기능에서 공유하는 요소는 별도 공통 디렉터리에서 관리합니다.

기본 데이터 흐름:

```text
User Interaction
       |
       v
React Component
       |
       v
Custom Hook / Feature Logic
       |
       v
API Client / Local Storage
       |
       v
Spring Boot REST API
       |
       v
PostgreSQL
```

React 컴포넌트는 사용자 인터페이스에 집중하며
데이터 접근 및 비즈니스 규칙은 적절한 계층으로 분리합니다.

### 3.2 권장 디렉터리 구조

```text
src/
│
├── app/
│   ├── router/
│   └── providers/
│
├── assets/
│
├── components/
│   ├── ui/
│   └── common/
│
├── features/
│   ├── auth/
│   ├── home/
│   ├── workout/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types/
│   ├── routine/
│   ├── history/
│   └── statistics/
│
├── hooks/
│
├── services/
│   └── api/
│
├── stores/
├── types/
├── utils/
│
├── App.tsx
└── main.tsx
```

위 구조는 권장 구조입니다.

작은 기능은 불필요하게 모든 하위 디렉터리를
생성하지 않아도 됩니다.

### 3.3 디렉터리 책임

| Directory | Responsibility |
|:---|:---|
| `app` | 애플리케이션 초기화, 라우팅, Provider |
| `assets` | 이미지, 아이콘 등 리소스 |
| `components` | 여러 기능에서 재사용하는 UI |
| `features` | 도메인별 화면 및 기능 |
| `hooks` | 공통 React Hooks |
| `services` | 공통 API Client 및 네트워크 설정 |
| `stores` | 공통 클라이언트 상태 |
| `types` | 공통 타입 정의 |
| `utils` | 공통 유틸리티 |

### 3.4 의존성 규칙

- `features`의 기능별 코드를 우선적으로 응집시킵니다.
- 공통 컴포넌트가 특정 기능에 직접 의존하지 않도록 합니다.
- 기능 간 순환 의존성을 만들지 않습니다.
- UI 컴포넌트에서 직접 HTTP 요청을 작성하지 않습니다.
- 네트워크 접근은 API 계층을 통해 처리합니다.
- 동일한 API 호출 및 데이터 변환 로직을 중복 구현하지 않습니다.
- 공통 코드로 이동할 때는 실제 재사용 필요성을 확인합니다.

### 3.5 구조 단순화

공통 판단 기준은 `AGENTS.md` 4.3~4.4절을 따릅니다.
기존 React·TypeScript 기능과 현재 구조로 간단히 해결할 수 있으면 새 추상화·상태 관리 도구·의존성을 추가하지 않습니다.
불필요한 전역 상태·컴포넌트 분할·중복 API 계층은 실제 필요성을 확인하고 정리합니다.

---

## 4. TypeScript 코드 작성 규칙

### 4.1 기본 원칙

- TypeScript의 Strict Mode를 사용합니다.
- 명확한 타입을 정의합니다.
- 추론 가능한 타입은 불필요하게 반복 선언하지 않습니다.
- `any` 사용을 지양합니다.
- 외부 데이터의 타입이 확정되지 않았다면 `unknown`을 우선 검토합니다.
- 불필요한 타입 단언을 피합니다.
- 런타임 데이터가 TypeScript 타입만으로 검증된다고 가정하지 않습니다.

### 4.2 네이밍 컨벤션

| Element | Convention | Example |
|:---|:---|:---|
| Component | PascalCase | `WorkoutCard` |
| Function | camelCase | `calculateVolume` |
| Variable | camelCase | `workoutDate` |
| Custom Hook | use + camelCase | `useWorkout` |
| Type | PascalCase | `WorkoutSession` |
| Interface | PascalCase | `WorkoutCardProps` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Component File | PascalCase | `WorkoutCard.tsx` |
| Hook File | camelCase | `useWorkout.ts` |

### 4.3 Type 및 Interface

- 객체 형태의 계약에는 `type` 또는 `interface`를 일관되게 사용합니다.
- Union Type은 필요한 상태를 명확하게 표현하는 데 사용합니다.
- 의미 없는 타입 별칭을 과도하게 생성하지 않습니다.
- API DTO와 UI 전용 모델을 구분합니다.
- 서버가 제공하는 타입과 클라이언트 내부 타입을 혼용하지 않습니다.
- 선택적 속성과 필수 속성을 명확하게 구분합니다.

### 4.4 Null 및 Undefined

- `null`과 `undefined`의 의미를 명확히 구분합니다.
- 선택적 값에 대한 기본 처리를 정의합니다.
- 값이 0일 수 있는 경우 Truthy/Falsy 검사에 주의합니다.
- Non-null Assertion(`!`)을 무분별하게 사용하지 않습니다.
- 데이터가 없는 상태를 정상적인 UI 상태로 처리합니다.

### 4.5 불변성

- 상태 객체와 배열을 직접 변경하지 않습니다.
- 새로운 상태를 생성하여 업데이트합니다.
- 외부에서 전달된 객체를 임의로 수정하지 않습니다.
- 필요한 경우 불변 데이터 구조를 사용합니다.

---

## 5. React 컴포넌트 설계

### 5.1 기본 원칙

- 함수형 컴포넌트를 사용합니다.
- 하나의 컴포넌트는 명확한 UI 책임을 갖습니다.
- 컴포넌트 이름만으로 역할을 이해할 수 있어야 합니다.
- 재사용이 필요한 부분은 의미 있는 단위로 분리합니다.
- 불필요한 컴포넌트 분할을 피합니다.
- 렌더링 과정에서 부작용을 발생시키지 않습니다.

### 5.2 컴포넌트 책임

컴포넌트는 가능한 한 다음 역할에 집중합니다.

- 데이터 표시
- 사용자 입력 처리
- 사용자 상호작용
- 접근성 제공
- 로딩 및 오류 상태 표시

다음 로직은 적절히 분리합니다.

- API 호출 및 응답 처리
- 복잡한 상태 변경
- 데이터 변환
- 운동 기록 관련 비즈니스 규칙
- 오프라인 저장 및 동기화

### 5.3 Props

- Props 타입을 명확히 정의합니다.
- 불필요하게 많은 Props를 전달하지 않습니다.
- Props를 직접 수정하지 않습니다.
- 기능별 의미가 드러나는 이름을 사용합니다.
- 여러 계층에 걸친 과도한 Props 전달을 피합니다.

### 5.4 재사용 컴포넌트

공통 컴포넌트는 실제 반복되는 패턴을 기준으로 생성합니다.

예시:

```text
Button
Input
Modal
Dialog
LoadingIndicator
ErrorMessage
EmptyState
WorkoutCard
```

`WorkoutCard`처럼 특정 도메인에만 사용되는 컴포넌트는
기본적으로 해당 Feature 내부에 배치합니다.

실제 공유 필요성이 생기면 공통 영역으로 이동합니다.

### 5.5 React Hooks

- Hooks는 React의 호출 규칙을 준수합니다.
- 조건문이나 반복문 내부에서 Hook을 호출하지 않습니다.
- Custom Hook은 재사용 가능한 상태 및 로직에 사용합니다.
- `useEffect`를 일반적인 데이터 계산 수단으로 남용하지 않습니다.
- 렌더링 과정에서 계산 가능한 값은 불필요하게 State로 저장하지 않습니다.
- 이벤트로 처리할 수 있는 작업은 이벤트 핸들러에서 처리합니다.
- Effect를 사용할 경우 의존성과 Cleanup을 검토합니다.

### 5.6 성능 최적화

- `useMemo`, `useCallback`, `memo`를 무조건 사용하지 않습니다.
- 실제 성능 문제를 측정한 후 최적화합니다.
- 불필요한 상태 변경 및 리렌더링을 줄입니다.
- 긴 리스트는 필요에 따라 가상화를 검토합니다.
- 화면 단위 Code Splitting을 적용할 수 있습니다.
- 대용량 라이브러리 도입 시 번들 크기를 확인합니다.

---

## 6. 상태 관리 규칙

### 6.1 상태 분류

상태는 성격에 따라 구분합니다.

| State | Recommended Tool |
|:---|:---|
| Local UI State | React useState |
| Complex Local State | useReducer |
| Server State | 전용 라이브러리 미도입; TanStack Query 채택 시 아래 지침 적용 |
| Shared Client State | 현재 React 상태; Zustand 채택 시 아래 지침 적용 |
| Form State | Local State / Form Library |
| Offline Data | 이미 열린 운동의 입력·IndexedDB 복원(5B); 완전 오프라인 재실행은 후속; 범용 Outbox 없음 |

모든 상태를 하나의 전역 Store에서 관리하지 않습니다.

### 6.2 Server State

TanStack Query는 현재 미도입입니다.
채택하는 경우 서버 데이터 관리에 아래 지침을 적용합니다.

대표적인 데이터:

- 사용자 정보
- 운동 종목
- 운동 이력
- 운동 루틴
- 운동 통계

규칙:

- Query Key는 일관된 규칙으로 정의합니다.
- 인증 사용자에 따라 Query Key를 분리합니다.
- 필요한 경우 `staleTime`을 설정합니다.
- Mutation 성공 후 관련 Query를 갱신합니다.
- 불필요한 전체 Query 무효화를 피합니다.
- 로딩, 오류, 빈 데이터 상태를 구분합니다.
- Query Cache를 영구 저장소로 취급하지 않습니다.

### 6.3 Client State

Zustand는 현재 미도입입니다.
채택하는 경우 여러 컴포넌트에서 공유해야 하는 클라이언트 상태에 아래 지침을 적용합니다.

예시:

- 현재 화면의 공통 UI 상태
- 운동 중 임시 입력 상태
- 전역 모달 상태
- 앱 설정

규칙:

- 전역 상태는 실제 공유 필요성이 있을 때 사용합니다.
- Store의 역할을 명확하게 구분합니다.
- 서버 데이터를 불필요하게 복제하여 저장하지 않습니다.
- 영구 저장이 필요한 운동 기록을 메모리 Store에만 의존하지 않습니다.
- 인증 비밀 정보를 Persist Store에 무분별하게 저장하지 않습니다.

### 6.4 State 중복 방지

동일한 데이터를 여러 State에 저장할 경우
동기화 오류가 발생할 수 있습니다.

다음 원칙을 적용합니다.

- 원본 데이터의 소유 위치를 명확하게 정의합니다.
- 계산 가능한 값은 기존 State에서 파생합니다.
- API 응답과 클라이언트 편집 상태를 구분합니다.
- 편집 중인 데이터의 저장 시점과 서버 반영 시점을 명확하게 관리합니다.

---

## 7. Spring Boot API 연동

### 7.1 기본 규칙

`overload-app`은 `overload-server`의 REST API와 통신합니다.

기본 API Prefix:

```text
/api/v1
```

규칙:

- API 호출은 공통 HTTP Client를 사용합니다.
- Axios를 채택하는 경우 컴포넌트에서 인스턴스를 반복 생성하지 않습니다.
- API Endpoint를 여러 파일에 중복 하드코딩하지 않습니다.
- 요청 및 응답 타입을 명확하게 정의합니다.
- 서버 오류와 네트워크 오류를 구분합니다.
- 인증 및 인가 오류를 명시적으로 처리합니다.
- 백엔드에서 확정되지 않은 Endpoint를 임의로 구현 완료 처리하지 않습니다.

### 7.2 API Client

공통 HTTP Client는 다음 책임을 가집니다.

- Base URL 설정
- Timeout 관리
- 인증 정보 전달
- 공통 오류 정규화
- 요청 및 응답 처리

재시도는 요청의 특성을 고려해 적용합니다.

운동 기록 생성처럼 중복 실행이 위험한 요청은
서버의 멱등성 지원 없이 무조건 자동 재시도하지 않습니다.

### 7.3 API 타입

API DTO는 최신 확정 Backend 계약과 일치해야 합니다.
구버전 API·클라이언트·IndexedDB 지원 여부는 `AGENTS.md` 4.2절을 따르며, 호환성 전용 타입·변환·fallback은 기본으로 추가하지 않습니다.
현재 입력의 생략/명시적 제거, 정상적인 부분 수정, 고정 요청 및 미전송 데이터 보호는 구버전 지원과 구분합니다.

예시:

```typescript
type WorkoutSetResponse = {
  id: number;
  weight: string;
  reps: number;
  completed: boolean;
};
```

위 코드는 타입 구조를 보여주는 예시입니다.

실제 ID 타입, 필드 이름, 정밀도 및 응답 형태는
백엔드 API 계약을 기준으로 확정합니다.

정밀도가 중요한 Decimal 값은
서버와의 직렬화 방식을 협의합니다.

TypeScript `number`로 변환할 때
정밀도 손실 가능성을 검토합니다.

### 7.4 API 응답 처리

- API 응답이 항상 성공한다고 가정하지 않습니다.
- 예상하지 못한 데이터 형식을 고려합니다.
- 필수 데이터가 누락된 경우 명확하게 처리합니다.
- 성공과 실패를 사용자에게 구분하여 표시합니다.
- 서버 오류 메시지를 그대로 신뢰하여 HTML로 렌더링하지 않습니다.
- 필요한 경우 API 경계에서 런타임 검증을 수행합니다.

### 7.5 오류 처리

다음 상황을 구분합니다.

| Error | Expected Handling |
|:---|:---|
| Network Error | 연결 오류 안내, 안전한 재시도 |
| 400 | 입력 오류 안내 |
| 401 | 인증 상태 확인 및 재인증 유도 |
| 403 | 접근 권한 없음 안내 |
| 404 | 데이터 없음 안내 |
| 409 | 충돌 상태 안내 |
| 5xx | 서버 오류 안내 |

일시적인 서버 오류로 인해
입력 중인 운동 기록을 삭제하지 않습니다.

### 7.6 Query Cache 갱신

Mutation 이후에는 관련 데이터를 갱신합니다.

예시:

```text
Create Workout
      |
      v
Mutation Success
      |
      v
Invalidate Workout Queries
      |
      v
Fetch Updated Data
      |
      v
Update UI
```

Optimistic Update를 사용할 경우
실패 시 복구 방법을 반드시 고려합니다.

---

## 8. UI 및 스타일링 규칙

### 8.1 모바일 퍼스트

Overload는 세련되고 깔끔한 모던 다크 모드를 사용하며, iPhone 15의 iOS Safari와 홈 화면 설치형 PWA를 우선 검증합니다.

- 모바일 화면을 기준으로 UI를 설계합니다.
- 작은 화면에서도 주요 기능을 사용할 수 있어야 합니다.
- 터치 입력을 기본 인터랙션으로 고려합니다.
- PC 및 태블릿에서도 정상적으로 동작하도록 확장합니다.
- 가로 스크롤을 불필요하게 발생시키지 않습니다.

### 8.2 스타일링

- UI v0.9는 CSS Custom Properties와 Vite의 CSS Modules를 사용합니다. A/B 비교에서 CSS Modules 방식을 채택했으며 Tailwind 실험은 종료했고 운영 앱에는 도입하지 않았습니다.
- 일반·디로딩은 레이아웃과 컴포넌트를 공유합니다. 앱 셸의 `data-theme`으로 배경·카드·텍스트·강조·경계·초점·차트 등 공통 역할 토큰을 선택하고, 화면별 표시 조건은 제품 명세를 따릅니다. 테마를 바꿀 때 입력·타이머·컴포넌트 상태를 보존합니다.
- 테마와 홈의 일반 보기 선택은 표시·조회 상태입니다. 디로딩 기간, 세션 소속, 쓰기 권한의 근거는 서버 상태입니다.
- 개발 전용 `/demo`의 어두운 색상과 시각적 분위기를 참고합니다. v0.9에 필요한 UI는 신규 작성할 수 있으며, 실제 계정 경로의 인증·운동 기록·오프라인 저장·동기화 동작은 보호합니다.
- 색상, 간격, 타이포그래피 규칙을 통일합니다.
- 같은 스타일의 불필요한 중복을 줄입니다.
- 임의 값 사용을 남용하지 않습니다.
- 반응형 스타일을 고려합니다.

### 8.3 공통 UI 컴포넌트

기존 자체 컴포넌트를 우선하며 UI v0.9에는 shadcn/ui를 도입하지 않습니다. [Dialog](../../src/components/Dialog.tsx)의 닫기·초점 복귀와 [RepsInput](../../src/components/RepsInput.tsx)의 숫자 키패드·직접 입력·증감을 재사용할 수 있습니다. 화면 가장자리 배치나 초점 이동이 복잡한 팝오버에 한해 Radix UI 같은 개별 primitive를 검토합니다.

### 8.4 터치 UI

- 버튼과 입력 영역은 충분한 터치 크기를 확보합니다.
- 인접한 버튼 간 오작동이 발생하지 않도록 합니다.
- 주요 작업은 한 손으로 조작하기 쉽게 배치합니다.
- Hover에만 의존하는 기능을 만들지 않습니다.
- Swipe 등의 제스처에는 필요한 경우 대체 조작을 제공합니다.

### 8.5 Safe Area

iPhone의 화면 구조를 고려합니다.

- 상단 상태바 및 노치 영역
- Dynamic Island 주변 영역
- 하단 Home Indicator
- 가상 키보드 영역

필요한 경우 CSS Safe Area 값을 사용합니다.

```css
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

실제 viewport 설정과 브라우저 동작을 확인한 뒤 적용합니다.

### 8.6 접근성

- 의미 있는 HTML 요소를 사용합니다.
- 버튼은 실제 `button` 요소를 우선합니다.
- 입력 요소에 Label을 제공합니다.
- 키보드 접근성을 유지합니다.
- 명확한 Focus 표시를 제공합니다.
- 텍스트와 배경의 충분한 대비를 확보합니다.
- 색상만으로 상태를 표현하지 않습니다.
- 아이콘 버튼에 접근 가능한 이름을 제공합니다.
- 동적인 상태 변화는 필요한 경우 보조 기술에 전달합니다.

### 8.7 v0.9 적용 범위와 구현 상태

**마지막 확인** 2026-11-10 (KST). 검토한 HEAD는 `e34e433`이다. `302bc00`의 HOME·ROUTINE UI와 `e34e433`의 실제 API 연동·이름 변경을 이전 검증 결과와 대조했다.

| 범위 | 상태와 근거 |
| --- | --- |
| T01 공통 기반 | **완료.** 계정 앱 셸, Onyx 역할 토큰, 공통 컴포넌트가 현행 코드에 포함돼 있다. 구현 `ad8d664a1a5ef60caea96d5787a12bfe01875988`의 최종 검증은 자동 테스트 507건, build·lint, 격리 Chrome 8개 검증 그룹을 통과했다. [T01 보고서](../tasks/ui-v09-t01-foundation-report.md#최종-검토로컬-커밋-범위) |
| T02-A 일반 홈 | **완료.** 구현 `60a6dce9707c861926b0690e47a421db21c91ae2`의 2026-11-06 iPhone 사용자 승인 기록이다. [T02-A 마감](../tasks/ui-v09-t02a-closeout.md) |
| T02-B 단일 일정 | **이전 구현 기록.** 당시 루틴 태그·편집과 단일 일정 즉시 적용을 구현했다. 2026-11-08 확인 기록은 자동 테스트 548건·build·lint 통과이며 당시 최종 실기기 승인은 별도였다. [당시 검증](../tasks/deload-v17-backend-readiness-analysis.md#0-2026-11-08-1차-개발-최종-현황) |
| T02 HOME·ROUTINE 다중 프리셋 | **UI·연동·PC 검토 완료.** Mock 구현과 사용자 UI 피드백 반영 후 계정 화면을 V30·V31에 연결하고 격리 실제 API로 검증했다. 아래 범위와 실기기 경계를 적용한다. [현재 API 소비](backend-ui-v0.9.md#t02-b-현재-api-소비) |
| 표준 운동 DB 확장 3단계 | 근육 통계 화면에 세부 기여와 상위 그룹 실제 세트를 구분해 표시한다. [통계 계약](../../../overload-server/docs/api/statistics.md) |
| 표준 운동 DB 확장 2단계 | 설정에서 공개 운동을 검색하고, 루틴·세션은 현재 기록할 수 있는 종목만 선택한다. [카탈로그 계약](../../../overload-server/docs/api/standard-exercise-catalog.md) · [검증 범위](#표준-운동-db-확장-2단계) |
| CATALOG-01·02 및 SETTING-01 | **실제 API 연동·격리 검증·사용자 최종 승인 및 마감.** 계정 설정의 전체 메뉴와 공개 운동 목록·UUID 상세를 연결했다. 하이 로우 보호 GIF는 내부 검토 계정에서 확인했다. [최종 마감](#catalog-0102--setting-01-실제-계정-마감) |
| T03·T04 및 G6 | **후속.** 홈의 디로딩 분석·기간 조회와 일반 쓰기 보호는 연결했다. 기간·임시 계획의 편집, 디로딩 START 및 혼재 세션의 검증·로컬 저장·동기화는 G6 범위다. [G6 선행조건](backend-ui-v0.9.md#g6-실제-연동-선행조건) |
| T03.5 휴식 타이머 알림 | **별도 범위.** 정책과 HTML 시연이 확정됐다. [구현 지침](#t035-휴식-타이머-시각효과음-알림) |
| 실기기·후속 통합 | **검증 대기.** 최신 HOME·ROUTINE의 iPhone Safari, 설치형 PWA 및 신뢰된 로컬 HTTPS START는 이번 PC 검증에 포함되지 않았다. [실기기 검증 규칙](#167-실제-iphone-테스트) |

#### HOME·ROUTINE 마감 범위

- **HOME-01**은 서버 활성 일정의 오늘 배정과 날짜별 통계 overview를 분리해 읽고, 실제 최근 운동을 표시한다. **ROUTINE-01~07** 범위의 목록·상세·루틴 생성/수정/삭제, 프리셋 조회와 적용 분리, 생성/삭제/이름 변경, 수동 적용, 순환 포함·순서 편집과 카드 드래그, 요일별 배정 저장을 구현했다. [화면별 동작](../product/ui-ux.md#31-홈--home)
- 사용자 UI 피드백과 PC 검토를 반영했다. 격리 Chrome의 실제 OTP·저장·충돌·재조회·새로고침·재로그인, 320px·393px 화면을 검증했다. V30 연동 검증에서 자동 테스트 544건, V31 이름 변경 최종 검증 545건과 타입 검사·빌드·Lint가 통과했다. 최종 빌드에는 번들 크기 경고 1건이 있었다. Backend 시계 안정화 결과는 [Backend 개발 현황](../../../overload-server/docs/engineering/backend.md#11-현재-개발-현황)에 기록한다.
- 표준 카탈로그 검색·선택과 일반 운동 START·진행의 기존 기능은 사용한다. 표준 운동 데이터 정비, 검색·선택과 루틴 편집 경험의 추가 개선, START 이후 화면 고도화 및 별도 화면·기능은 이번 마감 범위에서 분리한다. 후속 작업 순서는 별도 결정한다.

#### HOME 및 ROUTINE Mock 검토

- 개발 전용 `/routine-preview`는 합성 상태를 사용한다. `npm run dev -- --mode ui-review`의 기본 검토 포트는 4173이고 `?tab=home`으로 홈에서 시작할 수 있다. 이 경로의 합성 상태·오류는 실제 계정, 인증·IndexedDB·운동 기록과 분리된다.
- 실제 API 검토는 격리 Backend에 연결된 개발 전용 OTP 검토 경로를 사용했다. 2026-11-10에 검토 서버와 일회용 DB의 종료를 확인했다. [검토 환경과 종료 이력](../../../overload-server/docs/engineering/test-environment.md#home-routine-검토-종료-기록)
- 더미 데이터 대신 사용자와 합의한 실제 운동 구성으로 검토할 때는 승인된 31종과 월~토 루틴을 복원하는 전용 V35 환경을 사용한다. 로컬 검토 화면의 OTP 로그인과 루틴·주간 일정 조회는 실제 Backend API에 연결된다. [시작과 초기화 후 복원](../../../overload-server/docs/dev-data/overload-31-catalog/README.md#실제-운동-데이터로-검토)

#### 표준 운동 DB 확장 2단계

2026-11-10, Frontend HEAD `5543e7f`의 작업 트리에서 Backend V33 계약을 연결했다. 설정의 일반 검색은 공개된 모든 기록 방식을 보여주며, 웨이트 선택은 기존 검색 응답을 사용한다. 신규 유산소 선택은 표준 운동 UUID와 기존 기록 설정 UUID를 구분한다.

기존 유산소 계획은 저장 당시 이름·측정 종류·목표값을 계속 사용한다. IndexedDB 스키마와 이미 만든 START·Snapshot·FINISH 요청의 본문, 계정·세대·편집 기기 확인 경계는 유지한다. [세션 계약](../../../overload-server/docs/api/workout-sessions.md)

자동 테스트 547건, lint와 production build를 통과했다. 새 일회용 V33 Backend와 격리 Chrome에서 오프라인 브라우저 재실행, 유산소 타이머·측정 출처 복원, Snapshot·FINISH ACK 유실 후 동일 본문 재전송과 DB 무중복을 확인했다. 별도 실행에서 세션 만료·다른 계정·로그아웃·같은 계정 재인증·기기 인수 후의 기록 격리와 이전 writer 차단도 확인했다. 설치형 iPhone 실기기 및 실제 DB 적용은 별도 범위다.

#### 표준 운동 DB 확장 3단계

Frontend HEAD `5543e7f`의 작업 트리에서 기존 통계 화면과 기간 필터를 사용한다. 세부 근육 행은 기여 세트와 실제 참여 세트를 함께 표시하고, 상위 그룹은 역할을 통틀어 중복 제거된 실제 완료 세트를 표시한다. IndexedDB와 고정 요청 계약에는 변경이 없다.

2026-11-10 기준 자동 테스트 548건, lint, production build를 통과했다. 일회용 V33 Backend와 격리 Chrome에서 종료 응답 유실 후 동일 요청의 재전송, 기록 무중복, 실제 3세트와 보조근 기여 1.5세트의 분리 표시를 확인했다. 설치형 iPhone 실기기 및 실제 DB 적용은 별도 범위다.

#### 표준 운동 DB 확장 4-C

2026-11-11, Frontend HEAD `5543e7f`의 작업 트리에서 Service Worker의 사전 캐시와 조회 대상에서 `/media/exercises/`를 제외했다. Backend는 V35와 UUID 상세 API를 제공한다. 기존 검색·선택과 근육 통계는 연동 상태다. UUID 상세 호출과 화면 표시, 권리·보호 경로 계약이 필요한 GIF 표시를 후속 사용자 UI 범위로 구분한다. [현재 API와 UI 연결 경계](backend-ui-v0.9.md#표준-운동-사용자-ui의-v35-연결-경계) · [표준 운동 인수인계](../../../overload-server/docs/engineering/standard-exercise-handoff.md)

최종 통합 검증에서 lint, 프로덕션 빌드, 자동 테스트 549건을 다시 통과했다. 격리 V35 서버와 실제 Chrome에서 오프라인 Snapshot·FINISH 재전송과 무중복, 세션 만료·계정 격리·재인증·편집 기기 인수 후 이전 쓰기 차단을 확인했다. 설치형 iPhone과 운영 DB 적용은 이번 검증 범위에서 제외했다.

#### CATALOG-01·02 설정의 운동 종목 보기

아래는 실제 UUID 상세 연동 전의 UI 구현과 검토 이력이다. 현행 범위는 [최종 마감](#catalog-0102--setting-01-실제-계정-마감)을 따른다.

- 2026-11-12, 기준 HEAD `251a874`에서 승인 HTML의 목록과 상세를 Onyx 테마로 구현했다. 텍스트 전용 단일 가로 필터는 이름·별칭 검색과 함께 적용한다. 상세에서 목록으로 복귀하면 검색어·부위·스크롤과 이전 행의 포커스를 복원한다.
- `npm run dev -- --mode ui-review` 실행 후 [검토 설정](http://127.0.0.1:4173/routine-preview?tab=settings)에서 **운동 종목 보기**를 선택한다. 검토용 예시에는 8개 부위, 복수 PRIMARY, 분할 태그, 긴 이름·다수 별칭과 GIF 미제공이 포함된다. [UI/UX 명세](../product/ui-ux.md)
- 계정 화면은 기존 `GET /api/v1/standard-exercises/catalog`를 사용한다. 상세는 같은 응답의 이름·별칭·근육·운동 방법과 기구 설명을 표시한다. 분할 태그는 예시 데이터에서 확인할 수 있다. UUID 상세·보호 GIF 연결 및 iPhone Safari 실기기 검증은 후속 범위다. [카탈로그 계약](../../../overload-server/docs/api/standard-exercise-catalog.md)
- 자동 테스트 551건, Lint 및 타입 검사를 포함한 production build를 통과했다. 격리 Chrome의 320px·393px 검토에서 스와이프·키보드·목록 복귀를 확인했다. 검토 화면의 API 요청과 IndexedDB 생성은 0건이었다. 계정 경로는 격리된 HTTP 테스트 응답으로 기존 카탈로그 GET을 확인했다.
- 2026-11-12, 사용자가 CATALOG-01·02 UI와 검색을 검토하고 이번 작업의 로컬 커밋을 승인했다. 기존 검증 결과로 마감하며 추가 테스트와 UI 검수는 재실행하지 않았다. 실제 실행 경로·명령행·포트를 확인한 `ui-review` PID 40904를 종료하고 4173번 포트 해제를 확인했다. Backend·PostgreSQL·검토 데이터·백업에는 종료·초기화 작업을 적용하지 않았다. 이번 승인은 CATALOG UI 작업과 관련 시연·절차 보완 범위이며 다른 설정 메뉴의 미구현 기능은 아래 표의 상태를 유지한다.

#### CATALOG-02 하이 로우 상세 시연 후속

- 2026-11-12, 기준 HEAD `e7e1a7f`에서 상세 데이터 연결을 조사했다. 계정 화면은 `/catalog` 응답의 선택 항목을 표시하며 UUID 상세 API를 호출하지 않는다. Backend 상세 응답은 순서 있는 PRIMARY, SECONDARY, 분할과 `instructionSteps`를 제공한다. GIF URL은 사용자 상세 응답에 포함되지 않는다.
- 개발 전용 `ui-review`에서 기존 단순 하이로우 예시를 [31종 카탈로그](../../../overload-server/docs/dev-data/overload-31-catalog/catalog.json)의 `pull_machine_high_row`로 교체했다. 표준 UUID는 `2d04629b-b651-811b-8e66-3d56102988a8`, 표준명은 **머신 하이 로우**다. 과거 V17 예시 `d1700000-0000-4000-8000-000000000004`와 구별한다. 같은 자료의 별칭·분할·근육 순서 및 4단계 설명을 옮겼고 V32 근육 마스터 ID와 대조했다. 현재 DB 조회 결과로 표시하지 않으며, 설명을 펼치면 사용자 확인 기반 한국어 초안과 개발 전용 사본이라는 출처를 표시한다.
- `nZZZy9m.gif`는 기존 로컬 미디어와 다운로드 원본에 존재하며 SHA-256은 `c132e833915b249752879c31018474402ac3da7eb1388d1fd98c56669bad9e6c`로 동일했다. GIF89a, 180×180, 126,978바이트, 12프레임이며 무한 반복 메타데이터를 확인했다. 첫 조사에서는 인수인계의 미승인 상태에 따라 미제공 영역을 유지했다. 이후 사용자가 제한된 내부 개발 환경의 실제 파일 시연을 명시적으로 요청해 아래 개발 세션에 연결했다.
- 보호 전송은 기존 `/media/exercises/v1/{sourceExerciseId}.gif`의 세션·회원 허용 목록·대표 원본·Nginx 승인과 `no-store` 계약을 따른다. 실제 GIF 연결은 제공 권리 승인, 해당 표준 UUID의 대표 원본 지정, 권한이 있는 검토 계정과 보호 경로 전달이 확인된 뒤 진행한다. [미디어 계약](../../../overload-server/docs/engineering/standard-exercise-handoff.md#로컬-gif-제공)
- 검토 경로는 전체 설정 → 운동 종목 보기 → **하이 로우** 검색 → **머신 하이 로우** 선택이다. 기존 4173번 `ui-review` 구성과 LAN 주소를 사용했으며 최종 UI 승인은 아래에 기록한다. 실제 상세 API·DB·보호 미디어 등록은 후속 범위다.
- 전체 자동 테스트 551건, Lint, 타입 검사·빌드를 통과했다. 같은 LAN 검토 서버의 Chrome 1280×900·320×568·393×852에서 4단계 설명의 접힘·펼침, PRIMARY 2개·SECONDARY 3개, 검색·필터와 목록 스크롤 복원 및 가로 넘침 없음을 확인했다. Mock API·미디어 요청은 모두 0건이며 iPhone Safari 실기기 결과는 별도 사용자 검토 대상이다.

##### 개발용 GIF 세션과 CATALOG-02 최종 UI 승인

- 2026-11-12 사용자가 CATALOG-02 UI를 최종 승인했다. 제목은 **동작 시연**, 표시 영역은 콘텐츠 너비의 1:1 정사각형으로 확정했다. 이미지는 `object-fit: contain`으로 원본 비율을 보존하며 잘라내지 않는다. 원본 GIF의 흰색 배경·180×180·12프레임·프레임별 시간(0·6번은 1초, 나머지는 0.1초, 합계 3초)·무한 반복을 유지한다. 중간 검토의 배경 제거와 APNG 변환은 취소하고 해당 제공 코드를 제거했다.
- 실제 계정에 로그인하지 않는 기존 Mock 모드에만 별도 미디어 검토 세션을 적용했다. `OVERLOAD_REVIEW_GIF_FILE`은 저장소 밖의 확인된 단일 원본 `nZZZy9m.gif`를 가리키고 `OVERLOAD_REVIEW_MEDIA_KEY`는 서버 환경에만 둔다. 기존 사설 LAN 허용 범위와 지정 Origin 검사 후 접근키로 8시간의 HttpOnly·SameSite=Strict 미디어 전용 쿠키를 발급한다. 검토 링크의 fragment 접근키는 인증 시 주소에서 제거한다. 로컬 키 파일은 Git 제외 경로에 보관한다.
- 개발 전용 `/__review-media/v1/nZZZy9m.gif`는 검토 세션과 접속 주소를 확인한 뒤 원본 바이트를 `image/gif`·`no-store`로 응답한다. 비인증 요청, 다른 Origin, 직접 원본·변환 미디어 경로와 검토키·캡처를 담은 `logs` 경로의 정적 접근을 차단한다. 원본·변환 파일·접근키는 공개 자산·프로덕션 빌드·커밋 대상에서 제외한다.
- GIF는 하이 로우 표준 UUID에만 연결하고 **개발용 미디어 시연**을 표시한다. 로딩·접근 실패에는 기존 미제공 표시를 사용한다. 기존 4단계 설명, PRIMARY·SECONDARY 순서와 첫 PRIMARY의 핵심 표시, 검색·필터·스크롤 복원 및 전체 설정 화면을 유지한다.
- 실제 계정의 `/media/exercises/v1/` 경로는 Backend 회원 권한·대표 원본·권리 승인과 보호 경로 전달 계약이 필요하다. 현재 시연은 실제 UUID 상세 API 연동이 아니며, 실제 상세 API·카탈로그 데이터·회원용 보호 미디어 연결은 별도 후속 작업으로 남긴다. Backend·PostgreSQL·Flyway·계정·기록·백업은 변경하지 않는다. 사용자 최종 UI 승인과 에이전트의 실제 iPhone Safari 검증은 구분하며 후자는 이번 실행에서 미검증이다.
- 최종 원본 GIF 적용 후 `node --test tests/review-media.test.mjs tests/preset-review.test.mjs` 2건, `npm run lint`, 타입 검사(`tsc -b`)를 포함한 `npm run build`를 통과했다. 같은 LAN 서버의 Chrome 1280px·320px·393px에서 흰색 배경·프레임 변화·반복, 4단계 설명 펼침·접힘, 근육 순서·핵심 표시, 검색·필터·스크롤 복원, 목록·설정 복귀와 오류 대체 표시를 확인했다. 영역은 각각 440×440·262×262·315×315 CSS px, 이미지는 테두리를 제외한 438×438·260×260·313×313이며 원본 비율과 전체 동작을 보존한다.
- 원본 해시와 인증 응답 바이트 일치, 비인증·다른 Origin·직접 파일·검토 캡처 접근 차단과 `no-store`를 확인했다. Production 산출물 20개와 Git 변경 파일에서 원본·변환 미디어·실제 접근키 제외를 확인했다. 500kB 초과 청크 경고는 직전 검토 빌드와 같은 JS·CSS 산출물(주 JS 548.05kB)에서 발생하며 번들 구조는 변경하지 않았다.
- 검증 후 원래 PID 54960과 원본 GIF 설정으로 재시작한 PID 53164의 Node 실행 파일·Vite 명령행·PWA 실행 작업 경로·4173 포트 소유권을 확인했다. 각 전용 콘솔의 프로세스 구성을 확인해 Ctrl+C로 정상 종료했으며 최종 4173 리스너가 없음을 확인했다. 다른 Node·Backend·PostgreSQL·데이터·백업은 종료하거나 초기화하지 않았다. 승인된 CATALOG-02 UI와 개발용 미디어 시연을 로컬 커밋으로 마감하며 실제 UUID API 연동은 미착수다.

#### SETTING-01 전체 설정 검토와 구현 조사

아래는 전체 메뉴가 Mock 경로에만 적용됐을 당시의 비교 기록이다.

2026-11-12, `251a874`와 현재 작업 트리 및 설정 관련 Git 이력을 비교했다. 계정 앱의 기존 기능 삭제에 해당하는 유형 A는 발견하지 못했다. `RoutinePreview`의 설정 탭은 기준 HEAD에서도 홈·루틴 검토 안내만 표시했고, CATALOG 작업에서 카탈로그 카드만 추가한 축약 화면이었다. 현재 전체 검토 화면은 기존 계정 기능의 검토 누락인 유형 B와 실제 계정 경로에 미구현된 유형 C를 함께 표시한다.

| 설정 항목 | 기준 HEAD의 React 구현과 현재 계정 경로 | 검토 화면의 조치 |
| --- | --- | --- |
| 계정 정보 | `AuthApp`에서 `AccountSettings`로 진입한다. 로그인 수단·대표 이메일·OTP·연결/해제를 실제 controller에 연결했다. | 공통 `AccountSettingsPage` 구획을 재사용해 합성 계정의 조회 예시와 복귀를 제공한다. |
| 세트 사이 휴식 | `WorkoutWorkspace`에서 계정별 저장값을 조회한다. PATCH API 메서드는 있으나 계정 UI의 저장 핸들러는 연결되지 않았다. | 기존 조회 카드 `RestTimeCard`를 추출해 양쪽에서 재사용한다. Mock에는 예시 180·120·90초를 표시한다. |
| 휴식 타이머 알림 | 정책·HTML 시연 단계다. 현재 계정 설정 UI에 연결돼 있지 않다. | 미구현·비활성 메뉴를 표시한다. |
| 운동 종목 보기 | 기존 카탈로그 GET 목록에서 현재 CATALOG-01·02로 이동한다. | 같은 `CatalogView`를 전체 설정 메뉴에 연결한다. |
| 디로딩 설정 | 홈의 분석·기간 조회와 별개로 설정 변경 UI는 후속이다. | 미구현·비활성 메뉴를 표시한다. |
| 운동 데이터 상태 | 진행 운동의 로컬·서버 상태 보호는 구현돼 있으며 별도 설정 상세는 미구현이다. | 미구현·비활성 메뉴를 표시한다. |
| 운동 데이터 내보내기 | 실제 계정의 내보내기 UI·요청 경로는 미구현이다. | 미구현·비활성 메뉴를 표시한다. |
| 앱 설치·오프라인 준비 | `AuthApp`의 `PwaStatus`로 안내·설치·업데이트를 제공한다. | 같은 컴포넌트의 검토 모드에서 안내를 제공한다. |
| 전체 운동 데이터 초기화·회원 탈퇴 | 실제 계정 설정의 화면·핸들러는 미구현이다. | 미구현·비활성 메뉴를 표시한다. |
| 로그아웃 | `AuthApp`의 확인 대화상자와 초안 보호를 거쳐 실제 controller에 연결된다. | 확인·취소 시안을 제공하며 실행 버튼은 비활성이다. |

`/auth-preview`에는 내보내기·초기화·탈퇴를 포함한 별도의 가상 인증 시연이 기존부터 있다. `/demo`의 휴식 편집·로컬 저장 안내·Health도 독립된 로컬 데모 기능이다. 두 경로는 현재 계정의 실제 설정 기능으로 집계하지 않는다. 과거 `workout-read`의 제거된 휴식 표시는 조회 전용이었으며 현행 조회 카드로 이어졌다.

전체 Mock 시연은 기존 `ui-review`의 `/routine-preview?tab=settings`에서 계정 정보 → 운동 설정 → 데이터 및 앱 → 계정 및 데이터 삭제 → 로그아웃 순으로 제공한다. 기존 계정·인증·루틴·기록의 실제 동작은 해당 계정 경로에서 검증한다. 2026-11-12 CATALOG 마감에 포함해 시연 환경 보완을 커밋하며 위 미구현 기능은 후속 범위다.

전체 자동 테스트 551건과 타입 검사·빌드를 통과했다. 기존 4173번 LAN 서버의 격리 Chrome 320×568·393×852 터치 검증에서 마지막 설정 메뉴와 카탈로그 마지막 행 접근, 검색·필터·목록 스크롤 보존, 상세·목록·설정 복귀를 확인했다. Mock API 요청은 0건이었다. 사용자의 CATALOG 검토·커밋 승인은 위 마감 기록을 따르며, 별도 iPhone 실기기의 기종·Safari 관찰 결과는 이번 자동화 검증 기록에 포함하지 않는다.

<a id="catalog-0102--setting-01-실제-계정-마감"></a>

#### CATALOG-01·02 / SETTING-01 실제 계정 마감

2026-11-12 사용자가 현재 화면과 기능을 직접 확인하고 최종 승인했다. PWA 구현은 `9c276d5`, Backend 검토 실행 스크립트는 `ed70174`에 기록했다.

- CATALOG-01은 인증된 `GET /api/v1/standard-exercises/catalog`의 공개 운동에 이름·별칭 검색과 부위 필터를 적용한다. CATALOG-02는 선택한 표준 UUID로 `GET /api/v1/standard-exercises/{exerciseId}`를 호출하고 응답 UUID·필드를 검증한다. PRIMARY 순서와 첫 `핵심` 표시, SECONDARY, 분할·기구 설명·`instructionSteps`, 빈 값과 오류 상태를 처리한다. 상세에서 목록으로 돌아오면 검색어·필터·스크롤과 포커스를 복원한다. [계약](../../../overload-server/docs/api/standard-exercise-catalog.md)
- SETTING-01의 실제 계정과 Mock은 `SettingsMain`의 공통 정보 구조를 사용한다. 실제 계정 정보·휴식 시간 조회·카탈로그·PWA 상태·로그아웃을 기존 핸들러에 연결했다. 휴식 타이머 알림, 디로딩 설정, 운동 데이터 상태·내보내기, 전체 운동 데이터 초기화, 회원 탈퇴는 미구현 표시와 함께 비활성이다.
- V35 전용 검토 DB의 머신 하이 로우 한 종목에 원본 `nZZZy9m.gif`를 대표로 지정했다. 검토 전용 매핑은 같은 출처의 보호 경로를 사용한다. 기존 세션·회원 허용 행·대표 출처를 확인하고 `no-store`로 전송한다. **동작 시연**의 1:1 영역과 `object-fit: contain` 안에 흰색 배경 원본을 표시한다. 원본은 180×180px, 12프레임, 3초 주기 무한 반복이며 AscendAPI 출처를 표기한다. [보호 미디어 계약](../../../overload-server/docs/api/standard-exercise-catalog.md#보호-gif-전송과-ui-계약)
- 로컬 내부 검토 전용 계정은 구현된 앱 기능과 시연 대상 미디어의 열람 권한을 허용하는 것을 기본으로 한다. 실제 로그인·사용자 소유권·회원 권한 검사는 유지한다. 운영 계정 정책과 정식 미디어 제공은 별도다. 실제 파일·접근키·토큰·검토 전용 GIF 매핑은 프로덕션 산출물에 포함하지 않는다.
- 이전 작업 보고의 검증 결과다. 실제 V35 목록·상세 31종을 대조했고 Chrome 1280px·320px·393px에서 계정 설정·검색·필터·복귀와 원본 GIF 프레임 반복을 확인했다. 보호 응답은 인증 `200`과 원본 바이트 일치·`no-store`, 비로그인 `401`, 다른 종목 `404`였다. 설정 작업의 전체 자동 테스트 558건·관련 회귀 49건, GIF 작업의 관련 테스트 6건·Backend 보호 GIF 통합 1건, Lint·타입 검사·빌드가 통과했다. 이 수치는 단계별 실행 결과다. 자동 검증에서 실제 iPhone Safari는 사용하지 않았으며, 사용자의 직접 확인 및 최종 승인과 구분한다. 최종 마감에서는 테스트·Lint·타입 검사·빌드·화면 검수를 재실행하지 않았다.
- 마감 시 4180 프런트엔드, 3838 Backend 및 1954 제어 서비스, 3840 미디어 권한 검사·4181 Nginx를 정상 종료했다. V35 tmpfs PostgreSQL 32778은 종료 전에 Git 제외 경로에 전체 덤프를 보존했고, 해시·43개 테이블·주요 행 수와 전체 SQL 읽기를 확인한 뒤 종료했다. 새 DB로 복원 실행은 하지 않았다. 검토 포트 6개는 모두 해제됐다. [종료 및 복원 경계](../../../overload-server/docs/engineering/test-environment.md#catalog-검토-종료-기록)
- 후속 범위는 비활성 설정 기능의 실제 연결, 정식 제공용 대표 경로 전달과 미디어 권리·배포 설정, 실제 iPhone Safari 및 신뢰된 HTTPS 설치형 PWA 검증이다.

#### 현황 갱신

Frontend 작업 담당자는 [공통 갱신 기준](../../../overload-server/docs/engineering/backend.md#현황-갱신)에 따라 이 절의 해당 항목을 갱신한다. 화면 작업은 [UI 단계 A~D](#181-기본-ui-개발-절차), 사용자 승인과 실기기 검증 범위를 함께 기록한다. 서버 쪽 상태는 [Backend 개발 현황](../../../overload-server/docs/engineering/backend.md#11-현재-개발-현황)으로 연결한다.

#### 화면별 구현 근거

[UI/UX 적용 지점](../product/ui-ux.md)의 화면별 링크를 사용합니다. 무채색 HTML은 배치와 조작의 시연이고 [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)은 실제 색상·위계의 기준입니다. 검색·선택에는 [원본 PNG 6종](../product/assets/exercise-icons/README.md)을 32 CSS px로 재사용합니다.

게이지·누적 종목 위치·주간 상태·완료/취소 컨트롤·수행값/장비 텍스트 위계·물음표 도움말의 공식 절은 [UI/UX 적용 지점](../product/ui-ux.md)을 참조합니다. 공통 컴포넌트와 역할 토큰을 사용하고 테마 변경으로 입력·타이머를 초기화하지 않습니다. Visual Theme Spec의 작은 도움말 시각 크기를 실제 터치 영역 축소로 해석하지 않습니다.

[T01 공통 기반](../tasks/ui-v09-t01-foundation-report.md)에서 실제 계정의 홈/루틴/기록/설정 4탭과 Onyx 토큰·CSS Modules, 공통 표현을 적용했습니다. 인증·운동 controller와 저장·동기화 계약은 재사용합니다. 운동 집중 화면과 루틴 편집에서는 탭을 숨기며, 운동 홈 복귀와 탭 이동은 초안 저장 결과 및 계정 경계를 확인합니다. 운동 편집기는 탭 숨김으로 재마운트하지 않습니다. 운영 셸은 일반 테마이며, 개발 전용 `/ui-foundation`에서만 두 테마·입력·타이머·아이콘을 검증합니다. 이 화면은 프로덕션 번들에서 제외됩니다.

당시 [T02-A 홈 설계 일치 수정](../tasks/ui-v09-t02a-design-review-report.md)에 이은 [홈 세부 개선](../tasks/ui-v09-t02a-home-details-report.md)은 Decision Log 10.12절의 공식 달 헤더·날짜·글자 크기·선택 자동 닫힘·종목 달성 표시를 반영한다. 최근 운동은 종료 목록을 최대3페이지(60건), 상세 동시4개로 읽고 무수행을 홈에서만 제외한다. 분모는 InitialPlan, 분자는 기존 주간 달성 계약의 현재 유효 수행이며 승인 eligible과 구분한다. 당시 태그는 선택형 표현만 준비했고 저장은 T02-B 계약 대상이었다. 당시 실제 루틴·일정·기록은 기존 API를 읽었으며 디로딩 게이지의 대표 표시값은 개발 검토 앱에만 주입했다. 현행 계정 홈은 서버 분석·기간 상태를 읽는다. `DEV && VITE_HOME_REVIEW` 진입점은 production build에서 제거되며 시안 값을 운동/자격/권한/통계·IndexedDB에 사용하지 않는다. 검토 서버만 전용 계정의 실제 OTP 메일 전달을 자동화한다. HTTP LAN의 로그인·기기 식별은 기존 CSPRNG UUID 함수를 공통화해 지원하지만, Web Locks가 없는 홈에서는 새 운동 START를 비활성화한다. 기존 편집 잠금·고정 요청·ACK·오프라인 경계는 유지한다. 설치형 PWA는 별도 production/HTTPS 검증 대상이다.

[최종 시각 보완](../tasks/ui-v09-t02a-home-final-visual-report.md)에서 브랜드18px/700/자간0.06em을 적용하고, 동일 격리 검토 DB에 기존 루틴의 혼합 달리기 완료 기록1건을 실제 API로 추가했다. 이후 [최종 디테일](../tasks/ui-v09-t02a-home-polish-report.md)에서 공식 원형 아령 SVG·아이콘–수치 gap5px·제목 아래 구분선을 적용했다. 당시 태그 저장은 후속이었으며 현재는 T02-B 루틴 계약에 연결되어 있다.

T02-A 일반 홈은 2026-11-06 iPhone 실기기에서 최종 승인됐다. 보존된 검토 환경의 재개 승인·버전 확인·종료는 [테스트 환경 안내](../../../overload-server/docs/engineering/test-environment.md)를 따른다.

#### T02-B 단일 일정 연결 (2026-11-07 기록)

아래는 당시 계정 경로의 단일 일정 구현 기록이다. 표의 단일 일정 API는 T02 실제 연동에서 교체됐다. 최신 Backend의 프리셋 DTO·쓰기 계약은 [주간 일정 API](../../../overload-server/docs/api/weekly-schedule.md)를 따른다.

| 실제 모듈 | 책임·연결 |
|---|---|
| [WorkoutWorkspace.tsx](../../src/features/workout-online/WorkoutWorkspace.tsx) / `WorkspaceView` | `editor{routine,readOnly}`와 `scheduleEditing` 관리. 목록/공통 폼 연결. `scheduleRefresh`·`onScheduleSaved`로 홈/루틴 재조회. ACTIVE·고정 시도는 관리 쓰기 차단 |
| [RoutineCards.tsx](../../src/features/workout-online/RoutineCards.tsx) | 로컬 `day/vertical/filter`; 생성순 정렬·단일 목록 필터·요일 잠금. 서버 assignments로 배정 카드/주간 보기 파생, `Home.module.css` 재사용. 상세/수정/삭제 콜백 분리 |
| [RoutineForm.tsx](../../src/features/workout-online/RoutineForm.tsx) | 생성·편집·readOnly 공통 폼. 이름·태그·WEIGHT·CARDIO 초안과 고정 제출. 2026-11-09 변경에서 요일 조작과 일정 PUT을 분리했다. 다른 종목은 새 배치, 원승인 전이 금지 |
| [TagPicker.tsx](../../src/features/workout-online/TagPicker.tsx) | 미지정+10종·기존 설명 드롭다운, 키보드/ESC/바깥 닫힘. 태그는 실제 nullable 루틴 DTO이며 더미 분류가 아님 |
| [ExerciseSearch.tsx](../../src/features/workout-online/ExerciseSearch.tsx) | 추가·변경 공통 검색, 실제 카탈로그 이름/별칭·`ExerciseIcon`·PRIMARY 표시. 폼의 `searchRegion`/`showPicker`가 스크롤·포커스, 입력 보존 담당 |
| [WeeklySchedulePanel.tsx](../../src/features/statistics/WeeklySchedulePanel.tsx) / `ScheduleEditor` | 편집을 별도로 표시. saved assignments 기준 후보 필터,7일 초안 보존. 배정 유무/태그/전체3개 고정, 필터 밖 선택 option도 원래 이름 유지. 열려 있는 초안은 외부 refresh로 덮지 않음 |
| [weekly-schedule.ts](../../src/features/statistics/weekly-schedule.ts) / [routine-schedule.ts](../../src/features/workout-online/routine-schedule.ts) | `WeeklyScheduleApi.read/save`, `saveSchedule`가 저장 전 최신 version과 응답 후 GET 비교. immediate-v1·expectedVersion·appliedAt, 충돌시 초안 유지/조용한 병합 금지. 구 history 메서드가 코드에 남아 있으며 최신 Backend에서 해당 경로 제거 |
| [HomePanel.tsx](../../src/features/home/HomePanel.tsx) / [model.ts](../../src/features/home/model.ts) | 실제 일정·overview에서 `dayStatus` 파생. 미판정 요일/✓/X/-; 과거 날짜만으로 미수행 생성 금지. refreshKey로 일정 변경 반영 |
| [AchievementIcon.tsx](../../src/components/AchievementIcon.tsx) | 공식 아령 SVG/running.png18px. 최근 운동은 최초 계획 달성 분수, 루틴 세로는 등록 종목 수로 사용 의미 구분. 검색용32px 아이콘은 변경하지 않음 |

`assignments/version/timeZone/appliedAt`은 당시 PWA의 단일 일정 응답이다. 쿼리 없는 조회, 프리셋별 쓰기, 상태·프리셋 버전, 수동 적용·순환은 [현행 Backend 계약](../../../overload-server/docs/api/weekly-schedule.md)을 사용한다. 04시 검사와 과거 근거는 계속 서버 책임이다.

루틴/일정 쓰기는 기존 온라인 인증·CSRF·소유권·세대/version을 사용한다. 진행 운동의 IndexedDB3/schema2·snapshot·ACK·writerEpoch·계정 경계는 그대로다. 문서용 HTML은 독립 합성 상태로만 동작하며 운영 데이터나 고정 요청을 수정하지 않는다. T02-A [마감 문서](../tasks/ui-v09-t02a-closeout.md)의 당시 종료/재개 절차는 환경 보존 기록이며 이번 문서 작업에서 서버를 시작·종료하지 않는다.

| 영역 | 현재 계정 경로의 구현 | 후속 구현할 내용 |
|---|---|---|
| 홈·루틴 | [T02-A](../tasks/ui-v09-t02a-home-report.md)의 `HomePanel`이 실제 루틴 상세·주간 일정·통계 overview·세션 상세로 오늘 카드의 WEIGHT/CARDIO, 카드 밖 START, 두 줄 오늘만 선택, 월~일 상태, 최근 기록을 표시합니다. 날짜는 일정의 시간대를 사용하고 UNKNOWN/UNVERIFIABLE은 미수행으로 추정하지 않습니다. 상세는 버전별 재사용하며 새로고침 때 목록과 일정을 재조회합니다. START는 기존 controller에서 처리하며 직전 루틴 버전 변경은 재확인을 요구합니다. 루틴 탭의 온라인 관리와 `WeeklySchedulePanel` 일정 편집은 유지합니다. | 최신 iPhone Safari·설치형 PWA와 G6의 분석 설정 쓰기·디로딩 일정 연동. 미조회·로딩·실패를 분석 OFF나 0주로 대체하지 않습니다. |
| 운동 진행 | `LocalWorkoutScreen`의 세트 완료·취소, 타이머·임시 편집·유산소 입력, 공통 `RepsInput`의 ±1과 직접 입력. | 기존 기록/이번 기록 배치를 재사용합니다. 공통 3열 가운데는 현재 탐색 위치와 표시 대상 종목 수로 파생합니다. 종목 이동·임시 계획 변경 때 갱신하며 완료율이나 별도 저장 필드로 다루지 않습니다. 반복 조작은 초안에만 적용하고 기존 완료 검증·타이머를 보존합니다. |
| 운동 결과·기록 | 기록 탭에서 `ClosedWorkout`의 서버 종료 기록, 당시 장비, 정정·논리 삭제·선택 복구 및 평가에 접근합니다. | 결과와 과거 상세의 공통 수행 영역을 WEIGHT/CARDIO로 나누고 세트별·종목별 볼륨을 표시합니다. 당시 계획과 현재 유효한 실제 수행, 최초 평가와 현재 평가를 구분합니다. 데이터 갱신은 기존 세션 확인과 ACK 흐름을 사용합니다. |
| 카탈로그·통계 | `ExerciseSearch`의 표준 검색, 기록 탭의 `StatisticsPanel` 기간/집계·근육 상세와 `GrowthPanel` 종목·배치 검색을 유지합니다. 근육 화면은 대분류가 기본입니다. 공통 `ExerciseIcon`은 원본 6종을 32px로 제공하며, 현재 분류가 없는 검색 결과는 중립 표시입니다. | 카탈로그 분류 계약 후 대표 아이콘을 매핑합니다. 전체 세부 PRIMARY 기본 표시 및 부위 필터·SECONDARY 펼침을 적용합니다. 운동 현황 필터를 막대와 합계에 일관되게 전달하고, 성장 별칭 검색과 제조사별 참고 집계의 API 범위는 [백엔드 연동 설계](backend-ui-v0.9.md)를 확인합니다. |
| 설정·인증·PWA | 설정 탭에 기존 계정 상세, 세 휴식 값 조회, 데이터 및 앱의 `PwaStatus`, 하단 로그아웃을 배치했습니다. 로그인 화면에는 설치 패널을 표시하지 않습니다. 기존 초안 저장 확인과 로그아웃 경고를 유지하고 공통 Help 팝오버를 제공합니다. | 고정 세 휴식 시간의 온라인 일괄 편집, 독립 설정 토글과 화면별 도움말 배치를 확장합니다. 유실·미전송·재인증 경고는 기존 접근 가능한 상태 영역에 남깁니다. |
| 디로딩 | 일반 세션·기록·통계와 V30·V31 일정은 연동됐다. 홈의 분석·현재 기간 조회와 일반 쓰기 보호를 적용했다. 디로딩 변경과 혼재 세션 표시·동기화는 G6 범위다. | 기존 홈·루틴·운동 진행·기록을 재사용합니다. 상세·선택·미리보기와 시작 요청을 연결하고 최신 자격 실패 이유를 노출합니다. 완료·취소는 진행 상세의 단일 확인으로 처리합니다. |

**상태 소유권.** 분석 설정·시작 자격·기간·세션 소속은 서버 응답에서 읽습니다. `일반 보기 / 디로딩 복귀`는 홈에서만 바꾸는 조회 상태이며 루틴·기록 탭 이동 동안 유지합니다. 진행 중 일반 보기에서는 원본 실행·정정·수정·삭제를 제공하지 않습니다. 서버 권한 검증은 별도로 적용됩니다. 미리보기 선택과 편집 초안은 로컬 UI 상태이고, 기간 시작·완료·취소는 서버 확인 이후 표시합니다.

**실패·오프라인.** 새 디로딩 시작과 기간/임시 일정 변경은 서버 자격과 상태 확인이 필요합니다. 이미 시작한 운동은 기존 명시적 오프라인 이어가기, 계정·세대 경계, DB3/schema2, 고정 요청과 재연결 검사를 재사용합니다. 미전송과 서버 저장, 자격 미달과 조회 실패를 각각 표시합니다. 저장 실패·재인증·상태 충돌에서는 초안을 보존하고 기존 저장·복구 경로를 사용합니다. 8~10일차 안내는 운동 수행 중 표시하지 않으며, 종료 시점과 미동기화 수행의 조정은 백엔드 연동 설계의 검증 대상입니다.

**A/B 실험 이력.** 당시 `codex/ui-v09-spike` 작업 트리의 `experiments/ui-v09/`에서 홈·운동·통계 방식을 비교했으며, CSS Modules 55줄/Tailwind 70줄(빈 줄 제외)과 모바일 조작 통과는 당시 측정 기록입니다. 작업 트리·비교 소스·산출물은 실험 종료 후 삭제했으므로 현재 구현 자산으로 참조하거나 복원하지 않습니다. 실제 구현은 공식 설계와 현재 계정 경로의 계약을 따릅니다.

**실험 종료.** A/B 기술 비교는 종료되었으며 테스트 브랜치·worktree·프로토타입·산출물은 삭제했습니다. 과거 실험 참고 문구의 경로·측정값은 당시 기록이며 현재 파일 존재를 뜻하지 않습니다. 실제 구현은 위 공식 설계 자료와 현재 계정 경로의 계약을 기준으로 진행합니다.

**수용 확인.** 분석 ON/OFF·진행·일반 보기·완료 당일의 헤더와 탭 전환, 시작 직전 자격 변화, 완전 휴식, 8~10일차, 미전송 보존을 확인합니다. 세트 취소·재완료, 장비 원본, 숫자 키패드와 터치 영역, 작은 화면의 두 줄 목록·주간 일정, 초점 복귀와 팝오버 닫기를 검증합니다. iPhone/Android에서 설치·백그라운드 복귀와 안전 영역을 별도로 확인합니다.

#### T03.5 휴식 타이머 시각·효과음 알림

[Decision Log 10.17절](../product/Overload_UI_Decision_Log_v0.9.md#1017--휴식-타이머-시각효과음-알림)의 확정 정책을 따릅니다. **로드맵**에서 T01 기존 작업을 유지하고, T02 화면별 UI 이후 T03.5를 진행합니다. T03 디로딩 API 계약 연결과 병행할 수 있으며 T04 디로딩 UI 통합 전까지 마칩니다. T05의 후속 통합·검증 범위는 유지합니다. 현재 산출물은 문서와 HTML 시연입니다.

- 기존 휴식 종료 예정 시각과 현재 시각에서 파생한 남은 초를 재사용합니다. 타이머·시각 알림·효과음이 같은 시간 기준을 쓰고 CSS 애니메이션 횟수로 시간을 계산하지 않습니다. 연장·종료·복귀 때는 현재 남은 시간으로 알림을 판단합니다.
- 화면의 반전 상태는 3열 시간 정보 바 컨테이너에만 적용합니다. [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)의 역할별 토큰을 사용해 글자·진행 바 대비를 유지하며, reduced-motion에서는 정적 강조를 제공합니다.
- 효과음은 Web Audio를 검토합니다. 사용자 입력에 따른 오디오 활성화와 브라우저 자동 재생 제한을 처리하고, 재생 실패를 타이머와 기록 저장에서 분리합니다. iPhone Safari·설치형 PWA에서 음악 앱과 동시 재생, 화면 잠금·백그라운드·복귀, 3열 바 반전을 검증합니다.
- 알림 설정은 기존 휴식 시간 값과 분리해 앱 재실행 후 유지합니다. 기기 로컬 설정을 사용할 수 있으며 전용 서버 API·DB 변경은 전제하지 않습니다.

---

## 9. 운동 기록 입력 UX

Overload의 핵심 기능은 운동 기록 입력입니다.

따라서 일반적인 UI보다
입력 속도와 데이터 정확성을 우선합니다.

### 9.1 세트 입력

세트 입력 시 다음 원칙을 적용합니다.

- 중량과 반복 횟수를 빠르게 입력할 수 있어야 합니다.
- 모바일 숫자 키패드 사용을 고려합니다.
- 입력 중인 값을 임의로 초기화하지 않습니다.
- 이전 세트의 값을 참고할 수 있도록 설계합니다.
- 세트 완료 상태를 명확하게 표시합니다.
- 잘못된 입력에 대해 구체적인 안내를 제공합니다.

### 9.2 숫자 입력

중량 입력은 소수 값을 고려합니다.

예시:

```text
60
62.5
80
```

규칙:

- 중량 입력은 소수점 사용을 고려합니다.
- 반복 횟수는 정수 입력을 기본으로 합니다.
- 입력 도중의 빈 문자열을 유효한 편집 상태로 허용합니다.
- 0과 값이 없는 상태를 구분합니다.
- 사용자의 입력 중에는 불필요한 자동 포맷을 피합니다.
- 최종 제출 시 정규화 및 유효성 검증을 수행합니다.
- 음수 및 허용 범위는 도메인 규칙에 따라 처리합니다.
- 사용자 로케일에 따른 소수점 입력 차이를 고려합니다.

모바일 키패드 표시를 위해
`inputMode` 등의 HTML 속성을 활용할 수 있습니다.

다만 입력 타입 및 키보드 동작은
실제 iPhone Safari에서 확인합니다.

### 9.3 기록 보존

다음 상황에서 기록 유실을 방지하도록 설계합니다.

- 화면 전환
- 실수로 뒤로 가기
- 네트워크 연결 끊김
- API 요청 실패
- PWA 백그라운드 전환
- 앱 재실행
- Service Worker 업데이트

중요한 입력 데이터는 메모리 상태에만 의존하지 않습니다.

오프라인 저장 기능이 구현되기 전에는
기록 보존을 보장한다고 표시하지 않습니다.

### 9.4 사용자 피드백

다음 상태를 명확하게 구분합니다.

- 입력 중
- 로컬 임시 저장
- 서버 저장 중
- 서버 저장 완료
- 서버 저장 실패
- 동기화 대기
- 데이터 충돌

로컬 저장 성공을 서버 저장 완료로 표시하지 않습니다.

### 9.5 중복 입력 방지

- 동일한 버튼이 의도치 않게 연속 실행되지 않도록 합니다.
- 요청 처리 중 중복 제출 가능성을 검토합니다.
- 화면 재진입 시 기존 요청 상태를 고려합니다.
- 중복 기록 방지에는 서버의 멱등성 정책과 협력합니다.

---

## 10. 라우팅 및 화면 관리

### 10.1 Routing

현재 React 화면 상태 기반 내비게이션을 유지합니다.
React Router는 미도입이며, 채택하는 경우 아래 라우터 관련 지침을 적용합니다.

- 화면 경로를 일관되게 정의합니다.
- 라우터 설정을 여러 위치에 분산하지 않습니다.
- 인증이 필요한 화면에 적절한 접근 제어를 적용합니다.
- 존재하지 않는 경로에 대한 화면을 제공합니다.
- 뒤로 가기 동작을 고려합니다.

### 10.2 화면 상태

모든 주요 화면은 필요한 경우 다음 상태를 처리합니다.

```text
Initial
   |
   v
Loading
   |
   ├── Success
   |
   ├── Empty
   |
   └── Error
```

오프라인 기능이 있는 화면에서는
로컬 데이터 및 동기화 상태도 함께 고려합니다.

### 10.3 화면 전환

- 화면 전환 시 입력 중인 데이터의 보존 여부를 확인합니다.
- 저장되지 않은 기록이 있는 경우 이탈 동작을 신중하게 처리합니다.
- 브라우저 History 동작을 고려합니다.
- 직접 URL로 접근해도 화면이 정상적으로 표시되도록 합니다.

---

## 11. PWA 개발 규칙

### 11.1 기본 원칙

Overload는 PWA 방식으로 배포합니다.

주요 목표:

- 홈 화면 설치
- 독립 실행형 화면
- 모바일 최적화
- 정적 리소스 캐싱
- 네트워크 오류 대응
- 오프라인 기록 지원

PWA는 네이티브 앱과 완전히 동일한 실행 환경이 아닙니다.

운영체제 및 브라우저의 기능 제약을 고려합니다.

### 11.2 Web App Manifest

Manifest에는 필요한 앱 정보를 정의합니다.

- 앱 이름
- 짧은 앱 이름
- 앱 아이콘
- 시작 URL
- 표시 모드
- 테마 색상
- 배경 색상

Standalone 모드를 기본 방향으로 검토합니다.

앱 아이콘은 지원 환경에 맞는 크기와 형식으로 제공합니다.

설치 및 실행 동작은 실제 기기에서 확인합니다.

### 11.3 Service Worker

`vite-plugin-pwa`는 미도입입니다. 도입을 검토하고 승인된 범위에서 채택할 때 아래 지침을 적용합니다.

Task 009 5E는 새 의존성 없이 Vite 빌드 플러그인과 네이티브 Service Worker로 구현했습니다. [5E 보고서](../tasks/task-009-frontend-5e-report.md)의 정적 파일 허용 목록·해시 검증·인증 캐시 제외·업데이트 대기 계약을 유지합니다. 운동 IndexedDB는 기존 페이지 편집기만 작성하고 Service Worker는 버전 호환 확인만 수행합니다.

- Service Worker의 역할을 명확하게 유지합니다.
- 캐싱 대상과 제외 대상을 구분합니다.
- 정적 리소스와 사용자 데이터를 동일하게 취급하지 않습니다.
- 인증이 필요한 API 응답을 무분별하게 캐싱하지 않습니다.
- 저장되지 않은 운동 기록을 보호합니다.
- 캐시 갱신과 데이터 저장을 별개로 관리합니다.

### 11.4 캐싱 전략

캐싱 대상별 특성을 고려합니다.

| Resource | 기본 방향 |
|:---|:---|
| HTML / JS / CSS | 버전 기반 정적 캐싱 |
| App Icons | 정적 캐싱 |
| Public Assets | 적절한 캐싱 정책 |
| Authentication API | 일반적인 캐싱 대상에서 제외 |
| Personal Workout API | 무분별한 캐싱 금지 |
| Offline Workout Draft | IndexedDB 기반 별도 관리 |

최종 캐시 전략은 실제 사용 패턴과
보안 요구사항을 고려하여 결정합니다.

### 11.5 PWA 업데이트

Service Worker 업데이트 과정에서
사용자 입력이 사라지지 않도록 설계합니다.

원칙:

- 작성 중인 기록이 있을 때 강제 새로고침하지 않습니다.
- 업데이트가 가능한 경우 사용자에게 안내합니다.
- 데이터가 안전하게 저장된 상태에서 업데이트하도록 합니다.
- 새 버전 적용 실패 및 복구 상황을 고려합니다.

운동 기록 화면에서는
사용자 선택 기반 업데이트 방식을 우선 검토합니다.

### 11.6 iPhone Safari 호환성

다음 항목을 실제 iPhone에서 검증합니다.

- 홈 화면 설치
- Standalone 실행
- 화면 크기 및 Safe Area
- 가상 키보드 동작
- 입력값 유지
- 뒤로 가기 및 화면 전환
- 백그라운드 복귀
- 저장소 접근
- 네트워크 재연결
- Service Worker 업데이트

브라우저 개발자 도구의 모바일 시뮬레이션만으로
실제 iPhone 검증을 대체하지 않습니다.

---

## 12. 진행 운동의 로컬 보호 및 복원

현행 정책은 [Task 009 v1.0](../../../overload-server/docs/tasks/task-009-redesign-v1.0.md) 6·7·11절을 따릅니다.
5A의 온라인 관리·START/조회·고정 START/서버 사본, 5B의 로컬 입력·타이머·Web Locks, 5C의 고정 snapshot·승인 해결·takeover를 유지합니다. 5D에서 명시 FINISH·종료 상세/평가/이력·사후 정정/삭제·선택 복구와 최소 종료 목록을 연결했습니다. [5A](../tasks/task-009-frontend-5a-report.md), [5B](../tasks/task-009-frontend-5b-report.md), [5C](../tasks/task-009-frontend-5c-report.md), [5D 저장·검증](../tasks/task-009-frontend-5d-report.md)을 따릅니다. [5E](../tasks/task-009-frontend-5e-report.md)에서 설치용 Manifest, 정적 앱 셸 Service Worker 및 기존 진행 운동의 명시적 오프라인 이어가기를 연결했습니다. localStorage 개발 데모는 운영 계정과 분리합니다.

5B의 완료·취소·계획·승인 의도 변경은 확정 snapshot의 localRevision을 증가시킵니다. 입력 초안·작업 중량 선택·타이머 시작/정지/확인·휴식 조절·종목 이동은 로컬 editVersion만 증가시키고 타이머 tick은 저장하지 않습니다. 완료 사실·휴식·revision·미전송 메타는 한 트랜잭션으로 저장합니다. 명시 로그아웃/계정 설정 전에는 대기 초안 저장을 기다리며 실패하면 화면을 유지합니다. 이미 열린 운동의 인증 만료는 메모리에서만 같은 계정의 로컬 입력을 허용하고, 재인증 시 세대·현재 세션을 다시 확인합니다. Web Locks 미지원·다른 탭 보유 시 쓰기 우회는 없습니다.

오프라인 재실행은 마지막 인증 계정의 기존 진행 운동에 대한 명시 선택으로만 허용합니다. 명시 로그아웃 뒤에는 재인증 전 로컬 운동을 표시/편집하지 않으며 서버 인증 미확인 동안 전송하지 않습니다. 로컬 잠금을 실제 인증/암호화로 표현하지 않습니다. 현재 종료 목록 범위와 정정·복구 조건은 [세션 계약](../../../overload-server/docs/api/workout-sessions.md)을 따릅니다.

### 12.1 범위와 로컬 저장

- 새 운동 시작·종목/루틴/설정 관리·로그아웃은 온라인 기능입니다.
- IndexedDB에는 이미 시작한 현재 운동의 완료 사실·미완료 입력 초안·타이머 앵커·종료 의도·최소 동기화 메타를 보존합니다.
- 입력이 바뀔 때 저장하며, 완료 같은 중요한 전이는 IndexedDB 트랜잭션 성공을 확인합니다. 실패를 완료로 표시하지 않습니다.
- 사용자와 dataGeneration으로 분리하고, 다른 계정에 로컬 내용을 노출하지 않습니다.
- 기존 overload.core.v1 데모를 계정 데이터로 이전하거나 자동 전송하지 않습니다. 실제 데모 데이터 폐기는 별도 승인 범위입니다.
- 브라우저 저장소의 영구 보존이나 백그라운드 JS 실행을 보장하지 않습니다.

### 12.2 전송 및 중복 방지

- 세트/유산소 완료·명시 종료·재연결 때 최종 확정된 전체 스냅샷을 보냅니다. 초안은 공식 완료 실적으로 전송하지 않습니다.
- 입력 중 편집·화면 이동·타이머 tick의 서버 호출, 주기적 heartbeat, 범용 명령 큐/Outbox·변경 feed는 도입하지 않습니다.
- 한 epoch에서 요청은 한 번에 하나만 전송하고, 전송 중 생긴 변경은 최신 상태 하나로 모읍니다.
- sessionId + writerEpoch + revision으로 순서를 구분합니다. 실패한 요청의 epoch/revision/내용을 바꿔 재시도하지 않습니다.
- ACK는 서버 확정 revision만 갱신하며 더 최신인 로컬 입력을 과거 스냅샷으로 덮지 않습니다.
- 5C는 version 2 문서의 optional pendingSnapshot에 고정 요청/JSON/신규 수행 ID를 저장하고 트랜잭션 완료 뒤 전송합니다. 모호한 실패는 상세 조회 후 동일 본문을 한 번 재전송하며, 실패하면 다음 명시 확인/재연결까지 중단합니다. 낮은 조회 revision으로 전달 실패를 추정하지 않습니다.
- 승인 해결은 고정 pendingResolution을 먼저 저장합니다. 서버 승인 사실로 응답 유실을 확인하고, 같은 종목의 추가 승인 의도는 해결 확인까지 차단합니다. 오늘만 중량 변경·실제 수행 입력은 계속할 수 있습니다. 과거 서버 수행 문맥은 수정하지 않습니다.
- finish는 최종 스냅샷과 사용자 종료 시각을 한 요청에 담습니다. 서버 응답 전에는 서버 종료 성공으로 표시하지 않습니다.
- 5D는 종료 의도/선택 당시 snapshot과 endedAt을 먼저 저장하고 일반 입력을 잠급니다. 명시 종료라는 새 확정 상태에 localRevision을 한 번 증가시켜 START/takeover 직후 수행이 없는 운동도 종료할 수 있습니다. 미확인 Snapshot/승인 해결을 같은 송신 슬롯에서 확인한 뒤 FINISH 원문을 고정합니다. 재시도에는 새 revision을 발급하지 않으며 duplicate FINISH ACK를 로컬에 저장한 후 종료 상세를 게시합니다.
- 종료 후 정정/삭제/복구/승인 해결은 expectedVersion 계약이며 한 건의 고정 온라인 요청 결과 확인 메타만 meta store에 보존합니다. 응답 유실은 상세·변경 이력/승인 사실로 확인하고 자동 재전송/버전 올리기를 하지 않습니다. 사용자 재확인은 같은 요청이며 새 변경은 최신 기록을 검토한 명시 선택입니다.
- 구 사본의 복구는 서버 상태·UUID/슬롯/tombstone·원래 문맥을 비교한 선택 수행만 전송합니다. 승인 요청의 ACTIVE 생성 여부는 현재 읽기 DTO로 완전히 증명할 수 없으므로 복구 전 확인 불가로 안내하고 원래 주장을 그대로 서버에 보내 최종 문맥을 판정받습니다. 승인으로 추정하거나 최초 평가를 수정하지 않습니다.

### 12.3 편집 권한과 자동 종료

- 한 사용자당 진행 운동 하나이며 한 기기만 편집합니다. 편집 권한 가져오기는 사용자의 최종 승인이고 이전 기기의 응답을 요구하지 않습니다.
- 새 epoch는 서버 최신 확정 상태와 revision 0을 기준으로 시작합니다. 기기에만 있던 변경을 자동 병합하지 않습니다.
- 재연결 시 서버 세션 상태와 epoch를 확인합니다. 이전 권한 또는 AUTO_CLOSED이면 자동 덮어쓰기하지 않고 허용된 온라인 정정 경로를 안내합니다.
- 마지막 유효 서버 갱신 후 24시간이면 마지막 서버 완료 기록을 AUTO_CLOSED로 보존합니다. 명시 FINISHED·전체 목표 달성과 구별합니다.
- 타이머는 기준 시각/누적 시간으로 복원하고 매초 저장·송신하지 않습니다.

---

## 13. 보안 및 인증

### 13.1 기본 원칙

프론트엔드는 보안의 최종 검증 주체가 아닙니다.

서버가 사용자 인증과 데이터 접근 권한을 검증해야 합니다.

프론트엔드에서는 다음을 준수합니다.

- 인증 상태를 명확하게 관리합니다.
- 클라이언트의 사용자 ID를 권한 검증 근거로 사용하지 않습니다.
- 로그인 상태와 API 인증 성공 여부를 혼동하지 않습니다.
- 다른 사용자의 데이터가 화면에 표시되지 않도록 합니다.
- 로그아웃 및 계정 전환 시 사용자별 메모리 캐시를 정리합니다.
- 로컬 데이터는 별도의 보존 및 삭제 정책에 따라 처리합니다.

### 13.2 인증 정보 저장

인증 방향은 최종 설계 3절의 쿠키 세션 방식이다. Task 007-1D-1에서 EMAIL OTP·Google 로그인·서버 세션 복원·로그아웃을 연동했다. 구현·로컬 포트·검증 범위는 [인증 연동](authentication.md)을 따른다. 실제 서비스 브라우저 LIVE와 설치형 PWA 검증은 별도로 구분한다.

- 애플리케이션 JWT·Access/Refresh Token 저장 흐름을 별도로 도입하지 않습니다.
- 운영 Cookie 인증의 보안 속성을 최종 설계에 맞게 적용합니다.
- 인증 비밀 정보를 코드에 하드코딩하지 않습니다.
- 로그에 토큰이나 비밀번호를 출력하지 않습니다.
- 브라우저에 노출되는 환경변수를 비밀 저장소로 취급하지 않습니다.
- 인증 실패 시 안전하게 복구하도록 설계합니다.

Cookie 기반 인증에서는
HttpOnly, Secure, SameSite 및 CSRF 정책을 함께 고려합니다.

### 13.3 XSS 및 외부 입력

- 사용자 입력은 신뢰하지 않습니다.
- 사용자 입력을 임의로 HTML에 삽입하지 않습니다.
- `dangerouslySetInnerHTML` 사용을 지양합니다.
- 외부 URL과 사용자 제공 콘텐츠를 검증합니다.
- 오류 메시지를 HTML로 직접 렌더링하지 않습니다.
- 필요한 경우 신뢰할 수 있는 Sanitization 도구를 사용합니다.

### 13.4 환경변수

Vite 환경변수는 다음 원칙을 따릅니다.

- 공개 가능한 설정만 `VITE_` 환경변수에 저장합니다.
- 비밀번호 및 API 비밀키를 포함하지 않습니다.
- 로컬 환경 파일은 Git 관리에서 제외합니다.
- 환경별 API 주소를 분리합니다.
- 설정이 누락되었을 때 명확한 오류를 제공하도록 합니다.

---

## 14. 날짜, 시간 및 운동 데이터

### 14.1 날짜와 시각

운동 날짜와 실제 발생 시각을 구분합니다.

- 운동 날짜는 사용자 시간대 기준으로 처리합니다.
- 서버에서 전달한 Timestamp는 시간대 정보를 유지합니다.
- 시간대 변환은 명시적으로 처리합니다.
- 날짜만 의미하는 값을 불필요하게 Timestamp로 변환하지 않습니다.
- 서버와 클라이언트 간 날짜 표현을 일관되게 관리합니다.
- 날짜 문자열의 암묵적인 파싱으로 발생하는 시간대 오류를 주의합니다.

### 14.2 운동 중량

- 화면 기본 단위는 kg입니다.
- 소수점 입력을 지원할 수 있도록 설계합니다.
- 중량과 반복 횟수의 데이터 타입을 명확하게 구분합니다.
- 데이터 직렬화 시 정밀도 손실을 검토합니다.
- 0kg 기록을 무조건 유효하지 않다고 판단하지 않습니다.
- 세트 유형 및 운동 방식에 따라 검증 규칙을 적용합니다.

### 14.3 운동 통계

운동 통계에는 다음 데이터가 포함될 수 있습니다.

- 운동 빈도
- 운동 볼륨
- 운동 중량 변화
- 개인 최고 기록(PR)
- 종목별 운동 이력

원칙:

- 서버에서 계산한 공식 통계를 우선합니다.
- 프론트엔드는 표시 및 시각화에 집중합니다.
- 임의의 계산식으로 백엔드 통계와 다른 값을 생성하지 않습니다.
- 데이터가 부족할 경우 해당 상태를 명확히 표시합니다.
- 추정 데이터는 실제 기록과 구분합니다.

현재 실제 계정 화면은 [통계 overview·성장·기간 계약](../../../overload-server/docs/api/statistics.md#현재-frontend-연결과-기간시간-표시)을 따릅니다. 통계·일정은 기존 AuthController/AuthApi의 온라인 전용 transport를 통과하며 IndexedDB/SW에 응답을 캐싱하지 않습니다. 활동·근육 상세 기간은 독립적이고, 유산소 실제/계획 시간은 같은 선택 기간의 응답에서 표시합니다. 표시용 합산을 완료 판정·새 달성률이나 Backend 집계 정책으로 바꾸지 않습니다.

### 14.4 그래프

- UI v0.9의 차트는 Recharts를 사용합니다. 현재 운영 앱은 CSS·SVG 차트이며 Recharts 설치와 전환은 실제 통계 구현 단계에서 진행합니다.
- 기존 통계 데이터 처리와 승인 중량 계산·연결 규칙을 보존합니다. 날짜·단위·결측값·승인 사건의 연결 구간을 만드는 변환 로직을 렌더러와 분리합니다.
- 차트를 터치하면 날짜·정확한 값·단위를 확인할 수 있게 하고, 동일한 수치를 접근 가능한 텍스트로 제공합니다.
- 데이터 양과 차트 사용 빈도를 보고 지연 로딩 여부를 결정합니다. 스파이크에서 Recharts 선택 시 내려받는 청크는 약 109.3 kB(gzip)였습니다.

- 운동 기록 변화를 이해하기 쉽게 시각화합니다.
- X축 및 Y축의 의미와 단위를 표시합니다.
- 데이터가 없는 구간을 임의로 채우지 않습니다.
- 실제 측정값과 계산값을 구분합니다.
- 모바일 화면에서도 가독성을 유지합니다.
- 그래프 외에도 핵심 수치를 텍스트로 제공합니다.

---

## 15. 성능 및 사용자 경험

### 15.1 성능 목표

초기에는 체감 성능과 안정성을 우선합니다.

- 초기 화면 로딩 시간을 최소화합니다.
- 불필요한 API 요청을 줄입니다.
- 반복적으로 사용하는 정적 리소스는 적절히 캐싱합니다.
- 큰 화면 및 차트는 필요에 따라 지연 로딩합니다.
- 긴 목록은 성능 측정 후 최적화합니다.
- 애니메이션보다 입력 응답성을 우선합니다. 애니메이션 라이브러리 도입은 미정입니다. CSS transition을 적용할 수 있는 구조를 유지하고 필요하면 Motion 같은 전문 라이브러리를 검토합니다. iOS의 동작 줄이기 설정과 `prefers-reduced-motion`을 고려합니다.

### 15.2 입력 응답성

운동 중 사용자가 빠르게 기록할 수 있어야 합니다.

- 중량 및 반복 횟수 입력 시 지연을 최소화합니다.
- API 응답을 기다리는 동안 필요한 입력 상태를 유지합니다.
- 저장 동작의 진행 상태를 표시합니다.
- 불필요하게 전체 화면을 재렌더링하지 않습니다.
- 네트워크 연결이 불안정할 때 사용자가 상황을 이해할 수 있어야 합니다.

### 15.3 사용자 피드백

다음 상황에 적절한 피드백을 제공합니다.

- 운동 저장 성공
- 운동 저장 실패
- 오프라인 상태
- 동기화 대기
- 동기화 충돌
- 데이터 없음
- 앱 업데이트 가능
- 로그인 만료

오류 메시지는 사용자가 취할 수 있는
다음 행동을 알 수 있도록 작성합니다.

---

## 16. 테스트 규칙

### 16.1 기본 원칙

- 공통 테스트 기준은 `AGENTS.md` 13절을 따르며, 현재 확정된 제품 동작을 검증합니다.
- 새로운 주요 기능에는 적절한 테스트를 작성합니다.
- 버그 수정 시 가능한 경우 회귀 테스트를 추가합니다.
- 사용자 행동을 중심으로 검증합니다.
- 구현 세부사항에 과도하게 의존하는 테스트를 피합니다.
- 네트워크 및 저장소 의존성은 적절하게 제어합니다.
- 모든 테스트는 반복 실행 가능하도록 작성합니다.

### 16.2 Unit Test

주요 테스트 대상:

- 운동 입력 검증
- 중량 및 반복 횟수 정규화
- 날짜 및 시간 처리
- API 데이터 변환
- 동기화 상태 전이
- 공통 유틸리티 함수

가능한 경우 React 렌더링 없이 검증합니다.

### 16.3 Component Test

현재 기존 TypeScript 컴파일러와 React 서버 렌더링을 사용하는 테스트를 유지합니다.
React Testing Library는 미도입이며, 채택하는 경우 사용자 관점의 상호작용 테스트에 활용합니다.
서버 렌더링 테스트를 실제 DOM 상호작용·브라우저 E2E 검증 완료로 간주하지 않습니다.

검증 대상:

- 입력값 변경
- 세트 추가 및 삭제
- 버튼 활성화 상태
- 오류 메시지 표시
- 로딩 상태
- 빈 데이터 상태
- 접근 가능한 UI

### 16.4 API Mock

API 연동 테스트 시 실제 서버에 대한
불필요한 의존을 줄입니다.

MSW 등의 도구 도입을 검토할 수 있습니다.

테스트 상황 예시:

- 정상 응답
- 잘못된 응답 데이터
- 400 입력 오류
- 401 인증 오류
- 403 권한 오류
- 409 충돌 오류
- 500 서버 오류
- 네트워크 단절
- 요청 지연

Mock 응답 구조는 실제 백엔드 API 계약을 따라야 합니다. 화면 검토용 Mock과 실제 API 통합 검증은 [18.1절](#181-기본-ui-개발-절차)의 단계별 기준을 적용합니다.

### 16.5 E2E Test

주요 사용자 흐름을 검증합니다.

대표적인 시나리오:

```text
Open Application
       |
       v
Start Workout
       |
       v
Select Exercise
       |
       v
Enter Weight / Reps
       |
       v
Add Workout Set
       |
       v
Save Workout
       |
       v
View Workout History
```

추가 검증 대상:

- 로그인
- 루틴 조회 및 사용
- 운동 기록 수정
- 오류 복구
- 네트워크 재연결

### 16.6 PWA Test

PWA 기능을 구현한 경우 다음을 검증합니다.

- Manifest 유효성
- Service Worker 등록
- 정적 리소스 캐싱
- 오프라인 화면 동작
- 업데이트 동작
- 작성 중인 기록 보존
- 로컬 저장 실패 처리
- 네트워크 재연결 후 동기화

### 16.7 실제 iPhone 테스트

실제 iPhone에서 다음 시나리오를 검증합니다.

1. Safari에서 서비스 접속
2. 홈 화면에 추가
3. Standalone 모드 실행
4. 운동 기록 입력
5. 화면 잠금 후 복귀
6. 앱 전환 후 복귀
7. 네트워크 연결 해제
8. 저장 및 오류 처리 확인
9. 네트워크 재연결
10. 기록 유지 및 동기화 확인

구현되지 않은 오프라인 기능은
테스트 완료로 표시하지 않습니다.

---

## 17. 빌드 및 로컬 검증

### 17.1 기본 명령

프로젝트에 설정된 npm Script를 사용합니다.

```bash
npm install
npm run dev
npm run build
npm run preview
```

### 17.2 검증 명령

프로젝트에 실제로 존재하는 경우 실행합니다.

```bash
npm run lint
npm run test
npm run typecheck
```

각 명령은 `package.json`의
` scripts` 설정을 확인한 후 실행합니다.

아직 정의되지 않은 명령을
사용 가능하다고 가정하지 않습니다.

### 17.3 TypeScript 검증

- TypeScript 타입 오류가 없는지 확인합니다.
- `any`나 타입 단언으로 오류를 무분별하게 숨기지 않습니다.
- 외부 데이터 구조 변경의 영향을 확인합니다.
- 타입 정의와 실제 API 응답의 일치 여부를 검토합니다.

### 17.4 빌드 검증

- 프로덕션 빌드 성공 여부를 확인합니다.
- 불필요한 번들 크기 증가를 검토합니다.
- 배포 환경과 로컬 환경의 차이를 확인합니다.
- 중요한 라우트가 직접 접근 시에도 정상 동작하는지 확인합니다.
- PWA 관련 변경은 실제 빌드 환경에서 검증합니다.

### 17.5 검증 실패 처리

- 오류 메시지를 확인합니다.
- 변경 코드와 실패의 관련성을 분석합니다.
- 테스트나 타입 검사를 임의로 비활성화하지 않습니다.
- 실패를 숨기지 않습니다.
- 환경 문제로 검증하지 못한 경우 이유를 보고합니다.

---

## 18. AI 에이전트 프론트엔드 작업 절차

AI 에이전트는 프론트엔드 작업 시
다음 순서를 따릅니다.

### 18.1 기본 UI 개발 절차

1. [승인된 HTML 와이어프레임](../product/Overload_UI_Baseline_Wireframe_v0.9.html), [UI/UX 명세와 Decision Log](../product/ui-ux.md), [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md), 관련 개발·검토 환경 문서를 확인합니다. 확정 정책 사이의 충돌과 처리 결과를 기록하고, 제품 결정이 필요한 미확정 사항은 사용자에게 확인합니다.
2. 실제 React UI를 구현합니다. 승인된 정보 구조·화면 이동·문구·상태와 [T01 공통 기반](#87-v09-적용-범위와-구현-상태)을 적용합니다. 로딩·빈 상태·오류·긴 텍스트·접근성에 필요한 보완은 검토 결과에 기록합니다.
3. 기존 검토 환경에서 PC와 같은 사설 Wi-Fi/LAN의 iPhone Safari로 시연합니다. 접속 경로, 와이어프레임 반영 범위, 합성 데이터, 조작, 보완 및 미구현 범위와 검증 결과를 제공합니다.
4. 사용자 피드백을 받습니다.
5. 같은 검토 환경에 수정 사항을 반영합니다.
6. PC와 iPhone에서 다시 검토합니다. 자동화된 모바일 검증과 실기기 결과는 각각 기록합니다.
7. 피드백이 끝날 때까지 4~6단계를 반복합니다.
8. 사용자의 명시적 최종 UI 승인을 받습니다. 실제 API 연동이 필요한 범위에는 아래 연동·검증 절차를 적용합니다.
9. 필요한 검증을 마치고 해당 테스트 환경을 안전하게 종료합니다.
10. 관련 변경과 검증 결과를 최종 확인한 뒤 로컬 Git 커밋을 합니다. 현재 작업에서 별도로 정한 커밋 제한을 따릅니다.

#### 시연 범위

Codex에서는 대상 UI를 기존 전체 페이지와 하단 내비게이션 안에서 시연합니다. 예를 들어 설정의 운동 종목 보기는 전체 설정 메뉴에서 진입하고 그 메뉴로 복귀할 수 있게 구성합니다. 기존 페이지·메뉴·기능을 보존하고, 구현 상태에 맞는 화면과 조작을 제공합니다. 미구현 항목은 미구현 표시 또는 비활성 시안으로 구분합니다. 사용자가 ChatGPT 대화에서 간단한 시안을 요청한 경우 해당 영역만 보여줄 수 있습니다.

Mock은 검토 환경임을 화면에 표시하고 현실적인 합성 데이터로 정상 흐름과 관련 빈 상태·로딩·오류 등을 시연합니다. 실제 인증·쓰기·동기화 경로에 합성 데이터를 섞거나 개인 IndexedDB의 운동 원본으로 저장하지 않습니다.

#### 환경 재사용과 마감

- 기존 검토 서버·설정·주소·포트를 우선 사용합니다. 사설 LAN 접속에는 기존 `server.host: true` 또는 해당 검토 모드의 LAN 바인딩을 적용합니다. `ui-review`에서는 확인한 사설 IPv4를 `OVERLOAD_MOCK_LAN_IP`에 지정하며 기본 포트는 4173입니다. 피드백마다 서버·DB·계정을 다시 만들지 않습니다. UI 변경은 같은 환경에 반영하고 필요한 경우 프런트엔드만 재시작합니다.
- 사용자의 최종 UI 승인이 없거나 피드백이 남아 있으면 사용자 검토 환경을 유지하고 중간 커밋을 하지 않습니다. 검증에 사용한 별도 일회용 프로세스는 [AGENTS.md의 정리 규칙](../../AGENTS.md#local-process-cleanup)을 적용합니다. 최종 종료 시 실행 소유권·PID·포트를 확인하고 해당 환경의 안전 종료 경로를 사용합니다. [테스트 환경 안내](../../../overload-server/docs/engineering/test-environment.md#종료와-보존)
- Backend·DB 변경을 포함하면 변경 범위를 먼저 확인합니다. 기존 환경의 Backend 버전, DB 스키마, 실제 Flyway 이력, 데이터·계정 상태와 호환성·보존 여부를 확인합니다. 승인·백업·복구 조건을 충족한 뒤 승인된 변경만 반영하고, 적용 결과와 코드·데이터 일치를 검증한 상태로 PC와 iPhone에서 시연합니다. 보존 DB의 재개·마이그레이션·데이터 변경에는 기존 별도 승인 절차를 적용합니다. UI 전용 작업은 프런트엔드에서 검토합니다. [테스트 환경 안내](../../../overload-server/docs/engineering/test-environment.md)

#### 실제 API 연동과 통합 검증

별도 지시가 없으면 해당 기능의 실제 API 연결은 명시적 UI 승인 뒤 시작합니다. 계약 조사와 UI 구조 설계는 승인 전에 할 수 있습니다. 승인된 기존 격리 환경과 전용 데이터를 우선 사용하고, 식별 가능하고 재실행 가능한 표본을 준비합니다. 브라우저에서 표시·저장·수정·오류·충돌·재조회·새로고침과 인증·세대·IndexedDB·동기화 보호를 검증합니다. 실제 앱 경로에 합성 응답이 유입되는지도 확인합니다. 필요한 연동·통합 검증을 마친 뒤 위의 안전 종료와 로컬 커밋 단계로 진행합니다.

| 상태 | 완료 기준 |
| --- | --- |
| A. UI 구현 완료 | 와이어프레임과 테마에 맞게 구현했고 현실적인 Mock으로 시연할 수 있습니다. |
| B. UI 승인 완료 | 피드백을 반영했고 사용자가 UI를 승인했습니다. |
| C. API 연동 완료 | 격리 서버의 전용 계정 데이터로 실제 API를 조회하고 필요한 작업을 실행했습니다. |
| D. 통합 검증 완료 | 정상·오류·저장·갱신·새로고침·데이터 보호와 관련 회귀를 확인했습니다. |

보고에는 도달한 상태와 남은 상태를 구분합니다. 실기기 및 운영 검증 여부는 각각의 실제 결과로 별도 기록합니다.

### Step 1. Inspect

- 루트 `AGENTS.md` 확인
- `frontend.md` 확인
- `package.json` 및 Lockfile 확인
- 관련 Feature 및 컴포넌트 확인
- 기존 스타일 및 상태 관리 방식 확인
- API 계약 확인
- 테스트 코드 확인
- PWA 및 모바일 영향 범위 확인

### Step 2. Plan

다음 사항을 정리합니다.

- 구현할 기능
- 수정할 파일
- UI 및 상태 관리 방식
- API 변경 필요 여부
- 로컬 저장 및 동기화 영향
- 테스트 방법
- iPhone 호환성 고려사항

### Step 3. Implement

가능한 한 기능별로 구현합니다.

대표적인 작업 흐름:

```text
Feature Requirements
         |
         v
Types / API Contract
         |
         v
Feature Logic / Hooks
         |
         v
React Components
         |
         v
UI States
         |
         v
Tests
```

UI가 있는 기능의 단계 전환은 18.1절을 따릅니다.

기존 구조의 수정·교체는 최신 설계와 `AGENTS.md` 4.3절의 개선 조건에 따라 판단합니다.

### Step 4. Verify

변경 내용에 따라 다음을 확인합니다.

- TypeScript 타입 검사
- Lint 검사
- 관련 Unit Test
- Component Test
- 프로덕션 빌드
- 모바일 UI 동작
- API 계약 일치 여부
- PWA 영향 여부
- 운동 데이터 보존 여부

### Step 5. Review

작업 완료 전 확인합니다.

- 컴포넌트의 책임이 명확한가?
- API 호출이 적절한 계층에 있는가?
- 서버 상태와 클라이언트 상태를 구분했는가?
- 불필요한 전역 상태가 없는가?
- 로딩, 오류, 빈 데이터 상태가 처리되었는가?
- iPhone에서 조작하기 쉬운가?
- 작성 중인 운동 데이터가 유실되지 않는가?
- 오프라인 동작을 잘못 가정하지 않았는가?
- 인증 및 보안 문제가 없는가?
- 기존 기능에 영향을 주지 않는가?

### Step 6. Report

작업 완료 시 다음 내용을 보고합니다.

#### Summary
- 구현한 기능 및 변경 사항

#### Files
- 생성 또는 수정한 파일

#### API Changes
- 변경된 API 호출 및 DTO

#### UI Changes
- 화면 및 사용자 인터랙션 변경
- 와이어프레임 밖에서 보완한 요소, 정책 충돌 처리, Mock 시연 경로와 단계 A~D 상태

#### PWA / Offline Impact
- 캐시 및 로컬 저장 관련 영향
- 데이터 동기화 관련 영향

#### Validation
- 실행한 검증 명령
- 테스트 및 빌드 결과
- 실제 기기 검증 여부
- 실행하지 못한 검증과 이유

#### Notes
- 설계 결정
- 미해결 문제
- 추가 작업

---

## 19. Definition of Done — Frontend

### Architecture

- [ ] 최신 설계와 공통 단순화 기준을 충족하며 구조 변경의 근거가 명확한가?
- [ ] 컴포넌트의 책임을 적절히 분리했는가?
- [ ] 상태 관리가 불필요하게 복잡하지 않은가?
- [ ] 중복된 로직이 없는가?

### TypeScript & React

- [ ] 타입 안정성을 확보했는가?
- [ ] React Hooks 규칙을 준수했는가?
- [ ] 불필요한 부작용을 만들지 않았는가?
- [ ] 렌더링 및 상태 갱신이 적절한가?

### API & Data

- [ ] API 계약과 실제 구현이 일치하는가?
- [ ] 오류 및 실패 상태를 처리했는가?
- [ ] 사용자별 데이터가 분리되는가?
- [ ] 입력 데이터가 올바르게 검증되는가?
- [ ] 데이터 손실 가능성을 고려했는가?

### UI & PWA

- [ ] 모바일 화면에서 정상 동작하는가?
- [ ] 주요 기능을 터치로 조작할 수 있는가?
- [ ] 접근성 요구사항을 고려했는가?
- [ ] Safe Area 및 키보드 동작을 고려했는가?
- [ ] PWA 변경 시 캐시와 업데이트 영향을 검토했는가?
- [ ] 오프라인 기능의 구현 범위를 정확하게 표시했는가?

### Quality

- [ ] 관련 테스트를 작성하거나 수정했는가?
- [ ] 실행 가능한 검증을 수행했는가?
- [ ] 프로덕션 빌드를 확인했는가?
- [ ] 불필요한 파일 변경이 없는가?
- [ ] 관련 문서를 갱신했는가?
- [ ] 검증되지 않은 항목을 명확하게 보고했는가?

---

## 20. 추가 설계 결정이 필요한 항목

인증·저장·동기화·운동 도메인의 확정 정책은 최종 설계를 따릅니다.
아래에는 그 정책을 다시 결정하는 항목이 아닌, 남은 기술 상세와 후속 검토 대상을 정리합니다.

### UI / UX

- 기존 디자인·테마를 넘어서는 후속 확장
- 최종 설계 범위 안의 입력 화면·저장 상태 피드백 세부 UX
- v0.9 그래프의 필터별 시계열·제조사별 집계에 필요한 데이터 범위와 실기기 가독성

### API / Authentication

- 확정된 인증 정책을 적용할 쿠키·CSRF·배치 환경의 기술 상세
- API 오류 응답 규약
- 요청 및 응답 타입

### PWA / Offline

- 로컬 데이터 스키마
- 전체 확정 스냅샷·ACK·epoch/revision 및 재시도의 세부 DTO
- IndexedDB 원자 저장 실패·타이머·종료 의도 복원 검증
- 명시적 편집 권한 이전·24시간 자동 종료 후 온라인 정정 안내
- PWA 업데이트 및 사용자 안내 방식

### Domain

- 중량 데이터의 정밀도 및 기술적 수치 상한
- MVP 범위 밖 세트 유형과 PR의 후속 확장 기준
- 기기 시계 오류·날짜 정정 등 최종 설계에서 남긴 기술 계약

확정되지 않은 항목은 임의로 결정하지 않습니다.

결정된 사항은 문서, 타입 정의, 테스트에 반영합니다.

---

## 21. 참고 문서

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vite.dev/guide/)
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand.docs.pmnd.rs/)
- [Dexie.js](https://dexie.org/docs/)
- [Vite PWA](https://vite-pwa-org.netlify.app/)
- [MDN Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [WebKit Blog](https://webkit.org/blog/)
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright](https://playwright.dev/)

---

## Final Principle

Overload 프론트엔드의 핵심은
화려한 인터페이스보다 안정적인 운동 기록 경험입니다.

사용자는 운동 중 빠르게 기록할 수 있어야 하며,
네트워크 및 앱 상태 변화로 인해
기록이 쉽게 손실되어서는 안 됩니다.

모든 구현은 다음을 우선합니다.

**Data Safety → Correctness → Usability → Maintainability → Performance**

AI 에이전트는 기존 구조를 이해하고,
사용자 데이터를 보호하며,
검증 가능한 프론트엔드 코드를 작성해야 합니다.

## T02-B 2차 연동 (2026-11-06 당시 기록)

이 절은 당시 검증 기록이며 현재 UI/승인 상태는 [8.7절](#87-v09-적용-범위와-구현-상태)을 따른다. 현재 목록은 최신순뿐 아니라 단일 필터의 오래된순·배정·미배정을 지원한다.

루틴 목록은 생성일 최신순, 현재 주간 배정과 필터를 사용한다. 태그는 서버 nullable 필드이며 UI 임시 상태가 아니다. 카탈로그 근육은 실제 PRIMARY 매핑만 표시한다. 공통 CardioPlanFields와 cardio-draft는 기존 CardioPlan 및 세션 addCardio/updateCardioPlan 입력을 사용하며 IndexedDB 버전과 고정 요청을 변경하지 않는다. 루틴 저장/일정 저장은 별도 단계이고 일정 실패 시 루틴 중복 저장 없이 재시도한다. 계정·세대·일정 version과 기존 적용일을 확인한다. 상세 결과는 [2차 보고서](../tasks/ui-v09-t02b-second-report.md)를 따른다.

사용자는 당시 2차 연동 요청에서 정적 검증 후 **기존 보존 검토 환경의 안전 재개 및 격리 DB V23 추가 마이그레이션**을 승인했다. 개인 DB(5433)에는 적용하지 않는다. 예전 1차의 서버 실행 금지는 당시 단계의 제한이다. 실제 iPhone T02-B 최종 승인은 아직 진행하지 않았다.

## G2~G3 일정 계약 전환 (2026-11-06)

> 2026-11-06 단일 일정 경로의 구현 기록이다. 현행 계정 경로는 [프리셋 계약](../../../overload-server/docs/api/weekly-schedule.md)을 사용한다.

주간 일정은 현재 version/timeZone/appliedAt/assignments를 사용하고 PUT에 contractVersion=immediate-v1을 보낸다. current/pending/nextEffectiveFrom과 예약 표시를 제거했다. 저장 응답과 재조회가 version/정확한 배정/시각에서 일치해야 성공하며, 루틴 성공·일정 실패는 기존 고정 입력으로 일정만 재확인한다. ACTIVE 오류는 종료/저장 확인 안내와 함께 입력을 유지한다.

홈과 루틴 목록은 같은 현재 배정을 재조회한다. 과거 계획·첫 예정 START는 서버 overview의 고정 근거를 사용하고 현재 템플릿으로 덮지 않는다. PENDING과 미검사/재검사0은 미수행 확정 표시를 하지 않는다. 일반 통계의 계획 미달과 실제 무수행을 구분한다. 정책은 [통계 v1.4](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md), API는 [일정 계약](../../../overload-server/docs/api/weekly-schedule.md)을 따른다. 수정 전 UI v0.9 HTML은 별도 보존본이다. Decision Log 10.14절에는 당시 T02-B 레이아웃과 즉시 적용을 기록했다.

IndexedDB/ACK/writerEpoch/dataGeneration/타 기기 읽기 전용과 개발용 디로딩 샘플은 유지한다. 당시 G2~G3 단계는 실제 개발·검토 DB migration과 서버 운영 전환을 허용하지 않았다. 기존 V23 전용 재개 도구는 V24를 임의 적용하도록 변경하지 않았다.

### 2026-11-07 디로딩 정책 표현 정정

시작 자격·분석·epoch는 [제품 v1.7](../product/Overload_Deloading_Design_Specification_v1.7.md)을 따릅니다. API와 미연동 범위는 [G6 연동 지침](backend-ui-v0.9.md) 및 [8.7절](#87-v09-적용-범위와-구현-상태)을 확인합니다.

### 다중 주간 루틴 일정

[UI 결정 로그 10.16절](../product/Overload_UI_Decision_Log_v0.9.md#1016--다중-주간-루틴-일정과-자동-순환)과 [화면 명세](../product/ui-ux.md#32-루틴-목록--routinelist)를 적용한다. 계정 앱은 [V30·V31 프리셋 계약](../../../overload-server/docs/api/weekly-schedule.md)을 사용한다.

- 서버가 확정한 활성 상태, 번호로 선택하는 조회 상태, 편집 초안을 분리한다. `RoutineCards`의 가로·세로 일정과 `WeeklySchedulePanel`의 요일 편집을 재사용한다. `RoutineForm`의 루틴 쓰기와 요일 배정은 독립 요청이다. 버전 충돌은 입력을 유지하고 최신 상태를 확인한다. [현재 API 소비](backend-ui-v0.9.md#t02-b-현재-api-소비)

- 홈은 활성 배정과 서버의 날짜별 overview를 사용한다. 월요일 00:00부터 전환 대상이며, Job 적용 전 START가 발생하면 시작 당시 근거를 사용한다. 그 짧은 구간 전용 순환 확인 체계는 추가하지 않는다. 새 계약에서도 이미 시작된 세션의 최초 계획과 미동기화 기록을 보호하고 START·snapshot·FINISH 재시도를 안전하게 처리한다. 현재 API·IndexedDB 형식의 재사용 여부는 `AGENTS.md` 4.2절 기준으로 판단한다. 이미 확정된 START의 늦은 기록은 최초 계획·출처 기준이며 24시간 AUTO_CLOSED 뒤에는 기존 복구를 사용한다. 신규 오프라인 START나 자동 병합을 추가하지 않는다.
- G6의 분석 설정 변경·기간 조작·디로딩 START 연동은 후속이다. 분석·현재 기간 조회와 일반 쓰기 보호는 T02에서 사용한다. 기존 PWA의 `InitialPlan.routineId` UUID 검증은 디로딩 세션의 null을 허용하지 않으며, 로컬 동기화에도 일반 루틴 조회 경로가 있다. 혼재 세션 검증·저장·동기화와 미전송 원본 보호를 마련한 뒤 또는 같은 범위에서 디로딩 원본 선택을 연결한다.
