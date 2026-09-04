"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nameSuitor } from "@/app/(app)/ciudad/actions";
import { REINO, pretendientes } from "@/lib/story";

/* La corte: quién vive dentro y quién defiende la muralla. Los dos príncipes
   llegaron a pedir la mano de las princesas y se quedaron a pelear; sus
   nombres se ganan con puntos y con hábitos. */

export default function Court({
  groupId,
  xp,
  activeHabits,
  suitorNames,
}: {
  groupId: string;
  xp: number;
  activeHabits: number;
  suitorNames: [string | null, string | null];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<1 | 2 | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const lista = pretendientes(xp, activeHabits, suitorNames);

  function guardar(slot: 1 | 2) {
    setError(null);
    startTransition(async () => {
      const result = await nameSuitor(groupId, slot, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(null);
      setDraft("");
      router.refresh();
    });
  }

  return (
    <section className="panel p-4">
      <p className="eyebrow mb-3">La corte</p>

      <ul className="mb-4 flex flex-col gap-1.5 border-b-2 border-[var(--ink-12)] pb-4">
        <li className="text-sm">
          <span className="font-semibold">{REINO.rey}</span>
          <span className="text-ink-60"> y </span>
          <span className="font-semibold">{REINO.reina}</span>
          <span className="text-ink-60">, con {REINO.hijos[0]} y {REINO.hijos[1]}</span>
        </li>
        <li className="text-sm text-ink-60">
          <span className="font-semibold text-ink">{REINO.companero}</span> sale a pelear con el rey
        </li>
        <li className="text-sm text-ink-60">
          Las princesas <span className="font-semibold text-ink">{REINO.princesas[0]}</span> y{" "}
          <span className="font-semibold text-ink">{REINO.princesas[1]}</span>
        </li>
      </ul>

      <p className="eyebrow mb-2">Los pretendientes</p>
      <ul className="flex flex-col gap-3">
        {lista.map((p) => (
          <li key={p.slot}>
            {p.nombre ? (
              <p className="text-sm">
                <span className="font-semibold">{p.nombre}</span>
                <span className="text-ink-60">, que vino por {p.princesa} y se quedó en la muralla</span>
              </p>
            ) : p.desbloqueado ? (
              editing === p.slot ? (
                <div className="stamp-in flex flex-col gap-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="eyebrow">Quien pidió la mano de {p.princesa}</span>
                    <input
                      className="field"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={30}
                      autoFocus
                      placeholder="Su nombre"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={pending || draft.trim().length === 0}
                      onClick={() => guardar(p.slot)}
                    >
                      Darle nombre
                    </button>
                    <button type="button" className="btn btn-sm btn-quiet" onClick={() => setEditing(null)}>
                      Ahora no
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-semibold" style={{ color: "var(--green)" }}>
                      Se ha dado a conocer
                    </span>
                    <span className="text-ink-60"> · el pretendiente de {p.princesa}</span>
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setEditing(p.slot);
                      setDraft("");
                    }}
                  >
                    Ponerle nombre
                  </button>
                </div>
              )
            ) : (
              <div>
                <p className="text-sm text-ink-60">
                  El pretendiente de <span className="font-semibold text-ink">{p.princesa}</span> aún
                  no ha dicho su nombre.
                </p>
                <p className="num mt-1 text-xs text-ink-35">
                  {p.faltaXp > 0 ? `Faltan ${p.faltaXp} XP` : "XP suficiente"}
                  {" · "}
                  {p.faltanHabitos > 0
                    ? `${p.faltanHabitos} hábito${p.faltanHabitos === 1 ? "" : "s"} más`
                    : "hábitos suficientes"}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {error ? (
        <p className="stamp-in mt-3 text-sm font-medium text-[var(--pink)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
