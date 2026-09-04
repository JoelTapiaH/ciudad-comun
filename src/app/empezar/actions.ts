"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StartState = { error?: string };

export async function createGroup(_prev: StartState, formData: FormData): Promise<StartState> {
  const name = String(formData.get("name") ?? "").trim();
  const cityName = String(formData.get("city_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC").trim() || "UTC";

  if (!name) return { error: "Ponle nombre al grupo." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group", {
    p_name: name,
    p_city_name: cityName || name,
    p_timezone: timezone,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/hoy");
}

export async function joinGroup(_prev: StartState, formData: FormData): Promise<StartState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (code.length !== 6) return { error: "El código tiene 6 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_group", { p_code: code });

  if (error) {
    return {
      error: error.message.includes("no existe")
        ? "Ese código no lleva a ningún grupo. Revísalo con quien te lo pasó."
        : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect("/hoy");
}
