import { memo } from "react";
import type { VisualizationState } from "../../lib/sorting/engine";
import type { AlgorithmMeta } from "../../lib/sorting/types";
import { implementationLevelLabels } from "../../lib/sorting/registry";
import styles from "../page.module.css";

function formatBoolean(value: boolean | "depends" | "not-applicable") {
  if (value === true) return "是";
  if (value === false) return "否";
  if (value === "depends") return "视情况";
  return "不适用";
}

function getStatusText(status: VisualizationState["status"]) {
  return { idle: "待机", running: "运行中", paused: "已暂停", done: "完成", aborted: "已中断" }[status];
}

function getRunModeText(runMode: AlgorithmMeta["runMode"]) {
  return { real: "标准", limited: "受限", simulated: "模拟", "catalog-only": "只读图鉴" }[runMode];
}

export const AlgorithmInfoHeader = memo(function AlgorithmInfoHeader({ meta, status }: { meta: AlgorithmMeta; status: VisualizationState["status"] }) {
  const runModeLabel = meta.runMode === "catalog-only" ? getRunModeText(meta.runMode) : `${getRunModeText(meta.runMode)}运行`;
  return <div><div className={styles.titleRow}><h2>{meta.englishName}</h2><span className={`${styles.statusPill} ${styles[status] ?? ""}`}>{getStatusText(status)}</span><span className={styles.modePill}>{implementationLevelLabels[meta.implementationLevel]} · {runModeLabel}</span></div><p>{meta.name} · {meta.description}</p></div>;
});

export const AlgorithmInfo = memo(function AlgorithmInfo({ meta }: { meta: AlgorithmMeta }) {
  return (
    <div className={styles.explainPanel}>
      <h3>算法说明</h3><p>{meta.description}</p>{meta.jokeDescription ? <p className={styles.joke}>{meta.jokeDescription}</p> : null}
      <div className={styles.metaLine}><span>稳定：{formatBoolean(meta.stable)}</span><span>原地：{formatBoolean(meta.inPlace)}</span><span>最坏：{meta.timeComplexity.worst}</span><span>空间：{meta.spaceComplexity}</span></div>
    </div>
  );
});
