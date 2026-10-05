create table if not exists public.store_settings (
  id text primary key check (id = 'default'),
  whatsapp text not null,
  whatsapp_greeting text not null,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
revoke all on table public.store_settings from public, anon, authenticated;
grant select, insert, update on table public.store_settings to service_role;

insert into public.store_settings (id, whatsapp, whatsapp_greeting)
values (
  'default',
  '6287725932392',
  'Halo KEILAB 👋 Saya ingin bertanya tentang produk dan custom 3D.'
)
on conflict (id) do nothing;