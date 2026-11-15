import type { AssessmentView, InitialPlan, Routine, Session, Snapshot } from './types.ts'
import { changedOriginalCombination } from './approval-weight.ts'
import { decimalDraft } from './validation.ts'

export type ReferenceRecord = { session:Session; assessment:AssessmentView }
type Current = {userId:string;dataGeneration:string;id:string;startedAt:string;initialPlan:InitialPlan;snapshot:Snapshot}
const instant=(value:string)=>BigInt(Date.parse(value))*1000000n+BigInt((value.match(/\.(\d+)/)?.[1]??'').padEnd(9,'0'))%1000000n

/** Select already evaluated server evidence; never create or persist an official assessment. */
export function referenceIncrease(current:Current,id:string,approved:string|null,routine:Routine|null,records:ReferenceRecord[]) {
  const initial=current.initialPlan.weightExercises.find(p=>p.sessionExerciseId===id),applied=current.snapshot.appliedPlan.weightExercises.find(p=>p.sessionExerciseId===id)
  const slot=routine?.weightPlacements.find(p=>p.id===initial?.sourcePlacementId&&!p.deletedAt)
  if(!initial||!applied||approved===null||!slot||routine?.id!==current.initialPlan.routineId||routine.userId!==current.userId||routine.dataGeneration!==current.dataGeneration)return null
  if(initial.setCount!==applied.setCount||initial.minReps!==applied.minReps||initial.maxReps!==applied.maxReps||initial.manufacturerId!==applied.manufacturerId||initial.loadType!==applied.loadType)return null
  if(slot.standardExerciseId!==initial.standardExerciseId||slot.setCount!==applied.setCount||slot.minReps!==applied.minReps||slot.maxReps!==applied.maxReps||slot.manufacturerId!==applied.manufacturerId||slot.loadType!==applied.loadType||decimalDraft(slot.approvedWeightKg)!==decimalDraft(approved))return null
  const candidates=records.flatMap(({session,assessment})=>{
    if(session.id===current.id||session.status!=='FINISHED'||session.deletedAt||!session.endedAt||instant(session.endedAt)>instant(current.startedAt)||session.userId!==current.userId||session.dataGeneration!==current.dataGeneration||session.initialPlan.routineId!==current.initialPlan.routineId||changedOriginalCombination(session.initialPlan,session.snapshot.state)||assessment.userId!==current.userId||assessment.dataGeneration!==current.dataGeneration||assessment.sessionId!==session.id||assessment.version!==session.version||assessment.currentAssessment.state!=='EVALUATED')return []
    const evaluation=assessment.currentAssessment.evaluation
    if(evaluation?.overallWeightPlanComplete!==true||evaluation.sessionVersion!==session.version)return []
    return evaluation.exercises.flatMap(e=>{
      const c=e.comparisonContext
      if(!e.eligible||!c||c.routineId!==routine.id||c.sourcePlacementId!==slot.id||c.standardExerciseId!==slot.standardExerciseId||c.plannedSetCount!==applied.setCount||c.minReps!==applied.minReps||c.maxReps!==applied.maxReps||decimalDraft(c.approvedWeightKg)!==decimalDraft(approved))return []
      const source=session.initialPlan.weightExercises.find(p=>p.sessionExerciseId===e.sessionExerciseId)
      if(!source||source.manufacturerId!==applied.manufacturerId||source.loadType!==applied.loadType)return []
      const facts=session.snapshot.state.performedSets.filter(f=>f.sessionExerciseId===e.sessionExerciseId).toSorted((a,b)=>a.ordinal-b.ordinal||a.id.localeCompare(b.id)).slice(0,c.plannedSetCount)
      if(facts.length!==c.plannedSetCount||facts.length!==e.evaluatedReps.length||facts.length!==e.evaluatedPerformedSetIds.length||facts.some((f,i)=>f.id!==e.evaluatedPerformedSetIds[i]||f.reps!==e.evaluatedReps[i]))return []
      return [{qualifies:e.evaluatedReps.every(r=>r>=c.maxReps),sessionId:session.id,endedAt:session.endedAt!,kg:approved,reps:e.evaluatedReps,sum:BigInt(e.repsSum)}]
    })
  })
  const best = candidates.toSorted((a,b)=>a.sum!==b.sum?a.sum>b.sum?-1:1:instant(a.endedAt)!==instant(b.endedAt)?instant(a.endedAt)>instant(b.endedAt)?-1:1:a.sessionId.localeCompare(b.sessionId))[0]
  return best?.qualifies ? best : null
}
