import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const Map = () => {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = L.map(mapContainer.current, {
      minZoom: 3,
      maxZoom: 19,
      maxBounds: [[-85, -180], [85, 180]],
    }).setView([46.6033, 1.8883], 6)
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      noWrap: true,
    }).addTo(map.current)

    fetch("https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/OBS/SYNOP/postes_synop.geojson")
      .then(res => res.json())
      .then(data => {
        data.features.forEach(station => {
          const [lng, lat] = station.geometry.coordinates
          const { Nom, Altitude, Id } = station.properties

          L.marker([lat, lng])
            .addTo(map.current)
            .bindPopup(`
              <b>Station : ${Nom}</b><br>
              ID : ${Id}<br>
              Altitude : ${Altitude}m
            `)
        })
      })
      .catch(err => console.error("Erreur de chargement des données :", err))
  }, [])

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />
}

export default Map