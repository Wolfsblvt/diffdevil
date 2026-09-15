import { capture, diagnosticOf, DiffdevilError, fail, unwrap } from '../errors.js';
import { contentId, deepFreeze, inertCopy } from '../inert.js';
import { numberValue, mergeReasons } from '../numeric.js';
import { readReport, withPathPolicy } from '../report.js';
import { expressionReferences } from '../language/compile.js';
import { compileExpression } from '../language/text.js';
import { compileShortcut } from '../language/shortcuts.js';
import { environmentFromReport, withParameters, withPolicyValues } from '../language/environment.js';
import { evaluateExpression } from '../language/evaluate.js';
import { boolValue, textValue, unknownValue } from '../language/values.js';
import { requireType } from '../language/types.js';
import { located, policyState } from './compile.js';
import { resolveBand } from './bands.js';
import { locatePolicyDiagnostic } from './source.js';
import { configError, parameterValue, pointer, policyRecord } from './validation.js';
const results = new WeakMap();
export function evaluatedPolicy(result) {
    const evaluated = results.get(result);
    if (!evaluated)
        fail('E_PROGRAM', 'Create plans from a successful policy evaluation, not a cast or deserialized object.', 'plan');
    return evaluated;
}
const pending = [{ code: 'POLICY_VALUE_PENDING' }];
/** One request owns memoized values and the logical work charged for reaching them. */
export class PolicyEvaluation {
    policy;
    state;
    facts;
    policyId;
    parameters;
    limits;
    metricValues = Object.create(null);
    bandValues = Object.create(null);
    ruleValues = Object.create(null);
    metricDone = new Set();
    bandDone = new Set();
    ruleDone = new Set();
    baseEnvironment;
    notes = [];
    work = 0;
    constructor(policy, input, options = {}) {
        this.policy = policy;
        this.state = policyState(policy);
        this.limits = options.limits ?? this.state.limits;
        const document = this.state.normalized.document;
        this.facts = withPathPolicy(unwrap(readReport(input)), document.defaults?.paths, document.scopes);
        const supplied = policyRecord(inertCopy(options.parameters ?? {}, { code: 'E_PARAMETER_TYPE' }), '/params');
        for (const key of Object.keys(supplied))
            if (!Object.hasOwn(document.parameters ?? {}, key))
                configError(`Unknown parameter ${key}.`, pointer('/params', key), 'E_PARAMETER_UNKNOWN');
        const parameters = Object.create(null);
        for (const id of Object.keys(document.parameters ?? {}).sort()) {
            const definition = document.parameters[id];
            const value = Object.hasOwn(supplied, id) ? supplied[id] : definition.default;
            if (value === undefined)
                configError(`Required parameter ${id} is missing.`, pointer('/params', id), 'E_PARAMETER_REQUIRED');
            const checked = parameterValue(definition.type, value, pointer('/params', id));
            parameters[id] = definition.type === 'integer' || definition.type === 'float'
                ? numberValue({ status: 'exact', value: checked }, definition.type)
                : definition.type === 'boolean' ? boolValue(checked) : textValue(checked);
        }
        this.parameters = deepFreeze(parameters);
        this.policyId = contentId('policy', { definition: policy.id, parameters: this.parameters });
        for (const [id, type] of Object.entries(this.state.metricTypes))
            this.metricValues[id] = numberValue({ status: 'unknown', reasons: pending }, type);
        for (const [id, band] of this.state.bands)
            this.bandValues[id] = { status: 'unknown', candidates: band.ranges.ids, reasons: pending };
        for (const id of Object.keys(document.rules ?? {}))
            this.ruleValues[id] = { disposition: 'held' };
        const env = unwrap(environmentFromReport(this.facts));
        this.baseEnvironment = unwrap(withParameters(env, Object.fromEntries(Object.entries(document.parameters ?? {}).map(([id, p]) => [id, p.type])), parameters));
    }
    environment() {
        return withPolicyValues(this.baseEnvironment, { metrics: this.metricValues, bands: this.bandValues, rules: this.ruleValues });
    }
    charge(work, notes = []) {
        this.work += work;
        if (!Number.isSafeInteger(this.work) || this.work > this.limits.policyWork)
            fail('E_LIMIT', 'Policy work budget exhausted.', 'evaluate');
        this.notes = mergeReasons(this.notes, notes);
    }
    remainingLimits() {
        return { ...this.limits, expressionWork: Math.min(this.limits.expressionWork, this.limits.policyWork - this.work) };
    }
    execute(program, path) {
        try {
            return located(path, () => unwrap(evaluateExpression(program, this.environment(), { limits: this.remainingLimits() })));
        }
        catch (error) {
            const diagnostic = diagnosticOf(error);
            throw new DiffdevilError(this.state.source ? locatePolicyDiagnostic(this.state.source, diagnostic) : diagnostic);
        }
    }
    run(program, path) {
        this.require(program);
        const result = this.execute(program, path);
        this.charge(result.work, result.evidence);
        return result;
    }
    require(program) {
        const needed = expressionReferences(program);
        this.metrics(needed.metrics);
        for (const id of needed.bands)
            this.band(id);
        for (const id of needed.rules)
            this.rule(id);
    }
    metrics(ids) {
        // Expand an already acyclic graph iteratively; a long declaration chain need not recurse.
        const needed = new Set(), todo = [...ids];
        while (todo.length) {
            const id = todo.pop();
            if (needed.has(id) || this.metricDone.has(id))
                continue;
            const program = this.state.metrics.get(id);
            if (!program)
                configError(`Unknown metric ${id}.`, pointer('/metrics', id), 'E_UNKNOWN_NAME');
            needed.add(id);
            todo.push(...program.dependencies);
        }
        for (const id of this.state.metricOrder)
            if (needed.has(id) && !this.metricDone.has(id)) {
                const program = this.state.metrics.get(id);
                const result = this.execute(program, pointer(pointer('/metrics', id), 'formula'));
                if (result.value.kind !== 'number')
                    fail('E_INTERNAL', 'Compiled numeric metric returned a nonnumeric value.');
                this.metricValues[id] = result.value;
                this.metricDone.add(id);
                this.charge(result.work, result.evidence);
            }
    }
    band(id) {
        if (this.bandDone.has(id))
            return this.bandValues[id];
        const band = this.state.bands.get(id);
        if (!band)
            configError(`Unknown band ${id}.`, pointer('/bands', id), 'E_UNKNOWN_NAME');
        const value = this.run(band.value, pointer(pointer('/bands', id), 'value')).value;
        if (value.kind !== 'number')
            fail('E_INTERNAL', 'Compiled band returned a nonnumeric value.');
        const resolved = located(pointer('/bands', id), () => unwrap(resolveBand(band.ranges, value.measurement)));
        this.bandValues[id] = resolved;
        this.bandDone.add(id);
        this.charge(band.ranges.ids.length);
        return resolved;
    }
    rule(id) {
        if (this.ruleDone.has(id))
            return this.ruleValues[id];
        const rule = this.state.normalized.document.rules?.[id];
        if (!rule)
            configError(`Unknown rule ${id}.`, pointer('/rules', id), 'E_UNKNOWN_NAME');
        let result;
        if (rule.band !== undefined) {
            const band = this.band(rule.band);
            const fallback = rule.effects?.labels?.unknown !== undefined;
            result = { band, disposition: band.status === 'resolved' ? 'matched' : fallback ? 'fallback' : 'held' };
        }
        else {
            const evaluated = this.run(this.state.conditions.get(id), pointer(pointer('/rules', id), 'when')).value;
            if (evaluated.kind !== 'boolean')
                fail('E_INTERNAL', 'Compiled condition returned a nonboolean value.');
            result = { decision: evaluated.decision, disposition: evaluated.decision.status === 'unknown' ? 'held' : evaluated.decision.value ? 'matched' : 'unmatched' };
        }
        this.ruleValues[id] = result;
        this.ruleDone.add(id);
        this.charge(1);
        return result;
    }
    all(phase) {
        this.metrics(this.state.metricOrder);
        for (const id of this.state.bands.keys())
            this.band(id);
        if (phase === 'rules')
            for (const id of Object.keys(this.state.normalized.document.rules ?? {}).sort())
                this.rule(id);
    }
    snapshot() {
        const select = (values, done) => Object.fromEntries([...done].sort().map(id => [id, values[id]]));
        const metrics = select(this.metricValues, this.metricDone);
        const rules = select(this.ruleValues, this.ruleDone);
        const { reportId: priorId, policyId: priorPolicy, ...facts } = this.facts;
        const report = { ...facts, semantics: { ...this.policy.semantics, limits: this.limits.profile },
            metrics: Object.fromEntries(Object.entries(metrics).map(([id, value]) => [id, value.measurement])),
            metricTypes: select(this.state.metricTypes, this.metricDone), bands: select(this.bandValues, this.bandDone), rules, policyId: this.policyId };
        const result = deepFreeze({ report: { ...report, reportId: contentId('report', report) }, policyId: this.policyId, rules, evidence: [...this.notes], work: this.work });
        results.set(result, this);
        return result;
    }
}
export function evaluatePolicy(policy, report, options = {}) {
    return capture(() => {
        const phase = options.phase ?? 'rules';
        if (phase !== 'analyze' && phase !== 'rules')
            configError('Unknown policy evaluation phase.', '/phase');
        const frame = new PolicyEvaluation(policy, report, options);
        frame.all(phase);
        return frame.snapshot();
    });
}
/** Compile every declaration, but execute only the selected query and its required roots. */
export function evaluatePolicyQuery(policy, report, selector, options = {}) {
    return capture(() => {
        const frame = new PolicyEvaluation(policy, report, options);
        let evaluated;
        if (typeof selector === 'object' && 'band' in selector) {
            if (options.context === 'condition')
                fail('E_TYPE', 'A band ID is not a boolean condition.', 'type');
            const band = frame.band(selector.band);
            evaluated = { value: band.status === 'resolved' ? textValue(band.id) : unknownValue('string', band.reasons), work: 0, evidence: [] };
        }
        else {
            let program;
            if (typeof selector === 'object' && 'query' in selector) {
                const named = frame.state.queries.get(selector.query);
                if (!named)
                    configError(`Unknown saved query ${selector.query}.`, '/query', 'E_UNKNOWN_NAME');
                program = named;
            }
            else if (typeof selector === 'object' && 'kind' in selector)
                program = unwrap(compileShortcut(selector, { environment: frame.state.schema, limits: frame.limits }));
            else
                program = unwrap(compileExpression(selector, { environment: frame.state.schema, context: 'query', limits: frame.limits }));
            if (options.context === 'condition')
                requireType(program.resultType, 'boolean');
            evaluated = frame.run(program, '/query');
        }
        const result = frame.snapshot();
        return { report: result.report, result: { value: evaluated.value, evidence: result.evidence, work: result.work } };
    });
}
//# sourceMappingURL=evaluate.js.map