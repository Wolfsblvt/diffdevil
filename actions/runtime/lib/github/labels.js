import { captureAsync, diagnosticOf, fail } from '../errors.js';
import { canonicalJson, deepFreeze, inertCopy } from '../inert.js';
import { readLabelDefinition } from '../policy/validation.js';
import { GitHubClient, GitHubRequestError } from './client.js';
import { githubRecord, githubString, repositoryPath } from './values.js';
import { EffectSession } from './observation.js';
function readLabel(value) {
    const row = githubRecord(value, 'label');
    if (row.archived !== undefined && typeof row.archived !== 'boolean')
        fail('E_GITHUB_RESPONSE', 'Label archived state must be boolean when present.', 'source');
    return { name: githubString(row.name, 'label name'), color: githubString(row.color, 'label color'), description: row.description === null ? '' : githubString(row.description, 'label description'),
        ...(row.archived === undefined ? {} : { archived: row.archived }) };
}
export async function readDefinitions(client, repository) {
    const result = new Map();
    for (const item of (await client.list(`${repositoryPath(repository)}/labels?per_page=100`)).items) {
        const label = readLabel(item), key = label.name.toLowerCase();
        if (result.has(key))
            fail('E_GITHUB_RESPONSE', 'GitHub returned duplicate case-insensitive label definitions.', 'source');
        result.set(key, label);
    }
    return result;
}
export async function readAssignments(client, repository, pullRequest) {
    const result = new Map();
    const rows = await client.list(`${repositoryPath(repository)}/issues/${pullRequest}/labels?per_page=100`);
    for (const value of rows.items) {
        const name = githubString(githubRecord(value, 'assigned label').name, 'assigned label name');
        if (result.has(name.toLowerCase()))
            fail('E_GITHUB_RESPONSE', 'GitHub returned duplicate assigned labels.', 'source');
        result.set(name.toLowerCase(), name);
    }
    return result;
}
export function assignmentIntent(plan, heldLabels) {
    const held = new Set(heldLabels.map(name => name.toLowerCase()));
    const wanted = new Map();
    const add = (name, required) => {
        const key = name.toLowerCase(), old = wanted.get(key);
        if (held.has(key) || old && old.wanted !== required)
            fail('E_EFFECT_CONFLICT', `GitHub label ${name} has conflicting or held case-insensitive assignments.`, 'plan');
        wanted.set(key, { name: old?.name ?? name, wanted: required });
    };
    for (const operation of plan.operations) {
        if (operation.kind === 'label.add' || operation.kind === 'label.remove')
            add(operation.name, operation.kind === 'label.add');
        if (operation.kind === 'label.select') {
            if (new Set(operation.members.map(name => name.toLowerCase())).size !== operation.members.length)
                fail('E_EFFECT_CONFLICT', 'A GitHub managed group contains case-insensitive duplicates.', 'plan');
            for (const name of operation.members)
                add(name, name === operation.selected);
        }
    }
    return wanted;
}
export function definitionIntent(input) {
    const definitions = new Map();
    const safe = githubRecord(inertCopy(input), 'label definitions');
    for (const [name, value] of Object.entries(safe)) {
        const definition = readLabelDefinition(value, `/labelDefinitions/${name}`), key = name.toLowerCase();
        if (!name || definitions.has(key))
            fail('E_EFFECT_CONFLICT', 'GitHub label definitions have empty or case-insensitively duplicated names.', 'plan');
        definitions.set(key, { name, definition });
    }
    return definitions;
}
function matchesDefinition(label, desired) {
    return label.color.toLowerCase() === desired.color.toLowerCase() && label.description === desired.description && label.archived !== true;
}
export async function reconcileDefinitions(client, repository, desired, current, mode, session) {
    const root = `${repositoryPath(repository)}/labels`;
    if (mode === 'verify') {
        const missing = [...desired].filter(([key, entry]) => !current.has(key) || !matchesDefinition(current.get(key), entry.definition)).map(([, entry]) => entry.name);
        if (missing.length)
            fail('E_LABEL_DEFINITIONS', `Label definitions differ from policy: ${missing.join(', ')}. Use explicit definition synchronization to reconcile them.`, 'apply');
        for (const { name } of desired.values())
            session.unchanged('label.verify', name);
        return;
    }
    for (const [key, entry] of desired) {
        const existing = current.get(key);
        if (existing && (mode === 'ensure' || matchesDefinition(existing, entry.definition))) {
            session.unchanged(`label.${mode}`, entry.name);
            continue;
        }
        const route = existing ? `${root}/${encodeURIComponent(existing.name)}` : root;
        const readback = async () => {
            const label = readLabel(await client.json(`${root}/${encodeURIComponent(entry.name)}`));
            current.set(key, label);
            return mode === 'ensure' || matchesDefinition(label, entry.definition);
        };
        await session.write({ kind: existing ? 'label.update-definition' : 'label.create-definition', subject: entry.name,
            perform: async () => {
                try {
                    await client.json(route, { method: existing ? 'PATCH' : 'POST', phase: 'apply',
                        body: { ...(existing ? { archived: false } : { name: entry.name }), ...entry.definition } });
                }
                catch (error) {
                    // A concurrent create may already supply ensure's complete postcondition.
                    if (!(error instanceof GitHubRequestError && error.status === 422 && !existing))
                        throw error;
                    const label = readLabel(await client.json(`${root}/${encodeURIComponent(entry.name)}`));
                    current.set(key, label);
                    if (mode === 'sync' && !matchesDefinition(label, entry.definition))
                        throw error;
                }
            }, verify: readback });
    }
}
export async function reconcileAssignments(client, plan, wanted, current, definitions, session) {
    for (const [key, entry] of wanted) {
        if (!entry.wanted)
            continue;
        const definition = definitions.get(key);
        if (!definition || definition.archived)
            fail('E_LABEL_UNAVAILABLE', `Required label ${entry.name} is missing or archived. Ensure missing definitions or explicitly synchronize archived definitions before assignment.`, 'apply');
    }
    const initiallyAssigned = new Set(current.keys());
    const additions = [...wanted].filter(([key, item]) => item.wanted && !current.has(key)).map(([, item]) => item.name);
    const root = `${repositoryPath(plan.target.repository)}/issues/${plan.target.pullRequest}/labels`;
    if (additions.length) {
        await session.write({ kind: 'label.add', subject: additions.join(', '),
            perform: async () => { await client.json(root, { method: 'POST', body: { labels: additions }, phase: 'apply' }); },
            verify: async () => {
                const readback = await readAssignments(client, plan.target.repository, plan.target.pullRequest);
                current.clear();
                for (const [key, name] of readback)
                    current.set(key, name);
                return additions.every(name => current.has(name.toLowerCase()));
            } });
    }
    // All desired additions have been observed before removing an old group member.
    for (const [key, entry] of wanted) {
        if (entry.wanted) {
            if (initiallyAssigned.has(key))
                session.unchanged('label.assignment', entry.name);
            continue;
        }
        if (!current.has(key)) {
            session.unchanged('label.assignment', entry.name);
            continue;
        }
        const name = current.get(key);
        await session.write({ kind: 'label.remove', subject: name,
            perform: async () => { await client.json(`${root}/${encodeURIComponent(name)}`, { method: 'DELETE', phase: 'apply' }); },
            verify: async () => {
                const readback = await readAssignments(client, plan.target.repository, plan.target.pullRequest);
                current.clear();
                for (const [id, label] of readback)
                    current.set(id, label);
                return !current.has(key);
            } });
    }
    const final = await readAssignments(client, plan.target.repository, plan.target.pullRequest);
    if ([...wanted].some(([key, intent]) => final.has(key) !== intent.wanted))
        fail('E_GITHUB_READBACK', 'Managed label assignments changed during reconciliation. Unrelated labels were not replaced.', 'apply');
}
/** Standalone repository definition operation. It never acquires or changes a PR. */
export function syncGitHubLabels(client, repository, definitions, mode = 'verify', options = {}) {
    return captureAsync(async () => {
        if (!['verify', 'ensure', 'sync'].includes(mode))
            fail('E_CONFIG', 'Definition mode must be verify, ensure or sync.', 'config');
        const desired = definitionIntent(definitions), current = await readDefinitions(client, repository), session = new EffectSession(options.assertCurrent);
        const diagnostics = [];
        try {
            await options.assertCurrent?.();
            await reconcileDefinitions(client, repository, desired, current, mode, session);
            await options.assertCurrent?.();
        }
        catch (error) {
            diagnostics.push(diagnosticOf(error, 'apply'));
        }
        return deepFreeze({ kind: 'diffdevil.github-definitions', schemaVersion: '1.0', status: diagnostics.length ? 'incomplete' : 'verified',
            changed: session.observations.filter(row => row.outcome === 'changed').length, observations: session.observations, diagnostics });
    });
}
//# sourceMappingURL=labels.js.map