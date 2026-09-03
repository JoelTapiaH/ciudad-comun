-- ============================================================================
-- Dejar la ciudad como nueva
-- ============================================================================
-- El botón de deshacer después de probar los asaltos: repara todo lo dañado,
-- pone la amenaza a cero y borra la crónica.
--
-- Afecta a TODOS los grupos de la base de datos. Si compartes el proyecto de
-- Supabase entre local y producción —que es el caso—, esto también restaura
-- la ciudad de verdad. Es lo que se busca al probar, pero conviene saberlo.
-- ============================================================================

update public.city_tiles set integrity = 100;

update public.groups
   set threat = 0,
       last_settled_on = (now() at time zone 'utc')::date - 1;

delete from public.raids;

-- Qué ha quedado:
select city_name, coins as monedas, xp, threat as amenaza,
       (select count(*) from public.city_tiles t where t.group_id = g.id) as parcelas
  from public.groups g;
