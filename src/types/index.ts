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
  Dashboard: undefined;
  Redes: undefined;
  Inventario: undefined;
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
