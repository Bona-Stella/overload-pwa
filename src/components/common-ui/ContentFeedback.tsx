import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { FeedbackIcon } from './FeedbackIcon'
import styles from './ContentFeedback.module.css'

export function Skeleton({ shape = 'line', width, height }: {
  shape?: 'line' | 'circle' | 'block'
  width?: CSSProperties['width']
  height?: CSSProperties['height']
}) {
  return <span aria-hidden="true" className={styles.skeleton} data-shape={shape} style={{ width, height }} />
}

export function SkeletonRegion({ loading, loadingLabel = '불러오는 중', children }: {
  loading: boolean
  loadingLabel?: string
  children: ReactNode
}) {
  return <>
    <span role="status" className="sr-only">{loading ? loadingLabel : ''}</span>
    <div aria-busy={loading}><div inert={loading} aria-hidden={loading || undefined}>{children}</div></div>
  </>
}

export function SkeletonSlot({ loading, placeholderWidth = '75%', shape, children }: {
  loading: boolean
  placeholderWidth?: CSSProperties['width']
  shape?: 'line' | 'circle' | 'block'
  children: ReactNode
}) {
  return <span className={styles.skeletonSlot}>
    <span className={styles.skeletonContent} data-concealed={loading || undefined}>{children}</span>
    {loading && <Skeleton width={placeholderWidth} shape={shape} />}
  </span>
}

type ValidationAttributes = { 'aria-invalid'?: true; 'aria-describedby'?: string }

export function FieldValidation({ error, describedBy, children }: {
  error?: string
  describedBy?: string
  children: (attributes: ValidationAttributes) => ReactNode
}) {
  const errorId = useId()
  return <div className={styles.field}>
    {children({
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? [describedBy, errorId].filter(Boolean).join(' ') : describedBy,
    })}
    <p id={errorId} aria-live="polite" className={styles.fieldError}>
      {error && <><FeedbackIcon name="error" size={14} /><span>{error}</span></>}
    </p>
  </div>
}

export function EmptyState({ icon, title, description }: {
  icon: ReactNode
  title: string
  description: string
}) {
  return <section className={styles.empty}>
    <span className={styles.emptyIcon} aria-hidden="true">{icon}</span>
    <h2>{title}</h2>
    <p>{description}</p>
  </section>
}

export function ConnectionBanner({ state, title, description }: {
  state: 'offline' | 'syncing'
  title: string
  description: string
}) {
  return <div className={styles.banner} data-state={state} role="status">
    <span className={styles.bannerIcon}><FeedbackIcon name={state} size={20} /></span>
    <div><p className={styles.bannerTitle}>{title}</p><p>{description}</p></div>
  </div>
}
