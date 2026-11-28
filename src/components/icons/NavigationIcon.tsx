import { Icon } from './Icon.tsx'
import { navigationIcons } from './navigation.tsx'

export function NavigationIcon({ tab, active }: { tab: keyof typeof navigationIcons; active: boolean }) {
  const filled = active && (tab === 'home' || tab === 'settings')
  return <Icon icon={navigationIcons[tab]} fill={filled ? 'currentColor' : 'none'} fillRule="evenodd"
    stroke={filled ? 'none' : 'currentColor'} strokeWidth={active && !filled ? 3 : 1.6} />
}
