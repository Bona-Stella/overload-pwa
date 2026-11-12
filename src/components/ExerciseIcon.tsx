import styles from './ExerciseIcon.module.css'

const icons = {
  chest: new URL('../../docs/product/assets/exercise-icons/chest.png', import.meta.url).href,
  back: new URL('../../docs/product/assets/exercise-icons/back.png', import.meta.url).href,
  shoulders: new URL('../../docs/product/assets/exercise-icons/shoulders.png', import.meta.url).href,
  arms: new URL('../../docs/product/assets/exercise-icons/arms.png', import.meta.url).href,
  legs: new URL('../../docs/product/assets/exercise-icons/legs.png', import.meta.url).href,
  core: new URL('../../docs/product/assets/exercise-icons/core.png', import.meta.url).href,
  running: new URL('../../docs/product/assets/exercise-icons/running.png', import.meta.url).href,
  walking: new URL('../../docs/product/assets/exercise-icons/walking.png', import.meta.url).href,
  cycling: new URL('../../docs/product/assets/exercise-icons/cycling.png', import.meta.url).href,
}
export function ExerciseIcon({ kind, label }: { kind?: keyof typeof icons | 'other'; label?: string }) {
  return kind && kind !== 'other' ? <img className={styles.icon} src={icons[kind]} width={32} height={32} alt={label ?? ''} />
    : <span className={`${styles.placeholder} ${kind === 'other' ? styles.other : ''}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>{kind === 'other' ? 'ETC' : '·'}</span>
}
