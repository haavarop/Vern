# Vern
An app that monitors customers’ prices with competing providers and highlights the value of benefits beyond price to strengthen customer loyalty and reduce churn.

## Run locally

Install Node.js and the Azure CLI, then sign in with an account that has access to the Azure OpenAI deployment:

```sh
npm install
az login
npm run dev
```

Open the Vite URL printed in the terminal. The local API uses Azure CLI credentials on the server and listens on `127.0.0.1:3001`; Vite proxies chat requests to it. The configured deployment is `gpt-5.6-luna` at `https://genai.gjensidige.io`.

Run `npm test` for the local API test and `npm run build` to type-check and build the frontend. The Vite preview server does not run or proxy the API; use `npm run dev` for local chat.
