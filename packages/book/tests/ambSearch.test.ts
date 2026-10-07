import { ambOfficePrelude, ambPrelude, ambProbeNames, ambSearchProgram, createCallLogTracer, evaluate, officeMoveProgram, withSearchProbe } from '@sicp/lab';
import { describe, expect, it } from 'vitest';
import { searchTree } from '../src/anim/model/ambSearch.ts';

function treeOf(prelude: string, source: string, maxCalls = 400) {
  const probed = withSearchProbe(prelude);
  if (probed === null) throw new Error('not an amb prelude');
  const tracer = createCallLogTracer([...ambProbeNames], { maxCalls });
  evaluate(source, { prelude: probed, budget: 20_000_000, hooks: [tracer.hooks] });
  return searchTree(tracer.calls);
}

describe('the search tree of an amb program', () => {
  it('draws x = amb(1, 2, 3), y = amb(4, 5) with dead ends and two values', () => {
    const tree = treeOf(ambPrelude, ambSearchProgram);
    const last = tree.steps[tree.steps.length - 1];
    if (last === undefined) throw new Error('no steps');
    const root = tree.nodes[0];
    expect(root?.children.map((id) => last.labels.get(id))).toEqual(['1', '2', '3']);
    const below = (label: string) => {
      const x = root?.children.find((id) => last.labels.get(id) === label) ?? -1;
      return tree.nodes[x]?.children.map((id) => `${tree.nodes[id]?.kind} ${last.labels.get(id)}`);
    };
    expect(below('1')).toEqual(['choice 4', 'choice 5']);
    expect(tree.nodes.filter((n) => n.kind === 'dead')).toHaveLength(4);
    expect(tree.nodes.filter((n) => n.kind === 'solution').map((n) => n.text)).toEqual(['[2, [5, null]]', '[3, [4, null]]']);
    expect(tree.solutions).toBe(2);
    expect(tree.truncated).toBe(false);
    expect(last.caption).toContain('no earlier choice point: the search is over');
    // A literal choice and its value make one keyframe.
    expect(tree.steps[0]?.caption).toBe('`amb(1, 2, 3)` is reached, a new choice point. It tries its first alternative, `1`.');
  });

  it('abandons what lies below a choice point when it moves on', () => {
    const tree = treeOf(ambPrelude, ambSearchProgram);
    const tryTwo = tree.steps.find((step) => step.kind === 'try' && step.labels.get(step.focus) === '2');
    if (tryTwo === undefined) throw new Error('2 is never tried');
    const one = tree.nodes[0]?.children[0] ?? -1;
    expect(tryTwo.abandoned.has(one)).toBe(true);
    expect(tryTwo.path).toEqual([tryTwo.focus]);
  });

  it('stops drawing a large search and says so', () => {
    const tree = treeOf(ambOfficePrelude, officeMoveProgram);
    expect(tree.truncated).toBe(true);
    expect(tree.nodes.length).toBeLessThanOrEqual(64);
  });
});
