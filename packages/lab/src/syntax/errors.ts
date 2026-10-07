import type { Loc } from './ast.ts';

export type ErrorPhase = 'parse' | 'runtime';

/** Any error a Source program can cause: a syntax error or a runtime error. */
export class SourceError extends Error {
  readonly phase: ErrorPhase;
  readonly loc: Loc | null;
  /** The message without its location. */
  readonly reason: string;

  constructor(phase: ErrorPhase, message: string, loc: Loc | null) {
    super(
      loc === null ? message : loc.hidden === true ? `Hidden prelude, line ${loc.line}: ${message}` : `Line ${loc.line}: ${message}`,
    );
    this.name = 'SourceError';
    this.phase = phase;
    this.loc = loc;
    this.reason = message;
  }
}
