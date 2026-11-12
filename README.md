# Vern
An app that monitors customers’ prices with competing providers and highlights the value of benefits beyond price to strengthen customer loyalty and reduce churn.

## Run locally

Install Node.js 22.12 or newer (Vite 8 and its native bindings need it; with an older Node, npm silently skips the bindings and `vite` fails with "Cannot find native binding"). Put an Anthropic API key in `.env.local`, which Git ignores:

```sh
echo 'ANTHROPIC_API_KEY=sk-ant-…' > .env.local
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The local API listens on `127.0.0.1:3001`; Vite proxies API requests to it. The API calls Claude Opus 5.5 (`claude-opus-5-5`) through LangChain's Anthropic integration (`ChatAnthropic` from `@langchain/anthropic`), with low effort to keep waits short and structured outputs for the JSON answers. If Claude declines a request, the API's server-side fallback re-runs it on another model. A key already in the environment overrides `.env.local`.

## DigiU profile

Customers can bring their DigiU profile instead of starting from scratch. DigiU sends it as a Persona Pass (format `persona-pass/v1`): the traits the customer chose to share there, such as "You have a dog" or "You recently moved", most important first. It contains no evidence, sources or raw data.

DigiU links to `/persona#pass=<base64url JSON>`. The pass is in the URL fragment, which browsers never send to a server; the page removes it from the address bar once read, shows what was shared and asks before using it. Then:

1. `POST /api/persona/value-profile` asks Claude to answer the four value-profile questions from the traits, with a reason for each. Questions the traits say nothing about are left for the customer. The flow shows each suggestion and its reason, and the customer can change any answer.
2. The pass is saved with the profile (`persona` in `data/profile.json`) and added to the recommendation prompt, so each pick explains why it fits beyond price.
3. `/vern` also lists up to three insurances the customer seems to lack (`gaps`). Each must be a catalogue product the customer doesn't already have and must quote a trait the customer actually shared; the server drops any that don't.
4. **Slutt å dele** on `/profil` deletes the pass. Recommendations stop using it.

The contract is in `src/persona/pass.ts`.

Run `npm test` for the tests and `npm run build` to type-check and build the frontend. The Vite preview server does not run or proxy the API; use `npm run dev` for local recommendations.

When the user enters Vern, recommendations are generated automatically using the saved profile and insurance data. While that page is open, it checks the profile approximately every two seconds and regenerates results when the profile changes. Prices, policies, and match scores are simulated; if the model cannot make a selection, the current demo policy is shown as an explicitly labeled fallback.

## Forsikringsdokumenter

I onboardingens steg 2 laster kunden opp forsikringsdokumentet sitt (PDF). `POST /api/documents/analyze?filnavn=…` med PDF-en som body (`Content-Type: application/pdf`, maks 15 MB):

1. henter ut teksten med `unpdf` (skannede PDF-er uten tekstlag avvises med 422),
2. sender de kundespesifikke sidene (oversikt, forsikringsbevis, priser, egenandeler) til Claude (`claude-opus-5-5`),
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
