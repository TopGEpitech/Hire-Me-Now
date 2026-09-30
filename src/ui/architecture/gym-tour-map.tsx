import type { Tour } from "@/core/domain/routing/route";

// the tour drawn on a rough kanto grid. computed on the server by the same code the MCP tool uses
export function GymTourMap({ tour }: { tour: Tour }) {
  const scale = 26;
  const pad = 30;
  const pts = tour.order.map((s) => ({ ...s, px: pad + s.x * scale, py: pad + s.y * scale }));
  const path = [...pts, pts[0]].map((p, i) => `${i ? "L" : "M"}${p.px},${p.py}`).join(" ");

  return (
    <figure className="panel overflow-x-auto p-4">
      <svg
        viewBox={`0 0 ${pad * 2 + 15 * scale} ${pad * 2 + 19 * scale}`}
        className="mx-auto w-full max-w-md"
        role="img"
        aria-labelledby="tour-title"
      >
        {/* 1 string on purpose: several text nodes inside an svg <title> break hydration */}
        <title id="tour-title">{`Shortest gym tour from ${tour.order[0].name}: ${tour.order.map((s) => s.name).join(", ")}`}</title>
        <path d={path} className="fill-none stroke-primary" strokeWidth={3} strokeDasharray="7 5" />
        {pts.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={p.px}
              cy={p.py}
              r={i === 0 ? 10 : 8}
              className={i === 0 ? "fill-accent stroke-foreground" : "fill-card stroke-foreground"}
              strokeWidth={2}
            />
            <text x={p.px} y={p.py + 4} textAnchor="middle" className="fill-foreground font-mono text-[10px] font-bold">
              {i === 0 ? "★" : i}
            </text>
            <text x={p.px + 14} y={p.py + 4} className="fill-foreground text-[11px] font-semibold">
              {p.name.split(" (")[0]}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        total distance {tour.distance}. nearest neighbour first, then 2-opt untangles the crossings
      </figcaption>
    </figure>
  );
}
