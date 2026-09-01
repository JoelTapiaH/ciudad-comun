import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import CityMeter from "@/components/CityMeter";
import SetupNotice from "@/components/SetupNotice";
import { signOut } from "@/app/entrar/actions";
import { getUser, getWorkspace, isConfigured } from "@/lib/data";

// Todo lo que hay dentro depende de la sesión y de datos que cambian solos.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) return <SetupNotice />;

  const user = await getUser();
  if (!user) redirect("/entrar");

  const workspace = await getWorkspace();
  if (!workspace) redirect("/empezar");

  const { group, members, userId } = workspace;
  const me = members.find((m) => m.id === userId);

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <header className="border-b-2 border-[var(--ink)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-baseline gap-3">
            <Link href="/hoy" className="display text-lg leading-none">
              {group.city_name}
            </Link>
            <span className="eyebrow hidden sm:inline">{group.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <CityMeter groupId={group.id} coins={group.coins} xp={group.xp} compact />
            <form action={signOut}>
              <button
                type="submit"
                className="btn btn-sm btn-quiet"
                title={me ? `Sesión de ${me.display_name}` : undefined}
              >
                <span aria-hidden="true">{me?.avatar_emoji ?? "🙂"}</span>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Un solo elemento de navegación: tira horizontal en pantalla ancha,
          barra fija abajo en el móvil, donde vive el pulgar. */}
      <div className="mx-auto max-w-5xl sm:px-5 sm:pt-3">
        <AppNav />
      </div>

      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  );
}
