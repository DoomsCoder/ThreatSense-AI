import { useState } from 'react'

function getSystemStatus(score) {
  if (score >= 80) return { label: 'Critical Risk', cls: 'critical', dot: '#f85149' }
  if (score >= 60) return { label: 'High Risk',     cls: 'high',     dot: '#f0883e' }
  if (score >= 40) return { label: 'Elevated',      cls: 'elevated', dot: '#d29922' }
  return               { label: 'Normal',          cls: 'normal',   dot: '#3fb950' }
}

export default function Header({ stats, lastRefresh, onRefresh, onExport }) {
  const [spinning, setSpinning] = useState(false)
  const [toast, setToast]       = useState(null)

  const score  = stats?.systemThreatScore ?? 0
  const status = getSystemStatus(score)

  const handleRefresh = async () => {
    if (spinning) return
    setSpinning(true)
    setToast({ msg: 'Generating new data - this takes ~40s…', color: 'var(--blue)' })
    try {
      await onRefresh()
      setToast({ msg: '✓ New threat data loaded', color: 'var(--green)' })
    } catch {
      setToast({ msg: '✗ Refresh failed', color: 'var(--red)' })
    } finally {
      setSpinning(false)
      setTimeout(() => setToast(null), 3500)
    }
  }

  const handleExport = () => {
    onExport?.()
    setToast({ msg: '✓ CSV downloaded', color: 'var(--green)' })
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <header style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 48,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Shield icon */}
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>ThreatSense AI</span>
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>|</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Security Operations Center
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Scenarios tracker */}
          <div style={{ display: 'flex', gap: 6, paddingRight: 10, borderRight: '1px solid var(--border-mid)' }}>
            <span className="scenario-pill cold-start" title="Tracking Users < 15 logs">❄️ Cold Start Tracker</span>
            <span className="scenario-pill concept-drift" title="Tracking Behavior Shifts">⚠️ Concept Drift Tracker</span>
          </div>

          <div className={`status-pill ${status.cls}`}>
            <span className="animate-blink" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: status.dot, display: 'inline-block',
            }} />
            System: {status.label}
          </div>

          <button className="btn-ghost" onClick={handleRefresh} disabled={spinning}>
            <svg
              width="13" height="13" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}
              style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {spinning ? 'Regenerating…' : 'Refresh'}
          </button>

          <button className="btn-primary" onClick={handleExport}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>


      {toast && (
        <div style={{
          position: 'absolute', top: 56, right: 24, zIndex: 50,
          padding: '7px 14px', borderRadius: 6,
          background: 'var(--bg-elevated)',
          border: `1px solid ${toast.color}33`,
          color: toast.color, fontSize: 12, fontWeight: 500,
          animation: 'toastIn 0.18s ease-out',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}
    </header>
  )
}
