import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import stationsData from '../assets/stations_features.json';

// Giữ nguyên 3 trạng thái màu sắc của bạn
const getPollutionColor = (index) => {
  if (index >= 1 && index < 3) return '#33cc33'; // Vert - Bon
  if (index >= 3 && index < 7) return '#ff9900'; // Orange - Moyen
  if (index >= 7 && index <= 10) return '#ff3300'; // Rouge - Mauvais
  return '#999999';
};

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const markersLayer = useRef(L.layerGroup());

  useEffect(() => {
    if (map.current) return;

    // Khởi tạo bản đồ với tính năng cuộn vô hạn (worldCopyJump)
    map.current = L.map(mapContainer.current, {
      minZoom: 3,
      maxZoom: 19,
      worldCopyJump: true, // Cuộn vô hạn như Google Maps
    }).setView([46.6033, 1.8883], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      noWrap: false, // Cho phép lặp lại bản đồ thế giới
    }).addTo(map.current);

    markersLayer.current.addTo(map.current);

    // Hiển thị các trạm từ dữ liệu
    renderMarkers();

    // Fix lỗi hiển thị kích thước
    setTimeout(() => {
      map.current.invalidateSize();
    }, 100);

    // Lắng nghe sự kiện zoom để thay đổi kích thước bong bóng
    const handleZoom = () => {
      const zoom = map.current.getZoom();
      const icons = document.querySelectorAll('.custom-pollution-icon div');
      icons.forEach(icon => {
        const size = zoom * 4;
        if (size > 10) {
          icon.style.width = `${size}px`;
          icon.style.height = `${size}px`;
          icon.style.fontSize = `${size / 2.5}px`;
        }
      });
    };

    map.current.on('zoomend', handleZoom);
  }, []);

  const renderMarkers = (filterText = '') => {
    markersLayer.current.clearLayers();
    const features = stationsData.features || stationsData;

    features.forEach(station => {
      if (!station.geometry || !station.geometry.coordinates) return;
      
      const [lng, lat] = station.geometry.coordinates;
      const name = station.properties?.Nom || station.properties?.name || "Station";

      // Lọc theo tên trạm
      if (filterText && !name.toLowerCase().includes(filterText.toLowerCase())) return;
      
      const pollutionIndex = parseFloat(((Math.random() * 9) + 1).toFixed(1));
      const color = getPollutionColor(pollutionIndex);

      const customIcon = L.divIcon({
        className: 'custom-pollution-icon',
        html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; border: 2px solid rgba(255,255,255,0.5); box-shadow: 0 0 5px rgba(0,0,0,0.3); transition: all 0.2s ease;">${pollutionIndex}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([lat, lng], { icon: customIcon })
        .addTo(markersLayer.current)
        .bindPopup(`<strong>${name}</strong><br>Indice de pollution: ${pollutionIndex}`);
    });
  };

  // Xử lý khi người dùng gõ tìm kiếm
  const onSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    renderMarkers(value);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      
      {/* Barre de recherche et date (Thanh tìm kiếm và ngày) */}
      <div style={{
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, display: 'flex', gap: '10px', background: 'white',
        padding: '10px 20px', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        width: '80%', maxWidth: '700px', alignItems: 'center'
      }}>
        <input 
          type="text" 
          placeholder="Rechercher une station..." 
          value={searchTerm}
          onChange={onSearchChange}
          style={{ flex: 2, border: 'none', outline: 'none', fontSize: '16px' }}
        />
        <div style={{ width: '1px', height: '25px', background: '#ccc' }}></div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', cursor: 'pointer', color: '#666' }}
        />
        <button style={{ 
          background: '#33cc33', color: 'white', border: 'none', 
          borderRadius: '20px', padding: '8px 20px', cursor: 'pointer', fontWeight: 'bold' 
        }}>
          Filtrer
        </button>
      </div>

      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default Map;