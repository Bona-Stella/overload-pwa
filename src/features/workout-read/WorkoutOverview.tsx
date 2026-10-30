import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context.ts'
import { WorkoutReadController } from './controller.ts'
import type { WorkoutReadState } from './controller.ts'
import './workout-read.css'

export function WorkoutReadView({ state, onRefresh, onCheckSession }: { state: WorkoutReadState; onRefresh: () => void; onCheckSession: () => void }) {
  const loading = state.status === 'idle' || state.status === 'loading'
  return <section className="workout-read stack" aria-labelledby="workout-read-title">
    <div className="workout-read-heading"><h2 id="workout-read-title">내 운동 정보</h2><span className="workout-read-badge">조회 전용</span></div>
    <p className="muted small">현재 계정에 저장된 운동 종목과 휴식 설정입니다. 운동 기록 저장과 편집은 아직 지원하지 않습니다.</p>
    {loading ? <div className="card" role="status">운동 정보를 불러오고 있습니다.</div>
      : state.status === 'ready' ? <>
        <section className="card stack" aria-labelledby="workout-exercises-title"><div className="workout-read-heading"><h3 id="workout-exercises-title">운동 종목</h3><span className="muted small">{state.data.exercises.length}개</span></div>
          {state.data.exercises.length === 0 ? <p className="muted" role="status">저장된 운동 종목이 없습니다.</p>
            : <ul className="workout-read-exercises">{state.data.exercises.map((exercise, index) => <li key={exercise.id}><span className="workout-read-ordinal" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="workout-read-name">{exercise.name}</span></li>)}</ul>}
        </section>
        <section className="card stack" aria-labelledby="workout-rest-title"><h3 id="workout-rest-title">세트 사이 휴식</h3><p className="muted small">목표 반복 상한에 따른 휴식 시간</p>
          <dl className="workout-read-rest">{([
            ['≤10회', state.data.settings.restLowSeconds], ['11~12회', state.data.settings.restMediumSeconds], ['≥13회', state.data.settings.restHighSeconds],
          ] as const).map(([label, seconds]) => <div key={label}><dt>{label}</dt><dd>{seconds}<span>초</span></dd></div>)}</dl>
        </section>
      </> : state.issue ? <div className="notice error stack" role="alert"><h3>{state.status === 'sync-check' ? '동기화 확인이 필요합니다' : '운동 정보를 확인해 주세요'}</h3><p>{state.issue.message}</p>
        {state.issue.requestId && <p className="muted small workout-read-request">문의용 요청 ID: {state.issue.requestId}</p>}
        {(state.issue.status === 401 || state.issue.code === 'OWNER_MISMATCH') && <button className="outline full" onClick={onCheckSession}>로그인 상태 다시 확인</button>}
      </div> : null}
    <button className="outline full" disabled={loading} onClick={onRefresh}>{loading ? '조회 중…' : state.status === 'ready' ? '운동 정보 새로고침' : '다시 조회'}</button>
  </section>
}

export function WorkoutOverview() {
  const { state: auth, controller: authentication } = useAuth()
  const [controller] = useState(() => new WorkoutReadController())
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => controller.connect(authentication), [controller, authentication])
  // The render guard also hides data before effects run on logout/account transitions.
  if (auth.status !== 'authenticated' || auth.pending !== null) return <section className="card" role="status">{auth.pending === 'logout' ? '로그아웃을 확인하고 있습니다.' : '로그인 상태를 확인하고 있습니다.'}</section>
  const visible = state.userId === auth.userId ? state : { status: 'idle' as const, userId: null, data: null, issue: null }
  return <WorkoutReadView state={visible} onRefresh={() => void controller.refresh()} onCheckSession={() => void authentication.restore()} />
}
