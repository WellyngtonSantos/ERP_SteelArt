'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Calculator,
  Hammer,
  Package,
  Users,
  DollarSign,
  BoxIcon,
  Settings,
  UserCog,
  ChevronRight,
  Map,
  TrendingUp,
  FileText,
  ClipboardList,
  Truck,
  Receipt,
  BadgeDollarSign,
  PiggyBank,
  Palette,
  Eye,
  Type,
  Image as ImageIcon,
  History,
  Shield,
  Search,
  Building2,
} from 'lucide-react'

interface Feature {
  name: string
  description: string
  icon: React.ComponentType<any>
}

interface SystemSection {
  id: string
  name: string
  description: string
  href: string
  icon: React.ComponentType<any>
  color: string
  features: Feature[]
}

const sections: SystemSection[] = [
  {
    id: 'dashboard',
    name: 'Dashboard / DRE',
    description: 'Visao geral financeira e indicadores do negocio',
    href: '/',
    icon: LayoutDashboard,
    color: '#3b82f6',
    features: [
      { name: 'DRE em Tempo Real', description: 'Demonstrativo de Resultado do Exercicio com receitas, custos e lucro liquido', icon: TrendingUp },
      { name: 'Fluxo de Caixa', description: 'Grafico de entradas e saidas financeiras ao longo do tempo', icon: BadgeDollarSign },
      { name: 'Indicadores', description: 'Cards com receita bruta, custos, margem liquida e saldo projetado', icon: LayoutDashboard },
    ],
  },
  {
    id: 'produtos',
    name: 'Catalogo de Produtos',
    description: 'Gestao do catalogo de produtos padrao com materiais e custos',
    href: '/produtos',
    icon: BoxIcon,
    color: '#8b5cf6',
    features: [
      { name: 'Cadastro de Produtos', description: 'Criar e editar produtos com nome, descricao, materiais e custos base', icon: BoxIcon },
      { name: 'Lista de Materiais', description: 'Composicao de cada produto com quantidades e precos unitarios', icon: ClipboardList },
      { name: 'Imagens do Produto', description: 'Upload de fotos para visualizacao e uso nos orcamentos', icon: ImageIcon },
      { name: 'Margem Padrao', description: 'Definir margem de lucro padrao para cada produto do catalogo', icon: TrendingUp },
    ],
  },
  {
    id: 'comercial',
    name: 'Comercial / Orcamentos',
    description: 'Criacao e gestao de orcamentos com calculo automatico de custos',
    href: '/comercial',
    icon: Calculator,
    color: '#d97706',
    features: [
      { name: 'Novo Orcamento', description: 'Criar orcamento personalizado ou a partir de produto do catalogo', icon: FileText },
      { name: 'Busca por CNPJ', description: 'Auto preenchimento de dados do cliente via consulta de CNPJ', icon: Building2 },
      { name: 'Calculo Automatico', description: 'Materiais + mao de obra + margens + impostos calculados em tempo real', icon: Calculator },
      { name: 'Alocacao de Equipe', description: 'Selecionar funcionarios e horas para compor custo de mao de obra', icon: Users },
      { name: 'Geracao de PDF', description: 'Gerar orcamento em PDF com layout personalizado da empresa', icon: FileText },
      { name: 'Status do Orcamento', description: 'Controle de rascunho, enviado, aprovado ou rejeitado', icon: ClipboardList },
      { name: 'Aprovacao Automatica', description: 'Ao aprovar, cria projeto de producao e lancamentos financeiros', icon: TrendingUp },
    ],
  },
  {
    id: 'producao',
    name: 'Producao',
    description: 'Acompanhamento de projetos aprovados em formato Kanban',
    href: '/producao',
    icon: Hammer,
    color: '#ef4444',
    features: [
      { name: 'Quadro Kanban', description: 'Visualizacao de projetos por status: Pendente, Em Producao, Concluido, Entregue', icon: ClipboardList },
      { name: 'Progresso', description: 'Barra de progresso de 0 a 100% para cada projeto', icon: TrendingUp },
      { name: 'Datas de Prazo', description: 'Controle de data de inicio e previsao de entrega', icon: Hammer },
      { name: 'Observacoes', description: 'Notas e anotacoes sobre o andamento de cada projeto', icon: FileText },
    ],
  },
  {
    id: 'suprimentos',
    name: 'Suprimentos',
    description: 'Controle de estoque de materiais e importacao de notas fiscais',
    href: '/suprimentos',
    icon: Package,
    color: '#10b981',
    features: [
      { name: 'Estoque de Materiais', description: 'Cadastro e controle de quantidade, preco e estoque minimo', icon: Package },
      { name: 'Categorias', description: 'Organizacao por Aco, Tinta, Parafuso e Outros', icon: ClipboardList },
      { name: 'Importacao de NF-e', description: 'Upload de XML de nota fiscal com identificacao automatica de CNPJ do fornecedor', icon: Receipt },
      { name: 'Match de Materiais', description: 'Associacao inteligente entre itens da NF e materiais cadastrados', icon: Search },
      { name: 'Atualizacao de Precos', description: 'Precos dos materiais atualizados automaticamente ao importar NF', icon: DollarSign },
    ],
  },
  {
    id: 'rh',
    name: 'RH / Equipe',
    description: 'Gestao de funcionarios, salarios e deducoes',
    href: '/rh',
    icon: Users,
    color: '#ec4899',
    features: [
      { name: 'Cadastro de Funcionarios', description: 'Nome, funcao, salario mensal e beneficios', icon: Users },
      { name: 'Calculo de Hora', description: 'Valor/hora calculado automaticamente (salario / 220h)', icon: Calculator },
      { name: 'Deducoes', description: 'Registro de almoco, adiantamento, EPI e outras deducoes', icon: BadgeDollarSign },
      { name: 'Status Ativo/Inativo', description: 'Controle de funcionarios ativos para alocacao em orcamentos', icon: Shield },
    ],
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    description: 'Controle de receitas, despesas, custos fixos e impostos',
    href: '/financeiro',
    icon: DollarSign,
    color: '#14b8a6',
    features: [
      { name: 'Lancamentos', description: 'Receitas e despesas com vencimento, pagamento e status', icon: BadgeDollarSign },
      { name: 'Custos Fixos', description: 'Gestao de aluguel, energia, internet, contador e outros', icon: PiggyBank },
      { name: 'Configuracao de Impostos', description: 'ISS e ICMS com aliquotas por tipo (produto/servico)', icon: Receipt },
      { name: 'Parcelas Automaticas', description: 'Entrada e entrega criadas ao aprovar orcamento', icon: DollarSign },
    ],
  },
  {
    id: 'configuracoes',
    name: 'Configuracoes',
    description: 'Personalizacao do sistema, branding e templates de PDF',
    href: '/configuracoes',
    icon: Settings,
    color: '#6b7280',
    features: [
      { name: 'Identidade Visual', description: 'Logo, nome e subtitulo da empresa no sistema e PDFs', icon: ImageIcon },
      { name: 'Cores do Sistema', description: 'Cores primaria, secundaria e do texto personalizaveis', icon: Palette },
      { name: 'Textos do PDF', description: 'Rodape, cabecalho, termos, garantia e validade dos orcamentos', icon: Type },
      { name: 'Preview do PDF', description: 'Visualizacao em tempo real de como o PDF sera gerado', icon: Eye },
      { name: 'Historico de Atualizacoes', description: 'Log de todas as funcionalidades e correcoes do sistema', icon: History },
    ],
  },
  {
    id: 'usuarios',
    name: 'Gestao de Usuarios',
    description: 'Controle de acesso, permissoes e roles (somente Admin)',
    href: '/usuarios',
    icon: UserCog,
    color: '#f59e0b',
    features: [
      { name: 'Cadastro de Usuarios', description: 'Criar usuarios com nome, email, senha e funcao', icon: Users },
      { name: 'Roles', description: 'Admin, Vendedor, Engenheiro e Operador com permissoes diferentes', icon: Shield },
      { name: 'Controle por Tela', description: 'Definir quais telas cada usuario pode acessar', icon: ClipboardList },
      { name: 'Ativar/Desativar', description: 'Controle de usuarios ativos sem excluir do sistema', icon: UserCog },
    ],
  },
]

export default function MapaPage() {
  const router = useRouter()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amarelo/10 border border-amarelo/30 flex items-center justify-center">
            <Map className="w-5 h-5 text-amarelo" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Mapa do Sistema</h1>
            <p className="text-sm text-gray-400">
              Guia completo de todas as funcionalidades organizadas por setor
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-amarelo">{sections.length}</p>
          <p className="text-xs text-gray-400">Modulos</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-amarelo">
            {sections.reduce((sum, s) => sum + s.features.length, 0)}
          </p>
          <p className="text-xs text-gray-400">Funcionalidades</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-amarelo">4</p>
          <p className="text-xs text-gray-400">Roles de Acesso</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-amarelo">PDF</p>
          <p className="text-xs text-gray-400">Geracao de Docs</p>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          const isExpanded = expandedSection === section.id

          return (
            <div
              key={section.id}
              className="card overflow-hidden transition-all duration-300"
              style={{ borderColor: isExpanded ? section.color + '50' : undefined }}
            >
              {/* Section Header */}
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: section.color + '15', border: `1px solid ${section.color}30` }}
                >
                  <Icon className="w-6 h-6" style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-100">{section.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: section.color + '15', color: section.color }}
                    >
                      {section.features.length} funcionalidades
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="flex-1 text-xs font-semibold py-2 px-3 rounded-lg bg-grafite-800 hover:bg-grafite-700 text-gray-300 transition-colors flex items-center justify-center gap-1"
                >
                  {isExpanded ? 'Recolher' : 'Ver Funcionalidades'}
                  {isExpanded ? (
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => router.push(section.href)}
                  className="text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
                  style={{ backgroundColor: section.color + '15', color: section.color }}
                >
                  Acessar
                </button>
              </div>

              {/* Features Expanded */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-grafite-700 space-y-2">
                  {section.features.map((feature, idx) => {
                    const FIcon = feature.icon
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-grafite-800/50 hover:bg-grafite-800 transition-colors"
                      >
                        <FIcon
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          style={{ color: section.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-200">{feature.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{feature.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
