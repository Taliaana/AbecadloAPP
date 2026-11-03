# Przyjaciele Natury — etapy A i B

Wybór profilu jest nadal dostępny tylko dla nauczyciela przygotowującego urządzenie. Najpierw wybiera on poziom klasy (1–3), potem ucznia. `1A` i `1B` należą do klasy 1; oryginalne przypisanie nie jest zmieniane. Starsze przypisania spoza tych poziomów pozostają dostępne pod „Pozostałe profile”. Profile zarchiwizowane nie są pokazywane. Serwer nadal wymaga sesji nauczyciela przy przypisywaniu ucznia; sesja ucznia nie może przełączyć właściciela ani pobrać listy klasy.

Konfiguracja jest małym obiektem `student.profile.avatarConfig`:

```js
{
  kind: 'nature', version: 1, species: 'roe-deer',
  body: 'chestnut', belly: 'cream', detail: 'cocoa',
  eyes: 'gentle', mouth: 'smile', pattern: 'spots', part: 'upright',
  accessory: 'none', background: 'paper'
}
```

Nie zawiera SVG, obrazów, adresów ani dowolnych kolorów wpisywanych przez użytkownika. Wspólne dane i listy dozwolonych cech są w `src/data/natureFriends.js`. Walidacja API sprawdza pełny obiekt i zgodność opcji z gatunkiem. Renderer korzysta wyłącznie z własnych ścieżek SVG i dozwolonych kolorów. Każde zwierzę ma własną sylwetkę i warstwy ciała, głowy, wzoru i dodatków. Warianty części to uszy sarny, skrzydła sowy, łapy żółwia, nogi żaby i płetwy błazenka.

Kreator modyfikuje lokalny podgląd, zachowując focus przy wyborze cechy. Pięć grup kręgowców porządkuje 25 gatunków; na ekranie widać pięć miniatur wybranej grupy. Samo przeglądanie grup nie zmienia awatara. Cofanie i reset przywracają także właściwą grupę zwierzęcia. Losowanie, cofanie (do 30 zmian), przywracanie zapisanego wyglądu i anulowanie nie zapisują danych. Dopiero „Zapisz avatar” wywołuje dotychczasowe `updateCurrentAvatar` → `PUT /api/avatar`. Wspólny renderer `avatar()` pokazuje ten sam wygląd w nagłówku, wyborze profilu i widokach nauczyciela.

Istniejące konfiguracje ludzkich awatarów pozostają obsługiwane i nie są automatycznie zamieniane. Nie zmieniono wersji storage ani schematu PostgreSQL: istniejące kolumny JSONB `students.avatar` i `students.payload` już przechowują konfigurację. Nie zmieniono postępu, sesji, danych prac ani przypisań. Testy uruchamiają izolowane API i repozytorium pamięciowe; nie stanowią testu wdrożonego Supabase.

Etap B dostarcza cztery partie po pięć gatunków (po jednym z każdej grupy):

- Lis, pingwin, kameleon, ropucha, rekin.
- Królik, kaczka, gekon, salamandra, konik morski.
- Niedźwiedź, papuga, wąż, traszka, rozdymka.
- Wydra, tukan, krokodyl, aksolotl, skalar.

Nowe ilustracje są podzielone według grup w `src/components/nature/`. Współdzielą tylko małe funkcje rysujące ścieżki, oczy i pyszczki; każda ma własną sylwetkę, wzory i wariant części ciała. Punkty mocowania akcesoriów uwzględniają zwierzęta przedstawione z przodu i z profilu. Pięć wcześniejszych gatunków i kontrakt konfiguracji w wersji 1 pozostają obsługiwane bez migracji danych.

Testy sprawdzają komplet 25 gatunków, pięć w każdej grupie, rozłączne sylwetki, każdą dopuszczalną opcję, zapis/odczyt i uprawnienia. UI sprawdza przejścia pomiędzy grupami, brak zmiany awatara podczas przeglądania, cofanie i ponowne otwarcie zapisanego gatunku. Zwierzęta fantastyczne i mieszanie części nie są zaimplementowane.
