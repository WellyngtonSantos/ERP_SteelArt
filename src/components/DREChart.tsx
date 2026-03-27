'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/calculations'

interface FluxoItem {
  mes: string
  entradas: number
  saidas: number
}

interface DREChartProps {
  data: FluxoItem[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-grafite-800 border border-grafite-700 rounded-lg p-3 shadow-xl">
      <p className="text-grafite-300 text-sm font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm"
          style={{ color: entry.color }}
        >
          {entry.dataKey === 'entradas' ? 'Entradas' : 'Saidas'}:{' '}
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

export default function DREChart({ data }: DREChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-grafite-500">
        Sem dados para o periodo selecionado
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f4147" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fill: '#9fa2a8', fontSize: 12 }}
          axisLine={{ stroke: '#3f4147' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9fa2a8', fontSize: 12 }}
          axisLine={{ stroke: '#3f4147' }}
          tickLine={false}
          tickFormatter={(value: number) =>
            new Intl.NumberFormat('pt-BR', {
              notation: 'compact',
              compactDisplay: 'short',
              currency: 'BRL',
              style: 'currency',
            }).format(value)
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar
          dataKey="entradas"
          name="Entradas"
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="saidas"
          name="Saidas"
          fill="#ef4444"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
