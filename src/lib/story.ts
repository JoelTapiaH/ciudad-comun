import type { Raid } from "@/lib/types";

/* --------------------------------------------------------------------------
   El reino.

   La amenaza es un número; esto es lo que ese número significa. El rey Joel no
   defiende una ciudad: defiende el Alcázar donde están Betsabell y los niños.
   Sale a pelear con Víctor. En la corte viven además las princesas Merari y
   Daniela, y dos príncipes de otro reino que pidieron su mano y se quedaron a
   defender la muralla. Sus nombres no se saben todavía: hay que ganárselos.
   -------------------------------------------------------------------------- */

export const REINO = {
  rey: "Joel",
  reina: "Betsabell",
  hijos: ["Mateo", "Olivia"] as const,
  companero: "Víctor",
  princesas: ["Merari", "Daniela"] as const,
} as const;

/* Los dos pretendientes ---------------------------------------------------- */

export type Pretendiente = {
  slot: 1 | 2;
  princesa: string;
  xpMin: number;
  habitosMin: number;
  nombre: string | null;
  desbloqueado: boolean;
  faltaXp: number;
  faltanHabitos: number;
};

export const UMBRALES = [
  { slot: 1 as const, princesa: REINO.princesas[0], xpMin: 600, habitosMin: 4 },
  { slot: 2 as const, princesa: REINO.princesas[1], xpMin: 1500, habitosMin: 6 },
];

export function pretendientes(
  xp: number,
  habitosActivos: number,
  nombres: [string | null, string | null],
): Pretendiente[] {
  return UMBRALES.map((u, i) => ({
    ...u,
    nombre: nombres[i],
    desbloqueado: xp >= u.xpMin && habitosActivos >= u.habitosMin,
    faltaXp: Math.max(0, u.xpMin - xp),
    faltanHabitos: Math.max(0, u.habitosMin - habitosActivos),
  }));
}

/* Lo que se vive dentro del Alcázar ---------------------------------------- */

export type Beat = { titulo: string; linea: string; ink: string };

export function beatDelAlcazar(keepIntegrity: number | null, threat: number): Beat {
  const { rey, reina, hijos, companero, princesas } = REINO;

  if (keepIntegrity !== null && keepIntegrity <= 0) {
    return {
      titulo: "El Alcázar está abierto",
      linea: `${rey} sacó a ${reina} y a los niños al patio, bajo una lona. ${companero} monta guardia con el hombro partido. Reconstruidlo antes de que vuelvan.`,
      ink: "var(--pink)",
    };
  }

  if (keepIntegrity !== null && keepIntegrity < 60) {
    return {
      titulo: "Han llegado a la casa",
      linea: `Una piedra cayó en el cuarto de ${hijos[1]}. ${reina} no gritó: miró a ${rey} y empezó a apilar sacos contra la puerta.`,
      ink: "var(--pink)",
    };
  }

  if (threat >= 45) {
    return {
      titulo: "Salen esta noche",
      linea: `${rey} y ${companero} ya están en la puerta. ${reina} ha bajado a ${hijos[0]} y a ${hijos[1]} al sótano. Lo que siga en pie mañana es lo que levantéis hoy.`,
      ink: "var(--pink)",
    };
  }

  if (threat >= 30) {
    return {
      titulo: "Nadie duerme",
      linea: `${princesas[0]} y ${princesas[1]} han subido a la muralla con los dos príncipes. ${companero} afila lo que encuentra. ${rey} no ha dormido en tres noches.`,
      ink: "var(--yellow)",
    };
  }

  if (threat >= 15) {
    return {
      titulo: "Hombres en el camino",
      linea: `${hijos[0]} pregunta quiénes son los del camino. ${rey} le dice que mercaderes, y mira a ${companero} por encima de su cabeza.`,
      ink: "var(--blue)",
    };
  }

  return {
    titulo: "Una tarde tranquila",
    linea: `${rey} ha bajado de la muralla al patio. ${reina} discute con ${hijos[0]} y ${hijos[1]} si el foso sirve para pescar. ${companero} pierde a los dados.`,
    ink: "var(--green)",
  };
}

/* Cómo se cuenta un asalto en la crónica ----------------------------------- */

export function contarAsalto(raid: Raid): string {
  const { rey, companero } = REINO;
  if (raid.repelled) {
    return `chocó contra la muralla (${raid.power} contra ${raid.defense}) y se retiró antes del alba`;
  }
  if (raid.reached_keep) {
    return `llegó hasta el Alcázar: ${rey} y ${companero} pelearon en el propio patio`;
  }
  if (raid.buildings_hit === 0) {
    return "entró y no encontró nada en pie que romper";
  }
  return `derribó ${raid.buildings_hit} ${raid.buildings_hit === 1 ? "construcción" : "construcciones"} antes de retirarse`;
}
