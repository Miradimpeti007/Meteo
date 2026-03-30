import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const Map = () => {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = L.map(mapContainer.current, {
      minZoom: 2.5,
      maxZoom: 19,
      worldCopyJump: true,
    }).setView([48.8566, 2.3522], 13)
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      noWrap: false,
    }).addTo(map.current)
  }, [])
  setTimeout(() => {
    map.current.invalidateSize()
  }, 100)

  return <div ref={mapContainer} style={{ width: '100%', height: '500px' }} />
}

export default Map
