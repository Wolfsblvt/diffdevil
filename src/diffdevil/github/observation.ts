import { DiffdevilError, fail } from '../errors.js';
import { GitHubRequestError } from './client.js';

export interface EffectObservation {
  readonly kind: string;
  readonly subject: string;
  outcome: 'changed' | 'unchanged' | 'unresolved';
  request: 'not-needed' | 'acknowledged' | 'ambiguous' | 'rejected';
  readback: 'verified' | 'failed' | 'unobserved';
}
/** One application owns its serial writes and their separately observed postconditions. */
export class EffectSession {
  readonly observations: EffectObservation[] = [];
  constructor(private readonly beforeWrite: () => Promise<void> = async () => {}) {}
  unchanged(kind: string, subject: string): void {
    this.observations.push({ kind, subject, outcome: 'unchanged', request: 'not-needed', readback: 'verified' });
  }
  async write(operation: { kind: string; subject: string; perform: () => Promise<void>; verify: () => Promise<boolean> }): Promise<void> {
    await this.beforeWrite();
    const observation: EffectObservation = { kind: operation.kind, subject: operation.subject, outcome: 'unresolved', request: 'ambiguous', readback: 'unobserved' };
    this.observations.push(observation);
    let error: unknown;
    try { await operation.perform(); observation.request = 'acknowledged'; }
    catch (cause) {
      error = cause;
      observation.request = cause instanceof GitHubRequestError && !cause.ambiguous ? 'rejected' : 'ambiguous';
    }
    try {
      if (await operation.verify()) { observation.outcome = 'changed'; observation.readback = 'verified'; return; }
      observation.readback = 'failed';
    } catch (cause) { if (error === undefined) error = cause; }
    if (error instanceof DiffdevilError) throw error;
    fail('E_GITHUB_READBACK', `Could not verify ${operation.kind} for ${operation.subject}. Earlier effects were not rolled back; re-read provider state before retrying.`, 'apply');
  }
}
