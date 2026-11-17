# H7.5.3 — PWA: stały dostęp do instalacji (2026-11-17)

## Cel

- Ekran Dom ma nadal **dwa** kafle: Jedzenie i Porządki.
- Przycisk **Zainstaluj Kitchen** dostępny jest bezpośrednio POD nagłówkiem Dom, PRZED wyśrodkowanymi kaflami, niezależnie od rozpoznania przeglądarki i `beforeinstallprompt`.
- Brak sztywnego rozpoznawania nazw przeglądarek ani filtrowania instrukcji wg `userAgent`. `beforeinstallprompt` zmienia jedynie możliwość otwarcia natywnego promptu, nie widoczność pomocy.
- Gdy natywny prompt nie jest obsługiwany: stała instrukcja iOS/iPadOS, Android/inne. Brak fałszywej obietnicy automatycznej instalacji. W przypadku iOS bez przycisku dodawania można skorzystać z Safari.
- W trybie `standalone` przycisk nie znika; pokazuje status `Kitchen uruchomiony jako aplikacja` i informacje o ponownym uruchomieniu. Nie oferuje drugiej instalacji.
- Stany: unavailable/manual, native-prompt available, installing, accepted, dismissed, installed. `accepted` nie oznacza `installed`.
- Obsługa starszego `MediaQueryList.addListener` i eventu `pageshow` pozwala wykryć zmianę trybu po powrocie do karty.
- Wspólny `MembershipGate`, auth, Supabase, katalog produktów, Service Worker, Vite config i SQL pozostają bez zmian.

## Weryfikacja

- `npm run verify:project` wywołuje `scripts/test-h7-5-pwa.mjs`: testuje pozycję przycisku przed kafelkami, brak wczesnego `return null` dla installed, instrukcje niezależne od UA, rozdzielenie możliwości natywnego promptu od widoczności, brak rozgałęziania produktów/danych.
- GitHub `Kitchen QA` i `Deploy` na tym samym commicie muszą PASS (TypeScript i production build).
- QA urządzeń: iPhone w Safari i innej przeglądarce, Android/Chromium i browser bez `beforeinstallprompt`, standalone, mała wysokość ekranu, aktualizacja SW nieprzerywająca edycji.
- Nie obiecuj systemowej instalacji we wszystkich przeglądarkach: to ograniczenie platformy, nie interfejsu Kitchen.
