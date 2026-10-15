import type { UserSchema } from '@insforge/sdk';
import { getAccountRole } from '../services/auth';

export function isAdministrator(user: UserSchema | null): boolean {
  return getAccountRole(user) === 'Administrador';
}

export function canManageDevices(user: UserSchema | null): boolean {
  const role = getAccountRole(user);
  return role === 'Administrador' || role === 'Técnico de red';
}

export function canManageNetworks(user: UserSchema | null): boolean {
  return canManageDevices(user);
}

export function canManageIncidents(user: UserSchema | null): boolean {
  return canManageDevices(user);
}
