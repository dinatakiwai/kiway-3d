alter table public.products
  add column if not exists compare_at_price integer;

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
