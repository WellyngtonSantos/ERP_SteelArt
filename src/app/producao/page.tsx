'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Package,
  Users,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { formatCurrency } from '@/lib/calculations'

// --------------- Types ---------------

interface FinancialEntry {
  id: string
  type: string
  category: string
  description: string
  amount: number
  dueDate: string
  paidDate?: string
  status: string
}

interface BudgetItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  material?: {
    id: string
    name: string
    unit: string
    category: string
  }
}

interface BudgetEmployee {
  id: string
  hoursAllocated: number
  employee: {
    id: string
    name: string
    role: string
    monthlyCost: number
  }
}

interface Budget {
  id: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientAddress?: string
  type: string
  status: string
  totalCost: number
  totalPrice: number
  notes?: string
  items: BudgetItem[]
  employees: BudgetEmployee[]
  financialEntries: FinancialEntry[]
}

interface Project {
  id: string
  budgetId: string
  status: string
  progress: number
  startDate?: string
  expectedEnd?: string
  notes?: string
  createdAt: string
  budget: Budget
  financialEntries: FinancialEntry[]
}

// --------------- Constants ---------------

const COLUMNS = [
  { key: 'PENDENTE', label: 'Pendente', color: 'border-gray-500', bg: 'bg-gray-500' },
  { key: 'EM_PRODUCAO', label: 'Em Producao', color: 'border-amarelo', bg: 'bg-amarelo' },
  { key: 'CONCLUIDO', label: 'Concluido', color: 'border-green-500', bg: 'bg-green-500' },
  { key: 'ENTREGUE', label: 'Entregue', color: 'border-blue-500', bg: 'bg-blue-500' },
] as const

const STATUS_ORDER = ['PENDENTE', 'EM_PRODUCAO', 'CONCLUIDO', 'ENTREGUE']

function getProgressColor(progress: number): string {
  if (progress < 30) return 'bg-red-500'
  if (progress <= 70) return 'bg-amarelo'
  return 'bg-green-500'
}

function getProgressTextColor(progress: number): string {
  if (progress < 30) return 'text-red-400'
  if (progress <= 70) return 'text-amarelo'
  return 'text-green-400'
}

// --------------- Project Card ---------------

function ProjectCard({
  project,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
  onUpdateProgress,
  updating,
}: {
  project: Project
  onMoveLeft: () => void
  onMoveRight: () => void
  canMoveLeft: boolean
  canMoveRight: boolean
  onUpdateProgress: (progress: number) => void
  updating: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [localProgress, setLocalProgress] = useState(project.progress)

  useEffect(() => {
    setLocalProgress(project.progress)
  }, [project.progress])

  const allEntries = [
    ...project.financialEntries,
    ...(project.budget.financialEntries || []),
  ]
  // Deduplicate by id
  const uniqueEntries = useMemo(() => {
    const map = new Map<string, FinancialEntry>()
    allEntries.forEach((e) => map.set(e.id, e))
    return Array.from(map.values())
  }, [allEntries])

  const paidCount = uniqueEntries.filter((e) => e.status === 'PAGO').length
  const totalEntries = uniqueEntries.length

  return (
    <div className="card p-4 space-y-3">
      {/* Client & Price */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-100 truncate">
            {project.budget.clientName}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {project.budget.type === 'PRODUTO' ? 'Produto' : 'Servico'}
          </p>
        </div>
        <span className="text-sm font-mono text-amarelo font-bold flex-shrink-0 ml-2">
          {formatCurrency(project.budget.totalPrice)}
        </span>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Progresso</span>
          <span className={`text-xs font-bold ${getProgressTextColor(project.progress)}`}>
            {project.progress}%
          </span>
        </div>
        <div className="w-full h-2 bg-grafite-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(project.progress)}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Payments */}
      {totalEntries > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <DollarSign className="w-3 h-3 text-gray-500" />
          <span className="text-gray-400">
            Parcelas: {paidCount}/{totalEntries}{' '}
            <span className={paidCount === totalEntries ? 'text-green-400' : 'text-amarelo'}>
              {paidCount === totalEntries ? '(Quitado)' : '(Pendente)'}
            </span>
          </span>
        </div>
      )}

      {/* Move Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMoveLeft}
          disabled={!canMoveLeft || updating}
          className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 disabled:opacity-30"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary text-xs px-3 py-1 flex-1 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              Recolher <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Detalhes <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
        <button
          onClick={onMoveRight}
          disabled={!canMoveRight || updating}
          className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 disabled:opacity-30"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-grafite-700">
          {/* Progress Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-field mb-0">Editar Progresso</label>
              {editingProgress && localProgress !== project.progress && (
                <button
                  onClick={() => {
                    onUpdateProgress(localProgress)
                    setEditingProgress(false)
                  }}
                  disabled={updating}
                  className="text-xs text-amarelo hover:text-amarelo-light font-medium disabled:opacity-50"
                >
                  Salvar
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={localProgress}
                onChange={(e) => {
                  setLocalProgress(parseInt(e.target.value))
                  setEditingProgress(true)
                }}
                className="flex-1 accent-amarelo"
              />
              <span className={`text-sm font-bold w-10 text-right ${getProgressTextColor(localProgress)}`}>
                {localProgress}%
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Inicio
              </span>
              <p className="text-gray-300 mt-0.5">
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString('pt-BR')
                  : 'Nao iniciado'}
              </p>
            </div>
            <div>
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Previsao
              </span>
              <p className="text-gray-300 mt-0.5">
                {project.expectedEnd
                  ? new Date(project.expectedEnd).toLocaleDateString('pt-BR')
                  : 'Nao definido'}
              </p>
            </div>
          </div>

          {/* Items */}
          {project.budget.items.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-1 mb-2">
                <Package className="w-3 h-3" /> Materiais / Itens
              </h4>
              <div className="space-y-1">
                {project.budget.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs p-2 bg-grafite-900 rounded"
                  >
                    <span className="text-gray-300 truncate flex-1">
                      {item.material?.name || item.description}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employees */}
          {project.budget.employees.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-1 mb-2">
                <Users className="w-3 h-3" /> Equipe Alocada
              </h4>
              <div className="space-y-1">
                {project.budget.employees.map((be) => (
                  <div
                    key={be.id}
                    className="flex items-center justify-between text-xs p-2 bg-grafite-900 rounded"
                  >
                    <span className="text-gray-300">{be.employee.name}</span>
                    <span className="text-gray-500">{be.hoursAllocated}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Entries */}
          {uniqueEntries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-1 mb-2">
                <DollarSign className="w-3 h-3" /> Parcelas
              </h4>
              <div className="space-y-1">
                {uniqueEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-xs p-2 bg-grafite-900 rounded"
                  >
                    <span className="text-gray-300 truncate flex-1">{entry.description}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-gray-400 font-mono">
                        {formatCurrency(entry.amount)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          entry.status === 'PAGO'
                            ? 'bg-green-600/20 text-green-400'
                            : entry.status === 'ATRASADO'
                            ? 'bg-red-600/20 text-red-400'
                            : 'bg-gray-600/20 text-gray-400'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {(project.notes || project.budget.notes) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-1 mb-2">
                <FileText className="w-3 h-3" /> Observacoes
              </h4>
              <p className="text-xs text-gray-400 bg-grafite-900 rounded p-2 whitespace-pre-wrap">
                {project.notes || project.budget.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --------------- Main Page ---------------

export default function ProducaoPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        setProjects(await res.json())
      }
    } catch (error) {
      console.error('Erro ao buscar projetos:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const updateProject = async (
    projectId: string,
    data: { status?: string; progress?: number }
  ) => {
    setUpdatingId(projectId)
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, ...data }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? updated : p))
        )
      }
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error)
    }
    setUpdatingId(null)
  }

  const moveProject = (project: Project, direction: -1 | 1) => {
    const currentIndex = STATUS_ORDER.indexOf(project.status)
    const newIndex = currentIndex + direction
    if (newIndex < 0 || newIndex >= STATUS_ORDER.length) return
    updateProject(project.id, { status: STATUS_ORDER[newIndex] })
  }

  const columnProjects = useMemo(() => {
    const map: Record<string, Project[]> = {}
    COLUMNS.forEach((col) => {
      map[col.key] = projects.filter((p) => p.status === col.key)
    })
    return map
  }, [projects])

  const totalValue = useMemo(
    () => projects.reduce((sum, p) => sum + p.budget.totalPrice, 0),
    [projects]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Producao & Projetos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Acompanhe o progresso dos projetos em producao
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true)
            fetchProjects()
          }}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="card p-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${col.bg}`} />
              <span className="text-xs text-gray-400 font-medium">{col.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-100 mt-2">
              {columnProjects[col.key]?.length || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Total */}
      {projects.length > 0 && (
        <div className="card-highlight p-4 flex items-center justify-between">
          <span className="text-sm text-gray-300">Valor total em projetos</span>
          <span className="text-lg font-bold font-mono text-amarelo">
            {formatCurrency(totalValue)}
          </span>
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Carregando projetos...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 text-grafite-600 mx-auto" />
          <p className="text-gray-400 mt-4">Nenhum projeto em producao</p>
          <p className="text-sm text-gray-500 mt-1">
            Aprove um orcamento na area Comercial para iniciar um projeto
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colProjects = columnProjects[col.key] || []
            return (
              <div key={col.key} className="space-y-3">
                {/* Column Header */}
                <div className={`flex items-center gap-2 pb-2 border-b-2 ${col.color}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${col.bg}`} />
                  <h2 className="text-sm font-bold text-gray-200">{col.label}</h2>
                  <span className="ml-auto text-xs bg-grafite-700 text-gray-400 px-2 py-0.5 rounded-full">
                    {colProjects.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3 min-h-[200px]">
                  {colProjects.length === 0 ? (
                    <div className="border-2 border-dashed border-grafite-700 rounded-xl p-6 text-center">
                      <p className="text-xs text-gray-600">Nenhum projeto</p>
                    </div>
                  ) : (
                    colProjects.map((project) => {
                      const statusIndex = STATUS_ORDER.indexOf(project.status)
                      return (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onMoveLeft={() => moveProject(project, -1)}
                          onMoveRight={() => moveProject(project, 1)}
                          canMoveLeft={statusIndex > 0}
                          canMoveRight={statusIndex < STATUS_ORDER.length - 1}
                          onUpdateProgress={(progress) =>
                            updateProject(project.id, { progress })
                          }
                          updating={updatingId === project.id}
                        />
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
