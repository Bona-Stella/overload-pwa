import type { AuthState } from './controller.ts'

export function AuthFeedback({ state }: { state: Pick<AuthState, 'issue' | 'notice' | 'challenge'> }) {
  return <div id="auth-feedback" aria-live="polite">
    {state.issue && <div className="notice error" role="alert">{state.issue.message}</div>}
    {state.notice && !state.challenge && <p className="notice" role="status">{state.notice}</p>}
  </div>
}
