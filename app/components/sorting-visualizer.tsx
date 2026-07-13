import { memo, useCallback, useMemo, useState, type CSSProperties } from "react";
import type { VisualizationState } from "../../lib/sorting/engine";
import type { ThemeMode } from "../hooks/use-theme-mode";
import styles from "../page.module.css";
import { PixiSortingStage } from "./pixi-sorting-stage";

export function getBarTransitionDuration(speed: number) {
  return Math.min(120, Math.round(speed * 0.75));
}

type SortingVisualizerProps = {
  speed: number;
  state: VisualizationState;
  theme: ThemeMode;
};

export const SortingVisualizer = memo(function SortingVisualizer({ state, speed, theme }: SortingVisualizerProps) {
  const [rendererState, setRendererState] = useState<"loading" | "ready" | "unavailable">("loading");
  const maxValue = Math.max(...state.array, 1);
  const transitionStyle = useMemo(
    () => ({ "--bar-transition-ms": `${getBarTransitionDuration(speed)}ms` }) as CSSProperties,
    [speed],
  );
  const handlePixiReady = useCallback(() => setRendererState("ready"), []);
  const handlePixiUnavailable = useCallback(() => setRendererState("unavailable"), []);
  const chartLabel = `排序柱状图，共 ${state.array.length} 个元素。`;

  return (
    <section className={styles.visualPanel}>
      <div className={styles.messageLine}>{state.message}</div>
      <div className={styles.visualStage} aria-label={chartLabel} data-renderer={rendererState} role="img">
        <PixiSortingStage
          className={styles.pixiStage}
          onReady={handlePixiReady}
          onUnavailable={handlePixiUnavailable}
          speed={speed}
          state={state}
          theme={theme}
        />
        {rendererState !== "ready" ? (
          <div className={styles.bars} data-dom-visualizer-fallback style={transitionStyle}>
            {state.array.map((value, index) => {
              const role = state.highlights.get(index);
              const height = `${Math.max(8, (value / maxValue) * 100)}%`;
              return <div className={styles.barSlot} key={index}><div className={`${styles.bar} ${role ? styles[`bar${role}`] : ""}`} style={{ height }} title={`${index}: ${value}`} /></div>;
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
});

export const SortingStats = memo(function SortingStats({ stats }: { stats: VisualizationState["stats"] }) {
  return (
    <div className={styles.statsPanel}>
      <h3>统计数据</h3>
      <dl>
        <div><dt>步骤</dt><dd>{stats.steps}</dd></div>
        <div><dt>比较</dt><dd>{stats.comparisons}</dd></div>
        <div><dt>交换</dt><dd>{stats.swaps}</dd></div>
        <div><dt>写入</dt><dd>{stats.writes}</dd></div>
      </dl>
    </div>
  );
});
