# Centralne dane PinkTower — wdrożenie i migracja

## Faktyczny model poprzedniej wersji

Przed zmianą aplikacja używała `abecadlo-state-v3`, `schemaVersion: 3`, z odczytem poprzednich kluczy `abecadlo-state-v2` i `abecadlo-state-v1`. Rekordy `students[id]` zawierały `profile` (imię, forma powitania, avatar i `avatarConfig`), `className`, daty, `progress` (mapa numeru lekcji na status), niezależny `toolProgress` i `works`. Przykładowe trwałe ID to `zosia`, `antek`, `lena`; nowe profile miały identyfikatory niezależne od imienia.

`toolProgress` zawierał `unlockedTools`, `typingResults` oraz `robot[challengeId]`: program, liczbę uruchomień, ukończenie i ślady tras. Prace zachowywały `id`, `studentId`, `lessonId`, `assignmentId`, `completionType`, status, daty i `data`. Otwarte prace korzystały ze statusów `draft`, `returned`, `waiting-review`, `completed`. Tablica badawcza przechowywała lekkie `entries[itemId].imageId`, źródła, rozmiary zdjęć, odpowiedzi i stan próby. Własna trasa Robota przechowywała planszę, program i tryb edytora w JSON. Zadania były w głównej tablicy `assignments` z `studentIds` / `wholeClass`. Ustawienia głosu były w `teacher.speechSettings`.

IndexedDB `pinktower-images`, wersja 1, miało store `images` (`keyPath: id`) z rekordami `{ id, studentId, workId, blob }`. Etap ćwiczenia był stanem bieżącego widoku; lokalny progress nie zawierał historii podejść. Nie tworzono historii podejść wstecz na podstawie zgadywanych danych.

## Architektura po zmianie

`Vite + Vanilla JS → src/storage/studentStorage.js → /api/* → server/services.ts → server/db/repository.ts → Supabase PostgreSQL`.

Pliki mają osobną ścieżkę: `imageStorage → autoryzacja API → signed upload → Supabase Storage → finalize`.

`studentStorage` jest teraz klientem API i odczytywaną przez widoki projekcją ostatniej odpowiedzi serwera w pamięci. Nie zapisuje danych aplikacji w przeglądarce. Mutacje są kolejowane, odpowiedzi zawierają aktualne dane dostępne dla sesji, a numer rewizji chroni przed zastąpieniem nowszych danych spóźnioną odpowiedzią. Nie istnieje automatyczny fallback do localStorage. Po błędzie zmiany oczekują w pamięci bieżącej karty na jawne „Spróbuj ponownie”. To nie jest tryb offline: należy poczekać na potwierdzenie zapisu przed zamknięciem aplikacji. Małe końcowe zapisy korzystają z `fetch(..., keepalive: true)`; debounce jest opróżniany przy wyjściu. Przy błędzie lub dużym zapisie przeglądarka ostrzega przed opuszczeniem strony.

Routing czeka na zapis opuszczanego widoku. Wewnętrzna nawigacja od razu pokazuje ostatnią potwierdzoną projekcję serwera i odświeża ją w tle, dzięki czemu pierwsze naciśnięcia klawiszy ćwiczenia nie giną podczas dodatkowego GET. Wejście/reload i zewnętrzna zmiana hasha pobierają sesję przed pokazaniem widoku. Spóźnione callbacki poprzedniego widoku nie mogą zmienić nowej nawigacji. Powrót do okna odświeża dane, ale nie zastępuje niezmienionego DOM i nie niszczy aktywnego edytora. Listy nauczyciela można odświeżać nawigacją / akcją „Odśwież” bez reloadu całej strony.

`legacyStorage.js` tylko odczytuje stare klucze i IndexedDB oraz zapisuje osobne potwierdzenie ukończenia importu. Nie inicjalizuje przykładowych profili nad starą kopią. Kod dawnego lokalnego adaptera jest zachowany wyłącznie w `tests/support` jako fixture dla testów zgodności; nie jest importowany przez aplikację ani produkcyjne API.

## Tabele i spójność

Schemat Drizzle: `server/db/schema.ts`. Migracje: `server/db/migrations`.

| Tabela | Przeznaczenie |
| --- | --- |
| `students` | Trwałe tekstowe ID (również stare), imię, klasa, avatar, daty i pozostałe metadane profilu |
| `lesson_progress` | Główny status lekcji, daty rozpoczęcia i ukończenia |
| `lesson_attempts` | Nowe rozpoczęcia i powtórki, niezależne od statusu głównego |
| `tool_progress` | Kontrolowane dane JSON narzędzi dla ucznia |
| `works` | Prace i istniejący cykl teacher-review; dane specyficzne dla narzędzia w JSON |
| `work_assets` | Właściciel, praca, ścieżka, MIME, rozmiar, hash, źródło i stan uploadu; bez obrazów w DB |
| `assignments` | Zadania, narzędzie, opcjonalna klasa, polecenie i metadane |
| `assignment_targets` | Powiązania z wybranymi uczniami; stan wykonania wynika z powiązanej pracy |
| `migration_imports` | Hash importu, podsumowanie, manifest plików i faza realizacji |
| `app_settings` | Głos, rewizja danych, unieważnione sesje i kolejka sprzątania plików |
| `login_attempts` | Ograniczenie prób PIN-u; zamiast jawnego IP przechowywany jest jego skrót |

FK usuwają rekordy zależne ucznia. Migracja SQL włącza RLS i odbiera rolom `anon` oraz `authenticated` dostęp do tabel aplikacji. Frontend nie otrzymuje połączenia DB ani klucza service-role. Połączenie serwerowe musi używać uprawnionego użytkownika bazy. To jest jedna instalacja pilotażowa z jednym uprawnieniem nauczyciela, nie system wielu niezależnych szkół.

Repozytorium używa transakcji i blokady advisory dla tej instalacji, aby równoległe operacje nie nadpisywały stanu. Odczyty nie przepisują tabel; zapis obejmuje zmienione rekordy, a postępy importowane są partiami. Driver `postgres` ma `prepare: false`, co pasuje do Supabase transaction pooler. Dobierz region Functions blisko bazy.

`completed` nigdy nie jest cofane podczas powtórki. Powtórka tworzy/kończy attempt; już rozpoczęta sesja może wznowić istniejące podejście. Ukończenie otwiera następną zaimplementowaną lekcję. Niezaimplementowane i zablokowane lekcje nie mogą być kończone dowolnym patchem. Wyniki Typewritingu i Robota pozostają niezależne. Dla Robota serwer symuluje program; własne plansze w zadaniach pobiera z autoryzowanej pracy, nie ufa planszy wysłanej przez ucznia.

## API

Wszystkie ścieżki są pod `/api`. Odczyt sesji zwraca projekcję danych do istniejących widoków; mutacje przyjmują konkretne DTO, nie dowolny stan aplikacji.

| Metoda i ścieżka | Operacja / uprawnienie |
| --- | --- |
| `GET health` | Sprawdzenie backendu i połączenia z DB |
| `POST auth/login` | Weryfikacja PIN-u i sesja nauczyciela |
| `POST auth/logout` | Unieważnienie sesji i usunięcie cookie |
| `GET session` | Bieżąca rola i tylko dostępne dla niej dane |
| `POST session/student` | Wybór ucznia przez nauczyciela i rotacja do sesji ucznia |
| `GET students`, `POST students` | Lista / nowy profil — nauczyciel |
| `GET students/:id` | Własny profil lub dostęp nauczyciela |
| `PATCH students/:id`, `POST students/:id/archive`, `DELETE students/:id` | Administracja — nauczyciel; usunięcie wymaga potwierdzenia |
| `POST students/:id/unlock` | Wyjątkowe odblokowanie lekcji — nauczyciel |
| `GET progress`, `POST progress` | Start, complete, repeat, finish-repeat; uczeń ustalany z cookie |
| `GET tools`, `POST tools` | Odczyt / operacje typing, robot-program i robot-attempt |
| `GET works`, `GET works/:id`, `POST works`, `PATCH works/:id` | Własne prace; nauczyciel może odczytać wszystkie |
| `POST works/:id/review` | Decyzja `completed` lub `returned` — tylko nauczyciel |
| `GET assignments`, `GET assignments/:id`, `POST assignments` | Przydzielone zadania / tworzenie przez nauczyciela |
| `POST assets`, `POST assets/:id/finalize`, `GET assets/:id`, `DELETE assets/:id` | Autoryzowany upload, weryfikacja, odczyt i usunięcie |
| `PUT settings/speech` | Ustawienia głosu — nauczyciel |
| `POST migration/preview`, `migration/import`, `migration/finalize` | Import — tylko nauczyciel |
| `GET maintenance` | Codzienne sprzątanie; wymaga osobnego sekretu cron |
| `GET / POST / DELETE teacher/test-data` | Status zestawów / utworzenie / bezpieczne sprzątanie — wyłącznie nauczyciel |

Odpowiedzi mają `value` i opcjonalne `snapshot`; błędy mają status HTTP i krótki `error`, bez stosu i szczegółów połączenia DB. Przykładowa poprawna odpowiedź health: `{"value":{"ok":true}}`.

## Sesje i pliki

PIN jest sprawdzany wyłącznie na serwerze za pomocą scrypt (losowa sól, porównanie stałoczasowe). `TEACHER_PIN_HASH` i `SESSION_SECRET` są sekretami serwera. Podpisany HS256 JWT znajduje się w `pinktower_session`, z `HttpOnly`, `SameSite=Strict`, `Secure` na produkcji. Token nauczyciela ma ważność 2 h, ucznia 12 h. Logout i przejście do ucznia unieważniają poprzedni token. Błędne próby logowania są ograniczane: osiem prób w oknie 15 minut na skrót IP.

Nauczyciel wybiera „Uczeń” / „Przygotuj urządzenie”, loguje się i wybiera profil. W sesji dziecka API nie udostępnia listy klasy ani portfolio innych dzieci. Zmiana ucznia przez avatar wymaga ponownego logowania nauczyciela. Modyfikacja localStorage nie zmienia sesji serwera. Mutacje sprawdzają Origin; przy własnej domenie można ustawić `APP_ORIGIN` na jej dokładny adres HTTPS. Nie ustawiaj domeny produkcyjnej jako APP_ORIGIN dla osobnych preview, jeśli mają być używane do testowania.

Bucket `pinktower-assets` jest prywatny. Obraz trafia bezpośrednio z przeglądarki do Storage, a nie przez body Vercel Function. Backend zapisuje metadane dopiero w autoryzowanym flow i potwierdza MIME (sygnatura pliku), rozmiar i SHA-256 przed stanem `ready`. Limit pliku to 10 MB; PNG/JPEG/WebP/GIF, bez SVG. Adres odczytu jest ważny 300 sekund. Supabase signed upload ma ważność narzuconą przez usługę (obecnie 2 h); nie udajemy krótszego TTL. Upload ma `upsert: false`, więc stary token nie nadpisze potwierdzonego pliku. [Dokumentacja signed upload](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl).

Usunięcie ucznia usuwa pliki przed usunięciem rekordów; błąd Storage pozostawia profil do ponowienia. Ścieżki usuniętych plików trafiają dodatkowo do prywatnej kolejki sprzątania na minimum 3 h: podpisany wcześniej upload mógł jeszcze znajdować się w locie. Codzienny cron `/api/maintenance` usuwa ewentualne opóźnione uploady i porządkuje wygasłe wpisy. Ustaw `CRON_SECRET`, aby cron działał. Nie ma publicznego dostępu do bucketu ani automatycznego publikowania źródeł zdjęć.

## Bezpieczna migracja istniejących komputerów

1. Wdróż na **dotychczasowy produkcyjny origin**. Preview ani localhost nie widzą jego danych.
2. Zaloguj się jako nauczyciel. W Klasie pojawi się „Znaleziono dane zapisane na tym komputerze.”, jeśli istnieją stare klucze. Samo wykrycie niczego nie importuje.
3. Otwórz przenoszenie, pobierz backup JSON. Zawiera wszystkie znalezione surowe kopie v1/v2/v3, bez Blobów. Zdjęcia pozostają w IndexedDB — nie czyść danych przeglądarki.
4. Wybierz lokalną kopię (domyślnie najnowszy klucz) i „Sprawdź dane”. Zobaczysz liczby uczniów, postępów, prac, zadań i plików oraz błędy/ostrzeżenia. Pliki innych kopii są zgłaszane i pozostają lokalnie.
5. Dopiero „Przenieś dane do PinkTower” uruchamia import. JSON przechodzi walidację i jest przenoszony transakcyjnie. Dane źródłowe nie są zmieniane.
6. Zdjęcia są przesyłane pojedynczo. Każdy plik ma manifest z właścicielem, pracą, MIME, rozmiarem i SHA-256. Zachowujemy `legacyImageId` jako ID nowego assetu, więc mapowanie jest 1:1 i referencje w pracach pozostają poprawne.
7. Import ma stabilne ID SHA-256 kanonicznego źródła i manifestu. Powtórzenie wznawia pliki; nie nakłada ponownie JSON na późniejsze zmiany w bazie. Potwierdzony upload bez odebranej odpowiedzi zostaje rozpoznany przy ponowieniu po hashu pliku.
8. `finalize` odmawia zakończenia, jeśli brakuje choć jednego pliku. Po potwierdzeniu backendu zapisuje się jedynie lokalny znacznik `pinktower-migration-completed`. Stare klucze i IndexedDB nadal istnieją.
9. Powtórz na kolejnych komputerach. Te same ID nie tworzą duplikatów. Postęp lekcji scala się monotonicznie (ukończenie nie znika), odblokowane narzędzia są łączone. Różne profile, wersje prac, te same wyniki narzędzi o różnej zawartości czy różne pliki o jednym ID są zgłaszane jako konflikty. Import z konfliktem nie nadpisuje bazy. Zachowaj backupy i rozstrzygnij konflikt przed kolejną próbą; nie ma automatycznego „ostatni zapis wygrywa”.

Nie ma operacji `localStorage.clear()` w produkcyjnej aplikacji, automatycznej migracji ani kasowania źródła. Bez połączenia nowa aplikacja pokazuje błąd; nie tworzy pustego lokalnego stanu. Brakujące/nieprawidłowe rekordy są zgłaszane, nie pomijane po cichu. Dat, których stary model nie przechowywał, nie można odzyskać: brak daty utworzenia profilu jest sygnalizowany, a znacznik techniczny nie jest przedstawiany jako rzeczywista data historyczna.

## Pierwsze wdrożenie

Wymagany Node 24 (środowisko użyte do testów). Skopiuj `.env.example` do prywatnego `.env` do pracy lokalnej; plik `.env` jest ignorowany przez Git. Wszystkie sekrety są bez prefiksu `VITE_`.

| Zmienna | Wartość do ustawienia |
| --- | --- |
| `DATABASE_URL` | Połączenie PostgreSQL z Supabase; dla serverless zalecany transaction pooler |
| `SUPABASE_URL` | URL projektu Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Serwerowy klucz service-role, nigdy klucz przeglądarki |
| `SESSION_SECRET` | Osobny losowy sekret o długości minimum 32 znaków |
| `TEACHER_PIN_HASH` | Wynik lokalnego `npm run hash-pin -- 1234`; skrypt wypisuje hash, nie PIN |
| `CRON_SECRET` | Osobny losowy sekret do sprzątania plików |
| `SUPABASE_STORAGE_BUCKET` | Opcjonalnie; domyślnie `pinktower-assets` |
| `APP_ORIGIN` | Opcjonalnie; kanoniczny origin, np. dokładny produkcyjny URL HTTPS |

Nie uruchamiaj migracji na produkcyjnej bazie w ramach testów. Używaj osobnego projektu Supabase dla środowiska testowego/preview. Nie ustawiono ani nie wymyślono credentials w repo.

```sh
npm install
npm run db:generate      # po zmianie schematu; wygenerowane migracje są już w repo
npm run db:migrate       # świadoma, osobna operacja na wskazanej bazie
npm run storage:setup    # idempotentne utworzenie/ustawienie prywatnego bucketu
npm run dev             # Vite i API na 127.0.0.1:3001, wymaga .env
```

`db:migrate` i `storage:setup` nie uruchamiają się podczas builda Vercela. Generator schematu nie zmienia bazy. Bucket setup nie usuwa plików; wymusza prywatność, typy i limit rozmiaru. [Supabase PostgreSQL + Drizzle](https://orm.drizzle.team/docs/get-started-postgresql), [Vercel Functions z TypeScript](https://vercel.com/docs/functions/runtimes/node-js).

Checklist:

- [ ] Utwórz projekt Supabase i wybierz region.
- [ ] Ustaw prywatny `.env`, wygeneruj hash PIN-u i losowe sekrety.
- [ ] Ustaw serwerowe zmienne w odpowiednim środowisku Vercela; oddziel preview od produkcji.
- [ ] Wykonaj `npm run db:migrate` na właściwej bazie i `npm run storage:setup`.
- [ ] Wdróż aplikację na wcześniejszy produkcyjny adres; sprawdź `/api/health`.
- [ ] Sprawdź logowanie nauczyciela i wykrycie lokalnej kopii na starym komputerze.
- [ ] Pobierz backup; przeczytaj podsumowanie i ewentualne konflikty.
- [ ] Zaimportuj dane i pliki; poczekaj na potwierdzenie wszystkich elementów.
- [ ] Sprawdź profile, ukończone lekcje, wyniki narzędzi, prace, zdjęcia i review w bazie/aplikacji.
- [ ] Przygotuj drugie urządzenie jako ten sam uczeń; sprawdź synchronizację.
- [ ] Przeprowadź import na pozostałych komputerach ze starymi danymi.
- [ ] Sprawdź działanie cron i ponowienie uploadu.
- [ ] Dopiero po weryfikacji zdecyduj o osobnym usunięciu starych lokalnych kopii. Aplikacja nie robi tego automatycznie.

## Testy i granice weryfikacji

`npm run test:backend`: rzeczywiste serwisy domenowe i HTTP/JWT, z wstrzykniętym repozytorium oraz plikami testowymi. Sprawdza sesje, autoryzację, izolację uczniów, progress/attempts, review, usuwanie i migrację (powtórzenie, przerwanie uploadu, konflikty). Nie łączy się z produkcyjną bazą.

`npm run test:storage`: testy transportu/repository i zachowanych fixture legacy. `npm run test:robot` oraz testy w `tests/lessons`, `tests/research`, `tests/speech` sprawdzają istniejące mechanizmy. `npm run test:ui` uruchamia Vite i **jawny serwer testowy** z repozytorium w pamięci; ten serwer nie jest fallbackiem produkcyjnym i nie jest importowany przez `api/`. E2E obejmują dwa konteksty przeglądarki, import IndexedDB z awarią i wznowieniem, brak automatycznego importu, odporność na zmiany localStorage i retry autosave. Testy UI używają wspólnej warstwy HTTP, nie zapisują danych aplikacji do localStorage.

Po buildzie `node --test tests/security/*.test.mjs` sprawdza brak nazw sekretów i PIN-u pilotażu w bundlu przeglądarki. `npm run typecheck:server` sprawdza backend TypeScript. Ustaw `PINKTOWER_NO_SCREENSHOTS=1` dla testów bez screenshotów.

Bez credentials nie sprawdzono prawdziwego połączenia PostgreSQL, wykonania DDL w Supabase, konfiguracji uprawnień projektu, rzeczywistych signed uploads ani wdrożenia Vercela/cron. Po ich ustawieniu trzeba wykonać checklistę powyżej. Żaden test nie zastępuje potwierdzenia rzeczywistego importu na produkcyjnym origin.

## Test bazy danych w aplikacji

W panelu **Klasa → Test bazy danych** otwórz zwijaną sekcję. Status jest odczytywany z autoryzowanego API przez obecne repozytorium (w produkcji PostgreSQL). „Utwórz dane testowe” tworzy jednego ucznia, avatar, ukończoną pierwszą lekcję, osobny wynik narzędzia, pracę oraz zadanie skierowane tylko do tego ucznia. Dane widać w zwykłych widokach klasy, profilu i prac. Kolejne kliknięcie tworzy kolejny oznaczony zestaw; retry tej samej operacji nie tworzy duplikatu.

Metadane `isTestData` / `testRunId` znajdują się w istniejących JSONB, bez nowej migracji schematu. Prywatny `app_settings.testDataRuns` zawiera rejestr ID utworzonych przez serwer. Zwykłe tworzenie profilu i migrator nie dodają wpisów do tego rejestru. Sama nazwa, klasa TEST lub flaga w starej kopii nie kwalifikują danych do usunięcia. Nowe assets testowego ucznia otrzymują oznaczenie serwerowe.

„Usuń dane testowe” wymaga potwierdzenia w UI i DTO `confirmation: "delete-test-data"`, a serwer wymaga teacher session. Usuwa zarejestrowane profile wraz z ich progress, attempts, toolProgress, works, assets i zależnościami oraz zadania utworzone przez panel. Obce referencje do testowego zadania lub zmienione oznaczenia blokują operację przed usunięciem plików. Awaria Storage zachowuje rekordy do ponowienia. W rejestrze pozostaje techniczne potwierdzenie usunięcia dla idempotencji; bez kopii treści prac. Legacy localStorage i IndexedDB pozostają nietknięte.

Na komputerze A utwórz zestaw. Na B zaloguj nauczyciela i wybierz „Odśwież dane z serwera”. Po usunięciu zestawu na A ponów odświeżenie na B. Nie ma synchronizacji przez localStorage ani automatycznego realtime; każda sesja pobiera stan z API.

## Co dokładnie wpisać przed prawdziwym podłączeniem

Lokalnie utwórz **`C:\Abcadlo\.env`** z `.env.example`. Na Vercelu te same nazwy ustaw w **Project → Settings → Environment Variables** właściwego środowiska, potem wykonaj redeploy. Nie podawaj sekretów w czacie i nie dodawaj prefiksu `VITE_`.

- `DATABASE_URL`: pełny PostgreSQL connection string z panelu Supabase „Connect” (transaction pooler; z hasłem użytkownika DB, zarezerwowane znaki w haśle muszą być zakodowane w URL).
- `SUPABASE_URL`: adres projektu `https://<project-ref>.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: serwerowy klucz `service_role` tego samego projektu. Nie anon/publishable key.
- `SESSION_SECRET`: samodzielnie wygenerowany losowy sekret, minimum 32 znaki.
- `TEACHER_PIN_HASH`: cały wynik `npm run hash-pin -- 1234` (hash, nie sam PIN).
- `CRON_SECRET`: osobny losowy sekret do sprzątania opóźnionych uploadów.
- Opcjonalnie `SUPABASE_STORAGE_BUCKET=pinktower-assets` i `APP_ORIGIN` (dokładny produkcyjny origin, bez ścieżki i końcowego `/`).

Następnie uruchom osobno `npm run db:migrate`, `npm run storage:setup` oraz `npm run test:supabase`. Istniejące migracje są addytywne; migrator Drizzle pamięta wykonane pliki. Setup bucketu nie usuwa plików, a ponowne wywołanie ustawia tę samą prywatność i limity. Nie uruchamiaj `db:generate` tylko po to, żeby podłączyć istniejący projekt.

`test:supabase` używa **prawdziwego repozytorium PostgreSQL i Storage**. Tworzy wyłącznie własny oznaczony zestaw, czyta go przez drugie połączenie, wykonuje signed upload/read, usuwa dokładnie ten zestaw i sprawdza zniknięcie danych. `finally` ponawia sprzątanie również po błędzie. Nie wywołuje zbiorczego usuwania wszystkich zestawów. W razie niedostępności usług także cleanup może wymagać ponowienia w panelu. Test nie wykonuje migracji ani setupu automatycznie. Bez wymaganych credentials jest **pomijany z jawnym komunikatem**, co nie potwierdza połączenia z Supabase. Dwa połączenia testowe nie zastępują ręcznego sprawdzenia dwóch fizycznych komputerów na tej samej domenie.
