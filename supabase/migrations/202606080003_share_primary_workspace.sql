create table public.app_settings (
  singleton boolean primary key default true check (singleton),
  shared_workspace_id uuid not null unique
    references public.workspaces(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

revoke all on table public.app_settings from public, anon, authenticated;

insert into public.app_settings (singleton, shared_workspace_id)
select true, workspace.id
from public.workspaces as workspace
order by (
  select count(*)
  from public.tasks
  where tasks.workspace_id = workspace.id
) desc, workspace.created_at, workspace.id
limit 1
on conflict (singleton) do nothing;

create or replace function public.ensure_shared_workspace(requested_display_name text default null)
returns table (
  id uuid,
  name text,
  data_initialized boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  shared_workspace_id uuid;
  member_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(831927451);

  select settings.shared_workspace_id
  into shared_workspace_id
  from public.app_settings as settings
  where settings.singleton = true;

  if shared_workspace_id is null then
    with inserted_workspace as (
      insert into public.workspaces (name, owner_user_id)
      values ('KieuAssistant', current_user_id)
      returning *
    )
    select inserted_workspace.id
    into shared_workspace_id
    from inserted_workspace;

    insert into public.app_settings (singleton, shared_workspace_id)
    values (true, shared_workspace_id);
  end if;

  if not exists (
    select 1
    from public.workspace_members
    where workspace_id = shared_workspace_id
      and user_id = current_user_id
  ) then
    select coalesce(
      nullif(btrim(requested_display_name), ''),
      nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(users.email, '@', 1), ''),
      'Member'
    )
    into member_name
    from auth.users as users
    where users.id = current_user_id;

    member_name := coalesce(member_name, 'Member');

    if exists (
      select 1
      from public.workspace_members
      where workspace_id = shared_workspace_id
        and lower(btrim(display_name)) = lower(btrim(member_name))
    ) then
      member_name := member_name || ' ' || left(current_user_id::text, 8);
    end if;

    insert into public.workspace_members (
      workspace_id,
      user_id,
      display_name,
      role
    )
    values (
      shared_workspace_id,
      current_user_id,
      member_name,
      'member'
    )
    on conflict (workspace_id, user_id) do nothing;
  end if;

  return query
  select
    workspace.id,
    workspace.name,
    workspace.data_initialized
  from public.workspaces as workspace
  where workspace.id = shared_workspace_id;
end;
$$;

revoke all on function public.ensure_shared_workspace(text) from public;
grant execute on function public.ensure_shared_workspace(text) to authenticated;
