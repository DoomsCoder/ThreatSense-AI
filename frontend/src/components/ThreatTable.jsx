import { useState, useMemo } from 'react'

const THREAT_CLS = {
  'Brute Force':       'brute-force',
  'Impossible Travel': 'impossible-travel',
  'Device Spoofing':   'device-spoofing',
  'Lateral Movement':  'lateral-movement',
  'Credential Misuse': 'credential-misuse',
}

function riskClass(s) {
  if (s >= 70) return 'critical'
  if (s >= 50) return 'high'
  if (s >= 30) return 'medium'
  return 'low'
}

function SortIcon({ active, asc }) {
  if (!active) return <span style={{ color: 'var(--text-3)', marginLeft: 3 }}>↕</span>
  return <span style={{ color: 'var(--blue)', marginLeft: 3 }}>{asc ? '↑' : '↓'}</span>
}

const PAGE_SIZE = 12
const TYPES = ['All', 'Brute Force', 'Impossible Travel', 'Device Spoofing', 'Lateral Movement', 'Credential Misuse']

function ThreatRow({ t, onSelect }) {
  const cls   = THREAT_CLS[t.anomaly_type] || ''
  const score = parseFloat(t.risk_score) || 0
  const time  = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <tr onClick={() => onSelect(t)}>
      <td><span className="log-id">LOG-{t.id}</span></td>
      <td style={{ color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{time}</td>
      <td>
        <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{t.user_id}</span>
        <span style={{ color: 'var(--text-3)', marginLeft: 6, fontFamily: 'monospace', fontSize: 11 }}>
          {t.ip_address}
        </span>
        <span className="country-badge">{t.location_country}</span>
      </td>
      <td style={{ color: 'var(--text-2)' }}>{t.location_city}</td>
      <td>
        {cls && <span className={`threat-pill ${cls}`}>{t.anomaly_type}</span>}
      </td>
      <td>
        <span style={{
          fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
          color: t.privilege_level === 'admin' ? '#a78bfa' : 'var(--text-3)',
        }}>
          {t.privilege_level}
        </span>
      </td>
      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`risk-num ${riskClass(score)}`}>{score.toFixed(0)}</span>
        {t.cold_start && <span className="scenario-pill cold-start" title="Cold Start: User has < 15 logs">❄️ Cold Start</span>}
        {t.concept_drift_flag && <span className="scenario-pill concept-drift" title="Concept Drift: Behavior shift detected">⚠️ Drift</span>}
      </td>
    </tr>
  )
}

export default function ThreatTable({ threats, onSelect }) {
  const [search,    setSearch]  = useState('')
  const [typeFilter, setType]   = useState('All')
  const [sortField, setSort]    = useState('risk_score')
  const [sortAsc,   setSortAsc] = useState(false)
  const [page,      setPage]    = useState(1)

  const filtered = useMemo(() => {
    if (!Array.isArray(threats)) return []
    let rows = [...threats]
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.user_id?.toLowerCase().includes(q) ||
        r.ip_address?.toLowerCase().includes(q) ||
        r.location_city?.toLowerCase().includes(q) ||
        r.location_country?.toLowerCase().includes(q)
      )
    }
    if (typeFilter !== 'All') rows = rows.filter(r => r.anomaly_type === typeFilter)
    rows.sort((a, b) => {
      let av = a[sortField], bv = b[sortField]
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return rows
  }, [threats, search, typeFilter, sortField, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (f) => {
    if (sortField === f) setSortAsc(p => !p)
    else { setSort(f); setSortAsc(false) }
    setPage(1)
  }

  return (
    <div className="card animate-fade-in" style={{ overflow: 'hidden' }}>
      {/* ── Table Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Threat Event Log
          </span>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            {filtered.length} events - click any row for AI analysis
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}
                 width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search user / IP / location…"
              className="soc-input"
              style={{ paddingLeft: 26, width: 210 }}
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => { setType(e.target.value); setPage(1) }}
            className="soc-input"
            style={{ paddingRight: 8 }}
          >
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Live feed badge */}
          <span style={{
            padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.25)', color: 'var(--green)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span className="animate-blink" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Live feed
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table className="soc-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('id')} style={{ paddingLeft: 16 }}>
                Log ID <SortIcon active={sortField === 'id'} asc={sortAsc} />
              </th>
              <th className="sortable" onClick={() => handleSort('timestamp')}>
                Time <SortIcon active={sortField === 'timestamp'} asc={sortAsc} />
              </th>
              <th className="sortable" onClick={() => handleSort('user_id')}>
                User / Source <SortIcon active={sortField === 'user_id'} asc={sortAsc} />
              </th>
              <th>Location</th>
              <th className="sortable" onClick={() => handleSort('anomaly_type')}>
                Threat Type <SortIcon active={sortField === 'anomaly_type'} asc={sortAsc} />
              </th>
              <th>Privilege</th>
              <th className="sortable" onClick={() => handleSort('risk_score')}>
                Risk Score <SortIcon active={sortField === 'risk_score'} asc={sortAsc} />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                  No events match your filters
                </td>
              </tr>
            ) : (
              paginated.map(t => <ThreatRow key={t.id} t={t} onSelect={onSelect} />)
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
            Page {page}/{totalPages} · {filtered.length} results
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost" style={{ padding: '3px 10px' }}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              ← Prev
            </button>
            <button className="btn-ghost" style={{ padding: '3px 10px' }}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
