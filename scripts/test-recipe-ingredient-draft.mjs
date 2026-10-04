import assert from 'node:assert/strict'
import { commitRecipeIngredientRow } from '../src/features/recipes/recipeIngredientDraft.ts'

const source = [
  { id: 'a', sectionId: 'main', value: 'A' },
  { id: 'b', sectionId: 'main', value: 'B' },
  { id: 'c', sectionId: 'main', value: 'C' },
  { id: 'd', sectionId: 'sauce', value: 'D' },
]

const unchangedSource = structuredClone(source)
const movedUp = commitRecipeIngredientRow(source, { ...source[1], value: 'B2' }, 0)
assert.deepEqual(source, unchangedSource, 'staged authoring helper must not mutate the parent draft input')
assert.deepEqual(
  movedUp.filter((row) => row.sectionId === 'main').map((row) => row.id),
  ['b', 'a', 'c'],
  'same-section Apply must commit the staged order exactly once',
)
assert.equal(movedUp.find((row) => row.id === 'b')?.value, 'B2')

const unchangedOrder = commitRecipeIngredientRow(source, { ...source[1], value: 'B3' }, 1)
assert.deepEqual(
  unchangedOrder.filter((row) => row.sectionId === 'main').map((row) => row.id),
  ['a', 'b', 'c'],
  'editing without staged reorder must preserve the original section order',
)

const movedSection = commitRecipeIngredientRow(source, { ...source[1], sectionId: 'sauce' }, null)
assert.deepEqual(
  movedSection.filter((row) => row.sectionId === 'sauce').map((row) => row.id),
  ['d', 'b'],
  'moving to another section must append to the target section',
)

const created = commitRecipeIngredientRow(source, { id: 'e', sectionId: 'main', value: 'E' }, null)
assert.deepEqual(
  created.filter((row) => row.sectionId === 'main').map((row) => row.id),
  ['a', 'b', 'c', 'e'],
  'new ingredients must append to their selected section',
)

console.log('Recipe ingredient draft transaction tests: PASS')
