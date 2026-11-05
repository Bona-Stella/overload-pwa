export const routineTags = ['PUSH','PULL','LEGS','FRONT','BACK','FULL','UPPER','LOWER','CARDIO','MIXED'] as const
export type RoutineTag = typeof routineTags[number]
/** Presentation input only until T02-B defines persisted DTOs; never classify a routine by name. */
export function scheduleRoutineLabel(name: string, tag?: RoutineTag) { return tag ?? name }
