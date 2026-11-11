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

## Forsikringsdata

Chatboten har tilgang til et manuelt innhentet øyeblikksbilde av norske forsikringsdata fra 11. november 2026 og søker i Finanstilsynets åpne virksomhetsregister når dataene hentes. Dataene kan også hentes som JSON fra `/api/insurance-data`: `observations` inneholder historiske tall, mens `registry` inneholder søketreff fra API-et, hentetidspunkt, totalt antall treff og eventuelle feil per søk. Av de første 50 treffene vises bare selskaper med både selskapsnavnet og «forsikring» i foretaksnavnet. `total` gjelder alle ufiltrerte treff, og `truncated` viser om flere treff finnes. Treffene kan omfatte flere foretak og er ikke automatisk bekreftede selskapskoblinger. Finanstilsynet kan mellomlagre API-svar i opptil én time. Tallene er merket med kilde, periode og omfang. Finansklagenemndas bransjetall gjelder ikke enkeltselskaper.

Datasettet inneholder BI-tall for kundetilfredshet og lojalitet for Gjensidige, If, Tryg og Fremtind, utvalgte klage- og utfallstall fra Finansklagenemnda samt finansielle nøkkeltall fra Fremtind. EPSI, Finansportalen og andre årsrapporter er dokumentert som kilder, men ikke integrert som automatiske datafeeds. Pris, individuelle kundebehov, klageårsaker og øvrige manglende opplysninger er ikke estimert. Oppdater tall og kontroller kildene manuelt før de brukes som beslutningsgrunnlag.
