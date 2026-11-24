import { useEffect, useState } from 'react'
import { AppShell } from '../../../src/app/AppShell.tsx'
import type { AppTab } from '../../../src/app/types.ts'
import { navigateTabRoot, useScreenHistory } from '../../../src/app/navigation.ts'
import { Button } from '../../../src/components/ui.tsx'
import { Front18Workout } from './Front18Workout.tsx'
import { Front18Page } from './Front18Pages.tsx'
import type { PageExample } from './Front18Pages.tsx'
import { Front18Account, Front18Pwa } from './Front18Account.tsx'
import { Front18Record } from './Front18Records.tsx'
import type { RecordExample } from './Front18Records.tsx'
import { scope } from './routine-samples.ts'
import { SettingsReview } from './SettingsReview.tsx'
import { defaultRestAlerts } from '../../../src/features/workout-flow/rest-alerts.ts'
import styles from './CommonUiPreview.module.css'
import '../../../src/features/workout-online/online.css'
import '../../../src/features/statistics/statistics.css'
import '../../../src/features/auth/auth.css'

const pages = {
  home: '홈 로딩·운동 시작', routine: '루틴 조회·성공 Toast·확인 Dialog', schedule: '주간 일정·계획 분석',
  records: '최근 운동·전체 이력 조회', growth: '성장 추적 검색·기간 변경', rest: '휴식 설정 저장·충돌·폐기', catalog: '운동 종목 보기',
} satisfies Record<PageExample, string>
const records = {
  correction: '기록 정정·저장 결과 미확인', recovery: '누락 수행 복구·저장 결과 미확인',
  delete: '기록 삭제 결과 미확인', 'delete-local': '기록 삭제 로컬 저장 실패',
  'delete-conflict': '기록 삭제 중 버전 충돌',
  'delete-success': '기록 삭제 성공', 'delete-busy': '기록 삭제 처리 중·닫힘 차단', 'summary-failed': '종료 확정 후 요약 조회 실패·재시도',
} satisfies Record<RecordExample, string>
type ReviewSection = 'menu' | 'workout' | 'account' | 'pwa' | 'settings' | PageExample | RecordExample
const tabs: Record<AppTab, ReviewSection> = { home: 'home', routines: 'routine', history: 'records', settings: 'settings' }
const route = 'front18-review'

export default function Front18Review() {
  const [section, setSection] = useScreenHistory<ReviewSection>(route, 'menu')
  const [alerts, setAlerts] = useState(defaultRestAlerts)
  useEffect(() => { window.scrollTo(0, 0) }, [section])
  const open = (next: ReviewSection) => {
    if (next === section) return
    const owner = scope.userId + ':' + scope.dataGeneration
    navigateTabRoot(route, next, Object.fromEntries(['editor', 'schedule', 'plan'].map(key => [`routine-${key}:${owner}`, null])))
  }
  const back = () => setSection('menu', true)
  const tab: AppTab = section === 'routine' || section === 'schedule' ? 'routines'
    : section === 'records' || section === 'growth' || Object.hasOwn(records, section) ? 'history'
    : section === 'account' || section === 'settings' || section === 'pwa' || section === 'rest' || section === 'catalog' ? 'settings' : 'home'
  return <AppShell authenticated focused={section === 'workout' || Object.hasOwn(records, section)} tab={tab} onNavigate={next => open(tabs[next])}>
    {section === 'menu' && <>
      <div className={styles.intro}>
        <h1>FRONT 18 안내·오류·복구 검수</h1>
        <p>검수 상태는 이 탭의 예시 데이터에만 적용됩니다.</p>
        <a href={location.pathname}>기존 공통 UI Preview</a>
        {location.pathname.endsWith('.html') && <> · <a href="/">4173 실제 앱</a></>}
      </div>
      <section className={styles.section}><h2>운동 진행·저장·복원</h2>
        <p>운동 화면 아래의 검수 도구에서 저장 상태, 입력 오류, 종료, 기기 인계를 설정할 수 있습니다.</p>
        <Button onClick={() => open('workout')}>운동 진행 검수 열기</Button>
      </section>
      <section className={styles.section}><h2>일반 페이지·조회·저장</h2>
        <div className={styles.controls}>{Object.entries(pages).map(([key, label]) =>
          <Button key={key} onClick={() => open(key as PageExample)}>{label}</Button>)}</div>
      </section>
      <section className={styles.section}><h2>기록 정정·삭제·복구</h2>
        <p>기록 화면의 ⋮ 메뉴에서 작업을 선택해 주세요.</p>
        <div className={styles.controls}>{Object.entries(records).map(([key, label]) =>
          <Button key={key} onClick={() => open(key as RecordExample)}>{label}</Button>)}</div>
      </section>
      <section className={styles.section}><h2>계정·설치 상태</h2><div className={styles.controls}>
        <Button onClick={() => open('account')}>계정 재인증·로그인 수단</Button>
        <Button onClick={() => open('pwa')}>앱 설치·오프라인 상태</Button>
        <Button onClick={() => open('settings')}>설정 메인·휴식 타이머 알림</Button>
      </div></section>
    </>}
    {section === 'workout' && <Front18Workout onExit={back} />}
    {Object.hasOwn(pages, section) && <Front18Page key={section} page={section as PageExample} onBack={back} openWorkout={() => open('workout')} />}
    {Object.hasOwn(records, section) && <Front18Record key={section} example={section as RecordExample} onBack={back} />}
    {section === 'account' && <Front18Account onBack={back} />}
    {section === 'pwa' && <Front18Pwa onBack={back} />}
    {section === 'settings' && <><SettingsReview alerts={alerts} onAlerts={setAlerts} allowReviewMedia={false} /><Button onClick={back}>검수 분류로 돌아가기</Button></>}
  </AppShell>
}
