import { supabase } from '../../lib/supabase/client'
import { normalizeProductName } from './productIdentity'

export type CanonicalProductIdentity = {
  id: string
  name: string
  defaultUnitCode: string
}

export type ResolveCanonicalProductInput = {
  ownerId: string
  name: string
  existingProductId: string | null
  defaultUnitCode: string
}

export type ResolvedCanonicalProduct = CanonicalProductIdentity & {
  created: boolean
}

type RawProductIdentity = {
  id: string
  name: string
  default_unit_code: string
}

export function cleanCanonicalProductName(value: string) {
  const cleanName = value.trim().replace(/\s+/g, ' ')
  if (!cleanName || cleanName.length > 120) {
    throw new Error('Podaj nazwę produktu do 120 znaków.')
  }
  return cleanName
}

function mapProduct(row: RawProductIdentity): CanonicalProductIdentity {
  return {
    id: row.id,
    name: row.name,
    defaultUnitCode: row.default_unit_code,
  }
}

export async function loadOwnerProductCatalog(ownerId: string): Promise<CanonicalProductIdentity[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('products')
    .select('id, name, default_unit_code')
    .eq('owner_id', ownerId)

  if (result.error) {
    throw new Error(`Nie udało się sprawdzić katalogu produktów: ${result.error.message}`)
  }

  return ((result.data ?? []) as RawProductIdentity[]).map(mapProduct)
}

export async function findOwnerProductByName(ownerId: string, name: string) {
  const normalized = normalizeProductName(name)
  if (!normalized) return null

  const products = await loadOwnerProductCatalog(ownerId)
  return products.find((product) => normalizeProductName(product.name) === normalized) ?? null
}

export async function resolveOrCreateCanonicalProduct(
  input: ResolveCanonicalProductInput,
): Promise<ResolvedCanonicalProduct> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const cleanName = cleanCanonicalProductName(input.name)
  const normalized = normalizeProductName(cleanName)
  const products = await loadOwnerProductCatalog(input.ownerId)

  if (input.existingProductId) {
    const selected = products.find((product) => product.id === input.existingProductId) ?? null
    if (selected && normalizeProductName(selected.name) === normalized) {
      return { ...selected, created: false }
    }
  }

  const existing = products.find((product) => normalizeProductName(product.name) === normalized) ?? null
  if (existing) return { ...existing, created: false }

  const insertResult = await supabase
    .from('products')
    .insert({
      owner_id: input.ownerId,
      name: cleanName,
      default_unit_code: input.defaultUnitCode,
    })
    .select('id, name, default_unit_code')
    .single()

  if (insertResult.error) {
    if (insertResult.error.code === '23505') {
      const raced = await findOwnerProductByName(input.ownerId, cleanName)
      if (!raced) throw new Error('Produkt już istnieje, ale nie udało się go odczytać.')
      return { ...raced, created: false }
    }
    throw new Error(`Nie udało się utworzyć produktu: ${insertResult.error.message}`)
  }

  const created = mapProduct(insertResult.data as RawProductIdentity)
  return { ...created, created: true }
}
