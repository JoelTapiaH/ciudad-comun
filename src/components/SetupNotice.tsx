export default function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-5 py-16">
      <p className="eyebrow">Falta un paso</p>
      <h1 className="display text-4xl">Conecta la base de datos</h1>
      <p className="text-ink-60">
        La app necesita un proyecto de Supabase para guardar hábitos, ciudades y grupos. Se hace una
        sola vez y tarda unos minutos.
      </p>

      <ol className="panel flex list-none flex-col gap-4 p-5">
        {[
          ["Crea un proyecto gratuito en supabase.com y espera a que arranque.", null],
          ["Abre el SQL Editor, pega el contenido de supabase/schema.sql y pulsa Run.", "supabase/schema.sql"],
          ["Copia .env.local.example a .env.local y rellena la URL y la clave anon del proyecto.", ".env.local"],
          ["Reinicia el servidor con npm run dev.", "npm run dev"],
        ].map(([text, code], i) => (
          <li key={i} className="flex gap-3">
            <span className="num shrink-0 text-sm text-[var(--pink)]">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-sm">
              {text}
              {code ? (
                <>
                  {" "}
                  <code className="num rounded-[3px] bg-ink-12 px-1.5 py-0.5 text-xs">{code}</code>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-xs text-ink-60">
        En Supabase → Authentication → Providers → Email, desactiva &laquo;Confirm email&raquo; si
        quieres entrar sin pasar por el correo mientras pruebas.
      </p>
    </main>
  );
}
