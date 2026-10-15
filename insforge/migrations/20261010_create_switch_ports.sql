create table if not exists public.switch_ports (
  id uuid primary key default gen_random_uuid(),
  switch_device_id uuid not null references public.devices(id) on delete cascade,
  port_label text not null check (length(trim(port_label)) > 0),
  status text not null default 'available' check (status in ('available', 'in_use')),
  connected_device text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (switch_device_id, port_label)
);

create index if not exists switch_ports_switch_device_id_idx
  on public.switch_ports (switch_device_id);

alter table public.switch_ports enable row level security;

create policy "Authenticated users can view switch ports"
  on public.switch_ports for select to authenticated
  using (true);

create policy "Authenticated users can add switch ports"
  on public.switch_ports for insert to authenticated
  with check (true);

create policy "Authenticated users can update switch ports"
  on public.switch_ports for update to authenticated
  using (true) with check (true);

create policy "Authenticated users can delete switch ports"
  on public.switch_ports for delete to authenticated
  using (true);

grant select, insert, update, delete on public.switch_ports to authenticated;
