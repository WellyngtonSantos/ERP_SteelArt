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
} from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'identity' | 'colors' | 'texts' | 'preview'>('identity')

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

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

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
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Template do Orcamento</h1>
          <p className="text-sm text-gray-400 mt-1">
            Personalize a aparencia dos PDFs de orcamento
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
            Cores do PDF
          </h3>

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
    </div>
  )
}
