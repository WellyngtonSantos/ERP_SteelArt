'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Save,
  Image as ImageIcon,
  X,
  Palette,
  Type,
  FileText,
  Eye,
  Upload,
  Trash2,
  Monitor,
  History,
  Sparkles,
  Bug,
  Wrench,
  RefreshCw,
  Zap,
  CheckCircle,
  GitCommit,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Banknote,
  Plus,
  Edit2,
  LayoutGrid,
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

interface ChangelogItem {
  sha: string
  message: string
  description: string
  date: string
}

interface ChangelogGroup {
  type: string
  label: string
  icon: string
  items: ChangelogItem[]
}

interface ChangelogData {
  groups: ChangelogGroup[]
  totalCommits: number
  lastUpdate: string | null
}

const CHANGELOG_ICONS: Record<string, React.ComponentType<any>> = {
  sparkles: Sparkles,
  bug: Bug,
  wrench: Wrench,
  refresh: RefreshCw,
  palette: Palette,
  'file-text': FileText,
  zap: Zap,
  'check-circle': CheckCircle,
  'git-commit': GitCommit,
}

const CHANGELOG_COLORS: Record<string, string> = {
  feat: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  fix: 'text-red-400 bg-red-400/10 border-red-400/30',
  chore: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
  refactor: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  style: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
  perf: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  docs: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  test: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  other: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
}

interface FinancialOption {
  id: string
  type: 'BANK' | 'CATEGORY' | 'GROUP'
  name: string
  active: boolean
  order: number
}

interface ConfiguratorOption {
  id: string
  categoryId: string
  name: string
  description: string | null
  unitPrice: number
  tempoDias: number
  order: number
  active: boolean
}

interface ConfiguratorCategory {
  id: string
  name: string
  description: string | null
  selectionType: 'SINGLE' | 'MULTIPLE'
  order: number
  active: boolean
  options: ConfiguratorOption[]
}

interface TemplateData {
  id: string
  companyName: string
  companySubtitle: string
  logoPath?: string | null
  primaryColor: string
  secondaryColor: string
  textColor: string
  headerText?: string | null
  footerText: string
  termsText?: string | null
  warrantyText?: string | null
  validityDays: number
}

export default function ConfiguracoesPage() {
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newLogo, setNewLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'identity' | 'colors' | 'texts' | 'preview' | 'changelog' | 'financeiro' | 'configurador'>('identity')
  const [changelog, setChangelog] = useState<ChangelogData | null>(null)
  const [changelogLoading, setChangelogLoading] = useState(false)
  const [changelogError, setChangelogError] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [finOptions, setFinOptions] = useState<FinancialOption[]>([])
  const [finLoading, setFinLoading] = useState(false)
  const [finError, setFinError] = useState('')
  const [newFinName, setNewFinName] = useState<Record<string, string>>({ BANK: '', CATEGORY: '', GROUP: '' })
  const [editingFinId, setEditingFinId] = useState<string | null>(null)
  const [editingFinName, setEditingFinName] = useState('')

  // Configurador state
  const [configCategories, setConfigCategories] = useState<ConfiguratorCategory[]>([])
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryType, setNewCategoryType] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE')
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null)
  const [newOption, setNewOption] = useState<Record<string, { name: string; unitPrice: number; tempoDias: number }>>({})
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string>('')

  const { refreshTheme } = useTheme()

  const fetchFinOptions = useCallback(async () => {
    setFinLoading(true)
    setFinError('')
    try {
      const res = await fetch('/api/financial-options')
      if (res.ok) setFinOptions(await res.json())
      else setFinError('Erro ao carregar opcoes')
    } catch {
      setFinError('Erro de conexao')
    } finally {
      setFinLoading(false)
    }
  }, [])

  const addFinOption = async (type: 'BANK' | 'CATEGORY' | 'GROUP') => {
    const name = (newFinName[type] || '').trim()
    if (!name) return
    setFinError('')
    try {
      const res = await fetch('/api/financial-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFinError(data.error || 'Erro ao criar opcao')
        return
      }
      setNewFinName((prev) => ({ ...prev, [type]: '' }))
      await fetchFinOptions()
    } catch {
      setFinError('Erro de conexao')
    }
  }

  const updateFinOption = async (id: string, payload: any) => {
    setFinError('')
    try {
      const res = await fetch('/api/financial-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFinError(data.error || 'Erro ao atualizar')
        return
      }
      await fetchFinOptions()
    } catch {
      setFinError('Erro de conexao')
    }
  }

  // Configurador CRUD
  const fetchConfigCategories = useCallback(async () => {
    setConfigLoading(true)
    setConfigError('')
    try {
      const res = await fetch('/api/configurator/categories')
      if (res.ok) setConfigCategories(await res.json())
      else setConfigError('Erro ao carregar categorias')
    } catch {
      setConfigError('Erro de conexao')
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const addCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setConfigError('')
    try {
      const res = await fetch('/api/configurator/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, selectionType: newCategoryType }),
      })
      if (!res.ok) {
        const data = await res.json()
        setConfigError(data.error || 'Erro ao criar categoria')
        return
      }
      setNewCategoryName('')
      await fetchConfigCategories()
    } catch {
      setConfigError('Erro de conexao')
    }
  }

  const updateCategory = async (id: string, payload: any) => {
    setConfigError('')
    try {
      const res = await fetch('/api/configurator/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        setConfigError(data.error || 'Erro ao atualizar categoria')
        return
      }
      await fetchConfigCategories()
    } catch {
      setConfigError('Erro de conexao')
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Excluir esta categoria e todas as suas opcoes?')) return
    setConfigError('')
    try {
      const res = await fetch(`/api/configurator/categories?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setConfigError(data.error || 'Erro ao excluir')
        return
      }
      await fetchConfigCategories()
    } catch {
      setConfigError('Erro de conexao')
    }
  }

  const addOption = async (categoryId: string) => {
    const opt = newOption[categoryId]
    if (!opt || !opt.name?.trim()) return
    setConfigError('')
    try {
      const res = await fetch('/api/configurator/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          name: opt.name,
          unitPrice: opt.unitPrice || 0,
          tempoDias: opt.tempoDias || 0,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setConfigError(data.error || 'Erro ao criar opcao')
        return
      }
      setNewOption((prev) => ({ ...prev, [categoryId]: { name: '', unitPrice: 0, tempoDias: 0 } }))
      await fetchConfigCategories()
    } catch {
      setConfigError('Erro de conexao')
    }
  }

  const updateOption = async (id: string, payload: any) => {
    setConfigError('')
    try {
      const res = await fetch('/api/configurator/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        setConfigError(data.error || 'Erro ao atualizar')
        return
      }
      await fetchConfigCategories()
    } catch {
      setConfigError('Erro de conexao')
    }
  }

  const runConfiguratorSeed = async () => {
    if (!confirm('Isso vai criar 6 categorias (Cobertura, Revestimento, Piso, Climatizacao, Iluminacao, Extras) com ~37 opcoes tipicas de chale. Preciso de admin. Continuar?')) return
    setSeeding(true)
    setSeedResult('')
    setConfigError('')
    try {
      const res = await fetch('/api/seed/configurator', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setConfigError(data.error || 'Erro ao rodar seed')
        return
      }
      setSeedResult(
        `${data.categoriesCreated} categorias criadas (${data.categoriesExisting} ja existiam), ` +
        `${data.optionsCreated} opcoes criadas (${data.optionsExisting} ja existiam).`
      )
      await fetchConfigCategories()
      setTimeout(() => setSeedResult(''), 10000)
    } catch {
      setConfigError('Erro de conexao')
    } finally {
      setSeeding(false)
    }
  }

  const deleteOption = async (id: string) => {
    if (!confirm('Excluir esta opcao?')) return
    setConfigError('')
    try {
      const res = await fetch(`/api/configurator/options?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setConfigError(data.error || 'Erro ao excluir')
        return
      }
      await fetchConfigCategories()
    } catch {
      setConfigError('Erro de conexao')
    }
  }

  const deleteFinOption = async (id: string) => {
    if (!confirm('Excluir esta opcao? Lancamentos existentes manterao o nome ja gravado.')) return
    setFinError('')
    try {
      const res = await fetch(`/api/financial-options?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setFinError(data.error || 'Erro ao excluir')
        return
      }
      await fetchFinOptions()
    } catch {
      setFinError('Erro de conexao')
    }
  }

  const fetchTemplate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/budget-template')
      if (res.ok) {
        const data = await res.json()
        setTemplate(data)
        if (data.logoPath) setLogoPreview(data.logoPath)
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error)
    }
    setLoading(false)
  }, [])

  const fetchChangelog = useCallback(async () => {
    if (changelog) return // Already loaded
    setChangelogLoading(true)
    setChangelogError('')
    try {
      const res = await fetch('/api/changelog')
      const data = await res.json()
      if (!res.ok) {
        setChangelogError(data.error || 'Erro ao carregar atualizacoes')
        return
      }
      setChangelog(data)
      // Expand first group by default
      if (data.groups.length > 0) {
        setExpandedGroups({ [data.groups[0].type]: true })
      }
    } catch {
      setChangelogError('Erro de conexao ao buscar atualizacoes')
    } finally {
      setChangelogLoading(false)
    }
  }, [changelog])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  useEffect(() => {
    if (activeTab === 'changelog') {
      fetchChangelog()
    }
    if (activeTab === 'financeiro') {
      fetchFinOptions()
    }
    if (activeTab === 'configurador') {
      fetchConfigCategories()
    }
  }, [activeTab, fetchChangelog, fetchFinOptions, fetchConfigCategories])

  const handleSave = async () => {
    if (!template) return
    setSaving(true)
    setSaved(false)

    const formData = new FormData()
    formData.append('companyName', template.companyName)
    formData.append('companySubtitle', template.companySubtitle)
    formData.append('primaryColor', template.primaryColor)
    formData.append('secondaryColor', template.secondaryColor)
    formData.append('textColor', template.textColor)
    formData.append('headerText', template.headerText || '')
    formData.append('footerText', template.footerText)
    formData.append('termsText', template.termsText || '')
    formData.append('warrantyText', template.warrantyText || '')
    formData.append('validityDays', String(template.validityDays))

    if (newLogo) {
      formData.append('logo', newLogo)
    }
    if (!template.logoPath && !newLogo) {
      formData.append('removeLogo', 'true')
    }

    try {
      const res = await fetch('/api/budget-template', { method: 'PUT', body: formData })
      if (res.ok) {
        const data = await res.json()
        setTemplate(data)
        setNewLogo(null)
        if (data.logoPath) setLogoPreview(data.logoPath)
        refreshTheme()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        alert('Erro ao salvar configuracoes')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro de conexao')
    }
    setSaving(false)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewLogo(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeLogo = () => {
    setNewLogo(null)
    setLogoPreview(null)
    if (template) {
      setTemplate({ ...template, logoPath: null })
    }
  }

  const updateField = (field: keyof TemplateData, value: string | number) => {
    if (!template) return
    setTemplate({ ...template, [field]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!template) return null

  const tabs = [
    { id: 'identity' as const, label: 'Identidade', icon: ImageIcon },
    { id: 'colors' as const, label: 'Cores', icon: Palette },
    { id: 'texts' as const, label: 'Textos', icon: Type },
    { id: 'preview' as const, label: 'Preview', icon: Eye },
    { id: 'financeiro' as const, label: 'Financeiro', icon: Banknote },
    { id: 'configurador' as const, label: 'Configurador', icon: LayoutGrid },
    { id: 'changelog' as const, label: 'Atualizacoes', icon: History },
  ]

  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Configuracoes do Sistema</h1>
          <p className="text-sm text-gray-400 mt-1">
            Personalize o cabecalho, cores e aparencia dos PDFs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-400 animate-pulse">Salvo com sucesso!</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alteracoes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-grafite-700 pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amarelo text-amarelo'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Identity Tab */}
      {activeTab === 'identity' && (
        <div className="card space-y-6">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
            Identidade da Empresa
          </h3>
          <p className="text-xs text-gray-500">
            O nome, subtitulo e logo aparecem no cabecalho lateral e nos PDFs de orcamento.
          </p>

          {/* Logo */}
          <div>
            <label className="label-field">Logo da Empresa</label>
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 bg-grafite-800 border-2 border-dashed border-grafite-600 rounded-xl overflow-hidden flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-grafite-500 mx-auto" />
                    <span className="text-xs text-grafite-500 mt-1 block">Sem logo</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="btn-secondary text-sm flex items-center gap-2 cursor-pointer inline-flex">
                  <Upload className="w-4 h-4" />
                  {logoPreview ? 'Trocar Logo' : 'Enviar Logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                {logoPreview && (
                  <button onClick={removeLogo} className="btn-secondary text-sm flex items-center gap-2 text-red-400">
                    <Trash2 className="w-4 h-4" /> Remover
                  </button>
                )}
                <p className="text-xs text-gray-500">PNG ou JPG. Recomendado: 400x200px</p>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nome da Empresa</label>
              <input
                type="text"
                className="input-field"
                value={template.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="SteelArt"
              />
            </div>
            <div>
              <label className="label-field">Subtitulo</label>
              <input
                type="text"
                className="input-field"
                value={template.companySubtitle}
                onChange={(e) => updateField('companySubtitle', e.target.value)}
                placeholder="Estruturas Metalicas & Chales"
              />
            </div>
          </div>
        </div>
      )}

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="card space-y-6">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
            Cores do Sistema e PDF
          </h3>
          <p className="text-xs text-gray-500">
            As cores afetam o cabecalho lateral do sistema e a aparencia dos PDFs gerados.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label-field">Cor Principal (Destaque)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-12 h-12 rounded-lg cursor-pointer border border-grafite-600 bg-transparent"
                  value={template.primaryColor}
                  onChange={(e) => updateField('primaryColor', e.target.value)}
                />
                <div className="flex-1">
                  <input
                    type="text"
                    className="input-field text-sm font-mono"
                    value={template.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Cabecalho, titulos, destaques</p>
                </div>
              </div>
            </div>

            <div>
              <label className="label-field">Cor Secundaria (Fundo tabelas)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-12 h-12 rounded-lg cursor-pointer border border-grafite-600 bg-transparent"
                  value={template.secondaryColor}
                  onChange={(e) => updateField('secondaryColor', e.target.value)}
                />
                <div className="flex-1">
                  <input
                    type="text"
                    className="input-field text-sm font-mono"
                    value={template.secondaryColor}
                    onChange={(e) => updateField('secondaryColor', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Header de tabelas</p>
                </div>
              </div>
            </div>

            <div>
              <label className="label-field">Cor do Texto</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-12 h-12 rounded-lg cursor-pointer border border-grafite-600 bg-transparent"
                  value={template.textColor}
                  onChange={(e) => updateField('textColor', e.target.value)}
                />
                <div className="flex-1">
                  <input
                    type="text"
                    className="input-field text-sm font-mono"
                    value={template.textColor}
                    onChange={(e) => updateField('textColor', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Corpo do texto</p>
                </div>
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-4 bg-white rounded-lg">
            <div
              className="flex justify-between items-center pb-2 mb-3"
              style={{ borderBottom: `2px solid ${template.primaryColor}` }}
            >
              <span className="text-lg font-bold" style={{ color: template.textColor }}>
                {template.companyName}
              </span>
              <span className="text-sm font-bold" style={{ color: template.primaryColor }}>
                ORC-XXXXXX
              </span>
            </div>
            <div
              className="flex text-xs text-white p-2 rounded"
              style={{ backgroundColor: template.secondaryColor }}
            >
              <span className="flex-1">Descricao</span>
              <span className="w-16 text-center">Qtd</span>
              <span className="w-20 text-right">Total</span>
            </div>
            <div className="p-2 text-sm" style={{ color: template.textColor }}>
              <span>Exemplo de item do orcamento</span>
            </div>
            <div
              className="mt-3 p-3 rounded text-sm font-bold text-right"
              style={{ backgroundColor: `${template.primaryColor}20`, color: template.primaryColor }}
            >
              TOTAL: R$ 15.000,00
            </div>
          </div>
        </div>
      )}

      {/* Texts Tab */}
      {activeTab === 'texts' && (
        <div className="card space-y-6">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
            Textos Padrao do Orcamento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label-field">Validade (dias)</label>
              <input
                type="number"
                className="input-field"
                value={template.validityDays}
                onChange={(e) => updateField('validityDays', parseInt(e.target.value) || 15)}
                min="1"
                max="365"
              />
            </div>
            <div>
              <label className="label-field">Texto do Rodape</label>
              <input
                type="text"
                className="input-field"
                value={template.footerText}
                onChange={(e) => updateField('footerText', e.target.value)}
                placeholder="Texto que aparece no rodape do PDF"
              />
            </div>
          </div>

          <div>
            <label className="label-field">Texto do Cabecalho (opcional)</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              value={template.headerText || ''}
              onChange={(e) => updateField('headerText', e.target.value)}
              placeholder="Texto adicional que aparece abaixo do cabecalho (ex: CNPJ, endereco da empresa)"
            />
          </div>

          <div>
            <label className="label-field">Termos e Condicoes (opcional)</label>
            <textarea
              className="input-field min-h-[120px] resize-y"
              value={template.termsText || ''}
              onChange={(e) => updateField('termsText', e.target.value)}
              placeholder="Ex: O prazo de entrega e de 30 dias uteis apos aprovacao. Pagamento conforme condicoes do orcamento..."
            />
          </div>

          <div>
            <label className="label-field">Garantia (opcional)</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              value={template.warrantyText || ''}
              onChange={(e) => updateField('warrantyText', e.target.value)}
              placeholder="Ex: Garantia de 12 meses contra defeitos de fabricacao..."
            />
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="card">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-4">
            Preview do Orcamento
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Visualizacao aproximada de como o PDF sera gerado com as configuracoes atuais.
          </p>

          {/* PDF Preview Mock */}
          <div className="bg-white rounded-lg p-8 max-w-2xl mx-auto shadow-lg" style={{ color: template.textColor }}>
            {/* Header */}
            <div
              className="flex justify-between items-start pb-4 mb-5"
              style={{ borderBottom: `2px solid ${template.primaryColor}` }}
            >
              <div>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-12 object-contain mb-1" />
                ) : (
                  <span className="text-2xl font-bold">{template.companyName}</span>
                )}
                <p className="text-xs text-gray-500 mt-1">{template.companySubtitle}</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold" style={{ color: template.primaryColor }}>
                  ORC-A1B2C3
                </span>
                <p className="text-xs text-gray-500 mt-1">Data: 27/03/2026</p>
                <p className="text-xs text-gray-500">Tipo: Produto</p>
              </div>
            </div>

            {/* Header Text */}
            {template.headerText && (
              <p className="text-xs text-gray-600 mb-4">{template.headerText}</p>
            )}

            {/* Client */}
            <h4
              className="text-xs font-bold mb-2 pb-1"
              style={{ color: template.primaryColor, borderBottom: '1px solid #e5e5e5' }}
            >
              DADOS DO CLIENTE
            </h4>
            <div className="text-xs mb-4 space-y-1">
              <p><strong>Nome:</strong> Cliente Exemplo da Silva</p>
              <p><strong>Telefone:</strong> (11) 99999-9999</p>
            </div>

            {/* Items Table */}
            <h4
              className="text-xs font-bold mb-2 pb-1"
              style={{ color: template.primaryColor, borderBottom: '1px solid #e5e5e5' }}
            >
              MATERIAIS E ITENS
            </h4>
            <div className="mb-4">
              <div
                className="flex text-xs text-white p-2 rounded-sm font-bold"
                style={{ backgroundColor: template.secondaryColor }}
              >
                <span className="flex-[3]">Descricao</span>
                <span className="flex-1 text-center">Qtd</span>
                <span className="flex-1 text-right">Unitario</span>
                <span className="flex-1 text-right">Total</span>
              </div>
              <div className="flex text-xs p-2 border-b border-gray-100">
                <span className="flex-[3]">Tubo metalico 50x30mm</span>
                <span className="flex-1 text-center">20</span>
                <span className="flex-1 text-right">R$ 45,00</span>
                <span className="flex-1 text-right">R$ 900,00</span>
              </div>
              <div className="flex text-xs p-2 bg-gray-50 border-b border-gray-100">
                <span className="flex-[3]">Telha galvanizada</span>
                <span className="flex-1 text-center">15</span>
                <span className="flex-1 text-right">R$ 120,00</span>
                <span className="flex-1 text-right">R$ 1.800,00</span>
              </div>
            </div>

            {/* Summary */}
            <div
              className="p-3 rounded mb-4"
              style={{ backgroundColor: `${template.primaryColor}15`, border: `1px solid ${template.primaryColor}` }}
            >
              <h4 className="text-xs font-bold mb-2" style={{ color: template.primaryColor }}>
                RESUMO FINANCEIRO
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Materiais:</span><strong>R$ 2.700,00</strong></div>
                <div className="flex justify-between"><span>Mao de Obra:</span><strong>R$ 1.500,00</strong></div>
                <div className="flex justify-between"><span>Custo Base:</span><strong>R$ 4.200,00</strong></div>
                <div
                  className="flex justify-between pt-2 mt-2 text-sm"
                  style={{ borderTop: `1.5px solid ${template.primaryColor}` }}
                >
                  <strong>VALOR TOTAL:</strong>
                  <strong style={{ color: template.primaryColor }}>R$ 6.048,00</strong>
                </div>
              </div>
            </div>

            {/* Terms */}
            {template.termsText && (
              <div className="p-3 bg-gray-50 rounded mb-3 border border-gray-200">
                <h4 className="text-xs font-bold mb-1" style={{ color: template.primaryColor }}>
                  TERMOS E CONDICOES
                </h4>
                <p className="text-xs text-gray-600 whitespace-pre-line">{template.termsText}</p>
              </div>
            )}

            {/* Warranty */}
            {template.warrantyText && (
              <div className="p-3 bg-gray-50 rounded mb-3 border border-gray-200">
                <h4 className="text-xs font-bold mb-1" style={{ color: template.primaryColor }}>
                  GARANTIA
                </h4>
                <p className="text-xs text-gray-600 whitespace-pre-line">{template.warrantyText}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-400 pt-3 mt-4 border-t border-gray-200">
              {template.companyName} — {template.footerText} — Validade: {template.validityDays} dias
            </div>
          </div>
        </div>
      )}

      {/* Financeiro Tab — 3 listas configuraveis */}
      {activeTab === 'financeiro' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
              Opcoes de Lancamento Financeiro
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Cadastre os bancos, categorias e agrupadores que vao aparecer nos selects do Financeiro.
            </p>
          </div>

          {finError && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-sm">
              {finError}
              <button onClick={() => setFinError('')} className="ml-3 text-red-400 hover:text-red-300">x</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {([
              { type: 'BANK', label: 'Bancos', help: 'Ex: Itau PJ, Bradesco, Sicoob, Caixa dinheiro' },
              { type: 'CATEGORY', label: 'Categorias', help: 'Ex: Material, Combustivel, Almoco, Energia' },
              { type: 'GROUP', label: 'Agrupadores', help: 'Ex: Obra Joao, Obra Maria, Despesas fixas' },
            ] as const).map((cfg) => {
              const items = finOptions.filter((o) => o.type === cfg.type)
              return (
                <div key={cfg.type} className="card">
                  <h4 className="text-sm font-bold text-gray-100 mb-1">{cfg.label}</h4>
                  <p className="text-xs text-gray-500 mb-3">{cfg.help}</p>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newFinName[cfg.type] || ''}
                      onChange={(e) => setNewFinName({ ...newFinName, [cfg.type]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') addFinOption(cfg.type) }}
                      placeholder={`Novo ${cfg.label.toLowerCase().slice(0, -1)}`}
                      className="input-field flex-1 text-sm"
                      maxLength={80}
                    />
                    <button
                      onClick={() => addFinOption(cfg.type)}
                      disabled={!newFinName[cfg.type]?.trim()}
                      className="btn-primary text-sm px-3 py-2 disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {finLoading ? (
                    <p className="text-xs text-gray-500 text-center py-4">Carregando...</p>
                  ) : items.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Nenhum cadastrado ainda.</p>
                  ) : (
                    <ul className="space-y-1 max-h-80 overflow-y-auto">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-grafite-800 ${
                            !item.active ? 'opacity-50' : ''
                          }`}
                        >
                          {editingFinId === item.id ? (
                            <>
                              <input
                                type="text"
                                value={editingFinName}
                                onChange={(e) => setEditingFinName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateFinOption(item.id, { name: editingFinName })
                                    setEditingFinId(null)
                                  }
                                  if (e.key === 'Escape') setEditingFinId(null)
                                }}
                                className="input-field flex-1 text-sm py-1"
                                autoFocus
                              />
                              <button
                                onClick={() => { updateFinOption(item.id, { name: editingFinName }); setEditingFinId(null) }}
                                className="text-green-400 hover:text-green-300 p-1"
                                title="Salvar"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingFinId(null)}
                                className="text-gray-400 hover:text-gray-300 p-1"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-gray-200 truncate">{item.name}</span>
                              <button
                                onClick={() => updateFinOption(item.id, { active: !item.active })}
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  item.active
                                    ? 'bg-green-900/50 text-green-400'
                                    : 'bg-gray-700 text-gray-400'
                                }`}
                                title="Ativar/desativar"
                              >
                                {item.active ? 'Ativo' : 'Inativo'}
                              </button>
                              <button
                                onClick={() => { setEditingFinId(item.id); setEditingFinName(item.name) }}
                                className="text-amarelo hover:text-amarelo-light p-1"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteFinOption(item.id)}
                                className="text-red-500 hover:text-red-400 p-1"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Configurador Tab — Monte o seu */}
      {activeTab === 'configurador' && (
        <div className="space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                Configurador "Monte o seu"
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Cadastre categorias (cobertura, revestimento, piso, opcionais...) e dentro de cada uma as opcoes disponiveis com preco e tempo.
                No orcamento o usuario vai marcar as opcoes e o preco + dias serao somados automaticamente.
              </p>
            </div>
            <button
              onClick={runConfiguratorSeed}
              disabled={seeding}
              className="btn-secondary text-sm px-3 py-2 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              title="Popula com 6 categorias e ~37 opcoes tipicas de chale"
            >
              {seeding ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Populando...</>
              ) : (
                <>✨ Popular com dados de exemplo</>
              )}
            </button>
          </div>

          {seedResult && (
            <div className="bg-green-900/40 border border-green-700 text-green-200 px-4 py-2 rounded-lg text-sm">
              {seedResult}
            </div>
          )}

          {configError && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-sm">
              {configError}
              <button onClick={() => setConfigError('')} className="ml-3 text-red-400 hover:text-red-300">x</button>
            </div>
          )}

          {/* Add Category */}
          <div className="card">
            <h4 className="text-sm font-semibold text-gray-200 mb-3">Nova Categoria</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory() }}
                placeholder="Ex: Cobertura, Revestimento, Piso, Opcionais"
                className="input-field flex-1 text-sm"
                maxLength={80}
              />
              <select
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value as 'SINGLE' | 'MULTIPLE')}
                className="select-field text-sm"
              >
                <option value="SINGLE">Escolha unica</option>
                <option value="MULTIPLE">Multipla selecao</option>
              </select>
              <button
                onClick={addCategory}
                disabled={!newCategoryName.trim()}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-40 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Criar
              </button>
            </div>
          </div>

          {/* Categories List */}
          {configLoading ? (
            <p className="text-sm text-gray-500 text-center py-8">Carregando...</p>
          ) : configCategories.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm text-gray-500">Nenhuma categoria cadastrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {configCategories.map((cat) => {
                const isExpanded = expandedCatId === cat.id
                const typeLabel = cat.selectionType === 'SINGLE' ? 'Escolha unica' : 'Multipla selecao'
                return (
                  <div key={cat.id} className="card">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-gray-100">{cat.name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-grafite-700 text-gray-300">
                            {typeLabel}
                          </span>
                          {!cat.active && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                              Inativa
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {cat.options.length} {cat.options.length === 1 ? 'opcao' : 'opcoes'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCategory(cat.id, { selectionType: cat.selectionType === 'SINGLE' ? 'MULTIPLE' : 'SINGLE' })}
                          className="text-xs btn-secondary px-2 py-1"
                          title="Alternar tipo de selecao"
                        >
                          Alternar tipo
                        </button>
                        <button
                          onClick={() => updateCategory(cat.id, { active: !cat.active })}
                          className={`text-xs px-2 py-1 rounded ${cat.active ? 'bg-green-900/40 text-green-300' : 'bg-gray-700 text-gray-400'}`}
                        >
                          {cat.active ? 'Ativa' : 'Inativa'}
                        </button>
                        <button
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          {isExpanded ? 'Fechar' : 'Opcoes'}
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="text-red-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-grafite-700 pt-4">
                        {/* Add option */}
                        <div className="bg-grafite-800 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-2">Nova opcao</p>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <input
                              type="text"
                              placeholder="Nome da opcao"
                              value={newOption[cat.id]?.name || ''}
                              onChange={(e) =>
                                setNewOption((prev) => ({
                                  ...prev,
                                  [cat.id]: { ...(prev[cat.id] || { unitPrice: 0, tempoDias: 0 }), name: e.target.value },
                                }))
                              }
                              className="input-field text-sm sm:col-span-2"
                            />
                            <input
                              type="number"
                              placeholder="Preco (R$)"
                              step="0.01"
                              min="0"
                              value={newOption[cat.id]?.unitPrice || ''}
                              onChange={(e) =>
                                setNewOption((prev) => ({
                                  ...prev,
                                  [cat.id]: { ...(prev[cat.id] || { name: '', tempoDias: 0 }), unitPrice: parseFloat(e.target.value) || 0 },
                                }))
                              }
                              className="input-field text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Dias"
                              step="0.5"
                              min="0"
                              value={newOption[cat.id]?.tempoDias || ''}
                              onChange={(e) =>
                                setNewOption((prev) => ({
                                  ...prev,
                                  [cat.id]: { ...(prev[cat.id] || { name: '', unitPrice: 0 }), tempoDias: parseFloat(e.target.value) || 0 },
                                }))
                              }
                              className="input-field text-sm"
                            />
                          </div>
                          <button
                            onClick={() => addOption(cat.id)}
                            disabled={!newOption[cat.id]?.name?.trim()}
                            className="btn-primary text-xs mt-2 disabled:opacity-40 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar opcao
                          </button>
                        </div>

                        {/* Options list */}
                        {cat.options.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">Nenhuma opcao cadastrada.</p>
                        ) : (
                          <ul className="space-y-2">
                            {cat.options.map((opt) => (
                              <li
                                key={opt.id}
                                className={`bg-grafite-800 rounded-lg p-3 ${!opt.active ? 'opacity-50' : ''}`}
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                                  <input
                                    type="text"
                                    value={opt.name}
                                    onChange={(e) => {
                                      setConfigCategories((prev) =>
                                        prev.map((c) =>
                                          c.id !== cat.id ? c : {
                                            ...c,
                                            options: c.options.map((o) => o.id === opt.id ? { ...o, name: e.target.value } : o),
                                          }
                                        )
                                      )
                                    }}
                                    onBlur={() => updateOption(opt.id, { name: opt.name })}
                                    className="input-field text-sm sm:col-span-2"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={opt.unitPrice}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      setConfigCategories((prev) =>
                                        prev.map((c) =>
                                          c.id !== cat.id ? c : {
                                            ...c,
                                            options: c.options.map((o) => o.id === opt.id ? { ...o, unitPrice: val } : o),
                                          }
                                        )
                                      )
                                    }}
                                    onBlur={() => updateOption(opt.id, { unitPrice: opt.unitPrice })}
                                    className="input-field text-sm"
                                  />
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={opt.tempoDias}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      setConfigCategories((prev) =>
                                        prev.map((c) =>
                                          c.id !== cat.id ? c : {
                                            ...c,
                                            options: c.options.map((o) => o.id === opt.id ? { ...o, tempoDias: val } : o),
                                          }
                                        )
                                      )
                                    }}
                                    onBlur={() => updateOption(opt.id, { tempoDias: opt.tempoDias })}
                                    className="input-field text-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-2 mt-2 justify-end">
                                  <button
                                    onClick={() => updateOption(opt.id, { active: !opt.active })}
                                    className={`text-xs px-2 py-0.5 rounded ${opt.active ? 'bg-green-900/40 text-green-300' : 'bg-gray-700 text-gray-400'}`}
                                  >
                                    {opt.active ? 'Ativa' : 'Inativa'}
                                  </button>
                                  <button
                                    onClick={() => deleteOption(opt.id)}
                                    className="text-red-500 hover:text-red-400 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Changelog Tab */}
      {activeTab === 'changelog' && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                O que ha de novo
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Veja tudo que foi adicionado e melhorado no sistema
              </p>
            </div>
            {changelog && (
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {changelog.totalCommits} {changelog.totalCommits === 1 ? 'atualizacao' : 'atualizacoes'}
                </p>
                {changelog.lastUpdate && (
                  <p className="text-xs text-gray-500">
                    Ultima: {formatDate(changelog.lastUpdate)}
                  </p>
                )}
              </div>
            )}
          </div>

          {changelogLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amarelo mr-3" />
              <span className="text-sm text-gray-400">Carregando historico...</span>
            </div>
          )}

          {changelogError && (
            <div className="flex items-center gap-3 p-4 bg-red-400/10 border border-red-400/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-400">{changelogError}</p>
                <button
                  onClick={() => { setChangelog(null); fetchChangelog() }}
                  className="text-xs text-red-300 underline mt-1"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {changelog && !changelogLoading && (
            <div className="space-y-3">
              {changelog.groups.map((group) => {
                const IconComp = CHANGELOG_ICONS[group.icon] || GitCommit
                const colorClass = CHANGELOG_COLORS[group.type] || CHANGELOG_COLORS.other
                const isExpanded = expandedGroups[group.type] || false

                return (
                  <div key={group.type} className="border border-grafite-700 rounded-lg overflow-hidden">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.type)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-grafite-800 hover:bg-grafite-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorClass}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-semibold text-gray-200">{group.label}</span>
                          <span className="text-xs text-gray-500 ml-2">({group.items.length})</span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {/* Group Items */}
                    {isExpanded && (
                      <div className="divide-y divide-grafite-700/50">
                        {group.items.map((item, idx) => {
                          const itemKey = `${group.type}-${idx}`
                          const isItemExpanded = expandedItems[itemKey] || false
                          const hasDescription = item.description && item.description.length > 0

                          return (
                            <div key={itemKey} className="bg-grafite-900/50">
                              <button
                                onClick={() => hasDescription && toggleItem(itemKey)}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left ${
                                  hasDescription ? 'hover:bg-grafite-800/50 cursor-pointer' : 'cursor-default'
                                } transition-colors`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-200">{item.message}</span>
                                    {hasDescription && (
                                      <ChevronDown
                                        className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${
                                          isItemExpanded ? 'rotate-180' : ''
                                        }`}
                                      />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-500 mt-1 block">
                                    {formatDate(item.date)}
                                  </span>
                                </div>
                              </button>

                              {/* Expanded Description */}
                              {isItemExpanded && hasDescription && (
                                <div className="px-4 pb-3">
                                  <div className="ml-0 p-3 bg-grafite-800 rounded-lg border border-grafite-700">
                                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                                      {item.description}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {changelog.groups.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma atualizacao encontrada</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
