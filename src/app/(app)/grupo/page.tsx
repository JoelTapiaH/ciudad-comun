import { redirect } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";
import CityMeter from "@/components/CityMeter";
import InviteCode from "@/components/InviteCode";
import TimeZoneCard from "@/components/TimeZoneCard";
import { getFeed, getWeekScores, getWorkspace } from "@/lib/data";

export default async function GrupoPage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/empezar");

  const { group, members, userId } = workspace;
  const [scores, feed] = await Promise.all([getWeekScores(group.id, group.timezone), getFeed(group.id, userId, 30)]);

  const ranked = members
    .map((m) => ({ ...m, ...(scores.get(m.id) ?? { marks: 0, coins: 0 }) }))
    .sort((a, b) => b.marks - a.marks || a.display_name.localeCompare(b.display_name, "es"));

  const totalWeek = ranked.reduce((sum, m) => sum + m.marks, 0);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Grupo</p>
        <h1 className="display text-3xl">{group.name}</h1>
        <p className="mt-1 text-ink-60">
          {members.length} {members.length === 1 ? "persona" : "personas"} levantando{" "}
          {group.city_name}.
        </p>
      </header>

      <section className="panel panel-raised flex flex-col gap-3 p-4">
        <p className="eyebrow">Invitar</p>
        <p className="text-sm text-ink-60">
          Quien tenga este código entra en la ciudad y sus marcas cuentan desde el primer día.
        </p>
        <InviteCode code={group.invite_code} />
      </section>

      <TimeZoneCard groupId={group.id} timezone={group.timezone} />

      <section className="panel p-4">
        <p className="eyebrow mb-3">Progreso de la ciudad</p>
        <CityMeter groupId={group.id} coins={group.coins} xp={group.xp} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="eyebrow">Últimos 7 días</p>
          <p className="num text-xs text-ink-60">{totalWeek} marcas en total</p>
        </div>
        <ul className="flex flex-col">
          {ranked.map((member, i) => {
            const share = totalWeek > 0 ? member.marks / totalWeek : 0;
            return (
              <li
                key={member.id}
                className="flex items-center gap-3 border-b border-[var(--ink-12)] py-3 last:border-0"
              >
                <span className="num w-6 shrink-0 text-sm text-ink-35">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="text-lg">
                  {member.avatar_emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {member.display_name}
                    {member.id === userId ? <span className="text-ink-35"> · tú</span> : null}
                    {member.role === "owner" ? <span className="text-ink-35"> · fundó</span> : null}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-12">
                    <span
                      className="block h-full"
                      style={{ width: `${Math.round(share * 100)}%`, background: "var(--blue)" }}
                    />
                  </div>
                </div>
                <span className="num shrink-0 text-sm">
                  {member.marks}
                  <span className="text-ink-35"> marcas</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <p className="eyebrow mb-2">Registro completo</p>
        <ActivityFeed entries={feed} timeZone={group.timezone} />
      </section>
    </div>
  );
}
