import type { CreateRoutine, UpdateRoutine, Routine } from './types.ts';
/** Only recognizes the complete fixed request; never merges a newer routine into an old draft. */
export function routineMatches(r: Routine, b: CreateRoutine | UpdateRoutine) {
    if (r.name !== b.name || (b.tag !== undefined && (r.tag ?? null) !== b.tag) || r.weightPlacements.length !== b.weightPlacements.length || r.cardioPlacements.length !== b.cardioPlacements.length)
        return false;
    return b.weightPlacements.every((w, i) => { const p = r.weightPlacements[i]; return p.id === w.id && p.manufacturerId === w.manufacturerId && p.loadType === w.loadType && p.setCount === w.setCount && p.minReps === w.minReps && p.maxReps === w.maxReps && (!('standardExerciseId' in w) || p.standardExerciseId === w.standardExerciseId && p.initialWeightKg === w.initialWeightKg); })
        && b.cardioPlacements.every((c, i) => { const p = r.cardioPlacements[i]; return p.id === c.id && (['standardExerciseId', 'activityId', 'kind', 'name', 'targetSeconds', 'targetDistanceKm', 'inclinePercent', 'resistance'] as const).every(k => p.plan[k] === c.plan[k]) && p.plan.intensity?.mode === c.plan.intensity?.mode && p.plan.intensity?.value === c.plan.intensity?.value; })
        && (!('weightApprovals' in b) || b.weightApprovals.every(a => r.weightPlacements.find(p => p.id === a.placementId)?.approvedWeightKg === a.nextApprovedWeightKg));
}
