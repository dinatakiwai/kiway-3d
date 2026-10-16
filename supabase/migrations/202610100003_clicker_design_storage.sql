-- Private storage for customer clicker images and generated 3MF design files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-clicker-designs', 'customer-clicker-designs', false, 8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'model/3mf', 'application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
