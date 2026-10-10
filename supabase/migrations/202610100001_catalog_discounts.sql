-- Keep this migration safe to rerun. It repairs older databases that missed
-- earlier store-settings and catalog migrations.
alter table public.products
  add column if not exists image_urls jsonb not null default '[]'::jsonb,
  add column if not exists video_urls jsonb not null default '[]'::jsonb,
  add column if not exists option_groups jsonb not null default '[]'::jsonb,
  add column if not exists compare_at_price integer;

alter table public.store_settings
  add column if not exists whatsapp text not null default '6287725932392',
  add column if not exists whatsapp_greeting text not null default 'Halo KEILAB 👋 Saya ingin bertanya tentang produk dan custom 3D.',
  add column if not exists base_colors jsonb not null default '[{"name":"Putih","value":"#ffffff"},{"name":"Hitam","value":"#18181b"},{"name":"Merah","value":"#ef4444"},{"name":"Orange","value":"#f97316"},{"name":"Kuning","value":"#facc15"},{"name":"Hijau","value":"#22c55e"},{"name":"Biru","value":"#3b82f6"},{"name":"Ungu","value":"#8b5cf6"},{"name":"Pink","value":"#ec4899"}]'::jsonb,
  add column if not exists cap_colors jsonb not null default '[{"name":"Putih","value":"#ffffff"},{"name":"Hitam","value":"#18181b"},{"name":"Merah","value":"#ef4444"},{"name":"Orange","value":"#f97316"},{"name":"Kuning","value":"#facc15"},{"name":"Hijau","value":"#22c55e"},{"name":"Biru","value":"#3b82f6"},{"name":"Ungu","value":"#8b5cf6"},{"name":"Pink","value":"#ec4899"}]'::jsonb,
  add column if not exists font_colors jsonb not null default '[{"name":"Putih","value":"#ffffff"},{"name":"Hitam","value":"#18181b"},{"name":"Merah","value":"#ef4444"},{"name":"Orange","value":"#f97316"},{"name":"Kuning","value":"#facc15"},{"name":"Hijau","value":"#22c55e"},{"name":"Biru","value":"#3b82f6"},{"name":"Ungu","value":"#8b5cf6"},{"name":"Pink","value":"#ec4899"}]'::jsonb,
  add column if not exists clicker_starting_price integer not null default 54000,
  add column if not exists price_per_extra_keycap integer not null default 5000,
  add column if not exists instagram_url text not null default '',
  add column if not exists tiktok_url text not null default '',
  add column if not exists shopee_url text not null default '',
  add column if not exists updated_at timestamptz not null default now();

insert into public.store_settings (id, whatsapp, whatsapp_greeting)
values ('default', '6287725932392', 'Halo KEILAB 👋 Saya ingin bertanya tentang produk dan custom 3D.')
on conflict (id) do nothing;

create or replace function public.get_public_catalog_product_gallery(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path to 'public'
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'image_url', p.image_url,
    'image_urls', case
      when jsonb_typeof(p.image_urls) = 'array' and p.image_urls <> '[]'::jsonb then p.image_urls
      when p.image_url is not null then jsonb_build_array(p.image_url)
      else '[]'::jsonb
    end,
    'video_urls', coalesce(p.video_urls, '[]'::jsonb),
    'option_groups', coalesce(p.option_groups, '[]'::jsonb),
    'price', p.price,
    'compare_at_price', p.compare_at_price,
    'stock', p.stock,
    'category', p.category,
    'description', p.description
  )
  from public.products p
  where p.id = p_id and p.is_active = true
  limit 1;
$$;

revoke all on function public.get_public_catalog_product_gallery(uuid) from public;
grant execute on function public.get_public_catalog_product_gallery(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
