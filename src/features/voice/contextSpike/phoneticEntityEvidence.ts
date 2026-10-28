import { foldPolishText, levenshteinDistance, phraseSimilarity, tokenizeVoiceText } from '../voiceTextMatch.ts'

// Diagnostic phonetic channel for V6.1B-RO.2A.
// It is deliberately a general pronunciation-like normalization, not a Kitchen alias dictionary.
// It must remain one score among lexical/context signals and is not production G2P authority.
function relaxedPhoneticToken(value: string) {
  let text = foldPolishText(value)
  if (!text) return ''

  text = text
    .replace(/sch/g, 'sz')
    .replace(/sh/g, 'sz')
    .replace(/ch/g, 'h')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/qu/g, 'kw')
    .replace(/ck/g, 'k')
    .replace(/gn/g, 'ni')
    .replace(/gli/g, 'li')
    .replace(/ci([aeou])/g, 'si$1')
    .replace(/gi([aeou])/g, 'dzi$1')
    .replace(/j/g, 'i')
    .replace(/y/g, 'i')
    .replace(/[zżź]/g, 's')
    .replace(/[ś]/g, 's')
    .replace(/[ć]/g, 'c')
    .replace(/dz/g, 'c')
    .replace(/[ń]/g, 'n')
    .replace(/rz/g, 'z')
    .replace(/ó/g, 'u')
    .replace(/ą/g, 'on')
    .replace(/ę/g, 'en')
    .replace(/(.)\1+/g, '$1')

  // Vowels are deliberately coarsened for ASR/foreign-spelling tolerance.
  text = text
    .replace(/[aeę]/g, 'a')
    .replace(/[iy]/g, 'i')
    .replace(/[ouó]/g, 'u')

  return text.replace(/[^a-z0-9]+/g, '')
}

export function voicePhoneticKey(value: string) {
  return tokenizeVoiceText(value).map(relaxedPhoneticToken).filter(Boolean).join(' ')
}

function normalizedEditSimilarity(left: string, right: string) {
  if (!left || !right) return 0
  if (left === right) return 1
  const distance = levenshteinDistance(left, right)
  return Math.max(0, 1 - distance / Math.max(left.length, right.length))
}

export function phoneticPhraseSimilarity(candidate: string, query: string) {
  const candidateKey = voicePhoneticKey(candidate)
  const queryTokens = tokenizeVoiceText(query).map(relaxedPhoneticToken).filter(Boolean)
  if (!candidateKey || queryTokens.length === 0) return 0
  const candidateTokens = candidateKey.split(' ')

  let total = 0
  for (const candidateToken of candidateTokens) {
    let best = 0
    for (const queryToken of queryTokens) best = Math.max(best, normalizedEditSimilarity(candidateToken, queryToken))
    total += best
  }
  return total / candidateTokens.length
}

export type ContextEntityCandidate<T> = {
  value: T
  score: number
  lexicalScore: number
  phoneticScore: number
  contextScore: number
}

export type ContextEntityResolution<T> =
  | { decision: 'match'; candidate: ContextEntityCandidate<T>; candidates: ContextEntityCandidate<T>[] }
  | { decision: 'clarify'; candidates: ContextEntityCandidate<T>[] }
  | { decision: 'missing'; candidates: ContextEntityCandidate<T>[] }

export function resolveContextEntity<T>(input: {
  query: string
  values: readonly T[]
  getLabel: (value: T) => string
  getId: (value: T) => string
  activeEntityId?: string | null
  explicitEntityExpected?: boolean
  minScore?: number
  ambiguityMargin?: number
  limit?: number
}): ContextEntityResolution<T> {
  const minScore = input.minScore ?? 0.57
  const ambiguityMargin = input.ambiguityMargin ?? 0.075
  const limit = input.limit ?? 3

  const scored = input.values.map((value) => {
    const lexicalScore = phraseSimilarity(input.getLabel(value), input.query)
    const phoneticScore = phoneticPhraseSimilarity(input.getLabel(value), input.query)
    const contextScore = input.activeEntityId && input.getId(value) === input.activeEntityId ? 1 : 0
    const strongestText = Math.max(lexicalScore, phoneticScore)
    const score = Math.min(1, strongestText * 0.74 + lexicalScore * 0.12 + phoneticScore * 0.14 + contextScore * (input.explicitEntityExpected ? 0.02 : 0.22))
    return { value, score, lexicalScore, phoneticScore, contextScore }
  }).sort((left, right) => right.score - left.score)

  const best = scored[0]
  if (!best || best.score < minScore) return { decision: 'missing', candidates: scored.slice(0, limit) }

  const second = scored[1]
  if (second) {
    const bestLabel = foldPolishText(input.getLabel(best.value))
    const secondLabel = foldPolishText(input.getLabel(second.value))
    const foldedQuery = foldPolishText(input.query)
    const labelsOverlap = bestLabel && secondLabel && (secondLabel.startsWith(`${bestLabel} `) || bestLabel.startsWith(`${secondLabel} `))
    const queryOnlyNamesTheSharedLabel = labelsOverlap && (foldedQuery.includes(bestLabel) || foldedQuery.includes(secondLabel))
      && !foldedQuery.includes(secondLabel.length > bestLabel.length ? secondLabel : bestLabel)

    if (
      (best.score - second.score < ambiguityMargin && second.score >= minScore * 0.92)
      || (queryOnlyNamesTheSharedLabel && second.score >= minScore * 0.75)
    ) {
      return { decision: 'clarify', candidates: scored.slice(0, limit) }
    }
  }

  return { decision: 'match', candidate: best, candidates: scored.slice(0, limit) }
}
