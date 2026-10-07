import type { ComponentType } from 'react';
import { SieveDiagram } from './SieveDiagram.tsx';

/** Diagrams §3.5's MDX can use without importing, by component name. */
export const diagrams = { SieveDiagram } satisfies Record<string, ComponentType<any>>;
