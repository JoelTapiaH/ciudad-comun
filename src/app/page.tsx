import Link from "next/link";
import { redirect } from "next/navigation";
import CityVignette from "@/components/CityVignette";
import SetupNotice from "@/components/SetupNotice";
import { getUser, isConfigured } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Landing() {
  if (!isConfigured()) return <SetupNotice />;
  if (await getUser()) redirect("/hoy");

  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:pt-16">
      <header className="mb-10 flex items-center justify-between">
        <span className="display text-lg">Ciudad Común</span>
        <Link href="/entrar" className="btn btn-sm">
          Entrar
        </Link>
      </header>

      <section className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="eyebrow mb-4">Hábitos en grupo</p>
          <h1 className="display text-[clamp(2.6rem,8vw,4.75rem)]">
            Cada hábito
            <br />
            <span className="text-[var(--pink)]">imprime</span> un edificio.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-60">
            Tú y tu gente marcáis lo que cumplís cada día. Esas marcas se convierten en monedas, y
            con las monedas levantáis una sola ciudad: la vuestra.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/entrar" className="btn btn-primary">
              Empezar una ciudad
            </Link>
            <Link href="/entrar" className="btn">
              Tengo un código
            </Link>
          </div>
        </div>

        <CityVignette className="w-full" />
      </section>

      <div className="rule my-12" />

      <section className="grid gap-6 sm:grid-cols-3">
        {[
          {
            title: "Marcas, no promesas",
            body: "Un toque al hábito y listo. La racha multiplica lo que ganáis: del día 1 al día 11 la recompensa pasa de 10 a 30 monedas.",
          },
          {
            title: "Una ciudad, no la tuya",
            body: "Todas las marcas caen en el mismo bote. El parque que planta tu hermana sale del día que tú saliste a correr.",
          },
          {
            title: "Retos con fecha",
            body: "«100 marcas antes del domingo» desbloquea un monumento que ninguna moneda compra.",
          },
        ].map((item) => (
          <article key={item.title}>
            <h2 className="display mb-2 text-xl">{item.title}</h2>
            <p className="text-sm text-ink-60">{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
