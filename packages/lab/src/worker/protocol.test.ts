import { describe, expect, it } from 'vitest';
import { factorialProgram } from '../chapter-1/factorial.ts';
import { gcdMachineProgram } from '../chapter-5/machines.ts';
import { LabClient, type WorkerLike } from './client.ts';
import { createLabHost } from './host.ts';
import type { LabEvent, LabRequest } from './protocol.ts';

const FOREVER = 'function forever(n) { return forever(n + 1); }\nforever(0);';

/** A host wired to the client through macrotasks, the way a real Worker is. */
function inProcessWorker(sliceSteps = 1_000): WorkerLike & { terminated: boolean } {
  const worker: WorkerLike & { terminated: boolean } = {
    terminated: false,
    onmessage: null,
    postMessage(message: LabRequest) {
      setTimeout(() => {
        if (!worker.terminated) host.handle(message);
      }, 0);
    },
    terminate() {
      worker.terminated = true;
    },
  };
  const host = createLabHost({
    sliceSteps,
    post: (event) => {
      setTimeout(() => {
        if (!worker.terminated) worker.onmessage?.({ data: event });
      }, 0);
    },
  });
  return worker;
}

/** A worker that accepts messages and never answers. */
function deadWorker(): WorkerLike & { terminated: boolean; received: LabRequest[] } {
  const worker = {
    terminated: false,
    received: [] as LabRequest[],
    onmessage: null,
    postMessage(message: LabRequest) {
      worker.received.push(message);
    },
    terminate() {
      worker.terminated = true;
    },
  };
  return worker;
}

describe('worker protocol', () => {
  it('runs a program and reports its value, steps and process shape', async () => {
    const client = new LabClient(() => inProcessWorker());
    const events: LabEvent[] = [];
    const job = client.submit(
      { type: 'run', source: factorialProgram, inspect: { processShape: true } },
      (event) => events.push(event),
    );
    const end = await job.finished;

    expect(end).toMatchObject({ type: 'done', id: job.id, value: '720' });
    expect(events[0]).toEqual({ type: 'started', id: job.id });
    expect(events.at(-1)).toBe(end);
    const shapes = events.filter((e) => e.type === 'shape');
    expect(shapes.at(-1)?.snapshot.runs.map((run) => [run.label, run.kind, run.maxDepth])).toEqual([
      ['factorial(6)', 'recursive', 6],
      ['fact_iter(1, 1, 6)', 'iterative', 1],
    ]);
  });

  it('streams display output before the result', async () => {
    const client = new LabClient(() => inProcessWorker());
    const events: LabEvent[] = [];
    await client.submit({ type: 'run', source: 'display(1); display("two"); 3;' }, (e) => events.push(e))
      .finished;
    expect(events.map((e) => (e.type === 'display' ? e.text : e.type))).toEqual([
      'started',
      '1',
      '"two"',
      'done',
    ]);
  });

  it('reports syntax and runtime errors with their location', async () => {
    const client = new LabClient(() => inProcessWorker());
    const syntax = await client.submit({ type: 'run', source: 'const x = ;' }).finished;
    expect(syntax).toMatchObject({ type: 'error', steps: 0, error: { phase: 'parse', loc: { line: 1 } } });
    const runtime = await client.submit({ type: 'run', source: '1;\nmissing;' }).finished;
    expect(runtime).toMatchObject({
      type: 'error',
      error: { phase: 'runtime', message: 'Line 2: Name missing not declared', loc: { line: 2 } },
    });
  });

  it('ends a runaway program when the step budget is exhausted', async () => {
    const client = new LabClient(() => inProcessWorker());
    const end = await client.submit({ type: 'run', source: FOREVER, budget: 5_000 }).finished;
    expect(end).toMatchObject({ type: 'budget-exhausted', steps: 5_000, budget: 5_000 });
  });

  it('uses a budget of 100 000 steps by default', async () => {
    const client = new LabClient(() => inProcessWorker(50_000));
    const end = await client.submit({ type: 'run', source: FOREVER }).finished;
    expect(end).toMatchObject({ type: 'budget-exhausted', steps: 100_000, budget: 100_000 });
  });

  it('cancels a running job cooperatively, between slices', async () => {
    const worker = inProcessWorker(500);
    const client = new LabClient(() => worker);
    const job = client.submit(
      { type: 'run', source: FOREVER, budget: Number.MAX_SAFE_INTEGER },
      (event) => {
        if (event.type === 'started') job.cancel();
      },
    );
    const end = await job.finished;
    expect(end).toMatchObject({ type: 'cancelled', forced: false });
    expect(end.type === 'cancelled' && end.steps).toBeGreaterThan(0);
    expect(worker.terminated).toBe(false);

    // The same worker is still usable afterwards.
    expect(await client.submit({ type: 'run', source: '1 + 1;' }).finished).toMatchObject({
      type: 'done',
      value: '2',
    });
  });

  it('keeps other jobs running when one is cancelled', async () => {
    const client = new LabClient(() => inProcessWorker(500));
    const runaway = client.submit({ type: 'run', source: FOREVER, budget: Number.MAX_SAFE_INTEGER });
    const quick = client.submit({ type: 'run', source: factorialProgram });
    expect(await quick.finished).toMatchObject({ type: 'done', value: '720' });
    runaway.cancel();
    expect(await runaway.finished).toMatchObject({ type: 'cancelled', forced: false });
  });

  it('replaces a worker that does not confirm a cancel', async () => {
    const spawned: ReturnType<typeof deadWorker>[] = [];
    const client = new LabClient(
      () => {
        const worker = deadWorker();
        spawned.push(worker);
        return worker;
      },
      { cancelGraceMs: 10 },
    );
    const stuck = client.submit({ type: 'run', source: FOREVER });
    const bystander = client.submit({ type: 'run', source: '1;' });
    stuck.cancel();
    stuck.cancel();

    expect(await stuck.finished).toEqual({ type: 'cancelled', id: stuck.id, steps: 0, forced: true });
    expect(await bystander.finished).toMatchObject({ type: 'cancelled', forced: true });
    expect(spawned[0]?.terminated).toBe(true);
    expect(spawned[0]?.received.filter((m) => m.type === 'cancel')).toHaveLength(1);

    client.submit({ type: 'run', source: '2;' });
    expect(spawned).toHaveLength(2);
  });

  it('ignores a cancel for a job that already finished', async () => {
    const client = new LabClient(() => inProcessWorker());
    const job = client.submit({ type: 'run', source: '1;' });
    await job.finished;
    job.cancel();
    expect(await client.submit({ type: 'run', source: '2;' }).finished).toMatchObject({ value: '2' });
  });

  it('sends drawn lines in batches, flushed before any display that follows them', async () => {
    const client = new LabClient(() => inProcessWorker());
    const events: LabEvent[] = [];
    const source = 'draw_line(pair(0, 0), pair(1, 1)); draw_line(pair(0, 1), pair(1, 0)); display("drawn"); draw_line(pair(0, 0), pair(0, 1));';
    await client.submit({ type: 'run', source }, (e) => events.push(e)).finished;
    expect(events.flatMap((e): unknown[] => (e.type === 'draw' ? [e.segments] : e.type === 'display' ? [e.text] : []))).toEqual([
      [
        [0, 0, 1, 1],
        [0, 1, 1, 0],
      ],
      '"drawn"',
      [[0, 0, 0, 1]],
    ]);

    const end = await client.submit({ type: 'trace', source }).finished;
    if (end.type !== 'trace-done') throw new Error(end.type);
    expect(end.drawing).toHaveLength(3);
    expect(end.output).toEqual(['"drawn"']);
  });

  it('reports a vector that is not a pair of numbers', async () => {
    const client = new LabClient(() => inProcessWorker());
    const end = await client.submit({ type: 'run', source: 'draw_line(pair(0, 0), 1);' }).finished;
    expect(end).toMatchObject({ type: 'error', error: { message: 'Line 1: draw_line expects two vectors, pairs of numbers, got 1' } });
  });

  it('returns the full step log for the stepper', async () => {
    const client = new LabClient(() => inProcessWorker());
    const end = await client.submit({ type: 'trace', source: 'const square = x => x * x;\nsquare(4);' })
      .finished;
    if (end.type !== 'trace-done') throw new Error(end.type);
    expect(end.outcome).toEqual({ status: 'done', value: '16' });
    expect(end.truncated).toBe(false);
    expect(end.records.map((r) => `${r.n} | ${r.text} | ${r.env}`)).toEqual([
      '1 | declare square = fn[E0] | E0',
      '2 | evaluate application square(4) | E0',
      '3 | evaluate name square → fn[E0] | E0',
      '4 | apply fn[E0] → extend E0 with {x: 4} = E1 | E1',
      '5 | evaluate name x → 4 | E1',
      '6 | evaluate name x → 4 | E1',
      '7 | x * x → 16 | E1',
      '8 | square(4) → 16 | E0',
    ]);
    expect(end.records[1]?.loc).toMatchObject({ line: 2, col: 1, endCol: 10 });
  });

  it('truncates a step log at its record limit', async () => {
    const client = new LabClient(() => inProcessWorker());
    const end = await client.submit({ type: 'trace', source: factorialProgram, maxRecords: 5 }).finished;
    expect(end).toMatchObject({ type: 'trace-done', truncated: true, outcome: { status: 'done' } });
    expect(end.type === 'trace-done' && end.records).toHaveLength(5);
  });

  it('checks an exercise against value tests and measured process shape', async () => {
    const client = new LabClient(() => inProcessWorker());
    const prelude = 'function inc(x) { return x + 1; } function dec(x) { return x - 1; }';
    const source = `
      function plus_a(a, b) { return a === 0 ? b : inc(plus_a(dec(a), b)); }
      function plus_b(a, b) { return a === 0 ? b : plus_b(dec(a), inc(b)); }
      function classify(f) { return "recursive"; }`;
    const end = await client.submit({
      type: 'check',
      source,
      prelude,
      tests: [
        { name: 'plus_a still adds', kind: 'value', expr: 'plus_a(2, 3)', expected: 5 },
        { name: 'plus_a', kind: 'shape', expr: 'classify(plus_a)', call: 'plus_a(4, 3)' },
        { name: 'plus_b', kind: 'shape', expr: 'classify(plus_b)', call: 'plus_b(4, 3)' },
      ],
    }).finished;
    expect(end).toMatchObject({ type: 'check-done', passed: 2, total: 3 });
    expect(end.type === 'check-done' && end.results[2]).toEqual({
      name: 'plus_b',
      pass: false,
      detail: 'classify(plus_b) is "recursive", but plus_b(4, 3) is iterative',
    });
  });

  it('checks how many times a function is applied', async () => {
    const client = new LabClient(() => inProcessWorker());
    const source = `
      function expt(b, n) { return n === 0 ? 1 : b * expt(b, n - 1); }
      function square(x) { return x * x; }`;
    const end = await client.submit({
      type: 'check',
      source,
      tests: [
        { name: 'few calls', kind: 'calls', call: 'expt(2, 4)', fn: 'expt', atMost: 5 },
        { name: 'too many calls', kind: 'calls', call: 'expt(2, 32)', fn: 'expt', atMost: 12 },
        { name: 'not called', kind: 'calls', call: 'expt(2, 4)', fn: 'square', atMost: 12 },
      ],
    }).finished;
    expect(end).toMatchObject({ type: 'check-done', passed: 1, total: 3 });
    expect(end.type === 'check-done' && end.results.map((r) => r.detail)).toEqual([
      null,
      'expt(2, 32) applies expt 33 times; at most 12 expected',
      'expt(2, 4) never applies square',
    ]);
  });

  it('checks that a call stops with an error', async () => {
    const client = new LabClient(() => inProcessWorker());
    const source = `function div(a, b) { return b === 0 ? error("division by zero:", a) : a / b; }`;
    const end = await client.submit({
      type: 'check',
      source,
      tests: [
        { name: 'any error', kind: 'error', call: 'div(1, 0)' },
        { name: 'the right error', kind: 'error', call: 'div(1, 0)', message: 'division by zero' },
        { name: 'the wrong error', kind: 'error', call: 'div(1, 0)', message: 'overflow' },
        { name: 'no error', kind: 'error', call: 'div(1, 2)' },
      ],
    }).finished;
    expect(end.type === 'check-done' && end.results.map((r) => r.detail)).toEqual([
      null,
      null,
      'div(1, 0) stops with "Line 1: division by zero: 1", not with an error about "overflow"',
      'div(1, 2) is 0.5, but an error was expected',
    ]);
  });

  it('fails every test, without throwing, when the submission does not parse', async () => {
    const client = new LabClient(() => inProcessWorker());
    const end = await client.submit({
      type: 'check',
      source: 'function (',
      tests: [{ name: 't', kind: 'value', expr: '1', expected: 1 }],
    }).finished;
    expect(end).toMatchObject({ type: 'check-done', passed: 0, total: 1, results: [{ pass: false }] });
  });
});

describe('chapter 5 jobs', () => {
  const client = new LabClient(() => inProcessWorker());

  it('records every instruction a machine executes, with its data paths', async () => {
    const end = await client.submit({ type: 'machines', source: gcdMachineProgram }).finished;
    if (end.type !== 'machines-done') throw new Error(end.type);
    expect(end.outcome).toEqual({ status: 'done', value: '2' });
    const [machine] = end.machines;
    expect(machine?.registers).toEqual(['a', 'b', 't']);
    expect(machine?.dataPaths.buttons.map((b) => b.name)).toEqual(['t<-rem', 'a<-b', 'b<-t']);
    expect(machine?.dataPaths.operations.map((o) => [o.id, o.test])).toEqual([
      ['=(b, 0)', true],
      ['rem(a, b)', false],
    ]);
    const run = machine?.runs[0];
    expect(run?.initial).toContainEqual(['a', { text: '206', kind: 'number' }]);
    expect(run?.steps).toHaveLength(run?.instructions ?? -1);
    expect(run?.steps.at(-2)?.writes).toContainEqual(['flag', { text: 'true', kind: 'boolean' }]);
  });

  it('lays out memory and collects garbage', async () => {
    const end = await client.submit({ type: 'memory', source: 'let x = list(1, 2);\nx = pair(3, x);\nx = 4;' }).finished;
    if (end.type !== 'memory-done') throw new Error(end.type);
    expect(end.run?.before.free).toBe(4);
    expect(end.run?.after.free).toBe(1);
    expect(end.run?.after.names).toEqual([{ name: 'x', pointer: 'n4' }]);
  });

  it('measures a function interpreted and compiled', async () => {
    const end = await client.submit({
      type: 'compare',
      definition: 'function factorial(n) { return n === 1 ? 1 : factorial(n - 1) * n; }',
      call: 'factorial',
      ns: [5],
    }).finished;
    if (end.type !== 'compare-done') throw new Error(end.type);
    expect(end.interpreted).toEqual([{ n: 5, value: '120', totalPushes: 145, maximumDepth: 28 }]);
    expect(end.compiled).toEqual([{ n: 5, value: '120', totalPushes: 36, maximumDepth: 14 }]);
  });
});
