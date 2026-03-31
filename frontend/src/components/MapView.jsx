import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const FRANCE_CENTER = [46.5, 2.3]
const DEFAULT_ZOOM  = 6

// ── Couleur selon la valeur de l'indice (0–100) ─────────────────────────────
function indiceColor(val) {
  if (val <= 20)  return '#4caf50'
  if (val <= 40)  return '#8bc34a'
  if (val <= 60)  return '#ff9800'
  if (val <= 80)  return '#ff5722'
  return '#f44336'
}

// ── Icône cercle avec l'indice à l'intérieur ─────────────────────────────────
function circleIcon(indice) {
  const color = indiceColor(indice)
  const label = Math.round(indice)
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:40px;height:40px;
        border-radius:50%;
        background:${color};
        border:2px solid rgba(0,0,0,0.25);
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-weight:700;font-size:11px;
        font-family:system-ui,sans-serif;
        pointer-events:auto;
      ">${label}</div>
    `,
    iconSize:   [40, 40],
    iconAnchor: [20, 20],
    popupAnchor:[0, -22],
  })
}

// ── Reset vue ────────────────────────────────────────────────────────────────
function ResetView({ rows }) {
  const map = useMap()
  useEffect(() => {
    if (!rows.length) return
    const lats = rows.map(r => r.lat)
    const lons = rows.map(r => r.lon)
    map.fitBounds([
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ], { padding: [40, 40] })
  }, [rows])        // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ── Popup content ────────────────────────────────────────────────────────────
function SitePopup({ row, avgMode }) {
  const raw    = Number(avgMode ? row.indice_moyen : row.indice)
  const indice = raw * 10
  return (
    <div className="map-popup">
      <p className="popup-name">{row.nom}</p>
      <div className="popup-badge" style={{ background: indiceColor(indice) }}>
        Indice {Math.round(indice)} / 100
      </div>
      <table className="popup-table">
        <tbody>
          <tr><td>Latitude</td><td>{Number(row.lat).toFixed(4)}</td></tr>
          <tr><td>Longitude</td><td>{Number(row.lon).toFixed(4)}</td></tr>
          {avgMode ? (
            <>
              <tr><td>Indice min</td><td>{Math.round(Number(row.indice_min) * 10)}</td></tr>
              <tr><td>Indice max</td><td>{Math.round(Number(row.indice_max) * 10)}</td></tr>
              <tr><td>Mesures</td><td>{row.nb_mesures}</td></tr>
              <tr><td>Première mesure</td><td>{fmtDate(row.premiere_mesure)}</td></tr>
              <tr><td>Dernière mesure</td><td>{fmtDate(row.derniere_mesure)}</td></tr>
            </>
          ) : (
            <tr><td>Heure UTC</td><td>{fmtDate(row.hour_utc)}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function MapView({ rows, avgMode, loading, error }) {
  return (
    <div className="map-wrapper">
      {loading && <div className="map-overlay">Chargement…</div>}
      {error   && <div className="map-overlay error">{error}</div>}

      <MapContainer
        center={FRANCE_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {rows.length > 0 && <ResetView rows={rows} />}

        {rows.map((row, i) => {
          const indice = avgMode ? row.indice_moyen : row.indice
          if (indice == null || row.lat == null || row.lon == null) return null
          return (
            <Marker
              key={`${row.nom}-${i}`}
              position={[row.lat, row.lon]}
              icon={circleIcon(indice*10)}
            >
              <Popup minWidth={220}>
                <SitePopup row={row} avgMode={avgMode} />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      <div className="map-counter">
        {rows.length} site{rows.length !== 1 ? 's' : ''} affiché{rows.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
