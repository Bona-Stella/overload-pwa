import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AppShell } from '../../../src/app/AppShell.tsx'
import type { AppTab } from '../../../src/app/types.ts'
import { RecordSubpageHeader } from '../../../src/components/RecordSubpageHeader.tsx'
import wordmark from '../../../src/assets/OVERLOAD_white_transparent_4x.png'
import { Card, Field } from '../../../src/components/ui.tsx'
import { ActionButton } from '../../../src/components/common-ui/ActionButton.tsx'
import { ActionDialog } from '../../../src/components/common-ui/ActionDialog.tsx'
import { draftSaveFailure, recordDeletionConsequence } from '../../../src/components/common-ui/message-copy.ts'
import type { DialogTone } from '../../../src/components/Dialog.tsx'
import { FeedbackIcon } from '../../../src/components/common-ui/FeedbackIcon.tsx'
import { ConnectionBanner, ContentError, EmptyState, FieldValidation, SkeletonRegion, SkeletonSlot } from '../../../src/components/common-ui/ContentFeedback.tsx'
import { RefreshButton } from '../../../src/components/common-ui/RefreshButton.tsx'
import { reviewRead } from './review-read.ts'
import { StatusTag, StatusText } from '../../../src/components/common-ui/StatusIndicator.tsx'
import { Toast } from '../../../src/components/common-ui/Toast.tsx'
import type { ToastMessage } from '../../../src/components/common-ui/Toast.tsx'
import { TagPickerExamples } from './TagPickerExamples.tsx'
import styles from './CommonUiPreview.module.css'

const Front18Review = lazy(() => import('./Front18Review.tsx'))
const refreshExamples = { success: '조회 성공', failure: '조회 실패', timeout: '응답 시간 초과' } as const
type RefreshExample = keyof typeof refreshExamples

function RefreshExamples() {
  const [example, setExample] = useState<RefreshExample | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [recovered, setRecovered] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  const refresh = () => {
    if (request.current) return
    const abort = new AbortController()
    request.current = abort
    setRefreshing(true)
    setFailure(null)
    void reviewRead(abort.signal, () => {
      if (example === 'failure') throw new TypeError('Preview response unavailable')
    }, { timeout: example === 'timeout' })
      .then(() => setRecovered(true), () => {
        if (abort.signal.aborted) return
        setFailure('연결할 수 없어요. 다시 시도해 주세요.')
        setExample('success')
      })
      .finally(() => {
        request.current = null
        if (!abort.signal.aborted) setRefreshing(false)
      })
  }

  return <section aria-label="조회 실패·새로고침 예시" className="stack">
    <div className={styles.controls}>{Object.entries(refreshExamples).map(([key, label]) =>
      <ActionButton key={key} disabled={refreshing} aria-pressed={example === key && !recovered} onClick={() => {
        setExample(key as RefreshExample)
        setFailure(null)
        setRecovered(false)
      }}>{label}</ActionButton>)}</div>
    {example && (recovered ? <Card><p>운동 기록을 불러왔어요.</p></Card>
      : <ContentError title="운동 기록을 불러오지 못했어요." action={<RefreshButton loading={refreshing} failure={failure} onRefresh={refresh} />} />)}
  </section>
}

const confirmationExamples = {
  finish: {
    kind: 'confirm', tone: 'warning', actionAppearance: 'warning', title: '운동을 종료할까요?',
    description: <>미완료 종목이 있어요.<br />완료한 기록만 요약에 표시돼요.</>,
    cancelLabel: '취소', confirmLabel: '운동 종료',
  },
  delete: {
    kind: 'destructive', title: '운동 기록을 삭제할까요?',
    description: recordDeletionConsequence,
    cancelLabel: '취소', confirmLabel: '삭제',
  },
  discard: {
    kind: 'destructive', title: '변경사항을 버릴까요?',
    description: '저장하지 않은 변경사항은 사라집니다.',
    cancelLabel: '계속 편집', confirmLabel: '버리기',
  },
  save: {
    kind: 'confirm', title: '변경 사항을 저장할까요?',
    description: '저장하면 변경 사항이 바로 적용돼요.',
    cancelLabel: '취소', confirmLabel: '저장',
  },
  recover: {
    kind: 'confirm', tone: 'recheck', title: '저장 결과를 확인해 주세요',
    description: '저장 여부를 아직 확인하지 못했어요.',
    cancelLabel: '닫기', confirmLabel: '다시 확인',
  },
  critical: {
    kind: 'confirm', tone: 'critical', title: draftSaveFailure.title,
    description: <>{draftSaveFailure.retained}<br />{draftSaveFailure.next}</>,
    cancelLabel: '닫기', confirmLabel: draftSaveFailure.retry,
  },
} as const

const noticeExamples = {
  alert: {
    tone: 'error',
    title: '기록을 불러오지 못했어요',
    description: '잠시 후 다시 시도해 주세요.',
  },
  recommendation: {
    tone: 'info',
    title: '증량 가능',
    description: '벤치 프레스의 목표 반복을 달성한 검토용 예시예요.',
  },
  success: { tone: 'success', title: '변경 사항이 저장됐어요.', description: '이 화면에서 계속 확인할 수 있어요.' },
} as const

const isNotice = (value: DialogExample): value is keyof typeof noticeExamples => Object.hasOwn(noticeExamples, value)

type DialogExample = keyof typeof confirmationExamples | keyof typeof noticeExamples
function confirmationTone(example: keyof typeof confirmationExamples, pending: boolean): DialogTone | undefined {
  if (example === 'save' && pending) return 'processing'
  if (example === 'finish' || example === 'recover' || example === 'critical') return confirmationExamples[example].tone
}

const toastExamples = {
  success: '변경 사항이 저장됐어요.',
  error: '저장하지 못했어요.',
  warning: '반복 횟수를 입력해 주세요.',
  info: '다른 기기에서 운동 중이에요.',
}

const emptyExamples = {
  routine: {
    title: '등록된 루틴이 없어요', description: '새 루틴을 만들면 이곳에 표시돼요.',
    path: 'M5 4h14v16H5zM9 4v16M3 8h4m-4 4h4m-4 4h4m5-8h4m-4 4h4',
  },
  history: {
    title: '아직 운동 기록이 없어요', description: '운동을 완료하면 이곳에 기록이 표시돼요.',
    path: 'M3 12a9 9 0 1 0 3-6.7M3 3v5h5M12 7v5l3 2',
  },
  search: {
    title: '검색 결과가 없어요', description: '다른 검색어나 조건으로 다시 찾아보세요.',
    path: 'M16 16l4 4M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8 8l4 4m0-4-4 4',
  },
}

export default function CommonUiPreview() {
  return new URLSearchParams(location.search).has('front18')
    ? <Suspense fallback={<p role="status">검수 항목을 준비하는 중입니다.</p>}><Front18Review /></Suspense>
    : <ComponentExamples />
}

function ComponentExamples() {
  const [tab, setTab] = useState<AppTab>('settings')
  const [dialog, setDialog] = useState<DialogExample | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const nextToastId = useRef(0)
  const confirmationTimer = useRef<number | null>(null)
  const [showButtons, setShowButtons] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<number | null>(null)
  const [skeleton, setSkeleton] = useState<'loading' | 'loaded' | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [empty, setEmpty] = useState<keyof typeof emptyExamples | null>(null)
  const [header, setHeader] = useState<'basic' | 'long' | 'action' | null>(null)
  const [editing, setEditing] = useState(false)
  const headerTrigger = useRef<HTMLButtonElement | null>(null)
  const [showStatus, setShowStatus] = useState(false)
  const [connection, setConnection] = useState<'offline' | 'syncing' | null>(null)

  useEffect(() => () => {
    if (confirmationTimer.current !== null) window.clearTimeout(confirmationTimer.current)
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
  }, [])

  const announce = (tone: ToastMessage['tone'], message = toastExamples[tone]) => {
    setToast({ id: ++nextToastId.current, tone, message })
  }
  const dismissDialog = () => {
    if (confirmationTimer.current !== null) window.clearTimeout(confirmationTimer.current)
    confirmationTimer.current = null
    setConfirming(false)
    setDialog(null)
  }
  const confirmDialog = () => {
    if (confirmationTimer.current !== null) return
    if (dialog === 'save' || dialog === 'delete') {
      setConfirming(true)
      confirmationTimer.current = window.setTimeout(() => {
        dismissDialog()
        announce('success', dialog === 'delete' ? '삭제 동작이 완료됐어요.' : undefined)
      }, 1600)
      return
    }
    dismissDialog()
    announce('info', '확인 동작이 실행됐어요.')
  }
  const saveExample = () => {
    if (saveTimer.current !== null) return
    setSaving(true)
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      setSaving(false)
      announce('success')
    }, 1600)
  }
  const emptyExample = empty && emptyExamples[empty]

  return <AppShell tab={tab} onNavigate={setTab} authenticated>
    <div className={styles.intro}>
      <h1>공통 UI Preview</h1>
      <p>검토용 예시 데이터</p>
      <a href="?front18=1">FRONT 18 안내·오류·복구 검수</a>
    </div>

    <section className={styles.section}>
      <h2>모달</h2>
      <div className={styles.controls}>
        <ActionButton size="small" onClick={() => setDialog('recommendation')}>일반 안내</ActionButton>
        <ActionButton size="small" onClick={() => setDialog('success')}>성공 모달 디자인 예시</ActionButton>
        <ActionButton size="small" onClick={() => setDialog('finish')}>미완료 운동 종료</ActionButton>
        <ActionButton size="small" onClick={() => setDialog('delete')}>삭제 확인</ActionButton>
        <ActionButton size="small" onClick={() => setDialog('discard')}>미저장 변경</ActionButton>
        <ActionButton size="small" onClick={() => setDialog('alert')}>단일 안내</ActionButton>
        <ActionButton size="small" onClick={() => setDialog('recover')}>저장 결과 미확인</ActionButton>
        <ActionButton size="small" onClick={() => setDialog('critical')}>입력 저장 실패</ActionButton>
        <ActionButton size="small" onClick={() => setDialog('save')}>저장 처리 중</ActionButton>
      </div>
      {dialog && (isNotice(dialog)
        ? <ActionDialog open kind="alert" {...noticeExamples[dialog]} confirmLabel="확인" onDismiss={dismissDialog} />
        : <ActionDialog open {...confirmationExamples[dialog]} tone={confirmationTone(dialog, confirming)} onDismiss={dismissDialog}
          onConfirm={confirmDialog} pending={confirming}
          pendingLabel={dialog === 'save' ? '저장 중' : dialog === 'delete' ? '삭제 중' : undefined} />)}
    </section>

    <section className={styles.section}>
      <h2>토스트</h2>
      <div className={styles.controls}>
        <ActionButton size="small" onClick={() => announce('success')}>성공</ActionButton>
        <ActionButton size="small" onClick={() => announce('error')}>오류</ActionButton>
        <ActionButton size="small" onClick={() => announce('info')}>안내</ActionButton>
        <ActionButton size="small" onClick={() => announce('warning')}>경고</ActionButton>
      </div>
    </section>

    <section className={styles.section}>
      <h2>버튼과 처리 중 상태</h2>
      <div className={styles.controls}>
        <ActionButton size="small" aria-expanded={showButtons} onClick={() => setShowButtons(value => !value)}>버튼 예시</ActionButton>
      </div>
      {showButtons && <div className={styles.examples}>
        <div className={styles.buttonPair}>
          <ActionButton appearance="contrast-outline" onClick={() => setToast(null)}>취소</ActionButton>
          <ActionButton appearance="primary" onClick={saveExample} loading={saving} loadingLabel="저장 중">변경 사항 저장</ActionButton>
        </div>
        <div className={styles.buttonPair}>
          <ActionButton appearance="warning" onClick={() => setDialog('finish')}>미완료 운동 종료 확인</ActionButton>
          <ActionButton appearance="danger-primary" onClick={() => setDialog('delete')}>삭제</ActionButton>
        </div>
        <ActionButton appearance="danger-outline" onClick={() => setDialog('delete')}>루틴 삭제</ActionButton>
        <ActionButton disabled>변경 사항 저장</ActionButton>
        <ActionButton appearance="danger-primary" disabled>삭제 불가</ActionButton>
        <div className={styles.controls}>
          <ActionButton size="small" onClick={() => announce('info', '편집 버튼 동작 예시예요.')}>편집</ActionButton>
          <ActionButton size="small" onClick={() => setDialog('alert')}>연결 확인</ActionButton>
        </div>
      </div>}
    </section>

    <section className={styles.section}>
      <h2>콘텐츠 로딩</h2>
      <div className={styles.controls}>
        <ActionButton size="small" aria-pressed={skeleton === 'loading'} onClick={() => setSkeleton('loading')}>스켈레톤 표시</ActionButton>
        <ActionButton size="small" aria-pressed={skeleton === 'loaded'} onClick={() => setSkeleton('loaded')}>콘텐츠 표시</ActionButton>
      </div>
      {skeleton && <SettingsLoadingExample loading={skeleton === 'loading'} />}
    </section>

    <section className={styles.section}>
      <h2>인라인 입력 오류</h2>
      <div className={styles.controls}>
        <ActionButton size="small" aria-expanded={showForm} onClick={() => setShowForm(value => !value)}>검증 예시</ActionButton>
      </div>
      {showForm && <ValidationExample onSave={() => announce('success')} />}
    </section>

    <section className={styles.section}>
      <h2>빈 상태</h2>
      <div className={styles.controls}>
        <ActionButton size="small" onClick={() => setEmpty('routine')}>루틴 없음</ActionButton>
        <ActionButton size="small" onClick={() => setEmpty('history')}>기록 없음</ActionButton>
        <ActionButton size="small" onClick={() => setEmpty('search')}>검색 결과 없음</ActionButton>
      </div>
      <h3>조회 실패·새로고침</h3>
      <RefreshExamples />
      {emptyExample && <EmptyState title={emptyExample.title} description={emptyExample.description}
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={emptyExample.path} /></svg>} />}
    </section>

    <TagPickerExamples />

    <section className={styles.section}>
      <h2>서브페이지 헤더</h2>
      <div className={styles.controls}>
        <ActionButton size="small" onClick={event => { headerTrigger.current = event.currentTarget; setHeader('basic'); setEditing(false) }}>기본 서브페이지 헤더 보기</ActionButton>
        <ActionButton size="small" onClick={event => { headerTrigger.current = event.currentTarget; setHeader('long'); setEditing(false) }}>긴 제목</ActionButton>
        <ActionButton size="small" onClick={event => { headerTrigger.current = event.currentTarget; setHeader('action'); setEditing(false) }}>우측 액션형</ActionButton>
      </div>
      {header && <div className={styles.headerExample}>
        <RecordSubpageHeader title={header === 'basic' ? '계정 설정' : header === 'long' ? '운동 기록과 로그인된 기기 관리 설정' : '세트 사이 휴식'}
          backLabel="헤더 예시 닫기" brandImage={{ src: wordmark, alt: 'OVERLOAD', width: 3624, height: 428 }}
          onBack={() => { setHeader(null); headerTrigger.current?.focus() }}
          action={header === 'action' && <ActionButton size="small" onClick={() => setEditing(value => !value)}>{editing ? '취소' : '편집'}</ActionButton>} />
        <Card><h2>{header === 'action' ? '반복 구간별 휴식 시간' : '로그인 수단'}</h2></Card>
      </div>}
    </section>

    <section className={styles.section}>
      <h2>상태 태그와 텍스트</h2>
      <div className={styles.controls}>
        <ActionButton size="small" aria-expanded={showStatus} onClick={() => setShowStatus(value => !value)}>상태 표시 예시</ActionButton>
      </div>
      {showStatus && <Card className={styles.statuses}>
        <div><strong>벤치 프레스</strong><StatusTag kind="recommendation" label="증량 가능" onOpenDetails={() => setDialog('recommendation')} /></div>
        <div><strong>iPad Pro</strong><StatusTag kind="activity" label="운동 진행 중" /></div>
        <div><strong>로그인된 기기 관리</strong><StatusTag kind="quantity" label="3대" /></div>
        <div><strong>이메일 로그인</strong><StatusText kind="connected" label="연결됨" /></div>
        <div><strong>디로딩 설정</strong><StatusText kind="muted" label="미구현" /></div>
        <div><strong>iPhone 15 Pro</strong><StatusText kind="online" label="온라인" /></div>
        <div><strong>MacBook Air</strong><StatusText kind="offline" label="오프라인" /></div>
      </Card>}
    </section>

    <section className={styles.section}>
      <h2>오프라인·동기화 상태 카드</h2>
      <div className={styles.controls}>
        <ActionButton size="small" onClick={() => setConnection(null)}>정상</ActionButton>
        <ActionButton size="small" onClick={() => setConnection('offline')}>오프라인</ActionButton>
        <ActionButton size="small" onClick={() => setConnection('syncing')}>동기화 중</ActionButton>
      </div>
      {connection === 'offline' && <ConnectionBanner state="offline"
        title="인터넷 연결이 끊겼어요" description="화면은 유지돼요. 연결 복구 후 저장 상태를 확인해 주세요." />}
      {connection === 'syncing' && <ConnectionBanner state="syncing"
        title="운동 기록을 동기화하는 중" description="서버 저장 결과를 확인하고 있어요." />}
      <div className={styles.controls}><FeedbackIcon name="upload" size={20} /><span>서버 전송</span></div>
      <p>최근 운동 기록</p>
    </section>

    <Toast toast={toast} bottomClearance="var(--tabs-height)"
      onDismiss={id => setToast(current => current?.id === id ? null : current)} />
  </AppShell>
}

function ValidationExample({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const error = submitted && !name.trim() ? '루틴 이름을 입력해 주세요.' : undefined

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (!name.trim()) {
      nameInput.current?.focus()
      return
    }
    onSave()
  }

  return <form className={styles.examples} noValidate onSubmit={submit}>
    <Card>
      <FieldValidation error={error}>{attributes => <Field label="루틴 이름 *">
        <input {...attributes} required ref={nameInput} value={name}
          placeholder="루틴 이름을 입력해 주세요" onChange={event => setName(event.target.value)} />
      </Field>}</FieldValidation>
      <Field label="루틴 태그"><select defaultValue=""><option value="">미지정</option><option>PUSH</option></select></Field>
    </Card>
    <ActionButton appearance="primary" type="submit">변경 사항 저장</ActionButton>
  </form>
}

function SettingsLoadingExample({ loading }: { loading: boolean }) {
  return <div className={styles.examples} data-loading-example>
    <SkeletonRegion loading={loading}>
      <Card hero aria-label="계정 요약">
        <div className={styles.loadingRow}>
          <SkeletonSlot loading={loading} shape="circle" placeholderWidth={46}>
            <span className={styles.avatar} aria-hidden="true">O</span>
          </SkeletonSlot>
          <div>
            <SkeletonSlot loading={loading} placeholderWidth="45%"><strong>내 계정</strong></SkeletonSlot>
            <SkeletonSlot loading={loading}><small>overload@example.test</small></SkeletonSlot>
          </div>
        </div>
        <div className={styles.stats}>
          <div><SkeletonSlot loading={loading}>로그인 방식</SkeletonSlot><SkeletonSlot loading={loading}><strong>Google SSO</strong></SkeletonSlot></div>
          <div><SkeletonSlot loading={loading}>로그인된 기기</SkeletonSlot><SkeletonSlot loading={loading}><strong>2대</strong></SkeletonSlot></div>
        </div>
      </Card>
    </SkeletonRegion>
  </div>
}
