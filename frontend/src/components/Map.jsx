import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import stationsData from '../assets/stations_features.json';

const getPollutionColor = (index) => {
  if (index >= 1 && index < 3) return '#33cc33'; 
  if (index >= 3 && index < 7) return '#ff9900'; 
  if (index >= 7 && index <= 10) return '#ff3300'; 
  return '#999999';
};

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersLayer = useRef(L.layerGroup());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('>'); 
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    if (map.current) return;

    const southWest = L.latLng(-85, -300);
    const northEast = L.latLng(85, 300);
    const bounds = L.latLngBounds(southWest, northEast);

    map.current = L.map(mapContainer.current, {
      minZoom: 3,
      maxZoom: 19,
      worldCopyJump: true,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0
    }).setView([46.6033, 1.8883], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      noWrap: false, 
    }).addTo(map.current);

    markersLayer.current.addTo(map.current);
    renderMarkers();

    setTimeout(() => map.current.invalidateSize(), 100);
  }, []);

  useEffect(() => {
    renderMarkers();
  }, [searchTerm, filterType, filterValue, selectedDate, selectedTime]);

  const renderMarkers = () => {
    markersLayer.current.clearLayers();
    const features = stationsData.features || stationsData;

    features.forEach(station => {
      if (!station.geometry || !station.geometry.coordinates) return;
      
      const [lng, lat] = station.geometry.coordinates;
      const name = station.properties?.Nom || "Station anonyme";
      const pollutionIndex = parseFloat(((Math.random() * 9) + 1).toFixed(1));

      const matchName = name.toLowerCase().includes(searchTerm.toLowerCase());
      let matchIndex = true;
      if (filterValue !== '') {
        const val = parseFloat(filterValue);
        if (filterType === '>') matchIndex = pollutionIndex > val;
        if (filterType === '<') matchIndex = pollutionIndex < val;
        if (filterType === '=') matchIndex = Math.floor(pollutionIndex) === val;
      }

      if (matchName && matchIndex) {
        const color = getPollutionColor(pollutionIndex);
        const customIcon = L.divIcon({
          className: 'custom-pollution-icon',
          html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">${pollutionIndex}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        L.marker([lat, lng], { icon: customIcon })
          .addTo(markersLayer.current)
          .bindPopup(`<strong>${name}</strong><br>Indice de pollution : ${pollutionIndex}`);
      }
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* BARRE DE RECHERCHE PRINCIPALE */}
      <div style={{
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: 'white', padding: '10px 20px', borderRadius: '50px',
        boxShadow: '0 4px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center',
        width: '95%', maxWidth: '850px', gap: '10px'
      }}>
        {/* Recherche Nom */}
        <div style={{ flex: 1.2, display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '8px', fontSize: '18px' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Station..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#3C4043' }}
          />
        </div>

        <div style={{ width: '1px', height: '25px', background: '#eee' }}></div>

        {/* Date et Heure - FIXED WIDTH & NO WRAP */}
        <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '18px' }}>📅</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#3C4043', cursor: 'pointer', background: 'transparent', width: '115px' }}
            />
          </div>
          
          <div style={{ width: '1px', height: '20px', background: '#DADCE0' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '18px' }}>Time</span>
            <input 
              type="time" 
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              style={{ 
                border: 'none', 
                outline: 'none', 
                fontSize: '13px', 
                color: '#3C4043', 
                cursor: 'pointer',
                background: 'transparent',
                width: '65px', // GIỚI HẠN ĐỘ DÀI Ô CHỌN GIỜ ĐỂ KHÔNG BỊ KHOẢNG TRẮNG
                padding: '0'
              }}
            />
          </div>
        </div>

        <div style={{ width: '1px', height: '25px', background: '#eee' }}></div>

        {/* Filtre Indice */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: showFilters ? '#f1f3f4' : 'white',
            border: '1px solid #DADCE0', borderRadius: '20px',
            padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '500', color: '#3C4043', transition: '0.2s', whiteSpace: 'nowrap'
          }}
        >
          <span>📊 Indice</span>
          <span style={{ fontSize: '10px' }}>{showFilters ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* MENU FILTRES */}
      {showFilters && (
        <div style={{
          position: 'absolute', top: '85px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, background: 'white', padding: '15px 20px', borderRadius: '15px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '15px',
          border: '1px solid #f0f0f0'
        }}>
          <span style={{ fontSize: '13px', color: '#5F6368', fontWeight: 'bold' }}>Pollution :</span>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '6px', borderRadius: '8px', border: '1px solid #DADCE0', outline: 'none', cursor: 'pointer' }}
          >
            <option value=">"> &gt; </option>
            <option value="<"> &lt; </option>
            <option value="="> = </option>
          </select>
          <input 
            type="number" 
            placeholder="Valeur" 
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            style={{ width: '70px', padding: '6px', borderRadius: '8px', border: '1px solid #DADCE0', outline: 'none' }}
          />
          <button 
            onClick={() => {setFilterValue(''); setSearchTerm(''); setSelectedTime(''); setSelectedDate('');}}
            style={{ background: 'none', border: 'none', color: '#D93025', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
          >
            Réinitialiser
          </button>
        </div>
      )}

      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default Map;