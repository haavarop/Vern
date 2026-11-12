# Vern
An app that monitors customers’ prices with competing providers and highlights the value of benefits beyond price to strengthen customer loyalty and reduce churn.

## Run locally

Install Node.js and the Azure CLI, then sign in with an account that has access to the Azure OpenAI deployment:

```sh
npm install
az login
npm run dev
```

Open the Vite URL printed in the terminal. The local API uses Azure CLI credentials on the server and listens on `127.0.0.1:3001`; Vite proxies API requests to it. The configured deployment is `gpt-6-luna` at `https://genai.gjensidige.io`.

Run `npm test` for the tests and `npm run build` to type-check and build the frontend. The Vite preview server does not run or proxy the API; use `npm run dev` for local recommendations.

When the user enters Vern, recommendations are generated automatically using the saved profile and insurance data. While that page is open, it checks the profile approximately every two seconds and regenerates results when the profile changes. Prices, policies, and match scores are simulated; if the model cannot make a selection, the current demo policy is shown as an explicitly labeled fallback.

## Kundereisen

Nye kunder starter på landingssiden (`/start`) og går gjennom:

1. **Om deg** (`/om-deg`): alder, jobb, barn og hva de vil forsikre. Alle spørsmålene er valgfrie, og hele siden kan hoppes over.
2. **Har du noen forsikringer i dag?** Ja → «Skal vi sjekke om de passer deg?». Ja til sjekk → **Før vi starter** (`/forbered`), som forklarer hvorfor vi spør og ber kunden ha forsikringsbeviset klart. Nei (eller nei til sjekk) → «Skal vi finne en ny match til deg?».
3. **Verdiprofil** (`/verdiprofil/:spm`).
4. Kun når kunden vil sjekke forsikringene sine (`journey: "sjekk"`): **last opp forsikringsbevis** (`/forsikringer`).
5. **Profilen din** (`/profil`) → `/vern`. Har kunden lagt inn forsikringer, vises **Forslagene dine**: øverst står det tydelig om Vern anbefaler endringer eller ikke, deretter forslagene per forsikring og til slutt hvordan alle selskapene matcher. Uten forsikringer vises **Matchen din**. Ved «sjekk» vises først hvordan dagens forsikringer matcher, deretter andre selskaper. Gamle lenker til `/matcher` sendes videre til `/vern`.
6. **Ring meg**: hver av de tre beste matchene på «Matchen din» har en «Ring meg»-knapp (ikke for selskaper kunden allerede er kunde hos). Knappen åpner telefonskjemaet (`/ring-meg/:selskap`). Forespørselen lagres i profilen, men sendes ikke til selskapet (demo).

«Om deg», valgt kundereise og ringeforespørsler lagres i `data/profile.json` (`aboutYou`, `journey`, `callbacks`). «Om deg» og kundereisen sendes også med som kontekst til anbefalingene.

## Forsikringsdokumenter

I onboardingens opplastingssteg laster kunden opp forsikringsdokumentet sitt (PDF). `POST /api/documents/analyze?filnavn=…` med PDF-en som body (`Content-Type: application/pdf`, maks 15 MB):

1. henter ut teksten med `unpdf` (skannede PDF-er uten tekstlag avvises med 422),
2. sender de kundespesifikke sidene (oversikt, forsikringsbevis, priser, egenandeler) til `gpt-6-luna`,
3. validerer svaret i `document-analysis.ts` og returnerer `{ policies, warnings }` i samme format som `insurances` i profilen.

PDF-en lagres ikke, og navn/adresse tas ikke med. Kunden ser resultatet og bekrefter før det lagres i `data/profile.json`. Priser hos andre selskaper er fortsatt simulerte (`mockPolicies.ts`).

## Forsikringsdata

Hent rådataene som JSON fra `/api/insurance-data`, eller skriv dem til `insurance-data-fetched.json` med:

```sh
npx tsx insurance-data.ts
```

Filen `insurance-data.json` inneholder separate kategorier med dokumenterte selskapsscorer og kan redigeres manuelt uten å bli overskrevet av rådataeksporten. BI-tall for 2026 og Fremtinds publiserte nøkkeltall hentes fra nettsidene ved hver forespørsel eller eksport. `dataStatus` angir om hver observasjon ble hentet på nytt (`refreshed`) eller kommer fra det manuelt innhentede øyeblikksbildet fra 11. november 2026 (`snapshot`). `refresh` viser kildestatus, tidspunkt og eventuelle feil. Dersom en kilde ikke kan hentes eller formatet er endret, beholdes de merkede øyeblikksbildedataene; eksportkommandoen returnerer en feilkode. BI-kilden er foreløpig låst til 2026 og må endres manuelt for en nyere årgang.

`registry` inneholder søketreff fra Finanstilsynets API, hentetidspunkt, totalt antall treff og eventuelle feil per søk. Av de første 50 treffene vises bare selskaper med både selskapsnavnet og «forsikring» i foretaksnavnet. `total` gjelder alle ufiltrerte treff, og `truncated` viser om flere treff finnes. Treffene kan omfatte flere foretak og er ikke automatisk bekreftede selskapskoblinger. Finanstilsynet kan mellomlagre API-svar i opptil én time. Tallene er merket med kilde, periode og omfang. Finansklagenemndas bransjetall gjelder ikke enkeltselskaper.

Datasettet inneholder BI-tall for kundetilfredshet og lojalitet for Gjensidige, If, Tryg og Fremtind, EPSI Rating-scorer for 2026, utvalgte klage- og utfallstall fra Finansklagenemnda samt finansielle nøkkeltall fra Fremtind. EPSI-scorene er hentet fra den offisielle rapporten for privat- og bedriftsmarkedet; de to markedene må ikke blandes, og merkevarer knyttet til Fremtind beholdes som egne resultater. Anbefalingsmodellen er instruert til å tolke høyere EPSI-score som høyere målt kundetilfredshet og bruke den som et signal om kundeopplevelse når data finnes. EPSI, Finansklagenemnda, Finansportalen og andre årsrapporter er dokumentert som kilder, men ikke integrert som automatiske datafeeds. Pris, individuelle kundebehov, klageårsaker og øvrige manglende opplysninger er ikke estimert. Kontroller kildene manuelt før tallene brukes som beslutningsgrunnlag.

## Merkevare

`vern-brand-v2.json` er fasiten for farger, typografi, komponenter, logo og tone. Endre spesifikasjonen først, og oppdater deretter koden. Teksten i spesifikasjonen er på dansk, men all tekst i appen skrives på norsk bokmål.

Merkevaren ligger i `src/brand/`: `tokens.css` har CSS-variablene (`--vern-*`), `aksel-theme.css` overstyrer Aksel-tokenene (`--ax-*`) slik at Aksel-komponentene får Vern-uttrykket, `brand.css` har felles klasser (`.vern-card`, `.vern-choice` osv.), og `VernLogo.tsx` har symbol, ordmerke og logo med slagord. Appen har bare lyst tema.

De offisielle logofilene ligger i `public/brand/`:

- `vern-logo.svg`: symbolet, to sirkler i aprikos og mint. `public/favicon.svg` er det samme symbolet.
- `vern-logo-tagline-baggrund.svg`: navn og slagord med symbolet til høyre, kremhvit tekst på skoggrønn bakgrunn.
- `vern-logo-tagline-transparent.svg`: samme logo uten bakgrunn, med skoggrønn tekst for lyse flater.
- `apple-touch-icon.png`: symbolet på kremhvit bakgrunn, 180 × 180 piksler.

Komponentene i `src/brand/VernLogo.tsx` speiler disse filene med samme geometri, farger og skriftstørrelser: `VernSymbol` tilsvarer `vern-logo.svg`, og `VernLockup` tilsvarer logoen med slagord (`variant="onDark"` med bakgrunn eller `variant="onLight"` uten). Komponentene tegner SVG direkte i siden, slik at nettskriften General Sans brukes. En `<img>` av en SVG med tekst kan ikke bruke sidens nettskrifter. Endrer designerne logoen, oppdaterer du både filene og komponentene.
