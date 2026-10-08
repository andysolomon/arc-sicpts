import { EditionContext } from '../editions/context.ts';
import { useReducedMotion } from 'motion/react';
import { useCallback, useContext, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * A scrubbable timeline over `count` keyframes. It starts playing by itself
 * the first time its stage scrolls into view, pauses when the stage leaves,
 * and never autoplays for readers who prefer reduced motion.
 */

export interface Player {
  /** The keyframe on screen, 0-based. */
  index: number;
  count: number;
  playing: boolean;
  /** True at the last keyframe. */
  atEnd: boolean;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(index: number): void;
  next(): void;
  prev(): void;
}

export interface PlayerOptions {
  /** The element whose visibility starts playback. */
  stage: RefObject<Element | null>;
  /** Milliseconds between keyframes. */
  msPerStep?: number;
  /** Changing this restarts the timeline from the first keyframe. */
  resetKey?: unknown;
  /** Play once on first sight; defaults to true. */
  autoplay?: boolean;
}

export const DEFAULT_MS_PER_STEP = 1100;

export function usePlayer(count: number, { stage, msPerStep = DEFAULT_MS_PER_STEP, resetKey, autoplay = true }: PlayerOptions): Player {
  const edition = useContext(EditionContext);
  const reduced = useReducedMotion() === true;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const started = useRef(false);
  const last = Math.max(0, count - 1);

  // A new timeline (new trace, new program) starts over and may autoplay again.
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    started.current = false;
  }, [resetKey]);

  useEffect(() => {
    const element = stage.current;
    if (element === null || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.4);
      },
      { threshold: [0, 0.4, 1] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    if (!visible) {
      setPlaying(false);
      return;
    }
    if (edition === null && autoplay && !reduced && !started.current && count > 1) {
      started.current = true;
      setPlaying(true);
    }
  }, [autoplay, count, edition, reduced, visible]);

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((current) => Math.min(current + 1, last)), reduced ? 0 : msPerStep);
    return () => window.clearTimeout(timer);
  }, [index, last, msPerStep, playing, reduced]);

  // Scrubbing takes over from autoplay.
  const seek = useCallback(
    (target: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(last, Math.round(target))));
    },
    [last],
  );
  const play = useCallback(() => {
    started.current = true;
    setIndex((current) => (current >= last ? 0 : current));
    setPlaying(true);
  }, [last]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [pause, play, playing]);
  const next = useCallback(() => {
    setPlaying(false);
    setIndex((current) => Math.min(current + 1, last));
  }, [last]);
  const prev = useCallback(() => {
    setPlaying(false);
    setIndex((current) => Math.max(current - 1, 0));
  }, []);

  return { index: edition === null ? Math.min(index, last) : last, count, playing: edition === null && playing, atEnd: edition !== null || index >= last, play, pause, toggle, seek, next, prev };
}
