import { THREAT_RAID, threatBand, threatDelta } from "@/lib/game";

/* El estado del asedio en un vistazo: cuánto aprietan, cuánto aguantamos y
   qué pasa esta noche si el día se cierra como está ahora. */

export default function ThreatPanel({
  threat,
  defense,
  habits,
  marks,
}: {
  threat: number;
  defense: number;
  habits: number;
  marks: number;
}) {
  const band = threatBand(threat);
  const delta = threatDelta(habits, marks);
  const proyectada = Math.max(0, threat + delta);
  const entrarian = proyectada >= THREAT_RAID;
  const aguantaria = defense >= proyectada;

  return (
    <section className="panel panel-raised p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="eyebrow">Amenaza</p>
        <span className="num text-xs" style={{ color: band.ink }}>
          {Math.min(threat, 999)} / {THREAT_RAID}
        </span>
      </div>

      <div className="meter" aria-label={`Amenaza ${threat} de ${THREAT_RAID}`}>
        <span
          style={{
            width: `${Math.min(100, Math.round((threat / THREAT_RAID) * 100))}%`,
            background: band.ink,
          }}
        />
      </div>

      <h3 className="display mt-3 text-xl" style={{ color: band.ink }}>
        {band.label}
      </h3>
      <p className="mt-1 text-sm text-ink-60">{band.blurb}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t-2 border-[var(--ink-12)] pt-3">
        <div>
          <p className="eyebrow">Defensa</p>
          <p className="display text-2xl">{defense}</p>
        </div>
        <div>
          <p className="eyebrow">Si el día acaba así</p>
          <p className="display text-2xl" style={{ color: delta > 0 ? "var(--pink)" : "var(--green)" }}>
            {delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta}
          </p>
        </div>
      </div>

      {habits === 0 ? (
        <p className="mt-3 text-sm text-ink-60">
          Sin hábitos activos nadie os molesta todavía. La amenaza empieza a contar cuando hay algo
          que cumplir.
        </p>
      ) : entrarian ? (
        <p className="mt-3 text-sm font-medium" style={{ color: aguantaria ? "var(--yellow)" : "var(--pink)" }}>
          {aguantaria
            ? `Esta noche entran, pero con ${defense} de defensa los echáis.`
            : `Esta noche entran y ${defense} de defensa no basta. Faltan ${marks < habits ? habits - marks : 0} marcas para evitarlo.`}
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-60">
          {marks >= habits
            ? "Día cubierto: la amenaza baja esta noche."
            : `Quedan ${habits - marks} marcas para cerrar el día en limpio.`}
        </p>
      )}
    </section>
  );
}
