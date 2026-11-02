# Robot w PinkTower

Moduł rozwija planszę i sterowanie z etapu 1. `src/modules/robot.js` jest wejściem do biblioteki i prac; `robot/exercise.js` obsługuje wykonanie i dotychczasowe operacje na programie. Dane 14 plansz znajdują się w `src/data/robotChallenges.js`, czysta symulacja w `robot/engine.js`, kontenery powtarzania w `robot/programView.js`, własne trasy w `robot/boardEditor.js` i `robot/project.js`. `components/robotBoard.js` wspólnie renderuje planszę, miniaturę i podgląd nauczyciela.

Ekran wejściowy `robot/learningView.js` pokazuje dominujące „Kontynuuj naukę” i sześć etapów. Wspólne reguły w `src/data/robotLearning.js` są używane przez frontend i backend. Etap wymaga ukończenia wszystkich swoich zadań; samo zapisanie programu nie zalicza zadania. Następny etap wymaga wcześniejszych ukończeń. Nauczyciel może odblokować jeden etap, jedną planszę lub wcześniejsze tworzenie przez „Robot · Tryb niestandardowy” w profilu ucznia. Zadania przydzielane przez istniejący system assignments pozostają niezależne od tej ścieżki.

Rzeczywista zawartość 14 plansz różni się od propozycji 3+3+2+2+3+1: dwie plansze uczą pętli, a „Kilka skrętów” zawiera przeszkody. Zachowano wszystkie ID, geometrię, programy początkowe i cele dydaktyczne:

1. Pierwsze kroki: `two-steps`.
2. Pierwsze zakręty: `first-turn`, `original`.
3. Omijam przeszkody: `around-stone`, `turns`, `passage`.
4. Przewiduję: `predict-edge`, `predict-turn`.
5. Detektyw błędów: `missing-step`, `wrong-turn`, `extra-step`.
6. Inna droga: `another-way`.

`repeat-steps` i `repeat-turns` to dodatkowy materiał po ścieżce. Dawniej rozpoczęte lub ukończone zadania, również pętle, pozostają dostępne. „Moja plansza” wymaga sześciu etapów albo zgody nauczyciela; istniejące projekty można zawsze otworzyć. Nie ma migracji ani resetu historii. Opcjonalne `toolProgress.robotAccess = { stages, challenges, customBoard }` przechowuje tylko wyjątki nauczyciela, a nie fikcyjne ukończenia. Endpoint `POST students/:id/robot-access` jest dostępny wyłącznie nauczycielowi. Blokady zapisu nowych programów i tworzenia projektów są sprawdzane również po stronie serwera.

Komendy nadal są ciągami `forward`, `left`, `right`; w UI nazywają się „Prosto”, „Obróć w lewo”, „Obróć w prawo”. Obrót nie przesuwa robota. Powtarzanie ma postać `{ type: 'repeat', times: 2 | 3 | 4, body: [...] }`. Druga warstwa pętli nie jest obsługiwana. Można przeciągać polecenia do kontenera i poza niego albo używać przycisków. Limit: 30 bloczków głównych i 12 wewnątrz pojedynczego powtarzania.

Silnik wykonuje cały program, zatrzymując się wcześniej tylko przed przeszkodą / brzegiem. Sukces oznacza zakończenie programu na celu, a nie samo przejście przez cel. Wynik zawiera stany i ścieżki bloczków, które UI odtwarza co 550 ms. Tryb reduced motion zachowuje logiczne kroki i usuwa animację obrotu. Reset zatrzymuje wykonanie, ustawia robota na starcie i zachowuje program; czyszczenie programu zachowuje pozycję robota i planszę. Stop anuluje następne kroki i usuwa podświetlenie wykonywanego bloczka. Inne rozwiązanie rozpoznajemy po odwiedzonych polach, nie po wzorcowym programie ani liczbie instrukcji.

Storage pozostaje w schemacie 3. Opcjonalne `toolProgress.robot[challengeId]` przechowuje liczbę ukończonych uruchomień, ukończenie, maksymalnie dwie różne trasy, ostatni program i daty. Szkic programu zapisuje się przez wspólny autosave i odtwarza przy ponownym wejściu, bez zwiększania liczby uruchomień. Normalizacja zachowuje nowe opcjonalne pola `toolProgress` oraz wcześniejsze wyniki pisania i postęp lekcji. Ukończone zadania nauczyciela pozostają dostępne do uruchomienia i resetu, ale bez edycji i zmiany statusu.

Praca własna korzysta z istniejącego `works`, `completionType: teacher-review` oraz `data.kind: robot-project`. Jej `data` zawiera planszę, program, tryb edycji, informację o sprawdzeniu trasy i `share: { scope: 'local', version: 1 }`. Dane są JSON-em. Autosave jest odroczony o 450 ms i opróżniany przy przejściu, ukryciu strony oraz `pagehide`. Dziecko może poprosić nauczyciela o obejrzenie projektu. Prace oczekujące i zakończone mają podgląd bez edycji. Powrót od nauczyciela pozwala kontynuować.

Istniejące assignments z `tool: robot` mają `robotTask: { challengeId }` lub kopię `board` i `sourceWorkId`. Formularz nauczyciela pozwala wybrać także sprawdzoną własną trasę ucznia. Rozwiązanie ma `data.kind: robot-assignment` i kończy się automatycznie, bez kolejki nauczyciela i bez zmiany numeru lekcji. Nie implementujemy sieciowego udostępniania; nie ma osobnego dziecięcego przycisku publikowania zadania dla kolegi. Nauczyciel przydziela lokalną kopię przez wspólny formularz assignments.

Weryfikacja: `npm run test:robot`, `npm run test:backend`, `npm run test:storage`, `npm run test:ui`, `npm run typecheck:server`, `npm run build`. Dawne testy wykonania używają jawnego testowego trybu niestandardowego. `robot-progression.spec.js`, `robot-access.test.ts` i `learning.test.mjs` sprawdzają rzeczywiste blokady bez tych wyjątków. Sukces ujawnia „Następne zadanie” po potwierdzeniu zapisu; Reset zachowuje program, a „Usuń ostatnie” współpracuje z Cofnij.

Stan edytowanego programu jest źródłem prawdy podczas sesji. Zmiana aktualizuje DOM i stan projektu natychmiast; autosave odracza wyłącznie zapis. Router opróżnia zapis odchodzącego widoku przed utworzeniem następnego, aby lista tras i portfolio czytały aktualne dane. Reset i wykonanie nie przebudowują programu. Edycja korzysta z jednego przejścia `changed`, które aktualizuje wynik, przyciski, focus i zapis. Cofnij przechowuje najwyżej 20 lokalnych zmian programu; historia nie jest zapisywana w storage.

Robot pozostaje jednym elementem DOM: ruch między polami animuje przesunięcie, obrót SVG używa najkrótszego skrętu o 90°. Instrukcje wykonują się co 550 ms, a ostatni bloczek pozostaje podświetlony przez taki sam czas przed zakończeniem. Reduced motion usuwa ruchy wizualne, zachowując kolejność kroków. Puste wnętrze Powtórz jest pełną strefą przeciągania z opisem.
