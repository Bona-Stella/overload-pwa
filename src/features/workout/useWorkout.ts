import { useEffect, useRef, useState } from 'react'
import { loadWorkout, saveWorkout, STORAGE_KEY } from './storage.ts'
import { createInitialState } from './model.ts'
import type { WorkoutState } from './types.ts'

export function useWorkout() {
  const [initial] = useState(() => {
    try { return loadWorkout(window.localStorage) }
    catch { return { state: createInitialState(), error: '로컬 저장소에 접근할 수 없습니다. 브라우저 저장소 설정을 확인해 주세요.', blocked: true } }
  })
  const [state, setState] = useState(initial.state)
  const [error, setError] = useState(initial.error)
  const [blocked, setBlocked] = useState(initial.blocked)
  const current = useRef(state)

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        setBlocked(true)
        setError('다른 탭에서 저장 내용이 변경되었습니다. 충돌 방지를 위해 편집을 중지했습니다. 이 탭의 입력을 확인한 뒤 새로고침해 주세요.')
      }
    }
    window.addEventListener('storage', onStorage)
    function onUnload(event: BeforeUnloadEvent) {
      if (error) event.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('beforeunload', onUnload) }
  }, [error])

  function update(transform: (previous: WorkoutState) => WorkoutState): boolean {
    if (blocked) return false
    const next = transform(current.current)
    current.current = next
    setState(next)
    try { saveWorkout(window.localStorage, next); setError(null) }
    catch { setError('로컬 저장에 실패했습니다. 현재 입력은 이 화면에 유지됩니다. 저장 공간을 확인하고 다시 저장해 주세요. 새로고침하면 저장되지 않은 입력이 사라질 수 있습니다.') }
    return true
  }
  return { state, update, error, blocked, retry: () => update(s => s) }
}
