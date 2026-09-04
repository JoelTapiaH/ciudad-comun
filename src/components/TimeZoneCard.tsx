"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTimezone } from "@/app/(app)/grupo/actions";
import { browserTimeZone, formatClock } from "@/lib/game";

/* Dónde se corta el día del reino. Si esto está mal, las marcas de la noche
   caen en el día siguiente y las rachas se parten sin motivo. */

export default function TimeZoneCard({ groupId, timezone }: { groupId: string; timezone: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const [ahora, setAhora] = useState<string>("");

  // En el servidor no se conoce el dispositivo: se rellena al montar.
  useEffect(() => {
    setLocal(browserTimeZone());
    setAhora(new Date().toISOString());
  }, []);

  const distinta = local !== null && local !== timezone;

  function aplicar(tz: string) {
    setError(null);
    startTransition(async () => {
      const r = await setTimezone(groupId, tz);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <section className="panel p-4">
      <p className="eyebrow mb-2">Dónde empieza el día</p>
      <p className="text-sm">
        El reino cuenta los días en <span className="num font-semibold">{timezone}</span>.
        {ahora ? (
          <span className="text-ink-60">
            {" "}Ahí son las <span className="num">{formatClock(ahora, timezone)}</span>.
          </span>
        ) : null}
      </p>

      {distinta ? (
        <div className="mt-3">
          <p className="text-sm text-ink-60">
            Tu dispositivo está en <span className="num">{local}</span>. Si no coincide, lo que
            marques por la noche puede guardarse con la fecha de mañana.
          </p>
          <button
            type="button"
            className="btn btn-sm mt-2"
            disabled={pending}
            onClick={() => aplicar(local!)}
          >
            Usar {local}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-60">Coincide con tu dispositivo.</p>
      )}

      {error ? (
        <p className="stamp-in mt-2 text-sm font-medium text-[var(--pink)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
