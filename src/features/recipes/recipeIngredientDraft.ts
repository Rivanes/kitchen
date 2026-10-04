export type RecipeIngredientOrderLike = {
  id: string
  sectionId: string
}

export function commitRecipeIngredientRow<T extends RecipeIngredientOrderLike>(
  current: readonly T[],
  nextRow: T,
  desiredSectionIndex: number | null,
) {
  const withoutCurrent = current.filter((row) => row.id !== nextRow.id)
  const targetSectionRows = withoutCurrent.filter((row) => row.sectionId === nextRow.sectionId)
  const targetSectionIndex = desiredSectionIndex === null
    ? targetSectionRows.length
    : Math.max(0, Math.min(desiredSectionIndex, targetSectionRows.length))

  if (targetSectionRows.length === 0) return [...withoutCurrent, nextRow]

  if (targetSectionIndex >= targetSectionRows.length) {
    const anchorId = targetSectionRows[targetSectionRows.length - 1].id
    const anchorIndex = withoutCurrent.findIndex((row) => row.id === anchorId)
    if (anchorIndex < 0) return [...withoutCurrent, nextRow]
    return [
      ...withoutCurrent.slice(0, anchorIndex + 1),
      nextRow,
      ...withoutCurrent.slice(anchorIndex + 1),
    ]
  }

  const anchorId = targetSectionRows[targetSectionIndex].id
  const anchorIndex = withoutCurrent.findIndex((row) => row.id === anchorId)
  if (anchorIndex < 0) return [...withoutCurrent, nextRow]

  return [
    ...withoutCurrent.slice(0, anchorIndex),
    nextRow,
    ...withoutCurrent.slice(anchorIndex),
  ]
}
