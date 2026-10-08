type KitchenIconName =
  | 'home'
  | 'inventory'
  | 'shopping'
  | 'shoppingAdd'
  | 'recipes'
  | 'logout'
  | 'check'
  | 'lock'
  | 'refresh'
  | 'fridge'
  | 'freezer'
  | 'pantry'
  | 'spices'
  | 'household'
  | 'plus'
  | 'edit'
  | 'close'
  | 'chevronRight'
  | 'chevronUp'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronDown'
  | 'calendar'
  | 'sparkles'
  | 'search'
  | 'minus'
  | 'trash'
  | 'camera'
  | 'image'
  | 'microphone'
  | 'volume'
  | 'stop'

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
    case 'shoppingAdd':
      return <svg {...common}><path d="M3.5 6h2l1.7 8.6a2 2 0 0 0 2 1.6h6.2" /><path d="M7 8.5h11.5l-1.2 4.2" /><circle cx="9.5" cy="20" r="1" /><circle cx="16.5" cy="20" r="1" /><path d="M18.5 3.5v5" /><path d="M16 6h5" /></svg>
    case 'recipes':
      return <svg {...common}><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17" /><path d="M9 7h6" /><path d="M9 11h6" /></svg>
    case 'logout':
      return <svg {...common}><path d="M10 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H10" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></svg>
    case 'check':
      return <svg {...common}><path d="m6.5 12.2 3.4 3.4 7.6-8" /></svg>
    case 'lock':
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" /></svg>
    case 'refresh':
      return <svg {...common}><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M6.1 9a7 7 0 0 1 11.5-2.5L20 11" /><path d="M17.9 15a7 7 0 0 1-11.5 2.5L4 13" /></svg>
    case 'fridge':
      return <svg {...common}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M6 9h12" /><path d="M9 5.5v1.5" /><path d="M9 12v2" /></svg>
    case 'freezer':
      return <svg {...common}><path d="M12 3v18" /><path d="m8.5 5 3.5 2 3.5-2" /><path d="m8.5 19 3.5-2 3.5 2" /><path d="m4.2 7.5 15.6 9" /><path d="m4.4 11.5-.2-4 3.6-1.8" /><path d="m19.6 12.5.2 4-3.6 1.8" /><path d="m19.8 7.5-15.6 9" /><path d="m16.2 5.7 3.6 1.8-.2 4" /><path d="m7.8 18.3-3.6-1.8.2-4" /></svg>
    case 'pantry':
      return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M4 10h16" /><path d="M12 4v16" /><path d="M9.5 7h.01" /><path d="M14.5 7h.01" /><path d="M9.5 15h.01" /><path d="M14.5 15h.01" /></svg>
    case 'spices':
      return <svg {...common}><path d="M9 7V5.5h6V7" /><rect x="7" y="7" width="10" height="13" rx="2.25" /><path d="M7 10h10" /><path d="M9.5 14h5" /><path d="M10 4h.01" /><path d="M12 4h.01" /><path d="M14 4h.01" /></svg>
    case 'household':
      return <svg {...common}><path d="M10.5 8.5V6h5" /><path d="M14.5 4.5h4l1.5 1.5h-4.5" /><path d="M10 8.5h5.5l2 3.5v7.5H7V12z" /><path d="M9.5 13h5.5" /><path d="M9.5 16.5h5.5" /></svg>
    case 'plus':
      return <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
    case 'edit':
      return <svg {...common}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>
    case 'close':
      return <svg {...common}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
    case 'chevronRight':
      return <svg {...common}><path d="m9 5 7 7-7 7" /></svg>
    case 'chevronUp':
      return <svg {...common}><path d="m5 15 7-7 7 7" /></svg>
    case 'chevronDown':
      return <svg {...common}><path d="m5 9 7 7 7-7" /></svg>
    case 'chevronLeft':
      return <svg {...common}><path d="m15 5-7 7 7 7" /></svg>
    case 'chevronDown':
      return <svg {...common}><path d="m5 9 7 7 7-7" /></svg>
    case 'calendar':
      return <svg {...common}><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M8 3.5v4" /><path d="M16 3.5v4" /><path d="M4 10h16" /><path d="M8 14h3" /></svg>
    case 'sparkles':
      return <svg {...common}><path d="m12 3 1.2 3.4L16.5 8l-3.3 1.6L12 13l-1.2-3.4L7.5 8l3.3-1.6z" /><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8z" /><path d="m6 14 .7 1.8 1.8.7-1.8.7L6 19l-.7-1.8-1.8-.7 1.8-.7z" /></svg>
    case 'search':
      return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></svg>
    case 'minus':
      return <svg {...common}><path d="M5 12h14" /></svg>
    case 'trash':
      return <svg {...common}><path d="M4.5 7h15" /><path d="M9 3.5h6l1 3.5H8z" /><path d="M7 7l.8 13h8.4L17 7" /><path d="M10 10.5v6" /><path d="M14 10.5v6" /></svg>
    case 'camera':
      return <svg {...common}><path d="M4 7.5h3l1.4-2h7.2l1.4 2h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
    case 'image':
      return <svg {...common}><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><circle cx="9" cy="9" r="1.5" /><path d="m5.5 17 4.2-4.2 3 3 2.2-2.2 3.6 3.4" /></svg>
    case 'microphone':
      return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6.5 10.5a5.5 5.5 0 0 0 11 0" /><path d="M12 16v5" /><path d="M9 21h6" /></svg>
    case 'volume':
      return <svg {...common}><path d="M5 10h3l4-3.5v11L8 14H5z" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6" /><path d="M18 6.5a8 8 0 0 1 0 11" /></svg>
    case 'stop':
      return <svg {...common}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
  }
}
