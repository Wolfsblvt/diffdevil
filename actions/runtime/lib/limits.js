import { fail } from './errors.js';
export const DEFAULT_LIMITS = Object.freeze({
    profile: 'diffdevil-limits/1', expressionBytes: 65536, tokens: 32768, astNodes: 16384,
    nestingDepth: 64, expressionWork: 10000000, policyWork: 100000000, resultBytes: 67108864,
    stringBytes: 65536, configBytes: 1048576, expandedYamlAliases: 100, diagnostics: 100,
});
/** Per-request accounting. Logical work does not depend on physical cache warmth. */
export class Budget {
    limits;
    work = 0;
    notes = [];
    constructor(limits = DEFAULT_LIMITS) {
        this.limits = limits;
    }
    charge(amount = 1, range) {
        this.work += amount;
        if (!Number.isSafeInteger(this.work) || this.work > this.limits.expressionWork)
            fail('E_LIMIT', 'Expression work budget exhausted.', 'evaluate', range);
    }
    note(reason) {
        if (!this.notes.some(x => x.code === reason.code && x.subject === reason.subject))
            this.notes.push(reason);
    }
}
export function byteLength(text) { return new TextEncoder().encode(text).length; }
export function enforceBytes(text, maximum, subject, phase) {
    if (byteLength(text) > maximum)
        fail('E_LIMIT', `${subject} exceeds the selected ${maximum}-byte limit.`, phase);
}
//# sourceMappingURL=limits.js.map