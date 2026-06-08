update public.tasks
set created_at = created_on::timestamp at time zone 'UTC'
where created_on is not null;

alter table public.tasks
  drop column if exists created_on;
