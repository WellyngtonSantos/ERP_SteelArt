'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  X,
  Trash2,
  Search,
  Edit3,
  Image as ImageIcon,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/calculations'

interface MaterialItem {
  description: string
  quantity: number
  unitPrice: number
}

interface Product {
  id: string
  name: string
  description?: string
  materialsJson: string
  ironCost: number
  paintCost: number
  defaultMargin: number
  images?: string
  createdAt: string
}

interface ProductForm {
  id?: string
  name: string
  description: string
  materials: MaterialItem[]
  ironCost: number
  paintCost: number
  defaultMargin: number
  existingImages: string[]
  newImages: File[]
}

const emptyForm = (): ProductForm => ({
  name: '',
  description: '',
  materials: [{ description: '', quantity: 1, unitPrice: 0 }],
  ironCost: 0,
  paintCost: 0,
  defaultMargin: 20,
  existingImages: [],
  newImages: [],
})

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [previewImages, setPreviewImages] = useState<string[]>([])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      if (res.ok) setProducts(await res.json())
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const openNew = () => {
    setForm(emptyForm())
    setPreviewImages([])
    setShowForm(true)
  }

  const openEdit = (product: Product) => {
    const materials: MaterialItem[] = JSON.parse(product.materialsJson || '[]')
    const existingImages = product.images ? product.images.split('|||').filter(Boolean) : []
    setForm({
      id: product.id,
      name: product.name,
      description: product.description || '',
      materials: materials.length > 0 ? materials : [{ description: '', quantity: 1, unitPrice: 0 }],
      ironCost: product.ironCost,
      paintCost: product.paintCost,
      defaultMargin: product.defaultMargin,
      existingImages,
      newImages: [],
    })
    setPreviewImages(existingImages)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const formData = new FormData()
    if (form.id) formData.append('id', form.id)
    formData.append('name', form.name)
    formData.append('description', form.description)
    formData.append('materialsJson', JSON.stringify(form.materials.filter((m) => m.description.trim())))
    formData.append('ironCost', String(form.ironCost))
    formData.append('paintCost', String(form.paintCost))
    formData.append('defaultMargin', String(form.defaultMargin))
    formData.append('existingImages', form.existingImages.join('|||'))

    for (const file of form.newImages) {
      formData.append('images', file)
    }

    try {
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch('/api/products', { method, body: formData })
      if (res.ok) {
        setShowForm(false)
        fetchProducts()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao salvar produto')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro de conexao')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return
    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) fetchProducts()
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setForm((prev) => ({ ...prev, newImages: [...prev.newImages, ...files] }))

    // Generate previews for new files
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPreviewImages((prev) => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    const existingCount = form.existingImages.length
    if (index < existingCount) {
      // Remove existing image
      setForm((prev) => ({
        ...prev,
        existingImages: prev.existingImages.filter((_, i) => i !== index),
      }))
    } else {
      // Remove new image
      const newIndex = index - existingCount
      setForm((prev) => ({
        ...prev,
        newImages: prev.newImages.filter((_, i) => i !== newIndex),
      }))
    }
    setPreviewImages((prev) => prev.filter((_, i) => i !== index))
  }

  const totalCost = useMemo(() => {
    const materialsCost = form.materials.reduce(
      (sum, m) => sum + m.quantity * m.unitPrice,
      0
    )
    return materialsCost + form.ironCost + form.paintCost
  }, [form.materials, form.ironCost, form.paintCost])

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [products, searchTerm])

  const getProductCost = (product: Product) => {
    const materials: MaterialItem[] = JSON.parse(product.materialsJson || '[]')
    const materialsCost = materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0)
    return materialsCost + product.ironCost + product.paintCost
  }

  const getProductImages = (product: Product) => {
    return product.images ? product.images.split('|||').filter(Boolean) : []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Catalogo de Produtos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Cadastre chales e produtos padrao com materiais e custos
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Buscar por nome ou descricao..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amarelo/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amarelo" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Produtos</p>
              <p className="text-xl font-bold text-gray-100">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Com Imagem</p>
              <p className="text-xl font-bold text-gray-100">
                {products.filter((p) => p.images).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Custo Medio</p>
              <p className="text-xl font-bold text-gray-100">
                {products.length > 0
                  ? formatCurrency(
                      products.reduce((sum, p) => sum + getProductCost(p), 0) / products.length
                    )
                  : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Carregando produtos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 text-grafite-600 mx-auto" />
          <p className="text-gray-400 mt-4">Nenhum produto cadastrado</p>
          <button onClick={openNew} className="btn-primary mt-4">
            Cadastrar Primeiro Produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const images = getProductImages(product)
            const materials: MaterialItem[] = JSON.parse(product.materialsJson || '[]')
            const cost = getProductCost(product)
            return (
              <div
                key={product.id}
                className="card hover:border-amarelo/30 transition-colors group"
              >
                {/* Image */}
                <div className="relative h-40 -mx-6 -mt-6 mb-4 bg-grafite-800 rounded-t-xl overflow-hidden">
                  {images.length > 0 ? (
                    <img
                      src={images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-12 h-12 text-grafite-600" />
                    </div>
                  )}
                  {images.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      +{images.length - 1} fotos
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-100 text-lg">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Materials count & cost */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">
                      {materials.length} {materials.length === 1 ? 'material' : 'materiais'}
                    </span>
                    <span className="text-gray-400">Margem: {product.defaultMargin}%</span>
                  </div>

                  {/* Cost breakdown mini */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {product.ironCost > 0 && (
                      <div className="bg-grafite-800 rounded p-2">
                        <span className="text-gray-500 block">Ferro</span>
                        <span className="text-gray-200 font-medium">{formatCurrency(product.ironCost)}</span>
                      </div>
                    )}
                    {product.paintCost > 0 && (
                      <div className="bg-grafite-800 rounded p-2">
                        <span className="text-gray-500 block">Pintura</span>
                        <span className="text-gray-200 font-medium">{formatCurrency(product.paintCost)}</span>
                      </div>
                    )}
                    <div className="bg-grafite-800 rounded p-2">
                      <span className="text-gray-500 block">Materiais</span>
                      <span className="text-gray-200 font-medium">
                        {formatCurrency(materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0))}
                      </span>
                    </div>
                  </div>

                  {/* Total & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-grafite-700">
                    <div>
                      <span className="text-xs text-gray-500">Custo Total</span>
                      <p className="text-lg font-bold text-amarelo">{formatCurrency(cost)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(product)}
                        className="btn-secondary text-sm flex items-center gap-1 px-3 py-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto w-full max-w-3xl bg-grafite-900 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-grafite-700 bg-grafite-800 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-100">
                {form.id ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Informacoes Basicas</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label-field">Nome do Produto *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Chale Padrao 3x4m"
                    />
                  </div>
                  <div>
                    <label className="label-field">Descricao</label>
                    <textarea
                      className="input-field min-h-[80px] resize-y"
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Descricao do produto, dimensoes, especificacoes..."
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Imagens</h3>
                <div className="grid grid-cols-4 gap-3">
                  {previewImages.map((src, index) => (
                    <div key={index} className="relative h-24 bg-grafite-800 rounded-lg overflow-hidden group">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="h-24 flex flex-col items-center justify-center bg-grafite-800 border-2 border-dashed border-grafite-600 rounded-lg cursor-pointer hover:border-amarelo/50 transition-colors">
                    <ImageIcon className="w-6 h-6 text-gray-500" />
                    <span className="text-xs text-gray-500 mt-1">Adicionar</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageAdd}
                    />
                  </label>
                </div>
              </div>

              {/* Base Costs */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Custos Base</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label-field">Custo de Ferro (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                      <input
                        type="number"
                        className="input-field pl-10"
                        value={form.ironCost || ''}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, ironCost: parseFloat(e.target.value) || 0 }))
                        }
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
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, paintCost: parseFloat(e.target.value) || 0 }))
                        }
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">Margem de Lucro Padrao (%)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={form.defaultMargin}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, defaultMargin: parseFloat(e.target.value) || 0 }))
                      }
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Materiais</h3>
                <div className="space-y-2">
                  {form.materials.map((mat, index) => (
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
                            value={mat.description}
                            onChange={(e) => {
                              const newMats = [...form.materials]
                              newMats[index] = { ...newMats[index], description: e.target.value }
                              setForm((prev) => ({ ...prev, materials: newMats }))
                            }}
                            placeholder="Ex: Tubo metalico 50x30mm"
                          />
                        </div>
                        <div>
                          <label className="label-field">Qtd</label>
                          <input
                            type="number"
                            className="input-field text-sm"
                            value={mat.quantity || ''}
                            onChange={(e) => {
                              const newMats = [...form.materials]
                              newMats[index] = { ...newMats[index], quantity: parseFloat(e.target.value) || 0 }
                              setForm((prev) => ({ ...prev, materials: newMats }))
                            }}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="label-field">Preco Unit. (R$)</label>
                          <input
                            type="number"
                            className="input-field text-sm"
                            value={mat.unitPrice || ''}
                            onChange={(e) => {
                              const newMats = [...form.materials]
                              newMats[index] = { ...newMats[index], unitPrice: parseFloat(e.target.value) || 0 }
                              setForm((prev) => ({ ...prev, materials: newMats }))
                            }}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="pt-6">
                        <span className="text-sm text-amarelo font-medium whitespace-nowrap">
                          {formatCurrency(mat.quantity * mat.unitPrice)}
                        </span>
                      </div>
                      {form.materials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              materials: prev.materials.filter((_, i) => i !== index),
                            }))
                          }}
                          className="pt-6 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        materials: [...prev.materials, { description: '', quantity: 1, unitPrice: 0 }],
                      }))
                    }
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Material
                  </button>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="bg-grafite-800 border border-amarelo/30 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amarelo uppercase tracking-wider mb-3">
                  Resumo de Custos
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ferro:</span>
                    <span className="text-gray-200 font-medium">{formatCurrency(form.ironCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pintura:</span>
                    <span className="text-gray-200 font-medium">{formatCurrency(form.paintCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Materiais:</span>
                    <span className="text-gray-200 font-medium">
                      {formatCurrency(form.materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-grafite-600">
                    <span className="text-gray-200 font-bold">Custo Total:</span>
                    <span className="text-amarelo font-bold text-lg">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-grafite-700 bg-grafite-800 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                {form.id ? 'Salvar Alteracoes' : 'Cadastrar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
