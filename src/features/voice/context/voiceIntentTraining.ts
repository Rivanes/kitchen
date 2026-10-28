import type { VoiceReadOnlyIntent } from '../voiceReadOnlyAssistant.ts'

export type VoiceIntentTrainingExample = {
  intent: VoiceReadOnlyIntent
  text: string
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

