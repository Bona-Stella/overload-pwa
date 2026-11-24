import styles from './FeedbackIcon.module.css'

const paths = {
  close: 'm18 6-12 12M6 6l12 12',
  check: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM8.5 12l2.5 2.5 4.5-5',
  critical: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 8v4m0 4h.01',
  error: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM9 9l6 6m0-6-6 6',
  warning: 'M10.3 4.1a2 2 0 0 1 3.4 0l8 14A1.9 1.9 0 0 1 20 21H4a1.9 1.9 0 0 1-1.7-2.9ZM12 9v4m0 4h.01',
  destructive: 'M3 6h18M9 6V3h6v3M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7m4-7v7',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 12v4m0-8h.01',
  offline: 'M2 2l20 20M8.5 8.5A14 14 0 0 1 22 9M2 9c.7-.6 1.5-1.1 2.4-1.6M5 12.5a10 10 0 0 1 3.6-1.9m5.7-.4c1.7.4 3.3 1.2 4.7 2.3M8.5 16a5.6 5.6 0 0 1 7 0M12 20h.01',
  syncing: 'M20 9a8 8 0 0 0-13.6-3L4 9m0-5v5h5M4 15a8 8 0 0 0 13.6 3L20 15m0 5v-5h-5',
  upload: 'M7 19a5 5 0 1 1 .2-10A6.7 6.7 0 0 1 20 10.6a4.3 4.3 0 0 1-1.7 8.3H16m-4 2v-9m-3 3 3-3 3 3',
}

export function FeedbackIcon({ name, size = 18, spinning = false }: { name: keyof typeof paths; size?: number; spinning?: boolean }) {
  return <svg width={size} height={size} data-feedback-icon={name} className={name === 'syncing' && spinning ? styles.spinning : undefined}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
}
