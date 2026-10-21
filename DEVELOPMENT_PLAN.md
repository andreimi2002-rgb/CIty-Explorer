# City Explorer — plan de dezvoltare

Creat: 21 octombrie 2026. Documentul de referință pentru ordinea etapelor. Regulile permanente sunt în [AGENTS.md](AGENTS.md).

## Scopul

O enciclopedie vizuală a orașelor: o pagină pe oraș cu populație, geografie, climă, transport, locuri, istorie și comparații. Fiecare cifră are sursă, an și definiție. Arată ca macheta de la ChatGPT, dar cu date reale.

- **Primul scop:** orașele din California (cele ~480 de „incorporated places” din Census).
- **Mai târziu:** alte state, ca pachete de date.
- **Lansarea publică:** pe termen lung. Până atunci se adaugă state și funcții.

## Ce deosebește produsul de alte site-uri cu orașe

1. **Comparabilitate.** Aceleași definiții pentru toate orașele: limitele orașului, suprafața de uscat, aceeași perioadă. Populația metropolitană e separată și nu se amestecă cu cea a orașului.
2. **Proveniență pe fiecare cifră.** Sursa, anul și formula se văd la un clic, ca în FOS.
3. **Design de calitate,** în stilul prototipului.

## Etape

Fiecare etapă: plan scris în `docs/`, aprobarea proprietarului, un branch și un PR, Deploy Preview verificat pe desktop și pe telefon, merge doar cu aprobare.

| Etapa | Conținut | Rezultat vizibil |
|---|---|---|
| **0** | Repo, Netlify, structura de fișiere, fonturi găzduite local, tokenurile de design din prototip, i18n (engleză), teste | Site gol cu designul de bază |
| **1** | San Francisco ca în poză: fotografii Wikimedia Commons, hartă MapLibre + OpenFreeMap cu limita orașului, vreme live MET Norway | **Pagina SF arată ca macheta, cu date reale** |
| **2** | Modelul de date al orașului (fapte cu proveniență) și scripturile offline: Census (populație, suprafață, ACS), NOAA (normale climatice, stația cea mai apropiată, cu distanța afișată), fotografii pentru toate orașele | Toate orașele din California au pagină de bază |
| **3** | Căutare (`/`, Ctrl+K), comparație cu orice oraș, „City DNA”, liste salvate local | Comparații între oricare orașe |
| **4** | Transport din GTFS-urile agențiilor (BART, Muni, LA Metro, Caltrain, San Diego MTS…), aeroporturi (din datele Airport Live), locuri importante din OSM + Wikidata cu fotografii | Secțiunile Transport și Locuri |
| **5** | Cartiere (limite din datele deschise ale orașelor, de ex. DataSF), istorie (Wikipedia, cu atribuire), relief și ape | Secțiunile Cartiere și Istorie |
| **6** | Pagini pre-generate pentru motoarele de căutare (SEO), PWA, performanță | Site gata de indexat |
| **Pachete de stat** | Al doilea stat ales de proprietar; doar date, fără cod nou | |
| **Mai târziu** | Conturi, rapoarte PDF, export de date, planuri plătite | Monetizare |

## Ce are pagina unui oraș (ținta, după macheta)

Bară laterală cu secțiunile, căutare sus, imagine mare cu numele orașului, ora locală și vremea, rândul de cifre principale (populație, suprafață, densitate, altitudine, fus orar), carduri cu repere, hartă cu locuri, populație și economie, climă cu grafic, transport, istorie, comparație și „Data & sources”.

## Reguli pentru machete

- Macheta de la ChatGPT e **inspirație** pentru aspect, nu specificație.
- Cifrele din machetă **nu se copiază**: unele sunt greșite. Densitatea e calculată cu suprafața care include apa, iar venituri în valute diferite apar pe același rând.
- Pozele din machetă sunt generate cu AI și nu se folosesc.

## Decizii deschise (se iau la etapa la care apar)

- **Fontul:** Plus Jakarta Sans, din prototip, sau Inter, ca în Airport Live și FOS (etapa 0).
- **Unitățile implicite:** americane, cu comutator spre metric, sau invers (etapa 0).
- **Ordinea surselor de transport** și licența fiecărui GTFS (etapa 4).
- **Al doilea stat** (după etapa 6).
