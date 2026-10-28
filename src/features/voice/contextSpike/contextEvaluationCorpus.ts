import type { VoiceReadOnlyIntent } from '../voiceReadOnlyAssistant.ts'

export type VoiceIntentTrainingExample = {
  intent: VoiceReadOnlyIntent
  text: string
}

export type VoiceIntentEvaluationCategory =
  | 'canonical'
  | 'paraphrase'
  | 'stt-noise'
  | 'context'
  | 'out-of-domain'

export type VoiceIntentEvaluationCase = {
  id: string
  category: VoiceIntentEvaluationCategory
  text: string
  expectedIntent: VoiceReadOnlyIntent
  note?: string
}

export const VOICE_EVALUATION_INTENTS: readonly VoiceReadOnlyIntent[] = [
  'inventory-product',
  'inventory-location',
  'inventory-all',
  'shopping-list',
  'recipe-summary',
  'recipe-ingredients',
  'recipe-availability',
  'recipe-instructions',
  'recipe-servings',
  'cookable-recipes',
  'cookable-with-product',
  'help',
  'unknown',
] as const

// Deliberately finite Kitchen-domain supervision. These are not replacement/correction pairs.
// Real phone failures used in held-out evaluation are intentionally absent here.
export const VOICE_INTENT_TRAINING_EXAMPLES: readonly VoiceIntentTrainingExample[] = [
  // inventory-product
  { intent: 'inventory-product', text: 'ile mam mleka' },
  { intent: 'inventory-product', text: 'czy mam jeszcze jajka' },
  { intent: 'inventory-product', text: 'jaki jest stan ryżu' },
  { intent: 'inventory-product', text: 'sprawdź ile zostało masła' },
  { intent: 'inventory-product', text: 'zostało mi coś z kurczaka' },
  { intent: 'inventory-product', text: 'mam jeszcze passatę' },
  { intent: 'inventory-product', text: 'pokaż stan mąki' },
  { intent: 'inventory-product', text: 'ile zostało sera' },
  { intent: 'inventory-product', text: 'czy jest pieprz' },
  { intent: 'inventory-product', text: 'sprawdź produkt mleko' },

  // inventory-location
  { intent: 'inventory-location', text: 'co mam w lodówce' },
  { intent: 'inventory-location', text: 'co leży w zamrażarce' },
  { intent: 'inventory-location', text: 'pokaż zawartość szafki' },
  { intent: 'inventory-location', text: 'co jest w spiżarni' },
  { intent: 'inventory-location', text: 'jakie przyprawy mam' },
  { intent: 'inventory-location', text: 'co znajduje się w lodówce' },
  { intent: 'inventory-location', text: 'zawartość zamrażarki' },
  { intent: 'inventory-location', text: 'co trzymam w domowe' },
  { intent: 'inventory-location', text: 'co siedzi w szafce' },
  { intent: 'inventory-location', text: 'wymień rzeczy z lodówki' },

  // inventory-all
  { intent: 'inventory-all', text: 'co mam w zapasach' },
  { intent: 'inventory-all', text: 'pokaż wszystkie zapasy' },
  { intent: 'inventory-all', text: 'jak wyglądają moje zapasy' },
  { intent: 'inventory-all', text: 'co mam obecnie na stanie' },
  { intent: 'inventory-all', text: 'podsumuj zapasy' },
  { intent: 'inventory-all', text: 'ile produktów mam na stanie' },
  { intent: 'inventory-all', text: 'co mam ogólnie w kuchni' },
  { intent: 'inventory-all', text: 'przegląd zapasów' },

  // shopping-list
  { intent: 'shopping-list', text: 'co jest na liście zakupów' },
  { intent: 'shopping-list', text: 'co mam kupić' },
  { intent: 'shopping-list', text: 'ile rzeczy mam do kupienia' },
  { intent: 'shopping-list', text: 'ile pozycji jest na liście' },
  { intent: 'shopping-list', text: 'pokaż zakupy' },
  { intent: 'shopping-list', text: 'co zostało do kupienia' },
  { intent: 'shopping-list', text: 'jak długa jest lista zakupowa' },
  { intent: 'shopping-list', text: 'policz rzeczy na zakupach' },
  { intent: 'shopping-list', text: 'co mam na zakupach' },
  { intent: 'shopping-list', text: 'sprawdź listę zakupów' },
  { intent: 'shopping-list', text: 'co trzeba jeszcze dokupić' },
  { intent: 'shopping-list', text: 'jak wyglądają zakupy do zrobienia' },

  // recipe-summary
  { intent: 'recipe-summary', text: 'pokaż przepis na lasagne' },
  { intent: 'recipe-summary', text: 'znajdź przepis na spaghetti' },
  { intent: 'recipe-summary', text: 'otwórz przepis na rosół' },
  { intent: 'recipe-summary', text: 'mam przepis na omlet' },
  { intent: 'recipe-summary', text: 'opowiedz o przepisie pizza' },
  { intent: 'recipe-summary', text: 'pokaż mi lasagne' },
  { intent: 'recipe-summary', text: 'znajdź lasagne w przepisach' },
  { intent: 'recipe-summary', text: 'chcę zobaczyć przepis na zupę' },
  { intent: 'recipe-summary', text: 'chcę zobaczyć zapisany przepis' },
  { intent: 'recipe-summary', text: 'podejrzyj wybrany przepis' },

  // recipe-ingredients
  { intent: 'recipe-ingredients', text: 'jakie są składniki do lasagne' },
  { intent: 'recipe-ingredients', text: 'czego potrzebuję do spaghetti' },
  { intent: 'recipe-ingredients', text: 'co wchodzi do omletu' },
  { intent: 'recipe-ingredients', text: 'wymień składniki pizzy' },
  { intent: 'recipe-ingredients', text: 'co potrzeba na rosół' },
  { intent: 'recipe-ingredients', text: 'składniki przepisu lasagne' },
  { intent: 'recipe-ingredients', text: 'z czego robi się ten przepis' },
  { intent: 'recipe-ingredients', text: 'czego wymaga lasagne' },

  // recipe-availability
  { intent: 'recipe-availability', text: 'czy mam wszystko do lasagne' },
  { intent: 'recipe-availability', text: 'czy wystarczy mi składników na omlet' },
  { intent: 'recipe-availability', text: 'czy mogę zrobić lasagne z tego co mam' },
  { intent: 'recipe-availability', text: 'czy mam komplet do pizzy' },
  { intent: 'recipe-availability', text: 'czego brakuje do spaghetti' },
  { intent: 'recipe-availability', text: 'sprawdź czy starczy mi na rosół' },
  { intent: 'recipe-availability', text: 'czy mam wszystkie produkty do przepisu' },
  { intent: 'recipe-availability', text: 'mam wszystko potrzebne do lasagne' },

  // recipe-instructions
  { intent: 'recipe-instructions', text: 'jak zrobić lasagne' },
  { intent: 'recipe-instructions', text: 'jak przygotować omlet' },
  { intent: 'recipe-instructions', text: 'jak ugotować rosół' },
  { intent: 'recipe-instructions', text: 'pokaż sposób przygotowania pizzy' },
  { intent: 'recipe-instructions', text: 'co mam robić krok po kroku w lasagne' },
  { intent: 'recipe-instructions', text: 'instrukcja przygotowania spaghetti' },
  { intent: 'recipe-instructions', text: 'jak się robi ten przepis' },
  { intent: 'recipe-instructions', text: 'jak mam to przygotować' },

  // recipe-servings
  { intent: 'recipe-servings', text: 'ile porcji ma lasagne' },
  { intent: 'recipe-servings', text: 'na ile osób jest omlet' },
  { intent: 'recipe-servings', text: 'ile porcji wychodzi z przepisu' },
  { intent: 'recipe-servings', text: 'dla ilu osób jest pizza' },
  { intent: 'recipe-servings', text: 'na ile osób jest zapisany rosół' },
  { intent: 'recipe-servings', text: 'ile osób najadłoby się lasagne' },
  { intent: 'recipe-servings', text: 'jaka jest liczba porcji' },
  { intent: 'recipe-servings', text: 'porcje w przepisie lasagne' },

  // cookable-recipes
  { intent: 'cookable-recipes', text: 'co mogę ugotować' },
  { intent: 'cookable-recipes', text: 'co da się zrobić z tego co mam' },
  { intent: 'cookable-recipes', text: 'co mogę dziś przygotować' },
  { intent: 'cookable-recipes', text: 'jakie przepisy mogę teraz zrobić' },
  { intent: 'cookable-recipes', text: 'co ugotuję z aktualnych zapasów' },
  { intent: 'cookable-recipes', text: 'na co mam komplet składników' },
  { intent: 'cookable-recipes', text: 'co mogę zrobić do jedzenia' },
  { intent: 'cookable-recipes', text: 'podaj coś co mogę ugotować' },

  // cookable-with-product
  { intent: 'cookable-with-product', text: 'co mogę ugotować z kurczaka' },
  { intent: 'cookable-with-product', text: 'co zrobię z jajek' },
  { intent: 'cookable-with-product', text: 'jakie przepisy mam z mlekiem' },
  { intent: 'cookable-with-product', text: 'co mogę przygotować z passatą' },
  { intent: 'cookable-with-product', text: 'co ugotuję z ziemniaków' },
  { intent: 'cookable-with-product', text: 'co da się zrobić z boczku' },
  { intent: 'cookable-with-product', text: 'przepisy które mogę zrobić z jajkami' },
  { intent: 'cookable-with-product', text: 'co na obiad z kurczakiem' },

  // help
  { intent: 'help', text: 'co potrafisz' },
  { intent: 'help', text: 'w czym możesz mi pomóc' },
  { intent: 'help', text: 'jakie pytania rozumiesz' },
  { intent: 'help', text: 'co mogę zapytać' },
  { intent: 'help', text: 'pomoc voice' },
  { intent: 'help', text: 'powiedz co umiesz' },
  { intent: 'help', text: 'jak korzystać z asystenta' },
  { intent: 'help', text: 'jakie rzeczy mogę ci mówić' },
  { intent: 'help', text: 'jak z tobą rozmawiać' },

  // unknown / out-of-domain negatives
  { intent: 'unknown', text: 'jaka będzie jutro pogoda' },
  { intent: 'unknown', text: 'napisz wiadomość do mamy' },
  { intent: 'unknown', text: 'co sądzisz o tym filmie' },
  { intent: 'unknown', text: 'włącz muzykę' },
  { intent: 'unknown', text: 'która jest godzina' },
  { intent: 'unknown', text: 'zadzwoń do kogoś' },
  { intent: 'unknown', text: 'otwórz youtube' },
  { intent: 'unknown', text: 'opowiedz dowcip' },
  { intent: 'unknown', text: 'usuń wszystko' },
  { intent: 'unknown', text: 'kup akcje firmy' },
  { intent: 'unknown', text: 'co wydarzyło się w wiadomościach' },
  { intent: 'unknown', text: 'jak dojechać do krakowa' },
] as const

// Held-out: these are never used by the tiny classifier training loop.
export const VOICE_INTENT_HELD_OUT_CASES: readonly VoiceIntentEvaluationCase[] = [
  { id: 'canonical-stock-1', category: 'canonical', text: 'Ile mam mleka?', expectedIntent: 'inventory-product' },
  { id: 'canonical-location-1', category: 'canonical', text: 'Co mam w lodówce?', expectedIntent: 'inventory-location' },
  { id: 'canonical-shopping-1', category: 'canonical', text: 'Co jest na liście zakupów?', expectedIntent: 'shopping-list' },
  { id: 'canonical-availability-1', category: 'canonical', text: 'Czy mam wszystko do lasagne?', expectedIntent: 'recipe-availability' },
  { id: 'canonical-cookable-1', category: 'canonical', text: 'Co mogę ugotować?', expectedIntent: 'cookable-recipes' },

  { id: 'paraphrase-stock-1', category: 'paraphrase', text: 'Czy zostało mi jeszcze jakieś mleko?', expectedIntent: 'inventory-product' },
  { id: 'paraphrase-stock-2', category: 'paraphrase', text: 'Sprawdź proszę, jak stoję z jajkami.', expectedIntent: 'inventory-product' },
  { id: 'paraphrase-location-1', category: 'paraphrase', text: 'Co siedzi teraz w lodówce?', expectedIntent: 'inventory-location' },
  { id: 'paraphrase-inventory-1', category: 'paraphrase', text: 'Daj mi ogólny przegląd tego, co mam na stanie.', expectedIntent: 'inventory-all' },
  { id: 'paraphrase-shopping-1', category: 'paraphrase', text: 'Ile pozycji zostało mi jeszcze do kupienia?', expectedIntent: 'shopping-list' },
  { id: 'paraphrase-shopping-2', category: 'paraphrase', text: 'Jak wygląda to, co trzeba dokupić?', expectedIntent: 'shopping-list' },
  { id: 'paraphrase-recipe-1', category: 'paraphrase', text: 'Chcę podejrzeć lasagne.', expectedIntent: 'recipe-summary' },
  { id: 'paraphrase-ingredients-1', category: 'paraphrase', text: 'Co wchodzi w skład lasagne?', expectedIntent: 'recipe-ingredients' },
  { id: 'paraphrase-availability-1', category: 'paraphrase', text: 'Czy z obecnych zapasów zrobię lasagne?', expectedIntent: 'recipe-availability' },
  { id: 'paraphrase-instructions-1', category: 'paraphrase', text: 'Powiedz mi krok po kroku, jak przygotować lasagne.', expectedIntent: 'recipe-instructions' },
  { id: 'paraphrase-servings-1', category: 'paraphrase', text: 'Na ile osób wystarcza lazania?', expectedIntent: 'recipe-servings' },
  { id: 'paraphrase-cookable-1', category: 'paraphrase', text: 'Co da się teraz sensownie ugotować?', expectedIntent: 'cookable-recipes' },
  { id: 'paraphrase-cookable-product-1', category: 'paraphrase', text: 'Mam kurczaka — co mogę z niego zrobić?', expectedIntent: 'cookable-with-product' },
  { id: 'paraphrase-help-1', category: 'paraphrase', text: 'Jakiego typu rzeczy mogę ci powiedzieć?', expectedIntent: 'help' },

  // Real or realistic STT damage. No exact corrupted->clean mapping exists in training.
  { id: 'stt-real-shopping-1', category: 'stt-noise', text: 'I lebałam rzeczy na liście.', expectedIntent: 'shopping-list', note: 'Real iPhone transcript 2026-10-08.' },
  { id: 'stt-real-milk-1', category: 'stt-noise', text: 'Dodajde dwa opokowania mleka do ludówki', expectedIntent: 'unknown', note: 'Real V6.1A write-shaped transcript; read-only engine must not reinterpret it as a read query.' },
  { id: 'stt-real-milk-2', category: 'stt-noise', text: 'Dodaj, to warto opokowaniam lekkę do ludówki.', expectedIntent: 'unknown', note: 'Real V6.1A write-shaped transcript; read-only engine must reject writes.' },
  { id: 'stt-noise-shopping-2', category: 'stt-noise', text: 'ile mam żeczy na liśće', expectedIntent: 'shopping-list' },
  { id: 'stt-noise-stock-1', category: 'stt-noise', text: 'ile maam mlekha', expectedIntent: 'inventory-product' },
  { id: 'stt-noise-location-1', category: 'stt-noise', text: 'co mam w lodufce', expectedIntent: 'inventory-location' },
  { id: 'stt-noise-recipe-1', category: 'stt-noise', text: 'czy mam wszystko do lasani', expectedIntent: 'recipe-availability' },
  { id: 'stt-noise-servings-1', category: 'stt-noise', text: 'na ile osub jest lazania', expectedIntent: 'recipe-servings' },
  { id: 'stt-noise-ingredients-1', category: 'stt-noise', text: 'co whodzi do lazani', expectedIntent: 'recipe-ingredients' },

  // Context-only phrases are evaluated by the context engine prototype, not intent classifier alone.
  { id: 'context-recipe-followup', category: 'context', text: 'Czy mam wszystko?', expectedIntent: 'recipe-availability' },
  { id: 'context-product-location', category: 'context', text: 'A w zamrażarce?', expectedIntent: 'inventory-product' },
  { id: 'context-shopping-followup', category: 'context', text: 'Ile tego jest?', expectedIntent: 'shopping-list' },

  { id: 'ood-weather', category: 'out-of-domain', text: 'Jaka będzie pogoda w weekend?', expectedIntent: 'unknown' },
  { id: 'ood-message', category: 'out-of-domain', text: 'Napisz wiadomość do Pawła.', expectedIntent: 'unknown' },
  { id: 'ood-delete', category: 'out-of-domain', text: 'Usuń wszystkie moje dane.', expectedIntent: 'unknown' },
  { id: 'ood-film', category: 'out-of-domain', text: 'Co sądzisz o tym filmie?', expectedIntent: 'unknown' },
  { id: 'ood-music', category: 'out-of-domain', text: 'Włącz mi muzykę.', expectedIntent: 'unknown' },
] as const

export type VoiceEntityKind = 'product' | 'recipe' | 'location'

export type VoiceEntityEvaluationCase = {
  id: string
  kind: VoiceEntityKind
  utterance: string
  candidates: readonly { id: string; label: string }[]
  expectedId: string | null
  expectedDecision: 'match' | 'clarify' | 'missing'
}

export const VOICE_ENTITY_EVALUATION_CASES: readonly VoiceEntityEvaluationCase[] = [
  {
    id: 'recipe-lasagne-clean', kind: 'recipe', utterance: 'pokaż lasagne',
    candidates: [{ id: 'lasagne', label: 'Lasagne' }, { id: 'omlet', label: 'Omlet' }],
    expectedId: 'lasagne', expectedDecision: 'match',
  },
  {
    id: 'recipe-lasagne-lasani', kind: 'recipe', utterance: 'czy mam wszystko do lasani',
    candidates: [{ id: 'lasagne', label: 'Lasagne' }, { id: 'omlet', label: 'Omlet' }],
    expectedId: 'lasagne', expectedDecision: 'match',
  },
  {
    id: 'recipe-lasagne-lasania', kind: 'recipe', utterance: 'składniki do lasania',
    candidates: [{ id: 'lasagne', label: 'Lasagne' }, { id: 'omlet', label: 'Omlet' }],
    expectedId: 'lasagne', expectedDecision: 'match',
  },
  {
    id: 'recipe-lasagne-lazania', kind: 'recipe', utterance: 'na ile osób jest lazania',
    candidates: [{ id: 'lasagne', label: 'Lasagne' }, { id: 'omlet', label: 'Omlet' }],
    expectedId: 'lasagne', expectedDecision: 'match',
  },
  {
    id: 'recipe-lasagne-lazanii', kind: 'recipe', utterance: 'jak zrobić lazanii',
    candidates: [{ id: 'lasagne', label: 'Lasagne' }, { id: 'omlet', label: 'Omlet' }],
    expectedId: 'lasagne', expectedDecision: 'match',
  },
  {
    id: 'product-passata-noise', kind: 'product', utterance: 'ile mam pasaty muti',
    candidates: [{ id: 'passata', label: 'Passata Mutti' }, { id: 'pasta', label: 'Pasta miso' }, { id: 'milk', label: 'Mleko' }],
    expectedId: 'passata', expectedDecision: 'match',
  },
  {
    id: 'product-eggs-inflection', kind: 'product', utterance: 'czy mam jeszcze jajek',
    candidates: [{ id: 'eggs', label: 'Jajka' }, { id: 'milk', label: 'Mleko' }],
    expectedId: 'eggs', expectedDecision: 'match',
  },
  {
    id: 'location-freezer-noise', kind: 'location', utterance: 'co jest w zamra żarce',
    candidates: [{ id: 'fridge', label: 'Lodówka' }, { id: 'freezer', label: 'Zamrażarka' }, { id: 'pantry', label: 'Szafka' }],
    expectedId: 'freezer', expectedDecision: 'match',
  },
  {
    id: 'ambiguous-lasagne', kind: 'recipe', utterance: 'pokaż lasagne',
    candidates: [{ id: 'classic', label: 'Lasagne' }, { id: 'chicken', label: 'Lasagne z kurczakiem' }],
    expectedId: null, expectedDecision: 'clarify',
  },
  {
    id: 'missing-recipe', kind: 'recipe', utterance: 'pokaż ramen',
    candidates: [{ id: 'lasagne', label: 'Lasagne' }, { id: 'omlet', label: 'Omlet' }],
    expectedId: null, expectedDecision: 'missing',
  },
] as const

export const VOICE_CONTEXT_EVALUATION_SEQUENCES = [
  {
    id: 'recipe-followup',
    initial: { text: 'Pokaż lasagne', expectedIntent: 'recipe-summary' as const, entity: { kind: 'recipe' as const, id: 'lasagne', label: 'Lasagne' } },
    followup: { text: 'Czy mam wszystko?', expectedIntent: 'recipe-availability' as const, expectedEntityId: 'lasagne' },
  },
  {
    id: 'product-location-followup',
    initial: { text: 'Ile mam mleka?', expectedIntent: 'inventory-product' as const, entity: { kind: 'product' as const, id: 'milk', label: 'Mleko' } },
    followup: { text: 'A w zamrażarce?', expectedIntent: 'inventory-product' as const, expectedEntityId: 'milk', expectedLocationId: 'freezer' },
  },
  {
    id: 'shopping-followup',
    initial: { text: 'Co mam kupić?', expectedIntent: 'shopping-list' as const },
    followup: { text: 'Ile tego jest?', expectedIntent: 'shopping-list' as const },
  },
] as const

export type VoiceIntentPrototype = {
  intent: VoiceReadOnlyIntent
  text: string
}

// Compact prototype set for the optional semantic benchmark. It is intentionally separate
// from the tiny classifier training data so each candidate can be measured independently.
export const VOICE_SEMANTIC_INTENT_PROTOTYPES: readonly VoiceIntentPrototype[] = [
  { intent: 'inventory-product', text: 'sprawdź stan konkretnego produktu w zapasach' },
  { intent: 'inventory-product', text: 'ile zostało mi danego produktu' },
  { intent: 'inventory-location', text: 'pokaż zawartość konkretnej lokalizacji zapasów' },
  { intent: 'inventory-location', text: 'co znajduje się w lodówce lub zamrażarce' },
  { intent: 'inventory-all', text: 'podsumuj wszystkie moje zapasy' },
  { intent: 'shopping-list', text: 'co jest na mojej liście zakupów i ile pozycji mam kupić' },
  { intent: 'recipe-summary', text: 'znajdź i pokaż konkretny zapisany przepis' },
  { intent: 'recipe-ingredients', text: 'jakich składników wymaga konkretny przepis' },
  { intent: 'recipe-availability', text: 'czy mam komplet składników potrzebnych do przepisu' },
  { intent: 'recipe-instructions', text: 'jak przygotować konkretny przepis krok po kroku' },
  { intent: 'recipe-servings', text: 'na ile osób lub porcji jest zapisany przepis' },
  { intent: 'cookable-recipes', text: 'jakie zapisane przepisy mogę teraz ugotować z zapasów' },
  { intent: 'cookable-with-product', text: 'co mogę ugotować z konkretnym produktem' },
  { intent: 'help', text: 'jakie pytania rozumie asystent Kitchen' },
  { intent: 'unknown', text: 'pytanie niezwiązane z zapasami zakupami ani przepisami Kitchen' },
] as const
