# H7.5.4 — instalacja PWA: jeden dyskretny punkt pod modułami

## Kontrakt UX

- Dom ma dokładnie dwa główne kafelki: Jedzenie i Porządki.
- W zwykłej karcie przeglądarki jeden link „Zainstaluj Kitchen” znajduje się **pod obydwoma kafelkami**, wewnątrz `home-hub-main`. Nie zajmuje miejsca pomiędzy nagłówkiem Dom a zawartością.
- Link jest wizualnie drugorzędny, ma obszar dotyku co najmniej 44 px, dostępny focus klawiatury i `aria-expanded` / `aria-controls`.
- Instrukcje rozwijają się w normalnym przepływie dokumentu. Na 320×568, 360×640 i 390×844 treść można przewinąć; brak przycinania i nakładania na safe-area.
- W standalone PWA nie ma linku, tekstu „Kitchen jest zainstalowany” ani pustego bloku w jego miejscu.
- W karcie przeglądarki pomoc pozostaje dostępna niezależnie od typu przeglądarki i od `beforeinstallprompt`. Natywny prompt jest opcjonalnym dodatkiem.
- `runningStandalone` oznacza wyłącznie bieżący tryb wyświetlania (`display-mode: standalone` lub `navigator.standalone`). Zdarzenie `appinstalled` zwalnia już zużyty prompt, ale nie udaje wykrycia globalnej instalacji.
- `PwaUpdateNotice` pozostaje osobnym, warunkowym komunikatem. Nie ingerujemy w Service Worker, Auth, MembershipGate, Supabase, produkty ani SQL.

## Weryfikacja

- `scripts/test-h7-5-pwa.mjs` sprawdza pozycję po kafelkach, dokładnie jedno wejście, brak komunikatu instalacji w standalone oraz negatywne fixture dla poprzedniego błędnego układu i statusu.
- `npm run check`: `verify:project`, TypeScript, produkcyjny build. GitHub `Kitchen QA` i `Deploy Kitchen to GitHub Pages` muszą PASS dla tego samego SHA.
- Rzeczywiste QA po wdrożeniu: iOS Safari i inna przeglądarka, Android gdy dostępny, PWA standalone, małe ekrany, rozwijanie/zamykanie instrukcji, klawiatura/focus, native prompt opcjonalny i ręczna aktualizacja PWA.
