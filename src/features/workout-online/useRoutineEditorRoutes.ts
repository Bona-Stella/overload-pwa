import { useScreenHistory } from '../../app/navigation.ts'
import type { Scope } from './types.ts'

export function useRoutineEditorRoutes(scope: Scope | null) {
  const owner = scope?.userId + ':' + scope?.dataGeneration
  const editorKey = 'routine-editor:' + owner
  const scheduleKey = 'routine-schedule:' + owner
  const [editorRoute, setEditorRoute] = useScreenHistory<{ id: string; readOnly: boolean; fromDetail?: boolean } | null>(editorKey, null)
  const [scheduleRoute, setScheduleRoute] = useScreenHistory<{ type: 'assign'; id: string; priorityId?: string } | { type: 'order' } | null>(scheduleKey, null)
  return { editorKey, scheduleKey, editorRoute, setEditorRoute, scheduleRoute, setScheduleRoute, focused: editorRoute !== null || scheduleRoute !== null }
}
