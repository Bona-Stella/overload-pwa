import type { ReactNode } from 'react'

export type IconDefinition = {
  path: string | (() => ReactNode)
  width?: number
  height?: number
  viewBox?: number
  strokeWidth?: number
  lineCap?: 'round' | 'square'
  lineJoin?: 'round' | 'bevel'
}

export function lineIcons<Names extends string>(paths: Record<Names, string>, style: Omit<IconDefinition, 'path'>) {
  return Object.fromEntries(Object.entries<string>(paths).map(([name, path]) => [name, { ...style, path }])) as Record<Names, IconDefinition>
}
