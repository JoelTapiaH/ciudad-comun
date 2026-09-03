import Link from "next/link";
import type { Raid } from "@/lib/types";

/* Lo primero que se ve al volver después de unos días flojos. No regaña:
   cuenta lo que pasó y dice qué hacer ahora. */

export default function RaidAlert({ raids }: { raids: Raid[] }) {
  if (raids.length === 0) return null;

  const perdidos = raids.reduce((sum, r) => sum + r.buildings_hit, 0);
  const rechazados = raids.filter((r) => r.repelled).length;
  const todosRechazados = rechazados === raids.length;

  return (
    <section
      className="panel stamp-in mb-5 p-4"
      style={{
        borderColor: todosRechazados ? "var(--green)" : "var(--pink)",
        boxShadow: `4px 4px 0 ${todosRechazados ? "var(--green)" : "var(--pink)"}`,
      }}
      role="status"
    >
      <p className="eyebrow mb-1">Mientras no estabais</p>
      <h2 className="display text-2xl">
        {todosRechazados
          ? raids.length === 1
            ? `${raids[0].raider} lo intentó y no pudo`
            : `${raids.length} asaltos, ninguno entró`
          : perdidos === 0
            ? "Entraron, pero no había nada que romper"
            : `${perdidos} ${perdidos === 1 ? "construcción" : "construcciones"} por los suelos`}
      </h2>

      <ul className="mt-3 flex flex-col gap-1">
        {raids.map((raid) => (
          <li key={raid.id} className="text-sm">
            <span className="num text-xs text-ink-35">
              {raid.happened_on.slice(8, 10)}/{raid.happened_on.slice(5, 7)}
            </span>{" "}
            <span className="font-semibold">{raid.raider}</span>
            <span className="text-ink-60">
              {raid.repelled
                ? ` chocó contra vuestra defensa (${raid.power} contra ${raid.defense})`
                : raid.buildings_hit === 0
                  ? " entró en una ciudad vacía"
                  : ` se llevó por delante ${raid.buildings_hit} ${raid.buildings_hit === 1 ? "construcción" : "construcciones"}`}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-ink-60">
        {todosRechazados
          ? "La muralla aguantó. Seguid marcando y no volverán a acercarse."
          : "Marcad hoy para bajar la amenaza, y reparad lo dañado antes de que vuelvan."}
      </p>

      <Link href="/ciudad" className="btn btn-sm mt-3">
        Ver los daños
      </Link>
    </section>
  );
}
