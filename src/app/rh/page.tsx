'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { formatCurrency, BUSINESS_DAYS_PER_MONTH, WORK_HOURS_PER_DAY, WORK_START_TIME, WORK_END_TIME } from '@/lib/calculations'

type DeductionType = 'ALMOCO' | 'MARMITA' | 'VALE' | 'ADIANTAMENTO' | 'EPI' | 'FALTA' | 'MEIO_PERIODO' | 'OUTROS'

interface EmployeeDeduction {
  id: string
  employeeId: string
  type: DeductionType
  amount: number
  date: string
  description: string
}

interface Employee {
  id: string
  name: string
  role: string
  dailyCost: number
  monthlyCost: number // legado — mantido como dailyCost * 22
  benefits: number
  active: boolean
  deductions: EmployeeDeduction[]
}

// FALTA e MEIO_PERIODO tem amount auto-calculado a partir do dailyCost no backend
const DEDUCTION_TYPES: { value: DeductionType; label: string; autoAmount?: boolean }[] = [
  { value: 'ALMOCO', label: 'Almoco' },
  { value: 'MARMITA', label: 'Marmita' },
  { value: 'VALE', label: 'Vale' },
  { value: 'ADIANTAMENTO', label: 'Adiantamento' },
  { value: 'EPI', label: 'EPI' },
  { value: 'FALTA', label: 'Falta (dia inteiro)', autoAmount: true },
  { value: 'MEIO_PERIODO', label: 'Meio-periodo', autoAmount: true },
  { value: 'OUTROS', label: 'Outros' },
]

const emptyEmployee = {
  name: '',
  role: '',
  dailyCost: 0,
  benefits: 0,
  active: true,
}

// Conta quantos dias tem um mes (YYYY-MM string)
function daysInMonth(yyyymm: string): number {
  const [year, m] = yyyymm.split('-').map(Number)
  return new Date(year, m, 0).getDate()
}

export default function RHPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Employee modal
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState(emptyEmployee)
  const [saving, setSaving] = useState(false)

  // Expanded employee rows
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Vale form
  const [valeForm, setValeForm] = useState({
    type: 'ALMOCO' as string,
    amount: 0,
    description: '',
  })
  const [savingVale, setSavingVale] = useState(false)

  // Monthly closing
  const [closingMonth, setClosingMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const fetchEmployees = useCallback(async (month?: string) => {
    setLoading(true)
    setError('')
    try {
      const url = month ? `/api/employees?month=${month}` : '/api/employees'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao carregar funcionarios')
      setEmployees(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees(closingMonth)
  }, [fetchEmployees, closingMonth])

  // Gerar lancamento financeiro de folha (FOLHA) para um funcionario
  const [generatingPayroll, setGeneratingPayroll] = useState<string>('')
  const [payrollSuccess, setPayrollSuccess] = useState<string>('')

  const generatePayroll = async (emp: Employee) => {
    const [year, month] = closingMonth.split('-').map(Number)
    const days = daysInMonth(closingMonth)
    const gross = emp.dailyCost * days
    const ded = emp.deductions.reduce((s, d) => s + d.amount, 0)
    const liquido = gross + emp.benefits - ded
    if (liquido <= 0) {
      setError('Liquido invalido (<=0), verifique salario e deducoes')
      return
    }
    setGeneratingPayroll(emp.id)
    setError('')
    setPayrollSuccess('')
    try {
      const lastDay = new Date(year, month, 0).toISOString().slice(0, 10)
      const monthLabel = String(month).padStart(2, '0')
      const res = await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DESPESA',
          category: 'FOLHA',
          description: `Salario ${emp.name} - ${monthLabel}/${year}`,
          amount: liquido,
          dueDate: lastDay,
          status: 'PENDENTE',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao gerar lancamento')
      }
      setPayrollSuccess(`Lancamento de salario de ${emp.name} gerado (${formatCurrency(liquido)})`)
      setTimeout(() => setPayrollSuccess(''), 4000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGeneratingPayroll('')
    }
  }

  // Stats
  const activeEmployees = employees.filter((e) => e.active)
  const totalEmployees = activeEmployees.length
  const totalDailyPayroll = activeEmployees.reduce((s, e) => s + e.dailyCost, 0)
  const avgHourlyCost = totalEmployees > 0 ? totalDailyPayroll / totalEmployees / WORK_HOURS_PER_DAY : 0
  // Folha estimada do mes atual (dailyCost * dias do mes)
  const currentMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const totalMonthlyPayrollEstimate = totalDailyPayroll * currentMonthDays

  // Employee CRUD
  const openAddModal = () => {
    setEditingEmployee(null)
    setFormData({ ...emptyEmployee })
    setShowModal(true)
  }

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp)
    setFormData({
      name: emp.name,
      role: emp.role,
      dailyCost: emp.dailyCost || (emp.monthlyCost ? emp.monthlyCost / BUSINESS_DAYS_PER_MONTH : 0),
      benefits: emp.benefits,
      active: emp.active,
    })
    setShowModal(true)
  }

  const saveEmployee = async () => {
    setSaving(true)
    setError('')
    try {
      const method = editingEmployee ? 'PUT' : 'POST'
      const body = editingEmployee
        ? { id: editingEmployee.id, ...formData }
        : formData
      const res = await fetch('/api/employees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar funcionario')
      }
      setShowModal(false)
      await fetchEmployees()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Deductions
  const launchVale = async (employeeId: string) => {
    const isAuto = valeForm.type === 'FALTA' || valeForm.type === 'MEIO_PERIODO'
    if (!isAuto && valeForm.amount <= 0) {
      setError('Valor do lancamento deve ser maior que zero')
      return
    }
    setSavingVale(true)
    setError('')
    try {
      const res = await fetch(`/api/employees/${employeeId}/deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valeForm),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao lancar vale')
      }
      setValeForm({ type: 'ALMOCO', amount: 0, description: '' })
      await fetchEmployees()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingVale(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
    setValeForm({ type: 'ALMOCO', amount: 0, description: '' })
  }

  const getDeductionTotal = (deductions: EmployeeDeduction[]) =>
    deductions.reduce((s, d) => s + d.amount, 0)

  const getDeductionTypeLabel = (type: string) =>
    DEDUCTION_TYPES.find((t) => t.value === type)?.label || type

  if (loading) {
    return (
      <div className="p-8">
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
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Equipe e Custos de Mao de Obra</h1>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2 p-2 sm:px-4 sm:py-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Novo Funcionario</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-300">x</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Total Funcionarios</p>
          <p className="text-2xl font-bold text-amarelo mt-1">{totalEmployees}</p>
        </div>
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Folha Diaria</p>
          <p className="text-2xl font-bold text-amarelo mt-1">
            {formatCurrency(totalDailyPayroll)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Estimativa mes atual: {formatCurrency(totalMonthlyPayrollEstimate)}
          </p>
        </div>
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Custo Medio/Hora</p>
          <p className="text-2xl font-bold text-amarelo mt-1">
            {formatCurrency(avgHourlyCost)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Jornada: {WORK_START_TIME}-{WORK_END_TIME} ({WORK_HOURS_PER_DAY}h/dia)
          </p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Funcionarios</h2>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left w-8" />
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Funcao</th>
                <th className="px-4 py-3 text-right">Salario/Dia</th>
                <th className="px-4 py-3 text-right">Valor/Hora</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhum funcionario cadastrado.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const hourlyRate = emp.dailyCost / WORK_HOURS_PER_DAY
                  const isExpanded = expandedId === emp.id
                  const totalDeductions = getDeductionTotal(emp.deductions)
                  // Preview mes atual: dailyCost * dias corridos do mes - deducoes
                  const grossMonth = emp.dailyCost * currentMonthDays
                  const netPayment = grossMonth - totalDeductions

                  return (
                    <Fragment key={emp.id}>
                      <tr className={`table-row cursor-pointer ${isExpanded ? 'bg-grafite-700/30' : ''}`}>
                        <td className="px-4 py-3" onClick={() => toggleExpand(emp.id)}>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                        <td className="px-4 py-3 font-medium" onClick={() => toggleExpand(emp.id)}>
                          {emp.name}
                        </td>
                        <td className="px-4 py-3 text-gray-400" onClick={() => toggleExpand(emp.id)}>
                          {emp.role}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={() => toggleExpand(emp.id)}>
                          {formatCurrency(emp.dailyCost)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400" onClick={() => toggleExpand(emp.id)}>
                          {formatCurrency(hourlyRate)}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={() => toggleExpand(emp.id)}>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              emp.active
                                ? 'bg-green-900/50 text-green-400'
                                : 'bg-red-900/50 text-red-400'
                            }`}
                          >
                            {emp.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-2 text-amarelo hover:text-amarelo-light transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-grafite-900/50">
                            <div className="space-y-4">
                              {/* Monthly Summary */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-grafite-800 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Bruto mes atual ({currentMonthDays} dias)</p>
                                  <p className="text-lg font-semibold text-gray-200">
                                    {formatCurrency(grossMonth)}
                                  </p>
                                </div>
                                <div className="bg-grafite-800 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Total Deducoes</p>
                                  <p className="text-lg font-semibold text-red-400">
                                    - {formatCurrency(totalDeductions)}
                                  </p>
                                </div>
                                <div className="bg-grafite-800 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Liquido (preview)</p>
                                  <p className="text-lg font-semibold text-green-400">
                                    {formatCurrency(netPayment)}
                                  </p>
                                </div>
                              </div>

                              {/* Deductions List */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-300 mb-2">
                                  Deducoes do Mes Atual
                                </h4>
                                {emp.deductions.length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">
                                    Nenhuma deducao neste mes.
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    {emp.deductions.map((ded) => (
                                      <div
                                        key={ded.id}
                                        className="flex items-center justify-between bg-grafite-800 rounded px-3 py-3 text-sm"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs bg-grafite-700 px-2 py-1 rounded text-gray-300">
                                            {getDeductionTypeLabel(ded.type)}
                                          </span>
                                          <span className="text-gray-400">
                                            {ded.description || '-'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="text-gray-500 text-xs">
                                            {new Date(ded.date).toLocaleDateString('pt-BR')}
                                          </span>
                                          <span className="text-red-400 font-medium">
                                            - {formatCurrency(ded.amount)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Lancar Desconto/Vale Form */}
                              <div className="bg-grafite-800 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-1">
                                  Novo Lancamento
                                </h4>
                                <p className="text-xs text-gray-500 mb-3">
                                  FALTA desconta 1 dia ({formatCurrency(emp.dailyCost)}). MEIO_PERIODO desconta metade ({formatCurrency(emp.dailyCost / 2)}).
                                </p>
                                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                  <div className="flex-1">
                                    <label className="label-field">Tipo</label>
                                    <select
                                      value={valeForm.type}
                                      onChange={(e) =>
                                        setValeForm({ ...valeForm, type: e.target.value })
                                      }
                                      className="select-field w-full"
                                    >
                                      {DEDUCTION_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                          {t.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="sm:w-36">
                                    <label className="label-field">Valor (R$)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      disabled={valeForm.type === 'FALTA' || valeForm.type === 'MEIO_PERIODO'}
                                      value={
                                        valeForm.type === 'FALTA' ? emp.dailyCost.toFixed(2)
                                        : valeForm.type === 'MEIO_PERIODO' ? (emp.dailyCost / 2).toFixed(2)
                                        : (valeForm.amount || '')
                                      }
                                      onChange={(e) =>
                                        setValeForm({
                                          ...valeForm,
                                          amount: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                                      placeholder="0,00"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="label-field">Descricao</label>
                                    <input
                                      type="text"
                                      value={valeForm.description}
                                      onChange={(e) =>
                                        setValeForm({
                                          ...valeForm,
                                          description: e.target.value,
                                        })
                                      }
                                      className="input-field"
                                      placeholder="Opcional"
                                    />
                                  </div>
                                  <button
                                    onClick={() => launchVale(emp.id)}
                                    disabled={savingVale}
                                    className="btn-primary whitespace-nowrap p-2"
                                  >
                                    {savingVale ? 'Salvando...' : 'Lancar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {employees.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-500">
              Nenhum funcionario cadastrado.
            </p>
          ) : (
            employees.map((emp) => {
              const hourlyRate = emp.dailyCost / WORK_HOURS_PER_DAY
              const isExpanded = expandedId === emp.id
              const totalDeductions = getDeductionTotal(emp.deductions)
              const grossMonth = emp.dailyCost * currentMonthDays
              const netPayment = grossMonth - totalDeductions

              return (
                <div key={emp.id} className="bg-grafite-800 rounded-lg overflow-hidden">
                  {/* Card Header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleExpand(emp.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium text-gray-100">{emp.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            emp.active
                              ? 'bg-green-900/50 text-green-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}
                        >
                          {emp.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(emp)
                          }}
                          className="p-2 text-amarelo hover:text-amarelo-light transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{emp.role}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-500">Salario/Dia: </span>
                        <span className="text-gray-200">{formatCurrency(emp.dailyCost)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Valor/Hora: </span>
                        <span className="text-gray-400">{formatCurrency(hourlyRate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-grafite-700 p-4 space-y-4 bg-grafite-900/50">
                      {/* Monthly Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-grafite-800 rounded-lg p-3">
                          <p className="text-xs text-gray-400">Bruto mes ({currentMonthDays}d)</p>
                          <p className="text-lg font-semibold text-gray-200">
                            {formatCurrency(grossMonth)}
                          </p>
                        </div>
                        <div className="bg-grafite-800 rounded-lg p-3">
                          <p className="text-xs text-gray-400">Total Deducoes</p>
                          <p className="text-lg font-semibold text-red-400">
                            - {formatCurrency(totalDeductions)}
                          </p>
                        </div>
                        <div className="bg-grafite-800 rounded-lg p-3">
                          <p className="text-xs text-gray-400">Liquido (preview)</p>
                          <p className="text-lg font-semibold text-green-400">
                            {formatCurrency(netPayment)}
                          </p>
                        </div>
                      </div>

                      {/* Deductions List */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Deducoes do Mes Atual
                        </h4>
                        {emp.deductions.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">
                            Nenhuma deducao neste mes.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {emp.deductions.map((ded) => (
                              <div
                                key={ded.id}
                                className="flex flex-col gap-1 bg-grafite-800 rounded px-3 py-3 text-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs bg-grafite-700 px-2 py-1 rounded text-gray-300">
                                    {getDeductionTypeLabel(ded.type)}
                                  </span>
                                  <span className="text-red-400 font-medium">
                                    - {formatCurrency(ded.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400 text-sm">
                                    {ded.description || '-'}
                                  </span>
                                  <span className="text-gray-500 text-xs">
                                    {new Date(ded.date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Lancar Desconto/Vale Form */}
                      <div className="bg-grafite-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-1">
                          Novo Lancamento
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">
                          FALTA: {formatCurrency(emp.dailyCost)}. MEIO_PERIODO: {formatCurrency(emp.dailyCost / 2)}.
                        </p>
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="label-field">Tipo</label>
                            <select
                              value={valeForm.type}
                              onChange={(e) =>
                                setValeForm({ ...valeForm, type: e.target.value })
                              }
                              className="select-field w-full"
                            >
                              {DEDUCTION_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label-field">Valor (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              disabled={valeForm.type === 'FALTA' || valeForm.type === 'MEIO_PERIODO'}
                              value={
                                valeForm.type === 'FALTA' ? emp.dailyCost.toFixed(2)
                                : valeForm.type === 'MEIO_PERIODO' ? (emp.dailyCost / 2).toFixed(2)
                                : (valeForm.amount || '')
                              }
                              onChange={(e) =>
                                setValeForm({
                                  ...valeForm,
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                              placeholder="0,00"
                            />
                          </div>
                          <div>
                            <label className="label-field">Descricao</label>
                            <input
                              type="text"
                              value={valeForm.description}
                              onChange={(e) =>
                                setValeForm({
                                  ...valeForm,
                                  description: e.target.value,
                                })
                              }
                              className="input-field"
                              placeholder="Opcional"
                            />
                          </div>
                          <button
                            onClick={() => launchVale(emp.id)}
                            disabled={savingVale}
                            className="btn-primary whitespace-nowrap p-2 w-full"
                          >
                            {savingVale ? 'Salvando...' : 'Lancar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Monthly Closing Report */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Fechamento Mensal</h2>
            <p className="text-xs text-gray-500 mt-1">
              Salario = salario diario × dias do mes. Descontos via tipos FALTA, MEIO_PERIODO, VALE, etc.
            </p>
          </div>
          <input
            type="month"
            value={closingMonth}
            onChange={(e) => setClosingMonth(e.target.value)}
            className="input-field w-full sm:w-auto"
          />
        </div>

        {payrollSuccess && (
          <div className="bg-green-900/40 border border-green-700 text-green-200 px-4 py-2 rounded-lg text-sm mb-3">
            {payrollSuccess}
          </div>
        )}

        {(() => {
          const days = daysInMonth(closingMonth)
          const computeRow = (emp: Employee) => {
            const gross = emp.dailyCost * days
            const ded = getDeductionTotal(emp.deductions)
            const net = gross + emp.benefits - ded
            return { gross, ded, net }
          }
          const totals = activeEmployees.reduce(
            (acc, e) => {
              const r = computeRow(e)
              acc.gross += r.gross
              acc.ben += e.benefits
              acc.ded += r.ded
              acc.net += r.net
              return acc
            },
            { gross: 0, ben: 0, ded: 0, net: 0 }
          )

          return (
            <>
              <p className="text-xs text-gray-400 mb-3">{days} dias no mes selecionado</p>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header">
                      <th className="px-3 py-3 text-left">Funcionario</th>
                      <th className="px-3 py-3 text-right">Bruto ({days}d)</th>
                      <th className="px-3 py-3 text-right">Beneficios</th>
                      <th className="px-3 py-3 text-right">Deducoes</th>
                      <th className="px-3 py-3 text-right">Liquido</th>
                      <th className="px-3 py-3 text-center">Gerar Pgto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmployees.map((emp) => {
                      const { gross, ded, net } = computeRow(emp)
                      return (
                        <tr key={emp.id} className="table-row">
                          <td className="px-3 py-3">
                            <div className="font-medium">{emp.name}</div>
                            <div className="text-xs text-gray-500">{emp.role} — {formatCurrency(emp.dailyCost)}/dia</div>
                          </td>
                          <td className="px-3 py-3 text-right">{formatCurrency(gross)}</td>
                          <td className="px-3 py-3 text-right text-gray-400">{formatCurrency(emp.benefits)}</td>
                          <td className="px-3 py-3 text-right text-red-400">
                            {ded > 0 ? `- ${formatCurrency(ded)}` : '-'}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-green-400">{formatCurrency(net)}</td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => generatePayroll(emp)}
                              disabled={generatingPayroll === emp.id || net <= 0}
                              className="text-xs btn-secondary px-3 py-1.5 disabled:opacity-50"
                            >
                              {generatingPayroll === emp.id ? '...' : 'Gerar Lanc.'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {activeEmployees.length > 0 && (
                      <tr className="bg-grafite-900 font-semibold">
                        <td className="px-3 py-3 text-gray-300">TOTAL</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(totals.gross)}</td>
                        <td className="px-3 py-3 text-right text-gray-400">{formatCurrency(totals.ben)}</td>
                        <td className="px-3 py-3 text-right text-red-400">- {formatCurrency(totals.ded)}</td>
                        <td className="px-3 py-3 text-right text-green-400">{formatCurrency(totals.net)}</td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {activeEmployees.map((emp) => {
                  const { gross, ded, net } = computeRow(emp)
                  return (
                    <div key={emp.id} className="bg-grafite-800 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-100">{emp.name}</span>
                        <span className="text-xs text-gray-500">{formatCurrency(emp.dailyCost)}/dia</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Bruto: </span>
                          <span className="text-gray-200">{formatCurrency(gross)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500">Beneficios: </span>
                          <span className="text-gray-400">{formatCurrency(emp.benefits)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Deducoes: </span>
                          <span className="text-red-400">{ded > 0 ? `- ${formatCurrency(ded)}` : '-'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500">Liquido: </span>
                          <span className="font-semibold text-green-400">{formatCurrency(net)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => generatePayroll(emp)}
                        disabled={generatingPayroll === emp.id || net <= 0}
                        className="btn-secondary text-sm w-full py-2 disabled:opacity-50"
                      >
                        {generatingPayroll === emp.id ? 'Gerando...' : 'Gerar lancamento de pagamento'}
                      </button>
                    </div>
                  )
                })}
                {activeEmployees.length > 0 && (
                  <div className="bg-grafite-900 rounded-lg p-4 font-semibold">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Bruto: </span>{formatCurrency(totals.gross)}</div>
                      <div className="text-right"><span className="text-gray-500">Beneficios: </span>{formatCurrency(totals.ben)}</div>
                      <div><span className="text-gray-500">Deducoes: </span><span className="text-red-400">- {formatCurrency(totals.ded)}</span></div>
                      <div className="text-right"><span className="text-gray-500">Liquido: </span><span className="text-green-400">{formatCurrency(totals.net)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        })()}
      </div>

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              {editingEmployee ? 'Editar Funcionario' : 'Novo Funcionario'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label-field">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="label-field">Funcao</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Soldador, Serralheiro"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Salario Diario (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.dailyCost || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                    placeholder="Ex: 100,00"
                  />
                  {formData.dailyCost > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Equivalente mensal (22 dias uteis): {formatCurrency(formData.dailyCost * BUSINESS_DAYS_PER_MONTH)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label-field">Beneficios (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.benefits || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        benefits: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="label-field mb-0">Ativo</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, active: !formData.active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.active ? 'bg-amarelo' : 'bg-grafite-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary p-2"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={saveEmployee}
                className="btn-primary p-2"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

