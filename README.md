# PinkTower

Spokojne środowisko edukacyjne dla dzieci i nauczycieli: Vanilla JavaScript, Vite, lekcje, Pracownia, Robot, Tablica badawcza i portfolio.

## Dane centralne i uruchomienie

Frontend korzysta z `/api`, backend z TypeScript/Vercel Functions, PostgreSQL (Supabase) i prywatnego Supabase Storage. Dane ucznia są centralne. `studentStorage` udostępnia widokom projekcję ostatniej odpowiedzi serwera w pamięci; mutacje są asynchroniczne. Nie ma lokalnego fallbacku zapisu.

**[Konfiguracja, endpointy, model danych, migracja i checklista wdrożenia](docs/backend.md)** opisują wymagane zmienne środowiskowe oraz granice lokalnej weryfikacji. Sam build nie konfiguruje bazy ani bucketu.

1. Zainstaluj zależności: `npm install` (Node 24).
2. Skopiuj `.env.example` do `.env` i uzupełnij sekrety backendu.
3. Wygeneruj hash własnego PIN-u: `npm run hash-pin -- TWÓJ_PIN`.
4. Wykonaj `npm run db:migrate` oraz `npm run storage:setup`.
5. Uruchom `npm run dev` (Vite + lokalne API).

Nie umieszczaj sekretów w zmiennych `VITE_*`. Nowa baza jest pusta. Nauczyciel dodaje uczniów lub świadomie importuje dane istniejącej instalacji. Uczeń nie wybiera samodzielnie innego profilu; urządzenie przygotowuje nauczyciel.

Stare zapisy `abecadlo-state-v1/v2/v3` i obrazy IndexedDB są czytane wyłącznie przez narzędzie migracji nauczyciela. Import wymaga podglądu, zachowuje lokalne kopie i można go wznowić po przerwanym uploadzie. Wykonaj go na dotychczasowej domenie i komputerze zawierającym dane, zanim zmienisz adres instalacji.

## Struktura

- `src/data`, `src/components`, `src/views`, `src/lessons`, `src/modules`, `src/styles` – istniejący interfejs i aktywności.
- `src/storage` – klient API, obrazy i odczyt kopii legacy do migracji.
- `server` – autoryzacja, walidacja, serwisy, repozytorium Drizzle, migracje SQL i prywatne pliki.
- `api/[...route].ts` – wejście Vercel Functions.
- `tests/backend`, `tests/storage`, `tests/ui` – domena/HTTP, transport i scenariusze przeglądarki.

## Model produktu

Ścieżka lekcji jest sekwencyjna. Powtórka nie cofa ukończonej lekcji. Typewriting ma osobny `toolProgress`; dodatkowe zadania nie zmieniają aktualnej lekcji.

- `automatic` – rezultat sprawdza aplikacja.
- `self-check` – dziecko korzysta z kontroli błędu lub wzoru.
- `teacher-review` – otwarta praca trafia do pedagogicznego obejrzenia.

Statusy prac to `draft`, `waiting-review`, `completed`, `returned`. Kolejka „Do obejrzenia” zawiera wyłącznie prace otwarte, bez ocen i porównywania dzieci. Autosave wysyła lekkie dane do API po debounce; błąd zapisu wymaga jawnego ponowienia i nie jest ukrywany jako zapis lokalny.

## Weryfikacja

```bash
npm run typecheck:server
npm run test:backend
npm run test:storage
npm run test:robot
node --test tests/lessons/*.test.mjs tests/research/*.test.mjs tests/speech/*.test.mjs
npm run test:ui
npm run build
node --test tests/security/*.test.mjs
git diff --check
```

Testy UI uruchamiają jawny backend testowy w pamięci. Produkcyjne API nigdy go nie używa. Dla testów bez screenshotów ustaw `PINKTOWER_NO_SCREENSHOTS=1`. Rzeczywiste PostgreSQL, uprawnienia Supabase, upload i Vercel wymagają osobnej weryfikacji z credentials.

## Decyzje produktowe

- Bez otwartego chatu AI dla klasy 1; gotowe pytania i sprawdzanie informacji.
- Nie zapisujemy dużych PNG/base64 w localStorage. Obrazy trafiają do prywatnego Storage, a przyszłe Studio powinno używać lekkich danych rysowania.
- Zasoby lekcji są lokalnymi assetami, ale zapis centralny wymaga sieci. PWA/cache i ewentualny bezpieczny tryb offline to osobny przyszły etap.
- Eksport nauczyciela wykorzystuje JSON i druk; PDF pozostaje przyszłym rozszerzeniem.
