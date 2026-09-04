"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function nameSuitor(
  groupId: string,
  slot: 1 | 2,
  name: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_suitor_name", {
    p_group: groupId,
    p_slot: slot,
    p_name: name,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
