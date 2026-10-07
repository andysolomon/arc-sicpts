import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { layout, listNotation, parseValue, structuresOf } from '../src/anim/model/pairs.ts';
import { PairsScene } from '../src/anim/scenes/PairsScene.tsx';
import { PictureScene } from '../src/anim/scenes/PictureScene.tsx';
import { traceOf } from './traceHelper.ts';

describe('box-and-pointer model', () => {
  it('reads values back from the evaluator’s box notation', () => {
    const datum = parseValue('[1, [[2, [3, null]], [4, null]]]');
    expect(datum).not.toBeNull();
    expect(listNotation(datum!)).toBe('list(1, list(2, 3), 4)');
    expect(listNotation(parseValue('[1, 2]')!)).toBe('pair(1, 2)');
    expect(listNotation(parseValue('["a, b", [fn[E0], null]]')!)).toBe('list("a, b", fn[E0])');
    expect(parseValue('[1, 2')).toBeNull();
  });

  it('gives each element a column as wide as what hangs below it', () => {
    const d = layout(parseValue('[[1, [2, null]], [3, null]]')!);
    expect(d.pairs).toHaveLength(4);
    const [outer, inner, , second] = d.pairs;
    expect(inner!.y).toBeGreaterThan(outer!.y);
    expect(second!.x).toBeGreaterThan(inner!.x + 44);
    expect(d.atoms.map((a) => a.text)).toEqual(['1', '2', '3']);
  });

  it('finds the structures a program names, then its value', () => {
    const source = 'const one_through_four = list(1, 2, 3, 4);\nconst x = 3;\npair(one_through_four, 5);\n';
    expect(structuresOf(traceOf(source)).map((s) => s.label)).toEqual(['one_through_four', 'value of the program']);
  });
});

describe('chapter 2 scenes', () => {
  it('draws one box per pair of each named structure', () => {
    const source = 'const xs = list(1, 2, 3);\nconst t = pair(list(1, 2), list(3, 4));\n';
    render(<PairsScene trace={traceOf(source)} />);
    expect(screen.getAllByTestId('pair')).toHaveLength(3);
    expect(screen.getByTestId('caption')).toHaveTextContent('xs is list(1, 2, 3): 3 pairs');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    expect(screen.getAllByTestId('pair')).toHaveLength(5);
  });

  it('draws every pointer, even where a pointer and the box it reaches share a path', () => {
    const source = 'const x = list(list(1, 2), 3, 4);\nconst x_twice = list(x, x);\n';
    render(<PairsScene trace={traceOf(source)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    // 19 pointers: 11 from pair to pair and 8 from pair to atom.
    expect(screen.getAllByTestId('pair')).toHaveLength(12);
    expect(screen.getAllByTestId('atom')).toHaveLength(8);
    expect(screen.getAllByTestId('pointer')).toHaveLength(19);
  });

  it('reveals the lines a painter draws', () => {
    const source = 'draw_line(pair(0, 0), pair(1, 1));\ndraw_line(pair(0, 1), pair(1, 0));\n';
    render(<PictureScene trace={traceOf(source)} />);
    expect(screen.getAllByTestId('segment')).toHaveLength(1);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    expect(screen.getAllByTestId('segment')).toHaveLength(2);
    expect(screen.getByTestId('caption')).toHaveTextContent('All 2 lines');
  });
});
