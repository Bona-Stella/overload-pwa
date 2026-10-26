# Task 003 후속 — 마지막 세트 완료 후 휴식 제거

작성일: 2026-10-26 (Asia/Seoul). 현재 UX는 이 보고서와 제품 명세를 기준으로 한다. 최초 Task 003 보고서는 당시 자동 이동 방식의 기록으로 보존했다.

## Summary / 문제 원인

- 수정 전 현재 소스의 신규 마지막 세트 완료는 `transition`을 만들고 다음 종목으로 자동 이동했다. 이번 사용자 피드백에 따라 자동 이동을 제거하고 현재 완료 종목에서 `다음 종목으로` 버튼을 누르는 방식으로 변경했다.
- 별도로 재현 가능한 결함을 확인했다. 이전 v1에서 저장한 마지막 세트 `rest`를 복원할 때, 해당 종목은 완료됐지만 다른 미완료 종목이 남아 있으면 화면이 그대로 휴식으로 해석했다. 기존 방어는 전체 세션 완료 시 휴식 숨김만 다뤘으며 이 부분 완료 세션의 복원을 놓쳤다.
- `resolveWorkoutTimer`가 완료된 종목의 구 휴식을 가장 늦은 실제 완료 시각에 근거한 경과시간으로 해석하도록 수정했다. 최초 로드나 렌더링은 실제 기록과 저장 원문을 덮어쓰지 않는다. 상태 변경 전후에도 이 규칙을 적용해 완료 취소 시 구 휴식이 다시 나타나지 않도록 했다.
- 사용자의 당시 브라우저 캐시나 로드된 JS가 원인이었다고 단정하지 않는다. 사용자는 별도로 `npm run dev`를 실행했다가 종료했음을 알렸다. 당시 서버는 조사 중 종료됐으며 그 브라우저가 이미 받은 자산의 버전은 소급 확인하지 못했다. 최종 검증에서는 직접 실행한 개발 서버 및 최신 빌드와 제공 파일의 일치를 확인했다.

## Changes

| 파일 | 이번 후속 변경 |
| --- | --- |
| `src/features/workout/model.ts` | 마지막 세트 완료 시 선택 종목 유지, 완료/중간 세트에 맞는 타이머 해석, 구 v1 마지막 휴식 보완, 편집 전후 타이머 일관성 유지 |
| `src/features/workout/WorkoutScreen.tsx` | 공통 타이머 해석 사용, `다음 종목으로`, 전체 완료 시 `운동 종료 및 요약` |
| `tests/workout.test.mjs` | 수동 이동/시각 보존/복원 기대값 갱신, 구 휴식 복원·취소 및 중간 휴식 보존 회귀 테스트 |
| `tests/components.test.mjs` | 완료 종목 기록 유지/다음 CTA/종료 CTA 기대값 갱신, 구 휴식 복원 표시 회귀 테스트 |
| `docs/product/requirements.md` | 마지막 세트와 전체 완료, 구 저장 복원 요구사항 정리 |
| `docs/product/ui-ux.md` | 버튼 이동·타이머·종료 CTA를 현재 UX와 일치시킴 |
| `docs/tasks/task-003-core-ux-report.md` | 당시 기록임을 표시하고 현재 후속 보고서 링크 추가 |
| `docs/tasks/task-003-last-set-followup-report.md` | 이 보고서 추가 |

중간 세트 자동 휴식, 휴식 종료/+30초, 기존 실제 기록, 기준 기록 비교, 승인/오늘만 중량, 원본 루틴/세션 분리, 이력 확정 로직은 변경하지 않았다. 한 세트뿐인 종목의 첫 세트는 마지막 세트 규칙을 적용해 휴식을 시작하지 않는다.

## 실행 버전 및 캐시 점검

1. 기존 사용자 개발 서버가 종료된 것을 확인한 뒤 현재 `overload-pwa`에서 `npm run dev -- --host 127.0.0.1 --port 3000 --strictPort`로 직접 실행했다. 기존 사용자 프로세스는 종료하지 않았다.
2. `/` 응답이 `/@vite/client`, `/src/main.tsx`를 참조하는 개발 페이지임을 확인했다. HTTP 응답은 `Cache-Control: no-cache`였고 두 핵심 파일의 소스맵 `sourcesContent`와 현재 파일을 줄바꿈 정규화 후 SHA-256으로 비교해 일치를 확인했다.
3. `npm run build` 후 별도 포트 3004에서 `vite preview`로 실제 `dist`를 실행했다. 브라우저 DOM이 참조한 최종 자산은 `/assets/index-BzTi6DOj.js`이며 HTTP로 받은 바이트의 SHA-256이 로컬 `dist`와 일치했다.
4. 최종 JS SHA-256: `14fccf4f4e3c201356e7b60d61e50ce2a880a85dc46c93ebe0e5fc4544b55cce`.
5. 소스와 설정에서 Service Worker 등록 코드를 발견하지 못했다. 기존 사용자 브라우저의 캐시/저장 데이터를 삭제하거나 초기화하지 않았다. 테스트는 기존 앱 포트와 다른 origin에서 수행했다.

## 실제 브라우저 DOM 검증

내장 Chromium, 390×844 뷰포트, 포트 3004의 프로덕션 빌드에서 클릭·입력·새로고침·DOM 읽기로 확인했다. SSR 테스트와 별도로 수행했으며 새 E2E 의존성은 추가하지 않았다.

| 요청 시나리오 | 실제 결과 |
| --- | --- |
| 1. 3세트 종목의 1·2세트 완료 | 행 1세트와 하단 2세트를 각각 완료해 남은 휴식, 휴식 종료/+30초 및 진행 수 증가 확인 |
| 2. 3세트 완료 | 하단으로 완료한 뒤 벤치프레스 화면과 실제 완료 3세트가 유지되고 경과시간 및 `다음 종목으로`가 즉시 나타남. 휴식/연장 버튼 없음 |
| 3. 다음 종목 버튼 | 이동 전 새로고침 및 이어하기 후에도 벤치프레스 유지. 이동 전후 경과시간 `00:00:16` → `00:00:16`, 인클라인의 세트는 미완료 유지 |
| 4. 다음 종목 첫 세트 | 1세트 완료 후 경과시간이 휴식으로 전환. 이전 완료 종목을 확인하고 다시 돌아와도 휴식 `00:01:59` → `00:01:59`로 유지 |
| 5. 전체 마지막 세트 | 9/9 완료 시 휴식·경과시간·다음 버튼 없이 `모든 종목 완료`와 `운동 종료 및 요약` 표시. 홈의 active 9세트 이어하기 유지, 기록 탭은 직접 종료 전 비어 있음. 직접 종료 후에만 9/9 이력 생성 |
| 6. 완료 취소·재완료·복원 | 두 번째 종목 마지막 세트 취소 후 6/9 → 5/9, 전환 타이머/다음 버튼 해제. 재완료 후 새 경과시간/다음 버튼 표시. 이동 전·후 및 전체 완료 상태의 새로고침/이어하기 복원 확인 |
| 7. 행/하단 완료 일치 | 첫 종목 마지막 세트는 하단, 두 번째 종목 마지막 세트는 행으로 완료해 동일한 경과시간/다음 버튼 상태 확인. 최종 빌드에서도 두 경로를 섞어 9세트 재검증 |

최초 26개 UI 확인 지점과 자체 리뷰 보완 후 최종 빌드 9개 확인 지점이 통과했다. 브라우저 콘솔 경고/오류는 없었다. 완료 취소의 confirm 처리 중 클릭 도구가 시간 초과를 반환했지만, 새 DOM에서 이미 5/9로 취소된 상태와 타이머 해제를 확인하고 중복 클릭 없이 이어갔다.

구 v1 `rest` 상태의 호환 처리는 도메인/저장 및 React 서버 렌더링 회귀 테스트로 검증했다. 이 구 저장 상태를 브라우저에 주입하는 추가 테스트는 수행하지 않았다. 실제 iPhone/Safari·가상 키보드·Safe Area 검증은 이번 범위에서 수행하지 않았다.

브라우저 증거:

- [DOM 확인 지점 및 측정 시간 JSON](C:/Users/Home/.codex/visualizations/2026/10/26/01a1774e-241f-76f1-b589-368a705c2d34/task-003-followup-browser-checks.json)
- [종목 완료 후 다음 버튼 화면](C:/Users/Home/.codex/visualizations/2026/10/26/01a1774e-241f-76f1-b589-368a705c2d34/task-003-followup-next.png)
- [전체 완료 후 종료 버튼 화면](C:/Users/Home/.codex/visualizations/2026/10/26/01a1774e-241f-76f1-b589-368a705c2d34/task-003-followup-all-complete.png)

## Validation

| 명령 | 최종 결과 |
| --- | --- |
| `npm test` | **58/58 통과**: Health 11 + 도메인/저장 35 + React 서버 렌더링 12. 기존 55개에서 회귀 테스트 3개 추가, 기존 기대값은 새 UX로 갱신 |
| `npm run lint` | 통과 |
| `node node_modules/typescript/bin/tsc -b` | 통과 |
| `npm run build` | 통과. JS gzip 82.55 kB, CSS gzip 3.80 kB |
| `git diff --check` | 두 저장소 통과 |

최종 자동 검사 실패는 없다. 자체 리뷰에서 구 휴식을 해석한 후 이전 세트를 취소할 때 원래 rest가 복귀하는 경로를 발견해 상태 편집 전에 먼저 타이머를 해석하도록 보완하고 회귀 테스트를 확장했다. 이후 전체 테스트·린트·타입·빌드 및 최신 빌드의 9세트 DOM 흐름을 재검증했다.

저장 키와 버전은 `overload.core.v1`, version 1로 유지한다. 데이터 구조 추가/삭제나 마이그레이션은 없다. 구 저장 로드/표시는 원문과 실제 완료 스냅샷을 변경하지 않으며 다음 정상 입력 저장 때 현재 타이머 상태만 일관되게 저장한다.

## Git Diff 및 작업 범위

시작 시 프론트엔드에는 이전 Task 003의 13개 추적 파일 변경과 미추적 보고서 1개가 있었다. 기존 변경 및 사용자의 `vite.config.ts` host 변경은 보존했다. 백엔드는 시작·완료 모두 `git status --short`와 `git diff --stat` 출력이 없다.

이번 후속의 시작 스냅샷 대비 변경량(새 보고서 제외):

```text
추가  제거  파일
16     8    src/features/workout/model.ts
 5     4    src/features/workout/WorkoutScreen.tsx
60     4    tests/workout.test.mjs
30     7    tests/components.test.mjs
 5     4    docs/product/requirements.md
13    12    docs/product/ui-ux.md
 2     0    docs/tasks/task-003-core-ux-report.md
합계: 7개 파일, 131줄 추가 / 39줄 제거 + 후속 보고서 1개 신규
```

[이번 후속 수정만의 Diff](C:/Users/Home/.codex/visualizations/2026/10/26/01a1774e-241f-76f1-b589-368a705c2d34/task-003-followup.patch)는 기존 미커밋 작업과 구분하기 위해 시작 파일 스냅샷과 `git diff --no-index`로 생성했다. 새 후속 보고서는 이 패치에서 제외했다.

프론트엔드 최종 `git status --short`(이전 작업 포함):

```text
 M docs/product/requirements.md
 M docs/product/ui-ux.md
 M src/App.css
 M src/App.tsx
 M src/features/history/SessionDetail.tsx
 M src/features/routine/RoutineEditor.tsx
 M src/features/workout/WorkoutScreen.tsx
 M src/features/workout/model.ts
 M src/features/workout/storage.ts
 M src/features/workout/types.ts
 M tests/components.test.mjs
 M tests/workout.test.mjs
 M vite.config.ts
?? docs/tasks/task-003-core-ux-report.md
?? docs/tasks/task-003-last-set-followup-report.md
```

## Notes / 정리

- 개발 서버 세션 `86227`, 빌드 미리보기 세션 `97669`를 Ctrl+C로 종료하고 완료 응답을 확인했다. 이후 3000·3004 모두 `ECONNREFUSED`를 확인했다. 자동 검사는 watch 없이 종료됐고 브라우저 검증 탭과 뷰포트 재정의를 정리했다.
- 하네스·engineering·패키지·lockfile·백엔드·DB·API 계약은 변경하지 않았다. 별도의 백엔드 테스트/빌드는 범위 밖이므로 실행하지 않았다.
- 추가 사전 승인이 필요한 제품 변경이나 보류 작업은 없다. 로컬 검증 서버의 실행 환경 권한은 승인됐다. 사용자 브라우저 데이터 초기화는 수행하지 않았다.
- **Git Commit / Push / 배포 모두 미수행**이다. 다른 저장소와의 연동 변경은 필요하지 않다.
