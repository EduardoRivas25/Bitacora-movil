// src/services/api.ts
// ============================================================
// ARCHIVO CENTRALIZADO DE TODAS LAS LLAMADAS AL BACKEND
// Con soporte para caché en memoria ultra-rápida,
// consultas paralelas e invalidación inteligente.
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
// SISTEMA DE CACHÉ EN MEMORIA
// ============================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 30000; // 30 segundos de vigencia
const memoryCache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(...keys: string[]): void {
  if (keys.length === 0) {
    memoryCache.clear();
  } else {
    keys.forEach(k => {
      for (const cacheKey of memoryCache.keys()) {
        if (cacheKey === k || cacheKey.startsWith(k)) {
          memoryCache.delete(cacheKey);
        }
      }
    });
  }
}

// ============================================================
// HELPERS DE SANITIZACIÓN Y MANEJO DE ERRORES
// ============================================================
function sanitize(input: string): string {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
}

export function translateAuthError(errorMsg: string): string {
  const msg = (errorMsg || '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Correo o contraseña incorrectos. Verifica tus credenciales.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Este correo electrónico ya se encuentra registrado.';
  }
  if (msg.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (msg.includes('email not confirmed')) {
    return 'El correo no ha sido confirmado en Supabase.';
  }
  if (msg.includes('rate limit')) {
    return 'Demasiados intentos. Por favor espera unos momentos.';
  }
  return errorMsg || 'Ocurrió un error inesperado al autenticar.';
}

function formatEmail(input: string): string {
  const clean = sanitize(input).toLowerCase();
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
    throw new Error(translateAuthError(error.message));
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
  if (error) {
    throw new Error(translateAuthError(error.message));
  }
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
  invalidateCache();
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

export async function fetchNetworks(forceRefresh = false): Promise<(Network & { subnets: Subnet[] })[]> {
  if (!forceRefresh) {
    const cached = getCached<(Network & { subnets: Subnet[] })[]>('networks');
    if (cached) return cached;
  }

  // Ejecutar consultas en paralelo para máxima velocidad
  const [
    { data: networks, error: netError },
    { data: subnets, error: subError },
    { data: devices, error: devError },
  ] = await Promise.all([
    supabase.from('networks').select('*').order('created_at', { ascending: false }),
    supabase.from('subnets').select('*').order('created_at', { ascending: true }),
    supabase.from('devices').select('id, subnet_id'),
  ]);

  if (netError) throw netError;
  if (subError) throw subError;
  if (devError) throw devError;

  const result = (networks || []).map((net: any) => {
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

  setCache('networks', result);
  return result;
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
  invalidateCache('networks', 'dashboard_stats');
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
  invalidateCache('networks', 'dashboard_stats');
  return result;
}

export async function deleteNetwork(id: string) {
  const { error } = await supabase.from('networks').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('networks', 'subnets', 'devices', 'dashboard_stats');
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
  invalidateCache('networks', 'subnets_flat', 'dashboard_stats');
  return result;
}

export async function deleteSubnet(id: string) {
  const { error } = await supabase.from('subnets').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('networks', 'subnets_flat', 'devices', 'dashboard_stats');
}

// ============================================================
// DEVICES — Dispositivos
// ============================================================

export async function fetchDevices(forceRefresh = false): Promise<Device[]> {
  if (!forceRefresh) {
    const cached = getCached<Device[]>('devices');
    if (cached) return cached;
  }

  // Cargar tablas maestras en paralelo
  const [
    { data: devices, error },
    { data: subnets },
    { data: networks },
    { data: buildings },
    { data: departments },
  ] = await Promise.all([
    supabase.from('devices').select('*').order('created_at', { ascending: false }),
    supabase.from('subnets').select('id, name, network_id'),
    supabase.from('networks').select('id, name'),
    supabase.from('buildings').select('id, name'),
    supabase.from('departments').select('id, name'),
  ]);

  if (error) throw error;

  const result = (devices || []).map((dev: any) => {
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

  setCache('devices', result);
  return result;
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
  invalidateCache('devices', 'networks', 'dashboard_stats');
  return result;
}

export async function deleteDevice(id: string) {
  const { error } = await supabase.from('devices').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('devices', 'networks', 'dashboard_stats');
}

export async function searchDevices(query: string): Promise<Device[]> {
  const q = sanitize(query).toLowerCase();
  if (!q) return [];

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

export async function fetchBuildings(forceRefresh = false): Promise<Building[]> {
  if (!forceRefresh) {
    const cached = getCached<Building[]>('buildings');
    if (cached) return cached;
  }

  const [
    { data: buildings, error },
    { data: departments, error: deptError },
  ] = await Promise.all([
    supabase.from('buildings').select('*').order('name', { ascending: true }),
    supabase.from('departments').select('*'),
  ]);

  if (error) throw error;
  if (deptError) throw deptError;

  const result = (buildings || []).map((bld: any) => ({
    ...bld,
    departments: (departments || []).filter((d: any) => d.building_id === bld.id),
  }));

  setCache('buildings', result);
  return result;
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

  if (data.department_name && data.department_name.trim()) {
    await supabase.from('departments').insert({
      building_id: building.id,
      name: sanitize(data.department_name),
      floor: sanitize(data.department_floor || 'Planta Baja'),
    });
  }

  invalidateCache('buildings', 'devices');
  return building;
}

export async function deleteBuilding(id: string) {
  await supabase.from('departments').delete().eq('building_id', id);
  const { error } = await supabase.from('buildings').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('buildings', 'devices');
  return true;
}

export async function createDepartment(data: {
  building_id: string;
  name: string;
  floor?: string;
}) {
  const { data: dept, error } = await supabase
    .from('departments')
    .insert({
      building_id: data.building_id,
      name: sanitize(data.name),
      floor: sanitize(data.floor || 'Planta Baja'),
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('buildings', 'devices');
  return dept;
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('buildings', 'devices');
  return true;
}

// ============================================================
// INCIDENTS — Incidentes / Reportes de Fallas
// ============================================================

export async function fetchIncidents(forceRefresh = false): Promise<Incident[]> {
  if (!forceRefresh) {
    const cached = getCached<Incident[]>('incidents');
    if (cached) return cached;
  }

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const result = data || [];
  setCache('incidents', result);
  return result;
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
  invalidateCache('incidents', 'dashboard_stats');
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
  invalidateCache('incidents', 'dashboard_stats');
  return data;
}

export async function deleteIncident(id: string) {
  const { error } = await supabase.from('incidents').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('incidents', 'dashboard_stats');
}

// ============================================================
// MAINTENANCES — Mantenimientos Programados
// ============================================================

export async function fetchMaintenances(forceRefresh = false): Promise<Maintenance[]> {
  if (!forceRefresh) {
    const cached = getCached<Maintenance[]>('maintenances');
    if (cached) return cached;
  }

  const { data, error } = await supabase
    .from('maintenances')
    .select('*')
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  const result = data || [];
  setCache('maintenances', result);
  return result;
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
  invalidateCache('maintenances');
  return result;
}

export async function deleteMaintenance(id: string) {
  const { error } = await supabase.from('maintenances').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('maintenances');
}

// ============================================================
// DEVICE CONFIGS — Configuraciones de Dispositivos
// ============================================================

export async function fetchConfigs(forceRefresh = false): Promise<DeviceConfig[]> {
  if (!forceRefresh) {
    const cached = getCached<DeviceConfig[]>('configs');
    if (cached) return cached;
  }

  const { data, error } = await supabase
    .from('device_configs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const result = data || [];
  setCache('configs', result);
  return result;
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
      content: data.content,
      author: sanitize(data.author || ''),
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('configs');
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
  invalidateCache('configs');
  return result;
}

export async function deleteConfig(id: string) {
  const { error } = await supabase.from('device_configs').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('configs');
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

export async function fetchDashboardStats(forceRefresh = false): Promise<DashboardStats> {
  if (!forceRefresh) {
    const cached = getCached<DashboardStats>('dashboard_stats');
    if (cached) return cached;
  }

  const [
    { count: totalNetworks },
    { count: totalSubnets },
    { count: totalDevices },
    { count: activeIncidents },
    { data: subnets },
    { data: devices },
  ] = await Promise.all([
    supabase.from('networks').select('*', { count: 'exact', head: true }),
    supabase.from('subnets').select('*', { count: 'exact', head: true }),
    supabase.from('devices').select('*', { count: 'exact', head: true }),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
    supabase.from('subnets').select('id, name, address, cidr'),
    supabase.from('devices').select('id, subnet_id'),
  ]);

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

  const result: DashboardStats = {
    totalNetworks: totalNetworks || 0,
    totalSubnets: totalSubnets || 0,
    totalDevices: totalDevices || 0,
    activeIncidents: activeIncidents || 0,
    subnetsWithUsage,
  };

  setCache('dashboard_stats', result);
  return result;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Reciente';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Reciente';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Justo ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} d`;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  } catch {
    return 'Reciente';
  }
}

export async function fetchRecentActivities(forceRefresh = false): Promise<RecentActivity[]> {
  if (!forceRefresh) {
    const cached = getCached<RecentActivity[]>('recent_activities');
    if (cached) return cached;
  }

  try {
    // 1. Consultar eventos reales en paralelo desde tablas activas
    const [
      { data: incData },
      { data: maintData },
      { data: cfgData },
      { data: devData },
    ] = await Promise.all([
      supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(6),
      supabase.from('maintenances').select('*').order('created_at', { ascending: false }).limit(4),
      supabase.from('device_configs').select('*').order('created_at', { ascending: false }).limit(4),
      supabase.from('devices').select('id, name, ipv4_address, location, created_at').order('created_at', { ascending: false }).limit(4),
    ]);

    const events: (RecentActivity & { rawDate: number })[] = [];

    // Transformar incidentes
    (incData || []).forEach((inc: any) => {
      const isResolved = inc.status === 'resolved';
      const isCritical = inc.severity === 'critical';
      const isHigh = inc.severity === 'high';
      
      events.push({
        id: `inc-${inc.id}`,
        name: inc.device_name || 'Equipo de Red',
        status: isResolved ? 'online' : isCritical ? 'offline' : 'warning',
        statusText: isResolved 
          ? `Incidente Resuelto: ${inc.title}`
          : `[${inc.severity.toUpperCase()}] ${inc.title} - ${inc.location || 'Red'}`,
        timestamp: formatRelativeTime(isResolved ? (inc.resolved_at || inc.created_at) : inc.created_at),
        icon: isResolved ? 'check-circle' : 'alert-triangle',
        color: isResolved ? '#30D158' : isCritical ? '#FF453A' : isHigh ? '#FF9F0A' : '#FFD60A',
        rawDate: new Date(inc.created_at || 0).getTime(),
      });
    });

    // Transformar mantenimientos
    (maintData || []).forEach((mnt: any) => {
      events.push({
        id: `mnt-${mnt.id}`,
        name: mnt.device_name || 'Mantenimiento de Red',
        status: mnt.status === 'completed' ? 'online' : 'warning',
        statusText: `${mnt.title} (${mnt.scheduled_date || 'Próximo'} • ${mnt.time_window || 'NOC'})`,
        timestamp: formatRelativeTime(mnt.created_at),
        icon: 'tool',
        color: '#BF5AF2',
        rawDate: new Date(mnt.created_at || 0).getTime(),
      });
    });

    // Transformar backups y configuraciones
    (cfgData || []).forEach((cfg: any) => {
      events.push({
        id: `cfg-${cfg.id}`,
        name: cfg.device_name || cfg.name,
        status: 'online',
        statusText: `Backup guardado: ${cfg.file_name} (${cfg.file_size || 'Script'})`,
        timestamp: formatRelativeTime(cfg.created_at),
        icon: 'file-text',
        color: '#0A84FF',
        rawDate: new Date(cfg.created_at || 0).getTime(),
      });
    });

    // Transformar dispositivos registrados
    (devData || []).forEach((dev: any) => {
      events.push({
        id: `dev-${dev.id}`,
        name: dev.name,
        status: 'online',
        statusText: `Equipo activo en ${dev.location || 'Campus'} (${dev.ipv4_address || 'Sin IP'})`,
        timestamp: formatRelativeTime(dev.created_at),
        icon: 'cpu',
        color: '#64D2FF',
        rawDate: new Date(dev.created_at || 0).getTime(),
      });
    });

    // Ordenar cronológicamente descendente y tomar únicamente los últimos 3 eventos
    events.sort((a, b) => b.rawDate - a.rawDate);
    const result: RecentActivity[] = events.slice(0, 3).map(({ rawDate, ...item }) => item);

    setCache('recent_activities', result);
    return result;
  } catch (err) {
    console.error('Error calculando eventos de infraestructura:', err);
    return [];
  }
}

// ============================================================
// SUBNETS PARA SELECTORES (lista plana con nombre de red)
// ============================================================

export async function fetchAllSubnetsFlat(forceRefresh = false): Promise<(Subnet & { network_name: string })[]> {
  if (!forceRefresh) {
    const cached = getCached<(Subnet & { network_name: string })[]>('subnets_flat');
    if (cached) return cached;
  }

  const [
    { data: subnets },
    { data: networks },
  ] = await Promise.all([
    supabase.from('subnets').select('*').order('name'),
    supabase.from('networks').select('id, name'),
  ]);

  const result = (subnets || []).map((s: any) => ({
    ...s,
    network_name: (networks || []).find((n: any) => n.id === s.network_id)?.name || '',
  }));

  setCache('subnets_flat', result);
  return result;
}
