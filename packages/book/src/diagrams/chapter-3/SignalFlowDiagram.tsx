import { useId, type ReactNode } from 'react';
import { Stage } from '../../anim/svg.tsx';
import { Figure } from '../Figure.tsx';
import { ADDER_RADIUS, BOX_HEIGHT, boxWidth, signalFigures, toPath, wirePoints, type SignalFigure, type SignalNode } from './signalFlow.ts';

/** A signal-flow diagram: boxes, adders and the wires between them, with arrows showing which way each signal flows. */

export interface SignalFlowProps {
  figure: SignalFigure;
  /** What the drawing shows, for screen readers. */
  label: string;
}

function PortLabel({ node }: { node: SignalNode }) {
  if (node.label === undefined) return null;
  const side = node.side ?? 'above';
  const dx = side === 'left' ? -8 : side === 'right' ? 8 : 0;
  const dy = side === 'above' ? -9 : side === 'below' ? 16 : 4;
  const anchor = side === 'left' ? 'end' : side === 'right' ? 'start' : node.x < 60 ? 'start' : node.x > 480 ? 'end' : 'middle';
  return (
    <text x={node.x + dx} y={node.y + dy} textAnchor={anchor} fontSize={12} className="fill-ink-2">
      {node.label}
    </text>
  );
}

function Node({ node }: { node: SignalNode }) {
  switch (node.kind) {
    case 'box': {
      const w = boxWidth(node);
      return (
        <g data-testid="signal-node" data-kind="box">
          <rect x={node.x - w / 2} y={node.y - BOX_HEIGHT / 2} width={w} height={BOX_HEIGHT} rx={6} className="fill-paper-2 stroke-ink-3" strokeWidth={1.2} />
          <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central" fontSize={12} className="fill-ink">
            {node.label}
          </text>
        </g>
      );
    }
    case 'adder':
      return (
        <g data-testid="signal-node" data-kind="adder">
          <circle cx={node.x} cy={node.y} r={ADDER_RADIUS} className="fill-paper-2 stroke-ink-3" strokeWidth={1.2} />
          <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central" fontSize={15} className="fill-ink">
            +
          </text>
          {node.label !== undefined && (
            <text x={node.x + ADDER_RADIUS + 4} y={node.y - ADDER_RADIUS} fontSize={10.5} className="fill-ink-3">
              {node.label}
            </text>
          )}
        </g>
      );
    case 'tap':
      return <circle data-testid="signal-node" data-kind="tap" cx={node.x} cy={node.y} r={3.2} className="fill-ink-2" />;
    case 'port':
      return (
        <g data-testid="signal-node" data-kind="port">
          <PortLabel node={node} />
        </g>
      );
  }
}

/** The drawing alone, for use inside a `<Figure>`. */
export function SignalFlow({ figure, label }: SignalFlowProps) {
  const marker = `signal-arrow-${useId().replace(/:/g, '')}`;
  return (
    <Stage width={figure.width} height={figure.height} label={label} maxHeight={320}>
      <defs>
        <marker id={marker} viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-2" />
        </marker>
      </defs>
      {figure.edges.map((edge, k) => (
        <g key={k} data-testid="signal-wire">
          <path d={toPath(wirePoints(figure, edge))} fill="none" className="stroke-ink-2" strokeWidth={1.3} strokeLinejoin="round" markerEnd={figure.nodes.find((n) => n.id === edge.to)?.kind === 'tap' ? undefined : `url(#${marker})`} />
          {edge.label !== undefined && edge.at !== undefined && (
            <text x={edge.at[0]} y={edge.at[1]} fontSize={11.5} className="fill-accent-ink">
              {edge.label}
            </text>
          )}
        </g>
      ))}
      {figure.nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </Stage>
  );
}

interface DiagramProps {
  caption?: ReactNode;
}

const provenance = 'a signal-flow diagram';

export function SignalIntegralDiagram({ caption }: DiagramProps) {
  return (
    <Figure title="integral as a signal-processing system" provenance={provenance} caption={caption}>
      <SignalFlow figure={signalFigures.integral} label="The input is scaled by dt and added to the output, which is fed back into the adder; pair puts the initial value in front." />
    </Figure>
  );
}

export function SignalSolveDiagram({ caption }: DiagramProps) {
  return (
    <Figure title="A loop that solves dy/dt = f(y)" provenance={provenance} caption={caption}>
      <SignalFlow figure={signalFigures.solve} label="integral turns dy into y, starting from y0; map f turns y back into dy, which feeds the integral." />
    </Figure>
  );
}

export function SignalSecondOrderDiagram({ caption }: DiagramProps) {
  return (
    <Figure title="Solving d²y/dt² = a dy/dt + b y" provenance={provenance} caption={caption}>
      <SignalFlow figure={signalFigures.secondOrder} label="Two integrators in a row turn ddy into dy and dy into y; dy scaled by a and y scaled by b are added to make ddy." />
    </Figure>
  );
}

export function SignalRlcDiagram({ caption }: DiagramProps) {
  return (
    <Figure title="A series RLC circuit as signals" provenance={provenance} caption={caption}>
      <SignalFlow figure={signalFigures.rlc} label="Two integrators produce v_C and i_L. dv_C is i_L scaled by −1/C; di_L is v_C scaled by 1/L plus i_L scaled by −R/L." />
    </Figure>
  );
}

export function ParadigmJointAccountDiagram({ caption }: DiagramProps) {
  return (
    <Figure title="A joint account as streams" provenance={provenance} caption={caption}>
      <SignalFlow figure={signalFigures.jointAccount} label="Peter's and Paul's streams of requests are merged into one stream that feeds the bank account, which produces a stream of balances." />
    </Figure>
  );
}

/** The RC circuit itself: a resistor and a capacitor in series, driven by a current i. */
function RcSchematic() {
  const wire = 'stroke-ink-2';
  return (
    <Stage width={630} height={120} label="An RC circuit: current i flows through a resistor R and a capacitor C in series; v is the voltage across both." maxHeight={160}>
      <path d="M 60 60 L 150 60" className={wire} fill="none" strokeWidth={1.4} />
      <path d="M 150 60 l 8 -10 l 14 20 l 14 -20 l 14 20 l 14 -20 l 14 20 l 8 -10" className={wire} fill="none" strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M 236 60 L 320 60 M 320 40 L 320 80 M 334 40 L 334 80 M 334 60 L 420 60" className={wire} fill="none" strokeWidth={1.4} />
      <circle cx={60} cy={60} r={3} className="fill-ink-2" />
      <circle cx={420} cy={60} r={3} className="fill-ink-2" />
      <path d="M 82 48 L 112 48" className={wire} strokeWidth={1.2} />
      <path d="M 106 44 L 114 48 L 106 52" className={wire} fill="none" strokeWidth={1.2} />
      <text x={94} y={40} textAnchor="middle" fontSize={12} className="fill-ink-2">i</text>
      <text x={193} y={92} textAnchor="middle" fontSize={12} className="fill-ink-2">R</text>
      <text x={327} y={98} textAnchor="middle" fontSize={12} className="fill-ink-2">C</text>
      <text x={52} y={98} fontSize={13} className="fill-ink-2">+</text>
      <text x={414} y={98} fontSize={13} className="fill-ink-2">−</text>
      <path d="M 70 104 L 410 104" className="stroke-line" strokeWidth={1} strokeDasharray="4 3" />
      <text x={240} y={118} textAnchor="middle" fontSize={12} className="fill-ink-2">v</text>
      <text x={528} y={64} textAnchor="middle" fontSize={12.5} className="fill-ink">
        v = v0 + (1/C)∫i dt + R i
      </text>
    </Stage>
  );
}

export function SignalRcCircuitDiagram({ caption }: DiagramProps) {
  return (
    <Figure title="An RC circuit and its signal-flow diagram" provenance={provenance} caption={caption}>
      <RcSchematic />
      <SignalFlow figure={signalFigures.rc} label="The current i is scaled by R, and also scaled by 1/C and integrated from v0; the two are added to give v." />
    </Figure>
  );
}
