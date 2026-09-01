import { redirect } from "next/navigation";
import CityCanvas from "@/components/CityCanvas";
import { getBuildings, getCityTiles, getWorkspace } from "@/lib/data";
import { GRID, cityLevel, xpForLevel } from "@/lib/game";

export default async function CiudadPage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/empezar");

  const { group, members } = workspace;
  const [tiles, buildings] = await Promise.all([getCityTiles(group.id), getBuildings()]);

  const builderNames = Object.fromEntries(members.map((m) => [m.id, m.display_name]));
  const level = cityLevel(group.xp);
  const nextUnlock = buildings.find((b) => !b.reward_only && b.min_level === level + 1);

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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="eyebrow mb-1">Parcelas</p>
          <p className="display text-2xl">
            {tiles.length}
            <span className="text-ink-35"> / {GRID * GRID}</span>
          </p>
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
        Derribar devuelve la mitad de lo que costó el edificio. Los monumentos y el faro no se
        compran: salen de completar retos.
      </p>
    </div>
  );
}
