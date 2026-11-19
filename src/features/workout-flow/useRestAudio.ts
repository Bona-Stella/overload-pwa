
import { useCallback, useEffect, useRef } from 'react'

type SampleResult = 'finished' | 'cancelled' | 'unavailable'

function traceRestAudio(event: string, seconds?: number, context?: AudioContext | null) {
  if (import.meta.env.DEV && location.pathname.replace(/\/$/, '') === '/rest-audio-preview') {
    window.dispatchEvent(new CustomEvent('overload:rest-audio-check', {
      detail: { event, seconds, state: context === undefined ? undefined : context?.state ?? '미생성', audioTime: context?.currentTime, hidden: document.hidden },
    }))
  }
}

// Reuse the set-rest tone for the countdown, individual samples and the three-beep alert.
export function useRestAudio(enabled: boolean, volume = 70) {
  const audio = useRef<AudioContext | null>(null)
  const activated = useRef(false)
  const played = useRef(new Set<string>())
  const muted = useRef(new Set<number>())
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
  useEffect(() => stop, [stop, enabled, volume])
  const resume = useCallback(async (context: AudioContext) => {
    try {
      if (context.state !== 'running') {
        if (import.meta.env.DEV) traceRestAudio('오디오 재개 요청', undefined, context)
        await context.resume()
      }
      const ready = audio.current === context && context.state === 'running'
      if (import.meta.env.DEV) traceRestAudio(ready ? '오디오 준비' : '오디오 사용 불가', undefined, context)
      return ready
    } catch {
      if (import.meta.env.DEV) traceRestAudio('오디오 재개 실패', undefined, context)
      return false
    }
  }, [])
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) stop()
      else if (enabled && volume && activated.current && audio.current) void resume(audio.current)
    }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
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
    for (let index = 0; index < count; index++) {
      const start = context.currentTime + index * 0.22
      const tone = context.createOscillator(), gain = context.createGain()
      tone.frequency.value = 660
      gain.gain.setValueAtTime(amplitude, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
      tone.connect(gain).connect(context.destination)
      tones.current.set(tone, gain)
      tone.onended = () => {
        tones.current.delete(tone); tone.disconnect(); gain.disconnect()
        if (index === count - 1) onFinished?.()
      }
      tone.start(start)
      tone.stop(start + 0.12)
    }
    return true
  }, [enabled, volume])

  const play = useCallback((ends: number, remaining: number) => {
    const key = `${ends}:${remaining}`
    if (muted.current.has(ends) || remaining < 1 || remaining > 5 || played.current.has(key)) return
    const finished = import.meta.env.DEV ? () => traceRestAudio('음원 처리 완료', remaining, audio.current) : undefined
    if (emit(1, finished)) {
      played.current.add(key)
      if (import.meta.env.DEV) traceRestAudio('음원 시작', remaining, audio.current)
    } else if (import.meta.env.DEV) traceRestAudio('음원 시작 안 함', remaining, audio.current)
  }, [emit])
  const middle = useCallback(() => emit(3), [emit])
  const silence = useCallback((ends: number) => { muted.current.add(ends); stop() }, [stop])
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
  return { play, middle, silence, stop, unlock, sample }
}

export function useRestTimerAudio(audio: ReturnType<typeof useRestAudio>, id: string | null, ends: number | undefined,
  started: number | undefined, remaining: number, now: number, middleAt: number | null) {
  const { play, middle, stop } = audio
  const previous = useRef<{ id: string; ends: number; remaining: number } | null>(null)
  const announced = useRef(new Set<string>())
  useEffect(() => stop, [ends, id, stop])
  useEffect(() => {
    const last = previous.current
    if (!id || ends === undefined || remaining <= 0) {
      if (import.meta.env.DEV && last) {
        if (id === last.id && ends !== undefined && now >= ends) traceRestAudio('카운트다운', 0)
        else traceRestAudio('휴식 알림 중단')
      }
      previous.current = null
      return
    }
    if (import.meta.env.DEV && (last?.id !== id || last.remaining !== remaining)) traceRestAudio('카운트다운', remaining)
    previous.current = { id, ends, remaining }
    play(ends, remaining)
    if (middleAt === null || remaining !== middleAt || announced.current.has(id)) return
    const crossed = last?.id === id && last.ends === ends && last.remaining > middleAt
    const justStarted = last?.id !== id && started !== undefined && now - started >= 0 && now - started < 1000 && ends - started === middleAt * 1000
    if (crossed || justStarted) { announced.current.add(id); middle() }
  }, [id, ends, started, remaining, now, middleAt, play, middle])
}
