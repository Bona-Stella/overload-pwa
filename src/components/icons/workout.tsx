import type { IconDefinition } from './definition.ts'
import { chevronDownPath } from './common.tsx'

export const memoChevron = { path: "m3 6 5 5 5-5", width: 16, viewBox: 16, strokeWidth: 1.5 } satisfies IconDefinition

export const approvalChevron = { path: chevronDownPath, width: 18, strokeWidth: 1.8 } satisfies IconDefinition

export const cardioReview = { path: () => <><path d="M7 4H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M8 11l1.5 1.5L13 9" />
        <rect x="7" y="2.5" width="6" height="4" rx="1" /></>, width: 18, viewBox: 20, strokeWidth: 1.5, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

export const cardioStopwatch = { path: () => <><circle cx="10" cy="11.5" r="5.5" /><path d="M8 3h4m-2 5v4m4-5 1-1" /></>, width: 16, viewBox: 20, strokeWidth: 1.5, lineCap: "round" } satisfies IconDefinition

export const cardioEdit = { path: "m5 11.5-1 4.5 4.5-1L16 7.5 12.5 4zM11 5.5 14.5 9", width: 16, viewBox: 20, strokeWidth: 1.5, lineCap: "round", lineJoin: "round" } satisfies IconDefinition
