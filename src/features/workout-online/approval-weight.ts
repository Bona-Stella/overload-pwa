import type { LoadType, Session, Snapshot } from './types.ts'
import { decimalDraft } from './validation.ts'

const scaled = (value: string) => { const [a,b=''] = decimalDraft(value).split('.'); return BigInt(a) * 1000000n + BigInt(b.padEnd(6,'0')) }
const format = (value: bigint) => { const fraction = String(value % 1000000n).padStart(6,'0').replace(/0+$/,''); return String(value / 1000000n) + (fraction ? '.' + fraction : '') }
export const approvalStep = (load: LoadType | null) => load === 'PLATE' || load === 'STACK' ? '2.5' : '1'
export function adjustApproval(value: string, direction: -1 | 1, step: string) { return format([0n, scaled(value || '0') + scaled(step) * BigInt(direction)].reduce((a,b) => a > b ? a : b)) }
export function suggestedApproval(reference: string, direction: 'increase' | 'decrease', load: LoadType | null) {
  return adjustApproval(reference, direction === 'increase' ? 1 : -1, load === 'PLATE' || load === 'STACK' ? '5' : '2')
}
/** Display exclusion, without rewriting the server's assessment or approval events. */
export function changedOriginalCombination(initial: Session['initialPlan'], snapshot: Snapshot) {
  const removed = initial.weightExercises.some(p => !snapshot.appliedPlan.weightExercises.some(e => e.sessionExerciseId === p.sessionExerciseId))
  const added = snapshot.appliedPlan.weightExercises.some(e => !initial.weightExercises.some(p => p.sessionExerciseId === e.sessionExerciseId))
  return removed && added || initial.weightExercises.some(p => {
    const actual = snapshot.appliedPlan.weightExercises.find(e => e.sessionExerciseId === p.sessionExerciseId)
    const registry = snapshot.sessionExercises.find(e => e.id === p.sessionExerciseId)
    return !!actual && (actual.manufacturerId !== p.manufacturerId || actual.loadType !== p.loadType || registry?.standardExerciseId !== p.standardExerciseId)
  })
}
