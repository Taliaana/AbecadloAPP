# Przyjaciele Natury — etap A

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

Kreator modyfikuje lokalny podgląd, zachowując focus przy wyborze cechy. Losowanie, cofanie (do 30 zmian), przywracanie zapisanego wyglądu i anulowanie nie zapisują danych. Dopiero „Zapisz avatar” wywołuje dotychczasowe `updateCurrentAvatar` → `PUT /api/avatar`. Wspólny renderer `avatar()` pokazuje ten sam wygląd w nagłówku, wyborze profilu i widokach nauczyciela.

Istniejące konfiguracje ludzkich awatarów pozostają obsługiwane i nie są automatycznie zamieniane. Nie zmieniono wersji storage ani schematu PostgreSQL: istniejące kolumny JSONB `students.avatar` i `students.payload` już przechowują konfigurację. Nie zmieniono postępu, sesji, danych prac ani przypisań. Testy uruchamiają izolowane API i repozytorium pamięciowe; nie stanowią testu wdrożonego Supabase.

Etap B: kolejne 20 gatunków w czterech partiach po pięć. Należy dodawać dopracowane sylwetki i odpowiednie dla nich cechy do obecnego kontraktu, bez atrap. Zwierzęta fantastyczne i mieszanie części nie są częścią tego etapu.
