import { useState } from 'react'
import type { EditorState, LocalWorkoutController } from './controller.ts'

const approvalReason: Record<string, string> = { ROUTINE_CHANGED: '다른 곳에서 루틴이 바뀌었습니다.', SOURCE_REMOVED: '원래 루틴 또는 배치가 제거되었습니다.', NO_SOURCE_PLACEMENT: '원래 루틴 배치가 없는 종목입니다.', PREDECESSOR_PENDING: '앞선 승인 요청의 확인이 필요합니다.', PREDECESSOR_NOT_APPLIED: '앞선 승인 요청이 적용되지 않았습니다.' }
export function ApprovalControls({ state, controller }: { state: EditorState; controller: LocalWorkoutController }) {
  const workout = state.workout!
  const groups = [...new Set(workout.approvalResults.filter(r => r.status === 'PENDING').map(r => r.sessionExerciseId))]
  return <section className="stack" aria-label="중량 승인 상태">
    {workout.snapshot.approvalRequests.map(request => { const result = workout.approvalResults.find(r => r.id === request.id)
      return <p className="muted small" key={request.id}>{workout.exerciseNames[request.sessionExerciseId] ?? '운동 종목'} · 요청 {request.nextApprovedWeightKg} kg · {result?.status === 'APPLIED' ? '적용됨' : result?.status === 'NOT_APPLIED' ? '적용하지 않음' : result?.status === 'PENDING' ? '승인 확인 필요' : '연결되면 전송'}</p>
    })}
    {groups.map(id => <ApprovalChoice key={id + ':' + workout.approvalResults.filter(r => r.sessionExerciseId === id && r.status === 'PENDING').map(r => r.id).join(':')} state={state} controller={controller} id={id} />)}
  </section>
}
function ApprovalChoice({ state, controller, id }: { state: EditorState; controller: LocalWorkoutController; id: string }) {
  const w = state.workout!, pending = w.approvalResults.filter(r => r.sessionExerciseId === id && r.status === 'PENDING')
  const [value, setValue] = useState(w.snapshot.approvalRequests.filter(r => r.sessionExerciseId === id).at(-1)?.nextApprovedWeightKg ?? '')
  const busy = !state.writable || state.pending > 0 || state.syncStatus === 'SENDING' || !!w.finish
  const canApprove = w.initialPlan.weightExercises.some(e => e.sessionExerciseId === id) && !pending.some(r => r.reason === 'SOURCE_REMOVED' || r.reason === 'NO_SOURCE_PLACEMENT')
  return <section className="card stack"><h3>{w.exerciseNames[id] ?? '운동 종목'} · 승인 확인 필요</h3>
    <p>{approvalReason[pending[0]?.reason ?? ''] ?? '현재 루틴의 승인 중량을 확인해 주세요.'} 실제 수행 기록은 보존되었습니다. 아래 선택은 과거 수행의 승인 문맥을 바꾸지 않습니다.</p>
    <button className="outline" disabled={busy} onClick={() => { if (window.confirm('이 승인 요청들을 적용하지 않고 현재 루틴 중량을 유지할까요?')) void controller.resolveApproval(id, pending.map(r => r.id), 'KEEP_CURRENT', '') }}>현재 루틴 중량 유지</button>
    {canApprove && <><label>지금 다시 승인할 중량 kg<input inputMode="decimal" value={value} disabled={busy} onChange={e => setValue(e.target.value)} /></label><button className="primary" disabled={busy} onClick={() => { if (window.confirm(`${value} kg을 현재 시점의 새 중량으로 명시 승인할까요? 과거 수행에는 소급 적용하지 않습니다.`)) void controller.resolveApproval(id, pending.map(r => r.id), 'REAPPROVE', value) }}>이 중량으로 지금 재승인</button></>}
  </section>
}
