import { describe, expect, it } from 'vitest';
import { branchKeyframes, functionBranches } from '../src/anim/model/branches.ts';
import { callTree } from '../src/anim/model/calls.ts';
import { environmentStates } from '../src/anim/model/environment.ts';
import { tidy } from '../src/anim/model/layout.ts';
import { newtonModel } from '../src/anim/model/newton.ts';
import { keyframeAt, statementTrees, treeKeyframes } from '../src/anim/model/tree.ts';
import { blackBoxes } from '../src/diagrams/BlackBoxDiagram.tsx';
import { layers } from '../src/diagrams/LayersDiagram.tsx';
import { traceOf } from './traceHelper.ts';

const compound = `function square(x) {
  return x * x;
}

function sum_of_squares(x, y) {
  return square(x) + square(y);
}

function f(a) {
  return sum_of_squares(a + 1, a * 2);
}

f(5);
`;

describe('expression trees', () => {
  const source = '(2 + 4 * 6) * (3 + 12);\n';

  it('builds the tree the parser built, with precedence as shape', () => {
    const [tree] = statementTrees(source);
    expect(tree?.text).toBe('(2 + 4 * 6) * (3 + 12)');
    expect(tree?.root.data.label).toBe('*');
    expect(tree?.root.children.map((c) => c.data.label)).toEqual(['+', '+']);
    expect(tree?.root.children[0]?.children.map((c) => c.data.label)).toEqual(['2', '*']);
    // The operator token position, used for the flat layout.
    expect(source.slice(tree!.root.data.tokenStart, tree!.root.data.tokenStart + 1)).toBe('*');
    expect(tree!.root.data.tokenStart).toBe(12);
  });

  it('moves values from the leaves to the root in trace order', () => {
    const trees = statementTrees(source);
    const frames = treeKeyframes(trees, traceOf(source), source);
    const values = frames.map((f) => [...f.values.values()].at(-1) ?? null);
    expect(values.filter((v) => v !== null)).toEqual(['24', '26', '15', '390']);
    expect(frames.at(-1)?.caption).toBe('`(2 + 4 * 6) * (3 + 12)` → 390: the value reaches the root.');
    expect(frames.at(-1)?.values.get(trees[0]!.root.data.id)).toBe('390');
  });

  it('maps a stepper position onto the last keyframe at or before it', () => {
    const frames = [{ at: 0 }, { at: 3 }, { at: 7 }];
    expect(keyframeAt(frames, 0)).toBe(0);
    expect(keyframeAt(frames, 3)).toBe(1);
    expect(keyframeAt(frames, 5)).toBe(1);
    expect(keyframeAt(frames, 100)).toBe(2);
  });

  it('lays a tree out tidily: parents centred over children, siblings apart', () => {
    const layout = tidy({ data: 'r', children: [{ data: 'a', children: [] }, { data: 'bb', children: [] }] }, { nodeWidth: (d) => d.length * 10, gap: 10, level: 50 });
    const [root, a, b] = layout.nodes;
    expect(layout.width).toBe(40);
    expect(root?.x).toBe(20);
    expect(a?.x).toBe(5);
    expect(b?.x).toBe(30);
    expect(b?.y).toBe(50);
  });
});

describe('environment frames', () => {
  it('reserves declared names, makes a frame per call and resolves lookups outward', () => {
    const source = 'const x = 100;\nfunction square(x) { return x * x; }\nsquare(3);\nx;\n';
    const states = environmentStates(source, traceOf(source));
    expect(states[0]?.frames[0]?.bindings).toEqual([
      { name: 'x', value: null },
      { name: 'square', value: null },
    ]);
    const call = states.find((s) => s.caption.startsWith('Apply `square`'));
    expect(call?.frames.map((f) => [f.id, f.label, f.parent])).toEqual([
      ['E0', 'program', null],
      ['E1', 'square(3)', 'E0'],
    ]);
    expect(call?.stack).toEqual(['E1']);
    const inner = states.find((s) => s.lookup?.symbol === 'x' && s.lookup.from === 'E1');
    expect(inner?.lookup).toEqual({ symbol: 'x', from: 'E1', found: 'E1', value: '3' });
    const returned = states.find((s) => s.caption.includes('has done its work'));
    expect(returned?.frames[1]).toMatchObject({ status: 'returned', value: '9' });
    const outer = states.at(-1);
    expect(outer?.lookup).toEqual({ symbol: 'x', from: 'E0', found: 'E0', value: '100' });
  });

  it('shows a tail call taking the caller’s place', () => {
    const states = environmentStates(compound, traceOf(compound));
    const tail = states.find((s) => s.caption.includes('tail call'));
    expect(tail?.caption).toContain('takes the place of E1');
    expect(tail?.frames.find((f) => f.id === 'E1')?.status).toBe('replaced');
    expect(tail?.stack).toEqual(['E2']);
  });

  it('finds free names one frame out under block structure', () => {
    const source = 'function sqrt(x) {\n  function improve(guess) { return (guess + x / guess) / 2; }\n  return improve(1);\n}\nsqrt(144);\n';
    const states = environmentStates(source, traceOf(source));
    const free = states.find((s) => s.lookup?.symbol === 'x');
    expect(free?.lookup?.found).toBe('E1');
    expect(free?.caption).toContain('found in E1, 2 frames out');
    expect(free?.frames.map((f) => [f.id, f.label])).toEqual([
      ['E0', 'program'],
      ['E1', 'sqrt(144)'],
      ['E2', 'block'],
      ['E3', 'improve(1)'],
    ]);
  });

  it('ends with the error when the program fails', () => {
    const source = 'display(area);\nconst area = 3;\n';
    const states = environmentStates(source, traceOf(source));
    expect(states.at(-1)?.caption).toContain('used before its declaration was evaluated');
    expect(states.at(-1)?.frames[0]?.bindings).toEqual([{ name: 'area', value: null }]);
  });
});

describe('call tree', () => {
  it('opens a box per call and closes the tail-replaced caller together with its replacement', () => {
    const tree = callTree(compound, traceOf(compound));
    expect(tree.calls).toBe(4);
    const [f] = tree.root.children;
    expect(f?.data).toMatchObject({ label: 'f(5)', tail: false, value: '136' });
    const [sos] = f?.children ?? [];
    expect(sos?.data).toMatchObject({ label: 'sum_of_squares(6, 10)', tail: true, value: '136' });
    expect(sos?.children.map((c) => [c.data.label, c.data.value])).toEqual([
      ['square(6)', '36'],
      ['square(10)', '100'],
    ]);
    expect(tree.keyframes.at(-1)?.caption).toBe('`sum_of_squares(a + 1, a * 2)` → 136, which is also the value of f(5).');
  });
});

describe('decision trees', () => {
  const source = `function abs(x) {\n  return x >= 0 ? x : -x;\n}\nfunction is_between(x, low, high) {\n  return x >= low && x <= high;\n}\nabs(-12);\nis_between(5, 1, 10);\n`;

  it('draws conditionals as questions and lights the branch taken', () => {
    const functions = functionBranches(source);
    expect(functions.map((fn) => [fn.name, fn.root.data.kind])).toEqual([
      ['abs', 'test'],
      ['is_between', 'gate'],
    ]);
    const frames = branchKeyframes(source, functions, traceOf(source));
    const decided = frames.find((f) => f.call === 'abs(-12)' && f.decided.size > 0);
    expect(decided?.caption).toBe('`x >= 0` is false: take the right branch. The other branch is never evaluated.');
    const leaf = frames.find((f) => f.call === 'abs(-12)' && [...f.values.values()].includes('12'));
    expect(leaf?.caption).toBe('`-x` → 12.');
    const gate = frames.filter((f) => f.call === 'is_between(5, 1, 10)');
    expect(gate.map((f) => f.caption)).toContain('The left side of `&&` is true: the right side decides.');
    expect(gate.at(-1)?.caption).toBe('The right side is true, so `&&` is true.');
  });
});

describe("Newton's method", () => {
  it('reads the radicand from the program and the guesses from what it printed', () => {
    const source = `function sqrt_iter(guess, x) {\n  display(guess);\n  return math_abs(guess * guess - x) < 0.001 ? guess : sqrt_iter((guess + x / guess) / 2, x);\n}\nsqrt_iter(1, 2);\n`;
    const model = newtonModel(source, traceOf(source));
    expect(model.x).toBe(2);
    expect(model.inferred).toBe(false);
    expect(model.guesses.slice(0, 3)).toEqual([1, 1.5, 1.4166666666666665]);
    expect(Math.abs((model.guesses.at(-1) ?? 0) ** 2 - 2)).toBeLessThan(0.001);
  });
});

describe('diagrams', () => {
  it('layers the call graph from the top-level call down to the primitives', () => {
    const model = layers(compound);
    expect(model.layers.map((layer) => [...layer.items].sort())).toEqual([['f(5)'], ['f'], ['sum_of_squares'], ['square'], ['*', '+']]);
    expect(model.edges).toContainEqual(['sum_of_squares', 'square']);
  });

  it('finds the helpers inside a block-structured function and their free names', () => {
    const source = `function sqrt(x) {\n  function is_good_enough(guess) { return math_abs(guess * guess - x) < 0.001; }\n  function improve(guess) { return (guess + x / guess) / 2; }\n  function sqrt_iter(guess) { return is_good_enough(guess) ? guess : sqrt_iter(improve(guess)); }\n  return sqrt_iter(1);\n}\n`;
    const [sqrt] = blackBoxes(source);
    expect(sqrt?.params).toEqual(['x']);
    expect(sqrt?.inner.map((inner) => [inner.name, inner.free])).toEqual([
      ['is_good_enough', ['x']],
      ['improve', ['x']],
      ['sqrt_iter', []],
    ]);
  });
});
