# Etapa 3 — plan

Stare: **aprobat de proprietar pe 21 octombrie 2026**. Branch: `feature/stage-3`. Versiune țintă: 0.4.0.

Scop (din `DEVELOPMENT_PLAN.md`): căutare (`/`, Ctrl+K), comparație cu orice oraș, „City DNA", liste salvate local. Rezultat vizibil: **comparații între oricare orașe**.

## Decizii deja luate (21 octombrie 2026)

| Subiect | Decizie |
|---|---|
| Orașele implicite în comparația de pe pagina unui oraș | **2 vecini** (cei mai apropiați geografic) + **2 de mărime asemănătoare** (populația 2025 cea mai apropiată), fără dubluri |
| Număr maxim de orașe comparate | **5** (orașul curent + 4) |
| Unde | **Secțiunea Compare** de pe pagina orașului + **pagina `/compare`** cu adresă care se poate trimite |

## 1. Căutare

- Fișier mic generat offline: `data/search.json` (~60 KB) — pentru fiecare oraș: adresa, numele, numele alternative, comitatul, populația 2025, centrul (lat/lon).
  - **Numele alternative** vin din date: „San Buenaventura (Ventura)" → și „Ventura", și „San Buenaventura"; „St. Helena" → și „Saint Helena".
  - **Comitatul** vine din GNIS (înregistrarea oficială a orașului); ajută când două nume seamănă și apare în rezultate („Glendale · Los Angeles County").
- Potrivire fără diacritice și fără majuscule; ordinea: nume exact > începe cu > un cuvânt începe cu > conține; la egalitate, orașul mai mare primul.
- Interfață: căsuța de căutare de sus devine activă pe toate paginile; lista de rezultate se folosește cu tastatura (săgeți, Enter, Esc) și pe telefon. Tasta `/` mută cursorul în căutare, **Ctrl+K / Cmd+K** o deschide de oriunde.
- Rezultat: nume, comitat, populație; Enter → pagina orașului.

## 2. Comparație

### Ce rânduri apar (doar cifre definite la fel pentru toate orașele)

| Rând | Cifră | Perioadă |
|---|---|---|
| Populație | estimarea Census | 1 iul. 2025 |
| Populație la recensământ | Census 2020 | 1 apr. 2020 |
| Schimbare | estimări 2020→2025 (aceeași serie) | 2020–2025 |
| Suprafață de uscat | Gazetteer | 2025 |
| Densitate | estimare 2025 ÷ uscat 2025 | 2025 |
| Altitudine | la centrul orașului (USGS) | — |
| Venit median al gospodăriei | ACS, **dolari 2024** | 2020–2024 |
| Valoarea medie a locuinței | ACS, **dolari 2024** | 2020–2024 |
| Studii superioare (25+) | ACS | 2020–2024 |
| Născuți în afara SUA | ACS | 2020–2024 |
| Sub pragul sărăciei | ACS | 2020–2024 |
| Timp mediu de navetă | ACS | 2020–2024 |
| Media anuală max./min. | NOAA, stația cea mai apropiată | 1991–2020 |
| Precipitații pe an | NOAA | 1991–2020 |
| Distanța până la stația meteo | calculată | — |

- Valorile ACS au „±" (marja de eroare); valorile cu fiabilitate scăzută sunt marcate; lipsă → „Not available" cu motivul la clic (ex. Mountain House la recensământul 2020).
- **Regulă verificată în cod**: înainte de afișare, fiecare rând verifică că toate orașele au aceeași perioadă, aceeași unitate și același an al dolarilor; dacă nu, celula e marcată și explicată (nu se amestecă în tăcere).
- Unitățile urmează comutatorul US/Metric. Orașul curent e evidențiat. Clic pe o valoare → panoul de proveniență (ca în Etapa 2).

### Secțiunea Compare (pagina orașului)

- Pornește cu orașul curent + cei 4 impliciți (2 vecini + 2 de mărime asemănătoare).
- Etichete pentru fiecare oraș (cu „×" pentru a-l scoate) și o căsuță „Add a city" (aceeași căutare).
- Buton „Open full comparison" → `/compare?cities=ca/san-francisco,ca/oakland,...`.

### Pagina `/compare`

- `compare.html`, servită la `/compare` printr-o rescriere în `netlify.toml` (ca la orașe).
- Adresa conține lista orașelor; se poate trimite cuiva. Adrese invalide sau orașe necunoscute → ignorate, cu mesaj. Maxim 5.
- Tabelul complet + City DNA + legătură spre fiecare oraș.

### City DNA

- Grupuri de bare pentru: densitate, venit, studii superioare, navetă, precipitații, temperatura maximă medie.
- Fiecare bară e scalată față de **cea mai mare valoare dintre orașele alese** (explicat sub titlu, ca în prototip). Fără scoruri inventate, fără „clasamente".

## 3. Liste salvate („My cities")

- Buton „Save city" în hero (ca în prototip); lista se păstrează **doar în browser** (localStorage, cu protecție dacă e blocat).
- Pe pagina de start: „Your saved cities" (dacă ai salvat), cu buton „Compare saved cities" (primele 5).
- Fără conturi, nimic trimis pe server.

## 4. Fișiere noi / modificate (pe scurt)

`scripts/build-index.js` (scrie și `data/search.json`), `scripts/lib/places.js` (comitatul din GNIS), `js/search.js` (potrivire, pur), `js/compare.js` (orașe implicite, adrese, verificări de comparabilitate — pur), `js/saved.js`, `js/components/search-box.js`, `js/components/compare-table.js`, `js/components/dna.js`, `compare.html`, `netlify.toml`, `i18n/en.json`, `styles.css`, teste, CHANGELOG 0.4.0.

## 5. Teste

1. Căutare: normalizare (diacritice, „St."), ordinea rezultatelor, nume alternative, limita de rezultate.
2. Orașe implicite: 2 vecini + 2 de mărime apropiată, fără dubluri și fără orașul curent; orașe mici și mari.
3. Adresa `/compare`: citire/scriere, validare, maxim 5, fără dubluri.
4. Comparabilitate: același cod de cifră, aceeași perioadă, aceeași unitate și an al dolarilor pe rând; cazul Mountain House.
5. Listele salvate: adăugare, scoatere, ordine, localStorage blocat.
6. `data/search.json`: fiecare oraș cu pagină apare exact o dată, cu populație și centru.
7. Testele existente (text fără litere direct în componente, contrast, i18n) rămân.

Verificare în browser: căutare cu tastatura, comparația pe desktop și pe telefon (tabelul se derulează în interior), ambele teme.

## 6. Ce NU intră în Etapa 3

- Comparații cu zona metropolitană (indicator separat, etapă viitoare) sau între state.
- Clasamente / scoruri compuse („cel mai bun oraș").
- Conturi, liste salvate pe server, exporturi (etapa de monetizare).
- Transport, locuri, cartiere, istorie (Etapele 4–5); pagini pre-generate pentru SEO (Etapa 6).
