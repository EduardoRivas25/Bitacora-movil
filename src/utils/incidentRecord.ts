import { Incident, IncidentAction, IncidentDevice } from '../types';

// Metadatos versionados en description: permite ampliar la bitácora sin cambiar la tabla.
const MARKER = '\n\n[BITACORA_INCIDENTE_V1]\n';

interface IncidentMetadata {
  version: 1;
  event_at: string;
  reported_by: string;
  affected_devices: IncidentDevice[];
  actions: IncidentAction[];
}

export function readIncidentDescription(raw: string): {
  description: string;
  metadata: Partial<IncidentMetadata>;
} {
  const markerIndex = raw.lastIndexOf(MARKER);
  if (markerIndex < 0) return { description: raw, metadata: {} };

  try {
    const parsed = JSON.parse(raw.slice(markerIndex + MARKER.length));
    if (parsed?.version !== 1 || typeof parsed.event_at !== 'string') {
      return { description: raw, metadata: {} };
    }
    return {
      description: raw.slice(0, markerIndex),
      metadata: {
        version: 1,
        event_at: parsed.event_at,
        reported_by: typeof parsed.reported_by === 'string' ? parsed.reported_by : '',
        affected_devices: Array.isArray(parsed.affected_devices) ? parsed.affected_devices : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      },
    };
  } catch {
    return { description: raw, metadata: {} };
  }
}

export function writeIncidentDescription(description: string, metadata: IncidentMetadata): string {
  return `${description.trim()}${MARKER}${JSON.stringify(metadata)}`;
}

export function hydrateIncident(raw: Incident): Incident {
  const { description, metadata } = readIncidentDescription(raw.description || '');
  return {
    ...raw,
    description,
    event_at: metadata.event_at || raw.created_at,
    reported_by: metadata.reported_by || '',
    affected_devices: metadata.affected_devices?.length
      ? metadata.affected_devices
      : [{ id: raw.device_id || '', name: raw.device_name, ip: raw.device_ip }],
    actions: metadata.actions || [],
  };
}

export function packIncident(incident: Incident): string {
  return writeIncidentDescription(incident.description, {
    version: 1,
    event_at: incident.event_at || incident.created_at,
    reported_by: incident.reported_by || '',
    affected_devices: incident.affected_devices || [],
    actions: incident.actions || [],
  });
}
