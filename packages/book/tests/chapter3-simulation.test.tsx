import {
  celsiusFahrenheitProgram,
  constraintContradictionProgram,
  constraintNetworkProgram,
  createLabHost,
  fullAdderSimulationProgram,
  halfAdderSimulationProgram,
  halfAdderWiresProgram,
  type LabEvent,
} from '@sicp/lab';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Animation } from '../src/anim/Animation.tsx';
import { probeEvents, timingCaption, timingRows } from '../src/anim/model/circuitTiming.ts';
import { constraintCaption, constraintEvents, networkConnector, valuesAt } from '../src/anim/model/constraintProbes.ts';
import { CircuitTimingScene } from '../src/anim/scenes/CircuitTimingScene.tsx';
import { ConstraintScene } from '../src/anim/scenes/ConstraintScene.tsx';
import type { Trace } from '../src/anim/useTrace.ts';
import { diagrams } from '../src/diagrams/chapter-3/section-3.3-simulation.tsx';

// jsdom has no IntersectionObserver; the figures fade in with motion's whileInView, which needs one.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

/** The trace the scenes ask for: a budget large enough for a whole simulation, and one record. */
function simulationTrace(source: string): Trace {
  const events: LabEvent[] = [];
  const host = createLabHost({ post: (event) => events.push(event) });
  host.handle({ type: 'trace', id: 1, source, budget: 2_000_000, maxRecords: 1 });
  const done = events.find((event): event is Trace => event.type === 'trace-done');
  if (done === undefined) throw new Error('trace did not finish synchronously');
  return done;
}

describe('the timing diagram model', () => {
  const output = ['"sum 0, new value = 0"', '"carry 0, new value = 0"', '"sum 8, new value = 1"', 'something else', '"carry 11, new value = 1"', '"sum 16, new value = 0"'];

  it('reads one event per probe line and ignores other output', () => {
    expect(probeEvents(output)).toEqual([
      { wire: 'sum', time: 0, value: 0 },
      { wire: 'carry', time: 0, value: 0 },
      { wire: 'sum', time: 8, value: 1 },
      { wire: 'carry', time: 11, value: 1 },
      { wire: 'sum', time: 16, value: 0 },
    ]);
  });

  it('keeps one row per wire in the order the probes were attached, cut off at a keyframe', () => {
    const events = probeEvents(output);
    expect(timingRows(events, 2).map((row) => [row.wire, row.changes.map((c) => `${c.time}:${c.value}`)])).toEqual([
      ['sum', ['0:0', '8:1']],
      ['carry', ['0:0']],
    ]);
  });

  it('says what each keyframe shows, and sums up at the end', () => {
    const events = probeEvents(output);
    expect(timingCaption(events, 0)).toBe('Probing `sum` prints its signal at once: 0 at time 0.');
    expect(timingCaption(events, 2)).toBe('At time 8, `sum` becomes 1.');
    expect(timingCaption(events, 4)).toBe('At time 16, `sum` becomes 0. The agenda is empty: `sum` = 0, `carry` = 1.');
    const glitch = probeEvents(['"sum 21, new value = 0"', '"sum 21, new value = 1"']);
    expect(timingCaption(glitch, 1)).toMatch(/^At time 21 `sum` changes again, to 1/);
  });
});

describe('the constraint probe model', () => {
  it('reads values and lost values, and maps probe names onto the network', () => {
    const events = constraintEvents(['"Probe: Celsius temp = 25"', '"Probe: F = 77"', '"Probe: Celsius temp = ?"', 'noise']);
    expect(events).toEqual([
      { connector: 'Celsius temp', value: '25' },
      { connector: 'F', value: '77' },
      { connector: 'Celsius temp', value: null },
    ]);
    expect(networkConnector('Celsius temp')).toBe('C');
    expect(networkConnector('v')).toBe('v');
    expect(networkConnector('elsewhere')).toBeNull();
    expect([...valuesAt(events, 2)]).toEqual([
      ['Celsius temp', null],
      ['F', '77'],
    ]);
    expect(constraintCaption(events, 1)).toBe('`F` gets the value 77.');
    expect(constraintCaption(events, 2)).toBe('`Celsius temp` loses its value. Now known: `F` = 77.');
  });
});

describe('the circuit timing scene', () => {
  it("draws the book's half-adder run: sum rises at 8 and falls at 16, carry rises at 11", () => {
    render(<CircuitTimingScene trace={simulationTrace(halfAdderSimulationProgram)} />);
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 5');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } });
    const rows = screen.getAllByTestId('timing-row');
    expect(rows.map((row) => [row.dataset['wire'], row.dataset['value']])).toEqual([
      ['sum', '0'],
      ['carry', '1'],
    ]);
    expect(screen.getAllByTestId('timing-change')).toHaveLength(3);
    expect(screen.getAllByTestId('timing-tick').map((tick) => tick.textContent)).toEqual(['0', '8', '11', '16']);
    expect(screen.getByTestId('caption')).toHaveTextContent('The agenda is empty: sum = 0, carry = 1.');
  });

  it('draws all six wires of the hand-wired half-adder, and the full-adder in one run', () => {
    const { unmount } = render(<CircuitTimingScene trace={simulationTrace(halfAdderWiresProgram)} />);
    expect(screen.getAllByTestId('timing-row').map((row) => row.dataset['wire'])).toEqual(['a', 'b', 'd', 'c', 'e', 's']);
    unmount();
    render(<CircuitTimingScene trace={simulationTrace(fullAdderSimulationProgram)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '11' } });
    expect(screen.getByTestId('caption')).toHaveTextContent('At time 21 sum changes again, to 1');
  });

  it('asks for a probe when nothing was printed, and waits while the trace runs', () => {
    const { unmount } = render(<CircuitTimingScene trace={simulationTrace('1;')} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('Attach a probe with probe(name, wire)');
    unmount();
    render(<CircuitTimingScene trace={null} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('Running the simulation…');
  });

  it('is registered under its kind', () => {
    render(<Animation kind="circuit-timing" source={halfAdderSimulationProgram} />);
    expect(screen.getByRole('region', { name: 'Signals over simulated time' })).toBeInTheDocument();
  });
});

describe('the constraint scene', () => {
  it('fills in every connector of the network, and empties them again when C is forgotten', () => {
    render(<ConstraintScene trace={simulationTrace(constraintNetworkProgram)} />);
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 15');
    const value = (name: string) => screen.getAllByTestId('connector').find((c) => c.dataset['connector'] === name)?.dataset['value'];
    fireEvent.change(screen.getByRole('slider'), { target: { value: '6' } });
    expect(['C', 'F', 'u', 'v', 'w', 'x', 'y'].map(value)).toEqual(['25', '77', '225', '45', '9', '5', '32']);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '10' } });
    expect(['C', 'F', 'u', 'v', 'w'].map(value)).toEqual(['?', '?', '?', '?', '9']);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '14' } });
    expect(['C', 'F'].map(value)).toEqual(['100', '212']);
  });

  it("maps the book's probe names onto C and F, and reports a contradiction", () => {
    const { unmount } = render(<ConstraintScene trace={simulationTrace(celsiusFahrenheitProgram)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    const connector = (name: string) => screen.getAllByTestId('connector').find((c) => c.dataset['connector'] === name);
    expect(connector('C')?.dataset['value']).toBe('25');
    expect(connector('F')?.dataset['value']).toBe('77');
    expect(connector('u')?.dataset['value']).toBe('');
    unmount();
    render(<ConstraintScene trace={simulationTrace(constraintContradictionProgram)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    expect(screen.getByTestId('caption')).toHaveTextContent('contradiction');
  });
});

describe('the figures of §3.3.4 and §3.3.5', () => {
  it('draws the gates, the adders and the constraint network', () => {
    const { PrimitiveGatesDiagram, HalfAdderDiagram, FullAdderDiagram, RippleCarryAdderDiagram, CelsiusFahrenheitDiagram } = diagrams;
    render(
      <>
        <PrimitiveGatesDiagram />
        <HalfAdderDiagram />
        <FullAdderDiagram />
        <RippleCarryAdderDiagram />
        <CelsiusFahrenheitDiagram />
      </>,
    );
    expect(screen.getByRole('img', { name: 'An inverter, an and-gate and an or-gate' })).toBeInTheDocument();
    expect(screen.getAllByTestId('gate').map((g) => g.dataset['kind'])).toEqual(['inverter', 'and', 'or', 'or', 'and', 'inverter', 'and', 'or']);
    expect(screen.getAllByTestId('half-adder')).toHaveLength(2);
    expect(screen.getAllByTestId('full-adder')).toHaveLength(4);
    expect(screen.getAllByTestId('constraint')).toHaveLength(6);
    expect(screen.getAllByTestId('connector').map((c) => c.textContent)).toEqual(['C', 'u', 'v', 'w', 'x', 'y', 'F']);
  });
});
