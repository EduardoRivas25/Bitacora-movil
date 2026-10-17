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

export async function fetchReportDataset(area: ReportArea): Promise<ReportDataset> {
  const all = area === 'complete' || area === 'activity';
  const [networks, devices, buildings, incidents, maintenances, configs] = await Promise.all([
    all || area === 'networks' ? api.fetchNetworks(true) : Promise.resolve([] as ReportDataset['networks']),
    all || area === 'networks' || area === 'devices' || area === 'buildings' ? api.fetchDevices(true) : Promise.resolve([] as Device[]),
    all || area === 'buildings' ? api.fetchBuildings(true) : Promise.resolve([] as Building[]),
    all || area === 'incidents' ? api.fetchIncidents(true) : Promise.resolve([] as Incident[]),
    all || area === 'maintenance' ? api.fetchMaintenances(true) : Promise.resolve([] as Maintenance[]),
    all ? api.fetchConfigs(true) : Promise.resolve([] as DeviceConfig[]),
  ]);

  let ports: SwitchPort[] = [];
  let portsError: string | undefined;
  if (all || area === 'devices') {
    try {
      ports = await portsApi.fetchSwitchPorts();
    } catch (error) {
      console.warn('No se pudieron incluir los puertos en el reporte:', error);
      portsError = error instanceof Error ? error.message : 'No se pudo consultar el inventario de puertos.';
    }
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

export function getReportSummary(dataset: ReportDataset, area: ReportArea, from: string, to: string): ReportSummaryItem[] {
  const subnets = dataset.networks.flatMap(network => network.subnets);
  const incidents = dataset.incidents.filter(item => inDateRange(item.event_at || item.created_at, from, to));
  const maintenances = dataset.maintenances.filter(item => inDateRange(item.scheduled_date, from, to));
  const departmentCount = dataset.buildings.reduce((total, building) => total + building.departments.length, 0);
  const portCount = dataset.portsError ? 'No disponible' : String(dataset.ports.length);
  const activityRows = () => getReportSections(dataset, 'activity', from, to)[0].rows;

  switch (area) {
    case 'networks':
      return [
        { label: 'Redes principales', value: String(dataset.networks.length), tone: 'blue' },
        { label: 'Subredes / VLAN', value: String(subnets.length), tone: 'blue' },
        { label: 'Dispositivos asociados', value: String(dataset.devices.filter(device => subnets.some(subnet => subnet.id === device.subnet_id)).length), tone: 'green' },
        { label: 'Redes sin subredes', value: String(dataset.networks.filter(network => network.subnets.length === 0).length), tone: 'muted' },
      ];
    case 'devices':
      return [
        { label: 'Dispositivos registrados', value: String(dataset.devices.length), tone: 'blue' },
        { label: 'Equipos con puertos', value: dataset.portsError ? 'No disponible' : String(new Set(dataset.ports.map(port => port.switch_device_id)).size), tone: dataset.portsError ? 'muted' : 'blue' },
        { label: 'Puertos registrados', value: portCount, tone: dataset.portsError ? 'muted' : 'green' },
        { label: 'Puertos en uso', value: dataset.portsError ? 'No disponible' : String(dataset.ports.filter(port => port.status === 'in_use').length), tone: dataset.portsError ? 'muted' : 'orange' },
      ];
    case 'buildings':
      return [
        { label: 'Edificios registrados', value: String(dataset.buildings.length), tone: 'blue' },
        { label: 'Departamentos', value: String(departmentCount), tone: 'blue' },
        { label: 'Equipos ubicados', value: String(dataset.devices.filter(device => dataset.buildings.some(building => building.id === device.building_id)).length), tone: 'green' },
        { label: 'Edificios sin departamentos', value: String(dataset.buildings.filter(building => building.departments.length === 0).length), tone: 'muted' },
      ];
    case 'incidents':
      return [
        { label: 'Incidentes del periodo', value: String(incidents.length), tone: 'blue' },
        { label: 'Abiertos', value: String(incidents.filter(item => item.status === 'open').length), tone: 'red' },
        { label: 'En progreso', value: String(incidents.filter(item => item.status === 'in_progress').length), tone: 'orange' },
        { label: 'Resueltos', value: String(incidents.filter(item => item.status === 'resolved').length), tone: 'green' },
      ];
    case 'maintenance':
      return [
        { label: 'Mantenimientos del periodo', value: String(maintenances.length), tone: 'blue' },
        { label: 'Programados', value: String(maintenances.filter(item => item.status === 'scheduled').length), tone: 'orange' },
        { label: 'En progreso', value: String(maintenances.filter(item => item.status === 'in_progress').length), tone: 'blue' },
        { label: 'Completados', value: String(maintenances.filter(item => item.status === 'completed').length), tone: 'green' },
      ];
    case 'activity': {
      const rows = activityRows();
      return [
        { label: 'Movimientos del periodo', value: String(rows.length), tone: 'blue' },
        { label: 'Áreas con actividad', value: String(new Set(rows.map(row => row.cells[1])).size), tone: 'blue' },
        { label: 'Incidentes y seguimientos', value: String(rows.filter(row => row.cells[1] === 'Incidentes').length), tone: 'orange' },
        { label: 'Mantenimientos', value: String(rows.filter(row => row.cells[1] === 'Mantenimientos').length), tone: 'green' },
      ];
    }
    case 'complete':
      return [
        { label: 'Redes principales', value: String(dataset.networks.length), tone: 'blue' },
        { label: 'Subredes / VLAN', value: String(subnets.length), tone: 'blue' },
        { label: 'Dispositivos', value: String(dataset.devices.length), tone: 'green' },
        { label: 'Edificios', value: String(dataset.buildings.length), tone: 'blue' },
        { label: 'Incidentes del periodo', value: String(incidents.length), tone: 'orange' },
        { label: 'Mantenimientos del periodo', value: String(maintenances.length), tone: 'blue' },
        { label: 'Puertos registrados', value: portCount, tone: dataset.portsError ? 'muted' : 'green' },
        { label: 'Movimientos del periodo', value: String(activityRows().length), tone: 'muted' },
      ];
  }
}

function getReportSections(dataset: ReportDataset, area: ReportArea, from: string, to: string): ReportSection[] {
  const networkRows: ReportRow[] = [];
  const segmentationRows: ReportRow[] = [];

  dataset.networks.forEach(network => {
    networkRows.push(makeRow(
      network.created_at,
      network.name,
      `${network.address}/${network.cidr}`,
      String(network.subnets.length),
      network.description || 'Sin descripción',
    ));
    network.subnets.forEach(subnet => {
      segmentationRows.push(makeRow(
        subnet.created_at,
        subnet.name,
        `${subnet.address}/${subnet.cidr}`,
        network.name,
        String(subnet.device_count ?? 0),
        subnet.description || 'Sin descripción',
      ));
    });
  });

  const deviceRows = dataset.devices
    .map(device => makeRow(
      device.created_at,
      device.name,
      device.manufacturer || 'No capturado',
      device.ipv4_address || 'No capturada',
      device.mac_address || 'No capturada',
      device.location || 'No capturada',
      [device.network_name, device.subnet_name].filter(Boolean).join(' / ') || 'No asignada',
    ));

  const buildingRows: ReportRow[] = dataset.buildings.map(building => ({
    date: building.name,
    cells: [
      building.code,
      building.description || 'No capturada',
      building.departments.map(department => `${department.name} (${department.floor})`).join(', ') || 'No capturados',
      String(dataset.devices.filter(device => device.building_id === building.id).length),
      typeof building.latitude === 'number' && typeof building.longitude === 'number'
        ? `${building.latitude}, ${building.longitude}` : 'No capturadas',
    ],
  }));
  const departmentRows: ReportRow[] = dataset.buildings.flatMap(building =>
    building.departments.map(department => ({
      date: building.name,
      cells: [department.name, department.floor || 'No capturado'],
    })),
  );

  const incidentRows = dataset.incidents
    .filter(incident => inDateRange(incident.event_at || incident.created_at, from, to))
    .map(incident => makeRow(
      incident.event_at || incident.created_at,
      incident.title,
      { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' }[incident.severity],
      { open: 'Abierto', in_progress: 'En progreso', resolved: 'Resuelto' }[incident.status],
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
      { scheduled: 'Programado', in_progress: 'En progreso', completed: 'Completado' }[maintenance.status],
      maintenance.device_name || 'No capturado',
      maintenance.location || 'No capturada',
      maintenance.technician || 'No capturado',
      `${maintenance.scheduled_date} · ${maintenance.time_window}`,
      { none: 'Sin impacto', partial: 'Parcial', full: 'Total' }[maintenance.impact],
      maintenance.notes || 'Sin notas',
    ));

  const configRows = dataset.configs
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

  const switchDevices = dataset.devices;
  const portRows = dataset.ports
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
        rows: portRows,
      },
    ],
    buildings: [
      { title: 'Edificios y departamentos', columns: ['Edificio', 'Código', 'Descripción', 'Departamentos', 'Equipos ubicados', 'Coordenadas'], rows: buildingRows },
      { title: 'Detalle de departamentos', columns: ['Edificio', 'Departamento', 'Piso'], rows: departmentRows },
    ],
    incidents: [
      { title: 'Incidentes', columns: ['Fecha', 'Incidente', 'Severidad', 'Estado', 'Descripción', 'Ubicación', 'Reportado por', 'Equipos afectados'], rows: incidentRows },
    ],
    maintenance: [
      { title: 'Mantenimientos', columns: ['Fecha programada', 'Actividad', 'Tipo', 'Estado', 'Equipo', 'Ubicación', 'Técnico', 'Horario', 'Impacto', 'Notas'], rows: maintenanceRows },
    ],
    activity: [activitySection],
    complete: [
      { title: 'Edificios', columns: ['Edificio', 'Código', 'Descripción', 'Departamentos', 'Equipos ubicados', 'Coordenadas'], rows: buildingRows },
      { title: 'Departamentos', columns: ['Edificio', 'Departamento', 'Piso'], rows: departmentRows },
      { title: 'Switches y dispositivos', columns: ['Fecha', 'Dispositivo', 'Fabricante', 'IPv4', 'MAC', 'Ubicación', 'Red / subred'], rows: deviceRows },
      {
        title: 'Puertos por switch',
        columns: ['Fecha', 'Switch', 'Puerto', 'Estado', 'Equipo conectado', 'Notas'],
        rows: portRows,
      },
      { title: 'Redes principales', columns: ['Fecha', 'Red', 'Dirección / CIDR', 'Subredes', 'Descripción'], rows: networkRows },
      { title: 'Segmentaciones y VLAN', columns: ['Fecha', 'Subred / VLAN', 'Dirección / CIDR', 'Red principal', 'Dispositivos', 'Descripción'], rows: segmentationRows },
      { title: 'Incidentes', columns: ['Fecha', 'Incidente', 'Severidad', 'Estado', 'Descripción', 'Ubicación', 'Reportado por', 'Equipos afectados'], rows: incidentRows },
      { title: 'Mantenimientos', columns: ['Fecha programada', 'Actividad', 'Tipo', 'Estado', 'Equipo', 'Ubicación', 'Técnico', 'Horario', 'Impacto', 'Notas'], rows: maintenanceRows },
      { title: 'Configuraciones y documentos', columns: ['Fecha', 'Documento', 'Equipo', 'Tipo', 'Archivo', 'Tamaño', 'Autor', 'Descripción'], rows: configRows },
      activitySection,
    ],
  };

  return sections[area];
}

export function countReportRows(dataset: ReportDataset, area: ReportArea, from: string, to: string): number {
  return getReportSections(dataset, area, from, to)
    .reduce((total, section) => total + section.rows.length, 0);
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
  return `<table><thead><tr>${section.columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
    <tbody>${section.rows.map(row => {
      const cells = [row.date, ...row.cells];
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
  const isInventoryReport = area === 'networks' || area === 'devices' || area === 'buildings';
  const summary = getReportSummary(dataset, area, from, to);
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
    : `<section class="empty-report"><h2>Sin registros ${isInventoryReport ? 'en el inventario' : 'en el periodo'}</h2><p>${isInventoryReport ? 'No hay registros guardados para esta área.' : 'No se encontraron datos para el área y las fechas seleccionadas. Prueba con un periodo más amplio.'}</p></section>`;
  const emptyNote = emptySections.length
    ? `<p class="coverage">Secciones sin registros: ${emptySections.map(section => escapeHtml(section.title)).join(' · ')}.</p>`
    : '';
  const reportNarrative = isInventoryReport
    ? `Inventario actual con ${detailCount} registro(s) de detalle. Incluye los datos existentes al momento de generar el documento, sin filtrar por fecha de creación.`
    : area === 'activity'
      ? `Se registraron ${activityCount} movimiento(s) en el periodo. Esta actividad se deriva de fechas y acciones guardadas; no representa una auditoría completa de cada edición.`
      : area === 'complete'
        ? `El inventario refleja los registros actuales; incidentes, mantenimientos y ${activityCount} movimiento(s) se muestran según el periodo seleccionado.`
        : `Se encontraron ${detailCount} registro(s) para esta área en el periodo seleccionado.`;
  const warning = dataset.portsError && (area === 'devices' || area === 'complete')
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
      <div class="overview-copy"><p class="eyebrow">Informe de infraestructura</p><h1>${escapeHtml(areaTitle)}</h1><p class="overview-subtitle">${isInventoryReport ? 'Inventario vigente registrado en Bitácora Digital.' : 'Información registrada en Bitácora Digital para el periodo seleccionado.'}</p></div>
      <div class="meta">${isInventoryReport ? '' : `<div class="meta-row"><span class="meta-label">Periodo</span><span class="meta-value">${escapeHtml(from)} a ${escapeHtml(to)}</span></div>`}<div class="meta-row"><span class="meta-label">Fecha de emisión</span><span class="meta-value">${escapeHtml(generatedAt)}</span></div><div class="meta-row"><span class="meta-label">Generado por</span><span class="meta-value">${escapeHtml(createdBy)}</span></div></div>
    </div>
    <div class="section-heading"><span class="section-number">00</span><h2>Resumen ejecutivo</h2><span class="section-count">${isInventoryReport ? 'Inventario actual' : 'Panorama del periodo'}</span></div>
    <div class="summary">${summary.map(item => `<div class="metric ${item.tone || 'blue'}"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`).join('')}</div>
    <p class="statusline">${escapeHtml(reportNarrative)}</p>
    ${warning}
    ${emptyNote}
    ${emptyReport}
    ${content}
    <footer><span>Bitácora Digital · Fuente: registros de la aplicación · Campos sin información: “No capturado”.</span><span>${isInventoryReport ? `Corte: ${escapeHtml(generatedAt)}` : `Periodo: ${escapeHtml(from)} a ${escapeHtml(to)}`}</span></footer>
    </body></html>`;
}
