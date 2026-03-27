'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { formatCurrency } from '@/lib/calculations'

interface Material {
  id: string
  name: string
  unit: string
  currentPrice: number
  stock: number
  minStock: number
  category: string
}

interface InvoiceItem {
  id: string
  invoiceId: string
  materialId: string | null
  description: string
  quantity: number
  unitPrice: number
  material?: Material | null
}

interface Invoice {
  id: string
  supplierName: string
  supplierCnpj: string
  number: string
  totalAmount: number
  xmlData: string
  importDate: string
  items: InvoiceItem[]
}

interface NFMatch {
  description: string
  quantity: number
  unitPrice: number
  matchedMaterialId: string | null
  matchedMaterialName: string | null
  matchScore: number
}

interface ImportResult {
  invoice: Invoice
  matches: NFMatch[]
}

const CATEGORIES = [
  'Aco',
  'Aluminio',
  'Parafusos',
  'Soldas',
  'Tintas',
  'Ferramentas',
  'EPI',
  'Outros',
]

const UNITS = ['UN', 'KG', 'M', 'M2', 'M3', 'L', 'PC', 'CX', 'RL']

const emptyMaterial: Omit<Material, 'id'> = {
  name: '',
  unit: 'UN',
  currentPrice: 0,
  stock: 0,
  minStock: 0,
  category: '',
}

export default function SuprimentosPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Material modal
  const [showModal, setShowModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [formData, setFormData] = useState(emptyMaterial)
  const [saving, setSaving] = useState(false)

  // NF Import
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [matRes, invRes] = await Promise.all([
        fetch('/api/materials'),
        fetch('/api/invoices/import'),
      ])
      if (!matRes.ok) throw new Error('Erro ao carregar materiais')
      if (!invRes.ok) throw new Error('Erro ao carregar notas fiscais')
      setMaterials(await matRes.json())
      setInvoices(await invRes.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Stats
  const totalItems = materials.reduce((s, m) => s + m.stock, 0)
  const totalValue = materials.reduce((s, m) => s + m.stock * m.currentPrice, 0)
  const totalNFs = invoices.length

  // Import NF
  const handleImportXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError('')
    try {
      const xml = await file.text()
      const res = await fetch('/api/invoices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xml }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao importar NF')
      setImportResult(data)
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Material CRUD
  const openAddModal = () => {
    setEditingMaterial(null)
    setFormData({ ...emptyMaterial })
    setShowModal(true)
  }

  const openEditModal = (mat: Material) => {
    setEditingMaterial(mat)
    setFormData({
      name: mat.name,
      unit: mat.unit,
      currentPrice: mat.currentPrice,
      stock: mat.stock,
      minStock: mat.minStock,
      category: mat.category,
    })
    setShowModal(true)
  }

  const saveMaterial = async () => {
    setSaving(true)
    setError('')
    try {
      const method = editingMaterial ? 'PUT' : 'POST'
      const body = editingMaterial
        ? { id: editingMaterial.id, ...formData }
        : formData
      const res = await fetch('/api/materials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar material')
      }
      setShowModal(false)
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteMaterial = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return
    setError('')
    try {
      const res = await fetch(`/api/materials?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir material')
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-100">
          Suprimentos & Estoque
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml"
            onChange={handleImportXml}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {importing ? 'Importando...' : 'Importar NF (XML)'}
          </button>
          <button onClick={openAddModal} className="btn-primary flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Material
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="ml-4 p-2 text-red-400 hover:text-red-300">x</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Total de Itens em Estoque</p>
          <p className="text-2xl font-bold text-amarelo mt-1">
            {totalItems.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="card-highlight">
          <p className="text-sm text-gray-400">Valor Total do Estoque</p>
          <p className="text-2xl font-bold text-amarelo mt-1">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="card-highlight">
          <p className="text-sm text-gray-400">NFs Importadas</p>
          <p className="text-2xl font-bold text-amarelo mt-1">{totalNFs}</p>
        </div>
      </div>

      {/* Import Result Preview */}
      {importResult && (
        <div className="card border-green-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-green-400">
              NF Importada com Sucesso
            </h2>
            <button
              onClick={() => setImportResult(null)}
              className="p-2 text-gray-400 hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-400">Fornecedor:</span>{' '}
              <span className="text-gray-200">{importResult.invoice.supplierName}</span>
            </div>
            <div>
              <span className="text-gray-400">Numero:</span>{' '}
              <span className="text-gray-200">{importResult.invoice.number}</span>
            </div>
            <div>
              <span className="text-gray-400">Total:</span>{' '}
              <span className="text-gray-200">{formatCurrency(importResult.invoice.totalAmount)}</span>
            </div>
          </div>
          {/* Import results table - desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-2 text-left">Descricao NF</th>
                  <th className="px-4 py-2 text-right">Qtd</th>
                  <th className="px-4 py-2 text-right">Preco Unit.</th>
                  <th className="px-4 py-2 text-left">Material Vinculado</th>
                  <th className="px-4 py-2 text-center">Match</th>
                </tr>
              </thead>
              <tbody>
                {importResult.matches.map((match, idx) => (
                  <tr key={idx} className="table-row">
                    <td className="px-4 py-2">{match.description}</td>
                    <td className="px-4 py-2 text-right">{match.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(match.unitPrice)}</td>
                    <td className="px-4 py-2">
                      {match.matchedMaterialName ? (
                        <span className="text-green-400">{match.matchedMaterialName}</span>
                      ) : (
                        <span className="text-gray-500 italic">Nenhum vinculo</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {match.matchScore > 0 ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          match.matchScore >= 0.8
                            ? 'bg-green-900 text-green-300'
                            : match.matchScore >= 0.5
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {Math.round(match.matchScore * 100)}%
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Import results cards - mobile */}
          <div className="md:hidden space-y-3">
            {importResult.matches.map((match, idx) => (
              <div key={idx} className="bg-grafite-800 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-200 text-sm">{match.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Qtd: <span className="text-gray-200">{match.quantity}</span></span>
                  <span className="text-gray-400">Preco: <span className="text-gray-200">{formatCurrency(match.unitPrice)}</span></span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-400">Vinculo: </span>
                    {match.matchedMaterialName ? (
                      <span className="text-green-400">{match.matchedMaterialName}</span>
                    ) : (
                      <span className="text-gray-500 italic">Nenhum</span>
                    )}
                  </div>
                  {match.matchScore > 0 ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      match.matchScore >= 0.8
                        ? 'bg-green-900 text-green-300'
                        : match.matchScore >= 0.5
                        ? 'bg-yellow-900 text-yellow-300'
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {Math.round(match.matchScore * 100)}%
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Materiais</h2>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-center">Unidade</th>
                <th className="px-4 py-3 text-right">Preco Atual</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Estoque Min.</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhum material cadastrado.
                  </td>
                </tr>
              ) : (
                materials.map((mat) => {
                  const lowStock = mat.stock < mat.minStock
                  return (
                    <tr
                      key={mat.id}
                      className={`table-row ${
                        lowStock ? 'bg-red-900/20 border-l-2 border-l-laranja' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">
                        {mat.name}
                        {lowStock && (
                          <span className="ml-2 text-xs bg-laranja/20 text-laranja-light px-2 py-0.5 rounded-full">
                            Estoque Baixo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400">{mat.unit}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(mat.currentPrice)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${lowStock ? 'text-laranja-light' : 'text-gray-200'}`}>
                        {mat.stock}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">{mat.minStock}</td>
                      <td className="px-4 py-3 text-gray-400">{mat.category}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(mat)}
                            className="p-2 text-amarelo hover:text-amarelo-light transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteMaterial(mat.id)}
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {materials.length === 0 ? (
            <p className="py-8 text-center text-gray-500">Nenhum material cadastrado.</p>
          ) : (
            materials.map((mat) => {
              const lowStock = mat.stock < mat.minStock
              return (
                <div
                  key={mat.id}
                  className={`bg-grafite-800 rounded-lg p-4 space-y-3 ${
                    lowStock ? 'border-l-2 border-l-laranja bg-red-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-200">{mat.name}</p>
                      <span className="text-xs bg-grafite-700 text-gray-400 px-2 py-0.5 rounded-full">
                        {mat.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(mat)}
                        className="p-2 text-amarelo hover:text-amarelo-light transition-colors"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteMaterial(mat.id)}
                        className="p-2 text-red-500 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">Unidade</span>
                      <p className="text-gray-300">{mat.unit}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Preco</span>
                      <p className="text-gray-300">{formatCurrency(mat.currentPrice)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Estoque</span>
                      <p className={`font-medium ${lowStock ? 'text-laranja-light' : 'text-gray-200'}`}>
                        {mat.stock}
                        {lowStock && (
                          <span className="ml-1 text-xs bg-laranja/20 text-laranja-light px-1.5 py-0.5 rounded-full">
                            Baixo
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Invoices History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">
          Historico de Notas Fiscais
        </h2>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Fornecedor</th>
                <th className="px-4 py-3 text-center">Numero</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Itens</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma nota fiscal importada.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="table-row">
                    <td className="px-4 py-3">
                      {new Date(inv.importDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-medium">{inv.supplierName}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{inv.number}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-grafite-700 px-2 py-0.5 rounded-full text-xs">
                        {inv.items.length}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {invoices.length === 0 ? (
            <p className="py-8 text-center text-gray-500">Nenhuma nota fiscal importada.</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="bg-grafite-800 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-200">{inv.supplierName}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(inv.importDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">NF: <span className="text-gray-300">{inv.number}</span></span>
                  <span className="font-medium text-gray-200">{formatCurrency(inv.totalAmount)}</span>
                </div>
                <div className="text-sm">
                  <span className="bg-grafite-700 px-2 py-0.5 rounded-full text-xs text-gray-400">
                    {inv.items.length} {inv.items.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Material Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              {editingMaterial ? 'Editar Material' : 'Novo Material'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label-field">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Chapa de Aco 3mm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Unidade</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="select-field w-full"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="select-field w-full"
                  >
                    <option value="">Selecione...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-field">Preco Atual (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Estoque Atual</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Estoque Minimo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary p-2 sm:px-4 sm:py-2"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={saveMaterial}
                className="btn-primary p-2 sm:px-4 sm:py-2"
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
