import { supabase } from '../../lib/supabase/client'
import { assertValidQuantity, readStoredQuantity } from '../quantity/quantity'
import { normalizeProductName, ProductIdentityOption } from './productIdentity'
import {
  productResourceRoleFromSemantics,
  semanticsForProductResourceRole,
  type ProductResourceRole,
} from './productResourceSemantics'

export type CanonicalProductIdentity = ProductIdentityOption

export type ResolveCanonicalProductInput = {
  ownerId: string
  name: string
  existingProductId: string | null
  defaultUnitCode: string
  resourceRole?: ProductResourceRole
}

export type ResolveCanonicalProductForEditInput = {
  ownerId: string
  name: string
  currentProductId: string | null
  selectedProductId: string | null
  defaultUnitCode: string
  resourceRole?: ProductResourceRole
}

export type RenameCanonicalProductInput = {
  ownerId: string
  productId: string
  nextName: string
}

export type UpdateCanonicalProductSettingsInput = RenameCanonicalProductInput & {
  packageContentValue: number | null
  packageContentUnitCode: string | null
}

export type ResolvedCanonicalProduct = CanonicalProductIdentity & {
  created: boolean
}

type RawProductIdentity = {
  id: string
  name: string
  default_unit_code: string
  package_content_value: number | string | null
  package_content_unit: string | null
  recipe_eligible: boolean
  inventory_tracking_mode: 'quantity' | 'presence'
}

export function cleanCanonicalProductName(value: string) {
  const cleanName = value.trim().replace(/\s+/g, ' ')
  if (!cleanName || cleanName.length > 120) {
    throw new Error('Podaj nazwę produktu do 120 znaków.')
  }
  return cleanName
}

function mapProduct(row: RawProductIdentity): CanonicalProductIdentity {
  const packageContentValue = row.package_content_value === null
    ? null
    : readStoredQuantity(row.package_content_value, 'Produkt ma nieprawidłową domyślną zawartość opakowania.')

  if ((packageContentValue === null) !== (row.package_content_unit === null)) {
    throw new Error('Produkt ma niespójną domyślną zawartość opakowania.')
  }

  return {
    id: row.id,
    name: row.name,
    defaultUnitCode: row.default_unit_code,
    packageContentValue,
    packageContentUnitCode: row.package_content_unit,
    recipeEligible: row.recipe_eligible,
    inventoryTrackingMode: row.inventory_tracking_mode,
  }
}

const productSelect = 'id, name, default_unit_code, package_content_value, package_content_unit, recipe_eligible, inventory_tracking_mode'

export async function loadOwnerProductCatalog(ownerId: string): Promise<CanonicalProductIdentity[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('products')
    .select(productSelect)
    .eq('owner_id', ownerId)
    .order('name', { ascending: true })

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

export async function updateCanonicalProductSettings(input: UpdateCanonicalProductSettingsInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const cleanName = cleanCanonicalProductName(input.nextName)
  const existing = await findOwnerProductByName(input.ownerId, cleanName)

  if (existing && existing.id !== input.productId) {
    throw new Error('Taki produkt już istnieje. Wybierz inną nazwę.')
  }

  const hasValue = input.packageContentValue !== null
  const hasUnit = input.packageContentUnitCode !== null && input.packageContentUnitCode.trim() !== ''
  if (hasValue !== hasUnit) {
    throw new Error('Uzupełnij wartość i jednostkę zawartości opakowania albo wyczyść oba pola.')
  }

  const packageContentValue = hasValue
    ? assertValidQuantity(input.packageContentValue!, 'Podaj prawidłową domyślną zawartość opakowania.')
    : null
  const packageContentUnitCode = hasUnit ? input.packageContentUnitCode : null

  const result = await supabase
    .from('products')
    .update({
      name: cleanName,
      package_content_value: packageContentValue,
      package_content_unit: packageContentUnitCode,
    })
    .eq('id', input.productId)
    .eq('owner_id', input.ownerId)
    .select(productSelect)
    .maybeSingle()

  if (result.error) {
    if (result.error.code === '23505') {
      throw new Error('Taki produkt już istnieje. Wybierz inną nazwę.')
    }
    throw new Error(`Nie udało się zapisać ustawień produktu: ${result.error.message}`)
  }

  if (!result.data) {
    throw new Error('Nie znaleziono produktu do edycji.')
  }

  return mapProduct(result.data as RawProductIdentity)
}

export async function renameCanonicalProduct(input: RenameCanonicalProductInput) {
  const products = await loadOwnerProductCatalog(input.ownerId)
  const current = products.find((product) => product.id === input.productId)
  if (!current) throw new Error('Nie znaleziono produktu do zmiany nazwy.')

  if (current.name === cleanCanonicalProductName(input.nextName)) return current

  return updateCanonicalProductSettings({
    ...input,
    packageContentValue: current.packageContentValue,
    packageContentUnitCode: current.packageContentUnitCode,
  })
}

export async function cleanupCreatedCanonicalProduct(ownerId: string, productId: string) {
  if (!supabase) return

  await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('owner_id', ownerId)
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

  const requestedSemantics = semanticsForProductResourceRole(input.resourceRole ?? 'food')

  const insertResult = await supabase
    .from('products')
    .insert({
      owner_id: input.ownerId,
      name: cleanName,
      default_unit_code: input.defaultUnitCode,
      package_content_value: null,
      package_content_unit: null,
      recipe_eligible: requestedSemantics.recipeEligible,
      inventory_tracking_mode: requestedSemantics.inventoryTrackingMode,
    })
    .select(productSelect)
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

export async function resolveCanonicalProductForEdit(
  input: ResolveCanonicalProductForEditInput,
): Promise<ResolvedCanonicalProduct> {
  const cleanName = cleanCanonicalProductName(input.name)
  const normalized = normalizeProductName(cleanName)
  const products = await loadOwnerProductCatalog(input.ownerId)

  if (input.selectedProductId) {
    const selected = products.find((product) => product.id === input.selectedProductId) ?? null
    if (selected && normalizeProductName(selected.name) === normalized) {
      return { ...selected, created: false }
    }
  }

  if (input.currentProductId) {
    const current = products.find((product) => product.id === input.currentProductId) ?? null
    if (current) {
      if (normalizeProductName(current.name) === normalized) {
        return { ...current, created: false }
      }

      const collision = products.find((product) => (
        product.id !== current.id
        && normalizeProductName(product.name) === normalized
      )) ?? null

      if (collision) {
        return { ...collision, created: false }
      }

      const renamed = await renameCanonicalProduct({
        ownerId: input.ownerId,
        productId: current.id,
        nextName: cleanName,
      })

      return { ...renamed, created: false }
    }
  }

  return resolveOrCreateCanonicalProduct({
    ownerId: input.ownerId,
    name: cleanName,
    existingProductId: input.selectedProductId,
    defaultUnitCode: input.defaultUnitCode,
    resourceRole: input.resourceRole,
  })
}


export type SetCanonicalProductResourceRoleInput = {
  ownerId: string
  productId: string
  role: ProductResourceRole
  targetLocationId: string | null
  replacementQuantity: number | null
  replacementUnitCode: string | null
}

export async function setCanonicalProductResourceRole(input: SetCanonicalProductResourceRoleInput) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const semantics = semanticsForProductResourceRole(input.role)
  const replacementQuantity = input.replacementQuantity === null
    ? null
    : assertValidQuantity(input.replacementQuantity, 'Podaj prawidłową nową ilość zapasu.')

  const result = await supabase.rpc('set_product_resource_semantics', {
    p_owner_id: input.ownerId,
    p_product_id: input.productId,
    p_recipe_eligible: semantics.recipeEligible,
    p_inventory_tracking_mode: semantics.inventoryTrackingMode,
    p_target_location_id: input.targetLocationId,
    p_replacement_quantity: replacementQuantity,
    p_replacement_unit_code: input.replacementUnitCode,
  })

  if (result.error) {
    throw new Error(`Nie udało się zmienić rodzaju produktu: ${result.error.message}`)
  }

  const products = await loadOwnerProductCatalog(input.ownerId)
  const updated = products.find((product) => product.id === input.productId)
  if (!updated) throw new Error('Nie udało się odczytać produktu po zmianie rodzaju.')

  if (productResourceRoleFromSemantics(updated) !== input.role) {
    throw new Error('Baza nie potwierdziła zmiany rodzaju produktu.')
  }

  return updated
}
