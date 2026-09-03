import type { Raid } from "@/lib/types";

/* La crónica de los asaltos. Es la memoria de la ciudad: lo que costó cada
   semana floja, escrito donde se ve. */

export default function RaidChronicle({ raids }: { raids: Raid[] }) {
  if (raids.length === 0) {
    return (
      <p className="text-sm text-ink-60">
        Nadie ha atacado todavía. Aquí quedará constancia de cada asalto: quién vino, con cuánta
        fuerza y qué se llevó por delante.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {raids.map((raid) => (
        <li
          key={raid.id}
          className="flex items-baseline gap-3 border-b border-[var(--ink-12)] py-2.5 last:border-0"
        >
          <span
            aria-hidden="true"
            className="num shrink-0 text-xs"
            style={{ color: raid.repelled ? "var(--green)" : "var(--pink)" }}
          >
            {raid.happened_on.slice(8, 10)}/{raid.happened_on.slice(5, 7)}
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">{raid.raider}</span>
            <span className="text-ink-60">
              {raid.repelled
                ? " se dio media vuelta"
                : raid.buildings_hit === 0
                  ? " entró y no encontró nada que romper"
                  : ` arrasó ${raid.buildings_hit} ${raid.buildings_hit === 1 ? "construcción" : "construcciones"}`}
            </span>
          </span>
          <span className="num shrink-0 text-xs text-ink-35">
            {raid.power} vs {raid.defense}
          </span>
        </li>
      ))}
    </ul>
  );
}
