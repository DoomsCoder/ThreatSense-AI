import { useEffect, useState } from 'react'

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) { setValue(0); return }
    let start = 0
    const step = target / (duration / 16)
    const t = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(t) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(t)
  }, [target, duration])
  return value
}

// ── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit = '', subtext, badge, badgeCls = 'neutral', delay = 0 }) {
  const displayed = useCountUp(typeof value === 'number' ? value : 0)

  return (
    <div className="card animate-slide-up" style={{
      padding: '18px 20px', animationDelay: `${delay}ms`,
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: 'var(--text-3)', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {badge && (
          <span className={`metric-badge ${badgeCls}`}>{badge}</span>
        )}
      </div>

      {/* Big number */}
      <div style={{ marginBottom: 6 }}>
        <span style={{
          fontSize: 36, fontWeight: 800, lineHeight: 1,
          color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '-0.03em',
        }}>
          {typeof value === 'number' ? displayed.toLocaleString() : value}
        </span>
        {unit && (
          <span style={{ fontSize: 16, color: 'var(--text-3)', marginLeft: 4, fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>

      {/* Subtext */}
      {subtext && (
        <p style={{ fontSize: 11, color: 'var(--text-2)' }}>{subtext}</p>
      )}
    </div>
  )
}

// ── Threat Distribution Card ─────────────────────────────────────────────────
function ThreatDistCard({ stats }) {
  const anomalyCounts = stats?.anomalyCounts || {}
  
  const colorMap = {
    'Brute Force': '#f85149',
    'Impossible Travel': '#f0883e',
    'Device Spoofing': '#a78bfa',
    'Lateral Movement': '#eab308',
    'Credential Misuse': '#38bdf8',
    'Other': '#6e7681'
  }

  const entries = Object.entries(anomalyCounts).sort((a, b) => b[1] - a[1])
  // Take top 5, aggregate any remaining as "Other"
  const top = entries.slice(0, 5)
  const otherCount = entries.slice(5).reduce((s, [_, v]) => s + v, 0)
  if (otherCount > 0) {
    top.push(['Other', otherCount])
  }

  const total = top.reduce((s, [_, v]) => s + v, 0)

  return (
    <div className="card animate-slide-up" style={{ padding: '18px 20px', animationDelay: '240ms' }}>
      {/* Header */}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 14,
      }}>
        Threat Distribution
      </span>

      {/* Segmented bar */}
      <div className="segment-bar" style={{ marginBottom: 14 }}>
        {top.map(([label, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0
          const color = colorMap[label] || colorMap['Other']
          return (
            <div key={label} style={{ flex: pct, background: color, minWidth: pct > 0 ? 4 : 0 }} />
          )
        })}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {top.map(([label, count]) => {
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0
          const color = colorMap[label] || colorMap['Other']
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Export ───────────────────────────────────────────────────────────────────
export default function MetricCards({ stats }) {
  const highRisk   = stats?.highRiskCount ?? 0
  const avgScore   = stats?.avgRiskScore  ?? 0
  const avgBadge   = avgScore >= 70 ? 'HIGH'     : avgScore >= 40 ? 'ELEVATED' : 'NORMAL'
  const avgBadgeCls = avgScore >= 70 ? 'high-bdg' : avgScore >= 40 ? 'elevated' : 'neutral'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      <MetricCard
        label="Total Events"
        value={stats?.totalLogs ?? 0}
        badge="24h"
        badgeCls="neutral"
        subtext={<><span style={{color: '#10b981'}}>+12.4%</span> from yesterday</>}
        delay={0}
      />
      <MetricCard
        label="Critical Anomalies"
        value={stats?.anomalyCount ?? 0}
        badge="ACTIVE"
        badgeCls="active"
        subtext={`${highRisk} new high-risk events`}
        delay={80}
      />
      <MetricCard
        label="Avg Risk Score"
        value={avgScore != null ? Math.round(avgScore) : 0}
        unit="/100"
        badge={avgBadge}
        badgeCls={avgBadgeCls}
        subtext={avgScore >= 50 ? 'Above threshold · review required' : 'Within normal range'}
        delay={160}
      />
      <ThreatDistCard stats={stats} />
    </div>
  )
}
