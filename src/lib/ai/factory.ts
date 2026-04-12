import { AIProvider } from './provider'
import { MockProvider } from './mock-provider'

export function getAIProvider(): AIProvider {
  const kind = (process.env.AI_PROVIDER || 'mock').toLowerCase()

  if (kind === 'anthropic') {
    // Import dinamico para que o build nao exija o SDK instalado quando estiver no modo mock,
    // e para que erros de configuracao (API key ausente) so disparem quando realmente ativar.
    const { AnthropicProvider } = require('./anthropic-provider') as typeof import('./anthropic-provider')
    return new AnthropicProvider()
  }

  return new MockProvider()
}
