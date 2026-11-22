
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

type SampleResult = 'finished' | 'cancelled' | 'unavailable'

// Reuse the set-rest tone for the countdown, individual samples and the three-beep alert.
export function useRestAudio(enabled: boolean, volume = 70) {
  const audio = useRef<AudioContext | null>(null)
  const activated = useRef(false)
  const played = useRef(new Set<string>())
  const tones = useRef(new Map<OscillatorNode, GainNode>())
  const sampleRequest = useRef(0)
  const finishSample = useRef<((result: SampleResult) => void) | null>(null)

  const stop = useCallback(() => {
    sampleRequest.current++
    for (const [tone, gain] of tones.current) {
      tone.onended = null
      try { tone.stop() } catch { /* A finished tone has no remaining sound. */ }
      tone.disconnect(); gain.disconnect()
    }
    tones.current.clear()
    finishSample.current?.('cancelled')
    finishSample.current = null
  }, [])
  useLayoutEffect(() => stop, [stop, enabled, volume])
  const resume = useCallback(async (context: AudioContext) => {
    try {
      if (context.state !== 'running') await context.resume()
      return audio.current === context && context.state === 'running'
    } catch { return false }
  }, [])
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) stop()
      else if (enabled && volume && activated.current && audio.current) void resume(audio.current)
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', stop)
    window.addEventListener('pageshow', visibility)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', stop)
      window.removeEventListener('pageshow', visibility)
    }
  }, [enabled, volume, resume, stop])
  useEffect(() => () => {
    void audio.current?.close().catch(() => {})
    audio.current = null
    activated.current = false
  }, [])

  const unlock = useCallback(async () => {
    if (!enabled || volume === 0) return false
    const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return false
    try {
      const context = audio.current ??= new Audio()
      if (await resume(context) && audio.current === context) {
        activated.current = true
        return true
      }
    } catch { return false }
    return false
  }, [enabled, volume, resume])

  const emit = useCallback((count: 1 | 3, onFinished?: () => void) => {
    const context = audio.current
    if (!enabled || !volume || document.hidden || context?.state !== 'running') return false
    const amplitude = 0.13 * volume / 70
    try {
      const first = context.currentTime
      for (let index = 0; index < count; index++) {
        const start = first + index * 0.22
        const tone = context.createOscillator(), gain = context.createGain()
        tones.current.set(tone, gain)
        tone.frequency.value = 660
        gain.gain.setValueAtTime(amplitude, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
        tone.connect(gain).connect(context.destination)
        tone.onended = () => {
          tones.current.delete(tone); tone.disconnect(); gain.disconnect()
          if (index === count - 1) onFinished?.()
        }
        tone.start(start)
        tone.stop(start + 0.12)
      }
      return true
    } catch {
      stop()
      return false
    }
  }, [enabled, volume, stop])

  const play = useCallback((id: string, ends: number, remaining: number) => {
    const key = `${id}:${ends}:${remaining}`
    if (remaining < 1 || remaining > 5 || played.current.has(key)) return
    if (emit(1)) played.current.add(key)
  }, [emit])
  const middle = useCallback(() => emit(3), [emit])
  const sample = useCallback(async (count: 1 | 3, onStarted: () => void): Promise<SampleResult> => {
    stop()
    const request = sampleRequest.current
    const ready = await unlock()
    if (request !== sampleRequest.current) return 'cancelled'
    if (!ready) return 'unavailable'
    return new Promise(resolve => {
      const started = emit(count, () => {
        finishSample.current = null
        resolve('finished')
      })
      if (!started) { resolve('unavailable'); return }
      finishSample.current = resolve
      onStarted()
    })
  }, [emit, stop, unlock])
  return { play, middle, stop, unlock, sample }
}

type RestTimerAudioOptions = {
  id: string | null
  ends?: number
  remaining: number
  now?: number
  countdown: boolean
  middleAt?: number
  userId?: string
  workoutId?: string
}

function playedMiddleAlerts(key: string, workoutId: string): string[] {
  try {
    const history = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (history?.workoutId === workoutId && Array.isArray(history.rests)) return history.rests
  } catch { /* In-memory deduplication still works when browser storage is unavailable. */ }
  return []
}

export function useRestTimerAudio(audio: ReturnType<typeof useRestAudio>, {
  id, ends, remaining, now, countdown, middleAt, userId, workoutId,
}: RestTimerAudioOptions) {
  const { play, middle, stop } = audio
  const previous = useRef<{ id: string | null; ends: number | undefined; remaining: number } | null>(null)
  const announced = useRef(new Set<string>())
  useLayoutEffect(() => stop, [ends, id, stop])
  useLayoutEffect(() => {
    // An unobserved crossing (including an iOS suspension) must not play on return.
    const reset = () => { previous.current = null }
    document.addEventListener('visibilitychange', reset)
    window.addEventListener('pagehide', reset)
    return () => {
      document.removeEventListener('visibilitychange', reset)
      window.removeEventListener('pagehide', reset)
    }
  }, [])
  useEffect(() => {
    if (document.hidden) return
    const last = previous.current
    previous.current = { id, ends, remaining }
    if (!id || ends === undefined || remaining <= 0) return
    if (countdown) play(id, ends, remaining)
    const crossed = middleAt !== undefined && last?.id === id && last.ends === ends && last.remaining > middleAt
      && remaining === middleAt
    if (!crossed || announced.current.has(id)) return

    // Retain only the most recent workout for this browser account, including across reloads.
    const storageKey = userId && `overload.rest-middle-alerts.v1:${userId}`
    const played = storageKey && workoutId ? playedMiddleAlerts(storageKey, workoutId) : []
    if (played.includes(id) || !middle()) return
    announced.current.add(id)
    if (storageKey && workoutId) {
      try { localStorage.setItem(storageKey, JSON.stringify({ workoutId, rests: [...played, id] })) }
      catch { /* The current view already remembers the alert. */ }
    }
  }, [id, ends, remaining, now, countdown, middleAt, userId, workoutId, play, middle])
}
