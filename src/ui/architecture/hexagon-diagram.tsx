// hand drawn svg. left = who calls the core, right = what the core calls through its ports

const DRIVING = ["Pages (RSC)", "API routes /api/*", "Vitest"];
const DRIVEN = [
  "PokéAPI (server)",
  "My API (browser)",
  "localStorage",
  "HMAC tokens",
  "Env secrets",
  "Audit + rate limit",
];

const hex = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");

export function HexagonDiagram() {
  const cx = 400;
  const cy = 215;
  const leftY = (i: number) => 110 + i * 105;
  const rightY = (i: number) => 40 + i * 70;

  return (
    <figure className="panel overflow-x-auto p-4">
      <svg
        viewBox="0 0 800 450"
        role="img"
        aria-labelledby="hex-title"
        className="mx-auto w-full min-w-[600px] max-w-3xl"
      >
        <title id="hex-title">
          Hexagonal architecture: pages, API routes and tests drive the core. The core reaches PokéAPI, storage and
          security through ports.
        </title>

        {DRIVING.map((label, i) => (
          <g key={label}>
            <line
              x1={190}
              y1={leftY(i)}
              x2={cx - 150}
              y2={cy}
              className="stroke-foreground/40"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <rect
              x={10}
              y={leftY(i) - 22}
              width={180}
              height={44}
              rx={8}
              className="fill-card stroke-foreground"
              strokeWidth={2}
            />
            <text x={100} y={leftY(i) + 5} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
              {label}
            </text>
          </g>
        ))}

        {DRIVEN.map((label, i) => (
          <g key={label}>
            <line
              x1={610}
              y1={rightY(i)}
              x2={cx + 150}
              y2={cy}
              className="stroke-foreground/40"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <rect
              x={610}
              y={rightY(i) - 22}
              width={180}
              height={44}
              rx={8}
              className="fill-card stroke-foreground"
              strokeWidth={2}
            />
            <text x={700} y={rightY(i) + 5} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
              {label}
            </text>
          </g>
        ))}

        <polygon points={hex(cx, cy, 160)} className="fill-accent stroke-foreground" strokeWidth={3} />
        <polygon points={hex(cx, cy, 92)} className="fill-primary stroke-foreground" strokeWidth={3} />

        <text
          x={cx}
          y={cy - 118}
          textAnchor="middle"
          className="fill-foreground text-[12px] font-bold uppercase tracking-widest"
        >
          application
        </text>
        <text x={cx} y={cy + 128} textAnchor="middle" className="fill-foreground text-[12px]">
          use cases + ports
        </text>
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-primary-foreground text-[18px] font-black">
          DOMAIN
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-primary-foreground text-[11px]">
          battle · rbac · team rules
        </text>

        <text x={100} y={30} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px] uppercase">
          driving (calls in)
        </text>
        <text x={700} y={442} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px] uppercase">
          driven (called out)
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        Dependencies only point in. The core has 0 imports from Next, React or any adapter, + ESLint fails the build if
        that changes.
      </figcaption>
    </figure>
  );
}
