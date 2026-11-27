# FRONT 18 — 5-1 전체 버튼 및 입력 UI 현황 조사

2026-11-26 · `overload-pwa` `main` · 기준 커밋 `87b585a`

## 1. 전체 조사 결과 요약

| 조사 단위 | 결과 |
| --- | ---: |
| 서비스 화면·흐름 범위 | 33 |
| 버튼 사용처 | 353 |
| 입력·선택 사용처 | 97 |
| 위 두 표의 중복 위치 / 전체 고유 위치 | 49 / 401 |
| 공통·기능 재사용 위치 / 개별 위치 | 242 / 159 |
| 입력 방식 미적용 | 확정 웨이트 범위 8개 |
| 디자인 적용 차이 | 승인값 차이 1개와 규격 차이 검토군 4개 |
| 입력 방식 차이 | 웨이트 8개 미적용, 루틴 중량 간격·시간 정정 문서 차이 각 1건 |
| 보호 대상 | 사용자가 지정한 9항목 |
| Chrome 실측 | 66개 상태, 301개 상태·폭 조합 |

**화면 범위.** 홈 · 루틴 메인 · 루틴 상세 · 루틴 생성 · 루틴 편집 · 주간 일정 편집 · 일정 전체 편집 · 근육별 계획 · 준비운동 · 웨이트 진행 · 유산소 진행 · 운동·세트 편집 · 휴식 진행 · 운동 종료/요약 · 기록 메인 · 최근 기록 · 전체 운동 이력 · 기록 상세 · 기록 정정 · 공식 평가·변경 이력 · 운동 현황 · 성장 추적 · 근육별 통계 · 설정 · 휴식 설정 · 휴식 알림 · 계정 · 기기 · 표준 카탈로그 · 표준 운동 상세 · 인증/로그인 · 오프라인 복구 · 설치/업데이트. 메시지 및 기능형 Dialog는 해당 화면의 하위 상태로 집계했다. 루틴·기록 목록과 앱 셸에 보이는 공통 부품은 실제 호출 위치 기준이다. 설정의 동작 미구현 표시 행 5개도 보이는 비활성 조작으로 포함했다.

**집계 정의.** `src/main.tsx`의 운영 진입점에서 정적 import와 조건 분기를 추적했다. 고유 JSX 위치, 공유 컨트롤 내부의 진입 지점, 호출 위치를 기준으로 하며 동일 DOM의 중복 래퍼·Hidden CSRF·미참조 내보내기·검수용 메모 fallback은 제외했다. 선언 시 하나인 매핑형 위치는 버튼/입력 조사표에서는 한 행으로 둔다. 입력의 읽기 전용 시작·끝 화면 요소는 조사표에 표시하고 편집 가능한 숫자 개수에서 제외했다. 해당 소스에서 렌더링한 모든 조건부 상태를 실제 서버에서 실행한 수치와는 다르다.

- 웨이트 숫자 휠 정책의 적용 범위에서 직접 입력으로 남은 편집 필드는 8개다. 루틴 폼의 세트 수·최소 반복·최대 반복 3개, 기록 정정의 실제 중량·실제 반복·맨몸 추가 중량 3개, 진행 중·종료 후 재승인 중량 2개다.
- 유산소 활동 시간 정정은 현재 두 흐름에 시·분·초 휠을 제공한다. Decision Log 10.19.1의 유산소 제외 문구와 차이가 있어 기존 기능과 문서 적용 범위를 5-2에서 확인할 대상이다. 계획과 실제 거리·속도 등 별도 수치의 권장 입력은 아래 전용 조사표에 기록했다.
- 제품 소스와 계측을 대조해 승인된 조작 규격의 적용 여부를 확인했다. 브라우저 표본에는 확인한 상태만 포함한다. 화면별 전체 인스턴스 수는 루틴·장비·세트·기간과 권한에 따라 달라진다. [현행 UI/UX](../product/ui-ux.md#front18-card-ux) · [Decision Log 10.19](../product/Overload_UI_Decision_Log_v0.9.md#1019--공통-숫자-입력-세로-휠-피커) · [승인 규격](../product/Overload_UI_Visual_Theme_Spec_v0.9.md#front18-card-visual-actions)

## 2. 전체 버튼 사용처 조사표

공통 부품의 호출부는 사용처에 포함하고 동일 DOM을 만드는 내부 선언은 참고 자료로 연결했다. 동일한 JSX 표현식에서 생성되는 날짜·세트·목록 행·요일·단위 옵션은 반복 수와 무관하게 한 항목이다. 같은 줄에 별도 조작이 있으면 별도 항목이다. 선택형 버튼·탭·스위치는 버튼과 입력 조사표 두 곳에 표시한다. 캡슐형의 999px는 CSS 값이며 실제 곡률은 박스 높이의 영향을 받는다.

| 번호 | 화면 | 버튼명·역할 | 외곽 높이 | 외곽 너비 | 패딩 상/우[/하/좌] | 반경 | 조작 영역 | 구현·소스 | 근거·예외 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B001 | 앱 셸·하단 탐색 | 하단 메뉴 펼치기 · 기능 조작 | 탭 셸 | 균등/접힘 | 탭 CSS | 999 | 탭 외곽 | 개별 · [AppShell.tsx:143](../../src/app/AppShell.tsx#L143) | 소스 · 네비게이션 활성/접힘 |
| B002 | 공통 Dialog | 닫기 · 취소·닫기 | 48 | 44 | 0/0 | 10 | 44×48 | 공통/기능 재사용 · [Dialog.tsx:48](../../src/components/Dialog.tsx#L48) | 세트 정정 393px · 아이콘·닫기 |
| B003 | 공통 숫자 휠 | 취소 · 취소·닫기 | 48 | 151.5 | 11/16 | 5 | 151.5×48 | 공통/기능 재사용 · [NumberWheel.tsx:116](../../src/components/NumberWheel.tsx#L116) | 휠 직접 입력 393px · disabled·pending·loading 분기 |
| B004 | 공통 숫자 휠 | 확인 · Primary | 48 | 151.5 | 11/16 | 5 | 151.5×48 | 공통/기능 재사용 · [NumberWheel.tsx:117](../../src/components/NumberWheel.tsx#L117) | 휠 직접 입력 393px · disabled·pending·loading 분기 |
| B005 | 공통 숫자 휠 | {choice} {unit} · 선택 | 52 | 휠 가용폭 | 0/4 | 0 | 52 × 가용폭 | 공통/기능 재사용 · [NumberWheel.tsx:137](../../src/components/NumberWheel.tsx#L137) | 소스 · 옵션, 보이는 스크롤 영역에서 조작 |
| B006 | 공통 숫자 휠 | 직접 입력 · Secondary | 48 | 151.5 | 11/16 | 5 | 151.5×48 | 공통/기능 재사용 · [NumberWheel.tsx:145](../../src/components/NumberWheel.tsx#L145) | 반복 휠 393px · disabled·pending·loading 분기 |
| B007 | 공통 숫자 휠 | 확인 · Primary | 48 | 151.5 | 11/16 | 5 | 151.5×48 | 공통/기능 재사용 · [NumberWheel.tsx:146](../../src/components/NumberWheel.tsx#L146) | 반복 휠 393px · disabled·pending·loading 분기 |
| B008 | 공통 검색·선택 목록 | {o.icon} {o.name} {o.description} · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 공통/기능 재사용 · [SearchList.tsx:16](../../src/components/SearchList.tsx#L16) | 소스 · 전역 CSS 및 기능별 override |
| B009 | 공통 검색·선택 목록 | o.name+' 상세 보기' · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 공통/기능 재사용 · [SearchList.tsx:17](../../src/components/SearchList.tsx#L17) | 소스 · 전역 CSS 및 기능별 override |
| B010 | 공통 검색·선택 목록 | actionLabel · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 공통/기능 재사용 · [SearchList.tsx:52](../../src/components/SearchList.tsx#L52) | 소스 · 전역 CSS 및 기능별 override |
| B011 | 공통 검색·선택 목록 | {tag.name} · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 공통/기능 재사용 · [SearchList.tsx:56](../../src/components/SearchList.tsx#L56) | 소스 · 전역 CSS 및 기능별 override |
| B012 | 홈 연결형 선택기 | {label} · 기능 조작 | 56 | 353 | 14/12 | 4 | 353×56 | 공통/기능 재사용 · [ConnectedDropdown.tsx:75](../../src/components/common-ui/ConnectedDropdown.tsx#L75) | 홈 393px · 전역 CSS 및 기능별 override |
| B013 | 공통 Toast | 알림 닫기 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 공통/기능 재사용 · [Toast.tsx:77](../../src/components/common-ui/Toast.tsx#L77) | 소스 · 전역 CSS 및 기능별 override |
| B014 | 공통 UI | label · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 공통/기능 재사용 · [ui.tsx:55](../../src/components/ui.tsx#L55) | 소스 · 전역 CSS 및 기능별 override |
| B015 | 공통 확인 호출 | 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [useConfirmation.tsx:52](../../src/components/useConfirmation.tsx#L52) | 소스 · disabled·pending·loading 분기 |
| B016 | 공통 확인 호출 | {visible.confirmLabel} · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [useConfirmation.tsx:53](../../src/components/useConfirmation.tsx#L53) | 소스 · disabled·pending·loading 분기 |
| B017 | 계정 관리·재인증 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [AccountSettings.tsx:53](../../src/features/auth/AccountSettings.tsx#L53) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B018 | 계정 관리·재인증 | 상단 뒤로가기 · 설정으로 · 뒤로가기 | 44 | 44 | 0/0 | 10 | 44×44 | 공통/기능 재사용 · [AccountSettings.tsx:56](../../src/features/auth/AccountSettings.tsx#L56) | 계정 관리 393px · 공통 헤더 뒤로가기 |
| B019 | 계정 관리·재인증 | 인증코드를 보내는 중… / 이메일로 재인증 · Secondary | 44 | 327 | 6/8 | 999 | 327×44 | 공통/기능 재사용 · [AccountSettings.tsx:67](../../src/features/auth/AccountSettings.tsx#L67) | 계정 관리 393px · disabled·pending·loading 분기 |
| B020 | 계정 관리·재인증 | 인증코드를 보내는 중… / 후보 이메일로 등록 코드 요청 · Primary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [AccountSettings.tsx:72](../../src/features/auth/AccountSettings.tsx#L72) | 소스 · 전역 CSS 및 기능별 override |
| B021 | 계정 관리·재인증 | Google에서 이메일 확인 계속 · Primary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [AccountSettings.tsx:80](../../src/features/auth/AccountSettings.tsx#L80) | 소스 · 전역 CSS 및 기능별 override |
| B022 | 계정 관리·재인증 | Google로 등록 이메일 확인 · Primary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [AccountSettings.tsx:81](../../src/features/auth/AccountSettings.tsx#L81) | 소스 · 전역 CSS 및 기능별 override |
| B023 | 계정 관리·재인증 | 대표 이메일 등록 취소 · 취소·닫기 | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [AccountSettings.tsx:84](../../src/features/auth/AccountSettings.tsx#L84) | 소스 · 전역 CSS 및 기능별 override |
| B024 | 계정 관리·재인증 | 코드를 확인하는 중… / 코드 확인 · Primary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [AccountSettings.tsx:92](../../src/features/auth/AccountSettings.tsx#L92) | 소스 · 전역 CSS 및 기능별 override |
| B025 | 계정 관리·재인증 | 코드 입력 닫기 · 취소·닫기 | 48 | 327 | 10/10 | 10 | 327×48 | 개별 · [AccountSettings.tsx:93](../../src/features/auth/AccountSettings.tsx#L93) | 재인증 코드 입력 393px · 전역 CSS 및 기능별 override |
| B026 | 계정 관리·재인증 | 로그인된 기기 관리 · 보조·아이콘 | 64 | 327 | 0/0 | 10 | 327×64 | 개별 · [AccountSettings.tsx:105](../../src/features/auth/AccountSettings.tsx#L105) | 계정 관리 393px · 전역 CSS 및 기능별 override |
| B027 | 인증·연결 복구·로그아웃 | 확인 중… / 로그인 상태 다시 확인 · Primary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [AuthApp.tsx:149](../../src/features/auth/AuthApp.tsx#L149) | 소스 · 전역 CSS 및 기능별 override |
| B028 | 인증·연결 복구·로그아웃 | 로그아웃 · 위험·경고 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [AuthApp.tsx:168](../../src/features/auth/AuthApp.tsx#L168) | 소스 · 전역 CSS 및 기능별 override |
| B029 | 인증·연결 복구·로그아웃 | 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [AuthApp.tsx:169](../../src/features/auth/AuthApp.tsx#L169) | 소스 · 전역 CSS 및 기능별 override |
| B030 | 인증·연결 복구·로그아웃 | 닫기 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [AuthApp.tsx:170](../../src/features/auth/AuthApp.tsx#L170) | 소스 · 전역 CSS 및 기능별 override |
| B031 | 계정 관리·로그인 수단 | 연결 해제 / Google 계정 연결 해제 · Secondary | 44 | 327 | 6/8 | 999 | 327×44 | 공통/기능 재사용 · [IdentityManagement.tsx:18](../../src/features/auth/IdentityManagement.tsx#L18) | 계정 관리 393px · disabled·pending·loading 분기 |
| B032 | 계정 관리·로그인 수단 | 대표 이메일 로그인 연결 확인 · Secondary | 44 | 327 | 6/8 | 999 | 327×44 | 공통/기능 재사용 · [IdentityManagement.tsx:21](../../src/features/auth/IdentityManagement.tsx#L21) | 계정 관리 393px · disabled·pending·loading 분기 |
| B033 | 계정 관리·로그인 수단 | Google에서 연결 계속 · Primary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [IdentityManagement.tsx:32](../../src/features/auth/IdentityManagement.tsx#L32) | 소스 · 전역 CSS 및 기능별 override |
| B034 | 계정 관리·로그인 수단 | Google 연결 준비 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [IdentityManagement.tsx:33](../../src/features/auth/IdentityManagement.tsx#L33) | 소스 · 전역 CSS 및 기능별 override |
| B035 | 계정 관리·로그인 수단 | Google 로그인 추가 연결 / Google 계정 연결 · Secondary | 44 | 327 | 6/8 | 999 | 327×44 | 공통/기능 재사용 · [IdentityManagement.tsx:34](../../src/features/auth/IdentityManagement.tsx#L34) | 계정 관리 393px · disabled·pending·loading 분기 |
| B036 | 계정 관리·로그인 수단 | 아래 대표 이메일 재인증으로 이동 · 링크 | 호출부 | 행/텍스트 | 호출부 | 호출부 | 행 또는 링크 | 개별 · [IdentityManagement.tsx:42](../../src/features/auth/IdentityManagement.tsx#L42) | 소스 · 네이티브 펼침/링크 |
| B037 | 계정 관리·로그인 수단 | 연결 해제 · 위험·경고 | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [IdentityManagement.tsx:48](../../src/features/auth/IdentityManagement.tsx#L48) | 소스 · 전역 CSS 및 기능별 override |
| B038 | 계정 관리·로그인 수단 | 취소 · 취소·닫기 | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [IdentityManagement.tsx:49](../../src/features/auth/IdentityManagement.tsx#L49) | 소스 · 전역 CSS 및 기능별 override |
| B039 | 로그인 기기 관리 | deviceName(device) + ' · 이 기기 로그아웃' · Secondary | 44 | 327 | 6/10 | 999 | 327×44 | 공통/기능 재사용 · [LoggedInDevices.tsx:93](../../src/features/auth/LoggedInDevices.tsx#L93) | 기기 관리 393px · disabled·pending·loading 분기 |
| B040 | 로그인 기기 관리 | 상단 뒤로가기 · 계정 설정으로 · 뒤로가기 | 44 | 44 | 0/0 | 10 | 44×44 | 공통/기능 재사용 · [LoggedInDevices.tsx:114](../../src/features/auth/LoggedInDevices.tsx#L114) | 기기 관리 393px · 공통 헤더 뒤로가기 |
| B041 | 로그인 기기 관리 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [LoggedInDevices.tsx:126](../../src/features/auth/LoggedInDevices.tsx#L126) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B042 | 로그인 기기 관리 | 다른 기기 모두 로그아웃 · Secondary | 44 | 353 | 6/10 | 999 | 353×44 | 공통/기능 재사용 · [LoggedInDevices.tsx:136](../../src/features/auth/LoggedInDevices.tsx#L136) | 기기 관리 393px · disabled·pending·loading 분기 |
| B043 | 로그인 기기 관리 | 모든 기기에서 로그아웃 · Secondary | 44 | 353 | 6/10 | 999 | 353×44 | 공통/기능 재사용 · [LoggedInDevices.tsx:139](../../src/features/auth/LoggedInDevices.tsx#L139) | 기기 관리 393px · disabled·pending·loading 분기 |
| B044 | 로그인 기기 관리 | 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LoggedInDevices.tsx:153](../../src/features/auth/LoggedInDevices.tsx#L153) | 소스 · disabled·pending·loading 분기 |
| B045 | 로그인 기기 관리 | 시안 확인 · 위험·경고 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LoggedInDevices.tsx:154](../../src/features/auth/LoggedInDevices.tsx#L154) | 소스 · disabled·pending·loading 분기 |
| B046 | 인증·로그인 | ‹ 이메일 주소 변경 · 보조·아이콘 | 48 | 143.8 | 10/10 | 10 | 143.8×48 | 개별 · [LoginScreens.tsx:16](../../src/features/auth/LoginScreens.tsx#L16) | 로그인 OTP 393px · 전역 CSS 및 기능별 override |
| B047 | 인증·로그인 | 로그인 확인 중… / 코드 확인 · Primary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [LoginScreens.tsx:23](../../src/features/auth/LoginScreens.tsx#L23) | 소스 · 전역 CSS 및 기능별 override |
| B048 | 인증·로그인 | 인증코드 재발송 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [LoginScreens.tsx:24](../../src/features/auth/LoginScreens.tsx#L24) | 소스 · 전역 CSS 및 기능별 override |
| B049 | 인증·로그인 | Google로 이동 중… / Google로 계속하기 · 기능 조작 | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [LoginScreens.tsx:31](../../src/features/auth/LoginScreens.tsx#L31) | 소스 · 전역 CSS 및 기능별 override |
| B050 | 인증·로그인 | 이메일로 계속하기 · Primary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [LoginScreens.tsx:35](../../src/features/auth/LoginScreens.tsx#L35) | 소스 · 전역 CSS 및 기능별 override |
| B051 | 인증·로그인 | 이용약관 · 보조·아이콘 | 48 | 172 | 10/10 | 10 | 172×48 | 개별 · [LoginScreens.tsx:38](../../src/features/auth/LoginScreens.tsx#L38) | 로그인 이메일 393px · 전역 CSS 및 기능별 override |
| B052 | 인증·로그인 | 개인정보 처리방침 · 보조·아이콘 | 48 | 172 | 10/10 | 10 | 172×48 | 개별 · [LoginScreens.tsx:38](../../src/features/auth/LoginScreens.tsx#L38) | 로그인 이메일 393px · 전역 CSS 및 기능별 override |
| B053 | 최근 기록·전체 운동 이력 | {session ? date : row.workoutDate.slice(5).replace('-', '.')} {status&&&lt;b aria-hidden="true"&gt;{status.mark}&lt;/b&gt;} {label} {row.routineName} {sessio · 기능 조작 | 102.8 | 353 | 12/12 | 5 | 353×102.8 | 개별 · [RecordFeed.tsx:45](../../src/features/history/RecordFeed.tsx#L45) | 기록 메인 393px · 전역 CSS 및 기능별 override |
| B054 | 최근 기록·전체 운동 이력 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [RecordFeed.tsx:126](../../src/features/history/RecordFeed.tsx#L126) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B055 | 최근 기록·전체 운동 이력 | 전체 보기 › · 보조·아이콘 | 48 | 95.2 | 10/10 | 999 | 95.2×48 | 공통/기능 재사용 · [RecordFeed.tsx:128](../../src/features/history/RecordFeed.tsx#L128) | 최근 기록 393px · disabled·pending·loading 분기 |
| B056 | 최근 기록·전체 운동 이력 | SearchList · 기능 조작 | 하위 컨트롤 참조 | 부모 의존 | 전용 | 전용 | 외곽 | 공통/기능 재사용 · [RecordFeed.tsx:130](../../src/features/history/RecordFeed.tsx#L130) | 소스 · 공통 선택 컨트롤 |
| B057 | 최근 기록·전체 운동 이력 | 이전 기록 더 불러오기 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [RecordFeed.tsx:149](../../src/features/history/RecordFeed.tsx#L149) | 소스 · disabled·pending·loading 분기 |
| B058 | 홈·오늘의 루틴 | 운동 이어가기 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [HomePanel.tsx:89](../../src/features/home/HomePanel.tsx#L89) | 소스 · disabled·pending·loading 분기 |
| B059 | 홈·오늘의 루틴 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [HomePanel.tsx:298](../../src/features/home/HomePanel.tsx#L298) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B060 | 홈·오늘의 루틴 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [HomePanel.tsx:313](../../src/features/home/HomePanel.tsx#L313) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B061 | 홈·오늘의 루틴 | 확인 중 / 운동 시작 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [HomePanel.tsx:315](../../src/features/home/HomePanel.tsx#L315) | 소스 · disabled·pending·loading 분기 |
| B062 | 홈·오늘의 루틴 | 오늘만 다른 루틴 선택 · 기능 조작 | 하위 컨트롤 참조 | 부모 의존 | 전용 | 전용 | 외곽 | 공통/기능 재사용 · [HomePanel.tsx:320](../../src/features/home/HomePanel.tsx#L320) | 소스 · 공통 선택 컨트롤 |
| B063 | 홈·오늘의 루틴 | 전체 · 선택 | 44 | 50 | 1.5/0/0/0 | 999 | 50×44 | 개별 · [HomePanel.tsx:322](../../src/features/home/HomePanel.tsx#L322) | 홈 루틴 드롭다운 393px · 전역 CSS 및 기능별 override |
| B064 | 홈·오늘의 루틴 | 미배정 · 선택 | 44 | 50 | 1.5/0/0/0 | 999 | 50×44 | 개별 · [HomePanel.tsx:323](../../src/features/home/HomePanel.tsx#L323) | 홈 루틴 드롭다운 393px · 전역 CSS 및 기능별 override |
| B065 | 홈·오늘의 루틴 | presetNumber(index) + '번 일정 · ' + preset.name · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [HomePanel.tsx:324](../../src/features/home/HomePanel.tsx#L324) | 소스 · 전역 CSS 및 기능별 override |
| B066 | 홈·오늘의 루틴 | 휴식 · 선택 | 44 | 50 | 1.5/0/0/0 | 999 | 50×44 | 개별 · [HomePanel.tsx:325](../../src/features/home/HomePanel.tsx#L325) | 홈 루틴 드롭다운 393px · 전역 CSS 및 기능별 override |
| B067 | 홈·오늘의 루틴 | 휴식 오늘은 운동하지 않고 쉬어갑니다. · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [HomePanel.tsx:328](../../src/features/home/HomePanel.tsx#L328) | 소스 · 전역 CSS 및 기능별 override |
| B068 | 홈·오늘의 루틴 | 루틴 만들러 가기 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [HomePanel.tsx:333](../../src/features/home/HomePanel.tsx#L333) | 소스 · disabled·pending·loading 분기 |
| B069 | 홈·오늘의 루틴 | 구성 조회 실패 · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [HomePanel.tsx:340](../../src/features/home/HomePanel.tsx#L340) | 소스 · 전역 CSS 및 기능별 override |
| B070 | 홈·오늘의 루틴 | 오늘의 원래 일정으로 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [HomePanel.tsx:346](../../src/features/home/HomePanel.tsx#L346) | 소스 · disabled·pending·loading 분기 |
| B071 | 홈·오늘의 루틴 | ${date} ${weekdays[index]} ${planned?.plan?.name ?? ''} ${state.label} · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [HomePanel.tsx:357](../../src/features/home/HomePanel.tsx#L357) | 소스 · 전역 CSS 및 기능별 override |
| B072 | 홈·오늘의 루틴 | 기록 › · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [HomePanel.tsx:369](../../src/features/home/HomePanel.tsx#L369) | 소스 · disabled·pending·loading 분기 |
| B073 | 홈·오늘의 루틴 | 전체 보기 › · 보조·아이콘 | 32 | 68.3 | 6/8 | 999 | 68.3×32 | 공통/기능 재사용 · [HomePanel.tsx:372](../../src/features/home/HomePanel.tsx#L372) | 홈 393px · disabled·pending·loading 분기 |
| B074 | 홈·최근 운동 | title · 기능 조작 | 44 | 353 | 10/12 | 5 | 353×44 | 개별 · [RecentWorkout.tsx:17](../../src/features/home/RecentWorkout.tsx#L17) | 홈 393px · 전역 CSS 및 기능별 override |
| B075 | 휴식 타이머 알림 | 상단 뒤로가기 · 설정으로 · 뒤로가기 | 44 | 44 | 0/0 | 10 | 44×44 | 공통/기능 재사용 · [RestAlertSettings.tsx:176](../../src/features/settings/RestAlertSettings.tsx#L176) | 휴식 타이머 알림 393px · 공통 헤더 뒤로가기 |
| B076 | 휴식 타이머 알림 | 화면 어둡게 · 토글 | 44 | 56 | 2/2 | 10 | 56×44 | 공통/기능 재사용 · [RestAlertSettings.tsx:178](../../src/features/settings/RestAlertSettings.tsx#L178) | 휴식 타이머 알림 393px · 이산 수치·토글, 상태별 색 |
| B077 | 휴식 타이머 알림 | 화면 깜빡임 · 토글 | 44 | 56 | 2/2 | 10 | 56×44 | 공통/기능 재사용 · [RestAlertSettings.tsx:181](../../src/features/settings/RestAlertSettings.tsx#L181) | 휴식 타이머 알림 393px · 이산 수치·토글, 상태별 색 |
| B078 | 휴식 타이머 알림 | LocationChoice · 토글 | 설정 CSS | 그리드/자동 | 설정 CSS | 설정 CSS | 외곽 | 공통/기능 재사용 · [RestAlertSettings.tsx:187](../../src/features/settings/RestAlertSettings.tsx#L187) | 소스 · 이산 수치·토글, 상태별 색 |
| B079 | 휴식 타이머 알림 | LocationChoice · 토글 | 설정 CSS | 그리드/자동 | 설정 CSS | 설정 CSS | 외곽 | 공통/기능 재사용 · [RestAlertSettings.tsx:188](../../src/features/settings/RestAlertSettings.tsx#L188) | 소스 · 이산 수치·토글, 상태별 색 |
| B080 | 휴식 타이머 알림 | 깜빡임 시작 시점 · 선택 | 설정 CSS | 그리드/자동 | 설정 CSS | 설정 CSS | 외곽 | 공통/기능 재사용 · [RestAlertSettings.tsx:191](../../src/features/settings/RestAlertSettings.tsx#L191) | 소스 · 이산 수치·토글, 상태별 색 |
| B081 | 휴식 타이머 알림 | 효과음 · 토글 | 44 | 56 | 2/2 | 10 | 56×44 | 공통/기능 재사용 · [RestAlertSettings.tsx:194](../../src/features/settings/RestAlertSettings.tsx#L194) | 휴식 타이머 알림 393px · 이산 수치·토글, 상태별 색 |
| B082 | 휴식 타이머 알림 | 중간 알림음 · 토글 | 44 | 56 | 2/2 | 10 | 56×44 | 공통/기능 재사용 · [RestAlertSettings.tsx:205](../../src/features/settings/RestAlertSettings.tsx#L205) | 휴식 타이머 알림 393px · 이산 수치·토글, 상태별 색 |
| B083 | 휴식 타이머 알림 | 휴식 종료 몇 초 전에 알릴까요? · 선택 | 설정 CSS | 그리드/자동 | 설정 CSS | 설정 CSS | 외곽 | 공통/기능 재사용 · [RestAlertSettings.tsx:207](../../src/features/settings/RestAlertSettings.tsx#L207) | 소스 · 이산 수치·토글, 상태별 색 |
| B084 | 휴식 타이머 알림 | 휴식 테스트 · 토글 | 44 | 56 | 2/2 | 10 | 56×44 | 공통/기능 재사용 · [RestAlertSettings.tsx:210](../../src/features/settings/RestAlertSettings.tsx#L210) | 휴식 타이머 알림 393px · 이산 수치·토글, 상태별 색 |
| B085 | 휴식 타이머 알림 | 알림 미리보기 · Secondary | 46.4 | 353 | 11/16 | 999 | 353×46.4 | 공통/기능 재사용 · [RestAlertSettings.tsx:215](../../src/features/settings/RestAlertSettings.tsx#L215) | 휴식 타이머 알림 393px · disabled·pending·loading 분기 |
| B086 | 휴식 타이머 알림 | 미리보기 종료 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 10 기본 | 외곽 | 공통/기능 재사용 · [RestAlertSettings.tsx:220](../../src/features/settings/RestAlertSettings.tsx#L220) | 소스 · disabled·pending·loading 분기 |
| B087 | 휴식 설정 | 상단 뒤로가기 · 설정으로 · 뒤로가기 | 44 | 44 | 0/0 | 10 | 44×44 | 공통/기능 재사용 · [RestSettings.tsx:117](../../src/features/settings/RestSettings.tsx#L117) | 휴식 설정 보기 393px · 공통 헤더 뒤로가기 |
| B088 | 휴식 설정 | 취소 / 편집 · 소형 보조 | 30 | 49.9 | 0/12 | 999 | 49.9×48 | 공통/기능 재사용 · [RestSettings.tsx:126](../../src/features/settings/RestSettings.tsx#L126) | 휴식 설정 보기 393px · 캡슐 표면과 조작 외곽 분리 |
| B089 | 휴식 설정 | ${label} 구간 삭제 · 보조·아이콘 | 36 | 32 | 0/0 | 10 | 32×36 | 공통/기능 재사용 · [RestSettings.tsx:140](../../src/features/settings/RestSettings.tsx#L140) | 휴식 설정 편집 393px · disabled·pending·loading 분기 |
| B090 | 휴식 설정 | + 구간 추가 · Secondary | 36 | 327 | 4/8 | 999 | 327×36 | 공통/기능 재사용 · [RestSettings.tsx:146](../../src/features/settings/RestSettings.tsx#L146) | 휴식 설정 편집 393px · disabled·pending·loading 분기 |
| B091 | 휴식 설정 | 최신 설정 확인 / 변경 사항 저장 · Secondary | 48 | 353 | 8/16 | 999 | 353×48 | 공통/기능 재사용 · [RestSettings.tsx:160](../../src/features/settings/RestSettings.tsx#L160) | 휴식 설정 편집 393px · disabled·pending·loading 분기 |
| B092 | 휴식 설정 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [RestSettings.tsx:164](../../src/features/settings/RestSettings.tsx#L164) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B093 | 설정 메인 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [SettingsMain.tsx:28](../../src/features/settings/SettingsMain.tsx#L28) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B094 | 설정 메인 | 내 계정 · 기능 조작 | 46 | 327 | 0/0 | 0 | 327×46 | 개별 · [SettingsMain.tsx:36](../../src/features/settings/SettingsMain.tsx#L36) | 설정 393px · 전역 CSS 및 기능별 override |
| B095 | 설정 메인 | 세트 사이 휴식 · 기능 조작 | 64 | 327 | 0/0 | 0 | 327×64 | 공통/기능 재사용 · [SettingsMain.tsx:51](../../src/features/settings/SettingsMain.tsx#L51) | 설정 393px · 설정 탐색 |
| B096 | 설정 메인 | 휴식 타이머 알림 · 기능 조작 | 64 | 327 | 0/0 | 0 | 327×64 | 공통/기능 재사용 · [SettingsMain.tsx:52](../../src/features/settings/SettingsMain.tsx#L52) | 설정 393px · 설정 탐색 |
| B097 | 설정 메인 | 유산소 거리 자동 추정 · 토글 | 64 | 327 | 0/0 | 0 | 327×64 | 개별 · [SettingsMain.tsx:53](../../src/features/settings/SettingsMain.tsx#L53) | 설정 393px · 전역 CSS 및 기능별 override |
| B098 | 설정 메인 | 운동 종목 보기 · 기능 조작 | 64 | 327 | 0/0 | 0 | 327×64 | 공통/기능 재사용 · [SettingsMain.tsx:62](../../src/features/settings/SettingsMain.tsx#L62) | 설정 393px · 설정 탐색 |
| B099 | 설정 메인 | 디로딩 설정 · 기능 조작 | 64 | 327 | 0/0 | 0 | 327×64 | 공통/기능 재사용 · [SettingsMain.tsx:63](../../src/features/settings/SettingsMain.tsx#L63) | 설정 393px · 비활성 미구현 행 |
| B100 | 설정 메인 | 운동 데이터 상태 · 기능 조작 | 64 | 327 | 0/0 | 0 | 327×64 | 공통/기능 재사용 · [SettingsMain.tsx:67](../../src/features/settings/SettingsMain.tsx#L67) | 설정 393px · 비활성 미구현 행 |
| B101 | 설정 메인 | 운동 데이터 내보내기 · 기능 조작 | 64 | 327 | 0/0 | 0 | 327×64 | 공통/기능 재사용 · [SettingsMain.tsx:68](../../src/features/settings/SettingsMain.tsx#L68) | 설정 393px · 비활성 미구현 행 |
| B102 | 설정 메인 | 전체 운동 데이터 초기화 · 기능 조작 | 64 | 327 | 0/0 | 0 | 327×64 | 공통/기능 재사용 · [SettingsMain.tsx:76](../../src/features/settings/SettingsMain.tsx#L76) | 설정 393px · 비활성 미구현 행 |
| B103 | 설정 메인 | 회원 탈퇴 · 기능 조작 | 64 | 327 | 0/0 | 0 | 327×64 | 공통/기능 재사용 · [SettingsMain.tsx:77](../../src/features/settings/SettingsMain.tsx#L77) | 설정 393px · 비활성 미구현 행 |
| B104 | 설정 메인 | 로그아웃 · Secondary | 48 | 353 | 0/12 | 999 | 353×48 | 공통/기능 재사용 · [SettingsMain.tsx:79](../../src/features/settings/SettingsMain.tsx#L79) | 설정 393px · disabled·pending·loading 분기 |
| B105 | 성장 추적 | 전체 / 개월 · 선택 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [GrowthPanel.tsx:31](../../src/features/statistics/GrowthPanel.tsx#L31) | 소스 · disabled·pending·loading 분기 |
| B106 | 성장 추적 | 과거 운동 검색 · 기능 조작 | 42 | 279 | 8/12 | 999 | 279×42 | 공통/기능 재사용 · [GrowthPanel.tsx:127](../../src/features/statistics/GrowthPanel.tsx#L127) | 성장 추적 393px · 공통 선택 컨트롤 |
| B107 | 성장 추적 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [GrowthPanel.tsx:133](../../src/features/statistics/GrowthPanel.tsx#L133) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B108 | 성장 추적 | 운동 더 보기 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [GrowthPanel.tsx:134](../../src/features/statistics/GrowthPanel.tsx#L134) | 소스 · disabled·pending·loading 분기 |
| B109 | 성장 추적 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [GrowthPanel.tsx:218](../../src/features/statistics/GrowthPanel.tsx#L218) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B110 | 성장 추적 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [GrowthPanel.tsx:225](../../src/features/statistics/GrowthPanel.tsx#L225) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B111 | 성장 추적 | 이전 승인 더 보기 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [GrowthPanel.tsx:226](../../src/features/statistics/GrowthPanel.tsx#L226) | 소스 · disabled·pending·loading 분기 |
| B112 | 성장 추적 | 상단 뒤로가기 · backLabel · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [GrowthPanel.tsx:242](../../src/features/statistics/GrowthPanel.tsx#L242) | 소스 · 공통 헤더 뒤로가기 |
| B113 | 주간 근육 계획·통계 | 분류별 · 선택 | 40 | 157.5 | 8/4 | 7 | 157.5×40 | 공통/기능 재사용 · [MuscleAnalysis.tsx:46](../../src/features/statistics/MuscleAnalysis.tsx#L46) | 근육별 운동 계획 393px · disabled·pending·loading 분기 |
| B114 | 주간 근육 계획·통계 | 근육별 · 선택 | 40 | 157.5 | 8/4 | 7 | 157.5×40 | 공통/기능 재사용 · [MuscleAnalysis.tsx:47](../../src/features/statistics/MuscleAnalysis.tsx#L47) | 근육별 운동 계획 393px · disabled·pending·loading 분기 |
| B115 | 주간 근육 계획·통계 | 0세트 포함 · 토글 | 44 | 40 | 0/3 | 99 | 40×44 | 개별 · [MuscleAnalysis.tsx:56](../../src/features/statistics/MuscleAnalysis.tsx#L56) | 근육별 운동 계획 393px · 전역 CSS 및 기능별 override |
| B116 | 주간 근육 계획·통계 | 분류별 · 선택 | 40 | 157.5 | 8/4 | 7 | 157.5×40 | 공통/기능 재사용 · [MuscleAnalysis.tsx:79](../../src/features/statistics/MuscleAnalysis.tsx#L79) | 근육별 운동 계획 393px · disabled·pending·loading 분기 |
| B117 | 주간 근육 계획·통계 | 근육별 · 선택 | 40 | 157.5 | 8/4 | 7 | 157.5×40 | 공통/기능 재사용 · [MuscleAnalysis.tsx:79](../../src/features/statistics/MuscleAnalysis.tsx#L79) | 근육별 운동 계획 393px · disabled·pending·loading 분기 |
| B118 | 주간 근육 계획·통계 | 세트 · 선택 | 40 | 157.5 | 8/4 | 7 | 157.5×40 | 공통/기능 재사용 · [MuscleAnalysis.tsx:80](../../src/features/statistics/MuscleAnalysis.tsx#L80) | 주간 근육 통계 393px · disabled·pending·loading 분기 |
| B119 | 주간 근육 계획·통계 | 총중량 · 선택 | 40 | 157.5 | 8/4 | 7 | 157.5×40 | 공통/기능 재사용 · [MuscleAnalysis.tsx:80](../../src/features/statistics/MuscleAnalysis.tsx#L80) | 주간 근육 통계 393px · disabled·pending·loading 분기 |
| B120 | 주간 근육 계획·통계 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [MuscleAnalysis.tsx:163](../../src/features/statistics/MuscleAnalysis.tsx#L163) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B121 | 운동 현황·전체 이력 기간 | 주간 / 월간 · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PeriodControls.tsx:34](../../src/features/statistics/PeriodControls.tsx#L34) | 소스 · 전역 CSS 및 기능별 override |
| B122 | 운동 현황·전체 이력 기간 | 이전 기간 · Secondary | 44 | 36 | 3/3 | 5 | 36×44 | 개별 · [PeriodControls.tsx:41](../../src/features/statistics/PeriodControls.tsx#L41) | 전체 운동 이력 393px · 전역 CSS 및 기능별 override |
| B123 | 운동 현황·전체 이력 기간 | 다음 기간 · Secondary | 44 | 36 | 3/3 | 5 | 36×44 | 개별 · [PeriodControls.tsx:41](../../src/features/statistics/PeriodControls.tsx#L41) | 전체 운동 이력 393px · 전역 CSS 및 기능별 override |
| B124 | 운동 현황·전체 이력 기간 | 달력 열기 · Secondary | 44 | 36 | 3/3 | 5 | 36×44 | 개별 · [PeriodControls.tsx:41](../../src/features/statistics/PeriodControls.tsx#L41) | 전체 운동 이력 393px · 전역 CSS 및 기능별 override |
| B125 | 운동 현황·전체 이력 기간 | 달력 이전 달 · 보조·아이콘 | 30.5 | 32 | 3/6 | 10 | 32×30.5 | 개별 · [PeriodControls.tsx:42](../../src/features/statistics/PeriodControls.tsx#L42) | 운동 현황 달력 393px · 전역 CSS 및 기능별 override |
| B126 | 운동 현황·전체 이력 기간 | 달력 다음 달 · 보조·아이콘 | 30.5 | 32 | 3/6 | 10 | 32×30.5 | 개별 · [PeriodControls.tsx:42](../../src/features/statistics/PeriodControls.tsx#L42) | 운동 현황 달력 393px · 전역 CSS 및 기능별 override |
| B127 | 운동 현황·전체 이력 기간 | 닫기 · 취소·닫기 | 30 | 34.3 | 3/6 | 10 | 34.3×30 | 개별 · [PeriodControls.tsx:42](../../src/features/statistics/PeriodControls.tsx#L42) | 운동 현황 달력 393px · 전역 CSS 및 기능별 override |
| B128 | 운동 현황·전체 이력 기간 | day · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PeriodControls.tsx:42](../../src/features/statistics/PeriodControls.tsx#L42) | 소스 · 전역 CSS 및 기능별 override |
| B129 | 운동 현황·전체 이력 필터 | '검색 범위: ' + options[selected].name · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [SearchScopePopover.tsx:48](../../src/features/statistics/SearchScopePopover.tsx#L48) | 소스 · 전역 CSS 및 기능별 override |
| B130 | 운동 현황·전체 이력 필터 | {option.name} · 기능 조작 | 호출부 | 호출부 | 호출부 | 호출부 | 호출부 | 개별 · [SearchScopePopover.tsx:79](../../src/features/statistics/SearchScopePopover.tsx#L79) | 소스 · 키보드/선택 규칙은 공통 구현 |
| B131 | 기록 메인·운동 현황 | label · 기능 조작 | 107 | 172.5 | 12/12 | 5 | 172.5×107 | 개별 · [StatisticsPanel.tsx:107](../../src/features/statistics/StatisticsPanel.tsx#L107) | 기록 메인 393px · 전역 CSS 및 기능별 override |
| B132 | 기록 메인·운동 현황 | 세트 · 선택 | 40 | 157.5 | 8/4 | 7 | 157.5×40 | 공통/기능 재사용 · [StatisticsPanel.tsx:164](../../src/features/statistics/StatisticsPanel.tsx#L164) | 운동 현황 393px · disabled·pending·loading 분기 |
| B133 | 기록 메인·운동 현황 | 총중량 · 선택 | 40 | 157.5 | 8/4 | 7 | 157.5×40 | 공통/기능 재사용 · [StatisticsPanel.tsx:164](../../src/features/statistics/StatisticsPanel.tsx#L164) | 운동 현황 393px · disabled·pending·loading 분기 |
| B134 | 기록 메인·운동 현황 | 운동·분류·근육 검색 · 기능 조작 | 42 | 189 | 8/12 | 999 | 189×42 | 공통/기능 재사용 · [StatisticsPanel.tsx:165](../../src/features/statistics/StatisticsPanel.tsx#L165) | 운동 현황 393px · 공통 선택 컨트롤 |
| B135 | 기록 메인·운동 현황 | 상세 닫기 / 상세 보기 › · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [StatisticsPanel.tsx:197](../../src/features/statistics/StatisticsPanel.tsx#L197) | 소스 · disabled·pending·loading 분기 |
| B136 | 기록 메인·운동 현황 | 운동 이력 › · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [StatisticsPanel.tsx:209](../../src/features/statistics/StatisticsPanel.tsx#L209) | 소스 · disabled·pending·loading 분기 |
| B137 | 기록 메인·운동 현황 | 상세 › · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [StatisticsPanel.tsx:219](../../src/features/statistics/StatisticsPanel.tsx#L219) | 소스 · disabled·pending·loading 분기 |
| B138 | 기록 메인·운동 현황 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [StatisticsPanel.tsx:394](../../src/features/statistics/StatisticsPanel.tsx#L394) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B139 | 기록 메인·운동 현황 | 루틴으로 / 기록으로 · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [StatisticsPanel.tsx:398](../../src/features/statistics/StatisticsPanel.tsx#L398) | 소스 · 공통 헤더 뒤로가기 |
| B140 | 기록 메인·운동 현황 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [StatisticsPanel.tsx:402](../../src/features/statistics/StatisticsPanel.tsx#L402) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B141 | 기록 메인·운동 현황 | 전체 보기 › · 보조·아이콘 | 44 | 66.9 | 7/0/7/10 | 999 | 66.9×44 | 공통/기능 재사용 · [StatisticsPanel.tsx:409](../../src/features/statistics/StatisticsPanel.tsx#L409) | 기록 메인 393px · disabled·pending·loading 분기 |
| B142 | 주간 일정 배정·편집 | 닫기 · 취소·닫기 | 48 | 51.5 | 10/10 | 10 | 51.5×48 | 개별 · [WeeklySchedulePanel.tsx:48](../../src/features/statistics/WeeklySchedulePanel.tsx#L48) | 주간 일정 편집 393px · 전역 CSS 및 기능별 override |
| B143 | 주간 일정 배정·편집 | 배정 완료 / 배정 미완료 / 배정 유무 · 선택 | 44 | 113.7 | 6/3 | 999 | 113.7×44 | 개별 · [WeeklySchedulePanel.tsx:53](../../src/features/statistics/WeeklySchedulePanel.tsx#L53) | 주간 일정 편집 393px · 전역 CSS 및 기능별 override |
| B144 | 주간 일정 배정·편집 | {label} · 선택 | 44 | 113.7 | 6/3 | 999 | 113.7×44 | 개별 · [WeeklySchedulePanel.tsx:54](../../src/features/statistics/WeeklySchedulePanel.tsx#L54) | 주간 일정 편집 393px · 전역 CSS 및 기능별 override |
| B145 | 주간 일정 배정·편집 | 태그 · 선택 | 44 | 113.7 | 6/3 | 999 | 113.7×44 | 개별 · [WeeklySchedulePanel.tsx:57](../../src/features/statistics/WeeklySchedulePanel.tsx#L57) | 주간 일정 편집 393px · 전역 CSS 및 기능별 override |
| B146 | 주간 일정 배정·편집 | {tag} · 선택 | 44 | 113.7 | 6/3 | 999 | 113.7×44 | 개별 · [WeeklySchedulePanel.tsx:58](../../src/features/statistics/WeeklySchedulePanel.tsx#L58) | 주간 일정 편집 393px · 전역 CSS 및 기능별 override |
| B147 | 주간 일정 배정·편집 | 전체 보기 · 선택 | 44 | 113.7 | 6/3 | 999 | 113.7×44 | 개별 · [WeeklySchedulePanel.tsx:60](../../src/features/statistics/WeeklySchedulePanel.tsx#L60) | 주간 일정 편집 393px · 전역 CSS 및 기능별 override |
| B148 | 주간 일정 배정·편집 | 최신 일정 확인 · Primary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WeeklySchedulePanel.tsx:75](../../src/features/statistics/WeeklySchedulePanel.tsx#L75) | 소스 · 전역 CSS 및 기능별 override |
| B149 | 주간 일정 배정·편집 | 일정 저장 · Primary | 48 | 353 | 10/15 | 999 | 353×48 | 개별 · [WeeklySchedulePanel.tsx:76](../../src/features/statistics/WeeklySchedulePanel.tsx#L76) | 주간 일정 편집 393px · 전역 CSS 및 기능별 override |
| B150 | 주간 일정 배정·편집 | 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WeeklySchedulePanel.tsx:83](../../src/features/statistics/WeeklySchedulePanel.tsx#L83) | 소스 · 전역 CSS 및 기능별 override |
| B151 | 주간 일정 배정·편집 | 저장 · Primary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WeeklySchedulePanel.tsx:83](../../src/features/statistics/WeeklySchedulePanel.tsx#L83) | 소스 · 전역 CSS 및 기능별 override |
| B152 | 유산소 진행·완료 검토 | 실제 활동 시간 수정 · 보조·아이콘 | 48 | 44 | 10/10 | 5 | 44×48 | 개별 · [CardioFocus.tsx:51](../../src/features/workout-flow/CardioFocus.tsx#L51) | 유산소 진행 393px · 전역 CSS 및 기능별 override |
| B153 | 유산소 진행·완료 검토 | 시간 수정 취소 · 취소·닫기 | 48 | 159.5 | 11/7 | 999 | 159.5×48 | 공통/기능 재사용 · [CardioFocus.tsx:62](../../src/features/workout-flow/CardioFocus.tsx#L62) | 유산소 시간 정정 393px · disabled·pending·loading 분기 |
| B154 | 유산소 진행·완료 검토 | 시간 적용 · Primary | 48 | 159.5 | 11/7 | 999 | 159.5×48 | 공통/기능 재사용 · [CardioFocus.tsx:63](../../src/features/workout-flow/CardioFocus.tsx#L63) | 유산소 시간 정정 393px · disabled·pending·loading 분기 |
| B155 | 유산소 진행·완료 검토 | 완료 취소 · 일시정지로 돌아가기 · 취소·닫기 | 48 | 327 | 11/16 | 999 | 327×48 | 공통/기능 재사용 · [CardioFocus.tsx:77](../../src/features/workout-flow/CardioFocus.tsx#L77) | 유산소 진행 393px · disabled·pending·loading 분기 |
| B156 | 유산소 진행·완료 검토 | 유산소 완료 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [CardioFocus.tsx:128](../../src/features/workout-flow/CardioFocus.tsx#L128) | 소스 · disabled·pending·loading 분기 |
| B157 | 유산소 진행·완료 검토 | 편집 닫기 / 운동·세트 편집 · 취소·닫기 | 44 | 353 | 8/16 | 999 | 353×44 | 공통/기능 재사용 · [CardioFocus.tsx:129](../../src/features/workout-flow/CardioFocus.tsx#L129) | 유산소 진행 393px · disabled·pending·loading 분기 |
| B158 | 웨이트 진행·종목/세트 편집 | 종목 보기/변경 · 소형 보조 | 30 | 94.6 | 0/12 | 999 | 94.6×48 | 공통/기능 재사용 · [WeightFocus.tsx:67](../../src/features/workout-flow/WeightFocus.tsx#L67) | 웨이트 진행 393px · 캡슐 표면과 조작 외곽 분리 |
| B159 | 웨이트 진행·종목/세트 편집 | 중량 변경 · 보조·아이콘 | 44 | 61.5 | 8/0 | 999 | 61.5×44 | 공통/기능 재사용 · [WeightFocus.tsx:76](../../src/features/workout-flow/WeightFocus.tsx#L76) | 웨이트 진행 393px · disabled·pending·loading 분기 |
| B160 | 웨이트 진행·종목/세트 편집 | 완료 취소 / 완료 · 취소·닫기 | 하위 컨트롤 참조 | 부모 의존 | 전용 | 전용 | 외곽 | 공통/기능 재사용 · [WeightFocus.tsx:115](../../src/features/workout-flow/WeightFocus.tsx#L115) | 소스 · 공통 선택 컨트롤 |
| B161 | 웨이트 진행·종목/세트 편집 | + 세트 추가 · Secondary | 48 | 160.5 | 7/6 | 999 | 160.5×48 | 공통/기능 재사용 · [WeightFocus.tsx:119](../../src/features/workout-flow/WeightFocus.tsx#L119) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B162 | 웨이트 진행·종목/세트 편집 | {ordinal} 세트 제외 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WeightFocus.tsx:120](../../src/features/workout-flow/WeightFocus.tsx#L120) | 소스 · disabled·pending·loading 분기 |
| B163 | 웨이트 진행·종목/세트 편집 | 운동·세트 편집 · Secondary | 49.6 | 353 | 11/16 | 999 | 353×49.6 | 공통/기능 재사용 · [WeightFocus.tsx:128](../../src/features/workout-flow/WeightFocus.tsx#L128) | 웨이트 진행 393px · disabled·pending·loading 분기 |
| B164 | 웨이트 진행·종목/세트 편집 | 기구 세팅 메모 · 보조·아이콘 | 46 | 353 | 10/0 | 5 | 353×46 | 공통/기능 재사용 · [WeightFocus.tsx:131](../../src/features/workout-flow/WeightFocus.tsx#L131) | 웨이트 진행 393px · disabled·pending·loading 분기 |
| B165 | 웨이트 진행·종목/세트 편집 | 운동 종료 · Secondary | 49.6 | 353 | 10/16 | 999 | 353×49.6 | 공통/기능 재사용 · [WeightFocus.tsx:137](../../src/features/workout-flow/WeightFocus.tsx#L137) | 웨이트 진행 393px · disabled·pending·loading 분기 |
| B166 | 웨이트 진행·종목/세트 편집 | 장비 변경 범위 · 기능 조작 | 48 | 44 | 0/0 | 5 | 44×48 | 공통/기능 재사용 · [WeightFocus.tsx:150](../../src/features/workout-flow/WeightFocus.tsx#L150) | 운동·세트 편집 393px · 16px 아이콘 표면 |
| B167 | 웨이트 진행·종목/세트 편집 | 오늘만 장비 변경 적용 · Secondary | 49.6 | 315 | 11/16 | 999 | 315×49.6 | 공통/기능 재사용 · [WeightFocus.tsx:152](../../src/features/workout-flow/WeightFocus.tsx#L152) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B168 | 종료 요약·중량 검토 | {approvalLabel} · Secondary | 36 | 72 | 4/6 | 999 | 72×36 | 공통/기능 재사용 · [WeightReview.tsx:69](../../src/features/workout-flow/WeightReview.tsx#L69) | 운동 종료 요약 393px · disabled·pending·loading 분기 |
| B169 | 종료 요약·중량 검토 | weight.name + ' 승인 선택' · 기능 조작 | 하위 컨트롤 참조 | 부모 의존 | 전용 | 전용 | 외곽 | 공통/기능 재사용 · [WeightReview.tsx:96](../../src/features/workout-flow/WeightReview.tsx#L96) | 소스 · 공통 선택 컨트롤 |
| B170 | 종료 요약·중량 검토 | 무게 수정 · Secondary | 36 | 72 | 4/6 | 999 | 72×36 | 공통/기능 재사용 · [WeightReview.tsx:99](../../src/features/workout-flow/WeightReview.tsx#L99) | 운동 종료 요약 393px · disabled·pending·loading 분기 |
| B171 | 종료 요약·중량 검토 | 취소 · 취소·닫기 | 48 | 160.5 | 10/15 | 999 | 160.5×48 | 공통/기능 재사용 · [WeightReview.tsx:104](../../src/features/workout-flow/WeightReview.tsx#L104) | 중량 변경 393px · disabled·pending·loading 분기 |
| B172 | 종료 요약·중량 검토 | 시연 확인 / 승인 확인 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WeightReview.tsx:104](../../src/features/workout-flow/WeightReview.tsx#L104) | 소스 · disabled·pending·loading 분기 |
| B173 | 종료 요약·중량 검토 | 취소 · 취소·닫기 | 48 | 160.5 | 10/15 | 999 | 160.5×48 | 공통/기능 재사용 · [WeightReview.tsx:127](../../src/features/workout-flow/WeightReview.tsx#L127) | 중량 변경 393px · disabled·pending·loading 분기 |
| B174 | 종료 요약·중량 검토 | 확인 · Primary | 48 | 142.5 | 11/7 | 999 | 142.5×48 | 공통/기능 재사용 · [WeightReview.tsx:127](../../src/features/workout-flow/WeightReview.tsx#L127) | 중량 변경 393px · disabled·pending·loading 분기 |
| B175 | 운동 중 기능형 Dialog | 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutDialogs.tsx:27](../../src/features/workout-flow/WorkoutDialogs.tsx#L27) | 소스 · 전역 CSS 및 기능별 override |
| B176 | 운동 중 기능형 Dialog | {action} · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutDialogs.tsx:28](../../src/features/workout-flow/WorkoutDialogs.tsx#L28) | 소스 · disabled·pending·loading 분기 |
| B177 | 운동 중 기능형 Dialog | 취소 · 취소·닫기 | 48 | 160.5 | 10/15 | 999 | 160.5×48 | 공통/기능 재사용 · [WorkoutDialogs.tsx:55](../../src/features/workout-flow/WorkoutDialogs.tsx#L55) | 중량 변경 393px · disabled·pending·loading 분기 |
| B178 | 운동 중 기능형 Dialog | 확인 · Primary | 48 | 142.5 | 11/7 | 999 | 142.5×48 | 공통/기능 재사용 · [WorkoutDialogs.tsx:55](../../src/features/workout-flow/WorkoutDialogs.tsx#L55) | 중량 변경 393px · disabled·pending·loading 분기 |
| B179 | 운동 중 기능형 Dialog | item.name · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 10 기본 | 외곽 | 공통/기능 재사용 · [WorkoutDialogs.tsx:97](../../src/features/workout-flow/WorkoutDialogs.tsx#L97) | 소스 · disabled·pending·loading 분기 |
| B180 | 운동 중 기능형 Dialog | item.name + ' 순서 이동' · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [WorkoutDialogs.tsx:102](../../src/features/workout-flow/WorkoutDialogs.tsx#L102) | 소스 · 전역 CSS 및 기능별 override |
| B181 | 운동 중 기능형 Dialog | 목록 닫기 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutDialogs.tsx:111](../../src/features/workout-flow/WorkoutDialogs.tsx#L111) | 소스 · disabled·pending·loading 분기 |
| B182 | 운동 중 기능형 Dialog | 변경하기 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutDialogs.tsx:112](../../src/features/workout-flow/WorkoutDialogs.tsx#L112) | 소스 · disabled·pending·loading 분기 |
| B183 | 운동 중 기능형 Dialog | 취소 · 취소·닫기 | 48 | 160.5 | 10/15 | 999 | 160.5×48 | 공통/기능 재사용 · [WorkoutDialogs.tsx:126](../../src/features/workout-flow/WorkoutDialogs.tsx#L126) | 중량 변경 393px · disabled·pending·loading 분기 |
| B184 | 운동 중 기능형 Dialog | 취소 · 취소·닫기 | 48 | 160.5 | 10/15 | 999 | 160.5×48 | 공통/기능 재사용 · [WorkoutDialogs.tsx:157](../../src/features/workout-flow/WorkoutDialogs.tsx#L157) | 중량 변경 393px · disabled·pending·loading 분기 |
| B185 | 운동 중 기능형 Dialog | {action} · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutDialogs.tsx:157](../../src/features/workout-flow/WorkoutDialogs.tsx#L157) | 소스 · disabled·pending·loading 분기 |
| B186 | 준비운동·진행 프레임·휴식 | 이전 운동 · / 이전 운동 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 10 기본 | 외곽 | 공통/기능 재사용 · [WorkoutFrame.tsx:96](../../src/features/workout-flow/WorkoutFrame.tsx#L96) | 소스 · disabled·pending·loading 분기 |
| B187 | 준비운동·진행 프레임·휴식 | ‹ {backLabel} · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 10 기본 | 외곽 | 공통/기능 재사용 · [WorkoutFrame.tsx:98](../../src/features/workout-flow/WorkoutFrame.tsx#L98) | 소스 · disabled·pending·loading 분기 |
| B188 | 준비운동·진행 프레임·휴식 | 다음 운동 · / 다음 운동 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 10 기본 | 외곽 | 공통/기능 재사용 · [WorkoutFrame.tsx:100](../../src/features/workout-flow/WorkoutFrame.tsx#L100) | 소스 · disabled·pending·loading 분기 |
| B189 | 준비운동·진행 프레임·휴식 | 종료 · 보조·아이콘 | 48 | 52 | 10/0 | 999 | 52×48 | 공통/기능 재사용 · [WorkoutFrame.tsx:102](../../src/features/workout-flow/WorkoutFrame.tsx#L102) | 준비운동 393px · disabled·pending·loading 분기 |
| B190 | 준비운동·진행 프레임·휴식 | ‹ 이전 {previous && &lt;small title={previous.name}&gt;{previous.name}&lt;/small&gt;} · 보조·아이콘 | 48 | 131.8 | 4/0 | 5 | 131.8×48 | 공통/기능 재사용 · [WorkoutFrame.tsx:150](../../src/features/workout-flow/WorkoutFrame.tsx#L150) | 유산소 진행 393px · disabled·pending·loading 분기 |
| B191 | 준비운동·진행 프레임·휴식 | 종목 목록 · 소형 보조 | 30 | 73.5 | 0/12 | 999 | 73.5×48 | 공통/기능 재사용 · [WorkoutFrame.tsx:151](../../src/features/workout-flow/WorkoutFrame.tsx#L151) | 유산소 진행 393px · 캡슐 표면과 조작 외곽 분리 |
| B192 | 준비운동·진행 프레임·휴식 | 다음 › {next && &lt;small title={next.name}&gt;{next.name}&lt;/small&gt;} · 보조·아이콘 | 48 | 131.8 | 4/0 | 5 | 131.8×48 | 공통/기능 재사용 · [WorkoutFrame.tsx:152](../../src/features/workout-flow/WorkoutFrame.tsx#L152) | 유산소 진행 393px · disabled·pending·loading 분기 |
| B193 | 준비운동·진행 프레임·휴식 | 중량 안내 숨기기 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 10 기본 | 외곽 | 공통/기능 재사용 · [WorkoutFrame.tsx:163](../../src/features/workout-flow/WorkoutFrame.tsx#L163) | 소스 · disabled·pending·loading 분기 |
| B194 | 준비운동·진행 프레임·휴식 | 휴식 종료 · Primary | 50 | 172.5 | 0/12 | 5 | 172.5×50 | 공통/기능 재사용 · [WorkoutFrame.tsx:181](../../src/features/workout-flow/WorkoutFrame.tsx#L181) | 휴식 진행 393px · disabled·pending·loading 분기 |
| B195 | 준비운동·진행 프레임·휴식 | +30초 · Secondary | 50 | 172.5 | 0/12 | 5 | 172.5×50 | 공통/기능 재사용 · [WorkoutFrame.tsx:182](../../src/features/workout-flow/WorkoutFrame.tsx#L182) | 휴식 진행 393px · disabled·pending·loading 분기 |
| B196 | 운동 저장 상태 | ${label.text} · 데이터 상태 확인 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [WorkoutSaveLabel.tsx:27](../../src/features/workout-flow/WorkoutSaveLabel.tsx#L27) | 소스 · 전역 CSS 및 기능별 override |
| B197 | 종료 요약·기록 상세 | 중량 변경 승인 이력 · 접기·펼치기 | 호출부 | 행/텍스트 | 호출부 | 호출부 | 행 또는 링크 | 개별 · [WorkoutSummary.tsx:39](../../src/features/workout-flow/WorkoutSummary.tsx#L39) | 소스 · 네이티브 펼침/링크 |
| B198 | 종료 요약·기록 상세 | 상단 뒤로가기 · returnLabel · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [WorkoutSummary.tsx:71](../../src/features/workout-flow/WorkoutSummary.tsx#L71) | 소스 · 공통 헤더 뒤로가기 |
| B199 | 종료 요약·기록 상세 | {returnLabel} 돌아가기 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutSummary.tsx:158](../../src/features/workout-flow/WorkoutSummary.tsx#L158) | 소스 · disabled·pending·loading 분기 |
| B200 | 운동 중 공식 승인·충돌 해결 | 현재 루틴 중량 유지 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [ApprovalControls.tsx:43](../../src/features/workout-local/ApprovalControls.tsx#L43) | 소스 · 전역 CSS 및 기능별 override |
| B201 | 운동 중 공식 승인·충돌 해결 | 이 중량으로 지금 재승인 · Primary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [ApprovalControls.tsx:44](../../src/features/workout-local/ApprovalControls.tsx#L44) | 소스 · 전역 CSS 및 기능별 override |
| B202 | 준비운동·웨이트/유산소·운동 편집·종료 | 요약 다시 조회 / 종료 결과 확인 / 남은 유산소 건너뛰고 종료 / 운동 종료 및 요약 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:322](../../src/features/workout-local/LocalWorkoutFlow.tsx#L322) | 소스 · disabled·pending·loading 분기 |
| B203 | 준비운동·웨이트/유산소·운동 편집·종료 | + 유산소 추가 · Secondary | 49.6 | 315 | 11/16 | 999 | 315×49.6 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:326](../../src/features/workout-local/LocalWorkoutFlow.tsx#L326) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B204 | 준비운동·웨이트/유산소·운동 편집·종료 | 다음 종목으로 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:327](../../src/features/workout-local/LocalWorkoutFlow.tsx#L327) | 소스 · disabled·pending·loading 분기 |
| B205 | 준비운동·웨이트/유산소·운동 편집·종료 | 서버 저장 상태 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:338](../../src/features/workout-local/LocalWorkoutFlow.tsx#L338) | 소스 · disabled·pending·loading 분기 |
| B206 | 준비운동·웨이트/유산소·운동 편집·종료 | 준비운동 완료 · Primary | 50 | 353 | 0/12 | 5 | 353×50 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:339](../../src/features/workout-local/LocalWorkoutFlow.tsx#L339) | 준비운동 393px · disabled·pending·loading 분기 |
| B207 | 준비운동·웨이트/유산소·운동 편집·종료 | 편집 닫기 · 취소·닫기 | 50 | 353 | 0/12 | 5 | 353×50 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:343](../../src/features/workout-local/LocalWorkoutFlow.tsx#L343) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B208 | 준비운동·웨이트/유산소·운동 편집·종료 | 운동 시작하기 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:344](../../src/features/workout-local/LocalWorkoutFlow.tsx#L344) | 소스 · disabled·pending·loading 분기 |
| B209 | 준비운동·웨이트/유산소·운동 편집·종료 | {ordinal} 세트 완료 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:350](../../src/features/workout-local/LocalWorkoutFlow.tsx#L350) | 소스 · disabled·pending·loading 분기 |
| B210 | 준비운동·웨이트/유산소·운동 편집·종료 | 유산소 기록 확정 · Primary | 50 | 353 | 0/12 | 5 | 353×50 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:355](../../src/features/workout-local/LocalWorkoutFlow.tsx#L355) | 유산소 진행 393px · disabled·pending·loading 분기 |
| B211 | 준비운동·웨이트/유산소·운동 편집·종료 | 일시정지 / 재개 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:366](../../src/features/workout-local/LocalWorkoutFlow.tsx#L366) | 소스 · disabled·pending·loading 분기 |
| B212 | 준비운동·웨이트/유산소·운동 편집·종료 | 유산소 완료 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:367](../../src/features/workout-local/LocalWorkoutFlow.tsx#L367) | 소스 · disabled·pending·loading 분기 |
| B213 | 준비운동·웨이트/유산소·운동 편집·종료 | + 다음 종목 추가 · Secondary | 49.6 | 315 | 11/16 | 999 | 315×49.6 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:448](../../src/features/workout-local/LocalWorkoutFlow.tsx#L448) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B214 | 준비운동·웨이트/유산소·운동 편집·종료 | + 유산소 추가 · Secondary | 49.6 | 315 | 11/16 | 999 | 315×49.6 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:448](../../src/features/workout-local/LocalWorkoutFlow.tsx#L448) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B215 | 준비운동·웨이트/유산소·운동 편집·종료 | 현재 종목 교체 · Secondary | 49.6 | 315 | 11/16 | 999 | 315×49.6 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:449](../../src/features/workout-local/LocalWorkoutFlow.tsx#L449) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B216 | 준비운동·웨이트/유산소·운동 편집·종료 | 현재 종목 제외 · 위험·경고 | 49.6 | 315 | 11/16 | 999 | 315×49.6 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:450](../../src/features/workout-local/LocalWorkoutFlow.tsx#L450) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B217 | 준비운동·웨이트/유산소·운동 편집·종료 | + 종목 추가 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:457](../../src/features/workout-local/LocalWorkoutFlow.tsx#L457) | 소스 · disabled·pending·loading 분기 |
| B218 | 준비운동·웨이트/유산소·운동 편집·종료 | + 유산소 추가 · Secondary | 49.6 | 315 | 11/16 | 999 | 315×49.6 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:457](../../src/features/workout-local/LocalWorkoutFlow.tsx#L457) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B219 | 준비운동·웨이트/유산소·운동 편집·종료 | 유산소 계획 편집 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:458](../../src/features/workout-local/LocalWorkoutFlow.tsx#L458) | 소스 · disabled·pending·loading 분기 |
| B220 | 준비운동·웨이트/유산소·운동 편집·종료 | 현재 종목 제외 · 위험·경고 | 49.6 | 315 | 11/16 | 999 | 315×49.6 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:459](../../src/features/workout-local/LocalWorkoutFlow.tsx#L459) | 운동·세트 편집 393px · disabled·pending·loading 분기 |
| B221 | 준비운동·웨이트/유산소·운동 편집·종료 | 닫기 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:490](../../src/features/workout-local/LocalWorkoutFlow.tsx#L490) | 소스 · disabled·pending·loading 분기 |
| B222 | 준비운동·웨이트/유산소·운동 편집·종료 | {draftSaveFailure.retry} · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:491](../../src/features/workout-local/LocalWorkoutFlow.tsx#L491) | 소스 · disabled·pending·loading 분기 |
| B223 | 준비운동·웨이트/유산소·운동 편집·종료 | 입력 다시 저장 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:492](../../src/features/workout-local/LocalWorkoutFlow.tsx#L492) | 소스 · disabled·pending·loading 분기 |
| B224 | 준비운동·웨이트/유산소·운동 편집·종료 | 닫기 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:504](../../src/features/workout-local/LocalWorkoutFlow.tsx#L504) | 소스 · disabled·pending·loading 분기 |
| B225 | 준비운동·웨이트/유산소·운동 편집·종료 | 다시 확인 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:505](../../src/features/workout-local/LocalWorkoutFlow.tsx#L505) | 소스 · disabled·pending·loading 분기 |
| B226 | 준비운동·웨이트/유산소·운동 편집·종료 | 요약 다시 조회 / 종료 결과 확인 / 운동 정보 다시 조회 / 저장 결과 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:506](../../src/features/workout-local/LocalWorkoutFlow.tsx#L506) | 소스 · disabled·pending·loading 분기 |
| B227 | 준비운동·웨이트/유산소·운동 편집·종료 | 세션 상세 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:509](../../src/features/workout-local/LocalWorkoutFlow.tsx#L509) | 소스 · disabled·pending·loading 분기 |
| B228 | 준비운동·웨이트/유산소·운동 편집·종료 | 로컬 운동 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:510](../../src/features/workout-local/LocalWorkoutFlow.tsx#L510) | 소스 · disabled·pending·loading 분기 |
| B229 | 준비운동·웨이트/유산소·운동 편집·종료 | 같은 계정 인증 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutFlow.tsx:511](../../src/features/workout-local/LocalWorkoutFlow.tsx#L511) | 소스 · disabled·pending·loading 분기 |
| B230 | 운동 진입·편집 잠금·복귀 | 로컬 운동 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutScreen.tsx:67](../../src/features/workout-local/LocalWorkoutScreen.tsx#L67) | 소스 · disabled·pending·loading 분기 |
| B231 | 운동 진입·편집 잠금·복귀 | 같은 계정 인증 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [LocalWorkoutScreen.tsx:69](../../src/features/workout-local/LocalWorkoutScreen.tsx#L69) | 소스 · disabled·pending·loading 분기 |
| B232 | 운동 진입·편집 잠금·복귀 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [LocalWorkoutScreen.tsx:80](../../src/features/workout-local/LocalWorkoutScreen.tsx#L80) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B233 | 오프라인 복구 | 이 기기의 운동 이어가기 · Primary | 48 | 309 | 10/15 | 999 | 309×48 | 개별 · [OfflineResume.tsx:17](../../src/features/workout-local/OfflineResume.tsx#L17) | 오프라인 복구 393px · 전역 CSS 및 기능별 override |
| B234 | 루틴·운동 중 유산소 계획 | 추가 목표 설정 · 접기·펼치기 | 36.8 | 327 | 8/0 | 0 | 327×36.8 | 개별 · [CardioPlanFields.tsx:29](../../src/features/workout-online/CardioPlanFields.tsx#L29) | 루틴 편집 393px · 네이티브 펼침/링크 |
| B235 | 루틴·진행 유산소 종목 검색 | 유산소 검색 · 이름 또는 별칭 · 기능 조작 | 하위 컨트롤 참조 | 부모 의존 | 전용 | 전용 | 외곽 | 공통/기능 재사용 · [CardioSearch.tsx:21](../../src/features/workout-online/CardioSearch.tsx#L21) | 소스 · 공통 선택 컨트롤 |
| B236 | 기록 상세·정정·공식 평가·복구 | 상단 뒤로가기 · backLabel · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [ClosedWorkout.tsx:160](../../src/features/workout-online/ClosedWorkout.tsx#L160) | 소스 · 공통 헤더 뒤로가기 |
| B237 | 기록 상세·정정·공식 평가·복구 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:163](../../src/features/workout-online/ClosedWorkout.tsx#L163) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B238 | 기록 상세·정정 목록·평가 변경 이력 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:194](../../src/features/workout-online/ClosedWorkout.tsx#L194) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B239 | 기록 상세·정정 목록·평가 변경 이력 | 저장 결과 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:201](../../src/features/workout-online/ClosedWorkout.tsx#L201) | 소스 · disabled·pending·loading 분기 |
| B240 | 기록 상세·정정 목록·평가 변경 이력 | 현재 기록 확인 완료 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:202](../../src/features/workout-online/ClosedWorkout.tsx#L202) | 소스 · disabled·pending·loading 분기 |
| B241 | 기록 상세·정정 목록·평가 변경 이력 | 종료 결과 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:206](../../src/features/workout-online/ClosedWorkout.tsx#L206) | 소스 · disabled·pending·loading 분기 |
| B242 | 기록 상세·정정 목록·평가 변경 이력 | 운동 기록 메뉴 · 접기·펼치기 | 44 | 44 | 0/0 | 0 | 44×44 | 개별 · [ClosedWorkout.tsx:211](../../src/features/workout-online/ClosedWorkout.tsx#L211) | 기록 상세 393px · 네이티브 펼침/링크 |
| B243 | 기록 상세·정정 목록·평가 변경 이력 | 기록 정정 · Secondary | 48 | 129.2 | 11/16 | 10 | 129.2×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:212](../../src/features/workout-online/ClosedWorkout.tsx#L212) | 기록 상세 메뉴 393px · disabled·pending·loading 분기 |
| B244 | 기록 상세·정정 목록·평가 변경 이력 | 누락 수행 복구 · Secondary | 48.6 | 129.2 | 11/16 | 10 | 129.2×48.6 | 공통/기능 재사용 · [ClosedWorkout.tsx:213](../../src/features/workout-online/ClosedWorkout.tsx#L213) | 기록 상세 메뉴 393px · disabled·pending·loading 분기 |
| B245 | 기록 상세·정정 목록·평가 변경 이력 | 기록 전체 삭제 · Secondary | 48.6 | 129.2 | 11/16 | 10 | 129.2×48.6 | 공통/기능 재사용 · [ClosedWorkout.tsx:214](../../src/features/workout-online/ClosedWorkout.tsx#L214) | 기록 상세 메뉴 393px · disabled·pending·loading 분기 |
| B246 | 기록 상세·정정 목록·평가 변경 이력 | 평가 변경 이력 · Secondary | 48.6 | 129.2 | 11/16 | 10 | 129.2×48.6 | 공통/기능 재사용 · [ClosedWorkout.tsx:218](../../src/features/workout-online/ClosedWorkout.tsx#L218) | 기록 상세 메뉴 393px · disabled·pending·loading 분기 |
| B247 | 기록 상세·정정 목록·평가 변경 이력 | ‹ 운동 기록 상세 · 보조·아이콘 | 48 | 129.1 | 10/10 | 999 | 129.1×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:227](../../src/features/workout-online/ClosedWorkout.tsx#L227) | 공식 평가 및 변경 이력 393px · disabled·pending·loading 분기 |
| B248 | 기록 상세·정정 목록·평가 변경 이력 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:231](../../src/features/workout-online/ClosedWorkout.tsx#L231) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B249 | 기록 상세·정정 목록·평가 변경 이력 | name(id)+' '+set.ordinal+'세트 정정' · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:242](../../src/features/workout-online/ClosedWorkout.tsx#L242) | 소스 · disabled·pending·loading 분기 |
| B250 | 기록 상세·정정 목록·평가 변경 이력 | 삭제 / 정정 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:248](../../src/features/workout-online/ClosedWorkout.tsx#L248) | 소스 · disabled·pending·loading 분기 |
| B251 | 기록 삭제 Dialog | 취소 · 취소·닫기 | 48 | 151.5 | 10/15 | 999 | 151.5×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:275](../../src/features/workout-online/ClosedWorkout.tsx#L275) | 세트 정정 393px · disabled·pending·loading 분기 |
| B252 | 기록 삭제 Dialog | 삭제 · 위험·경고 | 48 | 148.5 | 11/16 | 999 | 148.5×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:277](../../src/features/workout-online/ClosedWorkout.tsx#L277) | 기록 삭제 확인 393px · disabled·pending·loading 분기 |
| B253 | 기록 상세·종료 후 공식 재승인 | 종료 후 현재 중량 유지 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [ClosedWorkout.tsx:292](../../src/features/workout-online/ClosedWorkout.tsx#L292) | 소스 · 전역 CSS 및 기능별 override |
| B254 | 기록 상세·종료 후 공식 재승인 | 종료 후 명시 재승인 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [ClosedWorkout.tsx:294](../../src/features/workout-online/ClosedWorkout.tsx#L294) | 소스 · 전역 CSS 및 기능별 override |
| B255 | 기록 정정 | 계속 편집 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:365](../../src/features/workout-online/ClosedWorkout.tsx#L365) | 소스 · disabled·pending·loading 분기 |
| B256 | 기록 정정 | 삭제 확인 / 변경 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:366](../../src/features/workout-online/ClosedWorkout.tsx#L366) | 소스 · disabled·pending·loading 분기 |
| B257 | 기록 정정 | 취소 · 취소·닫기 | 48 | 151.5 | 10/15 | 999 | 151.5×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:368](../../src/features/workout-online/ClosedWorkout.tsx#L368) | 세트 정정 393px · disabled·pending·loading 분기 |
| B258 | 기록 정정 | 변경 저장 · Primary | 48 | 151.5 | 11/7 | 999 | 151.5×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:368](../../src/features/workout-online/ClosedWorkout.tsx#L368) | 세트 정정 393px · disabled·pending·loading 분기 |
| B259 | 기록 정정 | 이 수행 삭제 · 위험·경고 | 48 | 311 | 11/16 | 999 | 311×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:369](../../src/features/workout-online/ClosedWorkout.tsx#L369) | 세트 정정 393px · disabled·pending·loading 분기 |
| B260 | 누락 수행 복구 | 복구할 수 없는 기록 확인 · 접기·펼치기 | 22.4 | 311 | 0/0 | 0 | 311×22.4 | 개별 · [ClosedWorkout.tsx:391](../../src/features/workout-online/ClosedWorkout.tsx#L391) | 누락 수행 복구 393px · 네이티브 펼침/링크 |
| B261 | 누락 수행 복구 | 선택으로 돌아가기 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:395](../../src/features/workout-online/ClosedWorkout.tsx#L395) | 소스 · disabled·pending·loading 분기 |
| B262 | 누락 수행 복구 | 복구 확인 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [ClosedWorkout.tsx:396](../../src/features/workout-online/ClosedWorkout.tsx#L396) | 소스 · disabled·pending·loading 분기 |
| B263 | 누락 수행 복구 | 취소 · 취소·닫기 | 48 | 151.5 | 10/15 | 999 | 151.5×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:408](../../src/features/workout-online/ClosedWorkout.tsx#L408) | 세트 정정 393px · disabled·pending·loading 분기 |
| B264 | 누락 수행 복구 | 선택한 수행 복구 · Primary | 48 | 151.5 | 11/7 | 999 | 151.5×48 | 공통/기능 재사용 · [ClosedWorkout.tsx:409](../../src/features/workout-online/ClosedWorkout.tsx#L409) | 누락 수행 복구 393px · disabled·pending·loading 분기 |
| B265 | 루틴 상세·편집·웨이트 진행 메모 | 메모 지우기 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [CombinationMemo.tsx:28](../../src/features/workout-online/CombinationMemo.tsx#L28) | 소스 · 전역 CSS 및 기능별 override |
| B266 | 루틴 생성·편집·종목 조작 | 변경 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [ExerciseEditHeading.tsx:12](../../src/features/workout-online/ExerciseEditHeading.tsx#L12) | 소스 · 전역 CSS 및 기능별 override |
| B267 | 루틴·진행 웨이트 종목 검색 | 표준 운동 검색 · 이름 또는 별칭 · 기능 조작 | 하위 컨트롤 참조 | 부모 의존 | 전용 | 전용 | 외곽 | 공통/기능 재사용 · [ExerciseSearch.tsx:22](../../src/features/workout-online/ExerciseSearch.tsx#L22) | 소스 · 공통 선택 컨트롤 |
| B268 | 루틴 메인·일정 프리셋 | number + '번 주간 일정으로 즉시 전환' · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PresetControls.tsx:26](../../src/features/workout-online/PresetControls.tsx#L26) | 소스 · 전역 CSS 및 기능별 override |
| B269 | 루틴 메인·일정 프리셋 | 자동 순환 · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PresetControls.tsx:32](../../src/features/workout-online/PresetControls.tsx#L32) | 소스 · 전역 CSS 및 기능별 override |
| B270 | 루틴 메인·일정 프리셋 | 주간 루틴 일정 메뉴 · 접기·펼치기 | 44 | 44 | 0/0 | 0 | 44×44 | 개별 · [PresetControls.tsx:36](../../src/features/workout-online/PresetControls.tsx#L36) | 루틴 메인 393px · 네이티브 펼침/링크 |
| B271 | 루틴 메인·일정 프리셋 | 계획 분석 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PresetControls.tsx:37](../../src/features/workout-online/PresetControls.tsx#L37) | 소스 · 전역 CSS 및 기능별 override |
| B272 | 루틴 메인·일정 프리셋 | 이름 변경 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PresetControls.tsx:38](../../src/features/workout-online/PresetControls.tsx#L38) | 소스 · 전역 CSS 및 기능별 override |
| B273 | 루틴 메인·일정 프리셋 | 이름 변경 · 서버 미지원 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PresetControls.tsx:39](../../src/features/workout-online/PresetControls.tsx#L39) | 소스 · 전역 CSS 및 기능별 override |
| B274 | 루틴 메인·일정 프리셋 | 주간 일정 전체 편집 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PresetControls.tsx:40](../../src/features/workout-online/PresetControls.tsx#L40) | 소스 · 전역 CSS 및 기능별 override |
| B275 | 루틴 메인·일정 프리셋 | 현재 보고 있는 일정 삭제 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PresetControls.tsx:41](../../src/features/workout-online/PresetControls.tsx#L41) | 소스 · 전역 CSS 및 기능별 override |
| B276 | 루틴 메인·일정 프리셋 | 나중에 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [PresetControls.tsx:54](../../src/features/workout-online/PresetControls.tsx#L54) | 소스 · 전역 CSS 및 기능별 override |
| B277 | 루틴 메인·일정 프리셋 | 배정하기 · Primary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [PresetControls.tsx:55](../../src/features/workout-online/PresetControls.tsx#L55) | 소스 · 전역 CSS 및 기능별 override |
| B278 | 루틴 메인·일정 프리셋 | (index + 1) + '번 프리셋 보기' · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PresetControls.tsx:64](../../src/features/workout-online/PresetControls.tsx#L64) | 소스 · 전역 CSS 및 기능별 override |
| B279 | 루틴 메인·일정 프리셋 | 빈 프리셋 추가 · 기능 조작 | 44 | 44 | 0/0 | 50% | 44×44 | 개별 · [PresetControls.tsx:66](../../src/features/workout-online/PresetControls.tsx#L66) | 루틴 메인 393px · 전역 CSS 및 기능별 override |
| B280 | 일정 전체 편집 |  제외 / 추가 · 기능 조작 | 34 | 44 | 4/7 | 999 | 44×34 | 개별 · [PresetOrderEditor.tsx:71](../../src/features/workout-online/PresetOrderEditor.tsx#L71) | 일정 전체 편집 393px · 전역 CSS 및 기능별 override |
| B281 | 일정 전체 편집 | preset.name + ' 순서 이동' · 기능 조작 | 44 | 44 | 0/0 | 10 | 44×44 | 개별 · [PresetOrderEditor.tsx:72](../../src/features/workout-online/PresetOrderEditor.tsx#L72) | 일정 전체 편집 393px · 전역 CSS 및 기능별 override |
| B282 | 일정 전체 편집 | 닫기 / 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [PresetOrderEditor.tsx:81](../../src/features/workout-online/PresetOrderEditor.tsx#L81) | 소스 · 전역 CSS 및 기능별 override |
| B283 | 일정 전체 편집 | 최신 일정 확인 · Primary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [PresetOrderEditor.tsx:82](../../src/features/workout-online/PresetOrderEditor.tsx#L82) | 소스 · 전역 CSS 및 기능별 override |
| B284 | 일정 전체 편집 | 변경사항 저장 · Primary | 47.6 | 172 | 10/15 | 999 | 172×47.6 | 개별 · [PresetOrderEditor.tsx:83](../../src/features/workout-online/PresetOrderEditor.tsx#L83) | 일정 전체 편집 393px · 전역 CSS 및 기능별 override |
| B285 | 표준 운동 카탈로그·상세 | backLabel · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 11/16 | 10 기본 | 외곽 | 공통/기능 재사용 · [PublicCatalog.tsx:62](../../src/features/workout-online/PublicCatalog.tsx#L62) | 소스 · disabled·pending·loading 분기 |
| B286 | 표준 운동 카탈로그·상세 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [PublicCatalog.tsx:83](../../src/features/workout-online/PublicCatalog.tsx#L83) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B287 | 표준 운동 카탈로그·상세 | 상단 뒤로가기 · 설정으로 돌아가기 · 뒤로가기 | 44 | 44 | 0/0 | 10 | 44×44 | 공통/기능 재사용 · [PublicCatalog.tsx:100](../../src/features/workout-online/PublicCatalog.tsx#L100) | 표준 운동 카탈로그 393px · 공통 헤더 뒤로가기 |
| B288 | 표준 운동 카탈로그·상세 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [PublicCatalog.tsx:154](../../src/features/workout-online/PublicCatalog.tsx#L154) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B289 | 표준 운동 카탈로그·상세 | 운동 자세 및 방법 · 접기·펼치기 | 52 | 327 | 0/0 | 0 | 327×52 | 개별 · [PublicCatalog.tsx:182](../../src/features/workout-online/PublicCatalog.tsx#L182) | 표준 운동 상세 393px · 네이티브 펼침/링크 |
| B290 | 루틴 메인·저장된 루틴 | 가로 일정 보기 / 세로 일정 보기 · 선택 | 44 | 44 | 0/0 | 10 | 44×44 | 개별 · [RoutineCards.tsx:71](../../src/features/workout-online/RoutineCards.tsx#L71) | 루틴 메인 393px · 전역 CSS 및 기능별 override |
| B291 | 루틴 메인·저장된 루틴 | + 새 루틴 · 기능 조작 | 47.6 | 96.3 | 10/15 | 999 | 96.3×47.6 | 개별 · [RoutineCards.tsx:79](../../src/features/workout-online/RoutineCards.tsx#L79) | 루틴 메인 393px · 전역 CSS 및 기능별 override |
| B292 | 루틴 메인·저장된 루틴 | [${name}요일,r?.tag,dayLabel(i + 1),counts].filter(Boolean).join(' · ') · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineCards.tsx:89](../../src/features/workout-online/RoutineCards.tsx#L89) | 소스 · 전역 CSS 및 기능별 override |
| B293 | 루틴 메인·저장된 루틴 | [${name}요일, r?.tag, dayLabel(i + 1)].filter(Boolean).join(' · ') · 선택 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineCards.tsx:95](../../src/features/workout-online/RoutineCards.tsx#L95) | 소스 · 전역 CSS 및 기능별 override |
| B294 | 루틴 메인·저장된 루틴 | 요일 필터 해제 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineCards.tsx:99](../../src/features/workout-online/RoutineCards.tsx#L99) | 소스 · 전역 CSS 및 기능별 override |
| B295 | 루틴 메인·저장된 루틴 | ${r.name} 메뉴 · 접기·펼치기 | 호출부 | 행/텍스트 | 호출부 | 호출부 | 행 또는 링크 | 개별 · [RoutineCards.tsx:112](../../src/features/workout-online/RoutineCards.tsx#L112) | 소스 · 네이티브 펼침/링크 |
| B296 | 루틴 메인·저장된 루틴 | 수정 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineCards.tsx:113](../../src/features/workout-online/RoutineCards.tsx#L113) | 소스 · 전역 CSS 및 기능별 override |
| B297 | 루틴 메인·저장된 루틴 | 삭제 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineCards.tsx:114](../../src/features/workout-online/RoutineCards.tsx#L114) | 소스 · 전역 CSS 및 기능별 override |
| B298 | 루틴 메인·저장된 루틴 | ${r.name} 상세 · 기능 조작 | 69.6 | 327 | 0/0 | 0 | 327×69.6 | 개별 · [RoutineCards.tsx:117](../../src/features/workout-online/RoutineCards.tsx#L117) | 루틴 메인 393px · 전역 CSS 및 기능별 override |
| B299 | 루틴 상세 | 상단 뒤로가기 · 루틴 목록으로 · 뒤로가기 | 44 | 44 | 0/0 | 10 | 44×44 | 공통/기능 재사용 · [RoutineDetail.tsx:42](../../src/features/workout-online/RoutineDetail.tsx#L42) | 루틴 상세 393px · 공통 헤더 뒤로가기 |
| B300 | 루틴 상세 | 편집 · 소형 보조 | 30 | 49.9 | 0/12 | 999 | 49.9×48 | 공통/기능 재사용 · [RoutineDetail.tsx:43](../../src/features/workout-online/RoutineDetail.tsx#L43) | 루틴 상세 393px · 캡슐 표면과 조작 외곽 분리 |
| B301 | 루틴 상세 | 루틴 삭제 · 위험·경고 | 46.4 | 353 | 11/16 | 999 | 353×46.4 | 공통/기능 재사용 · [RoutineDetail.tsx:117](../../src/features/workout-online/RoutineDetail.tsx#L117) | 루틴 상세 393px · disabled·pending·loading 분기 |
| B302 | 루틴 생성·편집 | ↑ 위로 · 기능 조작 | 44 | 51.7 | 4/8 | 999 | 51.7×44 | 개별 · [RoutineForm.tsx:38](../../src/features/workout-online/RoutineForm.tsx#L38) | 루틴 편집 393px · 전역 CSS 및 기능별 override |
| B303 | 루틴 생성·편집 | ↓ 아래로 · 기능 조작 | 44 | 63.6 | 4/8 | 999 | 63.6×44 | 개별 · [RoutineForm.tsx:39](../../src/features/workout-online/RoutineForm.tsx#L39) | 루틴 편집 393px · 전역 CSS 및 기능별 override |
| B304 | 루틴 생성·편집 | 삭제 · 기능 조작 | 32 | 78 | 0/6 | 999 | 78×32 | 개별 · [RoutineForm.tsx:40](../../src/features/workout-online/RoutineForm.tsx#L40) | 루틴 편집 393px · 전역 CSS 및 기능별 override |
| B305 | 루틴 생성·편집 | 상단 뒤로가기 · backLabel · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [RoutineForm.tsx:223](../../src/features/workout-online/RoutineForm.tsx#L223) | 소스 · 공통 헤더 뒤로가기 |
| B306 | 루틴 생성·편집 | 종목 선택 닫기 / + 웨이트 종목 추가 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineForm.tsx:261](../../src/features/workout-online/RoutineForm.tsx#L261) | 소스 · 전역 CSS 및 기능별 override |
| B307 | 루틴 생성·편집 | 종목 선택 닫기 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineForm.tsx:268](../../src/features/workout-online/RoutineForm.tsx#L268) | 소스 · 전역 CSS 및 기능별 override |
| B308 | 루틴 생성·편집 | 유산소 종목 선택 닫기 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineForm.tsx:278](../../src/features/workout-online/RoutineForm.tsx#L278) | 소스 · 전역 CSS 및 기능별 override |
| B309 | 루틴 생성·편집 | + 유산소 종목 추가 · Secondary | 48 | 353 | 10/15 | 999 | 353×48 | 개별 · [RoutineForm.tsx:291](../../src/features/workout-online/RoutineForm.tsx#L291) | 루틴 생성 393px · 전역 CSS 및 기능별 override |
| B310 | 루틴 생성·편집 | 제거한 종목 복원 · 접기·펼치기 | 44 | 353 | 10/4 | 0 | 353×44 | 개별 · [RoutineForm.tsx:293](../../src/features/workout-online/RoutineForm.tsx#L293) | 루틴 편집 393px · 네이티브 펼침/링크 |
| B311 | 루틴 생성·편집 | 복원 후보 조회 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [RoutineForm.tsx:295](../../src/features/workout-online/RoutineForm.tsx#L295) | 소스 · 전역 CSS 및 기능별 override |
| B312 | 루틴 생성·편집 | {p.exerciseName} 배치 복원 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineForm.tsx:296](../../src/features/workout-online/RoutineForm.tsx#L296) | 소스 · 전역 CSS 및 기능별 override |
| B313 | 루틴 생성·편집 | {p.plan.name} 배치 복원 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [RoutineForm.tsx:297](../../src/features/workout-online/RoutineForm.tsx#L297) | 소스 · 전역 CSS 및 기능별 override |
| B314 | 루틴 생성·편집 | 취소 · 취소·닫기 | 48 | 180.5 | 5/6 | 999 | 180.5×48 | 개별 · [RoutineForm.tsx:302](../../src/features/workout-online/RoutineForm.tsx#L302) | 루틴 생성 393px · 전역 CSS 및 기능별 override |
| B315 | 루틴 생성·편집 | {saveLabel} · Primary | ≥44 | 부모폭 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [RoutineForm.tsx:303](../../src/features/workout-online/RoutineForm.tsx#L303) | 소스 · disabled·pending·loading 분기 |
| B316 | 기록 상세·중량 검토 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [SavedWeightReview.tsx:63](../../src/features/workout-online/SavedWeightReview.tsx#L63) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B317 | 루틴 생성·편집·태그 | 루틴 태그 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [TagPicker.tsx:25](../../src/features/workout-online/TagPicker.tsx#L25) | 소스 · 전역 CSS 및 기능별 override |
| B318 | 루틴 생성·편집·태그 | 미지정 / 분류 태그 없이 루틴 이름 사용 · 기능 조작 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [TagPicker.tsx:26](../../src/features/workout-online/TagPicker.tsx#L26) | 소스 · 전역 CSS 및 기능별 override |
| B319 | 진행 운동 재개·잠금·복구 | 이 기기로 편집 가져오기 · Secondary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:70](../../src/features/workout-online/WorkoutWorkspace.tsx#L70) | 소스 · 전역 CSS 및 기능별 override |
| B320 | 진행 운동 재개·잠금·복구 | 시작 당시 계획 · 접기·펼치기 | 호출부 | 행/텍스트 | 호출부 | 호출부 | 행 또는 링크 | 개별 · [WorkoutWorkspace.tsx:77](../../src/features/workout-online/WorkoutWorkspace.tsx#L77) | 소스 · 네이티브 펼침/링크 |
| B321 | 진행 운동 재개·잠금·복구 | 서버에서 마지막 확인한 적용 계획·수행 · 접기·펼치기 | 호출부 | 행/텍스트 | 호출부 | 호출부 | 행 또는 링크 | 개별 · [WorkoutWorkspace.tsx:79](../../src/features/workout-online/WorkoutWorkspace.tsx#L79) | 소스 · 네이티브 펼침/링크 |
| B322 | 진행 운동 재개·잠금·복구 | 세션 상세 다시 확인 · Secondary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:84](../../src/features/workout-online/WorkoutWorkspace.tsx#L84) | 소스 · 전역 CSS 및 기능별 override |
| B323 | 설정·홈·기록·운동 요약 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:258](../../src/features/workout-online/WorkoutWorkspace.tsx#L258) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B324 | 설정·홈·기록·운동 요약 | 최신 일정 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:264](../../src/features/workout-online/WorkoutWorkspace.tsx#L264) | 소스 · disabled·pending·loading 분기 |
| B325 | 설정·홈·기록·운동 요약 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:265](../../src/features/workout-online/WorkoutWorkspace.tsx#L265) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B326 | 설정·홈·기록·운동 요약 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:267](../../src/features/workout-online/WorkoutWorkspace.tsx#L267) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B327 | 설정·홈·기록·운동 요약 | 주간 일정 편집 · Secondary | ≥44 | 부모폭 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:299](../../src/features/workout-online/WorkoutWorkspace.tsx#L299) | 소스 · 전역 CSS 및 기능별 override |
| B328 | 설정·홈·기록·운동 요약 | ‹ 루틴으로 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:309](../../src/features/workout-online/WorkoutWorkspace.tsx#L309) | 소스 · 전역 CSS 및 기능별 override |
| B329 | 설정·홈·기록·운동 요약 | 주간 일정 전체 편집 / 주간 일정 편집 · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:310](../../src/features/workout-online/WorkoutWorkspace.tsx#L310) | 소스 · 공통 헤더 뒤로가기 |
| B330 | 설정·홈·기록·운동 요약 | 상단 뒤로가기 · 루틴 · 뒤로가기 | 46 | 81.5 | 0/0 | 999 | 81.5×46 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:316](../../src/features/workout-online/WorkoutWorkspace.tsx#L316) | 루틴 메인 393px · 공통 헤더 뒤로가기 |
| B331 | 설정·홈·기록·운동 요약 | 확인 중 / 운동 시작 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:342](../../src/features/workout-online/WorkoutWorkspace.tsx#L342) | 소스 · disabled·pending·loading 분기 |
| B332 | 설정·홈·기록·운동 요약 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:344](../../src/features/workout-online/WorkoutWorkspace.tsx#L344) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B333 | 설정·홈·기록·운동 요약 | 운동 시작 · Primary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:346](../../src/features/workout-online/WorkoutWorkspace.tsx#L346) | 소스 · disabled·pending·loading 분기 |
| B334 | 설정·홈·기록·운동 요약 | 상단 뒤로가기 · 루틴 · 뒤로가기 | 46 | 81.5 | 0/0 | 999 | 81.5×46 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:360](../../src/features/workout-online/WorkoutWorkspace.tsx#L360) | 루틴 메인 393px · 공통 헤더 뒤로가기 |
| B335 | 설정·홈·기록·운동 요약 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:381](../../src/features/workout-online/WorkoutWorkspace.tsx#L381) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B336 | 설정·홈·기록·운동 요약 | 최신 버전 사용 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:384](../../src/features/workout-online/WorkoutWorkspace.tsx#L384) | 소스 · 전역 CSS 및 기능별 override |
| B337 | 설정·홈·기록·운동 요약 | 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:390](../../src/features/workout-online/WorkoutWorkspace.tsx#L390) | 소스 · 전역 CSS 및 기능별 override |
| B338 | 설정·홈·기록·운동 요약 | 저장 · Primary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:391](../../src/features/workout-online/WorkoutWorkspace.tsx#L391) | 소스 · 전역 CSS 및 기능별 override |
| B339 | 설정·홈·기록·운동 요약 | 취소 · 취소·닫기 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:398](../../src/features/workout-online/WorkoutWorkspace.tsx#L398) | 소스 · 전역 CSS 및 기능별 override |
| B340 | 설정·홈·기록·운동 요약 | 삭제 · 위험·경고 | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:399](../../src/features/workout-online/WorkoutWorkspace.tsx#L399) | 소스 · 전역 CSS 및 기능별 override |
| B341 | 루틴 메인·일정·홈 운동 진입 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:673](../../src/features/workout-online/WorkoutWorkspace.tsx#L673) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B342 | 루틴 메인·일정·홈 운동 진입 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:696](../../src/features/workout-online/WorkoutWorkspace.tsx#L696) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B343 | 루틴 메인·일정·홈 운동 진입 | RefreshButton · 다시 조회 | ≥44 | 콘텐츠 폭 | 0/12 | 조회 전용 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:708](../../src/features/workout-online/WorkoutWorkspace.tsx#L708) | 소스 · 아이콘·텍스트 간격 8px, 재조회·로딩 |
| B344 | 루틴 메인·일정·홈 운동 진입 | 상단 뒤로가기 · 이전 화면으로 · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:711](../../src/features/workout-online/WorkoutWorkspace.tsx#L711) | 소스 · 공통 헤더 뒤로가기 |
| B345 | 루틴 메인·일정·홈 운동 진입 | 세션 상세 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 11/16 | 999 | 외곽 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:712](../../src/features/workout-online/WorkoutWorkspace.tsx#L712) | 소스 · disabled·pending·loading 분기 |
| B346 | 루틴 메인·일정·홈 운동 진입 | 상단 뒤로가기 · 이전 화면으로 · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:714](../../src/features/workout-online/WorkoutWorkspace.tsx#L714) | 소스 · 공통 헤더 뒤로가기 |
| B347 | 루틴 메인·일정·홈 운동 진입 | 세션 상태·편집 기기 확인 · 접기·펼치기 | 호출부 | 행/텍스트 | 호출부 | 호출부 | 행 또는 링크 | 개별 · [WorkoutWorkspace.tsx:714](../../src/features/workout-online/WorkoutWorkspace.tsx#L714) | 소스 · 네이티브 펼침/링크 |
| B348 | 루틴 메인·일정·홈 운동 진입 | 상단 뒤로가기 · 운동 기록 요약 · 뒤로가기 | 44 | 44 | 0 | 10 | 44×44 | 공통/기능 재사용 · [WorkoutWorkspace.tsx:716](../../src/features/workout-online/WorkoutWorkspace.tsx#L716) | 소스 · 공통 헤더 뒤로가기 |
| B349 | 루틴 메인·일정·홈 운동 진입 | 같은 계정 인증 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:741](../../src/features/workout-online/WorkoutWorkspace.tsx#L741) | 소스 · 전역 CSS 및 기능별 override |
| B350 | 루틴 메인·일정·홈 운동 진입 | 로그인 상태 다시 확인 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [WorkoutWorkspace.tsx:742](../../src/features/workout-online/WorkoutWorkspace.tsx#L742) | 소스 · 전역 CSS 및 기능별 override |
| B351 | 설치·업데이트 | {summary} · 접기·펼치기 | 호출부 | 행/텍스트 | 호출부 | 호출부 | 행 또는 링크 | 개별 · [PwaStatus.tsx:14](../../src/pwa/PwaStatus.tsx#L14) | 소스 · 네이티브 펼침/링크 |
| B352 | 설치·업데이트 | Overload 설치 · Secondary | ≥44 | 콘텐츠/부모 | 10/15 | 999 기본 | 외곽 | 개별 · [PwaStatus.tsx:16](../../src/pwa/PwaStatus.tsx#L16) | 소스 · 전역 CSS 및 기능별 override |
| B353 | 설치·업데이트 | 업데이트 확인 · 보조·아이콘 | ≥44 | 콘텐츠/부모 | 10/15 | 10 기본 | 외곽 | 개별 · [PwaStatus.tsx:20](../../src/pwa/PwaStatus.tsx#L20) | 소스 · 전역 CSS 및 기능별 override |

## 3. 전체 입력 사용처 조사표

텍스트·검색·메모·숫자·선택·토글·달력과 보조 입력을 포함했다. 루틴 태그는 제공된 태그 1개를 선택한다. 인증 이메일과 6자리 코드는 각각 이메일 폼과 코드 폼이다. 휴식의 시작·끝 값, 기록·카드의 수치, 복구 원본, 추천 표시와 운동 타이머는 표시값으로 다룬다. 날짜와 기간은 날짜 셀·이전/다음·분할 선택으로 제공된다. 생산 경로에서 네이티브 `type=number/date/time`는 발견되지 않았다. 문자열을 받는 텍스트 필드와 `inputMode`, 네이티브 `select`, 라디오·체크박스·볼륨 range를 사용한다. [태그 정의](../../src/features/workout-online/TagPicker.tsx) · [날짜·기간](../../src/features/statistics/PeriodControls.tsx)

| 번호 | 화면 | 입력 항목 | 입력 유형 | 외형 규격 | 조작 방식 | 재사용·소스 | 근거·예외 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I001 | 공통 숫자 휠 | {label} ( {unit} ) | 텍스트 | 최소 48px · 10/12px · 10px 기본 | 텍스트 · unit === 'kg' ? 'decimal' : 'numeric' | 공통/기능 재사용 · [NumberWheel.tsx:113](../../src/components/NumberWheel.tsx#L113) | 소스 · 기능별 입력 검증 |
| I002 | 공통 숫자 휠 | {choice} {unit} | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 공통/기능 재사용 · [NumberWheel.tsx:137](../../src/components/NumberWheel.tsx#L137) | 소스 · 선택 상태 |
| I003 | 공통 검색·선택 목록 | 검색 범위 | 선택 | 48px 기본, 화면 CSS 우선 | 네이티브 선택 | 공통/기능 재사용 · [SearchList.tsx:50](../../src/components/SearchList.tsx#L50) | 소스 · 옵션 동적 |
| I004 | 공통 검색·선택 목록 | {label} | 텍스트 | 42px · 8px · 10px 기본, 화면 override | 검색 입력·결과 선택·지우기 | 공통/기능 재사용 · [SearchList.tsx:51](../../src/components/SearchList.tsx#L51) | 소스 · 결과와 범위는 호출부 |
| I005 | 공통 검색·선택 목록 | {tag.name} | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 공통/기능 재사용 · [SearchList.tsx:56](../../src/components/SearchList.tsx#L56) | 소스 · 선택 상태 |
| I006 | 계정 관리·재인증 | 6자리 인증코드 | 숫자 텍스트 | 327×65.5 · 10px/12px · r10px | 텍스트 · numeric · text | 개별 · [AccountSettings.tsx:88](../../src/features/auth/AccountSettings.tsx#L88) | 재인증 코드 입력 393px · 기능별 입력 검증 |
| I007 | 인증·로그인 | 인증코드 | 숫자 텍스트 | 327×65.5 · 10px/12px · r10px | 텍스트 · numeric · text | 개별 · [LoginScreens.tsx:21](../../src/features/auth/LoginScreens.tsx#L21) | 로그인 OTP 393px · 기능별 입력 검증 |
| I008 | 인증·로그인 | 이메일 주소 | 이메일 | 353×48 · 10px/12px · r10px | 텍스트 · email · email | 개별 · [LoginScreens.tsx:34](../../src/features/auth/LoginScreens.tsx#L34) | 로그인 이메일 393px · 이메일 유효성 |
| I009 | 최근 기록·전체 운동 이력 | SearchList | 검색·선택 | 42px · 8px · 10px 기본, 화면 override | 검색 입력·결과 선택·지우기 | 공통/기능 재사용 · [RecordFeed.tsx:130](../../src/features/history/RecordFeed.tsx#L130) | 소스 · 결과와 범위는 호출부 |
| I010 | 홈·오늘의 루틴 | 오늘만 다른 루틴 선택 | 이산 선택 | 연결형 트리거·패널 CSS | 열기·목록 선택·Escape | 공통/기능 재사용 · [HomePanel.tsx:320](../../src/features/home/HomePanel.tsx#L320) | 소스 · 홈만 실사용 |
| I011 | 홈·오늘의 루틴 | 전체 | 이산 선택 | 50×44 · 1.5px/0px · r999px | 이산 선택 | 개별 · [HomePanel.tsx:322](../../src/features/home/HomePanel.tsx#L322) | 홈 루틴 드롭다운 393px · 선택 상태 |
| I012 | 홈·오늘의 루틴 | 미배정 | 이산 선택 | 50×44 · 1.5px/0px · r999px | 이산 선택 | 개별 · [HomePanel.tsx:323](../../src/features/home/HomePanel.tsx#L323) | 홈 루틴 드롭다운 393px · 선택 상태 |
| I013 | 홈·오늘의 루틴 | presetNumber(index) + '번 일정 · ' + preset.name | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [HomePanel.tsx:324](../../src/features/home/HomePanel.tsx#L324) | 소스 · 선택 상태 |
| I014 | 홈·오늘의 루틴 | 휴식 | 이산 선택 | 50×44 · 1.5px/0px · r999px | 이산 선택 | 개별 · [HomePanel.tsx:325](../../src/features/home/HomePanel.tsx#L325) | 홈 루틴 드롭다운 393px · 선택 상태 |
| I015 | 홈·오늘의 루틴 | 휴식 오늘은 운동하지 않고 쉬어갑니다. | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [HomePanel.tsx:328](../../src/features/home/HomePanel.tsx#L328) | 소스 · 선택 상태 |
| I016 | 홈·오늘의 루틴 | 구성 조회 실패 | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [HomePanel.tsx:340](../../src/features/home/HomePanel.tsx#L340) | 소스 · 선택 상태 |
| I017 | 홈·오늘의 루틴 | ${date} ${weekdays[index]} ${planned?.plan?.name ?? ''} ${state.label} | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [HomePanel.tsx:357](../../src/features/home/HomePanel.tsx#L357) | 소스 · 선택 상태 |
| I018 | 휴식 타이머 알림 | 화면 어둡게 | 이산 선택 | 56×44 · 2px/2px · r10px | 스위치 | 공통/기능 재사용 · [RestAlertSettings.tsx:178](../../src/features/settings/RestAlertSettings.tsx#L178) | 휴식 타이머 알림 393px · 선택 상태 |
| I019 | 휴식 타이머 알림 | 화면 깜빡임 | 이산 선택 | 56×44 · 2px/2px · r10px | 스위치 | 공통/기능 재사용 · [RestAlertSettings.tsx:181](../../src/features/settings/RestAlertSettings.tsx#L181) | 휴식 타이머 알림 393px · 선택 상태 |
| I020 | 휴식 타이머 알림 | LocationChoice | 이산 선택 | 버튼/행 규격 참조 | 스위치 | 공통/기능 재사용 · [RestAlertSettings.tsx:187](../../src/features/settings/RestAlertSettings.tsx#L187) | 소스 · 선택 상태 |
| I021 | 휴식 타이머 알림 | LocationChoice | 이산 선택 | 버튼/행 규격 참조 | 스위치 | 공통/기능 재사용 · [RestAlertSettings.tsx:188](../../src/features/settings/RestAlertSettings.tsx#L188) | 소스 · 선택 상태 |
| I022 | 휴식 타이머 알림 | 깜빡임 시작 시점 | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 공통/기능 재사용 · [RestAlertSettings.tsx:191](../../src/features/settings/RestAlertSettings.tsx#L191) | 소스 · 선택 상태 |
| I023 | 휴식 타이머 알림 | 효과음 | 이산 선택 | 56×44 · 2px/2px · r10px | 스위치 | 공통/기능 재사용 · [RestAlertSettings.tsx:194](../../src/features/settings/RestAlertSettings.tsx#L194) | 휴식 타이머 알림 393px · 선택 상태 |
| I024 | 휴식 타이머 알림 | 효과음 볼륨 | 슬라이더 | 285×36 · 0px/0px · r5px | 포인터·키보드 range | 개별 · [RestAlertSettings.tsx:199](../../src/features/settings/RestAlertSettings.tsx#L199) | 휴식 타이머 알림 393px · 0~100%, 5% |
| I025 | 휴식 타이머 알림 | 중간 알림음 | 이산 선택 | 56×44 · 2px/2px · r10px | 스위치 | 공통/기능 재사용 · [RestAlertSettings.tsx:205](../../src/features/settings/RestAlertSettings.tsx#L205) | 휴식 타이머 알림 393px · 선택 상태 |
| I026 | 휴식 타이머 알림 | 휴식 종료 몇 초 전에 알릴까요? | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 공통/기능 재사용 · [RestAlertSettings.tsx:207](../../src/features/settings/RestAlertSettings.tsx#L207) | 소스 · 선택 상태 |
| I027 | 휴식 타이머 알림 | 휴식 테스트 | 이산 선택 | 56×44 · 2px/2px · r10px | 스위치 | 공통/기능 재사용 · [RestAlertSettings.tsx:210](../../src/features/settings/RestAlertSettings.tsx#L210) | 휴식 타이머 알림 393px · 선택 상태 |
| I028 | 휴식 설정 | 구간 시작 세트 | 텍스트 | 36px · 0/4px · 캡슐 | 읽기 전용 | 개별 · [RestSettings.tsx:131](../../src/features/settings/RestSettings.tsx#L131) | 소스 · 입력 집계에서 표시값으로 구분 |
| I029 | 휴식 설정 | 구간 끝 세트 | 텍스트 | 36px · 0/4px · 캡슐 | 읽기 전용 | 개별 · [RestSettings.tsx:133](../../src/features/settings/RestSettings.tsx#L133) | 소스 · 입력 집계에서 표시값으로 구분 |
| I030 | 휴식 설정 | 1~10회 · 11~12회 · 13회 이상 휴식(초) | 숫자 텍스트 | 36px · 0/4px · 캡슐 | 읽기 전용 | 개별 · [RestSettings.tsx:134](../../src/features/settings/RestSettings.tsx#L134) | 소스 · 입력 집계에서 표시값으로 구분 |
| I031 | 설정 메인 | 유산소 거리 자동 추정 | 이산 선택 | 327×64 · 0px/0px · r0px | 스위치 | 개별 · [SettingsMain.tsx:53](../../src/features/settings/SettingsMain.tsx#L53) | 설정 393px · 선택 상태 |
| I032 | 성장 추적 | 전체 / 개월 | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 공통/기능 재사용 · [GrowthPanel.tsx:31](../../src/features/statistics/GrowthPanel.tsx#L31) | 소스 · 선택 상태 |
| I033 | 성장 추적 | 과거 운동 검색 | 검색·선택 | 279×42 · 8px/12px · r999px | 검색 입력·결과 선택·지우기 | 공통/기능 재사용 · [GrowthPanel.tsx:127](../../src/features/statistics/GrowthPanel.tsx#L127) | 성장 추적 393px · 결과와 범위는 호출부 |
| I034 | 성장 추적 | 추적할 루틴 배치 {조건별 표시} | 선택 | 48px 기본, 화면 CSS 우선 | 네이티브 선택 | 개별 · [GrowthPanel.tsx:211](../../src/features/statistics/GrowthPanel.tsx#L211) | 소스 · 옵션 동적 |
| I035 | 주간 근육 계획·통계 | 분석 대상 프리셋 {presets.map(p =&gt; &lt;option key={p.id} value={p.id}&gt;{p.name}&lt;/option&gt;)} | 선택 | 327×44 · 8px/30px · r10px | 네이티브 선택 | 개별 · [MuscleAnalysis.tsx:44](../../src/features/statistics/MuscleAnalysis.tsx#L44) | 근육별 운동 계획 393px · 옵션 동적 |
| I036 | 주간 근육 계획·통계 | 분류별 | 이산 선택 | 157.5×40 · 8px/4px · r7px | 이산 선택 | 공통/기능 재사용 · [MuscleAnalysis.tsx:46](../../src/features/statistics/MuscleAnalysis.tsx#L46) | 근육별 운동 계획 393px · 선택 상태 |
| I037 | 주간 근육 계획·통계 | 근육별 | 이산 선택 | 157.5×40 · 8px/4px · r7px | 이산 선택 | 공통/기능 재사용 · [MuscleAnalysis.tsx:47](../../src/features/statistics/MuscleAnalysis.tsx#L47) | 근육별 운동 계획 393px · 선택 상태 |
| I038 | 주간 근육 계획·통계 | 0세트 포함 | 이산 선택 | 40×44 · 0px/3px · r99px | 스위치 | 개별 · [MuscleAnalysis.tsx:56](../../src/features/statistics/MuscleAnalysis.tsx#L56) | 근육별 운동 계획 393px · 선택 상태 |
| I039 | 주간 근육 계획·통계 | 분류별 | 이산 선택 | 157.5×40 · 8px/4px · r7px | 이산 선택 | 공통/기능 재사용 · [MuscleAnalysis.tsx:79](../../src/features/statistics/MuscleAnalysis.tsx#L79) | 근육별 운동 계획 393px · 선택 상태 |
| I040 | 주간 근육 계획·통계 | 근육별 | 이산 선택 | 157.5×40 · 8px/4px · r7px | 이산 선택 | 공통/기능 재사용 · [MuscleAnalysis.tsx:79](../../src/features/statistics/MuscleAnalysis.tsx#L79) | 근육별 운동 계획 393px · 선택 상태 |
| I041 | 주간 근육 계획·통계 | 세트 | 이산 선택 | 157.5×40 · 8px/4px · r7px | 이산 선택 | 공통/기능 재사용 · [MuscleAnalysis.tsx:80](../../src/features/statistics/MuscleAnalysis.tsx#L80) | 주간 근육 통계 393px · 선택 상태 |
| I042 | 주간 근육 계획·통계 | 총중량 | 이산 선택 | 157.5×40 · 8px/4px · r7px | 이산 선택 | 공통/기능 재사용 · [MuscleAnalysis.tsx:80](../../src/features/statistics/MuscleAnalysis.tsx#L80) | 주간 근육 통계 393px · 선택 상태 |
| I043 | 운동 현황·전체 이력 기간 | 주간 / 월간 | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [PeriodControls.tsx:34](../../src/features/statistics/PeriodControls.tsx#L34) | 소스 · 선택 상태 |
| I044 | 운동 현황·전체 이력 기간 | day | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [PeriodControls.tsx:42](../../src/features/statistics/PeriodControls.tsx#L42) | 소스 · 선택 상태 |
| I045 | 기록 메인·운동 현황 | 세트 | 이산 선택 | 157.5×40 · 8px/4px · r7px | 이산 선택 | 공통/기능 재사용 · [StatisticsPanel.tsx:164](../../src/features/statistics/StatisticsPanel.tsx#L164) | 운동 현황 393px · 선택 상태 |
| I046 | 기록 메인·운동 현황 | 총중량 | 이산 선택 | 157.5×40 · 8px/4px · r7px | 이산 선택 | 공통/기능 재사용 · [StatisticsPanel.tsx:164](../../src/features/statistics/StatisticsPanel.tsx#L164) | 운동 현황 393px · 선택 상태 |
| I047 | 기록 메인·운동 현황 | 운동·분류·근육 검색 | 검색·선택 | 189×42 · 8px/12px · r999px | 검색 입력·결과 선택·지우기 | 공통/기능 재사용 · [StatisticsPanel.tsx:165](../../src/features/statistics/StatisticsPanel.tsx#L165) | 운동 현황 393px · 결과와 범위는 호출부 |
| I048 | 주간 일정 배정·편집 | 배정 완료 / 배정 미완료 / 배정 유무 | 이산 선택 | 113.7×44 · 6px/3px · r999px | 이산 선택 | 개별 · [WeeklySchedulePanel.tsx:53](../../src/features/statistics/WeeklySchedulePanel.tsx#L53) | 주간 일정 편집 393px · 열림 상태 |
| I049 | 주간 일정 배정·편집 | {label} | 이산 선택 | 113.7×44 · 6px/3px · r999px | 이산 선택 | 개별 · [WeeklySchedulePanel.tsx:54](../../src/features/statistics/WeeklySchedulePanel.tsx#L54) | 주간 일정 편집 393px · 선택 상태 |
| I050 | 주간 일정 배정·편집 | 태그 | 이산 선택 | 113.7×44 · 6px/3px · r999px | 이산 선택 | 개별 · [WeeklySchedulePanel.tsx:57](../../src/features/statistics/WeeklySchedulePanel.tsx#L57) | 주간 일정 편집 393px · 열림 상태 |
| I051 | 주간 일정 배정·편집 | {tag} | 이산 선택 | 113.7×44 · 6px/3px · r999px | 이산 선택 | 개별 · [WeeklySchedulePanel.tsx:58](../../src/features/statistics/WeeklySchedulePanel.tsx#L58) | 주간 일정 편집 393px · 선택 상태 |
| I052 | 주간 일정 배정·편집 | 전체 보기 | 이산 선택 | 113.7×44 · 6px/3px · r999px | 이산 선택 | 개별 · [WeeklySchedulePanel.tsx:60](../../src/features/statistics/WeeklySchedulePanel.tsx#L60) | 주간 일정 편집 393px · 선택 상태 |
| I053 | 주간 일정 배정·편집 | ${name}요일 루틴 | 선택 | 48px 기본, 화면 CSS 우선 | 네이티브 선택 | 개별 · [WeeklySchedulePanel.tsx:64](../../src/features/statistics/WeeklySchedulePanel.tsx#L64) | 소스 · 옵션 동적 |
| I054 | 주간 일정 배정·편집 | 편집할 주간 일정 | 선택 | 353×45 · 10px/12px · r10px | 네이티브 선택 | 개별 · [WeeklySchedulePanel.tsx:100](../../src/features/statistics/WeeklySchedulePanel.tsx#L100) | 주간 일정 편집 393px · 옵션 동적 |
| I055 | 유산소 진행·완료 검토 | setSeconds | 숫자 휠 | 휠 버튼 그리드, 44px 이상 또는 화면 override | 중앙 → 휠/직접 입력, +/−는 필드별 | 공통/기능 재사용 · [CardioFocus.tsx:60](../../src/features/workout-flow/CardioFocus.tsx#L60) | 소스 · 숫자 전용 표 |
| I056 | 웨이트 진행·종목/세트 편집 | label | 숫자 휠 | 휠 버튼 그리드, 44px 이상 또는 화면 override | 중앙 → 휠/직접 입력, +/−는 필드별 | 공통/기능 재사용 · [WeightFocus.tsx:30](../../src/features/workout-flow/WeightFocus.tsx#L30) | 소스 · 숫자 전용 표 |
| I057 | 웨이트 진행·종목/세트 편집 | ${ordinal}세트 이번 반복 횟수 | 숫자 휠 | 휠 버튼 그리드, 44px 이상 또는 화면 override | 중앙 → 휠/직접 입력, +/−는 필드별 | 공통/기능 재사용 · [WeightFocus.tsx:105](../../src/features/workout-flow/WeightFocus.tsx#L105) | 소스 · 숫자 전용 표 |
| I058 | 웨이트 진행·종목/세트 편집 | ${ordinal}세트 추가 중량 kg | 숫자 휠 | 휠 버튼 그리드, 44px 이상 또는 화면 override | 중앙 → 휠/직접 입력, +/−는 필드별 | 공통/기능 재사용 · [WeightFocus.tsx:111](../../src/features/workout-flow/WeightFocus.tsx#L111) | 소스 · 숫자 전용 표 |
| I059 | 웨이트 진행·종목/세트 편집 | 완료 취소 / 완료 | 이산 선택 | 네이티브 또는 44px 원형 컨트롤 | 체크/라디오·행 선택 | 공통/기능 재사용 · [WeightFocus.tsx:115](../../src/features/workout-flow/WeightFocus.tsx#L115) | 소스 · 완료/승인/복구 |
| I060 | 종료 요약·중량 검토 | weight.name + ' 승인 선택' | 이산 선택 | 네이티브 또는 44px 원형 컨트롤 | 체크/라디오·행 선택 | 공통/기능 재사용 · [WeightReview.tsx:96](../../src/features/workout-flow/WeightReview.tsx#L96) | 소스 · 완료/승인/복구 |
| I061 | 종료 요약·중량 검토 | 승인 예정 중량 | 숫자 휠 | 휠 버튼 그리드, 44px 이상 또는 화면 override | 중앙 → 휠/직접 입력, +/−는 필드별 | 공통/기능 재사용 · [WeightReview.tsx:126](../../src/features/workout-flow/WeightReview.tsx#L126) | 소스 · 숫자 전용 표 |
| I062 | 운동 중 기능형 Dialog | 변경 중량 | 숫자 휠 | 104×48 · 0px/2px · r10px | 중앙 → 휠/직접 입력, +/−는 필드별 | 공통/기능 재사용 · [WorkoutDialogs.tsx:44](../../src/features/workout-flow/WorkoutDialogs.tsx#L44) | 중량 변경 393px · 숫자 전용 표 |
| I063 | 운동 중 기능형 Dialog | 오늘만 변경 이번 운동에 적용하며 기준 기록에서 제외합니다. | 라디오·체크 | 24×24 · 0px/0px · r50% | 체크/라디오·행 선택 | 개별 · [WorkoutDialogs.tsx:47](../../src/features/workout-flow/WorkoutDialogs.tsx#L47) | 중량 변경 393px · 완료/승인/복구 |
| I064 | 운동 중 기능형 Dialog | 다음 정상 운동에 적용하는 승인 흐름을 시연합니다. / 일반 운동의 원본 루틴 종목에서 사용할 수 있습니다. | 라디오·체크 | 24×24 · 0px/0px · r50% | 체크/라디오·행 선택 | 개별 · [WorkoutDialogs.tsx:49](../../src/features/workout-flow/WorkoutDialogs.tsx#L49) | 중량 변경 393px · 완료/승인/복구 |
| I065 | 운동 중 공식 승인·충돌 해결 | 지금 다시 승인할 중량 kg | 숫자 텍스트 | 최소 48px · 10/12px · 10px 기본 | 텍스트 · decimal | 개별 · [ApprovalControls.tsx:44](../../src/features/workout-local/ApprovalControls.tsx#L44) | 소스 · 기능별 입력 검증 |
| I066 | 유산소 완료·유산소 기록 정정 | 실제 거리 (km) | 숫자 | 159.5×38 · 6px/9px · r5px | 텍스트 소수 | 공통/기능 재사용 · [CardioActualFields.tsx:15](../../src/features/workout-online/CardioActualFields.tsx#L15) | 유산소 진행 393px · 미입력/계산/실측은 도메인별 |
| I067 | 유산소 완료·유산소 기록 정정 | 실제 평균 속도 (km/h) | 숫자 | 159.5×38 · 6px/9px · r5px | 텍스트 소수 | 공통/기능 재사용 · [CardioActualFields.tsx:17](../../src/features/workout-online/CardioActualFields.tsx#L17) | 유산소 진행 393px · 미입력/계산/실측은 도메인별 |
| I068 | 유산소 완료·유산소 기록 정정 | 평균 심박수 (BPM) | 숫자 | 159.5×38 · 6px/9px · r5px | 텍스트 숫자 | 공통/기능 재사용 · [CardioActualFields.tsx:20](../../src/features/workout-online/CardioActualFields.tsx#L20) | 유산소 진행 393px · 미입력/계산/실측은 도메인별 |
| I069 | 루틴·운동 중 유산소 계획 | 목표 시간 (분) | 숫자 | 159.5×44 · 8px/8px · r8px | 텍스트 소수 | 공통/기능 재사용 · [CardioPlanFields.tsx:25](../../src/features/workout-online/CardioPlanFields.tsx#L25) | 루틴 편집 393px · 미입력/계산/실측은 도메인별 |
| I070 | 루틴·운동 중 유산소 계획 | 목표 거리 (km) | 숫자 | 159.5×44 · 8px/8px · r8px | 텍스트 소수 | 공통/기능 재사용 · [CardioPlanFields.tsx:26](../../src/features/workout-online/CardioPlanFields.tsx#L26) | 루틴 편집 393px · 미입력/계산/실측은 도메인별 |
| I071 | 루틴·운동 중 유산소 계획 | 강도 단위 속도 (km/h) 페이스 (분/km) | 선택 | 159.5×45.4 · 8px/8px · r8px | 네이티브 선택 | 개별 · [CardioPlanFields.tsx:31](../../src/features/workout-online/CardioPlanFields.tsx#L31) | 루틴 편집 393px · 옵션 동적 |
| I072 | 루틴·운동 중 유산소 계획 | 목표 페이스 (분/km) / 목표 속도 (km/h) | 숫자 | 최소 44px · 8px · 8px | 텍스트 소수 | 공통/기능 재사용 · [CardioPlanFields.tsx:34](../../src/features/workout-online/CardioPlanFields.tsx#L34) | 소스 · 미입력/계산/실측은 도메인별 |
| I073 | 루틴·운동 중 유산소 계획 | 목표 경사도 (%) | 숫자 | 159.5×44 · 8px/8px · r8px | 텍스트 소수 | 공통/기능 재사용 · [CardioPlanFields.tsx:37](../../src/features/workout-online/CardioPlanFields.tsx#L37) | 루틴 편집 393px · 미입력/계산/실측은 도메인별 |
| I074 | 루틴·운동 중 유산소 계획 | 목표 저항 | 숫자 | 최소 44px · 8px · 8px | 텍스트 소수 | 공통/기능 재사용 · [CardioPlanFields.tsx:38](../../src/features/workout-online/CardioPlanFields.tsx#L38) | 소스 · 미입력/계산/실측은 도메인별 |
| I075 | 루틴·진행 유산소 종목 검색 | 유산소 검색 · 이름 또는 별칭 | 검색·선택 | 42px · 8px · 10px 기본, 화면 override | 검색 입력·결과 선택·지우기 | 공통/기능 재사용 · [CardioSearch.tsx:21](../../src/features/workout-online/CardioSearch.tsx#L21) | 소스 · 결과와 범위는 호출부 |
| I076 | 기록 상세·종료 후 공식 재승인 | 지금 재승인할 중량 kg | 숫자 텍스트 | 최소 48px · 10/12px · 10px 기본 | 텍스트 · decimal | 개별 · [ClosedWorkout.tsx:293](../../src/features/workout-online/ClosedWorkout.tsx#L293) | 소스 · 기능별 입력 검증 |
| I077 | 기록 정정 | 실제 중량 kg | 숫자 텍스트 | 311×48 · 10px/12px · r10px | 텍스트 · decimal | 개별 · [ClosedWorkout.tsx:352](../../src/features/workout-online/ClosedWorkout.tsx#L352) | 세트 정정 393px · 기능별 입력 검증 |
| I078 | 기록 정정 | 실제 반복 횟수 | 숫자 텍스트 | 311×48 · 10px/12px · r10px | 텍스트 · numeric | 개별 · [ClosedWorkout.tsx:352](../../src/features/workout-online/ClosedWorkout.tsx#L352) | 세트 정정 393px · 기능별 입력 검증 |
| I079 | 기록 정정 | 추가 중량 kg · 선택 | 숫자 텍스트 | 최소 48px · 10/12px · 10px 기본 | 텍스트 · decimal | 개별 · [ClosedWorkout.tsx:352](../../src/features/workout-online/ClosedWorkout.tsx#L352) | 소스 · 기능별 입력 검증 |
| I080 | 기록 정정 | 활동 시간 정정 | 라디오·체크 | 20×24 · 0px/0px · r0px | 체크/라디오·행 선택 | 개별 · [ClosedWorkout.tsx:355](../../src/features/workout-online/ClosedWorkout.tsx#L355) | 유산소 기록 정정 393px · 완료/승인/복구 |
| I081 | 기록 정정 | value =&gt; { setSeconds(value); setIssue('') } | 숫자 휠 | 휠 버튼 그리드, 44px 이상 또는 화면 override | 중앙 → 휠/직접 입력, +/−는 필드별 | 공통/기능 재사용 · [ClosedWorkout.tsx:356](../../src/features/workout-online/ClosedWorkout.tsx#L356) | 소스 · 숫자 전용 표 |
| I082 | 누락 수행 복구 | 세트 | 라디오·체크 | 네이티브 또는 44px 원형 컨트롤 | 체크/라디오·행 선택 | 개별 · [ClosedWorkout.tsx:383](../../src/features/workout-online/ClosedWorkout.tsx#L383) | 소스 · 완료/승인/복구 |
| I083 | 누락 수행 복구 | 보관된 운동 기록 {initial.copies.map((c,i)=&gt;&lt;option value={i} key={i}&gt;{time(c.startedAt)} · {c.snapshot.performedSets.length}세트&lt;/option&gt;)} | 선택 | 311×48 · 10px/12px · r10px | 네이티브 선택 | 개별 · [ClosedWorkout.tsx:389](../../src/features/workout-online/ClosedWorkout.tsx#L389) | 누락 수행 복구 393px · 옵션 동적 |
| I084 | 루틴 상세·편집·웨이트 진행 메모 | 기구 세팅 메모 | 메모 | 327×69.2 · 8px/8px · r8px | 멀티라인 텍스트 | 개별 · [CombinationMemo.tsx:26](../../src/features/workout-online/CombinationMemo.tsx#L26) | 루틴 편집 393px · 기구 조합별 메모 |
| I085 | 루틴·운동 편집·기록 정정 장비 | 제조사 · 선택 미지정 {조건별 표시} {manufacturers.map(m =&gt; &lt;option key={m.id} value={m.id}&gt;{m.name}&lt;/option&gt;)} | 선택 | 루틴 종목 8px 패딩·8px 반경, 상위 폼 의존 | 네이티브 선택 | 개별 · [EquipmentFields.tsx:10](../../src/features/workout-online/EquipmentFields.tsx#L10) | 소스 · 옵션 동적 |
| I086 | 루틴·운동 편집·기록 정정 장비 | 부하 방식 · 선택 미지정 {Object.entries(LOAD_LABELS).map(([code, label]) =&gt; &lt;option key={code} value={code}&gt;{label}&lt;/option&gt;)} | 선택 | 루틴 종목 8px 패딩·8px 반경, 상위 폼 의존 | 네이티브 선택 | 개별 · [EquipmentFields.tsx:15](../../src/features/workout-online/EquipmentFields.tsx#L15) | 소스 · 옵션 동적 |
| I087 | 루틴·진행 웨이트 종목 검색 | 표준 운동 검색 · 이름 또는 별칭 | 검색·선택 | 42px · 8px · 10px 기본, 화면 override | 검색 입력·결과 선택·지우기 | 공통/기능 재사용 · [ExerciseSearch.tsx:22](../../src/features/workout-online/ExerciseSearch.tsx#L22) | 소스 · 결과와 범위는 호출부 |
| I088 | 루틴 메인·일정 프리셋 | 자동 순환 | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [PresetControls.tsx:32](../../src/features/workout-online/PresetControls.tsx#L32) | 소스 · 선택 상태 |
| I089 | 루틴 메인·일정 프리셋 | (index + 1) + '번 프리셋 보기' | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [PresetControls.tsx:64](../../src/features/workout-online/PresetControls.tsx#L64) | 소스 · 선택 상태 |
| I090 | 루틴 메인·저장된 루틴 | 가로 일정 보기 / 세로 일정 보기 | 이산 선택 | 44×44 · 0px/0px · r10px | 이산 선택 | 개별 · [RoutineCards.tsx:71](../../src/features/workout-online/RoutineCards.tsx#L71) | 루틴 메인 393px · 선택 상태 |
| I091 | 루틴 메인·저장된 루틴 | [${name}요일,r?.tag,dayLabel(i + 1),counts].filter(Boolean).join(' · ') | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [RoutineCards.tsx:89](../../src/features/workout-online/RoutineCards.tsx#L89) | 소스 · 선택 상태 |
| I092 | 루틴 메인·저장된 루틴 | [${name}요일, r?.tag, dayLabel(i + 1)].filter(Boolean).join(' · ') | 이산 선택 | 버튼/행 규격 참조 | 이산 선택 | 개별 · [RoutineCards.tsx:95](../../src/features/workout-online/RoutineCards.tsx#L95) | 소스 · 선택 상태 |
| I093 | 루틴 메인·저장된 루틴 | 저장된 루틴 필터 | 선택 | 132×44 · 6px/6px · r10px | 네이티브 선택 | 개별 · [RoutineCards.tsx:105](../../src/features/workout-online/RoutineCards.tsx#L105) | 루틴 메인 393px · 옵션 동적 |
| I094 | 루틴 생성·편집 | 루틴 이름 | 텍스트 | 327×44 · 10px/12px · r10px | 텍스트 | 개별 · [RoutineForm.tsx:227](../../src/features/workout-online/RoutineForm.tsx#L227) | 루틴 생성 393px · 기능별 입력 검증 |
| I095 | 루틴 생성·편집 | 본세트 · 최소 반복 · 최대 반복 | 숫자 텍스트 | 103.7×44 · 8px/8px · r8px | 숫자 키보드 힌트 | 개별 · [RoutineForm.tsx:242](../../src/features/workout-online/RoutineForm.tsx#L242) | 루틴 편집 393px · 필드별 검증 |
| I096 | 루틴 생성·편집 | 설정 중량 | 숫자 휠 | 140×48 · 4px/4px · r10px | 중앙 → 휠/직접 입력, +/−는 필드별 | 공통/기능 재사용 · [RoutineForm.tsx:245](../../src/features/workout-online/RoutineForm.tsx#L245) | 루틴 편집 393px · 숫자 전용 표 |
| I097 | 설정·홈·기록·운동 요약 | 일정 이름 | 텍스트 | 311×48 · 10px/12px · r10px | 텍스트 · text | 개별 · [WorkoutWorkspace.tsx:376](../../src/features/workout-online/WorkoutWorkspace.tsx#L376) | 일정 이름 바꾸기 393px · 기능별 입력 검증 |

## 4. 숫자 휠 전용 조사표

### 집계와 범위

같은 작업에서 같은 JSX를 재사용하는 일반·디로딩 웨이트 화면과 루틴 생성·편집의 공용 목표 필드는 중복 합산하지 않았다. 설정 중량은 최초값과 승인 변경이 같은 입력을 공유하지만 저장 의미가 달라 표에서 각각 집계했다. 3개 휴식 구간과 시·분·초는 서로 다른 값이므로 각각 집계했다. 유산소 계획의 속도·페이스는 같은 필드의 선택 모드지만 단위·검증이 달라 각각 집계했다. 앱의 숫자 입력과 숫자로 표시되는 선택·상대 조작은 아래에 따로 집계했다.

- `정수`의 공통 제출 범위는 1~2,147,483,647이다. `kg/소수` 공통 문법은 비음수, 정수부 최대 14자리·소수부 최대 6자리다. 화면별 선택값·공란·양의 값 요구 및 추가 검증을 우선한다. 천 단위 표기나 소수 반올림으로 저장 계약을 바꾸지 않는다. [유효성 검증](../../src/features/workout-online/validation.ts#L92) · [완료 입력 검증](../../src/features/workout-local/completion-input.ts#L14)
- `계획 6종`의 두 배치는 루틴 폼과 운동 중 유산소 계획 Dialog다. 지원 종목의 옵션에 따라 거리·강도·경사·저항이 나타난다. [계획 입력](../../src/features/workout-online/CardioPlanFields.tsx) · [계획 검증](../../src/features/workout-online/cardio-draft.ts)
- 실제 속도는 사용자 입력과 시간·거리에서 계산한 표시를 함께 다룬다. 실제 거리에는 직접·예상·계산·출처 미확인 상태가 있고 휴대기기의 자동 추정 설정을 따른다. 기록 정정의 활동 시간 미변경과 저장 시 정밀도를 구분한다. [실제 측정 입력](../../src/features/workout-online/CardioActualFields.tsx) · [실제 측정 처리](../../src/features/workout-online/cardio-measurement.ts) · [기록 정정](../../src/features/workout-online/ClosedWorkout.tsx#L314)

### 값 편집 · 휠 12개, 미적용 32개

| 번호 | 화면 | 입력 항목 | 현재 방식 | 범위·단위 | 정밀도·간격 | 휠 | 5-2 후보 및 이유 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| N01 | 루틴 생성·신규 종목 | 최초 설정 중량 | ± 및 중앙 휠, 휠 안 직접 입력 | kg/소수, 저장 조건 별도 | 외부 PLATE/STACK 2.5, 그 외 1. 내부 2.5kg | 적용 | 공통 유지. 장비별 외부 간격과 휠 간격 차이 확인 |
| N02 | 루틴 편집·기존 조합 | 승인 중량 변경 초안 | N01과 동일한 설정 중량, 별도 결과 확인 | kg/소수 | N01과 동일 | 적용 | 승인과 초안 분리 유지 |
| N03 | 웨이트 진행·종목 편집 | 변경 중량 | ±와 휠, 휠 안 직접 입력 | kg/소수 | 2.5kg | 적용 | 오늘만/진행 중량의 모드·검증 유지 |
| N04 | 진행 세트·미완료 | 이번 반복 횟수 | ±와 휠, 직접 입력, 미정 안내 | 정수 회 | 1회 | 적용 | 휠의 중앙 강조·포커스 개선 |
| N05 | 진행 세트·맨몸 | 명시적 추가 중량 | ±와 휠, 직접 입력 | 선택 kg/소수 | 2.5kg | 적용 | 공란 또는 0의 독립 의미 유지 |
| N06 | 종료 요약·기록 상세의 승인 검토 | 승인 예정 중량 수정 | ±와 휠, 직접 입력 | kg/소수 | PLATE/STACK 2.5, 그 외 1kg | 적용 | 권고 폭 5/2와 승인 편집 폭 2.5/1 구분 |
| N07 | 유산소 완료 검토 | 실제 활동 시간 | 시·분·초 버튼과 휠, 직접 입력 | 시 0~24, 분·초 0~59, 제출 1초~24시간 | 1씩, 휠 항목 정수 | 적용 3개 | 기존 사용 유지 검토. 정책 제외 문구와 충돌 여부 확인 |
| N08 | 기록 정정·유산소 | 실제 활동 시간 | 정정 체크 후 시·분·초 버튼과 휠, 직접 입력 | UI 각 단위 N07과 동일, 제출 0.001초~24시간 | UI 1초, 기존 초 문자열 최대 소수 3자리 | 적용 3개 | 초 미만 기존값 보존. 단위 편집 뒤 초 미만 정밀도는 결정 필요 |
| N09 | 루틴 생성·편집 | 본세트 수 | 텍스트와 숫자 키보드 힌트 | 정수 세트 | 직접 입력 | 미적용 | 우선. ±1·휠·직접 입력 경로 재사용 |
| N10 | 루틴 생성·편집 | 최소 반복 | 텍스트와 숫자 키보드 힌트 | 정수 회, 최소 ≤ 최대 | 직접 입력 | 미적용 | 우선. 필드 간 검증 유지 |
| N11 | 루틴 생성·편집 | 최대 반복 | 텍스트와 숫자 키보드 힌트 | 정수 회, 최대 ≥ 최소 | 직접 입력 | 미적용 | 우선. 필드 간 검증 유지 |
| N12 | 웨이트 기록 정정 | 실제 중량 | 텍스트와 소수 키보드 힌트 | kg/소수 | 최대 6자리 | 미적용 | 우선. 2.5kg 조절과 기존 소수 직접 입력 |
| N13 | 웨이트 기록 정정 | 실제 반복 횟수 | 텍스트와 숫자 키보드 힌트 | 정수 회 | 직접 입력 | 미적용 | 우선. ±1·휠. 명시 저장 확인 유지 |
| N14 | 맨몸 기록 정정 | 명시적 추가 중량 | 텍스트와 소수 키보드 힌트 | 선택 kg/소수 | 최대 6자리 | 미적용 | 우선. 미조작·비워서 제거·0 구분 |
| N15 | 운동 중 승인 충돌 | 지금 다시 승인할 중량 | 텍스트와 소수 키보드 힌트 | kg/소수 | 최대 6자리 | 미적용 | 우선. 승인 버전·별도 확인 유지 |
| N16 | 종료 후 공식 평가/승인 충돌 | 지금 재승인할 중량 | 텍스트와 소수 키보드 힌트 | kg/소수 | 최대 6자리 | 미적용 | 우선. 진행 중 승인과 같은 진입 방식 후보, 별도 API 확정 유지 |
| N17 | 루틴·운동 중 유산소 계획 | 목표 시간 | 소수 텍스트 | 분 → 정수 1~86,400초 | 최대 소수 6자리 입력, 초로 반올림 | 미적용 2개 | 직접 유지. 계획과 실제 시간 정정 모델이 다름 |
| N18 | 루틴·운동 중 유산소 계획 | 목표 거리 | 소수 텍스트 | 0.001~1000km, 선택 | 최대 6자리 | 미적용 2개 | 직접 유지. 범위와 정밀도 |
| N19 | 루틴·운동 중 유산소 계획 | 목표 속도 | 소수 텍스트 | 0.1~100km/h, 선택 | 최대 6자리 | 미적용 2개 | 직접 유지. 페이스↔속도 변환 정책 |
| N20 | 루틴·운동 중 유산소 계획 | 목표 페이스 | 소수 텍스트 | 0.1~120분/km, 선택 | 최대 6자리 | 미적용 2개 | 직접 유지. 분:초 표시는 별도 결정 |
| N21 | 루틴·운동 중 유산소 계획·러닝머신 | 목표 경사도 | 소수 텍스트 | 0~50%, 선택 | 최대 6자리 | 미적용 2개 | 직접 유지. 0과 미입력 구분 |
| N22 | 루틴·운동 중 유산소 계획·자전거 | 목표 저항 | 소수 텍스트 | 1~100, 선택 | 최대 6자리 | 미적용 2개 | 직접 유지. 장비의 표현과 소수 계약 |
| N23 | 유산소 완료 검토 | 실제 거리 | 소수 텍스트 | 직접 0.001~1000km, 선택 | 최대 6자리 | 미적용 | 직접 유지. 출처와 계산값 보호 |
| N24 | 유산소 완료 검토 | 실제 평균 속도 | 소수 텍스트 | 선택 km/h, 소수 계약 적용 | 최대 6자리 | 미적용 | 직접 유지. 계산 표시와 수동 값 구분 |
| N25 | 유산소 완료 검토 | 평균 심박수 | 숫자 텍스트 | 선택 20~300 BPM | 정수 | 미적용 | 직접 유지. 선택값이며 기존 정책에서 유산소 제외 |
| N26 | 유산소 기록 정정 | 실제 거리 | 소수 텍스트 | N23 | 최대 6자리 | 미적용 | 직접 유지. 공란·저장 출처 |
| N27 | 유산소 기록 정정 | 실제 평균 속도 | 소수 텍스트 | N24 | 최대 6자리 | 미적용 | 직접 유지. 출처·시간과 계산 관계 |
| N28 | 유산소 기록 정정 | 평균 심박수 | 숫자 텍스트 | 선택 20~300 BPM | 정수 | 미적용 | 완료 검토와 같은 방식 유지 |
| N29 | 휴식 설정 | 1~10회 구간 휴식 | 숫자 텍스트 | 정수 초 | 직접 입력 | 미적용 | 직접 유지. 현행 제외 범위, 분·초 표시는 별도 |
| N30 | 휴식 설정 | 11~12회 구간 휴식 | 숫자 텍스트 | 정수 초 | 직접 입력 | 미적용 | N29와 동일 |
| N31 | 휴식 설정 | 13회 이상 휴식 | 숫자 텍스트 | 정수 초 | 직접 입력 | 미적용 | N29와 동일 |
| N32 | 로그인 | 이메일 OTP | 숫자 문자 전용 입력 | 6자리 문자열 | 선행 0, 자동 완성 | 미적용 | 네이티브 키보드·붙여넣기·OTP 자동완성 유지 |
| N33 | 계정 재인증·대표 이메일 등록 | 이메일 OTP | 숫자 문자 전용 입력 | 6자리 문자열 | 선행 0, 자동 완성 | 미적용 | N32와 동일 |
| N34 | 휴식 알림 | 효과음 볼륨 | 네이티브 range | 0~100% | 5% | 미적용 | 즉시 피드백 가능한 슬라이더 유지 |

집계는 실제 입력 의미 기준으로 **휠 12개**(N01~06의 6개, 시간 두 화면의 시·분·초 6개)와 **미적용 32개**(웨이트 8개, 유산소 계획 12개·실제 6개, 휴식 시간 3개, OTP 2개, 볼륨 1개)다. 한 코드 필드가 여러 표 행이나 설정 구간을 제공하므로 3절의 소스 위치 집계와 값이 다르다.

### 숫자가 붙는 선택과 고정 조작

| 화면 | 사용처 | 방식·범위 | 범위 판단 |
| --- | --- | --- | --- |
| 휴식 진행 | +30초 | 고정 증가 버튼, 매 조작 30초 | 휴식 타이머 조작. 휠 적용 제외 |
| 휴식 타이머 알림 | 깜빡임·중간음 시점 | 3·5·10초 버튼, 중간음 옵션은 `REST_MIDDLE_OPTIONS` | 제한형 선택 유지. 12초 테스트는 스위치로 켜고 끔 |
| 운동 편집 | +세트 추가 / 세트 제외 | 선택 행에서 증감·제외 명령 | 수행 보호가 걸린 계획 편집 명령. 직접 세트 수 편집과 구분 |
| 일정·달력·기록 | 일정 번호, 날짜, 조회 기간, 보관본 인덱스, 순서 이동 | 데이터 기반 버튼/드래그/선택 목록 | 숫자는 표시·식별값. 순서·날짜 선택으로 유지 |
| 준비운동·유산소 타이머·디로딩 | 경과·목표 표시, 시작·일시정지·이어가기·종료, 디로딩 자동 계산 | 자동 측정 및 상태 전환 | 임의 초깃값·기간·처방의 입력 필드는 운영 진입점에서 확인되지 않음 |

### 기존 숫자 휠의 설계와 동작

- `NumberWheel`은 호출부의 조절·검증 함수와 시작점·단위·추천·미정 상태를 받아 그리드 버튼을 렌더링한다. 일반 좌우 폭 44px/가운데 최소 44px/간격 2px. kg 라벨형 좌우 56px/가운데 76~104px/최대 220px. 루틴 compact 좌우 44px, 중앙 최소 높이 48px, 간격 8px. `DurationWheel`은 외부 ± 없이 단위별 버튼을 연결한다. [공통 휠](../../src/components/NumberWheel.tsx) · [휠 CSS](../../src/components/NumberWheel.module.css) · [시간 휠](../../src/components/DurationWheel.tsx)
- 기능형 `Dialog` 안의 휠 높이는 `clamp(156px, 38dvh, 260px)`이고 외곽은 Onyx 카드 배경과 1px 테두리다. 52px 행·선택 띠, 세로 중앙 스냅, 위아래 마스크, 선택값 색·굵기·최대 30px와 주변값 최대 24px를 사용한다. 단위 13px, 직접 입력·확인 각 최소 44px와 간격 8px. 휠 탭의 취소는 상단 X와 Escape를 사용하고 직접 입력에는 취소·확인 행이 있다. 휠 내부에서 스크롤을 소비하고 액션은 하단에 붙는다. [Dialog 동작](../../src/components/Dialog.tsx) · [Onyx 표면](../../src/app/theme.module.css)
- 시드는 기존 값 → 제안 → 필드 start 순서다. 최초 열린 시드의 양쪽에서 각각 최대 30항목을 만든다. 중앙을 누르거나 스크롤·방향키로 선택한다. 열린 휠에서는 확인까지 초안이 유지된다. 반복은 `confirmUnchanged`로 같은 제안값을 확인해도 실제 초안에 적용한다. 다른 휠은 조작 없는 확인이 닫기로 끝난다. 직접 입력은 기존 초안을 가져오며 반복 미입력 상태에서 공란 확인은 그대로 닫는다. 바깥 배경 취소는 현재 반복 휠에서만 활성화된다. Escape와 X는 초안을 보존한다. Enter는 직접 입력에서 명시적 확인으로 처리한다.
- Chrome 393px의 운동 반복 휠 Dialog는 359×438px, 반경 5px, 안쪽 패딩 23px였다. 중앙 선택 영역은 311×52px, 옵션도 동일한 행 높이였다. 열기 전후 세트 행은 그대로 있었고 직접 입력으로 전환하면 휠 대신 48px 입력과 두 액션이 나타났다. 운동 안에서 열리는 모달은 운동 프레임의 5px 토큰을 상속한다. 루틴·정정 화면에서 여는 기능형 모달에는 해당 화면의 반경이 적용된다.
- 옵션은 각각 네이티브 버튼과 `aria-pressed`가 있다. 목록의 ArrowUp/Down·Home/End 처리는 옵션 이벤트에서 버블링되지만 목록 자체에 탭 정지점이나 단일 항목 포커스 관리가 없다. 포커스와 시각 선택 위치가 서로 다를 수 있는 점은 5-2 접근성 개선 후보다. 실제 iPhone의 키보드·VoiceOver·관성은 실기기 확인이 필요하다.
- Decision Log 10.19.2의 즉시 반영 문구와 달리, 후속 10.20의 공통 프레임 규칙 및 실제 코드는 확인 전 초안 보존을 사용한다. 이번 조사에서는 현재 기능을 보호 기준으로 적용했다. 같은 값 확인·배경 취소를 다른 필드로 확대하거나 미입력 추천값을 자동 반영하는 선택은 기존 규칙에서 자동으로 파생되지 않는다. [후속 공통 프레임 규칙](../product/Overload_UI_Decision_Log_v0.9.md#1020--일반-운동-실제-api와-최종-검수--2026-11-13)
- 웨이트 세트 완료 시 공란인 반복과 중량은 완료를 차단한다. 0kg 실제값과 공란을 나누고 맨몸 추가 중량을 별도로 처리한다. 정정에는 버전 검사와 별도 저장/삭제 확인이 있으며 승인 초안과 공식 승인 요청도 구분한다. 온라인 루틴 저장과 진행 운동 IndexedDB 스냅샷 보호는 입력 조작 변경과 독립된 계약이다. [완료 입력](../../src/features/workout-local/completion-input.ts) · [기록 정정](../../src/features/workout-online/ClosedWorkout.tsx#L314) · [진행 운동 저장 보호](../engineering/frontend.md#12-진행-운동의-로컬-보호-및-복원)

## 5. 규격 분포

393px에서 같은 이름·마크업 변형·반경·패딩·높이가 반복되면 한 번만 집계했다. Primary는 활성 캡슐 `primary`, Secondary는 활성 캡슐 `outline` 표본이다. 푸터·탭·스위치·선택 상태·30px 소형 표면과 비활성·로딩은 이 분포에서 제외했다. 부품의 data 속성과 파일을 대조했다.

| 집계군 | 표본 수 | 외곽 높이 px (빈도) | 패딩 상/우 px (빈도) |
| --- | ---: | --- | --- |
| 일반 Primary 표본 | 6 | 44.4 (1), 48 (4), 54 (1) | 10/15 (3), 11/7 (3) |
| 일반 Secondary 표본 | 26 | 44 (6), 44.4 (2), 46.4 (1), 47.6 (1), 48 (9), 49.6 (7) | 11/16 (8), 10/15 (6), 6/10 (4), 6/8 (2), 7/6 (2), 8/16 (1), 0/12 (1), 10/16 (1), 11/7 (1) |
| 편집 가능한 텍스트·검색·숫자 필드 | 28 | 36 (3), 38 (3), 42 (4), 44 (8), 48 (8), 65.5 (2) | 10/12 (11), 8/8 (8), 0/4 (3), 8/12 (3), 6/9 (3) |

| 393px 대표 사용처 | 실측 외곽 너비×높이 · 패딩 상/우 · 반경 · 글자/행 높이 |
| --- | --- |
| 로그인 이메일 · 이메일로 계속하기 | 353×54px · 10px/15px · 반경 999px · 16px/25.6px |
| 세트 정정 · 변경 저장 | 151.5×48px · 11px/7px · 반경 999px · 14px/22.4px |
| 웨이트 진행 · 운동·세트 편집 | 353×49.6px · 11px/16px · 반경 999px · 16px/25.6px |
| 유산소 진행 · 운동·세트 편집 | 353×44px · 8px/16px · 반경 999px · 13px/20.8px |
| 휴식 설정 편집 · 변경 사항 저장 | 353×48px · 8px/16px · 반경 999px · 14px/22.4px |
| 루틴 편집 · 최소 반복 | 103.7×44px · 8px/8px · 반경 8px · 16px/25.6px |
| 유산소 진행 · 실제 거리 (km) | 159.5×38px · 6px/9px · 반경 5px · 16px/22.4px |
| 유산소 기록 정정 · 실제 거리 (km) | 151.5×48px · 10px/12px · 반경 10px · 16px/25.6px |
| 휴식 설정 편집 · 1~10회 휴식 | 90.3×36px · 0px/4px · 반경 999px · 16px/25.6px |
| 성장 추적 · 운동 검색 | 279×42px · 8px/12px · 반경 999px · 16px/25.6px |
| 로그인 이메일 · 이메일 주소 | 353×48px · 10px/12px · 반경 10px · 16px/25.6px |
| 로그인 OTP · 인증코드 | 327×65.5px · 10px/12px · 반경 10px · 27.2px/43.52px |
| 휠 직접 입력 · 1세트 이번 반복 횟수 | 311×48px · 10px/12px · 반경 5px · 16px/25.6px |

**차이가 생기는 위치.** 전역은 최소 44px 버튼과 48px 입력을 제공한다. `Button`은 11/16px 패딩에서 시작하지만 페이지 폼, 위험 액션, 푸터가 덮어쓴다. 루틴 편집과 유산소 계획은 종목 입력의 패딩·반경을 줄이고, 유산소 완료 검토는 낮은 38px 측정 필드를 사용한다. `ActionButton`은 높이 48/44/36px와 14/8/12px 패딩 변수를 사용한다. 실제 높이는 줄 높이와 wrapping·그리드 스트레치에 따라 커질 수 있다. 로그인 CTA의 54px, 웨이트 편집의 소수 높이, 유산소 편집의 44px는 서로 다른 CSS 경로의 결과다. [버튼 기본값](../../src/components/ui.module.css) · [액션 상태 CSS](../../src/components/common-ui/ActionButton.module.css) · [유산소 필드](../../src/features/workout-flow/CardioFocus.module.css) · [루틴 폼](../../src/features/workout-online/RoutineEdit.module.css)

## 6. 공통화 및 개선 후보

### 승인 규격 적용 점검

| 보호 기준 | 적용 확인 |
| --- | --- |
| 일반 액션 캡슐 | 로그인·기록 정정·웨이트 일반 CTA에서 999px 확인. 다른 역할인 quiet 링크·기능 버튼·선택 칩에는 별도 반경이 적용된다. |
| 진행 푸터 50px·모서리 5px | 준비운동·세트 완료·휴식 종료·+30초·유산소 기록 확정에서 확인. 393px 휴식 172.5×50px 2개, 패딩 0/12px와 간격 8px 관측. 19절의 기본 버튼 간격 6px과 이 휴식 분할 행의 8px 차이를 확인할 대상이다. |
| 증량·감량 권고 기본 50px | `WeightRecommendation`의 CSS 최소 높이와 긴 내용 확장을 확인. 실제 권고 렌더링 표본은 320·375·393·430·1280px. |
| 소형 보조 외형 30px·조작 48px | 393px에서 편집 49.9×48, 취소 49.9×48, 종목 보기/변경 94.6×48, 종목 목록 73.5×48. 너비는 콘텐츠에 따르며 최소 44px. |
| 소형 보조 좌우 12px | 계측과 `compactSurface` 선언에서 확인. |
| 소형 보조 1px #353941 | `--border-subtle` 기준, Chrome rgb(53, 57, 65) 확인. |
| 일반 메시지형 Dialog 좌우 1:1 | 393px 기록 삭제 취소 148.5px · 삭제 148.5px에서 동일 너비 확인. |
| 일정 전환·추가 44×44px 원형 | 루틴 메인 표본과 `Presets.module.css`의 44×44px·50% 선언 확인. |
| 제목·인접 액션 세로 중심 | 소형 표면은 그리드의 중앙에 놓인다. 휴식 제목 행·루틴 상세·웨이트 종목 및 유산소 종목 목록의 적용 범위를 대조했다. 제목과 단일 조작이 같은 부모에 있는 표본의 중심 차이는 JSON `titleCenterOffset`을 참조한다. |

소형 버튼의 크기·패딩·테두리와 인접 정렬을 사용자 요청의 보호 기준에 따라 묶어 확인했다. 표의 개별 행 수는 보호 기준의 집계와 다르다. [공통 Button](../../src/components/ui.module.css) · [푸터와 권고](../../src/features/workout-flow/WorkoutFlow.module.css) · [메시지형 Dialog](../../src/components/Dialog.module.css) · [일정 버튼](../../src/features/workout-online/Presets.module.css)

### 불일치와 결정 후보

| 분류 | 사용처·현재 근거 | 개선 방향 및 적용 범위 | 보호 조건 |
| --- | --- | --- | --- |
| A | 숫자 휠의 최신 확정 범위 중 웨이트 숫자 8개가 아직 직접 입력 | 5-2에서 도메인별 조절 함수와 공통 휠을 검토한다. 루틴·기록 정정·재승인 순으로 묶으면 저장 규칙 검증을 분리할 수 있다 | 수정 초안, 0·공란, 범위, 명시 저장과 버전 보호 |
| A | 10.19.1의 유산소 제외와 현재 활동 시간 시·분·초 휠 | 두 기존 시간 정정 흐름의 표면을 함께 검토한다. 계획 시간과 거리 등에는 기존 직접 입력이 적절하다 | 측정 시간 보존, 0.001초 저장 범위, 24시간 제한 |
| B·1 | 일반 저장·확인 액션은 44.4~54px에 분포한다. 웨이트와 유산소의 동일 이름·역할인 `운동·세트 편집`은 393px에서 49.59/44px, 상하 패딩 11/8px이다 | 문맥이 같은 일반 액션에서 최소 높이와 패딩을 먼저 맞춘다. 둘의 정렬을 비교할 시안에는 48px을 사용해 볼 수 있다 | 캡슐, 위험·명시 복구 색상, 포커스와 로딩 |
| B·2 | 같은 유산소 실제 거리·속도·심박 입력이 완료 검토에서 38px·반경 5px, 기록 정정에서 48px·반경 10px이다. 각각 상/우 6/9px와 10/10px로 상위 화면 CSS가 덮는다 | `CardioNumberField`가 공유하는 레이블·텍스트·단위 정렬을 우선 맞추고, 동일 편집기의 높이 차이는 검토한다 | 예상·계산·수동 출처, 정밀도와 선택 입력 |
| B·3 | 이름·메일·직접 숫자의 기본 표면은 44/48px 계열이고 공통 검색은 42px이다. 휴식 36px과 OTP 65.52px는 각각 승인된 밀도와 인증코드 표현을 위한 예외다 | 일반 텍스트 44/48px, 검색 42/44px를 비교하고 화면에서 같은 줄에 놓이는 관련 입력과 버튼부터 맞춘다 | 편집 텍스트 16px, 레이블·오류, 좁은 폭, 자동완성 |
| B·4 | 루틴 편집의 compact 중량 중앙 48px·패딩 4px, 좌우 44px·패딩 0/2px다. 웨이트 반복 입력의 중앙과 좌우는 48px·0/2px다 | 같은 목적의 수치면 중심과 단위 정렬을 먼저 맞추고 좌우·중앙은 역할별 크기를 허용한다 | 세트 표 위계와 완료 컨트롤 위치 |
| C | 중량 2.5/1 외부 ±와 2.5 내부 휠이 루틴 설정에서 함께 쓰인다 | kg를 입력하는 동일한 행의 외부/내부 간격을 명시적으로 검토한다. 유지할 경우 화면에서 단위를 안내하는 안이 가능하다 | 52.3kg 등 유효한 소수 보존. 권고 폭과 편집 간격 구분 |
| D | 반복과 kg 편집의 휠은 이미 정수·소수 검증, 직접 입력·기존값 복귀를 제공한다 | 새 휠을 추가하는 대신 `NumberWheel`을 재사용한다. 허용 범위·공란·선행/동등 값 동작은 호출부별로 명시한다 | 직접 입력 폴백, 선택 전 취소 보호, 범위 밖 오류 |
| E | 휠 옵션이 개별 탭 정지점이고 30항목씩 생성한다. 목록·초점 이동 규칙과 배경 취소가 필드별로 다르다 | 단일 탭 진입·선택 항목으로 포커스 이동, 표시 선택 영역·버튼 기준, 직접 입력 오가는 동작을 시안으로 검토한다 | 접근성 이름·스크롤, 확인/취소와 배경 조작 정책 |
| F | OTP·볼륨·날짜·프리셋·고정 타이머 및 유산소 측정값 | 고유 역할과 현행 편집 방식 유지. 긴 거리·소수는 직접 입력이 빠르고 붙여넣기가 가능하다 | OTP 자동 완성·선행 0, 범위/출처, 기존 캘린더 |
| F | Preview 전용 상태 제어와 구형 데모의 직접 중량/반복·휴식 입력 | 서비스 공통화 수치에서 제외하고 진입 경로를 분리해 기록한다 | 제품 사용처와 합성 조작의 구분 |

### 구현 구조

| 구현 | 현재 경계 | 5-2 검토 |
| --- | --- | --- |
| `Button` · `ui.module.css` | 일반 캡슐·control·compact, pending/loader, `Field`는 라벨 래퍼 | 보조 액션 30/48과 포커스 유지. 일반 높이·패딩 후보는 역할별로 적용 |
| `ActionButton` / `ActionDialog` / `Dialog` | `ActionButton`·`ActionDialog`는 공통 Preview의 규격 48/44/36과 의미별 색을 시연한다. 운영에서 관측한 메시지형은 `Dialog`·`Button` 조합이며 가로 두 액션은 메시지형에서 동일폭이다 | 공통 부품 확장 시 기능형 자체 포커스·닫기·이중 확인 보호 |
| `NumberWheel` / `KgWheel` / `DurationWheel` | 같은 시각·스냅·선택 기능과 서로 다른 값 검증·증분·취소. `WeightInput`과 `RepsInput`은 프로토타입의 별도 직접 입력 | 현행 휠 확장. 유효성 검증과 데이터 정책을 도메인 가까이에 둠 |
| `SearchList` / `SearchScopePopover` / `ConnectedDropdown` | 공통 검색 부품, 통계 검색 범위 팝오버, 홈의 연결형 드롭다운. 네이티브 select는 일정·설정·장비 등에서 사용 | 5-2에는 검색의 표면·접근성만 검토. 선택 연결 확대는 6단계 |
| `CardioNumberField` / `EquipmentFields` / `CombinationMemo` | 유산소 직접 숫자 필드·제조/부하 select·기구 메모 래퍼 | 같은 호출이 공유되는 곳의 패딩·정렬 차이부터 수정 후보로 다룸 |
| `theme.module.css` / `index.css` / `App.css` / 기능별 CSS | Onyx 토큰과 실제 셸 테마, 전역 기본값, 과거 클래스, CSS Module의 우선순위가 겹친다 | 화면별 override가 역할상 필요한지 확인. 전역 `button`/입력 규칙 일괄 변경은 입력·목록·진행 프레임에 연쇄 영향을 준다 |

[공통 UI 파일](../../src/components/ui.tsx) · [공통 조작 모듈](../../src/components/common-ui/ActionButton.tsx) · [검색](../../src/components/SearchList.tsx) · [홈 연결형 드롭다운](../../src/components/common-ui/ConnectedDropdown.tsx) · [전역 기본값](../../src/index.css) · [테마](../../src/app/theme.module.css)

**소스 범위의 예외.** `RoutineEditor`, `CardioPlanEditor`, `WorkoutScreen`, `CardioScreen`, `SettingsScreen`의 숫자·선택 조작은 별도 데모나 프로그램 테스트에서 나타난다. `WeightInput`은 그 경로의 ±와 직접 소수 필드, `RepsInput`은 ±와 직접 정수 필드다. 운영 앱은 `RoutineForm`·`LocalWorkoutFlow`·`RestSettings`에서 해당 흐름을 제공한다. 두 경로의 버튼 수·입력 개수는 합산하지 않았다. [데모 진입점](../../tests/fixtures/review/DemoApp.tsx) · [운영 진입점](../../src/main.tsx)

**데이터 정책 근거.** 10.25의 정책 3-1 및 ST-19가 유산소 원계획·실제 측정·거리 미입력의 완료 판단을 별도로 규정한다. 화면에 계산 또는 예상 수치가 표시될 때의 확정 처리와 구별했다. 현행 구현과 정책의 차이는 기존 개발 현황에 기록되어 있어 입력 UI 조사에서 완료 판정 변경의 근거로 사용하지 않았다. [10.25 최신 정책](../product/Overload_UI_Decision_Log_v0.9.md#1025--2026-11-16-최신-정책-확정과-구현-경계) · [정책별 구현 점검](../engineering/frontend.md#2026-11-16-확정-정책별-구현-점검)

## 7. 5-2에서 결정할 사항

1. **일반 액션**. 실측 분포를 기준으로 일반 페이지의 Primary·Secondary가 같은 높이와 좌우 패딩을 공유할 범위를 정한다. 폼 하단·메시지 Dialog·설정 행과 분할 조작은 각 근거를 반영한다. 일반 버튼 최소 너비, 짧은 캡션의 자동 너비, 동일 행 간격과 아이콘 전용 히트 영역도 함께 확인한다.
2. **텍스트·검색·숫자 외형**. 기본 48px 입력과 검색 42px·유산소 계획 44px의 역할 차이를 확인하고 16px 가독성, 버튼과 단위의 중심, 320px에서 정렬과 잘림을 함께 비교한다. 메모와 편집 숫자에 포커스가 들어갔을 때 기존 키보드 보호를 유지할 수 있는지 확인한다.
3. **숫자 휠 확대**. 웨이트 8개 중 루틴 정수 3개와 기록 정정 3개는 작업 흐름을 비교하기 좋은 첫 범위다. 재승인 2개는 충돌/버전 확인과 독립된 조작으로 제안한다. 유산소 거리·속도·페이스·경사·저항·심박, 휴식 시간, OTP는 직접 입력에 남기는 안을 권장한다. 시·분·초는 기존 정정 화면에서 이미 쓰이는 구조와 문서 범위를 대조한다.
4. **휠 디자인·접근성**. 52px 행, 중앙 선택 띠, 직접 입력·확인 버튼, 키보드의 포커스·선택 연동과 장거리 값 탐색을 시안에서 비교한다. 모바일 스와이프와 직접 숫자 키보드를 실기기에서 확인한 뒤 수치를 확정한다. 세트 표 안의 조작과 승인된 특수 크기는 비교 기준으로 사용한다.
5. **7단계 입력 정책 검토 항목**. 초기값 출처, 미정 반복에서 +/−가 참조할 값, 다른 필드에 동일값 확인이나 배경 취소를 적용할지, 시·분·초 정정 중 소수 초 보존 범위를 기록한다. 현재 초깃값·추천·기존값/공란의 상태, 자동 적용 여부와 저장 보호는 조사 기준으로 유지했다.

## 8. 검증 근거 및 한계

- 4173의 루프백 게이트웨이와 현재 검수 Spring Health 포트는 연결되지 않았다. 읽기 확인 후 기존 프로필·백엔드·DB를 다시 시작하지 않았고 실제 START는 미실행이다. 계측은 현행 소스와 저장소의 격리 Vite·기존 FRONT 18 / 루틴·기록 fixture를 사용했다. 로그인 이메일·OTP는 동일한 운영 `LoginScreens`를 임시 격리 경로에서 예시 상태로 렌더링했다. 실제 이메일이나 OAuth 요청을 보내지 않았다.
- Chrome 158.0.8127.38에서 320·375·393·430·1280 CSS px, 세로 852px를 사용했다. 좁은 폭은 모바일 및 단일 터치를 모의했고 1280px는 데스크톱이다. 렌더링 위치·크기, CSS 최소값·패딩·테두리·색·정렬·간격·글자·넘침, 비활성·선택·열림·포커스와 화면 안 조작 영역 중심을 기록했다. 축소된 팝오버와 스크롤 중인 항목은 부모·viewport 값을 함께 봐야 한다.
- 반복 휠 393px에서 터치 진입, 8회 미정 시작, 스크롤로 10회 선택, ArrowDown으로 11회 선택과 초안 보존, X로 원래 미정·포커스 복귀, 같은 8회 확인으로 확정, 바깥 터치 취소를 확인했다. 직접 입력 11 회 Enter 반영도 확인했다. kg 휠과 유산소 시간의 분 휠도 열어 계측했다. 옵션 버튼에 있던 포커스가 방향키 선택과 같이 이동하지 않는 점을 확인했다.
- 기록 삭제 기본·호버·눌림 채움은 각각 #A83143, #B4374A, #892637이었다. 처리 중에는 두 액션의 너비가 유지됐고 X·취소·삭제가 비활성이었다. Tab으로 진입한 삭제 버튼은 2px 키보드 포커스를 표시했다. 320px·393px에서 0회 직접 입력은 오류 행을 표시했다.
- 301개 상태·폭 조합에서 페이지 가로 넘침은 0px이었다. 320px 카탈로그의 수평 스크롤 필터에서 하체·코어·유산소·기타 4개 버튼이 처음 보이는 영역 밖에 배치됐다. 브라우저 표본은 키보드·포인터·터치의 모든 조합을 반복 실행한 횟수와 다르다.
- 운동 메모는 320px·393px에서 가상 VisualViewport를 852px에서 552px로 축소해 확인했다. 메모 포커스 중 푸터가 숨겨지고 필드 하단은 각각 462.16px와 475.16px에 위치했다. 포커스를 해제하고 viewport를 복원한 뒤 푸터가 표시됐다. 합성 좌표와 스크롤 값은 JSON에 담았다.
- iPhone Safari, 설치형 PWA, 실제 모바일 키보드·Safe Area·VoiceOver, 운영 데이터의 드문 권한·충돌 조합과 모든 입력 상태의 상호작용은 직접 확인 범위 밖이다. 미계측 항목의 선언값, 폼 검증과 데이터 보호는 소스 근거를 연결했다. 제품 빌드·전체 테스트는 조사만 수행한 범위에서 실행하지 않았다.

**대표 화면**


**계측 매트릭스**

| 화면·상태 | 직접 계측한 폭 (px) |
| --- | --- |
| 로그인 이메일 | 320 · 375 · 393 · 430 · 1280 |
| 로그인 OTP | 320 · 375 · 393 · 430 · 1280 |
| 루틴 메인 | 320 · 375 · 393 · 430 · 1280 |
| 루틴 상세 | 320 · 375 · 393 · 430 · 1280 |
| 주간 일정 편집 | 320 · 375 · 393 · 430 · 1280 |
| 일정 전체 편집 | 320 · 375 · 393 · 430 · 1280 |
| 근육별 운동 계획 | 320 · 375 · 393 · 430 · 1280 |
| 휴식 설정 보기 | 320 · 375 · 393 · 430 · 1280 |
| 휴식 설정 편집 | 320 · 375 · 393 · 430 · 1280 |
| 설정 | 320 · 375 · 393 · 430 · 1280 |
| 휴식 타이머 알림 | 320 · 375 · 393 · 430 · 1280 |
| 계정 관리 | 320 · 375 · 393 · 430 · 1280 |
| 기기 관리 | 320 · 375 · 393 · 430 · 1280 |
| 재인증 코드 입력 | 320 · 375 · 393 · 430 · 1280 |
| 표준 운동 카탈로그 | 320 · 375 · 393 · 430 · 1280 |
| 표준 운동 상세 | 320 · 375 · 393 · 430 · 1280 |
| 최근 기록 | 320 · 375 · 393 · 430 · 1280 |
| 전체 운동 이력 | 320 · 375 · 393 · 430 · 1280 |
| 성장 추적 | 320 · 375 · 393 · 430 · 1280 |
| 기록 메인 | 320 · 375 · 393 · 430 · 1280 |
| 운동 현황 | 320 · 375 · 393 · 430 · 1280 |
| 기록 상세 | 320 · 375 · 393 · 430 · 1280 |
| 기록 상세 메뉴 | 320 · 375 · 393 · 430 · 1280 |
| 세트 정정 | 320 · 375 · 393 · 430 · 1280 |
| 누락 수행 복구 | 320 · 375 · 393 · 430 · 1280 |
| 준비운동 | 320 · 375 · 393 · 430 · 1280 |
| 웨이트 진행 | 320 · 375 · 393 · 430 · 1280 |
| 반복 휠 | 320 · 375 · 393 · 430 · 1280 |
| 휠 직접 입력 | 320 · 375 · 393 · 430 · 1280 |
| 휴식 진행 | 320 · 375 · 393 · 430 · 1280 |
| 운동·세트 편집 | 320 · 375 · 393 · 430 · 1280 |
| 중량 변경 | 320 · 375 · 393 · 430 · 1280 |
| kg 휠 | 320 · 375 · 393 · 430 · 1280 |
| 유산소 진행 | 320 · 375 · 393 · 430 · 1280 |
| 유산소 시간 정정 | 320 · 375 · 393 · 430 · 1280 |
| 유산소 휠 | 320 · 375 · 393 · 430 · 1280 |
| 완료 직전 | 320 · 375 · 393 · 430 · 1280 |
| 운동 종료 요약 | 320 · 375 · 393 · 430 · 1280 |
| 오프라인 복구 | 320 · 375 · 393 · 430 · 1280 |
| 오프라인 이어하기 | 320 · 375 · 393 · 430 · 1280 |
| 홈 | 320 · 375 · 393 · 430 · 1280 |
| 홈 루틴 드롭다운 | 320 · 375 · 393 · 430 · 1280 |
| 루틴 생성 | 320 · 375 · 393 · 430 · 1280 |
| 근육별 운동 계획 · 근육별 | 320 · 375 · 393 · 430 · 1280 |
| 주간 근육 통계 | 320 · 375 · 393 · 430 · 1280 |
| 주간 근육 통계 · 근육별 | 320 · 375 · 393 · 430 · 1280 |
| 운동 현황 달력 | 320 · 375 · 393 · 430 · 1280 |
| 공식 평가 및 변경 이력 | 320 · 375 · 393 · 430 · 1280 |
| 기록 삭제 확인 | 320 · 375 · 393 · 430 · 1280 |
| 기록 삭제 확인 · hover | 393 |
| 기록 삭제 확인 · active | 393 |
| 기록 삭제 확인 · focus | 393 |
| 기록 삭제 처리 중 | 320 · 375 · 393 · 430 · 1280 |
| 유산소 기록 정정 | 320 · 375 · 393 · 430 · 1280 |
| 유산소 기록 정정 휠 | 320 · 375 · 393 · 430 · 1280 |
| 중량 미입력 | 393 |
| 맨몸 추가 중량 | 393 |
| 루틴 편집 | 320 · 375 · 393 · 430 · 1280 |
| 루틴 유산소 계획 | 320 · 375 · 393 · 430 · 1280 |
| 일정 이름 바꾸기 | 320 · 375 · 393 · 430 · 1280 |
| 휴식 알림 볼륨 | 320 · 375 · 393 · 430 · 1280 |
| 휴식 알림 시간 선택 | 320 · 375 · 393 · 430 · 1280 |
| 증량·감량 권고 | 320 · 375 · 393 · 430 · 1280 |
| 반복 미입력 완료 차단 | 320 · 393 |
| 휠 직접 입력 오류 | 320 · 393 |
| 기록 삭제 확인 · 키보드 탭 | 320 · 393 |
