import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "./AuthForm";
import CityVignette from "@/components/CityVignette";
import SetupNotice from "@/components/SetupNotice";
import { getUser, isConfigured } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  if (!isConfigured()) return <SetupNotice />;
  if (await getUser()) redirect("/hoy");

  const { siguiente } = await searchParams;
  const next = siguiente?.startsWith("/") ? siguiente : "/hoy";

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-5 py-10 md:grid-cols-2">
      <div className="hidden md:block">
        <Link href="/" className="display text-lg">
          Ciudad Común
        </Link>
        <h1 className="display mt-6 text-4xl">
          Tu grupo ya
          <br />
          está construyendo.
        </h1>
        <CityVignette className="mt-6 w-full" />
      </div>

      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="display mb-6 block text-lg md:hidden">
          Ciudad Común
        </Link>
        <AuthForm next={next} />
      </div>
    </main>
  );
}
