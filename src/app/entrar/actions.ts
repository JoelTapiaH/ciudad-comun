"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/hoy";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Escribe tu correo y tu contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Ese correo y esa contraseña no coinciden."
          : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatar = String(formData.get("avatar_emoji") ?? "🙂").trim() || "🙂";

  if (!displayName) return { error: "Pon el nombre con el que te verá tu grupo." };
  if (!email) return { error: "Necesitamos un correo para crear tu cuenta." };
  if (password.length < 8) return { error: "La contraseña necesita al menos 8 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, avatar_emoji: avatar } },
  });

  if (error) {
    return {
      error:
        error.message.includes("already registered")
          ? "Ese correo ya tiene cuenta. Entra con tu contraseña."
          : error.message,
    };
  }

  if (!data.session) {
    return { notice: "Te hemos enviado un correo para confirmar la cuenta. Ábrelo y vuelve aquí." };
  }

  revalidatePath("/", "layout");
  redirect("/empezar");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}
