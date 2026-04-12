import { IntentId, IntentResponse } from './types'

export type AssistantReply =
  | { kind: 'intent'; data: IntentResponse }
  | { kind: 'text'; text: string }
  | { kind: 'error'; message: string }

export interface AssistantRequest {
  intent?: IntentId
  message?: string
}

export interface AIProvider {
  readonly name: 'mock' | 'anthropic'
  handle(req: AssistantRequest): Promise<AssistantReply>
}
