"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/game";
import type { Ink } from "@/lib/types";

export type MarkResult = { error?: string; coins?: number; streak?: number };

export async function markHabit(habitId: string): Promise<MarkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { data, error } = await supabase
    .from("habit_logs")
    .insert({ habit_id: habitId, user_id: user.id, log_date: today() })
    .select("coins_awarded, streak")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ese hábito ya está marcado hoy." };
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { coins: data.coins_awarded, streak: data.streak };
}

export async function unmarkHabit(habitId: string): Promise<MarkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error } = await supabase
    .from("habit_logs")
    .delete()
    .eq("habit_id", habitId)
    .eq("user_id", user.id)
    .eq("log_date", today());

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function addHabit(formData: FormData): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "✅").trim() || "✅";
  const ink = String(formData.get("ink") ?? "blue") as Ink;
  const groupId = String(formData.get("group_id") ?? "");

  if (!name) return { error: "El hábito necesita un nombre." };
  if (name.length > 60) return { error: "Acorta el nombre a 60 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error } = await supabase
    .from("habits")
    .insert({ group_id: groupId, user_id: user.id, name, emoji, ink });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function archiveHabit(habitId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("habits").update({ archived: true }).eq("id", habitId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
