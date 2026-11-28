import { Icon } from '../icons/Icon.tsx'
import { feedbackIcons } from '../icons/feedback.tsx'
import styles from './FeedbackIcon.module.css'

export function FeedbackIcon({ name, size = 18, spinning = false }: { name: keyof typeof feedbackIcons; size?: number; spinning?: boolean }) {
  return <Icon icon={feedbackIcons[name]} size={size} data-feedback-icon={name} className={name === 'syncing' && spinning ? styles.spinning : undefined} />
}
