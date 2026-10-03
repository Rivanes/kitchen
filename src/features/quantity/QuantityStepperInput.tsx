import type { RefObject } from 'react'
import { KitchenIcon } from '../../components/KitchenIcon'
import { canStepQuantityInput, stepQuantityInput } from './quantity'

type QuantityStepperInputProps = {
  inputId: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
  max?: number
  step?: number
  suffix?: string
  placeholder?: string
  ariaLabel?: string
}

export function QuantityStepperInput({
  inputId,
  value,
  onChange,
  disabled = false,
  inputRef,
  max,
  step,
  suffix,
  placeholder,
  ariaLabel = 'Ilość',
}: QuantityStepperInputProps) {
  const options = { step, max }
  const canDecrement = !disabled && canStepQuantityInput(value, 'decrement', options)
  const canIncrement = !disabled && canStepQuantityInput(value, 'increment', options)

  function applyStep(direction: 'decrement' | 'increment') {
    if (disabled) return
    const next = stepQuantityInput(value, direction, options)
    if (next !== null) onChange(next)
  }

  return (
    <div className="quantity-stepper">
      <button
        className="quantity-stepper-button"
        type="button"
        onClick={() => applyStep('decrement')}
        disabled={!canDecrement}
        aria-label="Zmniejsz ilość o 1"
        title="Zmniejsz o 1"
      >
        <KitchenIcon name="minus" size={18} />
      </button>

      <div className={`quantity-stepper-value${suffix ? ' has-suffix' : ''}`}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          aria-label={ariaLabel}
        />
        {suffix && <span className="quantity-stepper-suffix">{suffix}</span>}
      </div>

      <button
        className="quantity-stepper-button"
        type="button"
        onClick={() => applyStep('increment')}
        disabled={!canIncrement}
        aria-label="Zwiększ ilość o 1"
        title="Zwiększ o 1"
      >
        <KitchenIcon name="plus" size={18} />
      </button>
    </div>
  )
}
