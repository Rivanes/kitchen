# H7.4C.1 — Jeden wspólny słownik produktów

**Corrective SOURCE READY; LIVE SQL/CI/Deploy/QA OPEN** (2026-11-17). Nadpisuje opt-in model H7.4C; dane właścicieli zachowane.

- `ProductAutocompleteField` pokazuje **jedną alfabetyczną listę** podpowiedzi bez sekcji „Moje” i „Katalog Kitchen”. Dostępne min. 2 znaki dla RPC (250 ms debounce, stale guard). Każdy wiersz pokazuje rodzaj, nie źródło; brak duplicate names w podpowiedziach.
- Lokalnie istniejący produkt daje lokalny ID. Wybór globalnej definicji używa `h74_adopt_shared_product` i otrzymuje **wyłącznie ID właściciela**; RLS, opakowania, quantity, recipe snapshot nigdy nie są współdzielone.
- Dla wszystkich nowych owner produktów (Inventory, Shopping, Recipe, importy) back-endowy trigger `private.h74_auto_index_product()` zakłada/odnajduje shared catalog identity w *tej samej transakcji*, bez kliknięcia/opt-in; klient **nigdy nie robi direct INSERT** do shared catalog.
- Historyczne owner produkty są jednorazowo indeksowane przez incremental H7.4C1 SQL, po czytelnym readonly preview nazw. Brak zmian w starych UUID i w FK Inventory, Shopping, Recipe.
- Zmiana nazwy/roli właściciela automatycznie tworzy/kojarzy aktualną globalną definicję; definicje wykorzystane przez innych nie są usuwane. Deduplikacja `(resource_role, normalized_name)` i no-op ON CONFLICT chronią przed wyścigiem.
- Nie ma `SharedCatalogVisibilityChoice` ani `publishAfterSuccessfulSave` / `publishToSharedCatalog`. Użytkownicy nie wprowadzają PII w nazwach produktów, ponieważ nazwy są wspólne.
- Przyprawy są presence-only, produkty domowe poza składnikami przepisów; lokalne default_unit/packaging nie są nadpisywane przez adoption.
- `scripts/test-h7-4c-shared-catalog.mjs` zapewnia source/parser + mocked read/adopt; GitHub QA & Deploy i realne A/B testy potrzebne do CLOSED.
- Nie-atomowe okno pomiędzy utworzeniem właścicielskiego produktu i zapisem zapasu/przepisu może pozostawić nieużywaną definicję w katalogu w razie błędu biznesowego zapisu; do ewentualnego oddzielnego przebudowania w przyszłości.
