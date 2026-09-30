import colors from "tailwindcss/colors";
import { describe, expect, it } from "vitest";
import { typeColor } from "./type-colors";
import { ALL_TYPES } from "@/core/domain/coach/coach";

// WCAG 2.1 contrast, straight from the spec. axe caught white on sky-600 once, this makes sure it can't come back
const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => {
  const [r, g, b] = hex.match(/\w\w/g)!.map((x) => channel(parseInt(x, 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const hexOf = (cls: string) => {
  if (cls.endsWith("white")) return "#ffffff";
  const [name, shade] = cls.replace(/^(bg|text)-/, "").split("-");
  return (colors as unknown as Record<string, Record<string, string>>)[name]?.[shade];
};

describe("type colors", () => {
  const types = [...ALL_TYPES, "architecture", "devops", "security", "team", "typescript"];

  it.each(types)("%s passes WCAG AA (4.5:1)", (type) => {
    const [bg, fg] = typeColor(type).split(" ").map(hexOf);
    expect(bg && fg, `no tailwind color for ${type}`).toBeTruthy();
    const [hi, lo] = [luminance(bg!), luminance(fg!)].sort((a, b) => b - a);
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
