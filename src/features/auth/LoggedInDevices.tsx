import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { ContentError, EmptyState } from '../../components/common-ui/ContentFeedback.tsx'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { useState } from 'react'
import type { ReactNode, Ref } from 'react'
import { Dialog } from '../../components/Dialog.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { AccountIcon, AccountNote } from './AccountDetailUi.tsx'
import styles from './LoggedInDevices.module.css'

export type LoggedInDevice = {
  id: string
  name: string | null
  environment: string | null
  kind: 'phone' | 'tablet' | 'computer' | 'devices'
  presence: 'online' | 'offline' | 'unknown'
  signedInAt: string | null
  lastSeenAt: string | null
}

export type DevicesSnapshot = {
  devices: readonly LoggedInDevice[]
  currentDeviceId: string | null
  workout: { kind: 'none' | 'unknown' } | { kind: 'active'; deviceId: string | null }
  observedAt: number
  timeZone?: string
}

export type DevicesState =
  | { status: 'unsupported' | 'loading' | 'error' }
  | { status: 'ready'; snapshot: DevicesSnapshot }

export type DevicesNavigation = { onBack: () => void; headingRef?: Ref<HTMLHeadingElement> }

type PreviewTarget = { kind: 'device'; device: LoggedInDevice } | { kind: 'others' | 'all' }
const countLabel = (count: number | null) => count === null ? '—' : count + '대'
const deviceName = (device: LoggedInDevice) => device.name || '알 수 없는 기기'

function timestamp(value: string | null) {
  const parsed = value ? Date.parse(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

function DeviceTime({ value, snapshot, relative = false }: { value: string | null; snapshot: DevicesSnapshot; relative?: boolean }) {
  const time = timestamp(value)
  if (time === null || value === null) return <>—</>
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: snapshot.timeZone, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(time)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value
  const absolute = `${part('month')}.${part('day')} ${part('hour')}:${part('minute')}`
  const elapsed = snapshot.observedAt - time
  const label = relative && elapsed >= 0 && elapsed < 3_600_000
    ? elapsed < 60_000 ? '방금' : Math.floor(elapsed / 60_000) + '분 전'
    : absolute
  return <time dateTime={value} title={absolute}>{label}</time>
}

function Presence({ device }: { device: LoggedInDevice }) {
  return <span className={styles.presence} data-presence={device.presence}>
    <span aria-hidden="true" />{device.presence === 'online' ? '온라인' : device.presence === 'offline' ? '오프라인' : '접속 확인 불가'}
  </span>
}

function DeviceCard({ device, snapshot, current = false, canPreviewLogout = false, onPreviewLogout }: {
  device: LoggedInDevice
  snapshot: DevicesSnapshot
  current?: boolean
  canPreviewLogout?: boolean
  onPreviewLogout?: () => void
}) {
  const editor = snapshot.workout.kind === 'active' ? snapshot.workout.deviceId : null
  const isEditor = editor === device.id
  const readOnly = current && !isEditor && editor !== null && snapshot.devices.some(item => item.id === editor)
  return <Card aria-label={current ? '현재 접속한 기기' : deviceName(device)}>
    {current && <div className={styles.row}><span>현재 접속한 기기</span><Presence device={device} /></div>}
    <div className={styles.deviceHeading}>
      <span className={styles.deviceIcon}><AccountIcon name={device.kind} /></span>
      <div className={styles.deviceName}><h3>{deviceName(device)}</h3><p>{device.environment || '환경 확인 불가'}</p></div>
      {current ? <span className={styles.thisDevice}>이 기기</span> : <Presence device={device} />}
    </div>
    {!current && isEditor && <p className={styles.workout}><AccountIcon name="workout" />운동 진행 중</p>}
    <dl className={styles.times}>
      <div><dt>로그인 일시</dt><dd><DeviceTime value={device.signedInAt} snapshot={snapshot} /></dd></div>
      <div><dt>마지막 접속</dt><dd><DeviceTime value={device.lastSeenAt} snapshot={snapshot} relative /></dd></div>
    </dl>
    {current && (isEditor || readOnly) && <div className={styles.workout} data-read-only={readOnly || undefined}>
      <AccountIcon name={isEditor ? 'workout' : 'eye'} />
      <div><strong>{isEditor ? '이 기기에서 운동 진행 중' : '현재 운동은 읽기 전용'}</strong>
        <p>{isEditor ? '운동 기록을 이 기기에서 조작할 수 있어요.' : '다른 기기에서 운동이 진행 중이에요.'}</p></div>
    </div>}
    {!current && <Button className={styles.action} disabled={!canPreviewLogout} onClick={onPreviewLogout}
      aria-label={deviceName(device) + ' · 이 기기 로그아웃'}><AccountIcon name="logout" />이 기기 로그아웃</Button>}
  </Card>
}

export function LoggedInDevices({ onBack, headingRef, state = { status: 'unsupported' }, previewControls, onRetry, refreshing }: DevicesNavigation & {
  state?: DevicesState; previewControls?: ReactNode; onRetry?: () => void; refreshing?: boolean
}) {
  const [target, setTarget] = useState<PreviewTarget | null>(null)
  const snapshot = state.status === 'ready' ? state.snapshot : null
  const devices = snapshot?.devices ?? []
  const current = devices.find(device => device.id === snapshot?.currentDeviceId)
  const others = devices.filter(device => device !== current).toSorted((a, b) =>
    (timestamp(b.lastSeenAt) ?? Number.MIN_SAFE_INTEGER) - (timestamp(a.lastSeenAt) ?? Number.MIN_SAFE_INTEGER))
  const knownPresence = snapshot && devices.every(device => device.presence !== 'unknown')
  const online = knownPresence ? devices.filter(device => device.presence === 'online').length : null
  const preview = !!previewControls
  const canPreview = preview && !!current
  const editor = snapshot?.workout.kind === 'active' ? snapshot.workout.deviceId : null
  const affected = target?.kind === 'device' ? [target.device] : target?.kind === 'others' ? others : devices
  return <section className={styles.page} aria-label="로그인된 기기">
    <RecordSubpageHeader title="로그인된 기기" backLabel="계정 설정으로" headingRef={headingRef} onBack={onBack} />
    {preview && <><p className={styles.preview}>검토용 예시 · 실제 로그인 세션과 별개입니다.</p>{previewControls}</>}
    <Card className={styles.summary}>
      <div className={styles.row}><h2>접속 현황</h2><AccountIcon name="devices" /></div>
      <dl className={styles.metrics}>
        <div><dt>로그인된 기기</dt><dd>{countLabel(snapshot ? devices.length : null)}</dd></div>
        <div><dt>온라인</dt><dd>{countLabel(online)}</dd></div>
        <div><dt>오프라인</dt><dd>{countLabel(online === null ? null : devices.length - online)}</dd></div>
      </dl>
    </Card>
    {state.status === 'unsupported' ? <Card><AccountNote>로그인된 기기 목록은 아직 제공되지 않아요.</AccountNote></Card>
      : state.status === 'loading' ? <LoadingSkeleton layout="settings" label="로그인된 기기를 확인하고 있어요." />
      : state.status === 'error' ? <ContentError title="로그인된 기기를 불러오지 못했어요." action={onRetry && <RefreshButton onRefresh={onRetry} loading={refreshing} />} />
      : snapshot && <>
      {current && <DeviceCard device={current} snapshot={snapshot} current />}
      {devices.length > 0 && !current && <AccountNote>현재 접속한 기기를 확인할 수 없습니다.</AccountNote>}
      <div className={styles.row}><h2>{current ? '다른 기기' : '로그인 기기 목록'}</h2><span>{countLabel(others.length)}</span></div>
      {others.length ? <div className={styles.deviceList}>{others.map(device => <DeviceCard key={device.id} device={device} snapshot={snapshot}
        canPreviewLogout={canPreview} onPreviewLogout={() => setTarget({ kind: 'device', device })} />)}</div>
        : <EmptyState icon={<AccountIcon name="devices" />} title={current ? '다른 기기에 로그인되어 있지 않아요' : '로그인된 기기가 없어요'} />}
    </>}
    <div className={styles.footer}>
      <Button className={styles.action} disabled={!canPreview || !others.length} onClick={() => setTarget({ kind: 'others' })}>
        <AccountIcon name="screenOff" />다른 기기 모두 로그아웃
      </Button>
      <Button className={`${styles.action} ${styles.danger}`} disabled={!canPreview} onClick={() => setTarget({ kind: 'all' })}>
        <AccountIcon name="logout" />모든 기기에서 로그아웃
      </Button>
      {preview
        ? <AccountNote>다른 기기를 로그아웃해도 이 기기의 로그인 상태는 유지돼요. 모든 기기 로그아웃에는 현재 기기도 포함됩니다.</AccountNote>
        : <AccountNote>원격 로그아웃은 현재 지원되지 않습니다. 이 기기에서 로그아웃하려면 설정의 로그아웃을 사용해 주세요.</AccountNote>}
    </div>
    {preview && target && <Dialog title="로그아웃 확인" tone="warning" onClose={() => setTarget(null)}>
      <div className="stack">
        <p>{target.kind === 'device' ? deviceName(target.device) : target.kind === 'others' ? '다른 기기 모두' : '모든 기기'}</p>
        <p>{target.kind === 'all' ? '현재 기기도 로그아웃 대상에 포함됩니다.' : '이 기기의 로그인 상태는 유지됩니다.'}</p>
        {editor !== null && affected.some(device => device.id === editor) &&
          <p className={styles.warning}>운동 진행 중인 기기가 포함되어 있어요.<br />운동 기록 보존과 편집 권한을 확인해 주세요.</p>}
        <p className="muted small">검수용 화면이며 실제 기기에 요청을 보내지 않아요.</p>
        <Button variant="neutral" onClick={() => setTarget(null)}>취소</Button>
        <Button variant="warning" onClick={() => setTarget(null)}>시안 확인</Button>
      </div>
    </Dialog>}
  </section>
}
