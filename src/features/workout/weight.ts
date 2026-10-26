function decimalParts(value: number) {
  const [coefficient, exponent = '0'] = String(value).split('e')
  const [whole, fraction = ''] = coefficient.split('.')
  const scale = fraction.length - Number(exponent)
  const units = BigInt(whole + fraction)
  return scale < 0 ? { units: units * 10n ** BigInt(-scale), scale: 0 } : { units, scale }
}

function decimalText(units: bigint, scale: number) {
  const digits = units.toString().padStart(scale + 1, '0')
  return scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/0+$/, '').replace(/\.$/, '')
}

export function adjustWeightDraft(value: string, direction: -1 | 1): string | null {
  const weight = value.trim() ? Number(value) : NaN
  if (!Number.isFinite(weight) || weight < 0) return null
  const parts = decimalParts(weight)
  const scale = Math.max(1, parts.scale)
  const units = parts.units * 10n ** BigInt(scale - parts.scale) + BigInt(direction) * 25n * 10n ** BigInt(scale - 1)
  if (units < 0n) return null
  const result = decimalText(units, scale)
  const next = Number(result)
  return Number.isFinite(next) && next !== weight ? result : null
}

export function formatWeightDelta(previous: number, next: number) {
  const a = decimalParts(previous)
  const b = decimalParts(next)
  const scale = Math.max(a.scale, b.scale)
  const difference = b.units * 10n ** BigInt(scale - b.scale) - a.units * 10n ** BigInt(scale - a.scale)
  return `${difference > 0n ? '+' : difference < 0n ? '−' : ''}${decimalText(difference < 0n ? -difference : difference, scale)}`
}
