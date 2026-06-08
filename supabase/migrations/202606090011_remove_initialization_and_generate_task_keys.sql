drop function if exists public.ensure_app_user(text);

create or replace function public.ensure_app_user(requested_display_name text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(831927451);

  if not exists (
    select 1
    from public.members
    where user_id = current_user_id
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
      from public.members
      where lower(btrim(display_name)) = lower(btrim(member_name))
    ) then
      member_name := member_name || ' [' || current_user_id::text || ']';
    end if;

    insert into public.members (user_id, display_name)
    values (current_user_id, member_name)
    on conflict (user_id) where user_id is not null do nothing;
  end if;
end;
$$;

revoke all on function public.ensure_app_user(text) from public;
grant execute on function public.ensure_app_user(text) to authenticated;

drop table if exists public.app_state;

create sequence if not exists public.task_key_sequence
  as bigint
  start with 131;

select pg_catalog.setval(
  'public.task_key_sequence'::regclass,
  greatest(
    130,
    coalesce(
      (
        select max(substring(task_key from '^KA-([0-9]+)$')::bigint)
        from public.tasks
        where task_key ~ '^KA-[0-9]+$'
      ),
      130
    )
  ),
  true
);

create or replace function public.next_task_key()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'KA-' || pg_catalog.nextval('public.task_key_sequence'::regclass)::text;
$$;

revoke all on function public.next_task_key() from public;
grant execute on function public.next_task_key() to authenticated;

alter table public.tasks
  alter column task_key set default public.next_task_key();
