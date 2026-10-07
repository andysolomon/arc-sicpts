import type { ComponentType } from 'react';
import { TimingDiagram } from './ConcurrencyTimingDiagram.tsx';

/** Diagrams §3.4's MDX can use without importing, by component name. */
export const diagrams = { TimingDiagram } satisfies Record<string, ComponentType<any>>;
