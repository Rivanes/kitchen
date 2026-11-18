# H7.5.5 — logowanie i komunikat aktualizacji (2026-11-18)

## Interfejs

- Ekran logowania: jeden znak marki Kitchen, jeden nagłówek „Witaj ponownie”, dwa pola E-mail/Hasło i jeden główny przycisk „Zaloguj się”.
- Brak marketingowego opisu funkcji, etykiety „Prywatny dostęp”, ikonki kłódki i komunikatu o zaproszeniu powtarzającego istniejący model dostępu.
- Układ jest estetyczny, czytelny na telefonie i przy klawiaturze; kontrolki minimum 48 px, tekst w inputach minimum 16 px, focus i błędy pozostają widoczne.
- Nowe style są ograniczone do `login-layout`/`login-entry`; nie zmieniają `InvitationPage`, `MembershipGate` ani innych istniejących `login-card`.
- Zachować Supabase `signInWithPassword`, walidację, loading, disable, `autoComplete`, błędy i `configurationMissing`; publiczny signup pozostaje zakazany.
- Komunikat nowej wersji PWA na Dom zawiera jedną linię „Dostępna aktualizacja” i przycisk „Aktualizuj”. Brak ostrzeżenia o edycji formularza, bo aktualizacja oferowana jest na bezpiecznym Dom.
- Samo uaktualnienie SW pozostaje świadomą akcją `updateServiceWorker(true)`. Brak automatycznego odświeżania.

## Testy i bramki

- `scripts/test-h7-5-5-login-ux.mjs`: kontrakt obecności formularza, brak powtórzeń, negatywne fixture, brak sign-up i nieruszone granice invitation/member.
- `npm run check` (verify:project, TypeScript 7, Vite build).
- GitHub Kitchen QA i Deploy na jednym SHA + realny iPhone Safari/inny browser/PWA standalone: focus, klawiatura, poprawne i błędne logowanie, komunikat update wyłącznie na Dom.
- H7.5.4 jest PASS potwierdzony przez użytkownika. H7.5.6 animacja startu nie jest częścią tego wydania; SQL/Auth/RLS/produkty/SW config bez zmian.
