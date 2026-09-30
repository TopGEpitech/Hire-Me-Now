// "hyper-beam" -> "Hyper Beam"
export const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const dexNumber = (id: number) => `#${String(id).padStart(3, "0")}`;
