import { lineIcons } from './definition.ts'
import { chevronRightPath, shieldPath, phonePath, equipmentWeightPath, logoutPath } from './common.tsx'

export const accountIcons = lineIcons({
  email: "M3 5h18v14H3zM3 6l9 7 9-7",
  shield: shieldPath,
  devices: "M10 17H3V5h14v3M7 21h3m3-10h8v10h-8z",
  link: "M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2m2 6a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2",
  check: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 12l3 3 5-6",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v5m0-8h.01",
  forward: chevronRightPath,
  phone: phonePath,
  tablet: "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm6 16h.01",
  computer: "M4 4h16v12H4zm0 12-3 4h22l-3-4",
  workout: equipmentWeightPath,
  eye: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  logout: logoutPath,
  screenOff: "M3 4h18v13H3zm9 13v4m-4 0h8M10 8l4 5m0-5-4 5",
}, { width: 15, strokeWidth: 1.65, lineCap: 'round', lineJoin: 'round' })
