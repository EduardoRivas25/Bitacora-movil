import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, DimensionValue } from 'react-native';
import { Device, Building } from '../../types';

interface MapProps {
  center?: [number, number]; // [lat, lng] o [lng, lat]
  zoom?: number;
  devices?: Device[];
  buildings?: Building[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (device: Device) => void;
  height?: DimensionValue;
}

export function Map({
  center,
  zoom = 17,
  devices = [],
  buildings = [],
  onSelectDevice,
  height = 420,
}: MapProps) {
  // Determinar centro por defecto basado en los edificios registrados
  const computedCenter = useMemo((): [number, number] => {
    if (center) {
      const lat = Math.abs(center[0]) > Math.abs(center[1]) ? center[1] : center[0];
      const lng = Math.abs(center[0]) > Math.abs(center[1]) ? center[0] : center[1];
      return [lat, lng];
    }

    const validBlds = buildings.filter(b => b.latitude && b.longitude);
    if (validBlds.length > 0) {
      const avgLat = validBlds.reduce((acc, b) => acc + b.latitude, 0) / validBlds.length;
      const avgLng = validBlds.reduce((acc, b) => acc + b.longitude, 0) / validBlds.length;
      return [avgLat, avgLng];
    }

    const validDevs = devices.filter(d => d.latitude && d.longitude);
    if (validDevs.length > 0) {
      const avgLat = validDevs.reduce((acc, d) => acc + d.latitude!, 0) / validDevs.length;
      const avgLng = validDevs.reduce((acc, d) => acc + d.longitude!, 0) / validDevs.length;
      return [avgLat, avgLng];
    }

    return [19.4326, -99.1332];
  }, [center, buildings, devices]);

  const [lat, lng] = computedCenter;
  const hasExplicitCenter = Boolean(center);

  const serializedDevices = useMemo(() => JSON.stringify(devices), [devices]);
  const serializedBuildings = useMemo(() => JSON.stringify(buildings), [buildings]);

  const mapHtml = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; background: #0b0b0e; }
        .leaflet-container { background: #0b0b0e !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

        /* Controles de Zoom */
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: rgba(18, 18, 24, 0.92) !important;
          color: #FFFFFF !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 16px !important;
          backdrop-filter: blur(12px);
        }
        .leaflet-bar a:hover {
          background-color: #0A84FF !important;
          color: #FFFFFF !important;
        }

        /* Selector de Capas (Oscuro / Satélite HD / Híbrido) */
        .layer-switcher {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 1000;
          display: flex;
          gap: 6px;
          background: rgba(14, 14, 20, 0.88);
          padding: 5px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(16px);
        }
        .layer-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          font-size: 11px;
          font-weight: 600;
          padding: 7px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .layer-btn.active {
          background: #0A84FF;
          color: #FFFFFF;
          font-weight: 700;
          box-shadow: 0 3px 12px rgba(10, 132, 255, 0.5);
        }

        /* 📍 Pines de Equipos de Red */
        .device-pin {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 4px 10px 4px 5px;
          background: rgba(12, 12, 18, 0.94);
          border: 1.5px solid rgba(255, 255, 255, 0.22);
          border-radius: 20px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.8), 0 0 10px rgba(10, 132, 255, 0.25);
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
          white-space: nowrap;
          backdrop-filter: blur(8px);
        }
        .device-pin:hover {
          transform: translateY(-5px) scale(1.08);
          border-color: #0A84FF;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.9), 0 0 16px rgba(10, 132, 255, 0.6);
          z-index: 9999 !important;
        }
        .pin-avatar {
          width: 26px;
          height: 26px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 1px 2px rgba(255,255,255,0.3);
        }
        .pin-avatar svg {
          width: 14px;
          height: 14px;
          fill: none;
          stroke: #ffffff;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .pin-text-block {
          display: flex;
          flex-direction: column;
        }
        .pin-name {
          font-size: 11px;
          font-weight: 700;
          color: #FFFFFF;
          line-height: 13px;
          text-shadow: 0 1px 3px rgba(0,0,0,0.9);
        }
        .pin-ip {
          font-size: 9.5px;
          font-family: monospace;
          color: #60A5FA;
          font-weight: 600;
        }

        /* Colores temáticos elegantes por tipo */
        .theme-switch { background: #0A84FF; }
        .theme-router { background: #BF5AF2; }
        .theme-server { background: #30D158; }
        .theme-ap { background: #FF9F0A; }
        .theme-firewall { background: #FF453A; }
        .theme-pc { background: #64D2FF; }

        /* 🏢 Etiquetas de Edificios Ultra-Visibles */
        .building-label {
          background: rgba(10, 12, 18, 0.95);
          border: 1.8px solid #0A84FF;
          border-radius: 12px;
          padding: 6px 14px;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.85), 0 0 14px rgba(10, 132, 255, 0.5);
          letter-spacing: 0.5px;
          white-space: nowrap;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .building-label:hover {
          border-color: #30D158;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.9), 0 0 18px rgba(48, 209, 88, 0.6);
        }

        /* 💬 Popups Informativos */
        .leaflet-popup-content-wrapper {
          background: #121218 !important;
          border: 1.5px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 18px !important;
          color: #FFFFFF !important;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.9) !important;
          padding: 8px !important;
        }
        .leaflet-popup-tip {
          background: #121218 !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        .popup-header-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .popup-dev-name { font-size: 14px; font-weight: 700; color: #FFFFFF; }
        .popup-ip-chip {
          display: inline-block;
          font-family: monospace;
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.4);
          color: #60A5FA;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .popup-data-row { font-size: 12px; color: #94A3B8; margin-bottom: 4px; }
        .popup-val-bold { color: #FFFFFF; font-weight: 600; }
        .leaflet-control-attribution {
          background: rgba(10, 10, 14, 0.85) !important;
          color: #64748B !important;
          font-size: 10px !important;
          border-radius: 6px 0 0 0;
        }
        .leaflet-control-attribution a { color: #94A3B8 !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="layer-switcher">
        <button id="btnDark" class="layer-btn active" onclick="switchLayer('dark')">🌙 Oscuro</button>
        <button id="btnSat" class="layer-btn" onclick="switchLayer('sat')">🛰️ Satélite HD</button>
        <button id="btnHybrid" class="layer-btn" onclick="switchLayer('hybrid')">🌐 Híbrido</button>
      </div>

      <script>
        const devices = ${serializedDevices};
        const buildings = ${serializedBuildings};

        // 1. Inicializar mapa
        const initialCenter = [${lat}, ${lng}];
        const map = L.map('map', {
          center: initialCenter,
          zoom: ${zoom},
          minZoom: 3,
          maxZoom: 21,
          zoomControl: true,
          attributionControl: true
        });

        // 2. Capas de alta definición
        const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 21,
          maxNativeZoom: 20,
          subdomains: 'abcd',
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        const googleSatLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          maxZoom: 21,
          maxNativeZoom: 20,
          subdomains: ['0', '1', '2', '3'],
          attribution: '&copy; Google Maps'
        });

        const googleHybridLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 21,
          maxNativeZoom: 20,
          subdomains: ['0', '1', '2', '3'],
          attribution: '&copy; Google Maps Satellite'
        });

        function clearLayers() {
          map.removeLayer(darkLayer);
          map.removeLayer(googleSatLayer);
          map.removeLayer(googleHybridLayer);
          document.getElementById('btnDark').classList.remove('active');
          document.getElementById('btnSat').classList.remove('active');
          document.getElementById('btnHybrid').classList.remove('active');
        }

        function switchLayer(type) {
          clearLayers();
          if (type === 'dark') {
            map.addLayer(darkLayer);
            document.getElementById('btnDark').classList.add('active');
          } else if (type === 'sat') {
            map.addLayer(googleSatLayer);
            document.getElementById('btnSat').classList.add('active');
          } else if (type === 'hybrid') {
            map.addLayer(googleHybridLayer);
            document.getElementById('btnHybrid').classList.add('active');
          }
        }

        // 3. SVGs vectoriales elegantes para cada equipo
        const SVG_ICONS = {
          switch: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/></svg>',
          router: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
          server: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
          ap: '<svg viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
          firewall: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
          pc: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
        };

        function getDevType(name) {
          const l = (name || '').toLowerCase();
          if (l.includes('switch')) return { class: 'theme-switch', svg: SVG_ICONS.switch };
          if (l.includes('router') || l.includes('gateway')) return { class: 'theme-router', svg: SVG_ICONS.router };
          if (l.includes('servidor') || l.includes('proliant')) return { class: 'theme-server', svg: SVG_ICONS.server };
          if (l.includes('point') || l.includes('unifi') || l.includes('ap')) return { class: 'theme-ap', svg: SVG_ICONS.ap };
          if (l.includes('firewall') || l.includes('fortigate')) return { class: 'theme-firewall', svg: SVG_ICONS.firewall };
          return { class: 'theme-pc', svg: SVG_ICONS.pc };
        }

        // Grupos de capas para visibilidad dinámica por nivel de zoom
        // Al alejarse, SIEMPRE se ven los edificios primero. Los equipos aparecen al hacer zoom.
        const buildingLayer = L.layerGroup().addTo(map);
        const deviceLayer = L.layerGroup();
        const DEVICE_MIN_ZOOM = 16; // Zoom a partir del cual aparecen los equipos

        const allCoords = [];

        // 4. Marcadores de Edificios (Siempre visibles en buildingLayer)
        buildings.forEach(bld => {
          if (bld.latitude && bld.longitude) {
            allCoords.push([bld.latitude, bld.longitude]);
            const icon = L.divIcon({
              className: 'custom-bld-icon',
              html: '<div class="building-label">🏢 ' + (bld.code || bld.name.split(' - ')[0]) + '</div>',
              iconSize: [130, 32],
              iconAnchor: [65, 16]
            });
            const marker = L.marker([bld.latitude, bld.longitude], { icon })
              .bindPopup('<div><div class="popup-dev-name">' + bld.name + '</div><div class="popup-data-row">' + (bld.description || '') + '</div><div class="popup-data-row" style="margin-top:6px;"><b>Departamentos:</b> <span class="popup-val-bold">' + (bld.departments ? bld.departments.map(d => d.name).join(', ') : 'Ninguno') + '</span></div></div>');
            
            marker.addTo(buildingLayer);
          }
        });

        // 5. Marcadores de Dispositivos (Se agregan a deviceLayer)
        devices.forEach(dev => {
          if (dev.latitude && dev.longitude) {
            allCoords.push([dev.latitude, dev.longitude]);
            const info = getDevType(dev.name);

            const pinHtml = 
              '<div class="device-pin">' +
                '<div class="pin-avatar ' + info.class + '">' + info.svg + '</div>' +
                '<div class="pin-text-block">' +
                  '<span class="pin-name">' + dev.name + '</span>' +
                  '<span class="pin-ip">' + (dev.ipv4_address || 'Sin IP') + '</span>' +
                '</div>' +
              '</div>';

            const icon = L.divIcon({
              className: 'custom-dev-pin',
              html: pinHtml,
              iconSize: [160, 36],
              iconAnchor: [80, 18]
            });

            const popupContent = 
              '<div>' +
                '<div class="popup-header-row">' +
                  '<div class="pin-avatar ' + info.class + '" style="width:22px;height:22px;">' + info.svg + '</div>' +
                  '<div class="popup-dev-name">' + dev.name + '</div>' +
                '</div>' +
                '<div class="popup-ip-chip">' + (dev.ipv4_address || 'Sin IP') + '</div>' +
                '<div class="popup-data-row">MAC: <span class="popup-val-bold">' + (dev.mac_address || 'N/A') + '</span></div>' +
                '<div class="popup-data-row">Fabricante: <span class="popup-val-bold">' + (dev.manufacturer || 'Genérico') + '</span></div>' +
                '<div class="popup-data-row">Ubicación: <span class="popup-val-bold">' + (dev.location || 'No asignada') + '</span></div>' +
                '<div class="popup-data-row">Subred: <span class="popup-val-bold">' + (dev.subnet_name || 'VLAN') + '</span></div>' +
              '</div>';

            const devMarker = L.marker([dev.latitude, dev.longitude], { icon })
              .bindPopup(popupContent);
            
            devMarker.addTo(deviceLayer);
          }
        });

        // Función para alternar equipos según nivel de zoom
        function updateDeviceVisibility() {
          const currentZoom = map.getZoom();
          if (currentZoom >= DEVICE_MIN_ZOOM) {
            if (!map.hasLayer(deviceLayer)) {
              map.addLayer(deviceLayer);
            }
          } else {
            if (map.hasLayer(deviceLayer)) {
              map.removeLayer(deviceLayer);
            }
          }
        }

        map.on('zoomend', updateDeviceVisibility);

        // 6. Centrado inicial en los edificios
        const hasExplicit = ${hasExplicitCenter};
        if (hasExplicit) {
          map.setView(initialCenter, ${zoom});
          updateDeviceVisibility();
        } else if (allCoords.length === 1) {
          map.setView(allCoords[0], 17);
          updateDeviceVisibility();
        } else if (allCoords.length > 1) {
          const bounds = L.latLngBounds(allCoords);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
          updateDeviceVisibility();
        } else {
          map.setView(initialCenter, ${zoom});
          updateDeviceVisibility();
        }
      </script>
    </body>
    </html>
  `, [lat, lng, zoom, hasExplicitCenter, serializedDevices, serializedBuildings]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <iframe
          srcDoc={mapHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 24,
            backgroundColor: '#0b0b0e',
          } as any}
          title="Mapa de Red Alta Definición"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.nativeFallback} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#0b0b0e',
  },
  nativeFallback: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
});
