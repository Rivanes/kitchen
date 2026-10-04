export const DEFAULT_PRIMARY_RECIPE_SECTION_NAME = 'Główne'
export const RECIPE_SECTION_NAME_MAX = 80

export type RecipeSectionDraftLike = {
  id: string
  name: string
  isPrimary: boolean
}

export function cleanRecipeSectionName(value: string) {
  const clean = value.trim().replace(/\s+/g, ' ')
  if (!clean || clean.length > RECIPE_SECTION_NAME_MAX) {
    throw new Error(`Nazwa sekcji musi mieć od 1 do ${RECIPE_SECTION_NAME_MAX} znaków.`)
  }
  return clean
}

export function recipeSectionIdentity(value: string) {
  return cleanRecipeSectionName(value).toLocaleLowerCase('pl-PL')
}

export function validateRecipeSections<T extends RecipeSectionDraftLike>(sections: T[]) {
  if (sections.length === 0) {
    throw new Error('Przepis musi mieć sekcję główną składników.')
  }

  const ids = new Set<string>()
  const names = new Set<string>()
  let primaryCount = 0

  const cleaned = sections.map((section, index) => {
    if (!section.id) throw new Error('Brakuje identyfikatora sekcji przepisu.')
    if (ids.has(section.id)) throw new Error('Lista sekcji zawiera zduplikowaną sekcję.')
    ids.add(section.id)

    const name = cleanRecipeSectionName(section.name)
    const identity = name.toLocaleLowerCase('pl-PL')
    if (names.has(identity)) throw new Error(`Sekcja „${name}” już istnieje.`)
    names.add(identity)

    if (section.isPrimary) primaryCount += 1
    if (index === 0 && !section.isPrimary) {
      throw new Error('Pierwsza sekcja przepisu musi być sekcją główną.')
    }
    if (index > 0 && section.isPrimary) {
      throw new Error('Tylko pierwsza sekcja może być sekcją główną.')
    }

    return { ...section, name }
  })

  if (primaryCount !== 1) {
    throw new Error('Przepis musi mieć dokładnie jedną sekcję główną.')
  }

  return cleaned
}
