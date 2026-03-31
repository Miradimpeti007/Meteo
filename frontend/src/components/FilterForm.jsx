import { useState } from 'react'

const INDICE_MIN = 0
const INDICE_MAX = 100

export default function FilterForm({ onFilter, loading }) {
  const [mode, setMode] = useState('latest')      // 'latest' | 'period'
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [indiceMin, setIndiceMin] = useState('')
  const [indiceMax, setIndiceMax] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const filters = { mode }
    if (mode === 'period') {
      if (!start || !end) return
      filters.start = start
      filters.end = end
    }
    // Le backend stocke les indices sur 0–10, on divise par 10 avant d'envoyer
    if (indiceMin !== '') filters.indice_min = Number(indiceMin) / 10
    if (indiceMax !== '') filters.indice_max = Number(indiceMax) / 10
    onFilter(filters)
  }

  function handleReset() {
    setMode('latest')
    setStart('')
    setEnd('')
    setIndiceMin('')
    setIndiceMax('')
    onFilter({ mode: 'latest' })
  }

  return (
    <form className="filter-form" onSubmit={handleSubmit}>
      <h2 className="filter-title">Filtres</h2>

      {/* ── Mode ── */}
      <div className="filter-group">
        <label className="filter-label">Période</label>
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${mode === 'latest' ? 'active' : ''}`}
            onClick={() => setMode('latest')}
          >
            Temps réel
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'period' ? 'active' : ''}`}
            onClick={() => setMode('period')}
          >
            Plage de dates
          </button>
        </div>
      </div>

      {/* ── Date range ── */}
      {mode === 'period' && (
        <div className="filter-group">
          <label className="filter-label">Du</label>
          <input
            className="filter-input"
            type="datetime-local"
            value={start}
            onChange={e => setStart(e.target.value)}
            required
          />
          <label className="filter-label" style={{ marginTop: 8 }}>Au</label>
          <input
            className="filter-input"
            type="datetime-local"
            value={end}
            onChange={e => setEnd(e.target.value)}
            required
          />
          <p className="filter-hint">
            En mode plage, l'indice affiché est la <strong>moyenne</strong> par site sur la période.
          </p>
        </div>
      )}

      {/* ── Indice range ── */}
      <div className="filter-group">
        <label className="filter-label">Indice (0 – 100)</label>
        <div className="range-row">
          <input
            className="filter-input"
            type="number"
            min={INDICE_MIN}
            max={INDICE_MAX}
            step="1"
            placeholder="Min"
            value={indiceMin}
            onChange={e => setIndiceMin(e.target.value)}
          />
          <span className="range-sep">—</span>
          <input
            className="filter-input"
            type="number"
            min={INDICE_MIN}
            max={INDICE_MAX}
            step="1"
            placeholder="Max"
            value={indiceMax}
            onChange={e => setIndiceMax(e.target.value)}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="filter-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Chargement…' : 'Appliquer'}
        </button>
        <button className="btn-secondary" type="button" onClick={handleReset}>
          Réinitialiser
        </button>
      </div>

      {/* ── Legend ── */}
      <div className="legend">
        <p className="filter-label">Légende</p>
        {[
          { label: '0 – 20 : Très bon',      color: '#4caf50' },
          { label: '20 – 40 : Bon',           color: '#8bc34a' },
          { label: '40 – 60 : Moyen',         color: '#ff9800' },
          { label: '60 – 80 : Mauvais',       color: '#ff5722' },
          { label: '80 – 100 : Très mauvais', color: '#f44336' },
        ].map(({ label, color }) => (
          <div className="legend-item" key={label}>
            <span className="legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </form>
  )
}
