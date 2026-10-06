import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  resolveRecipePackageContent,
} from '../src/features/measurements/packageSemantics.ts'

const units = [
  { code: 'pcs', labelPl: 'sztuka', symbol: 'szt.', family: 'count', sortOrder: 10, toBaseFactor: 1 },
  { code: 'g', labelPl: 'gram', symbol: 'g', family: 'mass', sortOrder: 20, toBaseFactor: 1 },
  { code: 'kg', labelPl: 'kilogram', symbol: 'kg', family: 'mass', sortOrder: 30, toBaseFactor: 1000 },
  { code: 'ml', labelPl: 'mililitr', symbol: 'ml', family: 'volume', sortOrder: 40, toBaseFactor: 1 },
  { code: 'l', labelPl: 'litr', symbol: 'l', family: 'volume', sortOrder: 50, toBaseFactor: 1000 },
  { code: 'package', labelPl: 'opakowanie', symbol: 'opak.', family: 'package', sortOrder: 60, toBaseFactor: 1 },
  { code: 'jar', labelPl: 'słoik', symbol: 'słoik', family: 'jar', sortOrder: 70, toBaseFactor: 1 },
]

const defaultOneLiter = { packageContentValue: 1, packageContentUnitCode: 'l' }
const defaultTwoLiters = { packageContentValue: 2, packageContentUnitCode: 'l' }

assert.equal(resolveRecipePackageContent({
  rowUnitCode: 'kg',
  units,
  explicitContent: null,
  productDefault: defaultOneLiter,
  productDefaultUnitCode: 'package',
}), null, 'direct Recipe units must not inherit Product package defaults')

assert.deepEqual(resolveRecipePackageContent({
  rowUnitCode: 'package',
  units,
  explicitContent: null,
  productDefault: defaultOneLiter,
  productDefaultUnitCode: 'package',
}), { value: 1, unitCode: 'l' }, 'Product default may seed a new Recipe container snapshot')

assert.throws(() => resolveRecipePackageContent({
  rowUnitCode: 'jar',
  units,
  explicitContent: null,
  productDefault: defaultOneLiter,
  productDefaultUnitCode: 'package',
}), /Zawartość|zawartość|opakowania/, 'Product default must not seed a different container unit')

assert.deepEqual(resolveRecipePackageContent({
  rowUnitCode: 'jar',
  units,
  explicitContent: { value: 0.5, unitCode: 'l' },
  productDefault: defaultOneLiter,
  productDefaultUnitCode: 'package',
}), { value: 0.5, unitCode: 'l' }, 'explicit Recipe snapshot remains valid for a non-default container unit')

const savedSnapshot = resolveRecipePackageContent({
  rowUnitCode: 'package',
  units,
  explicitContent: { value: 1, unitCode: 'l' },
  productDefault: defaultOneLiter,
  productDefaultUnitCode: 'package',
})
assert.deepEqual(savedSnapshot, { value: 1, unitCode: 'l' })

assert.deepEqual(resolveRecipePackageContent({
  rowUnitCode: 'package',
  units,
  explicitContent: savedSnapshot,
  productDefault: defaultTwoLiters,
  productDefaultUnitCode: 'package',
}), { value: 1, unitCode: 'l' }, 'stored Recipe snapshot must win over later Product default changes')

assert.throws(() => resolveRecipePackageContent({
  rowUnitCode: 'package',
  units,
  explicitContent: null,
  productDefault: null,
  productDefaultUnitCode: null,
}), /Zawartość|zawartość|opakowania/)

assert.throws(() => resolveRecipePackageContent({
  rowUnitCode: 'jar',
  units,
  explicitContent: { value: 1, unitCode: 'package' },
  productDefault: null,
  productDefaultUnitCode: null,
}), /Zawartość|zawartość|opakowania/)

const readModel = await readFile('src/features/recipes/recipesReadModel.ts', 'utf8')
const mutations = await readFile('src/features/recipes/recipeMutations.ts', 'utf8')
const editor = await readFile('src/features/recipes/RecipeIngredientEditorSheet.tsx', 'utf8')

for (const source of [readModel, mutations, editor]) {
  assert.match(source, /packageContentValue|package_content_value/)
  assert.match(source, /packageContentUnitCode|package_content_unit/)
}
assert.match(mutations, /resolveRecipePackageContent/)
assert.match(editor, /Zawartość 1/)
assert.match(editor, /zostanie zapamiętana dla tego przepisu/)
assert.match(editor, /reselectsOriginalProduct/)
assert.match(editor, /detachesProductIdentity/)
assert.match(editor, /returnsToOriginalProduct/)
assert.match(editor, /restoresOriginalSnapshot/)
assert.match(mutations, /productDefaultUnitCode/)

console.log('V4.1 Recipe package snapshot tests: PASS')
