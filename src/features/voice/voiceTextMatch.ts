const POLISH_SPECIALS: Record<string, string> = {
  ł: 'l',
  Ł: 'l',
}

export function foldPolishText(value: string) {
  return value
    .split('')
    .map((character) => POLISH_SPECIALS[character] ?? character)
    .join('')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('pl-PL')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeVoiceText(value: string) {
  const folded = foldPolishText(value)
  return folded ? folded.split(' ') : []
}

export function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0
  if (!left) return right.length
  if (!right) return left.length

  const previous = Array.from({ length: right.length + 1 }, (_value, index) => index)
  const current = new Array<number>(right.length + 1)

  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row
    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + substitutionCost,
      )
    }
    for (let column = 0; column <= right.length; column += 1) previous[column] = current[column]
  }

  return previous[right.length]
}

export function tokenSimilarity(left: string, right: string) {
  const a = foldPolishText(left)
  const b = foldPolishText(right)
  if (!a || !b) return 0
  if (a === b) return 1
  if ((a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b))) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length)
    return Math.max(0.82, ratio)
  }
  let commonPrefix = 0
  while (commonPrefix < Math.min(a.length, b.length) && a[commonPrefix] === b[commonPrefix]) commonPrefix += 1
  const prefixRatio = commonPrefix / Math.min(a.length, b.length)
  const inflectionScore = commonPrefix >= 3 && prefixRatio >= 0.6
    ? 0.72 + 0.18 * prefixRatio
    : 0

  const distance = levenshteinDistance(a, b)
  const editScore = Math.max(0, 1 - distance / Math.max(a.length, b.length))
  return Math.max(editScore, inflectionScore)
}

export function phraseSimilarity(candidate: string, query: string) {
  const foldedCandidate = foldPolishText(candidate)
  const foldedQuery = foldPolishText(query)
  if (!foldedCandidate || !foldedQuery) return 0
  if (foldedCandidate === foldedQuery) return 1
  if (foldedQuery.includes(foldedCandidate)) return 0.99

  const candidateTokens = tokenizeVoiceText(candidate)
  const queryTokens = tokenizeVoiceText(query)
  if (candidateTokens.length === 0 || queryTokens.length === 0) return 0

  let total = 0
  for (const candidateToken of candidateTokens) {
    let best = 0
    for (const queryToken of queryTokens) {
      best = Math.max(best, tokenSimilarity(candidateToken, queryToken))
    }
    total += best
  }

  const average = total / candidateTokens.length
  const coveragePenalty = candidateTokens.length > queryTokens.length
    ? Math.max(0.72, queryTokens.length / candidateTokens.length)
    : 1

  return average * coveragePenalty
}

export type VoiceEntityCandidate<T> = {
  value: T
  score: number
}

export type VoiceEntityResolution<T> =
  | { kind: 'matched'; value: T; score: number }
  | { kind: 'ambiguous'; candidates: VoiceEntityCandidate<T>[] }
  | { kind: 'missing' }

export function resolveVoiceEntity<T>(input: {
  query: string
  values: readonly T[]
  getLabel: (value: T) => string
  minScore?: number
  ambiguityMargin?: number
  limit?: number
}): VoiceEntityResolution<T> {
  const minScore = input.minScore ?? 0.69
  const ambiguityMargin = input.ambiguityMargin ?? 0.075
  const limit = input.limit ?? 3

  const scored = input.values
    .map((value) => ({ value, score: phraseSimilarity(input.getLabel(value), input.query) }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return { kind: 'missing' }

  const best = scored[0]
  const second = scored[1]
  if (second && best.score - second.score < ambiguityMargin) {
    return { kind: 'ambiguous', candidates: scored.slice(0, limit) }
  }

  return { kind: 'matched', value: best.value, score: best.score }
}
