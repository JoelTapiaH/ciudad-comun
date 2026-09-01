"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { shiftDate, today } from "@/lib/game";

export async function createChallenge(formData: FormData): Promise<{ error?: string }> {
  const groupId = String(formData.get("group_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const goal = Number(formData.get("goal") ?? 0);
  const days = Number(formData.get("days") ?? 7);
  const rewardBuilding = String(formData.get("reward_building") ?? "");

  if (!title) return { error: "Ponle un nombre al reto." };
  if (!Number.isInteger(goal) || goal < 5 || goal > 2000) {
    return { error: "La meta va de 5 a 2000 marcas." };
  }
  if (![7, 14, 30].includes(days)) return { error: "Elige 7, 14 o 30 días." };

  const startsOn = today();
  const supabase = await createClient();

  const { error } = await supabase.from("challenges").insert({
    group_id: groupId,
    title,
    goal,
    starts_on: startsOn,
    ends_on: shiftDate(startsOn, days - 1),
    reward_coins: goal * 8,
    reward_building_id: rewardBuilding || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function claimChallenge(challengeId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_challenge", { p_challenge: challengeId });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
