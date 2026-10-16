alter table public.store_settings
  add column if not exists catalog_categories jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
