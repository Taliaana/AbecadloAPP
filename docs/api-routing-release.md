# Routing API i rotacja kodu nauczyciela

Vercel uruchamia jedno wejście `api/index.ts`. Rewrite `/api/:path*` kieruje
również zagnieżdżone żądania do tej funkcji. Handler rozpoznaje oryginalny URL;
metoda, body, query i cookies nie są zastępowane przekierowaniem HTTP.
Ścieżki API nie korzystają z fallbacku SPA.

Formularz nauczyciela obsługuje kod od 4 do 12 cyfr, zgodnie z walidacją API.
Kod nie trafia do bundla ani dokumentacji. Zmieniany jest wyłącznie serwerowy
`TEACHER_PIN_HASH`. Nowa wartość na Vercelu zaczyna działać w nowym deploymencie.

Podpisane sesje nauczyciela zawierają wersję poświadczenia wyprowadzoną z hasha.
Zmiana hasha unieważnia wcześniejsze sesje nauczycielskie, także stare sesje bez
tej wersji. Sesje uczniów nie zależą od hasha PIN-u. Rate limiting, podpis JWT,
kontrola Origin i cookie HttpOnly/Secure pozostają aktywne.

Przy wycofaniu deploymentu trzeba uwzględnić, że poprzednie wdrożenie używa
własnego snapshotu zmiennych środowiskowych i starszego formularza PIN-u.
Sam rollback nie potwierdza działania nowego kodu ani unieważnienia starych
sesji. Nie należy przywracać poprzedniego kodu przez wpisanie go do frontendu.
