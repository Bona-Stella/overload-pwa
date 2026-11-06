export const routineTags = ['PUSH','PULL','LEGS','FRONT','BACK','FULL','UPPER','LOWER','CARDIO','MIXED'] as const
export type RoutineTag = typeof routineTags[number]
/** Use only the explicitly persisted tag; never infer it from names or exercise order. */
export function scheduleRoutineLabel(name: string, tag?: RoutineTag) { return tag ?? name }
