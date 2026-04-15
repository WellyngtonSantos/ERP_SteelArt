'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  X,
  Search,
  Building2,
  Loader2,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Users,
} from 'lucide-react'

type PersonType = 'PESSOA_FISICA' | 'PESSOA_JURIDICA'

interface Client {
  id: string
  name: string
  personType: PersonType
  cnpj: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  active: boolean
  createdAt: string
  _count: { budgets: number }
}

interface ClientForm {
  id?: string
  name: string
  personType: PersonType
  cnpj: string
  phone: string
  email: string
  address: string
  notes: string
}

const emptyForm = (): ClientForm => ({
  name: '',
  personType: 'PESSOA_JURIDICA',
  cnpj: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
})

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

const formatDocument = (value: string, pt: PersonType) =>
  pt === 'PESSOA_FISICA' ? formatCpf(value) : formatCnpj(value)

const formatCnpjDisplay = (doc: string | null, pt?: PersonType) => {
  if (!doc) return ''
  const d = doc.replace(/\D/g, '')
  if (pt === 'PESSOA_FISICA' && d.length === 11) {
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  }
  if (d.length !== 14) return doc
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ClientForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cnpjError, setCnpjError] = useState('')
  const [cnpjSuccess, setCnpjSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      if (res.ok) setClients(await res.json())
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleCnpjSearch = useCallback(async () => {
    const cnpjClean = form.cnpj.replace(/\D/g, '')
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
        name: data.nomeFantasia || data.razaoSocial || prev.name,
        phone: data.telefone || prev.phone,
        email: data.email ? data.email.toLowerCase() : prev.email,
        address: data.endereco || prev.address,
      }))
      setCnpjSuccess(data.razaoSocial || 'Dados encontrados')
    } catch {
      setCnpjError('Erro de conexao. Tente novamente.')
    } finally {
      setCnpjLoading(false)
    }
  }, [form.cnpj])

  const openNew = () => {
    setForm(emptyForm())
    setCnpjError('')
    setCnpjSuccess('')
    setShowForm(true)
  }

  const openEdit = (client: Client) => {
    setForm({
      id: client.id,
      name: client.name,
      personType: client.personType || 'PESSOA_JURIDICA',
      cnpj: client.cnpj ? formatCnpjDisplay(client.cnpj, client.personType) : '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
    })
    setCnpjError('')
    setCnpjSuccess('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch('/api/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        fetchClients()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao salvar cliente')
      }
    } catch {
      alert('Erro de conexao')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        fetchClients()
      }
    } catch {
      alert('Erro ao excluir')
    }
  }

  const filtered = useMemo(() => {
    if (!searchTerm) return clients
    const term = searchTerm.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.cnpj?.includes(searchTerm.replace(/\D/g, '')) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
    )
  }, [clients, searchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Clientes</h1>
          <p className="text-sm text-gray-400 mt-1">
            Cadastro e gestao de clientes
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Buscar por nome, CNPJ, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Carregando clientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-grafite-600 mx-auto" />
          <p className="text-gray-400 mt-4">
            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </p>
          {!searchTerm && (
            <button onClick={openNew} className="btn-primary mt-4">
              Cadastrar Primeiro Cliente
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">CNPJ</th>
                  <th className="text-left px-4 py-3">Telefone</th>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-center px-4 py-3">Orcamentos</th>
                  <th className="text-right px-4 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-200">{client.name}</div>
                      {client.address && (
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{client.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                      {formatCnpjDisplay(client.cnpj, client.personType) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {client.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {client.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-1 rounded bg-grafite-700 text-gray-300">
                        {client._count.budgets}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(client)}
                          className="p-1.5 text-gray-400 hover:text-amarelo transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === client.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs px-2 py-1 bg-grafite-700 text-gray-300 rounded hover:bg-grafite-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(client.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((client) => (
              <div
                key={client.id}
                className="card cursor-pointer hover:border-amarelo/30 transition-colors"
                onClick={() => openEdit(client)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-200">{client.name}</h3>
                    {client.cnpj && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        {formatCnpjDisplay(client.cnpj, client.personType)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-grafite-700 text-gray-300 ml-2">
                    {client._count.budgets} orc.
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {client.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative bg-grafite-900 border border-grafite-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-grafite-700 bg-grafite-800 rounded-t-xl sticky top-0 z-10">
              <h2 className="text-lg font-bold text-gray-100">
                {form.id ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo de pessoa */}
              <div>
                <label className="label-field">Tipo de Cliente</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PESSOA_JURIDICA', 'PESSOA_FISICA'] as PersonType[]).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, personType: pt, cnpj: '' }))}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        form.personType === pt
                          ? 'border-amarelo bg-amarelo/10 text-amarelo'
                          : 'border-grafite-700 bg-grafite-800 text-gray-400 hover:border-grafite-600'
                      }`}
                    >
                      {pt === 'PESSOA_JURIDICA' ? 'Pessoa Juridica (CNPJ)' : 'Pessoa Fisica (CPF)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Documento (CPF ou CNPJ) */}
              <div>
                <label className="label-field flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {form.personType === 'PESSOA_FISICA' ? 'CPF' : 'CNPJ (auto preenchimento)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="input-field flex-1"
                    value={form.cnpj}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, cnpj: formatDocument(e.target.value, prev.personType) }))
                      setCnpjError('')
                      setCnpjSuccess('')
                    }}
                    placeholder={form.personType === 'PESSOA_FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
                    maxLength={form.personType === 'PESSOA_FISICA' ? 14 : 18}
                  />
                  {form.personType === 'PESSOA_JURIDICA' && (
                    <button
                      type="button"
                      onClick={handleCnpjSearch}
                      disabled={cnpjLoading || form.cnpj.replace(/\D/g, '').length !== 14}
                      className="px-4 py-2 bg-amarelo text-grafite-900 rounded-lg font-semibold text-sm hover:bg-amarelo/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                      {cnpjLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Buscar
                    </button>
                  )}
                </div>
                {cnpjError && <p className="text-red-400 text-xs mt-1">{cnpjError}</p>}
                {cnpjSuccess && (
                  <p className="text-green-400 text-xs mt-1">Dados preenchidos - {cnpjSuccess}</p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="label-field">Nome / Razao Social *</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome completo ou razao social"
                />
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Telefone</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    className="input-field"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="label-field">E-mail</label>
                  <input
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="label-field">Endereco</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Endereco completo"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="label-field">Observacoes</label>
                <textarea
                  className="input-field min-h-[80px] resize-y"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observacoes sobre o cliente..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  {form.id ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
