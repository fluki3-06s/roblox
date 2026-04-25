-- Kyromac core schema
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.topup_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_points integer not null check (amount_points > 0),
  source text not null default 'truemoney',
  reference text,
  status text not null default 'success' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.store_products (
  code text primary key,
  name text not null,
  category text not null check (category in ('KEY', 'RESETHWID')),
  duration_days integer check (duration_days is null or duration_days > 0),
  price_points integer not null check (price_points >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null references public.store_products(code),
  price_points integer not null check (price_points >= 0),
  status text not null default 'success' check (status in ('success', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null references public.store_products(code),
  key_code text not null unique,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  bound_device_hash text,
  last_heartbeat_at timestamptz,
  reset_hwid_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.hwid_reset_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_purchase_id uuid references public.purchase_transactions(id) on delete set null,
  status text not null default 'available' check (status in ('available', 'used')),
  used_for_license_id uuid references public.licenses(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_user_id uuid references auth.users(id),
  target_license_id uuid references public.licenses(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_topup_user_created_at on public.topup_transactions(user_id, created_at desc);
create index if not exists idx_purchase_user_created_at on public.purchase_transactions(user_id, created_at desc);
create index if not exists idx_license_user_created_at on public.licenses(user_id, created_at desc);
create index if not exists idx_license_status_expires on public.licenses(status, expires_at);
create index if not exists idx_hwid_reset_credits_user_status on public.hwid_reset_credits(user_id, status, created_at desc);

alter table public.user_wallets enable row level security;
alter table public.topup_transactions enable row level security;
alter table public.store_products enable row level security;
alter table public.purchase_transactions enable row level security;
alter table public.licenses enable row level security;
alter table public.hwid_reset_credits enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "wallet_select_own" on public.user_wallets;
create policy "wallet_select_own" on public.user_wallets
for select using (auth.uid() = user_id);

drop policy if exists "topup_select_own" on public.topup_transactions;
create policy "topup_select_own" on public.topup_transactions
for select using (auth.uid() = user_id);

drop policy if exists "store_products_select_all" on public.store_products;
create policy "store_products_select_all" on public.store_products
for select using (is_active = true);

drop policy if exists "purchase_select_own" on public.purchase_transactions;
create policy "purchase_select_own" on public.purchase_transactions
for select using (auth.uid() = user_id);

drop policy if exists "licenses_select_own" on public.licenses;
create policy "licenses_select_own" on public.licenses
for select using (auth.uid() = user_id);

drop policy if exists "hwid_reset_credits_select_own" on public.hwid_reset_credits;
create policy "hwid_reset_credits_select_own" on public.hwid_reset_credits
for select using (auth.uid() = user_id);

drop policy if exists "admin_users_select_none" on public.admin_users;
create policy "admin_users_select_none" on public.admin_users
for select using (false);

drop policy if exists "admin_audit_logs_select_none" on public.admin_audit_logs;
create policy "admin_audit_logs_select_none" on public.admin_audit_logs
for select using (false);

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.admin_users a
    where a.user_id = uid
  );
$$;

create or replace function public.is_owner(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select uid = '4e0f53df-a558-4bf2-be37-125ef5079a80'::uuid;
$$;

create or replace function public.log_admin_event(
  action_name text,
  target_uid uuid default null,
  target_lid uuid default null,
  detail_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_user_id,
    target_license_id,
    details
  )
  values (
    uid,
    action_name,
    target_uid,
    target_lid,
    coalesce(detail_data, '{}'::jsonb)
  );
end;
$$;

create or replace function public.ensure_wallet_exists(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_wallets (user_id, points)
  values (target_user_id, 0)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.redeem_topup(amount integer, source_name text, ref text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_balance integer;
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  perform public.ensure_wallet_exists(uid);

  update public.user_wallets
  set points = points + amount,
      updated_at = now()
  where user_id = uid
  returning points into new_balance;

  insert into public.topup_transactions (user_id, amount_points, source, reference, status)
  values (uid, amount, coalesce(source_name, 'truemoney'), ref, 'success');

  return new_balance;
end;
$$;

create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  users_count integer;
  active_licenses_count integer;
  total_topups integer;
  total_revenue_points integer;
  online_24h integer;
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  select count(*) into users_count from auth.users;
  select count(*) into active_licenses_count from public.licenses where status = 'active';
  select count(*) into total_topups from public.topup_transactions where status = 'success';
  select coalesce(sum(amount_points), 0) into total_revenue_points from public.topup_transactions where status = 'success';
  select count(*) into online_24h from public.licenses where last_heartbeat_at >= now() - interval '24 hours';

  return jsonb_build_object(
    'usersCount', users_count,
    'activeLicensesCount', active_licenses_count,
    'totalTopups', total_topups,
    'totalRevenuePoints', total_revenue_points,
    'online24h', online_24h
  );
end;
$$;

drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  points integer,
  total_topups integer,
  active_licenses integer,
  reset_credits_available integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  return query
    select
      u.id as user_id,
      u.email::text,
      coalesce(w.points, 0) as points,
      coalesce(t.total_topups, 0)::integer as total_topups,
      coalesce(l.active_licenses, 0)::integer as active_licenses,
      coalesce(r.reset_credits_available, 0)::integer as reset_credits_available,
      u.created_at
    from auth.users u
    left join public.user_wallets w
      on w.user_id = u.id
    left join (
      select tt.user_id, count(*) as total_topups
      from public.topup_transactions tt
      where tt.status = 'success'
      group by tt.user_id
    ) t on t.user_id = u.id
    left join (
      select ll.user_id, count(*) as active_licenses
      from public.licenses ll
      where ll.status = 'active'
      group by ll.user_id
    ) l on l.user_id = u.id
    left join (
      select rc.user_id, count(*) as reset_credits_available
      from public.hwid_reset_credits rc
      where rc.status = 'available'
      group by rc.user_id
    ) r on r.user_id = u.id
    order by u.created_at desc;
end;
$$;

create or replace function public.admin_grant_reset_credits(target_user_id uuid, amount integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  i integer;
  next_credits integer;
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  if amount is null or amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  for i in 1..amount loop
    insert into public.hwid_reset_credits (user_id, status)
    values (target_user_id, 'available');
  end loop;

  select count(*)::integer into next_credits
  from public.hwid_reset_credits
  where user_id = target_user_id
    and status = 'available';

  perform public.log_admin_event(
    'grant_reset_credits',
    target_user_id,
    null,
    jsonb_build_object('amount', amount, 'available_after', next_credits)
  );

  return next_credits;
end;
$$;

create or replace function public.admin_set_points(target_user_id uuid, target_points integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  next_points integer;
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  if target_points < 0 then
    raise exception 'INVALID_POINTS';
  end if;

  perform public.ensure_wallet_exists(target_user_id);

  update public.user_wallets
  set points = target_points,
      updated_at = now()
  where user_id = target_user_id
  returning points into next_points;

  perform public.log_admin_event(
    'set_points',
    target_user_id,
    null,
    jsonb_build_object('points', next_points)
  );

  return next_points;
end;
$$;

create or replace function public.admin_grant_license(target_user_id uuid, target_product_code text)
returns table (
  license_id uuid,
  key_code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  product_row public.store_products%rowtype;
  generated_key text;
  generated_expiry timestamptz;
  new_license_id uuid;
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  select * into product_row
  from public.store_products
  where code = target_product_code and is_active = true
  limit 1;

  if not found then
    raise exception 'INVALID_PRODUCT';
  end if;

  generated_key := upper(
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)
  );

  if product_row.duration_days is null then
    generated_expiry := null;
  else
    generated_expiry := now() + make_interval(days => product_row.duration_days);
  end if;

  insert into public.licenses (
    user_id,
    product_code,
    key_code,
    status,
    issued_at,
    expires_at
  ) values (
    target_user_id,
    product_row.code,
    generated_key,
    'active',
    now(),
    generated_expiry
  )
  returning id into new_license_id;

  perform public.log_admin_event(
    'grant_license',
    target_user_id,
    new_license_id,
    jsonb_build_object('product_code', product_row.code, 'expires_at', generated_expiry)
  );

  return query select new_license_id, generated_key, generated_expiry;
end;
$$;

create or replace function public.admin_update_license(target_license_id uuid, action text, value_int integer default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  product_days integer;
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  if action = 'delete' then
    delete from public.licenses
    where id = target_license_id;
    if found then
      perform public.log_admin_event(
        'delete_license',
        null,
        null,
        jsonb_build_object('deleted_license_id', target_license_id)
      );
    end if;
    return found;
  elsif action = 'renew' then
    select p.duration_days
    into product_days
    from public.licenses l
    join public.store_products p on p.code = l.product_code
    where l.id = target_license_id
    limit 1;

    if not found then
      return false;
    end if;

    update public.licenses
    set status = 'active',
        issued_at = now(),
        expires_at = case
          when product_days is null then null
          else now() + make_interval(days => product_days)
        end
    where id = target_license_id;
    if found then
      perform public.log_admin_event(
        'renew_license',
        null,
        target_license_id,
        jsonb_build_object('duration_days', product_days)
      );
    end if;
    return found;
  elsif action = 'reset_hwid' then
    update public.licenses
    set bound_device_hash = null,
        reset_hwid_count = reset_hwid_count + 1
    where id = target_license_id;
    if found then
      perform public.log_admin_event('reset_hwid', null, target_license_id, '{}'::jsonb);
    end if;
    return found;
  else
    raise exception 'INVALID_ACTION';
  end if;
end;
$$;

create or replace function public.admin_set_user_role(target_user_id uuid, role_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public.is_owner(uid) then
    raise exception 'FORBIDDEN_OWNER_ONLY';
  end if;

  if role_name = 'admin' then
    insert into public.admin_users (user_id, role, granted_by)
    values (target_user_id, 'admin', uid)
    on conflict (user_id) do update
    set role = 'admin',
        granted_by = uid;
  elsif role_name = 'user' then
    if target_user_id = '4e0f53df-a558-4bf2-be37-125ef5079a80'::uuid then
      raise exception 'CANNOT_DEMOTE_OWNER';
    end if;
    delete from public.admin_users
    where user_id = target_user_id;
  else
    raise exception 'INVALID_ROLE';
  end if;

  perform public.log_admin_event(
    'set_user_role',
    target_user_id,
    null,
    jsonb_build_object('role', role_name)
  );
  return true;
end;
$$;

create or replace function public.admin_list_audit_logs(limit_rows integer default 200)
returns table (
  id uuid,
  actor_user_id uuid,
  action text,
  target_user_id uuid,
  target_license_id uuid,
  details jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  safe_limit integer := greatest(1, least(coalesce(limit_rows, 200), 1000));
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  return query
    select
      a.id,
      a.actor_user_id,
      a.action,
      a.target_user_id,
      a.target_license_id,
      a.details,
      a.created_at
    from public.admin_audit_logs a
    order by a.created_at desc
    limit safe_limit;
end;
$$;

create or replace function public.admin_list_admin_users()
returns table (
  user_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public.is_admin(uid) then
    raise exception 'FORBIDDEN';
  end if;

  return query
    select a.user_id
    from public.admin_users a
    order by a.created_at asc;
end;
$$;

create or replace function public.purchase_products(product_codes text[])
returns table (
  purchase_id uuid,
  product_code text,
  license_key text,
  expires_at timestamptz,
  wallet_points integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  code_item text;
  product_row public.store_products%rowtype;
  current_points integer;
  purchase_row public.purchase_transactions%rowtype;
  generated_key text;
  generated_expiry timestamptz;
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if product_codes is null or array_length(product_codes, 1) is null then
    raise exception 'EMPTY_CART';
  end if;

  perform public.ensure_wallet_exists(uid);

  select points into current_points
  from public.user_wallets
  where user_id = uid
  for update;

  foreach code_item in array product_codes loop
    select * into product_row
    from public.store_products
    where code = code_item and is_active = true;

    if not found then
      raise exception 'INVALID_PRODUCT:%', code_item;
    end if;

    if current_points < product_row.price_points then
      raise exception 'INSUFFICIENT_POINTS';
    end if;

    update public.user_wallets
    set points = points - product_row.price_points,
        updated_at = now()
    where user_id = uid
    returning points into current_points;

    insert into public.purchase_transactions (user_id, product_code, price_points, status)
    values (uid, product_row.code, product_row.price_points, 'success')
    returning * into purchase_row;

    generated_key := upper(
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)
    );

    if product_row.category = 'KEY' then
      if product_row.duration_days is null then
        generated_expiry := null;
      else
        generated_expiry := now() + make_interval(days => product_row.duration_days);
      end if;

      insert into public.licenses (
        user_id,
        product_code,
        key_code,
        status,
        issued_at,
        expires_at
      ) values (
        uid,
        product_row.code,
        generated_key,
        'active',
        now(),
        generated_expiry
      );
    else
      generated_expiry := null;
      generated_key := null;
      insert into public.hwid_reset_credits (
        user_id,
        source_purchase_id,
        status
      ) values (
        uid,
        purchase_row.id,
        'available'
      );
    end if;

    purchase_id := purchase_row.id;
    product_code := product_row.code;
    license_key := generated_key;
    expires_at := generated_expiry;
    wallet_points := current_points;
    return next;
  end loop;
end;
$$;

create or replace function public.use_hwid_reset_credit(target_license_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  credit_id uuid;
  remain integer;
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if target_license_id is null then
    raise exception 'INVALID_LICENSE';
  end if;

  perform 1
  from public.licenses l
  where l.id = target_license_id
    and l.user_id = uid
    and l.status = 'active';

  if not found then
    raise exception 'LICENSE_NOT_FOUND';
  end if;

  select c.id into credit_id
  from public.hwid_reset_credits c
  where c.user_id = uid
    and c.status = 'available'
  order by c.created_at asc
  limit 1
  for update;

  if credit_id is null then
    raise exception 'NO_RESET_CREDIT';
  end if;

  update public.hwid_reset_credits
  set status = 'used',
      used_for_license_id = target_license_id,
      used_at = now()
  where id = credit_id;

  update public.licenses
  set bound_device_hash = null,
      reset_hwid_count = reset_hwid_count + 1
  where id = target_license_id
    and user_id = uid;

  select count(*)::integer into remain
  from public.hwid_reset_credits
  where user_id = uid and status = 'available';

  return remain;
end;
$$;

create or replace function public.reset_hwid(license_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  update public.licenses
  set bound_device_hash = null,
      reset_hwid_count = reset_hwid_count + 1
  where id = license_id
    and user_id = uid
    and status = 'active';

  return found;
end;
$$;

create or replace function public.activate_license(license_key text, device_hash text)
returns table (
  license_id uuid,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_license public.licenses%rowtype;
begin
  if license_key is null or length(trim(license_key)) = 0 then
    raise exception 'INVALID_KEY';
  end if;
  if device_hash is null or length(trim(device_hash)) = 0 then
    raise exception 'INVALID_DEVICE';
  end if;

  select * into found_license
  from public.licenses
  where key_code = upper(trim(license_key))
  limit 1;

  if not found then
    raise exception 'LICENSE_NOT_FOUND';
  end if;

  if found_license.status <> 'active' then
    raise exception 'LICENSE_NOT_ACTIVE';
  end if;

  if found_license.expires_at is not null and found_license.expires_at <= now() then
    update public.licenses
    set status = 'expired'
    where id = found_license.id;
    raise exception 'LICENSE_EXPIRED';
  end if;

  if found_license.bound_device_hash is null then
    update public.licenses
    set bound_device_hash = device_hash,
        last_heartbeat_at = now()
    where id = found_license.id;
  elsif found_license.bound_device_hash <> device_hash then
    raise exception 'DEVICE_MISMATCH';
  else
    update public.licenses
    set last_heartbeat_at = now()
    where id = found_license.id;
  end if;

  return query
    select found_license.id, 'active'::text, found_license.expires_at;
end;
$$;

create or replace function public.license_heartbeat(license_key text, device_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  found_license public.licenses%rowtype;
begin
  select * into found_license
  from public.licenses
  where key_code = upper(trim(license_key))
  limit 1;

  if not found then
    return false;
  end if;

  if found_license.status <> 'active' then
    return false;
  end if;

  if found_license.expires_at is not null and found_license.expires_at <= now() then
    update public.licenses set status = 'expired' where id = found_license.id;
    return false;
  end if;

  if found_license.bound_device_hash is null or found_license.bound_device_hash <> device_hash then
    return false;
  end if;

  update public.licenses
  set last_heartbeat_at = now()
  where id = found_license.id;

  return true;
end;
$$;

insert into public.store_products (code, name, category, duration_days, price_points, is_active, sort_order)
values
  ('key_1d', 'Key 1Day', 'KEY', 1, 39, true, 1),
  ('key_3d', 'Key 3Day', 'KEY', 3, 99, true, 2),
  ('key_7d', 'Key 7Day', 'KEY', 7, 199, true, 3),
  ('key_14d', 'Key 14Day', 'KEY', 14, 299, true, 4),
  ('key_30d', 'Key 30Day', 'KEY', 30, 499, true, 5),
  ('key_lifetime', 'Key Lifetime', 'KEY', null, 1499, true, 6),
  ('reset_hwid', 'ResetHWID', 'RESETHWID', null, 149, true, 7)
on conflict (code) do update
set
  name = excluded.name,
  category = excluded.category,
  duration_days = excluded.duration_days,
  price_points = excluded.price_points,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.admin_users (user_id, role)
values ('4e0f53df-a558-4bf2-be37-125ef5079a80', 'admin')
on conflict (user_id) do update
set role = excluded.role;

alter table public.admin_audit_logs
drop constraint if exists admin_audit_logs_target_license_id_fkey;

alter table public.admin_audit_logs
add constraint admin_audit_logs_target_license_id_fkey
foreign key (target_license_id)
references public.licenses(id)
on delete set null;
