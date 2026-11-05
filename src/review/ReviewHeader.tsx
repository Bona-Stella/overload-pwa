import { DeloadMoon } from '../components/DeloadMoon.tsx'
import { homeHeaderSample } from './sample.ts'
import styles from './Review.module.css'

export function ReviewHeader({ analysisOn = true }: { analysisOn?: boolean }) {
  return <div className={`${styles.gauge} ${analysisOn ? '' : styles.off}`} aria-label={`디로딩 분석 ${analysisOn ? 'ON' : 'OFF'} 개발용 표시`} data-review-sample="deload-header" title="개발 검토용 표시값 · 실제 계정의 분석·자격·기간과 무관 · 조작 불가">
    <DeloadMoon />{analysisOn && <><b>{homeHeaderSample.label}</b><span className={styles.track} aria-hidden="true"><i style={{ width: homeHeaderSample.fillPercent + '%', background: homeHeaderSample.color }} /></span></>}
  </div>
}
