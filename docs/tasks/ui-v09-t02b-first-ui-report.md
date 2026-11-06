# T02-B 루틴 관리 1차 React UI

2026-11-06. 기준 PWA `afd6ed9`(T02-A 구현 `60a6dce`), Backend `80327ca`. 시작 시 두 저장소 모두 clean이었다. 사용자 승인된 T02-A 홈/공식 자산은 변경하지 않았다. 이번에는 commit/push하지 않는다.

## 구현과 HTML 대응

| 공식 HTML | React 구현 | 이번 범위 |
|---|---|---|
| routineListHtml / routineCard | RoutineCards + WorkspaceView | YOUR TRAINING PLAN·나의 루틴·현재 주간 일정·저장 수·개별 카드·종목/세트/유산소 요약·상세·편집·삭제·새 루틴·빈 목록 |
| routineEditorHtml | 기존 RoutineForm 확장 | 이름·선택형 태그·요일 UI·WEIGHT/CARDIO 구획·독립 순서·저장/닫기 |
| routineExerciseHtml | 기존 WeightDraft / EquipmentFields / routine-weights | 제조사/부하 독립 nullable, 세트/최소/최대, 최초/승인 중량 분리, 명시 승인, 위/아래·제거 |
| routinePickerHtml | 기존 ExerciseSearch | 접힌 추가 버튼→이름/별칭 검색→선택→새 배치 추가 후 닫힘. 같은 표준 종목의 중복 배치를 서로 다른 UUID로 허용 |
| routineCardioFields | 기존 CardioDraft 확장 | 시간(분)·거리·SPEED/PACE·경사/저항·계획 펼침·위/아래·제거. 기존 API의 추가 종류도 유지 |
| routineDeleteHtml | 기존 controller + 확인창 | 기존 기록 보존 문구, 기존 version 기반 삭제 경로 재사용 |
| routineConflictHtml | 기존 WeeklySchedulePanel 유지 | 편집기 내 요일 선택과 원자 결합 저장/교체 확인은 미연동. 현재 주간 일정 쓰기 흐름을 임의로 대체하지 않음 |

실제 색상은 Visual Theme Spec의 Onyx/Dusty Blue 토큰과 CSS Modules다. 공통 AppShell/4탭을 재사용하고 편집 중 탭 숨김을 유지한다. 목록의 상세 요약은 기존 상세 GET을 최대4개 동시 조회하며 계정/세대/인증 오류는 기존 invalidate 경계로 전달한다. 미조회·실패한 상세의 종목 수를0으로 꾸미지 않는다.

주간 일정은 기존 컴포넌트를 목록 헤더와 저장 루틴 사이에 배치했다. 편집 중 목록/일정은 hidden 상태로 보존해 기존 일정 입력을 새로 만들지 않는다. 상세·START는 기존 controller 경로와 저장 준비/진행 세션/미확인 요청 제한을 그대로 사용한다.

## 태그·요일과 데이터 경계

- 태그: optional1개, 최초 미지정, 해제 가능. PUSH/PULL/LEGS/FRONT/BACK/FULL/UPPER/LOWER/CARDIO/MIXED. 자동 추정 없음
- 현재 Routine DTO/API에는 tag가 없다. 컴포넌트의 `RoutineTag | ''` 초안만 사용하며 API/IndexedDB/실제 루틴에 추가하지 않는다
- 태그 또는 편집기의 요일 시안 선택이 남아 있으면 저장을 보류하고 해제/기존 주간 일정 관리 안내를 표시한다. 값을 버리고 저장 성공처럼 처리하지 않는다
- 기존 편집기 요일 UI는 현재 배정 조회값이 아닌 검토용 초안임을 표시한다. 실제 배정은 기존 WeeklySchedulePanel에서 조회/저장한다
- 루틴 POST/PUT과 일정 PUT을 임의로 원자 저장처럼 합치지 않았다. 태그 저장 DTO/검증·일정 선택 초기값/교체 확인·부분 실패 UX는 다음 실제 연동 범위다
- 유산소 분 입력은 BigInt로 정수 초 변환 가능성을 검사한다. 2.5분→150초. 기존 루틴의 시간은 입력을 건드리지 않으면 원래 정수 초를 그대로 보낸다
- 요청 고정/실패 시 초안·최초 중량·승인 문맥·expectedVersion은 기존 처리 유지. 닫기에는 변경 폐기 확인을 추가했다

표준 카탈로그 현재 계약은 UUID/이름/별칭이며, HTML의 대분류·PRIMARY/부위 아이콘을 확정할 분류 필드가 없다. 기존 ExerciseSearch/ExerciseIcon의 중립 미분류 표현을 유지하며 이름으로 분류를 추정하지 않았다. 공식 검색 아이콘6종은 원본/32px 그대로다. 분류/근육 설명 연동은 후속이며 가짜 API 필드를 만들지 않았다.

## 서버 없는 검토 준비

DEV 전용 `/routine-preview` 진입점에 명시된 합성 루틴·카탈로그로 목록/상세/생성/편집을 준비했다. 실제 계정/인증/API/DB와 연결하지 않으며 저장/삭제 성공을 표시하지 않는다. production에서는 DEV lazy branch가 제거된다. 아직 이 경로를 여는 상시 Vite 서버를 실행하지 않았다.

`tests/fixtures/routine-ui.jsx`는 별도의 컴포넌트 테스트 데이터다. 임시 테스트 서버는127.0.0.1의 임의 포트에 configFile/envDir=false로 뜬 뒤 테스트 종료와 함께 닫힌다. 사용자 검토용 Vite3000·Backend·PostgreSQL 재개와는 별개다.

## 검증

- 전체 `npm test`: 534/534 통과(기존533 + 신규 상호작용 테스트1)
- 신규 브라우저 컴포넌트 테스트: 태그/요일 저장 차단, 별칭 검색/배치 추가·제거, 배치 ID 유지 순서 변경, 2.5분→150초, tag 미전송, 실패 후 자동 닫힘 없음, 변경 폐기 확인, 393/320 가로 overflow 없음
- 기존 T01 분리 브라우저8개 보호 회귀: 입력/타이머/고정 snapshot/writerEpoch/ACK·저장 실패 이동 차단·계정/세대·오프라인 PWA 통과
- build/TypeScript·lint·git diff 검사 수행. 실 API와 iPhone 검토는 이번에 수행하지 않음
- 기존 정적 테스트2개는 접힌 picker/요일 UI가 추가된 현재 요구로 갱신. 최초 fixture의 viewport/import 문제를 수정했다. 제품 저장/판정 기준을 완화하지 않았다
- 편집 fixture 캡처: `logs/routine-ui/editor-393.png`. 합성 데이터이며 실제 계정 화면이 아니다

## DB·Git·다음 작업

PC dump SHA256 `b282baa89d00029d2769aebec52d972d93947e356bd690733b26d8b133f5a7b5` 확인. 원래/영구 복원 컨테이너 모두 exited 상태를 확인했고 시작/초기화/seed/실 데이터 쓰기를 하지 않았다. Backend 저장소는 수정하지 않았다.

수정: RoutineForm·WorkspaceView·main·기존 UI 테스트. 추가: RoutineCards·Routine.module.css·DEV RoutinePreview·분리 fixture/상호작용 테스트·이 보고서. Frontend 현황과 AGENTS에 1차 UI 이후에도 사용자 승인 전 서버를 재개하지 않는 조건을 명시했다. 공식 HTML/Decision Log/Theme Spec에는 새로운 미검토 디자인 결정을 기록하지 않았다.

다음 단계는 사용자 승인 후 보존 DB의 실제 API·iPhone 검토다. 현재는 서버 종료 상태를 유지한다. 그때 태그 저장 계약, 편집기 요일 저장/충돌 확인 통합, 카탈로그 분류 표시를 각각 확정·연동한다. [보존 재개 절차](ui-v09-t02a-closeout.md)는 승인 이후에만 수동 실행한다.
