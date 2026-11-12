
import { useCallback, useEffect, useRef } from 'react'

export function useRestAudio(enabled: boolean) {
  const audio = useRef<AudioContext | null>(null)
  const played = useRef(new Set<string>())
  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null }, [])

  const play = useCallback((ends: number, remaining: number) => {
    const context = audio.current
    if (!enabled || remaining < 1 || remaining > 5 || document.hidden || context?.state !== 'running') return
    const key = `${ends}:${remaining}`
    if (played.current.has(key)) return
    played.current.add(key)
    const start = context.currentTime
    const tone = context.createOscillator()
    const gain = context.createGain()
    tone.frequency.value = 660
    gain.gain.setValueAtTime(0.13, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
    tone.connect(gain).connect(context.destination)
    tone.start(start)
    tone.stop(start + 0.12)
    tone.onended = () => { tone.disconnect(); gain.disconnect() }
  }, [enabled])

  return { play, unlock: () => {
    if (!enabled) return
    const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return
    try {
      audio.current ??= new Audio()
      if (audio.current.state === 'suspended') void audio.current.resume().catch(() => {})
    } catch { /* Playback availability does not affect the session. */ }
  } }
}
