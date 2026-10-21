# Etapa 2 — plan

Stare: **aprobat de proprietar pe 21 octombrie 2026**. Branch: `feature/stage-2`. Versiune țintă: 0.3.0.

Scop (din `DEVELOPMENT_PLAN.md`): modelul de date al orașului (fiecare cifră cu proveniență) și scripturile offline pentru Census, NOAA și poze. Rezultat vizibil: **toate orașele din California au pagină**, cu cifre reale.

## Decizii deja luate (21 octombrie 2026)

| Subiect | Decizie |
|---|---|
| Cheie Census API | Proprietarul obține o cheie gratuită; stă **doar** în fișierul local `.env` (ignorat de git), niciodată pe site sau în repo |
| „Centrul" orașului | **Punctul GNIS** al localității (USGS „Populated Place"); dacă lipsește, punctul intern Census. Folosit pentru altitudine, vreme live, stația NOAA |
| Poze principale | Scriptul propune pentru toate; **aleg eu** pentru orașele cu candidate bune (Featured/Quality), ți le arăt în grupuri; restul primesc automat imaginea din Wikidata |
| Fus orar | **timezone-boundary-builder 2026e** (date OpenStreetMap, ODbL), punct în poligon, offline |

## Descoperiri din cercetare (notabile)

1. **API-ul Census cere acum cheie** (nu mai merge anonim). Fișierele Census (Gazetteer, estimări, TIGERweb) merg fără cheie.
2. **California are 483 de orașe, nu 482**: **Mountain House** s-a încorporat în 2024. Nu are număr de la recensământul 2020 *ca oraș* (era „CDP"), deci acea cifră va fi „Not available" cu motivul; are estimare 2025. Restul: 462 „city" + 21 „town".
3. **Suprafața SF s-a schimbat**: uscat 46,914 mi² (121,51 km²) în Gazetteer 2020, 46,685 mi² (120,91 km²) în 2025 (actualizări de țărm). Densitatea trebuie calculată cu suprafața **din același an** cu populația.
4. **Două cifre „2020" diferite pentru SF**: recensământul (1 aprilie 2020) = **873.965**; baza estimărilor (2020) = **878.550**. Le arătăm separat, cu etichete, și calculăm schimbarea 2020→2025 doar în aceeași serie (estimări).
5. **Punctul intern Census al SF din Gazetteer e în Insulele Farallon** (−123,03°, în ocean). Încă un motiv pentru punctul GNIS.
6. **GNIS nu mai publică altitudinea** (câmpurile au fost scoase). Luăm altitudinea de la **USGS 3DEP** (model de teren de 1 m) în punctul GNIS. SF: **16,7 m** la Civic Center (vs 151,9 m în punctul intern Census, lângă Twin Peaks).
7. **Clima SF din NOAA** (stația „San Francisco Downtown", 1991–2020): septembrie e luna cea mai caldă (70,2 °F / 21,2 °C), precipitații anuale **22,89 in = 581 mm**. Confirmă nota din prototip (582 mm, nu 601 mm cum scrie textul Wikipedia).
8. **Legătura cu Wikidata** prin codul GNIS: **481 din 483** automat; lipsesc **Emeryville** și **Santa Rosa** (le leg manual). 4 orașe n-au imagine în Wikidata.

## 1. Modelul de date

Un fișier pe oraș: `data/cities/<state>/<slug>.json`.

```
{ "id": { "state": "ca", "slug": "san-francisco", "geoid": "0667000", "gnisCivil": "2411786",
          "gnisPlace": "277593", "wikidata": "Q62" },
  "name": "San Francisco", "censusName": "San Francisco city", "type": "city",
  "referencePoint": { "lon": -122.41944, "lat": 37.775, "source": "gnis" },
  "facts": { "<cheie>": Fact, ... },
  "sources": { "<id>": Source, ... },
  "conflicts": [ ... ] }
```

**Fact** (fiecare cifră are exact un nivel):
- `value` (sau `null` + `reason` → pagina arată „Not available yet" cu motivul)
- `unit` (în unitatea sursei: mi², °F, inch, m, dolari), `period` (ex. `2020-04-01`, `2025-07-01`, `2020–2024`, `1991–2020`)
- `level`: `sourced` (cu `source`) / `computed` (cu `formula` și `inputs`) / `estimated` (cu `basis`)
- opțional `moe` (marja de eroare ACS, 90%), `dollarYear`, `note`

**Source**: nume, URL, vintage, data descărcării, licență.

### Cifrele din Etapa 2

| Cheie | Ce | Sursă | Nivel |
|---|---|---|---|
| `population.census2020` | Populația la recensământ, 1 apr. 2020 | Census 2020 DHC (API) | sourced |
| `population.estimate2025` | Estimare 1 iul. 2025 | Census Population Estimates, Vintage 2025 (`sub-est2025_6.csv`) | sourced |
| `population.change` | Schimbare 2020→2025, % | estimare 2025 vs baza estimărilor 2020 (aceeași serie) | computed |
| `area.land2025`, `area.water2025` | Uscat, apă (mi²) | Census Gazetteer 2025 | sourced |
| `area.land2020` | Uscat 2020 (pentru densitatea 2020) | Census Gazetteer 2020 | sourced |
| `density.2020` | Locuitori / mi² de uscat | recensământ 2020 ÷ uscat 2020 | computed |
| `density.2025` | Locuitori / mi² de uscat | estimare 2025 ÷ uscat 2025 | computed |
| `elevation` | Altitudinea punctului GNIS (m) | USGS 3DEP Elevation Point Query | sourced |
| `timezone` | Fus orar IANA (ex. America/Los_Angeles) | timezone-boundary-builder 2026e | sourced |
| `acs.*` | Venit median al gospodăriei, valoarea medie a locuinței, % studii superioare (25+), % născuți în afara SUA, % sub pragul sărăciei, timp mediu de navetă | ACS 5 ani 2020–2024, tabele „Data Profile", cu marja de eroare; bani în **dolari 2024** | sourced |
| `climate.*` | Normale lunare: max., min. (°F), precipitații (in); medii anuale | NOAA NCEI Normals 1991–2020, stația completă cea mai apropiată | sourced (anualele: computed) |
| `climate.station` | Numele, coordonatele, altitudinea stației; **distanța** față de centrul orașului | NOAA + calcul | sourced / computed |

Reguli: densitatea **numai** cu suprafața de uscat din același an; nu amestecăm recensământul cu estimările în același calcul; dacă marja ACS e mare (coeficient de variație > 30%), afișăm „low reliability"; dacă stația NOAA e la peste 25 km sau la peste 300 m diferență de altitudine, o spunem lângă grafic.

## 2. Scripturi noi (toate offline, refuză rezultate stricate)

| Script | Ce face |
|---|---|
| `build-curation.js <state>` | Pentru fiecare oraș din Gazetteer 2025 (fără CDP-uri): slug, GEOID, legătura Wikidata (prin GNIS), punctul GNIS. Păstrează ce e ales manual (poză, repere). Excepțiile (Emeryville, Santa Rosa) într-un fișier `_overrides.json` |
| `fetch-census.js <state>` | Recensământ 2020 + ACS (cu cheia din `.env`), estimări 2025 și Gazetteer 2020/2025 (fără cheie) |
| `fetch-elevation.js <state>` | Altitudinea punctului GNIS (USGS 3DEP), cu pauză între cereri |
| `fetch-timezone.js <state>` | Fusul orar al punctului (descarcă o dată limitele, ~52 MB, în `tmp/`, necomis) |
| `fetch-climate.js <state>` | Pentru fiecare oraș: stațiile NOAA în ordinea distanței, prima cu normale complete (max., min., precipitații, 12 luni); fișierele NOAA descărcate se păstrează în `tmp/` |
| `build-cities.js <state>` | Unește totul în `data/cities/<state>/<slug>.json`, calculează valorile „computed", verifică (ex. populație > 0, densitate plauzibilă, toate orașele prezente) |
| existente | `fetch-boundary.js`, `fetch-photos.js`, `build-index.js` rulate pentru toate orașele |

Cheia Census: îți arăt cum creezi fișierul `.env` (o singură linie `CENSUS_API_KEY=...`). Un test verifică că `.env` e ignorat de git.

## 3. Pagina orașului

- **Rândul de cifre (KPI)**: populație (estimare 2025, cu recensământul 2020 sub ea), uscat, densitate, altitudine, fus orar; în unitatea aleasă (US/Metric).
- **Ceasul local** în hero merge (fusul orar e cunoscut).
- **Proveniență la un clic**: fiecare cifră are eticheta `sourced` / `computed`; la clic se deschide un mic panou cu sursa, perioada, formula și valorile de intrare.
- **People & economy**: cele 6 cifre ACS cu marja de eroare, schimbarea populației 2020→2025.
- **Climate**: grafic lunar (max./min. și precipitații, comutator), rezumat anual, stația și distanța ei.
- **Data & sources**: toate sursele de mai sus + eventualele conflicte.
- Orașele fără poză aleasă au imaginea din Wikidata; fără nicio imagine → panoul de rezervă. Fără limită sau fără date → „Not available yet" cu motivul.

## 4. Pagina de start

Cu 483 de orașe, cardurile pentru toate ar fi prea multe: **cele mai mari 12 orașe** ca și carduri (după estimarea 2025) + **lista completă A–Z** cu linkuri. Căutarea vine în Etapa 3.

## 5. Pozele principale

`suggest-hero.js` pentru toate orașele → aleg pentru cele cu candidate Featured/Quality (de obicei cele mari) → îți arăt grupuri de câte ~20, cu o pagină de previzualizare locală, înainte de commit → restul primesc automat imaginea Wikidata. Îți semnalez pozele deosebite.

## 6. Teste

Fiecare funcție pură: slug din nume (cu diacritice, ex. „La Cañada Flintridge"), potrivirea GNIS–Wikidata, citirea fișierelor Census/NOAA (date de test), calculele (densitate, schimbare, anuale, distanță), alegerea stației, reguli de fiabilitate ACS, fus orar (punct în poligon). Pe fișierele din `data/`: fiecare oraș are toate cheile, fiecare cifră are nivel și sursă/formulă, nicio valoare computed fără intrări, densitatea folosește uscatul din același an.

## 7. Ce NU intră în Etapa 2

Căutare și comparații (Etapa 3); transport, locuri, repere pentru alte orașe decât SF (Etapa 4); cartiere, istorie (Etapa 5); populația metropolitană; recordurile de temperatură; intervalul de altitudine (min.–max. în limitele orașului); pagini pre-generate pentru SEO (Etapa 6).

## 8. Riscuri

- ACS pentru orașe foarte mici are marje mari: le marcăm, nu le ascundem.
- Unele orașe pot fi departe de o stație NOAA completă: afișăm distanța și avertismentul.
- Limitele pentru 483 de orașe adaugă câțiva MB în repo; le păstrăm generalizate (500K).
- Alegerea pozelor pentru orașele mari ia timp; o fac în grupuri, nu blochează restul etapei.
