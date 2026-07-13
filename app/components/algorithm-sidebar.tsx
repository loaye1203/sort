import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  algorithmRegistry,
  categoryOrder,
  implementationLevelLabels,
  searchAlgorithms,
} from "../../lib/sorting/registry";
import type { AlgorithmCategory, AlgorithmMeta } from "../../lib/sorting/types";
import styles from "../page.module.css";

type RunModeFilter = AlgorithmMeta["runMode"] | "all";

const runModeFilters: Array<{ value: RunModeFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "real", label: "标准运行" },
  { value: "limited", label: "受限运行" },
  { value: "simulated", label: "模拟运行" },
  { value: "catalog-only", label: "只读图鉴" },
];

function getRunModeText(runMode: AlgorithmMeta["runMode"]) {
  return {
    real: "标准运行",
    limited: "受限运行",
    simulated: "模拟运行",
    "catalog-only": "只读图鉴",
  }[runMode];
}

type AlgorithmSidebarProps = {
  activeEnglishName: string;
  backgroundRef: RefObject<HTMLElement | null>;
  onOpenCustomLab: () => void;
  onSelectAlgorithm: (id: string) => void;
  selectedId: string;
  showCustomLab: boolean;
};

export const AlgorithmSidebar = memo(function AlgorithmSidebar({
  activeEnglishName,
  backgroundRef,
  onOpenCustomLab,
  onSelectAlgorithm,
  selectedId,
  showCustomLab,
}: AlgorithmSidebarProps) {
  const [query, setQuery] = useState("");
  const [runModeFilter, setRunModeFilter] = useState<RunModeFilter>("all");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<AlgorithmCategory>>(new Set());
  const sidebarRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const filteredEntries = useMemo(() => {
    const entries = searchAlgorithms(query);
    return runModeFilter === "all" ? entries : entries.filter((entry) => entry.meta.runMode === runModeFilter);
  }, [query, runModeFilter]);
  const groupedEntries = useMemo(
    () => categoryOrder.map((category) => ({
      category,
      entries: filteredEntries.filter((entry) => entry.meta.category === category),
    })),
    [filteredEntries],
  );
  const runModeCounts = useMemo(
    () => runModeFilters.reduce<Record<RunModeFilter, number>>(
      (counts, filter) => ({
        ...counts,
        [filter.value]: filter.value === "all"
          ? algorithmRegistry.length
          : algorithmRegistry.filter((entry) => entry.meta.runMode === filter.value).length,
      }),
      { all: 0, real: 0, limited: 0, simulated: 0, "catalog-only": 0 },
    ),
    [],
  );
  const toggleCategory = useCallback((category: AlgorithmCategory) => {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);
  const closeLibrary = useCallback(() => {
    setIsLibraryOpen(false);
    window.requestAnimationFrame(() => {
      const focusTarget = previousFocusRef.current?.isConnected ? previousFocusRef.current : triggerRef.current;
      focusTarget?.focus();
    });
  }, []);
  const openLibrary = useCallback(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    setIsLibraryOpen(true);
  }, []);
  const selectAlgorithm = useCallback((id: string) => {
    closeLibrary();
    onSelectAlgorithm(id);
  }, [closeLibrary, onSelectAlgorithm]);
  const openCustomLab = useCallback(() => {
    closeLibrary();
    onOpenCustomLab();
  }, [closeLibrary, onOpenCustomLab]);

  useEffect(() => {
    if (!isLibraryOpen || !window.matchMedia("(max-width: 980px)").matches) return undefined;

    const background = backgroundRef.current;
    const previousInert = background?.hasAttribute("inert") ?? false;
    const previousAriaHidden = background?.getAttribute("aria-hidden") ?? null;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    if (background) {
      background.inert = true;
      background.setAttribute("inert", "");
      background.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    searchRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLibrary();
        return;
      }
      if (event.key !== "Tab" || !sidebarRef.current) return;

      const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        sidebarRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (background) {
        background.inert = previousInert;
        if (!previousInert) background.removeAttribute("inert");
        if (previousAriaHidden === null) background.removeAttribute("aria-hidden");
        else background.setAttribute("aria-hidden", previousAriaHidden);
      }
      Object.assign(document.body.style, previousBodyStyles);
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [backgroundRef, closeLibrary, isLibraryOpen]);

  return (
    <>
      <div className={styles.mobileTopbar}>
        <div className={styles.mobileBrand}>
          <span className={styles.brandMark} aria-hidden="true"><img src="/brand-icon-transparent.png" alt="" /></span>
          <span>{activeEnglishName}</span>
        </div>
        <button ref={triggerRef} type="button" className={styles.libraryToggle} aria-controls="algorithm-library" aria-expanded={isLibraryOpen} onClick={isLibraryOpen ? closeLibrary : openLibrary}>
          算法库
        </button>
      </div>
      {isLibraryOpen ? <button type="button" className={styles.libraryBackdrop} aria-label="关闭算法库" onClick={closeLibrary} /> : null}
      <aside ref={sidebarRef} id="algorithm-library" className={`${styles.sidebar} ${isLibraryOpen ? styles.sidebarOpen : ""}`} aria-label="算法库" role={isLibraryOpen ? "dialog" : undefined} aria-modal={isLibraryOpen ? "true" : undefined} tabIndex={isLibraryOpen ? -1 : undefined}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true"><img src="/brand-icon-transparent.png" alt="" /></span>
          <div><h1>Sorting Zoo</h1><p>排序算法工具台</p></div>
          <button type="button" className={styles.libraryClose} aria-label="关闭算法库" onClick={closeLibrary}>×</button>
        </div>
        <label className={styles.searchLabel}>
          <span>搜索算法</span>
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名称、别名、分类、吐槽关键词" className={styles.searchInput} />
        </label>
        <div className={styles.filterBar} aria-label="运行模式筛选">
          {runModeFilters.map((filter) => (
            <button key={filter.value} type="button" className={runModeFilter === filter.value ? styles.filterActive : ""} onClick={() => setRunModeFilter(filter.value)}>
              <span>{filter.label}</span><small>{runModeCounts[filter.value]}</small>
            </button>
          ))}
        </div>
        <nav className={styles.categoryList}>
          {filteredEntries.length > 0 ? groupedEntries.map(({ category, entries }) => {
            if (entries.length === 0) return null;
            const collapsed = collapsedCategories.has(category);
            return (
              <section key={category} className={styles.categoryBlock}>
                <button className={styles.categoryHeader} type="button" aria-expanded={!collapsed} onClick={() => toggleCategory(category)}>
                  <span>{category}</span><span>{collapsed ? "+" : "-"}</span>
                </button>
                {!collapsed && <div className={styles.algorithmList}>
                  {entries.map(({ meta }) => (
                    <button key={meta.id} type="button" data-algorithm-id={meta.id} className={`${styles.algorithmItem} ${!showCustomLab && meta.id === selectedId ? styles.algorithmItemActive : ""}`} aria-current={!showCustomLab && meta.id === selectedId ? "true" : undefined} onClick={() => selectAlgorithm(meta.id)}>
                      <span><strong>{meta.englishName}</strong><small>{meta.name}</small></span><em>{implementationLevelLabels[meta.implementationLevel]} · {getRunModeText(meta.runMode)}</em>
                    </button>
                  ))}
                </div>}
              </section>
            );
          }) : <div className={styles.emptyState}><strong>没有找到算法</strong><span>换个关键词，或切回“全部”再试。</span></div>}
        </nav>
        <button className={`${styles.customLab} ${showCustomLab ? styles.customLabActive : ""}`} type="button" onClick={openCustomLab}>
          <span>自定义排序实验室</span><small>占位入口，不执行用户代码</small>
        </button>
      </aside>
    </>
  );
});
