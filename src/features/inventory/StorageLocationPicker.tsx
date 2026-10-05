import { KitchenIcon } from '../../components/KitchenIcon'
import type { InventoryLocation, StorageLocationKind } from './types'

type StorageLocationPickerProps = {
  locations: InventoryLocation[]
  value: string
  onChange: (locationId: string) => void
  disabled?: boolean
  labelId?: string
}

function locationIcon(kind: StorageLocationKind) {
  if (kind === 'fridge') return 'fridge' as const
  if (kind === 'freezer') return 'freezer' as const
  if (kind === 'pantry') return 'pantry' as const
  if (kind === 'spices') return 'spices' as const
  if (kind === 'household') return 'household' as const
  return 'inventory' as const
}

export function StorageLocationPicker({
  locations,
  value,
  onChange,
  disabled = false,
  labelId,
}: StorageLocationPickerProps) {
  return (
    <div
      className="storage-location-picker"
      role="radiogroup"
      aria-labelledby={labelId}
      aria-label={labelId ? undefined : 'Miejsce przechowywania'}
    >
      {locations.map((location) => {
        const selected = location.id === value
        return (
          <button
            key={location.id}
            className={`storage-location-option${selected ? ' is-selected' : ''}`}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(location.id)}
          >
            <span className="storage-location-option-icon" aria-hidden="true">
              <KitchenIcon name={locationIcon(location.kind)} size={23} />
            </span>
            <span>{location.name}</span>
          </button>
        )
      })}
    </div>
  )
}
