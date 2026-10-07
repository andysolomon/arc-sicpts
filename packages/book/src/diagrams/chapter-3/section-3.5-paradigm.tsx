import type { ComponentType } from 'react';
import { PairsDecompositionDiagram } from './PairsDecompositionDiagram.tsx';
import {
  ParadigmJointAccountDiagram,
  SignalIntegralDiagram,
  SignalRcCircuitDiagram,
  SignalRlcDiagram,
  SignalSecondOrderDiagram,
  SignalSolveDiagram,
} from './SignalFlowDiagram.tsx';

/** Diagrams §3.5.3–§3.5.5's MDX can use without importing, by component name. */
export const diagrams = {
  PairsDecompositionDiagram,
  SignalIntegralDiagram,
  SignalRcCircuitDiagram,
  SignalSolveDiagram,
  SignalSecondOrderDiagram,
  SignalRlcDiagram,
  ParadigmJointAccountDiagram,
} satisfies Record<string, ComponentType<any>>;
