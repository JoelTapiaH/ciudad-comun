import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { datesByHabit, shiftDate, streakFromLogs, today } from "@/lib/game";
import type {
  Building,
  Challenge,
  CityTile,
  FeedEntry,
  Group,
  Habit,
  HabitLog,
  HabitWithToday,
  Profile,
} from "@/lib/types";

export const isConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const getUser = cache(async () => {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type Workspace = {
  group: Group;
  members: (Profile & { role: string })[];
  userId: string;
};

/** Grupo activo del usuario: por ahora, el primero al que se unió. */
export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const [{ data: group }, { data: rows }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", membership.group_id).single(),
    supabase.from("group_members").select("user_id, role, joined_at").eq("group_id", membership.group_id),
  ]);

  if (!group) return null;

  const ids = (rows ?? []).map((r) => r.user_id);
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids.length ? ids : [user.id]);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const members = (rows ?? [])
    .map((r) => {
      const profile = byId.get(r.user_id);
      return profile ? { ...profile, role: r.role } : null;
    })
    .filter((m): m is Profile & { role: string } => m !== null)
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "es"));

  return { group: group as Group, members, userId: user.id };
});

export const getBuildings = cache(async (): Promise<Building[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("buildings").select("*").order("min_level").order("cost");
  return (data ?? []) as Building[];
});

export async function getCityTiles(groupId: string): Promise<CityTile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("city_tiles").select("*").eq("group_id", groupId);
  return (data ?? []) as CityTile[];
}

/** Los hábitos del grupo con la marca de hoy y la racha ya calculada. */
export async function getBoard(
  groupId: string,
  userId: string,
): Promise<{ mine: HabitWithToday[]; others: HabitWithToday[] }> {
  const supabase = await createClient();
  const since = shiftDate(today(), -90);

  const [{ data: habits }, { data: logs }, { data: profiles }] = await Promise.all([
    supabase.from("habits").select("*").eq("group_id", groupId).eq("archived", false).order("created_at"),
    supabase.from("habit_logs").select("id, habit_id, log_date").eq("group_id", groupId).gte("log_date", since),
    supabase.from("profiles").select("*"),
  ]);

  const dates = datesByHabit((logs ?? []) as Pick<HabitLog, "habit_id" | "log_date">[]);
  const todayIso = today();
  const logToday = new Map(
    ((logs ?? []) as { id: string; habit_id: string; log_date: string }[])
      .filter((l) => l.log_date === todayIso)
      .map((l) => [l.habit_id, l.id]),
  );
  const people = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));

  const enriched = ((habits ?? []) as Habit[]).map((habit) => ({
    ...habit,
    owner:
      people.get(habit.user_id) ??
      ({ id: habit.user_id, display_name: "Alguien", avatar_emoji: "🙂", created_at: "" } as Profile),
    doneToday: logToday.has(habit.id),
    logId: logToday.get(habit.id) ?? null,
    streak: streakFromLogs(dates.get(habit.id) ?? [], todayIso),
  }));

  return {
    mine: enriched.filter((h) => h.user_id === userId),
    others: enriched.filter((h) => h.user_id !== userId),
  };
}

export async function getFeed(groupId: string, userId: string, limit = 20): Promise<FeedEntry[]> {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("habit_logs")
    .select("id, habit_id, user_id, created_at, coins_awarded, streak")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!logs?.length) return [];

  const habitIds = [...new Set(logs.map((l) => l.habit_id))];
  const userIds = [...new Set(logs.map((l) => l.user_id))];

  const [{ data: habits }, { data: profiles }] = await Promise.all([
    supabase.from("habits").select("id, name, emoji").in("id", habitIds),
    supabase.from("profiles").select("*").in("id", userIds),
  ]);

  const habitById = new Map((habits ?? []).map((h) => [h.id, h]));
  const personById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));

  return logs.map((log) => {
    const habit = habitById.get(log.habit_id);
    const person = personById.get(log.user_id);
    return {
      id: log.id,
      created_at: log.created_at,
      coins_awarded: log.coins_awarded,
      streak: log.streak,
      habitName: habit?.name ?? "Un hábito",
      habitEmoji: habit?.emoji ?? "✅",
      personName: log.user_id === userId ? "Tú" : (person?.display_name ?? "Alguien"),
      personEmoji: person?.avatar_emoji ?? "🙂",
      isMe: log.user_id === userId,
    };
  });
}

export type ChallengeWithProgress = Challenge & { done: number };

export async function getChallenges(groupId: string): Promise<ChallengeWithProgress[]> {
  const supabase = await createClient();

  const [{ data: challenges }, { data: logs }] = await Promise.all([
    supabase.from("challenges").select("*").eq("group_id", groupId).order("ends_on", { ascending: false }),
    supabase.from("habit_logs").select("log_date").eq("group_id", groupId),
  ]);

  const dates = (logs ?? []).map((l) => l.log_date);

  return ((challenges ?? []) as Challenge[]).map((c) => ({
    ...c,
    done: dates.filter((d) => d >= c.starts_on && d <= c.ends_on).length,
  }));
}

/** Marcas por persona en los últimos 7 días, para la tabla del grupo. */
export async function getWeekScores(groupId: string) {
  const supabase = await createClient();
  const since = shiftDate(today(), -6);

  const { data } = await supabase
    .from("habit_logs")
    .select("user_id, coins_awarded")
    .eq("group_id", groupId)
    .gte("log_date", since);

  const tally = new Map<string, { marks: number; coins: number }>();
  for (const row of data ?? []) {
    const current = tally.get(row.user_id) ?? { marks: 0, coins: 0 };
    current.marks += 1;
    current.coins += row.coins_awarded;
    tally.set(row.user_id, current);
  }
  return tally;
}
