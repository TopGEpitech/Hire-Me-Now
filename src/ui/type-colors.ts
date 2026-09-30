// pokemon types + my own "dev types" for the trainer card. every pair passes WCAG AA contrast (4.5:1), axe checks it in CI
const TYPE_COLORS: Record<string, string> = {
  normal: "bg-stone-300 text-stone-900",
  fire: "bg-orange-700 text-white",
  water: "bg-blue-600 text-white",
  electric: "bg-yellow-400 text-yellow-950",
  grass: "bg-green-700 text-white",
  ice: "bg-cyan-200 text-cyan-950",
  fighting: "bg-red-700 text-white",
  poison: "bg-purple-600 text-white",
  ground: "bg-amber-700 text-white",
  flying: "bg-indigo-300 text-indigo-950",
  psychic: "bg-pink-700 text-white",
  bug: "bg-lime-500 text-lime-950",
  rock: "bg-yellow-700 text-white",
  ghost: "bg-indigo-700 text-white",
  dragon: "bg-violet-600 text-white",
  dark: "bg-stone-700 text-white",
  steel: "bg-slate-400 text-slate-950",
  fairy: "bg-pink-300 text-pink-950",

  architecture: "bg-violet-600 text-white",
  devops: "bg-sky-700 text-white",
  security: "bg-stone-800 text-white",
  team: "bg-emerald-700 text-white",
  typescript: "bg-blue-600 text-white",
  "full stack": "bg-primary text-primary-foreground",
};

export const typeColor = (type: string | undefined) => (type && TYPE_COLORS[type]) || "bg-muted text-foreground";
