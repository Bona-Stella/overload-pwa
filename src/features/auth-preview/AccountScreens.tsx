import { SYNC_LABELS, visibleAccount } from './model'
import type { Intent, PreviewState } from './model'
import type { PreviewProps } from './AuthScreens'

export type PreviewDialog = 'reset' | 'withdraw' | 'export' | 'terms' | 'privacy' | null
const INTENT_TITLES: Record<Intent, string> = { linkGoogle: 'Google 연결', linkEmail: '이메일 연결', unlinkGoogle: 'Google 연결 해제', unlinkEmail: '이메일 연결 해제', reset: '운동 데이터 전체 초기화', withdraw: '회원 탈퇴', sync: '동기화 재개' }

export function SyncCard({ state: s, dispatch }: Pick<PreviewProps, 'state' | 'dispatch'>) {
  const account = visibleAccount(s)
  const [label, description] = SYNC_LABELS[s.sync]
  return <section className={`card stack preview-sync ${s.sync === 'synced' ? 'preview-synced' : ''}`} aria-label="가상 동기화 상태">
    <div className="section-heading"><p className="eyebrow">SYNC STATUS · MOCK</p><span aria-hidden="true">{s.sync === 'synced' ? '✓' : '↻'}</span></div>
    <h2>{label}</h2><p className="muted small">{description}</p>
    <p className="small">현재 가상 계정 미동기화 기록 {account?.pending ?? 0}건</p>
    {s.sync === 'syncing' ? <div className="preview-simulation stack"><p>개발용 결과 선택 · 실제 네트워크 요청 없음</p><button className="primary" onClick={() => dispatch({ type: 'syncResult', success: true })}>가상 서버 저장 성공</button><button className="outline" onClick={() => dispatch({ type: 'syncResult', success: false })}>가상 서버 저장 실패</button></div>
      : s.sync !== 'synced' && <button className="outline" onClick={() => dispatch({ type: 'sync' })}>{s.sync === 'reauth' ? '같은 계정으로 재인증' : '동기화 다시 시도'}</button>}
    {s.sync === 'conflict' && <button className="quiet" onClick={() => dispatch({ type: 'navigate', screen: 'conflict' })}>충돌 내용 확인</button>}
  </section>
}

type Props = PreviewProps & { onDialog: (kind: PreviewDialog) => void }
export function AccountScreens({ state: s, dispatch, onDialog }: Props) {
  const account = visibleAccount(s)
  const navigate = (screen: PreviewState['screen']) => dispatch({ type: 'navigate', screen })
  if (s.screen === 'done') return <section className="card stack"><p className="eyebrow">SIMULATION COMPLETE</p><h1>{s.done}</h1><p>목업 화면의 가상 상태만 변경했습니다. 실제 계정과 기존 운동 데이터는 그대로입니다.</p><p className="muted small">{s.owner ? '계정과 로그인 수단은 유지됩니다. 초기화 이전 기록의 재전송을 차단해야 합니다.' : '미동기화 로컬 기록도 탈퇴 대상입니다. 탈퇴 후 다른 계정으로 전송하거나 복구할 수 있는 기록처럼 취급하지 않습니다.'}</p><button className="primary" onClick={() => navigate(s.owner ? 'settings' : 'entry')}>{s.owner ? '계정 설정으로' : '로그인 화면으로'}</button></section>
  if (s.screen === 'conflict') return <section className="card stack"><p className="eyebrow">ACCOUNT & DATA SAFETY</p><h1>연결 상태를<br />확인해 주세요</h1><p>{s.message || '다른 기기에서 수정한 기록과 이 기기의 가상 기록이 다릅니다. 최신 수정이라고 무조건 덮어쓰지 않습니다.'}</p><div className="notice warning">계정이나 기록을 자동 병합하지 않습니다. 두 계정은 각자의 기존 로그인 수단으로 이용해 주세요.</div><p className="muted small">동일 이메일은 같은 계정임을 증명하지 않습니다. Google 고유 식별자로 연결 여부를 확인해야 합니다.</p><button className="primary" onClick={() => navigate(account ? 'settings' : 'entry')}>기존 로그인 수단으로 돌아가기</button></section>
  if (s.screen === 'confirm' && s.intent) {
    const destructive = s.intent === 'reset' || s.intent === 'withdraw'
    const word = s.intent === 'reset' ? '초기화' : '탈퇴'
    return <section className="card stack"><p className="eyebrow">FINAL CONFIRMATION · MOCK</p><h1>{INTENT_TITLES[s.intent]}</h1><p className="success-text">현재 가상 계정의 본인 확인을 완료했습니다.</p>
      {destructive ? <><p>{s.intent === 'reset' ? '계정과 로그인 수단은 유지하고 모든 운동 데이터만 초기화하는 시연입니다.' : '계정·로그인 수단과 모든 운동 데이터가 삭제되는 흐름을 시연합니다.'}</p><DeletionScope withdraw={s.intent === 'withdraw'} /><button className="outline" onClick={() => onDialog('export')}>먼저 가상 데이터 내보내기</button><label>최종 확인: “{word}” 입력<input autoComplete="off" value={s.confirmation} onChange={e => dispatch({ type: 'field', field: 'confirmation', value: e.target.value })} /></label><p className="muted small">실제 데이터 삭제는 수행하지 않습니다.</p></> : <p>{s.intent.startsWith('unlink') ? '마지막 남은 로그인 수단은 해제할 수 없습니다.' : '다음 단계에서 새 수단을 인증합니다. 동일 이메일만으로 자동 연결하지 않습니다.'}</p>}
      <button className={destructive ? 'preview-destructive' : 'primary'} disabled={destructive && s.confirmation !== word} onClick={() => dispatch({ type: 'confirm' })}>{destructive ? `가상 ${word} 최종 확인` : '계속하기'}</button><button className="quiet" onClick={() => navigate('settings')}>취소</button>
    </section>
  }
  if (!account) return null
  if (s.screen === 'logout') return <><p className="eyebrow">BEFORE YOU LEAVE</p><h1>아직 전송하지 않은<br />기록이 있어요</h1><p className="muted">현재 가상 계정에 {account.pending}건이 남아 있습니다. 다음 중 하나를 선택해 주세요.</p><SyncCard state={s} dispatch={dispatch} />
    <section className="card stack"><h2>동기화 후 로그아웃</h2><p className="muted small">가상 서버 저장 성공을 확인한 다음에만 로그아웃합니다. 실패하면 기록과 현재 계정을 유지합니다.</p><button className="primary" disabled={s.sync === 'syncing'} onClick={() => dispatch({ type: 'sync', logout: true })}>동기화 후 로그아웃</button></section>
    <section className="card stack"><h2>로컬 기록 유지하고 로그아웃</h2><p className="muted small">같은 계정으로 다시 로그인하면 동기화를 재시도할 수 있습니다. 다른 계정은 이 기록을 보거나 전송할 수 없습니다. 브라우저 데이터 삭제·기기 손실 시 유실될 수 있습니다.</p><button className="outline" disabled={s.sync === 'syncing'} onClick={() => dispatch({ type: 'logout', keep: true })}>로컬 기록 유지하고 로그아웃</button></section><button className="quiet full" onClick={() => navigate('settings')}>취소</button></>
  if (s.screen === 'workout') return <>
    <div className="preview-workout-clock"><div><span>가상 운동 시간</span><strong>00:32:18</strong></div><div><span>{s.workout.paused ? '휴식 중 (예시)' : s.workout.cardio ? '유산소 진행 (예시)' : '본세트 (예시)'}</span><strong>{s.workout.sets}세트</strong></div></div>
    {(s.auth === 'expired' || s.auth === 'refreshFailed') && <div className="notice warning"><strong>운동은 계속할 수 있어요</strong><p>인증이 만료됐습니다. 운동을 마친 후 같은 계정으로 재인증하면 동기화할 수 있습니다.</p></div>}
    <p className="eyebrow">PUSH DAY · FICTIONAL WORKOUT</p><h1>{s.workout.cardio ? '러닝머신' : '벤치프레스'}</h1><section className="card stack"><h2>운동 중 인증 만료 시연</h2><p>{s.workout.cardio ? '유산소 진행 상태 예시' : `60 kg · 완료 ${s.workout.sets}세트`}</p><p className="muted small">가상 동작을 위한 별도 화면입니다. 시간은 고정 예시이며 실제 세트·휴식·유산소 타이머에 연결되지 않습니다.</p><button className="primary" onClick={() => dispatch({ type: 'workout', action: 'set' })}>가상 세트 완료</button><button className="outline" onClick={() => dispatch({ type: 'workout', action: 'pause' })}>{s.workout.paused ? '가상 휴식 종료' : '가상 휴식 시작'}</button><button className="outline" onClick={() => dispatch({ type: 'workout', action: 'cardio' })}>{s.workout.cardio ? '가상 유산소 종료' : '가상 유산소 시작'}</button></section>
    <button className="primary full" onClick={() => dispatch({ type: 'workout', action: 'finish' })}>가상 운동 완료 및 요약</button>
  </>
  if (s.screen === 'summary') return <><p className="eyebrow">FINISHED ≠ SYNCED</p><h1>{s.workout.completed ? '운동을 마쳤어요' : '기록의 저장 상태'}</h1><p className="muted">운동 완료와 서버 저장 완료는 다릅니다. 이 화면의 기록과 저장 상태는 모두 가상입니다.</p><SyncCard state={s} dispatch={dispatch} /><p className="small muted">나중에 하기를 선택해도 현재 가상 기록은 이 프리뷰의 메모리에 남습니다. 새로고침하면 모든 목업 상태가 초기화됩니다.</p><button className="quiet full" onClick={() => navigate('home')}>나중에 하기</button></>
  if (s.screen === 'history') return <><p className="eyebrow">ONLY YOUR RECORDS · MOCK</p><h1>쌓여가는 기록</h1><p className="muted small">현재 가상 계정 {s.owner?.toUpperCase()}의 기록만 표시합니다.</p>{account.history.length ? account.history.map((record, index) => <section className="card" key={`${record}-${index}`}><h2>{record}</h2><p className="muted small">실제 운동 기록이 아닌 시연 데이터입니다.</p></section>) : <section className="card empty">아직 가상 기록이 없습니다.</section>}<SyncCard state={s} dispatch={dispatch} /></>
  if (s.screen === 'newRoutine') return <section className="card stack"><h1>새 루틴으로 시작하기</h1><p>기존 운동 이력과 루틴별 점진적 과부하 기록은 유지합니다. 새로운 루틴과 중량 기준을 준비하는 가상 동작입니다.</p><button className="primary" onClick={() => dispatch({ type: 'newRoutine' })}>새 가상 루틴 준비</button><button className="quiet" onClick={() => navigate('settings')}>취소</button></section>
  if (s.screen === 'routines') return <><p className="eyebrow">YOUR TRAINING PLAN · MOCK</p><h1>나의 루틴</h1><section className="card stack"><h2>가상 루틴 {account.routines}개</h2><p className="muted">새 루틴 만들기는 기존 운동 이력을 유지합니다. 실제 루틴 편집은 기존 앱을 이용해 주세요.</p><button className="primary" onClick={() => navigate('newRoutine')}>새 루틴으로 시작하기</button></section></>
  if (s.screen === 'home') return <><p className="eyebrow">YOUR PROGRESS · MOCK</p><h1>{account.nickname || '반가워요'}<br />오늘도 나의 속도로<span className="brand-dot">.</span></h1><p className="muted small">가상 계정 {s.owner?.toUpperCase()} · {account.email}</p><section className="card stack"><p className="eyebrow">TODAY’S ROUTINE</p><h2>운동 중에도 끊김 없이</h2><p className="muted">운동 중 인증이 만료되어도 조작을 막지 않는 흐름을 체험하세요.</p><button className="primary" onClick={() => dispatch({ type: 'workout', action: 'start' })}>가상 운동 시작</button></section><SyncCard state={s} dispatch={dispatch} /><button className="outline full" onClick={() => navigate('settings')}>계정 설정 살펴보기</button></>
  return <><p className="eyebrow">MAKE IT YOURS · MOCK</p><h1>계정 설정</h1><section className="card preview-profile"><span className="preview-avatar" aria-hidden="true">{account.nickname.slice(0, 1) || 'O'}</span><div><h2>{account.nickname || '닉네임 미설정'}</h2><p className="muted small">{account.email}</p><p className="preview-footnote">가상 계정 {s.owner?.toUpperCase()} · 닉네임은 선택</p></div></section>
    <section className="card stack"><h2>닉네임 설정 (선택)</h2><label>새 닉네임<input autoComplete="nickname" maxLength={30} placeholder="비워두면 닉네임 미설정" value={s.nickname} onChange={e => dispatch({ type: 'field', field: 'nickname', value: e.target.value })} /></label><button className="outline" onClick={() => dispatch({ type: 'saveNickname' })}>가상 닉네임 저장</button></section>
    <section className="card"><h2>연결된 로그인 수단</h2>{(['google', 'email'] as const).map(method => {
      const linked = method === 'google' ? account.googleLinked : account.emailLinked
      const title = method === 'google' ? 'Google' : '이메일 인증코드'
      const intent: Intent = method === 'google' ? linked ? 'unlinkGoogle' : 'linkGoogle' : linked ? 'unlinkEmail' : 'linkEmail'
      return <div className="preview-method" key={method}><div><strong>{title}</strong><p className="muted small">{linked ? '연결됨' : '연결 안 됨'}</p></div><button className="outline" onClick={() => dispatch({ type: 'sensitive', intent })}>{linked ? `${title} 해제` : `${title} 연결`}</button></div>
    })}<p className="muted small">연결 전 기존 계정을 재인증합니다. 마지막 로그인 수단은 해제할 수 없습니다.</p></section>
    <SyncCard state={s} dispatch={dispatch} />
    <section className="card settings-menu"><h2>데이터 관리</h2><Menu label="운동 데이터 내보내기" description="가상 기록 JSON 미리보기" onClick={() => onDialog('export')} /><Menu label="새 루틴으로 시작하기" description="운동 이력 유지 · 새로운 루틴과 중량 기준" onClick={() => navigate('newRoutine')} /><Menu label="운동 데이터 전체 초기화" description="계정 유지 · 재인증과 최종 확인" danger onClick={() => onDialog('reset')} /></section>
    <section className="card settings-menu"><Menu label="로그아웃" onClick={() => dispatch({ type: 'logout' })} /><Menu label="회원 탈퇴" description="계정과 모든 운동 데이터 삭제 흐름 시연" danger onClick={() => onDialog('withdraw')} /><Menu label="이용약관" onClick={() => onDialog('terms')} /><Menu label="개인정보 처리방침" onClick={() => onDialog('privacy')} /></section>
    <p className="muted small">휴식시간과 서버 진단 등 기존 설정은 실제 앱에 유지되어 있습니다.</p>
  </>
}

function Menu({ label, description, onClick, danger = false }: { label: string; description?: string; onClick: () => void; danger?: boolean }) {
  return <button className={`list-button ${danger ? 'danger' : ''}`} onClick={onClick}><span>{label}{description && <small>{description}</small>}</span><span aria-hidden="true">›</span></button>
}

export function DeletionScope({ withdraw = false }: { withdraw?: boolean }) {
  return <div className="notice warning"><p><strong>가상 삭제 대상</strong></p><ul>{withdraw && <li>계정 정보와 연결된 로그인 수단</li>}<li>루틴 및 완료 운동 이력</li><li>유산소 이력과 진행 중 운동</li><li>중량 승인 이벤트와 운동 관련 기준</li><li>동기화되지 않은 로컬 기록</li></ul><p>초기화·탈퇴 이전의 다른 기기 기록이 재전송되어 되살아나지 않도록 차단해야 합니다.</p></div>
}
