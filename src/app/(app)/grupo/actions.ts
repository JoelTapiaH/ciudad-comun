"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setTimezone(groupId: string, tz: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_group_timezone", { p_group: groupId, p_tz: tz });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
