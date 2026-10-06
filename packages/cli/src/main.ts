#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BUDGET, processShape, type Outcome } from '@sicp/lab';
import { createRepl } from './repl.ts';

const USAGE = `sicp - run Source programs with the Laboratory evaluator

Usage:
  sicp run <file> [--budget <steps>] [--shape]   evaluate a program
  sicp repl [--budget <steps>]                   start an interactive session
  sicp help                                      show this message

Options:
  --budget <steps>   maximum evaluator steps (default ${DEFAULT_BUDGET})
  --shape            also print the call-depth trace of each top-level call
`;

export interface Io {
  out(text: string): void;
  err(text: string): void;
  readFile(path: string): string;
}

/** Print an outcome; returns the process exit code. */
export function report(outcome: Outcome, io: Io): number {
  for (const line of outcome.output) io.out(line);
  switch (outcome.status) {
    case 'done':
      io.out(outcome.text);
      return 0;
    case 'error':
      io.err(outcome.error.message);
      return 1;
    case 'budget-exhausted':
      io.err(`Budget exhausted after ${outcome.steps} steps`);
      return 2;
  }
}

function parseBudget(args: string[], io: Io): number | null | 'invalid' {
  const at = args.indexOf('--budget');
  if (at === -1) return null;
  const budget = Number(args[at + 1]);
  if (!Number.isInteger(budget) || budget <= 0) {
    io.err('--budget needs a positive whole number');
    return 'invalid';
  }
  args.splice(at, 2);
  return budget;
}

/** Everything except the interactive loop; returns the exit code, or `repl`. */
export function main(argv: string[], io: Io): number | { repl: number | null } {
  const args = [...argv];
  const command = args.shift();
  if (command === undefined || command === 'help' || command === '--help') {
    io.out(USAGE);
    return 0;
  }

  const budget = parseBudget(args, io);
  if (budget === 'invalid') return 64;

  if (command === 'repl') return { repl: budget };

  if (command === 'run') {
    const shape = args.includes('--shape');
    const file = args.find((arg) => !arg.startsWith('--'));
    if (file === undefined) {
      io.err('sicp run needs a file');
      return 64;
    }
    let source: string;
    try {
      source = io.readFile(file);
    } catch {
      io.err(`Cannot read ${file}`);
      return 66;
    }
    const { outcome, snapshot } = processShape(source, budget === null ? {} : { budget });
    const code = report(outcome, io);
    if (shape) {
      for (const run of snapshot.runs) {
        io.out(`${run.label} · ${run.kind} · max depth ${run.maxDepth} · ${run.calls} calls`);
        io.out(`  ${run.samples.join(' ')}${run.truncated ? ' …' : ''}`);
      }
    }
    return code;
  }

  io.err(`Unknown command '${command}'\n\n${USAGE}`);
  return 64;
}

function startRepl(budget: number | null, io: Io): void {
  const repl = createRepl(budget ?? undefined);
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'sicp> ' });
  rl.prompt();
  rl.on('line', (line) => {
    if (line.trim() !== '') report(repl.evaluate(line), io);
    rl.prompt();
  });
  rl.on('close', () => process.stdout.write('\n'));
}

const invokedDirectly =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const io: Io = {
    out: (text) => console.log(text),
    err: (text) => console.error(text),
    readFile: (path) => readFileSync(path, 'utf8'),
  };
  const result = main(process.argv.slice(2), io);
  if (typeof result === 'number') process.exitCode = result;
  else startRepl(result.repl, io);
}
