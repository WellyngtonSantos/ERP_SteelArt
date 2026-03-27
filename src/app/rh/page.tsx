'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { formatCurrency } from '@/lib/calculations'

interface EmployeeDeduction {
  id: string
  employeeId: string
  type: 'ALMOCO' | 'ADIANTAMENTO' | 'EPI' | 'OUTROS'
  amount: number
  date: string
  description: string
}

interface Employee {
  id: string
  name: string
  role: string
  monthlyCost: number
  benefits: number
  active: boolean
  deductions: EmployeeDeduction[]
}

const DEDUCTION_TYPES = [
  { value: 'ALMOCO', label: 'Almoco' },
  { value: 'ADIANTAMENTO', label: 'Adiantamento' },
  { value: 'EPI', label: 'EPI' },
  { value: 'OUTROS', label: 'Outros' },
]

const emptyEmployee = {
  name: '',
  role: '',
  monthlyCost: 0,
  benefits: 0,
  active: true,
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

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Erro ao carregar funcionarios')
      setEmployees(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // Stats
  const activeEmployees = employees.filter((e) => e.active)
  const totalEmployees = activeEmployees.length
  const totalPayroll = activeEmployees.reduce((s, e) => s + e.monthlyCost, 0)
  const avgHourlyCost = totalEmployees > 0 ? totalPayroll / totalEmployees / 220 : 0

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
      monthlyCost: emp.monthlyCost,
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
    if (valeForm.amount <= 0) {
      setError('Valor do vale deve ser maior que zero')
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">RH & Equipe</h1>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Funcionario
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-300">x</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Total Funcionarios</p>
          <p className="text-2xl font-bold text-amarelo mt-1">{totalEmployees}</p>
        </div>
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Folha Mensal</p>
          <p className="text-2xl font-bold text-amarelo mt-1">
            {formatCurrency(totalPayroll)}
          </p>
        </div>
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Custo Medio/Hora</p>
          <p className="text-2xl font-bold text-amarelo mt-1">
            {formatCurrency(avgHourlyCost)}
          </p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Funcionarios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left w-8" />
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Funcao</th>
                <th className="px-4 py-3 text-right">Salario</th>
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
                  const hourlyRate = emp.monthlyCost / 220
                  const isExpanded = expandedId === emp.id
                  const totalDeductions = getDeductionTotal(emp.deductions)
                  const netPayment = emp.monthlyCost - totalDeductions

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
                          {formatCurrency(emp.monthlyCost)}
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
                            className="text-amarelo hover:text-amarelo-light transition-colors"
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
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-grafite-800 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Salario Bruto</p>
                                  <p className="text-lg font-semibold text-gray-200">
                                    {formatCurrency(emp.monthlyCost)}
                                  </p>
                                </div>
                                <div className="bg-grafite-800 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Total Deducoes</p>
                                  <p className="text-lg font-semibold text-red-400">
                                    - {formatCurrency(totalDeductions)}
                                  </p>
                                </div>
                                <div className="bg-grafite-800 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Liquido a Pagar</p>
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
                                        className="flex items-center justify-between bg-grafite-800 rounded px-3 py-2 text-sm"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs bg-grafite-700 px-2 py-0.5 rounded text-gray-300">
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

                              {/* Lancar Vale Form */}
                              <div className="bg-grafite-800 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-3">
                                  Lancar Vale
                                </h4>
                                <div className="flex items-end gap-3">
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
                                  <div className="w-36">
                                    <label className="label-field">Valor (R$)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={valeForm.amount || ''}
                                      onChange={(e) =>
                                        setValeForm({
                                          ...valeForm,
                                          amount: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="input-field"
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
                                    className="btn-primary whitespace-nowrap"
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
      </div>

      {/* Monthly Closing Report */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">
            Fechamento Mensal
          </h2>
          <input
            type="month"
            value={closingMonth}
            onChange={(e) => setClosingMonth(e.target.value)}
            className="input-field w-auto"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Funcionario</th>
                <th className="px-4 py-3 text-left">Funcao</th>
                <th className="px-4 py-3 text-right">Salario Bruto</th>
                <th className="px-4 py-3 text-right">Beneficios</th>
                <th className="px-4 py-3 text-right">Deducoes</th>
                <th className="px-4 py-3 text-right">Liquido</th>
              </tr>
            </thead>
            <tbody>
              {activeEmployees.map((emp) => {
                const totalDed = getDeductionTotal(emp.deductions)
                const net = emp.monthlyCost - totalDed
                return (
                  <tr key={emp.id} className="table-row">
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-400">{emp.role}</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(emp.monthlyCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatCurrency(emp.benefits)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      {totalDed > 0 ? `- ${formatCurrency(totalDed)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-400">
                      {formatCurrency(net)}
                    </td>
                  </tr>
                )
              })}
              {activeEmployees.length > 0 && (
                <tr className="bg-grafite-900 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-gray-300">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(activeEmployees.reduce((s, e) => s + e.monthlyCost, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {formatCurrency(activeEmployees.reduce((s, e) => s + e.benefits, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-red-400">
                    - {formatCurrency(
                      activeEmployees.reduce(
                        (s, e) => s + getDeductionTotal(e.deductions),
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400">
                    {formatCurrency(
                      activeEmployees.reduce(
                        (s, e) => s + e.monthlyCost - getDeductionTotal(e.deductions),
                        0
                      )
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Salario Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthlyCost || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                  />
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
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={saveEmployee}
                className="btn-primary"
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

