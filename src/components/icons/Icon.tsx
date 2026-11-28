import type { SVGProps } from 'react'

import type { IconDefinition } from './definition.ts'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  icon: IconDefinition
  size?: number
  label?: string
}

export function Icon({ icon, size, label, ...props }: IconProps) {
  const { path, width = 20, height = width, viewBox = 24, strokeWidth = 2, lineCap, lineJoin } = icon
  return <svg width={size ?? width} height={size ?? height} viewBox={`0 0 ${viewBox} ${viewBox}`}
    fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap={lineCap} strokeLinejoin={lineJoin}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...props}>
    {typeof path === 'string' ? <path d={path} /> : path()}
  </svg>
}
