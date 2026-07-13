export type AlgorithmCategory =
  | "基础排序"
  | "高效排序"
  | "非比较排序"
  | "冷门排序"
  | "整活排序"
  | "危险排序";

export type AlgorithmImplementationLevel = "full" | "simplified" | "simulated" | "catalog-only";

export type SortAnimationHint =
  | { kind: "move" | "range-shift"; from: number; to: number; lane?: "upper" | "lower" }
  | { kind: "timer"; index?: number; durationWeight?: number };

export type SortStep = (
  | { type: "compare"; indices: number[] }
  | { type: "swap"; indices: [number, number]; array: number[] }
  | { type: "write"; index: number; value: number; array: number[] }
  | {
      type: "mark";
      indices: number[];
      role: "active" | "sorted" | "pivot" | "candidate" | "deleted";
    }
  | { type: "delete"; index: number; array: number[] }
  | { type: "shuffle"; array: number[] }
  | { type: "message"; text: string }
  | { type: "done"; array: number[] }
  | { type: "aborted"; reason: string }
) & { animation?: SortAnimationHint };

export interface AlgorithmMeta {
  id: string;
  name: string;
  englishName: string;
  aliases: string[];
  category: AlgorithmCategory;
  weirdLevel: 0 | 1 | 2 | 3 | 4;
  stable: boolean | "depends" | "not-applicable";
  inPlace: boolean | "depends";
  canRunForever: boolean;
  runMode: "real" | "limited" | "simulated" | "catalog-only";
  implementationLevel: AlgorithmImplementationLevel;
  source: "built-in" | "ai-generated" | "user-draft";
  timeComplexity: {
    best: string;
    average: string;
    worst: string;
  };
  spaceComplexity: string;
  recommendedSize: {
    min: number;
    max: number;
    default: number;
  };
  description: string;
  jokeDescription?: string;
}

export interface SafetyLimit {
  maxSteps: number;
  maxRuntimeMs: number;
  maxArraySize: number;
}

export interface SortOptions {
  safety: SafetyLimit;
}

export interface SortAlgorithm {
  meta: AlgorithmMeta;
  code: string;
  generateSteps: (input: number[], options: SortOptions) => Generator<SortStep>;
}

export type AlgorithmImplementation = Omit<SortAlgorithm, "meta">;

export interface VisualStats {
  steps: number;
  comparisons: number;
  swaps: number;
  writes: number;
  startedAt: number | null;
  elapsedMs: number;
}
