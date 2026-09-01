"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { levelProgress } from "@/lib/game";

/* Monedas y nivel de la ciudad, en vivo: si alguien del grupo marca un hábito
   desde su móvil, el contador se mueve aquí sin recargar. */

export default function CityMeter({
  groupId,
  coins,
  xp,
  compact = false,
}: {
  groupId: string;
  coins: number;
  xp: number;
  compact?: boolean;
}) {
  const supabase = createClient();
  const [state, setState] = useState({ coins, xp });
  const [bumped, setBumped] = useState(false);
  const coinsRef = useRef(coins);

  // supabase-js reutiliza el canal si ya existe uno con el mismo nombre, y
  // llamar a .on() sobre un canal ya suscrito lanza una excepción. Esta
  // pantalla monta dos medidores a la vez (cabecera y columna), así que cada
  // instancia necesita su propio canal.
  const instanceId = useId().replace(/:/g, "");

  useEffect(() => {
    setState({ coins, xp });
    coinsRef.current = coins;
  }, [coins, xp]);

  useEffect(() => {
    const channel = supabase
      .channel(`recursos:${groupId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        (payload) => {
          const next = payload.new as { coins: number; xp: number };
          if (next.coins > coinsRef.current) {
            setBumped(true);
            setTimeout(() => setBumped(false), 900);
          }
          coinsRef.current = next.coins;
          setState({ coins: next.coins, xp: next.xp });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, groupId, instanceId]);

  const { level, into, span, ratio } = levelProgress(state.xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="chip" title="Monedas de la ciudad">
          <span aria-hidden="true">◎</span>
          <span className="num">{state.coins.toLocaleString("es-ES")}</span>
        </span>
        <span className="chip" title={`${into} de ${span} XP hacia el nivel ${level + 1}`}>
          Nv. {level}
        </span>
        {bumped ? (
          <span className="coin-rise num text-xs text-[var(--green)]" aria-hidden="true">
            ▲
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Nivel {level}</span>
        <span className="num text-xs text-ink-60">
          {into} / {span} XP
        </span>
      </div>
      <div className="meter">
        <span style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}
