import { Card } from '../../components/ui.tsx'
import type { WorkoutSettingsResponse } from '../workout-online/types.ts'

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
