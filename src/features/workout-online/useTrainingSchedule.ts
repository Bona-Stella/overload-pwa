import { readWithDeadline } from '../../app/read-deadline.ts'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkoutTransport } from './api.ts'
import type { Scope } from './types.ts'
import type { ScheduleCommand } from './preset-schedule.ts'
import type { LiveSchedule } from '../statistics/weekly-schedule.ts'
import { WeeklyScheduleApi, scheduleIssue } from '../statistics/weekly-schedule.ts'
import { readHomeAnalysis, readHomeProtection } from '../statistics/deload-home.ts'
import type { HomeAnalysis, HomeProtection } from '../statistics/deload-home.ts'
import { boundaryError, readAccessDenied } from '../home/load.ts'
type Snapshot = {
  owner: string
  request: string
  schedule?: LiveSchedule
  protection?: HomeProtection
  issue?: string
  scheduleVerified: boolean
}

export function useTrainingSchedule(transport: WorkoutTransport, scope: Scope | null, revision: string, onInvalid: (error: unknown) => void, enabled = true) {
  const [api] = useState(() => new WeeklyScheduleApi(transport))
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [analysis, setAnalysis] = useState<{ owner: string; value: HomeAnalysis } | null>(null)
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState<{ owner: string; abort: AbortController } | null>(null)
  const [writeIssue, setWriteIssue] = useState<{ owner: string; text: string; tone: 'error' | 'warning' } | null>(null)
  const readFlight = useRef<AbortController | null>(null)
  const writeFlight = useRef<AbortController | null>(null)
  const refresh = useCallback(() => setReload(value => value + 1), [])
  const userId = scope?.userId, dataGeneration = scope?.dataGeneration
  const owner = userId && dataGeneration !== undefined ? userId + ':' + dataGeneration : null
  const request = [owner, revision, reload].join('|')
  const current = owner && snapshot?.owner === owner ? snapshot : null
  const loading = !!owner && current?.request !== request
  const busy = !!owner && saving?.owner === owner && !saving.abort.signal.aborted

  useEffect(() => () => {
    writeFlight.current?.abort()
    writeFlight.current = null
  }, [owner])
  useEffect(() => {
    if (!enabled || !owner || !userId || dataGeneration === undefined || busy) return
    const abort = new AbortController()
    readFlight.current = abort
    const scope = { userId, dataGeneration }
    const scheduleRead = readWithDeadline(abort.signal, signal => api.read(scope, signal))
    void scheduleRead.then(schedule => {
      if (abort.signal.aborted) return
      setSnapshot(previous => previous?.owner === owner ? { ...previous, schedule } : { owner, request: '', schedule, scheduleVerified: false })
    }, () => {})
    void readWithDeadline(abort.signal, signal => readHomeAnalysis(transport, scope, signal)).then(value => {
      if (!abort.signal.aborted) setAnalysis({ owner, value })
    }).catch(error => {
      if (abort.signal.aborted) return
      if (boundaryError(error)) onInvalid(error)
      if (readAccessDenied(error)) setAnalysis(null)
    })
    void Promise.allSettled([scheduleRead, readWithDeadline(abort.signal, signal => readHomeProtection(transport, scope, signal))]).then(([schedule, protection]) => {
      if (abort.signal.aborted) return
      for (const result of [schedule, protection]) {
        if (result.status === 'rejected' && boundaryError(result.reason)) { onInvalid(result.reason); return }
      }
      const issue = schedule.status === 'rejected' ? '일정을 불러오지 못했어요.'
        : protection.status === 'rejected' ? '디로딩 상태를 확인하지 못했어요. 다시 조회해 주세요.' : undefined
      setSnapshot(previous => ({
        owner, request, issue,
        scheduleVerified: schedule.status === 'fulfilled',
        schedule: schedule.status === 'fulfilled' ? schedule.value : !readAccessDenied(schedule.reason) && previous?.owner === owner ? previous.schedule : undefined,
        protection: protection.status === 'fulfilled' ? protection.value : undefined,
      }))
    })
    return () => abort.abort()
  }, [owner, userId, dataGeneration, request, api, transport, onInvalid, busy, enabled])

  // Returning to the app can cross a server-side rotation or deload boundary.
  useEffect(() => {
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [refresh])

  const canWrite = enabled && !!current?.schedule && current.scheduleVerified && !loading && current.protection === null && !busy
  async function write(command: ScheduleCommand, base = current?.schedule) {
    if (!scope || !owner || !canWrite || !base || writeFlight.current) return null
    const abort = new AbortController()
    writeFlight.current = abort
    readFlight.current?.abort()
    setSaving({ owner, abort })
    setWriteIssue(null)
    try {
      const saved = await api.write(scope, base, command, abort.signal)
      if (abort.signal.aborted) return null
      setSnapshot(previous => previous?.owner === owner ? { ...previous, schedule: saved } : previous)
      return saved
    } catch (error) {
      if (abort.signal.aborted) return null
      if (boundaryError(error)) onInvalid(error)
      else {
        const { code, status = 0 } = (error ?? {}) as { code?: string; status?: number }
        const conflict = code === 'SCHEDULE_STATE_VERSION_CONFLICT' || code === 'PRESET_VERSION_CONFLICT' || code === 'SCHEDULE_TIME_ZONE_CONFLICT'
        setWriteIssue({ owner, text: scheduleIssue(error), tone: conflict || !status || status >= 500 ? 'warning' : 'error' })
      }
      // Fetch current versions after a conflict or uncertain acknowledgement. Never replay the write.
      refresh()
      return null
    } finally {
      if (writeFlight.current === abort) {
        writeFlight.current = null
        setSaving(null)
      }
    }
  }
  return { schedule: current?.schedule, protection: current?.protection, analysis: analysis?.owner === owner ? analysis.value : undefined, loading, busy,
    canWrite, issue: current?.issue, writeIssue: writeIssue?.owner === owner ? writeIssue.text : null,
    writeIssueTone: writeIssue?.owner === owner ? writeIssue.tone : undefined,
    clearWriteIssue: () => setWriteIssue(null), refresh, write }
}
export type TrainingSchedule = ReturnType<typeof useTrainingSchedule>
