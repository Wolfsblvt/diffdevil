import { randomUUID } from 'node:crypto';
import { open, lstat, realpath, mkdir, mkdtemp, access, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fail } from '../errors.js';
import { writeAtomic } from '../hosts/io.js';
import { displayMeasurement } from '../format.js';
import { outputNames } from './surface.js';
/** Escape command data, including newlines, without ever writing policy or patches as commands. */
export function escapeCommand(value) {
    return value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}
/** Each value gets an unguessable delimiter, checked against every represented line. */
export function outputCommands(outputs) {
    let text = '';
    for (const [name, value] of Object.entries(outputs)) {
        if (!/^[a-z][a-z0-9-]*$/u.test(name) || value.includes('\0'))
            fail('E_ACTION_OUTPUT', 'Invalid Action output name or NUL-containing value.', 'format');
        let delimiter;
        do {
            delimiter = `diffdevil_${randomUUID()}`;
        } while (value.split(/\r?\n/u).includes(delimiter));
        text += `${name}<<${delimiter}\n${value}\n${delimiter}\n`;
    }
    // Leave room for other steps: GitHub approximates its per-job budget in UTF-16.
    if (text.length * 2 > 512 * 1024)
        fail('E_LIMIT', 'Action outputs exceed the selected 512 KiB UTF-16 budget. Full results remain in artifact files.', 'format');
    return text;
}
function numeric(outputs, base, value, valueName = base) {
    outputs[valueName] = value?.status === 'exact' ? String(value.value) : '';
    outputs[`${base}-status`] = value?.status ?? '';
    outputs[`${base}-min`] = value?.status === 'exact' ? String(value.value) : value && 'lower' in value && value.lower !== undefined ? String(value.lower) : '';
    outputs[`${base}-max`] = value?.status === 'exact' ? String(value.value) : value && 'upper' in value && value.upper !== undefined ? String(value.upper) : '';
}
/** Summary envelopes retain certainty and bounds, not potentially unbounded reason/candidate lists. */
function compactEvidence(value) {
    if (value === undefined)
        return undefined;
    if (value.status !== 'unknown' && value.status !== 'unmeasurable')
        return value;
    return { status: value.status, reasonCount: value.reasons.length,
        ...('lower' in value && value.lower !== undefined ? { lower: value.lower } : {}),
        ...('upper' in value && value.upper !== undefined ? { upper: value.upper } : {}),
        ...('candidates' in value ? { candidateCount: value.candidates.length } : {}) };
}
function compactMeasurements(values) {
    return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, compactEvidence(value)]));
}
/** Compact discriminated envelopes are not truncated full reports or executable plans. */
export function actionOutputs(entry, result, paths) {
    const outputs = Object.fromEntries(outputNames(entry).map(name => [name, '']));
    if (result.report) {
        const report = result.report;
        for (const key of ['added', 'deleted', 'modified', 'changed'])
            numeric(outputs, `lines-${key}`, report.totals.lines[key]);
        for (const key of ['added', 'deleted', 'churn'])
            numeric(outputs, `raw-${key}`, report.totals.raw[key]);
        for (const key of ['total', 'included', 'excluded', 'unmeasurable'])
            numeric(outputs, `files-${key}`, report.totals.files[key]);
        numeric(outputs, 'metric', result.metric, 'metric-value');
        outputs['measurement-status'] = report.measurement.status;
        outputs.decision = result.decision?.status === 'resolved' ? String(result.decision.value) : result.decision ? 'unknown' : '';
        outputs.band = result.band?.status === 'resolved' ? result.band.id : '';
        outputs['band-status'] = result.band?.status ?? '';
        outputs['report-path'] = paths.report ?? '';
        outputs['report-json'] = JSON.stringify({ kind: 'diffdevil.action-report-summary', schemaVersion: '1.0', semantics: report.semantics,
            source: report.source, reportId: report.reportId, policyId: report.policyId, measurementStatus: report.measurement.status,
            fileSet: { complete: report.fileSet.complete, total: compactEvidence(report.fileSet.total) },
            totals: { lines: compactMeasurements({ ...report.totals.lines }), raw: compactMeasurements({ ...report.totals.raw }), files: compactMeasurements(report.totals.files) },
            metric: compactEvidence(result.metric), decision: compactEvidence(result.decision), band: compactEvidence(result.band), reportPath: paths.report });
    }
    if (result.plan) {
        const plan = result.plan;
        outputs['plan-path'] = paths.plan ?? '';
        outputs['plan-json'] = JSON.stringify({ kind: 'diffdevil.action-plan-summary', schemaVersion: '1.0', stage: plan.stage,
            source: plan.source, reportId: plan.reportId, policyId: plan.policyId, target: plan.target,
            operations: plan.operations.length, heldRules: plan.held.length, planPath: paths.plan });
    }
    if (result.effects) {
        outputs['effects-changed'] = String(result.effects.changed);
        outputs['effects-status'] = result.effects.status;
        outputs['effects-path'] = paths.effects ?? '';
    }
    return outputs;
}
function html(value) {
    // Encode HTML, Markdown syntax and line breaks rather than trusting provider-controlled labels.
    return value.replace(/[&<>"'\\`*_{}\[\]()#+.!|~\r\n]/gu, character => `&#${character.codePointAt(0)};`);
}
export function actionSummary(result) {
    const rows = [];
    if (result.report) {
        const { source, totals } = result.report;
        rows.push(['Source', source.kind]);
        if (source.repository)
            rows.push(['Repository', source.repository]);
        if (source.pullRequest)
            rows.push(['Pull request', String(source.pullRequest)]);
        if (source.comparison)
            rows.push(['Comparison', source.comparison]);
        if (source.base)
            rows.push(['Compared base', source.base]);
        if (source.baseTip)
            rows.push(['Base tip', source.baseTip]);
        if (source.head)
            rows.push(['Head', source.head]);
        rows.push(['Measurement', result.report.measurement.status], ['Changed lines', displayMeasurement(totals.lines.changed)], ['Added-only lines', displayMeasurement(totals.lines.added)], ['Deleted-only lines', displayMeasurement(totals.lines.deleted)], ['Modified lines', displayMeasurement(totals.lines.modified)], ['Raw additions', displayMeasurement(totals.raw.added)], ['Raw deletions', displayMeasurement(totals.raw.deleted)], ['Raw churn', displayMeasurement(totals.raw.churn)]);
        for (const name of ['total', 'included', 'excluded', 'unmeasurable']) {
            const value = totals.files[name];
            rows.push([`Files ${name}`, value ? displayMeasurement(value) : 'Not available']);
        }
        rows.push(['File list', result.report.fileSet.complete ? 'Complete' : 'Incomplete']);
        if (result.metric)
            rows.push(['Metric', displayMeasurement(result.metric)]);
        if (result.decision)
            rows.push(['Decision', result.decision.status === 'resolved' ? String(result.decision.value) : 'unknown']);
        if (result.band)
            rows.push(['Band', result.band.status === 'resolved' ? result.band.id : 'unknown']);
    }
    if (result.plan)
        rows.push(['Desired operations (not observed changes)', String(result.plan.operations.length)], ['Held rules', String(result.plan.held.length)]);
    if (result.effects)
        rows.push(['Provider result', result.effects.status], ['Verified changed operations', String(result.effects.changed)]);
    else
        rows.push(['Provider effects', 'Not applied']);
    let text = '## diffdevil\n\n| Observation | Value |\n| --- | --- |\n' + rows.map(([key, value]) => `| ${html(key)} | ${html(value)} |`).join('\n') + '\n';
    if (result.report?.metrics && Object.keys(result.report.metrics).length) {
        const metrics = Object.entries(result.report.metrics);
        text += '\n### Policy metrics\n\n| Metric | Value |\n| --- | --- |\n';
        for (const [name, value] of metrics.slice(0, 30))
            text += `| ${html(name)} | ${html(displayMeasurement(value))} |\n`;
        if (metrics.length > 30)
            text += '\nAdditional metrics are in the full report.\n';
    }
    if (result.report && result.report.measurement.status !== 'exact') {
        text += '\nAn unavailable exact value is not zero. Scalar outputs may be empty; use their status and bounds, or inspect the full report.\n';
    }
    if (result.effects) {
        const observations = result.effects.observations;
        text += '\n### Provider observations\n\n';
        for (const observation of observations.slice(0, 40))
            text += `- ${html(observation.kind)}: ${html(observation.subject)} — ${html(observation.outcome)}; request ${html(observation.request)}, readback ${html(observation.readback)}.\n`;
        if (observations.length > 40)
            text += '\nAdditional observations are in the full effects journal.\n';
        for (const diagnostic of result.effects.diagnostics)
            text += `\n${html(diagnostic.code)}: ${html(diagnostic.message)}\n`;
    }
    if (Buffer.byteLength(text) > 256 * 1024)
        return '## diffdevil\n\nSummary exceeds its display budget. Consult the full report, plan and effects journal; no provider success is inferred.\n';
    return text;
}
async function commandFile(path, name) {
    if (!path)
        fail('E_ACTION_ENV', `${name} must identify a runner command file.`, 'config');
    try {
        if (!(await lstat(path)).isFile())
            fail('E_ACTION_ENV', `${name} must be an existing regular file, not a symlink.`, 'config');
        return await open(path, 'a');
    }
    catch {
        return fail('E_ACTION_ENV', `${name} must identify an existing writable regular file.`, 'config');
    }
}
async function canonicalDestination(path) {
    try {
        return await realpath(path);
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
        return resolve(await realpath(dirname(path)), path.split(/[\\/]/u).at(-1));
    }
}
/** Preflight destinations before any provider mutation; keep the partial journal if apply is incomplete. */
export class ActionOutputSession {
    paths;
    output;
    summary;
    constructor(paths, output, summary) {
        this.paths = paths;
        this.output = output;
        this.summary = summary;
    }
    static async open(context, environment) {
        const output = await commandFile(environment.GITHUB_OUTPUT, 'GITHUB_OUTPUT');
        let summary;
        try {
            if (context.summary) {
                summary = await commandFile(environment.GITHUB_STEP_SUMMARY, 'GITHUB_STEP_SUMMARY');
                const [outStat, summaryStat] = await Promise.all([output.stat(), summary.stat()]);
                if (outStat.dev === summaryStat.dev && outStat.ino === summaryStat.ino)
                    fail('E_ACTION_PATH', 'GITHUB_OUTPUT and GITHUB_STEP_SUMMARY must be distinct files.', 'config');
            }
            const root = environment.RUNNER_TEMP ?? tmpdir();
            await mkdir(root, { recursive: true });
            const directory = await mkdtemp(resolve(root, 'diffdevil-'));
            const paths = {};
            const sources = [environment.GITHUB_OUTPUT, context.summary ? environment.GITHUB_STEP_SUMMARY : undefined, environment.GITHUB_EVENT_PATH,
                context.inputs['input-report'] && resolve(context.cwd, context.inputs['input-report']), context.inputs['input-plan'] && resolve(context.cwd, context.inputs['input-plan']),
                context.inputs['policy-source'] === 'workspace' && context.inputs.config ? resolve(context.cwd, context.inputs.config) : undefined].filter((path) => Boolean(path));
            const occupied = new Set(await Promise.all(sources.map(canonicalDestination)));
            for (const kind of ['report', 'plan', 'effects']) {
                const needed = kind === 'report' ? context.entryPoint !== 'sync-labels' : kind === 'plan' ? ['plan', 'apply'].includes(context.mode) : ['apply', 'verify', 'definitions'].includes(context.mode);
                if (!needed)
                    continue;
                const selected = context.inputs[`${kind}-path`];
                const path = selected ? resolve(context.cwd, selected) : resolve(directory, `${kind}.json`);
                // A requested destination's parent must exist: never create arbitrary checkout trees implicitly.
                await access(dirname(path), constants.W_OK);
                const canonical = await canonicalDestination(path);
                if (occupied.has(canonical))
                    fail('E_ACTION_PATH', 'Artifact destinations must be distinct from one another and from input/runner files.', 'config');
                occupied.add(canonical);
                try {
                    if (!(await lstat(path)).isFile())
                        fail('E_ACTION_PATH', 'An artifact destination must be a regular file, not a directory or symlink.', 'config');
                }
                catch (error) {
                    if (error.code !== 'ENOENT')
                        throw error;
                }
                // Exercise actual file creation, not merely a permission-bit prediction.
                const probe = resolve(dirname(path), `.diffdevil-probe-${randomUUID()}`);
                const handle = await open(probe, 'wx');
                await handle.close();
                await unlink(probe);
                paths[kind] = path;
            }
            return new ActionOutputSession(paths, output, summary);
        }
        catch (error) {
            await output.close();
            await summary?.close();
            throw error;
        }
    }
    async publish(entry, result) {
        // Journal first: a later filesystem failure must not discard already observed remote effects.
        if (this.paths.effects && result.effects)
            await writeAtomic(this.paths.effects, JSON.stringify(result.effects, null, 2) + '\n');
        if (this.paths.report && result.report)
            await writeAtomic(this.paths.report, JSON.stringify(result.report, null, 2) + '\n');
        if (this.paths.plan && result.plan)
            await writeAtomic(this.paths.plan, JSON.stringify(result.plan, null, 2) + '\n');
        const outputs = actionOutputs(entry, result, this.paths);
        await this.output.appendFile(outputCommands(outputs), 'utf8');
        if (this.summary)
            await this.summary.appendFile(actionSummary(result), 'utf8');
        return outputs;
    }
    async close() { await this.output.close(); await this.summary?.close(); }
}
//# sourceMappingURL=outputs.js.map