import { memo } from "react";
import type { AlgorithmMeta } from "../../lib/sorting/types";
import { implementationLevelLabels } from "../../lib/sorting/registry";
import styles from "../page.module.css";

export const AlgorithmCodePanel = memo(function AlgorithmCodePanel({ code, error, meta }: { code: string | null; error: string | null; meta: AlgorithmMeta }) {
  const codeTitle = meta.implementationLevel === "catalog-only" ? "概念伪代码" : "代码展示";
  return <section className={styles.codePanel}><div className={styles.codeHeader}><h3>{codeTitle}</h3><span>{implementationLevelLabels[meta.implementationLevel]}</span></div><pre><code>{code ?? error ?? "正在加载算法代码..."}</code></pre></section>;
});
