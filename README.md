# Kitchen — Home Hub

Prywatna aplikacja mobilna PWA (React / TypeScript / Vite / Supabase) na GitHub Pages pod `/kitchen/`. Baza produkcyjna w zweryfikowanym prechecku 2026-11-16 miała jednego właściciela. Kandydat źródłowy H7.1 przygotowuje obsługę wielu niezależnych użytkowników; **nie ma publicznej rejestracji ani potwierdzonej migracji SQL**.

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

- Autorytet danych Supabase. Produkcja przed H7.1 SQL: `is_kitchen_owner()` i owner-only RLS. Kandydat frontendu H7.1: `MembershipGate` wywołuje `kitchen_my_access()` po serwerowej migracji, z zachowaniem izolacji `owner_id = auth.uid()`. **Nie wdrażać niezgodnej pary frontend/SQL.** Nie używaj service-role w przeglądarce.
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

## Stan wydania

H6.4 został zaakceptowany przez właściciela jako PASS/CLOSED; końcowy read-only SQL H64_17 przeszedł. Po tym zaakceptowano przygotowanie H6.4.4D (zrobione zadanie ma być widoczne pod rzeczywistą datą); jego odrębny final GitHub/iPhone QA nie został jeszcze w rozmowie potwierdzony. H6.5 porządkuje dokumentację i pozostaje SOURCE CANDIDATE. **H7.0 pełny produkcyjny read-only precheck A–H PASS; H7.1A źródła przygotowane.** Użytkownik raportuje GitHub Deploy PASS, ale brak potwierdzonego H7.1 SQL i testów staging A/B. **Najbliższy etap to H7.1B — audyt legacy RPC i poprawa migracji**, potem H7.1C produkcyjne wdrożenie. Aktualny stan: `OUTSIDE_REPO/QA_CURRENT.md` i `ROADMAP.md`.

## H7.1 membership foundation (candidate, not production-deployed)

Source branch includes `MembershipGate` to support isolated active accounts after a controlled Supabase SQL cutover. **Do not deploy this frontend before H7.1 migration and live/staging security checks pass.** No public signup or invitation flow has been added. Operational staging checklist: `OUTSIDE_REPO/H7_1_IMPLEMENTATION_AND_DEPLOYMENT.md` in the full release package.


### H7.1B — security corrective candidate (2026-11-16)

Historical `h3_archive_cleaning_task` is no longer called from the browser; the legacy `h4_complete_cleaning_task` remains an internal dependency of current H6.4 but loses direct browser EXECUTE in the H7.1 SQL candidate. No client onboarding/signup was added. **The candidate SQL is not deployed.** Consult external `OUTSIDE_REPO/H7_1B_RUNBOOK.md` before attempting SQL or multi-user testing; stage/restore, A/B/anon and Storage QA are mandatory.
