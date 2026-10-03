type KitchenIconName = 'home' | 'inventory' | 'shopping' | 'recipes' | 'logout' | 'check' | 'lock'

type KitchenIconProps = {
  name: KitchenIconName
  size?: number
  strokeWidth?: number
}

export function KitchenIcon({ name, size = 22, strokeWidth = 1.9 }: KitchenIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3.5 10.5 12 3.8l8.5 6.7" /><path d="M5.5 9.2V20h13V9.2" /><path d="M9.5 20v-6h5v6" /></svg>
    case 'inventory':
      return <svg {...common}><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M5 9h14" /><path d="M9 6.2h3" /><path d="M9 12.2h3" /></svg>
    case 'shopping':
      return <svg {...common}><path d="M4 6h2l1.8 9.1a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 1.9-1.4L21 9H7" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>
    case 'recipes':
      return <svg {...common}><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17" /><path d="M9 7h6" /><path d="M9 11h6" /></svg>
    case 'logout':
      return <svg {...common}><path d="M10 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H10" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></svg>
    case 'check':
      return <svg {...common}><path d="m6.5 12.2 3.4 3.4 7.6-8" /></svg>
    case 'lock':
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" /></svg>
  }
}
