import { useEffect, useState, useSyncExternalStore } from 'react'
import { Dialog } from '../../../src/components/Dialog.tsx'
import { Button } from '../../../src/components/ui.tsx'
import { LocalWorkoutScreen } from '../../../src/features/workout-local/LocalWorkoutScreen.tsx'
import { OfflineResumeOffer } from '../../../src/features/workout-local/OfflineResume.tsx'
import { AuthError } from '../../../src/features/auth/api.ts'
import { authIssue } from '../../../src/features/auth/controller.ts'
import { SessionView, workoutNavigationFailure, workoutPermissionFailure } from '../../../src/features/workout-online/WorkoutWorkspace.tsx'
import { CombinationMemoProvider } from '../../../src/features/workout-online/CombinationMemo.tsx'
import { activities, exercises, manufacturers } from './routine-samples.ts'
import { reviewRest } from './workout-model.ts'
import { createWorkoutExample } from './front18-workout.ts'
import type { WorkoutExample } from './front18-workout.ts'
import { Front18Record } from './Front18Records.tsx'
import styles from './CommonUiPreview.module.css'

const inputExamples = {
  reps: '8회 (미정) · 반복 횟수 미입력', weight: '중량 미입력', 'reps-range': '반복 횟수 범위 오류',
  'weight-range': '중량 범위 오류', extra: '맨몸 추가 중량 범위 오류', time: '유산소 활동 시간 없음',
  'time-range': '유산소 시간 정정 범위 오류', distance: '유산소 거리 범위 오류', speed: '유산소 속도 범위 오류',
  'speed-only': '실측 속도만 입력', 'estimated-speed': '예상 거리와 수정 속도', 'derived-distance': '계산 거리 불일치',
  motion: '거리·속도를 지원하지 않는 종목', bpm: '유산소 심박수 범위 오류', undo: '완료 세트 취소',
  'cardio-undo': '유산소 완료 취소', approval: '중량 승인 충돌 및 재선택',
  warmup: '준비운동부터 시작', done: '완료한 운동 · 종료 및 요약',
  assessment: '잠정 중량 검토 조회 실패·재시도',
} satisfies Partial<Record<WorkoutExample, string>>
const recoveryExamples = { offline: '이 기기에 보존된 운동 이어가기', 'offline-error': '오프라인 원본 조회 실패',
  'offline-empty': '오프라인 원본 없음', 'open-error': '로컬 운동 열기 실패', 'read-only': '편집 잠금 · 읽기 전용' } satisfies Partial<Record<WorkoutExample, string>>
const defensiveInputs = new Set(['reps-range', 'weight-range', 'extra', 'derived-distance', 'motion'])

export function Front18Workout({ onExit }: { onExit: () => void }) {
  const [setup, setSetup] = useState({ example: 'reps' as WorkoutExample, attempt: 0 })
  const reset = (example: WorkoutExample) => setSetup(previous => ({ example, attempt: previous.attempt + 1 }))
  return <CombinationMemoProvider key={setup.attempt}>
    <WorkoutExampleView example={setup.example} reset={reset} onExit={onExit} />
  </CombinationMemoProvider>
}

function WorkoutExampleView({ example, reset, onExit }: { example: WorkoutExample; reset: (value: WorkoutExample) => void; onExit: () => void }) {
  const [fixture] = useState(() => createWorkoutExample(example))
  const { controller } = fixture
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [handoff, setHandoff] = useState(false)
  const [handingOff, setHandingOff] = useState(false)
  const [localOnly, setLocalOnly] = useState(example === 'offline')
  const [offered, setOffered] = useState(example.startsWith('offline'))
  const [navigationIssue, setNavigationIssue] = useState<string>()
  const [permissionIssue, setPermissionIssue] = useState<string>()
  const summary = state.workout?.finish?.ack ? fixture.remote() : null
  useEffect(() => () => { fixture.releaseWrite(); fixture.releaseDelivery() }, [fixture])

  const run = (action: () => unknown) => { setToolsOpen(false); void action() }
  const begin = (next: WorkoutExample) => { setToolsOpen(false); reset(next) }
  const retry = () => { fixture.setOffline(false); fixture.setReadFailed(false); fixture.setFinishFault('none'); fixture.releaseWrite(); fixture.releaseDelivery(); setLocalOnly(false); void controller.retrySync() }
  const delayedSave = () => {
    fixture.holdWrite()
    fixture.draft()
    window.setTimeout(fixture.releaseWrite, 5000)
  }
  const canWrite = state.writable && !state.workout?.finish
  const hasWeight = canWrite && !!state.workout?.snapshot.appliedPlan.weightExercises.length
  const controls = <>
    <h3>저장 상태·내부 처리</h3>
    <div className={styles.controls}>
      <Button onClick={() => begin('reps')}>저장 완료 · 정상 상태 초기화</Button>
      <Button disabled={!hasWeight} onClick={() => run(delayedSave)}>저장 중 · 5초 지연 후 완료</Button>
      <Button disabled={!hasWeight} onClick={() => run(() => { fixture.setOffline(true); return fixture.sync() })}>전송 대기 · 연결 끊김</Button>
      <Button disabled={!hasWeight} onClick={() => run(() => { fixture.failWrite(); fixture.draft() })}>저장 실패 · 로컬 초안</Button>
      <Button disabled={!hasWeight} onClick={() => run(() => { fixture.failWrite(); return fixture.sync() })}>IndexedDB 저장 실패</Button>
      <Button disabled={!hasWeight} onClick={() => run(() => { fixture.setSnapshotFault('reject'); return fixture.sync() })}>자동 동기화 거절</Button>
      <Button disabled={!hasWeight} onClick={() => run(() => { fixture.setSnapshotFault('once'); return fixture.sync() })}>응답 유실 후 자동 재시도</Button>
      <Button disabled={!hasWeight} onClick={() => run(() => { fixture.holdDelivery(); window.setTimeout(fixture.releaseDelivery, 5000); return fixture.sync() })}>서버 응답 5초 지연</Button>
      <Button onClick={() => run(() => { fixture.setReadFailed(true); return controller.retrySync() })}>저장과 무관한 조회 오류</Button>
      <Button onClick={() => run(retry)}>재연결·복구 가능 상태로 전환</Button>
    </div>
    <h3>입력·선택·작업 오류</h3>
    <p>상태를 구성한 뒤 운동 화면의 완료, 수정 또는 이동 버튼을 누르세요.</p>
    <div className={styles.controls}>
      {Object.entries(inputExamples).filter(([value]) => !defensiveInputs.has(value)).map(([value, label]) => <Button key={value} onClick={() => begin(value as WorkoutExample)}>{label}</Button>)}
      <Button disabled={!canWrite} onClick={() => run(fixture.failWrite)}>다음 완료·취소·종목 이동 실패 예약</Button>
      <Button disabled={!hasWeight} onClick={() => run(async () => {
        fixture.failWrite(); fixture.draft(); await controller.settled(); fixture.failWrite()
        if (!await controller.flushDrafts()) setNavigationIssue(workoutNavigationFailure)
      })}>화면 이동 전 초안 저장 실패</Button>
    </div>
    <h3>방어 검증 · 비정상 값 복원</h3>
    <p>정상 입력에서 차단되는 값이나 서로 맞지 않는 값이 복원됐을 때의 검수예요. 상태를 선택하고 해당 세트나 유산소 완료를 눌러 보세요.</p>
    <div className={styles.controls}>
      {Object.entries(inputExamples).filter(([value]) => defensiveInputs.has(value)).map(([value, label]) => <Button key={value} onClick={() => begin(value as WorkoutExample)}>{label}</Button>)}
    </div>
    <h3>운동 종료</h3>
    <p>오류를 선택한 뒤 운동 화면에서 ‘운동 종료’를 누르고 종료를 확인하세요.</p>
    <div className={styles.controls}>
      <Button onClick={() => run(() => { fixture.holdDelivery(); window.setTimeout(fixture.releaseDelivery, 5000) })}>다음 종료 처리 5초 지연</Button>
      <Button onClick={() => run(fixture.failWrite)}>다음 종료 로컬 저장 실패</Button>
      <Button onClick={() => run(() => fixture.setFinishFault('reject'))}>다음 종료 서버 거절</Button>
      <Button onClick={() => run(() => fixture.setFinishFault('lost'))}>다음 종료 결과 미확인</Button>
      <Button onClick={() => run(fixture.failSummary)}>종료 확정 후 요약 조회 실패</Button>
      <Button onClick={() => begin('future-finish')}>종료 시각이 마지막 수행보다 이름</Button>
    </div>
    <h3>오프라인·기기 인계·복원</h3>
    <div className={styles.controls}>
      {Object.entries(recoveryExamples).map(([value, label]) => <Button key={value} onClick={() => begin(value as WorkoutExample)}>{label}</Button>)}
      <Button onClick={() => run(() => { fixture.changeWriter(); return controller.retrySync() })}>다른 기기에서 수정 · 편집권 충돌</Button>
      <Button onClick={() => run(() => { fixture.changeWriter(); setHandoff(true) })}>읽기 전용 세션·기기 인계</Button>
      <Button onClick={() => run(() => setPermissionIssue(workoutPermissionFailure))}>오프라인 재실행 허용 저장 실패</Button>
    </div>
    <Button onClick={onExit}>검수 분류로 돌아가기</Button>
  </>
  return <>
    {summary ? <Front18Record session={summary} example={fixture.summaryFault ? 'summary-failed' : undefined} onBack={() => reset('reps')} />
      : handoff ? <SessionView session={fixture.remote()} deviceId={fixture.initial.editorDeviceId} busy={handingOff} saved
        onRefresh={() => { setHandoff(false); void controller.retrySync() }} onTakeover={async () => {
          setHandingOff(true)
          await new Promise(resolve => setTimeout(resolve, 1500))
          reset('reps')
        }} />
      : offered ? <section aria-label="오프라인 운동 이어가기"><OfflineResumeOffer
        status={example === 'offline-error' ? 'failed' : example === 'offline-empty' ? 'unavailable' : 'ready'}
        disabled={false} onContinue={() => setOffered(false)} /></section>
      : <LocalWorkoutScreen server={fixture.initial} policy={reviewRest} definitions={exercises} manufacturers={manufacturers} activities={activities}
        authorized={() => true} editor={controller} localOnly={localOnly} authenticated={!localOnly} assessmentApi={fixture.assessmentApi}
        offlineRestart={localOnly} onReconnect={retry} onRecheckSession={() => setHandoff(true)}
        navigationIssue={state.unsavedDrafts ? navigationIssue : undefined} permissionIssue={permissionIssue}
        accountIssue={localOnly ? authIssue(new AuthError('NETWORK')).message : undefined}
        onHome={() => setToolsOpen(true)} backLabel="운동 검수 도구" />}
    <div className={`${styles.controls} ${styles.workoutTools}`}>
      <Button onClick={() => setToolsOpen(true)}>운동 검수 도구 열기</Button>
      <Button onClick={onExit}>검수 분류로 돌아가기</Button>
    </div>
    {toolsOpen && <Dialog title="운동 검수 도구" onClose={() => setToolsOpen(false)}><div className="stack">{controls}</div></Dialog>}
  </>
}
