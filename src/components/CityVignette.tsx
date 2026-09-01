import { BuildingSprite } from "@/components/BuildingSprite";
import { INK_VAR, isoPoint } from "@/lib/game";
import type { Ink } from "@/lib/types";

/* Escena fija para la portada: la promesa del producto en una sola imagen.
   Marcas un hábito, se imprime un edificio. */

const SCENE: { x: number; y: number; id: string; ink: Ink }[] = [
  { x: 0, y: 0, id: "trees", ink: "green" },
  { x: 1, y: 0, id: "house", ink: "yellow" },
  { x: 2, y: 0, id: "park", ink: "green" },
  { x: 0, y: 1, id: "cafe", ink: "pink" },
  { x: 1, y: 1, id: "library", ink: "blue" },
  { x: 2, y: 1, id: "house", ink: "pink" },
  { x: 0, y: 2, id: "block", ink: "yellow" },
  { x: 1, y: 2, id: "fountain", ink: "blue" },
  { x: 2, y: 2, id: "tower", ink: "blue" },
  { x: 3, y: 1, id: "gym", ink: "pink" },
  { x: 3, y: 2, id: "trees", ink: "green" },
  { x: 1, y: 3, id: "monument", ink: "yellow" },
];

export default function CityVignette({ className }: { className?: string }) {
  const ordered = [...SCENE].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);

  return (
    <svg
      viewBox="-190 -160 380 240"
      className={className}
      role="img"
      aria-label="Maqueta isométrica de una ciudad impresa en tintas planas"
    >
      {ordered.map(({ x, y, id, ink }) => {
        const { sx, sy } = isoPoint(x, y);
        return (
          <g key={`${x}:${y}`} transform={`translate(${sx - 32} ${sy - 40})`}>
            <polygon
              points="0,-16 32,0 0,16 -32,0"
              fill="var(--ink)"
              fillOpacity={0.06}
            />
            <g className="ink-plate">
              <BuildingSprite id={id} ink={INK_VAR[ink]} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
