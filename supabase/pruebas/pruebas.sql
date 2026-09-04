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
  select count(*) into n from public.buildings;   perform assert(n = 27, 'el catálogo es público para quien entra');

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

-- ---------------------------------------------------------------------------
-- Supervivencia: amenaza, asaltos, daños y reparación
-- ---------------------------------------------------------------------------
reset role;

do $$
declare
  a uuid := '44444444-4444-4444-4444-444444444444';
  g uuid;
  h uuid;
  hoy date := (now() at time zone 'utc')::date;
  n int;
  v_int int;
  v_coins int;
  v_amenaza int;
  v_x int;
  v_y int;
begin
  insert into auth.users (id, email, raw_user_meta_data)
    values (a, 'dani@ejemplo.com', '{"display_name":"Dani"}');
  perform set_config('request.jwt.claim.sub', a::text, true);

  g := public.create_group('Los descuidados', 'Puerto Ruina');
  insert into public.habits (group_id, user_id, name) values (g, a, 'Correr') returning id into h;

  -- El hábito tiene que existir ya en los días que se liquidan
  update public.habits set created_at = now() - interval '30 days' where id = h;
  delete from public.challenges where group_id = g;   -- el reto semilla aparte

  -- 1. Sin días cerrados pendientes no pasa nada
  perform assert(public.settle_city(g) = 0, 'sin días pendientes no hay asaltos');

  -- 2. Diez días sin marcar nada: la amenaza sube y entran
  update public.groups set last_settled_on = hoy - 11, threat = 0 where id = g;
  n := public.settle_city(g);
  select threat into v_amenaza from public.groups where id = g;
  perform assert(n > 0, 'abandonar la ciudad diez días trae asaltos');
  perform assert((select count(*) from public.raids where group_id = g) = n, 'cada asalto queda en la crónica');
  perform assert(v_amenaza between 20 and 59, 'tras el asalto la amenaza baja pero no desaparece');
  perform assert(
    (select count(*) from public.city_tiles where group_id = g and integrity < 100) > 0,
    'un asalto que no se rechaza deja edificios dañados');

  -- 3. No se liquida dos veces lo mismo
  perform assert(public.settle_city(g) = 0, 'liquidar de nuevo no repite los asaltos');

  -- 4. Reparar cuesta, deja el edificio entero y no se repite
  -- (x e y de la MISMA fila: con dos subconsultas podían salir de parcelas
  -- distintas y la prueba mentía)
  select x, y, integrity into v_x, v_y, v_int
    from public.city_tiles
   where group_id = g and integrity < 100
   order by integrity, x, y limit 1;
  perform assert(v_x is not null, 'el asalto dejó algo que reparar');

  update public.groups set coins = 5000 where id = g;
  select coins into v_coins from public.groups where id = g;
  perform public.repair_building(g, v_x, v_y);

  perform assert((select coins from public.groups where id = g) < v_coins, 'reparar cuesta monedas');
  perform assert(
    (select integrity from public.city_tiles where group_id = g and x = v_x and y = v_y) = 100,
    'reparar deja el edificio entero');
  perform assert_raises(
    format('select public.repair_building(%L, %s, %s)', g, v_x, v_y),
    'está entera', 'no se repara lo que ya está entero');

  -- 5. Marcar todos los días mantiene la ciudad en calma
  -- (siete días: el trigger no deja registrar más atrás)
  update public.groups set last_settled_on = hoy - 8, threat = 0 where id = g;
  delete from public.raids where group_id = g;
  for n in 1..7 loop
    insert into public.habit_logs (habit_id, user_id, log_date) values (h, a, hoy - n);
  end loop;
  perform assert(public.settle_city(g) = 0, 'cumpliendo cada día no entra nadie');
  perform assert((select threat from public.groups where id = g) = 0, 'cumpliendo cada día la amenaza queda a cero');

  -- 6. Un reto vencido sin cumplir dispara el asalto por sí solo
  update public.groups set last_settled_on = hoy - 3, threat = 0 where id = g;
  insert into public.challenges (group_id, title, goal, starts_on, ends_on)
    values (g, 'Reto imposible', 9999, hoy - 3, hoy - 2);
  perform assert(public.settle_city(g) > 0, 'fallar un reto trae a los saqueadores');

  -- 7. La defensa suma lo de los edificios defensivos
  update public.groups set coins = 5000, xp = 1500 where id = g;
  select public.city_defense(g) into n;
  perform public.place_building(g, 0, 9, 'watchtower');
  perform assert(public.city_defense(g) = n + 68, 'la torre de vigía suma 68 de defensa');

  -- 8. Un edificio en ruinas no defiende
  update public.city_tiles set integrity = 0 where group_id = g and x = 0 and y = 9;
  perform assert(public.city_defense(g) = n, 'en ruinas, la torre no defiende');

  -- 9. Derribar unas ruinas no devuelve nada
  select coins into v_coins from public.groups where id = g;
  perform public.demolish_building(g, 0, 9);
  perform assert((select coins from public.groups where id = g) = v_coins, 'de unas ruinas no se recupera nada');

  -- 10. El Alcázar existe y no se derriba
  perform assert(
    (select count(*) from public.city_tiles where group_id = g and building_id = 'keep') = 1,
    'toda ciudad nace con su Alcázar');
  perform assert_raises(
    format('select public.demolish_building(%L, 4, 4)', g),
    'no se derriba', 'el Alcázar no se puede derribar');

  -- 11. Con murallas en pie, los golpes caen en ellas y no en la familia
  delete from public.city_tiles where group_id = g and building_id <> 'keep';
  delete from public.raids where group_id = g;
  delete from public.challenges where group_id = g;
  delete from public.habit_logs where group_id = g;
  update public.city_tiles set integrity = 100 where group_id = g;
  update public.groups set coins = 9000, xp = 1500, threat = 0, last_settled_on = hoy - 5 where id = g;
  perform public.place_building(g, 0, 0, 'wall');
  perform public.place_building(g, 1, 0, 'wall');
  perform public.place_building(g, 2, 0, 'wall');
  perform public.settle_city(g);

  perform assert(
    (select integrity from public.city_tiles where group_id = g and building_id = 'keep') = 100,
    'mientras quedan murallas, el Alcázar no recibe un golpe');
  perform assert(
    (select count(*) from public.city_tiles
      where group_id = g and building_id <> 'keep' and integrity < 100) = 3,
    'las murallas se llevan los golpes y el desgaste');
  perform assert(
    (select count(*) from public.raids where group_id = g and repelled) > 0,
    'con murallas se rechazan los asaltos');

  -- 12. Sin nada que interponer, la familia queda expuesta
  delete from public.city_tiles where group_id = g and building_id <> 'keep';
  delete from public.raids where group_id = g;
  update public.city_tiles set integrity = 100 where group_id = g;
  update public.groups set threat = 0, last_settled_on = hoy - 8 where id = g;
  perform public.settle_city(g);

  perform assert(
    (select integrity from public.city_tiles where group_id = g and building_id = 'keep') < 100,
    'sin murallas, los golpes llegan al Alcázar');
  perform assert(
    (select count(*) from public.raids where group_id = g and reached_keep) > 0,
    'la crónica registra que llegaron hasta la familia');

  -- 13. Las defensas se desgastan solas aunque no venga nadie
  delete from public.city_tiles where group_id = g and building_id <> 'keep';
  delete from public.raids where group_id = g;
  update public.city_tiles set integrity = 100 where group_id = g;
  update public.groups set coins = 9000, threat = 0, last_settled_on = hoy - 5 where id = g;
  perform public.place_building(g, 9, 9, 'wall');
  -- Con los hábitos al día no entra nadie: así se aísla el desgaste
  for n in 1..5 loop
    insert into public.habit_logs (habit_id, user_id, log_date) values (h, a, hoy - n);
  end loop;
  perform public.settle_city(g);

  perform assert((select count(*) from public.raids where group_id = g) = 0,
    'cumpliendo cada día no entra nadie, ni con la ciudad desnuda');
  perform assert(
    (select integrity from public.city_tiles where group_id = g and x = 9 and y = 9) = 84,
    'una muralla desatendida pierde 4 de integridad al día');
  perform assert(
    (select integrity from public.city_tiles where group_id = g and building_id = 'keep') = 100,
    'el Alcázar no se desgasta por su cuenta');

  raise notice '--- supervivencia: todo correcto ---';
end $$;
