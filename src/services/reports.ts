import * as api from './api';
import * as portsApi from './ports';
import { Building, Device, DeviceConfig, Incident, Maintenance, SwitchPort } from '../types';
import { REPORT_LOGO_DATA_URI } from './reportLogoData';

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
  ports: SwitchPort[];
  portsError?: string;
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

  let ports: SwitchPort[] = [];
  let portsError: string | undefined;
  try {
    ports = await portsApi.fetchSwitchPorts();
  } catch (error) {
    console.warn('No se pudieron incluir los puertos en el reporte:', error);
    portsError = error instanceof Error ? error.message : 'No se pudo consultar el inventario de puertos.';
  }

  return { networks, devices, buildings, incidents, maintenances, configs, ports, portsError };
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
    { label: 'Puertos registrados', value: dataset.portsError ? 'No disponibles' : String(dataset.ports.length), tone: dataset.portsError ? 'muted' : 'green' },
  ];
}

function getPeriodSummary(dataset: ReportDataset, from: string, to: string): ReportSummaryItem[] {
  const incidents = dataset.incidents.filter(incident => inDateRange(incident.event_at || incident.created_at, from, to));
  const openIncidents = incidents.filter(incident => incident.status !== 'resolved').length;
  const maintenance = dataset.maintenances.filter(item => inDateRange(item.scheduled_date, from, to));
  const pendingMaintenance = maintenance.filter(item => item.status === 'scheduled').length;
  const ports = dataset.ports.filter(port => inDateRange(port.created_at, from, to));
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
    {
      label: 'Puertos registrados',
      value: dataset.portsError ? 'No disponibles' : `${ports.length} · ${ports.filter(port => port.status === 'available').length} libres`,
      tone: dataset.portsError ? 'muted' : 'green',
    },
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

  const switchDevices = dataset.devices.filter(device => /switch|conmutador/i.test(device.name));
  const portRows = dataset.ports
    .filter(port => inDateRange(port.created_at, from, to))
    .map(port => {
      const switchDevice = switchDevices.find(device => device.id === port.switch_device_id);
      return makeRow(
        port.created_at,
        switchDevice?.name || 'Switch no encontrado',
        port.port_label,
        port.status === 'in_use' ? 'En uso' : 'Libre',
        port.connected_device || 'Sin equipo conectado',
        port.notes || 'Sin notas',
      );
    });

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
  dataset.ports.forEach(port => {
    if (inDateRange(port.created_at, from, to)) {
      const switchName = switchDevices.find(device => device.id === port.switch_device_id)?.name || 'Switch no encontrado';
      activityRows.push(makeRow(
        port.created_at,
        'Usuario no registrado',
        'Puertos',
        'Registro de puerto',
        `${switchName} · ${port.port_label}`,
        port.status === 'in_use' ? `En uso · ${port.connected_device}` : 'Libre',
      ));
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
      {
        title: 'Puertos por switch',
        columns: ['Fecha', 'Switch', 'Puerto', 'Estado', 'Equipo conectado', 'Notas'],
        rows: dataset.portsError && !portRows.length ? [makeRow('', 'No capturado')] : portRows,
      },
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
      {
        title: 'Puertos por switch',
        columns: ['Fecha', 'Switch', 'Puerto', 'Estado', 'Equipo conectado', 'Notas'],
        rows: dataset.portsError && !portRows.length ? [makeRow('', 'No capturado')] : portRows,
      },
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
  const content = populatedSections.map((section, index) => `
    <section class="${section === activitySection && detailCount > 0 ? 'break-before' : ''}">
      <div class="section-heading"><span class="section-number">${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(section.title)}</h2><span class="section-count">${section.rows.length} registro(s)</span></div>
      ${createTable(section)}
    </section>`).join('');
  const emptyReport = populatedSections.length
    ? ''
    : '<section class="empty-report"><h2>Sin registros en el periodo</h2><p>No se encontraron datos para el área y las fechas seleccionadas. Prueba con un periodo más amplio.</p></section>';
  const emptyNote = emptySections.length
    ? `<p class="coverage">Sin registros en el periodo: ${emptySections.map(section => escapeHtml(section.title)).join(' · ')}.</p>`
    : '';
  const periodNarrative = `El periodo contiene ${detailCount} registro(s) de detalle y ${activityCount} movimiento(s) relacionado(s). La actividad disponible se deriva de las fechas y acciones registradas; no representa una auditoría completa de cada edición.`;
  const warning = dataset.portsError
    ? '<p class="warning"><strong>Inventario de puertos no disponible.</strong> No fue posible consultar esta información al generar el documento. Las demás secciones conservan los registros disponibles.</p>'
    : '';
  const generatedAt = new Date().toLocaleString('es-MX');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(areaTitle)} - Bitácora Digital</title>
    <style>
      @page { size: A4 landscape; margin: 13mm 14mm 15mm; }
      * { box-sizing: border-box; }
      body { background: #fff; color: #262626; font: 10px Arial, Helvetica, sans-serif; margin: 0; }
      header { align-items: center; border-bottom: 1px solid #bcbcbc; display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 10px; }
      .brand { align-items: center; display: flex; gap: 11px; }
      .brand-logo { display: block; height: 42px; object-fit: contain; width: 42px; }
      .brand-name { color: #171717; font-size: 15px; font-weight: 700; letter-spacing: -.2px; margin: 0 0 3px; }
      .brand-caption { color: #666; font-size: 8px; letter-spacing: 1.3px; margin: 0; text-transform: uppercase; }
      .header-label { border: 1px solid #b8b8b8; border-radius: 4px; color: #333; font-size: 8px; font-weight: 700; letter-spacing: 1px; padding: 6px 9px; text-transform: uppercase; }
      .overview { align-items: flex-end; display: flex; justify-content: space-between; gap: 24px; margin-bottom: 15px; }
      .overview-copy { flex: 1; }
      .eyebrow { color: #666; font-size: 8px; font-weight: 700; letter-spacing: 1.4px; margin: 0 0 5px; text-transform: uppercase; }
      h1 { color: #171717; font-size: 22px; letter-spacing: -.5px; line-height: 1.15; margin: 0 0 5px; }
      .overview-subtitle { color: #595959; font-size: 9px; line-height: 1.5; margin: 0; }
      .meta { border-left: 2px solid #333; min-width: 245px; padding-left: 11px; }
      .meta-row { display: flex; justify-content: space-between; gap: 14px; line-height: 1.65; }
      .meta-label { color: #686868; font-size: 8px; }
      .meta-value { color: #252525; font-size: 8px; font-weight: 700; text-align: right; }
      .section-heading { align-items: center; background: #ededed; border: 1px solid #d2d2d2; display: flex; gap: 8px; margin: 15px 0 7px; padding: 7px 9px; break-after: avoid; page-break-after: avoid; }
      .section-number { background: #2b2b2b; border-radius: 3px; color: #fff; font-size: 8px; font-weight: 700; min-width: 21px; padding: 4px; text-align: center; }
      h2 { color: #222; flex: 1; font-size: 11px; margin: 0; }
      .section-count { color: #5c5c5c; font-size: 8px; white-space: nowrap; }
      table { border-collapse: collapse; table-layout: auto; width: 100%; }
      thead { display: table-header-group; }
      th { background: #383838; color: #fff; font-size: 8px; font-weight: 700; text-align: left; }
      th, td { border: 1px solid #d5d5d5; overflow-wrap: anywhere; padding: 6px 7px; vertical-align: top; }
      td { font-size: 8px; line-height: 1.4; }
      tbody tr:nth-child(even) { background: #f4f4f4; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      .summary { display: grid; gap: 7px; grid-template-columns: repeat(4, 1fr); }
      .metric { background: #f3f3f3; border: 1px solid #d3d3d3; border-radius: 4px; min-height: 44px; padding: 7px 9px; }
      .metric strong { color: #202020; display: block; font-size: 13px; margin-bottom: 3px; }
      .metric span { color: #545454; font-size: 8px; }
      .metric.blue { border-top: 2px solid #555; }
      .metric.green { border-top: 2px solid #397451; }
      .metric.orange { border-top: 2px solid #9a6a23; }
      .metric.red { border-top: 2px solid #a7433e; }
      .metric.muted { border-top: 2px solid #888; }
      .statusline { background: #f3f3f3; border-left: 2px solid #555; color: #4b4b4b; font-size: 8px; line-height: 1.5; margin: 10px 0 0; padding: 8px 10px; }
      .warning { background: #f8f1e7; border-left: 3px solid #a77125; color: #6c4617; font-size: 8px; line-height: 1.5; margin: 9px 0; padding: 8px 10px; }
      .empty { background: #f3f3f3; color: #555; padding: 9px; }
      .coverage { color: #636363; font-size: 8px; line-height: 1.5; margin: 10px 0; }
      .empty-report { background: #f6f6f6; border: 1px solid #d5d5d5; border-radius: 4px; margin-top: 16px; padding: 8px 12px; }
      .empty-report h2 { margin-top: 0; }
      .empty-report p { color: #555; font-size: 9px; }
      footer { border-top: 1px solid #c9c9c9; color: #626262; display: flex; font-size: 8px; justify-content: space-between; gap: 12px; margin-top: 16px; padding-top: 8px; }
      .break-before { break-before: page; page-break-before: always; }
      @media screen { body { background: #fff; margin: 18px auto; max-width: 1200px; padding: 22px; } }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style></head><body>
    <header>
      <div class="brand"><img class="brand-logo" src="${REPORT_LOGO_DATA_URI}" alt="Logo de Bitácora Digital"><div><p class="brand-name">Bitácora Digital</p><p class="brand-caption">Gestión de infraestructura de red</p></div></div>
      <div class="header-label">Reporte técnico</div>
    </header>
    <div class="overview">
      <div class="overview-copy"><p class="eyebrow">Informe de infraestructura</p><h1>${escapeHtml(areaTitle)}</h1><p class="overview-subtitle">Información registrada en Bitácora Digital para el periodo seleccionado.</p></div>
      <div class="meta"><div class="meta-row"><span class="meta-label">Periodo</span><span class="meta-value">${escapeHtml(from)} a ${escapeHtml(to)}</span></div><div class="meta-row"><span class="meta-label">Fecha de emisión</span><span class="meta-value">${escapeHtml(generatedAt)}</span></div><div class="meta-row"><span class="meta-label">Generado por</span><span class="meta-value">${escapeHtml(createdBy)}</span></div></div>
    </div>
    <div class="section-heading"><span class="section-number">00</span><h2>Resumen ejecutivo</h2><span class="section-count">Panorama del periodo</span></div>
    <div class="summary">${summary.map(item => `<div class="metric ${item.tone || 'blue'}"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`).join('')}</div>
    <p class="statusline">${escapeHtml(periodNarrative)}</p>
    ${warning}
    ${emptyNote}
    ${emptyReport}
    ${content}
    <footer><span>Bitácora Digital · Fuente: registros de la aplicación · Campos sin información: “No capturado”.</span><span>Periodo: ${escapeHtml(from)} a ${escapeHtml(to)}</span></footer>
    </body></html>`;
}
