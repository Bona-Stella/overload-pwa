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
| Charts | Recharts 3.10.1 · react-is 19.3.1 (설치·RecordChart 사용) |
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

새 공통 UI 부품은 `src/components/common-ui/`에서 CSS Modules와 기존 Onyx 역할 토큰을 사용합니다. 상위 화면이 상태와 콜백을 제공하며, 합성 데이터와 상태 전환 버튼은 독립 Preview에 둡니다. [공통 UI 구현과 검토 범위](#공통-ui-컴포넌트와-독립-preview--2026-11-19)

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

**기초 코드 조사** 2026-11-16 (KST). Frontend `56993a0`·Backend `732e0c3`를 기준으로 1차 개발의 기능·호출 경로·저장 모델과 테스트 내용을 조사했다. 과거 커밋·자동 테스트 수·승인 기록은 각각 당시 근거로 보존한다.

**FRONT 후속 대조** 2026-11-23 (KST). 문서 갱신을 시작할 때 FRONT는 깨끗한 `main`의 `e88c90c`였으며 로컬의 `origin/main` 추적 참조보다 1개 커밋 앞서 있었다. 소스, 커밋과 보존 검증 로그를 [후속 UI와 안정성 현황](#front-후속-ui와-안정성-현황)에 대조했다. 이번 갱신에서는 테스트·빌드·실기기 검증을 재실행하지 않았다.

**기록 메인 UI 현황 갱신(2026-11-17):** 사용자 최종 디자인 승인 및 `594cf25` 커밋 완료. [최종 UI 결정 10.26절](../product/Overload_UI_Decision_Log_v0.9.md#1026--기록-메인-최종-ui-승인과-문서-동기화--2026-11-17)과 [아래 마감 기록](#기록-메인-최종-ui-보정마감--2026-11-17)을 적용한다. 이 갱신은 기록 메인의 배치·표현에 한정하며 아래 기능 정책별 미완성 구현과 Backend 상태를 완료 처리하지 않는다.

**근육 페이지·공통 헤더 UI 현황 갱신(2026-11-18):** `f2a6768`의 주간 근육 계획·통계와 기록 하위 네 페이지 공통 헤더는 **UI 구현 A / 사용자 승인 B / 코드 커밋 완료**다. [아래 승인 기록](#주간-근육-계획통계와-공통-헤더-최종-ui-승인--2026-11-18)을 따른다. 데이터 미연결 항목과 실제 API 통합·DB·실기기 검증은 UI 승인과 구분한다.

**상세·이력 UI 현황 갱신(2026-11-18):** `3bd64a4`의 운동 기록 상세·전체 운동 이력·최근 카드 수행/계획 표기는 **UI 구현 A / 사용자 승인 B / 코드 커밋 완료**다. 공통 헤더는 상세와 전체 이력까지 6개 기록 하위 화면에 적용했다. [아래 최종 기록](#운동-기록-상세전체-이력최근-카드-최종-ui-승인--2026-11-18)을 따른다. 실제 계정의 전체 과거 운동명 검색은 기존 서버 연결 대기다.

**홈 운동 프로세스 구현 이력(2026-11-18).** `4607d99`에 운동 진행과 종료 직후 요약 UI가 반영됐고, `44300ab`에서 전체 테스트가 통과했다. [당시 구현 기록](#홈-운동-프로세스-리디자인-현황--2026-11-18)과 [P1 후속 구현 및 검증](#p1-01부터-05까지-구현과-검증)을 구분한다.

**루틴 탭 현황 갱신(2026-11-18).** 상세는 `9cd2684`, 편집·생성은 `3f761b2`에 반영했다. [컴포넌트와 검증 이력](#루틴-탭-리디자인-현황--2026-11-18)을 따른다.

**공통 하단 내비게이션 현황 갱신(2026-11-19).** `c123c07`에 확장형 탭바를, `2a911e5`에 스크롤 접기·펼치기와 최종 정렬·색상 보정을 반영했다. [구현과 검증 이력](#공통-하단-내비게이션-리디자인-현황--2026-11-19)을 따른다.

**공통 UI 구현 이력(2026-11-19).** `2a1e10e`에 공통 부품과 독립 Preview의 최종 피드백을 반영했다. 이후 서비스 적용은 [후속 UI와 안정성 현황](#front-후속-ui와-안정성-현황)에 기록한다. [당시 구성·접근·검증](#공통-ui-컴포넌트와-독립-preview--2026-11-19)

| 현행 영역 | 실제 모듈·연결 | 남은 범위 |
|---|---|---|
| 검색 | SearchList의 IDLE/EDITING/SELECTED, ExerciseSearch·SearchExerciseDetails, GrowthPanel·RecordFeed | 호출부별 초기화 다름. 전체 이력의 실제 운동명 검색 미연결 |
| 루틴 | RoutineForm → 온라인 루틴 API. 명시 weightApprovals, 조합 변경 NEW, 초안·고정 요청 보호 | 최근 실제값 자동 제안 없음 |
| 운동·시간 | LocalWorkoutController·LocalWorkoutFlow → IndexedDB/snapshot/FINISH, weight-timing·record-summary | 미관찰 시간/과거 구간 미확인, 기기 간 로컬 초안 복원 보장 아님 |
| 권고·승인 | reference-reminder·SavedWeightReview → GET weight-review / POST weight-review-approvals, 승인 후 재조회 | 공식 evaluate의 전체 조합 제외·대체 슬롯 인정은 미완성 |
| 달성·기록 | achievement·display-achievement·achievementReasons, RecordFeed/ClosedWorkout, 최초/현재 평가 구분 | loaded closed 페이지 범위. UI 이유는 파생값이며 서버 영구 판정 사건 아님 |
| 기록 메인 UI | `594cf25`의 주간 요약·분석 2×2·최근 3행 및 전용 CSS Modules. 사용자 디자인 승인·커밋 완료 | 총 운동 시간 미제공으로 미확인. 완료 종목 수·기존 조회/판정 유지. 색상 통합 검토·하위 기능 경계는 별도 |
| 통계·성장 | plannedAnalysis·actualAnalysis·RecordChart, Overview·성장 API | 선택 프리셋/근육 기여 일부 구현. 네 수준 독립 집계·선택 대상 일별 추이·권장 범위 미완성 |
| 메모·후속 | CombinationMemo의 계정/세대별 마운트 메모리, 프리뷰 분리 | 서버/기기 영속 메모 없음. G6·운영/실기기 검증 별도 |

사용자 조작의 세부 상태 전환과 실패 처리는 [UI/UX 현행 기능 흐름](../product/ui-ux.md#1차-기능의-실제-동작과-연결-범위--2026-11-16), DTO·원자 처리·DB 근거는 [세션 API](../../../overload-server/docs/api/workout-sessions.md), [통계](../../../overload-server/docs/api/statistics.md), [성장](../../../overload-server/docs/api/approved-weight-growth.md)을 참조한다.

#### P1 01부터 05까지 구현과 검증

확정 정책과 06~20의 원래 순서는 [Decision Log 10.40절](../product/Overload_UI_Decision_Log_v0.9.md#1040--p1-개선-정책과-순서)에 기록한다. 아래는 커밋과 현재 프론트엔드 구현 및 확인 범위다.

| 순서 | 구현 근거 | 승인·검증 범위 |
|---|---|---|
| 01 UI-16 | `1e4e4a7`의 [HomePanel](../../src/features/home/HomePanel.tsx)·[RecentWorkout](../../src/features/home/RecentWorkout.tsx)에서 세션 ID를 [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx)에 넘긴다. 기존 상세를 재사용하고 전체 보기는 기록 탭의 전체 이력으로 연다. [상세 이력 훅](../../src/features/history/useRecordDetailHistory.ts)이 홈·기록의 원래 위치 복원을 담당한다. | 완료. 기존 상세/이력 조회 계약을 재사용한다. 격리 브라우저에서 개별 상세·전체 보기와 이력 복귀를 검증한다. |
| 02 UI-13 | `b8d5e1b`의 [useEditorKeyboard](../../src/components/useEditorKeyboard.ts)·[editorViewport](../../src/components/editorViewport.ts)를 [AppShell](../../src/app/AppShell.tsx)에서 공유한다. [SearchList](../../src/components/SearchList.tsx)·[Dialog](../../src/components/Dialog.tsx)·루틴 편집·운동/메모의 실제 렌더링과 스크롤을 조정한다. | 완료. 사용자 iPhone Safari에서 입력 확대 방지와 메모·검색의 왕복 스크롤 개선을 확인했다. 격리 Chrome은 뷰포트·키보드 시뮬레이션과 공간 복원 회귀를 검사한다. 설치형 PWA의 전체 입력 조합 검증은 별도다. |
| 03 UI-02·11·20 | `38f0bfa`의 [useRestAudio](../../src/features/workout-flow/useRestAudio.ts)는 사용자 상호작용으로 활성화한 Web Audio를 복귀 때 재개한다. UI-02·20은 [로컬 알림 설정](../../src/features/workout-flow/useRestAlertPreferences.ts)과 05의 상·하단 점멸을 재사용하고 [운동 연동](#t035-휴식-타이머-시각효과음-알림)을 보완했다. | 사용자 iPhone 실기기에서는 당시 UI-11의 마지막 5초 효과음을 확인했다. UI-02·20 후속 변경의 iPhone 검증과 서버·기기 간 설정 동기화는 남아 있다. |
| 04 UI-24 | `af1046f`의 [navigation.ts](../../src/app/navigation.ts)는 탭·하위 화면을 선형 이력으로 관리한다. [ExerciseSwipe](../../src/features/workout-flow/ExerciseSwipe.tsx)와 [WorkoutFrame](../../src/features/workout-flow/WorkoutFrame.tsx)은 읽기 전용 인접 콘텐츠, 전환과 세로 위치 보정을 담당한다. | 완료. 이전 iPhone 스와이프 피드백과 Chrome 320·375·393·430px의 드래그·취소·경계·위치·이력 회귀를 반영했다. 현재 통합 결과의 설치형 PWA 재검수는 별도다. |
| 05 UI-07·10·19 및 UI-09 | `0331dab`의 [홈 진행 카드 계산](../../src/features/home/active-workout.ts), [LocalWorkoutFlow](../../src/features/workout-local/LocalWorkoutFlow.tsx), [model](../../src/features/workout-local/model.ts), [weight-timing](../../src/features/workout-local/weight-timing.ts)와 [WorkoutSummary](../../src/features/workout-flow/WorkoutSummary.tsx)를 사용한다. UI-09의 편집 명칭·닫기 색·완료 수치 표현을 함께 반영했다. | 구현과 2차 피드백 반영. 기존 브랜치 검증은 자동 테스트 660건, Chrome 모바일 전환/종료/요약, 실제 IndexedDB를 사용한 격리 Edge의 롤백·새로고침 복원·편집 잠금이다. 기존 세션 API 연결과 이 검증을 운영 계정의 실제 저장 검수로 간주하지 않는다. |

- **진행 저장과 시간.** 준비운동 완료 시각, 시작한 웨이트, 준비의 원인이 된 완료 ID와 종목별 휴식은 같은 기기의 로컬 문서에 보존한다. 완료와 자동 이동은 [IndexedDB](#12-진행-운동의-로컬-보호-및-복원)의 한 트랜잭션을 사용한다. 스와이프와 표시 갱신은 서버 쓰기를 발생시키지 않는다. 관찰 구간의 로컬 체크포인트를 이후 완료 스냅샷 또는 FINISH에 포함하며, [V37 DTO와 서버 저장 계약](../../../overload-server/docs/api/workout-sessions.md#웨이트-시간-구간--v37)은 유지한다. 실행 조건은 [UI/UX 시간 의미](../product/ui-ux.md#시간수행-합계의-의미)를 따른다. 메모 입력은 기존 마운트 메모리 초안이며 영속 저장이 추가되지 않았다.
- **요약 최상단 진입.** FINISH ACK를 보존하면 `WorkoutWorkspace`는 세션별 첫 진입을 표시하고 활성 운동 항목을 기록 요약으로 전환한다. `WorkoutSummary` 본문을 렌더링한 직후 첫 프레임에서 그 표시를 한 번 소비해 실제 스크롤 루트인 `document.scrollingElement`를 최상단에 맞춘다. 이후 뒤로가기·앞으로가기는 기존 History 복원 정책을 따른다. [검수의 ProcessSession](../../src/review/RestAudioPreview.tsx)도 요약 경로가 선택된 뒤 같은 컴포넌트를 사용한다.
- **검수 환경.** [4173 운동 검수 경로](http://127.0.0.1:4173/rest-audio-preview?process=1)는 합성 세션과 메모리 응답을 사용한다. 운영 운동 화면·동기화 제어와 요약 표시를 재사용하며 운영 계정·IndexedDB·서버 평가에는 쓰지 않는다. iPhone Safari와 설치형 PWA에서 요약 최상단 진입 및 운영 계정 저장의 재검수는 남아 있다.
- **이번 동기화 검증.** 4173 Chrome에서는 운동 화면의 상단·중간·하단에서 종료한 뒤 요약 최상단과 홈 복귀, 뒤로가기·앞으로가기, 요약 내 수동 스크롤을 확인했다. 운동 기록 상세는 기존 홈 최근 운동 카드와 기록 탭에서 연다. 격리된 운영 컴포넌트 테스트에서는 종료 기록을 지연 로드해 요약 본문이 나타날 때의 초기화와 종료 세션의 이력 복귀를 확인했다. 전체 자동 테스트 660/660, TypeScript, ESLint, 프로덕션 빌드와 `git diff --check`가 통과했다.

#### UI-15·UI-12 유산소 편집과 완료 확인 — 2026-11-20

- PC와 iPhone의 UI 검수는 `npm run review:lan`으로 연 4173의 루트에서 진행한다. iPhone 접속에는 `OVERLOAD_REVIEW_LAN_IP`에 PC의 사설 IPv4를 지정한다. 루트에서 유산소 합성 루틴을 바로 시작할 수 있다. 화면과 계산은 앱의 공통 컴포넌트를 사용하고 검수 상태는 메모리에 보관한다. 정적 빌드로 제공하며, 별도 프리뷰 URL과 서버 API는 이 검수 서버에서 열리지 않는다. 4180은 명시적인 외부 검수가 필요할 때 사용한다.
- 루틴과 진행 운동에서 표준 유산소 카탈로그의 이름·별칭 검색, 유형 필터, 목표 입력을 재사용한다. 목표 시간은 초안에서 비울 수 있다. 현행 루틴·세션 쓰기 계약은 양의 정수 초를 요구하므로 미입력 상태에서 서버 저장을 보류한다.
- 거리 자동 추정은 계정별 기기 설정이며 기본값은 OFF다. 목표 거리와 실제 활동시간으로 만든 추정 거리·자동 평균 속도는 완료 확인 초안에 표시한다. 목표 거리 추정은 실제 수행이나 통계에 포함하지 않는다. 수동 거리 및 실제 속도에서 계산한 거리는 현재 측정 계약으로 저장할 수 있다.
- 사용자 UI 검토와 실기기 확인은 대기 상태다. 서버 계약 후속 작업은 선택 목표 시간, 추정·계산·수동 출처, 실제 경사도, 속도 단독 저장 및 통계의 추정값 구분이다. 계정 간 기기 동기화가 필요해지면 추정 설정의 서버 영속화도 필요하다. [현재 실제 측정 계약](../../../overload-server/docs/api/cardio-actual-measurements.md)

#### 2026-11-16 확정 정책별 구현 점검

[사용자 확정 3-1~3-8](../product/Overload_UI_Decision_Log_v0.9.md#1025--2026-11-16-최신-정책-확정과-구현-경계)과 현행 코드를 대조한 상태다. ‘구현 확인’은 소스·테스트 assertion 확인이며 이번 문서 작업의 실행 검증·실제 DB 적용/실기기 승인이 아니다.

| 정책 | Frontend | Backend |
|---|---|---|
| 3-1 원계획·거리 미입력 | **정책 확정 / 일부 구현.** sessionAchievement는 InitialPlan이나 목표거리+실제null을 unknown 처리. partialAchievement/achievementReasons도 전환 필요. summaryData는 AppliedPlan 분모·별도 whole 조건으로 통일 필요 | **정책 확정 / 일부 구현.** InitialPlanCompletion·PlanningCalculator는 원계획 기준이나 거리null을 unknown 처리. 날짜 검사와 G4 공통 완료 입력도 전환 영향 확인 |
| 3-2 Benchmark | **정책 확정 / 구현 확인.** reference-reminder는 총 반복·최신 종료·UUID 순. 공식 판정 원본은 서버 | **정책 확정 / 구현 확인.** WorkoutAssessment.benchmarkOrder가 같은 순서. 초기 동점 유지 설명은 대체됨 |
| 3-3 웨이트 시간 A안 | **정책 확정 / 구현 확인.** weight-timing은 보이는 수행 화면 구간만 측정하며 기록 집계에서 불완전은 null이다. [P1 이후 시작·준비·휴식 처리](#p1-01부터-05까지-구현과-검증)를 적용한다. | **정책 확정 / 구현 확인.** V37 parser/서비스·종료 불변 구간 보존. 실제 동작 감지나 미관찰 시간 복원 아님 |
| 3-4 조합 변경 NEW | **정책 확정 / 일부 구현.** RoutineForm의 교체/장비 변경은 NEW 처리. 조합 왕복 편집·취소 등 전체 경계 실행 검증은 별도 | **정책 확정 / 구현 필요.** 기존 EDIT가 같은 배치 장비 변경을 수용하므로 서버 강제가 미완성 |
| 3-5 오늘만 대체 | **정책 확정 / 일부 구현.** 조합 변경 감지·검토 제외 일부. 원슬롯 완료 연결 없음 | **정책 확정 / 일부 구현.** V36 봉인 권고 제외와 공식 evaluate의 전체 제외는 다름. 원슬롯·홈/통계/G4 연결 필요 |
| 3-6 최근 실제·메모 | **정책 확정 / 구현 필요.** NEW 중량 수동 입력. CombinationMemo는 메모리만 있으며 blur/LWW/온라인 서버 저장 없음 | **정책 확정 / 구현 필요.** FINISHED 전용 최근 마지막 세트·조합별 최신 메모 API 없음. 저장 시점·동시 수정은 이제 확정 정책 |
| 3-7 전체 과거 검색 | **정책 확정 / 일부 구현.** 월 복귀·순차 closed 조회는 있음. 루틴 검색은 로드 범위, 실제 운동명 검색 미연결 | **정책 확정 / 구현 필요.** closed의 cursor/limit에는 월·루틴명·실제 운동명 필터 없음. 전체 다운로드 대신 서버 필터/페이지 필요 |
| 3-8 독립 집계·일별 추이 | **정책 확정 / 일부 구현.** 선택 프리셋/근육 기여 일부. 실제 독립 분류·선택 대상 일별 값 없음 | **정책 확정 / 일부 구현.** 근육 기여·전체 days 존재. groups는 근육 매핑 참여이며 검수 운동 부위 직접 집계와 다름 |

거리 미입력 정책의 기존 테스트는 이전 동작을 검증한다. 예를 들어 InitialPlanCompletionTests.missingRequiredCardioMeasurementsPreserveUnknownBounds는 거리null도 unknown으로 기대한다. 테스트 존재를 최신 정책 충족 증거로 사용하지 않는다. 코드와 정책의 차이를 문서에 기록했으며 실행 코드/테스트는 수정하지 않았다.

#### 확정 정책의 남은 구현 순서

| 우선순위 | 작업 | 의존성·완료 근거 |
|---|---|---|
| P1 | 3-1 공통 InitialPlan 달성·종료 요약 통일, 거리null 시간 비교·부분 인정/이유 반영 | 서버 공통 완료 → 날짜 검사/G4 입력·Frontend/summaryData. 시간 부재/다른 강도 보호·거리 입력/미입력·순수 유산소·목표 편집 경계 회귀 필요 |
| P1 | 3-4 서버 NEW 강제 및 3-5 공식 세션 전체 제외·대체 슬롯 연결 | 조합 변경 이력/원슬롯 근거와 검수 분류·첫 PRIMARY 확인이 선행. 저장 표현·DTO는 구현 검토이며 정책 재선택 아님 |
| P2 | 3-6 FINISHED 최근 실제 조회 및 온라인 메모 blur/LWW 저장 | 사용자/세대/정확한 조합·현재 유효 정정값·오래된 응답 배제. HTTP/저장 구조 설계 후 양쪽 연결, 새로고침 초안 보장은 미확정 |
| P2 | 3-7 전체 과거 검색의 서버 필터·페이지 조회 | 날짜 범위·정렬·월 복귀·세션 실제 운동명 검색 근거 검증. 기존20건만 검색하거나 전체 이력 다운로드로 대체하지 않음 |
| P2 | 3-8 네 수준 독립 집계·선택 대상 실제 일별 추이 | 검수된 운동 분류의 판정 원본 확인 후 날짜별 집계·프리셋/당시 계획 분리. 분류 불명확은 미확인 유지 |

**근육 집계 후속 정책(2026-11-13 당시 기록, 현행 범위는 위 표):** [14.3절 후속 경계](#근육별-독립-집계와-선택-프리셋-계획--2026-11-13)에 따라 실제 기여의 기존 구현과 계획 기여·네 수준·선택 프리셋 계획의 미구현을 구분한다. 최종 UI는 아래 2026-11-14 확정을 적용하며 기존 검증 이력으로 신규 정책 구현을 완료 처리하지 않는다.

**2026-11-14 UI 1차 최종화(당시 기록):** [Decision Log 10.23절](../product/Overload_UI_Decision_Log_v0.9.md#1023--ui-와이어프레임-최종-확정--2026-11-14)과 [UI/UX 적용 지점](../product/ui-ux.md)을 동기화했다. 기존 HTML의 분석·중량 승인 합성 시연을 보존하고 전체 보기 스위치를 제목 우측으로 이동했다. **설계 확정 / React·API 연결·통합 검증 필요**이며 신규 분석 페이지, 전체/선택 승인, 공유 서버 메모, 대체 슬롯·공식 평가 전체 제외, iOS History·모달 포커스는 구현 완료가 아니다. 코드·DB·기존 테스트는 변경하지 않았다. 기존 정정·PENDING 승인 해결 안전장치는 유지한다.

**기록 탭 후속 설계 동기화(당시 기록):** [10.24절](../product/Overload_UI_Decision_Log_v0.9.md#1024--기록-탭-최종-개편--2026-11-14)의 최종 HTML을 소스·기존 시연 검증과 대조했다. 이번 갱신은 문서 전용이며 HTML 기존 변경분·React·Backend·DB·테스트는 수정하지 않았다. 주간 근육 통계의 이번 주 고정, 공통 기간/검색, 날짜별 △, 최근 7일·월간 피드/범위 검색/주차 구분은 **설계·합성 시연 완료 / 실제 UI·데이터 연결 필요**다. 10.23.5~7절 중량 승인·정정/PENDING·iOS UX는 유지한다.

**2026-11-14 후속 React 구현 / 최종 UI 승인 전(당시 기록):** [구현·검증 보고](../tasks/ui-v09-frontend-record-implementation.md)의 ①~⑦을 반영했다. 기록 2×2·분석/기간/검색/월간 피드·승인 초안·조합 메모 초안·History/포커스를 기존 컴포넌트로 구현하고 읽기 API를 연결했다. 확인된 현재 계획·실제값만 표시하며 권장 범위·검수 부위·선택 추이·완전한 이력 검색·△의 서버 근거·일반 일괄 승인·서버 메모/최근값은 연결 대기다. 조합 변경 NEW는 기존 루틴 저장을 사용하고 대체 연결/재전환 제외는 로컬 UI 근거와 서버 공식 판정을 구분한다. 공식 완료율·승인 사건·G4·정정/PENDING 계약과 Backend·HTML은 변경하지 않았다. 테스트 600건·build·lint 통과, 실기기·실제 Backend 통합·사용자 최종 승인은 미완료다.

| 범위 | 상태와 근거 |
| --- | --- |
| T01 공통 기반 | **완료.** 계정 앱 셸, Onyx 역할 토큰, 공통 컴포넌트가 현행 코드에 포함돼 있다. 구현 `ad8d664a1a5ef60caea96d5787a12bfe01875988`의 최종 검증은 자동 테스트 507건, build·lint, 격리 Chrome 8개 검증 그룹을 통과했다. [T01 보고서](../tasks/ui-v09-t01-foundation-report.md#최종-검토로컬-커밋-범위) |
| T02-A 일반 홈 | **완료.** 구현 `60a6dce9707c861926b0690e47a421db21c91ae2`의 2026-11-06 iPhone 사용자 승인 기록이다. [T02-A 마감](../tasks/ui-v09-t02a-closeout.md) |
| T02-B 단일 일정 | **이전 구현 기록.** 당시 루틴 태그·편집과 단일 일정 즉시 적용을 구현했다. 2026-11-08 확인 기록은 자동 테스트 548건·build·lint 통과이며 당시 최종 실기기 승인은 별도였다. [당시 검증](../tasks/deload-v17-backend-readiness-analysis.md#0-2026-11-08-1차-개발-최종-현황) |
| T02 HOME·ROUTINE 다중 프리셋 | **UI·연동·PC 검토 완료.** Mock 구현과 사용자 UI 피드백 반영 후 계정 화면을 V30·V31에 연결하고 격리 실제 API로 검증했다. 아래 범위와 실기기 경계를 적용한다. [현재 API 소비](backend-ui-v0.9.md#t02-b-현재-api-소비) |
| 표준 운동 DB 확장 3단계 | 근육 통계 화면에 세부 기여와 상위 그룹 실제 세트를 구분해 표시한다. [통계 계약](../../../overload-server/docs/api/statistics.md) |
| 표준 운동 DB 확장 2단계 | 설정에서 공개 운동을 검색하고, 루틴·세션은 현재 기록할 수 있는 종목만 선택한다. [카탈로그 계약](../../../overload-server/docs/api/standard-exercise-catalog.md) · [검증 범위](#표준-운동-db-확장-2단계) |
| CATALOG-01·02 및 SETTING-01 | **실제 API 연동·격리 검증·사용자 최종 승인 및 마감.** 계정 설정의 전체 메뉴와 공개 운동 목록·UUID 상세를 연결했다. 하이 로우 보호 GIF는 내부 검토 계정에서 확인했다. [최종 마감](#catalog-0102--setting-01-실제-계정-마감) |
| 일반 운동 UI 및 실제 API (2026-11-13 기록) | **구현·사용자 검수 피드백·로컬 코드 커밋 완료.** UI 승인 `e2965d8` 이후 일반 계정 경로를 실제 API에 연결했다. 메모는 기기·세션 범위이며 서버 저장은 미구현이다. 2026-11-13 문서 동기화, 검토 서버 종료. 실기기·운영 경계와 당시 검증은 [마감 기록](../tasks/ui-v09-workout-api-integration.md#최종-마감--2026-11-13)을 따른다. |
| T03·T04 및 G6 | **후속.** 홈의 디로딩 분석·기간 조회와 일반 쓰기 보호는 연결했다. 기간·임시 계획의 편집, 디로딩 START 및 혼재 세션의 검증·로컬 저장·동기화는 G6 범위다. [G6 선행조건](backend-ui-v0.9.md#g6-실제-연동-선행조건) |
| T03.5 휴식 타이머 알림 | **운영 설정과 실제 운동 연결 구현.** 화면 어둡게·위치별 깜빡임, 종료 카운트음, 20·30·60초 전 중간 알림음, 별도 미리보기와 계정별 브라우저 저장을 지원한다. UI-02·UI-20에서 실제 운동 복귀·알림 해제와 미리보기의 종료음 판정을 보완했다. 서버 동기화는 미지원이며 iPhone 검증은 남아 있다. [구현 지침](#t035-휴식-타이머-시각효과음-알림) |
| 실기기·후속 통합 | **검증 대기.** 최신 HOME·ROUTINE의 iPhone Safari, 설치형 PWA 및 신뢰된 로컬 HTTPS START는 이번 PC 검증에 포함되지 않았다. [실기기 검증 규칙](#167-실제-iphone-테스트) |

#### 일반 운동 실제 API 연결 — 2026-11-13

**후속 정책 주의:** 아래는 2026-11-13 기존 코드 연결 기록이며 위 현행 표로 구현 범위를 갱신한다. 같은 날 이후 확정된 조합 변경 NEW·최근 실제값 조회·메모 서버 저장·오늘만 조합 변경의 세션 공식 평가 전체 제외·대체 슬롯 완료는 [후속 구현 지침](#루틴-중심-중량메모대체-후속-구현--2026-11-13)을 적용하며 아직 구현하지 않았다.

계정 화면은 `WorkoutWorkspace → LocalWorkoutScreen → LocalWorkoutFlow`에서 승인된 `workout-flow` UI를 재사용한다. `routine-preview?review=workout`의 Mock은 격리 시연이며 실제 계정의 데이터 출처가 아니다. [연동 기록](../tasks/ui-v09-workout-api-integration.md)과 [현행 API](../../../overload-server/docs/api/workout-sessions.md)를 함께 확인한다.

| 연결 지점 | 현재 구현 |
|---|---|
| 진행·복원 | 기존 AuthController/WorkoutApi, LocalWorkoutController/WorkoutSynchronizer 및 IndexedDB DB3/schema2를 사용한다. 서버 소유자·세대·기기 epoch·revision·ACK를 검증한다. 현재 종목·준비운동·입력·타이머는 기기 사본으로 복원하며 원본/새 초안을 오래된 응답으로 덮어쓰지 않는다. |
| 순서·세트 | AppliedPlan의 안정 UUID로 탐색과 번호를 계산한다. 목록 드래그 초안은 목록 닫기로 취소, 변경하기로 적용한다. 세트 중량·반복 휠과 직접 입력, 완료·취소·제외·추가, 장비 변경은 기존 직렬 저장 경계를 사용한다. |
| 휴식·유산소 | 마지막 계획 세트는 휴식을 만들지 않는다. 수동 휴식 종료는 즉시 숨기고 재생 중 음을 끄며 진행 중 연장 뒤에 직렬 적용한다. 자동 5~1초 효과음과 구별한다. 유산소 준비/진행/일시정지/완료 확인/확정 및 실제 측정 출처를 유지한다. |
| 저장·오류 | 전체 확정 snapshot을 고정 전송한다. 정상 저장 성공 문구·빈 상태 영역은 상시 노출하지 않는다. 미저장·오프라인·실패·승인 확인과 재시도는 노출하며 입력을 보존한다. FINISH의 최초 시각·최종 snapshot을 고정하고 ACK 보존 후 요약으로 전환한다. |
| 평가·요약 | useProgressAssessment는 CLEAN 및 서버 확인 revision의 ACTIVE 잠정 평가만 사용한다. summary-data는 세션/version과 수행 UUID/ordinal/reps를 검증해 weightReview를 연결하고, BigInt 소수 산술로 실제 볼륨을 표시한다. 공식 평가 자격·기준 기록은 서버가 소유한다. |
| 종료 기록 | ClosedWorkout은 WorkoutSummary를 공유한다. 상세/정정/복구/삭제/평가 변경 이력은 기존 ClosedWorkoutController와 API를 사용한다. 실패 입력, expectedVersion, tombstone 및 원본 UUID를 보존한다. |
| 검색 | ExerciseSearch를 설정 공개 목록·루틴·세션 선택에서 공유한다. 이름/별칭·부위 필터·공식32px 아이콘·대분류/PRIMARY를 표시한다. 공개 열람과 신규 선택 가능 여부는 별개다. |
| 메모 | equipmentMemos와 미저장 메모 버퍼는 해당 기기·세션에만 저장한다. snapshot·서버 revision·다른 기기 동기화에는 포함하지 않는다. 서버 메모 계약은 없다. |

WorkoutFrame의 본문 스크롤 소유자는 document/window다. 메모 포커스 중 footer를 hidden으로 완전히 숨기고 실제 footer 높이 예약을 해제한다. VisualViewport의 pan offset에 따라 문서 높이를 바꾸지 않는다. 하나의 160ms 안정 대기 작업이 카드 전체와 상단 고정 헤더/가시 viewport 경계를 측정하며 하단 48px 및 실제 부족 스크롤 거리만 보정한다. 보정 후 수동 touch/wheel/drag가 우선이며 pan/툴바 변화마다 원위치로 되돌리지 않는다. 회전 등 필요한 경우만 재측정한다. blur와 실제 viewport 닫힘을 함께 확인한 뒤 임시 공간을 제거하고 footer를 복원한다. 수동 이동이 없고 같은 메모일 때 입력 전 위치를 가능한 스크롤 범위 안에서 복원한다.

고정 액션의 ResizeObserver 실측 높이에는 Safe Area가 포함된다. 액션이 없으면 버튼 예약 대신 최소 Safe Area+8px만 사용한다. AppShell의 하단 예약은 보이는 운동 프레임에만 해제한다. useFitWorkoutTitle은 번호/이름 전체의 실제 폭을 측정해 최소16px까지 축소하고 남으면 말줄임한다. 숫자 휠·다른 입력에 메모 전용 보정을 적용하지 않는다.

당시 검수 빌드는 Web Locks를 사용하는 출처에서만 편집을 허용했다. 현행 사설 LAN 검수의 운동 START는 [4173 PWA 검수](#review-4173)를 따른다. UI 1차의 사용자 실기기 승인과 API 연동 후 에이전트 실기기 미검증을 구분한다. HTTPS/설치형 PWA/운영 검증 및 디로딩 G6는 이 검수 이후의 범위였다. 해당 문서 작업에서 제품 테스트·Lint·타입 검사·빌드를 다시 실행하지 않았다.

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
| 세트 사이 휴식 | `WorkoutWorkspace`가 `RestSettings`에 계정별 저장값과 GET/PATCH 핸들러를 연결한다. | `RestSettings`를 재사용하며 180·120·90초에서 시작하는 검토 값만 변경한다. |
| 휴식 타이머 알림 | `RestAlertSettings`에서 계정별 브라우저 설정을 관리한다. 운동의 `LocalWorkoutView`가 읽어 적용한다. | `SettingsReview`와 `WorkoutReview`가 `RoutinePreview`의 합성 설정을 공유한다. |
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

#### 설정 메인과 계정 설정 리디자인 현황 — 2026-11-18

- [SettingsMain](../../src/features/settings/SettingsMain.tsx)은 요약·그룹·독립 로그아웃을 공통 Card/Button과 페이지 CSS로 구성한다. `AuthApp`은 기존 계정 조회로 확인한 마스킹 대표 이메일과 연결된 로그인 수단을 전달한다. 고유 기기 수는 조회 미지원으로 표시한다. 값 조회 중에는 계정 카드 안의 스켈레톤을 사용한다.
- `AuthApp`이 계정·휴식 조회·카탈로그 이동과 현재 브라우저 로그아웃을 연결하고 설정 복귀 시 초점과 스크롤을 유지한다. 알림 조작은 개발 검토에만 연결한다. 디로딩 설정·데이터 상태·내보내기·초기화·탈퇴는 기존 비활성 행이다. [PwaStatus](../../src/pwa/PwaStatus.tsx)는 네이티브 접이식 영역에서 설치 가능 여부·준비·실패·업데이트와 오프라인 안내를 표시한다. 기존 로컬 운동 저장·이어가기와 서버 ACK는 [12절](#12-진행-운동의-로컬-보호-및-복원)을 따른다.
- [AccountSettings](../../src/features/auth/AccountSettings.tsx)는 공통 `RecordSubpageHeader`, `AccountDetailUi`와 페이지 CSS를 사용한다. `IdentityManagement`는 서버의 연결 목록, 이메일 연결·Google 폼·해제 확인을 표현한다. `AuthController`가 사용자·세대와 CSRF, OTP·조회·쓰기 경계를 관리한다. 최근 OTP 성공 표시는 마운트 상태의 `confirmedAt`으로 표시하는 피드백이며 권한 판정과 서버 이력 조회와 구분한다. [계정 API 범위](backend-ui-v0.9.md#설정-메인과-계정-설정-연동)
- `/routine-preview?tab=settings`의 [SettingsReview](../../src/review/SettingsReview.tsx)는 합성 계정과 세 로그인 수단 조합을 같은 상세 레이아웃에 주입한다. 운영의 컨트롤러와 쓰기 권한은 주입하지 않는다. 기기 관리로의 분기와 복귀는 다음 절을 따른다.
- **구현 당시 검증.** 설정 메인 `7f9f85b`에서 전체 645/645, 계정 설정 `8040054`에서 646/646을 기록했다. 두 작업에서 TypeScript·린트·프로덕션 빌드와 Chrome 320·375·393·430·1280px 검토를 수행했다. [컴포넌트](../../tests/components.test.mjs)·[인증 UI](../../tests/auth-ui.test.mjs)·[브라우저 회귀](../../tests/preset-review.test.mjs)를 구분한다. 이 결과는 문서 갱신 검증과 별개다.

#### 로그인된 기기 관리 구현 현황 — 2026-11-18

- [AccountSettings](../../src/features/auth/AccountSettings.tsx)의 기기 관리 행이 [LoggedInDevices](../../src/features/auth/LoggedInDevices.tsx)를 연다. `useScreenHistory`의 계정별 `account-devices:` 값으로 브라우저 뒤로가기를 지원한다. 새 화면에서는 제목에 초점을 두고 복귀 시 저장한 스크롤과 진입 버튼에 초점을 돌려준다. [탭 루트 전환](../../src/app/navigation.ts)에서 기기 관리 하위 상태를 정리한다.
- `LoggedInDevices`의 `DevicesState`는 미지원 기본값, 로딩, 실패, 준비된 스냅샷을 구분하는 화면 입력이다. API 응답 계약은 아직 없다. 운영은 별도 기기 요청을 보내지 않고 원격 버튼을 비활성화한다. 스냅샷 시연은 확인된 현재 ID와 최근 접속순으로 카드를 배치하고, 누락된 접속 상태를 온라인·오프라인 수치로 추정하지 않는다.
- 개발 검토 경로 `/routine-preview?tab=settings`에서 [SettingsReview](../../src/review/SettingsReview.tsx)가 [DevicesReview](../../src/review/DevicesReview.tsx)를 주입한다. 합성 기기·시각·편집 기기 예시와 세 종류의 검토 확인창은 운영과 분리된다. 공통 헤더·카드·버튼·Dialog를 재사용한다. 확인은 모달만 닫으며 세션 종료나 운동 상태 변경을 실행하지 않는다.
- 실제 운동 편집 여부는 기존 `WorkoutWorkspace`의 ACTIVE 세션, 편집 기기 ID·writer epoch 및 로컬 쓰기 보호를 따른다. 온라인 표시와 권한은 별개다. 인증 세션과 운동 편집 기기의 연결은 [서버 연동 과제](backend-ui-v0.9.md#로그인된-기기-관리-연동-경계)다.
- **구현 당시 검증(`f71427e`).** 전체 647/647, [인증 UI](../../tests/auth-ui.test.mjs)를 포함한 관련 94/94, TypeScript·린트·빌드·diff 검사 통과. [브라우저 회귀](../../tests/preset-review.test.mjs)에서 Chrome 320·375·393·430·1280px, 상태 전환, 확인창, 계정 설정 복귀를 확인했다. 실제 서버 원격 종료와 iPhone Safari·설치형 PWA는 당시 확인하지 않았다. 이번 문서 갱신의 검사와는 별도다.

<a id="catalog-0102--setting-01-실제-계정-마감"></a>

#### CATALOG-01·02 / SETTING-01 실제 계정 마감

2026-11-12 사용자가 현재 화면과 기능을 직접 확인하고 최종 승인했다. PWA 구현은 `9c276d5`, Backend 검토 실행 스크립트는 `ed70174`에 기록했다.

- CATALOG-01은 인증된 `GET /api/v1/standard-exercises/catalog`의 공개 운동에 이름·별칭 검색과 부위 필터를 적용한다. CATALOG-02는 선택한 표준 UUID로 `GET /api/v1/standard-exercises/{exerciseId}`를 호출하고 응답 UUID·필드를 검증한다. PRIMARY 순서와 첫 `핵심` 표시, SECONDARY, 분할·기구 설명·`instructionSteps`, 빈 값과 오류 상태를 처리한다. 상세에서 목록으로 돌아오면 검색어·필터·스크롤과 포커스를 복원한다. [계약](../../../overload-server/docs/api/standard-exercise-catalog.md)
- SETTING-01의 실제 계정과 Mock은 `SettingsMain`의 공통 정보 구조를 사용한다. 실제 계정 정보·두 휴식 설정·카탈로그·PWA 상태·로그아웃을 연결했다. 디로딩 설정, 운동 데이터 상태·내보내기, 전체 운동 데이터 초기화, 회원 탈퇴는 미구현 표시와 함께 비활성이다.
- V35 전용 검토 DB의 머신 하이 로우 한 종목에 원본 `nZZZy9m.gif`를 대표로 지정했다. 검토 전용 매핑은 같은 출처의 보호 경로를 사용한다. 기존 세션·회원 허용 행·대표 출처를 확인하고 `no-store`로 전송한다. **동작 시연**의 1:1 영역과 `object-fit: contain` 안에 흰색 배경 원본을 표시한다. 원본은 180×180px, 12프레임, 3초 주기 무한 반복이며 AscendAPI 출처를 표기한다. [보호 미디어 계약](../../../overload-server/docs/api/standard-exercise-catalog.md#보호-gif-전송과-ui-계약)
- 로컬 내부 검토 전용 계정은 구현된 앱 기능과 시연 대상 미디어의 열람 권한을 허용하는 것을 기본으로 한다. 실제 로그인·사용자 소유권·회원 권한 검사는 유지한다. 운영 계정 정책과 정식 미디어 제공은 별도다. 실제 파일·접근키·토큰·검토 전용 GIF 매핑은 프로덕션 산출물에 포함하지 않는다.
- 이전 작업 보고의 검증 결과다. 실제 V35 목록·상세 31종을 대조했고 Chrome 1280px·320px·393px에서 계정 설정·검색·필터·복귀와 원본 GIF 프레임 반복을 확인했다. 보호 응답은 인증 `200`과 원본 바이트 일치·`no-store`, 비로그인 `401`, 다른 종목 `404`였다. 설정 작업의 전체 자동 테스트 558건·관련 회귀 49건, GIF 작업의 관련 테스트 6건·Backend 보호 GIF 통합 1건, Lint·타입 검사·빌드가 통과했다. 이 수치는 단계별 실행 결과다. 자동 검증에서 실제 iPhone Safari는 사용하지 않았으며, 사용자의 직접 확인 및 최종 승인과 구분한다. 최종 마감에서는 테스트·Lint·타입 검사·빌드·화면 검수를 재실행하지 않았다.
- 마감 시 4180 프런트엔드, 3838 Backend 및 1954 제어 서비스, 3840 미디어 권한 검사·4181 Nginx를 정상 종료했다. V35 tmpfs PostgreSQL 32778은 종료 전에 Git 제외 경로에 전체 덤프를 보존했고, 해시·43개 테이블·주요 행 수와 전체 SQL 읽기를 확인한 뒤 종료했다. 새 DB로 복원 실행은 하지 않았다. 검토 포트 6개는 모두 해제됐다. [종료 및 복원 경계](../../../overload-server/docs/engineering/test-environment.md#catalog-검토-종료-기록)
- 후속 범위는 비활성 설정 기능의 실제 연결, 정식 제공용 대표 경로 전달과 미디어 권리·배포 설정, 실제 iPhone Safari 및 신뢰된 HTTPS 설치형 PWA 검증이다.

#### 기록 메인 레이아웃 검토 — 2026-11-17

- `StatisticsPanel`의 summary 화면과 `SessionRecordCard`의 recent 표시만 재배치했다. 주간 요약의 큰 달성률·진행 바·3열 지표, 설명과 선형 아이콘을 갖춘 2×2 분석 카드, 날짜/상태·루틴명·완료 종목 수/전체 경과시간의 3행 최근 기록을 적용했다. `RecordMain.module.css`에서 홈·루틴과 같은 5px 카드 모서리와 기존 Onyx 토큰을 사용하며 다른 화면 스타일은 유지한다.
- 주간 총 운동 시간은 현행 Overview에 없어 `미확인`으로 표시한다. 최근 종목 수는 기존 achievement.completed를 재사용하므로 일부 수행 종목 전체를 새로 세는 값은 아니다. API·조회/날짜 범위·합산·달성 판정·라우팅·저장/동기화는 변경하지 않았다. 정책 3-1~3-8의 미완성 구현도 이 UI 작업에서 전환하지 않았다.
- `npm run lint`, `npm run build`(TypeScript 포함), 전체 `npm run test` 640건을 통과했다. 초기 샌드박스의 localhost EACCES/Chrome 실행 제한은 제한 밖 재검증으로 구분했으며, 변경된 제목·카드 표시를 기존 회귀 검사에 반영했다. 기존 500kB 초과 청크 빌드 경고는 남아 있다.
- 기존 합성 데이터 `ui-review`에서 320/375/393/430px 및 PC 1440px의 넘침·2×2 크기·3열 잘림·긴 이름 최대 2줄·날짜/상태 같은 행·카드 간격·하단 내비게이션 여유를 확인했다. 분석 네 화면·월간 이력/검색·기록 상세와 복귀, 빈 상태·오류·느린 재조회 중 기존 화면 보존을 검증했다. 새 가상 지표나 실제 API 요청은 추가하지 않았다.
- **UI 구현 A / 최종 사용자 승인 B 대기.** 실제 API 신규 연동·DB 검증 C/D 및 iPhone Safari 실기기 검증은 이번 범위 밖이다. 요청에 따라 4180의 실행 식별자·PID를 확인한 카탈로그 프런트엔드만 종료했다. 4173 검토 환경은 피드백을 위해 유지하며 중간 커밋하지 않는다. PC는 `http://127.0.0.1:4173/routine-preview?tab=history`, 같은 사설 LAN은 `http://192.168.0.3:4173/routine-preview?tab=history`다.

#### 기록 메인 2차 시각 보정 — 2026-11-17

- 위 1차 구현에 이어 사용자 2차 요청을 적용했다. 요약의 하단 안내·여백을 제거하고 유산소 지표를 기존 SVG 방식의 발자국 아이콘으로 바꿨다. 분석/최근 제목은 18px·600으로 통일하고 분석 카드의 상시 강조 테두리는 없애되 기존 카드 배경·크기·클릭·키보드 포커스를 유지한다.
- 최근 기록의 기존 조회 범위를 `YY-MM-DD ~ YY-MM-DD`로 헤더에 옮겼다. 375/393/430px은 제목·기간·전체 보기 한 줄, 320px은 날짜를 다음 줄 오른쪽에 놓는다. 루틴명은 한 줄 말줄임이며 경과시간은 최근 카드에서만 `총 42분 / 총 1시간 / 총 1시간 10분`으로 표시한다. 기존 recordDuration의 분 단위 버림을 그대로 사용하고 원본 밀리초·미확인·완료 종목 수·조회/판정/라우팅은 변경하지 않는다.
- 320/375/393/430px과 PC 1440px에서 제목/기간/전체 보기 겹침, 2×2 정렬·3열 잘림·한 줄 말줄임·키보드 focus-visible·3행 상태 정렬·하단 내비게이션 여유와 기존 이동·빈 상태·오류·느린 재조회를 확인했다. 일회용 브라우저는 종료했고 기존 4173 디자인 환경은 유지한다. 4180은 닫힌 상태다. 실제 API·DB·합성 데이터 생성/시연 설정·다른 페이지·전역 테마는 변경하지 않았다. iPhone Safari 실기기 및 최종 사용자 승인은 별도이며 커밋하지 않는다.
- `npm run lint`, `npm run build`(TypeScript 포함)를 통과했다. `npm run test`의 두 병렬 실행에서는 각기 다른 Chrome 검사가 페이지 로드 시간 초과로 실패해 각 640/641건을 통과했다. 코드·제한 시간을 바꾸지 않고 `node --test --test-concurrency=1 tests/*.test.mjs`로 순차 재검증해 **641/641건을 통과**했다. 최근 시간의 42/60/70/135분·분 경계 버림·미확인 및 원본 불변 검사를 포함한다. 기존 500kB 초과 청크 빌드 경고는 유지한다.

#### 기록 메인 최종 UI 보정·마감 — 2026-11-17

- **최종 상태:** 기록 메인 디자인 승인·구현·커밋 완료. 기준 커밋은 `594cf2575df7aed2d440ebfd6d5bb28e9ed94fb5`이며 이번 문서 동기화 요청에서 사용자가 최종 승인을 확인했다. 공식 배치·문구는 [UI/UX 3.10절](../product/ui-ux.md#310-기록-및-설정--history--settings)과 [Decision Log 10.26절](../product/Overload_UI_Decision_Log_v0.9.md#1026--기록-메인-최종-ui-승인과-문서-동기화--2026-11-17)을 따른다. 실제 연동/통합 검증 범위와 UI 승인 상태는 구분한다.
- 사용자가 확정한 전체 구조를 유지하고 세 항목만 최종 보정했다. 발자국 두 발끝을 같은 진행 방향으로 정렬하고, 분석 네 카드 제목에 기존 `--text-primary`·15px·600 및 설명에 기존 보조색·12px·400을 적용했다. 최근 카드의 시작 시각은 기존 recordTime 결과에서 `MM.DD · 요일 한 글자 · HH:mm`으로만 포맷한다. 시계/덤벨·카드 크기/패딩/간격·기간 헤더와 320px 배치·시간대/정렬/판정/조회/이동은 유지한다.
- `npm run lint`, `npm run build`(TypeScript 포함), `node --test --test-concurrency=1 tests/*.test.mjs` **641/641건**을 통과했다. 320/375/393/430px 및 PC 1440px에서 이전 카드 너비·높이와 일치하고, 제목/설명 잘림·최근 날짜 형식·상태·말줄임·포커스·기존 이동 및 예외 상태를 확인했다. 기존 500kB 초과 청크 경고는 남아 있다.
- 이전 LAN 연결 초기화 문제는 검토 서버 재시작으로 해결했고 사용자가 iPhone 정상 표시를 확인했다. 이번 최종 세 항목의 실기기 재검토는 별도이며 자동 모바일 검증과 구분한다. 일회용 검증 브라우저는 종료했다. 기존 접속 요청에 따라 LAN 검토 서버(4173)는 유지하며 Backend·DB·방화벽을 변경하지 않았다.
- 사용자의 검증 후 커밋 요청에 따라 기록 메인의 1·2차 및 최종 UI, 관련 회귀 검사와 현황 문서 12개를 `594cf25` / `style(record): refine record main layout and UI` 로컬 커밋으로 마감했다. 커밋 직후 작업 트리가 깨끗함을 확인했고 원격 push와 신규 실제 API 연동·통합 검증은 수행하지 않았다. 앞선 절의 승인 대기·커밋 금지는 당시 검토 단계의 기록이다. 이번 후속 문서·와이어프레임 동기화는 별도 요청에 따라 커밋·push하지 않는다.
- 후속 문서 동기화 검증: 기존 HTML의 공통 CSS와 기존 함수 242개가 그대로임을 확인하고, 홈·루틴·설정·운동 현황·성장·주간 근육 계획/통계·월간 이력·상세 9개 화면의 폰 영역을 수정 전후 픽셀 비교해 일치함을 확인했다. 기록 메인은 320/375/393/430px의 넘침·헤더 겹침·3열/2×2·날짜·말줄임과 분석/이력/상세/복귀·하단 탐색·포커스·빈 상태를 검증했다. HTML 스크립트 구문을 확인했고 일회용 서버·브라우저는 종료했다. 이 작업에서는 앱 빌드·기능 테스트·DB·실기기 검증을 재실행하지 않았으며 위 641건은 `594cf25` 마감 당시의 결과다.

#### 운동 현황 UI 리디자인 검토 — 2026-11-17

- 운동 현황에만 한 줄 헤더, 단일 기간 카드, 독립 운동량 지표 2열, 검색 위의 세트/총중량 토글, 주간 달성 막대와 7열 상태 카드, 유산소 요약 2열을 적용했다. 공통 기간 컨트롤은 운동 현황 전용 표현을 선택하고 검색·차트 자체와 API·집계·판정·기간 정책은 유지한다. 다른 기간의 이전 데이터가 남아 있는 동안에는 그 기간을 별도로 표시한다.
- 유산소 누적 일수는 현행 집계에서 제공되지 않아 미확인으로 표시한다. 종류별 수행 요일도 기존 응답에서 확인할 수 없어 생략했다. 상단 상세 보기는 기존 펼침 동작을 사용하며 계획 시간·거리 출처·운동 이력 이동을 펼친 영역에 둔다. 주간 카드의 미확인·대기 표시에는 기존 기호를 적용한다.
- 린트·타입 검사·빌드와 전체 테스트 641건을 통과했다. Chrome의 320/375/393/430px에서 기간 이동·달력·검색/태그·목록 스크롤·차트 전환·유산소 펼침과 이력 이동·빈 상태/오류를 확인했다. 기록 메인·성장 추적·주간 근육 계획/통계·월간 이력은 393px 수정 전후 캡처가 일치했다.
- **UI 구현 A / 사용자 검토·승인 B 대기.** 기존 4173 격리 시연 환경을 유지한다. 새 실제 API 연동과 iPhone Safari 실기기 확인은 이 단계에서 수행하지 않았다. 요청에 따라 커밋하지 않는다.

#### 운동 현황 UI 2차 보정 — 2026-11-17

- 기간 행은 주간·월간 모두 한 줄을 사용한다. 기간 이동 버튼은 36px 정사각형과 44px 높이의 클릭 영역을 사용한다. 달력과 검색 버튼은 평상시 강조 테두리를 줄이고 키보드 포커스 표시를 유지한다. 두 세그먼트의 선택 표시가 200ms 동안 이동하며, 모션 줄이기 설정에서는 즉시 전환한다.
- 운동 현황의 검색 범위만 목록형 팝오버를 사용한다. 기존 범위 값·검색·태그를 공유하고 방향키·Enter·Space·Escape·Tab과 외부 클릭을 지원한다. 다른 화면은 기존 공통 검색 UI를 사용한다.
- 세션의 운동 날짜·시간대와 유산소 결과 시각은 확인할 수 있다. Overview의 `statistics.days`에는 종류가 없는 일자별 `cardioActiveMs`가 있고 `cardioByKind`에는 날짜가 없는 종류별 시간·거리·출처 합계가 있다. 종류별 요일과 누적 일수를 표시하려면 [통계 계약](../../../overload-server/docs/api/statistics.md)에 해당 근거를 추가해야 한다.
- `/routine-preview?tab=history&activity-demo=states`의 정상 조회 시연에서 운동 현황을 열면 직전 주의 전체·부분 달성, 미달, 휴식, 대기, 근거 미확인과 유산소 다일·단일·요일/거리 누락 예시를 확인할 수 있다. 명시적 조회 옵션을 선택한 시연 컨텍스트에서만 주간 달성과 유산소 표시값을 사용한다. **UI 구현 A / 사용자 검토·승인 B 대기.**
- 린트·TypeScript·빌드와 전체 테스트 641건을 통과했다. Chrome 320/375/393/430px에서 기간·달력, 팝오버 포커스·키보드·터치, 모션 줄이기, 합성 시연 분리 및 빈 상태·오류·기간 전환 중 로딩을 확인했다. LAN 검토는 4173을 사용한다. 실기기 Safari 검토는 남아 있다.

#### 운동 현황 최종 UI 승인 및 구현 완료 — 2026-11-17

- **UI 구현 A / 사용자 승인 B 완료.** `37512e9`의 [운동 현황 화면](../../src/features/statistics/StatisticsPanel.tsx), [기간 컨트롤](../../src/features/statistics/PeriodControls.tsx), [화면 전용 스타일](../../src/features/statistics/Activity.module.css), [검색 팝오버](../../src/features/statistics/SearchScopePopover.tsx)를 기준으로 한다. 최종 보정은 달력과 이전·다음 버튼의 외형 통일, 월간 `YYYY/MM`, 검색 입력 16px, `– 휴식 / · 미수행 / ? 미확인` 범례다. 기간·검색·차트 전환·상태 판정과 유산소 집계는 기존 경로를 사용한다.
- 최종 UI 작업에서 린트·TypeScript·빌드와 관련 테스트 31건을 통과했다. Chrome 320/375/393/430px에서 버튼·날짜 정렬·기간 이동·달력·검색/필터·세트/총중량을 확인했고, 사용자가 iPhone에서 검색 아이콘을 누른 뒤 키보드가 열리고 화면 배율이 유지됨을 확인했다. 위 641건은 2차 보정의 전체 검사 결과다. 실제 API 통합이나 DB 작업은 이번 UI 승인 범위에 포함되지 않는다.
- `/routine-preview?tab=history&activity-demo=states`의 정상 조회 시연에서 운동 현황을 열면 직전 주의 완료·부분 달성·미달·휴식·대기·근거 미확인을 시연한다. 완료 비율 합계는 2일분, 계획은 5일, 표시 달성률은 40%다. 유산소는 2시간 20분·4일, 러닝머신 `월 · 금` 8km, 자전거 `화` 7.5km, 야외 운동의 요일·거리 누락 예시를 제공한다. [시연 구현](../../src/review/activity-sample.ts)은 운동 현황에만 이 값을 제공한다.
- 운영 Overview의 `statistics.days[].cardioActiveMs`는 종류가 없는 날짜별 총시간이며, `cardioByKind`의 종류별 합계에는 날짜가 없다. 운영 화면의 요일 생략과 누적 일수 `미확인`을 유지한다. `상세 보기`는 같은 카드에서 펼쳐지고 `운동 이력` 버튼이 이동을 담당한다. [결정 기록](../product/Overload_UI_Decision_Log_v0.9.md#1027--운동-현황-최종-ui-승인과-문서-동기화--2026-11-17)과 [HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html)을 동기화한다.

#### 성장 추적 최종 UI 승인 — 2026-11-18

- **UI 구현 A / 사용자 승인 B 완료.** 커밋 `f6ad67d`의 [GrowthPanel](../../src/features/statistics/GrowthPanel.tsx), [전용 CSS](../../src/features/statistics/Growth.module.css), [헤더 연결](../../src/features/statistics/StatisticsPanel.tsx)을 기준으로 한다. 검색·성장 분석·이력의 3개 카드와 4분할 기간, 수치 상단에 맞춘 16px 증감 배지, 연·월·일·시가 있는 구분선 이력을 구현했다.
- 기존 검색·배치 선택·기간 조회·승인 사건·그래프 연결/툴팁·이력 정렬·상세 이동을 유지한다. 최신값은 선택 기간·배치의 조회값이며 다음 페이지가 있는 건수는 `불러온 N건`이다. 연결 세션이 없는 행은 이동하지 않는다. 일반 운동 수행 중량과 디로딩 중량은 공식 승인 성장선에서 제외한다. 꼭짓점별 상시 값 표시는 추가하지 않았다.
- 앞선 UI 작업에서 린트·TypeScript·빌드와 관련 23건을 확인했다. 병렬 실행에서 휴식 타이머 1건이 실패한 뒤 단독 재실행에서 통과했다. 배지 보정 후 린트·TypeScript·성장 테스트 7건이 통과했고 Chrome 320/375/393/430px에서 배지 상단 정렬·글자 크기·겹침을 확인했다. 이 수치는 당시 검증 기록이며 이번 문서 작업에서 앱 검사를 재실행한 결과가 아니다. iPhone 성장 추적 실기기 확인은 별도다.
- [UI/UX](../product/ui-ux.md#성장-추적)와 [결정 10.28](../product/Overload_UI_Decision_Log_v0.9.md#1028--성장-추적-최종-ui-승인--2026-11-18), 기존 밝은 무채색 [HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html)을 동기화한다. 이번 문서 갱신은 실제 앱 코드·API·시연 데이터 생성 코드를 변경하지 않는다.

#### 주간 근육 계획·통계와 공통 헤더 최종 UI 승인 — 2026-11-18

- 사용자가 UI 승인과 코드 커밋 완료를 확인했다. 기준 커밋은 `f2a6768`(`style(record): redesign weekly muscle views and unify subpage headers`)이다. [MuscleAnalysis](../../src/features/statistics/MuscleAnalysis.tsx), [StatisticsPanel](../../src/features/statistics/StatisticsPanel.tsx), [계획 CSS](../../src/features/statistics/WeeklyMusclePlan.module.css), [통계 CSS](../../src/features/statistics/WeeklyMuscleStatistics.module.css), [RecordSubpageHeader](../../src/components/RecordSubpageHeader.tsx)와 [헤더 CSS](../../src/components/RecordSubpageHeader.module.css)를 사용한다. 성장 추적의 연결은 [GrowthPanel](../../src/features/statistics/GrowthPanel.tsx)에 있다.
- 계획은 프리셋/분류·근육 세그먼트 카드 → `계획 세트 / 운동 예정일` 2열 요약 → 제목 옆 `0세트 포함` → 단일 분포 카드다. 통계는 이번 주 읽기 전용 날짜 행 → `분석 기준 / 측정 지표`의 두 줄 세그먼트 → 압축 세트 달성 요약 → 단일 통계 카드다. 두 페이지는 그룹명·선·오른쪽 합계, 그룹 상단 20px 간격과 기존 막대를 공유한다. 프리셋·조회·상태 키·정확한 0 필터·기여 계산·막대 정규화/상한·▼ 가이드는 변경하지 않았다.
- 계획의 운동 예정일은 기존 집계가 없어 `미확인`이다. 운영 부위 분류·전체 근육 목록·권장 범위의 미확인을 보존한다. 통계의 주간 전체 당시 계획·세트 달성률은 제공되지 않아 `미확인`과 빈 트랙이며 실제 완료 세트만 기존 값을 표시한다. 일수 기반 루틴 달성률이나 종료 세션 InitialPlan 합계를 주간 전체 계획으로 전용하지 않는다. 세트 모드의 분류 합계는 `합계 확인 불가`, 근육 소계는 기존 실제/당시 계획 기여 합이다. 총중량 그룹 소계는 숨기며 새 계획 kg·항목별 %를 만들지 않았다.
- 공통 헤더는 운동 현황·성장 추적·주간 근육 계획·주간 근육 통계에 적용했다. 최소 높이 44px·버튼 44×44px·SVG 24px·제목 22px/750/1.4, 공통 그리드 32px+가변 열/간격 2px·버튼 시작 −12px·헤더 패딩/마진 0이다. 페이지별 보정·중복 헤더 CSS를 제거했고 기존 핸들러·키보드 포커스·브라우저 뒤로/앞으로 이동과 상태 복원을 유지했다. 운동 기록 상세에는 미적용이다. 정확한 사용 규칙은 [공통 헤더](../product/ui-ux.md#313-기록-하위-페이지-공통-헤더)를 따른다.
- **이전 코드 작업의 검증 기록:** 계획·통계 작업 각각 린트·TypeScript·빌드와 관련 테스트 20건을 통과했다. 통계는 Chrome 320/375/393/430px × 보기 2종 × 지표 2종의 16개 조합에서 넘침·그룹 겹침과 전환 후 수치/막대 보존을 확인했다. 계획은 프리셋·0세트·분류/근육·가이드·미확인과 유산소 전용 0세트 예시를 확인했다. 공통 헤더 작업은 린트·TypeScript 포함 빌드·관련 테스트 최종 22건을 통과했다. SVG 전환으로 바뀐 접근성 이름에 맞춰 기존 UI 테스트 선택자 1곳을 수정한 뒤 재실행했다. 네 너비에서 네 헤더의 좌표·폰트·높이를 비교하고 본문 카드 위치·크기·텍스트가 변경 전후 동일함을 확인했다. 키보드 포커스/Enter, 브라우저 뒤로/앞으로, 기간·보기 상태 복원도 확인했다. 기존 번들 크기 경고는 유지됐다.
- 위 결과는 `f2a6768`에 포함된 UI 코드 작업 당시 기록이다. 이번에는 [UI/UX](../product/ui-ux.md#주간-근육-계획)·[결정 10.29](../product/Overload_UI_Decision_Log_v0.9.md#1029--주간-근육-계획통계와-공통-헤더-최종-ui-승인--2026-11-18)·기존 밝은 무채색 [HTML](../product/Overload_UI_Baseline_Wireframe_v0.9.html)을 동기화하며 앱 빌드·테스트·실기기·DB 검증을 재실행한 것으로 기록하지 않는다. 실제 API의 미연결 범위는 위 8.7절과 통계 계약에 남긴다.

#### 운동 기록 상세·전체 이력·최근 카드 최종 UI 승인 — 2026-11-18

- 사용자가 최종 승인과 코드 커밋 완료를 확인했다. 기준은 `3bd64a4`(`style(record): refine workout detail and unify history UI`)다. [WorkoutSummary](../../src/features/workout-flow/WorkoutSummary.tsx)의 상세 모드와 [상세 CSS](../../src/features/workout-flow/WorkoutRecordDetail.module.css), [RecordFeed/SessionRecordCard](../../src/features/history/RecordFeed.tsx), [StatisticsPanel](../../src/features/statistics/StatisticsPanel.tsx), [공통 카드 CSS](../../src/features/statistics/RecordMain.module.css)를 사용한다. 종료 직후 요약의 후속 시각 배치는 [홈 운동 프로세스 현황](#홈-운동-프로세스-리디자인-현황--2026-11-18)을 따른다.
- 상세는 공통 헤더·요약·조건부 `중량 변경 승인 이력`·WEIGHT/CARDIO 통합 목록·기존 dataNote의 기록 보존 안내·복귀 버튼이다. 날짜/시작–종료·기록 메인과 같은 상태 아이콘/명칭·기존 ⋮ 메뉴와 최대 2줄 루틴명, 전체/웨이트/유산소 3열×2단을 표시한다. 미확인 시간 `–`와 확인된 0, 시간 관계 경고와 미수행 원인·미입력/출처 표시를 구분한다.
- 승인 이력은 제목만 확정 명칭으로 바꾸고 승인·미승인·감량·유지/근거 부족·오류 등 기존 데이터와 노출 정책을 보존했다. 기본 펼침·접기 UI, 카드 앞뒤 10px·세로 패딩 8px을 적용했다. 종목 번호와 `수행 / 장비 / 세트 볼륨` 3열, 종목 간 구분선과 간격을 정리했다. CARDIO의 12px 추가 마진은 WEIGHT 다음 형제 섹션일 때만 적용해 유산소 단독의 중복 여백을 없앴다. 수정 배지는 `result.corrected`로 확인되는 시간에만 붙이며 timerMs 원본을 보존한다. 거리·심박·속도는 항목별 수정 근거가 없어 추정하지 않는다.
- **2026-11-20 표시 조건 정정.** `SavedWeightReview`는 과거 상세에서 서버가 반환한 증감량 권고와 추천 중량 또는 실제 승인 사건이 있을 때만 승인 이력 카드를 렌더링한다. 유지·근거 부족·빈 조회는 카드를 표시하지 않으며 조회 중과 오류는 별도 상태다. 이력과 최초/현재 평가 조회는 기존 데이터를 사용한다.
- `SessionRecordCard`는 최근/전체 이력의 동일한 3행 카드다. 기존 achievement.completed/planned와 시간 값을 표시하며 조회된 요약이 없으면 기존 상세 조회 필요 안내를 남긴다. 분모·완료 판정·운동 시간·세트/볼륨을 새로 계산하지 않는다. 전체 이력은 기존 주차 제목/범위·월 필터/정렬·같은 날 복수 기록·추가 로딩/중복 제거·오류 재조회·상세 이동을 유지한다.
- 기존 `RecordSubpageHeader`를 전체 이력과 상세에 적용했다. 전체 이력은 `PeriodControls`의 activity 표시 variant와 monthOnly/compact, `SearchList`의 renderScope에 `SearchScopePopover`를 연결한다. `Activity.module.css`의 기존 페이지/검색 스타일과 `RecordMain.module.css`의 카드 스타일을 재사용하며 새 검색/카드 컴포넌트는 없다. 이력은 루틴별/운동별, 운동 현황은 기존 4개 범위를 유지한다. 검색 결과 생성·API·기간/상태 키·탐색은 호출부의 기존 책임이다.
- **당시 코드 작업의 검증:** 상세 초기 작업은 린트·TypeScript 포함 빌드, 관련 단위/컴포넌트 58건과 브라우저 회귀 2건이 통과했다. 공유 종료 요약 4개 모드의 렌더링이 변경 전후 같았다. 상세 메뉴 4개 항목·Escape·평가 이력 복귀·접기/펼치기·승인/미승인 보존과 시간 배지의 범위를 확인했다. 후속 최종 보정/이력 통일은 린트·TypeScript·빌드, 관련 52건과 기존 브라우저 회귀 1건이 통과했다. 바뀐 날짜·헤더·카드 표현에 맞춰 테스트 선택자/기대값을 갱신한 뒤 재실행했다. 기존 번들 크기 경고는 남았다.
- Chrome 320/375/393/430px에서 긴 루틴/제조사명·상태/메뉴·세트별 수치 3열의 겹침과 넘침을 확인했다. WEIGHT 단독·CARDIO 단독·혼합의 첫 섹션 오프셋은 같은 15px이었고 승인 카드의 열림/닫힘 앞뒤 간격은 각 10px이었다. 최근/전체 카드의 스타일이 같았으며 월/달력·루틴/운동 검색·선택 해제·주차/기록 ID 보존·상세 복귀를 확인했다. 추가 로딩·중복 방지·기존 행을 보존하는 오류·재조회는 격리된 읽기 전용 응답으로 검증했다. 실제 API/DB 통합과 iPhone 실기기 검증을 이 UI 결과로 완료 처리하지 않는다.
- 위 수치는 이전 UI 코드 작업 기록이다. 이번에는 [UI/UX](../product/ui-ux.md#운동-기록-상세)·[결정 10.30](../product/Overload_UI_Decision_Log_v0.9.md#1030--운동-기록-상세전체-이력최근-운동-최종-ui-승인--2026-11-18)·기존 밝은 무채색 HTML을 동기화한다. 앱 코드·테스트·API·합성 데이터 생성 코드는 변경하지 않고 전체 앱 빌드/테스트도 재실행하지 않는다. 합성 이력의 운동명 검색은 운영 서버 연결 완료 근거가 아니다.

#### 홈 운동 프로세스 리디자인 현황 — 2026-11-18

**`4607d99` 당시의 UI 구현 및 검증 이력.** 현행 홈 ACTIVE·준비·전환·고정 시간 바와 종료 요약은 [P1 개선](#p1-01부터-05까지-구현과-검증)과 [현재 UI/UX](../product/ui-ux.md#35-스트레칭워밍업--warmup)를 따른다.

| 구간 | 실제 경로 |
|---|---|
| 진입 | `HomePanel`의 오늘 루틴·`운동 이어가기` → `WorkoutWorkspace`의 START 또는 기존 ACTIVE 진입. 계정·세대와 최신 루틴 버전을 확인한다. 진행 화면은 ACTIVE 세션의 편집권에 묶인다. |
| 진행 | `LocalWorkoutScreen`에서 `LocalWorkoutController`와 IndexedDB3/schema2 운동 문서를 연결한다. `LocalWorkoutFlow`가 현재 종목·준비 상태·휴식·모달과 CTA를 구성하고 `WorkoutFrame`의 시간 바·고정 footer를 사용한다. 웨이트는 `WeightFocus`와 `WeightChange`, CARDIO는 `CardioFocus`와 `DurationWheel`을 사용한다. |
| 시간과 쓰기 | 전체 경과시간·휴식 종료 시각·유산소 누적/실행 구간에서 표시를 파생한다. 250ms 표시 갱신과 저장을 구분한다. CARDIO 적용 시간은 기존 초안에 반영하고, 확정 시 원본 `timerMs`와 유효 `activeMs`를 함께 저장한다. 진행 수행·취소·동기화는 기존 스냅샷 경로로 처리한다. [로컬 보호](#12-진행-운동의-로컬-보호-및-복원) |
| FINISH와 복귀 | 종료 의도에서 최종 상태·실제 종료 시각을 고정한다. 서버 FINISHED 확인을 기기에 보존하면 `WorkoutWorkspace`가 해당 세션의 요약 모드를 선택하고 기록 탭에 연다. `ClosedWorkout` → `WorkoutSummary`의 즉시 요약에서 헤더·하단 버튼은 홈으로 돌아간다. 과거 상세는 별도 기록 선택으로 연다. |
| 중량 검토와 공유 UI | 같은 `WorkoutSummary`·`RecordSubpageHeader`·상세 CSS를 시각 표현에 재사용한다. 즉시 요약의 `SavedWeightReview`는 기존 V36 조회·조건 검사·수정·명시 승인·재조회를 사용한다. 상세는 당시 이력을 읽고 정정/복구/삭제 등 기존 상세 기능을 제공한다. `summary-data.ts`의 요약 판정과 `recordSummary`의 상세 판정은 현재 구현에서 다르다. |

합성 `WorkoutReview`·`WorkoutRecordReview`는 표시 컴포넌트를 재사용하고 시연 상태를 메모리에서 처리한다. 정책 3-1의 달성 통일, 조합 메모의 기기·서버 영속 저장, 실제 경사도 및 전역 컴포넌트 정리는 별도 범위다.

**검증 이력.** 유산소 Chrome 320·393·1280 CSS px와 키보드 모사, 시작/정지/재개/정정/취소/확정 및 격리 컨트롤러의 중복 확정 방지, 종료 요약 Chrome 320·375·393·430·1280 CSS px와 합성 증량/감량 편집·복귀를 검증했다. 후속 `44300ab` 기준 전체 **644/644**, TypeScript·린트·프로덕션 빌드가 통과했다. 이 문서 동기화는 기존 검증 이력을 기록한다. iPhone Safari 실기기와 리디자인 후 실제 서버 승인·DB 반영은 위 합성 검증과 별도다.

#### 루틴 탭 리디자인 현황 — 2026-11-18

- [WorkoutWorkspace](../../src/features/workout-online/WorkoutWorkspace.tsx)는 루틴 목록에서 ID를 선택하고 상세를 조회한 뒤 `RoutineDetail` 또는 `RoutineForm`을 연다. 선택 ID·계정/데이터 세대에 따른 화면 이력과 기존 관리 권한·진행 보호를 적용한다. 상세의 START는 기존 controller를 부르고 삭제는 확인과 버전 검증을 거친다. 목록 또는 원래 진입 화면으로 복귀하는 기존 이력 경로를 사용한다.
- [RecordSubpageHeader](../../src/components/RecordSubpageHeader.tsx)의 선택 액션으로 상세에만 편집 버튼을 배치한다. 생성·편집은 같은 폼과 CSS 모듈을 사용한다. 상세는 별도 컴포넌트와 CSS 모듈이며 세 화면은 공통 `Card` 및 토큰을 공유한다. [시각 규칙](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#11-루틴-상세편집생성--2026-11-18)
- WEIGHT는 `ExerciseSearch`, `EquipmentFields`, 카탈로그 분류를 사용한다. 인라인 증감은 원판식·스택식 2.5kg, 그 외 1kg이다. `KgWheel`은 기존 [NumberWheel](../../src/components/NumberWheel.tsx)과 직접 입력을 사용한다. 부하·제조사·종목 조합 변경은 기존 승인값을 이관하지 않는다. [CombinationMemo](../../src/features/workout-online/CombinationMemo.tsx)는 현 계정·데이터 세대의 마운트 메모리 초안이며 루틴 요청에 포함되지 않는다.
- CARDIO는 [CardioPlanFields](../../src/features/workout-online/CardioPlanFields.tsx)와 기존 카탈로그 선택을 사용한다. 신규 배치는 표준 운동 및 기록 설정 두 ID를 저장한다. 상세의 분류는 해당 선택 목록의 실제 매핑을 사용한다. 기존 활동 ID 단독 매핑은 대분류, 확인되지 않은 경우는 미확인을 표시한다. 생성 카드에도 분류 행이 있고 편집 카드 제목에는 없다. 루틴의 목표와 세션의 실제 측정은 각각 기존 타입을 사용한다.
- 폼의 새 종목 선택만 추가 카드 ID를 기록한다. 카드가 렌더링되고 키보드로 좁아진 `visualViewport`가 회복되면 헤더 아래 약 8px로 스크롤한다. 짧은 마지막 카드에는 도달 여백을 두며 자동 포커스는 하지 않는다. 움직임 줄이기에서는 즉시 이동한다. 본문 스크롤과 고정 헤더·푸터, 안전 영역, 텍스트 키보드 감지는 폼의 두 모드에서 사용한다.
- 헤더와 푸터 취소는 같은 초안 확인을 사용하고 브라우저 이탈에도 미저장 보호를 적용한다. 저장 요청은 검증 후 고정하며 실패 시 초안을 유지한다. 생성 POST는 초안 UUID를 재사용하고, 편집 PUT은 기존 버전·배치 상태·명시 승인 목록을 보낸다. 복원 후보 조회, 삭제, 일정 배정의 요청은 [연동 계약](backend-ui-v0.9.md#루틴-관리-연동--2026-11-18)을 따른다.
- **코드 변경 당시 검증.** Chrome 320·375·393·430 CSS px 등에서 상세와 편집·생성을 검토했다. `3f761b2` 마감 기록에는 전체 테스트 644/644, 타입 검사·린트·빌드 통과가 있다. 앱 테스트 결과는 해당 코드 변경의 이력이며 이 문서 갱신에서 재실행한 결과와 구분한다. 실제 계정의 생성·수정·삭제 및 iPhone Safari·설치형 PWA는 해당 검토에서 확인하지 못했다.

#### 공통 하단 내비게이션 리디자인 현황 — 2026-11-19

- [AppShell.tsx](../../src/app/AppShell.tsx)는 운영 `AuthApp`과 합성 `RoutinePreview`가 공유한다. 홈·루틴·기록·설정의 버튼은 전달받은 `tab`을 기준으로 `aria-current="page"`를 설정하고 `onNavigate`를 부른다. 재선택 시 탭 루트로 복귀하고 뒤로·앞으로 이동 시 기존 [탐색 이력](../../src/app/navigation.ts)이 화면 상태를 복원한다. 초안 이탈 확인, 모달 이력, 기존 세션 및 휴식 푸터 경로를 사용한다.
- `useTabBarCollapse`는 표시 중에만 `window`의 passive 스크롤 이벤트를 받는다. `requestAnimationFrame`에서 `document.scrollingElement.scrollTop`을 문서의 실제 범위로 제한하고 이전 위치와의 차를 같은 방향으로 24px씩 누적한다. 방향 전환이나 열린 모달에서는 누적값을 초기화한다. 새 탭이나 표시 조건 변경, 최상단에서는 펼침을 기본으로 한다. 모달과 내부 목록의 별도 스크롤은 문서 위치를 바꾸지 않는 한 대상이 아니다. 포커스가 비활성 탭에 있을 때는 자동 축소를 보류한다. 조건 변경과 해제 시 이벤트 및 예약 프레임을 정리한다.
- 접힌 활성 버튼은 `하단 메뉴 펼치기` 이름과 `aria-expanded=false`를 사용하며, `onNavigate` 대신 펼침만 수행한다. 비활성 버튼은 `inert`와 `aria-hidden`으로 접근성을 차단한다. 펼친 상태의 Tab·Enter·Space, `aria-current="page"`, `focus-visible`과 기존 SVG는 유지한다. 홈·설정은 검은색 `fill` 및 `evenodd`, 루틴·기록은 활성 3px 검은색·비활성 1.6px 중립색 윤곽선이다.
- [AppShell.module.css](../../src/app/AppShell.module.css)는 표면의 크기와 탭 칸의 위치를 분리한다. 펼침 칸은 고정된 4등분 트랙을 사용한다. 각 칸의 `transform`이 자신의 중심과 전체 중앙을 잇고, 버튼 너비와 SVG의 `scale`·불투명도는 각각 적용한다. 완료 시 칸을 재배치하는 단계가 없다. 캡슐은 탭 인덱스의 `transform 200ms ease`와 접힘에 쓰는 독립 `translate`를 사용한다. 접기 320ms·펼치기 340ms의 `cubic-bezier(.32, .08, .26, 1)`에 맞춰 `#6C93C6`과 `#5E82B1`을 전환한다. `prefers-reduced-motion: reduce`에서는 전환을 끈다. [시각 명세](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#15-공통-하단-내비게이션--2026-11-19)
- 확장 표면은 `min(calc(100% - 24px), 336px)` × 56px, 축소 표면과 버튼은 46×46px이다. 두 상태에서 `viewport-fit=cover`와 `--tabs-offset: env(safe-area-inset-bottom)`을 유지한다. `.withTabs`의 `56px + --tabs-offset + 16px` 패딩은 접힐 때도 유지한다. 보이는 `WorkoutFrame`이 자체 고정 액션 영역을 확보하는 경우 셸 패딩을 해제한다.
- 인증됐고 집중 화면 또는 키보드 표시 상태가 아니면 탭바를 표시한다. `visualViewport.resize`와 `focusin`·`focusout`에서 다음 애니메이션 프레임에 측정한다. 확대 배율이 1.01 이하이고 레이아웃 높이 `max(innerHeight, documentElement.clientHeight)`와 `visualViewport.height`의 차가 100px을 넘을 때, 편집 가능한 입력에 포커스가 있거나 이미 키보드로 숨긴 상태라면 계속 숨긴다. 뷰포트가 복구되면 현재 탭 위치로 표시한다.
- **이전 검증 이력.** 확장 탭바와 최초 접기·펼치기 단계의 전체 651/651은 당시 결과다. 마지막 좌표 보정 전 Chrome 320·375·393·430·1280px에서 프레임·색상 전환을 측정했고, 모의 안전 영역 0px·34px에서 하단 간격 0px·34px, 본문 여백 72px·106px을 확인했다. 같은 개선 단계의 전체 테스트는 650/651로, 펼침 프레임 검사가 실패했다.
- **최종 코드 검증 범위.** 마지막 보정 이후 관련 단위 테스트 30/30, TypeScript·린트·프로덕션 빌드·`git diff --check`가 통과했다. 기존 500kB 초과 청크 경고가 남아 있다. 자동 승인 검토의 사용량 한도로 최종 Chrome과 전체 재실행이 보류됐다. iPhone Safari·설치형 PWA의 스크롤 감도·터치 관성·홈 인디케이터·소프트 키보드·애니메이션은 실기기에서 검증해야 한다. 앱 전역 공통 UI 모듈 정리는 별도 작업이다.

#### 공통 UI 컴포넌트와 독립 Preview — 2026-11-19

**구현·검토 범위.** `2a1e10e`는 재사용할 공통 UI의 구현과 독립 Preview 검토 결과다. 공통 UI 컴포넌트는 구현 및 Preview 검토 단계이며, 실제 서비스 화면으로의 일괄 적용은 진행하지 않았다. 기존 운영 화면은 각각의 버튼·저장·검색 흐름과 기존 호출부를 사용한다. [최종 제품 결정](../product/Overload_UI_Decision_Log_v0.9.md#1039--공통-ui-컴포넌트와-독립-preview--2026-11-19) · [조작](../product/ui-ux.md#314-공통-ui-preview) · [시각 규칙](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#16-공통-ui-preview-시각-규칙)

| 부품 | 실제 인터페이스와 책임 |
|---|---|
| [ActionButton](../../src/components/common-ui/ActionButton.tsx) | 네이티브 버튼 props에 `appearance`(`primary`, `secondary`, `danger-outline`, `danger-primary`, `contrast-outline`), `size`(`regular`, `modal`, `small`), `loading`·`loadingLabel`을 추가한다. 로딩 시 활성 내용을 스피너·문구로 바꾸고 `disabled`·`aria-busy`로 클릭을 차단한다. |
| [ActionDialog](../../src/components/common-ui/ActionDialog.tsx) | `open`, `kind`, 제목·설명·버튼 라벨과 `onDismiss`·`onConfirm`을 받는다. `confirm`·`destructive`에 `pending`과 `pendingLabel`을 줄 수 있다. `alert`의 확인은 닫기다. 기존 [Dialog](../../src/components/Dialog.tsx)의 네이티브 모달, 브라우저 이력과 포커스 복귀를 재사용하며 제목·설명을 연결한다. 새 스타일은 전달된 클래스에 적용한다. |
| [Toast](../../src/components/common-ui/Toast.tsx) | 한 건의 `toast` 또는 `null`, `onDismiss(id)`와 선택적인 `bottomClearance`를 받는다. 성공·안내 4초, 오류 7초이며 포인터 호버나 닫기 버튼 포커스 중에 자동 종료를 멈춘다. 메시지 ID 교체 시 타이머를 정리하고 오류는 `alert`, 나머지는 `status` 영역으로 알린다. |
| [ContentFeedback](../../src/components/common-ui/ContentFeedback.tsx) | `SkeletonRegion`은 자식 레이아웃을 유지하고 `aria-busy`·`inert`로 로딩 상태를 전달한다. `SkeletonSlot`은 `visibility: hidden`으로 실제 콘텐츠의 크기를 남기고 같은 영역에 선·원·블록을 겹친다. `FieldValidation`은 전달받은 오류를 입력의 설명 및 `aria-invalid`와 연결한다. `EmptyState`와 `ConnectionBanner`는 아이콘·문구 및 오프라인/동기화 상태를 표현한다. |
| [RoutineTagList](../../src/components/common-ui/RoutineTagList.tsx) | `options`, `selectedId`, `onSelect`에 선택적인 `onCancel`, `loading`, `emptyLabel`을 받는다. 단일 선택 `listbox`의 행 포커스 이동에서 비활성 항목을 건너뛰고, `onCancel`을 전달하면 Escape로 부모의 닫기 동작을 호출한다. 제목·설명 슬롯은 로딩 전후 동일한 구조다. |
| 검색 태그 UI | [TagPickerExamples](../../src/review/TagPickerExamples.tsx)가 기존 [SearchList](../../src/components/SearchList.tsx), [SearchScopePopover](../../src/features/statistics/SearchScopePopover.tsx)와 운동량 추이 스타일을 조합한다. 검색어·범위·선택 칩·후보를 예시 상태로 전달한다. 화면 내 필터링은 합성 운동·분류·근육 후보에만 적용된다. |
| [StatusIndicator](../../src/components/common-ui/StatusIndicator.tsx) | `StatusTag`와 `StatusText`에 `kind`와 라벨을 전달한다. 증량 권고는 선택적인 `onOpenDetails`로 안내를 열 수 있다. 아이콘은 [FeedbackIcon](../../src/components/common-ui/FeedbackIcon.tsx) 모듈에서 사용한다. |
| [RecordSubpageHeader](../../src/components/RecordSubpageHeader.tsx) | 기존 헤더에 선택적인 `brandImage { src, alt, width, height }`를 추가했다. `action`이 있으면 우측은 액션을 표시한다. Preview 기본형은 [제공된 투명 4x PNG](../../src/assets/OVERLOAD_white_transparent_4x.png)를 전달하며 운영 호출부는 기존 헤더 props를 사용한다. |

**개발 진입과 데이터.** [CommonUiPreview](../../src/review/CommonUiPreview.tsx)는 같은 컴포넌트를 호출하는 보기·상태 전환 화면이다. 기존 `AppShell`을 사용하고 탭 선택, 저장·삭제 성공, 연결 카드, 운동 검색은 브라우저 메모리 상태와 합성 데이터로 시연한다. 셸의 탭 표시용 `authenticated` 값과 실제 사용자 인증은 별개다. Preview에는 로그인 절차가 없고 테스트에서 API 요청과 IndexedDB 생성이 없음을 확인했다.

- `npm run dev -- --mode ui-review`의 [4173 검토 경로](http://127.0.0.1:4173/common-ui-preview)는 [Vite 설정](../../vite.config.ts)이 전용 [검토 진입점](../../src/review/main.tsx)을 제공한다. 기본은 루프백이며 `OVERLOAD_MOCK_LAN_IP`를 설정한 경우 승인된 사설 인터페이스 서브넷에서 접근한다. 검토 모드는 API·OAuth 경로를 차단한다. 일반 Vite 개발 서버는 [기본 진입점](../../src/main.tsx)의 `import.meta.env.DEV` 조건에서 같은 경로를 로딩한다.
- Vite 프로덕션 빌드에는 Preview 경로 분기, Preview 전용 부품과 4x 이미지가 포함되지 않는다. `npm run preview`는 운영 산출물을 제공한다. 운영에서도 사용하는 `Dialog`·`RecordSubpageHeader`·`SearchList`는 각 기존 호출부에서 재사용한다.

**구현 당시 검증.** Chrome **320·375·393·430·1280px**에서 [공통 UI Preview 테스트](../../tests/common-ui-preview.test.mjs) 단독 실행이 통과했다. 위험 버튼 상태, 검색 범위·긴 칩, 루틴 태그 선택과 빈/로딩 상태, 로고 비율과 제목 겹침, 계정 카드·루틴 태그 목록의 로딩 전후 경계 상자와 주변 위치, 가로 넘침, 포커스와 모달 닫기, 움직임 줄이기를 확인했다. 전체 테스트 **652/652**에는 기존 홈·루틴·기록·설정 브라우저 회귀도 포함된다. TypeScript·린트·프로덕션 빌드와 Preview의 번들 제외 검사가 통과했다. 빌드는 기존 500kB 초과 청크 경고를 냈다. `logs/common-ui-round3-full.log`는 당시 전체 실행 기록이며 문서 갱신에서는 코드와 그 기록을 대조했다. iPhone Safari·설치형 PWA 실기기와 서비스 화면별 적용 검증은 후속 단계다.

#### FRONT 후속 UI와 안정성 현황

| 범위 | 실제 적용과 코드 커밋 | 보존된 검증 근거 |
|---|---|---|
| UI-04 로고·휴식 설정 | `7550bf0` · 홈 왼쪽과 기록 메인 운동 분석 오른쪽에 로고를 남겼다. 기록 메인 두 섹션 제목을 통일하고 휴식 설정의 편집·취소를 카드 제목 오른쪽에 배치했다. 공통 헤더의 선택 로고는 Preview에서 계속 사용한다. | UI-04 및 UI-16 전체 테스트 652/652 (`logs/ui-16-ui-04-final-tests.log`) |
| UI-08 한쪽 원판 | `c062dd1` · 선택한 미시작 WEIGHT 원판 종목의 유효한 현재 진행 중량을 반으로 표시한다. 오늘만 변경과 종목별 시작 상태를 사용한다. 시작 여부는 메모 열림 상태와 독립적이다. | 전체 692/692 (`front-ui-08-tests.log`) |
| UI-17 중량 검토·승인 | `3ed988d` · 상시 선택과 2행 검토, 명시 확인을 적용했다. 조건을 충족한 미승인 항목과 서버에서 확인된 승인 사건을 별도 카드로 구성하고 기록 상세의 읽기 전용 UI를 공유한다. `d07de79` · 승인 재조회로 확인한 루틴 버전을 기준으로 홈 목록을 자동 갱신하며 확인 중인 루틴의 시작만 보호한다. 실패 시 해당 루틴을 다시 조회할 수 있다. | UI-17 전체 실행 691/692에서 휴식 피드백 DOM 전환 타임아웃 1건이 있었다 (`front-ui-17-final-tests.log`). 이후 전체 회귀 통과 기록은 아래에 구분했다. |
| 안정성 1차 P0 | `0ae82ae` · 수동·자동 휴식 종료 직후 275ms 동안 이어지는 다음 세트 입력을 보호한다. 기존 휴식 2분할 및 세트 완료 전체 너비, snapshot PUT·ACK와 오프라인 복구를 유지한다. | 4173 Chrome 격리 세션에서 같은 좌표 재입력의 의도하지 않은 세트 PUT 0건, 보호 이후 의도한 세트 PUT 1건 (`p0-visual-results-pc.json`, `p0-visual-results-lan.json`) |
| 안정성 2차 | `cdeae39` · START/FINISH, 홈·기록의 상세 진입, 기록 2×2의 분석 화면 및 루틴 목록·상세·편집 전환에서 목적 화면과 탭 전환을 맞췄다. 조회 대기와 기록 접근 검사를 유지한다. | 4173 Chrome 전환 계측, 그래프 보완 이후 전체 700/700 (`p1-graphs-verified-tests.log`) |
| 안정성 3차 A·B | `92549cc`·`8c310c7` · 승인·루틴 삭제·기록 정정/삭제의 반복 입력, 중복 요청 및 충돌·응답 유실 복구를 보완했다. `4bad8dd` · 공통 버튼의 처리 중 입력 차단과 시각 상태를 분리했다. 짧은 처리에는 문구와 밝기를 유지하고 실제 대기가 약 300ms를 넘으면 버튼 안에 표시한다. | 기록 쓰기 보완 뒤 전체 706/706, 버튼 보완 뒤 전체 707/707 (`p1-record-write-regression-verified.log`, `p1-button-full.log`) |
| 안정성 3차 C-1·C-2 | `62e59d1` · 하단 탭 연속 입력과 기록 모달의 처리 중 뒤로가기를 보호했다. `1002370` · 운동 푸터 액션 높이 50px와 패딩 0/12px, 본문 여백 측정을 적용하고 세트→휴식의 잔류 호버에 따른 밝기 차이와 다음 동작의 연속 입력을 보완했다. | 4173 Chrome 푸터·연속 입력 계측, 전체 708/708 (`p1-c2-rest-serial-full.log`). 사용자도 커밋 완료와 다음 작업 진행을 확인했다. |
| 성장 추적 조회 안정성 | `e88c90c` · 오류·재시도 행을 그래프와 이력 아래에 두고 처리 중 버튼 높이와 상태를 유지한다. | 4173 Chrome 320·375·393·430·1280px에서 오류·재시도의 기존 콘텐츠 수직 이동 0px, 전체 708/708 (`p2-layout-after.json`, `p2-full.log`) |

첫 행에 표시한 경로 외의 로그명은 로컬 `logs/workout-api-review/` 기준이다. 성장 추적 보완 시 TypeScript 포함 빌드와 린트도 통과했다. 린트는 로컬 검수 백업 경로를 제외했고 빌드에 기존 청크 크기 경고가 있었다 (`p2-lint.log`, `p2-build.log`). UI-04·08·17은 로컬 커밋을 확인했다. 최종 디자인 승인 및 후속 버전의 iPhone Safari·설치형 PWA 검증은 별도로 확인된 기록이 없다. 이 후속 FRONT 변경에 새 Backend 연동은 없으며 기존 데이터 연결 대기는 제품 정책별 현황을 따른다. [화면별 조작](../product/ui-ux.md#3-화면별-명세) · [UI-04·UI-08·UI-17 결정](../product/Overload_UI_Decision_Log_v0.9.md#1041--ui-04ui-08ui-17-후속-결정)

##### iPhone 상태바와 상단 Safe Area · 실기기 재검수 대기

- 사용자는 설치형 PWA에서 시스템 상태바 주변의 흐릿한 홈 헤더와 후속 검수의 상단 검은 캡슐을 제보했다. 캡슐이 Dynamic Island인지와 흐림의 시스템 렌더링 원인은 실기기에서 확인이 필요하다. 현행 HTML·셸 CSS의 상태바 처리에는 별도 캡슐·블러 레이어가 없다.
- 현재 `e88c90c`에는 `viewport-fit=cover`, Onyx `#111216` 테마·배경, standalone manifest, 셸의 기존 `env(safe-area-inset-top)` 처리가 있다. 검수 과정의 상태바 스타일 강제 메타와 상단 42px 보정은 현재 소스에 없다. iOS 전용 변경은 별도 커밋이나 이번 문서 갱신 시작 시 미커밋 소스에 없었다. [HTML](../../index.html) · [앱 셸 CSS](../../src/app/AppShell.module.css) · [PWA manifest](../../public/manifest.webmanifest)
- 당시 4173 Chrome에서 320·375·393·430·1280px, 모의 상단 inset 0·44·59·62px의 로고·오늘 카드·스크롤·탭 이동·새로고침·복귀와 운동 START/FINISH를 확인했다. 당시 FRONT 빌드와 PWA 관련 테스트 24/24가 통과했다 (`ios-edge-browser.log`, `ios-edge-workout.log`, `ios-edge-build.log`, `ios-edge-pwa-tests.log`). iPhone Safari 재검수와 설치형 PWA 재검수는 각각 미확인이다. HTTP LAN에서는 앱 배치·이동을 확인하고 신뢰된 HTTPS에서 설치형 PWA의 상태바·캐시·복귀를 구분해 확인한다. 최종 해결 및 사용자 승인은 대기 상태다. [4173 검수 절차](#review-4173)

#### 현황 갱신

Frontend 작업 담당자는 [공통 갱신 기준](../../../overload-server/docs/engineering/backend.md#현황-갱신)에 따라 이 절의 해당 항목을 갱신한다. 화면 작업은 [UI 단계 A~D](#181-기본-ui-개발-절차), 사용자 승인과 실기기 검증 범위를 함께 기록한다. 서버 쪽 상태는 [Backend 개발 현황](../../../overload-server/docs/engineering/backend.md#11-현재-개발-현황)으로 연결한다.

#### 화면별 구현 근거

[UI/UX 적용 지점](../product/ui-ux.md)의 Markdown에서 조작 규칙을, [Visual Theme Spec](../product/Overload_UI_Visual_Theme_Spec_v0.9.md)에서 실제 색상·위계를 확인합니다. [HTML 베이스라인](../product/Overload_UI_Baseline_Wireframe_v0.9.html)은 현재 UI를 기준으로 한 저충실도 검토 자료입니다. 문서 안의 화면과 준비된 상태를 화면 선택기, 링크, 모달, 토글로 확인합니다. JavaScript는 기본 검토 조작에만 사용합니다. 실제 애니메이션·타이머·오디오·저장·통계·서버 통신과 기능 검증은 운영 React 앱 또는 검토 앱에서 수행합니다. 검색·선택에는 [원본 PNG 6종](../product/assets/exercise-icons/README.md)을 32 CSS px로 재사용합니다.

전면 정적화 당시 브라우저 검사 두 건에서 이전 HTML 구조 의존성이 확인됐다. 현재 HTML의 화면 선택기 `#screen`은 기본 검토 조작에 사용하고, 루틴 UI 검사는 인라인 `routineTagDescriptions`를 읽는다. 동적 기록 통계·승인 조작은 React 검토 화면에서 확인한다. 공통 UI 구현 당시 전체 실행에는 두 검사 모두 통과한 기록이 있다. [기록 품질 검사](../../tests/record-quality.test.mjs) · [루틴 UI 검사](../../tests/routine-ui.test.mjs) · [현재 검증 기록](#공통-ui-컴포넌트와-독립-preview--2026-11-19)

게이지·누적 종목 위치·주간 상태·완료/취소 컨트롤·수행값/장비 텍스트 위계·물음표 도움말의 공식 절은 [UI/UX 적용 지점](../product/ui-ux.md)을 참조합니다. 공통 컴포넌트와 역할 토큰을 사용하고 테마 변경으로 입력·타이머를 초기화하지 않습니다. Visual Theme Spec의 작은 도움말 시각 크기를 실제 터치 영역 축소로 해석하지 않습니다.

[T01 공통 기반](../tasks/ui-v09-t01-foundation-report.md)에서 실제 계정의 홈/루틴/기록/설정 4탭과 Onyx 토큰·CSS Modules, 공통 표현을 적용했습니다. 인증·운동 controller와 저장·동기화 계약은 재사용합니다. 운동 집중 화면과 루틴 상세·편집·생성에서는 탭을 숨기며, 운동 홈 복귀와 탭 이동은 초안 저장 결과 및 계정 경계를 확인합니다. 운동 편집기는 탭 숨김으로 재마운트하지 않습니다. 운영 셸은 일반 테마이며, 개발 전용 `/ui-foundation`에서만 두 테마·입력·타이머·아이콘을 검증합니다. 이 화면은 프로덕션 번들에서 제외됩니다.

당시 [T02-A 홈 설계 일치 수정](../tasks/ui-v09-t02a-design-review-report.md)에 이은 [홈 세부 개선](../tasks/ui-v09-t02a-home-details-report.md)은 Decision Log 10.12절의 공식 달 헤더·날짜·글자 크기·선택 자동 닫힘·종목 달성 표시를 반영한다. 최근 운동은 종료 목록을 최대3페이지(60건), 상세 동시4개로 읽고 무수행을 홈에서만 제외한다. 분모는 InitialPlan, 분자는 기존 주간 달성 계약의 현재 유효 수행이며 승인 eligible과 구분한다. 당시 태그는 선택형 표현만 준비했고 저장은 T02-B 계약 대상이었다. 당시 실제 루틴·일정·기록은 기존 API를 읽었으며 디로딩 게이지의 대표 표시값은 개발 검토 앱에만 주입했다. 현행 계정 홈은 서버 분석·기간 상태를 읽는다. `DEV && VITE_HOME_REVIEW` 진입점은 production build에서 제거되며 시안 값을 운동/자격/권한/통계·IndexedDB에 사용하지 않는다. 검토 서버만 전용 계정의 실제 OTP 메일 전달을 자동화한다. HTTP LAN의 로그인·기기 식별은 기존 CSPRNG UUID 함수를 공통화해 지원하지만, Web Locks가 없는 홈에서는 새 운동 START를 비활성화한다. 기존 편집 잠금·고정 요청·ACK·오프라인 경계는 유지한다. 설치형 PWA는 별도 production/HTTPS 검증 대상이다.

[최종 시각 보완](../tasks/ui-v09-t02a-home-final-visual-report.md)에서 브랜드18px/700/자간0.06em을 적용하고, 동일 격리 검토 DB에 기존 루틴의 혼합 달리기 완료 기록1건을 실제 API로 추가했다. 이후 [최종 디테일](../tasks/ui-v09-t02a-home-polish-report.md)에서 공식 원형 아령 SVG·아이콘–수치 gap5px·제목 아래 구분선을 적용했다. 당시 태그 저장은 후속이었으며 현재는 T02-B 루틴 계약에 연결되어 있다.

T02-A 일반 홈은 2026-11-06 iPhone 실기기에서 최종 승인됐다. 보존된 검토 환경의 재개 승인·버전 확인·종료는 [테스트 환경 안내](../../../overload-server/docs/engineering/test-environment.md)를 따른다.

#### T02-B 단일 일정 연결 (2026-11-07 기록)

아래는 당시 계정 경로의 단일 일정 구현 기록이다. 표의 단일 일정 API는 T02 실제 연동에서 교체됐다. 최신 Backend의 프리셋 DTO·쓰기 계약은 [주간 일정 API](../../../overload-server/docs/api/weekly-schedule.md)를 따른다.

| 실제 모듈 | 책임·연결 |
|---|---|
| [WorkoutWorkspace.tsx](../../src/features/workout-online/WorkoutWorkspace.tsx) / `WorkspaceView` | `editor{routine,readOnly}`와 `scheduleEditing` 관리. 목록/공통 폼 연결. `scheduleRefresh`·`onScheduleSaved`로 홈/루틴 재조회. ACTIVE·고정 시도는 관리 쓰기 차단 |
| [RoutineCards.tsx](../../src/features/workout-online/RoutineCards.tsx) | 로컬 `day/vertical/filter`; 생성순 정렬·단일 목록 필터·요일 잠금. 서버 assignments로 배정 카드/주간 보기 파생, `Home.module.css` 재사용. 상세/수정/삭제 콜백 분리 |
| [RoutineDetail.tsx](../../src/features/workout-online/RoutineDetail.tsx) | 저장 루틴의 요약·종목·배정 조회와 편집·기존 START·삭제 진입 |
| [RoutineForm.tsx](../../src/features/workout-online/RoutineForm.tsx) | 생성·편집 공유 폼. 초안·검증·이탈 확인·고정 제출, 편집에서 제거 배치 복원. 주간 배정은 별도 화면과 API |
| [TagPicker.tsx](../../src/features/workout-online/TagPicker.tsx) | 미지정+10종·기존 설명 드롭다운, 키보드/ESC/바깥 닫힘. 태그는 실제 nullable 루틴 DTO이며 더미 분류가 아님 |
| [ExerciseSearch.tsx](../../src/features/workout-online/ExerciseSearch.tsx) | 추가·변경 공통 검색, 실제 카탈로그 이름/별칭·`ExerciseIcon`·PRIMARY 표시. 폼의 `searchRegion`/`showPicker`가 스크롤·포커스, 입력 보존 담당 |
| [WeeklySchedulePanel.tsx](../../src/features/statistics/WeeklySchedulePanel.tsx) / `ScheduleEditor` | 편집을 별도로 표시. saved assignments 기준 후보 필터,7일 초안 보존. 배정 유무/태그/전체3개 고정, 필터 밖 선택 option도 원래 이름 유지. 열려 있는 초안은 외부 refresh로 덮지 않음 |
| [weekly-schedule.ts](../../src/features/statistics/weekly-schedule.ts) / [routine-schedule.ts](../../src/features/workout-online/routine-schedule.ts) | `WeeklyScheduleApi.read/save`, `saveSchedule`가 저장 전 최신 version과 응답 후 GET 비교. immediate-v1·expectedVersion·appliedAt, 충돌시 초안 유지/조용한 병합 금지. 구 history 메서드가 코드에 남아 있으며 최신 Backend에서 해당 경로 제거 |
| [HomePanel.tsx](../../src/features/home/HomePanel.tsx) / [model.ts](../../src/features/home/model.ts) | 실제 일정·overview에서 `dayStatus` 파생. 미판정 요일/✓/X/-; 과거 날짜만으로 미수행 생성 금지. refreshKey로 일정 변경 반영 |
| [AchievementIcon.tsx](../../src/components/AchievementIcon.tsx) | 공식 아령 SVG/running.png18px. 최근 운동은 최초 계획 달성 분수, 루틴 세로는 등록 종목 수로 사용 의미 구분. 검색용32px 아이콘은 변경하지 않음 |

`assignments/version/timeZone/appliedAt`은 당시 PWA의 단일 일정 응답이다. 쿼리 없는 조회, 프리셋별 쓰기, 상태·프리셋 버전, 수동 적용·순환은 [현행 Backend 계약](../../../overload-server/docs/api/weekly-schedule.md)을 사용한다. 04시 검사와 과거 근거는 계속 서버 책임이다.

루틴/일정 쓰기는 기존 온라인 인증·CSRF·소유권·세대/version을 사용한다. 진행 운동의 IndexedDB3/schema2·snapshot·ACK·writerEpoch·계정 경계는 그대로다. 문서용 HTML은 합성 수치의 정적 화면이고 실제 조작은 검토 앱에서 확인한다. T02-A [마감 문서](../tasks/ui-v09-t02a-closeout.md)의 당시 종료/재개 절차는 환경 보존 기록이며 이번 문서 작업에서 서버를 시작·종료하지 않는다.

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

#### 세트 사이 휴식 설정

- `AuthApp`이 설정 하위 경로와 뒤로가기·탭 이탈 확인을 관리한다. `WorkoutWorkspace`가 부트스트랩에서 읽은 `settings`를 `RestSettings`에 넘긴다. 이전 조회 전용 `RestTimeCard`는 `RestSettings`로 교체했다. `RestSettings`는 조회/초안/검증/저장 중 상태를 소유하며 경계값은 고정한다. `시작 세트`·`끝 세트`는 목표 반복 횟수 상한을 표시한다.
- `WorkoutOnlineController.requestRestSettings`가 계정·세대 범위에서 PATCH를 직렬화하고 성공 응답 뒤 설정 스냅샷을 교체한다. 실패 시 초안을 유지하고 `WRITE_CONFLICT`에서 명시적 GET 후 다시 저장할 수 있다. 취소는 쓰기 없이 조회로 복귀한다. 이미 보존된 로컬 운동의 `restPolicy`를 바꾸지 않으며 새로 초기화하는 로컬 운동에는 최신 값을 전달한다. [서버 연동 범위](backend-ui-v0.9.md#두-휴식-설정의-저장-경계)

#### T03.5 휴식 타이머 시각·효과음 알림

`1eb6c05`에서 설정과 실제 운동 연결이 구현됐다. [최신 UI 결정](../product/Overload_UI_Decision_Log_v0.9.md#1035--세트-사이-휴식과-휴식-타이머-알림--2026-11-19)

- `useRestAlertPreferences`는 화면 방식 `off|dim|flash`, 상·하단 점멸과 시작 시점, 종료음·중간음 ON/OFF, 공통 음량, 중간 알림 시점(20·30·60초)을 `overload.rest-alerts.v1:<userId>`에 저장한다. 기본은 상·하단 점멸 ON(5초), 종료음 ON(70%), 중간음 OFF(시점 30초)다. 브라우저 저장 이벤트로 변경을 반영하고 저장 실패는 설정 화면에 표시한다.
- `completeSet`은 계정의 반복 상한별 설정을 사용해 새 세트 사이 휴식의 종료 예정 시각을 정하고, 그 휴식에 적용할 중간 알림 시점을 함께 보존한다. 시점 설정을 바꿔도 진행 중인 휴식의 종료 시각과 중간 알림 시점은 유지된다. 마지막 세트 완료에는 새 휴식이 생기지 않는다.
- `LocalWorkoutFlow`가 기존 종료 시각에서 구한 남은 시간을 `restAlertVisual`로 평가한다. `WorkoutFrame`/`RestActions`가 상단과 하단 점멸 및 푸터를 제외한 12~1초 어둡게 오버레이를 표시한다. 10초 이하의 중앙 숫자는 경고색이다. 운동 의도와 `+30초`·수동 종료의 저장 경로는 기존 코드가 담당한다.
- `useRestAudio`는 사용자 제스처로 Web Audio를 활성화한다. 종료 카운트음은 남은 5·4·3·2·1초에 각 한 번 재생한다. 독립적으로 켤 수 있는 중간 알림은 화면에 보이는 동안 남은 시간이 저장된 기준에 도달할 때 휴식당 한 번 발생하며, 기존 소리를 0.22초 간격으로 3회 예약한다. `+30초`는 새 종료 예정 시각을 기준으로 계산하며 이미 재생한 중간 알림은 다시 울리지 않는다. 계정별 브라우저에 최근 운동의 재생한 휴식 ID를 보존해 새로고침 뒤에도 중복을 막는다. 복귀 시 종료 예정 시각에서 남은 시간을 다시 계산하고 활성화된 오디오의 재개를 시도한다. 화면 잠금·백그라운드·탭 이동·새로고침 중 지난 중간 알림은 소급 재생하지 않는다.
- 수동 휴식 종료와 해당 세트 완료 취소는 로컬 쓰기 완료를 기다리는 동안 기존 시각 효과와 예약음을 해제한다. 운동 종료를 확정하면 같은 시점에 모든 휴식 효과를 해제한다. 다른 종목을 보기만 하면 기존 휴식 종료 시각은 유지된다.
- `RestAlertSettings`는 가상 종료 시각과 시작 시점의 설정 사본을 사용하며 운동과 같은 5~1초 판정과 오디오 재생 코드를 재사용한다. 설정 화면 오디오 인스턴스는 운동 인스턴스와 독립적이다. 마지막 예약 오실레이터의 `ended`로 미리듣기 UI를 복원하고 `Ⅱ`·다른 샘플·이탈은 예약음까지 정리한다. 전체 미리보기는 중간 알림음을 호출하지 않는다. [화면과 시연 규칙](../product/ui-ux.md#휴식-타이머-알림)
- 앱 구현 당시 전체 테스트는 세트 사이 휴식 649/649, 알림 연동과 후속 아이콘·미리듣기 단계 651/651이었다. 당시 Chrome·정적 검사 이력과 별개로 실제 계정의 휴식 PATCH, iPhone Safari 키보드·음량, 설치형 PWA·백그라운드 오디오는 미검증이다. 알림의 서버·기기 간 동기화는 미지원이다.
- 2026-11-22 UI-02·UI-20 후속 검수는 [4173 실제 앱](#review-4173)의 PC 루프백과 LAN 주소에서 진행했다. Spring START·snapshot·FINISH와 종목 전환·이어하기·새로고침의 휴식 종료 시각, 미리보기와 같은 점멸·종료음, 중간음·연장·수동 종료·세트 취소를 확인했다. 검수 운동은 논리 삭제했고 전용 프로필의 편집 잠금을 정리했다. iPhone 설치형 PWA·잠금·음악 동시 재생은 실기기 검증이 남아 있다.
- 중간 알림 연동 재검증은 같은 PC 루프백과 LAN의 Chrome에서 실제 Spring START `201`, snapshot `200`, FINISH를 확인했다. 브라우저 시각을 제어해 120초 휴식의 20·30초 전, 180초 휴식의 60초 전에 각 이벤트 한 번으로 세 소리가 재생됨을 확인했다. 진행 중 시점 변경, 연장·새로고침의 중복 방지와 종료 카운트음도 확인했다. 검수 세션은 논리 삭제했고 검수 계정의 ACTIVE 운동은 0건이었다.

---

## 9. 운동 기록 입력 UX

### 루틴 중심 중량·메모·대체 후속 구현 — 2026-11-13

**정책 확정 / 구현·API 연결·검증 전.** [제품 10.21절](../product/Overload_UI_Decision_Log_v0.9.md#1021--루틴-중심-중량메모대체-정책--2026-11-13-후속-확정), [루틴 후속 계약](../../../overload-server/docs/api/routine-management.md#2026-11-13-후속-확정-정책과-현재-http의-경계), [세션 후속 계약](../../../overload-server/docs/api/workout-sessions.md#2026-11-13-후속-확정-정책과-구현-경계)을 참조한다. 이 문서 갱신은 코드 완료가 아니다.

- `RoutineForm`·`routine-weights.ts`·`EquipmentFields`: 조합이 유지되면 배치 승인값을 사용한다. 표준 운동·제조사·중량 방식 신규 선택/변경에는 최근 실제 완료 세트 중량을 조회하고 사용자 확인·수정 후 저장한다. 변경 배치는 기존 제외+NEW로 최초/승인값과 평가 계보를 새로 시작하며 같은 조합 복귀도 자동 RESTORE하지 않는다. 취소는 원본을 바꾸지 않는다.
- 조회는 `로딩 / 실제 기록 있음 / 기록 없음 / 실패`를 구분한다. 없음일 때만 0kg을 제안하며 실패를 0으로 저장하지 않는다. 사용자·세대·조합·요청 차수를 확인해 늦은 응답을 배제하고 조회 후 사용자가 수정한 초안을 덮지 않는다. 재렌더·정규 START·기존 운동 복원 때마다 최근값을 덮어씌우지 않는다.
- `LocalWorkoutFlow`·`workout-local/model.ts`·`flow-data.ts`: 오늘만 추가·대체의 중량·메모도 선택 조합으로 읽는다. 현재 `previousRecords`의 종료 첫 페이지·ordinal별 Map은 최근 마지막 세트 조회의 완성 계약이 아니다. `changeEquipment`의 단순 대입과 원본 승인 문맥 유지도 후속 검증 대상이다. 실제 완료 세트·미완료 입력·타이머·고정 snapshot/FINISH를 보호한다.
- `WeightFocus`의 기존 textarea와 `WorkoutFrame` 키보드 보정을 재사용한다. `LocalWorkoutController.memo`·`equipmentMemos[sessionExerciseId]`의 세션별 원본은 조합별 최신 서버값과 로컬 미저장 초안으로 정리한다. 조합 변경 시 해당 메모로 전환하고 없음/실패를 구분한다. 메모는 루틴·기기에 공통이며 메모 이력/수행별 스냅샷을 만들지 않고 루틴 승인값·version·서버 운동 revision을 올리는 변경으로 취급하지 않는다.
- `WorkoutSummary`·`summary-data.ts`·`ClosedWorkout`: 루틴 슬롯 완료와 세션 공식 평가 전체 제외를 별도로 표시한다. 현재 `overallWeightPlanComplete`를 루틴 완료 표시에도 사용하는 연결은 정책 3-1에 따라 공통 InitialPlan 달성으로 분리해야 한다. 임시 대체가 있으면 다른 정규 종목도 공식 증감 평가하지 않으며 단순 추가·초과 세트만으로 제외하지 않는다. `weightReview`를 공식 평가 자격으로 재해석하지 않는다. 중량 검토 카드의 제외·전체/선택 승인과 기존 정정/PENDING 해결 분리는 10.23.5~6절을 적용하며 세션 단위 공식 제외 근거는 미완성이며, 종료 후 명시 승인은 V36 계약으로 이미 구현돼 둘을 구분한다.
- **2026-11-16 확정으로 대체:** 최근값은 FINISHED만·ACTIVE 제외, 가장 최근 종료의 마지막 유효 완료 세트다. 메모는 변경 blur/입력 종료 시 온라인 저장·서버 최종 반영값 우선 LWW·실패 초안/재시도 보호다. 별도 오프라인 자동 동기화는 추가하지 않는다. 동률의 구체 해소 순서·HTTP/DTO·새로고침 초안은 구현 검토로 남긴다. 개인 장비/공식 중량 프로필·새 팝업·범용 Outbox를 추가하지 않는다. 기존 개발 데이터·구 API 호환을 위한 변환 계층은 기본 요구가 아니지만 신규 구현의 사용자/세대·원본 수행·초안 보호는 유지한다.

**변경 기록:** 2026-11-13 후속 정책을 문서에만 반영했다. 기존 8.7절 코드·검증 기록과 구분하며 HTML·소스·테스트·DB는 변경하지 않았다.

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

완료·취소·계획·승인 의도 변경은 확정 snapshot의 localRevision을 증가시킵니다. 입력 초안·작업 중량 선택·준비/시작 앵커·타이머 시작/정지/확인·종목별 휴식 조절·종목 탐색·시간 체크포인트만 바뀌면 로컬 editVersion만 증가시키고 타이머 tick은 저장하지 않습니다. 완료 사실·해당 휴식·다음 종목의 준비 및 자동 이동·revision·미전송 메타는 한 트랜잭션으로 저장합니다. 명시 로그아웃/계정 설정 전에는 대기 초안 저장을 기다리며 실패하면 화면을 유지합니다. 이미 열린 운동의 인증 만료는 메모리에서만 같은 계정의 로컬 입력을 허용하고, 재인증 시 세대·현재 세션을 다시 확인합니다. Web Locks 미지원·다른 탭 보유 시 쓰기 우회는 없습니다.

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

#### 근육별 독립 집계와 선택 프리셋 계획 — 2026-11-13

**2026-11-16 현행 구분:** 선택 프리셋의 반복 월~일과 전면/후면·PPL·세부 근육 계획 기여, 이번 주 실제 근육 기여와 완전한 일정 근거의 계획 기여는 구현됐다. 부위 계획은 미확인이며 실제 전면/후면·PPL·검수 부위의 독립 집계·전체 근육/권장 범위는 미완성이다. 상세는 [현행 통계 연결](../../../overload-server/docs/api/statistics.md#1차-frontend-연결과-계산의-실제-범위--2026-11-16)을 따른다. 아래 2026-11-13 지침의 일괄 ‘미구현’은 당시 기록으로 읽는다.

**정책·UI 설계 기준.** [ST-24~31·4.3절](../../../overload-server/docs/product/Overload_Statistics_and_Tracking_Design_Specification_v1.4.md#4-근육별-세트-집계), [현재 HTTP·후속 경계](../../../overload-server/docs/api/statistics.md#분류별-독립-집계와-선택-프리셋-계획--2026-11-13), [기록 탭 최신 UI](../product/Overload_UI_Decision_Log_v0.9.md#1024--기록-탭-최종-개편--2026-11-14)을 따른다.

- 현재 [StatisticsPanel.tsx](../../src/features/statistics/StatisticsPanel.tsx)의 `WeightChart`·`StatisticsView`는 실제 `contributionSets`와 정수 `weights.completedSets`를 기여/실제 참여로 구분하고 `groupActuals`를 표시한다. `weights.plannedSets`는 현재 가중하지 않은 계획 참여다. 이 구현은 계획 기여·네 수준 전체·선택 프리셋 현재 계획 분석까지 지원하지 않는다.
- 전면/후면·PPL·부위는 검수된 운동 분류와 원본 세트에서 각자 계산한 서버 결과를 사용한다. 프론트에서 세부 근육 기여나 `groups` 역할 행을 더해 상위 분류·전체 세트를 만들지 않는다. 세부 근육 기여는 계획/실제 각각 PRIMARY 1.0 / SECONDARY 0.5이며 참여 정수·기여 소수·반복/볼륨의 의미와 정확한 십진 표현을 유지한다.
- 기존 주간 프리셋 조회·선택과 루틴 배정을 재사용한다. 선택한 활성/비활성 프리셋의 월~일 현재 계획 분석을 과거 날짜 Overview·실제 완료량·디로딩 임시 계획으로 대체하지 않는다. 새 조회의 경로·DTO·상태 표현은 후속 계약으로 연결하며 아직 없는 응답 필드를 가정하지 않는다. 분류 없음/확인 필요를 0 또는 임의 분류로 바꾸지 않는다.
- 최신 표시명은 주간 근육 계획/주간 근육 통계다. 계획은 선택 프리셋의 현재 반복 월~일, 통계는 이번 주 월~일 실제/당시 계획 고정이다. 종전 독립 week/month·offset은 과거 구현 기록이며 `f2a6768`은 이번 주 읽기 전용 행만 제공한다. 화면 식별자 변경을 강제하지 않는다.
- 운동 현황 상단 period 상태 하나를 요약·추이·달성·하단 유산소 카드에 공유한다. 기존 운동 검색 컴포넌트를 전체/운동별/분류별/근육별 후보 목록에 재사용하고 선택 항목 통계를 별도로 조회한다. 현재 Overview에는 선택 항목 날짜별 시계열이 없으므로 기간 전체 합계 필터를 날짜별 추이로 가장하지 않는다.
- 홈과 기록의 날짜 기호는 같은 근거·같은 순수 판정 함수를 사용한다. 10.24.4절의 정확히 50%·min(2, 원계획 세트)·유산소 시간/거리 AND·혼합 조건을 적용하고 근거 부족/미래/검사 대기를 중립으로 유지한다. 공식 effectiveDay/G4나 기존 status enum을 UI △로 덮지 않는다.
- 기록 메인 최근 7일과 이번 주를 분리한다. 월간 이력의 선택 월·달력과 루틴별/운동별 전체 기간 검색 상태를 분리하고 해제 시 월을 복원한다. 현재 closed cursor·기간/이름 필터·종료 정렬·카드 요약의 부족은 서버 계약 검토로 연결한다. 원계획·장비·승인 문맥과 정정/복구를 유지한다.
- 얇은 주차 구분선은 필터 후 기록 있는 주의 첫 카드에만 표시한다. 월~일 경계·월/연 경계·동일 날짜 복수 세션과 페이지 경계의 주차 헤더 중복을 확인한다. HTML 전용 v10SearchUi/v10SearchRows를 React 코드로 존재한다고 가정하지 말고 기존 React 검색 패턴을 재사용한다. 합성 날짜·계수·권장값을 실제 계약으로 승격하지 않는다.

**변경 기록:** 2026-11-13 근육 집계 후속 정책과 현재 PWA의 차이를 문서에 반영했다. HTML·컴포넌트·API 구현·테스트 실행은 수행하지 않았다.

### 14.4 그래프

- 현행 package.json·lockfile에는 Recharts 3.10.1과 React 19.3.1에 대응하는 react-is 19.3.1이 설치돼 있으며 RecordChart.tsx가 사용합니다. 수치 변환은 렌더링에만 적용하고 정확한 십진 원본·승인 사건을 보존합니다.
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

로컬 PWA를 검수할 때는 [4173 PWA 검수](#review-4173)의 실제 앱과 전용 계정으로 운동 START까지 확인합니다. 아래 LAN Mock 설정은 합성 UI를 독립적으로 시연할 때 적용합니다.

- 기존 검토 서버·설정·주소·포트를 우선 사용합니다. 사설 LAN 접속에는 기존 `server.host: true` 또는 해당 검토 모드의 LAN 바인딩을 적용합니다. `ui-review`에서는 확인한 사설 IPv4를 `OVERLOAD_MOCK_LAN_IP`에 지정하며 기본 포트는 4173입니다. 피드백마다 서버·DB·계정을 다시 만들지 않습니다. UI 변경은 같은 환경에 반영하고 필요한 경우 프런트엔드만 재시작합니다.
- 사용자의 최종 UI 승인이 없거나 피드백이 남아 있으면 사용자 검토 환경을 유지하고 중간 커밋을 하지 않습니다. 검증에 사용한 별도 일회용 프로세스는 [AGENTS.md의 정리 규칙](../../AGENTS.md#local-process-cleanup)을 적용합니다. 최종 종료 시 실행 소유권·PID·포트를 확인하고 해당 환경의 안전 종료 경로를 사용합니다. [테스트 환경 안내](../../../overload-server/docs/engineering/test-environment.md#종료와-보존)
- Backend·DB 변경을 포함하면 변경 범위를 먼저 확인합니다. 기존 환경의 Backend 버전, DB 스키마, 실제 Flyway 이력, 데이터·계정 상태와 호환성·보존 여부를 확인합니다. 승인·백업·복구 조건을 충족한 뒤 승인된 변경만 반영하고, 적용 결과와 코드·데이터 일치를 검증한 상태로 PC와 iPhone에서 시연합니다. 보존 DB의 재개·마이그레이션·데이터 변경에는 기존 별도 승인 절차를 적용합니다. UI 전용 작업은 프런트엔드에서 검토합니다. [테스트 환경 안내](../../../overload-server/docs/engineering/test-environment.md)

<a id="review-4173"></a>

#### 로컬 4173 PWA 검수

로컬 PWA 검수의 기본 주소는 PC `http://127.0.0.1:4173/`와 동일 Wi-Fi의 `http://192.168.0.3:4173/`입니다. 둘 다 격리 Spring API와 PostgreSQL을 사용하는 실제 앱의 `/`로 들어갑니다. `npm run review:lan`과 `/routine-preview`는 합성 UI 시연 경로입니다.

**기존 환경 실행과 갱신**

1. PWA 저장소에서 `logs/workout-api-review/recovery-current.json`의 검수 실행 ID와 기존 `.local-backups/workout-api-review/<run-id>/backend.json`을 확인합니다. 실행 스크립트가 Spring·제어 서비스의 실행 소유권, 전용 컨테이너·볼륨, loopback DB 연결, V1~V37 호환성을 확인합니다. 4173 리스너와 두 주소의 `GET /api/v1/health`에서 HTTP 200과 `status=UP`을 확인합니다. 앱 루트에서는 **검토 계정으로 로그인** 또는 이미 인증된 앱이 표시됩니다. Health 확인 뒤 실제 START까지 진행합니다.
2. Spring과 기존 4173 게이트웨이가 실행 중이면 PWA 저장소의 PowerShell에서 아래 명령으로 기존 프런트엔드 빌드만 갱신합니다. 다음 예시의 IP는 검수 PC의 현재 사설 IPv4입니다. 기존 브라우저에서 새로고침한 뒤 루프백과 LAN의 앱이 모두 최신 빌드를 제공하는지 확인합니다.

   ```powershell
   $env:OVERLOAD_REVIEW_LAN_IP = '192.168.0.3'
   node scripts/recovered-data-review-server.mjs 4173 build-only
   ```

3. 기존 Spring이 실행 중이고 4173이 비어 있으면 같은 셸에서 `node scripts/recovered-data-review-server.mjs 4173`으로 빌드 및 게이트웨이를 시작합니다. 이미 유효한 검수 빌드가 있으면 `node scripts/recovered-data-review-server.mjs 4173 serve-built`로 게이트웨이만 시작할 수 있습니다. LAN IP가 바뀌면 새 주소로 빌드한 뒤 소유권을 확인한 게이트웨이를 재시작해 접속 허용 주소도 반영합니다. `OVERLOAD_DEV_API_TARGET`을 설정하지 않은 검수 셸을 사용합니다. [4173 실행 스크립트](../../scripts/recovered-data-review-server.mjs)
4. Spring 확인이 실패하면 같은 실행의 `backend.err.log`와 `backend.out.log`, 컨테이너 라벨·볼륨·loopback 매핑부터 확인합니다. 기존 스키마와 데이터로 Spring을 다시 띄우는 절차는 [Backend 검수 환경 안내](../../../overload-server/docs/engineering/test-environment.md#review-4173-backend)를 따릅니다.

**더미데이터와 운동 검증**

- 2026-11-22 복구한 검수용 더미데이터는 기존 4173 전용 계정에 있습니다. 월~토요일 루틴을 포함한 루틴 12개, 11월 13일 종료 운동 13건, 웨이트 세트 111개, 유산소 기록 9건입니다. 기존 `Test` 루틴과 활성 일정은 유지했고, 복구한 요일 배정은 두 번째 주간 일정 프리셋에서 확인할 수 있습니다. 기록·통계에서는 11월 13일이 포함된 기간을 선택합니다.
- 운동을 시작할 때는 기존 루틴을 **홈 → 오늘만 다른 루틴 선택**으로 선택합니다. 이 경로는 주간 일정 배정을 저장하지 않습니다. 검수 계정의 ACTIVE 운동이 0건인지 먼저 확인합니다. 기존 ACTIVE 운동이 있다면 표시와 소유 브라우저를 확인해 해당 운동의 이어하기를 검수하며, 다른 검수자가 만든 운동의 종료·삭제는 소유권이 확인된 뒤 처리합니다.
- 검수할 때 같은 LAN 주소에서 **운동 시작 → 준비운동 완료 → 운동 시작하기 → 세트 입력·완료 → 홈 복귀 → 운동 이어가기 → 새로고침 후 복원**을 실행합니다. 실제 `POST /api/v1/workout-sessions`의 `201`과 세트 완료 시 `PUT /api/v1/workout-sessions/{id}/snapshot`의 `200`을 확인합니다. 두 번째 같은 출처 탭에서는 읽기 전용이 되고, 편집 탭을 닫은 뒤 다시 열면 저장한 세트를 이어서 편집할 수 있어야 합니다. PC 루프백 결과와 LAN 결과는 각각 기록하고, iPhone Safari와 홈 화면 앱은 직접 실행한 결과만 기록합니다.
- 일반 출처와 PC 루프백은 Web Locks를 사용합니다. **4173 빌드에서 지정한 사설 LAN HTTP 주소**는 Web Locks가 없는 경우 계정·데이터 세대·운동별 IndexedDB 편집 잠금을 획득한 뒤 START를 보내고 같은 잠금으로 이어하기를 보호합니다. 잠금 실패 화면에서는 편집 탭과 IndexedDB 사용 가능 여부를 먼저 확인합니다. 이 주소의 운동 START·저장은 실제 OTP·CSRF·Spring API를 사용합니다. HTTP에서의 운동 검수와 HTTPS Service Worker·오프라인 설치 검증은 각각의 조건에서 확인합니다. [검수용 편집 잠금](../../src/features/workout-local/review-lock.ts)
- 검증이 끝나면 이번에 만든 운동 ID에 한해 정상 종료하고, 검증 후 표시할 필요가 없는 기록은 앱의 기록 삭제 절차를 사용합니다. 새로 만든 검증용 루틴도 같은 범위로 정리합니다. 새 ACTIVE가 남지 않았는지 확인하고 검증 브라우저와 탭을 닫습니다. 공용 검수 계정의 기존 루틴·기록·로그인과 사용자의 브라우저 저장소는 보존합니다. 복구가 필요하면 [Backend 검수 환경 안내](../../../overload-server/docs/engineering/test-environment.md#review-4173-backend)를 따릅니다.

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
