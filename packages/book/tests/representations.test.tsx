import { createLabHost, dataDirectedPrelude, dataDirectedProgram, messagePassingProgram, operationTableProgram, type LabEvent, polarProgram, rectangularProgram, taggedComplexProgram } from '@sicp/lab';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { candidates, complexText, probeSource } from '../src/anim/model/complexPlane.ts';
import { ComplexPlane } from '../src/anim/scenes/ComplexPlaneScene.tsx';
import { OperationTable } from '../src/anim/scenes/OperationTableScene.tsx';
import { captionOf, operationTable } from '../src/anim/model/operationTable.ts';
import type { Trace } from '../src/anim/useTrace.ts';
import { traceOf } from './traceHelper.ts';

const probed = (source: string) => traceOf(probeSource(source, (candidates(source) ?? []).map((c) => c.name)), 1);

describe('the complex plane', () => {
  it('finds the constants and the operations that made them', () => {
    expect(candidates(rectangularProgram)).toEqual([
      { name: 'z1', via: null },
      { name: 'z2', via: null },
      { name: 'sum', via: { op: 'add', left: 'z1', right: 'z2' } },
      { name: 'product', via: { op: 'mul', left: 'z1', right: 'z2' } },
    ]);
    expect(complexText(3, 1)).toBe('3 + i');
    expect(complexText(2.0000000000000004, -4)).toBe('2 − 4i');
    expect(complexText(0, -1)).toBe('−i');
  });

  it('draws Ben’s numbers one by one, with the stored pair in the caption', () => {
    render(<ComplexPlane source={rectangularProgram} trace={probed(rectangularProgram)} />);
    expect(screen.getAllByTestId('complex-number')).toHaveLength(1);
    expect(screen.getByTestId('caption')).toHaveTextContent('z1 is 3 + i: real part 3, imaginary part 1, magnitude 3.16, angle 0.32. It is stored as pair(3, 1).');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    expect(screen.getAllByTestId('complex-number')).toHaveLength(4);
    expect(screen.getByTestId('caption')).toHaveTextContent(
      'product is mul_complex(z1, z2), 2 + 4i: magnitudes multiply (3.16 × 1.41 = 4.47) and angles add (0.32 + 0.79 = 1.11). It is stored as pair(2.0000000000000004, 4).',
    );
  });

  it('draws the same picture for Alyssa’s, stored differently', () => {
    render(<ComplexPlane source={polarProgram} trace={probed(polarProgram)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    expect(screen.getByTestId('caption')).toHaveTextContent('sum is add_complex(z1, z2), 4 + 2i: real parts add and imaginary parts add');
    expect(screen.getByTestId('caption')).toHaveTextContent('stored as pair(4.47213595499958, 0.4636476090008061)');
  });

  it('reads tagged numbers and message-passing ones', () => {
    render(<ComplexPlane source={taggedComplexProgram} trace={probed(taggedComplexProgram)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    expect(screen.getByTestId('caption')).toHaveTextContent('z2 is 1 + i');
    expect(screen.getByTestId('caption')).toHaveTextContent('stored as pair("polar", pair(1.4142135623730951, 0.7853981633974483))');
  });

  it('says a message-passing number is a function', () => {
    render(<ComplexPlane source={messagePassingProgram} trace={probed(messagePassingProgram)} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('z is 3 + 4i');
    expect(screen.getByTestId('caption')).toHaveTextContent('It is not a pair at all but a function');
  });
});

describe('the operation table', () => {
  it('fills a cell for each put and lights the cell each get finds', () => {
    render(<OperationTable source={operationTableProgram} trace={traceOf(operationTableProgram, 4000)} />);
    expect(screen.getAllByTestId('table-cell')).toHaveLength(1);
    expect(screen.getByTestId('caption')).toHaveTextContent('put("real_part", list("rectangular"), head) files head under the operation "real_part" and the type list("rectangular").');
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 6');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } });
    expect(screen.getAllByTestId('table-cell')).toHaveLength(4);
    expect(screen.getAllByTestId('table-column')).toHaveLength(2);
    expect(screen.getByTestId('caption')).toHaveTextContent('get("angle", list("polar")) looks in the table and finds tail in the polar column.');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '5' } });
    expect(screen.getByTestId('table-miss')).toHaveTextContent('undefined');
    expect(screen.getByTestId('caption')).toHaveTextContent('finds no entry, so the answer is undefined.');
  });
});

describe('the table of the data-directed program', () => {
  it('fills a column per package, then lights each lookup', () => {
    const events: LabEvent[] = [];
    const host = createLabHost({ post: (event) => events.push(event) });
    host.handle({ type: 'trace', id: 1, source: dataDirectedProgram, prelude: dataDirectedPrelude, maxRecords: 6000, budget: 200_000 });
    const trace = events.find((event): event is Trace => event.type === 'trace-done')!;
    const table = operationTable(dataDirectedProgram, trace);
    expect(table.columns).toEqual(['rectangular', 'polar']);
    expect(table.keyframes.map((_, k) => captionOf(table, k))).toEqual([
      '`install_rectangular_package` puts 6 entries in the table, filling the rectangular column. The functions it files are declared inside it: only the table can reach them.',
      '`install_polar_package` puts 6 entries in the table, filling the polar column. The functions it files are declared inside it: only the table can reach them.',
      '`make_from_real_imag` looks up `get("make_from_real_imag", "rectangular")` and finds `(x, y) => …` in the rectangular column.',
      '`make_from_mag_ang` looks up `get("make_from_mag_ang", "polar")` and finds `(r, a) => …` in the polar column.',
      '`magnitude` calls `apply_generic`, which looks up `get("magnitude", list("rectangular"))` and finds `magnitude` in the rectangular column.',
      '`real_part` calls `apply_generic`, which looks up `get("real_part", list("polar"))` and finds `real_part` in the polar column.',
    ]);
  });
});
