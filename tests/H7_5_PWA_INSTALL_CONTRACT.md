# H7.5 — PWA instalacja/aktualizacja, kontrakt 2026-11-17

- Jeden PWA `vite-plugin-pwa`, `base=/kitchen/`, `start_url=/kitchen/`, `standalone`, ikony 180/192/512/maskable.
- Brak trzeciego kafelka na ekranie Dom. Dyskretna pomoc instalacji pod modułami.
- Android/Chromium: przycisk `Zainstaluj Kitchen` tylko gdy `beforeinstallprompt` jest dostępny; po zamknięciu/anulowaniu brak fałszywej gwarancji instalacji. iOS: natywne menu Udostępnij → Dodaj do ekranu początkowego, żadnego fikcyjnego API JS.
- W aktywnym `standalone` ukryj pomoc instalacji; nie udawaj, że otwarta karta web oznacza brak instalacji w systemie.
- Aktualizacja `prompt` zamiast `autoUpdate`; przycisk Aktualizuj wyłącznie na ekranie Dom, nie w edytorze Zapasów/Przepisów/Zakupów/Porządków. Nie przeładowuj formularzy automatycznie.
- Offline: sygnalizuj brak połączenia, ale brak cache'owania odpowiedzi Supabase/API, tokenów lub kolejek modyfikacji; zapisy wymagają połączenia. RuntimeCaching=[]; statyczny app-shell nadal może być precached. Voice/WASM pozostaje wyłączony z modelowego precache.
- Nie dotykać SQL, auth, RLS, zaproszeń ani danych biznesowych; test instalacji na realnym iOS/Android oraz GitHub QA/Deploy pozostaje obowiązkowy.
