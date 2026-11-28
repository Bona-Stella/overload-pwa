import { useLayoutEffect, useRef, useState } from 'react'
import { getNiceTickValues } from 'recharts'
import type { RecordChartPoint } from './RecordChart.tsx'
import styles from './Activity.module.css'

const height = 220, top = 20, bottom = 186, left = 44, right = 8

const formatTick = (value: number) => value.toLocaleString('ko-KR', {
  notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1,
})

function formatExact(value: string) {
  const [integer, fraction] = value.split('.')
  return BigInt(integer).toLocaleString('ko-KR') + (fraction ? '.' + fraction : '')
}

/** Activity draws the axis and marks from the same snapshot as its period labels and totals. */
export function ActivityTrendChart({ data, label, unit }: { data: RecordChartPoint[]; label: string; unit: string }) {
  const canvas = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  useLayoutEffect(() => {
    const node = canvas.current
    if (!node) return
    const measure = () => {
      const width = Math.floor(node.getBoundingClientRect().width)
      if (width > left + right) setWidth(width)
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(node)
    return () => resize.disconnect()
  }, [])

  const ceiling = Math.max(1, ...data.map(point => Number(point.value)))
  const ticks = getNiceTickValues([0, ceiling], 5)
  const maximum = ticks.at(-1) ?? ceiling
  const y = (value: number) => bottom - (bottom - top) * value / maximum
  const column = (width - left - right) / Math.max(1, data.length)
  const barWidth = Math.min(22, column * 0.75)
  const description = (point: RecordChartPoint) => point.value === null ? '확인 불가' : formatExact(point.value) + unit
  const active = data.findIndex(point => point.id === (focused ?? hovered ?? selected))

  return <div className="record-chart" data-chart-kind="bar" role="group" aria-label={label}>
    <div ref={canvas} className={`record-chart-canvas activity-trend-canvas ${styles.activityTrendCanvas}`}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className={styles.activityTrendPlot} tabIndex={0} aria-label={label}
        onBlur={() => setFocused(null)} onKeyDown={event => {
          if (event.key === 'Escape') {
            setHovered(null)
            setFocused(null)
            setSelected(null)
            return
          }
          if (!data.length || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
          event.preventDefault()
          setHovered(null)
          const index = data.findIndex(point => point.id === (focused ?? selected))
          const next = event.key === 'ArrowLeft' ? (index < 0 ? data.length - 1 : Math.max(0, index - 1)) : Math.min(data.length - 1, index + 1)
          setFocused(data[next].id)
        }}>
        {ticks.map(tick => <g key={tick} aria-hidden="true">
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <text x={left - 7} y={y(tick)} dy=".34em" textAnchor="end">{formatTick(tick)}</text>
        </g>)}
        <path d={`M${left} ${top}V${bottom}H${width - right}`} stroke="var(--border-subtle)" fill="none" aria-hidden="true" />
        {data.map((point, index) => {
          const x = left + index * column
          const middle = x + column / 2
          const barTop = y(Number(point.value))
          return <g key={point.id} className={styles.activityTrendPoint} data-activity-point={point.label} data-active={active === index || undefined} aria-hidden="true"
            onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(point.id) }}
            onPointerLeave={() => setHovered(null)}
            onClick={() => { setHovered(null); setFocused(null); setSelected(previous => previous === point.id ? null : point.id) }}>
            <rect x={x} y={top} width={column} height={bottom - top} className={styles.activityTrendHit} />
            {point.value !== null && <rect x={middle - barWidth / 2} y={barTop} width={barWidth} height={bottom - barTop}
              rx={4} fill="var(--chart-primary)" data-value={point.value} />}
            {point.value !== '0' && <text x={middle} y={barTop - 6} textAnchor="middle" fill="var(--text-primary)" className={styles.activityTrendValue}>{point.value === null ? '?' : formatTick(Number(point.value))}</text>}
            <text x={middle} y={bottom + 15} textAnchor="middle">{point.label}</text>
          </g>
        })}
      </svg>
      {active >= 0 && <div className={`record-chart-tooltip ${styles.activityTrendTooltip}`} role="status">
        {data[active].label}{data[active].label.length === 1 ? "요일" : ""} · {unit === "kg" ? "총중량 " : "완료 세트 "}{description(data[active])}
      </div>}
    </div>
    {data.some(point => point.value === null) && <p className="muted small">{data.filter(point => point.value === null).map(point => point.label).join(' · ')} · 확인 불가</p>}
    <ul className="sr-only" aria-label={label + ' 수치'}>{data.map(point => <li key={point.id}>{point.label}: {description(point)}</li>)}</ul>
  </div>
}
