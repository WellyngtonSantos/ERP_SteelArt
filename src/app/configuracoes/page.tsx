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
  const [activeTab, setActiveTab] = useState<'identity' | 'colors' | 'texts' | 'preview' | 'changelog'>('identity')
  const [changelog, setChangelog] = useState<ChangelogData | null>(null)
  const [changelogLoading, setChangelogLoading] = useState(false)
  const [changelogError, setChangelogError] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const { refreshTheme } = useTheme()

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
  }, [activeTab, fetchChangelog])

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
