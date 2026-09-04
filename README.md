# Ciudad Común

Registro de hábitos en grupo. Cada marca que hace cualquier miembro alimenta la
misma caja de monedas, y con esas monedas el grupo levanta **una sola ciudad**
sobre una cuadrícula isométrica.

Pero la ciudad no solo se construye: **hay que mantenerla en pie**. En el centro
está el Alcázar, donde viven el rey Joel y la reina Betsabell con Mateo y
Olivia. Joel sale a pelear con Víctor. En la corte están además las princesas
Merari y Daniela, y dos príncipes de otro reino que vinieron a pedir su mano y
se quedaron en la muralla: **sus nombres se desbloquean con XP y hábitos**.
Los días que quedan hábitos sin marcar suben la amenaza, y cuando llega a 60
entra un pueblo saqueador. Los golpes caen primero en lo que hayáis levantado
alrededor: **mientras quede una muralla en pie, nadie llega a la casa**. El
Alcázar no se compra ni se derriba, y es lo último que cae.

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

## Despliegue

El orden importa: Supabase te da las claves que necesita Vercel, y Vercel te da
el dominio que necesita Supabase.

### 1. Supabase

1. Crea el proyecto y ejecuta [`supabase/schema.sql`](supabase/schema.sql) en el
   SQL Editor.
2. En **Project Settings → API**, copia la *Project URL* y la clave *anon public*.

### 2. Vercel

1. Entra en [vercel.com/new](https://vercel.com/new) e importa
   `JoelTapiaH/ciudad-comun`. Vercel detecta Next.js solo; no hay que tocar los
   ajustes de compilación.
2. Antes de pulsar **Deploy**, despliega *Environment Variables* y añade:

   | Nombre | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | la *Project URL* del paso 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clave *anon public* del paso 1 |

   Déjalas marcadas para los tres entornos (Production, Preview y Development).
3. **Deploy**. Anota el dominio que te dé, por ejemplo `ciudad-comun.vercel.app`.

Si despliegas sin esas dos variables la compilación funciona igual, pero la app
enseña la pantalla de configuración en vez de la portada.

### 3. Volver a Supabase

En **Authentication → URL Configuration**, pon tu dominio de Vercel como
*Site URL* y añádelo también a *Redirect URLs*. Sin esto, los correos de
confirmación apuntarían a `localhost`.

Mientras pruebas puedes desactivar «Confirm email» en
**Authentication → Providers → Email** y entrar sin pasar por el correo.

A partir de aquí, cada `git push` a `main` vuelve a desplegar solo.

> La clave *anon* está pensada para ir en el navegador y es seguro que se vea:
> lo que protege los datos es el RLS del esquema, no el secreto de esa clave.
> La que **nunca** debe salir del panel de Supabase es la *service_role*.

---

## Cómo funciona el juego

### Construir

| Acción | Efecto |
| --- | --- |
| Marcar un hábito | 10 monedas + 2 por cada día de racha, con tope de 10 días (12–30 monedas) |
| Hábito diario | Se espera cada día. Racha en días consecutivos |
| Hábito semanal | Se elige cuántas veces por semana (1–6). Racha en semanas cumplidas |
| Nivel de ciudad | Umbral de nivel *n* = 75·n·(n−1) → Nv.2 a 150 XP, Nv.3 a 450, Nv.4 a 900 |
| Construir | Cuesta lo que marca el catálogo y exige el nivel mínimo del edificio |
| Derribar | Devuelve la mitad de lo que costó, en proporción a lo que quede en pie |
| Completar un reto | Paga monedas y, si se eligió, coloca un edificio de premio |

### Sobrevivir

| Situación | Efecto sobre la amenaza |
| --- | --- |
| Día con todos los hábitos **diarios** marcados | **−20** |
| Día con huecos | **+30 × (huecos / diarios)**. Subir cuesta más que bajar |
| Domingo con los **semanales** cumplidos | **−20** |
| Domingo con semanales a medias | **+30 × (lo que falta / objetivo total)** |
| Un reto vence sin cumplirse | **+60**: entran seguro |
| Amenaza ≥ 60 | Asalto. Después baja a 35 si se rechaza, a 25 si entran |

La **defensa** es 20 de base, más lo que aportan las construcciones defensivas
(a prorrata de su integridad), más **3 por cada marca de los últimos 7 días**.
Las murallas solas no bastan: una semana floja deja la guarnición sin gente
aunque la piedra siga en pie.

Y las defensas **se desgastan**: pierden 4 de integridad al día, y 8 más cada
vez que rechazan un asalto. Mantenerlas exige volver, no comprarlas una vez.
Sin reparaciones, una ciudad amurallada acaba cediendo. El Alcázar es la
excepción: no se desgasta solo.

Si el asalto entra, golpea una construcción por cada 25 puntos de daño (máximo
6), y cada golpe se lleva 50 de integridad. A 0 queda en ruinas: no defiende,
no se derriba con provecho, y hay que reconstruirla. **Reparar** cuesta la mitad
de lo destrozado.

### El arsenal

De 27 construcciones, 14 defienden. Las civiles dan monedas y XP, pero no
aguantan un asalto.

| | Coste | Nivel | Defensa |
| --- | --- | --- | --- |
| Empalizada | 60 | 1 | 15 |
| Foso | 85 | 1 | 22 |
| Muralla | 140 | 2 | 35 |
| Puerta fortificada | 170 | 2 | 42 |
| Torre de arqueros | 195 | 2 | 52 |
| Herrería | 210 | 2 | 30 |
| Torre de vigía | 240 | 3 | 68 |
| Armería | 275 | 3 | 78 |
| Cuartel | 320 | 3 | 92 |
| Ballesta | 360 | 4 | 108 |
| Catapulta | 430 | 4 | 130 |
| Alcázar | — | — | 15 |
| Monumento · Faro | solo por retos | | 45 · 60 |

Los hábitos semanales **solo se juzgan el domingo**, con la semana entera a la
vista: pedirles una marca diaria sería castigar por diseño lo que el propio
usuario marcó como semanal.

### La corte

Los dos pretendientes no tienen nombre hasta que el reino da la talla:

| | Hace falta |
| --- | --- |
| El pretendiente de Merari | 600 XP y 4 hábitos activos |
| El pretendiente de Daniela | 1500 XP y 6 hábitos activos |

Al llegar al umbral se desbloquea el derecho a nombrarlos, y el nombre se
escribe desde la pantalla de la ciudad. El umbral se comprueba en la base de
datos, no en el navegador.

La liquidación **no usa temporizador**: al abrir la app, `settle_city()` cierra
de golpe los días pendientes (hasta 60). Funciona igual si entras cada día que
si vuelves tras dos semanas, y no depende de `pg_cron` ni del plan de pago.

**Todas estas cuentas viven en la base de datos**, no en el navegador. Las
monedas se calculan en un trigger `BEFORE INSERT` que reescribe lo que mande el
cliente, y construir o cobrar un reto pasa por funciones `SECURITY DEFINER` que
validan saldo, nivel y pertenencia al grupo. Un usuario no puede regalarse
monedas desde la consola del navegador.

La seguridad a nivel de fila (RLS) está activa en todas las tablas: solo ves los
grupos a los que perteneces, y solo puedes marcar o borrar tus propios hábitos.

---

## Pruebas

El esquema tiene 93 comprobaciones automáticas —rachas, economía, construcción,
retos, asaltos, daños, desgaste, protección del Alcázar, reparación, hábitos
semanales, la corte y RLS— que se ejecutan contra un Postgres desechable:

### Probar los asaltos sin esperar

Con un solo proyecto de Supabase, local y producción comparten base de datos.
Para ver la mecánica de supervivencia sin esperar días hay dos ayudas en
[`supabase/utilidades/`](supabase/utilidades):

| Archivo | Para qué |
| --- | --- |
| `probar-asalto.sql` | Sube la amenaza y deja un día sin liquidar: al recargar la app entra un asalto |
| `restaurar-ciudad.sql` | Repara todo, pone la amenaza a cero y borra la crónica |

Se pegan en el SQL Editor de Supabase. Ojo: `restaurar-ciudad.sql` actúa sobre
todos los grupos de la base de datos.

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
    BuildingSprite.tsx    Catálogo de siluetas isométricas, con daños y ruinas
    CityCanvas.tsx        Cuadrícula interactiva con Realtime
    HabitBoard.tsx        Tablero con pestañas Hoy / Semana / Mes
    HabitHistory.tsx      Rejillas de la semana y de las últimas cinco
    Court.tsx             La corte y el desbloqueo de los pretendientes
    ThreatPanel.tsx       Estado del asedio: amenaza, defensa y pronóstico
    KeepCard.tsx          El Alcázar y quién vive dentro
    RaidAlert.tsx         Qué pasó mientras nadie miraba
    RaidChronicle.tsx     Historial de asaltos
  lib/
    game.ts               Reglas del juego (espejo de las de Postgres)
    story.ts              El reino, la corte y la voz de la crónica
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
