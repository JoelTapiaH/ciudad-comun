import type { Raid } from "@/lib/types";

/* --------------------------------------------------------------------------
   El Alcázar y quien vive dentro.

   La amenaza es un número; esto es lo que ese número significa. El príncipe
   Adiel no defiende una ciudad: defiende la casa donde están Nara y los
   mellizos, Tino y Sela. Por eso el Alcázar es lo último que recibe un golpe
   y lo único que no se puede derribar.
   -------------------------------------------------------------------------- */

export const FAMILIA = {
  principe: "Adiel",
  esposa: "Nara",
  hijos: "Tino y Sela",
} as const;

export type Beat = { titulo: string; linea: string; ink: string };

/** Lo que se vive dentro del Alcázar, según cómo esté el asedio. */
export function beatDelAlcazar(keepIntegrity: number | null, threat: number): Beat {
  if (keepIntegrity !== null && keepIntegrity <= 0) {
    return {
      titulo: "El Alcázar está abierto",
      linea: `${FAMILIA.principe} ha sacado a ${FAMILIA.esposa} y a los mellizos al patio, bajo una lona. Reconstruidlo antes de que vuelvan.`,
      ink: "var(--pink)",
    };
  }

  if (keepIntegrity !== null && keepIntegrity < 60) {
    return {
      titulo: "Han llegado a la casa",
      linea: `Una piedra del Alcázar cayó sobre la cuna vacía. ${FAMILIA.esposa} no gritó: miró a ${FAMILIA.principe} y empezó a apilar sacos contra la puerta.`,
      ink: "var(--pink)",
    };
  }

  if (threat >= 45) {
    return {
      titulo: "La puerta, cerrada",
      linea: `${FAMILIA.principe} ha mandado cerrar con los mellizos dentro. Lo que siga en pie mañana es lo que levantéis hoy.`,
      ink: "var(--pink)",
    };
  }

  if (threat >= 30) {
    return {
      titulo: "Nadie duerme",
      linea: `${FAMILIA.esposa} ha bajado a los niños al sótano dos veces esta semana. ${FAMILIA.principe} no ha dormido ninguna.`,
      ink: "var(--yellow)",
    };
  }

  if (threat >= 15) {
    return {
      titulo: "Hombres en el camino",
      linea: `Tino pregunta quiénes son los del camino. ${FAMILIA.principe} le dice que mercaderes, y no está seguro.`,
      ink: "var(--blue)",
    };
  }

  return {
    titulo: "Una tarde tranquila",
    linea: `${FAMILIA.principe} ha bajado de la muralla al patio. ${FAMILIA.esposa} discute con los mellizos si el foso sirve para pescar.`,
    ink: "var(--green)",
  };
}

/** Cómo se cuenta un asalto concreto en la crónica. */
export function contarAsalto(raid: Raid): string {
  if (raid.repelled) {
    return `chocó contra la muralla (${raid.power} contra ${raid.defense}) y se retiró antes del alba`;
  }
  if (raid.reached_keep) {
    return `llegó hasta el Alcázar: ${FAMILIA.principe} peleó en el propio patio`;
  }
  if (raid.buildings_hit === 0) {
    return "entró y no encontró nada en pie que romper";
  }
  return `derribó ${raid.buildings_hit} ${raid.buildings_hit === 1 ? "construcción" : "construcciones"} antes de retirarse`;
}
