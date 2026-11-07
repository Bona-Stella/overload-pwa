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

UI를 변경할 때는 [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)의 실제 컬러·시각 위계와 [추출 아이콘 원본](../product/assets/exercise-icons/README.md)을 먼저 확인하고 [UI/UX 명세](../product/ui-ux.md)와 [v0.9 적용 범위](#87-v09-적용-범위와-구현-상태)를 확인합니다. 디로딩 도메인·데이터 경계는 [제품 v1.6](../product/Overload_Deloading_Design_Specification_v1.6.md)과 [백엔드 연동 설계](backend-ui-v0.9.md)를 따릅니다.

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

2026-11-07 현재 T02-B는 `85ec10f50e59`에 구현·로컬 커밋된 상태다. [1차](../tasks/ui-v09-t02b-first-ui-report.md)·[2차 보고서](../tasks/ui-v09-t02b-second-report.md)는 당시 기록이며 최신 현황은 이 절과 Decision Log10.14절을 따른다. 루틴 태그 저장과 일정 즉시 적용이 연결되어 있다. 최종 코드 이후548건 테스트·build·lint 통과 기록을 확인했으나, T02-B 사용자 최종 실기기 승인은 별도다. 문서 개정 자체가 추가 API/DB 적용·승인을 뜻하지 않는다.

[Decision Log](../product/Overload_UI_Decision_Log_v0.9.md)의 최신 10.14절을 확정 UI/UX·상호작용 기준으로 적용합니다. [Wireframe](../product/Overload_UI_Baseline_Wireframe_v0.9.html)은 무채색 화면 구조·사용자 흐름·배치 검토용 독립 HTML이며 실제 PWA 색상은 [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)을 따릅니다. HTML의 흰색·회색을 운영 UI 컬러로 구현하지 않습니다. 운동 검색·선택은 [추출 PNG 원본 6종](../product/assets/exercise-icons/README.md)을 32 CSS px로 재사용합니다. 디로딩 정책은 [v1.6](../product/Overload_Deloading_Design_Specification_v1.6.md)을 따르며 예시 값·버튼 시연을 서버 응답·IndexedDB·인증 결과로 가져오지 않습니다.

게이지·누적 종목 위치·주간 상태·완료/취소 컨트롤·수행값/장비 텍스트 위계·물음표 도움말의 공식 절은 [UI/UX 적용 지점](../product/ui-ux.md)을 참조합니다. 공통 컴포넌트와 역할 토큰을 사용하고 테마 변경으로 입력·타이머를 초기화하지 않습니다. Visual Theme Spec의 작은 도움말 시각 크기를 실제 터치 영역 축소로 해석하지 않습니다.

[T01 공통 기반](../tasks/ui-v09-t01-foundation-report.md)에서 실제 계정의 홈/루틴/기록/설정 4탭과 Onyx 토큰·CSS Modules, 공통 표현을 적용했습니다. 인증·운동 controller와 저장·동기화 계약은 재사용합니다. 운동 집중 화면과 루틴 편집에서는 탭을 숨기며, 운동 홈 복귀와 탭 이동은 초안 저장 결과 및 계정 경계를 확인합니다. 운동 편집기는 탭 숨김으로 재마운트하지 않습니다. 운영 셸은 일반 테마이며, 개발 전용 `/ui-foundation`에서만 두 테마·입력·타이머·아이콘을 검증합니다. 이 화면은 프로덕션 번들에서 제외됩니다.

[T02-A 홈 설계 일치 수정](../tasks/ui-v09-t02a-design-review-report.md)에 이은 [홈 세부 개선](../tasks/ui-v09-t02a-home-details-report.md)은 Decision Log 10.12절의 공식 달 헤더·날짜·글자 크기·선택 자동 닫힘·종목 달성 표시를 반영한다. 최근 운동은 종료 목록을 최대3페이지(60건), 상세 동시4개로 읽고 무수행을 홈에서만 제외한다. 분모는 InitialPlan, 분자는 기존 주간 달성 계약의 현재 유효 수행이며 승인 eligible과 구분한다. 태그는 선택형 표현만 준비하고 저장은 T02-B 계약 대상이다. 실제 루틴/일정/기록은 기존 API를 읽고, 디로딩 게이지의 대표 표시값은 명시적으로 실행한 개발 검토 앱의 `HomeReviewContext`에만 주입한다. `DEV && VITE_HOME_REVIEW` 진입점은 production build에서 제거되며 시안 값을 운동/자격/권한/통계·IndexedDB에 사용하지 않는다. 검토 서버만 전용 계정의 실제 OTP 메일 전달을 자동화한다. HTTP LAN의 로그인·기기 식별은 기존 CSPRNG UUID 함수를 공통화해 지원하지만, Web Locks가 없는 홈에서는 새 운동 START를 비활성화한다. 기존 편집 잠금·고정 요청·ACK·오프라인 경계는 유지한다. 설치형 PWA는 별도 production/HTTPS 검증 대상이다.

[최종 시각 보완](../tasks/ui-v09-t02a-home-final-visual-report.md)에서 브랜드18px/700/자간0.06em을 적용하고, 동일 격리 검토 DB에 기존 루틴의 혼합 달리기 완료 기록1건을 실제 API로 추가했다. 이후 [최종 디테일](../tasks/ui-v09-t02a-home-polish-report.md)에서 공식 원형 아령 SVG·아이콘–수치 gap5px·제목 아래 구분선을 적용했다. 당시 태그 저장은 후속이었으며 현재는 T02-B 루틴 계약에 연결되어 있다.

2026-11-06 사용자의 iPhone 실기기 검토로 T02-A 일반 홈을 최종 승인했다. 디로딩 운영 API는 후속이며 T02-B 구현 상태는 이 절 상단을 따른다. 검토 환경은 [마감·데이터 보존·수동 재개](../tasks/ui-v09-t02a-closeout.md)를 따르며 T02-B 1차 UI 구현이 끝나기 전에는 검토 서버를 자동 시작하지 않는다.

#### T02-B 현재 컴포넌트·상태 연결 (2026-11-07)

| 실제 모듈 | 책임·연결 |
|---|---|
| [WorkoutWorkspace.tsx](../../src/features/workout-online/WorkoutWorkspace.tsx) / `WorkspaceView` | `editor{routine,readOnly}`와 `scheduleEditing` 관리. 목록/공통 폼 연결. `scheduleRefresh`·`onScheduleSaved`로 홈/루틴 재조회. ACTIVE·고정 시도는 관리 쓰기 차단 |
| [RoutineCards.tsx](../../src/features/workout-online/RoutineCards.tsx) | 로컬 `day/vertical/filter`; 생성순 정렬·단일 목록 필터·요일 잠금. 서버 assignments로 배정 카드/주간 보기 파생, `Home.module.css` 재사용. 상세/수정/삭제 콜백 분리 |
| [RoutineForm.tsx](../../src/features/workout-online/RoutineForm.tsx) | 생성·편집·readOnly 공통 폼. 이름/태그/weights/cardio/days 초안. 고정 제출·루틴 성공 후 일정만 재시도·교체 확인. 다른 종목은 새 배치, 원승인 전이 금지 |
| [TagPicker.tsx](../../src/features/workout-online/TagPicker.tsx) | 미지정+10종·기존 설명 드롭다운, 키보드/ESC/바깥 닫힘. 태그는 실제 nullable 루틴 DTO이며 더미 분류가 아님 |
| [ExerciseSearch.tsx](../../src/features/workout-online/ExerciseSearch.tsx) | 추가·변경 공통 검색, 실제 카탈로그 이름/별칭·`ExerciseIcon`·PRIMARY 표시. 폼의 `searchRegion`/`showPicker`가 스크롤·포커스, 입력 보존 담당 |
| [WeeklySchedulePanel.tsx](../../src/features/statistics/WeeklySchedulePanel.tsx) / `ScheduleEditor` | 편집을 별도로 표시. saved assignments 기준 후보 필터,7일 초안 보존. 배정 유무/태그/전체3개 고정, 필터 밖 선택 option도 원래 이름 유지. 열려 있는 초안은 외부 refresh로 덮지 않음 |
| [weekly-schedule.ts](../../src/features/statistics/weekly-schedule.ts) / [routine-schedule.ts](../../src/features/workout-online/routine-schedule.ts) | `WeeklyScheduleApi.read/save`, `saveSchedule`가 저장 전 최신 version과 응답 후 GET 비교. immediate-v1·expectedVersion·appliedAt, 충돌시 초안 유지/조용한 병합 금지. history 메서드는 서버 근거용이며 사용자 이력 UI 없음 |
| [HomePanel.tsx](../../src/features/home/HomePanel.tsx) / [model.ts](../../src/features/home/model.ts) | 실제 일정·overview에서 `dayStatus` 파생. 미판정 요일/✓/X/-; 과거 날짜만으로 미수행 생성 금지. refreshKey로 일정 변경 반영 |
| [AchievementIcon.tsx](../../src/components/AchievementIcon.tsx) | 공식 아령 SVG/running.png18px. 최근 운동은 최초 계획 달성 분수, 루틴 세로는 등록 종목 수로 사용 의미 구분. 검색용32px 아이콘은 변경하지 않음 |

일정 계약은 [Backend G2~G3](../../../overload-server/docs/api/weekly-schedule.md)의 `assignments/version/timeZone/appliedAt`이다. current/pending·다음 월요일 예약을 최신 화면에 사용하지 않는다. 04시 검사는 서버 책임이며 PWA 조회로 실행하지 않는다. 11/03·11/05는 G3 전환11/07 이전이므로 미판정 요일 잔류가 정상이다. integration의 자동 검사OFF를 운영 동작으로 해석하지 않는다.

루틴/일정 쓰기는 기존 온라인 인증·CSRF·소유권·세대/version을 사용한다. 진행 운동의 IndexedDB3/schema2·snapshot·ACK·writerEpoch·계정 경계는 그대로다. 문서용 HTML은 독립 합성 상태로만 동작하며 운영 데이터나 고정 요청을 수정하지 않는다. T02-A [마감 문서](../tasks/ui-v09-t02a-closeout.md)의 당시 종료/재개 절차는 환경 보존 기록이며 이번 문서 작업에서 서버를 시작·종료하지 않는다.

| 영역 | 현재 계정 경로의 구현 | 후속 구현할 내용 |
|---|---|---|
| 홈·루틴 | [T02-A](../tasks/ui-v09-t02a-home-report.md)의 `HomePanel`이 실제 루틴 상세·주간 일정·통계 overview·세션 상세로 오늘 카드의 WEIGHT/CARDIO, 카드 밖 START, 두 줄 오늘만 선택, 월~일 상태, 최근 기록을 표시합니다. 날짜는 일정의 시간대를 사용하고 UNKNOWN/UNVERIFIABLE은 미수행으로 추정하지 않습니다. 상세는 버전별 재사용하며 새로고침 때 목록과 일정을 재조회합니다. START는 기존 controller에서 처리하며 직전 루틴 버전 변경은 재확인을 요구합니다. 루틴 탭의 온라인 관리와 `WeeklySchedulePanel` 일정 편집은 유지합니다. | T02-B 최종 사용자 실기기 승인, 서버 분석 설정·디로딩 상태 계약 이후 상태별 헤더·게이지 및 디로딩 일정 연동. 미조회·로딩·실패를 분석 OFF나 0주로 대체하지 않습니다. |
| 운동 진행 | `LocalWorkoutScreen`의 세트 완료·취소, 타이머·임시 편집·유산소 입력, 공통 `RepsInput`의 ±1과 직접 입력. | 기존 기록/이번 기록 배치를 재사용합니다. 공통 3열 가운데는 현재 탐색 위치와 표시 대상 종목 수로 파생합니다. 종목 이동·임시 계획 변경 때 갱신하며 완료율이나 별도 저장 필드로 다루지 않습니다. 반복 조작은 초안에만 적용하고 기존 완료 검증·타이머를 보존합니다. |
| 운동 결과·기록 | 기록 탭에서 `ClosedWorkout`의 서버 종료 기록, 당시 장비, 정정·논리 삭제·선택 복구 및 평가에 접근합니다. | 결과와 과거 상세의 공통 수행 영역을 WEIGHT/CARDIO로 나누고 세트별·종목별 볼륨을 표시합니다. 당시 계획과 현재 유효한 실제 수행, 최초 평가와 현재 평가를 구분합니다. 데이터 갱신은 기존 세션 확인과 ACK 흐름을 사용합니다. |
| 카탈로그·통계 | `ExerciseSearch`의 표준 검색, 기록 탭의 `StatisticsPanel` 기간/집계·근육 상세와 `GrowthPanel` 종목·배치 검색을 유지합니다. 근육 화면은 대분류가 기본입니다. 공통 `ExerciseIcon`은 원본 6종을 32px로 제공하며, 현재 분류가 없는 검색 결과는 중립 표시입니다. | 카탈로그 분류 계약 후 대표 아이콘을 매핑합니다. 전체 세부 PRIMARY 기본 표시 및 부위 필터·SECONDARY 펼침을 적용합니다. 운동 현황 필터를 막대와 합계에 일관되게 전달하고, 성장 별칭 검색과 제조사별 참고 집계의 API 범위는 [백엔드 연동 설계](backend-ui-v0.9.md)를 확인합니다. |
| 설정·인증·PWA | 설정 탭에 기존 계정 상세, 세 휴식 값 조회, 데이터 및 앱의 `PwaStatus`, 하단 로그아웃을 배치했습니다. 로그인 화면에는 설치 패널을 표시하지 않습니다. 기존 초안 저장 확인과 로그아웃 경고를 유지하고 공통 Help 팝오버를 제공합니다. | 고정 세 휴식 시간의 온라인 일괄 편집, 독립 설정 토글과 화면별 도움말 배치를 확장합니다. 유실·미전송·재인증 경고는 기존 접근 가능한 상태 영역에 남깁니다. |
| 디로딩 | 일반 세션·주간 일정·기록·통계는 연동되어 있습니다. 디로딩 상태·기간·미리보기·쓰기의 프로덕션 연동은 구현 예정입니다. | 기존 홈·루틴·운동 진행·기록을 재사용합니다. 상세·선택·미리보기와 시작 요청을 연결하고 최신 자격 실패 이유를 노출합니다. 완료·취소는 진행 상세의 단일 확인으로 처리합니다. |

**상태 소유권.** 분석 설정·시작 자격·기간·세션 소속은 서버 응답에서 읽습니다. `일반 보기 / 디로딩 복귀`는 홈에서만 바꾸는 조회 상태이며 루틴·기록 탭 이동 동안 유지합니다. 진행 중 일반 보기에서는 원본 실행·정정·수정·삭제를 제공하지 않습니다. 서버 권한 검증은 별도로 적용됩니다. 미리보기 선택과 편집 초안은 로컬 UI 상태이고, 기간 시작·완료·취소는 서버 확인 이후 표시합니다.

**실패·오프라인.** 새 디로딩 시작과 기간/임시 일정 변경은 서버 자격과 상태 확인이 필요합니다. 이미 시작한 운동은 기존 명시적 오프라인 이어가기, 계정·세대 경계, DB3/schema2, 고정 요청과 재연결 검사를 재사용합니다. 미전송과 서버 저장, 자격 미달과 조회 실패를 각각 표시합니다. 저장 실패·재인증·상태 충돌에서는 초안을 보존하고 기존 저장·복구 경로를 사용합니다. 8~10일차 안내는 운동 수행 중 표시하지 않으며, 종료 시점과 미동기화 수행의 조정은 백엔드 연동 설계의 검증 대상입니다.

**A/B 실험 이력.** 당시 `codex/ui-v09-spike` 작업 트리의 `experiments/ui-v09/`에서 홈·운동·통계 방식을 비교했으며, CSS Modules 55줄/Tailwind 70줄(빈 줄 제외)과 모바일 조작 통과는 당시 측정 기록입니다. 작업 트리·비교 소스·산출물은 실험 종료 후 삭제했으므로 현재 구현 자산으로 참조하거나 복원하지 않습니다. 실제 구현은 공식 설계와 현재 계정 경로의 계약을 따릅니다.

**실험 종료.** A/B 기술 비교는 종료되었으며 테스트 브랜치·worktree·프로토타입·산출물은 삭제했습니다. 과거 실험 참고 문구의 경로·측정값은 당시 기록이며 현재 파일 존재를 뜻하지 않습니다. 실제 구현은 위 공식 설계 자료와 현재 계정 경로의 계약을 기준으로 진행합니다.

**수용 확인.** 분석 ON/OFF·진행·일반 보기·완료 당일의 헤더와 탭 전환, 시작 직전 자격 변화, 완전 휴식, 8~10일차, 미전송 보존을 확인합니다. 세트 취소·재완료, 장비 원본, 숫자 키패드와 터치 영역, 작은 화면의 두 줄 목록·주간 일정, 초점 복귀와 팝오버 닫기를 검증합니다. iPhone/Android에서 설치·백그라운드 복귀와 안전 영역을 별도로 확인합니다.

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

Mock 응답 구조는 실제 백엔드 API 계약을 따라야 합니다.

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

구현 순서는 작업 특성에 맞게 조정합니다.

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

주간 일정은 현재 version/timeZone/appliedAt/assignments를 사용하고 PUT에 contractVersion=immediate-v1을 보낸다. current/pending/nextEffectiveFrom과 예약 표시를 제거했다. 저장 응답과 재조회가 version/정확한 배정/시각에서 일치해야 성공하며, 루틴 성공·일정 실패는 기존 고정 입력으로 일정만 재확인한다. ACTIVE 오류는 종료/저장 확인 안내와 함께 입력을 유지한다.

홈과 루틴 목록은 같은 현재 배정을 재조회한다. 과거 계획·첫 예정 START는 서버 overview의 고정 근거를 사용하고 현재 템플릿으로 덮지 않는다. PENDING과 미검사/재검사0은 미수행 확정 표시를 하지 않는다. 일반 통계의 계획 미달과 실제 무수행을 구분한다. 정책은 [통계 v1.4](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md), API는 [일정 계약](../../../overload-server/docs/api/weekly-schedule.md)을 따른다. 수정 전 UI v0.9 HTML은 별도 보존본이며 현재 HTML과 Decision Log10.14절은 최신 T02-B 레이아웃/즉시 적용을 반영한다.

IndexedDB/ACK/writerEpoch/dataGeneration/타 기기 읽기 전용과 개발용 디로딩 샘플은 유지한다. 당시 G2~G3 단계는 실제 개발·검토 DB migration과 서버 운영 전환을 허용하지 않았다. 기존 V23 전용 재개 도구는 V24를 임의 적용하도록 변경하지 않았다.
