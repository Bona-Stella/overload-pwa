export function RoutineSelectionBadge({ selectedId, defaultId }: { selectedId?: string; defaultId?: string }) {
  return <span className="badge">{!selectedId ? 'REST DAY' : selectedId === defaultId ? '요일 기본 루틴' : '오늘만 선택'}</span>
}
