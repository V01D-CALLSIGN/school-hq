import type { FocusSession } from "@/lib/contracts";
import { HttpError } from "@/lib/server/errors";

export function applyFocusTransition(
  session: FocusSession,
  action: "pause" | "resume" | "complete" | "cancel",
  occurredAt = new Date().toISOString(),
): Partial<FocusSession> {
  const now = Date.parse(occurredAt);
  if (!Number.isFinite(now) || now < Date.parse(session.startedAt)) throw new HttpError(409, "INVALID_TRANSITION", "Transition cannot precede session start");
  if (now > Date.now() + 5 * 60_000) throw new HttpError(409, "INVALID_TRANSITION", "Transition cannot be in the future");
  if (session.status === "completed" || session.status === "cancelled") throw new HttpError(409, "INVALID_TRANSITION", "Finished sessions cannot be changed");
  if (action === "pause") {
    if (session.status !== "running") throw new HttpError(409, "INVALID_TRANSITION", "Only a running session can be paused");
    return { status: "paused", pausedAt: occurredAt };
  }
  if (action === "resume") {
    if (session.status !== "paused" || !session.pausedAt) throw new HttpError(409, "INVALID_TRANSITION", "Only a paused session can be resumed");
    if (now < Date.parse(session.pausedAt)) throw new HttpError(409, "INVALID_TRANSITION", "Resume cannot precede pause");
    const added = Math.floor((now - Date.parse(session.pausedAt)) / 1000);
    return { status: "running", pausedAt: null, accumulatedPauseSeconds: session.accumulatedPauseSeconds + added };
  }
  if (session.status === "paused" && session.pausedAt && now < Date.parse(session.pausedAt)) throw new HttpError(409, "INVALID_TRANSITION", "Completion cannot precede pause");
  const pauseAddition = session.status === "paused" && session.pausedAt ? Math.floor((now - Date.parse(session.pausedAt)) / 1000) : 0;
  return {
    status: action === "complete" ? "completed" : "cancelled",
    completedAt: occurredAt,
    pausedAt: null,
    accumulatedPauseSeconds: session.accumulatedPauseSeconds + pauseAddition,
  };
}
