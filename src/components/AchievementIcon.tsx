// Official user-supplied weight badge; keep both source assets unchanged.
const weight = new URL('../../docs/product/assets/exercise-icons/Overload_Weight_Badge_OnePlate.svg', import.meta.url).href
const running = new URL('../../docs/product/assets/exercise-icons/running.png', import.meta.url).href
export function AchievementIcon({ kind }: { kind: 'weight' | 'cardio' }) {
  return <img src={kind === 'weight' ? weight : running} width="18" height="18" alt="" aria-hidden="true" />
}
