import type { PlanBlock } from "@/lib/contracts";
import { HttpError } from "@/lib/server/errors";
import { schedulesOverlap } from "@/lib/scheduling/engine";

type BlockEdit = { id: string; startsAt?: string; endsAt?: string; locked?: boolean };
type PlanRange = { rangeStart: string; rangeEnd: string };

export function validatePlanBlockEdits(plan: PlanRange, blocks: PlanBlock[], edits: BlockEdit[]): PlanBlock[] {
  if (new Set(edits.map(({ id }) => id)).size !== edits.length) {
    throw new HttpError(422, "DUPLICATE_BLOCK", "Each plan block may be updated only once");
  }
  const editsById = new Map(edits.map((edit) => [edit.id, edit]));
  for (const edit of edits) {
    if (!blocks.some((block) => block.id === edit.id)) {
      throw new HttpError(404, "NOT_FOUND", "Plan block not found");
    }
  }
  const resolved = blocks.map((block) => ({ ...block, ...editsById.get(block.id) }));
  for (const block of resolved) {
    if (Date.parse(block.endsAt) <= Date.parse(block.startsAt)) {
      throw new HttpError(422, "INVALID_BLOCK_DURATION", "Plan block end must be after its start", [{ path: "blocks", message: `Invalid duration for block ${block.id}` }]);
    }
    if (Date.parse(block.startsAt) < Date.parse(plan.rangeStart) || Date.parse(block.endsAt) > Date.parse(plan.rangeEnd)) {
      throw new HttpError(422, "BLOCK_OUTSIDE_PLAN", "Plan blocks must stay inside the plan range", [{ path: "blocks", message: `Block ${block.id} is outside the plan range` }]);
    }
  }
  if (schedulesOverlap(resolved)) throw new HttpError(409, "BLOCK_OVERLAP", "Plan blocks cannot overlap");
  return resolved;
}
