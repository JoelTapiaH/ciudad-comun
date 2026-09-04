import { TILE_H, TILE_W } from "@/lib/game";

/* --------------------------------------------------------------------------
   Cada edificio es una plancha de tinta plana: cara superior a tono lleno,
   cara derecha y cara izquierda mezcladas con la sombra. Las caras son
   opacas, así que la silueta se lee igual sobre papel claro que sobre fondo
   oscuro; el efecto de sobreimpresión lo pone el modo de fusión del grupo.
   Todo es SVG generado: no hay ni un solo archivo de imagen.
   -------------------------------------------------------------------------- */

const HW = TILE_W / 2; // media anchura del rombo
const HH = TILE_H / 2; // media altura del rombo

/** Mezcla la tinta con la sombra: para las caras que no dan al sol. */
const shade = (ink: string, amount: number) =>
  `color-mix(in srgb, ${ink} ${amount}%, var(--shade))`;

/** Mezcla la tinta con la superficie: para el suelo, que se tiñe pero no
    se oscurece. Usar shade() aquí dejaba parques y arboledas casi negros. */
const tint = (ink: string, amount: number) =>
  `color-mix(in srgb, ${ink} ${amount}%, var(--card))`;

const KEYLINE = "var(--keyline)";

function diamond(s: number, lift = 0) {
  return [
    [0, -HH * s - lift],
    [HW * s, -lift],
    [0, HH * s - lift],
    [-HW * s, -lift],
  ]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
}

function rightFace(s: number, h: number) {
  return [
    [0, HH * s],
    [HW * s, 0],
    [HW * s, -h],
    [0, HH * s - h],
  ]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
}

function leftFace(s: number, h: number) {
  return [
    [-HW * s, 0],
    [0, HH * s],
    [0, HH * s - h],
    [-HW * s, -h],
  ]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
}

type BoxProps = {
  s: number;
  h: number;
  lift?: number;
  ink: string;
  windows?: { cols: number; rows: number };
};

/** Prisma isométrico con hueco opcional para ventanas. */
function Box({ s, h, lift = 0, ink, windows }: BoxProps) {
  return (
    <g transform={lift ? `translate(0 ${-lift})` : undefined}>
      <polygon points={leftFace(s, h)} fill={shade(ink, 46)} />
      <polygon points={rightFace(s, h)} fill={shade(ink, 72)} />
      <polygon points={diamond(s, h)} fill={ink} />
      {windows ? <Windows s={s} h={h} count={windows} /> : null}
      <polygon points={diamond(s, h)} fill="none" stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
      <polygon points={rightFace(s, h)} fill="none" stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
      <polygon points={leftFace(s, h)} fill="none" stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
    </g>
  );
}

/** Ventanas como paralelogramos que siguen la inclinación de cada cara. */
function Windows({ s, h, count }: { s: number; h: number; count: { cols: number; rows: number } }) {
  const cells: React.ReactElement[] = [];
  const { cols, rows } = count;
  const wu = 0.62 / cols;
  const wv = (h - 8) / rows / 2.1;

  for (let r = 0; r < rows; r++) {
    const v = 7 + r * ((h - 8) / rows);
    if (v + wv > h - 2) continue;
    for (let c = 0; c < cols; c++) {
      const u = 0.19 + (c + 0.5) * (0.62 / cols) - wu / 2;

      // Cara derecha: recorre de (0, HH·s) hacia (HW·s, 0)
      const rx = u * HW * s;
      const ry = HH * s - u * HH * s - v;
      cells.push(
        <polygon
          key={`r${r}-${c}`}
          points={`${rx},${ry} ${rx + wu * HW * s},${ry - wu * HH * s} ${rx + wu * HW * s},${ry - wu * HH * s - wv} ${rx},${ry - wv}`}
          fill="var(--shade)"
          fillOpacity={0.55}
        />,
      );

      // Cara izquierda: recorre de (−HW·s, 0) hacia (0, HH·s)
      const lx = -HW * s + u * HW * s;
      const ly = u * HH * s - v;
      cells.push(
        <polygon
          key={`l${r}-${c}`}
          points={`${lx},${ly} ${lx + wu * HW * s},${ly + wu * HH * s} ${lx + wu * HW * s},${ly + wu * HH * s - wv} ${lx},${ly - wv}`}
          fill="var(--shade)"
          fillOpacity={0.32}
        />,
      );
    }
  }
  return <>{cells}</>;
}

/** Tejado a dos aguas orientado en la diagonal del rombo. */
function Gable({ s, base, peak, ink }: { s: number; base: number; peak: number; ink: string }) {
  const ridge = -base - peak;
  return (
    <g>
      <polygon
        points={`${-HW * s},${-base} 0,${-base - HH * s} 0,${ridge - HH * s * 0.15} ${-HW * s},${ridge}`}
        fill={shade(ink, 58)}
        stroke={KEYLINE}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <polygon
        points={`0,${-base - HH * s} ${HW * s},${-base} ${HW * s},${ridge} 0,${ridge - HH * s * 0.15}`}
        fill={shade(ink, 88)}
        stroke={KEYLINE}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Tree({ x, y, scale = 1, ink }: { x: number; y: number; scale?: number; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-1.6} y={-9} width={3.2} height={9} fill="var(--shade)" fillOpacity={0.6} />
      <polygon points="0,-26 7.5,-8 -7.5,-8" fill={ink} stroke={KEYLINE} strokeWidth={1} strokeLinejoin="round" />
      <polygon points="0,-20 6,-4 -6,-4" fill={shade(ink, 72)} stroke={KEYLINE} strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
}

/** Lo que queda cuando un asalto termina el trabajo: escombro y una viga. */
function Rubble({ ink }: { ink: string }) {
  return (
    <g>
      <polygon points={diamond(0.9)} fill={tint(ink, 22)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
      <polygon points="-16,2 -6,-4 2,1 -7,7" fill={shade(ink, 55)} stroke={KEYLINE} strokeWidth={1} strokeLinejoin="round" />
      <polygon points="1,5 11,-1 19,4 9,10" fill={shade(ink, 40)} stroke={KEYLINE} strokeWidth={1} strokeLinejoin="round" />
      <polygon points="-6,-6 3,-11 9,-7 0,-2" fill={shade(ink, 70)} stroke={KEYLINE} strokeWidth={1} strokeLinejoin="round" />
      <line x1={-12} y1={-8} x2={8} y2={-20} stroke={KEYLINE} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

/** Grietas y cascotes sobre un edificio que aguantó, pero a duras penas.
    El destrozo crece por número de grietas, no solo por opacidad: tres
    estados con la misma marca a distinta transparencia no se distinguían. */
function Damage({ severity }: { severity: number }) {
  const grietas = severity > 0.6 ? 3 : severity > 0.35 ? 2 : 1;
  const trazos = [
    "M-9 -4 l4 -10 l-3 -6 l5 -9",
    "M9 -2 l-4 -9 l5 -7 l-2 -8",
    "M-1 -16 l5 -8 l-4 -7",
  ].slice(0, grietas);

  return (
    <g style={{ pointerEvents: "none" }}>
      {trazos.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={KEYLINE}
          strokeWidth={1.5 + severity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {severity > 0.35
        ? [
            [-15, 5, 2.6],
            [14, 6, 2],
            [-4, 9, 1.6],
          ]
            .slice(0, grietas)
            .map(([cx, cy, r], i) => (
              <polygon
                key={`c${i}`}
                points={`${cx - r},${cy} ${cx},${cy - r * 0.6} ${cx + r},${cy} ${cx},${cy + r * 0.6}`}
                fill={KEYLINE}
                opacity={0.6}
              />
            ))
        : null}
    </g>
  );
}

/* --------------------------------------------------------------------------
   Catálogo de siluetas. La clave coincide con buildings.id en la base.
   -------------------------------------------------------------------------- */

export function BuildingSprite({
  id,
  ink,
  integrity = 100,
}: {
  id: string;
  ink: string;
  integrity?: number;
}) {
  if (integrity <= 0) return <Rubble ink={ink} />;

  return (
    <>
      <Silhouette id={id} ink={ink} />
      {integrity < 100 ? <Damage severity={1 - integrity / 100} /> : null}
    </>
  );
}

function Silhouette({ id, ink }: { id: string; ink: string }) {
  switch (id) {
    case "trees":
      return (
        <g>
          <polygon points={diamond(0.92)} fill={tint(ink, 34)} />
          <Tree x={-12} y={4} scale={0.85} ink={ink} />
          <Tree x={9} y={9} ink={ink} />
          <Tree x={2} y={-3} scale={0.7} ink={ink} />
        </g>
      );

    case "park":
      return (
        <g>
          <polygon points={diamond(0.94)} fill={tint(ink, 38)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <polygon points={diamond(0.44)} fill={tint(ink, 70)} />
          <Tree x={-14} y={2} scale={0.8} ink={ink} />
          <Tree x={14} y={2} scale={0.8} ink={ink} />
          <rect x={-4} y={-4} width={8} height={4} fill="var(--shade)" fillOpacity={0.5} />
        </g>
      );

    case "house":
      return (
        <g>
          <Box s={0.78} h={16} ink={ink} />
          <Gable s={0.78} base={16} peak={13} ink={ink} />
          <rect x={-3} y={-13} width={6} height={2.5} fill="var(--shade)" fillOpacity={0.5} />
        </g>
      );

    case "kiosk":
      return (
        <g>
          <Box s={0.6} h={13} ink={ink} />
          <polygon points={diamond(0.86, 15)} fill={shade(ink, 85)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <line x1={0} y1={-15} x2={0} y2={-24} stroke={KEYLINE} strokeWidth={1.6} />
          <circle cx={0} cy={-26} r={2.6} fill={ink} stroke={KEYLINE} strokeWidth={1} />
        </g>
      );

    // ---- El hogar --------------------------------------------------------
    case "keep":
      return (
        <g>
          <Box s={0.98} h={10} ink={ink} />
          {/* Dos torreones flanqueando el cuerpo central */}
          {[-1, 1].map((d) => (
            <g key={d} transform={`translate(${d * 20} ${d * 10 - 10})`}>
              <polygon
                points="-8,0 0,4 8,0 8,-30 0,-34 -8,-30"
                fill={shade(ink, d < 0 ? 58 : 86)}
                stroke={KEYLINE}
                strokeWidth={1.1}
                strokeLinejoin="round"
              />
              <polygon points="0,-48 10,-34 -10,-34" fill={shade(ink, 94)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
            </g>
          ))}
          <Box s={0.56} h={40} lift={10} ink={ink} windows={{ cols: 2, rows: 2 }} />
          <polygon points={diamond(0.66, 51)} fill={ink} stroke={KEYLINE} strokeWidth={1.2} strokeLinejoin="round" />
          <polygon points={`0,-84 ${HW * 0.5},-51 ${-HW * 0.5},-51`} fill={shade(ink, 92)} stroke={KEYLINE} strokeWidth={1.2} strokeLinejoin="round" />
          {/* El estandarte: mientras ondee, la familia sigue dentro */}
          <line x1={0} y1={-84} x2={0} y2={-100} stroke={KEYLINE} strokeWidth={1.8} />
          <polygon points="0,-100 18,-94 0,-88" fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          {/* Luz encendida en la ventana baja */}
          <rect x={-4} y={-24} width={8} height={7} fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1} />
        </g>
      );

    // ---- Defensa ---------------------------------------------------------
    case "ditch":
      return (
        <g>
          {/* Terreno, zanja excavada y agua: tres tonos para que se lea el
              hueco. Con un solo diamante oscuro desaparecía sobre fondo oscuro. */}
          <polygon points={diamond(1)} fill={tint(ink, 40)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <polygon points={diamond(0.82)} fill={shade(ink, 22)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <polygon points={diamond(0.66)} fill={tint(ink, 78)} stroke={KEYLINE} strokeWidth={1} strokeLinejoin="round" />
          <path d={`M${-HW * 0.4} -3 q ${HW * 0.2} 4 ${HW * 0.4} 0`} fill="none" stroke="var(--card)" strokeWidth={1.6} opacity={0.7} />
          {/* Isleta central: da profundidad al hueco */}
          <Box s={0.34} h={7} ink={ink} />
          {/* Estacas clavadas en el borde */}
          {[[-HW * 0.62, 0], [HW * 0.62, 0], [0, -HH * 0.62], [0, HH * 0.62]].map(([px, py], i) => (
            <polygon
              key={i}
              points={`${px - 3},${py} ${px + 3},${py} ${px},${py - 14}`}
              fill={shade(ink, 88)}
              stroke={KEYLINE}
              strokeWidth={1}
              strokeLinejoin="round"
            />
          ))}
        </g>
      );

    case "gate":
      return (
        <g>
          <Box s={0.94} h={8} ink={ink} />
          {[-1, 1].map((d) => (
            <g key={d} transform={`translate(${d * 22} ${d * 11 - 8})`}>
              <polygon points="-7,0 0,3.5 7,0 7,-32 0,-35.5 -7,-32" fill={shade(ink, d < 0 ? 55 : 88)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
              <polygon points="-8,-32 0,-28.5 8,-32 8,-40 0,-43.5 -8,-40" fill={ink} stroke={KEYLINE} strokeWidth={1} strokeLinejoin="round" />
            </g>
          ))}
          <polygon points="-14,-4 0,3 14,-4 14,-26 0,-33 -14,-26" fill={shade(ink, 72)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          {/* El arco: la puerta propiamente dicha */}
          <path d="M-7 -3 L-7 -17 Q0 -25 7 -17 L7 -10 L0 -6 Z" fill={KEYLINE} opacity={0.75} />
        </g>
      );

    case "archers":
      return (
        <g>
          <Box s={0.8} h={7} ink={ink} />
          <Box s={0.5} h={42} lift={7} ink={ink} />
          {/* Saeteras: las ranuras por donde se dispara */}
          {[16, 28, 40].map((y) => (
            <g key={y}>
              <rect x={3} y={-y} width={3} height={8} fill={KEYLINE} opacity={0.8} />
              <rect x={-6} y={-y + 3} width={3} height={8} fill={KEYLINE} opacity={0.55} />
            </g>
          ))}
          <polygon points={diamond(0.62, 49)} fill={ink} stroke={KEYLINE} strokeWidth={1.2} strokeLinejoin="round" />
          {[-1, 0, 1].map((i) => (
            <polygon
              key={i}
              points={`${i * 12 - 4},${-49 + i * 6} ${i * 12},${-47 + i * 6} ${i * 12 + 4},${-49 + i * 6} ${i * 12 + 4},${-58 + i * 6} ${i * 12},${-60 + i * 6} ${i * 12 - 4},${-58 + i * 6}`}
              fill={shade(ink, 92)}
              stroke={KEYLINE}
              strokeWidth={1}
              strokeLinejoin="round"
            />
          ))}
        </g>
      );

    case "forge":
      return (
        <g>
          <Box s={0.86} h={20} ink={ink} />
          <polygon points={diamond(0.9, 21)} fill={shade(ink, 80)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          {/* Chimenea y fragua encendida */}
          <polygon points="10,-21 18,-25 18,-48 10,-44" fill={shade(ink, 60)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <polygon points="18,-25 26,-21 26,-44 18,-48" fill={shade(ink, 88)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <ellipse cx={18} cy={-52} rx={7} ry={4} fill={KEYLINE} opacity={0.3} />
          <rect x={-10} y={-16} width={11} height={10} fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1.1} />
          <path d="M-16 -22 l5 -5 l-3 -5" fill="none" stroke={KEYLINE} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );

    case "armory":
      return (
        <g>
          <Box s={0.9} h={26} ink={ink} />
          <polygon points={diamond(0.94, 27)} fill={shade(ink, 82)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          {/* Escudo y espadas cruzadas sobre la fachada */}
          <g transform="translate(15 -16)">
            <path d="M0 -13 L9 -9 L9 0 Q9 7 0 11 Q-9 7 -9 0 L-9 -9 Z" fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1.2} strokeLinejoin="round" />
            <line x1={-6} y1={-6} x2={6} y2={6} stroke={KEYLINE} strokeWidth={1.6} />
            <line x1={6} y1={-6} x2={-6} y2={6} stroke={KEYLINE} strokeWidth={1.6} />
          </g>
          <rect x={-20} y={-20} width={9} height={13} fill={KEYLINE} opacity={0.6} />
        </g>
      );

    case "barracks":
      return (
        <g>
          <Box s={0.96} h={18} ink={ink} />
          <Gable s={0.96} base={18} peak={9} ink={ink} />
          {/* Fila de puertas: la tropa duerme aquí */}
          {[0.28, 0.5, 0.72].map((t) => (
            <rect
              key={t}
              x={t * HW * 0.9 - 3}
              y={HH * 0.9 - t * HH * 0.9 - 13}
              width={6}
              height={11}
              fill={KEYLINE}
              opacity={0.65}
            />
          ))}
          <line x1={-24} y1={-14} x2={-24} y2={-38} stroke={KEYLINE} strokeWidth={1.8} />
          <polygon points="-24,-38 -8,-33 -24,-28" fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
        </g>
      );

    case "ballista":
      return (
        <g>
          <Box s={0.86} h={9} ink={ink} />
          {/* Cureña apuntando por la diagonal, para que se vea el arma entera */}
          <polygon points="-20,-11 -14,-8 26,-30 20,-33" fill={shade(ink, 60)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <polygon points="-14,-16 -8,-13 -8,-6 -14,-9" fill={shade(ink, 40)} stroke={KEYLINE} strokeWidth={1} />
          {/* Los dos brazos del arco, abiertos y bien visibles */}
          <path d="M6 -46 Q16 -30 8 -14" fill="none" stroke={shade(ink, 96)} strokeWidth={4.5} strokeLinecap="round" />
          <path d="M34 -32 Q22 -26 8 -14" fill="none" stroke={shade(ink, 96)} strokeWidth={4.5} strokeLinecap="round" />
          {/* Cuerda tensada entre las puntas */}
          <line x1={6} y1={-46} x2={34} y2={-32} stroke={KEYLINE} strokeWidth={1.6} />
          {/* Virote montado, apuntando hacia fuera */}
          <line x1={2} y1={-24} x2={30} y2={-40} stroke={KEYLINE} strokeWidth={2.6} strokeLinecap="round" />
          <polygon points="38,-44 28,-44 31,-35" fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
        </g>
      );

    case "catapult":
      return (
        <g>
          <Box s={0.9} h={8} ink={ink} />
          <polygon points="-16,-8 0,-0 16,-8 16,-16 0,-24 -16,-16" fill={shade(ink, 68)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          {/* Brazo lanzador y contrapeso */}
          <line x1={-14} y1={-16} x2={20} y2={-56} stroke={shade(ink, 96)} strokeWidth={5} strokeLinecap="round" />
          <line x1={-14} y1={-16} x2={20} y2={-56} stroke={KEYLINE} strokeWidth={1.2} />
          <circle cx={23} cy={-59} r={7} fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1.2} />
          <rect x={-22} y={-26} width={12} height={12} rx={1} fill={shade(ink, 45)} stroke={KEYLINE} strokeWidth={1.1} />
          <line x1={-4} y1={-24} x2={-4} y2={-40} stroke={KEYLINE} strokeWidth={2} />
          <line x1={8} y1={-24} x2={8} y2={-40} stroke={KEYLINE} strokeWidth={2} />
          <line x1={-4} y1={-40} x2={8} y2={-40} stroke={KEYLINE} strokeWidth={2} />
        </g>
      );

    case "palisade":
      return (
        <g>
          <polygon points={diamond(0.96)} fill={tint(ink, 34)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const t = i / 5;
            const x = -HW * 0.9 + t * HW * 1.8;
            const y = -HH * 0.9 + t * HH * 1.8;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <polygon points="-4,0 4,0 4,-15 0,-20 -4,-15" fill={shade(ink, 82)} stroke={KEYLINE} strokeWidth={1} strokeLinejoin="round" />
              </g>
            );
          })}
          <line x1={-HW * 0.86} y1={-HH * 0.86 - 9} x2={HW * 0.86} y2={HH * 0.86 - 9} stroke={KEYLINE} strokeWidth={1.6} />
        </g>
      );

    case "wall": {
      const sc = 0.92;
      const alto = 24;
      // Almenas repartidas sobre las dos aristas visibles del remate. Sin
      // ellas el bloque se confundía con cualquier otro edificio.
      const merlon = (px: number, py: number, k: string) => (
        <g key={k} transform={`translate(${px} ${py})`}>
          <polygon
            points="-5,0 0,2.5 5,0 5,-9 0,-11.5 -5,-9"
            fill={ink}
            stroke={KEYLINE}
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </g>
      );
      const almenas = [0.22, 0.5, 0.78].flatMap((t) => [
        // arista inferior derecha: de (0, HH·s) hacia (HW·s, 0)
        merlon(t * HW * sc, HH * sc - t * HH * sc - alto, `r${t}`),
        // arista inferior izquierda: de (−HW·s, 0) hacia (0, HH·s)
        merlon(-HW * sc + t * HW * sc, t * HH * sc - alto, `l${t}`),
      ]);
      return (
        <g>
          <Box s={sc} h={alto} ink={ink} />
          {almenas}
        </g>
      );
    }

    case "watchtower":
      return (
        <g>
          <Box s={0.86} h={8} ink={ink} />
          <polygon
            points={`${-13},${-8} 13,${-8} 8,${-56} -8,${-56}`}
            fill={shade(ink, 84)}
            stroke={KEYLINE}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          {/* Plataforma del vigía, más ancha que el fuste */}
          <polygon points={diamond(0.66, 60)} fill={ink} stroke={KEYLINE} strokeWidth={1.2} strokeLinejoin="round" />
          <polygon
            points={`${-15},${-60} 15,${-60} 15,${-70} -15,${-70}`}
            fill={shade(ink, 62)}
            stroke={KEYLINE}
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
          <polygon points={`0,-88 17,-70 -17,-70`} fill={shade(ink, 94)} stroke={KEYLINE} strokeWidth={1.2} strokeLinejoin="round" />
          <circle cx={0} cy={-65} r={3} fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1} />
        </g>
      );

    case "cafe":
      return (
        <g>
          <Box s={0.74} h={22} ink={ink} windows={{ cols: 2, rows: 1 }} />
          <polygon points={diamond(0.96, 23)} fill={shade(ink, 80)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <polygon points={diamond(0.5, 30)} fill={shade(ink, 100)} stroke={KEYLINE} strokeWidth={1} />
        </g>
      );

    case "gym":
      return (
        <g>
          <Box s={0.9} h={24} ink={ink} windows={{ cols: 3, rows: 1 }} />
          <polygon
            points={`${-HW * 0.9},${-24} 0,${-24 - HH * 0.9} ${HW * 0.9},${-24} 0,${-24 + HH * 0.9}`}
            fill={shade(ink, 95)}
            stroke={KEYLINE}
            strokeWidth={1.1}
          />
          <rect x={-9} y={-33} width={18} height={3} rx={1.5} fill="var(--shade)" fillOpacity={0.65} />
          <circle cx={-11} cy={-31.5} r={4} fill={ink} stroke={KEYLINE} strokeWidth={1} />
          <circle cx={11} cy={-31.5} r={4} fill={ink} stroke={KEYLINE} strokeWidth={1} />
        </g>
      );

    case "library":
      return (
        <g>
          <Box s={0.94} h={6} ink={ink} />
          <Box s={0.78} h={26} lift={6} ink={ink} windows={{ cols: 3, rows: 2 }} />
          {[-16, -5, 6, 17].map((x) => (
            <rect key={x} x={x} y={-30} width={3.4} height={20} fill={shade(ink, 95)} stroke={KEYLINE} strokeWidth={0.9} />
          ))}
          <polygon points={`${-HW * 0.82},${-32} 0,${-32 - HH * 0.82} ${HW * 0.82},${-32} 0,${-32 + HH * 0.82}`} fill={ink} stroke={KEYLINE} strokeWidth={1.1} />
        </g>
      );

    case "fountain":
      return (
        <g>
          <polygon points={diamond(0.92)} fill={tint(ink, 36)} stroke={KEYLINE} strokeWidth={1.1} strokeLinejoin="round" />
          <Box s={0.56} h={7} ink={ink} />
          <polygon points={diamond(0.5, 7)} fill={shade(ink, 35)} />
          <line x1={0} y1={-7} x2={0} y2={-26} stroke={ink} strokeWidth={3} strokeLinecap="round" />
          <path d="M-11 -24 Q0 -36 11 -24" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={0} cy={-28} r={3.4} fill={ink} stroke={KEYLINE} strokeWidth={1} />
        </g>
      );

    case "block":
      return (
        <g>
          <Box s={0.86} h={46} ink={ink} windows={{ cols: 3, rows: 4 }} />
          <polygon points={diamond(0.9, 47)} fill={shade(ink, 90)} stroke={KEYLINE} strokeWidth={1.1} />
          <rect x={-2} y={-58} width={4} height={11} fill="var(--shade)" fillOpacity={0.6} />
        </g>
      );

    case "clinic":
      return (
        <g>
          <Box s={0.9} h={32} ink={ink} windows={{ cols: 3, rows: 2 }} />
          <g transform="translate(0 -44)">
            <rect x={-9} y={-3.5} width={18} height={7} fill={ink} stroke={KEYLINE} strokeWidth={1.1} />
            <rect x={-3.5} y={-9} width={7} height={18} fill={ink} stroke={KEYLINE} strokeWidth={1.1} />
          </g>
        </g>
      );

    case "theatre":
      return (
        <g>
          <Box s={0.92} h={34} ink={ink} windows={{ cols: 2, rows: 2 }} />
          <polygon points={diamond(1.02, 35)} fill={shade(ink, 80)} stroke={KEYLINE} strokeWidth={1.1} />
          <path d={`M${-HW * 0.72} -46 Q0 -62 ${HW * 0.72} -46 Z`} fill={shade(ink, 95)} stroke={KEYLINE} strokeWidth={1.2} />
          {[-14, -5, 4, 13].map((x) => (
            <circle key={x} cx={x} cy={-49} r={2} fill="var(--yellow)" stroke={KEYLINE} strokeWidth={0.8} />
          ))}
        </g>
      );

    case "tower":
      return (
        <g>
          <Box s={0.9} h={10} ink={ink} />
          <Box s={0.62} h={62} lift={10} ink={ink} windows={{ cols: 2, rows: 6 }} />
          <polygon points={diamond(0.72, 73)} fill={shade(ink, 95)} stroke={KEYLINE} strokeWidth={1.1} />
          <line x1={0} y1={-73} x2={0} y2={-92} stroke={KEYLINE} strokeWidth={1.8} />
          <circle cx={0} cy={-94} r={3} fill="var(--pink)" stroke={KEYLINE} strokeWidth={1} />
        </g>
      );

    case "stadium":
      return (
        <g>
          <ellipse cx={0} cy={0} rx={HW * 0.98} ry={HH * 0.98} fill={tint(ink, 38)} stroke={KEYLINE} strokeWidth={1.2} />
          <path
            d={`M${-HW * 0.98} 0 A${HW * 0.98} ${HH * 0.98} 0 0 0 ${HW * 0.98} 0 L${HW * 0.98} -22 A${HW * 0.98} ${HH * 0.98} 0 0 1 ${-HW * 0.98} -22 Z`}
            fill={shade(ink, 72)}
            stroke={KEYLINE}
            strokeWidth={1.2}
          />
          <ellipse cx={0} cy={-22} rx={HW * 0.98} ry={HH * 0.98} fill={shade(ink, 90)} stroke={KEYLINE} strokeWidth={1.2} />
          <ellipse cx={0} cy={-22} rx={HW * 0.58} ry={HH * 0.58} fill="var(--card)" stroke={KEYLINE} strokeWidth={1.1} />
          {[-1, 1].map((d) => (
            <line key={d} x1={d * HW * 0.9} y1={-24} x2={d * HW * 0.9} y2={-40} stroke={KEYLINE} strokeWidth={1.6} />
          ))}
          {[-1, 1].map((d) => (
            <circle key={`l${d}`} cx={d * HW * 0.9} cy={-42} r={3} fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1} />
          ))}
        </g>
      );

    case "monument":
      return (
        <g>
          <Box s={0.86} h={8} ink={ink} />
          <Box s={0.5} h={10} lift={8} ink={ink} />
          <polygon
            points={`${-7},${-18} 0,${-21} 7,${-18} 3,${-92} -3,${-92}`}
            fill={shade(ink, 90)}
            stroke={KEYLINE}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <polygon points={`0,-104 5,-92 -5,-92`} fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1.2} />
        </g>
      );

    case "lighthouse":
      return (
        <g>
          <polygon points={diamond(0.96)} fill={tint(ink, 34)} />
          <Box s={0.68} h={9} ink={ink} />
          <polygon
            points={`${-13},${-9} 13,${-9} 7,${-66} -7,${-66}`}
            fill={shade(ink, 85)}
            stroke={KEYLINE}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          {[-20, -38, -56].map((y) => (
            <rect key={y} x={-12} y={y} width={24} height={5} fill="var(--card)" fillOpacity={0.85} />
          ))}
          <rect x={-9} y={-78} width={18} height={12} fill="var(--yellow)" stroke={KEYLINE} strokeWidth={1.2} />
          <polygon points="0,-90 11,-78 -11,-78" fill={ink} stroke={KEYLINE} strokeWidth={1.2} />
          <path d="M9 -72 L34 -80 L34 -64 Z" fill="var(--yellow)" fillOpacity={0.5} />
        </g>
      );

    default:
      return <Box s={0.8} h={20} ink={ink} />;
  }
}

/** Miniatura para la paleta de construcción y las listas. */
export function BuildingThumb({
  id,
  ink,
  size = 56,
  integrity = 100,
}: {
  id: string;
  ink: string;
  size?: number;
  integrity?: number;
}) {
  return (
    <svg
      viewBox="-40 -100 80 120"
      width={size}
      height={size * 1.5}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <g className="ink-plate">
        <BuildingSprite id={id} ink={ink} integrity={integrity} />
      </g>
    </svg>
  );
}
