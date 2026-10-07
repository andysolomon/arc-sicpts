import type { ComponentType } from 'react';

/** Diagrams §3.1's MDX can use without importing, by component name. */
export const diagrams = {} satisfies Record<string, ComponentType<any>>;
