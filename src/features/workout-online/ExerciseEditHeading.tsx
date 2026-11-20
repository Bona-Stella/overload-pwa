import styles from './RoutineEdit.module.css'

export function ExerciseEditHeading({ index, name, description, picking, disabled, onChange }: {
  index: number; name: string; description?: string; picking: boolean; disabled?: boolean; onChange: () => void
}) {
  return <div className={styles.exerciseHeading}>
    <b>{String(index + 1).padStart(2, '0')}</b>
    <div className={styles.exerciseName}>
      <h3 title={name}>{name}</h3>
      {description && <small>{description}</small>}
    </div>
    <button type="button" className={`outline ${styles.cardAction}`} onClick={onChange}
      aria-expanded={picking} disabled={disabled}>변경</button>
  </div>
}
