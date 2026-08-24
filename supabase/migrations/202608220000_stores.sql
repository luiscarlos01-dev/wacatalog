create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  whatsapp_number text,
  whatsapp_verification_status text not null default 'unverified',
  whatsapp_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_whatsapp_number_format_check check (
    whatsapp_number is null or whatsapp_number ~ '^55[0-9]{10,11}$'
  ),
  constraint stores_whatsapp_verification_status_check check (
    whatsapp_verification_status in ('unverified', 'verified')
  ),
  constraint stores_whatsapp_verification_check check (
    (
      whatsapp_verification_status = 'unverified'
      and whatsapp_verified_at is null
    )
    or (
      whatsapp_verification_status = 'verified'
      and whatsapp_number is not null
      and whatsapp_verified_at is not null
    )
  )
);

create function public.set_store_update_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.whatsapp_number is distinct from old.whatsapp_number then
    new.whatsapp_verification_status := 'unverified';
    new.whatsapp_verified_at := null;
  end if;

  new.updated_at := now();

  return new;
end;
$$;

create trigger set_store_update_metadata
before update on public.stores
for each row
execute function public.set_store_update_metadata();

revoke all on table public.stores from anon;
revoke all on table public.stores from authenticated;
grant select on table public.stores to authenticated;

alter table public.stores enable row level security;
