interface ChartTooltipPayloadEntry {
  name?: string | number
  value?: string | number | ReadonlyArray<string | number>
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<ChartTooltipPayloadEntry>
  label?: string | number
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined ? (
        <p className="mb-1 font-medium text-foreground">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
