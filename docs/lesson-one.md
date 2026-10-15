# Lekcja 1 — Poznajemy sprzęt komputerowy

Ta implementacja zastępuje starą Lekcję 1 pod tym samym adresem `/lesson/1` i identyfikatorem `1`. Korzysta z istniejącego `createStepFlow`, ekranów zakończenia i automatycznego zaliczania. Nie zmienia schematu storage, jego kluczy ani zapisanych ukończeń. Rozpoczęcie powtórki wcześniej ukończonej lekcji zachowuje jej status.

Pięć etapów:

1. Poznaję: sześć dużych obrazów, nazwa i opcjonalny odsłuch, ręczne Dalej.
2. Przepisuję: widoczny wzór, pole tekstowe, spokojna korekta; porównanie ignoruje wielkość liter, otaczające spacje i różnice normalizacji Unicode. Nie ignoruje polskich liter.
3. Oglądam stanowisko: realistyczny obraz przez 18 sekund, bez licznika, z możliwością wcześniejszego zakończenia przyciskiem „Jestem gotowy”.
4. Odtwarzam: przeciąganie do szerokich względnych stref albo wybranie obrazu i miejsca kliknięciem/Enterem. Aktualizacje zachowują zamontowaną scenę i listenery; focus przechodzi do kolejnego przedmiotu. Po 60 sekundach pojawia się „Pokaż wzór”. Podgląd trwa 5 sekund, można go zamknąć wcześniej, nie zmienia ułożonych przedmiotów i nie jest liczony jako wynik.
5. Obraz i nazwa: wybór nazwy z opcjonalnym odsłuchem, następnie opis urządzenia i ręczne Dalej. Ostatnie zakończenie zapisuje ukończenie i odblokowuje Lekcję 2 przez istniejący storage.

`computerEquipment.js` przechowuje definicje sześciu urządzeń, opisy, ścieżki obrazów i teksty mowy. `speechButton.js` używa wyłącznie Browser Speech Synthesis na żądanie, z `pl-PL`, preferując polski głos dostępny w przeglądarce. Wyjście z widoku anuluje mowę. Brak API nie blokuje żadnego etapu; przyciski odsłuchu są wtedy nieaktywne. Dostępność konkretnego głosu/offline zależy od przeglądarki i systemu.

Obrazy są lokalnymi PNG w `public/lessons/equipment/`. Wszystkie siedem materiałów jest dołączonych; lista i prompty generowania są w README tego katalogu. Materiały są fotorealistycznymi obrazami wygenerowanymi, nie fotografiami konkretnych produktów. Zestawienie do obserwacji pokazuje prawidłowe relacje między urządzeniami. Scena do manipulacji używa tych samych sześciu typów urządzeń i tolerancyjnych stref zamiast wymagania odtworzenia fotografii co do piksela.

Typografia całej aplikacji jest dopracowana w `src/styles/typography.css`: Fredoka Medium dla nagłówków oraz krótkich kontrolek/nawigacji, Nunito Sans dla tekstu, formularzy i dłuższych instrukcji. Zmieniono wagę, odstępy i rytm wierszy. Plik nie ustawia żadnych kolorów, teł ani obramowań. Lokalne pliki Fredoka i Nunito Sans były już dołączone do projektu. Test CDP `CSS.getPlatformFontsForNode` sprawdza faktycznie renderowane fonty, nie samą deklarację CSS.

Przeglądarka raportuje Fredoka jako `familyName: Fredoka Light`, `postScriptName: Fredoka-Medium`, a Nunito Sans jako `familyName: Nunito Sans 12pt ExtraLight 12pt` (wewnętrzna nazwa fontu zmiennego). W obu przypadkach `isCustomFont: true`; nie są to systemowe fallbacki. Raport znajduje się również w załączniku JSON testu UI.

Testy: `node --test tests/lessons/*.test.mjs`, `npm run test:storage`, testy Playwright `equipment-lesson.spec.js` i `student-flow.spec.js`. Regresja danych produkcyjnych obejmuje profile, klasy, różne postępy, Typewriting, Robota, prace ze zdjęciami, przypisane zadanie i status teacher-review; porównuje stan przed i po wielokrotnej inicjalizacji i ponownym wejściu do ukończonej Lekcji 1. Testy czasu używają Playwright Clock.
