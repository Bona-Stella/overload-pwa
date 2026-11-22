export type RestAlerts = {
  visual: 'off' | 'dim' | 'flash'
  top: boolean
  bottom: boolean
  threshold: 3 | 5 | 10
  sound: boolean
  volume: number
  middle: boolean
  testMode: boolean
}

export const REST_TEST_SECONDS = 12
export const REST_MIDDLE_SECONDS = 10

export const defaultRestAlerts: RestAlerts = {
  visual: 'flash', top: true, bottom: true, threshold: 5, sound: true, volume: 70, middle: false, testMode: false,
}

export function readRestAlerts(raw: string | null): RestAlerts {
  let value: Partial<RestAlerts> | null
  try { value = raw ? JSON.parse(raw) : null } catch { value = null }
  if (!value) return defaultRestAlerts
  const defaults = defaultRestAlerts
  return {
    visual: value.visual === 'off' || value.visual === 'dim' || value.visual === 'flash' ? value.visual : defaults.visual,
    top: typeof value.top === 'boolean' ? value.top : defaults.top,
    bottom: typeof value.bottom === 'boolean' ? value.bottom : defaults.bottom,
    threshold: value.threshold === 3 || value.threshold === 10 ? value.threshold : defaults.threshold,
    sound: typeof value.sound === 'boolean' ? value.sound : defaults.sound,
    volume: typeof value.volume === 'number' && Number.isInteger(value.volume) && value.volume >= 0 && value.volume <= 100 ? value.volume : defaults.volume,
    middle: typeof value.middle === 'boolean' ? value.middle : defaults.middle,
    testMode: typeof value.testMode === 'boolean' ? value.testMode : defaults.testMode,
  }
}

export function restAlertVisual(alerts: RestAlerts, seconds: number) {
  const flashing = alerts.visual === 'flash' && seconds > 0 && seconds <= alerts.threshold
  return { dim: alerts.visual === 'dim' && seconds > 0 && seconds <= 12, top: flashing && alerts.top, bottom: flashing && alerts.bottom }
}

export function restPreviewSeconds(alerts: RestAlerts) {
  return alerts.visual === 'dim' ? 12 : alerts.visual === 'flash' ? alerts.threshold + 2 : 5
}
