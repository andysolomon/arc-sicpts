import type { ComponentType } from 'react';
import { EnvModelSimpleDiagram } from './EnvModelDiagrams.tsx';

/** Diagrams §3.2's MDX can use without importing, by component name. */
export const diagrams = { EnvModelSimpleDiagram } satisfies Record<string, ComponentType<any>>;
