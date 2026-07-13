"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { algorithmRegistryById, findRegistryEntry } from "../lib/sorting/registry";
import { AlgorithmCodePanel } from "./components/algorithm-code-panel";
import { AlgorithmInfo, AlgorithmInfoHeader } from "./components/algorithm-info";
import { AlgorithmSidebar } from "./components/algorithm-sidebar";
import { SortingControls } from "./components/sorting-controls";
import { SortingStats, SortingVisualizer } from "./components/sorting-visualizer";
import { useSortingRunner } from "./hooks/use-sorting-runner";
import { useThemeMode } from "./hooks/use-theme-mode";
import styles from "./page.module.css";

export { getBarTransitionDuration } from "./components/sorting-visualizer";
export { getSortingControlsState } from "./components/sorting-controls";

const DEFAULT_ALGORITHM_ID = "bubble-sort";

export default function SortingZoo() {
  const [selectedId, setSelectedId] = useState(DEFAULT_ALGORITHM_ID);
  const [showCustomLab, setShowCustomLab] = useState(false);
  const selectedEntry = findRegistryEntry(selectedId);
  const stageRef = useRef<HTMLElement | null>(null);
  const themeMode = useThemeMode();
  const runner = useSortingRunner(selectedEntry);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const algorithmId = params.get("algorithm");
    if (algorithmId && algorithmRegistryById.has(algorithmId)) setSelectedId(algorithmId);
  }, []);

  useEffect(() => {
    if (showCustomLab) {
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    window.history.replaceState(null, "", `?algorithm=${selectedId}`);
  }, [selectedId, showCustomLab]);

  const scrollStageIntoView = useCallback(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }));
  }, []);

  const selectAlgorithm = useCallback((id: string) => {
    runner.invalidateSelection();
    setShowCustomLab(false);
    setSelectedId(id);
    scrollStageIntoView();
  }, [runner.invalidateSelection, scrollStageIntoView]);

  const openCustomLab = useCallback(() => {
    setShowCustomLab(true);
    scrollStageIntoView();
  }, [scrollStageIntoView]);

  const activeMeta = selectedEntry.meta;

  return (
    <main className={styles.shell} data-theme={themeMode.theme} suppressHydrationWarning>
      <AlgorithmSidebar
        activeEnglishName={activeMeta.englishName}
        backgroundRef={stageRef}
        onOpenCustomLab={openCustomLab}
        onSelectAlgorithm={selectAlgorithm}
        selectedId={selectedId}
        showCustomLab={showCustomLab}
      />

      <section ref={stageRef} className={styles.stage} aria-label="算法演示台">
        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {runner.algorithmLoadError
            ? runner.algorithmLoadError
            : runner.algorithmLoading
              ? `正在加载 ${activeMeta.englishName}。`
              : runner.visualState.status === "idle"
                ? `${activeMeta.englishName} 已加载，准备演示。`
                : runner.visualState.status === "running"
                  ? "排序正在运行。"
                  : runner.visualState.status === "paused"
                    ? "排序已暂停。"
                    : runner.visualState.status === "done"
                      ? "排序完成。"
                      : "排序已中断。"}
        </div>
        {showCustomLab ? (
          <div className={styles.placeholderPanel}>
            <p className={styles.kicker}>预留功能</p>
            <h2>自定义排序实验室</h2>
            <p>首版只保留入口。这里不会接 AI、不会接后端，也不会执行用户输入的代码。后续需要沙箱、超时、中断和结构校验后才能开放。</p>
          </div>
        ) : (
          <>
            <header className={styles.stageHeader}>
              <AlgorithmInfoHeader meta={activeMeta} status={runner.visualState.status} />
              <button className={styles.themeToggle} type="button" aria-label={themeMode.themeLabel} title={themeMode.themeLabel} onClick={themeMode.toggleTheme}>
                <span aria-hidden="true">{themeMode.themeIcon}</span>
              </button>
            </header>

            <SortingVisualizer state={runner.visualState} speed={runner.speed} />
            <SortingControls
              algorithmReady={runner.algorithm !== null}
              arraySize={runner.arraySize}
              meta={activeMeta}
              onArraySizeChange={runner.updateArraySize}
              onPause={runner.pause}
              onRandomize={runner.randomize}
              onReset={runner.reset}
              onSingleStep={runner.singleStep}
              onSpeedChange={runner.setSpeed}
              onStart={runner.start}
              safety={runner.safety}
              speed={runner.speed}
              status={runner.visualState.status}
            />

            <section className={styles.infoGrid}>
              <SortingStats stats={runner.visualState.stats} />
              <AlgorithmInfo meta={activeMeta} />
            </section>

            <AlgorithmCodePanel code={runner.algorithm?.code ?? selectedEntry.catalogCode ?? null} error={runner.algorithmLoadError} meta={activeMeta} />
          </>
        )}
      </section>
    </main>
  );
}
