import { decodeProgram, leafSetProgram } from '@sicp/lab';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseValue } from '../src/anim/model/pairs.ts';
import { codeOf, forestOf, huffmanFrames, huffmanOf, leafCount } from '../src/anim/model/huffman.ts';
import { HuffmanScene } from '../src/anim/scenes/HuffmanScene.tsx';
import { traceOf } from './traceHelper.ts';

describe('Huffman tree model', () => {
  it('reads leaves and code trees from box notation, and nothing else', () => {
    const leaf = huffmanOf(parseValue('["leaf", ["A", [8, null]]]')!);
    expect(leaf).toEqual({ kind: 'leaf', symbol: 'A', weight: '8' });
    const tree = huffmanOf(
      parseValue('["code_tree", [["leaf", ["A", [2, null]]], [["leaf", ["B", [1, null]]], [["A", ["B", null]], [3, null]]]]]')!,
    );
    expect(tree).toMatchObject({ kind: 'tree', symbols: ['A', 'B'], weight: '3' });
    expect(codeOf(tree!, 'B')).toBe('1');
    expect(codeOf(tree!, 'Z')).toBeNull();
    expect(huffmanOf(parseValue('[1, [2, [3, null]]]')!)).toBeNull();
    expect(forestOf(parseValue('[["leaf", ["A", [8, null]]], null]')!)).toHaveLength(1);
    expect(forestOf(parseValue('[["leaf", ["A", [8, null]]], [1, null]]')!)).toBeNull();
  });

  it('draws the tree of figure 2.18, then the path of each decoded symbol', () => {
    const frames = huffmanFrames(traceOf(decodeProgram, 4000));
    expect(frames.map((f) => f.path?.bits ?? null)).toEqual([null, '100', '0', '1010', null]);
    expect(leafCount(frames[0]!.nodes[0]!)).toBe(8);
    expect(frames[1]!.caption).toBe('B is 1 0 0: right, left, left from the root.');
    expect(frames[4]!.caption).toContain('B A C: 3 symbols in 8 bits');
  });
});

describe('Huffman scene', () => {
  it('draws leaves, nodes and a bit on every branch, and lights a path', () => {
    render(<HuffmanScene trace={traceOf(decodeProgram, 4000)} />);
    expect(screen.getAllByTestId('huffman-leaf')).toHaveLength(8);
    expect(screen.getAllByTestId('huffman-node')).toHaveLength(7);
    expect(screen.getAllByTestId('huffman-bit')).toHaveLength(14);
    expect(screen.getByTestId('caption')).toHaveTextContent('tree is a Huffman tree of 8 leaves and weight 17');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    expect(screen.getByTestId('caption')).toHaveTextContent('B is 1 0 0');
  });

  it('draws a set of leaves as a forest', () => {
    render(<HuffmanScene trace={traceOf(leafSetProgram, 4000)} />);
    expect(screen.getAllByTestId('huffman-leaf')).toHaveLength(4);
    expect(screen.queryAllByTestId('huffman-bit')).toHaveLength(0);
    expect(screen.getByTestId('caption')).toHaveTextContent('a set of 4 nodes, in order of weight: D 1, C 1, B 2, A 4');
  });

  it('says what to declare when there is no tree', () => {
    render(<HuffmanScene trace={traceOf('const xs = list(1, 2);', 4000)} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('Nothing to draw');
  });
});
