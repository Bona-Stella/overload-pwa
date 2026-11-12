import { useLayoutEffect, useRef } from 'react'
import { Button, Card, StatusNotice } from '../../components/ui.tsx'
import type { WorkoutSettingsResponse } from '../workout-online/types.ts'
import styles from './SettingsMain.module.css'

export function RestSettings({ settings, onBack }: { settings?: WorkoutSettingsResponse; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0) }, [])
  return <section className={styles.page}>
    <header className={styles.detailHeader}><Button variant="quiet" onClick={onBack}>‹ 설정으로</Button>
      <h1 ref={heading} tabIndex={-1}>세트 사이 휴식</h1></header>
    {settings ? <RestTimeCard settings={settings} /> : <StatusNotice>휴식 정보를 확인하고 있습니다.</StatusNotice>}
  </section>
}

export function RestTimeCard({ settings, review = false }: {
  settings: Pick<WorkoutSettingsResponse, 'restLowSeconds' | 'restMediumSeconds' | 'restHighSeconds'>
  review?: boolean
}) {
  return <Card>
    {!review && <h2>세트 사이 휴식</h2>}
    <p className="muted small">{review ? '검토용 예시 휴식 시간입니다.' : '현재 설정된 휴식 시간입니다.'}</p>
    <p>1~10회 · {settings.restLowSeconds}초<br />11~12회 · {settings.restMediumSeconds}초<br />13회 이상 · {settings.restHighSeconds}초</p>
  </Card>
}
