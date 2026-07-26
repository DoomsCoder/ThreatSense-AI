import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine,
  Tooltip, Cell, ResponsiveContainer
} from 'recharts'

const ANOMALY_META = {
  'Brute Force':       { cls: 'brute-force',       color: '#f85149' },
  'Impossible Travel': { cls: 'impossible-travel',  color: '#f0883e' },
  'Device Spoofing':   { cls: 'device-spoofing',    color: '#a78bfa' },
  'Lateral Movement':  { cls: 'lateral-movement',   color: '#eab308' },
  'Credential Misuse': { cls: 'credential-misuse',  color: '#38bdf8' },
  'Credential Stuffing': { cls: 'credential-stuffing', color: '#fb7185' },
  'Low-and-Slow Exfiltration': { cls: 'exfiltration', color: '#2dd4bf' },
  'Insider Drift': { cls: 'insider-drift', color: '#c084fc' },
  'None':              { cls: '',                   color: '#3fb950' },
}

function getRiskColor(s) {
  if (s >= 70) return '#f85149'
  if (s >= 50) return '#f0883e'
  if (s >= 30) return '#d29922'
  return '#3fb950'
}

// ── Two-column detail grid ────────────────────────────────────────────────────
function DetailGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
      {items.map(({ label, value, mono, full }, i) => (
        <div
          key={label}
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            gridColumn: full ? 'span 2' : undefined,
            borderRight: (!full && i % 2 === 0) ? '1px solid rgba(255,255,255,0.06)' : undefined,
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, letterSpacing: '0.02em' }}>
            {label}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
            fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── SHAP Chart ────────────────────────────────────────────────────────────────
function ShapChart({ data }) {
  const raw = Object.entries(data).map(([feature, impact]) => ({
    feature,
    raw: parseFloat(impact),
  }))

  const chartData = raw.map(({ feature, raw: r }) => ({
    feature: feature.length > 24 ? feature.slice(0, 24) + '…' : feature,
    display: parseFloat((-r).toFixed(4)),
    abs: Math.abs(r),
  })).sort((a, b) => b.abs - a.abs)

  const maxAbs   = Math.max(...chartData.map(d => d.abs), 0.001)
  const domain   = maxAbs * 1.3

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const entry = chartData.find(d => d.feature === label)
    if (!entry) return null
    const isRisk = entry.display > 0
    const mag = Math.abs(entry.display)
    const plain = mag < 0.05 ? 'Negligible effect' : mag < 0.3
      ? (isRisk ? 'Slightly increases risk' : 'Slightly decreases risk') : mag < 0.8
      ? (isRisk ? 'Moderately increases risk' : 'Moderately decreases risk')
      : (isRisk ? 'Strongly increases risk' : 'Strongly decreases risk')

    return (
      <div style={{
        background: '#1c2128', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6, padding: '8px 12px', fontSize: 11,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}>
        <p style={{ color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>{label}</p>
        <p style={{ color: isRisk ? '#f85149' : '#58a6ff', fontWeight: 700, fontFamily: 'monospace' }}>
          {isRisk ? '▲' : '▼'} {isRisk ? '+' : ''}{entry.display.toFixed(4)}
        </p>
        <p style={{ color: 'var(--text-3)', marginTop: 2 }}>{plain}</p>
      </div>
    )
  }

  return (
    <div style={{ height: Math.max(180, chartData.length * 36) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 12 }} barCategoryGap="30%">
          <XAxis
            type="number" domain={[-domain, domain]}
            stroke="#484f58"
            tick={{ fill: '#484f58', fontSize: 9, fontFamily: 'monospace' }}
            tickFormatter={v => v === 0 ? '0' : (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
            axisLine={{ stroke: '#484f58' }} tickLine={{ stroke: '#484f58' }}
          />
          <YAxis
            type="category" dataKey="feature"
            stroke="transparent"
            tick={{ fill: 'var(--text-2)', fontSize: 11 }}
            width={144} tickLine={false}
          />
          <ReferenceLine x={0} stroke="#484f58" strokeWidth={1} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="display" radius={[0, 3, 3, 0]} maxBarSize={18}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.display > 0 ? '#f85149' : '#58a6ff'} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function ExplainModal({ threat, onClose }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const meta   = ANOMALY_META[threat.anomaly_type] || ANOMALY_META['None']
  const score  = parseFloat(threat.risk_score) || 0
  const color  = getRiskColor(score)
  const hasExp = threat.explanation && Object.keys(threat.explanation).length > 0

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(threat, null, 2)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ts     = new Date(threat.timestamp)
  const tsStr  = `${ts.toISOString().slice(0,10)} ${ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`

  const details = [
    { label: 'Entity ID', value: threat.entity_id || threat.user_id },
    { label: 'Source IP', value: threat.source_ip || threat.ip_address, mono: true },
    { label: 'Location', value: `${threat.location_city}, ${threat.location_country}` },
    { label: 'Device', value: threat.device_fingerprint || threat.device_id, mono: true },
    { label: 'Privilege', value: (threat.privilege_level || '').toUpperCase() },
    { label: 'Resource', value: threat.resource_accessed || 'N/A' },
    { label: 'Auth Method', value: threat.auth_method || 'N/A' },
    { label: 'Command Sequence', value: threat.command_sequence || 'N/A', full: true },
  ]

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          maxHeight: '90vh', overflowY: 'auto',
          background: '#161b22',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          animation: 'modalIn 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      >

        {/* ── Modal Header ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Left — ID + pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 16, fontWeight: 700, color: 'var(--blue)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              LOG-{threat.id}
            </span>
            {meta.cls && (
              <span className={`threat-pill ${meta.cls}`}>{threat.anomaly_type}</span>
            )}
            {threat.privilege_level === 'admin' && (
              <span className="threat-pill device-spoofing" style={{ fontSize: 10 }}>ADMIN</span>
            )}
          </div>

          {/* Right — risk score + X */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 1 }}>
                Risk Score
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                {score.toFixed(0)}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 26, height: 26, borderRadius: 5, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-3)', fontSize: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>
        </div>

        {/* ── Log Details section ── */}
        <div style={{ padding: '14px 20px 4px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
            Log Details
          </div>
        </div>
        <DetailGrid items={details} />

        {/* ── SHAP section ── */}
        {hasExp && (
          <div style={{ padding: '18px 20px 8px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>
              AI Explainability - SHAP Values
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>
              Feature contributions to risk score.{' '}
              <span style={{ color: '#f85149' }}>Red = increases risk</span>{' · '}
              <span style={{ color: '#58a6ff' }}>Blue = decreases risk</span>
            </p>
            <ShapChart data={threat.explanation} />
          </div>
        )}

        {!hasExp && (
          <div style={{ margin: '12px 20px', padding: '10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', textAlign: 'center', color: 'var(--text-3)', fontSize: 11 }}>
            No SHAP explanation available
          </div>
        )}

        {/* ── Context / Warnings ── */}
        {(threat.cold_start || threat.concept_drift_flag) && (
          <div style={{ padding: '0px 20px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {threat.cold_start && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', fontSize: 11, color: 'var(--text-2)' }}>
                <strong>❄️ Cold Start:</strong> This user has fewer than 15 historical events. The AI's baseline confidence is low.
              </div>
            )}
            {threat.concept_drift_flag && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', fontSize: 11, color: 'var(--text-2)' }}>
                <strong>⚠️ Concept Drift:</strong> The model has detected a recent shift in baseline behavior for this user.
              </div>
            )}
          </div>
        )}

        {/* ── Footer buttons ── */}
        <div style={{
          display: 'flex', gap: 10, padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          justifyContent: 'flex-end',
        }}>
          <button className="btn-ghost" onClick={onClose} style={{ minWidth: 80 }}>
            Close
          </button>
          <button className="btn-primary" onClick={handleCopy} style={{ minWidth: 120 }}>
            {copied ? '✓ Copied!' : '⎘ Copy JSON'}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
