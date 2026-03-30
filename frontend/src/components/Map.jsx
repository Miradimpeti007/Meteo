import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import stationsData from '../assets/stations_features.json'

const getPollutionColor = (index) => {
  if (index >= 1 && index < 3) return '#33cc33'
  if (index >= 3 && index < 7) return '#ff9900'
  if (index >= 7 && index <= 10) return '#ff3300'
  return '#999999'
}

const Map = () => {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = L.map(mapContainer.current, {
      minZoom: 3,
      maxZoom: 19,
    }).setView([46.6033, 1.8883], 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      noWrap: true,
    }).addTo(map.current)

    const features = stationsData.features || stationsData

    features.forEach(station => {
      if (!station.geometry || !station.geometry.coordinates) return
      
      const [lng, lat] = station.geometry.coordinates
      const name = station.properties?.Nom || station.properties?.name || "Station"
      
      const pollutionIndex = parseFloat(((Math.random() * 9) + 1).toFixed(1))
      const color = getPollutionColor(pollutionIndex)

      const customIcon = L.divIcon({
        className: 'custom-pollution-icon',
        html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; border: 2px solid rgba(255,255,255,0.5); box-shadow: 0 0 5px rgba(0,0,0,0.3); transition: all 0.2s ease;">${pollutionIndex}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })

      L.marker([lat, lng], { icon: customIcon })
        .addTo(map.current)
        .bindPopup(`<strong>${name}</strong><br>Indice: ${pollutionIndex}`)
    })

    const handleZoom = () => {
      const zoom = map.current.getZoom()
      const icons = document.querySelectorAll('.custom-pollution-icon div')
      icons.forEach(icon => {
        const size = zoom * 4
        if (size > 10) {
            icon.style.width = `${size}px`
            icon.style.height = `${size}px`
            icon.style.fontSize = `${size / 2.5}px`
        }
      })
    }

    map.current.on('zoomend', handleZoom)
  }, [])

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />
}

export default Map