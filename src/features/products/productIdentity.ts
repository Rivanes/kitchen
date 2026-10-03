export type ProductIdentityOption = {
  id: string
  name: string
  defaultUnitCode: string
}

export function normalizeProductName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL')
}

export function findExactProduct<T extends ProductIdentityOption>(
  products: readonly T[],
  query: string,
  excludeProductId?: string,
): T | null {
  const normalized = normalizeProductName(query)
  if (!normalized) return null

  return products.find((product) => (
    product.id !== excludeProductId
    && normalizeProductName(product.name) === normalized
  )) ?? null
}

export function findProductSuggestions<T extends ProductIdentityOption>(
  products: readonly T[],
  query: string,
  exactProductId?: string,
  limit = 5,
): T[] {
  const normalized = normalizeProductName(query)
  if (!normalized) return []

  return products
    .filter((product) => product.id !== exactProductId)
    .filter((product) => normalizeProductName(product.name).includes(normalized))
    .slice(0, limit)
}
