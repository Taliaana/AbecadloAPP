# Abecadło

Minimalistyczna aplikacja edukacyjna dla uczniów klasy 1 i ich nauczycieli, zbudowana w Vanilla JavaScript i Vite.

## Uruchomienie

```bash
npm install
npm run dev
```

Kontrola przed wydaniem:

```bash
npm run test:storage
npm run test:ui
npm run build
```

## Struktura

- `src/data` – profile, katalog 30 lekcji i dane narzędzi,
- `src/storage` – migracje i jedyne miejsce komunikujące się z `localStorage`,
- `src/components` – współdzielony układ, ikony SVG, aktywności, completion screens i review flow,
- `src/views` – role, profile, dom, ścieżka, Pracownia, portfolio i panel nauczyciela,
- `src/lessons` – interaktywne lekcje 1–4,
- `src/modules` – Typewriting oraz swobodne ćwiczenie myszy,
- `src/styles` – design system i układy responsywne.

Postęp, odblokowane narzędzia, wyniki Typewritingu i portfolio są przechowywane osobno dla każdego profilu. Warstwa storage ma małe API, dzięki czemu można ją później zastąpić klientem backendu bez przepisywania widoków. Schemat v3 automatycznie migruje dane zapisane pod kluczami `abecadlo-state-v1` i `abecadlo-state-v2`, zachowuje również profile dodane przez nauczyciela i nie usuwa starych zapisów.

Rekord ucznia zawiera `id`, `className`, daty utworzenia i archiwizacji, profil z avatarem, `progress`, osobny `toolProgress` oraz `works`. `className` pozostaje prostym polem tekstowym, ale jest odseparowane od profilu wizualnego, aby później można je było zastąpić relacją do modelu `Class`.

## Model produktu

Główna ścieżka lekcji pozostaje sekwencyjna. Pracownia przechowuje poznane narzędzia, ale postęp Typewritingu jest niezależny od numeru lekcji. Dodatkowe zadania nauczyciela również nie zmieniają miejsca ucznia w programie.

Każda lekcja, aktywność, narzędzie i zadanie ma jawny `completionType`:

- `automatic` – aplikacja jednoznacznie sprawdza rezultat,
- `self-check` – dziecko korzysta ze wzoru lub kontroli błędu i kończy samodzielnie,
- `teacher-review` – otwarta praca twórcza trafia do pedagogicznego obejrzenia.

Nauczyciel nie zatwierdza ćwiczeń automatycznych ani zadań z samokontrolą. Kolejka „Do obejrzenia” przyjmuje wyłącznie otwarte prace `teacher-review`; nie służy do oceniania i nie zawiera punktów, średnich ani porównań dzieci.

Prace ucznia korzystają ze wspólnego modelu ze statusami:

- `draft` – praca w toku,
- `waiting-review` – czeka na obejrzenie,
- `completed` – zakończona przez nauczyciela,
- `returned` – zwrócona uczniowi do kontynuowania.

Każda praca zawiera identyfikator ucznia, opcjonalną lekcję lub zadanie, daty i pole `data` zależne od narzędzia. Autosave zapisuje zmiany po krótkim debounce i wykonuje końcowy zapis przy opuszczeniu widoku.

Panel nauczyciela w MVP używa testowego PIN-u `1234`. Uwierzytelnianie pozostaje celowo lokalne i zostanie zastąpione wraz z backendem.

## Decyzje na przyszłość

- Nie planujemy otwartego chatu AI dla dzieci z klasy 1. Zadania AI powinny używać gotowych pytań, ograniczonych wyborów i uczyć przede wszystkim sprawdzania informacji wygenerowanych przez AI.
- Podstawowe lekcje nie wymagają sieci ani zewnętrznych zasobów. Architektura pozostaje gotowa na dodanie service workera, manifestu i strategii cache w przyszłym etapie PWA/offline.
- Eksport prac korzysta obecnie z JSON i `window.print()`. Osobna warstwa eksportu pozwoli później dodać generowanie PDF.
