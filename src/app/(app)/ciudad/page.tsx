import { redirect } from "next/navigation";
import CityCanvas from "@/components/CityCanvas";
import KeepCard from "@/components/KeepCard";
import RaidChronicle from "@/components/RaidChronicle";
import ThreatPanel from "@/components/ThreatPanel";
import {
  getBuildings,
  getCityTiles,
  getRaids,
  getTodayPulse,
  getWeekMarks,
  getWorkspace,
} from "@/lib/data";
import { GRID, cityDefense, cityLevel, xpForLevel } from "@/lib/game";

export default async function CiudadPage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/empezar");

  const { group, members } = workspace;
  const [tiles, buildings, raids, weekMarks, pulse] = await Promise.all([
    getCityTiles(group.id),
    getBuildings(),
    getRaids(group.id),
    getWeekMarks(group.id),
    getTodayPulse(group.id),
  ]);

  const builderNames = Object.fromEntries(members.map((m) => [m.id, m.display_name]));
  const level = cityLevel(group.xp);
  const nextUnlock = buildings.find((b) => !b.reward_only && b.min_level === level + 1);
  const defense = cityDefense(tiles, new Map(buildings.map((b) => [b.id, b])), weekMarks);
  const keep = tiles.find((t) => t.building_id === "keep") ?? null;
  const keepCost = buildings.find((b) => b.id === "keep")?.cost ?? 0;
  const ruins = tiles.filter((t) => t.integrity <= 0).length;
  const damaged = tiles.filter((t) => t.integrity > 0 && t.integrity < 100).length;

  return (
    <div className="flex flex-col gap-6">
      <CityCanvas
        groupId={group.id}
        cityName={group.city_name}
        initialTiles={tiles}
        initialCoins={group.coins}
        initialXp={group.xp}
        buildings={buildings}
        builderNames={builderNames}
      />

      <KeepCard integrity={keep ? keep.integrity : null} threat={group.threat} keepCost={keepCost} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ThreatPanel
          threat={group.threat}
          defense={defense}
          habits={pulse.habits}
          marks={pulse.marks}
        />

        <section>
          <p className="eyebrow mb-2">Crónica de asaltos</p>
          <RaidChronicle raids={raids} />
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="eyebrow mb-1">Parcelas</p>
          <p className="display text-2xl">
            {tiles.length}
            <span className="text-ink-35"> / {GRID * GRID}</span>
          </p>
          {ruins + damaged > 0 ? (
            <p className="num mt-1 text-xs text-[var(--pink)]">
              {ruins > 0 ? `${ruins} en ruinas` : null}
              {ruins > 0 && damaged > 0 ? " · " : null}
              {damaged > 0 ? `${damaged} dañadas` : null}
            </p>
          ) : null}
        </div>
        <div className="panel p-4">
          <p className="eyebrow mb-1">Siguiente nivel</p>
          <p className="display text-2xl">
            {Math.max(0, xpForLevel(level + 1) - group.xp)} <span className="text-ink-35">XP</span>
          </p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow mb-1">Se desbloquea</p>
          <p className="display text-2xl">{nextUnlock ? nextUnlock.name : "Todo construible"}</p>
        </div>
      </div>

      <p className="text-sm text-ink-60">
        Solo las construcciones defensivas (⛊) suman a la defensa, junto con las marcas de la última
        semana, que pesan lo mismo que la piedra. Y se desgastan: pierden 4 de integridad al día, y
        8 más cada vez que rechazan un asalto. Mantenerlas exige volver, no comprarlas una vez.
        Reparar cuesta la mitad de lo destrozado; de unas ruinas no se recupera nada. El Alcázar no
        se compra ni se derriba.
      </p>
    </div>
  );
}
