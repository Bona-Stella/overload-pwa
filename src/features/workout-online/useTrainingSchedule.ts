import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkoutTransport } from './api.ts'
import type { Scope } from './types.ts'
import type { ScheduleCommand } from './preset-schedule.ts'
import type { LiveSchedule } from '../statistics/weekly-schedule.ts'
import { WeeklyScheduleApi, scheduleIssue } from '../statistics/weekly-schedule.ts'
import { readHomeAnalysis, readHomeProtection } from '../statistics/deload-home.ts'
import type { HomeAnalysis, HomeProtection } from '../statistics/deload-home.ts'
import { boundaryError } from '../home/load.ts'

type Snapshot = {
  owner: string
  request: string
  schedule?: LiveSchedule
  protection?: HomeProtection
  analysis?: HomeAnalysis
  issue?: string
  scheduleVerified: boolean
}

export function useTrainingSchedule(transport: WorkoutTransport, scope: Scope | null, revision: string, onInvalid: (error: unknown) => void) {
  const [api] = useState(() => new WeeklyScheduleApi(transport))
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState<{ owner: string; abort: AbortController } | null>(null)
  const [writeIssue, setWriteIssue] = useState<{ owner: string; text: string } | null>(null)
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
    if (!owner || !userId || dataGeneration === undefined || busy) return
    const abort = new AbortController()
    readFlight.current = abort
    const scope = { userId, dataGeneration }
    void Promise.allSettled([
      api.read(scope, abort.signal),
      readHomeProtection(transport, scope, abort.signal),
      readHomeAnalysis(transport, scope, abort.signal),
    ]).then(([schedule, protection, analysis]) => {
      if (abort.signal.aborted) return
      for (const result of [schedule, protection, analysis]) {
        if (result.status === 'rejected' && boundaryError(result.reason)) { onInvalid(result.reason); return }
      }
      const issue = schedule.status === 'rejected' ? '주간 일정을 조회하지 못했습니다. 다시 조회해 주세요.'
        : protection.status === 'rejected' ? '디로딩 상태를 확인하지 못했습니다. 확인 전까지 일반 일정과 루틴을 변경할 수 없습니다.' : undefined
      setSnapshot(previous => ({
        owner, request, issue,
        scheduleVerified: schedule.status === 'fulfilled',
        schedule: schedule.status === 'fulfilled' ? schedule.value : previous?.owner === owner ? previous.schedule : undefined,
        protection: protection.status === 'fulfilled' ? protection.value : undefined,
        analysis: analysis.status === 'fulfilled' ? analysis.value : undefined,
      }))
    })
    return () => abort.abort()
  }, [owner, userId, dataGeneration, request, api, transport, onInvalid, busy])

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

  const canWrite = !!current?.schedule && current.scheduleVerified && !loading && current.protection === null && !busy
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
      else setWriteIssue({ owner, text: scheduleIssue(error) })
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
  return { schedule: current?.schedule, protection: current?.protection, analysis: current?.analysis, loading, busy,
    canWrite, issue: current?.issue, writeIssue: writeIssue?.owner === owner ? writeIssue.text : null,
    clearWriteIssue: () => setWriteIssue(null), refresh, write }
}
export type TrainingSchedule = ReturnType<typeof useTrainingSchedule>
