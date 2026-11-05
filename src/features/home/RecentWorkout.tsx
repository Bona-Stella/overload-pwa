import { AchievementIcon } from '../../components/AchievementIcon.tsx'
import type { Session } from '../workout-online/types.ts'
import { sessionAchievement } from './achievement.ts'
import type { Achievement } from './achievement.ts'
import type { RecentRow } from './recent.ts'
import styles from './Home.module.css'

const count = (value: Achievement) => `${value.unknown ? value.completed ? value.completed + '+?' : '?' : value.completed}/${value.planned}`
const explanation = (label: string, value: Achievement) => `${label} ${value.completed}/${value.planned}종목 완료${value.unknown ? ` · ${value.unknown}종목 미확인` : ''}`
export function RecentWorkout({ row, detail, onOpen }: { row: RecentRow; detail?: Session; onOpen: (id: string) => void }) {
  const result = detail ? sessionAchievement(detail) : null
  const state = result?.state ?? 'unknown', mark = state === 'complete' ? '✓' : state === 'incomplete' ? '×' : '?'
  const title = [row.workoutDate,row.routineName,result ? [result.weight.planned && explanation('웨이트',result.weight),result.cardio.planned && explanation('유산소',result.cardio)].filter(Boolean).join(' · ') || '최초 계획 없음' : '수행 상세 확인 불가',state === 'complete' ? '전체 완료' : state === 'incomplete' ? '계획 미완료' : '달성 미확인',row.status === 'AUTO_CLOSED' ? '자동 종료' : ''].filter(Boolean).join(' · ')
  return <button type="button" className={styles.record} data-session-id={row.id} title={title} aria-label={title} onClick={() => onOpen(row.id)}>
    <span className={styles.recordDate}>{row.workoutDate.slice(5).replace('-', '.')}</span><strong className={styles.recordName}>{row.routineName}</strong>
    <span className={styles.recordFacts}>{result ? <>{!!result.weight.planned && <span aria-label={explanation('웨이트',result.weight)}><AchievementIcon kind="weight" />{count(result.weight)}</span>}{!!result.cardio.planned && <span aria-label={explanation('유산소',result.cardio)}><AchievementIcon kind="cardio" />{count(result.cardio)}</span>}</> : <span>미확인</span>}</span>
    <span className={styles.recordState} data-state={state} aria-hidden="true">{mark}</span><span aria-hidden="true">›</span>
  </button>
}
