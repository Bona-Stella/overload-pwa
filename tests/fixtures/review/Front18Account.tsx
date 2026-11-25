import { useEffect, useState, useSyncExternalStore } from 'react'
import { AccountSettings } from '../../../src/features/auth/AccountSettings.tsx'
import { AuthApi, AuthError } from '../../../src/features/auth/api.ts'
import type { Contact, Identity } from '../../../src/features/auth/api.ts'
import { AuthController } from '../../../src/features/auth/controller.ts'
import { Button } from '../../../src/components/ui.tsx'
import { PwaStatusView } from '../../../src/pwa/PwaStatus.tsx'
import { DevicesReview } from './DevicesReview.tsx'
import { ignore, sleep } from './front18-pages.ts'
import { reviewRead } from './review-read.ts'
import { scope } from './routine-samples.ts'
import styles from './CommonUiPreview.module.css'

type LinkExample = 'success' | 'already' | 'unknown' | 'readback' | 'owned' | 'proof' | 'unlink-unknown'
type OtpExample = 'success' | 'invalid' | 'limited' | 'expired' | 'failed'
const code = '123456'
const email: Identity = { provider: 'email', id: 'review-email' }
const google: Identity = { provider: 'google', id: 'review-google' }
const verified: Contact = { status: 'VERIFIED', maskedEmail: 'r***@example.test' }
const required: Contact = { status: 'REQUIRED', candidate: { id: 'review-candidate', maskedEmail: 'r***@example.test' } }

export function Front18Account({ onBack }: { onBack: () => void }) {
  const [fixture] = useState(() => {
    let contact: Contact = verified, identities: Identity[] = [google], clockOffset = 0, linking: LinkExample = 'success'
    let otp: OtpExample = 'success', readUnavailable = 0, retryRead = false
    let lifetime: AbortController | undefined
    const api = Object.assign(new AuthApi(async () => { throw new AuthError('NETWORK') }), {
      session: async () => ({ userId: scope.userId }), refreshCsrf: async () => {}, clearCsrf: ignore,
      contact: async () => contact,
      identities: (signal?: AbortSignal) => {
        const failed = readUnavailable > 0
        if (failed) readUnavailable--
        const delayed = failed || retryRead
        retryRead = failed
        if (!delayed) return Promise.resolve([...identities])
        return reviewRead(signal ?? lifetime?.signal, () => {
          if (failed) throw new AuthError('NETWORK')
          return [...identities]
        })
      },
      requestEmailProof: async () => 'review-challenge',
      verifyEmailProof: async (_id: string, value: string, candidate?: string) => {
        if (otp === 'limited') throw new AuthError('OTP_RATE_LIMITED', 429, 60)
        if (otp === 'failed') throw new AuthError('NETWORK')
        if (otp === 'invalid' || value !== code) throw new AuthError('OTP_INVALID', 400)
        if (candidate) contact = verified
      },
      cancelRegistration: async () => { contact = { status: 'REQUIRED' } },
      unlinkIdentity: async (identity: Identity) => {
        await sleep(650)
        if (linking === 'unlink-unknown') throw new AuthError('TIMEOUT')
        identities = identities.filter(value => value.id !== identity.id)
      },
      linkEmail: async () => {
        if (linking === 'proof') throw new AuthError('EMAIL_OWNERSHIP_PROOF_REQUIRED', 409)
        if (linking === 'owned') throw new AuthError('IDENTITY_ALREADY_OWNED', 409)
        if (linking === 'unknown') throw new AuthError('TIMEOUT')
        identities = [google, email]
        if (linking === 'readback') readUnavailable = 2
        return { identity: email, status: linking === 'already' ? 'ALREADY_LINKED' : 'LINKED' }
      },
      googleLinkForm: async () => ({ csrf: 'preview' }), googleContactForm: async () => ({ csrf: 'preview', identityId: google.id }),
    }) as AuthApi
    const now = () => Date.now() + clockOffset
    const controller = new AuthController(api, now, ignore)
    controller.beginContactNavigation = () => { contact = required; void controller.restore('contact-complete'); return false }
    controller.beginLinkNavigation = () => { identities = [email, google]; void controller.restore('link-complete'); return false }
    return { controller, now,
      beginLifetime: () => {
        const abort = new AbortController()
        lifetime = abort
        return () => abort.abort()
      },
      prepare: async (config: { registration?: boolean; both?: boolean; otp?: OtpExample; link?: LinkExample } = {}) => {
        contact = config.registration ? required : verified
        identities = config.both ? [google, email] : [google]
        linking = config.link ?? 'success'
        otp = config.otp ?? 'success'
        clockOffset += 10 * 60_000
        readUnavailable = 0
        retryRead = false
        await controller.restore('account')
      },
      expire: () => { clockOffset += 6 * 60_000 },
    }
  })
  const { controller } = fixture
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const shownState = state.pending === 'account' && state.issue?.code === 'EMAIL_LINK_STATUS_UNCONFIRMED'
    ? { ...state, account: { ...state.account, loaded: false } } : state
  useEffect(() => {
    const dispose = fixture.beginLifetime()
    void controller.start('account')
    return dispose
  }, [controller, fixture])
  const proof = async (registration: boolean, otp: OtpExample = 'success', verify = true) => {
    await fixture.prepare({ registration, otp })
    await controller.requestEmailProof()
    if (otp === 'expired') fixture.expire()
    if (verify) await controller.verifyEmailProof(code)
  }
  const link = async (example: LinkExample) => { await fixture.prepare({ link: example, both: example === 'already' }); await controller.linkEmail() }
  return <>
    <details className="card" open><summary>상태 전환 · 계정 설정</summary>
      <p>직접 OTP를 입력할 때는 검수 코드 {code}를 사용하세요.</p>
      <div className={styles.controls}>
        <Button disabled={!!state.pending} onClick={() => void fixture.prepare()}>정상 계정 상태</Button>
        <Button disabled={!!state.pending} onClick={() => void fixture.prepare({ registration: true })}>대표 이메일 등록 필요·후보</Button>
        <Button disabled={!!state.pending} onClick={() => void proof(false, 'success', false)}>재인증 코드 발송·입력</Button>
        <Button disabled={!!state.pending} onClick={() => void proof(false)}>이메일 재인증 성공</Button>
        <Button disabled={!!state.pending} onClick={() => void proof(true)}>대표 이메일 등록 성공</Button>
        <Button disabled={!!state.pending} onClick={async () => { await fixture.prepare({ registration: true }); await controller.cancelRegistration() }}>대표 이메일 등록 취소 성공</Button>
        <Button disabled={!!state.pending} onClick={() => void proof(false, 'invalid')}>OTP 불일치</Button>
        <Button disabled={!!state.pending} onClick={() => void proof(false, 'expired')}>OTP 만료</Button>
        <Button disabled={!!state.pending} onClick={() => void proof(false, 'limited')}>OTP 입력 제한</Button>
        <Button disabled={!!state.pending} onClick={() => void proof(false, 'failed')}>OTP 검증 결과 미확인</Button>
        <Button disabled={!!state.pending} onClick={() => void link('success')}>이메일 로그인 연결 성공</Button>
        <Button disabled={!!state.pending} onClick={() => void link('already')}>이미 연결된 이메일 로그인 확인</Button>
        <Button disabled={!!state.pending} onClick={async () => { await fixture.prepare({ both: true }); await controller.restore('link-complete') }}>Google 로그인 연결 확인 성공</Button>
        <Button disabled={!!state.pending} onClick={() => void controller.restore('link-failed')}>Google 로그인 연결 실패</Button>
        <Button disabled={!!state.pending} onClick={() => void link('owned')}>다른 계정에 이미 연결된 이메일</Button>
        <Button disabled={!!state.pending} onClick={() => void link('proof')}>연결 전 재인증 필요</Button>
        <Button disabled={!!state.pending} onClick={() => void link('unknown')}>이메일 연결 요청 결과 미확인</Button>
        <Button disabled={!!state.pending} onClick={() => void link('readback')}>이메일 연결 처리 후 상태 조회 실패</Button>
        <Button disabled={!!state.pending} onClick={async () => { await fixture.prepare({ both: true }); controller.selectUnlink(email) }}>이메일 로그인 해제 확인</Button>
        <Button disabled={!!state.pending} onClick={async () => { await fixture.prepare({ both: true }); controller.selectUnlink(google) }}>Google 로그인 해제 확인</Button>
        <Button disabled={!!state.pending} onClick={async () => { await fixture.prepare({ both: true, link: 'unlink-unknown' }); controller.selectUnlink(email) }}>로그인 수단 해제 결과 미확인</Button>
        <Button onClick={onBack}>검수 분류로 돌아가기</Button>
      </div>
    </details>
    <AccountSettings state={shownState} controller={controller} now={fixture.now()} onBack={onBack} DevicesPage={DevicesReview} />
  </>
}

export function Front18Pwa({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'ready' | 'offline' | 'update' | 'failed'>('ready')
  return <>
    <div className={styles.controls}>
      <Button onClick={() => setMode('ready')}>앱 화면 준비</Button>
      <Button onClick={() => setMode('offline')}>앱 화면 미준비</Button>
      <Button onClick={() => setMode('update')}>업데이트 준비</Button>
      <Button onClick={() => setMode('failed')}>설치·업데이트 확인 실패</Button>
      <Button onClick={onBack}>검수 분류로 돌아가기</Button>
    </div>
    <PwaStatusView review state={{ ready: mode === 'ready' || mode === 'update', waiting: mode === 'update', failed: mode === 'failed', installable: false }} />
  </>
}
