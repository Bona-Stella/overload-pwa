import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Equipment } from './types.ts'

type Drafts = { values: Record<string,string>; change: (key: string, value: string) => void }
const Context = createContext<Drafts | null>(null)
const combinationKey = (exerciseId: string, equipment: Equipment) => JSON.stringify([exerciseId, equipment.manufacturerId, equipment.loadType])

/** Scoped by the authenticated account/generation at the caller. No fake server persistence. */
export function CombinationMemoProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string,string>>({})
  const value = useMemo(() => ({ values, change: (key: string, text: string) => setValues(old => ({ ...old, [key]:text })) }), [values])
  return <Context value={value}>{children}</Context>
}
function useCombinationMemo(exerciseId: string, equipment: Equipment, initialText: string) {
  const key = combinationKey(exerciseId, equipment)
  const context = useContext(Context), [local, setLocal] = useState<Record<string,string>>(() => ({ [key]:initialText }))
  return { text: context?.values[key] ?? local[key] ?? initialText, change: (text: string) => context ? context.change(key,text) : setLocal(old => ({ ...old, [key]:text })), key }
}
export function CombinationMemo({ exerciseId, equipment, readOnly = false, initialText = '', className, draftNotice, hiddenLabel, preview = false }: { exerciseId: string; equipment: Equipment; readOnly?: boolean; initialText?: string; className?: string; draftNotice?: string; hiddenLabel?: boolean; preview?: boolean }) {
  const memo = useCombinationMemo(exerciseId, equipment, initialText)
  if (readOnly) return memo.text.trim() ? <p className={className} aria-label="기구 세팅 메모">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 20H5V4h14v7M8 8h8m-8 4h4m2 7 5-5 2 2-5 5h-2z" /></svg>
    <span>{memo.text}</span><small>미저장</small>
  </p> : null
  return <div className="stack"><label><span className={hiddenLabel ? 'sr-only' : undefined}>기구 세팅 메모</span><textarea data-workout-memo={preview ? undefined : ''} rows={2} value={memo.text} readOnly={preview} placeholder="예: 의자 높이 3" onChange={preview ? undefined : e => memo.change(e.target.value)} /></label>
    <small className="muted" role="status">{draftNotice ?? '같은 운동·장비 조합에서 공유할 메모입니다. 서버 저장 연결 전이며 입력은 아직 저장되지 않았습니다.'}</small>
    {!!memo.text && <button type="button" className="quiet" onClick={preview ? undefined : () => memo.change('')}>메모 지우기</button>}</div>
}
