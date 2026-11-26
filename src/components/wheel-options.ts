export type WheelAdjust = (value: string, direction: -1 | 1) => string | null

const radius = 30
const batchSize = 20

function nearby(value: string, adjust: WheelAdjust, direction: -1 | 1, count: number) {
  const result: string[] = []
  for (let index = 0; index < count; index++) {
    const next = adjust(value, direction)
    if (next === null || next === value) break
    result.push(next)
    value = next
  }
  return result
}

export function wheelOptions(seed: string, adjust: WheelAdjust) {
  return [...nearby(seed, adjust, -1, radius).reverse(), seed, ...nearby(seed, adjust, 1, radius)]
}

export function extendWheelOptions(options: string[], adjust: WheelAdjust, direction: -1 | 1) {
  const edge = direction < 0 ? options[0] : options[options.length - 1]
  const extra = nearby(edge, adjust, direction, batchSize)
  if (!extra.length) return null
  const limit = radius * 2 + 1
  if (direction < 0) return { options: [...extra.reverse(), ...options].slice(0, limit), shift: extra.length }
  const next = [...options, ...extra]
  const removed = Math.max(0, next.length - limit)
  return { options: next.slice(removed), shift: -removed }
}
