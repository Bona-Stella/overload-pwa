import { DeloadMoon } from '../../components/DeloadMoon.tsx'
import type { HomeAnalysis, HomeProtection } from '../statistics/deload-home.ts'
import styles from './Home.module.css'

export function HomeTrainingHeader({ analysis, protection }: { analysis?: HomeAnalysis; protection?: HomeProtection }) {
  if (protection) return <span className={styles.headerIcon}><DeloadMoon /><span>{protection === 'ACTIVE' ? '디로딩 진행 중' : '디로딩 완료 당일'}</span></span>
  if (!analysis?.enabled) return <span className={styles.headerIcon} title={analysis ? '디로딩 분석 꺼짐' : '디로딩 분석 확인 필요'}><DeloadMoon /></span>
  const weeks = analysis.confirmedWeeks
  if (!weeks) return <span className={styles.headerIcon}><DeloadMoon /><span>누적 미확정</span></span>
  const threshold = analysis.recommendationThreshold
  const tenths = (f: typeof weeks) => BigInt(f.numerator) * 10n / BigInt(f.denominator)
  const asWeeks = (f: typeof weeks) => {
    const value = tenths(f)
    return value % 10n ? (value / 10n) + '.' + (value % 10n) : String(value / 10n)
  }
  const fill = BigInt(weeks.numerator) * BigInt(threshold.denominator) * 100n /
    (BigInt(weeks.denominator) * BigInt(threshold.numerator))
  return <span className={styles.trainingGauge} title={analysis.calculationStatus === 'CONFIRMED' ? '확정 누적' : '마지막 확인 누적'}>
    <DeloadMoon /><b>{asWeeks(weeks)}/{asWeeks(threshold)}주</b>
    <span aria-hidden="true"><i style={{ width: Math.min(100, Number(fill)) + '%' }} /></span>
  </span>
}
