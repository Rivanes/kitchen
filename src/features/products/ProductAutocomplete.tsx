import { RefObject, useEffect, useMemo, useState } from 'react'
import { findExactProduct, findProductSuggestions, normalizeProductName, ProductIdentityOption } from './productIdentity'
import { productResourceRoleFromSemantics, productResourceRoleLabel, type ProductResourceRole } from './productResourceSemantics'
import { searchSharedProductCatalog, type SharedProductSuggestion } from './sharedProductCatalog'

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

type SharedQueryState = {
  key: string
  items: SharedProductSuggestion[]
  error: string | null
}

/** Async lookup is owner-agnostic, server RLS requires active membership. */
export function useSharedProductSuggestions(
  value: string,
  ownerProducts: readonly ProductIdentityOption[],
  allowedRoles: readonly ProductResourceRole[] = ['food', 'spice', 'household'],
) {
  const normalized = normalizeProductName(value)
  const key = `${normalized}::${allowedRoles.join(',')}`
  const [response, setResponse] = useState<SharedQueryState>({ key: '', items: [], error: null })

  useEffect(() => {
    if (normalized.length < 2 || normalized.length > 120) return
    let active = true
    const timer = window.setTimeout(() => {
      void searchSharedProductCatalog(value).then((items) => {
        if (active) setResponse({ key, items, error: null })
      }).catch(() => {
        if (active) setResponse({ key, items: [], error: 'Nie udało się pobrać wszystkich podpowiedzi produktów. Spróbuj ponownie.' })
      })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [key, normalized, value])

  const visible = response.key === key && normalized.length >= 2 && normalized.length <= 120
  const localNames = new Set(ownerProducts.map((item) => normalizeProductName(item.name)))
  return {
    sharedSuggestions: visible ? response.items.filter((item) => (
      allowedRoles.includes(item.resourceRole) && !localNames.has(normalizeProductName(item.name))
    )).slice(0, 5) : [],
    sharedLoading: normalized.length >= 2 && normalized.length <= 120 && !visible,
    sharedError: visible ? response.error : null,
  }
}

type ProductAutocompleteFieldProps<T extends ProductIdentityOption> = {
  inputId: string
  label: string
  value: string
  exactProduct: T | null
  suggestions: readonly T[]
  sharedSuggestions?: readonly SharedProductSuggestion[]
  sharedLoading?: boolean
  sharedError?: string | null
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  inputRef?: RefObject<HTMLInputElement | null>
  exactHint?: string
  unmatchedHint?: string
  onChange: (value: string) => void
  onChoose: (product: T) => void
  onChooseShared?: (product: SharedProductSuggestion) => void
}

export function ProductAutocompleteField<T extends ProductIdentityOption>({
  inputId,
  label,
  value,
  exactProduct,
  suggestions,
  sharedSuggestions = [],
  sharedLoading = false,
  sharedError = null,
  disabled = false,
  placeholder,
  maxLength = 120,
  inputRef,
  exactHint,
  unmatchedHint,
  onChange,
  onChoose,
  onChooseShared,
}: ProductAutocompleteFieldProps<T>) {
  const hasValue = value.trim().length > 0
  // One visually unified dictionary. The owner-local ID is still used when one
  // exists; a global suggestion is adopted through the verified server RPC.
  const combinedSuggestions: Array<
    | { kind: 'owner'; product: T }
    | { kind: 'shared'; product: SharedProductSuggestion }
  > = [
    ...suggestions.map((product) => ({ kind: 'owner' as const, product })),
    ...(onChooseShared ? sharedSuggestions.map((product) => ({ kind: 'shared' as const, product })) : []),
  ].sort((a, b) => a.product.name.localeCompare(b.product.name, 'pl'))
  const hasSuggestions = combinedSuggestions.length > 0

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
        aria-expanded={Boolean(hasSuggestions)}
        aria-controls={hasSuggestions ? `${inputId}-suggestions` : undefined}
      />

      {exactProduct && exactHint && <p className="field-hint product-autocomplete-status">{exactHint}</p>}
      {!exactProduct && hasValue && unmatchedHint && <p className="field-hint product-autocomplete-status">{unmatchedHint}</p>}

      {hasSuggestions && (
        <div id={`${inputId}-suggestions`} className="product-suggestions" aria-label="Pasujące produkty">
          {combinedSuggestions.map((option) => {
            const role = option.kind === 'owner'
              ? productResourceRoleFromSemantics(option.product)
              : option.product.resourceRole
            return (
              <button
                type="button"
                key={`${option.kind}-${option.product.id}`}
                onClick={() => {
                  if (option.kind === 'owner') onChoose(option.product)
                  else onChooseShared?.(option.product)
                }}
                disabled={disabled}
              >
                <span>{option.product.name}</span>
                <small>{productResourceRoleLabel(role)}</small>
              </button>
            )
          })}
        </div>
      )}
      {onChooseShared && sharedLoading && <p className="field-hint" role="status">Szukam produktów…</p>}
      {onChooseShared && sharedError && <p className="field-hint" role="status">{sharedError}</p>}
    </div>
  )
}
