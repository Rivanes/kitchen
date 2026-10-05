import {
  PRODUCT_RESOURCE_ROLES,
  productResourceRoleLabel,
  type ProductResourceRole,
} from './productResourceSemantics'

type ProductResourceRolePickerProps = {
  value: ProductResourceRole
  onChange: (role: ProductResourceRole) => void
  disabled?: boolean
  label?: string
}

export function ProductResourceRolePicker({
  value,
  onChange,
  disabled = false,
  label = 'Rodzaj produktu',
}: ProductResourceRolePickerProps) {
  return (
    <div className="product-role-field">
      <span className="form-field-label">{label}</span>
      <div className="product-role-picker" role="radiogroup" aria-label={label}>
        {PRODUCT_RESOURCE_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={value === role}
            className={`product-role-option product-role-${role}${value === role ? ' is-selected' : ''}`}
            onClick={() => onChange(role)}
            disabled={disabled}
          >
            {productResourceRoleLabel(role)}
          </button>
        ))}
      </div>
    </div>
  )
}
