-- PREENCHA OS UUIDs ABAIXO DEPOIS DE CRIAR OS 4 USUÁRIOS
-- Supabase > Authentication > Users
-- Copie o UUID de cada usuário e substitua os textos ENTRE < >.

insert into public.profiles (id, employee_name, job_title, access_role)
values
  ('<UUID_MATHEUS>', 'Matheus', 'Coordenador', 'manager'),
  ('<UUID_CARLOS>',  'Carlos',  'Assistente Sênior', 'employee'),
  ('<UUID_NOEMY>',   'Noemy',   'Assistente Sênior', 'employee'),
  ('<UUID_YASMIN>',  'Yasmin',  'Estagiária', 'employee')
on conflict (id) do update
set
  employee_name = excluded.employee_name,
  job_title = excluded.job_title,
  access_role = excluded.access_role,
  active = true;
