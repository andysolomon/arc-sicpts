// @vitest-environment node
import { createLabHost, LabClient, type WorkerLike } from '@sicp/lab';
import { describe, expect, it } from 'vitest';
import { exercises, type ExerciseSpec } from '../content/exercises.ts';

/** The Laboratory host on this thread, connected the way the page's worker is. */
function inProcessWorker(): WorkerLike {
  const worker: WorkerLike = {
    onmessage: null,
    postMessage: (message) => setTimeout(() => host.handle(message), 0),
    terminate: () => {},
  };
  const host = createLabHost({
    post: (event) => setTimeout(() => worker.onmessage?.({ data: event }), 0),
  });
  return worker;
}

const client = new LabClient(inProcessWorker);

async function passed(spec: ExerciseSpec, source: string): Promise<string> {
  const end = await client.submit({
    type: 'check',
    source,
    tests: spec.tests,
    ...(spec.prelude !== undefined && { prelude: spec.prelude }),
  }).finished;
  if (end.type !== 'check-done') throw new Error(`check ended with ${end.type}`);
  const failures = end.results.filter((r) => !r.pass).map((r) => `${r.name}: ${r.detail}`);
  return `${end.passed} / ${end.total}${failures.length > 0 ? ` (${failures.join('; ')})` : ''}`;
}

describe.each(Object.values(exercises))('exercise $id', (spec) => {
  it('has a reference solution that passes every hidden test', async () => {
    expect(await passed(spec, spec.solution)).toBe(`${spec.tests.length} / ${spec.tests.length}`);
  });

  it('has a starter that does not already pass', async () => {
    expect(await passed(spec, spec.starter)).not.toMatch(new RegExp(`^${spec.tests.length} / `));
  });
});

describe('exercise 1.9', () => {
  it('cannot be passed by answering the same thing for both functions', async () => {
    const spec = exercises['1.9'];
    if (spec === undefined) throw new Error('exercise 1.9 is missing');
    const guess = spec.starter.replace(/\/\/ your answer.*/, 'return "recursive";');
    expect(await passed(spec, guess)).toMatch(/^3 \/ 4 \(plus_b is classified as measured/);
  });
});
