"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createGroup, joinGroup, type StartState } from "./actions";

function Submit({ label, variant = "primary" }: { label: string; variant?: "primary" | "blue" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant} w-full`} disabled={pending}>
      {pending ? "Un momento…" : label}
    </button>
  );
}

function Problem({ state }: { state: StartState }) {
  if (!state.error) return null;
  return (
    <p className="stamp-in text-sm font-medium text-[var(--pink)]" role="alert">
      {state.error}
    </p>
  );
}

export default function StartForms() {
  const empty: StartState = {};
  const [createState, createAction] = useActionState(createGroup, empty);
  const [joinState, joinAction] = useActionState(joinGroup, empty);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="panel panel-raised flex flex-col gap-3 p-5">
        <p className="eyebrow">Fundar</p>
        <h2 className="display text-2xl">Abre una ciudad nueva</h2>
        <p className="text-sm text-ink-60">
          Te llevas un código de invitación para repartir. Empiezas con 120 monedas y tres parcelas
          puestas.
        </p>
        <form action={createAction} className="mt-1 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Nombre del grupo</span>
            <input className="field" name="name" placeholder="Los del gimnasio" required maxLength={50} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Nombre de la ciudad</span>
            <input className="field" name="city_name" placeholder="Puerto Constancia" maxLength={50} />
          </label>
          <Submit label="Fundar la ciudad" />
          <Problem state={createState} />
        </form>
      </section>

      <section className="panel panel-raised flex flex-col gap-3 p-5">
        <p className="eyebrow">Unirse</p>
        <h2 className="display text-2xl">Ya me han invitado</h2>
        <p className="text-sm text-ink-60">
          Mete el código de 6 caracteres que te pasaron y caes directo en su ciudad.
        </p>
        <form action={joinAction} className="mt-1 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Código</span>
            <input
              className="field num text-center text-2xl tracking-[0.35em] uppercase"
              name="code"
              placeholder="ABC123"
              maxLength={6}
              autoCapitalize="characters"
              required
            />
          </label>
          <Submit label="Unirme al grupo" variant="blue" />
          <Problem state={joinState} />
        </form>
      </section>
    </div>
  );
}
