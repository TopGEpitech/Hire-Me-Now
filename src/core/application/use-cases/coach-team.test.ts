import { describe, expect, it } from "vitest";
import { member } from "@/test/fixtures";
import { coachTeam, type CoachEvent, type CoachModel } from "./coach-team";

const logger = { info() {}, warn() {}, error() {} };
const team = [member("pikachu", ["electric"])];
const good = { verdict: "risky" as const, summary: "ok", threats: [], fixes: ["x"], mvp: "pikachu" };

const model = (name: string, behave: "ok" | "fail"): CoachModel => ({
  name,
  diagnose: async (_t, onDelta) => {
    onDelta(`${name} thinking`);
    if (behave === "fail") throw new Error(`${name} is down`);
    return good;
  },
});

async function run(models: CoachModel[]) {
  const events: CoachEvent[] = [];
  await coachTeam({ models, logger })(team, [], (e) => events.push(e));
  return events;
}

describe("coachTeam", () => {
  it("uses the 1st model when it works", async () => {
    const events = await run([model("opus", "ok"), model("sonnet", "ok")]);
    expect(events.at(-1)).toEqual({ kind: "diagnosis", model: "opus", diagnosis: good });
    expect(events.some((e) => e.kind === "fallback")).toBe(false);
  });

  it("falls back to the next model + says so", async () => {
    const events = await run([model("opus", "fail"), model("sonnet", "ok")]);
    expect(events).toContainEqual({ kind: "fallback", from: "opus", to: "sonnet", reason: "opus is down" });
    expect(events.at(-1)).toMatchObject({ kind: "diagnosis", model: "sonnet" });
  });

  it("still answers with every model down (rule coach)", async () => {
    const events = await run([model("opus", "fail"), model("sonnet", "fail")]);
    expect(events.at(-1)).toMatchObject({ kind: "diagnosis", model: "rules" });
  });

  it("streams deltas from the models it tries", async () => {
    const events = await run([model("opus", "ok")]);
    expect(events[0]).toEqual({ kind: "delta", text: "opus thinking" });
  });
});
