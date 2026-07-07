import type { AlgorithmMeta, SafetyLimit, SortStep, VisualStats } from "./types";

export type HighlightRole = "active" | "sorted" | "pivot" | "candidate" | "deleted";

export interface VisualizationState {
  array: number[];
  highlights: Map<number, HighlightRole>;
  message: string;
  status: "idle" | "running" | "paused" | "done" | "aborted";
  stats: VisualStats;
}

export const INITIAL_STATS: VisualStats = {
  steps: 0,
  comparisons: 0,
  swaps: 0,
  writes: 0,
  startedAt: null,
  elapsedMs: 0,
};

export function createRandomArray(size: number) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 94) + 6);
}

export function clampSize(size: number, meta: AlgorithmMeta, safety: SafetyLimit) {
  return Math.max(meta.recommendedSize.min, Math.min(size, meta.recommendedSize.max, safety.maxArraySize));
}

export function createInitialState(array: number[], message = "准备演示。"): VisualizationState {
  return {
    array,
    highlights: new Map(),
    message,
    status: "idle",
    stats: { ...INITIAL_STATS },
  };
}

export function applySortStep(state: VisualizationState, step: SortStep): VisualizationState {
  const nextStats: VisualStats = {
    ...state.stats,
    steps: state.stats.steps + 1,
  };
  const highlights = new Map<number, HighlightRole>();
  let nextArray = state.array;
  let message = state.message;
  let status = state.status;

  if (step.type === "compare") {
    nextStats.comparisons += Math.max(1, step.indices.length - 1);
    step.indices.forEach((index) => highlights.set(index, "active"));
    message = `比较索引 ${step.indices.join(", ")}。`;
  }

  if (step.type === "swap") {
    nextStats.swaps += 1;
    nextArray = step.array;
    step.indices.forEach((index) => highlights.set(index, "candidate"));
    message = `交换索引 ${step.indices[0]} 与 ${step.indices[1]}。`;
  }

  if (step.type === "write") {
    nextStats.writes += 1;
    nextArray = step.array;
    highlights.set(step.index, "candidate");
    message = `写入 ${step.value} 到索引 ${step.index}。`;
  }

  if (step.type === "mark") {
    step.indices.forEach((index) => highlights.set(index, step.role));
    message = `标记 ${step.role}：${step.indices.join(", ")}。`;
  }

  if (step.type === "delete") {
    nextStats.writes += 1;
    nextArray = step.array;
    highlights.set(step.index, "deleted");
    message = `删除索引 ${step.index}。`;
  }

  if (step.type === "shuffle") {
    nextArray = step.array;
    nextArray.forEach((_, index) => highlights.set(index, "candidate"));
    message = "随机洗牌后重新检查。";
  }

  if (step.type === "message") {
    message = step.text;
  }

  if (step.type === "done") {
    nextArray = step.array;
    nextArray.forEach((_, index) => highlights.set(index, "sorted"));
    message = "排序完成。";
    status = "done";
  }

  if (step.type === "aborted") {
    message = step.reason;
    status = "aborted";
  }

  return {
    ...state,
    array: nextArray,
    highlights,
    message,
    status,
    stats: nextStats,
  };
}

export function shouldAbort(stats: VisualStats, safety: SafetyLimit) {
  if (stats.steps >= safety.maxSteps) {
    return `已达到 ${safety.maxSteps.toLocaleString("zh-CN")} 步上限，演示已中断。`;
  }

  if (stats.startedAt !== null && performance.now() - stats.startedAt >= safety.maxRuntimeMs) {
    return `已达到 ${safety.maxRuntimeMs}ms 运行上限，演示已中断。`;
  }

  return null;
}
