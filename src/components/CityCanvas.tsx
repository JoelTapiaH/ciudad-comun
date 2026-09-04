"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BuildingSprite, BuildingThumb } from "@/components/BuildingSprite";
import {
  GRID,
  INK_VAR,
  TILE_H,
  TILE_W,
  cityLevel,
  isoPoint,
  isoViewBox,
  repairCost,
} from "@/lib/game";
import type { Building, CityTile, Ink } from "@/lib/types";

type Props = {
  groupId: string;
  cityName: string;
  initialTiles: CityTile[];
  initialCoins: number;
  initialXp: number;
  buildings: Building[];
  builderNames: Record<string, string>;
  interactive?: boolean;
};

const key = (x: number, y: number) => `${x}:${y}`;

export default function CityCanvas({
  groupId,
  cityName,
  initialTiles,
  initialCoins,
  initialXp,
  buildings,
  builderNames,
  interactive = true,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [tiles, setTiles] = useState(initialTiles);
  const [coins, setCoins] = useState(initialCoins);
  const [xp, setXp] = useState(initialXp);
  const [selected, setSelected] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<CityTile | null>(null);
  const [printing, setPrinting] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "ok" } | null>(null);
  const [zoom, setZoom] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);

  // Canal propio por instancia: supabase-js reutiliza el canal si el nombre
  // ya existe, y .on() sobre un canal suscrito lanza excepción.
  const instanceId = useId().replace(/:/g, "");

  useEffect(() => setTiles(initialTiles), [initialTiles]);
  useEffect(() => setCoins(initialCoins), [initialCoins]);
  useEffect(() => setXp(initialXp), [initialXp]);

  const level = cityLevel(xp);
  // La defensa primero: es lo que decide si la ciudad sigue en pie mañana.
  const catalog = useMemo(() => {
    const orden = ["defensa", "vivienda", "verde", "comercio", "salud", "cultura"];
    return buildings
      .filter((b) => !b.reward_only)
      .sort(
        (a, b) =>
          orden.indexOf(a.category) - orden.indexOf(b.category) ||
          a.min_level - b.min_level ||
          a.cost - b.cost,
      );
  }, [buildings]);
  const byId = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);
  const occupied = useMemo(() => new Map(tiles.map((t) => [key(t.x, t.y), t])), [tiles]);
  const view = useMemo(() => isoViewBox(), []);

  const markPrinted = useCallback((k: string) => {
    setPrinting((prev) => new Set(prev).add(k));
    setTimeout(() => {
      setPrinting((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    }, 700);
  }, []);

  /* Tiempo real: lo que construye cualquiera del grupo aparece aquí. */
  useEffect(() => {
    const channel = supabase
      .channel(`ciudad:${groupId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "city_tiles", filter: `group_id=eq.${groupId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const tile = payload.new as CityTile;
            setTiles((prev) =>
              prev.some((t) => t.x === tile.x && t.y === tile.y) ? prev : [...prev, tile],
            );
            markPrinted(key(tile.x, tile.y));
          } else if (payload.eventType === "UPDATE") {
            const tile = payload.new as CityTile;
            setTiles((prev) =>
              prev.map((t) => (t.x === tile.x && t.y === tile.y ? tile : t)),
            );
          } else if (payload.eventType === "DELETE") {
            const gone = payload.old as CityTile;
            setTiles((prev) => prev.filter((t) => !(t.x === gone.x && t.y === gone.y)));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        (payload) => {
          const g = payload.new as { coins: number; xp: number };
          setCoins(g.coins);
          setXp(g.xp);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, groupId, instanceId, markPrinted]);

  /* Arranca centrado en la rejilla. */
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [zoom]);

  async function place(x: number, y: number) {
    if (!selected || busy) return;
    const building = byId.get(selected);
    if (!building) return;

    if (building.min_level > level) {
      setMessage({ text: `${building.name} se desbloquea en el nivel ${building.min_level}.`, tone: "error" });
      return;
    }
    if (building.cost > coins) {
      setMessage({ text: `Faltan ${building.cost - coins} monedas para ${building.name.toLowerCase()}.`, tone: "error" });
      return;
    }

    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc("place_building", {
      p_group: groupId,
      p_x: x,
      p_y: y,
      p_building: selected,
    });
    setBusy(false);

    if (error) {
      setMessage({ text: error.message, tone: "error" });
      return;
    }
    setCoins((c) => c - building.cost);
    setMessage({ text: `${building.name} en pie. −${building.cost} monedas.`, tone: "ok" });
    router.refresh();
  }

  async function repair(tile: CityTile) {
    const building = byId.get(tile.building_id);
    if (!building) return;
    const precio = repairCost(building.cost, tile.integrity);

    setBusy(true);
    const { error } = await supabase.rpc("repair_building", {
      p_group: groupId,
      p_x: tile.x,
      p_y: tile.y,
    });
    setBusy(false);

    if (error) {
      setMessage({ text: error.message, tone: "error" });
      return;
    }
    setTiles((prev) =>
      prev.map((t) => (t.x === tile.x && t.y === tile.y ? { ...t, integrity: 100 } : t)),
    );
    setInspecting(null);
    setCoins((c) => c - precio);
    setMessage({ text: `${building.name} en pie otra vez. −${precio} monedas.`, tone: "ok" });
    router.refresh();
  }

  async function demolish(tile: CityTile) {
    setBusy(true);
    const { error } = await supabase.rpc("demolish_building", {
      p_group: groupId,
      p_x: tile.x,
      p_y: tile.y,
    });
    setBusy(false);
    setInspecting(null);
    if (error) {
      setMessage({ text: error.message, tone: "error" });
      return;
    }
    setTiles((prev) => prev.filter((t) => !(t.x === tile.x && t.y === tile.y)));
    const refund = Math.floor(((byId.get(tile.building_id)?.cost ?? 0) * tile.integrity) / 200);
    setCoins((c) => c + refund);
    setMessage({ text: `Parcela despejada. Se devuelven ${refund} monedas.`, tone: "ok" });
    router.refresh();
  }

  function handleTile(x: number, y: number) {
    if (!interactive) return;
    const tile = occupied.get(key(x, y));
    if (tile) {
      setSelected(null);
      setInspecting(tile);
      return;
    }
    setInspecting(null);
    if (selected) void place(x, y);
    else setMessage({ text: "Elige antes qué quieres construir.", tone: "error" });
  }

  const cells = useMemo(() => {
    const list: { x: number; y: number; tile?: CityTile }[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) list.push({ x, y, tile: occupied.get(key(x, y)) });
    }
    return list.sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);
  }, [occupied]);

  const diamondPoints = `0,${-TILE_H / 2} ${TILE_W / 2},0 0,${TILE_H / 2} ${-TILE_W / 2},0`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Ciudad compartida</p>
          <h2 className="display text-2xl sm:text-3xl">{cityName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">
            <span aria-hidden="true">◎</span>
            <span className="num">{coins.toLocaleString("es-ES")}</span>
          </span>
          <span className="chip">Nv. {level}</span>
          <div className="flex overflow-hidden rounded-full border-2 border-[var(--ink)]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}
              className="px-2.5 py-1 text-sm font-semibold hover:bg-ink-12"
              aria-label="Alejar la vista"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.2).toFixed(1)))}
              className="border-l-2 border-[var(--ink)] px-2.5 py-1 text-sm font-semibold hover:bg-ink-12"
              aria-label="Acercar la vista"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="panel panel-raised overflow-auto"
        style={{ background: "var(--card)" }}
      >
        <svg
          viewBox={view.value}
          role="img"
          aria-label={`Plano isométrico de ${cityName} con ${tiles.length} construcciones`}
          style={{
            display: "block",
            // El plano ocupa todo el ancho disponible; al acercar, desborda y
            // el contenedor se convierte en un mapa que se arrastra.
            width: `${100 * zoom}%`,
            minWidth: 520 * zoom,
            height: "auto",
            margin: "0 auto",
          }}
        >
          {cells.map(({ x, y, tile }) => {
            const { sx, sy } = isoPoint(x, y);
            const k = key(x, y);
            const building = tile ? byId.get(tile.building_id) : undefined;
            const ink = building ? INK_VAR[building.ink as Ink] : "var(--blue)";
            const buildable = interactive && !!selected && !tile;
            const isPrinting = printing.has(k);

            return (
              <g
                key={k}
                transform={`translate(${sx} ${sy})`}
                onClick={() => handleTile(x, y)}
                style={{ cursor: interactive ? (tile ? "pointer" : selected ? "copy" : "default") : "default" }}
              >
                {tile ? (
                  <polygon points={diamondPoints} fill="var(--ink)" fillOpacity={0.07} />
                ) : (
                  <polygon
                    points={diamondPoints}
                    fill={buildable ? "var(--pink)" : "transparent"}
                    fillOpacity={buildable ? 0.16 : 0}
                    stroke="var(--ink)"
                    strokeOpacity={buildable ? 0.75 : 0.3}
                    strokeWidth={buildable ? 1.6 : 1}
                    strokeDasharray={buildable ? undefined : "3 4"}
                  />
                )}

                {tile && building ? (
                  <>
                    {isPrinting ? (
                      <g className="ink-plate tile-print-ghost" style={{ pointerEvents: "none" }}>
                        <BuildingSprite id={tile.building_id} ink="var(--blue)" integrity={tile.integrity} />
                      </g>
                    ) : null}
                    <g className={`ink-plate${isPrinting ? " tile-print" : ""}`}>
                      <BuildingSprite id={tile.building_id} ink={ink} integrity={tile.integrity} />
                    </g>
                  </>
                ) : null}

                {inspecting && inspecting.x === x && inspecting.y === y ? (
                  <polygon
                    points={diamondPoints}
                    fill="none"
                    stroke="var(--pink)"
                    strokeWidth={2.5}
                    style={{ pointerEvents: "none" }}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      {message ? (
        <p
          className={`stamp-in text-sm font-medium ${message.tone === "error" ? "text-[var(--pink)]" : "text-[var(--green)]"}`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      {inspecting ? (
        <div className="panel stamp-in flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <BuildingThumb
              id={inspecting.building_id}
              ink={INK_VAR[(byId.get(inspecting.building_id)?.ink ?? "blue") as Ink]}
              size={34}
              integrity={inspecting.integrity}
            />
            <div>
              <p className="display text-lg">
                {byId.get(inspecting.building_id)?.name}
                {inspecting.integrity <= 0 ? <span className="text-[var(--pink)]"> en ruinas</span> : null}
              </p>
              <p className="num text-xs text-ink-60">
                Parcela {inspecting.x}·{inspecting.y}
                {inspecting.integrity < 100 ? ` · ${inspecting.integrity}% en pie` : ""}
                {(byId.get(inspecting.building_id)?.defense ?? 0) > 0
                  ? ` · defensa ${Math.floor(((byId.get(inspecting.building_id)?.defense ?? 0) * inspecting.integrity) / 100)}`
                  : ""}
                {inspecting.placed_by && builderNames[inspecting.placed_by]
                  ? ` · lo levantó ${builderNames[inspecting.placed_by]}`
                  : ""}
              </p>
            </div>
          </div>
          {interactive ? (
            <div className="flex gap-2">
              <button type="button" className="btn btn-sm btn-quiet" onClick={() => setInspecting(null)}>
                Cerrar
              </button>
              {inspecting.integrity < 100 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={busy}
                  onClick={() => repair(inspecting)}
                >
                  Reparar ◎{" "}
                  {repairCost(byId.get(inspecting.building_id)?.cost ?? 0, inspecting.integrity)}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy}
                onClick={() => demolish(inspecting)}
              >
                Derribar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {interactive ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="eyebrow">Qué construir</p>
            {selected ? (
              <button type="button" className="btn btn-sm btn-quiet" onClick={() => setSelected(null)}>
                Cancelar
              </button>
            ) : (
              <p className="text-xs text-ink-60">Elige un edificio y toca una parcela libre.</p>
            )}
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-2">
            {catalog.map((b, i) => {
              const primeraCivil = b.category !== "defensa" && catalog[i - 1]?.category === "defensa";
              const locked = b.min_level > level;
              const tooPricey = b.cost > coins;
              const active = selected === b.id;
              return (
                <li key={b.id} className="flex shrink-0 items-stretch gap-2">
                  {primeraCivil ? (
                    <span
                      aria-hidden="true"
                      className="my-2 w-0.5 shrink-0"
                      style={{ background: "var(--ink-12)" }}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelected(active ? null : b.id)}
                    disabled={locked}
                    aria-pressed={active}
                    className="panel flex w-[104px] flex-col items-center gap-1 px-2 pb-2 pt-3 text-center transition-transform disabled:opacity-45"
                    style={{
                      boxShadow: active ? "4px 4px 0 var(--pink)" : "3px 3px 0 var(--ink)",
                      transform: active ? "translate(-1px,-1px)" : undefined,
                    }}
                  >
                    <BuildingThumb id={b.id} ink={INK_VAR[b.ink as Ink]} size={40} />
                    <span className="text-xs font-semibold leading-tight">{b.name}</span>
                    <span
                      className={`num text-[11px] ${locked ? "text-ink-60" : tooPricey ? "text-[var(--pink)]" : "text-ink-60"}`}
                    >
                      {locked ? `Nv. ${b.min_level}` : `◎ ${b.cost}`}
                    </span>
                    {b.defense > 0 ? (
                      <span className="num text-[11px] text-[var(--green)]">⛊ {b.defense}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
