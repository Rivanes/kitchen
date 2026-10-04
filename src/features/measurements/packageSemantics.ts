import type { MeasurementUnit } from './measurementUnits'
import { assertValidQuantity } from '../quantity/quantity.ts'

export const DIRECT_PACKAGE_CONTENT_FAMILIES = ['count', 'mass', 'volume'] as const
export const CONTAINER_UNIT_FAMILIES = ['package', 'jar', 'bottle', 'can', 'sachet'] as const

const directFamilies = new Set<string>(DIRECT_PACKAGE_CONTENT_FAMILIES)
const containerFamilies = new Set<string>(CONTAINER_UNIT_FAMILIES)

export type PackageContent = {
  value: number
  unitCode: string
}

export type PackageContentDefaults = {
  packageContentValue: number | null
  packageContentUnitCode: string | null
}

export function isDirectMeasurementUnit(unit: MeasurementUnit | null | undefined) {
  return Boolean(unit && directFamilies.has(unit.family))
}

export function isContainerMeasurementUnit(unit: MeasurementUnit | null | undefined) {
  return Boolean(unit && containerFamilies.has(unit.family))
}

export function getPackageContentUnits(units: readonly MeasurementUnit[]) {
  return units.filter(isDirectMeasurementUnit)
}

export function getPackageContentFromDefaults(
  defaults: PackageContentDefaults | null | undefined,
): PackageContent | null {
  if (!defaults?.packageContentValue || !defaults.packageContentUnitCode) return null
  return {
    value: assertValidQuantity(defaults.packageContentValue, 'Nieprawidłowa domyślna zawartość opakowania.'),
    unitCode: defaults.packageContentUnitCode,
  }
}

export function assertValidPackageContent(
  content: PackageContent | null,
  units: readonly MeasurementUnit[],
  message = 'Podaj zawartość opakowania w sztukach, masie albo objętości.',
) {
  if (!content) throw new Error(message)
  const value = assertValidQuantity(content.value, message)
  const unit = units.find((candidate) => candidate.code === content.unitCode)
  if (!isDirectMeasurementUnit(unit)) throw new Error(message)
  return { value, unitCode: unit!.code }
}

export function resolveInventoryPackageContent(input: {
  rowUnitCode: string
  units: readonly MeasurementUnit[]
  explicitContent: PackageContent | null
  productDefault: PackageContentDefaults | null | undefined
}) {
  const rowUnit = input.units.find((unit) => unit.code === input.rowUnitCode)
  if (!rowUnit) throw new Error('Wybierz prawidłową jednostkę zapasu.')

  if (isDirectMeasurementUnit(rowUnit)) return null
  if (!isContainerMeasurementUnit(rowUnit)) {
    throw new Error('Ta jednostka nie ma jeszcze obsługiwanej semantyki opakowania.')
  }

  if (input.explicitContent) {
    return assertValidPackageContent(input.explicitContent, input.units)
  }

  const fallback = getPackageContentFromDefaults(input.productDefault)
  return assertValidPackageContent(fallback, input.units)
}

export function formatPackageContent(
  content: PackageContent | null,
  units: readonly MeasurementUnit[],
  formatQuantity: (value: number) => string,
) {
  if (!content) return null
  const unit = units.find((candidate) => candidate.code === content.unitCode)
  return `${formatQuantity(content.value)} ${unit?.symbol ?? content.unitCode}`
}
