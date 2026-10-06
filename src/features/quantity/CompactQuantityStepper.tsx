import type { ReactNode } from 'react'

type CompactQuantityStepperProps = {
  value: ReactNode
  ariaLabel: string
  onDecrement: () => void
  onIncrement: () => void
  decrementDisabled?: boolean
  incrementDisabled?: boolean
  busy?: boolean
  tone?: 'default' | 'warning'
}

export function CompactQuantityStepper({
  value,
  ariaLabel,
  onDecrement,
  onIncrement,
  decrementDisabled = false,
  incrementDisabled = false,
  busy = false,
  tone = 'default',
}: CompactQuantityStepperProps) {
  const disabled = busy
  return (
    <div className={`compact-quantity-stepper${tone === 'warning' ? ' is-warning' : ''}`} aria-label={ariaLabel}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled || decrementDisabled}
        aria-label={`${ariaLabel}: zmniejsz`}
      >−</button>
      <span aria-live="polite">{busy ? '…' : value}</span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled || incrementDisabled}
        aria-label={`${ariaLabel}: zwiększ`}
      >+</button>
    </div>
  )
}
