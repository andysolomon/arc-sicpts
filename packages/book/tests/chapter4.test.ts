import { createCallLogTracer, evaluate, evalApplyProgram, metacircularPrelude, parse, stringify, toTaggedList } from '@sicp/lab';
import { describe, expect, it } from 'vitest';
import { parsedText } from '../src/anim/chapter4/TaggedListScene.tsx';
import { cycleSteps } from '../src/anim/model/evalApply.ts';
import { componentTree, itemsOf, listNotation, readValue, show, type ComponentNode, type Read } from '../src/anim/model/taggedList.ts';

const tags = (node: ComponentNode): string[] => [node.detail === null ? node.tag : `${node.tag} ${node.detail}`, ...node.children.flatMap(tags)];

describe('reading values back from their text', () => {
  it('reads what stringify writes', () => {
    const value = toTaggedList(parse('f(1, "a", null, true, undefined);'));
    expect(readValue(stringify(value))).toEqual(value);
  });

  it('reads text cut short as far as it goes', () => {
    const read = readValue('[1, [2, [3...');
    expect(itemsOf(read).slice(0, 2)).toEqual([1, 2]);
    expect(show(readValue('[1, [fn[E3], null]]'))).toBe('[1, fn[E3]]');
  });

  it('writes tagged lists in the notation of the book', () => {
    expect(listNotation(toTaggedList(parse('5 * size;')) as Read)).toBe('list("binary_operator_combination", "*", list("literal", 5), list("name", "size"))');
  });
});

describe('the tagged-list scene', () => {
  it('finds the program string given to parse', () => {
    expect(parsedText('const p = parse("1 + 2;");\nhead(p);')).toBe('1 + 2;');
    expect(parsedText('1 + 2;')).toBeNull();
  });

  it('draws one node per component, with operators and names beside their tags', () => {
    const tree = componentTree(toTaggedList(parse('const size = 2; 5 * size;')) as Read);
    expect(tree === null ? [] : tags(tree)).toEqual([
      'sequence',
      'constant_declaration',
      'name "size"',
      'literal 2',
      'binary_operator_combination "*"',
      'literal 5',
      'name "size"',
    ]);
  });

  it('shows the parameters and body of a function declaration as its parts', () => {
    const tree = componentTree(toTaggedList(parse('function f(x) { return null; }')) as Read);
    expect(tree === null ? [] : tags(tree)).toEqual(['function_declaration', 'name "f"', 'name "x"', 'block', 'return_statement', 'literal null']);
  });
});

describe('the evaluate–apply scene', () => {
  const log = createCallLogTracer(['evaluate', 'apply']);
  evaluate(evalApplyProgram, { budget: 1_000_000, prelude: metacircularPrelude, hooks: [log.hooks] });
  const steps = cycleSteps(log.calls);

  it('describes each call in the terms of §4.1.1', () => {
    expect(steps.map((s) => `${s.kind} ${s.summary}`).slice(4, 11)).toEqual([
      'evaluate operator combination "+"',
      'evaluate application of +',
      'evaluate name +',
      'evaluate application of square',
      'evaluate name square',
      'evaluate literal 3',
      'apply compound (x) to 3',
    ]);
    expect(steps.at(-1)).toMatchObject({ kind: 'apply', summary: 'primitive to 9, 1', value: '10' });
  });

  it('keeps the calls still pending below each call', () => {
    const body = steps.find((s) => s.summary === 'block');
    expect(body?.ancestors.map((n) => steps[n]?.summary)).toContain('compound (x) to 3');
  });
});
