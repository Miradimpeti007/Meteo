import { useState, useEffect } from 'react'
import MapView from '../components/MapView.jsx'
import FilterForm from '../components/FilterForm.jsx'

export default function Home() {
  const [rows,      setRows]      = useState([])
  const [avgMode,   setAvgMode]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [indiceMin, setIndiceMin] = useState(null)   // échelle 0–10 (backend)
  const [indiceMax, setIndiceMax] = useState(null)

  // Filtre côté client sur l'indice (×10 pour affichage, stocké en 0–10)
  const visibleRows = rows.filter(row => {
    const val = Number(avgMode ? row.indice_moyen : row.indice)
    if (indiceMin !== null && val < indiceMin) return false
    if (indiceMax !== null && val > indiceMax) return false
    return true
  })

  // Charge les données temps-réel au montage
  useEffect(() => { fetchLatest() }, [])

  async function fetchLatest() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/latest')
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setRows(data.rows ?? [])
      setAvgMode(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFilter(filters) {
    setLoading(true)
    setError(null)

    // Mémoriser les bornes d'indice (déjà en 0–10 depuis FilterForm)
    setIndiceMin(filters.indice_min ?? null)
    setIndiceMax(filters.indice_max ?? null)

    try {
      if (filters.mode === 'latest') {
        await fetchLatest()
        return
      }

      // Mode période → indice moyen par site
      const params = new URLSearchParams({
        start: filters.start.replace('T', ' '),
        end:   filters.end.replace('T', ' '),
        avg:   'true',
      })

      const res = await fetch(`/api/data?${params}`)
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setRows(data.rows ?? [])
      setAvgMode(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🌿</span>
          <h1 className="sidebar-title">Qualité de l'air</h1>
        </div>
        <FilterForm onFilter={handleFilter} loading={loading} />
      </aside>

      <main className="map-area">
        <MapView rows={visibleRows} avgMode={avgMode} loading={loading} error={error} />
      </main>
    </div>
  )
}
