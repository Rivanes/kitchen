import { supabase } from '../../lib/supabase/client'

export type MeasurementUnit = {
  code: string
  labelPl: string
  symbol: string
  family: string
  sortOrder: number
  toBaseFactor: number
}

type RawMeasurementUnit = {
  code: string
  label_pl: string
  symbol: string
  family: string
  sort_order: number
  to_base_factor: number | string
}

export const DEFAULT_UNIT_CODE = 'pcs'

function readToBaseFactor(value: number | string, unitCode: string) {
  const factor = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error(`Jednostka ${unitCode} ma nieprawidłowy współczynnik konwersji.`)
  }
  return factor
}

export async function loadMeasurementUnits(): Promise<MeasurementUnit[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const result = await supabase
    .from('measurement_units')
    .select('code, label_pl, symbol, family, sort_order, to_base_factor')
    .order('sort_order', { ascending: true })

  if (result.error) {
    throw new Error(`Nie udało się wczytać jednostek: ${result.error.message}`)
  }

  return ((result.data ?? []) as RawMeasurementUnit[]).map((row) => ({
    code: row.code,
    labelPl: row.label_pl,
    symbol: row.symbol,
    family: row.family,
    sortOrder: row.sort_order,
    toBaseFactor: readToBaseFactor(row.to_base_factor, row.code),
  }))
}

export function getDefaultUnitCode(units: readonly MeasurementUnit[], preferredCode?: string | null) {
  if (preferredCode && units.some((unit) => unit.code === preferredCode)) {
    return preferredCode
  }

  if (units.some((unit) => unit.code === DEFAULT_UNIT_CODE)) {
    return DEFAULT_UNIT_CODE
  }

  return units[0]?.code ?? ''
}
