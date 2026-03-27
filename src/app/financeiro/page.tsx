'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/calculations'

interface FinancialEntry {
  id: string
  type: 'RECEITA' | 'DESPESA'
  category: string
  description: string
  amount: number
  dueDate: string
  paidDate: string | null
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO'
  budgetId: string | null
  projectId: string | null
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

type Tab = 'receber' | 'pagar' | 'fixos' | 'impostos'

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
  const [activeTab, setActiveTab] = useState<Tab>('receber')
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [taxes, setTaxes] = useState<TaxConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Entry modal
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [entryForm, setEntryForm] = useState({
    type: 'DESPESA' as string,
    category: '',
    description: '',
    amount: 0,
    dueDate: '',
    status: 'PENDENTE',
  })
  const [savingEntry, setSavingEntry] = useState(false)

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
      const [entriesRes, costsRes, taxesRes] = await Promise.all([
        fetch('/api/financial'),
        fetch('/api/fixed-costs'),
        fetch('/api/taxes'),
      ])
      if (!entriesRes.ok) throw new Error('Erro ao carregar lancamentos')
      if (!costsRes.ok) throw new Error('Erro ao carregar custos fixos')

      setEntries(await entriesRes.json())
      setFixedCosts(await costsRes.json())
      if (taxesRes.ok) {
        setTaxes(await taxesRes.json())
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

  // Computed values
  const receitas = entries.filter((e) => e.type === 'RECEITA')
  const despesas = entries.filter((e) => e.type === 'DESPESA')
  const totalReceber = receitas
    .filter((e) => e.status !== 'PAGO')
    .reduce((s, e) => s + e.amount, 0)
  const totalPagar = despesas
    .filter((e) => e.status !== 'PAGO')
    .reduce((s, e) => s + e.amount, 0)
  const saldoProjetado = totalReceber - totalPagar

  // Filter entries by status
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

  // Create entry
  const openNewEntry = (type: 'RECEITA' | 'DESPESA') => {
    setEntryForm({
      type,
      category: '',
      description: '',
      amount: 0,
      dueDate: '',
      status: 'PENDENTE',
    })
    setShowEntryModal(true)
  }

  const saveEntry = async () => {
    setSavingEntry(true)
    setError('')
    try {
      const res = await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryForm),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar lancamento')
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
    { key: 'receber', label: 'Contas a Receber' },
    { key: 'pagar', label: 'Contas a Pagar' },
    { key: 'fixos', label: 'Custos Fixos' },
    { key: 'impostos', label: 'Impostos' },
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-grafite-700 rounded w-64" />
          <div className="grid grid-cols-3 gap-4">
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
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Financeiro</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-300">x</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <div className="flex gap-1 bg-grafite-900 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setStatusFilter('') }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-amarelo text-grafite-950'
                : 'text-gray-400 hover:text-gray-200 hover:bg-grafite-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contas a Receber */}
      {activeTab === 'receber' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
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
              <button onClick={() => openNewEntry('RECEITA')} className="btn-primary text-sm">
                Novo Lancamento
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
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
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhum lancamento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredReceitas.map((entry) => (
                    <tr key={entry.id} className="table-row">
                      <td className="px-4 py-3">
                        {new Date(entry.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-medium">{entry.description}</td>
                      <td className="px-4 py-3 text-gray-400">{entry.category}</td>
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
                        {entry.status !== 'PAGO' && (
                          <button
                            onClick={() => markAsPaid(entry)}
                            className="text-xs btn-secondary py-1 px-2"
                          >
                            Marcar como Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contas a Pagar */}
      {activeTab === 'pagar' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
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
              <button onClick={() => openNewEntry('DESPESA')} className="btn-primary text-sm">
                Novo Lancamento
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
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
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhum lancamento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredDespesas.map((entry) => (
                    <tr key={entry.id} className="table-row">
                      <td className="px-4 py-3">
                        {new Date(entry.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-medium">{entry.description}</td>
                      <td className="px-4 py-3 text-gray-400">{entry.category}</td>
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
                        {entry.status !== 'PAGO' && (
                          <button
                            onClick={() => markAsPaid(entry)}
                            className="text-xs btn-secondary py-1 px-2"
                          >
                            Marcar como Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custos Fixos */}
      {activeTab === 'fixos' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Custos Fixos</h2>
            <button onClick={openAddCost} className="btn-primary text-sm">
              Novo Custo Fixo
            </button>
          </div>
          <div className="overflow-x-auto">
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
                            className="text-amarelo hover:text-amarelo-light transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCost(cost.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
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
        </div>
      )}

      {/* Impostos */}
      {activeTab === 'impostos' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Configuracao de Impostos</h2>
            <button onClick={openAddTax} className="btn-primary text-sm">
              Novo Imposto
            </button>
          </div>
          <div className="overflow-x-auto">
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
                            className="text-amarelo hover:text-amarelo-light transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteTax(tax.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
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
        </div>
      )}

      {/* New Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              Novo Lancamento - {entryForm.type === 'RECEITA' ? 'Receita' : 'Despesa'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label-field">Descricao</label>
                <input
                  type="text"
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  className="input-field"
                  placeholder="Descricao do lancamento"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Categoria</label>
                  <input
                    type="text"
                    value={entryForm.category}
                    onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
                    className="input-field"
                    placeholder="Ex: Material, Servico"
                  />
                </div>
                <div>
                  <label className="label-field">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryForm.amount || ''}
                    onChange={(e) => setEntryForm({ ...entryForm, amount: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
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
              <div className="grid grid-cols-3 gap-4">
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
