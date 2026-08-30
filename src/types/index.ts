// Tipos de datos para la aplicación Bitácora de Redes

export interface Network {
  id: string;
  name: string;
  address: string;
  cidr: number;
  description: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Campos calculados (no en BD)
  subnet_count?: number;
  device_count?: number;
}

export interface Subnet {
  id: string;
  network_id: string;
  name: string;
  address: string;
  cidr: number;
  description: string;
  created_at: string;
  updated_at: string;
  // Campos calculados
  device_count?: number;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  description?: string;
  departments: Department[];
}

export interface Department {
  id: string;
  building_id: string;
  name: string;
  floor: string;
}

export interface Device {
  id: string;
  subnet_id: string;
  name: string;
  mac_address: string;
  manufacturer: string;
  location: string;
  ipv4_address: string;
  description: string;
  created_at: string;
  updated_at: string;
  // Ubicación en mapa
  latitude?: number;
  longitude?: number;
  building_id?: string;
  building_name?: string;
  department_id?: string;
  department_name?: string;
  // Campos calculados (join)
  subnet_name?: string;
  network_name?: string;
}

export interface NetworkFormData {
  name: string;
  address: string;
  cidr: string;
  description: string;
}

export interface SubnetFormData {
  name: string;
  address: string;
  cidr: string;
  description: string;
  network_id: string;
}

export interface DeviceFormData {
  name: string;
  mac_address: string;
  manufacturer: string;
  location: string;
  ipv4_address: string;
  subnet_id: string;
  description: string;
  latitude?: number;
  longitude?: number;
  building_id?: string;
  department_id?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  device_id: string;
  device_name: string;
  device_ip?: string;
  location: string;
  created_at: string;
  resolved_at?: string;
}

export interface Maintenance {
  id: string;
  title: string;
  type: 'preventive' | 'firmware' | 'cleaning' | 'ups_battery' | 'audit';
  type_label: string;
  device_name: string;
  location: string;
  scheduled_date: string;
  time_window: string;
  impact: 'none' | 'partial' | 'full';
  technician: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  notes?: string;
}

export interface DeviceConfig {
  id: string;
  name: string;
  description: string;
  device_id: string;
  device_name: string;
  device_type: string;
  file_name: string;
  file_size: string;
  content: string;
  created_at: string;
  author: string;
}

// Tipos de navegación
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  NetworkDetail: { networkId: string; networkName: string };
  NetworkForm: { network?: Network } | undefined;
  SubnetForm: { networkId: string; subnet?: Subnet } | undefined;
  DeviceDetail: { deviceId: string; deviceName: string };
  DeviceForm: { subnetId: string; device?: Device } | undefined;
};

export type BottomTabParamList = {
  Inicio: undefined;
  Dispositivos: undefined;
  Redes: undefined;
  Mapa: undefined;
  Incidentes: undefined;
  Configuraciones: undefined;
  Buscar: undefined;
};

// Tipo para la actividad reciente del dashboard
export interface RecentActivity {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  statusText: string;
  timestamp: string;
  icon: string;
  color: string;
}
