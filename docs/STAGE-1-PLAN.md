# Etapa 1 — plan

Stare: **de aprobat de proprietar**. Branch: `feature/stage-1`. Versiune țintă: 0.2.0.

Scop (din `DEVELOPMENT_PLAN.md`, cu decizia din 21 octombrie 2026): pagina San Francisco primește **poze reale, hartă și vreme live**. Cifrele (populație, suprafață, climă, fus orar) rămân „Not available yet" și vin în Etapa 2.

## Decizii deja luate (21 octombrie 2026)

| Subiect | Decizie |
|---|---|
| Ordinea etapelor | Etapa 1 = poze, hartă, vreme; cifrele în Etapa 2 |
| MapLibre | **6.13.0**, găzduit local în `vendor/` (licență BSD-3) |
| Poze | încărcate **direct de pe Wikimedia** (miniaturi), verificate offline de script |
| Poza principală (hero) | **cea mai bună poză cu downtown-ul orașului**: scriptul propune candidate clasate, un om alege (detalii la 1c) |
| Hero SF | „San Francisco from Twin Peaks September 2013 panorama 5 edit.jpg" (Featured picture, 7800×3250, CC BY-SA 3.0, King of Hearts) |
| Carduri SF | **4 repere**: Golden Gate Bridge, Alcatraz Island, cable cars, Bay Bridge |
| Contact MET Norway | `CityExplorer/0.2 city-explorer-pro.netlify.app github.com/andreimi2002-rgb/CIty-Explorer` (fără email) |

Toate sursele au fost verificate pe 21 octombrie 2026 (răspund, au licența de mai jos).

## 1. Date pregătite offline (scripturi noi)

Nicio listă de orașe în cod. Ce oraș primește ce date stă într-un fișier de **curare** (date, nu cod):

```
data/curation/ca/san-francisco.json
{ "geoid": "0667000", "wikidata": "Q62",
  "hero": { "file": "San Francisco from Twin Peaks September 2013 panorama 5 edit.jpg",
            "focus": [0.45, 0.5], "chosenBy": "owner", "chosenOn": "2026-10-21" },
  "highlights": ["Q44440", "Q131354", "Q374956", "Q771404"] }
```

`focus` = punctul care trebuie să rămână vizibil când poza se decupează (pe telefon hero-ul e aproape pătrat): x și y între 0 și 1.

Identificatori exacți, nu căutare după nume: la cercetare, căutarea „Painted Ladies" a întors un episod de serial.

### a) `scripts/fetch-boundary.js <state>` — limita orașului
- Sursa: U.S. Census Bureau, **TIGERweb Generalized ACS2025, stratul „Incorporated Places 500K"** (vintage 1 ianuarie 2025), GeoJSON. Domeniu public.
- De ce această variantă: limita legală completă a SF include apa din golf și ajunge la 40 km în ocean; varianta „500K" e **tăiată la țărm** (verificat: 6 poligoane, 168 de puncte: orașul, Treasure Island, Alcatraz, Farallon).
- Scrie `data/boundaries/ca/san-francisco.geojson` cu: GEOID, numele oficial Census (`BASENAME` = „San Francisco"), punctul intern Census (lat/lon), vintage, URL, data descărcării.
- **Refuză să scrie** dacă: lipsește geometria, GEOID nu corespunde, coordonatele ies din California, punctul intern nu e în limita orașului, prea puține puncte.

### b) `scripts/fetch-photos.js <state>` — poze și descrieri
- Wikidata (CC0): imaginea principală (P18), eticheta și descrierea scurtă a orașului și a celor 4 repere, coordonatele reperelor (P625).
- Wikimedia Commons: pentru fiecare fișier: autor, licență, link spre pagina fișierului, miniatură 1920 px (hero) și 960 px (carduri).
- **Refuză** fișierul dacă: licența nu e CC0 / domeniu public / CC BY / CC BY-SA; e în categorii de hărți, steaguri, steme, logouri, colaje; nu e JPEG/PNG/WebP; linkul miniaturii nu răspunde 200 cu o imagine.
- Scrie `data/photos/ca/san-francisco.json`.
- Respectă regulile Wikimedia: User-Agent cu contact, cereri una câte una, cu pauză.

- Poza hero vine din câmpul `hero.file` al fișierului de curare (trece aceleași verificări de licență); dacă lipsește, se folosește imaginea Wikidata (P18).

### c) `scripts/suggest-hero.js <state> <slug>` — candidate pentru poza principală
- Caută pe Commons în categoriile de skyline și downtown ale orașului (ex. „San Francisco skylines", „Downtown <oraș>", „Skylines of <oraș>"; numele categoriilor vin din Commons, nu din cod).
- Păstrează doar poze orizontale, de cel puțin 2400 px lățime, cu licență permisă și fără categoriile excluse.
- Clasează: **Featured picture > Quality image > Valued image > restul**, apoi rezoluție, apoi an (mai nouă e mai bună).
- Scrie o pagină de previzualizare locală (miniaturi + autor + licență + link) cu primele candidate. Un om alege și trece fișierul + `focus` în fișierul de curare. Scriptul **nu scrie singur** în curare.
- Fără nicio candidată → rămâne imaginea Wikidata; dacă nici aceea nu există → panoul de rezervă.
- Pentru SF a fost rulat manual la cercetare: 5 Featured + 16 Quality în „San Francisco skylines"; proprietarul a ales Twin Peaks 2013.

Rezultatul curent verificat: Golden Gate Bridge (CC BY 2.5, Rich Niewiroski Jr.), Alcatraz (CC BY-SA 4.0, Frank Schulenburg), cable car pe Hyde Street (CC BY-SA 4.0, 2023), Bay Bridge (CC BY-SA 3.0, Frank Schulenburg); hero: Twin Peaks 2013 (CC BY-SA 3.0, King of Hearts, Featured picture).

## 2. Pagina orașului

- **Numele**: hero afișează numele oficial Census (sursă: TIGERweb) în locul numelui din adresă; nota „nume din adresă" dispare când există date. Orașele fără date rămân ca în Etapa 0.
- **Hero**: poza mare aleasă (downtown), decupată în jurul punctului `focus`, cu linie de credit vizibilă: „Photo: autor · licență · Wikimedia Commons" (link). Dacă poza nu se încarcă → panoul de rezervă din Etapa 0.
- **Carduri**: poza (încărcare amânată, „lazy"), numele și descrierea din Wikidata, credit. Fără cifre.
- **Harta** (secțiunea Map):
  - MapLibre 6.13.0 local + stiluri OpenFreeMap: **„liberty"** (temă deschisă, cel mai aproape de prototip) și **„dark"** (temă închisă); se schimbă odată cu tema.
  - Limita orașului (linie + umplere ușoară), cadrată pe poligonul principal (altfel Insulele Farallon micșorează orașul).
  - Cele 4 repere ca puncte numerotate, legate de carduri.
  - Pe telefon: harta se mișcă doar cu două degete (pagina se derulează normal cu unul).
  - Se încarcă abia când secțiunea se apropie de ecran (pagina rămâne rapidă).
  - Atribuire vizibilă: OpenFreeMap, OpenMapTiles, © OpenStreetMap contributors.
  - Fără WebGL → mesaj „Map not available on this device".
- **Vremea live** (cardul din hero):
  - Funcție Netlify `netlify/functions/weather.js` (`/api/weather?lat=…&lon=…`) care cere MET Norway Locationforecast 2.0 *compact* cu User-Agent-ul de mai sus, coordonate cu max. 4 zecimale (cerința MET).
  - Cache: răspunsul păstrat pe CDN-ul Netlify până la ora „Expires" dată de MET (~30 min), deci MET primește puține cereri.
  - Afișează: temperatura acum, iconița de vreme (setul oficial MET, licență MIT, găzduit local), vânt, precipitații în ora următoare, „updated N min ago".
  - Unități: °F și mph implicit, °C și km/h la Metric. Valorile convertite sunt marcate „computed".
  - Punctul: punctul intern Census al orașului (afișat în nota cardului).
  - Eroare / MET indisponibil → „Live weather is unavailable right now" + motivul.
  - Ora locală rămâne „Not available yet" (fusul orar vine cu datele din Etapa 2).
- **Data & sources**: lista generată din fișierele de date: limita Census, fiecare poză (autor, licență, link), Wikidata, OpenFreeMap/OpenStreetMap, MET Norway.

## 3. Reparație mică din Etapa 0

Adresele cu `/City/...` (majusculă) dau 404 și pe Netlify (verificat). Adaug `404.html`: dacă adresa scrisă cu litere mici e o pagină de oraș, redirecționează acolo; altfel arată „Page not found".

## 4. Fișiere noi / modificate (pe scurt)

`vendor/maplibre-gl-6.13.0/` (js, css, LICENSE), `icons/weather/` (SVG MET + LICENSE), `data/curation/`, `data/boundaries/`, `data/photos/`, `scripts/fetch-boundary.js`, `scripts/fetch-photos.js`, `scripts/suggest-hero.js`, `scripts/lib/` (funcții pure), `netlify/functions/weather.js`, `js/components/map.js`, `js/components/weather.js`, `js/components/photo.js`, `js/components/sources.js`, `404.html`, `i18n/en.json`, `DATA-LICENSES.md`, `CHANGELOG.md` (0.2.0).

## 5. Teste noi (`node --test`, fără internet)

1. Limită: validare (GEOID, California, punct intern în poligon, nr. puncte), rotunjire coordonate, alegerea poligonului principal pentru cadrare — pe date de test.
2. Poze: lista de licențe permise/refuzate, categorii excluse, curățarea autorului din HTML, construirea creditului; clasamentul candidatelor hero (Featured > Quality > Valued, lățime minimă, orientare); `focus` valid (0–1).
3. Funcția de vreme: validarea lat/lon, extragerea datelor din răspunsul MET (salvat ca exemplu), antetul de cache din „Expires", erori MET (500, timeout).
4. Unități: viteză (m/s → mph, km/h).
5. Fișierele din `data/`: fiecare poză are autor, licență permisă, link Commons, miniatură pe domeniul Wikimedia; fiecare limită e validă; fiecare fișier de curare are limita și pozele generate.
6. Fiecare cod de vreme MET are iconiță și text i18n.
7. Testele existente rămân: niciun text direct în componente, contrast, fără resurse externe — cu excepții explicite doar pentru OpenFreeMap, Wikimedia și `/api/weather`.

Verificări manuale: Deploy Preview pe desktop și telefon (lista o dau la PR).

## 6. Ce NU intră în Etapa 1

- Cifre Census/ACS, normale climatice NOAA, fus orar și ceas (Etapa 2).
- Date pentru alte orașe decât SF (scripturile sunt generale, dar rulăm doar SF; restul în Etapa 2).
- Lista completă de locuri, cartiere, stații BART pe hartă (Etapele 4–5).
- Strat satelit (nu până la verificarea licenței NAIP).
- Căutare, comparații (Etapa 3).

## 7. Riscuri cunoscute

- Wikimedia poate schimba adresele miniaturilor (am văzut deja domeniul `thumb.wikimedia.org`); scriptul le reverifică la fiecare rulare, iar pagina are panoul de rezervă.
- OpenFreeMap e un serviciu gratuit fără garanții; dacă pică, harta arată mesajul de eroare, restul paginii merge.
- MapLibre are ~1 MB; de aceea se încarcă doar la apropierea de secțiunea hărții.
