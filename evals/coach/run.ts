// eval bench for the AI coach. runs in CI on every push.
//   no ANTHROPIC_API_KEY -> grades the rule coach only (free, deterministic baseline)
//   with a key           -> grades claude too + compares it to the baseline
// usage: npm run eval:coach   (EVAL_MIN_SCORE=0.85 by default)
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeCoach, DiagnosisSchema } from "@/adapters/driven/coach/claude-coach";
import type { CoachModel } from "@/core/application/use-cases/coach-team";
import { ruleCoach, teamTelemetry } from "@/core/domain/coach/coach";
import { CASES, type EvalCase } from "./cases";

interface Check {
  name: string;
  pass: boolean;
}

function grade(c: EvalCase, raw: unknown): Check[] {
  const parsed = DiagnosisSchema.safeParse(raw);
  if (!parsed.success) return [{ name: "schema", pass: false }];
  const d = parsed.data;
  const threats = d.threats.map((t) => t.type);
  const names = c.team.map((m) => m.name);
  const checks: Check[] = [
    { name: "schema", pass: true },
    { name: "verdict", pass: c.verdictIn.includes(d.verdict) },
    { name: "has fixes", pass: d.fixes.length > 0 },
    // an mvp that isn't on the team = hallucination
    { name: "mvp on team", pass: d.mvp === null || names.includes(d.mvp.toLowerCase()) },
  ];
  if (c.threatsAnyOf) checks.push({ name: "real threat found", pass: c.threatsAnyOf.some((t) => threats.includes(t)) });
  if (c.threatsNoneOf) checks.push({ name: "no fake threat", pass: !c.threatsNoneOf.some((t) => threats.includes(t)) });
  return checks;
}

async function evaluate(model: CoachModel) {
  const rows = [];
  for (const c of CASES) {
    const t0 = Date.now();
    let checks: Check[];
    try {
      checks = grade(c, await model.diagnose(teamTelemetry(c.team), () => {}));
    } catch (e) {
      checks = [{ name: `error: ${(e as Error).message}`, pass: false }];
    }
    rows.push({ id: c.id, ms: Date.now() - t0, checks });
  }
  const all = rows.flatMap((r) => r.checks);
  return { model: model.name, score: all.filter((c) => c.pass).length / all.length, rows };
}

async function main() {
  const models: CoachModel[] = [{ name: "rules (baseline)", diagnose: async (t) => ruleCoach(t) }];
  if (process.env.ANTHROPIC_API_KEY) {
    models.push(
      new ClaudeCoach(new Anthropic(), process.env.EVAL_MODEL ?? "claude-opus-5-5", { serverFallback: true }),
    );
  }

  const results = [];
  for (const m of models) results.push(await evaluate(m));

  const min = Number(process.env.EVAL_MIN_SCORE ?? 0.85);
  let md = `## coach eval\n\n| model | score | min |\n|---|---|---|\n`;
  for (const r of results) md += `| ${r.model} | ${(r.score * 100).toFixed(0)}% | ${min * 100}% |\n`;
  for (const r of results) {
    md += `\n### ${r.model}\n\n| case | ms | failed checks |\n|---|---|---|\n`;
    for (const row of r.rows)
      md += `| ${row.id} | ${row.ms} | ${
        row.checks
          .filter((c) => !c.pass)
          .map((c) => c.name)
          .join(", ") || "-"
      } |\n`;
  }
  if (!process.env.ANTHROPIC_API_KEY) md += `\n_no ANTHROPIC_API_KEY, only the rule baseline ran_\n`;

  console.log(md);
  mkdirSync("evals/out", { recursive: true });
  writeFileSync("evals/out/coach.json", JSON.stringify(results, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);

  const failing = results.filter((r) => r.score < min);
  if (failing.length) {
    console.error(`below ${min * 100}%: ${failing.map((r) => r.model).join(", ")}`);
    process.exit(1);
  }
}

main();
