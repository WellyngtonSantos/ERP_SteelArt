'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  X,
  Trash2,
  FileText,
  Send,
  CheckCircle,
  Save,
  ChevronDown,
  ChevronUp,
  Search,
  Package,
  Pencil,
  Image as ImageIcon,
} from 'lucide-react'
import { calcOrcamento, calcValorHora, formatCurrency, formatPercent } from '@/lib/calculations'

// --------------- Types ---------------

interface Material {
  id: string
  name: string
  unit: string
  currentPrice: number
  category: string
}

interface Employee {
  id: string
  name: string
  role: string
  monthlyCost: number
}

interface BudgetItemForm {
  materialId?: string
  description: string
  quantity: number
  unitPrice: number
}

interface BudgetEmployeeForm {
  employeeId: string
  hoursAllocated: number
  selected: boolean
}

interface ProductData {
  id: string
  name: string
  description?: string
  materialsJson: string
  ironCost: number
  paintCost: number
  defaultMargin: number
  images?: string
}

interface BudgetForm {
  id?: string
  productId?: string
  productMode: 'custom' | 'catalog'
  clientName: string
  clientPhone: string
  clientEmail: string
  clientAddress: string
  type: 'PRODUTO' | 'SERVICO'
  status: string
  ironCost: number
  paintCost: number
  profitMargin: number
  casualtyMargin: number
  entryPercent: number
  deliveryPercent: number
  taxRate: number
  notes: string
  items: BudgetItemForm[]
  employees: BudgetEmployeeForm[]
  existingImages: string[]
  newImages: File[]
}

interface Budget {
  id: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientAddress?: string
  type: string
  status: string
  ironCost: number
  paintCost: number
  profitMargin: number
  casualtyMargin: number
  entryPercent: number
  deliveryPercent: number
  totalCost: number
  totalPrice: number
  taxRate: number
  notes?: string
  images?: string
  createdAt: string
  items: Array<{
    id: string
    materialId?: string
    description: string
    quantity: number
    unitPrice: number
    material?: Material
  }>
  employees: Array<{
    id: string
    employeeId: string
    hoursAllocated: number
    employee: Employee
  }>
}

// --------------- Helpers ---------------

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: 'bg-gray-600 text-gray-200',
  ENVIADO: 'bg-blue-600 text-blue-100',
  APROVADO: 'bg-green-600 text-green-100',
  REJEITADO: 'bg-red-600 text-red-100',
}

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
}

const emptyForm = (): BudgetForm => ({
  productMode: 'custom',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',
  type: 'PRODUTO',
  status: 'RASCUNHO',
  ironCost: 0,
  paintCost: 0,
  profitMargin: 20,
  casualtyMargin: 5,
  entryPercent: 50,
  deliveryPercent: 50,
  taxRate: 0,
  notes: '',
  items: [{ description: '', quantity: 1, unitPrice: 0 }],
  employees: [],
  existingImages: [],
  newImages: [],
})

// --------------- Budget Form Component ---------------

function BudgetFormPanel({
  form,
  setForm,
  allEmployees,
  materials,
  products,
  onSave,
  onClose,
  saving,
}: {
  form: BudgetForm
  setForm: React.Dispatch<React.SetStateAction<BudgetForm>>
  allEmployees: Employee[]
  materials: Material[]
  products: ProductData[]
  onSave: (status: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [activeSection, setActiveSection] = useState<string>('product')

  const loadProduct = useCallback((productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const materials: { description: string; quantity: number; unitPrice: number }[] =
      JSON.parse(product.materialsJson || '[]')

    const productImages = product.images ? product.images.split('|||').filter(Boolean) : []

    setForm((prev) => ({
      ...prev,
      productId: product.id,
      productMode: 'catalog',
      ironCost: product.ironCost,
      paintCost: product.paintCost,
      profitMargin: product.defaultMargin,
      existingImages: productImages,
      newImages: [],
      items: materials.length > 0
        ? materials.map((m) => ({
            description: m.description,
            quantity: m.quantity,
            unitPrice: m.unitPrice,
          }))
        : [{ description: '', quantity: 1, unitPrice: 0 }],
    }))
  }, [products, setForm])

  // Initialize employee checklist when allEmployees loads
  useEffect(() => {
    if (allEmployees.length > 0 && form.employees.length === 0 && !form.id) {
      setForm((prev) => ({
        ...prev,
        employees: allEmployees.map((emp) => ({
          employeeId: emp.id,
          hoursAllocated: 0,
          selected: false,
        })),
      }))
    }
  }, [allEmployees, form.employees.length, form.id, setForm])

  // Real-time calculation
  const calculation = useMemo(() => {
    const custoItens = form.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const custoMateriais = custoItens + form.ironCost

    const custoMaoDeObra = form.employees
      .filter((e) => e.selected && e.hoursAllocated > 0)
      .reduce((sum, emp) => {
        const employee = allEmployees.find((e) => e.id === emp.employeeId)
        if (!employee) return sum
        return sum + calcValorHora(employee.monthlyCost) * emp.hoursAllocated
      }, 0)

    const calc = calcOrcamento({
      custoMateriais,
      custoMaoDeObra,
      custoPintura: form.paintCost,
      margemLucro: form.profitMargin,
      margemCausalidade: form.casualtyMargin,
      aliquotaImposto: form.taxRate,
    })

    return { ...calc, custoMaoDeObra, custoMateriais }
  }, [form, allEmployees])

  const updateField = useCallback(
    <K extends keyof BudgetForm>(field: K, value: BudgetForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    [setForm]
  )

  const updateItem = useCallback(
    (index: number, field: keyof BudgetItemForm, value: string | number) => {
      setForm((prev) => {
        const newItems = [...prev.items]
        newItems[index] = { ...newItems[index], [field]: value }
        return { ...prev, items: newItems }
      })
    },
    [setForm]
  )

  const addItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }))
  }, [setForm])

  const removeItem = useCallback(
    (index: number) => {
      setForm((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }))
    },
    [setForm]
  )

  const toggleEmployee = useCallback(
    (index: number) => {
      setForm((prev) => {
        const newEmps = [...prev.employees]
        newEmps[index] = { ...newEmps[index], selected: !newEmps[index].selected }
        return { ...prev, employees: newEmps }
      })
    },
    [setForm]
  )

  const updateEmployeeHours = useCallback(
    (index: number, hours: number) => {
      setForm((prev) => {
        const newEmps = [...prev.employees]
        newEmps[index] = { ...newEmps[index], hoursAllocated: hours }
        return { ...prev, employees: newEmps }
      })
    },
    [setForm]
  )

  const Section = ({
    id,
    title,
    children,
  }: {
    id: string
    title: string
    children: React.ReactNode
  }) => {
    const isOpen = activeSection === id
    return (
      <div className="border border-grafite-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveSection(isOpen ? '' : id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-grafite-800 hover:bg-grafite-700 transition-colors text-left"
        >
          <span className="text-sm font-semibold text-gray-200">{title}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {isOpen && <div className="p-4 bg-grafite-900/50 space-y-4">{children}</div>}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative ml-auto w-full max-w-5xl bg-grafite-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grafite-700 bg-grafite-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-100">
            {form.id ? 'Editar Orcamento' : 'Novo Orcamento'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex">
          {/* Form Left */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* Product Selection */}
            <Section id="product" title="Selecao de Produto">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, productMode: 'catalog', productId: undefined }))
                  }}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    form.productMode === 'catalog'
                      ? 'border-amarelo bg-amarelo/10 text-amarelo'
                      : 'border-grafite-600 bg-grafite-800 text-gray-400 hover:border-grafite-500'
                  }`}
                >
                  <Package className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-bold">Produto Cadastrado</div>
                  <div className="text-xs mt-1 opacity-70">Selecione do catalogo</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      productMode: 'custom',
                      productId: undefined,
                    }))
                  }}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    form.productMode === 'custom'
                      ? 'border-amarelo bg-amarelo/10 text-amarelo'
                      : 'border-grafite-600 bg-grafite-800 text-gray-400 hover:border-grafite-500'
                  }`}
                >
                  <Pencil className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-bold">Personalizado</div>
                  <div className="text-xs mt-1 opacity-70">Preencher manualmente</div>
                </button>
              </div>

              {form.productMode === 'catalog' && (
                <div>
                  <label className="label-field">Selecione o Produto</label>
                  {products.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhum produto cadastrado.{' '}
                      <a href="/produtos" className="text-amarelo hover:underline">
                        Cadastrar produto
                      </a>
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {products.map((product) => {
                        const isSelected = form.productId === product.id
                        const imgs = product.images ? product.images.split('|||').filter(Boolean) : []
                        const mats: { description: string; quantity: number; unitPrice: number }[] =
                          JSON.parse(product.materialsJson || '[]')
                        const matCost = mats.reduce((s, m) => s + m.quantity * m.unitPrice, 0)
                        const totalCost = matCost + product.ironCost + product.paintCost
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => loadProduct(product.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                              isSelected
                                ? 'border-amarelo bg-amarelo/10'
                                : 'border-grafite-700 bg-grafite-800 hover:border-grafite-500'
                            }`}
                          >
                            <div className="w-14 h-14 bg-grafite-700 rounded-lg flex-shrink-0 overflow-hidden">
                              {imgs.length > 0 ? (
                                <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Package className="w-6 h-6 text-grafite-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-200 truncate">
                                {product.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {mats.length} materiais — Margem: {product.defaultMargin}%
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-amarelo">
                                {formatCurrency(totalCost)}
                              </div>
                              <div className="text-xs text-gray-500">custo base</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {form.productId && (
                    <p className="text-xs text-green-400 mt-2">
                      Produto carregado — voce pode ajustar materiais e custos abaixo
                    </p>
                  )}
                </div>
              )}
            </Section>

            {/* Client Info */}
            <Section id="client" title="Dados do Cliente">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Nome do Cliente *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.clientName}
                    onChange={(e) => updateField('clientName', e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="label-field">Telefone</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.clientPhone}
                    onChange={(e) => updateField('clientPhone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="label-field">E-mail</label>
                  <input
                    type="email"
                    className="input-field"
                    value={form.clientEmail}
                    onChange={(e) => updateField('clientEmail', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="label-field">Endereco</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.clientAddress}
                    onChange={(e) => updateField('clientAddress', e.target.value)}
                    placeholder="Endereco completo"
                  />
                </div>
              </div>
            </Section>

            {/* Type Selector */}
            <Section id="type" title="Tipo do Orcamento">
              <div className="grid grid-cols-2 gap-4">
                {(['PRODUTO', 'SERVICO'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateField('type', t)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      form.type === t
                        ? 'border-amarelo bg-amarelo/10 text-amarelo'
                        : 'border-grafite-600 bg-grafite-800 text-gray-400 hover:border-grafite-500'
                    }`}
                  >
                    <div className="text-sm font-bold">{t === 'PRODUTO' ? 'Produto' : 'Servico'}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {t === 'PRODUTO' ? 'Fabricacao de pecas e estruturas' : 'Servico de instalacao ou reparo'}
                    </div>
                  </button>
                ))}
              </div>
            </Section>

            {/* Costs */}
            <Section id="costs" title="Custos Base">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Custo de Ferro (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <input
                      type="number"
                      className="input-field pl-10"
                      value={form.ironCost || ''}
                      onChange={(e) => updateField('ironCost', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">Custo de Pintura (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <input
                      type="number"
                      className="input-field pl-10"
                      value={form.paintCost || ''}
                      onChange={(e) => updateField('paintCost', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Margins */}
            <Section id="margins" title="Margens">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label-field">
                    Margem de Lucro: {formatPercent(form.profitMargin)}
                  </label>
                  <input
                    type="range"
                    className="w-full accent-amarelo"
                    min="0"
                    max="100"
                    step="1"
                    value={form.profitMargin}
                    onChange={(e) => updateField('profitMargin', parseFloat(e.target.value))}
                  />
                  <input
                    type="number"
                    className="input-field mt-2"
                    value={form.profitMargin}
                    onChange={(e) => updateField('profitMargin', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="label-field">
                    Margem de Casualidade: {formatPercent(form.casualtyMargin)}
                  </label>
                  <input
                    type="range"
                    className="w-full accent-amarelo"
                    min="0"
                    max="50"
                    step="1"
                    value={form.casualtyMargin}
                    onChange={(e) => updateField('casualtyMargin', parseFloat(e.target.value))}
                  />
                  <input
                    type="number"
                    className="input-field mt-2"
                    value={form.casualtyMargin}
                    onChange={(e) => updateField('casualtyMargin', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="50"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="label-field">
                    Aliquota Imposto: {formatPercent(form.taxRate)}
                  </label>
                  <input
                    type="range"
                    className="w-full accent-amarelo"
                    min="0"
                    max="30"
                    step="0.5"
                    value={form.taxRate}
                    onChange={(e) => updateField('taxRate', parseFloat(e.target.value))}
                  />
                  <input
                    type="number"
                    className="input-field mt-2"
                    value={form.taxRate}
                    onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="30"
                    step="0.5"
                  />
                </div>
              </div>
            </Section>

            {/* Employee Allocation */}
            <Section id="employees" title="Alocacao de Funcionarios">
              {form.employees.length === 0 ? (
                <p className="text-sm text-gray-500">Carregando funcionarios...</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {form.employees.map((emp, index) => {
                    const employee = allEmployees.find((e) => e.id === emp.employeeId)
                    if (!employee) return null
                    const valorHora = calcValorHora(employee.monthlyCost)
                    return (
                      <div
                        key={emp.employeeId}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          emp.selected
                            ? 'border-amarelo/40 bg-amarelo/5'
                            : 'border-grafite-700 bg-grafite-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={emp.selected}
                          onChange={() => toggleEmployee(index)}
                          className="w-4 h-4 accent-amarelo rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-200 truncate">
                            {employee.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {employee.role} - {formatCurrency(valorHora)}/hora
                          </div>
                        </div>
                        {emp.selected && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-400">Horas:</label>
                            <input
                              type="number"
                              className="input-field w-20 text-sm"
                              value={emp.hoursAllocated || ''}
                              onChange={(e) =>
                                updateEmployeeHours(index, parseFloat(e.target.value) || 0)
                              }
                              min="0"
                              step="0.5"
                            />
                            {emp.hoursAllocated > 0 && (
                              <span className="text-xs text-amarelo font-medium whitespace-nowrap">
                                = {formatCurrency(valorHora * emp.hoursAllocated)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            {/* Budget Items */}
            <Section id="items" title="Itens do Orcamento">
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-start p-3 bg-grafite-800 rounded-lg border border-grafite-700"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="md:col-span-2">
                        <label className="label-field">Descricao</label>
                        <input
                          type="text"
                          className="input-field text-sm"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Descricao do item"
                        />
                      </div>
                      <div>
                        <label className="label-field">Qtd</label>
                        <input
                          type="number"
                          className="input-field text-sm"
                          value={item.quantity || ''}
                          onChange={(e) =>
                            updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="label-field">Preco Unit. (R$)</label>
                        <input
                          type="number"
                          className="input-field text-sm"
                          value={item.unitPrice || ''}
                          onChange={(e) =>
                            updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="pt-6">
                      <span className="text-sm text-amarelo font-medium whitespace-nowrap">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="pt-6 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addItem} className="btn-secondary text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Item
                </button>
              </div>
            </Section>

            {/* Payment Config */}
            <Section id="payment" title="Configuracao de Pagamento">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Entrada (%)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.entryPercent}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setForm((prev) => ({
                        ...prev,
                        entryPercent: val,
                        deliveryPercent: 100 - val,
                      }))
                    }}
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="label-field">Entrega (%)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.deliveryPercent}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setForm((prev) => ({
                        ...prev,
                        deliveryPercent: val,
                        entryPercent: 100 - val,
                      }))
                    }}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              {form.entryPercent + form.deliveryPercent !== 100 && (
                <p className="text-sm text-red-400 mt-2">
                  Atencao: Entrada + Entrega devem somar 100%
                </p>
              )}
              {calculation.precoFinal > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-grafite-800 rounded-lg border border-grafite-700">
                    <span className="text-gray-400">Valor Entrada:</span>
                    <p className="text-amarelo font-bold">
                      {formatCurrency(calculation.precoFinal * (form.entryPercent / 100))}
                    </p>
                  </div>
                  <div className="p-3 bg-grafite-800 rounded-lg border border-grafite-700">
                    <span className="text-gray-400">Valor Entrega:</span>
                    <p className="text-amarelo font-bold">
                      {formatCurrency(calculation.precoFinal * (form.deliveryPercent / 100))}
                    </p>
                  </div>
                </div>
              )}
            </Section>

            {/* Images */}
            <Section id="images" title="Imagens de Referencia">
              <BudgetImageUpload form={form} setForm={setForm} />
            </Section>

            {/* Notes */}
            <Section id="notes" title="Observacoes">
              <textarea
                className="input-field min-h-[100px] resize-y"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Observacoes adicionais sobre o orcamento..."
              />
            </Section>
          </div>

          {/* Calculation Summary Panel (Right) */}
          <div className="w-72 border-l border-grafite-700 bg-grafite-800 p-4 flex-shrink-0 overflow-y-auto">
            <h3 className="text-sm font-bold text-amarelo uppercase tracking-wider mb-4">
              Resumo do Calculo
            </h3>
            <div className="space-y-3">
              <SummaryRow label="Custo Materiais" value={calculation.custoMateriais} />
              <SummaryRow label="Custo Mao de Obra" value={calculation.custoMaoDeObra} />
              <SummaryRow label="Custo Pintura" value={form.paintCost} />
              <div className="border-t border-grafite-600 pt-3">
                <SummaryRow label="Custo Base" value={calculation.custoBase} highlight />
              </div>
              <SummaryRow
                label={`Casualidade (${formatPercent(form.casualtyMargin)})`}
                value={calculation.custoComCausalidade - calculation.custoBase}
              />
              <SummaryRow
                label={`Lucro (${formatPercent(form.profitMargin)})`}
                value={calculation.lucro}
              />
              <SummaryRow
                label={`Imposto (${formatPercent(form.taxRate)})`}
                value={calculation.imposto}
              />
              <div className="border-t border-amarelo/30 pt-3">
                <SummaryRow label="PRECO FINAL" value={calculation.precoFinal} highlight big />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2">
              <button
                onClick={() => onSave('RASCUNHO')}
                disabled={saving || !form.clientName}
                className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Salvar Rascunho
              </button>
              <button
                onClick={() => onSave('ENVIADO')}
                disabled={saving || !form.clientName}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Enviar Orcamento
              </button>
              {form.id && form.status !== 'APROVADO' && (
                <button
                  onClick={() => onSave('APROVADO')}
                  disabled={saving || !form.clientName}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprovar
                </button>
              )}
              <button
                onClick={() => window.open(`/api/budgets/${form.id}/pdf`, '_blank')}
                disabled={!form.id}
                className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BudgetImageUpload({
  form,
  setForm,
}: {
  form: BudgetForm
  setForm: React.Dispatch<React.SetStateAction<BudgetForm>>
}) {
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    // Initialize previews from existing images
    setPreviews(form.existingImages)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setForm((prev) => ({ ...prev, newImages: [...prev.newImages, ...files] }))
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const handleRemove = (index: number) => {
    const existingCount = form.existingImages.length
    if (index < existingCount) {
      setForm((prev) => ({
        ...prev,
        existingImages: prev.existingImages.filter((_, i) => i !== index),
      }))
    } else {
      const newIndex = index - existingCount
      setForm((prev) => ({
        ...prev,
        newImages: prev.newImages.filter((_, i) => i !== newIndex),
      }))
    }
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const allPreviews = [...previews]

  return (
    <div>
      <div className="grid grid-cols-4 gap-3">
        {allPreviews.map((src, index) => (
          <div key={index} className="relative h-20 bg-grafite-800 rounded-lg overflow-hidden group">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <label className="h-20 flex flex-col items-center justify-center bg-grafite-800 border-2 border-dashed border-grafite-600 rounded-lg cursor-pointer hover:border-amarelo/50 transition-colors">
          <ImageIcon className="w-5 h-5 text-gray-500" />
          <span className="text-[10px] text-gray-500 mt-1">Adicionar</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
        </label>
      </div>
      {allPreviews.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {allPreviews.length} imagem(ns) — aparecerao no PDF do orcamento
        </p>
      )}
    </div>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
  big,
}: {
  label: string
  value: number
  highlight?: boolean
  big?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${highlight ? 'text-gray-200 font-semibold' : 'text-gray-400'}`}>
        {label}
      </span>
      <span
        className={`font-mono ${
          big
            ? 'text-lg font-bold text-amarelo'
            : highlight
            ? 'text-sm font-bold text-gray-100'
            : 'text-sm text-gray-300'
        }`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  )
}

// --------------- Main Page ---------------

export default function ComercialPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [products, setProducts] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BudgetForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [budgetsRes, employeesRes, materialsRes, productsRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/employees'),
        fetch('/api/materials'),
        fetch('/api/products'),
      ])
      if (budgetsRes.ok) setBudgets(await budgetsRes.json())
      if (employeesRes.ok) setEmployees(await employeesRes.json())
      if (materialsRes.ok) setMaterials(await materialsRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openNewBudget = () => {
    setForm(emptyForm())
    setShowForm(true)
  }

  const openEditBudget = (budget: Budget) => {
    setForm({
      id: budget.id,
      productId: (budget as any).productId || undefined,
      productMode: (budget as any).productId ? 'catalog' : 'custom',
      clientName: budget.clientName,
      clientPhone: budget.clientPhone || '',
      clientEmail: budget.clientEmail || '',
      clientAddress: budget.clientAddress || '',
      type: budget.type as 'PRODUTO' | 'SERVICO',
      status: budget.status,
      ironCost: budget.ironCost,
      paintCost: budget.paintCost,
      profitMargin: budget.profitMargin,
      casualtyMargin: budget.casualtyMargin,
      entryPercent: budget.entryPercent,
      deliveryPercent: budget.deliveryPercent,
      taxRate: budget.taxRate,
      notes: budget.notes || '',
      items: budget.items.map((item) => ({
        materialId: item.materialId || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      employees: employees.map((emp) => {
        const allocated = budget.employees.find((be) => be.employeeId === emp.id)
        return {
          employeeId: emp.id,
          hoursAllocated: allocated?.hoursAllocated || 0,
          selected: !!allocated,
        }
      }),
      existingImages: budget.images ? budget.images.split('|||').filter(Boolean) : [],
      newImages: [],
    })
    setShowForm(true)
  }

  const handleSave = async (status: string) => {
    if (!form.clientName.trim()) return
    setSaving(true)

    const payload = {
      ...(form.id ? { id: form.id } : {}),
      productId: form.productMode === 'catalog' ? form.productId || null : null,
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      clientEmail: form.clientEmail,
      clientAddress: form.clientAddress,
      type: form.type,
      status,
      ironCost: form.ironCost,
      paintCost: form.paintCost,
      profitMargin: form.profitMargin,
      casualtyMargin: form.casualtyMargin,
      entryPercent: form.entryPercent,
      deliveryPercent: form.deliveryPercent,
      taxRate: form.taxRate,
      notes: form.notes,
      existingImages: form.existingImages.join('|||'),
      items: form.items.filter((item) => item.description.trim()),
      employees: form.employees
        .filter((emp) => emp.selected && emp.hoursAllocated > 0)
        .map((emp) => ({
          employeeId: emp.employeeId,
          hoursAllocated: emp.hoursAllocated,
        })),
    }

    try {
      const method = form.id ? 'PUT' : 'POST'

      // If there are new images, use FormData; otherwise use JSON
      let res: Response
      if (form.newImages.length > 0) {
        const formData = new FormData()
        formData.append('data', JSON.stringify(payload))
        for (const file of form.newImages) {
          formData.append('images', file)
        }
        res = await fetch('/api/budgets', { method, body: formData })
      } else {
        res = await fetch('/api/budgets', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        setShowForm(false)
        fetchData()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao salvar orcamento')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro de conexao')
    }
    setSaving(false)
  }

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const matchesSearch =
        !searchTerm ||
        b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [budgets, searchTerm, filterStatus])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Comercial & Orcamentacao</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie orcamentos e propostas comerciais
          </p>
        </div>
        <button onClick={openNewBudget} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Orcamento
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="select-field"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Todos os Status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="ENVIADO">Enviado</option>
          <option value="APROVADO">Aprovado</option>
          <option value="REJEITADO">Rejeitado</option>
        </select>
      </div>

      {/* Budget List */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Carregando orcamentos...</p>
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-grafite-600 mx-auto" />
          <p className="text-gray-400 mt-4">Nenhum orcamento encontrado</p>
          <button onClick={openNewBudget} className="btn-primary mt-4">
            Criar Primeiro Orcamento
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Valor Total</th>
                  <th className="text-left px-4 py-3">Itens</th>
                  <th className="text-left px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.map((budget) => (
                  <tr
                    key={budget.id}
                    className="table-row cursor-pointer"
                    onClick={() => openEditBudget(budget)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-200">{budget.clientName}</div>
                      {budget.clientEmail && (
                        <div className="text-xs text-gray-500">{budget.clientEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-grafite-700 text-gray-300">
                        {budget.type === 'PRODUTO' ? 'Produto' : 'Servico'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          STATUS_COLORS[budget.status] || 'bg-gray-600 text-gray-200'
                        }`}
                      >
                        {STATUS_LABELS[budget.status] || budget.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amarelo font-semibold">
                      {formatCurrency(budget.totalPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {budget.items.length} {budget.items.length === 1 ? 'item' : 'itens'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredBudgets.map((budget) => (
              <div
                key={budget.id}
                className="card cursor-pointer hover:border-amarelo/30 transition-colors"
                onClick={() => openEditBudget(budget)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-200">{budget.clientName}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {budget.type === 'PRODUTO' ? 'Produto' : 'Servico'} -{' '}
                      {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      STATUS_COLORS[budget.status] || 'bg-gray-600 text-gray-200'
                    }`}
                  >
                    {STATUS_LABELS[budget.status] || budget.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {budget.items.length} {budget.items.length === 1 ? 'item' : 'itens'}
                  </span>
                  <span className="font-mono text-amarelo font-bold">
                    {formatCurrency(budget.totalPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <BudgetFormPanel
          form={form}
          setForm={setForm}
          allEmployees={employees}
          materials={materials}
          products={products}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          saving={saving}
        />
      )}
    </div>
  )
}
