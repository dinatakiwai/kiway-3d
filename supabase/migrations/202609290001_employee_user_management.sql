begin;
alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists permissions jsonb not null default '{"orders":{"read":false,"write":false},"inventory":{"read":false,"write":false},"production":{"read":false,"write":false},"products":{"read":false,"write":false},"finance":{"read":false,"write":false}}'::jsonb;

create or replace function public.has_module_permission(p_module text, p_action text default 'read')
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active = true
      and (p.role = 'admin' or coalesce((p.permissions -> p_module ->> p_action)::boolean, false))
  );
$$;
revoke all on function public.has_module_permission(text, text) from public, anon;
grant execute on function public.has_module_permission(text, text) to authenticated;

drop policy if exists "Allow authenticated inventory read" on public.inventory;
create policy "Authorized inventory read" on public.inventory for select to authenticated using (public.has_module_permission('inventory','read'));
drop policy if exists "Allow authenticated inventory insert" on public.inventory;
create policy "Authorized inventory insert" on public.inventory for insert to authenticated with check (public.has_module_permission('inventory','write'));
drop policy if exists "Allow authenticated inventory update" on public.inventory;
create policy "Authorized inventory update" on public.inventory for update to authenticated using (public.has_module_permission('inventory','write')) with check (public.has_module_permission('inventory','write'));
drop policy if exists "Allow authenticated inventory delete" on public.inventory;
create policy "Authorized inventory delete" on public.inventory for delete to authenticated using (public.has_module_permission('inventory','write'));

drop policy if exists "Authenticated can view inventory transactions" on public.inventory_transactions;
create policy "Authorized inventory transactions read" on public.inventory_transactions for select to authenticated using (public.has_module_permission('inventory','read'));
drop policy if exists "Authenticated can insert inventory transactions" on public.inventory_transactions;
create policy "Authorized inventory transactions insert" on public.inventory_transactions for insert to authenticated with check (public.has_module_permission('inventory','write'));

drop policy if exists "Authenticated can view operating costs" on public.operating_costs;
create policy "Authorized costs read" on public.operating_costs for select to authenticated using (public.has_module_permission('finance','read'));
drop policy if exists "Authenticated can insert operating costs" on public.operating_costs;
create policy "Authorized costs insert" on public.operating_costs for insert to authenticated with check (public.has_module_permission('finance','write'));
drop policy if exists "Authenticated can update operating costs" on public.operating_costs;
create policy "Authorized costs update" on public.operating_costs for update to authenticated using (public.has_module_permission('finance','write')) with check (public.has_module_permission('finance','write'));
drop policy if exists "Authenticated can delete operating costs" on public.operating_costs;
create policy "Authorized costs delete" on public.operating_costs for delete to authenticated using (public.has_module_permission('finance','write'));

drop policy if exists "Allow authenticated admin read orders" on public.orders;
create policy "Authorized orders read" on public.orders for select to authenticated using (public.has_module_permission('orders','read'));
drop policy if exists "Allow authenticated admin update orders" on public.orders;
create policy "Authorized orders update" on public.orders for update to authenticated using (public.has_module_permission('orders','write')) with check (public.has_module_permission('orders','write'));

drop policy if exists "product costing items select" on public.product_cost_template_items;
create policy "Authorized costing items read" on public.product_cost_template_items for select to authenticated using (public.has_module_permission('finance','read'));
drop policy if exists "product costing items insert" on public.product_cost_template_items;
create policy "Authorized costing items insert" on public.product_cost_template_items for insert to authenticated with check (public.has_module_permission('finance','write'));
drop policy if exists "product costing items update" on public.product_cost_template_items;
create policy "Authorized costing items update" on public.product_cost_template_items for update to authenticated using (public.has_module_permission('finance','write')) with check (public.has_module_permission('finance','write'));
drop policy if exists "product costing items delete" on public.product_cost_template_items;
create policy "Authorized costing items delete" on public.product_cost_template_items for delete to authenticated using (public.has_module_permission('finance','write'));

drop policy if exists "product costing templates select" on public.product_cost_templates;
create policy "Authorized costing templates read" on public.product_cost_templates for select to authenticated using (public.has_module_permission('finance','read'));
drop policy if exists "product costing templates insert" on public.product_cost_templates;
create policy "Authorized costing templates insert" on public.product_cost_templates for insert to authenticated with check (public.has_module_permission('finance','write'));
drop policy if exists "product costing templates update" on public.product_cost_templates;
create policy "Authorized costing templates update" on public.product_cost_templates for update to authenticated using (public.has_module_permission('finance','write')) with check (public.has_module_permission('finance','write'));
drop policy if exists "product costing templates delete" on public.product_cost_templates;
create policy "Authorized costing templates delete" on public.product_cost_templates for delete to authenticated using (public.has_module_permission('finance','write'));

drop policy if exists "Authenticated can view production records" on public.production_records;
create policy "Authorized production read" on public.production_records for select to authenticated using (public.has_module_permission('production','read'));
drop policy if exists "Authenticated can insert production records" on public.production_records;
create policy "Authorized production insert" on public.production_records for insert to authenticated with check (public.has_module_permission('production','write'));
drop policy if exists "Authenticated can view production material records" on public.production_record_materials;
create policy "Authorized production material read" on public.production_record_materials for select to authenticated using (public.has_module_permission('production','read'));
drop policy if exists "Authenticated can insert production material records" on public.production_record_materials;
create policy "Authorized production material insert" on public.production_record_materials for insert to authenticated with check (public.has_module_permission('production','write'));

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authorized product management" on public.products for all to authenticated using (public.has_module_permission('products','write')) with check (public.has_module_permission('products','write'));
commit;
