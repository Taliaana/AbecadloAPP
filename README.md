# Abecadło

Minimalistyczna aplikacja edukacyjna dla uczniów klasy 1, zbudowana w Vanilla JavaScript i Vite.

## Uruchomienie

```bash
npm install
npm run dev
```

Kontrola przed wydaniem:

```bash
npm run test:storage
npm run build
```

## Struktura

- `src/data` – profile, katalog 30 lekcji i dane narzędzi,
- `src/storage` – jedyne miejsce komunikujące się z `localStorage`,
- `src/components` – współdzielony układ, ikony SVG i postęp,
- `src/views` – profile, dom, ścieżka, Praca wolna i portfolio,
- `src/lessons` – interaktywne lekcje 1–4,
- `src/modules` – Typewriting oraz swobodne ćwiczenie myszy,
- `src/styles` – design system i układy responsywne.

Postęp, odblokowane narzędzia i portfolio są przechowywane osobno dla każdego profilu. Warstwa storage ma małe API, dzięki czemu można ją później zastąpić klientem backendu bez przepisywania widoków.
