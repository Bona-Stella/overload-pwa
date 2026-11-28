import { lineIcons } from './definition.ts'
import type { IconDefinition } from './definition.ts'
import { chevronRightPath, chevronDownPath, shieldPath, phonePath, equipmentWeightPath, logoutPath } from './common.tsx'

export const restBandDelete = { path: "M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5", width: 16, strokeWidth: 1.6, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

export const restBandInfo = { path: () => <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>, width: 14, strokeWidth: 1.6, lineCap: "round" } satisfies IconDefinition

export const settingsIcons = lineIcons({
  forward: chevronRightPath,
  down: chevronDownPath,
  shield: shieldPath,
  devices: "M10 17H3V5h14v3M7 21h3m3-3h6m-6-7h8v10h-8z",
  timer: "M9 2h6m-3 8v4m8-10-2 2M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  bell: "M10 21h4M6 9a6 6 0 0 1 12 0v4l2 4H4l2-4V9ZM2 9a10 10 0 0 1 3-6m17 6a10 10 0 0 0-3-6",
  weight: equipmentWeightPath,
  sliders: "M4 6h7m4 0h5m-9-2v4m-7 4h3m4 0h9m-9-2v4m-7 4h11m4 0h1m-5-2v4",
  database: "M5 6c0-2 3-3 7-3s7 1 7 3-3 3-7 3-7-1-7-3Zm0 0v12c0 2 3 3 7 3s7-1 7-3V6M5 12c0 2 3 3 7 3s7-1 7-3",
  download: "M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4",
  phone: phonePath,
  reset: "M4 11a8 8 0 1 1 2 7M4 5v6h6",
  withdraw: "M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a4 4 0 0 1 4-4h6m4 1 4 4m0-4-4 4",
  logout: logoutPath,
}, { width: 18, strokeWidth: 1.65, lineCap: 'round', lineJoin: 'round' })
