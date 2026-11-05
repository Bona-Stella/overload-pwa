# T02-A 홈 최종 시각 보완 · 달리기 검토 기록

2026-11-06. [직전 홈 세부 개선](ui-v09-t02a-home-details-report.md)에 이은 사용자 최종 검토용 수정이다. 전체 홈 구조·카드·색상·API 판정은 유지했다. commit/push·스테이징은 하지 않았다.

이후 [최종 디테일 수정](ui-v09-t02a-home-polish-report.md)에서 Lucide 표현을 사용자 제공 공식 원형 웨이트 SVG로 교체하고 아이콘–수치 gap5px와 제목 아래 구분선을 적용했다. 아래 채움 Lucide/간격 설명과 캡처는 그 이전 단계의 검증 이력이다.

## 1. OVERLOAD

18px는 유지하고 굵기600→700, 자간0.015em→0.06em(1.08px)으로 변경했다. 실제 브랜드 폭은 약103.7px다. ON/OFF 모두 같은 스타일이며 공식 달24px·Dusty Blue·주수·5px 게이지와 flex 배치는 유지한다. HTML의 브랜드 스타일과 Decision Log 10.12절 설명도 동기화했다.

공식 달 SVG·투명 PNG 원본은 변경하지 않았다. SHA256은 직전 보고서와 동일하다. Visual Theme Spec·운동 아이콘 원본6종·패키지/lock은 변경하지 않았다.

## 2. 태그

실제 루틴 DTO에는 태그가 없으므로 실제 일정 셀은 기존 이름 말줄임, 선택 날짜 상세는 전체 이름을 유지한다. 태그 저장/추정/가짜 할당은 없다.

이미 준비된 `RoutineTag`/HTML `v12RoutineTags`는 PUSH/PULL/LEGS/FRONT/BACK/FULL/UPPER/LOWER/CARDIO/MIXED와 일치해 목록 변경이 필요 없었다. HTML 검증에서만 명시적 `homeTags` 입력으로 PUSH/PULL/LEGS를 표시하고, 미지정 입력은 원래 이름으로 남는 것을 확인했다. 실제 계정/DB에는 쓰지 않았다. 생성·선택·해제·저장 계약은 T02-B 대상이다.

## 3. 아령 전후

기존 Lucide 경로의 판 부분을 채우고 가는 끝 핀을 생략했다. 외곽 stroke는2→1.5로 조정해 작은 크기에서 내부 선이 겹치는 느낌을 줄였다. 기존18×18px·정렬·숫자 간격은 유지했고 달리기 아이콘도18px 그대로다. 새로운 아이콘 패키지/이미지 생성은 없다. ISC 고지는 유지했다. HTML 홈의 아령도 같은 경로/표현을 사용한다.

동일한 실제 데이터 행에서 기존 outline을 잠시 DOM에 적용해 전/후를 캡처했다. 비교 캡처를 위해 API·저장소 상태를 바꾸지 않았다.

| 이전 outline | 현재 채움 |
|---|---|
| [393px 전](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/icon-before-393.png) | [393px 후](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/icon-after-393.png) |

## 4. 실제 API로 추가한 검토 기록

**아래는 사용자 요청으로 만든 합성 검토 데이터다. 실제 사용자의 운동 수행 사실을 뜻하지 않는다.** 실제 격리 PostgreSQL에 정상 Workout API로 저장했으며 홈은 해당 응답을 읽는다. 기존 seed 전체를 재실행하지 않았다.

- 유지할 새 sessionId: `41f8c4b6-cbfb-43d5-9e50-bbc78d70a7c1`
- 기존 루틴: `전신 근력과 유산소 · 긴 루틴명 확인용`, 버전0. 루틴Id `7cd1ac7c-9ad3-4fb6-b50c-8420474b7db6`
- 운동 날짜: 2026-11-06(Asia/Seoul). API START→FINISH, status FINISHED·deletedAt=null
- 시각은 검토용30분 세션으로 구성해 세트/유산소 시작·종료·timer의 기존 시각 검증을 충족했다. 서버 시각·제품 판정 코드·권한을 바꾸지 않았다.

| 최초 계획 | 저장한 수행 | 종목 달성 |
|---|---|---|
| 벤치 프레스55kg·2세트·8~12회 | 55kg·8회 ×2세트 | 1/1 |
| 바벨 스쿼트60kg·3세트·8~10회 | 60kg·8회 ×3세트 | 1/1 |
| 러닝머신20분·SPEED8km/h | timerMs/activeMs=1,200,000, corrected=false, 실제 속도8km/h, 거리2.666667km·CALCULATED | 1/1 |
| 합계 | 최초 계획 웨이트2종목·유산소1종목 모두 충족 | **웨이트2/2 · 유산소1/1 · ✓** |

실제 속도를 명시했으므로 SPEED 목표에 필요한 근거가 있다. 경사/저항 목표는 원래 계획에서 null이다. `?`를 체크로 치환하거나 완료 기준을 완화하지 않았다. 최초 계획/현재 유효 수행으로 기존 종목 판정을 사용한다. 승인 요청을 생성하지 않아 원본 루틴의 승인 중량도 변경하지 않았다.

생성 요청과 고정 FINISH 본문은 무시되는 `logs/.../home-final-20261106/running-record.json`에 남겼다. 재검증은 같은 sessionId를 읽어 중복 추가를 피한다. 새 영구 검토 기록의 생성은 `--final --add-running`으로 명시적으로 실행한 경우에만 허용한다.

## 5. 모바일 캡처와 세 경우

| 폭 | 유지할 최종 홈/최근 운동 | 세 경우 동시 검증 |
|---|---|---|
| 393px | [전체 홈](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/home-running-393.png) · [최근 운동](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/recent-running-393.png) | [부분·혼합 완료·웨이트 전용](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/recent-three-cases-393.png) |
| 320px | [전체 홈](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/home-running-320.png) · [최근 운동](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/recent-running-320.png) | [부분·혼합 완료·웨이트 전용](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/recent-three-cases-320.png) |

- [ON 헤더](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/header-on-393.png) / [OFF 헤더](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/header-off-393.png)
- [HTML 태그 전용 샘플](../../logs/home-review/b4972e78-a439-42c0-8a28-2f345d767eac/home-final-20261106/html-tags-fixture-393.png)

393/320px 모두 문서·최근 카드의 가로 overflow가 없고 한 줄/말줄임/아이콘18px·숫자·46px 행 높이를 유지한다. 실제 iPhone은 사용자 검토 단계이며 캡처는 headless Chrome viewport 에뮬레이션이다.

부분 수행용 세션 `457859f7-591f-498d-b5da-354667aade01`에는 실제 API로1세트만 넣었다. 웨이트0/2·유산소0/1·×지만 활동이 있으므로 홈에 남는 것을 확인했다. 동시 캡처 후 이 검증용 세션만 API로 논리 삭제했다. 유지할 혼합 완료 기록과 기존 사용자 검토 기록은 삭제/정정하지 않았다. 최종 홈은 혼합 완료1건과 기존 웨이트 전용2건이다.

## 6. 환경·데이터 보존

검증 전 Docker run label·live Backend/control identity·격리 DB명·비개인 포트를 확인했다. 동일 run `b4972e78-a439-42c0-8a28-2f345d767eac`, DB `overload_v22_isolated`:32800, Backend6818, V1~V22를 유지한다. 운영/개인 DB에 연결하지 않았다. DB 초기화·시드 재생성·Backend 코드/API/스키마 변경은 없다.

기존 종료 세션12건의 전체 상세 응답을 전후 SHA256으로 비교했고 모두 동일했다. 루틴3개 목록/상세와 현재/예약 주간 일정도 동일하다. 기존 무수행 기록도 남아 있다. active 세션이 없음을 확인했고 기존 사용자 브라우저·IndexedDB·세션은 초기화하지 않았다. `home-review.ps1 -Action Stop`은 실행하지 않았다.

반복 검증으로 검토 이메일의 정상 OTP 요청 한도에 걸려 첫 브라우저 실행이 로그인 대기에서 끝났다. 기존 `home-review-login-budget.mjs`를1회 실행해 **동일 격리 검토 이메일의 요청 bucket과 마지막 발급 시각만** 정리한 후 정상 OTP 발급/검증으로 재로그인했다. OTP 검증·실패/IP 제한·세션·운동 데이터는 유지했다. 앱이 이 스크립트를 호출하거나 인증을 우회하지 않는다.

LAN은 `http://192.168.0.3:3000/`, OFF는 `?analysis=off`다. ‘검토 계정으로 로그인’을 유지한다. HTTP LAN의 기존 START 제한은 그대로이며 실제 START는 loopback에서 검증한다. 프론트엔드/Backend/검토 DB는 사용자 확인을 위해 계속 실행 중이고 테스트용 브라우저/fixture 서버는 종료했다.

## 7. 검증·변경 파일·Git

- `npm test`: **533/533 통과**
- `npm run build`: TypeScript/Vite 성공
- `npm run lint`: 성공
- `node tests/fixtures/run-home-review-browser.mjs --final --add-running`: 실제 혼합 기록 생성·유지, 2/2+1/1, 브랜드 ON/OFF, 393/320, 세 경우, 태그 샘플, 기존 데이터 전후 비교4시나리오 통과
- `node tests/fixtures/run-t01-browser.mjs`: 기존 입력/타이머/고정 snapshot/writerEpoch·저장 실패 이동 차단·ACK·계정/세대·production SW 오프라인 등8시나리오 통과
- `node tests/fixtures/run-home-review-browser.mjs --design`: 실제 OTP/CSRF·종목 달성·일정 불변/START·샘플 격리·LAN 로그인/새로고침 유지6시나리오 통과. 추가한 혼합 완료 기록도 유지됨
- `git diff --check`, HTML inline JS 구문 검사, 달 SVG/PNG 원본 hash 확인 통과

이번 변경은 `Home.module.css`, `AchievementIcon.tsx`, 공식 HTML/Decision Log의 해당 표현, `home-final-checks.mjs`, 브라우저 runner의 `--final` 진입점, 이 보고서와 이전 보고서/README/Frontend의 참조 정리다. 기존 태그 DTO/판정/동기화 코드를 변경하지 않았다.

PWA main HEAD `ad8d664a1a5ef60caea96d5787a12bfe01875988` 유지. 기존 미커밋 파일을 보존했고 index는 비어 있다. 서버 main `523eb00`의 기존 미커밋3파일 상태도 유지했다. commit/push/새 브랜치는 없다. 추가 승인 대기 사항은 없으며 최종 모바일 시각 피드백 이후 T02-A 확정이 남아 있다.
