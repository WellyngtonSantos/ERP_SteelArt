import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  icon: LucideIcon
  title: string
  value: string
  trend?: 'up' | 'down'
  trendValue?: string
  className?: string
}

export default function StatsCard({
  icon: Icon,
  title,
  value,
  trend,
  trendValue,
  className = '',
}: StatsCardProps) {
  return (
    <div
      className={`bg-grafite-800 rounded-xl border border-grafite-700 p-6 shadow-lg hover:border-grafite-600 transition-colors ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-100">{value}</p>

          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-amarelo" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend === 'up' ? 'text-amarelo' : 'text-red-500'
                }`}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>

        <div className="w-12 h-12 rounded-lg bg-amarelo/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-amarelo" />
        </div>
      </div>
    </div>
  )
}
