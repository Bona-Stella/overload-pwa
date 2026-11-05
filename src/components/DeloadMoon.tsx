import styles from './DeloadMoon.module.css'

/** Original SVG alpha mask: only display size and color change; its path/stroke stay intact. */
export function DeloadMoon() {
  return <span className={styles.moon} role="img" aria-label="디로딩" />
}
