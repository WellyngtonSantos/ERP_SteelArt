'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  X,
  Edit3,
  UserCog,
  Shield,
  ShieldCheck,
  ShieldOff,
  Eye,
  EyeOff,
  Search,
  Users,
  UserPlus,
  Check,
} from 'lucide-react'

const ALL_PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/produtos', label: 'Produtos' },
  { path: '/comercial', label: 'Comercial' },
  { path: '/producao', label: 'Producao' },
  { path: '/suprimentos', label: 'Suprimentos' },
  { path: '/rh', label: 'RH' },
  { path: '/financeiro', label: 'Financeiro' },
  { path: '/configuracoes', label: 'Configuracoes' },
]

const ROLES = [
  { value: 'ADMIN', label: 'Administrador', description: 'Acesso total ao sistema' },
  { value: 'VENDEDOR', label: 'Vendedor', description: 'Foco em orcamentos e comercial' },
  { value: 'ENGENHEIRO', label: 'Engenheiro', description: 'Producao e projetos' },
  { value: 'OPERADOR', label: 'Operador', description: 'Operacao e producao' },
]

interface User {
  id: string
  name: string
  email: string
  role: string
  allowedPages: string
  active: boolean
  createdAt: string
  _count?: { budgets: number }
}

interface UserForm {
  id?: string
  name: string
  email: string
  password: string
  role: string
  allowedPages: string[]
  active: boolean
}

const emptyForm = (): UserForm => ({
  name: '',
  email: '',
  password: '',
  role: 'VENDEDOR',
  allowedPages: ALL_PAGES.map((p) => p.path),
  active: true,
})

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<UserForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) setUsers(await res.json())
    } catch (error) {
      console.error('Erro ao carregar usuarios:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openNew = () => {
    setForm(emptyForm())
    setShowPassword(false)
    setShowForm(true)
  }

  const openEdit = (user: User) => {
    let pages: string[] = []
    try {
      pages = JSON.parse(user.allowedPages || '[]')
    } catch {
      pages = []
    }

    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      allowedPages: pages.length > 0 ? pages : ALL_PAGES.map((p) => p.path),
      active: user.active,
    })
    setShowPassword(false)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    if (!form.id && !form.password.trim()) return
    setSaving(true)

    const payload: Record<string, any> = {
      name: form.name,
      email: form.email,
      role: form.role,
      allowedPages: form.role === 'ADMIN' ? [] : form.allowedPages,
      active: form.active,
    }
    if (form.id) payload.id = form.id
    if (form.password) payload.password = form.password

    try {
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowForm(false)
        fetchUsers()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao salvar usuario')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro de conexao')
    }
    setSaving(false)
  }

  const toggleActive = async (user: User) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      })
      if (res.ok) fetchUsers()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const togglePage = (pagePath: string) => {
    setForm((prev) => {
      const pages = prev.allowedPages.includes(pagePath)
        ? prev.allowedPages.filter((p) => p !== pagePath)
        : [...prev.allowedPages, pagePath]
      return { ...prev, allowedPages: pages }
    })
  }

  const selectAllPages = () => {
    setForm((prev) => ({ ...prev, allowedPages: ALL_PAGES.map((p) => p.path) }))
  }

  const deselectAllPages = () => {
    setForm((prev) => ({ ...prev, allowedPages: [] }))
  }

  const filteredUsers = users.filter(
    (u) =>
      !searchTerm ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getUserPages = (user: User): string[] => {
    try {
      return JSON.parse(user.allowedPages || '[]')
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Gestao de Usuarios</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie usuarios e controle de acesso as telas
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Novo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amarelo/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-amarelo" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-100">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Ativos</p>
              <p className="text-xl font-bold text-gray-100">{users.filter((u) => u.active).length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <ShieldOff className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Inativos</p>
              <p className="text-xl font-bold text-gray-100">{users.filter((u) => !u.active).length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Admins</p>
              <p className="text-xl font-bold text-gray-100">{users.filter((u) => u.role === 'ADMIN').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Buscar por nome, email ou perfil..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* User List */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Carregando usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-grafite-600 mx-auto" />
          <p className="text-gray-400 mt-4">Nenhum usuario encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const pages = getUserPages(user)
            const isAdmin = user.role === 'ADMIN'
            return (
              <div
                key={user.id}
                className={`card hover:border-amarelo/30 transition-colors ${
                  !user.active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isAdmin ? 'bg-amarelo/20' : 'bg-grafite-700'
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${
                          isAdmin ? 'text-amarelo' : 'text-gray-400'
                        }`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-200 truncate">{user.name}</h3>
                        {!user.active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="flex-shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        isAdmin
                          ? 'bg-amarelo/20 text-amarelo'
                          : user.role === 'VENDEDOR'
                          ? 'bg-blue-500/20 text-blue-400'
                          : user.role === 'ENGENHEIRO'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {ROLES.find((r) => r.value === user.role)?.label || user.role}
                    </span>
                  </div>

                  {/* Allowed Pages */}
                  <div className="flex-shrink-0 hidden md:block">
                    {isAdmin ? (
                      <span className="text-xs text-amarelo">Acesso total</span>
                    ) : pages.length === 0 ? (
                      <span className="text-xs text-gray-500">Todas as telas</span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {pages.length} de {ALL_PAGES.length} telas
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(user)}
                      className="btn-secondary text-sm flex items-center gap-1 px-3 py-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => toggleActive(user)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                        user.active
                          ? 'border-red-500/30 text-red-400 hover:bg-red-400/10'
                          : 'border-green-500/30 text-green-400 hover:bg-green-400/10'
                      }`}
                    >
                      {user.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>

                {/* Pages chips (mobile) */}
                {!isAdmin && pages.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-grafite-700 flex flex-wrap gap-1.5 md:hidden">
                    {pages.map((p) => (
                      <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-grafite-700 text-gray-400">
                        {ALL_PAGES.find((ap) => ap.path === p)?.label || p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto w-full max-w-xl bg-grafite-900 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-grafite-700 bg-grafite-800 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-100">
                {form.id ? 'Editar Usuario' : 'Novo Usuario'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Dados do Usuario</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label-field">Nome *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="label-field">Email *</label>
                    <input
                      type="email"
                      className="input-field"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="email@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="label-field">
                      Senha {form.id ? '(deixe vazio para manter)' : '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input-field pr-10"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder={form.id ? 'Nova senha (opcional)' : 'Senha de acesso'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Perfil de Acesso</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, role: role.value }))}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        form.role === role.value
                          ? 'border-amarelo bg-amarelo/10'
                          : 'border-grafite-600 bg-grafite-800 hover:border-grafite-500'
                      }`}
                    >
                      <div
                        className={`text-sm font-bold ${
                          form.role === role.value ? 'text-amarelo' : 'text-gray-300'
                        }`}
                      >
                        {role.label}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{role.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Permissions */}
              {form.role !== 'ADMIN' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-200">Telas Permitidas</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllPages}
                        className="text-xs text-amarelo hover:underline"
                      >
                        Todas
                      </button>
                      <span className="text-grafite-600">|</span>
                      <button
                        type="button"
                        onClick={deselectAllPages}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        Nenhuma
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {ALL_PAGES.map((page) => {
                      const isChecked = form.allowedPages.includes(page.path)
                      return (
                        <button
                          key={page.path}
                          type="button"
                          onClick={() => togglePage(page.path)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                            isChecked
                              ? 'border-amarelo/40 bg-amarelo/5'
                              : 'border-grafite-700 bg-grafite-800'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-amarelo text-grafite-950'
                                : 'bg-grafite-700 border border-grafite-600'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1">
                            <span
                              className={`text-sm font-medium ${
                                isChecked ? 'text-gray-200' : 'text-gray-400'
                              }`}
                            >
                              {page.label}
                            </span>
                            <span className="text-xs text-grafite-500 ml-2">{page.path}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {form.allowedPages.length} de {ALL_PAGES.length} telas selecionadas.
                    O usuario so vera as telas marcadas na barra lateral.
                  </p>
                </div>
              )}

              {form.role === 'ADMIN' && (
                <div className="p-4 bg-amarelo/10 border border-amarelo/30 rounded-lg">
                  <p className="text-sm text-amarelo font-medium">
                    Administradores tem acesso total a todas as telas, incluindo gestao de usuarios.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-grafite-700 bg-grafite-800 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim() || (!form.id && !form.password.trim())}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <UserCog className="w-4 h-4" />
                )}
                {form.id ? 'Salvar Alteracoes' : 'Criar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
