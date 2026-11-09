import { DeloadMoon } from '../components/DeloadMoon.tsx'
import { homeHeaderSample } from './sample.ts'
import styles from './Review.module.css'

export function ReviewHeader({ analysisOn = true, period, unconfirmed, initial }: { analysisOn?: boolean; period?: 'active' | 'completed'; unconfirmed?: string; initial?: boolean }) {
  return <div className={`${styles.gauge} ${analysisOn ? '' : styles.off}`} aria-label={unconfirmed ?? `디로딩 분석 ${analysisOn ? 'ON' : 'OFF'} 개발용 표시`} data-review-sample="deload-header" title="개발 검토용 표시값 · 실제 계정의 분석·자격·기간과 무관 · 조작 불가">
    <DeloadMoon />{period ? <b className={styles.period}>{period === 'active' ? '디로딩 진행 중' : '디로딩 완료'}</b> : unconfirmed ? <b className={styles.period}>{unconfirmed}</b> : analysisOn && <><b>{initial ? '0/8주' : homeHeaderSample.label}</b><span className={styles.track} aria-hidden="true"><i style={{ width: initial ? '0%' : homeHeaderSample.fillPercent + '%', background: homeHeaderSample.color }} /></span></>}
  </div>
}
