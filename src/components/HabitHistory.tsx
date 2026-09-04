"use client";

import { WEEKDAY_INITIALS, INK_VAR, monthGrid, today, weekDays } from "@/lib/game";
import type { HabitWithToday } from "@/lib/types";

/* Cómo fue la semana y el mes. Una celda por día: llena si se marcó.
   La rejilla del mes se lee como un calendario, en columnas de semana. */

function Cell({ on, muted, title }: { on: boolean; muted?: boolean; title: string }) {
  return (
    <span
      title={title}
      className="block rounded-[2px] border"
      style={{
        width: "100%",
        aspectRatio: "1",
        borderColor: "var(--ink)",
        borderWidth: 1.5,
        background: on ? "currentColor" : "transparent",
        opacity: muted ? 0.3 : 1,
      }}
    />
  );
}

export function WeekView({ habits }: { habits: HabitWithToday[] }) {
  const dias = weekDays();
  const hoy = today();

  if (habits.length === 0) {
    return <p className="text-sm text-ink-60">Cuando tengas hábitos, aquí verás la semana entera.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr repeat(7, 22px) 44px" }}>
        <span />
        {dias.map((d, i) => (
          <span
            key={d}
            className="num text-center text-[11px]"
            style={{ color: d === hoy ? "var(--pink)" : "var(--ink-35)" }}
          >
            {WEEKDAY_INITIALS[i]}
          </span>
        ))}
        <span className="eyebrow text-right">Total</span>
      </div>

      {habits.map((h) => {
        const marcadas = new Set(h.history);
        const total = dias.filter((d) => marcadas.has(d)).length;
        const meta = h.frequency === "weekly" ? h.weekly_target : 7;
        return (
          <div
            key={h.id}
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: "1fr repeat(7, 22px) 44px", color: INK_VAR[h.ink] }}
          >
            <span className="truncate text-sm text-ink" title={h.name}>
              <span aria-hidden="true">{h.emoji}</span> {h.name}
            </span>
            {dias.map((d) => (
              <Cell key={d} on={marcadas.has(d)} muted={d > hoy} title={`${h.name} · ${d}`} />
            ))}
            <span
              className="num text-right text-xs"
              style={{ color: total >= meta ? "var(--green)" : "var(--ink-60)" }}
            >
              {total}/{meta}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MonthView({ habits }: { habits: HabitWithToday[] }) {
  const dias = monthGrid();
  const hoy = today();

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
          const total = dias.filter((d) => marcadas.has(d) && d <= hoy).length;
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
                    <Cell key={d} on={marcadas.has(d)} muted={d > hoy} title={`${h.name} · ${d}`} />
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
