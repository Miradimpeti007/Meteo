const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json())

const FRONTEND_DATA = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'stations_features.json')
const BACKEND_DATA = path.join(__dirname, 'data', 'stations_features.json')

function loadStations() {
  try {
    if (fs.existsSync(FRONTEND_DATA)) {
      return JSON.parse(fs.readFileSync(FRONTEND_DATA, 'utf8'))
    }
  } catch (e) {
    console.warn('Could not load frontend stations file:', e.message)
  }
  try {
    if (fs.existsSync(BACKEND_DATA)) {
      return JSON.parse(fs.readFileSync(BACKEND_DATA, 'utf8'))
    }
  } catch (e) {
    console.warn('Could not load backend stations file:', e.message)
  }
  return []
}

let stations = loadStations()

function toFeatureCollection(features) {
  return { type: 'FeatureCollection', features: features }
}

function parseBBox(bboxStr) {
  // expect: minLng,minLat,maxLng,maxLat
  if (!bboxStr) return null
  const parts = bboxStr.split(',').map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) return null
  return { minLng: parts[0], minLat: parts[1], maxLng: parts[2], maxLat: parts[3] }
}

function pointInBbox(coords, bbox) {
  const [lng, lat] = coords
  return lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat
}

function haversineDistance([lng1, lat1], [lng2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371 // km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getProperty(keys, props) {
  for (const k of keys) if (props && Object.prototype.hasOwnProperty.call(props, k)) return props[k]
  return undefined
}

app.get('/api/stations', (req, res) => {
  const { startDate, endDate, minIndex, maxIndex, bbox, lat, lon, radius } = req.query

  const bboxObj = parseBBox(bbox)
  const latNum = lat ? Number(lat) : null
  const lonNum = lon ? Number(lon) : null
  const radiusKm = radius ? Number(radius) : null

  const sDate = startDate ? new Date(startDate) : null
  const eDate = endDate ? new Date(endDate) : null

  const minIdx = minIndex ? Number(minIndex) : null
  const maxIdx = maxIndex ? Number(maxIndex) : null

  const dateKeys = ['date', 'timestamp', 'time']
  const indexKeys = ['meanIndex', 'index', 'indice', 'Indice', 'IndiceMoyen']

  const filtered = (Array.isArray(stations) ? stations : (stations.features || [])).filter((feature) => {
    const props = feature.properties || {}
    const coords = (feature.geometry && feature.geometry.coordinates) || null
    if (!coords) return false

    // bbox filter
    if (bboxObj) {
      if (!pointInBbox(coords, bboxObj)) return false
    }

    // radius filter
    if (latNum !== null && lonNum !== null && radiusKm != null) {
      const dist = haversineDistance([lonNum, latNum], coords)
      if (dist > radiusKm) return false
    }

    // date filter (optional, only if feature has date)
    const dateVal = getProperty(dateKeys, props)
    if ((sDate || eDate) && dateVal) {
      const fDate = new Date(dateVal)
      if (sDate && fDate < sDate) return false
      if (eDate && fDate > eDate) return false
    }

    // index filter (optional)
    const idxVal = getProperty(indexKeys, props)
    if ((minIdx !== null || maxIdx !== null) && idxVal !== undefined) {
      const num = Number(idxVal)
      if (!isNaN(minIdx) && num < minIdx) return false
      if (!isNaN(maxIdx) && num > maxIdx) return false
    }

    return true
  })

  res.json(toFeatureCollection(filtered))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Meteo backend listening on http://localhost:${PORT}`)
})
