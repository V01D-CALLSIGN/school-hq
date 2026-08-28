create extension if not exists pgcrypto;

create type public.assignment_status as enum ('pending_review', 'confirmed', 'in_progress', 'completed', 'archived');
create type public.assignment_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_type as enum ('assignment', 'reading', 'exam', 'project', 'quiz', 'other');
create type public.calendar_classification as enum ('busy', 'study_available', 'ignored');
create type public.plan_status as enum ('draft', 'active', 'archived');
create type public.focus_status as enum ('running', 'paused', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.courses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120), code text, color text not null default '#6366F1',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null, title text not null,
  due_at timestamptz, estimated_minutes integer not null default 0 check (estimated_minutes between 0 and 10080),
  priority public.assignment_priority not null default 'medium', task_type public.task_type not null default 'assignment',
  dependency_ids uuid[] not null default '{}', notes text, status public.assignment_status not null default 'confirmed',
  completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.brain_dumps (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null, timezone text not null, parsed_assignments jsonb not null default '[]', parser text not null,
  created_at timestamptz not null default now()
);
create table public.calendar_imports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_name text not null, source_hash text not null, imported_at timestamptz not null default now(), event_count integer not null default 0,
  unique(user_id, source_name)
);
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  calendar_import_id uuid not null references public.calendar_imports(id) on delete cascade,
  source_uid text not null, recurrence_id text not null default '', title text not null, description text, location text,
  starts_at timestamptz not null, ends_at timestamptz not null, all_day boolean not null default false,
  classification public.calendar_classification not null default 'busy', original_timezone text,
  unique(calendar_import_id, source_uid, recurrence_id), check (ends_at > starts_at)
);
create table public.study_windows (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, label text,
  created_at timestamptz not null default now(), check (ends_at > starts_at)
);
create table public.study_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  range_start timestamptz not null, range_end timestamptz not null, timezone text not null,
  status public.plan_status not null default 'draft', unscheduled_tasks jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (range_end > range_start)
);
create table public.plan_blocks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  study_plan_id uuid not null references public.study_plans(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, locked boolean not null default false,
  kind text not null check (kind in ('work', 'break')), sequence integer not null default 0,
  check (ends_at > starts_at)
);
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  plan_block_id uuid references public.plan_blocks(id) on delete set null,
  status public.focus_status not null default 'running', started_at timestamptz not null default now(),
  paused_at timestamptz, completed_at timestamptz, accumulated_pause_seconds integer not null default 0 check (accumulated_pause_seconds >= 0),
  planned_duration_minutes integer not null check (planned_duration_minutes between 1 and 1440),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.scheduling_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade, timezone text not null default 'UTC',
  default_block_minutes integer not null default 45, break_minutes integer not null default 10,
  minimum_session_minutes integer not null default 15, bedtime time not null default '23:00',
  urgency_weight numeric not null default 4, priority_weight numeric not null default 3, duration_weight numeric not null default 1,
  updated_at timestamptz not null default now()
);

-- Composite ownership keys prevent a user-owned child row from referencing another user's parent row.
alter table public.courses add constraint courses_id_user_unique unique(id, user_id);
alter table public.assignments add constraint assignments_id_user_unique unique(id, user_id);
alter table public.calendar_imports add constraint calendar_imports_id_user_unique unique(id, user_id);
alter table public.study_plans add constraint study_plans_id_user_unique unique(id, user_id);
alter table public.plan_blocks add constraint plan_blocks_id_user_unique unique(id, user_id);
alter table public.assignments add constraint assignments_course_owner_fk foreign key(course_id, user_id) references public.courses(id, user_id);
alter table public.calendar_events add constraint events_import_owner_fk foreign key(calendar_import_id, user_id) references public.calendar_imports(id, user_id) on delete cascade;
alter table public.plan_blocks add constraint blocks_plan_owner_fk foreign key(study_plan_id, user_id) references public.study_plans(id, user_id) on delete cascade;
alter table public.plan_blocks add constraint blocks_assignment_owner_fk foreign key(assignment_id, user_id) references public.assignments(id, user_id) on delete cascade;
alter table public.focus_sessions add constraint sessions_assignment_owner_fk foreign key(assignment_id, user_id) references public.assignments(id, user_id);
alter table public.focus_sessions add constraint sessions_block_owner_fk foreign key(plan_block_id, user_id) references public.plan_blocks(id, user_id);

create index assignments_user_due_idx on public.assignments(user_id, due_at);
create index calendar_events_user_time_idx on public.calendar_events(user_id, starts_at, ends_at);
create index study_windows_user_time_idx on public.study_windows(user_id, starts_at, ends_at);
create index plan_blocks_plan_time_idx on public.plan_blocks(study_plan_id, starts_at);
create unique index one_live_focus_session_per_user on public.focus_sessions(user_id) where status in ('running', 'paused');

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
do $$ declare table_name text; begin
  foreach table_name in array array['profiles','courses','assignments','study_plans','focus_sessions','scheduling_preferences'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'set_' || table_name || '_updated_at', table_name);
  end loop;
end $$;

create or replace function public.create_profile_for_new_user() returns trigger security definer set search_path = '' language plpgsql as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.scheduling_preferences (user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.brain_dumps enable row level security;
alter table public.calendar_imports enable row level security;
alter table public.calendar_events enable row level security;
alter table public.study_windows enable row level security;
alter table public.study_plans enable row level security;
alter table public.plan_blocks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.scheduling_preferences enable row level security;

do $$ declare table_name text; begin
  foreach table_name in array array['courses','assignments','brain_dumps','calendar_imports','calendar_events','study_windows','study_plans','plan_blocks','focus_sessions'] loop
    execute format('create policy %I on public.%I for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_owner_all', table_name);
  end loop;
end $$;
create policy profiles_owner_all on public.profiles for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy preferences_owner_all on public.scheduling_preferences for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

create or replace function public.replace_calendar_events(p_import_id uuid, p_events jsonb)
returns setof public.calendar_events
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.calendar_events where calendar_import_id = p_import_id;
  return query
  insert into public.calendar_events (
    user_id, calendar_import_id, source_uid, recurrence_id, title, description, location,
    starts_at, ends_at, all_day, classification, original_timezone
  )
  select
    (select auth.uid()), p_import_id, event.source_uid, coalesce(event.recurrence_id, ''), event.title,
    event.description, event.location, event.starts_at, event.ends_at, event.all_day,
    event.classification::public.calendar_classification, event.original_timezone
  from jsonb_to_recordset(p_events) as event(
    source_uid text, recurrence_id text, title text, description text, location text,
    starts_at timestamptz, ends_at timestamptz, all_day boolean, classification text, original_timezone text
  )
  returning *;
end;
$$;
revoke all on function public.replace_calendar_events(uuid, jsonb) from public, anon;
grant execute on function public.replace_calendar_events(uuid, jsonb) to authenticated;
