// src/services/api.ts
// ============================================================
// ARCHIVO CENTRALIZADO DE TODAS LAS LLAMADAS AL BACKEND
// Todas las screens importan métodos de aquí para mantener
// el código limpio y la lógica de BD en un solo lugar.
// ============================================================
import { supabase } from '../lib/supabaseClient';
import { Platform } from 'react-native';
import {
  Network,
  Subnet,
  Device,
  Building,
  Department,
  Incident,
  Maintenance,
  DeviceConfig,
  RecentActivity,
} from '../types';

// ============================================================
// HELPERS DE SANITIZACIÓN (Prevención de inyección)
// ============================================================
function sanitize(input: string): string {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
}

function formatEmail(input: string): string {
  const clean = sanitize(input).toLowerCase();
  if (!clean) return '';
  if (!clean.includes('@')) {
    return `${clean}@bitacora.com`;
  }
  return clean;
}

// ============================================================
// AUTH — Autenticación con Supabase
// ============================================================

export async function signInWithEmail(emailOrUser: string, password: string) {
  const formattedEmail = formatEmail(emailOrUser);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: formattedEmail,
    password,
  });

  if (error) {
    // Si el usuario ingresó 'prueba1' y aún no existe en Supabase, auto-crearlo
    if (
      (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) &&
      emailOrUser.toLowerCase().trim() === 'prueba1'
    ) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formattedEmail,
        password,
        options: {
          data: { full_name: 'Usuario de Prueba (prueba1)' },
        },
      });

      if (!signUpError && signUpData.session) {
        return signUpData;
      }
    }
    throw error;
  }
  return data;
}

export async function signUpWithEmail(emailOrUser: string, password: string, name?: string) {
  const formattedEmail = formatEmail(emailOrUser);
  const { data, error } = await supabase.auth.signUp({
    email: formattedEmail,
    password,
    options: {
      data: { full_name: name ? sanitize(name) : '' },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ============================================================
// NETWORKS — Redes Principales
// ============================================================

export async function fetchNetworks(): Promise<(Network & { subnets: Subnet[] })[]> {
  const { data: networks, error } = await supabase
    .from('networks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Obtener subredes para cada red
  const { data: subnets, error: subError } = await supabase
    .from('subnets')
    .select('*')
    .order('created_at', { ascending: true });

  if (subError) throw subError;

  // Obtener conteo de dispositivos por subred
  const { data: devices, error: devError } = await supabase
    .from('devices')
    .select('id, subnet_id');

  if (devError) throw devError;

  return (networks || []).map((net: any) => {
    const netSubnets = (subnets || []).filter((s: any) => s.network_id === net.id);
    const subnetIds = netSubnets.map((s: any) => s.id);
    const deviceCount = (devices || []).filter((d: any) => subnetIds.includes(d.subnet_id)).length;

    return {
      ...net,
      subnet_count: netSubnets.length,
      device_count: deviceCount,
      subnets: netSubnets.map((s: any) => ({
        ...s,
        device_count: (devices || []).filter((d: any) => d.subnet_id === s.id).length,
      })),
    };
  });
}

export async function createNetwork(data: { name: string; address: string; cidr: number; description?: string }) {
  const { data: result, error } = await supabase
    .from('networks')
    .insert({
      name: sanitize(data.name),
      address: sanitize(data.address),
      cidr: data.cidr,
      description: sanitize(data.description || ''),
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateNetwork(id: string, data: Partial<Network>) {
  const { data: result, error } = await supabase
    .from('networks')
    .update({
      ...(data.name && { name: sanitize(data.name) }),
      ...(data.address && { address: sanitize(data.address) }),
      ...(data.cidr !== undefined && { cidr: data.cidr }),
      ...(data.description !== undefined && { description: sanitize(data.description) }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function deleteNetwork(id: string) {
  const { error } = await supabase.from('networks').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// SUBNETS — Subredes
// ============================================================

export async function fetchSubnetsByNetwork(networkId: string): Promise<Subnet[]> {
  const { data, error } = await supabase
    .from('subnets')
    .select('*')
    .eq('network_id', networkId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createSubnet(data: { name: string; address: string; cidr: number; description?: string; network_id: string }) {
  const { data: result, error } = await supabase
    .from('subnets')
    .insert({
      network_id: data.network_id,
      name: sanitize(data.name),
      address: sanitize(data.address),
      cidr: data.cidr,
      description: sanitize(data.description || ''),
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function deleteSubnet(id: string) {
  const { error } = await supabase.from('subnets').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// DEVICES — Dispositivos
// ============================================================

export async function fetchDevices(): Promise<Device[]> {
  const { data: devices, error } = await supabase
    .from('devices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Obtener subredes y redes para joins manuales
  const { data: subnets } = await supabase.from('subnets').select('id, name, network_id');
  const { data: networks } = await supabase.from('networks').select('id, name');
  const { data: buildings } = await supabase.from('buildings').select('id, name');
  const { data: departments } = await supabase.from('departments').select('id, name');

  return (devices || []).map((dev: any) => {
    const subnet = (subnets || []).find((s: any) => s.id === dev.subnet_id);
    const network = subnet ? (networks || []).find((n: any) => n.id === subnet.network_id) : null;
    const building = (buildings || []).find((b: any) => b.id === dev.building_id);
    const department = (departments || []).find((d: any) => d.id === dev.department_id);

    return {
      ...dev,
      subnet_name: subnet?.name || '',
      network_name: network?.name || '',
      building_name: building?.name || '',
      department_name: department?.name || '',
    };
  });
}

export async function fetchDeviceById(id: string): Promise<Device | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDevice(data: {
  name: string;
  mac_address: string;
  manufacturer?: string;
  location?: string;
  ipv4_address: string;
  subnet_id: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  building_id?: string;
  department_id?: string;
}) {
  const { data: result, error } = await supabase
    .from('devices')
    .insert({
      name: sanitize(data.name),
      mac_address: sanitize(data.mac_address).toUpperCase(),
      manufacturer: sanitize(data.manufacturer || ''),
      location: sanitize(data.location || ''),
      ipv4_address: sanitize(data.ipv4_address),
      subnet_id: data.subnet_id,
      description: sanitize(data.description || ''),
      latitude: data.latitude,
      longitude: data.longitude,
      building_id: data.building_id || null,
      department_id: data.department_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function deleteDevice(id: string) {
  const { error } = await supabase.from('devices').delete().eq('id', id);
  if (error) throw error;
}

export async function searchDevices(query: string): Promise<Device[]> {
  const q = sanitize(query).toLowerCase();
  if (!q) return [];

  // Fetch all then filter client-side for flexible multi-field search
  const allDevices = await fetchDevices();
  return allDevices.filter(dev =>
    dev.name.toLowerCase().includes(q) ||
    dev.ipv4_address.toLowerCase().includes(q) ||
    dev.mac_address.toLowerCase().includes(q) ||
    dev.manufacturer.toLowerCase().includes(q) ||
    dev.location.toLowerCase().includes(q) ||
    (dev.subnet_name && dev.subnet_name.toLowerCase().includes(q))
  );
}

// ============================================================
// BUILDINGS & DEPARTMENTS — Edificios y Departamentos
// ============================================================

export async function fetchBuildings(): Promise<Building[]> {
  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;

  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*');

  if (deptError) throw deptError;

  return (buildings || []).map((bld: any) => ({
    ...bld,
    departments: (departments || []).filter((d: any) => d.building_id === bld.id),
  }));
}

export async function createBuilding(data: {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  description?: string;
  department_name?: string;
  department_floor?: string;
}) {
  const { data: building, error } = await supabase
    .from('buildings')
    .insert({
      name: sanitize(data.name),
      code: sanitize(data.code).toUpperCase(),
      latitude: data.latitude,
      longitude: data.longitude,
      description: sanitize(data.description || ''),
    })
    .select()
    .single();

  if (error) throw error;

  // Si hay departamento, crearlo también
  if (data.department_name) {
    await supabase.from('departments').insert({
      building_id: building.id,
      name: sanitize(data.department_name),
      floor: sanitize(data.department_floor || 'Planta Baja'),
    });
  }

  return building;
}

// ============================================================
// INCIDENTS — Incidentes / Reportes de Fallas
// ============================================================

export async function fetchIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createIncident(data: {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  device_id?: string;
  device_name: string;
  device_ip?: string;
  location: string;
}) {
  const { data: result, error } = await supabase
    .from('incidents')
    .insert({
      title: sanitize(data.title),
      description: sanitize(data.description),
      severity: data.severity,
      status: 'open',
      device_id: data.device_id || null,
      device_name: sanitize(data.device_name),
      device_ip: sanitize(data.device_ip || ''),
      location: sanitize(data.location),
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function resolveIncident(id: string) {
  const { data, error } = await supabase
    .from('incidents')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIncident(id: string) {
  const { error } = await supabase.from('incidents').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// MAINTENANCES — Mantenimientos Programados
// ============================================================

export async function fetchMaintenances(): Promise<Maintenance[]> {
  const { data, error } = await supabase
    .from('maintenances')
    .select('*')
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createMaintenance(data: {
  title: string;
  type: 'preventive' | 'firmware' | 'cleaning' | 'ups_battery' | 'audit';
  type_label: string;
  device_name: string;
  location: string;
  scheduled_date: string;
  time_window: string;
  impact?: 'none' | 'partial' | 'full';
  technician: string;
  notes?: string;
}) {
  const { data: result, error } = await supabase
    .from('maintenances')
    .insert({
      title: sanitize(data.title),
      type: data.type,
      type_label: sanitize(data.type_label),
      device_name: sanitize(data.device_name),
      location: sanitize(data.location),
      scheduled_date: sanitize(data.scheduled_date),
      time_window: sanitize(data.time_window),
      impact: data.impact || 'none',
      technician: sanitize(data.technician),
      status: 'scheduled',
      notes: sanitize(data.notes || ''),
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

// ============================================================
// DEVICE CONFIGS — Configuraciones de Dispositivos
// ============================================================

export async function fetchConfigs(): Promise<DeviceConfig[]> {
  const { data, error } = await supabase
    .from('device_configs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createConfig(data: {
  name: string;
  description?: string;
  device_id: string;
  device_name: string;
  device_type?: string;
  file_name: string;
  file_size: string;
  content: string;
  author?: string;
}) {
  const { data: result, error } = await supabase
    .from('device_configs')
    .insert({
      name: sanitize(data.name),
      description: sanitize(data.description || ''),
      device_id: data.device_id,
      device_name: sanitize(data.device_name),
      device_type: sanitize(data.device_type || ''),
      file_name: sanitize(data.file_name),
      file_size: sanitize(data.file_size),
      content: data.content, // No sanitizar contenido de config (puede tener caracteres especiales válidos)
      author: sanitize(data.author || ''),
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateConfig(id: string, data: Partial<DeviceConfig>) {
  const { data: result, error } = await supabase
    .from('device_configs')
    .update({
      ...(data.name && { name: sanitize(data.name) }),
      ...(data.description !== undefined && { description: sanitize(data.description) }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.file_name && { file_name: sanitize(data.file_name) }),
      ...(data.file_size && { file_size: sanitize(data.file_size) }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function deleteConfig(id: string) {
  const { error } = await supabase.from('device_configs').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// DASHBOARD — Estadísticas y Actividad
// ============================================================

export interface DashboardStats {
  totalNetworks: number;
  totalSubnets: number;
  totalDevices: number;
  activeIncidents: number;
  subnetsWithUsage: {
    name: string;
    address: string;
    cidr: number;
    deviceCount: number;
    maxHosts: number;
    percentage: number;
    color: string;
  }[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalNetworks },
    { count: totalSubnets },
    { count: totalDevices },
    { count: activeIncidents },
  ] = await Promise.all([
    supabase.from('networks').select('*', { count: 'exact', head: true }),
    supabase.from('subnets').select('*', { count: 'exact', head: true }),
    supabase.from('devices').select('*', { count: 'exact', head: true }),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
  ]);

  // Obtener subredes con uso para barras de capacidad
  const { data: subnets } = await supabase.from('subnets').select('id, name, address, cidr');
  const { data: devices } = await supabase.from('devices').select('id, subnet_id');

  const colors = ['#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#FF453A'];
  const subnetsWithUsage = (subnets || []).map((s: any, idx: number) => {
    const devCount = (devices || []).filter((d: any) => d.subnet_id === s.id).length;
    const maxHosts = Math.pow(2, 32 - s.cidr) - 2;
    return {
      name: s.name,
      address: s.address,
      cidr: s.cidr,
      deviceCount: devCount,
      maxHosts,
      percentage: maxHosts > 0 ? Math.round((devCount / maxHosts) * 100) : 0,
      color: colors[idx % colors.length],
    };
  }).filter((s: any) => s.deviceCount > 0);

  return {
    totalNetworks: totalNetworks || 0,
    totalSubnets: totalSubnets || 0,
    totalDevices: totalDevices || 0,
    activeIncidents: activeIncidents || 0,
    subnetsWithUsage,
  };
}

export async function fetchRecentActivities(): Promise<RecentActivity[]> {
  const { data, error } = await supabase
    .from('recent_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    statusText: a.status_text,
    timestamp: a.timestamp_label,
    icon: a.icon,
    color: a.color,
  }));
}

// ============================================================
// SUBNETS PARA SELECTORES (lista plana con nombre de red)
// ============================================================

export async function fetchAllSubnetsFlat(): Promise<(Subnet & { network_name: string })[]> {
  const { data: subnets } = await supabase.from('subnets').select('*').order('name');
  const { data: networks } = await supabase.from('networks').select('id, name');

  return (subnets || []).map((s: any) => ({
    ...s,
    network_name: (networks || []).find((n: any) => n.id === s.network_id)?.name || '',
  }));
}
