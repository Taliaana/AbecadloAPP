# Wspólny odsłuch PinkTower

`src/utils/speech.js` jest jedyną warstwą korzystającą z Browser Speech Synthesis. Wspólny odtwarzacz zapewnia jedną aktywną wypowiedź lub nagranie, anulowanie poprzedniego odczytu i bezpieczną obsługę późnych zdarzeń zakończenia. Nie uruchamia głosu automatycznie.

Domyślne ustawienia TTS: `lang: pl-PL`, `rate: 0.9`, `pitch: 1`, `volume: 1`. Wybór automatyczny preferuje dokładne `pl-PL`, następnie inne polskie warianty; uwzględnia oznaczenia natural/neural/premium/enhanced, lokalność i głos domyślny, obniżając preferencję głosów oznaczonych np. eSpeak/compact. To heurystyka oparta na metadanych udostępnianych przez przeglądarkę, nie pomiar jakości dźwięku. Nie wybiera głosu na podstawie indeksu. Barwa zależy od dostępnych głosów systemu/przeglądarki.

W panelu nauczyciela: **Klasa → Głos i odsłuch** (`/teacher/voice`). Dostępne warianty tempa: Spokojny (0.9), Wolniej (0.85), Zwykłe tempo (1.0). Nie są to trzy różne barwy głosu. Osobna lista zawiera wybór automatyczny i polskie głosy rzeczywiście udostępniane przez przeglądarkę. Lista uzupełnia się po `voiceschanged`, zachowując wybór nauczyciela. Jeśli zapisany głos jest chwilowo niedostępny, używany jest wybór automatyczny bez usuwania preferencji.

„Odsłuchaj” testuje bieżący wybór bez zapisywania. Dopiero „Zapisz ustawienia” zapisuje opcjonalne `teacher.speechSettings` w istniejącym studentStorage: preset, voiceURI, voiceName, voiceLang. Te ustawienia dotyczą wszystkich profili w tej samej przeglądarce, przetrwają inicjalizację i odświeżenie, nie zmieniają schematu ani danych uczniów. Wspólny odtwarzacz odczytuje zapisane ustawienia przy każdej nowej wypowiedzi; nagrania `audioSrc` nadal mają pierwszeństwo i własne oryginalne tempo.

Lista jest odświeżana przy `voiceschanged` oraz przed kolejnym odczytem. Pojawienie się nowych głosów niczego samo nie odtwarza ani nie przerywa aktualnego zdania. Bez polskiego głosu pozostawiamy wybór głosu przeglądarce z ustawionym `pl-PL`. Brak lub awaria Speech Synthesis nie blokuje lekcji.

Interfejs dla kolejnych materiałów:

```js
import { speak, stopSpeaking } from '../utils/speech.js'
speak({ text: 'Przyjrzyj się obrazowi.', audioSrc: '/audio/przyjrzyj-sie.mp3' })
stopSpeaking()
```

Jeżeli `audioSrc` jest podane, odtwarzane jest nagranie. Bez niego używamy TTS. Błąd odtwarzania nagrania może przejść do TTS tego samego tekstu, o ile jest dostępne. Plików nagrań ten etap nie dodaje.

`speechButton(text, label, { audioSrc })` oraz `bindSpeechButtons(root)` zachowują zgodność z dotychczasowymi wywołaniami. Ponowne kliknięcie aktywnego przycisku zatrzymuje odczyt. `aria-pressed` i etykieta „Zatrzymaj odsłuch” odpowiadają aktualnemu stanowi. Opuszczenie widoku zatrzymuje należący do niego dźwięk i usuwa listenery przycisków. Wygląd aplikacji pozostaje bez zmian poza subtelnym aktywnym stanem głośnika.

Testy: `node --test tests/speech/*.test.mjs` oraz `npm run test:ui -- tests/ui/speech.spec.js tests/ui/equipment-lesson.spec.js`.
