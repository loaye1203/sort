import { memo } from "react";
import type { AlgorithmMeta, SafetyLimit } from "../../lib/sorting/types";
import type { VisualizationState } from "../../lib/sorting/engine";
import styles from "../page.module.css";

type SortingControlsProps = {
  algorithmReady: boolean;
  arraySize: number;
  meta: AlgorithmMeta;
  onArraySizeChange: (size: number) => void;
  onPause: () => void;
  onRandomize: () => void;
  onReset: () => void;
  onSingleStep: () => void;
  onSpeedChange: (speed: number) => void;
  onStart: () => void;
  safety: SafetyLimit;
  speed: number;
  status: VisualizationState["status"];
};

export function getSortingControlsState(runMode: AlgorithmMeta["runMode"]) {
  const canExecute = runMode !== "catalog-only";
  return { canExecute, notice: canExecute ? null : "只读图鉴，不执行", showExecutionControls: canExecute };
}

export const SortingControls = memo(function SortingControls(props: SortingControlsProps) {
  const controlsState = getSortingControlsState(props.meta.runMode);
  if (!controlsState.showExecutionControls) {
    return <section className={styles.controls} aria-label="图鉴状态"><p>{controlsState.notice}</p></section>;
  }

  return (
    <section className={styles.controls} aria-label="演示控制">
      <button type="button" onClick={props.onStart} disabled={props.status === "running" || !props.algorithmReady}>{props.status === "paused" ? "继续" : "开始"}</button>
      <button type="button" onClick={props.onPause} disabled={props.status !== "running"}>暂停</button>
      <button type="button" onClick={props.onReset}>重置</button>
      <button type="button" onClick={props.onSingleStep} disabled={!props.algorithmReady || props.status === "running"}>单步</button>
      <button type="button" onClick={props.onRandomize}>随机数组</button>
      <label><span>速度 {props.speed}ms</span><input type="range" min="20" max="600" step="10" value={props.speed} onChange={(event) => props.onSpeedChange(Number(event.target.value))} /></label>
      <label><span>规模 {props.arraySize}/{props.safety.maxArraySize}</span><input type="range" min={props.meta.recommendedSize.min} max={Math.min(props.meta.recommendedSize.max, props.safety.maxArraySize)} value={props.arraySize} onChange={(event) => props.onArraySizeChange(Number(event.target.value))} /></label>
    </section>
  );
});
