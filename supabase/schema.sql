-- ============================================================================
-- Ciudad Común — esquema completo
-- Pega este archivo entero en Supabase → SQL Editor → Run.
-- Es idempotente: puedes volver a ejecutarlo sin romper nada.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_emoji text not null default '🙂',
  created_at   timestamptz not null default now()
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city_name   text not null,
  invite_code text not null unique,
  created_by  uuid not null references auth.users on delete cascade,
  coins       int not null default 120,
  xp          int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  role      text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 60),
  emoji      text not null default '✅',
  ink        text not null default 'blue' check (ink in ('pink','blue','yellow','green')),
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists habits_group_idx on public.habits (group_id) where not archived;

create table if not exists public.habit_logs (
  id            uuid primary key default gen_random_uuid(),
  habit_id      uuid not null references public.habits on delete cascade,
  group_id      uuid not null references public.groups on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  log_date      date not null,
  streak        int not null default 1,
  coins_awarded int not null default 0,
  xp_awarded    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index if not exists habit_logs_group_date_idx on public.habit_logs (group_id, log_date desc);

-- Catálogo de edificios. Los costes viven aquí (no en el cliente) para que
-- construir sea una operación validada por la base de datos.
create table if not exists public.buildings (
  id          text primary key,
  name        text not null,
  cost        int not null,
  min_level   int not null default 1,
  ink         text not null,
  category    text not null,
  reward_only boolean not null default false
);

create table if not exists public.city_tiles (
  group_id    uuid not null references public.groups on delete cascade,
  x           int not null check (x between 0 and 9),
  y           int not null check (y between 0 and 9),
  building_id text not null references public.buildings,
  placed_by   uuid references auth.users on delete set null,
  created_at  timestamptz not null default now(),
  primary key (group_id, x, y)
);

create table if not exists public.challenges (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references public.groups on delete cascade,
  title               text not null,
  goal                int not null check (goal > 0),
  starts_on           date not null,
  ends_on             date not null,
  reward_coins        int not null default 200,
  reward_building_id  text references public.buildings,
  completed_at        timestamptz,
  completed_by        uuid references auth.users on delete set null,
  created_at          timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists challenges_group_idx on public.challenges (group_id, ends_on desc);

create table if not exists public.raids (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups on delete cascade,
  happened_on   date not null,
  raider        text not null,
  power         int not null,
  defense       int not null,
  repelled      boolean not null,
  buildings_hit int not null default 0,
  reached_keep  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists raids_group_idx on public.raids (group_id, happened_on desc);

-- ---------------------------------------------------------------------------
-- Migraciones: columnas de supervivencia añadidas después de la primera
-- versión. Con "if not exists" una base de datos ya en uso se actualiza sin
-- perder nada al volver a ejecutar este archivo.
-- ---------------------------------------------------------------------------

alter table public.groups     add column if not exists threat          int not null default 0;
alter table public.groups     add column if not exists last_settled_on date not null default ((now() at time zone 'utc')::date - 1);
alter table public.city_tiles add column if not exists integrity       int not null default 100;
alter table public.buildings  add column if not exists defense         int not null default 0;
alter table public.raids      add column if not exists reached_keep    boolean not null default false;

-- Frecuencia: un hábito puede pedirse cada día o unas cuantas veces por semana.
alter table public.habits     add column if not exists frequency       text not null default 'daily';
alter table public.habits     add column if not exists weekly_target   int  not null default 3;

-- Los dos pretendientes. El umbral desbloquea el derecho a nombrarlos; el
-- nombre lo pone el reino, no el código.
alter table public.groups     add column if not exists suitor_one_name text;
alter table public.groups     add column if not exists suitor_two_name text;

-- Zona horaria del reino. Sin esto el día se cortaba a medianoche UTC y quien
-- viva en América marcaba a las 19:00 y se le guardaba con la fecha de mañana.
alter table public.groups     add column if not exists timezone        text not null default 'UTC';

do $$ begin
  alter table public.habits add constraint habits_frequency_ck check (frequency in ('daily','weekly'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.habits add constraint habits_weekly_target_ck check (weekly_target between 1 and 6);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.city_tiles add constraint city_tiles_integrity_ck check (integrity between 0 and 100);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Catálogo de edificios (semilla)
-- ---------------------------------------------------------------------------

-- La ciudad es una plaza fuerte: de 27 construcciones, 14 defienden. Las
-- civiles siguen dando monedas y XP, pero no aguantan un asalto.
insert into public.buildings (id, name, cost, min_level, ink, category, reward_only, defense) values
  -- El hogar. No se compra, no se derriba, y es lo último que cae.
  ('keep',      'Alcázar',            0,  1, 'pink',   'hogar',   true,   15),

  -- Defensa
  ('palisade',  'Empalizada',        60,  1, 'yellow', 'defensa', false,  15),
  ('ditch',     'Foso',              85,  1, 'blue',   'defensa', false,  22),
  ('wall',      'Muralla',          140,  2, 'blue',   'defensa', false,  35),
  ('gate',      'Puerta fortificada',170, 2, 'yellow', 'defensa', false,  42),
  ('archers',   'Torre de arqueros',195,  2, 'pink',   'defensa', false,  52),
  ('forge',     'Herrería',         210,  2, 'pink',   'defensa', false,  30),
  ('watchtower','Torre de vigía',   240,  3, 'yellow', 'defensa', false,  68),
  ('armory',    'Armería',          275,  3, 'blue',   'defensa', false,  78),
  ('barracks',  'Cuartel',          320,  3, 'green',  'defensa', false,  92),
  ('ballista',  'Ballesta',         360,  4, 'yellow', 'defensa', false, 108),
  ('catapult',  'Catapulta',        430,  4, 'pink',   'defensa', false, 130),

  -- Civiles: monedas y XP, ninguna protección
  ('trees',     'Arboleda',          30,  1, 'green',  'verde',   false,   0),
  ('park',      'Parque',            40,  1, 'green',  'verde',   false,   0),
  ('house',     'Casa',              60,  1, 'yellow', 'vivienda',false,   0),
  ('kiosk',     'Quiosco',           75,  1, 'pink',   'comercio',false,   0),
  ('cafe',      'Cafetería',        110,  2, 'pink',   'comercio',false,   0),
  ('gym',       'Gimnasio',         140,  2, 'blue',   'salud',   false,   0),
  ('library',   'Biblioteca',       160,  2, 'blue',   'cultura', false,   0),
  ('fountain',  'Fuente',           130,  3, 'blue',   'verde',   false,   0),
  ('block',     'Bloque de pisos',  220,  3, 'yellow', 'vivienda',false,   0),
  ('clinic',    'Centro de salud',  260,  3, 'pink',   'salud',   false,   0),
  ('theatre',   'Teatro',           340,  4, 'pink',   'cultura', false,   0),
  ('tower',     'Torre',            420,  4, 'blue',   'vivienda',false,   0),
  ('stadium',   'Estadio',          600,  5, 'green',  'salud',   false,   0),

  -- Solo por retos
  ('monument',  'Monumento',          0,  1, 'yellow', 'hito',    true,   45),
  ('lighthouse','Faro',               0,  1, 'pink',   'hito',    true,   60)
on conflict (id) do update set
  name = excluded.name, cost = excluded.cost, min_level = excluded.min_level,
  ink = excluded.ink, category = excluded.category, reward_only = excluded.reward_only,
  defense = excluded.defense;

-- Toda ciudad ya existente recibe su Alcázar en la parcela libre más céntrica.
do $$
declare r record; slot record;
begin
  for r in select id from public.groups loop
    if not exists (select 1 from public.city_tiles where group_id = r.id and building_id = 'keep') then
      select gx.x, gy.y into slot
      from generate_series(0,9) as gx(x), generate_series(0,9) as gy(y)
      where not exists (
        select 1 from public.city_tiles t where t.group_id = r.id and t.x = gx.x and t.y = gy.y
      )
      order by abs(gx.x - 4) + abs(gy.y - 4), gx.x, gy.y
      limit 1;

      if slot.x is not null then
        insert into public.city_tiles (group_id, x, y, building_id) values (r.id, slot.x, slot.y, 'keep');
      end if;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Funciones de apoyo
-- ---------------------------------------------------------------------------

-- Nivel de la ciudad a partir del XP. Umbral(n) = 75·n·(n−1)
-- → Nv.2 a 150 XP, Nv.3 a 450, Nv.4 a 900, Nv.5 a 1500…
create or replace function public.city_level(p_xp int)
returns int language sql immutable as $$
  select greatest(1, floor((1 + sqrt(1 + 4 * greatest(p_xp, 0)::numeric / 75)) / 2)::int);
$$;

-- El "hoy" de un grupo depende de dónde vive su gente, no del servidor.
create or replace function public.group_today(p_group uuid)
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce(
           (select timezone from public.groups where id = p_group), 'UTC'
         ))::date;
$$;

-- ¿El usuario actual pertenece a este grupo? SECURITY DEFINER para que las
-- políticas de group_members no se llamen a sí mismas en bucle.
create or replace function public.is_member(p_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = auth.uid()
  );
$$;

-- Una zona horaria inventada rompería todos los cálculos de fecha, así que se
-- comprueba antes de guardarla y se cae a UTC si no existe.
create or replace function public.valid_timezone(p_tz text)
returns text language plpgsql immutable as $$
begin
  if p_tz is null or trim(p_tz) = '' then return 'UTC'; end if;
  perform now() at time zone p_tz;
  return p_tz;
exception when others then
  return 'UTC';
end;
$$;

create or replace function public.set_group_timezone(p_group uuid, p_tz text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_group) then raise exception 'No perteneces a este reino'; end if;
  update public.groups set timezone = public.valid_timezone(p_tz) where id = p_group;
end;
$$;

create or replace function public.gen_invite_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin I, O, 0, 1
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Alta de usuario → perfil
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_emoji)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'avatar_emoji', ''), '🙂')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Economía: marcar un hábito otorga monedas y XP a la ciudad del grupo.
-- El cálculo ocurre en el servidor; el cliente no puede inflar la recompensa.
-- ---------------------------------------------------------------------------

create or replace function public.prepare_habit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
  v_owner uuid;
  v_streak int;
  v_freq text;
  v_target int;
  v_hoy date;
begin
  select group_id, user_id, frequency, weekly_target
    into v_group, v_owner, v_freq, v_target
  from public.habits where id = new.habit_id and not archived;

  if v_group is null then
    raise exception 'Ese hábito no existe o está archivado';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Solo puedes marcar tus propios hábitos';
  end if;
  v_hoy := public.group_today(v_group);
  if new.log_date > v_hoy then
    raise exception 'No puedes marcar un día futuro';
  end if;
  if new.log_date < v_hoy - 7 then
    raise exception 'Solo puedes registrar los últimos 7 días';
  end if;

  new.group_id := v_group;
  new.user_id  := v_owner;

  if v_freq = 'weekly' then
    -- Racha en semanas: cuentan las semanas seguidas que llegaron al objetivo.
    -- La fila aún no existe (trigger BEFORE), así que se suma a mano a la
    -- semana en curso.
    with base as (
      select date_trunc('week', log_date)::date as semana, count(*)::int as marcas
      from public.habit_logs
      where habit_id = new.habit_id and log_date < new.log_date
      group by 1
    ),
    conteo as (
      select semana, marcas from base where semana <> date_trunc('week', new.log_date)::date
      union all
      select date_trunc('week', new.log_date)::date,
             coalesce((select marcas from base
                        where semana = date_trunc('week', new.log_date)::date), 0) + 1
    ),
    cumplidas as (
      select semana, row_number() over (order by semana desc) as rn
      from conteo
      where marcas >= v_target and semana <= date_trunc('week', new.log_date)::date
    )
    select count(*) into v_streak
    from cumplidas
    where semana = date_trunc('week', new.log_date)::date - (((rn - 1) * 7)::int);

    v_streak := greatest(1, v_streak);
  else
    -- Racha en días: "islas y huecos". Una fila pertenece a la racha si su
    -- fecha es exactamente ancla − (posición − 1) contando hacia atrás.
    select count(*) + 1 into v_streak
    from (
      select log_date, row_number() over (order by log_date desc) as rn
      from public.habit_logs
      where habit_id = new.habit_id and log_date < new.log_date
    ) t
    where t.log_date = new.log_date - t.rn::int;
  end if;

  new.streak := v_streak;
  -- 10 monedas base + 2 por día de racha (tope 10 días) → 12…30 por marca.
  new.coins_awarded := 10 + least(v_streak - 1, 10) * 2;
  new.xp_awarded    := 10 + least(v_streak - 1, 10);
  return new;
end;
$$;

drop trigger if exists habit_logs_prepare on public.habit_logs;
create trigger habit_logs_prepare
  before insert on public.habit_logs
  for each row execute function public.prepare_habit_log();

create or replace function public.apply_habit_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.groups
      set coins = coins + new.coins_awarded, xp = xp + new.xp_awarded
      where id = new.group_id;
  elsif tg_op = 'DELETE' then
    update public.groups
      set coins = greatest(0, coins - old.coins_awarded), xp = greatest(0, xp - old.xp_awarded)
      where id = old.group_id;
  end if;
  return null;
end;
$$;

drop trigger if exists habit_logs_apply on public.habit_logs;
create trigger habit_logs_apply
  after insert or delete on public.habit_logs
  for each row execute function public.apply_habit_log();

-- ---------------------------------------------------------------------------
-- Operaciones de grupo
-- ---------------------------------------------------------------------------

-- La firma cambia (llega p_timezone), así que la anterior se retira: con las
-- dos vivas, una llamada de dos argumentos sería ambigua.
drop function if exists public.create_group(text, text);

create or replace function public.create_group(
  p_name text,
  p_city_name text,
  p_timezone text default 'UTC'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Necesitas iniciar sesión'; end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then raise exception 'El grupo necesita un nombre'; end if;

  insert into public.groups (name, city_name, invite_code, created_by, timezone)
  values (trim(p_name), coalesce(nullif(trim(p_city_name), ''), trim(p_name)),
          public.gen_invite_code(), v_uid, public.valid_timezone(p_timezone))
  returning id into v_id;

  insert into public.group_members (group_id, user_id, role) values (v_id, v_uid, 'owner');

  -- Un par de manzanas para que la ciudad no empiece vacía del todo.
  -- El Alcázar en el centro y una primera empalizada: la ciudad nace con algo
  -- que proteger y con algo con lo que protegerlo.
  insert into public.city_tiles (group_id, x, y, building_id, placed_by) values
    (v_id, 4, 4, 'keep',     v_uid),
    (v_id, 5, 4, 'palisade', v_uid),
    (v_id, 4, 5, 'trees',    v_uid)
  on conflict do nothing;

  -- Primer reto de la semana.
  insert into public.challenges (group_id, title, goal, starts_on, ends_on, reward_coins, reward_building_id)
  values (
    v_id, 'Primeros cimientos', 25,
    public.group_today(v_id),
    public.group_today(v_id) + 6,
    250, 'monument'
  );

  return v_id;
end;
$$;

create or replace function public.join_group(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Necesitas iniciar sesión'; end if;

  select id into v_id from public.groups where invite_code = upper(trim(p_code));
  if v_id is null then raise exception 'Ese código de invitación no existe'; end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_id, v_uid, 'member')
  on conflict (group_id, user_id) do nothing;

  return v_id;
end;
$$;

-- Nombrar a un pretendiente. El umbral se comprueba aquí, no en el navegador:
-- desbloquear el nombre es parte del juego.
create or replace function public.set_suitor_name(p_group uuid, p_slot int, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare
  g public.groups%rowtype;
  v_habitos int;
  v_xp_min int;
  v_hab_min int;
begin
  if not public.is_member(p_group) then raise exception 'No perteneces a este reino'; end if;
  if p_slot not in (1, 2) then raise exception 'Solo hay dos pretendientes'; end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Escribe un nombre'; end if;
  if char_length(trim(p_name)) > 30 then raise exception 'Ese nombre es demasiado largo'; end if;

  select * into g from public.groups where id = p_group;
  select count(*) into v_habitos from public.habits where group_id = p_group and not archived;

  v_xp_min  := case when p_slot = 1 then 600 else 1500 end;
  v_hab_min := case when p_slot = 1 then 4 else 6 end;

  if g.xp < v_xp_min or v_habitos < v_hab_min then
    raise exception 'Aún no se ha dado a conocer: hacen falta % XP y % hábitos activos', v_xp_min, v_hab_min;
  end if;

  if p_slot = 1 then
    update public.groups set suitor_one_name = trim(p_name) where id = p_group;
  else
    update public.groups set suitor_two_name = trim(p_name) where id = p_group;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Construcción
-- ---------------------------------------------------------------------------

create or replace function public.place_building(p_group uuid, p_x int, p_y int, p_building text)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.buildings%rowtype;
  g public.groups%rowtype;
begin
  if not public.is_member(p_group) then raise exception 'No perteneces a esta ciudad'; end if;

  select * into b from public.buildings where id = p_building;
  if b.id is null then raise exception 'Ese edificio no existe'; end if;
  if b.reward_only then raise exception 'El % solo se consigue completando un reto', lower(b.name); end if;

  select * into g from public.groups where id = p_group for update;

  if public.city_level(g.xp) < b.min_level then
    raise exception 'Necesitas una ciudad de nivel % para construir: %', b.min_level, b.name;
  end if;
  if g.coins < b.cost then
    raise exception 'Faltan % monedas para %', b.cost - g.coins, b.name;
  end if;
  if exists (select 1 from public.city_tiles where group_id = p_group and x = p_x and y = p_y) then
    raise exception 'Esa parcela ya está ocupada';
  end if;

  update public.groups set coins = coins - b.cost where id = p_group;
  insert into public.city_tiles (group_id, x, y, building_id, placed_by)
  values (p_group, p_x, p_y, p_building, auth.uid());
end;
$$;

create or replace function public.demolish_building(p_group uuid, p_x int, p_y int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cost int;
  v_integrity int;
begin
  if not public.is_member(p_group) then raise exception 'No perteneces a esta ciudad'; end if;

  select b.cost, t.integrity into v_cost, v_integrity
  from public.city_tiles t join public.buildings b on b.id = t.building_id
  where t.group_id = p_group and t.x = p_x and t.y = p_y;

  if v_cost is null then raise exception 'Ahí no hay nada que derribar'; end if;
  if exists (select 1 from public.city_tiles
             where group_id = p_group and x = p_x and y = p_y and building_id = 'keep') then
    raise exception 'El Alcázar no se derriba: ahí vive tu familia';
  end if;

  delete from public.city_tiles where group_id = p_group and x = p_x and y = p_y;
  -- Se devuelve la mitad de lo que costó, y solo en proporción a lo que
  -- quedaba en pie: de unas ruinas no se recupera nada.
  update public.groups set coins = coins + (v_cost * v_integrity / 200) where id = p_group;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retos
-- ---------------------------------------------------------------------------

create or replace function public.challenge_progress(p_challenge uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(count(l.id), 0)::int
  from public.challenges c
  left join public.habit_logs l
    on l.group_id = c.group_id
   and l.log_date between c.starts_on and c.ends_on
  where c.id = p_challenge
  group by c.id;
$$;

create or replace function public.claim_challenge(p_challenge uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.challenges%rowtype;
  v_done int;
  v_slot record;
begin
  select * into c from public.challenges where id = p_challenge for update;
  if c.id is null then raise exception 'Ese reto no existe'; end if;
  if not public.is_member(c.group_id) then raise exception 'No perteneces a esta ciudad'; end if;
  if c.completed_at is not null then raise exception 'Este reto ya se cobró'; end if;

  v_done := public.challenge_progress(p_challenge);
  if v_done < c.goal then
    raise exception 'Faltan % marcas para completar el reto', c.goal - v_done;
  end if;

  update public.challenges
    set completed_at = now(), completed_by = auth.uid()
    where id = p_challenge;

  update public.groups set coins = coins + c.reward_coins where id = c.group_id;

  -- El edificio de recompensa aterriza en la primera parcela libre.
  if c.reward_building_id is not null then
    select gx.x, gy.y into v_slot
    from generate_series(0, 9) as gx(x), generate_series(0, 9) as gy(y)
    where not exists (
      select 1 from public.city_tiles t
      where t.group_id = c.group_id and t.x = gx.x and t.y = gy.y
    )
    order by abs(gx.x - 4) + abs(gy.y - 4), gx.x, gy.y
    limit 1;

    if v_slot.x is not null then
      insert into public.city_tiles (group_id, x, y, building_id, placed_by)
      values (c.group_id, v_slot.x, v_slot.y, c.reward_building_id, auth.uid())
      on conflict do nothing;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Supervivencia: la ciudad se puede perder
--
-- Cada hábito diario que se queda sin marcar sube la amenaza; un día completo
-- la baja. Los hábitos semanales se juzgan al cerrar la semana, el domingo,
-- comparando las marcas con su objetivo. Cuando la amenaza llega a 60 entra un
-- pueblo saqueador. Si la defensa
-- aguanta, se le rechaza; si no, los edificios pierden integridad y acaban en
-- ruinas.
--
-- Todo se calcula al abrir la app, no con un temporizador: settle_city()
-- liquida de golpe los días cerrados que falten. Así funciona en el plan
-- gratuito, sin depender de pg_cron, y el resultado es el mismo tanto si
-- entras cada día como si vuelves después de dos semanas.
-- ---------------------------------------------------------------------------

-- Lo que la ciudad puede oponer hoy: una base pequeña, lo que aportan los
-- edificios defensivos en pie (a prorrata de su integridad) y —con mucho
-- peso— el pulso de la última semana. Las murallas solas no bastan: una
-- semana floja deja la guarnición sin gente aunque la piedra siga ahí.
create or replace function public.city_defense(p_group uuid, p_on date default null)
returns int language sql stable security definer set search_path = public as $$
  select 20
    + coalesce((
        select sum(b.defense * t.integrity / 100)::int
        from public.city_tiles t
        join public.buildings b on b.id = t.building_id
        where t.group_id = p_group
      ), 0)
    + coalesce((
        select count(*)::int * 3
        from public.habit_logs
        where group_id = p_group
          and log_date between coalesce(p_on, public.group_today(p_group)) - 6
                           and coalesce(p_on, public.group_today(p_group))
      ), 0);
$$;

create or replace function public.settle_city(p_group uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  g          public.groups%rowtype;
  d          date;
  hoy        date := public.group_today(p_group);
  v_habits   int;
  v_marks    int;
  v_falta    int;
  v_objetivo int;
  v_fallidos int;
  v_threat   int;
  v_defensa  int;
  v_poder    int;
  v_dano     int;
  v_golpes   int;
  v_tocados  int;
  v_nombre   text;
  v_keep     boolean;
  v_raids    int := 0;
  pueblos    text[] := array[
    'Ceniza', 'Villa Óxido', 'Los Yermos', 'Marca Negra',
    'Cuervo Gris', 'La Deriva', 'Polvo Seco', 'Los Sin Racha'
  ];
begin
  if not public.is_member(p_group) then raise exception 'No perteneces a esta ciudad'; end if;

  select * into g from public.groups where id = p_group for update;
  if g.last_settled_on >= hoy - 1 then return 0; end if;

  v_threat := g.threat;
  -- Solo se liquidan días cerrados, y como mucho 60: volver tras un abandono
  -- largo no debe castigar con cien asaltos ni tardar una eternidad.
  d := greatest(g.last_settled_on + 1, hoy - 60);

  while d < hoy loop
    -- Los diarios se juzgan cada día
    select count(*) into v_habits
      from public.habits
      where group_id = p_group and not archived and frequency = 'daily'
        and created_at::date <= d;

    select count(*) into v_marks
      from public.habit_logs l
      join public.habits h on h.id = l.habit_id
      where l.group_id = p_group and l.log_date = d and h.frequency = 'daily';

    if v_habits > 0 then
      v_falta := greatest(0, v_habits - v_marks);
      -- Proporcional, no absoluto: dejarse uno de cuatro hábitos no puede
      -- pesar lo mismo que abandonarlos todos. Subir cuesta más que bajar
      -- (+30 frente a −20): recuperarse de una mala racha lleva su tiempo.
      if v_falta = 0 then
        v_threat := greatest(0, v_threat - 20);
      else
        v_threat := v_threat + (30 * v_falta) / v_habits;
      end if;
    end if;

    -- Los semanales se juzgan el domingo, con la semana entera a la vista.
    -- Pedirles una marca cada día sería castigar por diseño lo que el propio
    -- usuario marcó como semanal.
    if extract(isodow from d) = 7 then
      select coalesce(sum(h.weekly_target), 0),
             coalesce(sum(greatest(0, h.weekly_target - coalesce(m.marcas, 0))), 0)
        into v_objetivo, v_falta
        from public.habits h
        left join (
          select habit_id, count(*)::int as marcas
          from public.habit_logs
          where group_id = p_group and log_date between d - 6 and d
          group by habit_id
        ) m on m.habit_id = h.id
       where h.group_id = p_group and not h.archived and h.frequency = 'weekly'
         and h.created_at::date <= d - 6;

      if v_objetivo > 0 then
        if v_falta = 0 then
          v_threat := greatest(0, v_threat - 20);
        else
          v_threat := v_threat + (30 * v_falta) / v_objetivo;
        end if;
      end if;
    end if;

    -- Las defensas se desgastan solas: la empalizada se pudre, la ballesta se
    -- destensa. Mantenerlas exige volver, no comprarlas una vez. El Alcázar
    -- queda fuera: es la casa, no la muralla.
    update public.city_tiles t
       set integrity = greatest(0, t.integrity - 4)
      from public.buildings b
     where b.id = t.building_id
       and t.group_id = p_group
       and b.defense > 0
       and b.id <> 'keep'
       and t.integrity > 0;

    -- Un reto que vence sin cumplirse convoca el asalto por sí solo: 60 es
    -- exactamente el umbral. Que entren no significa que ganen; para eso está
    -- la defensa.
    select count(*) into v_fallidos
      from public.challenges c
      where c.group_id = p_group and c.ends_on = d and c.completed_at is null
        and public.challenge_progress(c.id) < c.goal;
    v_threat := v_threat + v_fallidos * 60;

    if v_threat >= 60 then
      v_defensa := public.city_defense(p_group, d);
      v_poder   := v_threat;
      v_tocados := 0;
      v_keep    := false;
      v_nombre  := pueblos[1 + (((hashtext(p_group::text || d::text) % array_length(pueblos, 1))
                                 + array_length(pueblos, 1)) % array_length(pueblos, 1))];

      if v_defensa >= v_poder then
        -- Aguantó, pero cada embestida abre brecha. Es lo que impide que una
        -- ciudad bien amurallada ignore los hábitos para siempre: si nadie
        -- repara, la defensa se erosiona asalto tras asalto hasta ceder.
        update public.city_tiles t
           set integrity = greatest(0, t.integrity - 8)
          from public.buildings b
         where b.id = t.building_id
           and t.group_id = p_group
           and b.defense > 0
           and b.id <> 'keep'
           and t.integrity > 0;

        v_threat := 35;                            -- rechazados, pero acampan cerca
      else
        v_dano   := v_poder - v_defensa;
        v_golpes := least(6, greatest(1, v_dano / 25));

        with objetivo as (
          select t.x, t.y
          from public.city_tiles t
          join public.buildings b on b.id = t.building_id
          where t.group_id = p_group and t.integrity > 0
          -- El Alcázar el último: mientras quede una muralla en pie, los
          -- golpes caen ahí. Eso es literalmente lo que protege a la familia.
          order by (t.building_id = 'keep')::int, t.integrity desc, b.cost desc, t.x, t.y
          limit v_golpes
        )
        update public.city_tiles t
          set integrity = greatest(0, t.integrity - 50)
          from objetivo o
          where t.group_id = p_group and t.x = o.x and t.y = o.y;

        get diagnostics v_tocados = row_count;
        select exists (
          select 1 from public.city_tiles
          where group_id = p_group and building_id = 'keep' and integrity < 100
        ) into v_keep;
        v_threat := 25;
      end if;

      insert into public.raids (group_id, happened_on, raider, power, defense, repelled, buildings_hit, reached_keep)
      values (p_group, d, v_nombre, v_poder, v_defensa, v_defensa >= v_poder, v_tocados, coalesce(v_keep, false));
      v_raids := v_raids + 1;
    end if;

    d := d + 1;
  end loop;

  update public.groups set threat = v_threat, last_settled_on = hoy - 1 where id = p_group;
  return v_raids;
end;
$$;

create or replace function public.repair_building(p_group uuid, p_x int, p_y int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cost      int;
  v_integrity int;
  v_nombre    text;
  v_precio    int;
  v_coins     int;
begin
  if not public.is_member(p_group) then raise exception 'No perteneces a esta ciudad'; end if;

  select b.cost, t.integrity, b.name into v_cost, v_integrity, v_nombre
  from public.city_tiles t join public.buildings b on b.id = t.building_id
  where t.group_id = p_group and t.x = p_x and t.y = p_y;

  if v_cost is null then raise exception 'Ahí no hay nada que reparar'; end if;
  if v_integrity >= 100 then raise exception 'La construcción «%» está entera', v_nombre; end if;

  -- Reconstruir sale por la mitad de lo que costó, en proporción al destrozo.
  v_precio := greatest(5, (v_cost * (100 - v_integrity)) / 200);

  select coins into v_coins from public.groups where id = p_group for update;
  if v_coins < v_precio then
    raise exception 'Faltan % monedas para reparar: %', v_precio - v_coins, v_nombre;
  end if;

  update public.groups set coins = coins - v_precio where id = p_group;
  update public.city_tiles set integrity = 100
    where group_id = p_group and x = p_x and y = p_y;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.habits        enable row level security;
alter table public.habit_logs    enable row level security;
alter table public.buildings     enable row level security;
alter table public.city_tiles    enable row level security;
alter table public.challenges    enable row level security;
alter table public.raids         enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_write_own on public.profiles;
create policy profiles_write_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups
  for select to authenticated using (public.is_member(id));

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update to authenticated
  using (public.is_member(id) and created_by = auth.uid())
  with check (public.is_member(id) and created_by = auth.uid());

drop policy if exists members_read on public.group_members;
create policy members_read on public.group_members
  for select to authenticated using (public.is_member(group_id));

drop policy if exists members_leave on public.group_members;
create policy members_leave on public.group_members
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists buildings_read on public.buildings;
create policy buildings_read on public.buildings
  for select to authenticated using (true);

drop policy if exists habits_read on public.habits;
create policy habits_read on public.habits
  for select to authenticated using (public.is_member(group_id));

drop policy if exists habits_insert on public.habits;
create policy habits_insert on public.habits
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(group_id));

drop policy if exists habits_update_own on public.habits;
create policy habits_update_own on public.habits
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists habits_delete_own on public.habits;
create policy habits_delete_own on public.habits
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists logs_read on public.habit_logs;
create policy logs_read on public.habit_logs
  for select to authenticated using (public.is_member(group_id));

-- El trigger BEFORE INSERT reescribe group_id, user_id, streak y recompensas,
-- así que basta con exigir que la fila sea del propio usuario.
drop policy if exists logs_insert_own on public.habit_logs;
create policy logs_insert_own on public.habit_logs
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists logs_delete_own on public.habit_logs;
create policy logs_delete_own on public.habit_logs
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists tiles_read on public.city_tiles;
create policy tiles_read on public.city_tiles
  for select to authenticated using (public.is_member(group_id));

drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges
  for select to authenticated using (public.is_member(group_id));

drop policy if exists raids_read on public.raids;
create policy raids_read on public.raids
  for select to authenticated using (public.is_member(group_id));

drop policy if exists challenges_insert on public.challenges;
create policy challenges_insert on public.challenges
  for insert to authenticated with check (public.is_member(group_id));

-- ---------------------------------------------------------------------------
-- Realtime: la ciudad se actualiza sola para todo el grupo
-- ---------------------------------------------------------------------------

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.habit_logs'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.city_tiles'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.groups';     exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.challenges'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.raids';      exception when duplicate_object then null; end;
end $$;
