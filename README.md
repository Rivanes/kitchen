## H7.3 — Invite-only Registration (candidate)

W repo jest nowy frontend odbiorcy zaproszeń, minimalny przycisk dla administratora i Supabase Edge Function `supabase/functions/kitchen-invites/index.ts`. Funkcje serwerowe wymagają oddzielnego deploy Edge/sekretów/SMTP i migracji H7.3. **Samo wdrożenie GitHub Pages nie uruchomi zaproszeń.** Publiczny `signUp` pozostaje OFF, `service_role` nigdy w przeglądarce. Instrukcja i etapowy QA w `OUTSIDE_REPO/H7_3_RUNBOOK.md`.

# Kitchen — Home Hub

Prywatna aplikacja mobilna PWA (React / TypeScript / Vite / Supabase) na GitHub Pages pod `/kitchen/`. Precheck z 2026-11-16 wykazał jeden stary owner PRZED migracją. Użytkownik następnie przekazał **H7.1 SQL POSTCHECK PASS** (nowy rejestr `kitchen_members`, 1 admin, stary gate usunięty) i **GitHub Deploy PASS**; użytkownik potwierdził już drugie konto z 5 lokalizacjami i oddzielny UI, natomiast negatywna izolacja RLS/RPC/Storage nadal czeka na testy. Brak publicznej rejestracji i jednorazowych zaproszeń.

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

## Stan wydania (2026-11-16)

H6.4 główne funkcje zaakceptowane; H6.4.4D osobny final iPhone/CI QA niepotwierdzony. H6.5 cleanup formalnie OPEN. **H7.0 live precheck A–H PASS przed migracją. H7.1 SQL POSTCHECK PASS po migracji (dane użytkownika); GitHub Deploy PASS zgłoszony przez użytkownika.** W postchecku 1 aktywny admin, brak starej bramki, 0 stale RLS/RPC, H3/H4 direct denies, H64 allowed. Nie ma jeszcze potwierdzonego testu dwóch realnych kont ani Storage API, staging restore, urządzenia i bieżącego commit SHA. H7.1 nie jest CLOSED. Aktualne dowody: `OUTSIDE_REPO/QA_CURRENT.md` i `ROADMAP.md` w pełnej paczce.

## H7.1 — uwagi bezpieczeństwa

`MembershipGate` zastąpił `OwnerGate` w kodzie. Kontrola membership musi łączyć się z RLS po właścicielu; admin nie dziedziczy dostępu do prywatnych danych innych kont. `h3_archive_cleaning_task` i `h4_complete_cleaning_task` nie mają bezpośrednich grantów dla klienta zgodnie z wynikiem postcheck; definicja H4 pozostaje konieczna wewnętrznie dla H64. **Nie używaj `SQL/ALL_IN_ONE.sql` na istniejącej bazie i nie ponawiaj wykonanej migracji H7.1.** Brak publicznego signup i jednorazowych zaproszeń (H7.3). QA dwóch kont jest następnym warunkiem zamknięcia.

## H7.1C — bezpieczeństwo dwóch kont (STAGING ONLY)

`node scripts/test-h7-1c-api-isolation.mjs --self-test` uruchamia wyłącznie lokalny test zabezpieczeń skryptu (bez sieci). Realne testy wymagają dwóch sesji testowych i odrębnego staging; nie uruchamiać na produkcyjnym Supabase. Zasady i konfiguracja w `OUTSIDE_REPO/H7_1C_RUNBOOK.md` w pełnej paczce projektu. Tester nie tworzy użytkowników ani nie wymaga klucza service-role. Pełny QA A/B i Storage pozostaje OPEN.

## H7.2 — Account Initialization (bez nowego backendu)

Seed pięciu lokalizacji nowego aktywnego konta jest już produkcyjną częścią H7.1 i został potwierdzony przez użytkownika na drugim koncie. W H7.2 **nie dodajemy** drugiego inicjalizatora ani publicznej rejestracji. Kontrakt offline: `node scripts/test-h7-2-account-initialization.mjs`; test SQL i read-only postcheck w paczce `OUTSIDE_REPO/QA/` i `OUTSIDE_REPO/SQL/H7_MULTI_USER/`. Testy negatywne A/B/RPC/Storage pozostają OPEN (H7.1C).
