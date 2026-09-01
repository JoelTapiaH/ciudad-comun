"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BuildingThumb } from "@/components/BuildingSprite";
import { claimChallenge, createChallenge } from "@/app/(app)/retos/actions";
import { INK_VAR, daysBetween, today } from "@/lib/game";
import type { Building, Ink } from "@/lib/types";
import type { ChallengeWithProgress } from "@/lib/data";

type Props = {
  groupId: string;
  challenges: ChallengeWithProgress[];
  rewards: Building[];
  names: Record<string, string>;
};

export default function ChallengeList({ groupId, challenges, rewards, names }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const todayIso = today();
  const live = challenges.filter((c) => !c.completed_at && c.ends_on >= todayIso);
  const claimable = challenges.filter((c) => !c.completed_at && c.done >= c.goal);
  const past = challenges.filter(
    (c) => c.completed_at || (c.ends_on < todayIso && c.done < c.goal),
  );

  function claim(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await claimChallenge(id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">Retos del grupo</p>
          <h1 className="display text-3xl">
            {live.length > 0 ? `${live.length} en marcha` : "Sin retos abiertos"}
          </h1>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setComposing((c) => !c)}>
          {composing ? "Cerrar" : "Proponer reto"}
        </button>
      </div>

      {composing ? (
        <NewChallenge groupId={groupId} rewards={rewards} onDone={() => setComposing(false)} />
      ) : null}

      {error ? (
        <p className="stamp-in text-sm font-medium text-[var(--pink)]" role="alert">
          {error}
        </p>
      ) : null}

      {live.length === 0 && !composing ? (
        <div className="panel p-5">
          <p className="text-sm text-ink-60">
            Un reto pone una meta común con fecha: &laquo;100 marcas antes del domingo&raquo;. Al
            cumplirla entra un pellizco de monedas y, si lo elegís, un edificio que no está a la
            venta.
          </p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => setComposing(true)}>
            Proponer el primero
          </button>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {live.map((c) => {
          const ratio = Math.min(1, c.done / c.goal);
          const left = daysBetween(todayIso, c.ends_on);
          const ready = claimable.some((x) => x.id === c.id);
          return (
            <li key={c.id} className="panel panel-raised p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="display text-xl">{c.title}</h2>
                  <p className="num text-xs text-ink-60">
                    {left <= 0 ? "Último día" : `Quedan ${left} día${left === 1 ? "" : "s"}`} · premio ◎{" "}
                    {c.reward_coins}
                    {c.reward_building_id ? ` + ${labelOf(rewards, c.reward_building_id)}` : ""}
                  </p>
                </div>
                {c.reward_building_id ? (
                  <BuildingThumb
                    id={c.reward_building_id}
                    ink={INK_VAR[(inkOf(rewards, c.reward_building_id) ?? "yellow") as Ink]}
                    size={34}
                  />
                ) : null}
              </div>

              <div className="meter mt-3">
                <span
                  style={{
                    width: `${Math.round(ratio * 100)}%`,
                    background: ready ? "var(--green)" : "var(--pink)",
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="num text-sm">
                  {c.done} <span className="text-ink-35">/ {c.goal} marcas</span>
                </p>
                {ready ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={pending}
                    onClick={() => claim(c.id)}
                  >
                    Cobrar recompensa
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {past.length > 0 ? (
        <div>
          <p className="eyebrow mb-2">Cerrados</p>
          <ul className="flex flex-col">
            {past.map((c) => (
              <li
                key={c.id}
                className="flex items-baseline gap-3 border-b border-[var(--ink-12)] py-2.5 last:border-0"
              >
                <span
                  aria-hidden="true"
                  className={c.completed_at ? "text-[var(--green)]" : "text-ink-35"}
                >
                  {c.completed_at ? "✓" : "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                <span className="num text-xs text-ink-60">
                  {c.done}/{c.goal}
                  {c.completed_by && names[c.completed_by] ? ` · cobró ${names[c.completed_by]}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function labelOf(rewards: Building[], id: string) {
  return rewards.find((b) => b.id === id)?.name ?? id;
}
function inkOf(rewards: Building[], id: string) {
  return rewards.find((b) => b.id === id)?.ink;
}

function NewChallenge({
  groupId,
  rewards,
  onDone,
}: {
  groupId: string;
  rewards: Building[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [days, setDays] = useState(7);
  const [goal, setGoal] = useState(60);
  const [reward, setReward] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="panel panel-raised stamp-in flex flex-col gap-4 p-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await createChallenge(formData);
          if (result.error) setError(result.error);
          else {
            router.refresh();
            onDone();
          }
        });
      }}
    >
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="days" value={days} />
      <input type="hidden" name="reward_building" value={reward} />

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Cómo se llama</span>
        <input className="field" name="title" placeholder="Semana sin excusas" maxLength={60} required autoFocus />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Marcas del grupo</span>
          <input
            className="field num"
            type="number"
            name="goal"
            min={5}
            max={2000}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            required
          />
          <span className="num text-xs text-ink-60">Premio: ◎ {goal * 8}</span>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Cuánto dura</span>
          <div className="flex gap-1.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className="num flex-1 rounded-[3px] border-2 py-2 text-sm font-semibold"
                style={{
                  borderColor: "var(--ink)",
                  background: days === d ? "var(--ink)" : "transparent",
                  color: days === d ? "var(--paper)" : "var(--ink)",
                }}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Edificio de premio</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setReward("")}
            aria-pressed={reward === ""}
            className="panel px-3 py-2 text-sm font-semibold"
            style={{ boxShadow: reward === "" ? "3px 3px 0 var(--pink)" : "none" }}
          >
            Solo monedas
          </button>
          {rewards.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setReward(b.id)}
              aria-pressed={reward === b.id}
              className="panel flex items-center gap-2 px-3 py-2 text-sm font-semibold"
              style={{ boxShadow: reward === b.id ? "3px 3px 0 var(--pink)" : "none" }}
            >
              <BuildingThumb id={b.id} ink={INK_VAR[b.ink as Ink]} size={22} />
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Publicando…" : "Publicar el reto"}
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
