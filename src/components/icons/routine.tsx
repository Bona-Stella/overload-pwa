import type { IconDefinition } from './definition.ts'
import { feedbackIcons } from './feedback.tsx'

export const equipmentMemoEdit = { path: "M13 20H5V4h14v7M8 8h8m-8 4h4m2 7 5-5 2 2-5 5h-2z", width: 14, strokeWidth: 1.7, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

export const emptyWeight = { path: "M2 9v6m4-9v12m12-12v12m4-9v6M2 12h20", width: 28, height: 24, strokeWidth: 1.4, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

export const emptyCardio = { path: () => <><ellipse cx="6.5" cy="9" rx="3.2" ry="5.7" transform="rotate(12 6.5 9)" /><ellipse cx="17.5" cy="13" rx="3.2" ry="5.7" transform="rotate(12 17.5 13)" /></>, width: 28, height: 24, strokeWidth: 1.4, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

export const weekColumns = { path: () => <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></>, width: 20, strokeWidth: 1.7 } satisfies IconDefinition

export const weekRows = { path: () => <><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/></>, width: 20, strokeWidth: 1.7 } satisfies IconDefinition

export const scheduleView = { path: () => <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></>, width: 15, strokeWidth: 1.8, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

export const scheduleSwitch = { path: "M7 7h14m0 0-4-4m4 4-4 4M17 17H3m0 0 4-4m-4 4 4 4", width: 15, strokeWidth: 1.8, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

export const scheduleRotate = { ...feedbackIcons.syncing, width: 15 } satisfies IconDefinition
