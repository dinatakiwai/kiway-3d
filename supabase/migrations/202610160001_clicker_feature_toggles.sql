alter table public.store_settings
  add column if not exists classic_clicker_enabled boolean not null default true,
  add column if not exists image_clicker_enabled boolean not null default true;
