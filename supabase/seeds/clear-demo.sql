-- Idempotent and deliberately narrow: the fixed email guards the fixed demo UUID.
-- All application rows owned by this user are removed by existing ON DELETE CASCADE constraints.
delete from auth.users
where id = '00000000-0000-4000-a000-00000000de00'
  and email = 'demo@school-hq.invalid';
