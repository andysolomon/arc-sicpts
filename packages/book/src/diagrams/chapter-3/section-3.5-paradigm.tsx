import type { ComponentType } from 'react';

/** Diagrams §3.5.3–§3.5.5's MDX can use without importing, by component name. */
export const diagrams = {} satisfies Record<string, ComponentType<any>>;
