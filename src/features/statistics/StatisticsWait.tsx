import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { StatusNotice } from '../../components/ui.tsx'
import { useDelayedPending } from '../../components/useDelayedPending.ts'

export function StatisticsWait({ pending, label, skeleton = false }: { pending: boolean; label: string; skeleton?: boolean }) {
  const waiting = useDelayedPending(pending)
  if (!waiting) return null
  return skeleton ? <LoadingSkeleton layout="detail" label={label} />
    : <div className="statistics-wait"><StatusNotice>{label}</StatusNotice></div>
}
