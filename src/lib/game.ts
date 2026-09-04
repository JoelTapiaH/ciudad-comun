import type { HabitLog, Ink } from "@/lib/types";

/* Reglas del juego ---------------------------------------------------------
   Estas funciones son un espejo de lo que hace la base de datos. Sirven para
   pintar la interfaz al instante; la autoridad siempre es el servidor.
   -------------------------------------------------------------------------- */

export const GRID = 10;

/** Umbral(n) = 75·n·(n−1) → Nv.2 a 150 XP, Nv.3 a 450, Nv.4 a 900… */
export function xpForLevel(level: number): number {
  return 75 * level * (level - 1);
}

export function cityLevel(xp: number): number {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * Math.max(xp, 0)) / 75)) / 2));
}

export function levelProgress(xp: number) {
  const level = cityLevel(xp);
  const floorXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  const span = nextXp - floorXp;
  return {
    level,
    into: xp - floorXp,
    span,
    next: nextXp,
    ratio: span > 0 ? Math.min(1, (xp - floorXp) / span) : 1,
  };
}

/* Supervivencia --------------------------------------------------------------
   La amenaza sube cuando quedan hábitos sin marcar y baja con los días
   redondos. A 100 entra un pueblo saqueador.
   -------------------------------------------------------------------------- */

export const THREAT_RAID = 60;
export const DEFENSE_BASE = 20;

/** Cuánto subiría la amenaza si el día de hoy se cerrase ahora mismo. */
export function threatDelta(habits: number, marks: number): number {
  if (habits <= 0) return 0;
  const falta = Math.max(0, habits - marks);
  return falta === 0 ? -20 : Math.floor((30 * falta) / habits);
}

export type ThreatBand = {
  key: "calma" | "inquietud" | "aviso" | "inminente";
  label: string;
  blurb: string;
  ink: string;
};

export function threatBand(threat: number): ThreatBand {
  if (threat >= 45)
    return {
      key: "inminente",
      label: "Asalto inminente",
      blurb: "Están a las puertas. Marcad hoy o entrarán esta noche.",
      ink: "var(--pink)",
    };
  if (threat >= 30)
    return {
      key: "aviso",
      label: "Se acercan",
      blurb: "Los vigías los ven venir. Otro día flojo y entran.",
      ink: "var(--yellow)",
    };
  if (threat >= 15)
    return {
      key: "inquietud",
      label: "Inquietud",
      blurb: "Se oyen cosas en el camino. Nada grave todavía.",
      ink: "var(--blue)",
    };
  return {
    key: "calma",
    label: "Calma",
    blurb: "Nadie ronda la ciudad. Seguid así.",
    ink: "var(--green)",
  };
}

/** Defensa que puede oponer la ciudad. Espejo de public.city_defense. */
export function cityDefense(
  tiles: { building_id: string; integrity: number }[],
  buildings: Map<string, { defense: number }>,
  marksLastWeek: number,
): number {
  const fromBuildings = tiles.reduce((sum, t) => {
    const def = buildings.get(t.building_id)?.defense ?? 0;
    return sum + Math.floor((def * t.integrity) / 100);
  }, 0);
  return DEFENSE_BASE + fromBuildings + marksLastWeek * 3;
}

/** Lo que cuesta dejar entero un edificio dañado. */
export function repairCost(cost: number, integrity: number): number {
  return Math.max(5, Math.floor((cost * (100 - integrity)) / 200));
}

/** Lo que otorga marcar un hábito, dada la racha que quedaría. */
export function rewardFor(streak: number) {
  const capped = Math.min(streak - 1, 10);
  return { coins: 10 + capped * 2, xp: 10 + capped };
}

/* Fechas -------------------------------------------------------------------
   Se trabaja en UTC para que la fecha coincida con la que valida Postgres.
   -------------------------------------------------------------------------- */

export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return isoDate();
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

const LONG_DATE = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function formatLongDate(iso: string): string {
  return LONG_DATE.format(new Date(`${iso}T00:00:00Z`));
}

export function formatClock(timestamp: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/** Lunes de la semana a la que pertenece una fecha (semana ISO). */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return isoDate(d);
}

/** Los siete días de la semana en curso, de lunes a domingo. */
export function weekDays(reference: string = today()): string[] {
  const lunes = mondayOf(reference);
  return Array.from({ length: 7 }, (_, i) => shiftDate(lunes, i));
}

/** Los últimos `n` días, del más antiguo al más reciente. */
export function lastDays(n: number, reference: string = today()): string[] {
  return Array.from({ length: n }, (_, i) => shiftDate(reference, i - n + 1));
}

/** Cinco semanas completas terminando en el domingo de la semana en curso.
    Alineado a lunes para que la rejilla se lea como un calendario: sin esto
    las columnas no coincidían con los días salvo que hoy fuese domingo. */
export function monthGrid(reference: string = today()): string[] {
  const domingo = shiftDate(mondayOf(reference), 6);
  const inicio = shiftDate(domingo, -34);
  return Array.from({ length: 35 }, (_, i) => shiftDate(inicio, i));
}

export const WEEKDAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"] as const;

/** Un hábito semanal está cubierto cuando llega a su objetivo. */
export function weeklyDone(marks: number, target: number): boolean {
  return marks >= target;
}

/** Racha actual de un hábito: días consecutivos que terminan hoy o ayer. */
export function streakFromLogs(dates: string[], reference: string = today()): number {
  const set = new Set(dates);
  let cursor = set.has(reference) ? reference : shiftDate(reference, -1);
  if (!set.has(cursor)) return 0;

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/* Proyección isométrica ----------------------------------------------------
   Rombo de 64×32. La ciudad se dibuja en SVG, sin imágenes.
   -------------------------------------------------------------------------- */

export const TILE_W = 64;
export const TILE_H = 32;

export function isoPoint(x: number, y: number) {
  return {
    sx: (x - y) * (TILE_W / 2),
    sy: (x + y) * (TILE_H / 2),
  };
}

/** Caja que envuelve la rejilla completa, con margen para edificios altos. */
export function isoViewBox(size = GRID, headroom = 100) {
  const width = size * TILE_W + 40;
  const height = (size - 1) * TILE_H + headroom + TILE_H + 24;
  return {
    width,
    height,
    ratio: height / width,
    value: `${-width / 2} ${-headroom} ${width} ${height}`,
  };
}

export const INK_VAR: Record<Ink, string> = {
  pink: "var(--pink)",
  blue: "var(--blue)",
  yellow: "var(--yellow)",
  green: "var(--green)",
};

export const INK_LABEL: Record<Ink, string> = {
  pink: "Rosa",
  blue: "Azul",
  yellow: "Amarillo",
  green: "Verde",
};

export const INKS: Ink[] = ["pink", "blue", "yellow", "green"];

/** Agrupa los registros por hábito y devuelve las fechas ordenadas. */
export function datesByHabit(logs: Pick<HabitLog, "habit_id" | "log_date">[]) {
  const map = new Map<string, string[]>();
  for (const log of logs) {
    const list = map.get(log.habit_id);
    if (list) list.push(log.log_date);
    else map.set(log.habit_id, [log.log_date]);
  }
  for (const list of map.values()) list.sort((a, b) => (a < b ? 1 : -1));
  return map;
}
