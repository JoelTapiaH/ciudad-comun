import { redirect } from "next/navigation";
import StartForms from "./StartForms";
import { signOut } from "@/app/entrar/actions";
import { getUser, getWorkspace } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EmpezarPage() {
  const user = await getUser();
  if (!user) redirect("/entrar");
  if (await getWorkspace()) redirect("/hoy");

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Paso único</p>
          <h1 className="display text-4xl">Una ciudad se construye entre varios</h1>
          <p className="mt-3 max-w-lg text-ink-60">
            Funda un grupo o entra en el de alguien. Todo lo que marquéis alimenta el mismo plano.
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn btn-sm btn-quiet shrink-0">
            Salir
          </button>
        </form>
      </header>

      <StartForms />
    </main>
  );
}
