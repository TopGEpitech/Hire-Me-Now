import type { BattleEvent } from "../../domain/battle/engine";
import { ruleCoach, teamTelemetry, type Diagnosis, type TeamTelemetry } from "../../domain/coach/coach";
import type { TeamMember } from "../../domain/pokemon/pokemon";
import type { Logger } from "../ports";

export interface CoachModel {
  name: string;
  // streams text while it works, resolves with a validated diagnosis. throws on any failure
  diagnose(telemetry: TeamTelemetry, onDelta: (text: string) => void): Promise<Diagnosis>;
}

export type CoachEvent =
  | { kind: "delta"; text: string }
  | { kind: "fallback"; from: string; to: string; reason: string }
  | { kind: "diagnosis"; model: string; diagnosis: Diagnosis };

const RULES: CoachModel = { name: "rules", diagnose: async (t) => ruleCoach(t) };

// try each model in order. 1 fails (timeout, refusal, bad json...) -> next one.
// the rule coach sits at the end so the user ALWAYS gets an answer, even with every API down
export function coachTeam(deps: { models: CoachModel[]; logger: Logger }) {
  const chain = [...deps.models, RULES];

  return async (team: TeamMember[], log: BattleEvent[], emit: (e: CoachEvent) => void) => {
    const telemetry = teamTelemetry(team, log);

    for (let i = 0; i < chain.length; i++) {
      const model = chain[i];
      try {
        const diagnosis = await model.diagnose(telemetry, (text) => emit({ kind: "delta", text }));
        emit({ kind: "diagnosis", model: model.name, diagnosis });
        return;
      } catch (error) {
        const next = chain[i + 1];
        deps.logger.warn("coach_model_failed", { model: model.name, next: next?.name, error });
        if (next)
          emit({
            kind: "fallback",
            from: model.name,
            to: next.name,
            reason: String((error as Error)?.message ?? error),
          });
      }
    }
  };
}
