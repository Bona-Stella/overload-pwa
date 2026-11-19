const paths = {
  close: 'm18 6-12 12M6 6l12 12',
  check: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM8.5 12l2.5 2.5 4.5-5',
  error: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 8v4m0 4h.01',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 12v4m0-8h.01',
  offline: 'M2 2l20 20M8.5 8.5A14 14 0 0 1 22 9M2 9c.7-.6 1.5-1.1 2.4-1.6M5 12.5a10 10 0 0 1 3.6-1.9m5.7-.4c1.7.4 3.3 1.2 4.7 2.3M8.5 16a5.6 5.6 0 0 1 7 0M12 20h.01',
  syncing: 'M20 7v5h-5M4 17v-5h5m-4.5 4.5a8 8 0 0 0 14.7-.5m.3-8.5A8 8 0 0 0 4.8 8',
}

export function FeedbackIcon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
}
