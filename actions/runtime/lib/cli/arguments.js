import { parseArgs } from 'node:util';
import { fail } from '../errors.js';
import { COMPARATORS, parseNumericInput } from '../language/shortcuts.js';
const lists = ['path', 'exclude', 'include-only', 'force-include', 'preset', 'param'];
const strings = ['cwd', 'base', 'head', 'comparison', 'diff-file', 'report', 'format', 'output', 'diagnostics', 'detail', 'color', 'metric', 'scope', 'select', 'status', 'expr', 'expr-file', 'name', 'config', 'band', 'kind', 'pr', 'repo', 'target-repo', 'target-pr', 'definitions', 'params-file', 'exclude-mode', 'include-only-mode', 'force-include-mode', 'plan', 'rule', 'policy-source', 'policy-ref', 'policy-repository', 'comment-author', 'comment-author-id', 'occasion', ...Object.keys(COMPARATORS)];
const flags = ['staged', 'stdin', 'help', 'version', 'no-config', 'all-files', 'certain', 'expr-stdin', 'policy', 'git', 'trust-report', 'require-resolved'];
export function parseInvocation(argv) {
    let command = argv[0]?.startsWith('-') ? 'analyze' : argv[0] ?? 'analyze';
    let args = argv[0]?.startsWith('-') ? [...argv] : argv.slice(1);
    if (command === 'labels') {
        const operation = args[0];
        if (operation !== 'verify' && operation !== 'apply')
            fail('E_USAGE', 'Use labels verify or labels apply.', 'config');
        command = `labels ${operation}`;
        args = args.slice(1);
    }
    const options = {};
    for (const name of strings)
        options[name] = { type: 'string' };
    for (const name of flags)
        options[name] = { type: 'boolean' };
    for (const name of lists)
        options[name] = { type: 'string', multiple: true };
    options.files = { type: command === 'check' ? 'string' : 'boolean' };
    let parsed;
    try {
        parsed = parseArgs({ args, options, tokens: true, strict: true, allowPositionals: false });
    }
    catch (error) {
        return fail('E_USAGE', error instanceof Error ? error.message : 'Invalid command arguments.', 'config');
    }
    const seen = new Set();
    for (const token of parsed.tokens ?? [])
        if (token.kind === 'option') {
            if (seen.has(token.name) && !lists.includes(token.name))
                fail('E_CONFIG_CONFLICT', `Option --${token.name} was supplied more than once.`, 'config');
            seen.add(token.name);
        }
    const v = parsed.values;
    if (v.help || v.version)
        return { command, values: v };
    if (v.diagnostics !== undefined && v.diagnostics !== 'json')
        fail('E_USAGE', '--diagnostics accepts json.', 'config');
    if (v.detail !== undefined && !['summary', 'full'].includes(String(v.detail)))
        fail('E_USAGE', '--detail accepts summary or full.', 'config');
    if (v.color !== undefined && !['auto', 'always', 'never'].includes(String(v.color)))
        fail('E_USAGE', '--color accepts auto, always or never.', 'config');
    if ((v.detail !== undefined || v.color !== undefined) && !['analyze', 'plan'].includes(command))
        fail('E_CONFIG_CONFLICT', '--detail and --color belong to analyze or plan human presentation.', 'config');
    if ((v.detail !== undefined || v.color !== undefined) && v.format !== undefined && v.format !== 'human')
        fail('E_CONFIG_CONFLICT', '--detail and --color require --format human.', 'config');
    if (v.kind !== undefined && command !== 'schema' || v.policy && command !== 'explain')
        fail('E_CONFIG_CONFLICT', 'An option is not supported by this command.', 'config');
    if (command === 'schema' && Object.keys(v).some(key => !['kind', 'cwd', 'output', 'diagnostics'].includes(key)))
        fail('E_CONFIG_CONFLICT', 'schema accepts only kind and output options.', 'config');
    if (command === 'apply' || command.startsWith('labels ')) {
        validateEffectArguments(command, v);
        return { command, values: v };
    }
    if (['plan', 'git', 'trust-report', 'policy-source', 'policy-ref', 'policy-repository', 'comment-author', 'comment-author-id', 'occasion'].some(name => v[name] !== undefined))
        fail('E_CONFIG_CONFLICT', 'Provider application options require apply or labels.', 'config');
    if ((v.rule !== undefined || v['require-resolved'] !== undefined) && command !== 'plan')
        fail('E_CONFIG_CONFLICT', 'Rule selection and resolution controls require plan or apply.', 'config');
    if (v.comparison !== undefined && (!v.base || v.staged))
        fail('E_CONFIG_CONFLICT', '--comparison requires a revision comparison.', 'config');
    const sourceFamilies = [v['diff-file'], v.stdin, v.report, v.base !== undefined || v.head !== undefined || v.staged, v.pr !== undefined || v.repo !== undefined].filter(Boolean).length;
    if ((v.repo !== undefined) !== (v.pr !== undefined))
        fail('E_USAGE', 'Supply both --repo OWNER/REPO and --pr NUMBER.', 'config');
    if (v.pr !== undefined && (!/^[1-9][0-9]*$/.test(String(v.pr)) || !Number.isSafeInteger(Number(v.pr))))
        fail('E_USAGE', 'Pull request must be a positive safe integer.', 'config');
    if (sourceFamilies > 1)
        fail('E_CONFIG_CONFLICT', 'Select one diff source family.', 'config');
    if ((v.base !== undefined) !== (v.head !== undefined))
        fail('E_CONFIG_CONFLICT', '--base and --head must be supplied together.', 'config');
    if (v.comparison !== undefined && !['direct', 'three-dot'].includes(String(v.comparison)))
        fail('E_USAGE', 'Comparison must be direct or three-dot.', 'config');
    if (v.stdin && v['expr-stdin'])
        fail('E_CONFIG_CONFLICT', 'Stdin cannot supply both a diff and an expression.', 'config');
    if (v.config && v['no-config'])
        fail('E_CONFIG_CONFLICT', '--config and --no-config conflict.', 'config');
    if ((v['target-repo'] !== undefined) !== (v['target-pr'] !== undefined))
        fail('E_CONFIG_CONFLICT', 'Supply both --target-repo and --target-pr.', 'config');
    if (command !== 'plan' && ['target-repo', 'target-pr', 'definitions'].some(name => v[name] !== undefined))
        fail('E_CONFIG_CONFLICT', 'Target and definition options belong to plan.', 'config');
    if (v['target-pr'] !== undefined && !/^[1-9][0-9]*$/.test(String(v['target-pr'])))
        fail('E_USAGE', 'Target pull request must be a positive integer.', 'config');
    if ((command === 'validate' || command === 'explain' && v.policy) && ['report', 'base', 'head', 'staged', 'diff-file', 'stdin', 'pr', 'repo'].some(name => v[name] !== undefined))
        fail('E_CONFIG_CONFLICT', 'Policy validation and explanation do not consume a diff source.', 'config');
    const selectors = ['expr', 'expr-file', 'expr-stdin', 'name'].filter(name => v[name] !== undefined);
    if (command === 'explain' && !v.policy && (selectors.length || ['config', 'preset', 'param', 'params-file', 'report', 'base', 'head', 'staged', 'diff-file', 'stdin', 'pr', 'repo', 'exclude', 'include-only', 'force-include'].some(name => v[name] !== undefined)))
        fail('E_CONFIG_CONFLICT', 'Shortcut explanation accepts only shortcut flags. Use --policy to explain configuration.', 'config');
    const shortcutNames = ['metric', 'files', 'scope', 'select', 'certain', 'all-files', 'status', 'path', 'band', ...Object.keys(COMPARATORS)];
    if (command === 'explain' && v.policy && (selectors.length || shortcutNames.some(name => v[name] !== undefined)))
        fail('E_CONFIG_CONFLICT', 'Policy explanation cannot include a query selector.', 'config');
    if (selectors.length > 1 || selectors.length && shortcutNames.some(name => v[name] !== undefined))
        fail('E_CONFIG_CONFLICT', 'Expression selectors and shortcut flags are mutually exclusive.', 'config');
    const comparators = Object.keys(COMPARATORS).filter(name => v[name] !== undefined);
    if (comparators.length > 1)
        fail('E_CONFIG_CONFLICT', 'Select exactly one numeric comparator.', 'config');
    if (!['query', 'check', 'explain'].includes(command)) {
        if (selectors.length || shortcutNames.some(name => v[name] !== undefined))
            fail('E_CONFIG_CONFLICT', 'Query selectors are not valid for this command.', 'config');
        return { command, values: v };
    }
    if (selectors.length)
        return { command, values: v, expressionSelector: selectors[0] };
    if (v.band !== undefined) {
        if (command !== 'query' || shortcutNames.filter(name => name !== 'band').some(name => v[name] !== undefined))
            fail('E_CONFIG_CONFLICT', '--band is a standalone query selector.', 'config');
        return { command, values: v };
    }
    const numeric = comparators.length ? parseNumericInput(String(v[comparators[0]])) : undefined;
    const shortcut = { kind: command === 'check' || command === 'explain' && !v.files && (numeric || v.status) ? 'check' : 'query',
        ...(v.metric !== undefined ? { metric: String(v.metric) } : {}), ...(v.files !== undefined ? { files: v.files } : {}),
        ...(v.scope !== undefined ? { scope: String(v.scope) } : {}), ...(v.path ? { paths: v.path } : {}),
        ...(v['all-files'] ? { allFiles: true } : {}), ...(v.certain ? { certain: true } : {}),
        ...(v.select !== undefined ? { select: String(v.select).split(',') } : {}),
        ...(v.status !== undefined ? { status: String(v.status) } : {}),
        ...(numeric ? { comparison: { operator: comparators[0], ...numeric } } : {}) };
    return { command, values: v, shortcut };
}
/** Validate the whole effect invocation before acquiring provider data. */
function validateEffectArguments(command, v) {
    const common = ['repo', 'config', 'no-config', 'preset', 'cwd', 'format', 'output', 'diagnostics', 'definitions', 'policy-source', 'policy-ref', 'policy-repository'];
    const apply = ['pr', 'plan', 'report', 'trust-report', 'git', 'rule', 'param', 'params-file', 'occasion', 'comment-author', 'comment-author-id',
        'exclude', 'include-only', 'force-include', 'exclude-mode', 'include-only-mode', 'force-include-mode'];
    const allowed = new Set([...common, ...(command === 'apply' ? apply : [])]);
    for (const name of Object.keys(v))
        if (!allowed.has(name))
            fail('E_CONFIG_CONFLICT', `Option --${name} is not supported by ${command}.`, 'config');
    if (v.format !== undefined && !['human', 'json', 'markdown', 'agent'].includes(String(v.format)))
        fail('E_FORMAT', 'Provider results support human, JSON, Markdown or agent output.', 'format');
    if (v.config !== undefined && v['no-config'])
        fail('E_CONFIG_CONFLICT', '--config and --no-config conflict.', 'config');
    if (v.repo !== undefined && !/^[^/\\\s]+\/[^/\\\s]+$/u.test(String(v.repo)))
        fail('E_USAGE', 'Repository must be OWNER/REPO.', 'config');
    if (command === 'apply') {
        if ((v.repo !== undefined) !== (v.pr !== undefined))
            fail('E_USAGE', 'Supply both --repo OWNER/REPO and --pr NUMBER.', 'config');
        if (!v.plan && !v.repo)
            fail('E_USAGE', 'Application needs --repo and --pr, or a saved --plan with a target.', 'plan');
        if (v.pr !== undefined && (!/^[1-9][0-9]*$/u.test(String(v.pr)) || !Number.isSafeInteger(Number(v.pr))))
            fail('E_USAGE', 'Pull request must be a positive safe integer.', 'config');
        if (v['trust-report'] && !v.report)
            fail('E_CONFIG_CONFLICT', '--trust-report requires --report.', 'config');
        if (v.git && v.report)
            fail('E_CONFIG_CONFLICT', 'Select local Git or a saved report, not both.', 'config');
        if (v['comment-author-id'] && !v['comment-author'])
            fail('E_CONFIG_CONFLICT', 'An author ID requires an author login.', 'config');
        if (v['comment-author-id'] !== undefined && (!/^[1-9][0-9]*$/u.test(String(v['comment-author-id'])) || !Number.isSafeInteger(Number(v['comment-author-id']))))
            fail('E_USAGE', 'Comment author ID must be a positive safe integer.', 'config');
    }
    else {
        if (!v.repo)
            fail('E_USAGE', 'Definition operations require --repo OWNER/REPO.', 'config');
        const modes = command === 'labels verify' ? ['verify'] : ['ensure', 'sync'];
        if (v.definitions !== undefined && !modes.includes(String(v.definitions)))
            fail('E_CONFIG_CONFLICT', 'Definition mode contradicts the selected operation.', 'config');
    }
    if (v.definitions !== undefined && !['none', 'ensure', 'verify', 'sync'].includes(String(v.definitions)))
        fail('E_USAGE', 'Unknown definitions mode.', 'config');
}
//# sourceMappingURL=arguments.js.map