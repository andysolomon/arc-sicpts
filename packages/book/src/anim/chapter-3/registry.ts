import type { ReactNode } from 'react';

/**
 * Chapter 3's animations, registered per section so that each section's
 * scenes live in a file of their own: `section-3.3.tsx` exports the scenes
 * that §3.3 places under its editors, by kind. `Animation.tsx` merges them.
 */

export interface SceneProps {
  /** The program as the editor currently has it. */
  source: string;
  /** For step-mode editors: the stepper's record index. */
  stepIndex?: number | undefined;
  /** Declarations the Example evaluates, unseen, before the program. */
  prelude?: string | undefined;
}

export type SceneRegistry = Record<string, (props: SceneProps) => ReactNode>;
