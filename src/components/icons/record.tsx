import { lineIcons } from './definition.ts'
import type { IconDefinition } from './definition.ts'

export const musclePeriod = { path: () => <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>, width: 16, strokeWidth: 1.8, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

export const weightHistory = { path: "M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2", width: 16, strokeWidth: 1.6, lineCap: "round", lineJoin: "round" } satisfies IconDefinition

const recordLineIcons = lineIcons({
  activity: "M4 20V10h3v10M10.5 20V4h3v16M17 20V7h3v13",
  growth: "M3 18l6-6 4 3 8-10M15 5h6v6",
  plan: "M8 3v4m8-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M8 14h1m6 0h1m-8 3h1m6 0h1",
  muscles: "M12 3v9h9M9 3.5a9 9 0 1 0 11.5 11.5M15 3.5a9 9 0 0 1 5.5 5.5H15z",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  weight: "M3 9v6m3-8v10m0-5h12m0-5v10m3-8v6",
}, { width: 20, strokeWidth: 1.6, lineCap: 'round', lineJoin: 'round' })

export const recordIcons = {
  ...recordLineIcons,
  footprints: {
    // Trace of the original alpha contours in assets/record-footprints.png.
    path: () => <path fill="currentColor" fillRule="evenodd" d={[
      "M4.92 9.58L5.67 7.59L6.91 6.6L7.53 6.6L7.53 6.47L8.65 6.6L9.39 6.97L9.89 7.47L9.89 7.72L10.14 7.84L10.51 8.58L10.63 9.83L10.76 9.83L10.76 11.44L10.63 11.44L10.63 12.31L10.51 12.31L10.63 16.28L6.91 16.78L6.91 16.91L6.54 16.66L6.16 15.54L5.79 15.04L5.17 13.18L5.17 12.68L5.05 12.68Z",
      "M6.78 17.53L10.76 16.91L11.13 18.02L11.13 18.77L11.25 18.77L11.25 20.01L11.01 20.63L10.51 21.13L9.52 21.5L8.4 21.5L7.65 21.13L7.16 20.51L6.91 19.76Z",
      "M12.75 14.55L12.87 14.55L13.12 12.93L13.37 12.81L17.22 13.43L17.09 15.54L16.97 15.54L16.84 16.41L16.22 17.15L15.73 17.4L14.24 17.4L13.24 16.91L12.75 16.04Z",
      "M13.24 5.6L13.86 3.74L14.36 3.12L14.61 3.12L15.1 2.62L16.97 2.5L17.71 2.87L18.46 3.74L19.08 5.6L19.08 7.72L18.95 7.72L18.95 8.46L18.83 8.46L18.58 9.95L18.33 10.2L17.84 11.81L17.22 12.81L13.37 12.19L13.49 8.46L13.37 8.46L13.37 7.47L13.24 7.47Z",
    ].join(" ")} />,
    width: 20,
    strokeWidth: 0,
  },
} satisfies Record<string, IconDefinition>
