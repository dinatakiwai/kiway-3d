create table if not exists public.store_settings (
  id text primary key check (id = 'default'),
  whatsapp text not null,
  whatsapp_greeting text not null,
  clicker_colors jsonb not null default '[{"name":"Putih","value":"#ffffff"},{"name":"Hitam","value":"#18181b"},{"name":"Merah","value":"#ef4444"},{"name":"Orange","value":"#f97316"},{"name":"Kuning","value":"#facc15"},{"name":"Hijau","value":"#22c55e"},{"name":"Biru","value":"#3b82f6"},{"name":"Ungu","value":"#8b5cf6"},{"name":"Pink","value":"#ec4899"}]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.store_settings
  add column if not exists clicker_colors jsonb not null default '[{"name":"Putih","value":"#ffffff"},{"name":"Hitam","value":"#18181b"},{"name":"Merah","value":"#ef4444"},{"name":"Orange","value":"#f97316"},{"name":"Kuning","value":"#facc15"},{"name":"Hijau","value":"#22c55e"},{"name":"Biru","value":"#3b82f6"},{"name":"Ungu","value":"#8b5cf6"},{"name":"Pink","value":"#ec4899"}]'::jsonb;

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