# Weryfikacja rzeczywistego backendu — 2026-11-02

## Aktualizacja po autoryzowanym wdrożeniu

Poniższe wcześniejsze ustalenia dokumentują stan sprzed naprawy routingu.
Po osobnej zgodzie wykonano commit `7da944c` oraz kontrolowane wdrożenie
`dpl_SL9qtfAReQ947REM71oZ53BZ19z8` do `natalka/abecadlo-app`.
Domena produkcyjna wskazuje `abecadlo-duzwv7hdd-natalka.vercel.app`.

- Produkcyjne `/api/health` i `/api/session`: 200; anonimowe
  `/api/teacher/test-data`: 401. Zagnieżdżone ścieżki działają.
- Nowy kod nauczyciela działa przez formularz i API; poprzedni jest odrzucany.
  Wartości kodu ani hasha nie zapisano w repozytorium. Zmieniono wyłącznie
  `TEACHER_PIN_HASH`, bez zmiany `DATABASE_URL` i `SESSION_SECRET`.
- Cookie ma Secure, HttpOnly i SameSite=Strict. Logout unieważnia cookie.
  Rotacja poświadczenia unieważnia sesje nauczycieli bez wpływu na uczniów.
- Pełny scenariusz `test:live-backend` na rzeczywistej domenie produkcyjnej:
  **7 etapów przeszło**, w tym panel, dwie sesje, prawdziwy SQL, Storage,
  własność danych, podgląd migracji i bezpieczne usunięcie obu własnych zestawów.
- Podgląd migratora na sztucznej kopii w izolowanej przeglądarce nie wykonywał
  importu. Rzeczywiste dane dzieci pozostają nietknięte.
- Testy lokalne: backend 24, storage 8 i smoke, wybrane UI 9,
  rzeczywisty Supabase 1, kontrola bundla 1; typecheck, build i diff check: OK.

Migrację trzeba uruchomić ręcznie na pierwotnym adresie i komputerze z lokalną
kopią, po jej zabezpieczeniu. Dwie niezależne sesje Chromium potwierdzają
synchronizację, ale nie zastępują próby na dwóch fizycznych komputerach.

## Wcześniejszy stan przed zgodą na deployment

Projekt Vercel `abecadlo-app`, zespół `natalka`, domena `abecadlo-app.vercel.app`. Niczego nie wdrażano, nie zmieniano produkcyjnego DATABASE_URL, nie wykonywano commitów/pushu ani migracji danych dzieci. Wszystkie użyte zestawy należały do tego testu i były oznaczone w prywatnym rejestrze test-data.

## Rzeczywisty Supabase

- Są wszystkie 11 tabel zgodne z `server/db/schema.ts`, ich kolumny, PK, FK i unikalność ścieżki pliku.
- Obie migracje SQL mają w dzienniku Drizzle dokładnie te same SHA-256 co lokalne pliki. Nie wykonywano ponownie migracji ani resetu.
- RLS jest włączone dla wszystkich tabel. Żadna z 11 tabel nie udostępnia bezpośrednich SELECT/INSERT/UPDATE/DELETE rolom anon i authenticated.
- Sesje są podpisanymi JWT w HttpOnly cookie; unieważnienia są w app_settings, ograniczenie PIN-u w login_attempts. Osobna tabela sessions nie jest częścią obecnego modelu.
- Bucket pinktower-assets istnieje, jest prywatny, limit 10 MB, PNG/JPEG/WebP/GIF. Konfiguracja jest prawidłowa, więc nie zmieniano jej ponownie przez storage:setup.
- `npm run test:supabase`: prawdziwe dwa połączenia PostgreSQL, upload/read/delete obrazka i scoped cleanup — **1 test przeszedł**, nie został pominięty.

## Rzeczywiste dane przez lokalne API i Chromium

`npm run test:live-backend` — **7 etapów przeszło**. To lokalne UI/API, ale prawdziwe PostgreSQL i Supabase Storage, bez mocków:

1. Logowanie nauczyciela przez UI, cookie HttpOnly/SameSite, anonimowy dostęp do panelu odrzucony.
2. Utworzenie zestawu przez „Test bazy danych”; potwierdzone rekordy SQL: profil, 30 statusów lekcji, toolProgress, praca, zadanie/odbiorca i attempt. Druga sesja widzi zestaw po refetchu i reloadzie.
3. Nauczyciel wybiera testowy profil urządzenia przez UI. Uczeń widzi tylko własny profil; nie może czytać drugiego testowego ucznia ani tworzyć zestawu administracyjnego. Zapis pracy widoczny w drugiej sesji.
4. Rzeczywisty signed upload/read obrazka. Odczyt przez anonimowe API oraz drugiego testowego ucznia odrzucony. Publiczny URL bucketu nie udostępnia pliku.
5. Sztuczna kopia localStorage/IndexedDB: wykrycie po otwarciu aplikacji, preview z jednym zdjęciem i gotowy przycisk importu. Źródło pozostaje identyczne, brak znacznika zakończenia, bo **import nie był uruchamiany**.
6. Logout czyści cookie; ponowne użycie starej sesji jest odrzucane.
7. Dwa własne zestawy usunięte przez istniejący scoped endpoint. SQL potwierdza brak zależności, a druga sesja po refetchu nie wyświetla usuniętych profili.

Wcześniejsze nieudane przebiegi także posprzątano i potwierdzono usunięcie ich profili oraz assets. Pozostają jedynie techniczne wpisy idempotencji, unieważnień sesji i opóźnionego sprzątania, bez treści testowych prac. Nie używano zbiorczego usuwania cudzych zestawów.

Przygotowanie fixture legacy wymagało nowego wejścia do aplikacji: dopisanie localStorage do już wyrenderowanej Klasy nie symuluje startu ze starą kopią. Runner ignoruje raporty innych testów, aby Vite nie przeładowywał widoku w trakcie weryfikacji.

## Produkcja — nadal blokada routingu

- `/api/health` — **200**, połączenie produkcyjnej Function z bazą działa.
- `/api/session` — **200**, anonimowa sesja bez danych uczniów.
- `/api/auth/login` i `/api/teacher/test-data` — **404 NOT_FOUND z Vercela** przed wykonaniem handlera.

Nie można więc uznać produkcyjnego logowania, wyboru ucznia i panelu za sprawdzone. Lokalnie przygotowano jedno wejście `api/index.ts` oraz rewrite `/api/:path* → /api`. Nie wykonano deploymentu. Po zgodzie na deployment trzeba ponowić testy na publicznej domenie i potwierdzić Secure cookie. Nie zmieniano produkcyjnego PIN-u; lokalny nieprawidłowy hash poprawiono dla uzgodnionego PIN-u pilotażowego.

## Migrator i pozostałe granice

Pełny import, wznowienie przerwanego przesyłania i idempotencja przechodzą w izolowanych testach backendu/UI. Na prawdziwej bazie testowano tylko preview sztucznej kopii, a osobno rzeczywisty upload obrazów. Nie wykonywano prawdziwej migracji dzieci ani pełnego importu na produkcyjnym origin.

Po deploymentcie nauczyciel musi otworzyć pierwotny produkcyjny adres w przeglądarce zawierającej starą kopię, pobrać backup i sam uruchomić import. Preview URL i lokalny adres nie widzą tej kopii. Synchronizację sprawdzono niezależnymi sesjami Chromium i połączeniami SQL; nie zastępuje to próby na dwóch fizycznych szkolnych komputerach.

Lokalne regresje: 22 testy backendu (w tym migracje), 8 storage/repository, 8 wybranych UI. Weryfikacja routingu w teście lokalnym sprawdza konfigurację, nie zachowanie sieci Vercela po deploymentcie.
