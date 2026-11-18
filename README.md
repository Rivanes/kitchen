## H7.5.5 — uproszczone logowanie + aktualizacja PWA (SOURCE QA PASS, 2026-11-18)

Logowanie pokazuje markę Kitchen, pojedynczy tytuł, pola E-mail/Hasło i akcję Zaloguj się. Usunięto pomocnicze teksty powtarzające oczywisty kontekst; wygląd ograniczono do `login-layout`/`login-entry`, aby nie zmieniać MembershipGate i zaproszeń. W Home Hub komunikat o nowej wersji ma jedną linię „Dostępna aktualizacja” i przycisk „Aktualizuj”, nadal bez automatycznego przeładowania aplikacji. H7.5.5: `npm run check` PASS lokalnie; GitHub QA/Deploy i realne iPhone QA OPEN. Bez zmian SQL, Auth, RLS, Product i SW config.

---

## H7.5.4 — instalacja PWA pod modułami (PASS użytkownika, 2026-11-18)

Na ekranie Dom opcja `Zainstaluj Kitchen` znajduje się **pod kafelkami Jedzenie i Porządki**. W zwykłej karcie przeglądarki można otworzyć instrukcję iOS/Android bez wykrywania nazwy przeglądarki; natywny prompt pojawia się tylko, gdy urządzenie go udostępnia. W aplikacji uruchomionej standalone nie pokazujemy ani opcji instalacji, ani zbędnego statusu. Istniejący manifest/SW nadal obsługuje aktualizację na żądanie (bez przerywania edytora). W razie offline pojawia się informacja o braku połączenia; API/Auth nie są zapisywane w Cache API. Test: `npm run verify:project`.

**Stan bezpieczeństwa:** poprawiony H7.4C.1 POSTCHECK otrzymał od użytkownika wynik **7/7 PASS**. Nadal wymagane są niezależne testy negatywne A/B, RLS, RPC i Storage w H7.4D/H7.6. W H7.5.4 nie zmieniamy SQL.

---

## H7.4C.1 — jeden automatycznie rosnący katalog produktów (SQL LIVE 7/7 PASS)

**Status 2026-11-17:** H7.4B SQL LIVE PASS (PRE 10/10, POST 12/12); H7.4C.1 SQL migration wykonana, poprawiony POSTCHECK **7/7 PASS** (wyniki użytkownika), 21/21 istniejących produktów powiązanych. GitHub Deploy PASS zgłoszony przez użytkownika. Rzeczywiste negatywne testy API A/B, JWT, RLS i Storage pozostają OPEN (H7.4D/H7.6).

All Kitchen accounts use **one global name/role/suggested unit dictionary**. Creating or renaming an owner product automatically indexes a matching global definition via a restricted DB trigger, without a publication toggle. Existing owner names are indexed once by a separate corrective SQL migration. In Inventory/Shopping/Recipes there is **one alphabetically sorted autocomplete list** without „Moje / Katalog Kitchen” headings. Adopting a shared name still creates/uses a caller-owned Product ID through `h74_adopt_shared_product`. Private quantities, stock locations, packages and recipe snapshots are never shared.

**Nie ponawiać** H7.4B, H7.4C.1 ani `ALL_IN_ONE.sql` w istniejącej bazie. Baseline GitHub przed H7.5.5 to `db094eb0e14404c710de9eea2842b36a81ceb1b4`; bieżące instrukcje wdrożeniowe są w `OUTSIDE_REPO/H7_5_5_RUNBOOK.md` w paczce.

**Constraint:** Global catalog shares **product names**. Do not enter names containing personal data. The existing two-request product-creation/business-save flow can leave an unused catalog definition after a later business-save error; this limitation is documented and must not be mistaken for full atomicity across requests.

---


## H7.3B — Jednorazowy link + e-mail i hasło (test-only corrective)

Administrator generuje 24-godzinny link; osoba otwiera go, wpisuje e-mail, hasło oraz potwierdzenie hasła. Weryfikacja tokena i utworzenie konta przez `auth.admin.createUser` zachodzą tylko w `supabase/functions/kitchen-invites/index.ts` — brak publicznego `signUp`, brak SMTP w tej fazie. GitHub Pages musi dostać zmieniony formularz, a Supabase Edge Function musi zostać **osobno zaktualizowana przez Dashboard → Code → Deploy updates**. SQL H7.3 jest już wdrożony, nie uruchamiać go ponownie. Brak weryfikacji własności e-maila (`email_confirm: true`) jest świadomym **ryzykiem tylko dla środowiska testowego**. Szczegóły `OUTSIDE_REPO/H7_3_RUNBOOK.md`.

## H7.3D — panel zaproszeń wyłącznie pod `/admin` (korekta UI)

Panel `https://rivanes.github.io/kitchen/admin` (tylko admin) zarządza aktywnymi jednorazowymi zaproszeniami. **Brak wejścia do administracji na Home Hub**: zwykły ekran ma wyłącznie moduły Jedzenie i Porządki. Admin panel ma pojedynczy tytuł `Zaproszenia`, pojedynczą datę wygaśnięcia przy każdym linku, przyciski `Kopiuj` i `Usuń`. Starsze linki sprzed szyfrowania nie mają odzyskiwalnego adresu, ale można je bezpiecznie usunąć. Backend: istniejąca Edge Function `kitchen-invites` i nowe serwerowe RPC H7.3C z retencją `pg_cron`, AES-GCM w Edge Secret. Po udanej rejestracji lub unieważnieniu zaproszenie jest usuwane z DB; wygasłe zaproszenia sprząta Cron. Postcheck SQL H7.3C 8/8 PASS i sekret AES zapisany (wyniki użytkownika). Poprzednie ENOENT `OUTSIDE_REPO` i niezgodność TypeScript 7 naprawione w testach. Użytkownik zgłosił **Deploy PASS (2026-11-17)** i pokazał działający panel na iPhone; QA dla tego commita niezweryfikowane, a nowe zmiany H7.3D nie są jeszcze wdrożone. Potwierdzenie usuwania/replay/expiry oraz pełne E2E nadal OPEN. Migrację/instrukcje trzymaj poza repo w `OUTSIDE_REPO/H7_3_RUNBOOK.md`. Nie uruchamiaj ALL_IN_ONE na istniejącej bazie.

## Moduły

- **Dom:** wybór Jedzenie lub Porządki.
- **Jedzenie:** Start, Zapasy, Zakupy i Przepisy. Wspólne Product/Quantity/Measurement Unit/Shopping authorities.
- **Porządki:** Start (zadania do wykonania i Nadchodzące), Pomieszczenia (katalog definicji zadań i ich cykli), Harmonogram (plan oraz wykonania, native swipe po pojedynczych dniach).
- **Voice/AI:** kod/testy pozostają w repozytorium, ale funkcja jest zamrożona przez `KITCHEN_VOICE_ENABLED=false`.

## Rozwój

```bash
npm ci
npm run verify:project
npm run typecheck
npm run build
npm run dev
```

Pełny build jest wymagany w GitHub Actions, nawet jeżeli same testy źródłowe przeszły lokalnie. Dwa workflow: Kitchen QA i Deploy Kitchen to GitHub Pages dla tego samego commita.

## Architektura i bezpieczeństwo

- Autorytet danych Supabase. Obecny model po H7.1 SQL postcheck: `kitchen_members`, `is_kitchen_member()` i `MembershipGate` wywołujący `kitchen_my_access()`; izolacja `owner_id=auth.uid()` pozostaje obowiązkowa. Wymaga realnego QA A/B i Storage. **Nie uruchamiać migracji SQL ponownie.** Nie używaj service-role w przeglądarce.
- Cykle Porządków projektowane tylko po stronie serwera: `h64_list_cleaning_occurrences`. Jeden aktywny kursor; przyszłe prognozy mogą być niewykonalne; nie przeliczaj dat cykli w frontendzie. Po spóźnionym wykonaniu niecodzienny cykl przesuwa się od rzeczywistej daty.
- `cleaning_task_completions`: historia 7 dni z retencją `pg_cron`; zaległe zadania nie są usuwane. Cofanie ostatniego wykonania przez zaznaczony checkbox.
- Górny shell Porządków ma jeden tytuł dla zakładki, nie dubluj nagłówków. Harmonogram: 7 widocznych dat, natywne przewijanie/snap po 1 dniu, strzałki ±1 i jeden przycisk `Dzisiaj`.
- Food i Cleaning nie współdzielą reguł biznesowych; współdzielą tylko auth, prymitywy UI i infrastrukturalne helpery.

## Repozytorium

- `src/features/` — domeny i komponenty aplikacji
- `src/components/` — generyczny UI i Home Hub
- `scripts/verify-project.mjs` i `scripts/test-*.mjs` — aktywna bramka regresji
- `tests/` — kontrakty źródłowe, część celowo historyczna i oznaczona jako superseded
- `.github/workflows/` — QA i Deploy

## Dokumentacja poza repozytorium

W pełnej paczce projektu: `OUTSIDE_REPO/AGENTS.md`, `CONTINUE_IN_NEW_CHAT.md`, `ROADMAP.md`, `QA_CURRENT.md`, `DATA_MODEL.md`, `CHANGELOG.md` i `SQL/ALL_IN_ONE.sql`. **Nie przesyłaj `OUTSIDE_REPO` na GitHub.** ALL_IN_ONE to schemat do *nowych instalacji*, nie migracja bieżącej produkcji.

## Stan wydania (2026-11-17)

H6.4 główne funkcje zaakceptowane; H6.4.4D osobny final iPhone/CI QA niepotwierdzony. H6.5 cleanup formalnie OPEN. **H7.0 live precheck A–H PASS przed migracją. H7.1 SQL POSTCHECK PASS po migracji (dane użytkownika); GitHub Deploy PASS zgłoszony przez użytkownika.** W postchecku 1 aktywny admin, brak starej bramki, 0 stale RLS/RPC, H3/H4 direct denies, H64 allowed. Potwierdzone dwa realne konta i oddzielne UI, H7.2 SQL 6/6 PASS; nadal nie ma negatywnych testów API/Storage ani bieżącego commit SHA CI PASS. H7.1 nie jest CLOSED. Aktualne dowody: `OUTSIDE_REPO/QA_CURRENT.md` i `ROADMAP.md` w pełnej paczce.

## H7.1 — uwagi bezpieczeństwa

`MembershipGate` zastąpił `OwnerGate` w kodzie. Kontrola membership musi łączyć się z RLS po właścicielu; admin nie dziedziczy dostępu do prywatnych danych innych kont. `h3_archive_cleaning_task` i `h4_complete_cleaning_task` nie mają bezpośrednich grantów dla klienta zgodnie z wynikiem postcheck; definicja H4 pozostaje konieczna wewnętrznie dla H64. **Nie używaj `SQL/ALL_IN_ONE.sql` na istniejącej bazie i nie ponawiaj wykonanej migracji H7.1.** Publiczny signup pozostaje wyłączony; system zaproszeń H7.3C jest wdrażany, ale wymaga CI i E2E PASS. Negatywne RLS/RPC/Storage dwóch kont pozostają otwarte.

## H7.1C — bezpieczeństwo dwóch kont (STAGING ONLY)

`node scripts/test-h7-1c-api-isolation.mjs --self-test` uruchamia wyłącznie lokalny test zabezpieczeń skryptu (bez sieci). Realne testy wymagają dwóch sesji testowych i odrębnego staging; nie uruchamiać na produkcyjnym Supabase. Zasady i konfiguracja w `OUTSIDE_REPO/H7_1C_RUNBOOK.md` w pełnej paczce projektu. Tester nie tworzy użytkowników ani nie wymaga klucza service-role. Pełny QA A/B i Storage pozostaje OPEN.

## H7.2 — Account Initialization (bez nowego backendu)

Seed pięciu lokalizacji nowego aktywnego konta jest już produkcyjną częścią H7.1 i został potwierdzony przez użytkownika na drugim koncie. W H7.2 **nie dodajemy** drugiego inicjalizatora ani publicznej rejestracji. Kontrakt offline: `node scripts/test-h7-2-account-initialization.mjs`; test SQL i read-only postcheck w paczce `OUTSIDE_REPO/QA/` i `OUTSIDE_REPO/SQL/H7_MULTI_USER/`. Testy negatywne A/B/RPC/Storage pozostają OPEN (H7.1C).

## CI H7.3C — granica REPO / OUTSIDE_REPO (2026-11-17)

`node scripts/verify-project.mjs` uruchamia testy **wyłącznie na zawartości REPO**. `scripts/test-h7-3-invites.mjs` oraz `scripts/test-h7-3c-admin.mjs` czytają wyłącznie pliki REPO i używają wspólnego parsera `scripts/assert-ts-syntax.mjs` opartego o przypięte `@babel/parser` z `npm ci`; żadna migracja z `../OUTSIDE_REPO` nie może być wymagana przez GitHub Actions. Osobne kontrakty SQL uruchamiamy w pełnej paczce: `OUTSIDE_REPO/QA/H7_3_SQL_CONTRACT_CHECK.mjs` i `H7_3C_SQL_CONTRACT_CHECK.mjs`. Po GitHub Commit & Push sprawdź QA i Deploy Pages; ostatni pokazany GitHub build FAIL przez `TypeError` przy `ts.JsxEmit.ReactJSX` — TypeScript 7.0.2 nie udostępnia starego JS Compiler API. Korekta jest kandydatem do weryfikacji GitHub; nie deklaruj PASS bez nowego workflow. Właściwe sprawdzanie typów wykonuje osobny krok `npm run typecheck`.
