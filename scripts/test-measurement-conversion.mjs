import assert from 'node:assert/strict'
import {
  MeasurementConversionError,
  convertMeasurementQuantity,
  fromBaseMeasurementQuantity,
  toBaseMeasurementQuantity,
} from '../src/features/measurements/measurementConversion.ts'

const units = [
  { code: 'pcs', labelPl: 'sztuka', symbol: 'szt.', family: 'count', sortOrder: 10, toBaseFactor: 1 },
  { code: 'g', labelPl: 'gram', symbol: 'g', family: 'mass', sortOrder: 20, toBaseFactor: 1 },
  { code: 'kg', labelPl: 'kilogram', symbol: 'kg', family: 'mass', sortOrder: 30, toBaseFactor: 1000 },
  { code: 'ml', labelPl: 'mililitr', symbol: 'ml', family: 'volume', sortOrder: 40, toBaseFactor: 1 },
  { code: 'l', labelPl: 'litr', symbol: 'l', family: 'volume', sortOrder: 50, toBaseFactor: 1000 },
  { code: 'package', labelPl: 'opakowanie', symbol: 'opak.', family: 'package', sortOrder: 60, toBaseFactor: 1 },
]

assert.equal(convertMeasurementQuantity(0.5, 'kg', 'g', units), 500)
assert.equal(convertMeasurementQuantity(500, 'g', 'kg', units), 0.5)
assert.equal(convertMeasurementQuantity(1, 'l', 'ml', units), 1000)
assert.equal(convertMeasurementQuantity(1000, 'ml', 'l', units), 1)
assert.equal(convertMeasurementQuantity(3, 'pcs', 'pcs', units), 3)
assert.equal(toBaseMeasurementQuantity(1.25, 'kg', units), 1250)
assert.equal(toBaseMeasurementQuantity(0, 'ml', units), 0)
assert.equal(fromBaseMeasurementQuantity(500, 'kg', units), 0.5)
assert.equal(fromBaseMeasurementQuantity(1000, 'l', units), 1)

assert.throws(
  () => convertMeasurementQuantity(1, 'kg', 'l', units),
  (error) => error instanceof MeasurementConversionError && error.code === 'incompatible-family',
)
assert.throws(
  () => convertMeasurementQuantity(1, 'package', 'pcs', units),
  (error) => error instanceof MeasurementConversionError && error.code === 'non-direct-unit',
)
assert.throws(
  () => convertMeasurementQuantity(-1, 'g', 'kg', units),
  (error) => error instanceof MeasurementConversionError && error.code === 'invalid-value',
)

console.log('V4.1 measurement conversion authority tests: PASS')
