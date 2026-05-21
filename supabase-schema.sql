create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) <= 500),
  due_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.tasks to anon;

drop policy if exists "Anyone can read tasks" on public.tasks;
drop policy if exists "Anyone can create tasks" on public.tasks;
drop policy if exists "Anyone can update tasks" on public.tasks;
drop policy if exists "Anyone can delete tasks" on public.tasks;

create policy "Anyone can read tasks"
  on public.tasks for select
  using (true);

create policy "Anyone can create tasks"
  on public.tasks for insert
  with check (true);

create policy "Anyone can update tasks"
  on public.tasks for update
  using (true)
  with check (true);

create policy "Anyone can delete tasks"
  on public.tasks for delete
  using (true);
