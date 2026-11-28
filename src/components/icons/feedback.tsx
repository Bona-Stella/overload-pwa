import { lineIcons } from './definition.ts'

export const feedbackIcons = lineIcons({
  close: "m18 6-12 12M6 6l12 12",
  check: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM8.5 12l2.5 2.5 4.5-5",
  critical: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 8v4m0 4h.01",
  error: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM9 9l6 6m0-6-6 6",
  warning: "M10.3 4.1a2 2 0 0 1 3.4 0l8 14A1.9 1.9 0 0 1 20 21H4a1.9 1.9 0 0 1-1.7-2.9ZM12 9v4m0 4h.01",
  destructive: "M3 6h18M9 6V3h6v3M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7m4-7v7",
  info: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 12v4m0-8h.01",
  offline: "M2 2l20 20M8.5 8.5A14 14 0 0 1 22 9M2 9c.7-.6 1.5-1.1 2.4-1.6M5 12.5a10 10 0 0 1 3.6-1.9m5.7-.4c1.7.4 3.3 1.2 4.7 2.3M8.5 16a5.6 5.6 0 0 1 7 0M12 20h.01",
  // Lucide refresh-cw (ISC), with Overload's existing stroke and display size.
  syncing: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16 M8 16H3v5",
  upload: "M7 19a5 5 0 1 1 .2-10A6.7 6.7 0 0 1 20 10.6a4.3 4.3 0 0 1-1.7 8.3H16m-4 2v-9m-3 3 3-3 3 3",
  routine: "M4 4h16v16H4zM9 4v16m4-12h4m-4 4h4m-4 4h3",
  record: "M3 12a9 9 0 1 0 3-6.7M3 5v7h7m2-5v5l3 2",
  search: "M16 16l4 4M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
}, { width: 18, strokeWidth: 1.8, lineCap: 'round', lineJoin: 'round' })
