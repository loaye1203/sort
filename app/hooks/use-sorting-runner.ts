import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applySortStep,
  clampSize,
  createInitialState,
  createLatestRequestGuard,
  createRandomArray,
  pauseTiming,
  resumeTiming,
  shouldAbort,
  type VisualizationState,
} from "../../lib/sorting/engine";
import { getSafetyLimit, type RegistryEntry } from "../../lib/sorting/registry";
import type { SafetyLimit, SortAlgorithm, SortStep } from "../../lib/sorting/types";

function createHydrationSafeArray(size: number) {
  return Array.from({ length: size }, (_, index) => 8 + ((index * 37 + 23) % 88));
}

export function useSortingRunner(selectedEntry: RegistryEntry) {
  const safety = useMemo(() => getSafetyLimit(selectedEntry.meta), [selectedEntry.meta]);
  const initialArrayRef = useRef<number[] | null>(null);
  if (initialArrayRef.current === null) {
    initialArrayRef.current = createHydrationSafeArray(selectedEntry.meta.recommendedSize.default);
  }
  const [algorithm, setAlgorithm] = useState<SortAlgorithm | null>(null);
  const [algorithmLoadError, setAlgorithmLoadError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(130);
  const [arraySize, setArraySize] = useState(selectedEntry.meta.recommendedSize.default);
  const [visualState, setVisualState] = useState<VisualizationState>(() => createInitialState(initialArrayRef.current!));
  const generatorRef = useRef<Generator<SortStep> | null>(null);
  const algorithmRef = useRef<SortAlgorithm | null>(null);
  const loadGuardRef = useRef(createLatestRequestGuard());
  const safetyRef = useRef<SafetyLimit>(safety);
  const baseArrayRef = useRef<number[]>(initialArrayRef.current);

  useEffect(() => {
    const loadToken = loadGuardRef.current.begin();
    const nextSafety = getSafetyLimit(selectedEntry.meta);
    const nextSize = clampSize(selectedEntry.meta.recommendedSize.default, selectedEntry.meta, nextSafety);
    const nextArray = createRandomArray(nextSize);

    generatorRef.current = null;
    algorithmRef.current = null;
    setAlgorithm(null);
    setAlgorithmLoadError(null);
    safetyRef.current = nextSafety;
    setArraySize(nextSize);
    baseArrayRef.current = nextArray;
    setVisualState(createInitialState(
      nextArray,
      selectedEntry.meta.runMode === "catalog-only"
        ? "只读图鉴，不执行"
        : selectedEntry.meta.runMode === "limited" || selectedEntry.meta.runMode === "simulated"
          ? "该算法已启用安全限制。"
          : "准备演示。",
    ));

    if (selectedEntry.load === null) return;

    selectedEntry.load(selectedEntry.meta).then((loadedAlgorithm) => {
      if (loadGuardRef.current.isCurrent(loadToken)) {
        algorithmRef.current = loadedAlgorithm;
        setAlgorithm(loadedAlgorithm);
      }
    }).catch(() => {
      if (loadGuardRef.current.isCurrent(loadToken)) {
        setAlgorithmLoadError("算法加载失败，请重试。");
      }
    });
  }, [selectedEntry]);

  useEffect(() => {
    safetyRef.current = safety;
  }, [safety]);

  const createGenerator = useCallback(() => {
    if (!algorithmRef.current) return null;
    return algorithmRef.current.generateSteps(baseArrayRef.current, { safety: safetyRef.current });
  }, []);

  const advanceOneStep = useCallback(() => {
    if (!algorithmRef.current) return;
    if (!generatorRef.current) generatorRef.current = createGenerator();

    setVisualState((current) => {
      if (current.status === "done" || current.status === "aborted") return current;
      const now = performance.now();
      const activeStats = current.status === "running" ? pauseTiming(current.stats, now) : current.stats;
      const abortReason = shouldAbort(current.stats, safetyRef.current, now);

      if (abortReason) {
        return applySortStep({ ...current, status: "aborted", stats: activeStats }, { type: "aborted", reason: abortReason });
      }

      const result = generatorRef.current?.next();
      if (!result || result.done) return { ...current, status: "done", stats: { ...activeStats } };
      const next = applySortStep({ ...current, stats: { ...activeStats } }, result.value);
      return { ...next, stats: { ...next.stats, startedAt: next.status === "running" ? now : null } };
    });
  }, [createGenerator]);

  useEffect(() => {
    if (visualState.status !== "running") return undefined;
    const timer = window.setInterval(advanceOneStep, speed);
    return () => window.clearInterval(timer);
  }, [advanceOneStep, speed, visualState.status]);

  const start = useCallback(() => {
    if (!algorithmRef.current || selectedEntry.meta.runMode === "catalog-only") return;
    if (!generatorRef.current || visualState.status === "done" || visualState.status === "aborted") {
      generatorRef.current = createGenerator();
    }
    setVisualState((current) => ({ ...current, status: "running", stats: resumeTiming(current.stats) }));
  }, [createGenerator, selectedEntry.meta.runMode, visualState.status]);

  const pause = useCallback(() => {
    setVisualState((current) => ({
      ...current,
      status: current.status === "running" ? "paused" : current.status,
      stats: current.status === "running" ? pauseTiming(current.stats) : current.stats,
    }));
  }, []);

  const reset = useCallback(() => {
    generatorRef.current = null;
    setVisualState(createInitialState(baseArrayRef.current));
  }, []);

  const randomize = useCallback(() => {
    const nextSize = clampSize(arraySize, selectedEntry.meta, safety);
    const nextArray = createRandomArray(nextSize);
    generatorRef.current = null;
    baseArrayRef.current = nextArray;
    setVisualState(createInitialState(nextArray, "已生成新数组。"));
  }, [arraySize, safety, selectedEntry.meta]);

  const singleStep = useCallback(() => {
    if (!algorithmRef.current || selectedEntry.meta.runMode === "catalog-only") return;
    if (!generatorRef.current || visualState.status === "done" || visualState.status === "aborted") {
      generatorRef.current = createGenerator();
      setVisualState((current) => ({
        ...current,
        status: "paused",
        stats: { ...current.stats, startedAt: current.stats.startedAt ?? performance.now() },
      }));
    }
    advanceOneStep();
  }, [advanceOneStep, createGenerator, selectedEntry.meta.runMode, visualState.status]);

  const updateArraySize = useCallback((nextSize: number) => {
    const clamped = clampSize(nextSize, selectedEntry.meta, safety);
    const nextArray = createRandomArray(clamped);
    generatorRef.current = null;
    setArraySize(clamped);
    baseArrayRef.current = nextArray;
    setVisualState(createInitialState(nextArray, "数组规模已更新。"));
  }, [safety, selectedEntry.meta]);

  const invalidateSelection = useCallback(() => {
    loadGuardRef.current.begin();
    generatorRef.current = null;
    algorithmRef.current = null;
    setAlgorithm(null);
    setAlgorithmLoadError(null);
    setVisualState((current) => createInitialState(current.array));
  }, []);

  return {
    algorithm,
    algorithmLoading: selectedEntry.load !== null && algorithm === null && algorithmLoadError === null,
    algorithmLoadError,
    arraySize,
    invalidateSelection,
    pause,
    randomize,
    reset,
    safety,
    setSpeed,
    singleStep,
    speed,
    start,
    updateArraySize,
    visualState,
  };
}
