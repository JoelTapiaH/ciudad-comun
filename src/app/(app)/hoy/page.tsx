import Link from "next/link";
import { redirect } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";
import CityMeter from "@/components/CityMeter";
import HabitBoard from "@/components/HabitBoard";
import KeepCard from "@/components/KeepCard";
import RaidAlert from "@/components/RaidAlert";
import {
  getBoard,
  getBuildings,
  getChallenges,
  getCityTiles,
  getFeed,
  getRaids,
  getWeekMarks,
  getWorkspace,
} from "@/lib/data";
import { cityDefense, formatLongDate, threatBand, today } from "@/lib/game";

export default async function HoyPage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/empezar");

  const { group, userId, newRaids } = workspace;
  const [board, feed, challenges, tiles, buildings, weekMarks, raids] = await Promise.all([
    getBoard(group.id, userId),
    getFeed(group.id, userId, 12),
    getChallenges(group.id),
    getCityTiles(group.id),
    getBuildings(),
    getWeekMarks(group.id),
    getRaids(group.id, 3),
  ]);

  const defense = cityDefense(tiles, new Map(buildings.map((b) => [b.id, b])), weekMarks);
  const band = threatBand(group.threat);
  const keep = tiles.find((t) => t.building_id === "keep") ?? null;
  const habitsTotal = board.mine.length + board.others.length;
  const marksToday =
    board.mine.filter((h) => h.doneToday).length + board.others.filter((h) => h.doneToday).length;

  const todayIso = today();
  const active = challenges.find((c) => !c.completed_at && c.ends_on >= todayIso);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
      <div>
        {newRaids > 0 ? <RaidAlert raids={raids.slice(0, newRaids)} /> : null}

        <p className="eyebrow mb-1 first-letter:uppercase">{formatLongDate(todayIso)}</p>
        <HabitBoard groupId={group.id} mine={board.mine} others={board.others} />
      </div>

      <aside className="flex flex-col gap-6">
        <KeepCard integrity={keep ? keep.integrity : null} threat={group.threat} compact />

        {band.key !== "calma" ? (
          <section className="panel p-4">
            <p className="eyebrow mb-1">Amenaza</p>
            <h3 className="display text-xl" style={{ color: band.ink }}>
              {band.label}
            </h3>
            <p className="num mt-2 text-xs text-ink-60">
              {group.threat} de amenaza · {defense} de defensa ·{" "}
              {habitsTotal - marksToday > 0
                ? `${habitsTotal - marksToday} marcas sin hacer hoy`
                : "hoy está cubierto"}
            </p>
            <Link href="/ciudad" className="btn btn-sm mt-3">
              Ver el asedio
            </Link>
          </section>
        ) : null}

        <section className="panel p-4">
          <p className="eyebrow mb-3">La ciudad</p>
          <CityMeter groupId={group.id} coins={group.coins} xp={group.xp} />
          <p className="mt-3 text-sm text-ink-60">
            {group.coins.toLocaleString("es-ES")} monedas en caja para construir.
          </p>
          <Link href="/ciudad" className="btn btn-sm mt-3">
            Ir al plano
          </Link>
        </section>

        {active ? (
          <section className="panel p-4">
            <p className="eyebrow mb-2">Reto en marcha</p>
            <h3 className="display text-xl">{active.title}</h3>
            <div className="meter mt-3">
              <span style={{ width: `${Math.min(100, Math.round((active.done / active.goal) * 100))}%` }} />
            </div>
            <p className="num mt-2 text-xs text-ink-60">
              {active.done} / {active.goal} marcas · termina el {active.ends_on.slice(8, 10)}/
              {active.ends_on.slice(5, 7)}
            </p>
            {active.done >= active.goal ? (
              <Link href="/retos" className="btn btn-sm btn-primary mt-3">
                Cobrar la recompensa
              </Link>
            ) : null}
          </section>
        ) : null}

        <section>
          <p className="eyebrow mb-2">Últimas marcas</p>
          <ActivityFeed entries={feed} />
        </section>
      </aside>
    </div>
  );
}
