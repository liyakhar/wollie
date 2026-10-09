import type { GoalMonth } from '#/lib/money-insights'

/** Category colours: ink and neon first, then quiet greys and olives. */
export const CHART_COLORS = ['#111111', '#cdea3a', '#8a8a82', '#6f7d1c', '#c9c9c1', '#e3f39a', '#4a4a46', '#a9bd2c']

export function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/**
 * Running total for this month (solid line, soft neon fill) over last
 * month's running total (dashed). The dot is today.
 */
export function PaceChart({
  daily,
  lastDaily,
  days,
  height = 120,
}: {
  daily: number[]
  lastDaily: number[]
  days: number
  height?: number
}) {
  const width = 320
  const top = 10
  const bottom = height - 6
  const max = Math.max(1, ...daily, ...lastDaily) * 1.08
  const x = (index: number) => (days <= 1 ? 0 : (index / (days - 1)) * width)
  const y = (value: number) => bottom - (value / max) * (bottom - top)
  const line = (values: number[]) => values.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join('')
  const now = daily.length - 1
  const area = daily.length > 0 ? `${line(daily)}L${x(now).toFixed(1)},${bottom}L0,${bottom}Z` : ''

  return (
    <svg className="w-pace" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Spending this month compared with last month">
      <line x1="0" x2={width} y1={bottom} y2={bottom} className="w-pace__base" />
      {lastDaily.length > 1 && <path d={line(lastDaily)} className="w-pace__last" vectorEffect="non-scaling-stroke" />}
      {area && <path d={area} className="w-pace__area" />}
      {daily.length > 0 && <path d={line(daily)} className="w-pace__line" vectorEffect="non-scaling-stroke" />}
      {daily.length > 0 && (
        <line x1={x(now)} x2={x(now)} y1={y(daily[now])} y2={bottom} className="w-pace__today" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  )
}

/** The today dot sits outside the stretched SVG so it stays round. */
export function PaceDot({ daily, lastDaily, days, height = 120 }: { daily: number[]; lastDaily: number[]; days: number; height?: number }) {
  if (!daily.length) return null
  const top = 10
  const bottom = height - 6
  const max = Math.max(1, ...daily, ...lastDaily) * 1.08
  const now = daily.length - 1
  const left = days <= 1 ? 0 : (now / (days - 1)) * 100
  const topPx = bottom - (daily[now] / max) * (bottom - top)
  return <span className="w-pace__dot" style={{ left: `${left}%`, top: `${(topPx / height) * 100}%` }} aria-hidden="true" />
}

/** Donut of category shares. */
export function Ring({
  segments,
  size = 200,
  thickness = 22,
  children,
}: {
  segments: Array<{ value: number; color: string }>
  size?: number
  thickness?: number
  children?: React.ReactNode
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const gap = segments.length > 1 ? 3 : 0
  let offset = 0
  return (
    <div className="w-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--m-track)" strokeWidth={thickness} />
        {total > 0 && segments.map((segment, index) => {
          const length = (segment.value / total) * circumference
          const visible = Math.max(length - gap, 0.001)
          const node = (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${visible} ${circumference - visible}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )
          offset += length
          return node
        })}
      </svg>
      <div className="w-ring__center">{children}</div>
    </div>
  )
}

/** Monthly totals as bars; the last bar (this month) is neon. */
export function MonthBars({
  months,
  format,
}: {
  months: Array<{ key: string; label: string; total: number }>
  format: (value: number) => string
}) {
  const max = Math.max(1, ...months.map((month) => month.total))
  const past = months.slice(0, -1).filter((month) => month.total > 0)
  const average = past.length ? past.reduce((sum, month) => sum + month.total, 0) / past.length : 0
  return (
    <div className="w-bars" role="img" aria-label={`Spending per month. Average ${format(average)}.`}>
      <div className="w-bars__plot">
        {average > 0 && (
          <span className="w-bars__avg" style={{ bottom: `${(average / max) * 100}%` }}>
            <span>avg {format(average)}</span>
          </span>
        )}
        {months.map((month, index) => (
          <span
            key={month.key}
            className={`w-bars__bar${index === months.length - 1 ? ' is-now' : ''}`}
            style={{ height: `${Math.max((month.total / max) * 100, month.total > 0 ? 2 : 0)}%` }}
          />
        ))}
      </div>
      <div className="w-bars__labels" aria-hidden="true">
        {months.map((month) => <span key={month.key}>{month.label}</span>)}
      </div>
    </div>
  )
}

/** Last months of a savings goal as small marks. */
export function MonthDots({ months }: { months: GoalMonth[] }) {
  const words: Record<GoalMonth['state'], string> = {
    saved: 'saved',
    part: 'partly saved',
    skipped: 'skipped',
    missed: 'missed',
    due: 'to do',
    upcoming: 'upcoming',
  }
  return (
    <ol className="w-dots" aria-label="Last months">
      {months.map((month) => (
        <li key={month.key} className={`w-dots__item is-${month.state}`} title={`${month.label}: ${words[month.state]}`}>
          <span className="w-dots__mark" aria-hidden="true" />
          <span className="w-dots__label">{month.label}</span>
          <span className="sr-only">{words[month.state]}</span>
        </li>
      ))}
    </ol>
  )
}

/** One thin bar split by category share. */
export function ShareBar({ segments }: { segments: Array<{ value: number; color: string }> }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <span className="w-share" aria-hidden="true">
      {total > 0 && segments.map((segment, index) => (
        <span key={index} style={{ flexGrow: segment.value, background: segment.color }} />
      ))}
    </span>
  )
}
