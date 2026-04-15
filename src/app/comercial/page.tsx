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
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Package,
  Pencil,
  Image as ImageIcon,
  Building2,
  Loader2,
} from 'lucide-react'
import { calcOrcamento, calcOrcamentoOperacional, calcValorHora, formatCurrency, formatPercent } from '@/lib/calculations'

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

interface BudgetPaymentForm {
  method: string
  amount: number
  taxRate: number
  dueOffset: number
}

interface BudgetPickForm {
  optionId: string
  optionName: string
  categoryName: string
  unitPrice: number
  tempoDias: number
  quantity: number
}

interface ConfiguratorOptionData {
  id: string
  categoryId: string
  name: string
  unitPrice: number
  tempoDias: number
  order: number
  active: boolean
}

interface ConfiguratorCategoryData {
  id: string
  name: string
  selectionType: 'SINGLE' | 'MULTIPLE'
  order: number
  active: boolean
  options: ConfiguratorOptionData[]
}

const PAYMENT_METHODS = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CARTAO', label: 'Cartao de Credito' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OUTROS', label: 'Outros' },
]

interface ProductData {
  id: string
  name: string
  description?: string
  materialsJson: string
  ironCost: number
  paintCost: number
  defaultMargin: number
  tempoProducaoDias: number
  tempoMontagemDias: number
  images?: string
}

interface ClientData {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  email: string | null
  address: string | null
}

interface BudgetForm {
  id?: string
  productId?: string
  productMode: 'custom' | 'catalog'
  clientMode: 'registered' | 'quick'
  clientId?: string
  clientCnpj: string
  clientName: string
  clientPhone: string
  clientEmail: string
  clientAddress: string
  type: 'PRODUTO' | 'SERVICO' | 'VENDA'
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
  // Modo operacional (novo)
  modoCalculo: 'MANUAL' | 'OPERACIONAL'
  diasExecucao: number
  custoOperacionalDia: number
  // Pagamento misto (novo)
  payments: BudgetPaymentForm[]
  // Configurador "Monte o seu"
  picks: BudgetPickForm[]
}

interface Budget {
  id: string
  clientName: string
  clientCnpj?: string
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

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

// Stable Section component - defined outside to prevent unmount/remount on re-render (fixes iPad/iPhone keyboard closing)
function AccordionSection({
  id,
  title,
  activeSection,
  onToggle,
  children,
  forceOpen = false,
}: {
  id: string
  title: string
  activeSection: string
  onToggle: (id: string) => void
  children: React.ReactNode
  forceOpen?: boolean
}) {
  const isOpen = forceOpen || activeSection === id
  return (
    <div className="border border-grafite-700 rounded-lg overflow-hidden">
      {!forceOpen && (
        <button
          type="button"
          onPointerUp={(e) => {
            e.stopPropagation()
            onToggle(isOpen ? '' : id)
          }}
          className="w-full flex items-center justify-between px-4 py-4 bg-grafite-800 hover:bg-grafite-700 transition-colors text-left min-h-[48px]"
        >
          <span className="text-sm font-semibold text-gray-200">{title}</span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
      )}
      {forceOpen && (
        <div className="px-4 py-3 bg-grafite-800 border-b border-grafite-700">
          <span className="text-sm font-semibold text-amarelo">{title}</span>
        </div>
      )}
      {isOpen && <div className="p-4 bg-grafite-900/50 space-y-4">{children}</div>}
    </div>
  )
}

// Wizard do orcamento — passos em linha do tempo
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6
interface StepDef {
  n: WizardStep
  label: string
  subtitle: string
  sectionIds: string[]
}
const WIZARD_STEPS: StepDef[] = [
  { n: 1, label: 'Cliente', subtitle: 'Para quem e o orcamento', sectionIds: ['client'] },
  { n: 2, label: 'Escopo', subtitle: 'Produto e tipo', sectionIds: ['product', 'type'] },
  { n: 3, label: 'Configurador', subtitle: 'Monte o seu', sectionIds: ['configurator'] },
  { n: 4, label: 'Custos', subtitle: 'Materiais, mao de obra, margens', sectionIds: ['costs', 'modo', 'employees', 'items', 'margins'] },
  { n: 5, label: 'Pagamento', subtitle: 'Parcelas e formas de pagamento', sectionIds: ['payment'] },
  { n: 6, label: 'Apresentacao', subtitle: 'Fotos e observacoes', sectionIds: ['images', 'notes'] },
]

const emptyForm = (): BudgetForm => ({
  productMode: 'custom',
  clientMode: 'registered',
  clientCnpj: '',
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
  modoCalculo: 'OPERACIONAL', // novo padrao
  diasExecucao: 0,
  custoOperacionalDia: 0,
  payments: [],
  picks: [],
})

// --------------- Budget Form Component ---------------

function BudgetFormPanel({
  form,
  setForm,
  allEmployees,
  materials,
  products,
  clients,
  configCategories,
  onSave,
  onClose,
  saving,
}: {
  form: BudgetForm
  setForm: React.Dispatch<React.SetStateAction<BudgetForm>>
  allEmployees: Employee[]
  materials: Material[]
  products: ProductData[]
  clients: ClientData[]
  configCategories: ConfiguratorCategoryData[]
  onSave: (status: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [activeSection, setActiveSection] = useState<string>('product')
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)

  // Mapa section id -> numero do passo (pra filtrar render)
  const sectionStepMap = (() => {
    const m: Record<string, WizardStep> = {}
    for (const s of WIZARD_STEPS) for (const id of s.sectionIds) m[id] = s.n
    return m
  })()
  const isInStep = (sectionId: string) => sectionStepMap[sectionId] === currentStep
  const currentStepDef = WIZARD_STEPS.find((s) => s.n === currentStep)!
  const goToStep = (n: WizardStep) => {
    setCurrentStep(n)
    setActiveSection(WIZARD_STEPS.find((s) => s.n === n)?.sectionIds[0] || '')
  }
  const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as WizardStep) }
  const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as WizardStep) }
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cnpjError, setCnpjError] = useState('')
  const [cnpjSuccess, setCnpjSuccess] = useState('')
  const [clientSearch, setClientSearch] = useState('')

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients
    const term = clientSearch.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.cnpj?.includes(clientSearch.replace(/\D/g, '')) ||
        c.email?.toLowerCase().includes(term)
    )
  }, [clients, clientSearch])

  const loadClient = useCallback((clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return
    setForm((prev) => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      clientCnpj: client.cnpj ? formatCnpj(client.cnpj) : '',
      clientPhone: client.phone || '',
      clientEmail: client.email || '',
      clientAddress: client.address || '',
    }))
  }, [clients, setForm])

  const handleCnpjSearch = useCallback(async () => {
    const cnpjClean = form.clientCnpj.replace(/\D/g, '')
    if (cnpjClean.length !== 14) {
      setCnpjError('CNPJ deve ter 14 digitos')
      return
    }
    setCnpjLoading(true)
    setCnpjError('')
    setCnpjSuccess('')
    try {
      const res = await fetch(`/api/cnpj?cnpj=${cnpjClean}`)
      const data = await res.json()
      if (!res.ok) {
        setCnpjError(data.error || 'Erro ao consultar CNPJ')
        return
      }
      setForm((prev) => ({
        ...prev,
        clientName: data.nomeFantasia || data.razaoSocial || prev.clientName,
        clientPhone: data.telefone || prev.clientPhone,
        clientEmail: data.email ? data.email.toLowerCase() : prev.clientEmail,
        clientAddress: data.endereco || prev.clientAddress,
      }))
      setCnpjSuccess(data.razaoSocial || 'Dados encontrados')
    } catch {
      setCnpjError('Erro de conexao. Tente novamente.')
    } finally {
      setCnpjLoading(false)
    }
  }, [form.clientCnpj, setForm])

  const loadProduct = useCallback((productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const materials: { description: string; quantity: number; unitPrice: number }[] =
      JSON.parse(product.materialsJson || '[]')

    const productImages = product.images ? product.images.split('|||').filter(Boolean) : []
    const tempoTotal = (product.tempoProducaoDias || 0) + (product.tempoMontagemDias || 0)

    setForm((prev) => ({
      ...prev,
      productId: product.id,
      productMode: 'catalog',
      ironCost: product.ironCost,
      paintCost: product.paintCost,
      profitMargin: product.defaultMargin,
      diasExecucao: tempoTotal > 0 ? tempoTotal : prev.diasExecucao,
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

  // Carregar custo operacional atual da empresa (para modo OPERACIONAL)
  useEffect(() => {
    if (form.custoOperacionalDia > 0 || form.id) return
    fetch('/api/operational-cost')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data.custoOperacionalDia === 'number') {
          setForm((prev) => ({ ...prev, custoOperacionalDia: data.custoOperacionalDia }))
        }
      })
      .catch(() => {})
  }, [form.id, form.custoOperacionalDia, setForm])

  // Real-time calculation — escolhe entre OPERACIONAL e MANUAL; picks do configurador somam em ambos
  const calculation = useMemo(() => {
    const custoItens = form.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    // Picks do configurador: cada um acrescenta unitPrice × quantity ao custo e tempoDias × quantity aos dias
    const custoPicks = form.picks.reduce(
      (sum, p) => sum + p.unitPrice * p.quantity,
      0
    )
    const diasPicks = form.picks.reduce(
      (sum, p) => sum + p.tempoDias * p.quantity,
      0
    )

    if (form.modoCalculo === 'OPERACIONAL') {
      const custoMateriais = custoItens + custoPicks
      const diasTotais = form.diasExecucao + diasPicks
      const calc = calcOrcamentoOperacional({
        custoOperacionalDia: form.custoOperacionalDia,
        diasExecucao: diasTotais,
        custoMateriais,
        margemLucro: form.profitMargin,
        margemCausalidade: form.casualtyMargin,
        aliquotaImposto: form.taxRate,
      })
      return {
        ...calc,
        custoMaoDeObra: calc.custoOperacional,
        custoMateriais,
        custoPicks,
        diasPicks,
        diasTotais,
      }
    }

    // Modo MANUAL (legado)
    const custoMateriais = custoItens + form.ironCost + custoPicks
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

    return {
      ...calc,
      custoMaoDeObra,
      custoMateriais,
      custoOperacional: 0,
      custoPicks,
      diasPicks,
      diasTotais: form.diasExecucao + diasPicks,
    }
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

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-0" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative z-10 ml-auto w-full max-w-5xl bg-grafite-900 shadow-2xl flex flex-col overflow-hidden">
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
        <div className="flex-1 overflow-hidden flex">
          {/* Form Left */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto overscroll-contain">
            {/* Stepper — linha do tempo horizontal */}
            <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-3 bg-grafite-900 border-b border-grafite-700 mb-4">
              <div className="flex items-center justify-between gap-1 overflow-x-auto">
                {WIZARD_STEPS.map((s, idx) => {
                  const done = currentStep > s.n
                  const current = currentStep === s.n
                  return (
                    <div key={s.n} className="flex items-center flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => goToStep(s.n)}
                        className="flex flex-col items-center gap-1 group min-w-0"
                        title={s.subtitle}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            current
                              ? 'bg-amarelo text-grafite-950'
                              : done
                                ? 'bg-green-600 text-white'
                                : 'bg-grafite-700 text-gray-400 group-hover:bg-grafite-600'
                          }`}
                        >
                          {done ? <Check className="w-4 h-4" /> : s.n}
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider whitespace-nowrap ${current ? 'text-amarelo font-bold' : 'text-gray-400'}`}>
                          {s.label}
                        </span>
                      </button>
                      {idx < WIZARD_STEPS.length - 1 && (
                        <div className={`flex-1 h-px mx-1 min-w-[8px] ${currentStep > s.n ? 'bg-green-600' : 'bg-grafite-700'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Passo {currentStep} de 6 — <span className="text-gray-300">{currentStepDef.subtitle}</span>
              </p>
            </div>

            {/* Product Selection */}
            {isInStep('product') && <AccordionSection id="product" title="O que sera orcado? (Produto)" activeSection={activeSection} onToggle={setActiveSection}>
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
            </AccordionSection>}

            {/* Client Info */}
            {isInStep('client') && <AccordionSection id="client" title="Para quem e o orcamento? (Cliente)" activeSection={activeSection} onToggle={setActiveSection}>
              {/* Client Mode Selector */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, clientMode: 'registered' }))}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    form.clientMode === 'registered'
                      ? 'border-amarelo bg-amarelo/10 text-amarelo'
                      : 'border-grafite-600 bg-grafite-800 text-gray-400 hover:border-grafite-500'
                  }`}
                >
                  <Building2 className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-bold">Cliente Cadastrado</div>
                  <div className="text-xs mt-1 opacity-70">Selecione da lista</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, clientMode: 'quick', clientId: undefined }))}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    form.clientMode === 'quick'
                      ? 'border-amarelo bg-amarelo/10 text-amarelo'
                      : 'border-grafite-600 bg-grafite-800 text-gray-400 hover:border-grafite-500'
                  }`}
                >
                  <Pencil className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-bold">Rapido</div>
                  <div className="text-xs mt-1 opacity-70">Preencher manualmente</div>
                </button>
              </div>

              {/* Registered Client Selector */}
              {form.clientMode === 'registered' && (
                <div className="mb-4">
                  <label className="label-field">Buscar Cliente</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      className="input-field pl-10"
                      placeholder="Buscar por nome, CNPJ ou e-mail..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                  </div>
                  {clients.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhum cliente cadastrado.{' '}
                      <a href="/clientes" className="text-amarelo hover:underline">
                        Cadastrar cliente
                      </a>
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {filteredClients.map((client) => {
                        const isSelected = form.clientId === client.id
                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => loadClient(client.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                              isSelected
                                ? 'border-amarelo bg-amarelo/10'
                                : 'border-grafite-700 bg-grafite-800 hover:border-grafite-500'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-grafite-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-gray-300">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-200 truncate">
                                {client.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {client.cnpj
                                  ? formatCnpj(client.cnpj)
                                  : client.email || client.phone || 'Sem CNPJ'}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-xs text-amarelo font-medium">Selecionado</span>
                            )}
                          </button>
                        )
                      })}
                      {filteredClients.length === 0 && clientSearch && (
                        <p className="text-sm text-gray-500 text-center py-2">Nenhum resultado</p>
                      )}
                    </div>
                  )}
                  {form.clientId && (
                    <p className="text-xs text-green-400 mt-2">
                      Cliente selecionado — dados preenchidos abaixo
                    </p>
                  )}
                </div>
              )}

              {/* Quick CNPJ Search (only in quick mode) */}
              {form.clientMode === 'quick' && (
                <div className="mb-4">
                  <label className="label-field flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    CNPJ (auto preenchimento)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="input-field flex-1"
                      value={form.clientCnpj}
                      onChange={(e) => {
                        updateField('clientCnpj', formatCnpj(e.target.value))
                        setCnpjError('')
                        setCnpjSuccess('')
                      }}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                    <button
                      type="button"
                      onClick={handleCnpjSearch}
                      disabled={cnpjLoading || form.clientCnpj.replace(/\D/g, '').length !== 14}
                      className="px-4 py-2 bg-amarelo text-grafite-900 rounded-lg font-semibold text-sm hover:bg-amarelo/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                      {cnpjLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Buscar
                    </button>
                  </div>
                  {cnpjError && (
                    <p className="text-red-400 text-xs mt-1">{cnpjError}</p>
                  )}
                  {cnpjSuccess && (
                    <p className="text-green-400 text-xs mt-1">
                      Dados preenchidos - {cnpjSuccess}
                    </p>
                  )}
                </div>
              )}

              {/* Client fields (always visible, editable) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Nome do Cliente *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.clientName}
                    onChange={(e) => updateField('clientName', e.target.value)}
                    placeholder="Nome completo ou razao social"
                  />
                </div>
                <div>
                  <label className="label-field">Telefone</label>
                  <input
                    type="tel"
                    inputMode="tel"
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
            </AccordionSection>}

            {/* Type Selector */}
            {isInStep('type') && <AccordionSection id="type" title="Qual o tipo? (Fabricacao, Servico ou Venda)" activeSection={activeSection} onToggle={setActiveSection}>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: 'PRODUTO' as const, label: 'Fabricacao', desc: 'Fabricar pecas, estruturas ou chales' },
                  { key: 'SERVICO' as const, label: 'Servico', desc: 'Instalacao, reparo ou manutencao' },
                  { key: 'VENDA' as const, label: 'Venda de Produtos', desc: 'Vender itens do estoque (sem fabricacao)' },
                ]).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => updateField('type', t.key)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      form.type === t.key
                        ? 'border-amarelo bg-amarelo/10 text-amarelo'
                        : 'border-grafite-600 bg-grafite-800 text-gray-400 hover:border-grafite-500'
                    }`}
                  >
                    <div className="text-sm font-bold">{t.label}</div>
                    <div className="text-xs mt-1 opacity-70">{t.desc}</div>
                  </button>
                ))}
              </div>
              {form.type === 'VENDA' && (
                <p className="text-xs text-amarelo/80 mt-2">
                  Na venda de produtos, os itens serao descontados do estoque ao aprovar o orcamento.
                </p>
              )}
            </AccordionSection>}

            {/* Costs - hidden for VENDA type */}
            {isInStep('costs') && form.type !== 'VENDA' && <AccordionSection id="costs" title="Custos de Material (Ferro, Pintura, etc)" activeSection={activeSection} onToggle={setActiveSection}>
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
            </AccordionSection>}

            {/* Modo de Calculo — Operacional vs Manual */}
            {form.type !== 'VENDA' && isInStep('modo') && (
              <AccordionSection id="modo" title="Como calcular o orcamento?" activeSection={activeSection} onToggle={setActiveSection}>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => updateField('modoCalculo', 'OPERACIONAL')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      form.modoCalculo === 'OPERACIONAL'
                        ? 'border-amarelo bg-amarelo/10'
                        : 'border-grafite-600 bg-grafite-800 hover:border-grafite-500'
                    }`}
                  >
                    <div className="text-sm font-bold text-gray-100">Custo Operacional × Dias</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Base: custo da empresa aberta × dias de execucao + materiais
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('modoCalculo', 'MANUAL')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      form.modoCalculo === 'MANUAL'
                        ? 'border-amarelo bg-amarelo/10'
                        : 'border-grafite-600 bg-grafite-800 hover:border-grafite-500'
                    }`}
                  >
                    <div className="text-sm font-bold text-gray-100">Manual (legado)</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Base: ferro + pintura + mao-de-obra por hora
                    </div>
                  </button>
                </div>

                {form.modoCalculo === 'OPERACIONAL' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label-field">Custo Operacional / Dia (R$)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                          <input
                            type="number"
                            className="input-field pl-10"
                            value={form.custoOperacionalDia || ''}
                            onChange={(e) => updateField('custoOperacionalDia', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Carregado automaticamente de (custos fixos + folha) / 22 dias.
                        </p>
                      </div>
                      <div>
                        <label className="label-field">Dias de Execucao</label>
                        <input
                          type="number"
                          className="input-field"
                          value={form.diasExecucao || ''}
                          onChange={(e) => updateField('diasExecucao', parseFloat(e.target.value) || 0)}
                          step="0.5"
                          min="0"
                          placeholder="Producao + montagem"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Auto-preenchido quando selecionar produto do catalogo.
                        </p>
                      </div>
                    </div>
                    <div className="bg-grafite-800 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Custo operacional ({form.diasExecucao}d):</span>
                        <span className="text-gray-200 font-medium">
                          {formatCurrency(form.custoOperacionalDia * form.diasExecucao)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </AccordionSection>
            )}

            {/* Margins */}
            {isInStep('margins') && <AccordionSection id="margins" title="Lucro, Impostos e Margem de Seguranca" activeSection={activeSection} onToggle={setActiveSection}>
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
                    Margem de Seguranca (Imprevistos): {formatPercent(form.casualtyMargin)}
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
            </AccordionSection>}

            {/* Employee Allocation - hidden for VENDA type */}
            {isInStep('employees') && form.type !== 'VENDA' && <AccordionSection id="employees" title="Quem vai trabalhar? (Mao de Obra)" activeSection={activeSection} onToggle={setActiveSection}>
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
            </AccordionSection>}

            {/* Budget Items */}
            {/* Monte o seu — configurador de opcoes cadastradas em Configuracoes */}
            {form.type !== 'VENDA' && isInStep('configurator') && configCategories.filter((c) => c.active).length > 0 && (
              <AccordionSection id="configurator" title="Monte o seu (cobertura, revestimento, piso, opcionais...)" activeSection={activeSection} onToggle={setActiveSection}>
                <p className="text-xs text-gray-500 mb-4">
                  Selecione as opcoes. O preco e o tempo (dias) serao somados automaticamente ao orcamento.
                </p>

                <div className="space-y-4">
                  {configCategories.filter((c) => c.active).map((cat) => {
                    const activeOpts = cat.options.filter((o) => o.active)
                    if (activeOpts.length === 0) return null
                    const picksNestaCat = form.picks.filter((p) => p.categoryName === cat.name)
                    const pickedIds = new Set(picksNestaCat.map((p) => p.optionId))

                    const togglePick = (opt: ConfiguratorOptionData) => {
                      setForm((prev) => {
                        const existing = prev.picks.find((p) => p.optionId === opt.id)
                        if (existing) {
                          // Deselect
                          return { ...prev, picks: prev.picks.filter((p) => p.optionId !== opt.id) }
                        }
                        // Para SINGLE, remove outros da mesma categoria
                        const filtered = cat.selectionType === 'SINGLE'
                          ? prev.picks.filter((p) => p.categoryName !== cat.name)
                          : prev.picks
                        return {
                          ...prev,
                          picks: [
                            ...filtered,
                            {
                              optionId: opt.id,
                              optionName: opt.name,
                              categoryName: cat.name,
                              unitPrice: opt.unitPrice,
                              tempoDias: opt.tempoDias,
                              quantity: 1,
                            },
                          ],
                        }
                      })
                    }

                    const updateQty = (optionId: string, qty: number) => {
                      setForm((prev) => ({
                        ...prev,
                        picks: prev.picks.map((p) =>
                          p.optionId === optionId ? { ...p, quantity: Math.max(0, qty) } : p
                        ),
                      }))
                    }

                    return (
                      <div key={cat.id} className="border border-grafite-700 rounded-lg p-3 bg-grafite-900/30">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-100">{cat.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-grafite-700 text-gray-400">
                            {cat.selectionType === 'SINGLE' ? 'Escolha 1' : 'Varias'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeOpts.map((opt) => {
                            const picked = pickedIds.has(opt.id)
                            const pickInfo = picksNestaCat.find((p) => p.optionId === opt.id)
                            return (
                              <div
                                key={opt.id}
                                className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                                  picked
                                    ? 'border-amarelo bg-amarelo/10'
                                    : 'border-grafite-700 bg-grafite-800 hover:border-grafite-500'
                                }`}
                                onClick={() => togglePick(opt)}
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type={cat.selectionType === 'SINGLE' ? 'radio' : 'checkbox'}
                                    checked={picked}
                                    readOnly
                                    className="mt-1 h-4 w-4 text-amarelo"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-100">{opt.name}</div>
                                    <div className="flex items-center gap-3 text-xs mt-1">
                                      {opt.unitPrice > 0 && (
                                        <span className="text-amarelo">
                                          {formatCurrency(opt.unitPrice)}
                                        </span>
                                      )}
                                      {opt.tempoDias > 0 && (
                                        <span className="text-gray-400">
                                          +{opt.tempoDias}d
                                        </span>
                                      )}
                                    </div>
                                    {picked && cat.selectionType === 'MULTIPLE' && (
                                      <div
                                        className="flex items-center gap-2 mt-2"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span className="text-xs text-gray-400">Qtd:</span>
                                        <input
                                          type="number"
                                          min="0.5"
                                          step="0.5"
                                          value={pickInfo?.quantity || 1}
                                          onChange={(e) => updateQty(opt.id, parseFloat(e.target.value) || 1)}
                                          className="input-field text-xs py-1 w-20"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {form.picks.length > 0 && (
                    <div className="bg-grafite-900 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Opcoes selecionadas:</span>
                        <span className="text-gray-200">{form.picks.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Custo adicional:</span>
                        <span className="text-amarelo font-medium">
                          + {formatCurrency(calculation.custoPicks)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Dias adicionais:</span>
                        <span className="text-amarelo font-medium">+ {calculation.diasPicks}d</span>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionSection>
            )}

            {isInStep('items') && <AccordionSection id="items" title={form.type === 'VENDA' ? 'Produtos para Venda (serao descontados do estoque)' : 'Lista de Itens e Materiais'} activeSection={activeSection} onToggle={setActiveSection}>
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
            </AccordionSection>}

            {/* Payment Config — parcelas mistas (dinheiro + cartao, boleto, etc) */}
            {isInStep('payment') && <AccordionSection id="payment" title="Como o cliente vai pagar? (Parcelas)" activeSection={activeSection} onToggle={setActiveSection}>
              <p className="text-xs text-gray-500 mb-3">
                Cada parcela pode ter forma e imposto proprios. Ex: entrada em dinheiro (sem imposto) + restante no cartao (com 5%).
              </p>

              <div className="space-y-3">
                {form.payments.length === 0 ? (
                  <div className="p-4 bg-grafite-800 rounded-lg border border-dashed border-grafite-600 text-center">
                    <p className="text-sm text-gray-400 mb-3">
                      Nenhuma parcela configurada. Por padrao sera criada uma parcela unica com o valor total.
                    </p>
                    <button
                      type="button"
                      onClick={() => updateField('payments', [
                        { method: 'DINHEIRO', amount: calculation.precoFinal * 0.5, taxRate: 0, dueOffset: 0 },
                        { method: 'CARTAO', amount: calculation.precoFinal * 0.5, taxRate: 0, dueOffset: 30 },
                      ])}
                      className="btn-secondary text-sm"
                    >
                      Criar parcelas padrao (entrada + entrega)
                    </button>
                  </div>
                ) : (
                  form.payments.map((p, idx) => {
                    const withTax = p.amount * (1 + p.taxRate / 100)
                    return (
                      <div key={idx} className="bg-grafite-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-200">Parcela {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => updateField('payments', form.payments.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="label-field">Forma</label>
                            <select
                              className="select-field w-full"
                              value={p.method}
                              onChange={(e) => {
                                const copy = [...form.payments]
                                copy[idx] = { ...copy[idx], method: e.target.value }
                                updateField('payments', copy)
                              }}
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label-field">Valor Base (R$)</label>
                            <input
                              type="number"
                              className="input-field"
                              value={p.amount || ''}
                              min="0"
                              step="0.01"
                              onChange={(e) => {
                                const copy = [...form.payments]
                                copy[idx] = { ...copy[idx], amount: parseFloat(e.target.value) || 0 }
                                updateField('payments', copy)
                              }}
                            />
                          </div>
                          <div>
                            <label className="label-field">Imposto/Taxa (%)</label>
                            <input
                              type="number"
                              className="input-field"
                              value={p.taxRate || ''}
                              min="0"
                              step="0.1"
                              onChange={(e) => {
                                const copy = [...form.payments]
                                copy[idx] = { ...copy[idx], taxRate: parseFloat(e.target.value) || 0 }
                                updateField('payments', copy)
                              }}
                            />
                          </div>
                          <div>
                            <label className="label-field">Vence em (dias)</label>
                            <input
                              type="number"
                              className="input-field"
                              value={p.dueOffset ?? ''}
                              min="0"
                              onChange={(e) => {
                                const copy = [...form.payments]
                                copy[idx] = { ...copy[idx], dueOffset: parseInt(e.target.value, 10) || 0 }
                                updateField('payments', copy)
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 text-right">
                          Total desta parcela: <span className="text-amarelo font-bold">{formatCurrency(withTax)}</span>
                          {p.taxRate > 0 && ` (base ${formatCurrency(p.amount)} + ${p.taxRate}%)`}
                        </div>
                      </div>
                    )
                  })
                )}

                {form.payments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateField('payments', [
                      ...form.payments,
                      { method: 'DINHEIRO', amount: 0, taxRate: 0, dueOffset: form.payments.length * 30 },
                    ])}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Parcela
                  </button>
                )}

                {form.payments.length > 0 && (() => {
                  const totalBase = form.payments.reduce((s, p) => s + p.amount, 0)
                  const totalImposto = form.payments.reduce((s, p) => s + p.amount * (p.taxRate / 100), 0)
                  const totalFinal = totalBase + totalImposto
                  const diff = totalBase - calculation.precoFinal
                  return (
                    <div className="bg-grafite-900 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Soma das parcelas (base):</span>
                        <span className="text-gray-200 font-medium">{formatCurrency(totalBase)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Soma impostos/taxas adicionais:</span>
                        <span className="text-red-400">+ {formatCurrency(totalImposto)}</span>
                      </div>
                      <div className="flex justify-between border-t border-grafite-700 pt-1">
                        <span className="text-gray-300 font-medium">Total que o cliente paga:</span>
                        <span className="text-amarelo font-bold">{formatCurrency(totalFinal)}</span>
                      </div>
                      {Math.abs(diff) > 0.01 && (
                        <p className="text-xs text-yellow-400 mt-1">
                          {diff > 0
                            ? `Atencao: parcelas somam ${formatCurrency(diff)} a mais que o preco final do orcamento (${formatCurrency(calculation.precoFinal)}).`
                            : `Atencao: parcelas somam ${formatCurrency(-diff)} a menos que o preco final do orcamento (${formatCurrency(calculation.precoFinal)}).`}
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
            </AccordionSection>}

            {/* Images */}
            {isInStep('images') && <AccordionSection id="images" title="Fotos e Imagens de Referencia" activeSection={activeSection} onToggle={setActiveSection}>
              <BudgetImageUpload form={form} setForm={setForm} />
            </AccordionSection>}

            {/* Notes */}
            {isInStep('notes') && <AccordionSection id="notes" title="Observacoes e Anotacoes" activeSection={activeSection} onToggle={setActiveSection}>
              <textarea
                className="input-field min-h-[100px] resize-y"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Observacoes adicionais sobre o orcamento..."
              />
            </AccordionSection>}

            {/* Navegacao Anterior/Proximo — rodape do wizard */}
            <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-grafite-900 border-t border-grafite-700 mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-xs text-gray-500">
                {currentStep} de 6
              </span>
              <button
                type="button"
                onClick={nextStep}
                disabled={currentStep === 6}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
              >
                Proximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calculation Summary Panel (Right) */}
          <div className="w-72 border-l border-grafite-700 bg-grafite-800 p-4 flex-shrink-0 overflow-y-auto">
            <h3 className="text-sm font-bold text-amarelo uppercase tracking-wider mb-4">
              Resumo de Valores
            </h3>
            <div className="space-y-3">
              <SummaryRow label="Materiais e Itens" value={calculation.custoMateriais} />
              <SummaryRow label="Mao de Obra" value={calculation.custoMaoDeObra} />
              <SummaryRow label="Pintura" value={form.paintCost} />
              <div className="border-t border-grafite-600 pt-3">
                <SummaryRow label="Total de Custos" value={calculation.custoBase} highlight />
              </div>
              <SummaryRow
                label={`Seguranca/Imprevistos (${formatPercent(form.casualtyMargin)})`}
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
                <SummaryRow label="VALOR FINAL P/ CLIENTE" value={calculation.precoFinal} highlight big />
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
  const [clients, setClients] = useState<ClientData[]>([])
  const [configCategories, setConfigCategories] = useState<ConfiguratorCategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BudgetForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [budgetsRes, employeesRes, materialsRes, productsRes, clientsRes, configRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/employees'),
        fetch('/api/materials'),
        fetch('/api/products'),
        fetch('/api/clients'),
        fetch('/api/configurator/categories'),
      ])
      if (budgetsRes.ok) setBudgets(await budgetsRes.json())
      if (employeesRes.ok) setEmployees(await employeesRes.json())
      if (materialsRes.ok) setMaterials(await materialsRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
      if (clientsRes.ok) setClients(await clientsRes.json())
      if (configRes.ok) setConfigCategories(await configRes.json())
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
      clientMode: (budget as any).clientId ? 'registered' : 'quick',
      clientId: (budget as any).clientId || undefined,
      clientCnpj: budget.clientCnpj || '',
      clientName: budget.clientName,
      clientPhone: budget.clientPhone || '',
      clientEmail: budget.clientEmail || '',
      clientAddress: budget.clientAddress || '',
      type: budget.type as 'PRODUTO' | 'SERVICO' | 'VENDA',
      status: budget.status,
      ironCost: budget.ironCost,
      paintCost: budget.paintCost,
      profitMargin: budget.profitMargin,
      casualtyMargin: budget.casualtyMargin,
      entryPercent: budget.entryPercent,
      deliveryPercent: budget.deliveryPercent,
      taxRate: budget.taxRate,
      modoCalculo: ((budget as any).modoCalculo === 'OPERACIONAL' ? 'OPERACIONAL' : 'MANUAL') as 'MANUAL' | 'OPERACIONAL',
      diasExecucao: (budget as any).diasExecucao || 0,
      custoOperacionalDia: (budget as any).custoOperacionalDia || 0,
      payments: ((budget as any).payments || []).map((p: any) => ({
        method: p.method,
        amount: p.amount,
        taxRate: p.taxRate || 0,
        dueOffset: p.dueOffset || 0,
      })),
      picks: ((budget as any).configuratorPicks || []).map((p: any) => ({
        optionId: p.optionId || '',
        optionName: p.optionName,
        categoryName: p.categoryName,
        unitPrice: p.unitPrice,
        tempoDias: p.tempoDias,
        quantity: p.quantity || 1,
      })),
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
      clientId: form.clientMode === 'registered' ? form.clientId || null : null,
      clientName: form.clientName,
      clientCnpj: form.clientCnpj,
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
      modoCalculo: form.modoCalculo,
      diasExecucao: form.diasExecucao,
      custoOperacionalDia: form.custoOperacionalDia,
      payments: form.payments,
      picks: form.picks,
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
          <h1 className="text-2xl font-bold text-gray-100">Orcamentos e Vendas</h1>
          <p className="text-sm text-gray-400 mt-1">
            Crie orcamentos para fabricacao, servicos ou venda de produtos do estoque
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
          <option value="RASCUNHO">Rascunho (em elaboracao)</option>
          <option value="ENVIADO">Enviado ao cliente</option>
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
                        {budget.type === 'PRODUTO' ? 'Fabricacao' : budget.type === 'VENDA' ? 'Venda' : 'Servico'}
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
                      {budget.type === 'PRODUTO' ? 'Fabricacao' : budget.type === 'VENDA' ? 'Venda' : 'Servico'} -{' '}
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
          clients={clients}
          configCategories={configCategories}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          saving={saving}
        />
      )}
    </div>
  )
}
