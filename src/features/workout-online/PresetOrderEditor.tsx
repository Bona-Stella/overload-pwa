import { useState } from 'react'
import { useDragOrder } from '../../components/useDragOrder.ts'
import { dayNames } from './routine-schedule.ts'
import { presetLimit, presetNumber } from './preset-schedule.ts'
import type { PresetSchedule, SchedulePreset } from './preset-schedule.ts'
import styles from './Presets.module.css'
import routineStyles from './Routine.module.css'

type Entry = Pick<SchedulePreset, 'id' | 'included'>
export function PresetOrderEditor({ schedule, busy, readOnly, stale, routineName, onSave, onClose, onReload }: {
  schedule: PresetSchedule; busy: boolean; readOnly: boolean; stale: boolean
  routineName: (id: string) => string; onSave: (entries: Entry[]) => void; onClose: () => void; onReload: () => void
}) {
  const [draft, setDraft] = useState(() => schedule.presets.map(({ id, included }) => ({ id, included })))
  const sortingState = useDragOrder<boolean>(move)
  const { drag } = sortingState
  const [moveNotice, setMoveNotice] = useState('')
  const ordered = [...draft.filter(p => p.included), ...draft.filter(p => !p.included)]
  const changed = draft.some((p, index) => p.id !== schedule.presets[index].id || p.included !== schedule.presets[index].included)
  const tooFew = schedule.autoEnabled && draft.filter(p => p.included).length < 2
  const leave = (action: () => void) => { if (!changed || window.confirm('저장하지 않은 순환 설정을 버릴까요?')) action() }
  function move(group: boolean, id: string, targetId: string, handle: HTMLButtonElement) {
    const from = ordered.findIndex(entry => entry.id === id), to = ordered.findIndex(entry => entry.id === targetId)
    if (busy || readOnly || from < 0 || to < 0 || from === to || ordered[from].included !== group || ordered[to].included !== group) return
    const next = [...ordered]
    const [entry] = next.splice(from, 1)
    next.splice(to, 0, entry)
    setDraft(next)
    setMoveNotice(presetNumber(from) + '번 일정이 ' + presetNumber(to) + '번으로 이동했습니다.')
    requestAnimationFrame(() => handle.focus({ preventScroll: true }))
  }
  function changeGroup(entry: Entry) {
    const remaining = ordered.filter(p => p.id !== entry.id)
    const moved = { ...entry, included: !entry.included }
    setDraft([...remaining.filter(p => p.included), ...(moved.included ? [moved] : []),
      ...remaining.filter(p => !p.included), ...(!moved.included ? [moved] : [])])
  }
  return <section className="stack" aria-label="주간 일정 전체 편집">
    <div className="section-heading"><h2>주간 일정 전체 편집</h2><span>{draft.length} / {presetLimit}</span></div>
    <p className="muted" id="preset-order-help">{readOnly ? '디로딩 보호 중 · 순환 목록 조회 전용' : '핸들을 드래그하거나 위·아래 방향키로 같은 그룹 안에서 순서를 바꿀 수 있습니다.'}</p>
    <p className="sr-only" role="status">{moveNotice}</p>
    {[true, false].map(included => {
      const entries = ordered.filter(entry => entry.included === included)
      const sorting = drag?.group === included ? drag : null
      return <section className="card stack" data-order-group data-sorting={!!sorting} key={String(included)}><h3>자동 순환 {included ? '포함' : '제외'} <small>{entries.length}개</small></h3>
        {!entries.length && <p className="muted">프리셋 없음</p>}
        {entries.map((entry, index) => {
          const preset = schedule.presets.find(p => p.id === entry.id)!
          const number = presetNumber(ordered.indexOf(entry))
          const summary = preset.assignments.map(a => dayNames[a.dayOfWeek - 1] + ' ' + routineName(a.routineId)).join(' · ') || '배정 없음'
          return <div className={styles.orderRow} data-preset-row={entry.id} data-order-row={entry.id} data-dragging={sorting?.from === index}
            style={sortingState.rowStyle(included, index)} key={entry.id}>
            <span className={styles.number}>{number}</span><span className={styles.orderInfo}><strong title={preset.name}>{preset.name}</strong><small title={summary}>{summary}</small></span>
            {!readOnly && <div className={styles.orderActions}>
              <button type="button" className={`${routineStyles.chip} ${styles.membershipPill}`} disabled={busy || !!drag} aria-label={preset.name + (included ? ' 제외' : ' 추가')} onClick={() => changeGroup(entry)}>{included ? '제외' : '추가'}</button>
              <button type="button" className={styles.dragHandle} disabled={busy || entries.length < 2}
                aria-label={preset.name + ' 순서 이동'} aria-describedby="preset-order-help"
                {...sortingState.handleProps(included, entry.id, entries.map(p => p.id), index)}><span aria-hidden="true">⠿</span></button>
            </div>}
          </div>
        })}
      </section>
    })}
    {tooFew && <p role="status">자동 순환에는 포함 프리셋이 최소 2개 필요합니다.</p>}
    {stale && <button type="button" className="outline" onClick={() => leave(onReload)}>최신 구성 다시 열기</button>}
    <div className="row"><button type="button" className="outline" disabled={busy} onClick={() => leave(onClose)}>{readOnly ? '닫기' : '취소'}</button>
      {!readOnly && <button type="button" className="primary" disabled={busy || !!drag || stale || tooFew || !changed} onClick={() => onSave(ordered)}>변경사항 저장</button>}</div>
  </section>
}
