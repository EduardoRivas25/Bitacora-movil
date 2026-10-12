import * as api from './api';
import { Building, Device, DeviceConfig, Incident, Maintenance } from '../types';

export type ReportArea = 'networks' | 'devices' | 'buildings' | 'incidents' | 'maintenance' | 'activity' | 'complete';

export const REPORT_AREAS: { id: ReportArea; title: string }[] = [
  { id: 'networks', title: 'Gestión de red' },
  { id: 'devices', title: 'Dispositivos' },
  { id: 'buildings', title: 'Edificios' },
  { id: 'incidents', title: 'Incidentes' },
  { id: 'maintenance', title: 'Mantenimientos' },
  { id: 'activity', title: 'Actividad del periodo' },
  { id: 'complete', title: 'Bitácora completa' },
];

export interface ReportDataset {
  networks: Awaited<ReturnType<typeof api.fetchNetworks>>;
  devices: Device[];
  buildings: Building[];
  incidents: Incident[];
  maintenances: Maintenance[];
  configs: DeviceConfig[];
}

export interface ReportSummaryItem {
  label: string;
  value: string;
  tone?: 'blue' | 'green' | 'orange' | 'red' | 'muted';
}

export interface ReportRow {
  date: string;
  cells: string[];
}

export interface ReportSection {
  title: string;
  columns: string[];
  rows: ReportRow[];
}

export async function fetchReportDataset(): Promise<ReportDataset> {
  const [networks, devices, buildings, incidents, maintenances, configs] = await Promise.all([
    api.fetchNetworks(true),
    api.fetchDevices(true),
    api.fetchBuildings(true),
    api.fetchIncidents(true),
    api.fetchMaintenances(true),
    api.fetchConfigs(true),
  ]);

  return { networks, devices, buildings, incidents, maintenances, configs };
}

function readTimestamp(record: object, key: string): string {
  const value = (record as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function inDateRange(date: string, from: string, to: string): boolean {
  if (!date) return false;
  const day = date.slice(0, 10);
  return day >= from && day <= to;
}

function formatDate(value: string): string {
  if (!value) return 'No capturada';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value.slice(0, 10)
    : parsed.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: value.includes('T') ? '2-digit' : undefined,
      minute: value.includes('T') ? '2-digit' : undefined,
    });
}

function makeRow(date: string, ...cells: string[]): ReportRow {
  return { date: formatDate(date), cells };
}

export function getReportSummary(dataset: ReportDataset): ReportSummaryItem[] {
  const subnets = dataset.networks.reduce((total, network) => total + network.subnets.length, 0);
  return [
    { label: 'Redes base', value: String(dataset.networks.length), tone: 'blue' },
    { label: 'Subredes / VLAN', value: String(subnets), tone: 'blue' },
    { label: 'Dispositivos', value: String(dataset.devices.length), tone: 'green' },
    { label: 'Incidentes abiertos', value: String(dataset.incidents.filter(item => item.status !== 'resolved').length), tone: 'orange' },
    { label: 'Mantenimientos', value: String(dataset.maintenances.length), tone: 'blue' },
  ];
}

function getPeriodSummary(dataset: ReportDataset, from: string, to: string): ReportSummaryItem[] {
  const incidents = dataset.incidents.filter(incident => inDateRange(incident.event_at || incident.created_at, from, to));
  const openIncidents = incidents.filter(incident => incident.status !== 'resolved').length;
  const maintenance = dataset.maintenances.filter(item => inDateRange(item.scheduled_date, from, to));
  const pendingMaintenance = maintenance.filter(item => item.status === 'scheduled').length;
  const activity = getReportSections(dataset, 'activity', from, to)[0].rows.length;

  return [
    { label: 'Redes principales', value: String(dataset.networks.filter(item => inDateRange(item.created_at, from, to)).length), tone: 'blue' },
    {
      label: 'Subredes / VLAN',
      value: String(dataset.networks.reduce((count, network) => count + network.subnets.filter(item => inDateRange(item.created_at, from, to)).length, 0)),
      tone: 'blue',
    },
    { label: 'Dispositivos', value: String(dataset.devices.filter(item => inDateRange(item.created_at, from, to)).length), tone: 'green' },
    { label: 'Edificios', value: String(dataset.buildings.filter(item => inDateRange(readTimestamp(item, 'created_at'), from, to)).length), tone: 'blue' },
    { label: 'Incidentes', value: `${incidents.length} · ${openIncidents} activos`, tone: openIncidents ? 'orange' : 'green' },
    { label: 'Mantenimientos', value: `${maintenance.length} · ${pendingMaintenance} programados`, tone: pendingMaintenance ? 'orange' : 'green' },
    { label: 'Movimientos registrados', value: String(activity), tone: 'blue' },
  ];
}

function getReportSections(dataset: ReportDataset, area: ReportArea, from: string, to: string): ReportSection[] {
  const networkRows: ReportRow[] = [];
  const segmentationRows: ReportRow[] = [];

  dataset.networks.forEach(network => {
    if (inDateRange(network.created_at, from, to)) {
      networkRows.push(makeRow(
        network.created_at,
        network.name,
        `${network.address}/${network.cidr}`,
        String(network.subnets.length),
        network.description || 'Sin descripción',
      ));
    }
    network.subnets.forEach(subnet => {
      if (inDateRange(subnet.created_at, from, to)) {
        segmentationRows.push(makeRow(
          subnet.created_at,
          subnet.name,
          `${subnet.address}/${subnet.cidr}`,
          network.name,
          String(subnet.device_count ?? 0),
          subnet.description || 'Sin descripción',
        ));
      }
    });
  });

  const deviceRows = dataset.devices
    .filter(device => inDateRange(device.created_at, from, to))
    .map(device => makeRow(
      device.created_at,
      device.name,
      device.manufacturer || 'No capturado',
      device.ipv4_address || 'No capturada',
      device.mac_address || 'No capturada',
      device.location || 'No capturada',
      [device.network_name, device.subnet_name].filter(Boolean).join(' / ') || 'No asignada',
    ));

  const buildingRows = dataset.buildings
    .filter(building => inDateRange(readTimestamp(building, 'created_at'), from, to))
    .map(building => makeRow(
      readTimestamp(building, 'created_at'),
      building.name,
      building.code,
      building.description || 'No capturada',
      building.departments.map(department => `${department.name} (${department.floor})`).join(', ') || 'No capturados',
      `${building.latitude}, ${building.longitude}`,
    ));

  const incidentRows = dataset.incidents
    .filter(incident => inDateRange(incident.event_at || incident.created_at, from, to))
    .map(incident => makeRow(
      incident.event_at || incident.created_at,
      incident.title,
      incident.severity,
      incident.status,
      incident.description,
      incident.location || 'No capturada',
      incident.reported_by || 'No capturado',
      incident.affected_devices?.map(device => device.name).join(', ') || incident.device_name || 'No capturados',
    ));

  const maintenanceRows = dataset.maintenances
    .filter(maintenance => inDateRange(maintenance.scheduled_date, from, to))
    .map(maintenance => makeRow(
      maintenance.scheduled_date,
      maintenance.title,
      maintenance.type_label,
      maintenance.status,
      maintenance.device_name,
      maintenance.technician,
      `${maintenance.scheduled_date} · ${maintenance.time_window}`,
      maintenance.notes || 'Sin notas',
    ));

  const configRows = dataset.configs
    .filter(config => inDateRange(config.created_at, from, to))
    .map(config => makeRow(
      config.created_at,
      config.name,
      config.device_name,
      config.device_type || 'No capturado',
      config.file_name,
      config.file_size,
      config.author || 'No capturado',
      config.description || 'Sin descripción',
    ));

  const activityRows: ReportRow[] = [];
  dataset.networks.forEach(network => {
    if (inDateRange(network.created_at, from, to)) {
      activityRows.push(makeRow(network.created_at, 'Usuario no registrado', 'Redes', 'Alta de red', network.name, `${network.address}/${network.cidr}`));
    }
    network.subnets.forEach(subnet => {
      if (inDateRange(subnet.created_at, from, to)) {
        activityRows.push(makeRow(subnet.created_at, 'Usuario no registrado', 'Segmentación', 'Alta de subred', subnet.name, `${subnet.address}/${subnet.cidr} · ${network.name}`));
      }
    });
  });
  dataset.devices.forEach(device => {
    if (inDateRange(device.created_at, from, to)) {
      activityRows.push(makeRow(device.created_at, 'Usuario no registrado', 'Dispositivos', 'Alta de dispositivo', device.name, `${device.ipv4_address} · ${device.location || 'Ubicación no capturada'}`));
    }
  });
  dataset.buildings.forEach(building => {
    const createdAt = readTimestamp(building, 'created_at');
    if (inDateRange(createdAt, from, to)) {
      activityRows.push(makeRow(createdAt, 'Usuario no registrado', 'Edificios', 'Alta de edificio', building.name, building.code));
    }
  });
  dataset.incidents.forEach(incident => {
    const incidentDate = incident.event_at || incident.created_at;
    if (inDateRange(incidentDate, from, to)) {
      activityRows.push(makeRow(incidentDate, incident.reported_by || 'Usuario no registrado', 'Incidentes', 'Registro de incidente', incident.title, `${incident.severity} · ${incident.location}`));
    }
    (incident.actions || []).forEach(action => {
      if (inDateRange(action.at, from, to)) {
        activityRows.push(makeRow(action.at, action.by || 'Usuario no registrado', 'Incidentes', action.kind === 'resolution' ? 'Resolución' : 'Seguimiento', incident.title, action.text));
      }
    });
  });
  dataset.maintenances.forEach(maintenance => {
    const createdAt = readTimestamp(maintenance, 'created_at');
    if (inDateRange(createdAt, from, to)) {
      activityRows.push(makeRow(createdAt, maintenance.technician || 'Usuario no registrado', 'Mantenimientos', 'Registro de mantenimiento', maintenance.title, `${maintenance.device_name} · ${maintenance.scheduled_date}`));
    }
  });
  dataset.configs.forEach(config => {
    if (inDateRange(config.created_at, from, to)) {
      activityRows.push(makeRow(config.created_at, config.author || 'Usuario no registrado', 'Configuraciones', 'Registro de archivo', config.file_name, `${config.device_name} · ${config.description}`));
    }
  });
  activityRows.sort((first, second) => second.date.localeCompare(first.date));

  const activitySection: ReportSection = {
    title: 'Actividad registrada en el periodo',
    columns: ['Fecha y hora', 'Usuario', 'Área', 'Acción', 'Registro', 'Detalle'],
    rows: activityRows,
  };
  const sections: Record<ReportArea, ReportSection[]> = {
    networks: [
      { title: 'Redes principales', columns: ['Fecha', 'Red', 'Dirección / CIDR', 'Subredes', 'Descripción'], rows: networkRows },
      { title: 'Segmentaciones y VLAN', columns: ['Fecha', 'Subred / VLAN', 'Dirección / CIDR', 'Red principal', 'Dispositivos', 'Descripción'], rows: segmentationRows },
    ],
    devices: [
      { title: 'Switches y dispositivos', columns: ['Fecha', 'Dispositivo', 'Fabricante', 'IPv4', 'MAC', 'Ubicación', 'Red / subred'], rows: deviceRows },
    ],
    buildings: [
      { title: 'Edificios y departamentos', columns: ['Fecha', 'Edificio', 'Código', 'Descripción', 'Departamentos', 'Coordenadas'], rows: buildingRows },
    ],
    incidents: [
      { title: 'Incidentes', columns: ['Fecha', 'Incidente', 'Severidad', 'Estado', 'Descripción', 'Ubicación', 'Reportado por', 'Equipos afectados'], rows: incidentRows },
    ],
    maintenance: [
      { title: 'Mantenimientos', columns: ['Fecha programada', 'Actividad', 'Tipo', 'Estado', 'Equipo', 'Técnico', 'Horario', 'Notas'], rows: maintenanceRows },
    ],
    activity: [activitySection],
    complete: [
      { title: 'Edificios', columns: ['Fecha', 'Edificio', 'Código', 'Descripción', 'Departamentos', 'Coordenadas'], rows: buildingRows },
      { title: 'Switches y dispositivos', columns: ['Fecha', 'Dispositivo', 'Fabricante', 'IPv4', 'MAC', 'Ubicación', 'Red / subred'], rows: deviceRows },
      { title: 'Redes principales', columns: ['Fecha', 'Red', 'Dirección / CIDR', 'Subredes', 'Descripción'], rows: networkRows },
      { title: 'Segmentaciones y VLAN', columns: ['Fecha', 'Subred / VLAN', 'Dirección / CIDR', 'Red principal', 'Dispositivos', 'Descripción'], rows: segmentationRows },
      { title: 'Incidentes', columns: ['Fecha', 'Incidente', 'Severidad', 'Estado', 'Descripción', 'Ubicación', 'Reportado por', 'Equipos afectados'], rows: incidentRows },
      { title: 'Mantenimientos', columns: ['Fecha programada', 'Actividad', 'Tipo', 'Estado', 'Equipo', 'Técnico', 'Horario', 'Notas'], rows: maintenanceRows },
      { title: 'Configuraciones y documentos', columns: ['Fecha', 'Documento', 'Equipo', 'Tipo', 'Archivo', 'Tamaño', 'Autor', 'Descripción'], rows: configRows },
      activitySection,
    ],
  };

  if (area !== 'complete' && area !== 'activity') {
    const activityAreas: Record<Exclude<ReportArea, 'activity' | 'complete'>, string[]> = {
      networks: ['Redes', 'Segmentación'],
      devices: ['Dispositivos', 'Puertos'],
      buildings: ['Edificios'],
      incidents: ['Incidentes'],
      maintenance: ['Mantenimientos'],
    };
    const relevantActivity = activitySection.rows.filter(row => activityAreas[area].includes(row.cells[2]));
    return [...sections[area], { ...activitySection, rows: relevantActivity }];
  }
  return sections[area];
}

export function countReportRows(dataset: ReportDataset, area: ReportArea, from: string, to: string): number {
  return getReportSections(dataset, area, from, to)
    .reduce((total, section) => total + section.rows.filter(row => row.cells[0] !== 'No capturado').length, 0);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

function createTable(section: ReportSection): string {
  if (!section.rows.length) {
    return '<p class="empty">No hay registros en el periodo seleccionado.</p>';
  }

  return `<table><thead><tr>${section.columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
    <tbody>${section.rows.map(row => {
      const cells = [row.date, ...row.cells];
      if (cells.length === 2 && cells[1] === 'No capturado') {
        return `<tr><td>${escapeHtml(cells[0])}</td><td colspan="${section.columns.length - 1}">${escapeHtml(cells[1])}</td></tr>`;
      }
      return `<tr>${cells.map(cell => `<td>${escapeHtml(cell || 'No capturado')}</td>`).join('')}</tr>`;
    }).join('')}</tbody></table>`;
}

export function createReportHtml(
  dataset: ReportDataset,
  area: ReportArea,
  from: string,
  to: string,
  createdBy: string,
): string {
  const areaTitle = REPORT_AREAS.find(item => item.id === area)?.title || 'Bitácora';
  const summary = getPeriodSummary(dataset, from, to);
  const sections = getReportSections(dataset, area, from, to);
  const activitySection = sections.find(section => section.title === 'Actividad registrada en el periodo');
  const detailSections = sections.filter(section => section !== activitySection);
  const populatedSections = sections.filter(section => section.rows.length > 0);
  const emptySections = sections.filter(section => section.rows.length === 0);
  const detailCount = detailSections.reduce((total, section) => total + section.rows.length, 0);
  const activityCount = activitySection?.rows.length || 0;
  const content = populatedSections.map(section => `
    <section class="${section === activitySection && detailCount > 0 ? 'break-before' : ''}">
      <h2>${escapeHtml(section.title)} <span>${section.rows.length} registro(s)</span></h2>
      ${createTable(section)}
    </section>`).join('');
  const emptyReport = populatedSections.length
    ? ''
    : '<section class="empty-report"><h2>Sin registros en el periodo</h2><p>No se encontraron datos para el área y las fechas seleccionadas. Prueba con un periodo más amplio.</p></section>';
  const emptyNote = emptySections.length
    ? `<p class="coverage">Sin registros en el periodo: ${emptySections.map(section => escapeHtml(section.title)).join(' · ')}.</p>`
    : '';
  const periodNarrative = `El periodo contiene ${detailCount} registro(s) de detalle y ${activityCount} movimiento(s) relacionado(s). La actividad disponible se deriva de las fechas y acciones registradas; no representa una auditoría completa de cada edición.`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(areaTitle)} - Bitácora Digital</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body { color: #243447; font: 10px Arial, Helvetica, sans-serif; margin: 0; }
      header { align-items: center; border-bottom: 2px solid #1682c4; display: flex; justify-content: space-between; margin-bottom: 12px; padding: 0 0 9px; }
      .brand { align-items: center; display: flex; gap: 10px; }
      .brand-mark { align-items: center; background: #146caf; border-radius: 6px; color: white; display: flex; font-size: 12px; font-weight: bold; height: 34px; justify-content: center; width: 38px; }
      h1 { color: #135f91; font-size: 18px; margin: 0 0 3px; }
      .subtitle, .meta { color: #526579; font-size: 9px; margin: 0; }
      .meta { line-height: 1.7; text-align: right; }
      h2 { background: #eef5fb; border-left: 3px solid #1778b5; color: #145d91; font-size: 11px; margin: 13px 0 6px; padding: 6px 8px; break-after: avoid; page-break-after: avoid; }
      h2 span { color: #506579; float: right; font-size: 9px; font-weight: normal; }
      table { border-collapse: collapse; table-layout: auto; width: 100%; }
      thead { display: table-header-group; }
      th { background: #176ca8; color: #fff; font-size: 8px; font-weight: 700; text-align: left; }
      th, td { border: 1px solid #d3dce5; overflow-wrap: anywhere; padding: 5px 6px; vertical-align: top; }
      td { font-size: 8px; line-height: 1.35; }
      tbody tr:nth-child(even) { background: #f1f5f8; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      .summary-title { color: #145d91; font-size: 11px; margin: 11px 0 6px; }
      .summary { display: grid; gap: 6px; grid-template-columns: repeat(4, 1fr); }
      .metric { background: #f0f5fa; border: 1px solid #d5e0ea; border-radius: 4px; min-height: 42px; padding: 6px 8px; }
      .metric strong { color: #1d3143; display: block; font-size: 13px; margin-bottom: 2px; }
      .metric span { color: #53677b; font-size: 8px; }
      .metric.blue { border-left: 3px solid #1682c4; }
      .metric.green { border-left: 3px solid #35a66c; }
      .metric.orange { border-left: 3px solid #e3a529; }
      .metric.red { border-left: 3px solid #d9574f; }
      .metric.muted { border-left: 3px solid #8291a0; }
      .statusline { background: #f3f8fc; border: 1px solid #dce7ef; color: #42596d; font-size: 8px; line-height: 1.5; margin-top: 8px; padding: 7px 9px; }
      .empty { background: #f1f5f8; color: #526579; padding: 8px; }
      .coverage { color: #647789; font-size: 8px; line-height: 1.5; margin: 9px 0; }
      .empty-report { background: #f7f9fb; border: 1px solid #dce5ed; border-radius: 4px; margin-top: 16px; padding: 8px 12px; }
      .empty-report h2 { margin-top: 0; }
      .empty-report p { color: #526579; font-size: 9px; }
      footer { border-top: 1px solid #d3dce5; color: #617487; font-size: 8px; margin-top: 12px; padding-top: 6px; }
      .break-before { break-before: page; page-break-before: always; }
      @media screen { body { background: #fff; margin: 18px auto; max-width: 1200px; padding: 22px; } }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style></head><body>
    <header>
      <div class="brand"><div class="brand-mark">BD</div><div><h1>Bitácora Digital de Redes</h1><p class="subtitle">Reporte técnico · ${escapeHtml(areaTitle)}</p></div></div>
      <div class="meta"><strong>Periodo:</strong> ${escapeHtml(from)} al ${escapeHtml(to)}<br>
        <strong>Generado:</strong> ${escapeHtml(new Date().toLocaleString('es-MX'))}<br>
        <strong>Responsable:</strong> ${escapeHtml(createdBy)}</div>
    </header>
    <h2 class="summary-title">Resumen ejecutivo <span>Panorama de todas las áreas en el periodo</span></h2>
    <div class="summary">${summary.map(item => `<div class="metric ${item.tone || 'blue'}"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`).join('')}</div>
    <p class="statusline">${escapeHtml(periodNarrative)}</p>
    ${emptyNote}
    ${emptyReport}
    ${content}
    <footer>Fuente: InsForge · Filtro aplicado: ${escapeHtml(from)} a ${escapeHtml(to)} · Campos sin información: “No capturado”.</footer>
    </body></html>`;
}
