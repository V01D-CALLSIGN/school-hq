-- Development-only, opt-in sample data. Run only with the documented psql command.
-- The fixed identity below must never be replaced with a developer's real user UUID.
\if :{?school_hq_demo_seed}
\else
  \echo 'Refusing to load demo data without -v school_hq_demo_seed=1'
  \quit 3
\endif

do $$
begin
  if exists (
    select 1 from auth.users
    where id = '00000000-0000-4000-a000-00000000de00'
      and email is distinct from 'demo@school-hq.invalid'
  ) then
    raise exception 'Reserved School HQ demo UUID belongs to a different auth user';
  end if;
end $$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-a000-00000000de00',
  'authenticated', 'authenticated', 'demo@school-hq.invalid',
  crypt('development-demo-only', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1 from public.courses
    where id = '00000000-0000-4000-a000-00000000de01'
      and user_id <> '00000000-0000-4000-a000-00000000de00'
  ) or exists (
    select 1 from public.assignments
    where id in (
      '00000000-0000-4000-a000-00000000de02',
      '00000000-0000-4000-a000-00000000de04'
    ) and user_id <> '00000000-0000-4000-a000-00000000de00'
  ) or exists (
    select 1 from public.study_windows
    where id = '00000000-0000-4000-a000-00000000de03'
      and user_id <> '00000000-0000-4000-a000-00000000de00'
  ) then
    raise exception 'A reserved School HQ demo record UUID belongs to another user';
  end if;
end $$;

insert into public.courses (id, user_id, name, code, color)
values (
  '00000000-0000-4000-a000-00000000de01',
  '00000000-0000-4000-a000-00000000de00',
  'Algebra II', 'MATH-201', '#8B5CF6'
)
on conflict (id) do update set
  name = excluded.name, code = excluded.code, color = excluded.color;

insert into public.assignments (
  id, user_id, course_id, area, activity_label, title, due_at,
  estimated_minutes, priority, task_type, dependency_ids, notes, status
) values
  (
    '00000000-0000-4000-a000-00000000de02',
    '00000000-0000-4000-a000-00000000de00',
    '00000000-0000-4000-a000-00000000de01',
    'school', null, 'Problem set 4', now() + interval '3 days',
    90, 'high', 'assignment', '{}', null, 'confirmed'
  ),
  (
    '00000000-0000-4000-a000-00000000de04',
    '00000000-0000-4000-a000-00000000de00',
    null, 'extracurricular', 'Robotics Club', 'Prepare build review', now() + interval '4 days',
    45, 'medium', 'project', '{}', null, 'confirmed'
  )
on conflict (id) do update set
  course_id = excluded.course_id,
  area = excluded.area,
  activity_label = excluded.activity_label,
  title = excluded.title,
  due_at = excluded.due_at,
  estimated_minutes = excluded.estimated_minutes,
  priority = excluded.priority,
  task_type = excluded.task_type,
  dependency_ids = excluded.dependency_ids,
  notes = excluded.notes,
  status = excluded.status;

insert into public.study_windows (id, user_id, starts_at, ends_at, label)
values (
  '00000000-0000-4000-a000-00000000de03',
  '00000000-0000-4000-a000-00000000de00',
  date_trunc('day', now()) + interval '18 hours',
  date_trunc('day', now()) + interval '21 hours',
  'Evening study'
)
on conflict (id) do update set
  starts_at = excluded.starts_at, ends_at = excluded.ends_at, label = excluded.label;
