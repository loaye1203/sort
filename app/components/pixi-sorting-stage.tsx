"use client";

import { useEffect, useRef, useState } from "react";
import type { VisualizationState } from "../../lib/sorting/engine";
import type {
  PixiSortingRenderer,
  PixiSortingTheme,
} from "../../lib/sorting/pixi-sorting-renderer";

type PixiSortingStageProps = {
  className?: string;
  onReady: () => void;
  onUnavailable: () => void;
  speed: number;
  state: VisualizationState;
  theme: PixiSortingTheme;
};

export function PixiSortingStage(props: PixiSortingStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiSortingRenderer | null>(null);
  const latestPropsRef = useRef(props);
  const onReadyRef = useRef(props.onReady);
  const onUnavailableRef = useRef(props.onUnavailable);
  const [reducedMotion, setReducedMotion] = useState(false);

  latestPropsRef.current = props;
  onReadyRef.current = props.onReady;
  onUnavailableRef.current = props.onUnavailable;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let renderer: PixiSortingRenderer | null = null;

    async function initialize() {
      const host = hostRef.current;
      if (!host) return;

      try {
        const module = await import("../../lib/sorting/pixi-sorting-renderer");
        renderer = await module.PixiSortingRenderer.create(host);
        if (cancelled) {
          renderer.destroy();
          return;
        }

        rendererRef.current = renderer;
        const latest = latestPropsRef.current;
        renderer.renderFrame(latest.state, latest.speed, latest.theme, reducedMotion);
        onReadyRef.current();
      } catch {
        if (!cancelled) onUnavailableRef.current();
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      rendererRef.current = null;
      renderer?.destroy();
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.renderFrame(props.state, props.speed, props.theme, reducedMotion);
  }, [props.speed, props.state, props.theme, reducedMotion]);

  return <div ref={hostRef} className={props.className} data-pixi-sorting-stage />;
}
