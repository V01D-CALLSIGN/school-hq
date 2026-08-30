create extension if not exists btree_gist;

create type public.work_area as enum ('school', 'extracurricular');

alter table public.assignments
  add column area public.work_area not null default 'school',
  add column activity_label text check (activity_label is null or char_length(activity_label) between 1 and 120),
  add constraint assignments_area_metadata_check check (
    (area = 'school' and activity_label is null)
    or (area = 'extracurricular' and course_id is null)
  );

alter table public.calendar_events
  add column area public.work_area not null default 'school';

alter table public.study_plans
  add column area_filter text not null default 'combined'
  check (area_filter in ('school', 'extracurricular', 'combined'));

create index assignments_user_area_due_idx on public.assignments(user_id, area, due_at);
create index calendar_events_user_area_time_idx on public.calendar_events(user_id, area, starts_at, ends_at);

alter table public.plan_blocks
  add constraint plan_blocks_no_overlap
  exclude using gist (study_plan_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  deferrable initially deferred;

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
    starts_at, ends_at, all_day, classification, area, original_timezone
  )
  select
    (select auth.uid()), p_import_id, event.source_uid, coalesce(event.recurrence_id, ''), event.title,
    event.description, event.location, event.starts_at, event.ends_at, event.all_day,
    event.classification::public.calendar_classification,
    coalesce(event.area, 'school')::public.work_area, event.original_timezone
  from jsonb_to_recordset(p_events) as event(
    source_uid text, recurrence_id text, title text, description text, location text,
    starts_at timestamptz, ends_at timestamptz, all_day boolean, classification text,
    area text, original_timezone text
  )
  returning *;
end;
$$;

create or replace function public.apply_plan_edits(p_plan_id uuid, p_status text, p_blocks jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan_row public.study_plans%rowtype;
  edit record;
begin
  select * into plan_row from public.study_plans where id = p_plan_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Plan not found'; end if;

  if p_status is not null then
    update public.study_plans
      set status = p_status::public.plan_status
      where id = p_plan_id;
  end if;

  for edit in
    select * from jsonb_to_recordset(coalesce(p_blocks, '[]'::jsonb)) as item(
      id uuid, starts_at timestamptz, ends_at timestamptz, locked boolean
    )
  loop
    update public.plan_blocks
      set starts_at = coalesce(edit.starts_at, starts_at),
          ends_at = coalesce(edit.ends_at, ends_at),
          locked = coalesce(edit.locked, locked)
      where id = edit.id and study_plan_id = p_plan_id;
    if not found then raise exception using errcode = 'P0002', message = 'Plan block not found'; end if;
  end loop;

  if exists (
    select 1 from public.plan_blocks
    where study_plan_id = p_plan_id
      and (ends_at <= starts_at or starts_at < plan_row.range_start or ends_at > plan_row.range_end)
  ) then
    raise exception using errcode = '22023', message = 'Invalid plan block bounds';
  end if;
end;
$$;

revoke all on function public.apply_plan_edits(uuid, text, jsonb) from public, anon;
grant execute on function public.apply_plan_edits(uuid, text, jsonb) to authenticated;
