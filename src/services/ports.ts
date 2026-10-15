import { insforge } from '../lib/insforgeClient';
import { SwitchPort } from '../types';

export async function fetchSwitchPorts(): Promise<SwitchPort[]> {
  const { data, error } = await insforge.database
    .from('switch_ports')
    .select('*')
    .order('port_label', { ascending: true });

  if (error) throw error;
  return (data || []) as SwitchPort[];
}

export async function createSwitchPort(input: {
  switch_device_id: string;
  port_label: string;
  status: SwitchPort['status'];
  connected_device: string;
  notes: string;
}): Promise<SwitchPort> {
  const { data, error } = await insforge.database
    .from('switch_ports')
    .insert([{
      ...input,
      port_label: input.port_label.trim(),
      connected_device: input.connected_device.trim(),
      notes: input.notes.trim(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data as SwitchPort;
}

export async function updateSwitchPort(
  id: string,
  changes: Pick<SwitchPort, 'status' | 'connected_device' | 'notes'>,
): Promise<SwitchPort> {
  const { data, error } = await insforge.database
    .from('switch_ports')
    .update({
      ...changes,
      connected_device: changes.connected_device.trim(),
      notes: changes.notes.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SwitchPort;
}

