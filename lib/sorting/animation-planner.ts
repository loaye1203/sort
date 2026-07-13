import type { SortStep } from "./types";

export type SortMotion =
  | { kind: "compare" | "mark"; indices: number[] }
  | { kind: "swap"; indices: [number, number] }
  | {
      kind: "write";
      index: number;
      sourceIndex: number | null;
      lane: "upper" | "lower";
      semantic: "value-update" | "move" | "range-shift";
    }
  | { kind: "delete"; index: number }
  | { kind: "shuffle" }
  | { kind: "timer"; index: number | null; durationWeight: number }
  | { kind: "message" }
  | { kind: "done" | "aborted" };

export function getPixiAnimationDuration(speed: number, reducedMotion: boolean) {
  if (reducedMotion) return 0;
  return Math.min(360, Math.max(16, Math.round(speed * 0.82)));
}

export function getCrossedIndices(from: number, to: number) {
  const start = Math.min(from, to) + 1;
  const end = Math.max(from, to);
  return Array.from({ length: Math.max(0, end - start) }, (_, offset) => start + offset);
}

export function planSortMotion(step: SortStep, previousArray: number[]): SortMotion {
  if (step.animation?.kind === "timer") {
    return {
      kind: "timer",
      index: step.animation.index ?? null,
      durationWeight: step.animation.durationWeight ?? 1,
    };
  }

  if (step.type === "compare") return { kind: "compare", indices: step.indices };
  if (step.type === "mark") return { kind: "mark", indices: step.indices };
  if (step.type === "swap") return { kind: "swap", indices: step.indices };

  if (step.type === "write") {
    const movementHint = step.animation?.kind === "move" || step.animation?.kind === "range-shift"
      ? step.animation
      : null;
    return {
      kind: "write",
      index: step.index,
      sourceIndex: movementHint?.from ?? null,
      lane: movementHint?.lane ?? "upper",
      semantic: movementHint?.kind ?? "value-update",
    };
  }

  if (step.type === "delete") return { kind: "delete", index: step.index };
  if (step.type === "shuffle") return { kind: "shuffle" };
  if (step.type === "done") return { kind: "done" };
  if (step.type === "aborted") return { kind: "aborted" };

  if (step.type === "message" && /睡眠|醒来|计时|Time Sort|Sleep Sort/i.test(step.text)) {
    return { kind: "timer", index: null, durationWeight: 1 };
  }

  return { kind: "message" };
}
