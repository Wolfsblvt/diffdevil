import { assertSchema } from '../schema.js';
import { capture, diagnosticOf, DiffdevilError, fail, unwrap } from '../errors.js';
import { canonicalJson, deepFreeze, inertCopy } from '../inert.js';
import { DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import { SEMANTICS } from '../model.js';
import { readReasons, readRule, readSourceIdentity } from '../report.js';
import { evaluatedPolicy } from './evaluate.js';
import { located } from './compile.js';
import { commentLifecycle, renderTemplateResult } from './templates.js';
import { pointer, policyRecord, policyString, policyStrings, readLabelDefinition } from './validation.js';
export function selectedRuleIds(document, selection) {
    const ids = selection === undefined ? Object.keys(document.rules ?? {}) : policyStrings(inertCopy(selection), '/rules', true);
    for (const id of ids)
        if (!Object.hasOwn(document.rules ?? {}, id))
            planError(`Unknown selected rule ${id}.`, 'E_UNKNOWN_NAME');
    return [...ids].sort();
}
export function selectedDefinitions(document, selection) {
    if (selection === undefined)
        return document.labelDefinitions ?? {};
    const names = new Set();
    for (const id of selectedRuleIds(document, selection)) {
        const labels = document.rules[id].effects?.labels;
        if (labels)
            for (const name of 'group' in labels ? document.labelGroups[labels.group] : labels.add)
                names.add(name);
    }
    return Object.fromEntries(Object.entries(document.labelDefinitions ?? {}).filter(([name]) => names.has(name)));
}
function planError(message, code = 'E_PLAN_INVALID') { return fail(code, message, 'plan'); }
function targetIdentity(input, source) {
    const target = policyRecord(input, '/target', ['repository', 'pullRequest'], ['repository', 'pullRequest']);
    const repository = policyString(target.repository, '/target/repository');
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
        planError('The target repository must be owner/name.');
    const pullRequest = target.pullRequest;
    if (typeof pullRequest !== 'number' || !Number.isSafeInteger(pullRequest) || pullRequest < 1)
        planError('The target pull request must be a positive safe integer.');
    if (source.repository !== undefined && source.repository.toLowerCase() !== repository.toLowerCase() || source.pullRequest !== undefined && source.pullRequest !== pullRequest)
        planError('The target contradicts the analyzed source.', 'E_PLAN_TARGET');
    return { repository, pullRequest };
}
/** Logical label assignments conflict independently of declaration or operation order. */
export function validateEffectConflicts(operations, heldNames = new Set()) {
    const assignments = new Map();
    const groups = new Map();
    const definitions = new Map();
    const comments = new Set();
    const assign = (name, wanted, rule) => {
        if (heldNames.has(name))
            planError(`Label ${name} is also owned by a held rule; its current assignment must be preserved.`, 'E_EFFECT_CONFLICT');
        const prior = assignments.get(name);
        if (prior && prior.wanted !== wanted)
            planError(`Rules ${prior.rule} and ${rule} require incompatible assignments for ${name}.`, 'E_EFFECT_CONFLICT');
        assignments.set(name, { wanted, rule });
    };
    for (const op of operations) {
        switch (op.kind) {
            case 'label.ensure':
            case 'label.sync': {
                const signature = canonicalJson({ kind: op.kind, definition: op.definition });
                const prior = definitions.get(op.name);
                if (prior !== undefined && prior !== signature)
                    planError(`Label ${op.name} has conflicting definition operations.`, 'E_EFFECT_CONFLICT');
                definitions.set(op.name, signature);
                break;
            }
            case 'label.add':
            case 'label.remove':
                assign(op.name, op.kind === 'label.add', op.rule);
                break;
            case 'label.select': {
                const prior = groups.get(op.group);
                if (prior && (prior.selected !== op.selected || canonicalJson([...prior.members].sort()) !== canonicalJson([...op.members].sort())))
                    planError(`Group ${op.group} has incompatible selections or membership.`, 'E_EFFECT_CONFLICT');
                groups.set(op.group, op);
                for (const name of op.members)
                    assign(name, name === op.selected, op.rule);
                break;
            }
            case 'comment.reconcile':
                if (comments.has(op.rule))
                    planError(`Rule ${op.rule} has more than one desired comment operation.`, 'E_EFFECT_CONFLICT');
                comments.add(op.rule);
                break;
        }
    }
}
function unresolvedReasons(result) {
    return result.band?.status === 'unknown' ? result.band.reasons : result.decision?.status === 'unknown' ? result.decision.reasons : [];
}
/** Build desired effects only. No provider read, request, credential or mutation occurs here. */
export function createPlan(result, target, options = {}) {
    return capture(() => {
        const frame = evaluatedPolicy(result), { state } = frame, document = state.normalized.document;
        const ids = selectedRuleIds(document, options.rules);
        const requiredDefinitions = selectedDefinitions(document, options.rules);
        if (ids.some(id => !Object.hasOwn(result.rules, id)))
            planError('Evaluate the rules phase before creating a plan.', 'E_PLAN_CONTEXT');
        const validatedTarget = targetIdentity(inertCopy(target), result.report.source);
        const definitions = options.definitions ?? 'none';
        if (!['none', 'ensure', 'sync'].includes(definitions))
            planError('Definitions mode must be none, ensure or sync.');
        const operations = [], held = [], heldNames = new Set();
        let work = result.work;
        if (definitions !== 'none')
            for (const name of Object.keys(requiredDefinitions).sort())
                operations.push({ kind: definitions === 'ensure' ? 'label.ensure' : 'label.sync', name, definition: requiredDefinitions[name] });
        for (const id of ids) {
            const rule = document.rules[id], evaluated = result.rules[id], labels = rule.effects?.labels;
            const reasons = unresolvedReasons(evaluated);
            if (reasons.length && rule.onUnknown === 'fail')
                planError(`Rule ${id} is unresolved; onUnknown: fail refuses the plan.`, 'E_RULE_UNRESOLVED');
            if (evaluated.disposition === 'held') {
                held.push({ rule: id, reasons });
                if (labels)
                    for (const name of 'group' in labels ? document.labelGroups[labels.group] : labels.add)
                        heldNames.add(name);
                continue;
            }
            if (labels && rule.band !== undefined) {
                const mapping = labels;
                const band = evaluated.band;
                const selected = band.status === 'resolved' ? mapping.byBand[band.id] : mapping.unknown;
                operations.push({ kind: 'label.select', rule: id, group: mapping.group, members: document.labelGroups[mapping.group], selected });
            }
            else if (labels && evaluated.decision?.status === 'resolved') {
                const mapping = labels;
                if (evaluated.decision.value || mapping.removeWhenFalse)
                    for (const name of mapping.add)
                        operations.push({ kind: evaluated.decision.value ? 'label.add' : 'label.remove', rule: id, name });
            }
            // A label fallback does not establish a known-band comment occasion.
            const comment = rule.effects?.comment;
            if (!comment || evaluated.disposition === 'fallback')
                continue;
            const lifecycle = commentLifecycle(comment.mode, comment.trigger, rule.band === undefined ? 'boolean' : 'band');
            if (evaluated.disposition === 'unmatched' && lifecycle.trigger !== 'always')
                continue;
            const rendered = located(pointer(pointer(pointer('/rules', id), 'effects'), 'comment'), () => unwrap(renderTemplateResult(state.templates.get(id), frame.environment(), { ...frame.limits, expressionWork: Math.min(frame.limits.expressionWork, frame.limits.policyWork - work) })));
            work += rendered.work;
            operations.push({ kind: 'comment.reconcile', rule: id, ...lifecycle, body: rendered.text });
        }
        validateEffectConflicts(operations, heldNames);
        const plan = { kind: 'diffdevil.plan', schemaVersion: '1.0', stage: 'desired', semantics: result.report.semantics,
            reportId: result.report.reportId, policyId: result.policyId, source: result.report.source, target: validatedTarget,
            rules: Object.fromEntries(ids.map(id => [id, result.rules[id]])), operations, held,
            preconditions: { ...(result.report.source.head === undefined ? {} : { head: result.report.source.head }), ...(result.report.source.base === undefined ? {} : { base: result.report.source.base }) } };
        enforceBytes(JSON.stringify(plan), frame.limits.resultBytes, 'Effect plan', 'format');
        return deepFreeze(plan);
    });
}
/** Validate transported desired operations, not provider authorization or freshness. */
export function readPlan(input) {
    return capture(() => {
        try {
            if (typeof input === 'string') {
                enforceBytes(input, DEFAULT_LIMITS.resultBytes, 'Effect plan', 'source');
                try {
                    input = JSON.parse(input);
                }
                catch {
                    planError('Effect plan is not valid JSON.');
                }
            }
            const p = policyRecord(inertCopy(input), '', ['kind', 'schemaVersion', 'semantics', 'stage', 'source', 'reportId', 'policyId', 'target', 'rules', 'held', 'operations', 'preconditions'], ['kind', 'schemaVersion', 'semantics', 'stage', 'source', 'reportId', 'policyId', 'target', 'rules', 'held', 'operations']);
            if (p.kind !== 'diffdevil.plan' || p.schemaVersion !== '1.0')
                planError('Unsupported effect-plan version.', 'E_VERSION');
            if (p.stage !== 'desired' && p.stage !== 'materialized')
                planError('Unsupported effect-plan stage.');
            const semantics = policyRecord(p.semantics, '/semantics', [...Object.keys(SEMANTICS), 'presets', 'limits'], Object.keys(SEMANTICS));
            for (const [key, expected] of Object.entries(SEMANTICS))
                if (semantics[key] !== expected)
                    planError(`Unsupported ${key} semantic profile.`, 'E_VERSION');
            if (semantics.presets !== undefined)
                policyStrings(semantics.presets, '/semantics/presets');
            if (semantics.limits !== undefined)
                policyString(semantics.limits, '/semantics/limits');
            assertSchema('plan', p);
            const source = readSourceIdentity(p.source), target = targetIdentity(p.target, source);
            policyString(p.reportId, '/reportId');
            policyString(p.policyId, '/policyId');
            const rules = Object.fromEntries(Object.entries(policyRecord(p.rules, '/rules')).map(([id, value]) => {
                policyString(id, '/rules');
                const rule = readRule(value);
                if ((rule.band === undefined) === (rule.decision === undefined))
                    planError(`Rule ${id} needs exactly one band or decision.`);
                const unresolved = unresolvedReasons(rule).length > 0;
                if (unresolved ? !['held', 'fallback'].includes(rule.disposition) || rule.disposition === 'fallback' && !rule.band : rule.disposition !== (rule.decision?.status === 'resolved' && !rule.decision.value ? 'unmatched' : 'matched'))
                    planError(`Rule ${id} disposition contradicts its evidence.`);
                return [id, rule];
            }));
            if (!Array.isArray(p.held) || !Array.isArray(p.operations))
                planError('Held rules and operations must be arrays.');
            const heldIds = new Set();
            const held = p.held.map(value => {
                const h = policyRecord(value, '/held', ['rule', 'reasons'], ['rule', 'reasons']);
                const rule = policyString(h.rule, '/held/rule');
                if (heldIds.has(rule) || rules[rule]?.disposition !== 'held')
                    planError('Held entry must identify a unique held rule.');
                heldIds.add(rule);
                return { rule, reasons: readReasons(h.reasons, true) };
            });
            if (Object.entries(rules).some(([id, value]) => value.disposition === 'held' && !heldIds.has(id)))
                planError('A held rule is missing its held-effect entry.');
            const operations = p.operations.map(value => {
                const op = policyRecord(value, '/operations');
                const kind = policyString(op.kind, '/operations/kind');
                const definition = kind === 'label.ensure' || kind === 'label.sync';
                if (op.rule !== undefined || !definition) {
                    const rule = policyString(op.rule, '/operations/rule');
                    if (!Object.hasOwn(rules, rule) || heldIds.has(rule))
                        planError('An operation identifies an absent or held rule.');
                }
                if (p.stage === 'desired' && !definition && kind !== 'comment.reconcile') {
                    const rule = rules[op.rule];
                    if (kind === 'label.select' ? !rule.band : kind === 'label.add' ? rule.decision?.status !== 'resolved' || !rule.decision.value : kind === 'label.remove' ? rule.decision?.status !== 'resolved' || rule.decision.value : false)
                        planError('A desired label operation contradicts its rule result.');
                }
                switch (kind) {
                    case 'label.ensure':
                    case 'label.sync':
                        policyRecord(op, '/operations', ['kind', 'name', 'definition', 'rule'], ['kind', 'name', 'definition']);
                        return { kind, name: policyString(op.name, '/operations/name'), definition: readLabelDefinition(op.definition, '/operations/definition'), ...(op.rule === undefined ? {} : { rule: op.rule }) };
                    case 'label.add':
                    case 'label.remove':
                        policyRecord(op, '/operations', ['kind', 'rule', 'name'], ['kind', 'rule', 'name']);
                        return { kind, rule: op.rule, name: policyString(op.name, '/operations/name') };
                    case 'label.select': {
                        policyRecord(op, '/operations', ['kind', 'rule', 'group', 'members', 'selected'], ['kind', 'rule', 'group', 'members', 'selected']);
                        const members = policyStrings(op.members, '/operations/members', true), selected = policyString(op.selected, '/operations/selected');
                        if (!members.includes(selected))
                            planError('A selected label is not in its managed group.');
                        return { kind, rule: op.rule, group: policyString(op.group, '/operations/group'), members, selected };
                    }
                    case 'comment.reconcile': {
                        policyRecord(op, '/operations', ['kind', 'rule', 'mode', 'trigger', 'body', 'occasionId'], ['kind', 'rule', 'mode', 'trigger', 'body']);
                        const rule = rules[op.rule];
                        if (rule.disposition === 'fallback')
                            planError('An unknown-band fallback does not establish a comment occasion.');
                        const lifecycle = commentLifecycle(policyString(op.mode, '/operations/mode'), policyString(op.trigger, '/operations/trigger'), rule.band ? 'band' : 'boolean');
                        if (rule.disposition === 'unmatched' && lifecycle.trigger !== 'always')
                            planError('A false rule does not establish a matched comment occasion.');
                        return { kind, rule: op.rule, ...lifecycle, body: policyString(op.body, '/operations/body', true), ...(op.occasionId === undefined ? {} : { occasionId: policyString(op.occasionId, '/operations/occasionId') }) };
                    }
                    default: return planError(`Unsupported operation kind ${kind}.`);
                }
            });
            const preconditions = p.preconditions === undefined ? undefined : policyRecord(p.preconditions, '/preconditions', ['head', 'base', 'providerStateId']);
            if (preconditions)
                for (const [key, value] of Object.entries(preconditions))
                    policyString(value, `/preconditions/${key}`);
            for (const key of ['head', 'base'])
                if (source[key] !== undefined && preconditions?.[key] !== source[key])
                    planError(`The ${key} precondition must match the analyzed source.`, 'E_PLAN_TARGET');
            validateEffectConflicts(operations);
            return deepFreeze({ kind: 'diffdevil.plan', schemaVersion: '1.0', stage: p.stage, semantics: semantics, source, reportId: p.reportId, policyId: p.policyId, target, rules, held, operations, ...(preconditions === undefined ? {} : { preconditions: preconditions }) });
        }
        catch (error) {
            const d = diagnosticOf(error);
            throw new DiffdevilError({ ...d, code: d.code === 'E_CONFIG' || d.code === 'E_REPORT_INVALID' || d.code === 'E_INERT_INPUT' ? 'E_PLAN_INVALID' : d.code, phase: 'plan' });
        }
    });
}
//# sourceMappingURL=plan.js.map