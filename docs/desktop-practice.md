# Ćwiczebny pulpit i testowanie lekcji

## Gdzie wejść

- **Klasa → Testuj lekcje**: nauczyciel uruchamia dowolną z czterech gotowych lekcji bez wybierania ucznia. Pozostałe materiały są oznaczone jako przygotowywane.
- **Lekcja 2 „Obsługuję mysz”**: dotychczasowe cztery ćwiczenia oraz sześć krótkich zadań na pulpicie. Każdy etap kończy się kartą „Gotowe” i ręcznym przejściem dalej.
- **Pracownia → Ćwicz mysz → Ćwicz na pulpicie**: samodzielne ćwiczenie po odblokowaniu narzędzia myszy.

W ćwiczeniu z kartką i układance 1–4 wybór i odkładanie elementów aktualizują istniejący DOM, bez ponownego montowania lekcji. Klocki zachowują stałe miejsca na półce. Podczas przeciągania podgląd podąża za kursorem; poprawne umieszczenie części ma krótką animację, ograniczaną przez `prefers-reduced-motion`. Dopiero po ułożeniu czwartej części i zapisaniu postępu pojawia się karta ukończenia. Testy regresyjne są w `tests/ui/mouse-puzzle.spec.js`.

## Obsługa pulpitu

Kliknięcie zaznacza, dwuklik lub Enter otwiera folder, dokument albo obraz. Pliki i foldery przenosi się przez przeciąganie do folderu/kosza lub przez wybór „Przenieś do” i przycisk „Przenieś”. Folder zachowuje zawartość; nie można włożyć go do siebie ani swojego podfolderu. Delete przenosi zaznaczony element do kosza; „Przywróć” odkłada go do poprzedniego folderu.

Ikony plików i folderów można również przeciągać na wolne miejsce pulpitu albo przesuwać strzałkami, gdy mają fokus. Opcjonalne `board.iconPositions` przechowuje tylko współrzędne 0–1; po odświeżeniu i zmianie rozmiaru ekranu pozycje są odtwarzane bez wychodzenia poza planszę. Stare zapisy bez tego pola zachowują dotychczasowy układ.

Okna można przeciągać za tytuł, przesuwać strzałkami po ustawieniu fokusu na tytule, zamknąć lub zminimalizować. Pasek zadań przywraca istniejące okno. „Pulpit” na pasku chowa otwarte okna. W folderze działają „Wstecz” i powrót do pulpitu.

„Pełny ekran” korzysta z Fullscreen API i pokazuje pulpit, otwarte okna, pasek zadań oraz bieżącą wskazówkę samouczka. Powrót jest dostępny krzyżykiem w prawym górnym rogu lub klawiszem Esc, także podczas rozpoczynania przejścia. Pełny ekran jest opcjonalny: wszystkie zadania można wykonać w zwykłym oknie. „Schowaj pulpit” dotyczy wyłącznie symulatora w PinkTower i zachowuje jego stan.

W lekcji polecenie, odsłuch, numer zadania i „Dalej” są częścią pulpitu, więc pozostają dostępne również na pełnym ekranie. Sześć zadań oraz ich karty „Gotowe” aktualizują ten sam zamontowany element: nie opuszczają pełnego ekranu, nie odtwarzają okien i nie odpinają obsługi plików. Zakończenie jest pokazywane po potwierdzeniu zapisu przez API; w razie błędu można ponowić „Dalej”. Po ostatnim zadaniu karta ukończenia umożliwia przejście do lekcji klawiatury, co kończy pełny ekran. Wyjście krzyżykiem lub Esc nie zmienia etapu. Pełny ekran to stan przeglądarki, nie zapisywany profil ucznia.

Operacje na zaznaczonym pliku, w tym „Przywróć”, są dostępne także w pełnoekranowej lekcji. Ich obszar ma stałą wysokość, aby zaznaczenie ikony nie przesuwało jej pod kursorem pomiędzy kliknięciami dwukliku. Układ lekcji używa jednego nagłówka zadania z krótką wskazówką i jednego paska postępu z przyciskiem pod pulpitem.

Folder „Przewijanie” zawiera galerię z własnym paskiem przewijania. Można używać kółka, gładzika i klawiatury, a na końcu wrócić przyciskiem na górę. Folder korzysta z istniejącego modelu okien i zapisu; stare sesje pozostają zgodne. Obrazki są generowane jako SVG w interfejsie, nie zapisujemy ich w stanie ucznia.

Samouczek uruchamia się dopiero po wejściu na pełny ekran. Jedna wskazówka pokazuje bieżącą czynność, rysunek myszy z wyróżnionym lewym przyciskiem lub kółkiem i właściwy element pulpitu. Kolejny krok pojawia się po rzeczywistym zaznaczeniu Kosza, otwarciu go, zamknięciu okna, przesunięciu ikony, otwarciu galerii i przewinięciu jej na dół. Nie ma przycisku pomijającego niezrobiony krok. Samouczek można przerwać i uruchomić ponownie; opuszczenie pełnego ekranu chowa wskazówkę. Ćwiczenia w zwykłym oknie pozostają dostępne bez samouczka.

Samouczek i polecenia lekcji mają przycisk odsłuchu korzystający ze wspólnego mechanizmu głosu PinkTower; nic nie odtwarza się automatycznie. Zmiana kroku zatrzymuje poprzedni odsłuch. Samouczek nie zalicza lekcji ani nie zeruje stanu pulpitu. Podczas przeciągania lekki podgląd podąża za kursorem. Ograniczone animacje respektują ustawienia systemu.

## Stan i bezpieczeństwo

`src/data/desktop.js` definiuje zamknięty katalog wirtualnych plików, operacje, zadania i walidację. `desktopSandbox.js` odpowiada za okna i interakcje, a `desktopActivity.js` za wspólne kontrolki lekcji i Pracowni. Ilustracje są lokalnymi SVG. To symulacja: nie ma dostępu do plików ani okien systemu operacyjnego.

Autosave zapisuje mały JSON przez istniejące `studentStorage → POST /api/tools`, z `kind: "desktop"`, `mode: "lesson" | "practice"`. Serwer sprawdza sesję właściciela, dostęp do lekcji/narzędzia oraz dozwolone pliki, foldery, współrzędne i granice stanu. Dane trafiają do istniejącego JSONB `toolProgress.desktop.lesson/practice`; migracja SQL nie jest potrzebna. Nie zmieniamy istniejących ID, postępów, prac ani lokalnych kopii legacy.

Zapis obejmuje etap i ekran ukończenia, puzzle, położenie plików, poprzednie foldery plików z kosza, otwarte/zminimalizowane okna i ich historię oraz schowanie symulatora. „Zapisz i wyjdź” czeka na potwierdzenie API. Awaria pozostawia pracę otwartą i pozwala ponowić zapis. Odświeżenie/wznowienie odtwarza stan z serwera. Ponowne wykonanie ukończonej lekcji nie cofa zaliczenia.

`src/lessons/session.js` wstrzykuje do tych samych lekcji normalny zapis ucznia albo efemeryczną sesję testową nauczyciela. Ta druga nie wysyła startów, zaliczeń ani stanu pulpitu do API. Wyjście z testu usuwa stan próby. Uczeń nie uzyskuje dostępu do tras nauczycielskich, a zmiana profilu nadal wymaga przygotowania urządzenia przez nauczyciela.

Wspólny renderer przewija początek właściwego kontenera tylko po zmianie trasy lub etapu, a nie po każdej interakcji. Pola pisania lekcji 1 i 3 otrzymują fokus bez dodatkowego przewijania.

## Testy

`tests/backend/desktop.test.ts` sprawdza model plików i folderów, cykle, współrzędne, przywracanie, okna, walidację, zapis przez repozytorium, izolację uczniów i brak zapisu w trybie nauczycielskim. `tests/ui/desktop.spec.js` sprawdza rzeczywiste interakcje, pełny ekran, fokus, odtwarzanie i błędy zapisu oraz cztery szerokości ekranu. `tests/ui/desktop-tutorial.spec.js` odtwarza błędy przesuwania ikon/folderów i sprawdza kolejność samouczka, brak pomijania kroków, klawiaturę i mały ekran. Testy UI korzystają z izolowanego API w pamięci, nie z danych dzieci w Supabase.

`tests/ui/desktop-lesson-fullscreen.spec.js` przechodzi wszystkie zadania bez wymiany elementu pełnoekranowego, sprawdza polecenia i nawigację na czterech rozmiarach ekranu, końcowe przywrócenie pliku, wyjście do następnej lekcji, wznowienie karty ukończenia i ponawianie nieudanego zapisu bez pominięcia etapu.
