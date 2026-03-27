'use client'

import { useState, useEffect } from 'react'
import { Building2, Wallet, Hammer } from 'lucide-react'
import { formatCurrency } from '@/lib/calculations'
import DREChart from '@/components/DREChart'

interface DashboardData {
  custoEmpresaDia: number
  saldoCaixa: number
  obrasAtivas: number
  dre: {
    receitaBruta: number
    impostos: number
    insumos: number
    maoDeObra: number
    custosFixos: number
    lucroLiquido: number
  }
  fluxoCaixa: Array<{ mes: string; entradas: number; saidas: number }>
}

type Periodo = 'hoje' | 'semana' | 'mes' | 'ano'

const periodos: { label: string; value: Periodo }[] = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mes', value: 'mes' },
  { label: 'Ano', value: 'ano' },
]

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-grafite-700 rounded w-1/2 mb-3" />
      <div className="h-8 bg-grafite-700 rounded w-3/4" />
    </div>
  )
}

function SkeletonBlock({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`card animate-pulse ${height}`}>
      <div className="h-4 bg-grafite-700 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-grafite-700 rounded w-full" />
        <div className="h-3 bg-grafite-700 rounded w-5/6" />
        <div className="h-3 bg-grafite-700 rounded w-4/6" />
        <div className="h-3 bg-grafite-700 rounded w-full" />
        <div className="h-3 bg-grafite-700 rounded w-3/6" />
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  isCurrency = true,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  isCurrency?: boolean
}) {
  return (
    <div className="card-highlight">
      <div className="flex items-center justify-between mb-2">
        <span className="text-grafite-400 text-sm font-medium">{title}</span>
        <Icon className="w-5 h-5 text-amarelo" />
      </div>
      <p className="text-2xl font-bold text-grafite-50">
        {isCurrency ? formatCurrency(value) : value}
      </p>
    </div>
  )
}

function DRELine({
  label,
  value,
  isSubtraction = false,
  isTotal = false,
}: {
  label: string
  value: number
  isSubtraction?: boolean
  isTotal?: boolean
}) {
  const formattedValue = formatCurrency(Math.abs(value))

  return (
    <div
      className={`flex items-center justify-between py-2 ${
        isTotal ? 'border-t-2 border-grafite-600 pt-3 mt-1' : ''
      }`}
    >
      <span
        className={`text-sm ${
          isTotal ? 'font-bold text-grafite-100' : 'text-grafite-300'
        }`}
      >
        {isSubtraction ? '(-) ' : ''}
        {label}
      </span>
      <span
        className={`font-mono text-sm font-semibold ${
          isTotal
            ? value >= 0
              ? 'text-green-400'
              : 'text-red-400'
            : isSubtraction
            ? 'text-red-400'
            : 'text-green-400'
        }`}
      >
        {isSubtraction ? '- ' : ''}
        {formattedValue}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/dashboard?periodo=${periodo}`)
        if (!res.ok) throw new Error('Erro ao carregar dados')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError('Falha ao carregar dados do dashboard. Tente novamente.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [periodo])

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-grafite-50">
            DRE em Tempo Real
          </h1>
          <p className="text-grafite-400 text-sm mt-1">
            Visao consolidada das financas da empresa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-grafite-800 rounded-lg p-1">
          {periodos.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                periodo === p.value
                  ? 'bg-amarelo text-grafite-950'
                  : 'text-grafite-400 hover:text-grafite-200 hover:bg-grafite-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            title="Custo Empresa/Dia"
            value={data.custoEmpresaDia}
            icon={Building2}
          />
          <StatsCard
            title="Saldo em Caixa"
            value={data.saldoCaixa}
            icon={Wallet}
          />
          <StatsCard
            title="Obras Ativas"
            value={data.obrasAtivas}
            icon={Hammer}
            isCurrency={false}
          />
        </div>
      ) : null}

      {/* DRE Summary + Cash Flow Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DRE Summary */}
        {loading ? (
          <SkeletonBlock height="h-72" />
        ) : data ? (
          <div className="card overflow-hidden">
            <h2 className="text-lg font-semibold text-grafite-100 mb-4">
              Resumo DRE
            </h2>
            <div className="divide-y divide-grafite-800 space-y-0">
              <DRELine label="Receita Bruta" value={data.dre.receitaBruta} />
              <DRELine
                label="Impostos"
                value={data.dre.impostos}
                isSubtraction
              />
              <DRELine
                label="Insumos"
                value={data.dre.insumos}
                isSubtraction
              />
              <DRELine
                label="Mao de Obra"
                value={data.dre.maoDeObra}
                isSubtraction
              />
              <DRELine
                label="Custos Fixos"
                value={data.dre.custosFixos}
                isSubtraction
              />
              <DRELine
                label="Lucro Liquido"
                value={data.dre.lucroLiquido}
                isTotal
              />
            </div>
          </div>
        ) : null}

        {/* Cash Flow Chart */}
        {loading ? (
          <SkeletonBlock height="h-72" />
        ) : data ? (
          <div className="card overflow-hidden">
            <h2 className="text-lg font-semibold text-grafite-100 mb-4">
              Fluxo de Caixa
            </h2>
            <div className="w-full min-w-0 overflow-x-auto">
              <DREChart data={data.fluxoCaixa} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
