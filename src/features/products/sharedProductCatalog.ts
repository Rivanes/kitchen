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
