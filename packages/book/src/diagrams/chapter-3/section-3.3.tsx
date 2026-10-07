import type { ComponentType } from 'react';
import { BoxPointerDiagram } from './BoxPointerDiagram.tsx';

/** Diagrams §3.3's MDX can use without importing, by component name. */
export const diagrams = { BoxPointerDiagram } satisfies Record<string, ComponentType<any>>;
