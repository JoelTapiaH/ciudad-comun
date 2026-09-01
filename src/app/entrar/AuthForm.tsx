"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "./actions";

const AVATARS = ["🦊", "🌿", "🐙", "🍊", "🛠️", "🎧", "🚲", "🌙", "🐝", "⛰️"];

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Un momento…" : label}
    </button>
  );
}

export default function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const empty: AuthState = {};
  const [inState, inAction] = useActionState(signIn, empty);
  const [upState, upAction] = useActionState(signUp, empty);

  const state = mode === "in" ? inState : upState;

  return (
    <div className="panel panel-raised p-5 sm:p-6">
      <div className="mb-5 flex gap-1 rounded-full border-2 border-[var(--ink)] p-1">
        {(
          [
            ["in", "Entrar"],
            ["up", "Crear cuenta"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className="flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
            style={
              mode === value
                ? { background: "var(--ink)", color: "var(--paper)" }
                : { color: "var(--ink)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "in" ? (
        <form action={inAction} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Correo</span>
            <input className="field" type="email" name="email" autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Contraseña</span>
            <input className="field" type="password" name="password" autoComplete="current-password" required />
          </label>
          <Submit label="Entrar" />
        </form>
      ) : (
        <form action={upAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Cómo te verá tu grupo</span>
            <input className="field" name="display_name" placeholder="Joel" required maxLength={40} />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="eyebrow">Tu marca</span>
            <input type="hidden" name="avatar_emoji" value={avatar} />
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  aria-pressed={avatar === emoji}
                  aria-label={`Elegir ${emoji}`}
                  className="h-9 w-9 rounded-[3px] border-2 text-lg leading-none transition-transform"
                  style={{
                    borderColor: "var(--ink)",
                    background: avatar === emoji ? "var(--yellow)" : "transparent",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Correo</span>
            <input className="field" type="email" name="email" autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Contraseña</span>
            <input
              className="field"
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <span className="text-xs text-ink-60">Mínimo 8 caracteres.</span>
          </label>
          <Submit label="Crear cuenta" />
        </form>
      )}

      {state.error ? (
        <p className="stamp-in mt-4 text-sm font-medium text-[var(--pink)]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="stamp-in mt-4 text-sm font-medium text-[var(--green)]" role="status">
          {state.notice}
        </p>
      ) : null}
    </div>
  );
}
