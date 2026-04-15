'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/calculations'

type FinGroup = 'RECEITA_PRINCIPAL' | 'RECEITA_OUTRAS' | 'CUSTO_FIXO' | 'CUSTO_VARIAVEL'

interface FinancialEntry {
  id: string
  code: string | null
  type: 'RECEITA' | 'DESPESA'
  category: string
  group: FinGroup | null
  description: string
  amount: number
  dueDate: string
  paidDate: string | null
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO'
  attachmentData: string | null
  attachmentName: string | null
  bankName: string | null
  paymentMethod: string | null
  categoryName: string | null
  groupName: string | null
  budgetId: string | null
  projectId: string | null
}

type FinOptionType =
  | 'BANK'
  | 'CATEGORY'
  | 'GROUP'
  | 'PAYMENT_METHOD'
  | 'INCOME_MAIN'
  | 'INCOME_OTHER'
  | 'COST_FIXED'
  | 'COST_VARIABLE'

interface FinancialOption {
  id: string
  type: FinOptionType
  name: string
  active: boolean
  order: number
}

// Grupo -> tipo de FinancialOption que traz as descricoes candidatas
const GROUP_TO_OPTION_TYPE: Record<FinGroup, FinOptionType> = {
  RECEITA_PRINCIPAL: 'INCOME_MAIN',
  RECEITA_OUTRAS: 'INCOME_OTHER',
  CUSTO_FIXO: 'COST_FIXED',
  CUSTO_VARIAVEL: 'COST_VARIABLE',
}

const GROUP_LABELS: Record<FinGroup, string> = {
  RECEITA_PRINCIPAL: 'Receitas Principais',
  RECEITA_OUTRAS: 'Receitas Outras',
  CUSTO_FIXO: 'Custos Fixos',
  CUSTO_VARIAVEL: 'Custos Variaveis',
}

interface FixedCost {
  id: string
  name: string
  amount: number
  category: 'ALUGUEL' | 'ENERGIA' | 'INTERNET' | 'CONTADOR' | 'OUTROS'
  active: boolean
}

interface TaxConfig {
  id: string
  name: string
  type: 'ISS' | 'ICMS'
  rate: number
  appliesTo: 'PRODUTO' | 'SERVICO' | 'AMBOS'
  active: boolean
}

type Tab = 'todos' | 'receber' | 'pagar' | 'fixos' | 'impostos' | 'integracoes'

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-yellow-900/50 text-yellow-400',
  PAGO: 'bg-green-900/50 text-green-400',
  ATRASADO: 'bg-red-900/50 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  ATRASADO: 'Atrasado',
}

const FIXED_COST_CATEGORIES = ['ALUGUEL', 'ENERGIA', 'INTERNET', 'CONTADOR', 'OUTROS']
const TAX_TYPES = ['ISS', 'ICMS']
const APPLIES_TO_OPTIONS = [
  { value: 'PRODUTO', label: 'Produto' },
  { value: 'SERVICO', label: 'Servico' },
  { value: 'AMBOS', label: 'Ambos' },
]

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<Tab>('todos')
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [taxes, setTaxes] = useState<TaxConfig[]>([])
  const [options, setOptions] = useState<FinancialOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const _now = new Date()
  const [mesFiltro, setMesFiltro] = useState<number>(_now.getMonth() + 1) // 1-12, 0 = todos
  const [anoFiltro, setAnoFiltro] = useState<number>(_now.getFullYear())
  const MESES_LABEL = ['Todos os meses', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const anosDisponiveis = (() => {
    const anoAtual = _now.getFullYear()
    const anos: number[] = []
    for (let a = anoAtual - 3; a <= anoAtual + 1; a++) anos.push(a)
    return anos
  })()

  const matchesPeriodo = (entry: FinancialEntry) => {
    const refDate = entry.paidDate ? new Date(entry.paidDate) : new Date(entry.dueDate)
    if (refDate.getFullYear() !== anoFiltro) return false
    if (mesFiltro !== 0 && refDate.getMonth() + 1 !== mesFiltro) return false
    return true
  }

  // Entry modal
  const [showEntryModal, setShowEntryModal] = useState(false)
  const todayISO = () => new Date().toISOString().slice(0, 10)
  const [entryForm, setEntryForm] = useState({
    id: '' as string, // quando editando
    type: 'DESPESA' as 'RECEITA' | 'DESPESA',
    group: '' as FinGroup | '',
    category: '',
    description: '',
    amount: 0,
    dueDate: '',
    status: 'PENDENTE',
    paidNow: false,
    paidDate: '',
    attachmentData: '' as string,
    attachmentName: '' as string,
    bankName: '' as string,
    paymentMethod: '' as string,
    categoryName: '' as string,
    groupName: '' as string,
  })
  const [savingEntry, setSavingEntry] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')

  // Fixed Cost modal
  const [showCostModal, setShowCostModal] = useState(false)
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null)
  const [costForm, setCostForm] = useState({
    name: '',
    amount: 0,
    category: 'OUTROS' as string,
    active: true,
  })
  const [savingCost, setSavingCost] = useState(false)

  // Tax modal
  const [showTaxModal, setShowTaxModal] = useState(false)
  const [editingTax, setEditingTax] = useState<TaxConfig | null>(null)
  const [taxForm, setTaxForm] = useState({
    name: '',
    type: 'ISS' as string,
    rate: 0,
    appliesTo: 'AMBOS' as string,
    active: true,
  })
  const [savingTax, setSavingTax] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [entriesRes, costsRes, taxesRes, optionsRes] = await Promise.all([
        fetch('/api/financial'),
        fetch('/api/fixed-costs'),
        fetch('/api/taxes'),
        fetch('/api/financial-options'),
      ])
      if (!entriesRes.ok) throw new Error('Erro ao carregar lancamentos')
      if (!costsRes.ok) throw new Error('Erro ao carregar custos fixos')

      setEntries(await entriesRes.json())
      setFixedCosts(await costsRes.json())
      if (taxesRes.ok) {
        setTaxes(await taxesRes.json())
      }
      if (optionsRes.ok) {
        setOptions(await optionsRes.json())
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Computed values (ja filtrados por mes/ano)
  const entriesPeriodo = entries.filter(matchesPeriodo)
  const receitas = entriesPeriodo.filter((e) => e.type === 'RECEITA')
  const despesas = entriesPeriodo.filter((e) => e.type === 'DESPESA')
  const totalReceber = receitas
    .filter((e) => e.status !== 'PAGO')
    .reduce((s, e) => s + e.amount, 0)
  const totalPagar = despesas
    .filter((e) => e.status !== 'PAGO')
    .reduce((s, e) => s + e.amount, 0)
  const saldoProjetado = totalReceber - totalPagar

  // Filter entries by status (on top of periodo)
  const filteredReceitas = statusFilter
    ? receitas.filter((e) => e.status === statusFilter)
    : receitas
  const filteredDespesas = statusFilter
    ? despesas.filter((e) => e.status === statusFilter)
    : despesas

  // Mark as paid
  const markAsPaid = async (entry: FinancialEntry) => {
    setError('')
    try {
      const res = await fetch('/api/financial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entry.id,
          status: 'PAGO',
          paidDate: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('Erro ao marcar como pago')
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Create entry — tipo ja define os 2 grupos disponiveis no select
  const openNewEntry = (type: 'RECEITA' | 'DESPESA', prefGroup?: FinGroup) => {
    const defaultGroup: FinGroup | '' =
      prefGroup ||
      (type === 'RECEITA' ? 'RECEITA_PRINCIPAL' : 'CUSTO_VARIAVEL')
    setEntryForm({
      id: '',
      type,
      group: defaultGroup,
      category: '',
      description: '',
      amount: 0,
      dueDate: todayISO(),
      status: 'PENDENTE',
      paidNow: false,
      paidDate: '',
      attachmentData: '',
      attachmentName: '',
      bankName: '',
      paymentMethod: '',
      categoryName: '',
      groupName: '',
    })
    setAttachmentError('')
    setShowEntryModal(true)
  }

  const banks = options.filter((o) => o.type === 'BANK' && o.active)
  const paymentMethods = options.filter((o) => o.type === 'PAYMENT_METHOD' && o.active)
  const incomeMain = options.filter((o) => o.type === 'INCOME_MAIN' && o.active)
  const incomeOther = options.filter((o) => o.type === 'INCOME_OTHER' && o.active)
  const costFixed = options.filter((o) => o.type === 'COST_FIXED' && o.active)
  const costVariable = options.filter((o) => o.type === 'COST_VARIABLE' && o.active)
  const categoryOpts = options.filter((o) => o.type === 'CATEGORY' && o.active) // legado
  const groupOpts = options.filter((o) => o.type === 'GROUP' && o.active) // legado

  // Descricoes candidatas dado o grupo atual
  const descriptionsForGroup = (g: FinGroup | ''): FinancialOption[] => {
    if (!g) return []
    const t = GROUP_TO_OPTION_TYPE[g]
    return options.filter((o) => o.type === t && o.active)
  }

  const handleAttachmentChange = (file: File | null) => {
    setAttachmentError('')
    if (!file) {
      setEntryForm((prev) => ({ ...prev, attachmentData: '', attachmentName: '' }))
      return
    }
    const MAX = 3 * 1024 * 1024
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setAttachmentError('Tipo de arquivo nao suportado. Use PDF, JPG, PNG ou WEBP.')
      return
    }
    if (file.size > MAX) {
      setAttachmentError('Arquivo muito grande (maximo 3MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setEntryForm((prev) => ({
        ...prev,
        attachmentData: reader.result as string,
        attachmentName: file.name,
      }))
    }
    reader.onerror = () => setAttachmentError('Erro ao ler o arquivo.')
    reader.readAsDataURL(file)
  }

  const saveEntry = async () => {
    if (!entryForm.dueDate) {
      setError('Informe a data de vencimento/lancamento.')
      return
    }
    if (!entryForm.description.trim()) {
      setError('Informe a descricao do lancamento.')
      return
    }
    if (!entryForm.amount || entryForm.amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    setSavingEntry(true)
    setError('')
    try {
      const payload: any = {
        type: entryForm.type,
        group: entryForm.group || null,
        category: entryForm.category,
        description: entryForm.description,
        amount: entryForm.amount,
        dueDate: entryForm.dueDate,
        status: entryForm.paidNow ? 'PAGO' : entryForm.status,
        paidDate: entryForm.paidNow ? (entryForm.paidDate || todayISO()) : null,
        attachmentData: entryForm.attachmentData || null,
        attachmentName: entryForm.attachmentName || null,
        bankName: entryForm.bankName || null,
        paymentMethod: entryForm.paymentMethod || null,
        categoryName: entryForm.categoryName || null,
        groupName: entryForm.groupName || null,
      }
      const method = entryForm.id ? 'PUT' : 'POST'
      if (entryForm.id) payload.id = entryForm.id
      const res = await fetch('/api/financial', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar lancamento')
      }
      setShowEntryModal(false)
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingEntry(false)
    }
  }

  // Fixed Costs CRUD
  const openAddCost = () => {
    setEditingCost(null)
    setCostForm({ name: '', amount: 0, category: 'OUTROS', active: true })
    setShowCostModal(true)
  }

  const openEditCost = (cost: FixedCost) => {
    setEditingCost(cost)
    setCostForm({
      name: cost.name,
      amount: cost.amount,
      category: cost.category,
      active: cost.active,
    })
    setShowCostModal(true)
  }

  const saveCost = async () => {
    setSavingCost(true)
    setError('')
    try {
      const method = editingCost ? 'PUT' : 'POST'
      const body = editingCost ? { id: editingCost.id, ...costForm } : costForm
      const res = await fetch('/api/fixed-costs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erro ao salvar custo fixo')
      setShowCostModal(false)
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingCost(false)
    }
  }

  const deleteCost = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este custo fixo?')) return
    try {
      const res = await fetch(`/api/fixed-costs?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir custo fixo')
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleCostActive = async (cost: FixedCost) => {
    try {
      await fetch('/api/fixed-costs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cost.id, name: cost.name, amount: cost.amount, category: cost.category, active: !cost.active }),
      })
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Tax Config CRUD
  const openAddTax = () => {
    setEditingTax(null)
    setTaxForm({ name: '', type: 'ISS', rate: 0, appliesTo: 'AMBOS', active: true })
    setShowTaxModal(true)
  }

  const openEditTax = (tax: TaxConfig) => {
    setEditingTax(tax)
    setTaxForm({
      name: tax.name,
      type: tax.type,
      rate: tax.rate,
      appliesTo: tax.appliesTo,
      active: tax.active,
    })
    setShowTaxModal(true)
  }

  const saveTax = async () => {
    setSavingTax(true)
    setError('')
    try {
      const method = editingTax ? 'PUT' : 'POST'
      const body = editingTax ? { id: editingTax.id, ...taxForm } : taxForm
      const res = await fetch('/api/taxes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erro ao salvar imposto')
      setShowTaxModal(false)
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingTax(false)
    }
  }

  const toggleTaxActive = async (tax: TaxConfig) => {
    try {
      await fetch('/api/taxes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tax.id, name: tax.name, type: tax.type, rate: tax.rate, appliesTo: tax.appliesTo, active: !tax.active }),
      })
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteTax = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este imposto?')) return
    try {
      const res = await fetch(`/api/taxes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir imposto')
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Tab config
  const tabs: { key: Tab; label: string }[] = [
    { key: 'todos', label: 'Todos os Lancamentos' },
    { key: 'receber', label: 'Contas a Receber' },
    { key: 'pagar', label: 'Contas a Pagar' },
    { key: 'fixos', label: 'Custos Fixos' },
    { key: 'impostos', label: 'Impostos' },
    { key: 'integracoes', label: 'Integracoes' },
  ]

  // Abrir modal pra editar lancamento existente
  const openEditEntry = (entry: FinancialEntry) => {
    setEntryForm({
      id: entry.id,
      type: entry.type,
      group: (entry.group as FinGroup | null) || (entry.type === 'RECEITA' ? 'RECEITA_PRINCIPAL' : 'CUSTO_VARIAVEL'),
      category: entry.category || '',
      description: entry.description || '',
      amount: entry.amount,
      dueDate: entry.dueDate ? String(entry.dueDate).slice(0, 10) : '',
      status: entry.status,
      paidNow: entry.status === 'PAGO',
      paidDate: entry.paidDate ? String(entry.paidDate).slice(0, 10) : '',
      attachmentData: entry.attachmentData || '',
      attachmentName: entry.attachmentName || '',
      bankName: entry.bankName || '',
      paymentMethod: entry.paymentMethod || '',
      categoryName: entry.categoryName || '',
      groupName: entry.groupName || '',
    })
    setAttachmentError('')
    setShowEntryModal(true)
  }

  // Infere grupo automaticamente a partir de entries antigos que ainda nao tem
  const entryGroup = (e: FinancialEntry): FinGroup => {
    if (e.group) return e.group
    return e.type === 'RECEITA' ? 'RECEITA_PRINCIPAL' : 'CUSTO_VARIAVEL'
  }

  // Todos entries agrupados (ja filtrados por mes/ano + status)
  const allFiltered = entriesPeriodo.filter((e) => (statusFilter ? e.status === statusFilter : true))
  const grouped: Record<FinGroup, FinancialEntry[]> = {
    RECEITA_PRINCIPAL: [],
    RECEITA_OUTRAS: [],
    CUSTO_FIXO: [],
    CUSTO_VARIAVEL: [],
  }
  for (const e of allFiltered) grouped[entryGroup(e)].push(e)
  const groupTotal = (g: FinGroup) => grouped[g].reduce((s, e) => s + e.amount, 0)
  const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const mesDe = (iso: string | null | undefined) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return isNaN(d.getTime()) ? '-' : MES_ABREV[d.getMonth()]
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-grafite-700 rounded w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-grafite-800 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-grafite-800 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-100">Controle Financeiro</h1>
        <div className="flex items-center gap-2 bg-grafite-800 rounded-lg p-1">
          <span className="text-xs text-gray-400 px-2">Periodo:</span>
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(parseInt(e.target.value, 10))}
            className="text-sm px-2 py-1.5 rounded-md bg-transparent border border-grafite-700 text-gray-200"
          >
            {MESES_LABEL.map((m, i) => (
              <option key={i} value={i} className="bg-grafite-800">{m}</option>
            ))}
          </select>
          <select
            value={anoFiltro}
            onChange={(e) => setAnoFiltro(parseInt(e.target.value, 10))}
            className="text-sm px-2 py-1.5 rounded-md bg-transparent border border-grafite-700 text-gray-200"
          >
            {anosDisponiveis.map((a) => (
              <option key={a} value={a} className="bg-grafite-800">{a}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-300">x</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Total a Receber</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {formatCurrency(totalReceber)}
          </p>
        </div>
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Total a Pagar</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {formatCurrency(totalPagar)}
          </p>
        </div>
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Saldo Projetado</p>
          <p className={`text-2xl font-bold mt-1 ${saldoProjetado >= 0 ? 'text-amarelo' : 'text-red-400'}`}>
            {formatCurrency(saldoProjetado)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 bg-grafite-900 p-1 rounded-lg w-fit min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setStatusFilter('') }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-amarelo text-grafite-950'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-grafite-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Todos os Lancamentos — visao agrupada (receitas verdes, despesas vermelhas) */}
      {activeTab === 'todos' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Todos os Lancamentos</h2>
                <p className="text-xs text-gray-500 mt-1">Agrupado por tipo. <span className="text-green-400">Verde</span> = entradas, <span className="text-red-400">vermelho</span> = saidas.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="select-field text-sm"
                >
                  <option value="">Todos status</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGO">Pago</option>
                  <option value="ATRASADO">Atrasado</option>
                </select>
                <button onClick={() => openNewEntry('RECEITA', 'RECEITA_PRINCIPAL')} className="btn-secondary text-sm px-3 py-2">
                  + Receita
                </button>
                <button onClick={() => openNewEntry('DESPESA', 'CUSTO_VARIAVEL')} className="btn-primary text-sm px-3 py-2">
                  + Despesa
                </button>
              </div>
            </div>
          </div>

          {(['RECEITA_PRINCIPAL', 'RECEITA_OUTRAS', 'CUSTO_FIXO', 'CUSTO_VARIAVEL'] as FinGroup[]).map((g) => {
            const items = grouped[g]
            const isReceita = g.startsWith('RECEITA')
            const total = groupTotal(g)
            if (items.length === 0) return null
            return (
              <div key={g} className="card">
                <div className={`flex items-center justify-between mb-3 pb-2 border-b ${isReceita ? 'border-green-900/50' : 'border-red-900/50'}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${isReceita ? 'text-green-400' : 'text-red-400'}`}>
                    {GROUP_LABELS[g]}
                    <span className="ml-2 text-xs text-gray-500 normal-case font-normal">({items.length} {items.length === 1 ? 'lancamento' : 'lancamentos'})</span>
                  </h3>
                  <span className={`text-sm font-bold ${isReceita ? 'text-green-400' : 'text-red-400'}`}>
                    {isReceita ? '+' : '-'} {formatCurrency(total)}
                  </span>
                </div>
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="table-header">
                        <th className="px-3 py-2 text-left">Data</th>
                        <th className="px-3 py-2 text-left">Mes</th>
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left">Descricao</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                        <th className="px-3 py-2 text-left">Pagamento</th>
                        <th className="px-3 py-2 text-left">Banco</th>
                        <th className="px-3 py-2 text-left">Observacao</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((entry) => {
                        const refDate = entry.paidDate || entry.dueDate
                        return (
                          <tr
                            key={entry.id}
                            onClick={() => openEditEntry(entry)}
                            className={`table-row cursor-pointer ${isReceita ? 'hover:bg-green-950/30' : 'hover:bg-red-950/20'}`}
                            title="Clique pra editar"
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-gray-300">{new Date(refDate).toLocaleDateString('pt-BR')}</td>
                            <td className="px-3 py-2 text-gray-400">{mesDe(refDate)}</td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{entry.code || '-'}</td>
                            <td className={`px-3 py-2 font-medium ${isReceita ? 'text-green-300' : 'text-red-300'}`}>{entry.description}</td>
                            <td className={`px-3 py-2 text-right font-semibold ${isReceita ? 'text-green-400' : 'text-red-400'}`}>
                              {isReceita ? '+' : '-'} {formatCurrency(entry.amount)}
                            </td>
                            <td className="px-3 py-2 text-gray-400">{entry.paymentMethod || '-'}</td>
                            <td className="px-3 py-2 text-gray-400">{entry.bankName || '-'}</td>
                            <td className="px-3 py-2 text-gray-500 text-xs">{entry.category || '-'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status]}`}>
                                {STATUS_LABELS[entry.status]}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {allFiltered.length === 0 && (
            <div className="card text-center py-12 text-gray-500">
              Nenhum lancamento no periodo selecionado.
            </div>
          )}

          {allFiltered.length > 0 && (
            <div className="card">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Receitas Principais</p>
                  <p className="text-green-400 font-bold">{formatCurrency(groupTotal('RECEITA_PRINCIPAL'))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Receitas Outras</p>
                  <p className="text-green-400 font-bold">{formatCurrency(groupTotal('RECEITA_OUTRAS'))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Custos Fixos</p>
                  <p className="text-red-400 font-bold">{formatCurrency(groupTotal('CUSTO_FIXO'))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Custos Variaveis</p>
                  <p className="text-red-400 font-bold">{formatCurrency(groupTotal('CUSTO_VARIAVEL'))}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contas a Receber */}
      {activeTab === 'receber' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Contas a Receber</h2>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-field text-sm"
              >
                <option value="">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
              <button onClick={() => openNewEntry('RECEITA')} className="btn-primary text-sm p-2 sm:px-4 sm:py-2">
                Novo Lancamento
              </button>
            </div>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Codigo</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-left">Descricao</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Data Pgto</th>
                  <th className="px-4 py-3 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceitas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Nenhum lancamento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredReceitas.map((entry) => (
                    <tr key={entry.id} className="table-row">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{entry.code || '-'}</td>
                      <td className="px-4 py-3">
                        {new Date(entry.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div>{entry.description}</div>
                        {(entry.bankName || entry.paymentMethod || entry.groupName) && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {entry.paymentMethod && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">{entry.paymentMethod}</span>
                            )}
                            {entry.bankName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">{entry.bankName}</span>
                            )}
                            {entry.groupName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">{entry.groupName}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{entry.categoryName || entry.category}</td>
                      <td className="px-4 py-3 text-right text-green-400">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status]}`}>
                          {STATUS_LABELS[entry.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {entry.paidDate
                          ? new Date(entry.paidDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {entry.attachmentData && (
                            <a
                              href={entry.attachmentData}
                              download={entry.attachmentName || 'boleto'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-amarelo hover:underline"
                              title="Ver boleto"
                            >
                              Boleto
                            </a>
                          )}
                          {entry.status !== 'PAGO' && (
                            <button
                              onClick={() => markAsPaid(entry)}
                              className="text-xs btn-secondary p-2"
                            >
                              Marcar como Pago
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredReceitas.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Nenhum lancamento encontrado.</p>
            ) : (
              filteredReceitas.map((entry) => (
                <div key={entry.id} className="bg-grafite-800 rounded-lg p-4 space-y-2">
                  {entry.code && <p className="font-mono text-xs text-gray-500">{entry.code}</p>}
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-100">{entry.description}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${STATUS_COLORS[entry.status]}`}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(entry.amount)}</p>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>Venc: {new Date(entry.dueDate).toLocaleDateString('pt-BR')}</span>
                    <span>{entry.category}</span>
                  </div>
                  {entry.paidDate && (
                    <p className="text-sm text-gray-400">Pago em: {new Date(entry.paidDate).toLocaleDateString('pt-BR')}</p>
                  )}
                  {entry.status !== 'PAGO' && (
                    <button
                      onClick={() => markAsPaid(entry)}
                      className="btn-secondary text-sm w-full p-2 mt-2"
                    >
                      Marcar como Pago
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Contas a Pagar */}
      {activeTab === 'pagar' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Contas a Pagar</h2>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-field text-sm"
              >
                <option value="">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
              <button onClick={() => openNewEntry('DESPESA')} className="btn-primary text-sm p-2 sm:px-4 sm:py-2">
                Novo Lancamento
              </button>
            </div>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Codigo</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-left">Descricao</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Data Pgto</th>
                  <th className="px-4 py-3 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredDespesas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Nenhum lancamento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredDespesas.map((entry) => (
                    <tr key={entry.id} className="table-row">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{entry.code || '-'}</td>
                      <td className="px-4 py-3">
                        {new Date(entry.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div>{entry.description}</div>
                        {(entry.bankName || entry.paymentMethod || entry.groupName) && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {entry.paymentMethod && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">{entry.paymentMethod}</span>
                            )}
                            {entry.bankName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">{entry.bankName}</span>
                            )}
                            {entry.groupName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">{entry.groupName}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{entry.categoryName || entry.category}</td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status]}`}>
                          {STATUS_LABELS[entry.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {entry.paidDate
                          ? new Date(entry.paidDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {entry.attachmentData && (
                            <a
                              href={entry.attachmentData}
                              download={entry.attachmentName || 'boleto'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-amarelo hover:underline"
                              title="Ver boleto"
                            >
                              Boleto
                            </a>
                          )}
                          {entry.status !== 'PAGO' && (
                            <button
                              onClick={() => markAsPaid(entry)}
                              className="text-xs btn-secondary p-2"
                            >
                              Marcar como Pago
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredDespesas.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Nenhum lancamento encontrado.</p>
            ) : (
              filteredDespesas.map((entry) => (
                <div key={entry.id} className="bg-grafite-800 rounded-lg p-4 space-y-2">
                  {entry.code && <p className="font-mono text-xs text-gray-500">{entry.code}</p>}
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-100">{entry.description}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${STATUS_COLORS[entry.status]}`}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(entry.amount)}</p>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>Venc: {new Date(entry.dueDate).toLocaleDateString('pt-BR')}</span>
                    <span>{entry.category}</span>
                  </div>
                  {entry.paidDate && (
                    <p className="text-sm text-gray-400">Pago em: {new Date(entry.paidDate).toLocaleDateString('pt-BR')}</p>
                  )}
                  {entry.status !== 'PAGO' && (
                    <button
                      onClick={() => markAsPaid(entry)}
                      className="btn-secondary text-sm w-full p-2 mt-2"
                    >
                      Marcar como Pago
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Custos Fixos */}
      {activeTab === 'fixos' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Custos Fixos</h2>
            <button onClick={openAddCost} className="btn-primary text-sm p-2 sm:px-4 sm:py-2">
              Novo Custo Fixo
            </button>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-center">Ativo</th>
                  <th className="px-4 py-3 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {fixedCosts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nenhum custo fixo cadastrado.
                    </td>
                  </tr>
                ) : (
                  fixedCosts.map((cost) => (
                    <tr key={cost.id} className="table-row">
                      <td className="px-4 py-3 font-medium">{cost.name}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(cost.amount)}</td>
                      <td className="px-4 py-3 text-gray-400">{cost.category}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleCostActive(cost)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            cost.active ? 'bg-amarelo' : 'bg-grafite-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              cost.active ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditCost(cost)}
                            className="p-2 text-amarelo hover:text-amarelo-light transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCost(cost.id)}
                            className="p-2 text-red-500 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {fixedCosts.length > 0 && (
                  <tr className="bg-grafite-900 font-semibold">
                    <td className="px-4 py-3 text-gray-300">TOTAL MENSAL</td>
                    <td className="px-4 py-3 text-right text-amarelo">
                      {formatCurrency(
                        fixedCosts
                          .filter((c) => c.active)
                          .reduce((s, c) => s + c.amount, 0)
                      )}
                    </td>
                    <td colSpan={3} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {fixedCosts.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Nenhum custo fixo cadastrado.</p>
            ) : (
              <>
                {fixedCosts.map((cost) => (
                  <div key={cost.id} className="bg-grafite-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-gray-100">{cost.name}</p>
                      <span className="text-xs text-gray-400 ml-2">{cost.category}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-100">{formatCurrency(cost.amount)}</p>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Ativo:</span>
                        <button
                          onClick={() => toggleCostActive(cost)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            cost.active ? 'bg-amarelo' : 'bg-grafite-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              cost.active ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditCost(cost)}
                          className="p-2 text-amarelo hover:text-amarelo-light transition-colors"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteCost(cost.id)}
                          className="p-2 text-red-500 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-grafite-900 rounded-lg p-4 flex items-center justify-between font-semibold">
                  <span className="text-gray-300">TOTAL MENSAL</span>
                  <span className="text-amarelo">
                    {formatCurrency(
                      fixedCosts
                        .filter((c) => c.active)
                        .reduce((s, c) => s + c.amount, 0)
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Impostos */}
      {activeTab === 'impostos' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Configuracao de Impostos</h2>
            <button onClick={openAddTax} className="btn-primary text-sm p-2 sm:px-4 sm:py-2">
              Novo Imposto
            </button>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-right">Aliquota</th>
                  <th className="px-4 py-3 text-center">Aplica-se a</th>
                  <th className="px-4 py-3 text-center">Ativo</th>
                  <th className="px-4 py-3 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {taxes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nenhum imposto configurado.
                    </td>
                  </tr>
                ) : (
                  taxes.map((tax) => (
                    <tr key={tax.id} className="table-row">
                      <td className="px-4 py-3 font-medium">{tax.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-grafite-700 px-2 py-0.5 rounded text-xs">
                          {tax.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{tax.rate.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-center text-gray-400">
                        {APPLIES_TO_OPTIONS.find((o) => o.value === tax.appliesTo)?.label || tax.appliesTo}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleTaxActive(tax)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            tax.active ? 'bg-amarelo' : 'bg-grafite-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              tax.active ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditTax(tax)}
                            className="p-2 text-amarelo hover:text-amarelo-light transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteTax(tax.id)}
                            className="p-2 text-red-500 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {taxes.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Nenhum imposto configurado.</p>
            ) : (
              taxes.map((tax) => (
                <div key={tax.id} className="bg-grafite-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-100">{tax.name}</p>
                    <span className="bg-grafite-700 px-2 py-0.5 rounded text-xs ml-2">
                      {tax.type}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-100">{tax.rate.toFixed(2)}%</p>
                  <p className="text-sm text-gray-400">
                    Aplica-se a: {APPLIES_TO_OPTIONS.find((o) => o.value === tax.appliesTo)?.label || tax.appliesTo}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Ativo:</span>
                      <button
                        onClick={() => toggleTaxActive(tax)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          tax.active ? 'bg-amarelo' : 'bg-grafite-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            tax.active ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditTax(tax)}
                        className="p-2 text-amarelo hover:text-amarelo-light transition-colors"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteTax(tax.id)}
                        className="p-2 text-red-500 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Integracoes (mockup de apresentacao) */}
      {activeTab === 'integracoes' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amarelo/10 border border-amarelo/30 flex items-center justify-center flex-shrink-0">
                <span className="text-amarelo text-lg">⚡</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Integracoes Bancarias e Fiscais</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Automatize tarefas que hoje voce faz manualmente: sincronizar extratos, emitir notas fiscais, conciliar boletos.
                  Os precos abaixo sao referencias de mercado para dimensionar o investimento.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Open Finance */}
            <div className="card border-l-4 border-blue-500/70">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-900/30 border border-blue-500/30 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">🏦</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-100">Sincronizacao Bancaria (Open Finance)</h3>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">Extrato + saldo em tempo real</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">Nao ativo</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Conecta diretamente aos bancos do SteelArt (Banco A, B, Sicred, Helio, Jonathan) e puxa extratos e saldos automaticamente.
                Adeus digitacao manual de cada movimentacao.
              </p>
              <ul className="text-xs text-gray-300 space-y-1 mb-4">
                <li className="flex gap-2"><span className="text-green-400">✓</span> Lancamentos do banco viram receitas/despesas automaticamente</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Saldo real de cada banco no dashboard</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Concilia pagamentos recebidos com orcamentos aprovados</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Funciona com todos os bancos certificados pelo BC</li>
              </ul>
              <div className="border-t border-grafite-700 pt-3 space-y-2">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Providers compativeis</p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">Pluggy</p>
                    <p className="text-gray-400">R$ 500 - 1.200/mes</p>
                  </div>
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">Belvo</p>
                    <p className="text-gray-400">R$ 800 - 1.500/mes</p>
                  </div>
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">Klavi</p>
                    <p className="text-gray-400">R$ 600 - 1.000/mes</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">+ setup unico R$ 0 a R$ 2.500 conforme provider. Implantacao: 2 a 3 semanas.</p>
              </div>
              <button
                onClick={() => alert('Demo: em produto final, este botao abriria o wizard de OAuth com o banco escolhido.')}
                className="btn-secondary w-full text-sm mt-3"
              >
                Ver demonstracao
              </button>
            </div>

            {/* Card 2: Emissao NF-e */}
            <div className="card border-l-4 border-green-500/70">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-900/30 border border-green-500/30 flex items-center justify-center">
                    <span className="text-green-400 text-lg">📄</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-100">Emissao de NF-e</h3>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">Nota fiscal eletronica</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">Nao ativo</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Emite NF-e direto do orcamento aprovado. Sem precisar abrir outro sistema, sem retrabalho de digitacao, sem risco de inconsistencia entre o orcamento e a nota.
              </p>
              <ul className="text-xs text-gray-300 space-y-1 mb-4">
                <li className="flex gap-2"><span className="text-green-400">✓</span> Botao &quot;Emitir NF-e&quot; na tela do orcamento aprovado</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> XML + DANFE (PDF) gerados automatico</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Cancelamento e correcao diretamente no sistema</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Historico de todas as NFes emitidas</li>
              </ul>
              <div className="border-t border-grafite-700 pt-3 space-y-2">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Providers compativeis</p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">Focus NFe</p>
                    <p className="text-gray-400">R$ 49 - 249/mes</p>
                  </div>
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">PlugNotas</p>
                    <p className="text-gray-400">R$ 79 - 299/mes</p>
                  </div>
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">NFe.io</p>
                    <p className="text-gray-400">R$ 60 - 200/mes</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">+ Certificado digital A1: R$ 180 a R$ 280/ano. Implantacao: 1 a 2 semanas.</p>
              </div>
              <button
                onClick={() => alert('Demo: em producao, este botao abriria o cadastro NCM/CFOP + upload do certificado A1.')}
                className="btn-secondary w-full text-sm mt-3"
              >
                Ver demonstracao
              </button>
            </div>

            {/* Card 3: DDA boletos */}
            <div className="card border-l-4 border-purple-500/70">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-900/30 border border-purple-500/30 flex items-center justify-center">
                    <span className="text-purple-400 text-lg">🧾</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-100">DDA - Boletos Automaticos</h3>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">Receber boletos direto no sistema</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">Nao ativo</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Todo boleto emitido contra o CNPJ da SteelArt chega direto no sistema. Nao precisa mais abrir o internet banking toda segunda pra ver &quot;o que esta por pagar&quot;.
              </p>
              <ul className="text-xs text-gray-300 space-y-1 mb-4">
                <li className="flex gap-2"><span className="text-green-400">✓</span> Lista automatica de todos os boletos em aberto</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Alerta por e-mail ou WhatsApp de vencimento</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Pagamento com 1 clique (via Pix ou agendamento)</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Historico + comprovantes arquivados automatico</li>
              </ul>
              <div className="border-t border-grafite-700 pt-3 space-y-2">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Providers compativeis</p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">Pluggy DDA</p>
                    <p className="text-gray-400">Incluso no Open Finance</p>
                  </div>
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">Asaas</p>
                    <p className="text-gray-400">R$ 0 - 49/mes + taxa</p>
                  </div>
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">Iugu</p>
                    <p className="text-gray-400">R$ 0 + 1,99%/boleto</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">Se Open Finance ja estiver contratado, DDA vem junto. Implantacao: 1 semana.</p>
              </div>
              <button
                onClick={() => alert('Demo: em producao, este botao conectaria o DDA via provider contratado.')}
                className="btn-secondary w-full text-sm mt-3"
              >
                Ver demonstracao
              </button>
            </div>

            {/* Card 4: OCR boletos */}
            <div className="card border-l-4 border-amarelo/70">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amarelo/10 border border-amarelo/30 flex items-center justify-center">
                    <span className="text-amarelo text-lg">📷</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-100">Leitura Automatica de Boletos</h3>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">OCR do codigo de barras</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">Base ja existe</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Alternativa barata ao DDA enquanto o Open Finance nao esta contratado. Ao anexar o boleto (PDF ou foto) no lancamento de despesa,
                o sistema le o codigo de barras e ja preenche valor + vencimento.
              </p>
              <ul className="text-xs text-gray-300 space-y-1 mb-4">
                <li className="flex gap-2"><span className="text-green-400">✓</span> Ja temos upload de boleto (funcionalidade atual)</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Leitura automatica de valor + vencimento + banco emissor</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Preenchimento automatico do lancamento</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Sem custo de API: biblioteca open-source</li>
              </ul>
              <div className="border-t border-grafite-700 pt-3 space-y-2">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Tecnologia</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">zxing (barcode)</p>
                    <p className="text-gray-400">R$ 0/mes</p>
                  </div>
                  <div className="bg-grafite-800 rounded p-2 border border-grafite-700">
                    <p className="font-semibold text-gray-200">Tesseract OCR</p>
                    <p className="text-gray-400">R$ 0/mes</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">Implementacao: 1 semana de desenvolvimento. Sem custo recorrente.</p>
              </div>
              <button
                onClick={() => alert('Demo: anexe um boleto em qualquer lancamento de despesa. Em producao, o OCR preencheria valor + vencimento automaticamente.')}
                className="btn-secondary w-full text-sm mt-3"
              >
                Ver demonstracao
              </button>
            </div>
          </div>

          {/* Resumo de custos */}
          <div className="card border border-amarelo/30 bg-amarelo/5">
            <h3 className="text-sm font-bold text-amarelo uppercase tracking-wider mb-4">Resumo de Custos - Pacote Completo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2 text-left">Integracao</th>
                    <th className="px-3 py-2 text-left">Provider sugerido</th>
                    <th className="px-3 py-2 text-right">Setup unico</th>
                    <th className="px-3 py-2 text-right">Mensal</th>
                    <th className="px-3 py-2 text-right">Anual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="table-row">
                    <td className="px-3 py-2 text-gray-200">Open Finance (bancos)</td>
                    <td className="px-3 py-2 text-gray-400">Pluggy</td>
                    <td className="px-3 py-2 text-right text-gray-400">R$ 1.500</td>
                    <td className="px-3 py-2 text-right text-gray-200">R$ 800</td>
                    <td className="px-3 py-2 text-right text-gray-200">R$ 9.600</td>
                  </tr>
                  <tr className="table-row">
                    <td className="px-3 py-2 text-gray-200">Emissao NF-e</td>
                    <td className="px-3 py-2 text-gray-400">Focus NFe</td>
                    <td className="px-3 py-2 text-right text-gray-400">R$ 220 (cert)</td>
                    <td className="px-3 py-2 text-right text-gray-200">R$ 149</td>
                    <td className="px-3 py-2 text-right text-gray-200">R$ 1.788</td>
                  </tr>
                  <tr className="table-row">
                    <td className="px-3 py-2 text-gray-200">DDA boletos</td>
                    <td className="px-3 py-2 text-gray-400">Incluso no Pluggy</td>
                    <td className="px-3 py-2 text-right text-gray-500">—</td>
                    <td className="px-3 py-2 text-right text-gray-500">—</td>
                    <td className="px-3 py-2 text-right text-gray-500">—</td>
                  </tr>
                  <tr className="table-row">
                    <td className="px-3 py-2 text-gray-200">Leitura de boleto (OCR)</td>
                    <td className="px-3 py-2 text-gray-400">Interno (open-source)</td>
                    <td className="px-3 py-2 text-right text-gray-400">R$ 0</td>
                    <td className="px-3 py-2 text-right text-gray-200">R$ 0</td>
                    <td className="px-3 py-2 text-right text-gray-200">R$ 0</td>
                  </tr>
                  <tr className="border-t-2 border-amarelo/40 font-bold">
                    <td className="px-3 py-3 text-amarelo" colSpan={2}>TOTAL ESTIMADO</td>
                    <td className="px-3 py-3 text-right text-amarelo">R$ 1.720</td>
                    <td className="px-3 py-3 text-right text-amarelo">R$ 949</td>
                    <td className="px-3 py-3 text-right text-amarelo">R$ 11.388</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              * Valores de referencia do mercado em abril/2026. Conforme o volume real de NFes e transacoes bancarias, os planos podem ser dimensionados pra mais ou menos.
              O setup unico inclui certificado A1 (R$ 220) + implantacao Pluggy (R$ 1.500).
            </p>
          </div>

          {/* Retorno sobre investimento */}
          <div className="card">
            <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider mb-3">Retorno esperado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-grafite-800 rounded-lg p-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Tempo economizado</p>
                <p className="text-2xl font-bold text-green-400">~8h/mes</p>
                <p className="text-xs text-gray-400 mt-1">Deixa de lancar extrato e boletos manualmente</p>
              </div>
              <div className="bg-grafite-800 rounded-lg p-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Erros evitados</p>
                <p className="text-2xl font-bold text-blue-400">&gt; 95%</p>
                <p className="text-xs text-gray-400 mt-1">Conciliacao automatica elimina digitacao errada</p>
              </div>
              <div className="bg-grafite-800 rounded-lg p-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Compliance fiscal</p>
                <p className="text-2xl font-bold text-amarelo">100%</p>
                <p className="text-xs text-gray-400 mt-1">NF-e emitida na hora, sem risco de autuacao</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center italic">
            Esta tela e uma demonstracao das integracoes disponiveis. Os valores sao referencias de mercado e a ativacao real requer contratacao dos providers correspondentes.
          </p>
        </div>
      )}

      {/* New Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl my-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              {entryForm.id ? 'Editar' : 'Novo'} Lancamento - {entryForm.type === 'RECEITA' ? 'Receita' : 'Despesa'}
            </h2>
            <div className="space-y-4">
              {/* Linha 1: Tipo + Grupo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Tipo</label>
                  <select
                    value={entryForm.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'RECEITA' | 'DESPESA'
                      const newGroup: FinGroup =
                        newType === 'RECEITA' ? 'RECEITA_PRINCIPAL' : 'CUSTO_VARIAVEL'
                      setEntryForm({ ...entryForm, type: newType, group: newGroup, description: '' })
                    }}
                    className="select-field w-full"
                  >
                    <option value="RECEITA">Receita (entrada)</option>
                    <option value="DESPESA">Despesa (saida)</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Grupo</label>
                  <select
                    value={entryForm.group}
                    onChange={(e) => setEntryForm({ ...entryForm, group: e.target.value as FinGroup, description: '' })}
                    className="select-field w-full"
                  >
                    {entryForm.type === 'RECEITA' ? (
                      <>
                        <option value="RECEITA_PRINCIPAL">{GROUP_LABELS.RECEITA_PRINCIPAL}</option>
                        <option value="RECEITA_OUTRAS">{GROUP_LABELS.RECEITA_OUTRAS}</option>
                      </>
                    ) : (
                      <>
                        <option value="CUSTO_FIXO">{GROUP_LABELS.CUSTO_FIXO}</option>
                        <option value="CUSTO_VARIAVEL">{GROUP_LABELS.CUSTO_VARIAVEL}</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Linha 2: Descricao (select do grupo + campo livre) */}
              <div>
                <label className="label-field">
                  Descricao <span className="text-xs text-gray-500">(escolha da lista ou digite)</span>
                </label>
                {(() => {
                  const opts = descriptionsForGroup(entryForm.group || null as any)
                  if (opts.length === 0) {
                    return (
                      <input
                        type="text"
                        value={entryForm.description}
                        onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                        className="input-field"
                        placeholder="Descricao do lancamento"
                      />
                    )
                  }
                  return (
                    <div className="space-y-2">
                      <select
                        value={opts.find((o) => o.name === entryForm.description) ? entryForm.description : '__custom__'}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === '__custom__') {
                            setEntryForm({ ...entryForm, description: '' })
                          } else {
                            setEntryForm({ ...entryForm, description: v })
                          }
                        }}
                        className="select-field w-full"
                      >
                        {opts.map((o) => (
                          <option key={o.id} value={o.name}>{o.name}</option>
                        ))}
                        <option value="__custom__">Outro (digitar livre)</option>
                      </select>
                      {!opts.find((o) => o.name === entryForm.description) && (
                        <input
                          type="text"
                          value={entryForm.description}
                          onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                          className="input-field"
                          placeholder="Digite a descricao"
                          autoFocus
                        />
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Linha 3: Valor + Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryForm.amount || ''}
                    onChange={(e) => setEntryForm({ ...entryForm, amount: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="label-field">Data de Vencimento</label>
                  <input
                    type="date"
                    value={entryForm.dueDate}
                    onChange={(e) => setEntryForm({ ...entryForm, dueDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Linha 4: Banco + Forma de pagamento (em ambos os tipos) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Banco</label>
                  <select
                    value={entryForm.bankName}
                    onChange={(e) => setEntryForm({ ...entryForm, bankName: e.target.value })}
                    className="select-field w-full"
                    disabled={banks.length === 0}
                  >
                    <option value="">{banks.length === 0 ? 'Nenhum banco cadastrado' : 'Selecione...'}</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Forma de Pagamento</label>
                  <select
                    value={entryForm.paymentMethod}
                    onChange={(e) => setEntryForm({ ...entryForm, paymentMethod: e.target.value })}
                    className="select-field w-full"
                    disabled={paymentMethods.length === 0}
                  >
                    <option value="">{paymentMethods.length === 0 ? 'Nenhuma cadastrada' : 'Selecione...'}</option>
                    {paymentMethods.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {(banks.length === 0 || paymentMethods.length === 0 || descriptionsForGroup(entryForm.group || null as any).length === 0) && (
                <p className="text-xs text-gray-500">
                  Dica: cadastre opcoes em <a href="/configuracoes" className="text-amarelo hover:underline">Configuracoes &gt; Financeiro</a>.
                  Use o botao <em>&quot;Popular com padrao&quot;</em> pra pre-carregar tudo.
                </p>
              )}

              {/* Observacao */}
              <div>
                <label className="label-field">Observacao (opcional)</label>
                <input
                  type="text"
                  value={entryForm.category}
                  onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Fabricacao, Ferro Velho, Mesas..."
                />
              </div>

              {/* Anexo do boleto (PDF ou imagem) */}
              <div>
                <label className="label-field">Anexar boleto (PDF ou imagem, max 3MB)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
                  className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-grafite-700 file:text-gray-200 file:text-xs file:cursor-pointer"
                />
                {attachmentError && (
                  <p className="text-xs text-red-400 mt-1">{attachmentError}</p>
                )}
                {entryForm.attachmentName && !attachmentError && (
                  <p className="text-xs text-green-400 mt-1">
                    Anexado: {entryForm.attachmentName}
                  </p>
                )}
              </div>

              {/* Ja paga? — evita ter que ir uma por uma depois marcando como pago */}
              <div className="border-t border-grafite-700 pt-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={entryForm.paidNow}
                    onChange={(e) => setEntryForm({
                      ...entryForm,
                      paidNow: e.target.checked,
                      paidDate: e.target.checked ? (entryForm.paidDate || todayISO()) : '',
                    })}
                    className="h-5 w-5 rounded bg-grafite-800 border-grafite-600 text-amarelo focus:ring-amarelo"
                  />
                  <span className="text-sm text-gray-200 font-medium">
                    Ja foi paga — salvar direto como PAGO
                  </span>
                </label>
                {entryForm.paidNow && (
                  <div className="mt-3">
                    <label className="label-field">Data do Pagamento</label>
                    <input
                      type="date"
                      value={entryForm.paidDate}
                      onChange={(e) => setEntryForm({ ...entryForm, paidDate: e.target.value })}
                      className="input-field"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEntryModal(false)} className="btn-secondary" disabled={savingEntry}>
                Cancelar
              </button>
              <button onClick={saveEntry} className="btn-primary" disabled={savingEntry}>
                {savingEntry ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Cost Modal */}
      {showCostModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              {editingCost ? 'Editar Custo Fixo' : 'Novo Custo Fixo'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label-field">Nome</label>
                <input
                  type="text"
                  value={costForm.name}
                  onChange={(e) => setCostForm({ ...costForm, name: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Aluguel Galpao"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costForm.amount || ''}
                    onChange={(e) => setCostForm({ ...costForm, amount: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Categoria</label>
                  <select
                    value={costForm.category}
                    onChange={(e) => setCostForm({ ...costForm, category: e.target.value })}
                    className="select-field w-full"
                  >
                    {FIXED_COST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="label-field mb-0">Ativo</label>
                <button
                  type="button"
                  onClick={() => setCostForm({ ...costForm, active: !costForm.active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    costForm.active ? 'bg-amarelo' : 'bg-grafite-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      costForm.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCostModal(false)} className="btn-secondary" disabled={savingCost}>
                Cancelar
              </button>
              <button onClick={saveCost} className="btn-primary" disabled={savingCost}>
                {savingCost ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              {editingTax ? 'Editar Imposto' : 'Novo Imposto'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label-field">Nome</label>
                <input
                  type="text"
                  value={taxForm.name}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  className="input-field"
                  placeholder="Ex: ISS Servicos"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label-field">Tipo</label>
                  <select
                    value={taxForm.type}
                    onChange={(e) => setTaxForm({ ...taxForm, type: e.target.value })}
                    className="select-field w-full"
                  >
                    {TAX_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Aliquota (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxForm.rate || ''}
                    onChange={(e) => setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Aplica-se a</label>
                  <select
                    value={taxForm.appliesTo}
                    onChange={(e) => setTaxForm({ ...taxForm, appliesTo: e.target.value })}
                    className="select-field w-full"
                  >
                    {APPLIES_TO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="label-field mb-0">Ativo</label>
                <button
                  type="button"
                  onClick={() => setTaxForm({ ...taxForm, active: !taxForm.active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    taxForm.active ? 'bg-amarelo' : 'bg-grafite-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      taxForm.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowTaxModal(false)} className="btn-secondary" disabled={savingTax}>
                Cancelar
              </button>
              <button onClick={saveTax} className="btn-primary" disabled={savingTax}>
                {savingTax ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
