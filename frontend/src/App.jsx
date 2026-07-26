import { useState, useEffect } from 'react'
import axios from 'axios'
import Header from './components/Header'
import MetricCards from './components/MetricCards'
import ThreatChart from './components/ThreatChart'
import ThreatTable from './components/ThreatTable'
import ExplainModal from './components/ExplainModal'

let API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
API_BASE = API_BASE.replace(/\/+$/, '')
if (!API_BASE.endsWith('/api')) API_BASE += '/api'

export default function App() {
  const [stats, setStats]           = useState(null)
  const [threats, setThreats]       = useState([])
  const [allLogs, setAllLogs]       = useState([])
  const [selectedThreat, setSelected] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchData = async () => {
    try {
      setError(null)
      const [statsRes, threatsRes, allRes] = await Promise.all([
        axios.get(`${API_BASE}/stats`),
        axios.get(`${API_BASE}/threats`),
        axios.get(`${API_BASE}/threats/all`),
      ])
      setStats(statsRes.data)
      setThreats(threatsRes.data)
      setAllLogs(allRes.data)
      setLastRefresh(new Date())
    } catch (err) {
      setError('Cannot connect to backend or received invalid data. Make sure the backend is running properly.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Manual refresh: runs the Python ML engine via the backend,
   * which regenerates threat_data.json with a new random seed,
   * then reloads all frontend data.
   * This takes ~30-60 seconds.
   */
  const manualRefresh = async () => {
    await axios.post(`${API_BASE}/regenerate`)   // runs Python, waits, reloads cache
    await fetchData()                             // update React state
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const exportCSV = () => {
    if (!threats.length) return
    const cols = ['id','timestamp','user_id','ip_address','location_city','location_country',
                  'device_id','failed_attempts','session_duration_sec','privilege_level',
                  'hour_of_day','risk_score','anomaly_type']
    const header = cols.join(',')
    const rows = threats.map(t =>
      cols.map(c => {
        const v = t[c] ?? ''
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      }).join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `threatsense_report_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', gap: 8, marginBottom: 16 }}>
            {[0, 0.15, 0.3].map((d, i) => (
              <div key={i} className="animate-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animationDelay: `${d}s` }} />
            ))}
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 12, letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>INITIALIZING THREATSENSE AI...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: 400, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <h2 style={{ color: 'var(--red)', fontWeight: 700, marginBottom: 8 }}>Connection Error</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 20 }}>{error}</p>
          <button className="btn-primary" onClick={fetchData}>Retry Connection</button>
        </div>
      </div>
    )
  }



  const dateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const tzStr   = `IST`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Fixed top bar */}
      <Header stats={stats} lastRefresh={lastRefresh} onRefresh={manualRefresh} onExport={exportCSV} />

      {/* Page content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Hero / page title ── */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
              Analyst Dashboard
            </h1>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
              - {dateStr} {timeStr} · {tzStr}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Real-time threat intelligence and anomaly detection overview
          </p>
        </div>

        {/* ── Model Performance Bar ── */}
        {stats?.modelPerformance && (
          <div className="card animate-fade-in" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>
              MODEL PERFORMANCE
            </span>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: 32, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-3)' }}>Precision</span> <span style={{ color: 'var(--blue)', fontWeight: 600, marginLeft: 8 }}>{stats.modelPerformance.precision.toFixed(2)}</span></div>
              <div><span style={{ color: 'var(--text-3)' }}>Recall</span> <span style={{ color: 'var(--blue)', fontWeight: 600, marginLeft: 8 }}>{stats.modelPerformance.recall.toFixed(2)}</span></div>
              <div><span style={{ color: 'var(--text-3)' }}>F1 Score</span> <span style={{ color: 'var(--blue)', fontWeight: 600, marginLeft: 8 }}>{stats.modelPerformance.f1_score.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {/* ── Metric Cards ── */}
        <MetricCards stats={stats} />

        {/* ── Chart ── */}
        <ThreatChart logs={allLogs} />

        {/* ── Threat Table ── */}
        <ThreatTable threats={threats} onSelect={setSelected} />
      </div>

      {/* ── Modal ── */}
      {selectedThreat && (
        <ExplainModal threat={selectedThreat} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
