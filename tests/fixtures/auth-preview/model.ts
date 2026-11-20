// Development-only fixtures. No production model, browser storage or API dependencies.
export type Owner = 'a' | 'b' | 'new'
export type Method = 'email' | 'google'
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'reauth' | 'failed' | 'conflict' | 'resetBlocked' | 'localFailed'
export type Screen = 'entry' | 'code' | 'google' | 'signup' | 'home' | 'routines' | 'history' | 'settings' | 'workout' | 'summary' | 'logout' | 'reauth' | 'confirm' | 'conflict' | 'done' | 'newRoutine'
export type Intent = 'linkGoogle' | 'linkEmail' | 'unlinkGoogle' | 'unlinkEmail' | 'reset' | 'withdraw' | 'sync'
type Auth = 'signedOut' | 'active' | 'restored' | 'expired' | 'refreshFailed'
type Context = 'signin' | 'linkEmail' | 'linkGoogle' | 'reauth'
type Account = { email: string; nickname: string; emailLinked: boolean; googleLinked: boolean; pending: number; history: string[]; routines: number; deleted: boolean; registered: boolean }
export type PreviewState = {
  screen: Screen; auth: Auth; owner: Owner | null; identity: Owner; accounts: Record<Owner, Account>
  sync: SyncStatus; email: string; code: string; codeStatus: 'idle' | 'sending' | 'sent'
  expiresAt: number; resendAt: number; sends: number; attempts: number; context: Context
  intent: Intent | null; verifiedFor: Intent | null; accepted: boolean; nickname: string
  linkConflict: 'none' | 'sameEmail' | 'googleOwned' | 'twoAccounts'; message: string; done: string
  workout: { sets: number; paused: boolean; cardio: boolean; completed: boolean }
  logoutAfterSync: boolean; confirmation: string
}
export const TEST_CODE = '123456'
export const CODE_LIFETIME = 5 * 60_000
export const RESEND_DELAY = 30_000
export const SYNC_LABELS: Record<SyncStatus, [string, string]> = {
  synced: ['모두 동기화됨', '가상 서버에 저장된 상태입니다.'],
  syncing: ['동기화 중', '가상 서버의 저장 결과를 기다리고 있습니다.'],
  pending: ['동기화 대기', '운동은 완료했지만 서버 저장은 아직입니다.'],
  offline: ['네트워크 연결 안 됨', '연결 후 같은 계정으로 동기화해 주세요.'],
  reauth: ['재인증 필요', '같은 계정으로 다시 인증하면 전송할 수 있습니다.'],
  failed: ['동기화 실패', '원본을 유지했습니다. 다시 시도할 수 있습니다.'],
  conflict: ['다른 기기의 기록 변경과 충돌', '어느 기록도 자동으로 덮어쓰지 않았습니다. 기록 확인이 필요합니다.'],
  resetBlocked: ['초기화 이전 기록 전송 차단', '다른 기기의 이전 기록이 되살아나지 않도록 전송을 차단한 예시입니다.'],
  localFailed: ['로컬 임시 저장 실패', '현재 입력은 메모리에만 있습니다. 화면을 닫으면 유실될 수 있습니다.'],
}
export const SCENARIOS = [
  ['entry', '기존 이메일 로그인'], ['new', '신규 이메일 가입'], ['email', '이메일만 연결'], ['google', 'Google만 연결'], ['both', '두 수단 연결'],
  ['restored', '자동 로그인 복원'], ['expired', '인증 만료'], ['refreshFailed', '세션 갱신 실패'], ['workout', '운동 중 인증 만료'],
  ['synced', '모두 동기화됨'], ['pending', '동기화 대기 / 로그아웃'], ['syncing', '동기화 중'], ['offline', '오프라인'], ['failed', '동기화 실패'],
  ['conflict', '기기 간 충돌'], ['resetBlocked', '초기화 이전 전송 차단'], ['localFailed', '로컬 임시 저장 실패'],
  ['codeWrong', '인증코드 오류'], ['codeExpired', '인증코드 만료'], ['codeLimited', '인증 / 재발송 제한'],
  ['sameEmail', '동일 이메일 미연결'], ['googleOwned', 'Google이 다른 계정 소유'], ['twoAccounts', '두 계정의 운동 데이터 충돌'], ['reauthFailed', '기존 계정 재인증 실패'],
] as const
export type Scenario = typeof SCENARIOS[number][0]

export function createPreview(): PreviewState {
  return {
    screen: 'entry', auth: 'signedOut', owner: null, identity: 'a', sync: 'synced',
    accounts: {
      a: { email: 'athlete@overload.example', nickname: '꾸준한 나', emailLinked: true, googleLinked: false, pending: 0, history: ['PUSH DAY · 가상 기록 A', '러닝머신 20분 · 가상 기록 A'], routines: 3, deleted: false, registered: true },
      b: { email: 'other@overload.example', nickname: '다른 계정', emailLinked: true, googleLinked: true, pending: 0, history: ['PULL DAY · 가상 기록 B'], routines: 1, deleted: false, registered: true },
      new: { email: 'new@overload.example', nickname: '', emailLinked: false, googleLinked: false, pending: 0, history: [], routines: 0, deleted: false, registered: false },
    },
    email: 'athlete@overload.example', code: '', codeStatus: 'idle', expiresAt: 0, resendAt: 0, sends: 0, attempts: 0,
    context: 'signin', intent: null, verifiedFor: null, accepted: false, nickname: '', linkConflict: 'none', message: '', done: '',
    workout: { sets: 1, paused: false, cardio: false, completed: false }, logoutAfterSync: false, confirmation: '',
  }
}

export function visibleAccount(s: PreviewState) {
  return s.owner && s.auth !== 'signedOut' ? s.accounts[s.owner] : null
}
function accountUpdate(s: PreviewState, patch: Partial<Account>): PreviewState {
  if (!s.owner) return s
  return { ...s, accounts: { ...s.accounts, [s.owner]: { ...s.accounts[s.owner], ...patch } } }
}
function signIn(s: PreviewState, method: Method): PreviewState {
  const account = s.accounts[s.identity]
  if (account.deleted) return { ...s, screen: 'entry', message: '탈퇴를 시연한 계정입니다. 개발 패널에서 시나리오를 다시 시작해 주세요.' }
  if (!account.registered) return { ...s, screen: 'signup', context: method === 'email' ? 'signin' : 'linkGoogle', message: '', accepted: false }
  if (!(method === 'email' ? account.emailLinked : account.googleLinked)) return { ...s, screen: 'conflict', message: '이 로그인 수단은 기존 계정에 연결되지 않았습니다. 기존 수단으로 로그인한 뒤 설정에서 연결해 주세요. 동일 이메일만으로 자동 연결하지 않습니다.' }
  return { ...s, owner: s.identity, auth: 'active', screen: 'home', sync: account.pending ? 'pending' : 'synced', message: '가상 로그인 완료. 실제 인증은 수행하지 않았습니다.', intent: null, verifiedFor: null }
}
function verified(s: PreviewState): PreviewState {
  if (!s.owner || !s.intent) return s
  return { ...s, auth: 'active', verifiedFor: s.intent, screen: s.intent === 'sync' ? s.logoutAfterSync ? 'logout' : 'summary' : 'confirm', sync: s.sync === 'reauth' ? 'pending' : s.sync, message: '같은 가상 계정의 재인증을 완료했습니다.', confirmation: '' }
}
function finishVerification(s: PreviewState): PreviewState {
  if (s.context === 'signin') return signIn(s, 'email')
  if (s.context === 'reauth') return verified(s)
  if (!s.owner || s.verifiedFor !== s.intent) return s
  if (s.linkConflict !== 'none') return { ...s, screen: 'conflict', message: conflictMessage(s.linkConflict) }
  return { ...accountUpdate(s, { emailLinked: true, email: s.email.trim() }), screen: 'settings', verifiedFor: null, intent: null, message: '가상 이메일 인증 수단을 연결했습니다.' }
}
export function conflictMessage(kind: PreviewState['linkConflict']) {
  return kind === 'sameEmail' ? '이메일 주소는 같지만 아직 같은 계정으로 확인되지 않았습니다. 자동 연결하지 않습니다. 기존 로그인 수단으로 재인증한 뒤 연결을 다시 시도해 주세요.'
    : kind === 'googleOwned' ? '이 Google 계정은 다른 Overload 계정에 연결되어 있습니다. 현재 계정에 연결할 수 없습니다. 원래 계정의 로그인 수단을 확인해 주세요.'
    : '두 Overload 계정에 서로 다른 운동 데이터가 있습니다. MVP에서는 로그인 수단 연결만 지원하며 계정이나 운동 기록을 자동 병합하지 않습니다.'
}

export function scenarioState(scenario: Scenario, now: number): PreviewState {
  let s = createPreview()
  if (scenario === 'entry') return s
  if (scenario === 'new') return { ...s, identity: 'new', email: s.accounts.new.email }
  s = { ...s, owner: 'a', auth: 'active', screen: 'settings' }
  if (scenario === 'email') return s
  if (scenario === 'google' || scenario === 'both') return accountUpdate(s, { googleLinked: true, emailLinked: scenario === 'both' })
  if (scenario === 'restored') return { ...s, auth: 'restored', screen: 'home', message: '자동 로그인 복원 예시입니다. 앱 종료나 화면 잠금만으로 로그아웃되지 않습니다.' }
  if (scenario === 'expired' || scenario === 'refreshFailed') return { ...s, auth: scenario, sync: 'reauth', screen: 'summary', accounts: accountUpdate(s, { pending: 1 }).accounts }
  if (scenario === 'workout') return { ...s, auth: 'expired', sync: 'reauth', screen: 'workout' }
  if (scenario.startsWith('code')) return { ...createPreview(), screen: 'code', context: 'signin', codeStatus: 'sent', code: scenario === 'codeWrong' ? '000000' : '', expiresAt: scenario === 'codeExpired' ? now - 1 : now + CODE_LIFETIME, resendAt: now + RESEND_DELAY, sends: scenario === 'codeLimited' ? 3 : 1, attempts: scenario === 'codeLimited' ? 5 : 0, message: scenario === 'codeWrong' ? '코드가 올바르지 않습니다. 다시 입력해 주세요.' : '' }
  if (scenario === 'reauthFailed') return { ...s, screen: 'reauth', intent: 'linkGoogle', message: '기존 계정 재인증에 실패했습니다. 연결은 변경되지 않았습니다. 다시 시도해 주세요.' }
  if (scenario === 'sameEmail' || scenario === 'googleOwned' || scenario === 'twoAccounts') return { ...s, linkConflict: scenario, message: '설정에서 Google 연결을 눌러 충돌 흐름을 체험하세요.' }
  const sync = scenario as SyncStatus
  s = accountUpdate(s, { pending: scenario === 'synced' ? 0 : 2 })
  return { ...s, sync, screen: scenario === 'pending' ? 'logout' : 'summary' }
}

export type PreviewAction =
  | { type: 'scenario'; scenario: Scenario; now: number }
  | { type: 'navigate'; screen: Screen }
  | { type: 'field'; field: 'email' | 'code' | 'nickname' | 'confirmation'; value: string }
  | { type: 'accept'; value: boolean }
  | { type: 'identity'; owner: Owner }
  | { type: 'send'; now: number; context?: Context }
  | { type: 'sent'; now: number }
  | { type: 'verify'; now: number }
  | { type: 'google'; context: 'signin' | 'linkGoogle' | 'reauth' }
  | { type: 'googleResult'; result: 'success' | 'cancel' | 'failed' }
  | { type: 'signup' }
  | { type: 'sensitive'; intent: Intent }
  | { type: 'confirm' }
  | { type: 'logout'; keep?: boolean }
  | { type: 'sync'; logout?: boolean }
  | { type: 'syncResult'; success: boolean }
  | { type: 'workout'; action: 'set' | 'pause' | 'cardio' | 'finish' | 'start' }
  | { type: 'expire' }
  | { type: 'networkRestored' }
  | { type: 'codeTime'; expired?: boolean }
  | { type: 'newRoutine' }
  | { type: 'saveNickname' }

export function previewReducer(s: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'scenario': return scenarioState(action.scenario, action.now)
    case 'navigate': return { ...s, screen: action.screen, message: '', verifiedFor: null, confirmation: '', logoutAfterSync: false }
    case 'field': return { ...s, [action.field]: action.field === 'code' ? action.value.replace(/\D/g, '').slice(0, 6) : action.value, message: '' }
    case 'accept': return { ...s, accepted: action.value }
    case 'identity': return { ...s, identity: action.owner, email: s.accounts[action.owner].email, message: '' }
    case 'send': {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) return { ...s, message: '올바른 이메일 주소를 입력해 주세요.' }
      if (s.codeStatus === 'sending') return s
      if (s.sends >= 3) return { ...s, message: '재발송 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요. 목업에서는 시나리오를 다시 선택할 수 있습니다.' }
      if (action.now < s.resendAt) return { ...s, message: '재발송 대기시간이 남았습니다.' }
      return { ...s, screen: 'code', context: action.context ?? s.context, codeStatus: 'sending', code: '', message: '' }
    }
    case 'sent': return s.codeStatus !== 'sending' ? s : { ...s, codeStatus: 'sent', expiresAt: action.now + CODE_LIFETIME, resendAt: action.now + RESEND_DELAY, attempts: 0, sends: s.sends + 1 }
    case 'verify': {
      if (s.codeStatus !== 'sent') return s
      if (s.attempts >= 5) return { ...s, message: '인증 시도 제한에 도달했습니다. 새 코드를 요청해 주세요.' }
      if (action.now >= s.expiresAt) return { ...s, message: '인증코드가 만료되었습니다. 새 코드를 요청해 주세요.' }
      if (s.code !== TEST_CODE) return { ...s, attempts: s.attempts + 1, message: s.attempts === 4 ? '인증 시도 제한에 도달했습니다. 새 코드를 요청해 주세요.' : '코드가 올바르지 않습니다. 다시 입력해 주세요.' }
      return finishVerification({ ...s, code: '', codeStatus: 'idle', sends: 0, resendAt: 0, attempts: 0 })
    }
    case 'google': return { ...s, screen: 'google', context: action.context, message: '' }
    case 'googleResult': {
      if (s.screen !== 'google') return s
      if (action.result !== 'success') return { ...s, screen: s.context === 'signin' ? 'entry' : s.context === 'reauth' ? 'reauth' : 'settings', message: action.result === 'cancel' ? 'Google 로그인을 취소했습니다. 다시 시도하거나 이메일을 이용해 주세요.' : 'Google 인증에 실패했습니다. 연결과 기록은 변경되지 않았습니다.' }
      if (s.context === 'reauth') return verified(s)
      if (s.context === 'signin') return signIn(s, 'google')
      if (!s.owner || s.verifiedFor !== 'linkGoogle') return s
      if (s.linkConflict !== 'none') return { ...s, screen: 'conflict', message: conflictMessage(s.linkConflict) }
      return { ...accountUpdate(s, { googleLinked: true }), screen: 'settings', intent: null, verifiedFor: null, message: '가상 Google 로그인 수단을 연결했습니다.' }
    }
    case 'signup': {
      if (s.screen !== 'signup' || !s.accepted) return { ...s, message: '이용약관과 개인정보 처리방침 예시를 확인하고 동의해 주세요.' }
      const account = { ...s.accounts.new, email: s.email, nickname: s.nickname.trim(), emailLinked: s.context === 'signin', googleLinked: s.context === 'linkGoogle', registered: true }
      return { ...s, accounts: { ...s.accounts, new: account }, owner: 'new', auth: 'active', screen: 'home', sync: 'synced', message: '가상 가입 완료. 실제 계정은 생성되지 않았습니다.' }
    }
    case 'sensitive': {
      if (!s.owner) return s
      return { ...s, screen: 'reauth', intent: action.intent, verifiedFor: null, message: '', email: s.accounts[s.owner].email, codeStatus: 'idle', sends: 0, resendAt: 0, attempts: 0 }
    }
    case 'confirm': {
      if (!s.owner || !s.intent || s.verifiedFor !== s.intent || s.screen !== 'confirm') return s
      const account = s.accounts[s.owner]
      if (s.intent === 'linkGoogle') return { ...s, screen: 'google', context: 'linkGoogle' }
      if (s.intent === 'linkEmail') return { ...s, screen: 'code', context: 'linkEmail', codeStatus: 'idle', sends: 0, resendAt: 0, code: '' }
      if (s.intent === 'unlinkGoogle' || s.intent === 'unlinkEmail') {
        if (!account.googleLinked || !account.emailLinked) return { ...s, message: '마지막 남은 로그인 수단은 해제할 수 없습니다.' }
        return { ...accountUpdate(s, s.intent === 'unlinkGoogle' ? { googleLinked: false } : { emailLinked: false }), screen: 'settings', verifiedFor: null, intent: null, message: '가상 로그인 수단 연결을 해제했습니다.' }
      }
      if (s.intent === 'reset' || s.intent === 'withdraw') {
        const word = s.intent === 'reset' ? '초기화' : '탈퇴'
        if (s.confirmation !== word) return { ...s, message: `최종 확인란에 “${word}”를 입력해 주세요.` }
        const next = accountUpdate(s, { history: [], pending: 0, routines: 0, deleted: s.intent === 'withdraw', ...(s.intent === 'withdraw' ? { emailLinked: false, googleLinked: false } : {}) })
        return { ...next, screen: 'done', sync: 'resetBlocked', owner: s.intent === 'withdraw' ? null : s.owner, auth: s.intent === 'withdraw' ? 'signedOut' : s.auth, done: s.intent === 'withdraw' ? '가상의 탈퇴 완료' : '가상의 운동 데이터 초기화 완료', verifiedFor: null, intent: null, message: '', workout: { sets: 0, paused: false, cardio: false, completed: true } }
      }
      return s
    }
    case 'logout': {
      const account = visibleAccount(s)
      if (account?.pending && !action.keep) return { ...s, screen: 'logout', message: '' }
      return { ...s, owner: null, auth: 'signedOut', screen: 'entry', sync: 'synced', intent: null, verifiedFor: null, context: 'signin', code: '', codeStatus: 'idle', sends: 0, resendAt: 0, message: action.keep ? '가상 기록을 이전 계정 전용으로 유지하고 로그아웃했습니다. 브라우저 데이터 삭제·기기 손실 시 유실될 수 있습니다. 같은 계정으로 다시 로그인해 주세요.' : '가상 로그아웃 완료.' }
    }
    case 'sync': {
      if (!s.owner) return s
      if (s.auth === 'expired' || s.auth === 'refreshFailed') return { ...previewReducer(s, { type: 'sensitive', intent: 'sync' }), logoutAfterSync: action.logout ?? s.logoutAfterSync }
      if (['offline', 'conflict', 'resetBlocked', 'localFailed'].includes(s.sync)) return { ...s, message: s.sync === 'offline' ? '먼저 인터넷 연결을 복원해 주세요. 개발 패널에서 연결 상태를 전환할 수 있습니다.' : SYNC_LABELS[s.sync][1] }
      return { ...s, sync: 'syncing', logoutAfterSync: action.logout ?? s.logoutAfterSync, message: '' }
    }
    case 'syncResult': {
      if (s.sync !== 'syncing' || !s.owner) return s
      if (!action.success) return { ...s, sync: 'failed', screen: s.logoutAfterSync ? 'logout' : s.screen, logoutAfterSync: false, message: '가상 동기화 실패. 원본 기록을 유지했습니다.' }
      const next = { ...accountUpdate(s, { pending: 0 }), sync: 'synced' as const, logoutAfterSync: false, message: '가상 서버 저장 확인 완료.' }
      return s.logoutAfterSync ? previewReducer(next, { type: 'logout' }) : next
    }
    case 'workout': {
      if (!s.owner) return s
      if (action.action === 'start') return { ...s, screen: 'workout', workout: { sets: 0, cardio: false, paused: false, completed: false } }
      if (s.workout.completed) return s
      if (action.action === 'finish') {
        const account = s.accounts[s.owner]
        return { ...accountUpdate(s, { pending: account.pending + 1, history: ['오늘의 가상 운동 · 서버 저장 대기', ...account.history] }), screen: 'summary', workout: { ...s.workout, completed: true }, sync: s.auth === 'expired' || s.auth === 'refreshFailed' ? 'reauth' : 'pending' }
      }
      return { ...s, workout: { ...s.workout, sets: s.workout.sets + (action.action === 'set' ? 1 : 0), paused: action.action === 'pause' ? !s.workout.paused : s.workout.paused, cardio: action.action === 'cardio' ? !s.workout.cardio : s.workout.cardio } }
    }
    case 'expire': return { ...s, auth: 'expired', sync: 'reauth', verifiedFor: null, screen: s.intent && ['confirm', 'google', 'code'].includes(s.screen) ? 'reauth' : s.screen, message: s.intent ? '인증이 만료되었습니다. 민감한 작업을 계속하려면 같은 계정으로 다시 인증해 주세요.' : '인증이 만료되어도 가상 운동을 계속할 수 있습니다.' }
    case 'networkRestored': return s.sync !== 'offline' ? s : { ...s, sync: s.auth === 'expired' || s.auth === 'refreshFailed' ? 'reauth' : 'pending', message: '가상 네트워크 연결을 복원했습니다. 동기화를 다시 시도해 주세요.' }
    case 'codeTime': return { ...s, resendAt: 0, ...(action.expired ? { expiresAt: 0 } : {}) }
    case 'newRoutine': return s.owner ? { ...accountUpdate(s, { routines: s.accounts[s.owner].routines + 1 }), screen: 'routines', message: '새 가상 루틴과 중량 기준을 준비했습니다. 기존 이력과 루틴별 진행 기록은 유지됩니다.' } : s
    case 'saveNickname': return s.owner ? { ...accountUpdate(s, { nickname: s.nickname.trim().slice(0, 30) }), message: '가상 닉네임 설정을 저장했습니다. 비워두면 닉네임 미설정으로 표시됩니다.' } : s
  }
}
