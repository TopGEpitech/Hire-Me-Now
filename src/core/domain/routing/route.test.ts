import { describe, expect, it } from "vitest";
import { KANTO, nearestNeighbour, planTour, tourLength, twoOpt, type Stop } from "./route";

const s = (id: string, x: number, y: number): Stop => ({ id, name: id, x, y });

// brute force, only ok for tiny inputs. used to check we land on (or near) the real optimum
function optimal(start: Stop, rest: Stop[]): number {
  if (rest.length === 0) return 0;
  let best = Infinity;
  const permute = (done: Stop[], left: Stop[]) => {
    if (!left.length) return void (best = Math.min(best, tourLength([start, ...done])));
    left.forEach((p, i) => permute([...done, p], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  permute([], rest);
  return best;
}

describe("tour planning", () => {
  it("visits every stop exactly once + starts at home", () => {
    const tour = planTour(KANTO[0], KANTO);
    expect(tour.order[0].id).toBe("pallet");
    expect(new Set(tour.order.map((t) => t.id)).size).toBe(KANTO.length);
  });

  it("2-opt never makes a tour longer", () => {
    const greedy = nearestNeighbour(KANTO[0], KANTO);
    expect(tourLength(twoOpt(greedy))).toBeLessThanOrEqual(tourLength(greedy) + 1e-9);
  });

  it("untangles a crossing (the classic 2-opt case)", () => {
    // square visited as a bow tie: 0,0 -> 1,1 -> 1,0 -> 0,1 crosses itself
    const bowTie = [s("a", 0, 0), s("c", 1, 1), s("b", 1, 0), s("d", 0, 1)];
    expect(tourLength(twoOpt(bowTie))).toBeCloseTo(4);
  });

  it("lands within 5% of the real optimum on kanto", () => {
    const tour = planTour(KANTO[0], KANTO);
    const best = optimal(KANTO[0], KANTO.slice(1));
    expect(tour.distance).toBeLessThanOrEqual(best * 1.05);
  });

  it("handles tiny inputs", () => {
    expect(planTour(s("home", 0, 0), [s("home", 0, 0)]).order).toHaveLength(1);
    expect(planTour(s("home", 0, 0), [s("a", 3, 4)]).distance).toBe(10);
  });

  it("stays fast on 200 stops", () => {
    const many = Array.from({ length: 200 }, (_, i) => s(`p${i}`, (i * 37) % 101, (i * 53) % 97));
    const t0 = performance.now();
    planTour(many[0], many);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});
