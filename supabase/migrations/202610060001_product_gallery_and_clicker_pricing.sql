alter table public.products
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

update public.products
set image_urls = jsonb_build_array(image_url)
where image_url is not null
  and image_urls = '[]'::jsonb;

alter table public.store_settings
  add column if not exists clicker_starting_price integer not null default 54000,
  add column if not exists price_per_extra_keycap integer not null default 5000;

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
    'price', p.price,
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
