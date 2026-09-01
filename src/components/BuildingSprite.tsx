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

/* --------------------------------------------------------------------------
   Catálogo de siluetas. La clave coincide con buildings.id en la base.
   -------------------------------------------------------------------------- */

export function BuildingSprite({ id, ink }: { id: string; ink: string }) {
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
export function BuildingThumb({ id, ink, size = 56 }: { id: string; ink: string; size?: number }) {
  return (
    <svg
      viewBox="-40 -100 80 120"
      width={size}
      height={size * 1.5}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <g className="ink-plate">
        <BuildingSprite id={id} ink={ink} />
      </g>
    </svg>
  );
}
