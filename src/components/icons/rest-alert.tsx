import { lineIcons } from './definition.ts'

export const restAlertIcons = {
  ...lineIcons({
    flash: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    flashOff: "M12 4h.01M12 20h.01M4 12h.01M20 12h.01M6.3 6.3h.01m11.4 11.4h.01m-11.42 0h.01M17.7 6.3h.01M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    sound: "m11 5-5 4H3v6h3l5 4ZM15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12",
    soundOff: "m11 5-5 4H3v6h3l5 4Zm5 4 6 6m0-6-6 6",
    quiet: "m11 5-5 4H3v6h3l5 4ZM16 11a2 2 0 0 1 0 2",
    middle: "M6 9a6 6 0 0 1 12 0c0 4 1 5 2 6H4c1-1 2-2 2-6Zm4 10a2 2 0 0 0 4 0M3.5 5.5 2 8m18.5-2.5L22 8",
    middleOff: "m3 3 18 18M9 4a6 6 0 0 1 9 5c0 2.3.3 3.6.8 4.5M6 8c0 4-1 6-2 7h11m-5 4a2 2 0 0 0 4 0",
    play: "m9 6 9 6-9 6Z",
    pause: "M9 6v12m6-12v12",
  }, { width: 18, strokeWidth: 1.65, lineCap: 'round', lineJoin: 'round' }),
  dim: { path: () => <><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /></>, width: 18, strokeWidth: 1.65 },
  dimOff: { path: () => <><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /></>, width: 18, strokeWidth: 1.65 },
}
