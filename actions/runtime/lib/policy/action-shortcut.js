import { capture, unwrap } from '../errors.js';
import { inertCopy } from '../inert.js';
import { shortcutAst, printAst, parseNumericInput } from '../language/shortcuts.js';
import { compilePolicyWithSyntax } from './compile.js';
import { configError, policyRecord } from './validation.js';
/** Pure shorthand lowering. This is not an Action runner, input loader or effects adapter. */
export function compileActionShortcut(input, options = {}) {
    return capture(() => {
        const record = policyRecord(inertCopy(input, { code: 'E_CONFIG' }), '/inputs', ['metric', 'threshold', 'comparison', 'files', 'scope', 'path', 'exclude', 'include-only', 'force-include', 'exclude-mode', 'include-only-mode', 'force-include-mode', 'label', 'remove-label-when-false', 'comment-template', 'comment-mode', 'formula', 'condition']);
        const inputs = Object.create(null);
        for (const [key, value] of Object.entries(record)) {
            if (typeof value !== 'string')
                configError('Action shorthand values must be strings.', `/inputs/${key}`);
            if (value !== '')
                inputs[key] = value;
        }
        const entryPoint = options.entryPoint ?? 'root';
        if (entryPoint !== 'root' && entryPoint !== 'analyze')
            configError('Unsupported shorthand entry point.', '/entryPoint');
        const comment = inputs['comment-template'] !== undefined || inputs['comment-mode'] !== undefined;
        if (comment && (inputs['comment-template'] === undefined || inputs['comment-mode'] === undefined))
            configError('A generated comment requires both template and mode.', '/inputs');
        if (entryPoint === 'analyze' && (inputs.label || comment || inputs['remove-label-when-false']))
            configError('The analyze entry point rejects effect inputs.', '/inputs');
        if (inputs['remove-label-when-false'] !== undefined && !['true', 'false'].includes(inputs['remove-label-when-false']))
            configError('remove-label-when-false requires true or false.', '/inputs');
        if (inputs['remove-label-when-false'] !== undefined && !inputs.label)
            configError('Label removal control requires a label.', '/inputs');
        if (inputs.formula !== undefined && inputs.metric !== undefined)
            configError('formula and metric are alternatives.', '/inputs');
        if (inputs.condition !== undefined && ['threshold', 'comparison', 'files'].some(key => inputs[key] !== undefined))
            configError('condition conflicts with threshold, comparison and files.', '/inputs');
        if (inputs.threshold === undefined && ['comparison', 'files'].some(key => inputs[key] !== undefined))
            configError('comparison and files require a threshold.', '/inputs');
        if (inputs.formula !== undefined && (inputs.scope || inputs.path || inputs.files))
            configError('A formula names its own selection; do not rebind it with scope/path/files.', '/inputs');
        const lines = (value) => value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const paths = {};
        for (const [flag, field] of [['exclude', 'exclude'], ['include-only', 'includeOnly'], ['force-include', 'forceInclude']]) {
            if (inputs[flag] !== undefined)
                paths[field] = lines(inputs[flag]);
            if (inputs[`${flag}-mode`] !== undefined)
                paths[`${field}Mode`] = inputs[`${flag}-mode`];
        }
        const compileOptions = { paths: paths, ...(options.presets === undefined ? {} : { presets: options.presets }), ...(options.limits === undefined ? {} : { limits: options.limits }) };
        const syntax = new Map();
        const metric = { kind: 'query', metric: inputs.metric ?? 'changed', ...(inputs.scope ? { scope: inputs.scope } : {}), ...(inputs.path ? { paths: lines(inputs.path) } : {}) };
        const metricAst = inputs.formula === undefined ? shortcutAst(metric) : undefined;
        const thresholdMode = inputs.threshold !== undefined || inputs.condition !== undefined;
        if (thresholdMode && options.presets?.includes('size@1'))
            configError('Single-rule shorthand does not compose with explicit size@1; use a full policy for multiple rules.', '/inputs/preset', 'E_CONFIG_CONFLICT');
        if (!thresholdMode) {
            if (inputs.label || comment)
                configError('An explicit effect requires a threshold or condition.', '/inputs');
            if (options.presets?.length === 0) {
                const formula = inputs.formula ?? printAst(metricAst);
                if (metricAst)
                    syntax.set('/metrics/inline/formula', metricAst);
                return unwrap(compilePolicyWithSyntax({ version: 1, presets: [], metrics: { inline: { formula } } }, compileOptions, syntax));
            }
            if (!inputs.formula && !inputs.scope && !inputs.path)
                return unwrap(compilePolicyWithSyntax({ version: 1, ...(inputs.metric ? { size: { metric: inputs.metric } } : {}) }, compileOptions));
            const formula = inputs.formula ?? printAst(metricAst);
            if (metricAst)
                syntax.set('/metrics/inline/formula', metricAst);
            return unwrap(compilePolicyWithSyntax({ version: 1, size: { metric: 'metrics.inline' }, metrics: { inline: { formula } } }, compileOptions, syntax));
        }
        if (entryPoint === 'root' && !inputs.label && !comment)
            configError('A root single-rule invocation needs an explicit effect; use analyze for a decision only.', '/inputs');
        const formula = inputs.formula ?? printAst(metricAst);
        if (metricAst)
            syntax.set('/metrics/inline/formula', metricAst);
        let condition = inputs.condition;
        if (condition === undefined) {
            const number = parseNumericInput(inputs.threshold);
            const check = { kind: 'check', metric: inputs.formula === undefined ? metric.metric : 'metrics.inline', ...(inputs.files ? { files: inputs.files } : {}), ...(inputs.scope ? { scope: inputs.scope } : {}), ...(metric.paths ? { paths: metric.paths } : {}), comparison: { operator: inputs.comparison ?? 'gte', ...number } };
            const conditionAst = shortcutAst(check);
            syntax.set('/rules/inline/when', conditionAst);
            condition = printAst(conditionAst);
        }
        const policy = { version: 1, presets: [], metrics: { inline: { formula } }, rules: { inline: { when: condition, ...(entryPoint === 'root' ? { effects: { ...(inputs.label ? { labels: { add: [inputs.label], removeWhenFalse: inputs['remove-label-when-false'] !== 'false' } } : {}), ...(comment ? { comment: { mode: inputs['comment-mode'], template: inputs['comment-template'] } } : {}) } } : {}) } }, ...(inputs.label ? { labelDefinitions: { [inputs.label]: { color: 'D1D5DB', description: 'Managed by the diffdevil inline rule' } } } : {}) };
        return unwrap(compilePolicyWithSyntax(policy, compileOptions, syntax));
    });
}
//# sourceMappingURL=action-shortcut.js.map