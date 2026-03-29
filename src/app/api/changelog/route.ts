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
    author: string
    date: string
  }[]
}

const REPO_OWNER = 'WellyngtonSantos'
const REPO_NAME = 'ERP_SteelArt'

const TYPE_MAP: Record<string, { label: string; icon: string }> = {
  feat: { label: 'Novas Funcionalidades', icon: 'sparkles' },
  fix: { label: 'Correcoes', icon: 'bug' },
  chore: { label: 'Manutencao', icon: 'wrench' },
  refactor: { label: 'Refatoracoes', icon: 'refresh' },
  style: { label: 'Estilo e Visual', icon: 'palette' },
  docs: { label: 'Documentacao', icon: 'file-text' },
  perf: { label: 'Performance', icon: 'zap' },
  test: { label: 'Testes', icon: 'check-circle' },
  other: { label: 'Outras Alteracoes', icon: 'git-commit' },
}

function parseCommitMessage(message: string): { type: string; title: string; description: string } {
  const firstLine = message.split('\n')[0]
  const description = message.split('\n').slice(1).filter(l => l.trim()).join('\n').trim()

  // Match conventional commits: type: message or type(scope): message
  const match = firstLine.match(/^(\w+)(?:\(.+?\))?:\s*(.+)/)
  if (match) {
    const type = match[1].toLowerCase()
    const title = match[2].trim()
    return {
      type: TYPE_MAP[type] ? type : 'other',
      title,
      description,
    }
  }

  return { type: 'other', title: firstLine, description }
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

    // Use GitHub token if available for higher rate limits
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Limite de requisicoes da API do GitHub atingido. Tente novamente em alguns minutos.' },
          { status: 429 }
        )
      }
      throw new Error(`GitHub API retornou status ${response.status}`)
    }

    const commits: GitHubCommit[] = await response.json()

    // Group commits by type
    const groups: Record<string, ChangelogGroup> = {}

    for (const commit of commits) {
      // Skip merge commits and co-authored lines
      if (commit.commit.message.startsWith('Merge')) continue

      const parsed = parseCommitMessage(commit.commit.message)
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
        author: commit.commit.author.name,
        date: commit.commit.author.date,
      })
    }

    // Sort groups: feat first, fix second, then alphabetically
    const priority = ['feat', 'fix', 'chore', 'refactor', 'style', 'perf', 'docs', 'test', 'other']
    const sortedGroups = priority
      .filter((type) => groups[type])
      .map((type) => groups[type])

    return NextResponse.json({
      groups: sortedGroups,
      totalCommits: commits.length,
      lastUpdate: commits[0]?.commit.author.date || null,
    })
  } catch (err: any) {
    console.error('Erro ao buscar changelog:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar historico de atualizacoes.' },
      { status: 502 }
    )
  }
}
