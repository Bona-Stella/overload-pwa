import styles from './CardioFields.module.css'

export function CardioNumberField({ label, value, onChange, inputMode = 'decimal', tag }: {
  label: string; value: string; onChange?: (value: string) => void; inputMode?: 'decimal' | 'numeric'; tag?: '추정' | '수정'
}) {
  return <label className={styles.field}>
    <span className={styles.label}>{label}{tag && <small className={styles.tag} aria-hidden="true">{tag}</small>}</span>
    <input aria-label={label} aria-description={tag} inputMode={inputMode} placeholder="선택 입력" value={value} readOnly={!onChange}
      onChange={onChange && (event => onChange(event.target.value))} />
  </label>
}
