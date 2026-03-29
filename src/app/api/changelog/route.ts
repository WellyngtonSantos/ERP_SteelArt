import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
}

interface ChangelogGroup {
  type: string
  label: string
  icon: string
  items: {
    sha: string
    message: string
    description: string
    date: string
  }[]
}

const REPO_OWNER = 'WellyngtonSantos'
const REPO_NAME = 'ERP_SteelArt'

const TYPE_MAP: Record<string, { label: string; icon: string }> = {
  feat: { label: 'Novidades', icon: 'sparkles' },
  fix: { label: 'Melhorias e Correcoes', icon: 'bug' },
  chore: { label: 'Manutencao do Sistema', icon: 'wrench' },
  refactor: { label: 'Otimizacoes Internas', icon: 'refresh' },
  style: { label: 'Melhorias Visuais', icon: 'palette' },
  docs: { label: 'Documentacao', icon: 'file-text' },
  perf: { label: 'Desempenho', icon: 'zap' },
  test: { label: 'Testes', icon: 'check-circle' },
  other: { label: 'Outras Atualizacoes', icon: 'git-commit' },
}

// Dicionário de termos técnicos → termos amigáveis
const TERM_REPLACEMENTS: [RegExp, string][] = [
  // Termos de programação
  [/\bfix\b:?\s*/gi, 'Corrigido: '],
  [/\bfeat\b:?\s*/gi, ''],
  [/\brefactor\b:?\s*/gi, 'Otimizado: '],
  [/\bchore\b:?\s*/gi, ''],
  [/\bhotfix\b:?\s*/gi, 'Correcao urgente: '],
  [/\bbug\s*fix\b/gi, 'correcao de erro'],
  [/\bresponsividade\b/gi, 'adaptacao para celular e tablet'],
  [/\bmobile\b/gi, 'celular'],
  [/\bdesktop\b/gi, 'computador'],
  [/\blayout\b/gi, 'visual'],
  [/\bUI\b/g, 'interface'],
  [/\bUX\b/g, 'experiencia do usuario'],
  [/\bfrontend\b/gi, 'tela do sistema'],
  [/\bbackend\b/gi, 'servidor'],
  [/\bAPI\b/g, 'servico'],
  [/\bdeploy\b/gi, 'publicacao'],
  [/\bbuild\b/gi, 'compilacao do sistema'],
  [/\bdatabase\b/gi, 'banco de dados'],
  [/\bDB\b/g, 'banco de dados'],
  [/\bquery\b/gi, 'consulta'],
  [/\bcache\b/gi, 'armazenamento temporario'],
  [/\broute\b/gi, 'pagina'],
  [/\broutes\b/gi, 'paginas'],
  [/\bmiddleware\b/gi, 'camada de seguranca'],
  [/\btoken\b/gi, 'chave de acesso'],
  [/\bsession\b/gi, 'sessao de login'],
  [/\bauth\b/gi, 'autenticacao'],
  [/\blogin\b/gi, 'acesso ao sistema'],
  [/\blogout\b/gi, 'saida do sistema'],
  [/\bprisma\s+generate\b/gi, 'preparacao do banco de dados'],
  [/\bprisma\s+db\s+push\b/gi, 'atualizacao da estrutura do banco'],
  [/\bprisma\b/gi, 'banco de dados'],
  [/\bwebhook\b/gi, 'notificacao automatica'],
  [/\bendpoint\b/gi, 'funcionalidade'],
  [/\bcomponent\b/gi, 'componente visual'],
  [/\bconfig\b/gi, 'configuracao'],
  [/\benv\b/gi, 'ambiente'],
  [/\bCSS\b/g, 'estilo visual'],
  [/\bHTML\b/g, 'estrutura da pagina'],
  [/\bJSON\b/g, 'dados'],
  [/\bXML\b/g, 'dados de nota fiscal'],
  [/\bPDF\b/g, 'documento PDF'],
  [/\bCNPJ\b/g, 'CNPJ'],
  [/\bNF-?e\b/gi, 'Nota Fiscal'],
]

// Termos a remover completamente (muito técnicos, sem valor para leigos)
const TERMS_TO_REMOVE: RegExp[] = [
  /\badicionar\s+prisma\s+generate\s+e\s+db\s+push\s+ao\s+build\s+command\b/gi,
  /\bCo-Authored-By:.*/gi,
  /\bsigned-off-by:.*/gi,
]

function humanizeMessage(raw: string): string {
  let text = raw.trim()

  // Remover termos puramente técnicos
  for (const pattern of TERMS_TO_REMOVE) {
    text = text.replace(pattern, '').trim()
  }

  // Substituir termos técnicos
  for (const [pattern, replacement] of TERM_REPLACEMENTS) {
    text = text.replace(pattern, replacement)
  }

  // Limpar espaços duplos e pontuação duplicada
  text = text.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').replace(/^[,\s:]+/, '').trim()

  // Capitalizar primeira letra
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }

  return text
}

function parseCommitMessage(message: string): { type: string; title: string; description: string } {
  const firstLine = message.split('\n')[0]
  const descLines = message.split('\n').slice(1).filter(l => l.trim() && !l.startsWith('Co-Authored-By'))
  const description = descLines.join('\n').trim()

  // Match conventional commits: type: message or type(scope): message
  const match = firstLine.match(/^(\w+)(?:\(.+?\))?:\s*(.+)/)
  if (match) {
    const type = match[1].toLowerCase()
    const title = humanizeMessage(match[2].trim())
    return {
      type: TYPE_MAP[type] ? type : 'other',
      title,
      description: description ? humanizeMessage(description) : '',
    }
  }

  return { type: 'other', title: humanizeMessage(firstLine), description: description ? humanizeMessage(description) : '' }
}

// Mensagens técnicas que devem ser ocultadas do changelog público
const HIDDEN_PATTERNS = [
  /^adicionar prisma generate/i,
  /^add prisma generate/i,
  /^initial commit$/i,
  /^first commit$/i,
  /^wip$/i,
  /^work in progress$/i,
  /^tmp$/i,
  /^test$/i,
  /^debug/i,
]

function shouldHideCommit(message: string): boolean {
  const firstLine = message.split('\n')[0]
  // Remove o prefixo tipo: do conventional commit
  const match = firstLine.match(/^(\w+)(?:\(.+?\))?:\s*(.+)/)
  const cleanMsg = match ? match[2].trim() : firstLine.trim()
  return HIDDEN_PATTERNS.some(p => p.test(cleanMsg))
}

function createTimeout(ms: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=100`
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SteelArt-ERP',
    }

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const response = await fetch(url, {
      headers,
      signal: createTimeout(15000),
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Limite de consultas atingido. Tente novamente em alguns minutos.' },
          { status: 429 }
        )
      }
      throw new Error(`GitHub API retornou status ${response.status}`)
    }

    const commits: GitHubCommit[] = await response.json()

    const groups: Record<string, ChangelogGroup> = {}
    let visibleCount = 0

    for (const commit of commits) {
      if (commit.commit.message.startsWith('Merge')) continue
      if (shouldHideCommit(commit.commit.message)) continue

      const parsed = parseCommitMessage(commit.commit.message)
      if (!parsed.title || parsed.title.length < 3) continue

      const typeInfo = TYPE_MAP[parsed.type] || TYPE_MAP.other

      if (!groups[parsed.type]) {
        groups[parsed.type] = {
          type: parsed.type,
          label: typeInfo.label,
          icon: typeInfo.icon,
          items: [],
        }
      }

      groups[parsed.type].items.push({
        sha: commit.sha.slice(0, 7),
        message: parsed.title,
        description: parsed.description,
        date: commit.commit.author.date,
      })
      visibleCount++
    }

    const priority = ['feat', 'fix', 'style', 'perf', 'chore', 'refactor', 'docs', 'test', 'other']
    const sortedGroups = priority
      .filter((type) => groups[type])
      .map((type) => groups[type])

    return NextResponse.json({
      groups: sortedGroups,
      totalCommits: visibleCount,
      lastUpdate: commits[0]?.commit.author.date || null,
    })
  } catch (err) {
    console.error('Erro ao buscar changelog:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar historico de atualizacoes.' },
      { status: 502 }
    )
  }
}
