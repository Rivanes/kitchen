import { RefObject, useMemo } from 'react'
import { findExactProduct, findProductSuggestions, ProductIdentityOption } from './productIdentity'

export type ProductAutocompleteState<T extends ProductIdentityOption = ProductIdentityOption> = {
  exactProduct: T | null
  suggestions: T[]
}

export function useProductAutocomplete<T extends ProductIdentityOption>(
  products: readonly T[],
  value: string,
  excludeProductId?: string,
): ProductAutocompleteState<T> {
  return useMemo(() => {
    const exactProduct = findExactProduct(products, value, excludeProductId)
    return {
      exactProduct,
      suggestions: findProductSuggestions(products, value, exactProduct?.id, 5),
    }
  }, [excludeProductId, products, value])
}

type ProductAutocompleteFieldProps<T extends ProductIdentityOption> = {
  inputId: string
  label: string
  value: string
  exactProduct: T | null
  suggestions: readonly T[]
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  inputRef?: RefObject<HTMLInputElement | null>
  exactHint: string
  unmatchedHint: string
  onChange: (value: string) => void
  onChoose: (product: T) => void
}

export function ProductAutocompleteField<T extends ProductIdentityOption>({
  inputId,
  label,
  value,
  exactProduct,
  suggestions,
  disabled = false,
  placeholder,
  maxLength = 120,
  inputRef,
  exactHint,
  unmatchedHint,
  onChange,
  onChoose,
}: ProductAutocompleteFieldProps<T>) {
  const hasValue = value.trim().length > 0

  return (
    <div className="form-field product-autocomplete">
      <label htmlFor={inputId}>{label}</label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls={suggestions.length > 0 ? `${inputId}-suggestions` : undefined}
      />

      {exactProduct && <p className="field-hint product-autocomplete-status">{exactHint}</p>}
      {!exactProduct && hasValue && <p className="field-hint product-autocomplete-status">{unmatchedHint}</p>}

      {suggestions.length > 0 && (
        <div id={`${inputId}-suggestions`} className="product-suggestions" aria-label="Pasujące produkty">
          {suggestions.map((product) => (
            <button
              type="button"
              key={product.id}
              onClick={() => onChoose(product)}
              disabled={disabled}
            >
              {product.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
