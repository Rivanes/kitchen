import { supabase } from '../../lib/supabase/client'
import type { ProductResourceRole } from './productResourceSemantics'

/** Public definitions only. No owner IDs, stock, packages or purchase history. */
export type SharedProductSuggestion = {
  id: string
  name: string
  resourceRole: ProductResourceRole
  suggestedUnitCode: string
}

type SharedProductRow = {
  id: string
  name: string
  resource_role: string
  suggested_unit_code: string
}

function isProductResourceRole(value: string): value is ProductResourceRole {
  return value === 'food' || value === 'spice' || value === 'household'
}

export async function searchSharedProductCatalog(query: string): Promise<SharedProductSuggestion[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const cleanQuery = query.trim().replace(/\s+/g, ' ')
  if (cleanQuery.length < 2 || cleanQuery.length > 120) return []

  const { data, error } = await supabase.rpc('h74_search_shared_products', {
    p_query: cleanQuery,
    p_limit: 30,
  })
  if (error) throw new Error(`Nie udało się przeszukać Katalogu Kitchen: ${error.message}`)

  return ((data ?? []) as SharedProductRow[])
    .filter((row) => row.id && row.name && row.suggested_unit_code && isProductResourceRole(row.resource_role))
    .map((row) => ({
      id: row.id,
      name: row.name,
      resourceRole: row.resource_role as ProductResourceRole,
      suggestedUnitCode: row.suggested_unit_code,
    }))
}

export async function adoptSharedProduct(catalogId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('h74_adopt_shared_product', {
    p_catalog_id: catalogId,
  })
  if (error) {
    if (error.code === '23505') {
      throw new Error('Masz już produkt o tej nazwie, ale w innym rodzaju. Zmień rodzaj produktu lokalnie albo wybierz inną nazwę.')
    }
    throw new Error(`Nie udało się dodać produktu z Katalogu Kitchen: ${error.message}`)
  }
  if (typeof data !== 'string' || !data) throw new Error('Katalog Kitchen nie zwrócił identyfikatora prywatnego produktu.')
  return data
}

export async function publishLocalProduct(productId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('h74_publish_local_product', {
    p_product_id: productId,
  })
  if (error || typeof data !== 'string' || !data) {
    throw new Error(error?.message ?? 'Serwer nie potwierdził publikacji produktu.')
  }
}

/** The business save already committed. Never let publication failure trigger a second save. */
export class SharedPublicationAfterSaveError extends Error {
  constructor(cause: unknown, readonly savedRecipeId: string | null = null) {
    const details = cause instanceof Error ? ` (${cause.message})` : ''
    super(`Zapisano dane prywatne, ale produkt nie trafił do Katalogu Kitchen${details}. Nie zapisuj ponownie tej pozycji — wybierz „Zakończ”.`)
    this.name = 'SharedPublicationAfterSaveError'
  }
}

export async function publishAfterSuccessfulSave(
  productId: string,
  enabled: boolean,
  created: boolean,
  savedRecipeId: string | null = null,
) {
  // Never auto-publish a historical/reused owner product.
  if (!enabled || !created) return
  try {
    await publishLocalProduct(productId)
  } catch (error) {
    throw new SharedPublicationAfterSaveError(error, savedRecipeId)
  }
}
