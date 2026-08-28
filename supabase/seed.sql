-- Run after creating a local user. Replace the UUID with that auth user's id.
do $$
declare demo_user uuid := '00000000-0000-0000-0000-000000000001';
declare algebra_id uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where id = demo_user) then
    insert into public.courses (id, user_id, name, code, color)
      values (algebra_id, demo_user, 'Algebra II', 'MATH-201', '#8B5CF6') on conflict do nothing;
    insert into public.assignments (user_id, course_id, title, due_at, estimated_minutes, priority, task_type)
      values (demo_user, algebra_id, 'Problem set 4', now() + interval '3 days', 90, 'high', 'assignment');
    insert into public.study_windows (user_id, starts_at, ends_at, label)
      values (demo_user, date_trunc('day', now()) + interval '18 hours', date_trunc('day', now()) + interval '21 hours', 'Evening study');
  end if;
end $$;
