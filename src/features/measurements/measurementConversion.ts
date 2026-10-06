import type { MeasurementUnit } from './measurementUnits'
import { isDirectMeasurementUnit } from './packageSemantics.ts'

export type MeasurementConversionErrorCode =
  | 'invalid-value'
  | 'unknown-unit'
  | 'invalid-factor'
  | 'non-direct-unit'
  | 'incompatible-family'

export class MeasurementConversionError extends Error {
  readonly code: MeasurementConversionErrorCode

  constructor(code: MeasurementConversionErrorCode, message: string) {
    super(message)
    this.name = 'MeasurementConversionError'
    this.code = code
  }
}

function readConversionValue(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new MeasurementConversionError('invalid-value', 'Nieprawidłowa ilość do przeliczenia.')
  }
  return value
}

function findDirectUnit(unitCode: string, units: readonly MeasurementUnit[]) {
  const unit = units.find((candidate) => candidate.code === unitCode)
  if (!unit) {
    throw new MeasurementConversionError('unknown-unit', `Nieznana jednostka: ${unitCode}.`)
  }
  if (!Number.isFinite(unit.toBaseFactor) || unit.toBaseFactor <= 0) {
    throw new MeasurementConversionError('invalid-factor', `Jednostka ${unitCode} ma nieprawidłowy współczynnik konwersji.`)
  }
  if (!isDirectMeasurementUnit(unit)) {
    throw new MeasurementConversionError('non-direct-unit', 'Jednostek opakowaniowych nie przelicza się bezpośrednio.')
  }
  return unit
}

function normalizeConversionResult(value: number) {
  if (!Number.isFinite(value)) {
    throw new MeasurementConversionError('invalid-value', 'Wynik konwersji jest poza obsługiwanym zakresem.')
  }
  return Math.round((value + Number.EPSILON) * 1e12) / 1e12
}

export function toBaseMeasurementQuantity(
  value: number,
  unitCode: string,
  units: readonly MeasurementUnit[],
) {
  const safeValue = readConversionValue(value)
  const unit = findDirectUnit(unitCode, units)
  return normalizeConversionResult(safeValue * unit.toBaseFactor)
}

export function convertMeasurementQuantity(
  value: number,
  fromUnitCode: string,
  toUnitCode: string,
  units: readonly MeasurementUnit[],
) {
  const safeValue = readConversionValue(value)
  const fromUnit = findDirectUnit(fromUnitCode, units)
  const toUnit = findDirectUnit(toUnitCode, units)

  if (fromUnit.family !== toUnit.family) {
    throw new MeasurementConversionError(
      'incompatible-family',
      'Nie można przeliczyć jednostek z różnych rodzin pomiarowych.',
    )
  }

  return normalizeConversionResult((safeValue * fromUnit.toBaseFactor) / toUnit.toBaseFactor)
}
