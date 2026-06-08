drop index if exists public.companies_legacy_id_unique;
drop index if exists public.chemicals_legacy_id_unique;
drop index if exists public.tasks_legacy_id_unique;
drop index if exists public.task_comments_legacy_id_unique;

alter table public.companies
  drop column if exists legacy_id;

alter table public.chemicals
  drop column if exists legacy_id;

alter table public.tasks
  drop column if exists legacy_id;

alter table public.task_comments
  drop column if exists legacy_id;
