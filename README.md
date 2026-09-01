# Ciudad Común

Registro de hábitos en grupo. Cada marca que hace cualquier miembro alimenta la
misma caja de monedas, y con esas monedas el grupo levanta **una sola ciudad**
sobre una cuadrícula isométrica. Los retos con fecha desbloquean edificios que
no están a la venta.

- **Web:** Next.js 16 (App Router) + React 19 + Tailwind v4
- **Datos y sesión:** Supabase (Postgres, Auth, Realtime, RLS)
- **Gráficos:** SVG generado en código. No hay ni un archivo de imagen.

---

## Puesta en marcha

### 1. Crear el proyecto de Supabase

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto gratuito.
2. Abre **SQL Editor**, pega el contenido completo de [`supabase/schema.sql`](supabase/schema.sql)
   y pulsa **Run**. El archivo es idempotente: puedes volver a ejecutarlo cuando
   quieras sin romper los datos.
3. En **Project Settings → API** copia la *Project URL* y la clave *anon public*.

Mientras pruebas, en **Authentication → Providers → Email** puedes desactivar
«Confirm email» para entrar sin pasar por el correo.

### 2. Configurar y arrancar

```bash
cp .env.local.example .env.local   # y pega ahí la URL y la clave anon
npm install
npm run dev
```

Abre <http://localhost:3000>. Crea una cuenta, funda un grupo y reparte el
código de invitación de 6 caracteres.

---

## Cómo funciona el juego

| Acción | Efecto |
| --- | --- |
| Marcar un hábito | 10 monedas + 2 por cada día de racha, con tope de 10 días (12–30 monedas) |
| Racha | Días consecutivos. Un hueco la reinicia |
| Nivel de ciudad | Umbral de nivel *n* = 75·n·(n−1) → Nv.2 a 150 XP, Nv.3 a 450, Nv.4 a 900 |
| Construir | Cuesta lo que marca el catálogo y exige el nivel mínimo del edificio |
| Derribar | Devuelve la mitad de lo que costó |
| Completar un reto | Paga monedas y, si se eligió, coloca un edificio de premio |

**Todas estas cuentas viven en la base de datos**, no en el navegador. Las
monedas se calculan en un trigger `BEFORE INSERT` que reescribe lo que mande el
cliente, y construir o cobrar un reto pasa por funciones `SECURITY DEFINER` que
validan saldo, nivel y pertenencia al grupo. Un usuario no puede regalarse
monedas desde la consola del navegador.

La seguridad a nivel de fila (RLS) está activa en todas las tablas: solo ves los
grupos a los que perteneces, y solo puedes marcar o borrar tus propios hábitos.

---

## Pruebas

El esquema tiene 57 comprobaciones automáticas —rachas, economía, construcción,
retos y RLS— que se ejecutan contra un Postgres desechable:

```bash
brew install postgresql@16
PGBIN=/opt/homebrew/opt/postgresql@16/bin ./supabase/pruebas/ejecutar.sh
```

El script monta un clúster temporal, simula el esquema `auth` de Supabase, carga
`schema.sql` y lo tira al terminar. No toca tu proyecto de Supabase.

```bash
npm run typecheck   # TypeScript
npm run build       # compilación de producción
```

---

## Mapa del código

```
src/
  app/
    page.tsx              Portada
    entrar/               Alta y acceso (Server Actions)
    empezar/              Fundar un grupo o unirse con código
    (app)/
      layout.tsx          Cabecera, navegación y guardia de sesión
      hoy/                Marcar hábitos del día + actividad del grupo
      ciudad/             El plano isométrico
      retos/              Retos con meta común
      grupo/              Invitación, reparto de la semana, registro
  components/
    BuildingSprite.tsx    Catálogo de siluetas isométricas en SVG
    CityCanvas.tsx        Cuadrícula interactiva con Realtime
    HabitBoard.tsx        Tablero del día con marcado optimista
  lib/
    game.ts               Reglas del juego (espejo de las de Postgres)
    data.ts               Consultas del servidor
    supabase/             Clientes de navegador, servidor y proxy
  proxy.ts                Refresco de sesión y redirección a /entrar
supabase/
  schema.sql              Tablas, triggers, funciones y RLS
  pruebas/                Batería de pruebas del esquema
```

---

## Diseño

La referencia es el **cartel serigrafiado**: tintas planas (rosa flúor, azul,
amarillo y verde), papel cálido con grano, línea clave oscura y bloques con la
sombra desplazada. Tipografía Bricolage Grotesque para los titulares,
Instrument Sans para el texto y DM Mono para todo lo que sea un dato.

El gesto que da nombre a la app: al construir, el edificio **entra en registro**
—una segunda plancha de tinta llega desplazada y se retira al encajar—, igual
que una impresión a dos pasadas.

Todo responde al tema claro y oscuro del sistema, respeta
`prefers-reduced-motion` y funciona con teclado.
