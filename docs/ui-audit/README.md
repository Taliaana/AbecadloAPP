# Audit interfejsu PinkTower

Wspólne tokeny palety, typografii i układu są w `src/styles/index.css`. Wspólne powierzchnie, pola, komunikaty, puste stany i korekty responsive znajdują się w `src/styles/shared.css`. Aktywności zachowują własne proporcje planszy i materiałów, korzystając z tej samej typografii i przycisków.

Usunięto nakładające się palety i definicje przycisków. Nauczyciel i uczeń korzystają z tej samej szerokości strony. Dom zachowuje większy nagłówek powitania; pozostałe strony i formularze używają wspólnej skali nagłówków. Disabled pozostaje czytelny, a loading ma niezależny kolor spinnera i powinien być używany z `disabled` oraz `aria-busy`.

Poprawki interakcji obejmują aktualizację avatara bez zastępowania kontrolek, zachowanie focusu filtrów, obsługę PIN-u klawiaturą, potwierdzenie zapisu profilu, otwarty formularz po zapisie oraz sprawdzenie odbiorców zadania. Puste portfolio i lista prac nauczyciela używają wspólnego komponentu.

`node scripts/audit-ui.mjs after` uruchamia własny serwer Vite i przeglądarkę Chromium. Zapisuje 48 zrzutów dla 1440×900, 1366×768, 1024×768 i 390×844; sprawdza overflow i błędy przeglądarki. Zrzuty obejmują role, profile, Dom, Pracownię, portfolio, lekcję, Robota, avatar, klasę, kolejkę prac, portfolio nauczyciela i formularz zadania. Animacje i fonty kończą się przed zrzutem.

Nowe scenariusze w `tests/ui/integration-audit.spec.js` sprawdzają rzeczywiste zmiany UI bez reloadu, obsługę klawiatury, stany kontrolek i układ wszystkich głównych stron na czterech viewportach. Na małym ekranie dodatkowo sprawdzają pełną widoczność kart podsumowania oraz avatar obok imienia.
