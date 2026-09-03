-- ============================================================================
-- Provocar un asalto ahora mismo
-- ============================================================================
-- Sirve para ver la mecánica sin esperar días. Pega esto en el SQL Editor de
-- Supabase, cambia el nombre de la ciudad y ejecútalo; luego recarga la app:
-- settle_city() liquidará el día pendiente y resolverá el asalto.
--
-- La amenaza se pone alta a propósito (200) para que dispare aunque el día
-- que se liquida tenga todos los hábitos marcados, que resta 25.
-- ============================================================================

update public.groups
   set threat = 200,
       last_settled_on = (now() at time zone 'utc')::date - 2
 where city_name = 'Puerto Constancia';   -- ← pon aquí el nombre de tu ciudad

-- Comprueba a qué te enfrentas antes de recargar:
select g.city_name,
       g.threat                     as amenaza,
       public.city_defense(g.id)    as defensa,
       case when public.city_defense(g.id) >= g.threat
            then 'los rechazáis'
            else 'entran' end       as pronostico
  from public.groups g
 where g.city_name = 'Puerto Constancia';
