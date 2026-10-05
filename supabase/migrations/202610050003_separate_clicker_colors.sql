alter table public.store_settings
  add column if not exists base_colors jsonb,
  add column if not exists cap_colors jsonb,
  add column if not exists font_colors jsonb;

alter table public.store_settings
  alter column base_colors set default '[{"name":"Putih","value":"#ffffff"},{"name":"Hitam","value":"#18181b"},{"name":"Merah","value":"#ef4444"},{"name":"Orange","value":"#f97316"},{"name":"Kuning","value":"#facc15"},{"name":"Hijau","value":"#22c55e"},{"name":"Biru","value":"#3b82f6"},{"name":"Ungu","value":"#8b5cf6"},{"name":"Pink","value":"#ec4899"}]'::jsonb,
  alter column cap_colors set default '[{"name":"Putih","value":"#ffffff"},{"name":"Hitam","value":"#18181b"},{"name":"Merah","value":"#ef4444"},{"name":"Orange","value":"#f97316"},{"name":"Kuning","value":"#facc15"},{"name":"Hijau","value":"#22c55e"},{"name":"Biru","value":"#3b82f6"},{"name":"Ungu","value":"#8b5cf6"},{"name":"Pink","value":"#ec4899"}]'::jsonb,
  alter column font_colors set default '[{"name":"Putih","value":"#ffffff"},{"name":"Hitam","value":"#18181b"},{"name":"Merah","value":"#ef4444"},{"name":"Orange","value":"#f97316"},{"name":"Kuning","value":"#facc15"},{"name":"Hijau","value":"#22c55e"},{"name":"Biru","value":"#3b82f6"},{"name":"Ungu","value":"#8b5cf6"},{"name":"Pink","value":"#ec4899"}]'::jsonb;

update public.store_settings
set base_colors = coalesce(base_colors, clicker_colors),
    cap_colors = coalesce(cap_colors, clicker_colors),
    font_colors = coalesce(font_colors, clicker_colors);

alter table public.store_settings
  alter column base_colors set not null,
  alter column cap_colors set not null,
  alter column font_colors set not null;
