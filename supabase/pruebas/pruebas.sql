-- Permisos equivalentes a los que Supabase concede por defecto.
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

\set ON_ERROR_STOP on
\set QUIET on

create or replace function assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond then raise notice 'OK   %', label;
  else raise exception 'FALLA %', label; end if;
end $$;

create or replace function assert_raises(sql text, needle text, label text) returns void
language plpgsql as $$
begin
  execute sql;
  raise exception 'FALLA % (no lanzó error)', label;
exception
  when others then
    if sqlerrm like '%' || needle || '%' then
      raise notice 'OK   % → "%"', label, sqlerrm;
    elsif sqlerrm like 'FALLA%' then
      raise;
    else
      raise exception 'FALLA % → error inesperado: %', label, sqlerrm;
    end if;
end $$;

-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '11111111-1111-1111-1111-111111111111';
  b uuid := '22222222-2222-2222-2222-222222222222';
  c uuid := '33333333-3333-3333-3333-333333333333';
  g uuid;
  code text;
  h_a uuid;
  h_b uuid;
  ch uuid;
  hoy date := (now() at time zone 'utc')::date;
  v int;
  v2 int;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (a, 'ana@ejemplo.com',  '{"display_name":"Ana","avatar_emoji":"🦊"}'),
    (b, 'bruno@ejemplo.com','{"display_name":"Bruno"}'),
    (c, 'caro@ejemplo.com',  '{}');

  perform assert((select count(*) from public.profiles) = 3, 'alta de usuario crea perfil');
  perform assert((select display_name from public.profiles where id = a) = 'Ana', 'toma el nombre de los metadatos');
  perform assert((select display_name from public.profiles where id = c) = 'caro', 'sin nombre, usa el usuario del correo');

  -- Ana funda el grupo -------------------------------------------------------
  perform set_config('request.jwt.claim.sub', a::text, true);
  g := public.create_group('Los del gimnasio', 'Puerto Constancia');
  select invite_code into code from public.groups where id = g;

  perform assert((select coins from public.groups where id = g) = 120, 'la ciudad empieza con 120 monedas');
  perform assert((select count(*) from public.city_tiles where group_id = g) = 3, 'siembra 3 parcelas');
  perform assert((select count(*) from public.challenges where group_id = g) = 1, 'siembra el primer reto');
  perform assert(length(code) = 6, 'código de invitación de 6 caracteres');

  -- Bruno se une -------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform assert(public.join_group(lower(code)) = g, 'unirse funciona en minúsculas');
  perform assert(public.join_group(code) = g, 'unirse dos veces no duplica');
  perform assert((select count(*) from public.group_members where group_id = g) = 2, 'el grupo tiene 2 miembros');
  perform assert_raises(
    format('select public.join_group(%L)', 'ZZZZZZ'),
    'no existe', 'un código inventado no entra');

  -- Hábitos ------------------------------------------------------------------
  insert into public.habits (group_id, user_id, name, emoji, ink)
    values (g, b, 'Leer 20 min', '📚', 'blue') returning id into h_b;
  perform set_config('request.jwt.claim.sub', a::text, true);
  insert into public.habits (group_id, user_id, name, emoji, ink)
    values (g, a, 'Correr', '🏃', 'pink') returning id into h_a;

  -- Rachas y recompensas -----------------------------------------------------
  insert into public.habit_logs (habit_id, user_id, log_date) values (h_a, a, hoy - 2);
  insert into public.habit_logs (habit_id, user_id, log_date) values (h_a, a, hoy - 1);
  insert into public.habit_logs (habit_id, user_id, log_date) values (h_a, a, hoy);

  perform assert(
    (select array_agg(streak order by log_date) from public.habit_logs where habit_id = h_a) = array[1,2,3],
    'la racha crece con días consecutivos');
  perform assert(
    (select array_agg(coins_awarded order by log_date) from public.habit_logs where habit_id = h_a) = array[10,12,14],
    'la recompensa sube 2 monedas por día de racha');
  perform assert((select group_id from public.habit_logs where habit_id = h_a limit 1) = g,
    'el trigger rellena el grupo solo');
  perform assert((select coins from public.groups where id = g) = 120 + 36, 'las marcas suman a la caja común');
  perform assert((select xp from public.groups where id = g) = 33, 'las marcas suman XP');

  -- Un hueco corta la racha
  insert into public.habit_logs (habit_id, user_id, log_date) values (h_a, a, hoy - 5);
  perform assert((select streak from public.habit_logs where habit_id = h_a and log_date = hoy - 5) = 1,
    'un día suelto no hereda racha');

  -- No se pueden falsificar las monedas
  insert into public.habit_logs (habit_id, user_id, log_date, coins_awarded, xp_awarded, streak)
    values (h_a, a, hoy - 6, 99999, 99999, 500);
  perform assert((select coins_awarded from public.habit_logs where habit_id = h_a and log_date = hoy - 6) = 10,
    'el servidor recalcula la recompensa aunque el cliente mienta');

  perform assert_raises(
    format('insert into public.habit_logs (habit_id, user_id, log_date) values (%L, %L, %L)', h_b, b, hoy),
    'tus propios', 'nadie marca el hábito de otro');
  perform assert_raises(
    format('insert into public.habit_logs (habit_id, user_id, log_date) values (%L, %L, %L)', h_a, a, hoy + 5),
    'futuro', 'no se puede marcar un día futuro');
  perform assert_raises(
    format('insert into public.habit_logs (habit_id, user_id, log_date) values (%L, %L, %L)', h_a, a, hoy),
    'duplicate key', 'no se marca dos veces el mismo día');

  -- Deshacer devuelve lo ganado
  select coins into v from public.groups where id = g;
  delete from public.habit_logs where habit_id = h_a and log_date = hoy;
  perform assert((select coins from public.groups where id = g) = v - 14, 'desmarcar descuenta lo que dio');
  insert into public.habit_logs (habit_id, user_id, log_date) values (h_a, a, hoy);

  -- Construir ----------------------------------------------------------------
  select coins into v from public.groups where id = g;
  perform public.place_building(g, 0, 0, 'park');
  perform assert((select coins from public.groups where id = g) = v - 40, 'construir cuesta lo del catálogo');
  perform assert((select count(*) from public.city_tiles where group_id = g and x = 0 and y = 0) = 1,
    'la parcela queda ocupada');

  perform assert_raises(format('select public.place_building(%L,0,0,%L)', g, 'house'),
    'ocupada', 'no se construye sobre una parcela ocupada');
  perform assert_raises(format('select public.place_building(%L,7,7,%L)', g, 'stadium'),
    'nivel', 'el estadio pide nivel de ciudad');
  perform assert_raises(format('select public.place_building(%L,7,7,%L)', g, 'monument'),
    'solo se consigue', 'el monumento no está a la venta');
  -- Con nivel de sobra pero sin caja, debe quejarse del dinero
  update public.groups set xp = 1500 where id = g;
  perform assert_raises(format('select public.place_building(%L,7,7,%L)', g, 'stadium'),
    'Faltan', 'sin monedas suficientes, no se construye');
  update public.groups set xp = 33 where id = g;

  -- Derribar devuelve la mitad
  select coins into v from public.groups where id = g;
  perform public.demolish_building(g, 0, 0);
  perform assert((select coins from public.groups where id = g) = v + 20, 'derribar devuelve la mitad');
  perform assert_raises(format('select public.demolish_building(%L,0,0)', g),
    'nada que derribar', 'no se derriba una parcela vacía');

  -- Retos --------------------------------------------------------------------
  select id into ch from public.challenges where group_id = g;
  perform assert(public.challenge_progress(ch) = (select count(*) from public.habit_logs
      where group_id = g and log_date between hoy - 0 and hoy),
    'el reto solo cuenta las marcas dentro de su ventana');

  perform assert_raises(format('select public.claim_challenge(%L)', ch),
    'Faltan', 'no se cobra un reto sin cumplir');

  -- Se rebaja la meta para probar el cobro
  update public.challenges set goal = 1 where id = ch;
  select coins into v from public.groups where id = g;
  select count(*) into v2 from public.city_tiles where group_id = g;
  perform public.claim_challenge(ch);
  perform assert((select coins from public.groups where id = g) = v + 250, 'cobrar el reto paga las monedas');
  perform assert((select count(*) from public.city_tiles where group_id = g) = v2 + 1,
    'cobrar el reto coloca el edificio premio');
  perform assert((select count(*) from public.city_tiles where group_id = g and building_id = 'monument') = 1,
    'el premio es el monumento');
  perform assert((select completed_by from public.challenges where id = ch) = a, 'queda registrado quién cobró');
  perform assert_raises(format('select public.claim_challenge(%L)', ch),
    'ya se cobró', 'un reto no se cobra dos veces');

  -- Niveles ------------------------------------------------------------------
  perform assert(public.city_level(0) = 1,   'nivel 1 desde 0 XP');
  perform assert(public.city_level(149) = 1, 'nivel 1 hasta 149 XP');
  perform assert(public.city_level(150) = 2, 'nivel 2 a los 150 XP');
  perform assert(public.city_level(450) = 3, 'nivel 3 a los 450 XP');
  perform assert(public.city_level(900) = 4, 'nivel 4 a los 900 XP');
  perform assert(public.city_level(1500) = 5,'nivel 5 a los 1500 XP');

  raise notice '--- lógica de juego: todo correcto ---';
end $$;

-- ---------------------------------------------------------------------------
-- Seguridad a nivel de fila: quien no está en el grupo no ve nada.
-- ---------------------------------------------------------------------------
grant execute on all functions in schema public to authenticated;

do $$
declare
  a uuid := '11111111-1111-1111-1111-111111111111';
  b uuid := '22222222-2222-2222-2222-222222222222';
  c uuid := '33333333-3333-3333-3333-333333333333';
  g uuid;
  n int;
begin
  select id into g from public.groups limit 1;
  execute 'set local role authenticated';

  -- Caro no pertenece a ninguna ciudad
  perform set_config('request.jwt.claim.sub', c::text, true);
  select count(*) into n from public.groups;      perform assert(n = 0, 'un extraño no ve el grupo');
  select count(*) into n from public.habits;      perform assert(n = 0, 'un extraño no ve los hábitos');
  select count(*) into n from public.habit_logs;  perform assert(n = 0, 'un extraño no ve las marcas');
  select count(*) into n from public.city_tiles;  perform assert(n = 0, 'un extraño no ve la ciudad');
  select count(*) into n from public.challenges;  perform assert(n = 0, 'un extraño no ve los retos');
  select count(*) into n from public.group_members; perform assert(n = 0, 'un extraño no ve a los miembros');

  perform assert_raises(
    format('insert into public.habits (group_id, user_id, name) values (%L,%L,%L)', g, c, 'Colarme'),
    'row-level security', 'un extraño no puede añadir hábitos al grupo');
  perform assert_raises(
    format('select public.place_building(%L,9,9,%L)', g, 'park'),
    'No perteneces', 'un extraño no puede construir');

  -- Bruno sí pertenece
  perform set_config('request.jwt.claim.sub', b::text, true);
  select count(*) into n from public.groups;      perform assert(n = 1, 'un miembro ve su ciudad');
  select count(*) into n from public.habits;      perform assert(n = 2, 'un miembro ve los hábitos de todos');
  select count(*) into n from public.group_members; perform assert(n = 2, 'un miembro ve a sus compañeros');
  select count(*) into n from public.buildings;   perform assert(n = 15, 'el catálogo es público para quien entra');

  -- Pero no toca los hábitos ajenos: RLS filtra el DELETE en silencio,
  -- así que lo que hay que comprobar es que no se borró nada.
  delete from public.habits where user_id = a;
  get diagnostics n = row_count;
  perform assert(n = 0, 'borrar un hábito ajeno no borra nada');
  select count(*) into n from public.habits where user_id = a;
  perform assert(n = 1, 'el hábito ajeno sigue ahí');

  raise notice '--- RLS: todo correcto ---';
exception when others then
  execute 'reset role';
  raise;
end $$;
