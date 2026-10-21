# Etapa 0 — plan

Stare: **aprobat de proprietar pe 21 octombrie 2026**. Branch: `feature/stage-0`.

Decizii luate la aprobare:
- Font: **Plus Jakarta Sans** (+ JetBrains Mono pentru cifre-cod), găzduite local.
- Unități: **americane implicit**, comutator spre metric.
- Site Netlify: `city-explorer-pro`.

Scop (din `DEVELOPMENT_PLAN.md`): repo, Netlify, structura de fișiere, fonturi locale, tokenurile de design din prototip, i18n (engleză), teste. Rezultat vizibil: un site gol, cu designul de bază, care răspunde la adresa `/city/ca/san-francisco`.

## 1. Structura de foldere

```
/
├─ index.html                 pagina de start (gol: titlu + căutare dezactivată)
├─ city.html                  un singur șablon pentru toate orașele
├─ styles.css                 tokenuri (temă deschisă/închisă) + stiluri de bază
├─ js/                        module ES, fără build
│  ├─ app.js                  pornire: temă, unități, încărcare i18n
│  ├─ route.js                citește /city/<stat>/<slug> din adresă (funcție pură)
│  ├─ i18n.js                 t("cheie"), umple elementele cu data-i18n
│  ├─ units.js                conversii și formatare cu Intl (funcții pure)
│  ├─ theme.js                comutator luminos/închis
│  └─ components/             bara laterală, hero, tab-uri, carduri (câte un fișier)
├─ i18n/en.json               tot textul interfeței
├─ fonts/                     fișiere .woff2 + licențele lor
├─ data/                      va conține datele pregătite offline (în etapa 0: doar `data/README.md`)
├─ scripts/                   scripturi offline pentru date (în etapa 0: gol, cu README)
├─ netlify/functions/         funcții server (în etapa 0: gol, cu README)
├─ tests/                     `node --test`
├─ netlify.toml               publicare + rescrieri de adrese
├─ package.json               doar `"test": "node --test"`; fără dependențe
├─ DATA-LICENSES.md           registrul surselor (în etapa 0: fonturile)
└─ CHANGELOG.md               + versiunea (0.1.0)
```

**De ce:** exact stilul din Airport Live și FOS: fișiere simple, publicate direct din rădăcină, fără bundler. Un singur `city.html` pentru toate orașele, pentru că starea (California, apoi alte state) este **date**, nu cod (regula din AGENTS.md). Funcțiile pure (`route`, `units`, `i18n`) sunt separate de pagină ca să poată fi testate cu `node --test`.

## 2. Cum ajunge `/city/ca/san-francisco` la pagină, fără build

Nu există un fișier `city/ca/san-francisco.html`. În `netlify.toml` punem o **rescriere** (status 200, nu redirecționare, deci adresa din bară rămâne aceeași):

```toml
[build]
  publish = "."

[[redirects]]
  from = "/city/:state/:slug"
  to = "/city.html"
  status = 200
```

`city.html` rulează `route.js`, care citește `location.pathname` și scoate `ca` și `san-francisco`. În etapa 0 pagina doar afișează aceste două valori în hero (titlu provizoriu din slug) și "Not available yet" la cifre. În etapa 2 aceeași cale va încărca `data/cities/ca/san-francisco.json`.

Adrese invalide (`/city/xx/nimic`) primesc o pagină „City not found" cu link spre start (în etapa 0 orice slug valid ca format e acceptat; verificarea față de date vine cu datele). Pe `localhost` fără Netlify, rescrierea nu există; o testez cu `netlify dev` dacă îl ai instalat, altfel doar pe Deploy Preview (o să spun clar ce a fost testat unde).

## 3. Ce iau din prototip și ce rescriu

**Iau (aproape neschimbat):**
- **Tokenurile de culoare**, temă deschisă și închisă (`--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--side`, `--accent`, `--accent-soft`, culorile semantice, raza `--r`). Păstrez mecanismul: temă după sistem + suprascriere cu `data-theme`.
- **Bara laterală** întunecată, sticky pe desktop, rând orizontal pe telefon.
- **Hero**: imagine mare cu gradient, titlu mare, fragmente de context, cardul cu ora locală.
- **Rândul de KPI**, **cardurile** de repere, **tab-urile** sticky, panourile cu eticheta de proveniență (`sourced` / `computed` / `estimated`).
- Marginile de siguranță pentru telefon (`safe-area`), `prefers-reduced-motion`, punctele de rupere 1180/960/560 px.

**Rescriu, și de ce:**
| Din prototip | Ce fac | De ce |
|---|---|---|
| Fonturi de la Google Fonts | fonturi locale | regulă: găzduite local, cu licență |
| Tot textul scris în HTML și JS | `i18n/en.json` + `data-i18n` | regulă: componentele nu conțin text |
| Lista de orașe în bară și în `datalist` | dispare; căutarea apare în etapa 3 | regulă: fără liste codate în UI |
| Desene SVG în hero și carduri | panou de rezervă stilizat („fallback") pentru fotografie | fără imagini AI; fotografiile Commons vin în etapa 1 |
| Cifre (873.965, 7.190/km², 21,2 °C…) | **nu se copiază**; câmpuri goale cu „Not available yet" + motiv | regula despre proveniență și macheta greșită (densitate cu suprafața totală) |
| Script inline în HTML | module ES în `js/` | testabil, fără cod în pagină |
| Stiluri `style="…"` inline | clase în `styles.css` | consecvență |
| Doar temă după sistem + buton | același buton, dar alegerea se păstrează (localStorage) | UX; funcționează și fără localStorage |
| Culori de text mici (`.tag`, `.muted`) | verificate la contrast ≥ 4,5:1 (test automat) | regulă de accesibilitate; unele culori din prototip (verde/chihlimbar pe alb) probabil nu trec și le ajustez |
| Etichete `schematic` pentru hartă | nu intră (harta e în etapa 1) | |

Ce NU am putut verifica încă: restul scriptului din prototip (după linia 400) l-am citit doar parțial; nu depinde nimic din etapa 0 de el, dar îl citesc complet înainte să scriu componentele.

## 4. Fonturi găzduite local

Ambele sunt sub licența SIL OFL (permit găzduirea proprie; licența se pune în `fonts/`). În ambele variante păstrez **JetBrains Mono** (OFL) pentru ceas, etichete și cifre-cod, ca în prototip.

- **Varianta A — Plus Jakarta Sans** (ca prototipul): aspectul machetei, titlul mare de 84 px cu litere rotunjite arată exact ca în design. Mai puțin „tehnic" decât celelalte proiecte ale tale. 5 greutăți (400–800) ≈ 5 fișiere woff2 subset latin, ~15–25 KB fiecare.
- **Varianta B — Inter** (ca Airport Live, FOS): același aspect în toate proiectele, cifre tabulare excelente (importante pentru tabele de comparație). Titlurile devin vizibil mai sobre decât în prototip; trebuie să re-verific hero-ul.

**Recomand A (Plus Jakarta Sans)**: designul a fost gândit cu ea, iar produsul e vizual (hero, carduri); cifrele rămân curate cu `font-variant-numeric: tabular-nums`, pe care Plus Jakarta Sans îl suportă. Dacă preferi unitate între proiecte, B e la fel de sigură tehnic.

Sursa fișierelor: depozitele oficiale (Google Fonts / GitHub-ul autorilor), descărcate o dată și commit-ate, **fără dependență npm**; sursa și licența intră în `DATA-LICENSES.md`. Subset latin + `font-display: swap`.

## 5. Unități implicite și comutator

- **Opțiunea 1 (recomandată): americane implicit** (mi², °F, ft, $), comutator spre metric (km², °C, m). Publicul e american, iar AGENTS.md spune că implicit e convenția orașului. Comutatorul stă lângă butonul de temă.
- **Opțiunea 2: metrice implicit**, comutator spre americane. Consecvent cu faptul că datele sunt științifice, dar pentru un american cifra „121,5 km²" e mai greu de citit.
- **Opțiunea 3: ambele afișate** (ex. „46.9 mi² / 121.5 km²"). Rezolvă întrebarea, dar încarcă rândul de KPI și tabelele pe telefon. Nu o recomand ca regulă generală.

Detalii tehnice (valabile pentru oricare opțiune):
- Datele se păstrează în unitatea sursei (Census dă mile pătrate); valoarea convertită este `computed` și își arată formula (1 mi² = 2,589988 km²).
- Alegerea se păstrează în `localStorage` (cu try/catch); implicit după `lang`/regiune nu ghicim, ci folosim opțiunea de mai sus.
- Formatarea numai prin `Intl.NumberFormat`; conversia în `units.js`, funcții pure.
- Un rând de comparație nu amestecă niciodată unități sau valute diferite.

## 6. Teste în etapa 0 (`node --test`)

1. `route.js`: `/city/ca/san-francisco` → `{state:"ca", slug:"san-francisco"}`; slash final, majuscule, adrese greșite, caractere ciudate.
2. `units.js`: conversii mi²↔km², °F↔°C, ft↔m (valori de referință), rotunjire, formatare `Intl` pentru en-US; `null` → „Not available yet", nu 0.
3. `i18n`: toate cheile folosite în HTML/JS există în `en.json`, nu sunt chei neutilizate, JSON valid; nicio literă de text vizibil direct în componente (verificare simplă cu regex pe `js/` și HTML).
4. `netlify.toml`: conține rescrierea `/city/:state/:slug` → `/city.html` cu status 200 (test de configurare).
5. Tokenuri: contrast ≥ 4,5:1 pentru perechile text/fundal în temă deschisă **și** închisă, citite din `styles.css`.
6. Fonturi: fiecare `@font-face` indică un fișier existent, există fișierul de licență, fiecare font apare în `DATA-LICENSES.md`.
7. Fișiere HTML: `lang`, `viewport`, fără `http(s)://` către CDN/fonturi externe în `index.html`/`city.html`/`styles.css`.

Verificări manuale (nu automate, le raportez separat): 400 px fără scroll orizontal, navigare cu tastatura, temă luminoasă/închisă, `prefers-reduced-motion`, cum arată pe Deploy Preview.

## 7. Ce NU intră în etapa 0

- Date reale ale orașelor (Census, NOAA), orice cifră afișată; modelul de date (etapa 2).
- Fotografii Wikimedia, hartă MapLibre/OpenFreeMap, vreme live (etapa 1).
- Căutare, comparații, „City DNA", liste salvate (etapa 3).
- Transport, locuri, cartiere, istorie (etapele 4–5).
- Funcții Netlify cu cod (doar folderul), scripturi de date (doar folderul).
- SEO/pre-generare, PWA (etapa 6); conturi, rapoarte, plăți.
- Alt limbaj decât engleza (infrastructura i18n e gata, traducerile nu).

## Ce îmi trebuie de la tine

1. **Fontul:** A (Plus Jakarta Sans, recomandat) sau B (Inter)?
2. **Unitățile:** opțiunea 1 (americane implicit, recomandat), 2 sau 3?
3. **Netlify:** ai deja un site Netlify legat de acest repo GitHub? Fără el nu pot da un link de Deploy Preview; dacă nu, trebuie să-l legi tu (nu pot crea eu conturi) și îți explic pașii.
4. Aprobi lista de teste și limitele etapei?

Fără răspuns la 1–2, aș alege A și 1 (sunt reversibile), dar prefer să confirmi.
