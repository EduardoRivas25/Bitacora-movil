import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, DimensionValue } from 'react-native';
import { Device, Building } from '../../types';

interface MapProps {
  center?: [number, number]; // [lng, lat] o [lat, lng]
  zoom?: number;
  devices?: Device[];
  buildings?: Building[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (device: Device) => void;
  height?: DimensionValue;
}

export function Map({
  center = [-99.1332, 19.4326],
  zoom = 16,
  devices = [],
  buildings = [],
  onSelectDevice,
  height = 420,
}: MapProps) {
  // Manejo de coordenadas [lng, lat] vs [lat, lng]
  const lat = Math.abs(center[0]) > Math.abs(center[1]) ? center[1] : center[0];
  const lng = Math.abs(center[0]) > Math.abs(center[1]) ? center[0] : center[1];

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

        /* Controles de Zoom y Capas */
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: #1a1a22 !important;
          color: #FFFFFF !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
          font-size: 16px !important;
        }
        .leaflet-bar a:hover {
          background-color: #262634 !important;
          color: #0A84FF !important;
        }

        /* Selector de Capas (Oscuro / Satélite) */
        .layer-switcher {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 1000;
          display: flex;
          gap: 6px;
          background: rgba(18, 18, 24, 0.9);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
        }
        .layer-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .layer-btn.active {
          background: #0A84FF;
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(10, 132, 255, 0.4);
        }

        /* 📍 Pines de Equipos de Red */
        .device-pin {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 4px 10px 4px 5px;
          background: rgba(20, 20, 26, 0.95);
          border: 1.5px solid rgba(255, 255, 255, 0.16);
          border-radius: 20px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
          white-space: nowrap;
        }
        .device-pin:hover {
          transform: translateY(-5px) scale(1.08);
          border-color: #0A84FF;
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
        }
        .pin-ip {
          font-size: 9.5px;
          font-family: monospace;
          color: #94A3B8;
        }

        /* Colores temáticos elegantes por tipo */
        .theme-switch { background: #1E40AF; } /* Azul corporativo */
        .theme-router { background: #6D28D9; } /* Púrpura */
        .theme-server { background: #047857; } /* Verde esmeralda oscuro */
        .theme-ap { background: #D97706; }     /* Ámbar */
        .theme-firewall { background: #B91C1C; } /* Rojo carmesí */
        .theme-pc { background: #475569; }       /* Grafito */

        /* 🏢 Etiquetas de Edificios */
        .building-label {
          background: rgba(14, 14, 18, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 8px;
          padding: 4px 10px;
          color: #F8FAFC;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
          letter-spacing: 0.3px;
        }

        /* 💬 Popups Informativos */
        .leaflet-popup-content-wrapper {
          background: #14141a !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          border-radius: 16px !important;
          color: #FFFFFF !important;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8) !important;
          padding: 6px !important;
        }
        .leaflet-popup-tip {
          background: #14141a !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
        }
        .popup-header-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .popup-dev-name { font-size: 14px; font-weight: 700; color: #FFFFFF; }
        .popup-ip-chip {
          display: inline-block;
          font-family: monospace;
          background: rgba(10, 132, 255, 0.18);
          border: 1px solid rgba(10, 132, 255, 0.3);
          color: #60A5FA;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .popup-data-row { font-size: 12px; color: #94A3B8; margin-bottom: 3px; }
        .popup-val-bold { color: #FFFFFF; font-weight: 600; }
        .leaflet-control-attribution {
          background: rgba(10, 10, 14, 0.8) !important;
          color: #64748B !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a { color: #94A3B8 !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="layer-switcher">
        <button id="btnDark" class="layer-btn active" onclick="switchLayer('dark')">🌙 Oscuro HD</button>
        <button id="btnSat" class="layer-btn" onclick="switchLayer('sat')">🛰️ Satélite</button>
      </div>

      <script>
        const devices = ${serializedDevices};
        const buildings = ${serializedBuildings};

        // 1. Inicializar mapa con soporte de alto zoom (hasta nivel 20)
        const map = L.map('map', {
          center: [${lat}, ${lng}],
          zoom: ${zoom},
          minZoom: 4,
          maxZoom: 20,
          zoomControl: true,
          attributionControl: true
        });

        // 2. Capas de mapas de alta calidad (100% libres sin API Key)
        // Capa Oscura HD Nítida (CartoDB Dark Matter Retina)
        const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(map);

        // Capa Satélite HD Nítida (Esri World Imagery)
        const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics'
        });

        function switchLayer(type) {
          if (type === 'dark') {
            map.removeLayer(satLayer);
            map.addLayer(darkLayer);
            document.getElementById('btnDark').classList.add('active');
            document.getElementById('btnSat').classList.remove('active');
          } else {
            map.removeLayer(darkLayer);
            map.addLayer(satLayer);
            document.getElementById('btnSat').classList.add('active');
            document.getElementById('btnDark').classList.remove('active');
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

        // 4. Marcadores de Edificios
        buildings.forEach(bld => {
          if (bld.latitude && bld.longitude) {
            const icon = L.divIcon({
              className: 'custom-bld-icon',
              html: '<div class="building-label">🏢 ' + (bld.code || bld.name.split(' - ')[0]) + '</div>',
              iconSize: [110, 26],
              iconAnchor: [55, 13]
            });
            L.marker([bld.latitude, bld.longitude], { icon }).addTo(map)
              .bindPopup('<div><div class="popup-dev-name">' + bld.name + '</div><div class="popup-data-row">' + (bld.description || '') + '</div><div class="popup-data-row" style="margin-top:6px;"><b>Departamentos:</b> <span class="popup-val-bold">' + (bld.departments ? bld.departments.map(d => d.name).join(', ') : 'Ninguno') + '</span></div></div>');
          }
        });

        // 5. Marcadores de Dispositivos con Identificación y Zoom Alto
        devices.forEach(dev => {
          if (dev.latitude && dev.longitude) {
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

            L.marker([dev.latitude, dev.longitude], { icon })
              .addTo(map)
              .bindPopup(popupContent);
          }
        });
      </script>
    </body>
    </html>
  `, [lat, lng, zoom, serializedDevices, serializedBuildings]);

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
