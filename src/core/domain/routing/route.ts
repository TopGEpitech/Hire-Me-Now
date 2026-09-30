// tour planner: visit every stop once, come back home, keep the total distance low.
// same problem as planning a technician's round at work (it's a TSP), just with gyms.
// exact TSP is too slow past ~12 stops, so: nearest neighbour to start + 2-opt to clean it up

export interface Stop {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface Tour {
  order: Stop[];
  distance: number;
}

const dist = (a: Stop, b: Stop) => Math.hypot(a.x - b.x, a.y - b.y);

export function tourLength(order: Stop[]) {
  let total = 0;
  for (let i = 0; i < order.length; i++) total += dist(order[i], order[(i + 1) % order.length]);
  return total;
}

// greedy: always go to the closest place you haven't been yet. fast, usually ~25% off optimal
export function nearestNeighbour(start: Stop, stops: Stop[]): Stop[] {
  const left = stops.filter((s) => s.id !== start.id);
  const order = [start];
  while (left.length) {
    const here = order[order.length - 1];
    let best = 0;
    for (let i = 1; i < left.length; i++) if (dist(here, left[i]) < dist(here, left[best])) best = i;
    order.push(left.splice(best, 1)[0]);
  }
  return order;
}

// 2-opt: if 2 edges cross, reverse the bit in between. repeat until nothing improves.
// start (index 0) never moves, the tour always begins at home
export function twoOpt(order: Stop[], maxRounds = 50): Stop[] {
  const route = [...order];
  const n = route.length;
  if (n < 4) return route;

  for (let round = 0; round < maxRounds; round++) {
    let improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = route[i - 1];
        const b = route[i];
        const c = route[k];
        const d = route[(k + 1) % n];
        const delta = dist(a, c) + dist(b, d) - dist(a, b) - dist(c, d);
        if (delta < -1e-9) {
          route.splice(i, k - i + 1, ...route.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return route;
}

export function planTour(start: Stop, stops: Stop[]): Tour {
  const order = twoOpt(nearestNeighbour(start, stops));
  return { order, distance: Math.round(tourLength(order) * 10) / 10 };
}

// rough positions on the gen 1 town map, pallet town at the bottom
export const KANTO: Stop[] = [
  { id: "pallet", name: "Pallet Town", x: 3, y: 14 },
  { id: "pewter", name: "Pewter City (Brock)", x: 3, y: 4 },
  { id: "cerulean", name: "Cerulean City (Misty)", x: 12, y: 3 },
  { id: "vermilion", name: "Vermilion City (Lt. Surge)", x: 12, y: 11 },
  { id: "celadon", name: "Celadon City (Erika)", x: 8, y: 7 },
  { id: "fuchsia", name: "Fuchsia City (Koga)", x: 10, y: 16 },
  { id: "saffron", name: "Saffron City (Sabrina)", x: 12, y: 7 },
  { id: "cinnabar", name: "Cinnabar Island (Blaine)", x: 3, y: 18 },
  { id: "viridian", name: "Viridian City (Giovanni)", x: 3, y: 10 },
];
