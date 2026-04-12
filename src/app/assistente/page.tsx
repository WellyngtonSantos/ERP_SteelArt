'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, AlertTriangle, AlertCircle, CheckCircle2, Info, User, Lock, Lightbulb } from 'lucide-react'
import {
  QUICK_QUESTIONS,
  IntentId,
  IntentResponse,
  IntentItem,
  ANALYSIS_PREVIEWS,
  ANALYSIS_CATEGORIES,
  AnalysisCategory,
  AnalysisPreview,
} from '@/lib/ai/types'

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; kind: 'text'; text: string }
  | { id: string; role: 'assistant'; kind: 'intent'; data: IntentResponse }
  | { id: string; role: 'assistant'; kind: 'preview'; preview: AnalysisPreview }
  | { id: string; role: 'assistant'; kind: 'loading' }

function highlightClasses(h?: IntentItem['highlight']) {
  switch (h) {
    case 'danger':
      return 'border-red-500/40 bg-red-500/5'
    case 'warning':
      return 'border-amarelo/40 bg-amarelo/5'
    case 'success':
      return 'border-emerald-500/40 bg-emerald-500/5'
    case 'info':
      return 'border-blue-500/40 bg-blue-500/5'
    default:
      return 'border-grafite-700 bg-grafite-800/50'
  }
}

function HighlightIcon({ h }: { h?: IntentItem['highlight'] }) {
  switch (h) {
    case 'danger':
      return <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amarelo flex-shrink-0" />
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
    default:
      return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
  }
}

export default function AssistentePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      kind: 'text',
      text: 'Ola! Sou seu assistente de gestao. Posso ajudar com um panorama rapido do negocio. Escolha uma pergunta abaixo ou digite a sua.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<AnalysisCategory>('estoque')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  async function runIntent(intentId: IntentId, userLabel: string) {
    if (loading) return
    const loadingId = nextId()
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: userLabel },
      { id: loadingId, role: 'assistant', kind: 'loading' },
    ])
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: intentId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { id: m.id, role: 'assistant', kind: 'text', text: data?.error || 'Nao foi possivel processar agora.' }
              : m
          )
        )
        return
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { id: m.id, role: 'assistant', kind: 'intent', data: data as IntentResponse }
            : m
        )
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { id: m.id, role: 'assistant', kind: 'text', text: 'Falha de conexao ao consultar o assistente.' }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  function showPreview(preview: AnalysisPreview) {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: preview.question },
      { id: nextId(), role: 'assistant', kind: 'preview', preview },
    ])
  }

  function handleFreeText(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text },
      {
        id: nextId(),
        role: 'assistant',
        kind: 'text',
        text:
          'Por enquanto eu respondo apenas as perguntas rapidas listadas abaixo. Em breve poderei entender perguntas em texto livre.',
      },
    ])
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amarelo/10 border border-amarelo/30 flex items-center justify-center">
          <Bot className="w-5 h-5 text-amarelo" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Assistente de Gestao</h1>
          <p className="text-sm text-gray-400">
            Braco direito para acompanhar o dia a dia do negocio
          </p>
        </div>
      </div>

      {/* Chat */}
      <div className="card min-h-[400px] max-h-[60vh] overflow-y-auto space-y-4 p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                m.role === 'user' ? 'bg-grafite-700' : 'bg-amarelo/15 border border-amarelo/30'
              }`}
            >
              {m.role === 'user' ? (
                <User className="w-4 h-4 text-gray-300" />
              ) : (
                <Bot className="w-4 h-4 text-amarelo" />
              )}
            </div>
            <div className={`flex-1 ${m.role === 'user' ? 'text-right' : ''}`}>
              {m.role === 'user' && <p className="text-sm text-gray-200 inline-block bg-grafite-700 rounded-lg px-3 py-2">{m.text}</p>}

              {m.role === 'assistant' && m.kind === 'loading' && (
                <p className="text-sm text-gray-400 italic">Consultando...</p>
              )}

              {m.role === 'assistant' && m.kind === 'text' && (
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{m.text}</p>
              )}

              {m.role === 'assistant' && m.kind === 'preview' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                      Preview — disponivel com IA conectada
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-100">{m.preview.question}</p>
                  <p className="text-xs text-gray-400">{m.preview.description}</p>
                  <div className="px-3 py-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-1">
                      Exemplo de resposta
                    </p>
                    <p className="text-sm text-gray-200 italic">{m.preview.example}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Esta analise ficara disponivel quando a integracao com IA avancada for ativada.
                  </p>
                </div>
              )}

              {m.role === 'assistant' && m.kind === 'intent' && (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-100">{m.data.title}</p>
                    <p className="text-sm text-gray-300 mt-1">{m.data.summary}</p>
                  </div>
                  {m.data.items && m.data.items.length > 0 ? (
                    <div className="space-y-1.5">
                      {m.data.items.map((it, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${highlightClasses(it.highlight)}`}
                        >
                          <HighlightIcon h={it.highlight} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium text-gray-100 truncate">{it.label}</p>
                              {it.value && (
                                <p className="text-sm font-semibold text-amarelo whitespace-nowrap">{it.value}</p>
                              )}
                            </div>
                            {it.meta && <p className="text-xs text-gray-400 mt-0.5">{it.meta}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    m.data.emptyMessage && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <p className="text-sm text-gray-200">{m.data.emptyMessage}</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amarelo" />
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Perguntas rapidas
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q.id}
              onClick={() => runIntent(q.id, q.label)}
              disabled={loading}
              className="text-left p-3 rounded-lg border border-grafite-700 bg-grafite-800/50 hover:bg-grafite-800 hover:border-amarelo/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-sm font-medium text-gray-100">{q.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{q.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Analises avancadas (preview) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-purple-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Analises avancadas
          </p>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            Em breve com IA
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Preview das analises inteligentes que estarao disponiveis com a IA conectada. Clique para ver exemplo do que sera entregue.
        </p>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ANALYSIS_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border"
                style={{
                  backgroundColor: active ? cat.color + '20' : 'transparent',
                  borderColor: active ? cat.color + '60' : '#3f3f46',
                  color: active ? cat.color : '#9ca3af',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ANALYSIS_PREVIEWS.filter((p) => p.category === activeCategory).map((p) => (
            <button
              key={p.id}
              onClick={() => showPreview(p)}
              className="text-left p-3 rounded-lg border border-grafite-700 bg-grafite-800/30 hover:bg-grafite-800 hover:border-purple-500/40 transition-colors relative"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-100 flex-1">{p.question}</p>
                <Lock className="w-3 h-3 text-purple-400/60 flex-shrink-0 mt-1" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleFreeText} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo sobre o negocio..."
          className="input-field flex-1"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  )
}
