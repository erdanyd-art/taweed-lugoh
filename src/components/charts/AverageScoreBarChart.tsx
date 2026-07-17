import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'

export interface AverageScoreByClass {
  class: string
  preTest: number
  postTest: number
}

interface AverageScoreBarChartProps {
  data: AverageScoreByClass[]
}

const AXIS_TICK_STYLE = { fill: 'var(--muted-foreground)', fontSize: 12 }
const LABEL_STYLE = { fill: 'var(--muted-foreground)', fontSize: 11 }

export function AverageScoreBarChart({ data }: AverageScoreBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="class"
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK_STYLE}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK_STYLE}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
        <Legend
          verticalAlign="top"
          align="right"
          height={32}
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
        <Bar
          dataKey="preTest"
          name="Average Pre Test"
          fill="var(--chart-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          label={{ position: 'top', style: LABEL_STYLE }}
        />
        <Bar
          dataKey="postTest"
          name="Average Post Test"
          fill="var(--chart-2)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          label={{ position: 'top', style: LABEL_STYLE }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
