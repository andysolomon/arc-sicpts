import type { ComponentType } from 'react';
import {
  FullAdderDiagram,
  HalfAdderDiagram,
  PrimitiveGatesDiagram,
  RippleCarryAdderDiagram,
} from '../CircuitDiagrams.tsx';
import { CelsiusFahrenheitDiagram } from '../ConstraintNetwork.tsx';

/** Diagrams §3.3.4–§3.3.5's MDX can use without importing, by component name. */
export const diagrams = {
  PrimitiveGatesDiagram,
  HalfAdderDiagram,
  FullAdderDiagram,
  RippleCarryAdderDiagram,
  CelsiusFahrenheitDiagram,
} satisfies Record<string, ComponentType<any>>;
