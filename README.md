# Vern
An app that monitors customers’ prices with competing providers and highlights the value of benefits beyond price to strengthen customer loyalty and reduce churn.

## Run locally

Install Node.js and the Azure CLI, then sign in with an account that has access to the Azure OpenAI deployment:

```sh
npm install
az login
npm run dev
```

Open the Vite URL printed in the terminal. The local API uses Azure CLI credentials on the server and listens on `127.0.0.1:3001`; Vite proxies chat requests to it. The configured deployment is `gpt-6-luna` at `https://genai.gjensidige.io`.

Run `npm test` for the local API test and `npm run build` to type-check and build the frontend. The Vite preview server does not run or proxy the API; use `npm run dev` for local chat.

## Forsikringsdokumenter

I onboardingens steg 2 laster kunden opp forsikringsdokumentet sitt (PDF). `POST /api/documents/analyze?filnavn=…` med PDF-en som body (`Content-Type: application/pdf`, maks 15 MB):

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

Datasettet inneholder BI-tall for kundetilfredshet og lojalitet for Gjensidige, If, Tryg og Fremtind, utvalgte klage- og utfallstall fra Finansklagenemnda samt finansielle nøkkeltall fra Fremtind. Finansklagenemnda, EPSI, Finansportalen og andre årsrapporter er dokumentert som kilder, men ikke integrert som automatiske datafeeds. Pris, individuelle kundebehov, klageårsaker og øvrige manglende opplysninger er ikke estimert. Kontroller kildene manuelt før tallene brukes som beslutningsgrunnlag.
