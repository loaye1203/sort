"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applySortStep,
  clampSize,
  createInitialState,
  createRandomArray,
  shouldAbort,
  type VisualizationState,
} from "../lib/sorting/engine";
import {
  algorithmRegistry,
  categoryOrder,
  findRegistryEntry,
  getSafetyLimit,
  searchAlgorithms,
} from "../lib/sorting/registry";
import type { AlgorithmCategory, AlgorithmMeta, SafetyLimit, SortAlgorithm, SortStep } from "../lib/sorting/types";
import styles from "./page.module.css";

const DEFAULT_ALGORITHM_ID = "bubble-sort";
type ThemeMode = "dark" | "light";
type RunModeFilter = AlgorithmMeta["runMode"] | "all";

const runModeFilters: Array<{ value: RunModeFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "real", label: "真实" },
  { value: "limited", label: "限流" },
  { value: "simulated", label: "模拟" },
  { value: "catalog-only", label: "图鉴" },
];

function getRunModeText(runMode: AlgorithmMeta["runMode"]) {
  const labels: Record<AlgorithmMeta["runMode"], string> = {
    real: "真实",
    limited: "限流",
    simulated: "模拟",
    "catalog-only": "图鉴",
  };

  return labels[runMode];
}

function formatBoolean(value: boolean | "depends" | "not-applicable") {
  if (value === true) {
    return "是";
  }

  if (value === false) {
    return "否";
  }

  if (value === "depends") {
    return "视情况";
  }

  return "不适用";
}

function getStatusText(status: VisualizationState["status"]) {
  const labels: Record<VisualizationState["status"], string> = {
    idle: "待机",
    running: "运行中",
    paused: "已暂停",
    done: "完成",
    aborted: "已中断",
  };

  return labels[status];
}

function groupByCategory(entries: typeof algorithmRegistry) {
  return categoryOrder.map((category) => ({
    category,
    entries: entries.filter((entry) => entry.meta.category === category),
  }));
}

function createHydrationSafeArray(size: number) {
  return Array.from({ length: size }, (_, index) => 8 + ((index * 37 + 23) % 88));
}

export default function SortingZoo() {
  const [selectedId, setSelectedId] = useState(DEFAULT_ALGORITHM_ID);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [showCustomLab, setShowCustomLab] = useState(false);
  const [query, setQuery] = useState("");
  const [runModeFilter, setRunModeFilter] = useState<RunModeFilter>("all");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<AlgorithmCategory>>(new Set());
  const [algorithm, setAlgorithm] = useState<SortAlgorithm | null>(null);
  const [speed, setSpeed] = useState(130);
  const selectedEntry = findRegistryEntry(selectedId);
  const safety = useMemo(() => getSafetyLimit(selectedEntry.meta), [selectedEntry.meta]);
  const [arraySize, setArraySize] = useState(selectedEntry.meta.recommendedSize.default);
  const [baseArray, setBaseArray] = useState<number[]>(() =>
    createHydrationSafeArray(selectedEntry.meta.recommendedSize.default),
  );
  const [visualState, setVisualState] = useState<VisualizationState>(() => createInitialState(baseArray));
  const generatorRef = useRef<Generator<SortStep> | null>(null);
  const algorithmRef = useRef<SortAlgorithm | null>(null);
  const safetyRef = useRef<SafetyLimit>(safety);
  const baseArrayRef = useRef<number[]>(baseArray);
  const stageRef = useRef<HTMLElement | null>(null);

  const filteredEntries = useMemo(() => {
    const entries = searchAlgorithms(query);

    if (runModeFilter === "all") {
      return entries;
    }

    return entries.filter((entry) => entry.meta.runMode === runModeFilter);
  }, [query, runModeFilter]);
  const groupedEntries = useMemo(() => groupByCategory(filteredEntries), [filteredEntries]);
  const runModeCounts = useMemo(
    () =>
      runModeFilters.reduce<Record<RunModeFilter, number>>(
        (counts, filter) => ({
          ...counts,
          [filter.value]:
            filter.value === "all"
              ? algorithmRegistry.length
              : algorithmRegistry.filter((entry) => entry.meta.runMode === filter.value).length,
        }),
        {
          all: 0,
          real: 0,
          limited: 0,
          simulated: 0,
          "catalog-only": 0,
        },
      ),
    [],
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("sorting-zoo-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    const params = new URLSearchParams(window.location.search);
    const algorithmId = params.get("algorithm");

    if (algorithmId && algorithmRegistry.some((entry) => entry.meta.id === algorithmId)) {
      setSelectedId(algorithmId);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sorting-zoo-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (showCustomLab) {
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    window.history.replaceState(null, "", `?algorithm=${selectedId}`);
  }, [selectedId, showCustomLab]);

  useEffect(() => {
    let cancelled = false;
    const nextSafety = getSafetyLimit(selectedEntry.meta);
    const nextSize = clampSize(selectedEntry.meta.recommendedSize.default, selectedEntry.meta, nextSafety);
    const nextArray = createRandomArray(nextSize);

    generatorRef.current = null;
    safetyRef.current = nextSafety;
    setArraySize(nextSize);
    setBaseArray(nextArray);
    baseArrayRef.current = nextArray;
    setVisualState(
      createInitialState(
        nextArray,
        selectedEntry.meta.runMode === "limited" || selectedEntry.meta.runMode === "simulated"
          ? "该算法已启用安全限制。"
          : "准备演示。",
      ),
    );

    selectedEntry.load().then((loadedAlgorithm) => {
      if (!cancelled) {
        setAlgorithm(loadedAlgorithm);
        algorithmRef.current = loadedAlgorithm;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEntry]);

  useEffect(() => {
    algorithmRef.current = algorithm;
  }, [algorithm]);

  useEffect(() => {
    safetyRef.current = safety;
  }, [safety]);

  useEffect(() => {
    baseArrayRef.current = baseArray;
  }, [baseArray]);

  const createGenerator = useCallback(() => {
    if (!algorithmRef.current) {
      return null;
    }

    return algorithmRef.current.generateSteps(baseArrayRef.current, {
      safety: safetyRef.current,
    });
  }, []);

  const advanceOneStep = useCallback(() => {
    if (!algorithmRef.current) {
      return;
    }

    if (!generatorRef.current) {
      generatorRef.current = createGenerator();
    }

    setVisualState((current) => {
      if (current.status === "done" || current.status === "aborted") {
        return current;
      }

      const startedAt = current.stats.startedAt ?? performance.now();
      const elapsedMs = performance.now() - startedAt;
      const abortReason = shouldAbort(
        {
          ...current.stats,
          startedAt,
          elapsedMs,
        },
        safetyRef.current,
      );

      if (abortReason) {
        return applySortStep(
          {
            ...current,
            status: "aborted",
            stats: {
              ...current.stats,
              startedAt,
              elapsedMs,
            },
          },
          { type: "aborted", reason: abortReason },
        );
      }

      const result = generatorRef.current?.next();

      if (!result || result.done) {
        return {
          ...current,
          status: "done",
          stats: {
            ...current.stats,
            startedAt,
            elapsedMs,
          },
        };
      }

      const next = applySortStep(
        {
          ...current,
          stats: {
            ...current.stats,
            startedAt,
            elapsedMs,
          },
        },
        result.value,
      );

      return {
        ...next,
        stats: {
          ...next.stats,
          startedAt,
          elapsedMs: performance.now() - startedAt,
        },
      };
    });
  }, [createGenerator]);

  useEffect(() => {
    if (visualState.status !== "running") {
      return undefined;
    }

    const timer = window.setInterval(advanceOneStep, speed);

    return () => window.clearInterval(timer);
  }, [advanceOneStep, speed, visualState.status]);

  const start = () => {
    if (!algorithmRef.current) {
      return;
    }

    if (!generatorRef.current || visualState.status === "done" || visualState.status === "aborted") {
      generatorRef.current = createGenerator();
    }

    setVisualState((current) => ({
      ...current,
      status: "running",
      stats: {
        ...current.stats,
        startedAt: current.stats.startedAt ?? performance.now(),
      },
    }));
  };

  const pause = () => {
    setVisualState((current) => ({
      ...current,
      status: current.status === "running" ? "paused" : current.status,
    }));
  };

  const reset = () => {
    generatorRef.current = null;
    setVisualState(createInitialState(baseArrayRef.current));
  };

  const randomize = () => {
    const nextSize = clampSize(arraySize, selectedEntry.meta, safety);
    const nextArray = createRandomArray(nextSize);
    generatorRef.current = null;
    setBaseArray(nextArray);
    baseArrayRef.current = nextArray;
    setVisualState(createInitialState(nextArray, "已生成新数组。"));
  };

  const singleStep = () => {
    if (!algorithmRef.current) {
      return;
    }

    if (!generatorRef.current || visualState.status === "done" || visualState.status === "aborted") {
      generatorRef.current = createGenerator();
      setVisualState((current) => ({
        ...current,
        status: "paused",
        stats: {
          ...current.stats,
          startedAt: current.stats.startedAt ?? performance.now(),
        },
      }));
    }

    advanceOneStep();
  };

  const updateArraySize = (nextSize: number) => {
    const clamped = clampSize(nextSize, selectedEntry.meta, safety);
    const nextArray = createRandomArray(clamped);
    generatorRef.current = null;
    setArraySize(clamped);
    setBaseArray(nextArray);
    baseArrayRef.current = nextArray;
    setVisualState(createInitialState(nextArray, "数组规模已更新。"));
  };

  const scrollStageIntoView = useCallback(() => {
    window.requestAnimationFrame(() => {
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const selectAlgorithm = (id: string) => {
    setShowCustomLab(false);
    setIsLibraryOpen(false);
    setSelectedId(id);
    scrollStageIntoView();
  };

  const openCustomLab = () => {
    setShowCustomLab(true);
    setIsLibraryOpen(false);
    scrollStageIntoView();
  };

  const toggleCategory = (category: AlgorithmCategory) => {
    setCollapsedCategories((current) => {
      const next = new Set(current);

      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }

      return next;
    });
  };

  const maxValue = Math.max(...visualState.array, 1);
  const activeMeta = selectedEntry.meta;
  const runModeLabel = `${getRunModeText(activeMeta.runMode)}运行`;
  const statusClass = styles[visualState.status] ?? "";
  const nextTheme = theme === "dark" ? "light" : "dark";
  const themeIcon = theme === "dark" ? "☾" : "☀";
  const themeLabel = theme === "dark" ? "切换到浅色主题" : "切换到深色主题";
  const hasFilteredEntries = filteredEntries.length > 0;

  return (
    <main className={styles.shell} data-theme={theme}>
      <div className={styles.mobileTopbar}>
        <div className={styles.mobileBrand}>
          <span className={styles.brandMark} aria-hidden="true">
            <img src="/brand-icon-transparent.png" alt="" />
          </span>
          <span>{activeMeta.englishName}</span>
        </div>
        <button
          type="button"
          className={styles.libraryToggle}
          aria-controls="algorithm-library"
          aria-expanded={isLibraryOpen}
          onClick={() => setIsLibraryOpen((current) => !current)}
        >
          算法库
        </button>
      </div>

      <aside
        id="algorithm-library"
        className={`${styles.sidebar} ${isLibraryOpen ? styles.sidebarOpen : ""}`}
        aria-label="算法库"
      >
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <img src="/brand-icon-transparent.png" alt="" />
          </span>
          <div>
            <h1>Sorting Zoo</h1>
            <p>排序算法工具台</p>
          </div>
        </div>

        <label className={styles.searchLabel}>
          <span>搜索算法</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名称、别名、分类、吐槽关键词"
            className={styles.searchInput}
          />
        </label>

        <div className={styles.filterBar} aria-label="运行模式筛选">
          {runModeFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={runModeFilter === filter.value ? styles.filterActive : ""}
              onClick={() => setRunModeFilter(filter.value)}
            >
              <span>{filter.label}</span>
              <small>{runModeCounts[filter.value]}</small>
            </button>
          ))}
        </div>

        <nav className={styles.categoryList}>
          {hasFilteredEntries ? (
            groupedEntries.map(({ category, entries }) => {
            if (entries.length === 0) {
              return null;
            }

            const collapsed = collapsedCategories.has(category);

            return (
              <section key={category} className={styles.categoryBlock}>
                <button
                  className={styles.categoryHeader}
                  type="button"
                  aria-expanded={!collapsed}
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  <span>{collapsed ? "+" : "-"}</span>
                </button>

                {!collapsed && (
                  <div className={styles.algorithmList}>
                    {entries.map(({ meta }) => (
                      <button
                        key={meta.id}
                        type="button"
                        data-algorithm-id={meta.id}
                        className={`${styles.algorithmItem} ${
                          !showCustomLab && meta.id === selectedId ? styles.algorithmItemActive : ""
                        }`}
                        aria-current={!showCustomLab && meta.id === selectedId ? "true" : undefined}
                        onClick={() => selectAlgorithm(meta.id)}
                      >
                        <span>
                          <strong>{meta.englishName}</strong>
                          <small>{meta.name}</small>
                        </span>
                        <em>{getRunModeText(meta.runMode)}</em>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })
          ) : (
            <div className={styles.emptyState}>
              <strong>没有找到算法</strong>
              <span>换个关键词，或切回“全部”再试。</span>
            </div>
          )}
        </nav>

        <button
          className={`${styles.customLab} ${showCustomLab ? styles.customLabActive : ""}`}
          type="button"
          onClick={openCustomLab}
        >
          <span>自定义排序实验室</span>
          <small>占位入口，不执行用户代码</small>
        </button>
      </aside>

      <section ref={stageRef} className={styles.stage} aria-label="算法演示台">
        {showCustomLab ? (
          <div className={styles.placeholderPanel}>
            <p className={styles.kicker}>预留功能</p>
            <h2>自定义排序实验室</h2>
            <p>
              首版只保留入口。这里不会接 AI、不会接后端，也不会执行用户输入的代码。后续需要沙箱、超时、中断和结构校验后才能开放。
            </p>
          </div>
        ) : (
          <>
            <header className={styles.stageHeader}>
              <div>
                <div className={styles.titleRow}>
                  <h2>{activeMeta.englishName}</h2>
                  <span className={`${styles.statusPill} ${statusClass}`}>
                    {getStatusText(visualState.status)}
                  </span>
                  <span className={styles.modePill}>{runModeLabel}</span>
                </div>
                <p>
                  {activeMeta.name} · {activeMeta.description}
                </p>
              </div>
              <button
                className={styles.themeToggle}
                type="button"
                aria-label={themeLabel}
                title={themeLabel}
                onClick={() => setTheme(nextTheme)}
              >
                <span aria-hidden="true">{themeIcon}</span>
              </button>
            </header>

            <section className={styles.visualPanel}>
              <div className={styles.messageLine}>{visualState.message}</div>
              <div className={styles.bars} aria-label="排序柱状图">
                {visualState.array.map((value, index) => {
                  const role = visualState.highlights.get(index);
                  const height = `${Math.max(8, (value / maxValue) * 100)}%`;

                  return (
                    <div className={styles.barSlot} key={`${index}-${value}`}>
                      <div
                        className={`${styles.bar} ${role ? styles[`bar${role}`] : ""}`}
                        style={{ height }}
                        title={`${index}: ${value}`}
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={styles.controls} aria-label="演示控制">
              <button type="button" onClick={start} disabled={visualState.status === "running" || !algorithm}>
                开始
              </button>
              <button type="button" onClick={pause} disabled={visualState.status !== "running"}>
                暂停
              </button>
              <button type="button" onClick={reset}>
                重置
              </button>
              <button type="button" onClick={singleStep} disabled={!algorithm || visualState.status === "running"}>
                单步
              </button>
              <button type="button" onClick={randomize}>
                随机数组
              </button>
              <label>
                <span>速度 {speed}ms</span>
                <input
                  type="range"
                  min="20"
                  max="600"
                  step="10"
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                />
              </label>
              <label>
                <span>
                  规模 {arraySize}/{safety.maxArraySize}
                </span>
                <input
                  type="range"
                  min={activeMeta.recommendedSize.min}
                  max={Math.min(activeMeta.recommendedSize.max, safety.maxArraySize)}
                  value={arraySize}
                  onChange={(event) => updateArraySize(Number(event.target.value))}
                />
              </label>
            </section>

            <section className={styles.infoGrid}>
              <div className={styles.statsPanel}>
                <h3>统计数据</h3>
                <dl>
                  <div>
                    <dt>步骤</dt>
                    <dd>{visualState.stats.steps}</dd>
                  </div>
                  <div>
                    <dt>比较</dt>
                    <dd>{visualState.stats.comparisons}</dd>
                  </div>
                  <div>
                    <dt>交换</dt>
                    <dd>{visualState.stats.swaps}</dd>
                  </div>
                  <div>
                    <dt>写入</dt>
                    <dd>{visualState.stats.writes}</dd>
                  </div>
                </dl>
              </div>

              <div className={styles.explainPanel}>
                <h3>算法说明</h3>
                <p>{activeMeta.description}</p>
                {activeMeta.jokeDescription ? <p className={styles.joke}>{activeMeta.jokeDescription}</p> : null}
                <div className={styles.metaLine}>
                  <span>稳定：{formatBoolean(activeMeta.stable)}</span>
                  <span>原地：{formatBoolean(activeMeta.inPlace)}</span>
                  <span>最坏：{activeMeta.timeComplexity.worst}</span>
                  <span>空间：{activeMeta.spaceComplexity}</span>
                </div>
              </div>
            </section>

            <section className={styles.codePanel}>
              <div className={styles.codeHeader}>
                <h3>代码展示</h3>
                <span>内置实现 · {activeMeta.source}</span>
              </div>
              <pre>
                <code>{algorithm?.code ?? "正在加载算法代码..."}</code>
              </pre>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
