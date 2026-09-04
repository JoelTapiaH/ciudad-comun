import { BuildingThumb } from "@/components/BuildingSprite";
import { INK_VAR, repairCost } from "@/lib/game";
import { FAMILIA, beatDelAlcazar } from "@/lib/story";

/* El corazón del asedio. Todo lo demás son números; esto es a quién protegen. */

export default function KeepCard({
  integrity,
  threat,
  keepCost = 0,
  compact = false,
}: {
  integrity: number | null;
  threat: number;
  keepCost?: number;
  compact?: boolean;
}) {
  const beat = beatDelAlcazar(integrity, threat);
  const enPie = integrity ?? 100;

  return (
    <section
      className="panel p-4"
      style={{ borderColor: beat.ink, boxShadow: `4px 4px 0 ${beat.ink}` }}
    >
      <div className="flex items-start gap-3">
        {!compact ? (
          <BuildingThumb id="keep" ink={INK_VAR.pink} size={44} integrity={enPie} />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">El Alcázar</p>
          <h3 className="display text-xl" style={{ color: beat.ink }}>
            {beat.titulo}
          </h3>
          <p className="mt-2 text-sm text-ink-60">{beat.linea}</p>
        </div>
      </div>

      {integrity !== null ? (
        <>
          <div className="meter mt-4" aria-label={`El Alcázar está al ${enPie} por ciento`}>
            <span style={{ width: `${enPie}%`, background: beat.ink }} />
          </div>
          <p className="num mt-2 text-xs text-ink-60">
            {enPie}% en pie
            {enPie < 100 && keepCost > 0
              ? ` · repararlo cuesta ◎ ${repairCost(keepCost, enPie)}`
              : ""}
          </p>
        </>
      ) : null}

      {!compact ? (
        <p className="mt-3 border-t-2 border-[var(--ink-12)] pt-3 text-xs text-ink-60">
          Los asaltos golpean primero lo que hayáis levantado alrededor. Mientras quede una muralla
          en pie, {FAMILIA.principe} no pelea en el patio.
        </p>
      ) : null}
    </section>
  );
}
