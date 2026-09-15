import { DiffdevilError, fail } from '../errors.js';
import { GitHubRequestError } from './client.js';
/** One application owns its serial writes and their separately observed postconditions. */
export class EffectSession {
    beforeWrite;
    observations = [];
    constructor(beforeWrite = async () => { }) {
        this.beforeWrite = beforeWrite;
    }
    unchanged(kind, subject) {
        this.observations.push({ kind, subject, outcome: 'unchanged', request: 'not-needed', readback: 'verified' });
    }
    async write(operation) {
        await this.beforeWrite();
        const observation = { kind: operation.kind, subject: operation.subject, outcome: 'unresolved', request: 'ambiguous', readback: 'unobserved' };
        this.observations.push(observation);
        let error;
        try {
            await operation.perform();
            observation.request = 'acknowledged';
        }
        catch (cause) {
            error = cause;
            observation.request = cause instanceof GitHubRequestError && !cause.ambiguous ? 'rejected' : 'ambiguous';
        }
        try {
            if (await operation.verify()) {
                observation.outcome = 'changed';
                observation.readback = 'verified';
                return;
            }
            observation.readback = 'failed';
        }
        catch (cause) {
            if (error === undefined)
                error = cause;
        }
        if (error instanceof DiffdevilError)
            throw error;
        fail('E_GITHUB_READBACK', `Could not verify ${operation.kind} for ${operation.subject}. Earlier effects were not rolled back; re-read provider state before retrying.`, 'apply');
    }
}
//# sourceMappingURL=observation.js.map