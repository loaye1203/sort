import { memo, useMemo, type CSSProperties } from "react";
import type { VisualizationState } from "../../lib/sorting/engine";
import styles from "../page.module.css";

export function getBarTransitionDuration(speed: number) {
  return Math.min(120, Math.round(speed * 0.75));
}

export const SortingVisualizer = memo(function SortingVisualizer({ state, speed }: { state: VisualizationState; speed: number }) {
  const maxValue = Math.max(...state.array, 1);
  const transitionStyle = useMemo(
    () => ({ "--bar-transition-ms": `${getBarTransitionDuration(speed)}ms` }) as CSSProperties,
    [speed],
  );

  return (
    <section className={styles.visualPanel}>
      <div className={styles.messageLine}>{state.message}</div>
      <div className={styles.bars} aria-label="排序柱状图" style={transitionStyle}>
        {state.array.map((value, index) => {
          const role = state.highlights.get(index);
          const height = `${Math.max(8, (value / maxValue) * 100)}%`;
          return <div className={styles.barSlot} key={index}><div className={`${styles.bar} ${role ? styles[`bar${role}`] : ""}`} style={{ height }} title={`${index}: ${value}`} /></div>;
        })}
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
