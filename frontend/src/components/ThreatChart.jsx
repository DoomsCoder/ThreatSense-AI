import { useMemo, useState } from 'react'
import {
  ComposedChart, Area, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, AreaChart
} from 'recharts'

const ANOMALY_COLORS = {
  'Brute Force': '#f85149',
  'Impossible Travel': '#f0883e',
  'Device Spoofing': '#a78bfa',
  'Lateral Movement': '#eab308',
  'Credential Misuse': '#38bdf8',
  'Credential Stuffing': '#fb7185',
  'Low-and-Slow Exfiltration': '#2dd4bf',
  'Insider Drift': '#c084fc',
  'None': '#3fb950',
}

const ANOMALY_CLS = {
  'Brute Force': 'brute-force',
  'Impossible Travel': 'impossible-travel',
  'Device Spoofing': 'device-spoofing',
  'Lateral Movement': 'lateral-movement',
  'Credential Misuse': 'credential-misuse',
  'Credential Stuffing': 'credential-stuffing',
  'Low-and-Slow Exfiltration': 'exfiltration',
  'Insider Drift': 'insider-drift',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#1c2128', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)', minWidth: 180, maxWidth: 220,
      pointerEvents: 'none',
    }}>
      <p style={{ color: 'var(--text-3)', marginBottom: 6, fontFamily: 'monospace', fontSize: 11 }}>{label}</p>
      <p style={{ fontWeight: 700, color: ANOMALY_COLORS[d?.anomaly_type] || 'var(--blue)' }}>
        Risk Score: <span style={{ fontFamily: 'monospace', fontSize: 15 }}>{d?.risk_score?.toFixed(1)}</span>
      </p>
      <p style={{ color: 'var(--text-2)', marginTop: 4 }}>{d?.user_id}</p>
      <p style={{ color: 'var(--text-3)', fontSize: 11 }}>{d?.location_city}, {d?.location_country}</p>
      {d?.is_anomaly && (
        <span className={`threat-pill ${ANOMALY_CLS[d.anomaly_type] || ''}`}
              style={{ marginTop: 8, display: 'inline-flex' }}>
          {d.anomaly_type}
        </span>
      )}
    </div>
  )
}

function CustomDot({ cx, cy, payload }) {
  if (!payload?.is_anomaly) return null
  const color = ANOMALY_COLORS[payload.anomaly_type] || '#f85149'
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="#0d1117" strokeWidth={2} />
    </g>
  )
}

function CustomActiveDot({ cx, cy, payload }) {
  const isAnomaly = payload?.is_anomaly
  const color = isAnomaly ? (ANOMALY_COLORS[payload?.anomaly_type] || '#f85149') : '#58a6ff'
  const outerR = isAnomaly ? 7 : 5
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Glow ring */}
      <circle cx={cx} cy={cy} r={outerR + 3} fill={color} fillOpacity={0.2} />
      <circle cx={cx} cy={cy} r={outerR} fill={color} stroke="#ffffff" strokeWidth={2} />
    </g>
  )
}

export default function ThreatChart({ logs }) {
  const [view, setView] = useState('timeline') // 'timeline' | 'distribution'

  // Build timeline: take every Nth log to keep ~80 visible points with good spacing
  const timelineData = useMemo(() => {
    const recent = logs.slice(-400) // last 400 logs
    const step = Math.max(1, Math.floor(recent.length / 80)) // sample to ~80 points
    return recent
      .filter((_, i) => i % step === 0 || recent[i].is_anomaly) // always include anomalies
      .slice(-80)
      .map((l, idx) => ({
        ...l,
        idx,
        label: new Date(l.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }),
      }))
  }, [logs])

  // Risk distribution histogram (bins of 10)
  const histogram = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}–${i * 10 + 9}`,
      count: 0,
      anomalies: 0,
    }))
    logs.forEach(l => {
      const bin = Math.min(9, Math.floor(l.risk_score / 10))
      bins[bin].count++
      if (l.is_anomaly) bins[bin].anomalies++
    })
    return bins
  }, [logs])

  return (
    <div className="card animate-fade-in" style={{ padding: '18px 20px' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Risk Score Timeline
          </span>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            Last {timelineData.length} events - IST
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['timeline', 'distribution'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '4px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: view === v ? 'rgba(88,166,255,0.15)' : 'transparent',
                border: `1px solid ${view === v ? 'rgba(88,166,255,0.4)' : 'var(--border)'}`,
                color: view === v ? 'var(--blue)' : 'var(--text-3)',
                transition: 'all 0.15s', textTransform: 'capitalize',
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>


      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        {Object.entries(ANOMALY_COLORS).map(([k, c]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {k}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
          <span style={{ width: 18, borderTop: '1px dashed rgba(248,81,73,0.6)', display: 'inline-block' }} />
          Critical threshold (70)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
          <span style={{ width: 18, borderTop: '1px dashed rgba(240,136,62,0.5)', display: 'inline-block' }} />
          Warning threshold (40)
        </span>
      </div>


      <div style={{ height: 320 }}>
        {view === 'timeline' ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#58a6ff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" stroke="#484f58" tick={{ fill: '#484f58', fontSize: 10 }} interval={Math.floor(timelineData.length / 8)} />
              <YAxis stroke="#484f58" tick={{ fill: '#484f58', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: true }}
                position={{ y: 10 }}
              />
              <ReferenceLine y={70} stroke="#f85149" strokeDasharray="4 4" strokeOpacity={0.55}
                label={{ value: 'Critical (70)', fill: '#f85149', fontSize: 9, position: 'insideTopRight' }} />
              <ReferenceLine y={40} stroke="#f0883e" strokeDasharray="4 4" strokeOpacity={0.4}
                label={{ value: 'Warning (40)', fill: '#f0883e', fontSize: 9, position: 'insideTopRight' }} />
              {/* The blue area line with anomaly dots */}
              <Area
                type="monotone"
                dataKey="risk_score"
                stroke="#58a6ff"
                strokeWidth={1.5}
                fill="url(#riskGrad)"
                dot={<CustomDot />}
                activeDot={<CustomActiveDot />}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={histogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3fb950" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3fb950" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f85149" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f85149" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="range" stroke="#484f58" tick={{ fill: '#484f58', fontSize: 10 }} />
              <YAxis stroke="#484f58" tick={{ fill: '#484f58', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--text-3)' }}
                itemStyle={{ color: 'var(--text-1)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-3)' }} />
              <Area type="monotone" dataKey="count"     name="Total Logs"  stroke="#3fb950" fill="url(#normalGrad)"  strokeWidth={1.5} />
              <Area type="monotone" dataKey="anomalies" name="Anomalies"   stroke="#f85149" fill="url(#anomalyGrad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
