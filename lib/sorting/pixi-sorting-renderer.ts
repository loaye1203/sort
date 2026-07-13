import {
  Application,
  Container,
  Graphics,
  NineSliceSprite,
  type Texture,
  type Ticker,
} from "pixi.js";
import {
  getCrossedIndices,
  getPixiAnimationDuration,
  planSortMotion,
  type SortMotion,
} from "./animation-planner";
import type { HighlightRole, VisualizationState } from "./engine";

export type PixiSortingTheme = "dark" | "light";

export type PixiSortingFrame = Pick<
  VisualizationState,
  "array" | "highlights" | "lastStep" | "status" | "stepSequence"
>;

type Palette = Record<"base" | HighlightRole | "aborted", number>;

type VisualBar = {
  graphic: NineSliceSprite;
  id: number;
  node: Container;
  value: number;
};

type BarSize = {
  height: number;
  width: number;
};

type LayoutMetrics = {
  barWidth: number;
  baseline: number;
  height: number;
  maxBarHeight: number;
  maxValue: number;
  paddingX: number;
  slotWidth: number;
  width: number;
};

type ActiveAnimation = {
  duration: number;
  elapsed: number;
  finish: () => void;
  update: (easedProgress: number, linearProgress: number) => void;
};

const PALETTES: Record<PixiSortingTheme, Palette> = {
  dark: {
    aborted: 0xf97316,
    active: 0x38bdf8,
    base: 0x94a3b8,
    candidate: 0x22c55e,
    deleted: 0xf97316,
    pivot: 0xf59e0b,
    sorted: 0x7dd3fc,
  },
  light: {
    aborted: 0xb45309,
    active: 0x0787a8,
    base: 0x8aa0b4,
    candidate: 0x087f5b,
    deleted: 0xb45309,
    pivot: 0xc98200,
    sorted: 0x036b87,
  },
};

const BAR_PADDING_X = 14;
const BAR_PADDING_TOP = 32;
const BAR_PADDING_BOTTOM = 26;
const BAR_CORNER_RADIUS = 6;
const BAR_TEXTURE_SIZE = 18;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

export class PixiSortingRenderer {
  private readonly app = new Application();
  private readonly root = new Container({ label: "sorting-bars", sortableChildren: true });
  private readonly host: HTMLElement;
  private activeAnimation: ActiveAnimation | null = null;
  private barTexture: Texture | null = null;
  private bars: VisualBar[] = [];
  private currentArray: number[] = [];
  private destroyed = false;
  private lastFrame: PixiSortingFrame | null = null;
  private lastSequence = -1;
  private nextBarId = 1;
  private playbackStatus: VisualizationState["status"] = "idle";
  private resizeObserver: ResizeObserver | null = null;
  private theme: PixiSortingTheme = "dark";

  private constructor(host: HTMLElement) {
    this.host = host;
  }

  public static async create(host: HTMLElement) {
    const renderer = new PixiSortingRenderer(host);
    await renderer.initialize();
    return renderer;
  }

  private async initialize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);

    await this.app.init({
      antialias: false,
      autoDensity: true,
      autoStart: false,
      backgroundAlpha: 0,
      height,
      preference: "webgl",
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      width,
    });

    this.barTexture = this.createBarTexture();

    this.app.canvas.setAttribute("aria-hidden", "true");
    this.app.canvas.style.display = "block";
    this.app.canvas.style.height = "100%";
    this.app.canvas.style.width = "100%";
    this.host.replaceChildren(this.app.canvas);
    this.app.stage.addChild(this.root);
    this.app.ticker.maxFPS = 60;
    this.app.ticker.minFPS = 15;
    this.app.ticker.add(this.onTick);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
  }

  public renderFrame(frame: PixiSortingFrame, speed: number, theme: PixiSortingTheme, reducedMotion: boolean) {
    if (this.destroyed) return;

    this.playbackStatus = frame.status;
    this.setTheme(theme);
    const isNewStep = frame.stepSequence !== this.lastSequence;

    if (
      this.lastSequence < 0 ||
      frame.stepSequence === 0 ||
      frame.lastStep === null
    ) {
      this.finishActiveAnimation();
      this.rebuildBars(frame.array);
      this.lastSequence = frame.stepSequence;
      this.lastFrame = frame;
      this.currentArray = [...frame.array];
      this.applyHighlights(frame.highlights);
      this.app.render();
      if (frame.status === "running") this.app.start();
      else this.app.stop();
      return;
    }

    if (!isNewStep) {
      this.lastFrame = frame;
      this.applyHighlights(frame.highlights);
      this.app.render();
      if (frame.status === "running") this.app.start();
      else this.app.stop();
      return;
    }

    this.finishActiveAnimation();
    const previousArray = [...this.currentArray];
    const motion = planSortMotion(frame.lastStep, previousArray);
    const duration = getPixiAnimationDuration(speed, reducedMotion);
    this.lastSequence = frame.stepSequence;
    this.lastFrame = frame;
    this.playMotion(motion, frame, duration);
  }

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.finishActiveAnimation();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.app.ticker.remove(this.onTick);
    this.app.stop();
    this.root.destroy({ children: true });
    this.barTexture?.destroy(true);
    this.barTexture = null;
    this.app.destroy(
      { releaseGlobalResources: true, removeView: true },
      { children: true },
    );
    this.host.replaceChildren();
  }

  private readonly onTick = (ticker: Ticker) => {
    const animation = this.activeAnimation;
    if (!animation) return;

    animation.elapsed += ticker.deltaMS;
    const linearProgress = clamp(animation.elapsed / Math.max(1, animation.duration));
    animation.update(easeInOutCubic(linearProgress), linearProgress);

    if (linearProgress >= 1) {
      this.activeAnimation = null;
      animation.finish();
      this.app.render();
      if (this.playbackStatus !== "running") this.app.stop();
    }
  };

  private resize() {
    if (this.destroyed) return;
    const width = Math.max(1, Math.round(this.host.clientWidth));
    const height = Math.max(1, Math.round(this.host.clientHeight));
    if (this.app.screen.width === width && this.app.screen.height === height) return;

    this.finishActiveAnimation();
    this.app.renderer.resize(width, height);
    if (this.lastFrame) {
      this.layoutBars(this.lastFrame.array);
      this.applyHighlights(this.lastFrame.highlights);
    }
    this.app.render();
  }

  private setTheme(theme: PixiSortingTheme) {
    if (this.theme === theme) return;
    this.theme = theme;
    if (this.lastFrame) this.applyHighlights(this.lastFrame.highlights);
  }

  private playMotion(motion: SortMotion, frame: PixiSortingFrame, duration: number) {
    if (motion.kind === "compare" || motion.kind === "mark") {
      this.playFocus(motion.indices, frame, duration * (motion.kind === "compare" ? 0.62 : 0.72));
      return;
    }
    if (motion.kind === "swap") {
      this.playSwap(motion.indices, frame, duration);
      return;
    }
    if (motion.kind === "write") {
      this.playWrite(motion, frame, duration);
      return;
    }
    if (motion.kind === "delete") {
      this.playDelete(motion.index, frame, duration);
      return;
    }
    if (motion.kind === "shuffle") {
      this.playShuffle(frame, duration);
      return;
    }
    if (motion.kind === "timer") {
      this.playTimer(motion, frame, duration * motion.durationWeight);
      return;
    }
    if (motion.kind === "done") {
      this.playDone(frame, duration);
      return;
    }
    if (motion.kind === "aborted") {
      this.playAborted(frame, duration);
      return;
    }
    this.playMessage(frame, duration * 0.5);
  }

  private playFocus(indices: number[], frame: PixiSortingFrame, duration: number) {
    const targets = indices.map((index) => this.bars[index]).filter(Boolean);
    const targetSizes = this.captureBarSizes(targets);
    const baseline = this.getMetrics(this.currentArray).baseline;

    this.startAnimation(duration, (easedProgress, linearProgress) => {
      const pulse = Math.sin(Math.PI * linearProgress);
      targets.forEach((bar, order) => {
        const delayedPulse = pulse * (1 - order * 0.04);
        bar.node.y = baseline - 7 * delayedPulse;
        this.setScaledBarSize(
          bar,
          targetSizes.get(bar.id),
          1 + 0.06 * delayedPulse,
          1 + 0.08 * delayedPulse,
        );
      });
      this.applyHighlights(frame.highlights);
      void easedProgress;
    }, () => this.finalizeFrame(frame));
  }

  private playSwap(indices: [number, number], frame: PixiSortingFrame, duration: number) {
    const [firstIndex, secondIndex] = indices;
    if (
      firstIndex < 0 ||
      secondIndex < 0 ||
      firstIndex >= this.bars.length ||
      secondIndex >= this.bars.length ||
      frame.array.length !== this.bars.length
    ) {
      this.playGenericArrayTransition(frame, duration);
      return;
    }

    const metrics = this.getMetrics(frame.array);
    const first = this.bars[firstIndex];
    const second = this.bars[secondIndex];
    const firstStartX = first.node.x;
    const secondStartX = second.node.x;
    const firstTargetX = this.xForSlot(secondIndex, metrics);
    const secondTargetX = this.xForSlot(firstIndex, metrics);
    const laneHeight = Math.min(30, Math.max(14, metrics.slotWidth * 0.75));
    const crossed = getCrossedIndices(firstIndex, secondIndex)
      .map((index) => ({ bar: this.bars[index], startX: this.bars[index]?.node.x ?? 0 }))
      .filter((entry) => entry.bar && entry.bar !== first && entry.bar !== second);
    const crossedSizes = this.captureBarSizes(crossed.map(({ bar }) => bar));
    const crossingDirection = firstIndex < secondIndex ? -1 : 1;

    [this.bars[firstIndex], this.bars[secondIndex]] = [second, first];
    first.node.zIndex = 3;
    second.node.zIndex = 2;

    this.startAnimation(duration, (easedProgress, linearProgress) => {
      const arc = Math.sin(Math.PI * linearProgress);
      first.node.x = lerp(firstStartX, firstTargetX, easedProgress);
      first.node.y = metrics.baseline - laneHeight * arc;
      second.node.x = lerp(secondStartX, secondTargetX, easedProgress);
      second.node.y = metrics.baseline + laneHeight * arc;

      crossed.forEach(({ bar, startX }, order) => {
        const localProgress = clamp((linearProgress - order * 0.04) / 0.82);
        const ripple = Math.sin(Math.PI * localProgress);
        bar.node.x = startX + crossingDirection * metrics.slotWidth * 0.18 * ripple;
        this.setScaledBarSize(bar, crossedSizes.get(bar.id), 1 - 0.1 * ripple, 1);
        bar.node.y = metrics.baseline + 4 * ripple;
      });
      this.applyHighlights(frame.highlights);
    }, () => this.finalizeFrame(frame));
  }

  private playWrite(motion: Extract<SortMotion, { kind: "write" }>, frame: PixiSortingFrame, duration: number) {
    if (
      motion.index < 0 ||
      motion.index >= this.bars.length ||
      frame.array.length !== this.bars.length
    ) {
      this.playGenericArrayTransition(frame, duration);
      return;
    }

    const metrics = this.getMetrics(frame.array);
    const target = this.bars[motion.index];
    const previousValue = target.value;
    const nextValue = frame.array[motion.index] ?? previousValue;
    const sourceIndex = motion.semantic !== "value-update" && motion.sourceIndex !== null && motion.sourceIndex >= 0 && motion.sourceIndex < this.bars.length
      ? motion.sourceIndex
      : null;
    const startX = sourceIndex === null ? target.node.x : this.bars[sourceIndex].node.x;
    const targetX = this.xForSlot(motion.index, metrics);
    const laneDirection = motion.lane === "lower" ? 1 : -1;
    const laneHeight = Math.min(34, Math.max(16, metrics.slotWidth));
    const crossed = sourceIndex === null
      ? []
      : getCrossedIndices(sourceIndex, motion.index)
        .map((index) => ({ bar: this.bars[index], startX: this.bars[index]?.node.x ?? 0 }))
        .filter((entry) => entry.bar && entry.bar !== target);
    const crossedSizes = this.captureBarSizes(crossed.map(({ bar }) => bar));
    const shiftDirection = sourceIndex !== null && sourceIndex < motion.index ? -1 : 1;
    const ghost = sourceIndex === null ? null : this.createVisualBar(nextValue);

    if (ghost) {
      this.setBarGeometry(ghost, nextValue, metrics);
      ghost.node.x = startX;
      ghost.node.y = metrics.baseline;
      ghost.node.alpha = 0.88;
      ghost.node.zIndex = 4;
      ghost.graphic.tint = PALETTES[this.theme].candidate;
    }

    this.startAnimation(duration, (easedProgress, linearProgress) => {
      const arc = Math.sin(Math.PI * linearProgress);
      const nextHeight = lerp(previousValue, nextValue, easedProgress);
      this.setBarGeometry(target, nextHeight, metrics);
      target.node.alpha = 0.55 + 0.45 * easedProgress;
      target.graphic.setSize(Math.max(1, metrics.barWidth * (1 - 0.08 * arc)), target.graphic.height);

      if (ghost) {
        ghost.node.x = lerp(startX, targetX, easedProgress);
        ghost.node.y = metrics.baseline + laneDirection * laneHeight * arc;
        ghost.node.alpha = 0.88 * (1 - clamp((linearProgress - 0.78) / 0.22));
      }

      crossed.forEach(({ bar, startX: crossedStartX }, order) => {
        const localProgress = clamp((linearProgress - order * 0.05) / 0.8);
        const ripple = Math.sin(Math.PI * localProgress);
        bar.node.x = crossedStartX + shiftDirection * metrics.slotWidth * 0.22 * ripple;
        this.setScaledBarSize(bar, crossedSizes.get(bar.id), 1 - 0.12 * ripple, 1);
        bar.node.y = metrics.baseline + 5 * ripple;
      });
      this.applyHighlights(frame.highlights);
    }, () => {
      ghost?.node.destroy({ children: true });
      this.finalizeFrame(frame);
    });
  }

  private playDelete(index: number, frame: PixiSortingFrame, duration: number) {
    if (index < 0 || index >= this.bars.length || frame.array.length !== this.bars.length - 1) {
      this.playGenericArrayTransition(frame, duration);
      return;
    }

    const removed = this.bars[index];
    const removedSize = { height: removed.graphic.height, width: removed.graphic.width };
    const remaining = this.bars.filter((_, barIndex) => barIndex !== index);
    const starts = new Map(remaining.map((bar) => [bar.id, bar.node.x]));
    const metrics = this.getMetrics(frame.array);
    this.bars = remaining;
    removed.node.zIndex = 4;
    removed.graphic.tint = PALETTES[this.theme].deleted;

    this.startAnimation(duration, (easedProgress) => {
      removed.node.alpha = 1 - easedProgress;
      this.setScaledBarSize(
        removed,
        removedSize,
        1 - easedProgress * 0.55,
        1 - easedProgress * 0.9,
      );
      removed.node.y = metrics.baseline + easedProgress * 18;
      remaining.forEach((bar, slot) => {
        bar.node.x = lerp(starts.get(bar.id) ?? bar.node.x, this.xForSlot(slot, metrics), easedProgress);
      });
    }, () => {
      removed.node.destroy({ children: true });
      this.finalizeFrame(frame);
    });
  }

  private playShuffle(frame: PixiSortingFrame, duration: number) {
    if (frame.array.length !== this.bars.length) {
      this.playGenericArrayTransition(frame, duration);
      return;
    }

    const starts = new Map(this.bars.map((bar) => [bar.id, { x: bar.node.x, y: bar.node.y }]));
    const barSizes = this.captureBarSizes(this.bars);
    const { ordered, unused } = this.reorderBarsByValue(frame.array);
    const metrics = this.getMetrics(frame.array);
    this.bars = ordered;

    this.startAnimation(duration, (easedProgress, linearProgress) => {
      const arc = Math.sin(Math.PI * linearProgress);
      this.bars.forEach((bar, slot) => {
        const start = starts.get(bar.id) ?? { x: this.xForSlot(slot, metrics), y: metrics.baseline };
        bar.node.x = lerp(start.x, this.xForSlot(slot, metrics), easedProgress);
        bar.node.y = lerp(start.y, metrics.baseline, easedProgress) + (slot % 2 === 0 ? -1 : 1) * 18 * arc;
        this.setScaledBarSize(bar, barSizes.get(bar.id), 1 - 0.08 * arc, 1);
      });
      unused.forEach((bar) => {
        bar.node.alpha = 1 - easedProgress;
      });
    }, () => {
      unused.forEach((bar) => bar.node.destroy({ children: true }));
      this.finalizeFrame(frame);
    });
  }

  private playTimer(motion: Extract<SortMotion, { kind: "timer" }>, frame: PixiSortingFrame, duration: number) {
    const targets = motion.index === null ? this.bars : [this.bars[motion.index]].filter(Boolean);
    const targetSizes = this.captureBarSizes(targets);
    const metrics = this.getMetrics(this.currentArray);

    this.startAnimation(duration, (_easedProgress, linearProgress) => {
      targets.forEach((bar, order) => {
        const localProgress = clamp((linearProgress - order * 0.025) / 0.75);
        const pulse = Math.sin(Math.PI * localProgress);
        bar.node.y = metrics.baseline - 9 * pulse;
        this.setScaledBarSize(bar, targetSizes.get(bar.id), 1 + 0.04 * pulse, 1 + 0.1 * pulse);
        bar.node.alpha = 0.72 + 0.28 * (1 - pulse);
      });
    }, () => this.finalizeFrame(frame));
  }

  private playMessage(frame: PixiSortingFrame, duration: number) {
    this.startAnimation(duration, (_easedProgress, linearProgress) => {
      this.root.alpha = 0.92 + 0.08 * Math.cos(Math.PI * 2 * linearProgress);
    }, () => {
      this.root.alpha = 1;
      this.finalizeFrame(frame);
    });
  }

  private playDone(frame: PixiSortingFrame, duration: number) {
    if (frame.array.length !== this.bars.length) {
      this.playGenericArrayTransition(frame, duration);
      return;
    }

    const metrics = this.getMetrics(frame.array);
    const barSizes = this.captureBarSizes(this.bars);
    this.startAnimation(duration, (_easedProgress, linearProgress) => {
      this.bars.forEach((bar, index) => {
        const localProgress = clamp((linearProgress - index * 0.012) / 0.72);
        const pulse = Math.sin(Math.PI * localProgress);
        bar.graphic.tint = localProgress > 0.12 ? PALETTES[this.theme].sorted : PALETTES[this.theme].base;
        bar.node.y = metrics.baseline - 8 * pulse;
        this.setScaledBarSize(bar, barSizes.get(bar.id), 1, 1 + 0.08 * pulse);
      });
    }, () => this.finalizeFrame(frame));
  }

  private playAborted(frame: PixiSortingFrame, duration: number) {
    const starts = this.bars.map((bar) => bar.node.x);
    this.startAnimation(duration, (_easedProgress, linearProgress) => {
      const pulse = Math.sin(Math.PI * linearProgress);
      this.bars.forEach((bar, index) => {
        bar.graphic.tint = PALETTES[this.theme].aborted;
        bar.node.alpha = 1 - 0.25 * pulse;
        bar.node.x = starts[index] + (index % 2 === 0 ? -1 : 1) * 2 * pulse;
      });
    }, () => this.finalizeFrame(frame));
  }

  private playGenericArrayTransition(frame: PixiSortingFrame, duration: number) {
    const previousBars = [...this.bars];
    const keepCount = Math.min(previousBars.length, frame.array.length);
    const nextBars = previousBars.slice(0, keepCount);
    const removedBars = previousBars.slice(keepCount);
    const removedSizes = this.captureBarSizes(removedBars);

    for (let index = keepCount; index < frame.array.length; index += 1) {
      const created = this.createVisualBar(frame.array[index]);
      created.node.alpha = 0;
      nextBars.push(created);
    }

    const starts = new Map(nextBars.map((bar) => [bar.id, bar.node.x]));
    const previousValues = nextBars.map((bar) => bar.value);
    const metrics = this.getMetrics(frame.array);
    this.bars = nextBars;

    this.startAnimation(duration, (easedProgress) => {
      nextBars.forEach((bar, slot) => {
        const nextValue = frame.array[slot] ?? bar.value;
        bar.node.x = lerp(starts.get(bar.id) ?? this.xForSlot(slot, metrics), this.xForSlot(slot, metrics), easedProgress);
        bar.node.y = metrics.baseline;
        bar.node.alpha = Math.max(bar.node.alpha, easedProgress);
        this.setBarGeometry(bar, lerp(previousValues[slot] ?? nextValue, nextValue, easedProgress), metrics);
      });
      removedBars.forEach((bar) => {
        bar.node.alpha = 1 - easedProgress;
        this.setScaledBarSize(bar, removedSizes.get(bar.id), 1, 1 - easedProgress);
      });
    }, () => {
      removedBars.forEach((bar) => bar.node.destroy({ children: true }));
      this.finalizeFrame(frame);
    });
  }

  private startAnimation(
    duration: number,
    update: ActiveAnimation["update"],
    finish: ActiveAnimation["finish"],
  ) {
    if (duration <= 0) {
      update(1, 1);
      finish();
      this.app.render();
      if (this.playbackStatus !== "running") this.app.stop();
      return;
    }

    this.activeAnimation = { duration, elapsed: 0, finish, update };
    update(0, 0);
    this.app.start();
  }

  private finishActiveAnimation() {
    const animation = this.activeAnimation;
    if (!animation) return;
    this.activeAnimation = null;
    animation.update(1, 1);
    animation.finish();
    this.app.render();
  }

  private finalizeFrame(frame: PixiSortingFrame) {
    if (this.bars.length !== frame.array.length) {
      this.rebuildBars(frame.array);
    } else {
      this.bars.forEach((bar, index) => {
        bar.value = frame.array[index];
      });
      this.layoutBars(frame.array);
    }

    this.root.alpha = 1;
    this.currentArray = [...frame.array];
    this.lastFrame = frame;
    this.applyHighlights(frame.highlights);
  }

  private rebuildBars(array: number[]) {
    this.bars.forEach((bar) => bar.node.destroy({ children: true }));
    this.bars = array.map((value) => this.createVisualBar(value));
    this.layoutBars(array);
  }

  private createBarTexture() {
    const source = new Graphics()
      .roundRect(0, 0, BAR_TEXTURE_SIZE, BAR_TEXTURE_SIZE, BAR_CORNER_RADIUS)
      .fill(0xffffff);
    const texture = this.app.renderer.generateTexture({
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      target: source,
      textureSourceOptions: { scaleMode: "linear" },
    });
    source.destroy();
    return texture;
  }

  private createVisualBar(value: number): VisualBar {
    if (!this.barTexture) {
      throw new Error("Pixi 柱形纹理尚未初始化。");
    }

    const graphic = new NineSliceSprite({
      anchor: { x: 0.5, y: 1 },
      bottomHeight: BAR_CORNER_RADIUS,
      height: 1,
      leftWidth: BAR_CORNER_RADIUS,
      rightWidth: BAR_CORNER_RADIUS,
      texture: this.barTexture,
      topHeight: BAR_CORNER_RADIUS,
      width: 1,
    });
    const node = new Container({ label: `sorting-bar-${this.nextBarId}` });
    const bar = { graphic, id: this.nextBarId, node, value };
    this.nextBarId += 1;
    node.addChild(graphic);
    this.root.addChild(node);
    return bar;
  }

  private reorderBarsByValue(array: number[]) {
    const queues = new Map<number, VisualBar[]>();
    this.bars.forEach((bar) => {
      const queue = queues.get(bar.value) ?? [];
      queue.push(bar);
      queues.set(bar.value, queue);
    });

    const ordered = array.map((value) => queues.get(value)?.shift() ?? this.createVisualBar(value));
    const used = new Set(ordered.map((bar) => bar.id));
    const unused = this.bars.filter((bar) => !used.has(bar.id));
    return { ordered, unused };
  }

  private layoutBars(array: number[]) {
    const metrics = this.getMetrics(array);
    this.bars.forEach((bar, slot) => {
      bar.node.alpha = 1;
      bar.node.position.set(this.xForSlot(slot, metrics), metrics.baseline);
      bar.node.zIndex = 0;
      this.setBarGeometry(bar, array[slot] ?? bar.value, metrics);
    });
  }

  private setBarGeometry(bar: VisualBar, value: number, metrics: LayoutMetrics) {
    const height = Math.max(8, (Math.max(0, value) / metrics.maxValue) * metrics.maxBarHeight);
    bar.graphic.setSize(metrics.barWidth, height);
  }

  private captureBarSizes(bars: VisualBar[]) {
    return new Map<number, BarSize>(
      bars.map((bar) => [bar.id, { height: bar.graphic.height, width: bar.graphic.width }]),
    );
  }

  private setScaledBarSize(
    bar: VisualBar,
    size: BarSize | undefined,
    widthScale: number,
    heightScale: number,
  ) {
    if (!size) return;
    bar.graphic.setSize(
      Math.max(1, size.width * widthScale),
      Math.max(1, size.height * heightScale),
    );
  }

  private applyHighlights(highlights: Map<number, HighlightRole>) {
    const palette = PALETTES[this.theme];
    this.bars.forEach((bar, index) => {
      bar.graphic.tint = palette[highlights.get(index) ?? "base"];
    });
  }

  private getMetrics(array: number[]): LayoutMetrics {
    const width = Math.max(1, this.app.screen.width);
    const height = Math.max(1, this.app.screen.height);
    const count = Math.max(1, array.length);
    const usableWidth = Math.max(1, width - BAR_PADDING_X * 2);
    const slotWidth = usableWidth / count;
    const gap = count > 160 ? 1 : Math.min(4, slotWidth * 0.18);
    const barWidth = Math.max(1, slotWidth - gap);
    const baseline = Math.max(BAR_PADDING_TOP + 8, height - BAR_PADDING_BOTTOM);
    const maxBarHeight = Math.max(8, baseline - BAR_PADDING_TOP);

    return {
      barWidth,
      baseline,
      height,
      maxBarHeight,
      maxValue: Math.max(...array, 1),
      paddingX: BAR_PADDING_X,
      slotWidth,
      width,
    };
  }

  private xForSlot(slot: number, metrics: LayoutMetrics) {
    return metrics.paddingX + metrics.slotWidth * (slot + 0.5);
  }
}
