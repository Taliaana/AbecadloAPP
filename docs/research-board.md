# Tablica badawcza

Pierwszy materiał, „Skały – zdjęcia z internetu” (klasa 2), jest dostępny w Pracowni oraz jako narzędzie dodatkowego zadania nauczyciela. Konfiguracja w `src/data/researchBoards.js` określa grupy, pozycje, instrukcje, obowiązek źródła, próbę i pytania do refleksji. Kompletność sprawdza tylko zdjęcia i niepuste źródła; aplikacja nie rozpoznaje skał ani nie ocenia odpowiedzi.

Próba jest oddzielna od właściwej pracy. Uczeń kopiuje zdjęcie granitu z internetu i wkleja je do wybranego pola przez Ctrl+V. Źródło wkleja osobno do pola tekstowego. Schowek musi zawierać plik obrazu (polecenie przeglądarki „Kopiuj obraz”), a nie tylko adres lub zaznaczony tekst. Nie pobieramy automatycznie obrazów z obcych stron.

Wklejanie ma trzy wejścia do wspólnej operacji `insertImage`: zdarzenie Ctrl+V, przycisk „Wklej obraz” przy aktywnym pustym polu oraz własne menu PinkTower po prawym kliknięciu pola lub zdjęcia. Dwie akcje myszą odczytują obraz przez `navigator.clipboard.read()`; brak obsługi, odmowa zgody lub blokada przeglądarki wyświetlają spokojną informację o możliwości użycia Ctrl+V. Menu działa również przez Shift+F10 i zamyka się po Escape albo kliknięciu poza nim. Odczyt schowka uruchamia się wyłącznie po świadomym wybraniu akcji przez użytkownika.

`src/storage/imageStorage.js` zapisuje oryginalne pliki jako Blob w IndexedDB `pinktower-images`, magazyn `images`. Rekord zawiera `id`, `studentId`, `workId` i `blob`. Odczyt sprawdza właściciela oraz pracę. Obraz jest dekodowany przed zapisem, a zapis metadanych następuje dopiero po zatwierdzeniu transakcji IndexedDB. Stare obrazy są usuwane po zastąpieniu lub usunięciu zdjęcia. Adresy object URL służą tylko wyświetlaniu i są zwalniane przy opuszczaniu widoku.

Istniejący studentStorage przechowuje work z `completionType: teacher-review` i lekkie `data`: `kind: research-board`, `boardId`, `entries` (`imageId`, `source`), `answers` oraz flagi próby/pomocy. Bez base64, bez zmiany wersji schematu. Źródła i odpowiedzi zapisują się przez wspólny debounce autosave; zapis jest również domykany przy wyjściu z widoku, ukryciu karty i pagehide. Zapis zdjęcia jest asynchroniczny; w tym czasie przyciski pokazania pracy i dalszego działania są nieaktywne. Przed pokazaniem pracy sprawdzamy także odczyt zapisanych zdjęć.

Zdjęcie ma cztery narożne uchwyty zmiany rozmiaru. Shift zachowuje proporcje oryginalnego pliku, a strzałki na zaznaczonym uchwycie zapewniają obsługę klawiaturą. Rozmiar jest ograniczony do ramki; `entries.imageSize` zawiera tylko względną szerokość i wysokość, zapisywane przez autosave i odtwarzane także w podglądzie nauczyciela. Zastąpienie zdjęcia przywraca początkowe dopasowanie nowego obrazu. Instrukcja i próba obejmują Chrome, zakładkę Grafika, kopiowanie obrazu i ręczne zapisanie adresu strony źródłowej.

Wysyłanie oraz decyzje nauczyciela wykorzystują istniejące statusy i `reviewWork`. Nauczyciel widzi zdjęcia, źródła i refleksję w dotychczasowym podglądzie pracy. Decyzja „Zaproś do dalszej pracy” zapisuje `returned`; „Zakończ pracę” zapisuje `completed`. Obecny eksport JSON zawiera metadane pracy, nie pliki zdjęć.

Testy: `node --test tests/research/*.test.mjs` i `npm run test:ui -- tests/ui/research-board.spec.js`. Zmienna `PINKTOWER_NO_SCREENSHOTS=1` wyłącza screenshoty w istniejących testach i konfiguracji Playwright, zachowując sprawdzenia funkcjonalne.
