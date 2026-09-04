"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markHabit, unmarkHabit } from "@/app/(app)/hoy/actions";
import { INK_VAR, WEEKDAY_INITIALS, monthGrid, weekDays } from "@/lib/game";
import type { HabitWithToday } from "@/lib/types";

/* Cómo fue la semana y el mes. Una celda por día: llena si se marcó.
   En la semana las celdas se pueden tocar, así que arreglar un día que se
   olvidó no obliga a esperar a mañana. */

const clave = (habitId: string, fecha: string) => `${habitId}|${fecha}`;

function Cell({
  on,
  muted,
  title,
  onClick,
  disabled,
}: {
  on: boolean;
  muted?: boolean;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const cuerpo = (
    <span
      className="flex items-center justify-center rounded-[2px] border"
      style={{
        width: "100%",
        aspectRatio: "1",
        borderColor: "var(--ink)",
        borderWidth: 1.5,
        background: on ? "currentColor" : "transparent",
        opacity: muted ? 0.3 : 1,
        fontSize: 11,
        lineHeight: 1,
        color: on ? "currentColor" : "var(--ink-35)",
      }}
    >
      {on ? (
        <span style={{ color: "var(--card)", fontWeight: 700 }} aria-hidden="true">
          ✓
        </span>
      ) : null}
    </span>
  );

  if (!onClick) return <span title={title}>{cuerpo}</span>;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      onClick={onClick}
      disabled={disabled}
      className="block w-full transition-transform active:translate-y-px disabled:opacity-50"
    >
      {cuerpo}
    </button>
  );
}

export function WeekView({
  habits,
  timeZone,
  todayIso,
}: {
  habits: HabitWithToday[];
  timeZone: string;
  todayIso: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const dias = weekDays(todayIso);

  useEffect(() => setOptimistic({}), [habits]);

  function marcado(h: HabitWithToday, fecha: string) {
    const k = clave(h.id, fecha);
    return optimistic[k] ?? h.history.includes(fecha);
  }

  function alternar(h: HabitWithToday, fecha: string) {
    const k = clave(h.id, fecha);
    const estaba = marcado(h, fecha);
    setOptimistic((prev) => ({ ...prev, [k]: !estaba }));
    setError(null);

    startTransition(async () => {
      const r = estaba ? await unmarkHabit(h.id, fecha) : await markHabit(h.id, fecha);
      if (r.error) {
        setOptimistic((prev) => ({ ...prev, [k]: estaba }));
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  if (habits.length === 0) {
    return <p className="text-sm text-ink-60">Cuando tengas hábitos, aquí verás la semana entera.</p>;
  }

  const columnas = "1fr repeat(7, 26px) 44px";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid items-center gap-x-2" style={{ gridTemplateColumns: columnas }}>
        <span />
        {dias.map((d, i) => (
          <span
            key={d}
            className="num py-1 text-center text-[11px]"
            style={
              d === todayIso
                ? { color: "var(--pink)", background: "var(--ink-12)", fontWeight: 700 }
                : { color: "var(--ink-35)" }
            }
          >
            {WEEKDAY_INITIALS[i]}
          </span>
        ))}
        <span className="eyebrow text-right">Total</span>
      </div>

      {habits.map((h) => {
        const total = dias.filter((d) => marcado(h, d)).length;
        const meta = h.frequency === "weekly" ? h.weekly_target : 7;
        return (
          <div
            key={h.id}
            className="grid items-center gap-x-2"
            style={{ gridTemplateColumns: columnas, color: INK_VAR[h.ink] }}
          >
            <span className="truncate py-1 text-sm text-ink" title={h.name}>
              <span aria-hidden="true">{h.emoji}</span> {h.name}
            </span>

            {dias.map((d) => {
              const futuro = d > todayIso;
              return (
                <span
                  key={d}
                  className="px-0.5 py-1"
                  // La columna de hoy va sombreada de arriba abajo: sin eso
                  // había que contar letras para saber en qué día estás.
                  style={d === todayIso ? { background: "var(--ink-12)" } : undefined}
                >
                  <Cell
                    on={marcado(h, d)}
                    muted={futuro}
                    title={`${h.name} · ${d}${futuro ? " (aún no)" : ""}`}
                    onClick={futuro ? undefined : () => alternar(h, d)}
                    disabled={pending}
                  />
                </span>
              );
            })}

            <span
              className="num py-1 text-right text-xs"
              style={{ color: total >= meta ? "var(--green)" : "var(--ink-60)" }}
            >
              {total}/{meta}
            </span>
          </div>
        );
      })}

      {error ? (
        <p className="stamp-in text-sm font-medium text-[var(--pink)]" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-ink-35">
        Toca cualquier día de la semana para marcarlo o quitarlo. La columna sombreada es hoy.
      </p>
    </div>
  );
}

export function MonthView({
  habits,
  todayIso,
}: {
  habits: HabitWithToday[];
  todayIso: string;
}) {
  const dias = monthGrid(todayIso);

  if (habits.length === 0) {
    return <p className="text-sm text-ink-60">Cuando tengas hábitos, aquí verás las últimas cinco semanas.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Dos columnas en cuanto hay sitio: con una sola, cuatro hábitos
          convertían la pantalla en un rollo interminable. */}
      <div className="grid gap-5 sm:grid-cols-2">
        {habits.map((h) => {
          const marcadas = new Set(h.history);
          const total = dias.filter((d) => marcadas.has(d) && d <= todayIso).length;
          return (
            <div key={h.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm">
                  <span aria-hidden="true">{h.emoji}</span> {h.name}
                </span>
                <span className="num shrink-0 text-xs text-ink-60">
                  {total} <span className="text-ink-35">días</span>
                </span>
              </div>

              <div style={{ maxWidth: 210 }}>
                <div
                  className="mb-1 grid gap-1"
                  style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
                  aria-hidden="true"
                >
                  {WEEKDAY_INITIALS.map((w) => (
                    <span key={w} className="num text-center text-[10px] text-ink-35">
                      {w}
                    </span>
                  ))}
                </div>
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", color: INK_VAR[h.ink] }}
                >
                  {dias.map((d) => (
                    <Cell
                      key={d}
                      on={marcadas.has(d)}
                      muted={d > todayIso}
                      title={`${h.name} · ${d}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-35">
        Cinco semanas completas, de lunes a domingo. Cada celda es un día.
      </p>
    </div>
  );
}
