import { AzureCliCredential } from '@azure/identity'
import { AzureChatOpenAICompletions } from '@langchain/openai'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { pathToFileURL } from 'node:url'

type Message = { role: 'user' | 'assistant'; content: string }
type Chat = (messages: Message[]) => Promise<string>

const credential = new AzureCliCredential()
const model = new AzureChatOpenAICompletions({
  model: 'gpt-5.6-luna',
  azureOpenAIEndpoint: 'https://genai.gjensidige.io',
  azureOpenAIApiDeploymentName: 'gpt-5.6-luna',
  azureOpenAIApiVersion: '2024-10-21',
  azureADTokenProvider: async () => {
    const token = await credential.getToken('https://cognitiveservices.azure.com/.default')
    if (!token) throw new Error('Azure CLI did not return an access token')
    return token.token
  },
  modelKwargs: { reasoning_effort: 'medium' },
  maxCompletionTokens: 4000,
})

async function chat(messages: Message[]) {
  const response = await model.invoke(messages.map(({ role, content }) => [role === 'assistant' ? 'ai' : 'human', content]))
  return response.text
}

function send(response: ServerResponse, status: number, body: object) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

async function handle(request: IncomingMessage, response: ServerResponse, invoke: Chat) {
  if (request.method !== 'POST' || request.url !== '/api/chat') {
    send(response, 404, { error: 'Not found' })
    return
  }
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    send(response, 415, { error: 'Expected application/json.' })
    return
  }

  try {
    let body = ''
    for await (const chunk of request) {
      body += chunk
      if (body.length > 100_000) {
        send(response, 413, { error: 'Request is too large' })
        return
      }
    }
    const data: unknown = JSON.parse(body)
    if (!data || typeof data !== 'object' || !('messages' in data) || !Array.isArray(data.messages) ||
      data.messages.length === 0 || data.messages.length > 100 ||
      !data.messages.every((message: unknown) => message && typeof message === 'object' &&
        'role' in message && (message.role === 'user' || message.role === 'assistant') &&
        'content' in message && typeof message.content === 'string' && message.content.trim().length > 0) ||
      data.messages.at(-1).role !== 'user') {
      send(response, 400, { error: 'Please provide a valid conversation ending with a user message.' })
      return
    }
    const reply = await invoke(data.messages as Message[])
    send(response, 200, { reply })
  } catch (error) {
    if (error instanceof SyntaxError) {
      send(response, 400, { error: 'Invalid JSON request.' })
      return
    }
    console.error('Azure chat request failed:', error)
    send(response, 502, { error: 'Could not reach Azure OpenAI. Check your Azure CLI login and access, then try again.' })
  }
}

export function createChatServer(invoke: Chat = chat) {
  return createServer((request, response) => { void handle(request, response, invoke) })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.API_PORT || 3001)
  createChatServer().listen(port, '127.0.0.1', () => console.log(`Chat API listening on http://127.0.0.1:${port}`))
}