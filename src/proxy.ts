import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/* Refresca la sesión en cada petición y manda a /entrar a quien no la tenga.
   En Next 16 esta convención se llama "proxy" (antes, "middleware"). */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
