import { newestRoutines } from './routine-order.ts';
import { useState } from 'react';
import type { WeeklySchedule } from '../statistics/weekly-schedule.ts';
import { dayNames } from './routine-schedule.ts';
import type { ReactNode } from 'react';
import type { Routine, RoutineList } from './types.ts';
import styles from './Routine.module.css';
export function RoutineCards({ summaries, details, busy, onSelect, onNew, onEdit, onDelete, schedule, week }: {
    week?: WeeklySchedule;
    schedule?: ReactNode;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    summaries: RoutineList['routines'];
    details: Map<string, Routine>;
    busy: boolean;
    onSelect: (id: string) => void;
    onNew: () => void;
}) {
    const [filter, setFilter] = useState('all');
    const assigned = week?.assignments ?? [];
    const sorted = newestRoutines(summaries);
    const filtered = sorted.filter(r => filter === 'all' || filter === 'none' ? !((filter === 'none') && assigned.some(a => a.routineId === r.id)) : assigned.some(a => String(a.dayOfWeek) === filter && a.routineId === r.id));
    return <div className={styles.list}>
    <header className={styles.hero}><div className={styles.eyebrow}>YOUR TRAINING PLAN</div><div className={styles.title}><h2>나의 루틴</h2><button type="button" disabled={busy} onClick={onNew}>+ 새 루틴</button></div><p className="muted small">다음 운동을 위한 준비. 나에게 맞는 순서로.</p></header>
    <section className={styles.formbox}><strong>이번 주 일정</strong><div className={styles.week}>{dayNames.map((d, i) => { const a = assigned.find(a => a.dayOfWeek === i + 1), r = summaries.find(r => r.id === a?.routineId); return <button type="button" aria-pressed={filter === String(i + 1)} key={d} onClick={() => setFilter(v => v === String(i + 1) ? 'all' : String(i + 1))}><b>{d}</b><span title={r?.name}>{r?.tag ?? r?.name ?? (week ? '비어 있음' : '확인 중')}</span></button>; })}</div>{schedule && <details><summary>주간 일정 관리</summary>{schedule}</details>}</section>
    <div className={styles.filters}><label>요일 필터<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">전체</option>{dayNames.map((d, i) => <option key={d} value={i + 1}>{d}요일</option>)}<option value="none">미배정</option></select></label>{filter !== 'all' && <button type="button" aria-label="필터 해제" onClick={() => setFilter('all')}>×</button>}</div>
    <div className={styles.title}><strong>저장된 루틴 <small>{filtered.length}개</small></strong></div>
    {!summaries.length && <section className={styles.card}><p>아직 루틴이 없습니다. 표준 운동으로 첫 루틴을 만들어 주세요.</p></section>}
    {!!summaries.length && !filtered.length && <p className="muted">해당 요일의 루틴이 없습니다.</p>}
    {filtered.map((r) => {
            const detail = details.get(r.id);
            return <section className={styles.card} key={r.id}>
      <span className={styles.eyebrow}>ROUTINE {String(sorted.findIndex(x => x.id === r.id) + 1).padStart(2, '0')}</span><h3>{r.name}</h3><small>{assigned.filter(a => a.routineId === r.id).map(a => dayNames[a.dayOfWeek - 1]).join(' · ') || '요일 미배정'}{r.tag ? ' · ' + r.tag : ''}</small>
      {detail ? <><small className={styles.cardSummary}>웨이트 {detail.weightPlacements.length}종목 · {detail.weightPlacements.reduce((n, w) => n + BigInt(w.setCount), 0n).toString()}세트 · 유산소 {detail.cardioPlacements.length}종목</small><p>{[...detail.weightPlacements.map(w => w.exerciseName), ...detail.cardioPlacements.map(c => c.plan.name)].join(' / ')}</p></> : <p className="muted">구성을 확인하려면 상세를 열어 주세요.</p>}
      <button type="button" className="outline" disabled={busy} onClick={() => onSelect(r.id)}>{r.name} 상세 ›</button>
      <div className={styles.actions}>{onEdit && <button type="button" disabled={busy} onClick={() => onEdit(r.id)}>편집</button>}{onDelete && <button type="button" className="quiet danger" disabled={busy} onClick={() => onDelete(r.id)}>삭제</button>}</div>
    </section>;
        })}
  </div>;
}
