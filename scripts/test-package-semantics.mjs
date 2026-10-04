import assert from 'node:assert/strict'
import {
  getPackageContentUnits,
  isContainerMeasurementUnit,
  isDirectMeasurementUnit,
  resolveInventoryPackageContent,
} from '../src/features/measurements/packageSemantics.ts'

const units = [
  { code: 'pcs', labelPl: 'sztuka', symbol: 'szt.', family: 'count', sortOrder: 10 },
  { code: 'g', labelPl: 'gram', symbol: 'g', family: 'mass', sortOrder: 20 },
  { code: 'kg', labelPl: 'kilogram', symbol: 'kg', family: 'mass', sortOrder: 30 },
  { code: 'ml', labelPl: 'mililitr', symbol: 'ml', family: 'volume', sortOrder: 40 },
  { code: 'l', labelPl: 'litr', symbol: 'l', family: 'volume', sortOrder: 50 },
  { code: 'package', labelPl: 'opakowanie', symbol: 'opak.', family: 'package', sortOrder: 60 },
  { code: 'jar', labelPl: 'słoik', symbol: 'słoik', family: 'jar', sortOrder: 70 },
]

assert.equal(isDirectMeasurementUnit(units[0]), true)
assert.equal(isContainerMeasurementUnit(units[5]), true)
assert.deepEqual(getPackageContentUnits(units).map((unit) => unit.code), ['pcs', 'g', 'kg', 'ml', 'l'])

assert.equal(resolveInventoryPackageContent({
  rowUnitCode: 'kg',
  units,
  explicitContent: null,
  productDefault: { packageContentValue: 1, packageContentUnitCode: 'l' },
}), null, 'direct Inventory units must not inherit Product package defaults')

assert.deepEqual(resolveInventoryPackageContent({
  rowUnitCode: 'package',
  units,
  explicitContent: null,
  productDefault: { packageContentValue: 1, packageContentUnitCode: 'l' },
}), { value: 1, unitCode: 'l' }, 'container rows may resolve Product defaults')

assert.deepEqual(resolveInventoryPackageContent({
  rowUnitCode: 'package',
  units,
  explicitContent: { value: 2, unitCode: 'l' },
  productDefault: { packageContentValue: 1, packageContentUnitCode: 'l' },
}), { value: 2, unitCode: 'l' }, 'explicit lot content must override the Product default')

assert.throws(() => resolveInventoryPackageContent({
  rowUnitCode: 'package',
  units,
  explicitContent: { value: 1, unitCode: 'jar' },
  productDefault: null,
}), /sztukach, masie albo objętości/)

assert.throws(() => resolveInventoryPackageContent({
  rowUnitCode: 'package',
  units,
  explicitContent: null,
  productDefault: null,
}), /sztukach, masie albo objętości/)

console.log('Package semantics tests: PASS')
