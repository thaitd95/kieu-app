alter table public.workspaces
add column if not exists data_initialized boolean not null default false;
