"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addHabit, archiveHabit, markHabit, unmarkHabit } from "@/app/(app)/hoy/actions";
import { MonthView, WeekView } from "@/components/HabitHistory";
import { INKS, INK_LABEL, INK_VAR, rewardFor, today, weeklyDone } from "@/lib/game";
import type { Frequency, HabitWithToday, Ink } from "@/lib/types";

const EMOJI = ["🏃", "📚", "💧", "🧘", "🛏️", "🥗", "✍️", "🎸", "🧹", "☎️", "🚭", "💪"];

type Props = {
  groupId: string;
  timeZone: string;
  mine: HabitWithToday[];
  others: HabitWithToday[];
};

export default function HabitBoard({ groupId, timeZone, mine, others }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<{ id: string; coins: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [vista, setVista] = useState<"hoy" | "semana" | "mes">("hoy");

  // Canal propio por instancia: supabase-js reutiliza el canal si el nombre
  // ya existe, y .on() sobre un canal suscrito lanza excepción.
  const instanceId = useId().replace(/:/g, "");
  const todayIso = today(timeZone);

  /* Cuando otro miembro marca algo, la página se refresca sola. */
  useEffect(() => {
    const channel = supabase
      .channel(`marcas:${groupId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs", filter: `group_id=eq.${groupId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, groupId, instanceId, router]);

  useEffect(() => setOptimistic({}), [mine, others]);

  function toggle(habit: HabitWithToday) {
    const done = optimistic[habit.id] ?? habit.doneToday;
    setOptimistic((prev) => ({ ...prev, [habit.id]: !done }));
    setError(null);

    startTransition(async () => {
      const result = done ? await unmarkHabit(habit.id) : await markHabit(habit.id);
      if (result.error) {
        setOptimistic((prev) => ({ ...prev, [habit.id]: done }));
        setError(result.error);
        return;
      }
      if (!done && result.coins) {
        setFlash({ id: habit.id, coins: result.coins });
        setTimeout(() => setFlash(null), 950);
      }
      router.refresh();
    });
  }

  /** Un semanal está cubierto cuando llega a su objetivo, no por marcarlo hoy. */
  function cubierto(h: HabitWithToday) {
    const hoy = optimistic[h.id] ?? h.doneToday;
    if (h.frequency === "daily") return hoy;
    const marcas = h.weekMarks + (hoy && !h.doneToday ? 1 : 0) - (!hoy && h.doneToday ? 1 : 0);
    return weeklyDone(marcas, h.weekly_target);
  }

  const doneCount = mine.filter(cubierto).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">Tus hábitos</p>
          <h2 className="display text-2xl">
            {mine.length === 0
              ? "Nada que marcar todavía"
              : doneCount === mine.length
                ? "Día completo"
                : `${doneCount} de ${mine.length} hecho${doneCount === 1 ? "" : "s"}`}
          </h2>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setAdding((a) => !a)}>
          {adding ? "Cerrar" : "Añadir hábito"}
        </button>
      </div>

      <div className="flex gap-1 rounded-full border-2 border-[var(--ink)] p-1">
        {(
          [
            ["hoy", "Hoy"],
            ["semana", "Semana"],
            ["mes", "Mes"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setVista(value)}
            aria-pressed={vista === value}
            className="flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
            style={
              vista === value
                ? { background: "var(--ink)", color: "var(--paper)" }
                : { color: "var(--ink)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {adding ? <NewHabit groupId={groupId} onDone={() => setAdding(false)} /> : null}

      {vista === "semana" ? (
        <WeekView habits={mine} timeZone={timeZone} todayIso={todayIso} />
      ) : null}
      {vista === "mes" ? <MonthView habits={mine} todayIso={todayIso} /> : null}

      {vista === "hoy" && mine.length === 0 && !adding ? (
        <div className="panel p-5">
          <p className="text-sm text-ink-60">
            Empieza por uno solo, el que sabes que puedes cumplir mañana. Cada marca son al menos 10
            monedas para la ciudad.
          </p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => setAdding(true)}>
            Crear el primero
          </button>
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {(vista === "hoy" ? mine : []).map((habit) => {
          const done = optimistic[habit.id] ?? habit.doneToday;
          const nextStreak = done ? habit.streak : habit.streak + 1;
          const reward = rewardFor(Math.max(nextStreak, 1));
          const semanal = habit.frequency === "weekly";
          const marcasSemana = habit.weekMarks + (done && !habit.doneToday ? 1 : 0) -
            (!done && habit.doneToday ? 1 : 0);
          const listo = cubierto(habit);

          return (
            <li key={habit.id} className="relative">
              <div
                className="panel flex items-center gap-3 p-3 transition-shadow"
                style={{
                  borderLeft: `8px solid ${INK_VAR[habit.ink]}`,
                  boxShadow: listo ? "3px 3px 0 var(--green)" : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(habit)}
                  disabled={pending}
                  aria-pressed={done}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] border-2 text-xl transition-transform active:translate-y-px"
                  style={{
                    borderColor: "var(--ink)",
                    background: done ? "var(--green)" : "transparent",
                  }}
                  aria-label={done ? `Desmarcar ${habit.name}` : `Marcar ${habit.name}`}
                >
                  {done ? "✓" : habit.emoji}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold" style={{ textDecoration: done ? "none" : undefined }}>
                    {habit.name}
                  </p>
                  <p className="num text-xs text-ink-60">
                    {semanal
                      ? `${marcasSemana} de ${habit.weekly_target} esta semana`
                      : habit.streak > 0
                        ? `Racha de ${habit.streak} día${habit.streak === 1 ? "" : "s"}`
                        : "Sin racha"}
                    {" · "}
                    {done ? "marcado hoy" : `vale ◎ ${reward.coins}`}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-quiet text-ink-60"
                  aria-label={`Retirar ${habit.name}`}
                  title="Retirar este hábito"
                  onClick={() => {
                    // Retirar borra el hábito de la lista de todo el grupo:
                    // merece una pregunta antes.
                    if (!confirm(`¿Retirar «${habit.name}»? Las marcas ya hechas se quedan.`)) return;
                    startTransition(async () => {
                      const result = await archiveHabit(habit.id);
                      if (result.error) setError(result.error);
                      else router.refresh();
                    });
                  }}
                >
                  ×
                </button>
              </div>

              {flash?.id === habit.id ? (
                <span
                  className="coin-rise num pointer-events-none absolute right-14 top-2 text-sm font-semibold text-[var(--green)]"
                  aria-hidden="true"
                >
                  +◎ {flash.coins}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="stamp-in text-sm font-medium text-[var(--pink)]" role="alert">
          {error}
        </p>
      ) : null}

      {vista === "hoy" && others.length > 0 ? (
        <div className="mt-2">
          <p className="eyebrow mb-2">El resto del grupo</p>
          <ul className="flex flex-col gap-1.5">
            {others.map((habit) => (
              <li
                key={habit.id}
                className="flex items-center gap-3 border-b border-[var(--ink-12)] px-1 py-2 last:border-0"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border-2 text-xs"
                  style={{
                    borderColor: "var(--ink)",
                    background: habit.doneToday ? "var(--green)" : "transparent",
                  }}
                  aria-hidden="true"
                >
                  {habit.doneToday ? "✓" : habit.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="text-ink-60">{habit.owner.display_name}</span> · {habit.name}
                </span>
                {habit.frequency === "weekly" ? (
                  <span className="num text-xs text-ink-60">
                    {habit.weekMarks}/{habit.weekly_target} sem.
                  </span>
                ) : habit.streak > 0 ? (
                  <span className="num text-xs text-ink-60">×{habit.streak}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function NewHabit({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const router = useRouter();
  const [emoji, setEmoji] = useState(EMOJI[0]);
  const [ink, setInk] = useState<Ink>("blue");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="panel panel-raised stamp-in flex flex-col gap-3 p-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await addHabit(formData);
          if (result.error) {
            setError(result.error);
            return;
          }
          router.refresh();
          onDone();
        });
      }}
    >
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="emoji" value={emoji} />
      <input type="hidden" name="ink" value={ink} />
      <input type="hidden" name="frequency" value={frequency} />
      <input type="hidden" name="weekly_target" value={weeklyTarget} />

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Qué vas a hacer cada día</span>
        <input className="field" name="name" placeholder="Correr 20 minutos" maxLength={60} required autoFocus />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Cada cuánto</span>
        <div className="flex gap-1.5">
          {(
            [
              ["daily", "Todos los días"],
              ["weekly", "Algunos días"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFrequency(value)}
              aria-pressed={frequency === value}
              className="flex-1 rounded-[3px] border-2 py-2 text-sm font-semibold"
              style={{
                borderColor: "var(--ink)",
                background: frequency === value ? "var(--ink)" : "transparent",
                color: frequency === value ? "var(--paper)" : "var(--ink)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {frequency === "weekly" ? (
          <div className="stamp-in mt-1 flex items-center gap-2">
            <span className="text-sm text-ink-60">Veces por semana</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeeklyTarget(n)}
                  aria-pressed={weeklyTarget === n}
                  className="num h-8 w-8 rounded-[3px] border-2 text-sm font-semibold"
                  style={{
                    borderColor: "var(--ink)",
                    background: weeklyTarget === n ? "var(--yellow)" : "transparent",
                    color: weeklyTarget === n ? "#16204a" : "var(--ink)",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-xs text-ink-60">
            Un día sin marcar sube la amenaza del reino.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Icono</span>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              aria-pressed={emoji === e}
              aria-label={`Usar ${e}`}
              className="h-9 w-9 rounded-[3px] border-2 text-lg leading-none"
              style={{ borderColor: "var(--ink)", background: emoji === e ? "var(--yellow)" : "transparent" }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Tinta</span>
        <div className="flex gap-1.5">
          {INKS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setInk(value)}
              aria-pressed={ink === value}
              aria-label={INK_LABEL[value]}
              className="h-9 w-9 rounded-[3px] border-2"
              style={{
                borderColor: "var(--ink)",
                background: INK_VAR[value],
                outline: ink === value ? "2px solid var(--ink)" : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Añadir"}
        </button>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          Cancelar
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-[var(--pink)]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
