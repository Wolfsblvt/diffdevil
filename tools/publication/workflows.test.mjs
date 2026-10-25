// SPDX-License-Identifier: AGPL-3.0-only
/**
 * GitHub Actions cannot run locally, so these cases read the exact boundaries the two production
 * workflows declare: who may hold which credential, which events can reach production, how runs
 * queue, and that untrusted dispatch input never becomes shell source.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = name => ({ name, text: readFileSync(join(root, '.github/workflows', name), 'utf8') });
const website = read('publish-website.yml');
const playground = read('deploy-playground.yml');
for (const workflow of [website, playground]) workflow.definition = parse(workflow.text);

const secretsIn = value => [...JSON.stringify(value ?? {}).matchAll(/secrets\.([A-Z0-9_]+)/gu)].map(match => match[1]);
const steps = (workflow, job) => workflow.definition.jobs[job].steps;
const named = (workflow, job, name) => steps(workflow, job).findIndex(step => step.name === name);

/** Each credential, the only workflow that may name it, and the commands allowed to receive it. */
const CREDENTIALS = {
  WOLFSBLVT_LEGAL_OPERATOR_B64: { workflow: 'publish-website.yml', commands: [/^npm run website:build:publication$/u] },
  CLOUDFLARE_PAGES_API_TOKEN: { workflow: 'publish-website.yml', commands: [/^node tools\/publication\/static-family\.mjs (?:prior|deploy|rollback)\b/u] },
  CLOUDFLARE_WORKERS_API_TOKEN: { workflow: 'deploy-playground.yml', commands: [/^node tools\/publication\/playground\.mjs (?:prior|upload|promote|rollback)\b/u] },
};

test('each credential reaches only its own named steps, never a workflow or job environment', () => {
  for (const workflow of [website, playground]) {
    const { definition } = workflow;
    assert.deepEqual(secretsIn(definition.env), [], `${workflow.name} has no workflow-level secret`);
    for (const [jobName, job] of Object.entries(definition.jobs)) {
      assert.deepEqual(secretsIn(job.env), [], `${workflow.name} ${jobName} has no job-level secret`);
      for (const step of job.steps) {
        const held = secretsIn(step);
        assert.deepEqual(secretsIn(step.with), [], `${step.name ?? step.uses} passes no secret to an action`);
        assert.ok(held.length <= 1, `${step.name} holds one credential at most, not ${held.join(', ')}`);
        for (const secret of held) {
          const rule = CREDENTIALS[secret];
          assert.ok(rule, `${secret} is not an admitted credential`);
          assert.equal(workflow.name, rule.workflow, `${secret} belongs only to ${rule.workflow}`);
          assert.ok(job.environment, `${step.name} receives ${secret} only inside a protected environment`);
          assert.ok(rule.commands.some(command => command.test(String(step.run ?? '').trim())), `${step.name} may not receive ${secret}`);
        }
      }
    }
  }
});

test('the private legal projection reaches exactly the one guarded build', () => {
  const holders = steps(website, 'publish').filter(step => secretsIn(step).includes('WOLFSBLVT_LEGAL_OPERATOR_B64'));
  assert.equal(holders.length, 1);
  assert.doesNotMatch(website.text.replace(/^\s*#.*$/gmu, ''), /WOLFSBLVT_LEGAL_OPERATOR_B64[^\n]*\n[^\n]*CLOUDFLARE/u);
  assert.doesNotMatch(playground.text, /WOLFSBLVT_LEGAL_OPERATOR_B64/u);
});

test('only trusted main reaches a production environment; pull requests stay credential-free', () => {
  for (const workflow of [website, playground]) {
    const { definition } = workflow;
    assert.deepEqual(definition.permissions, { contents: 'read' });
    assert.equal(definition.on.pull_request_target, undefined, 'never pull_request_target');
    assert.deepEqual(definition.on.push.branches, ['main']);
    for (const [jobName, job] of Object.entries(definition.jobs)) {
      if (job.environment) {
        assert.match(job.if, /github\.ref == 'refs\/heads\/main'/u, `${jobName} requires refs/heads/main`);
        assert.doesNotMatch(job.if, /pull_request/u, `${jobName} never runs for a pull request`);
      } else {
        assert.match(job.if, /^github\.event_name == 'pull_request'$/u, `${jobName} is the pull-request validator`);
        assert.deepEqual(secretsIn(job), [], `${jobName} receives no secret`);
      }
    }
  }
});

test('automatic deployment waits for its explicit Ops adoption switch; dispatch is the adoption route', () => {
  const gates = [[website, 'publish', 'DIFFDEVIL_WEBSITE_PUBLICATION', 'publish'], [playground, 'deploy', 'DIFFDEVIL_PLAYGROUND_DEPLOYMENT', 'deploy']];
  for (const [workflow, job, variable, operation] of gates) {
    const condition = workflow.definition.jobs[job].if;
    assert.match(condition, new RegExp(`github\\.event_name == 'push' && vars\\.${variable} == 'automatic'`, 'u'));
    assert.match(condition, new RegExp(`github\\.event_name == 'workflow_dispatch' && inputs\\.operation == '${operation}'`, 'u'));
  }
});

test('production runs queue in one slot per surface and are never cancelled', () => {
  const groups = {};
  for (const workflow of [website, playground]) {
    for (const [jobName, job] of Object.entries(workflow.definition.jobs)) {
      if (!job.environment) { assert.equal(job.concurrency['cancel-in-progress'], true); continue; }
      assert.equal(job.concurrency['cancel-in-progress'], false, `${jobName} is never cancelled mid-deployment`);
      (groups[workflow.name] ??= new Set()).add(job.concurrency.group);
    }
  }
  assert.deepEqual([...groups['publish-website.yml']], ['diffdevil-website-production']);
  assert.deepEqual([...groups['deploy-playground.yml']], ['diffdevil-playground-production']);
});

test('dispatch input and expressions are data, never shell source', () => {
  for (const workflow of [website, playground]) {
    for (const job of Object.values(workflow.definition.jobs)) {
      for (const step of job.steps) assert.doesNotMatch(String(step.run ?? ''), /\$\{\{/u, `${step.name} interpolates no expression into its script`);
    }
  }
});

test('third-party actions are pinned to reviewed commits', () => {
  for (const workflow of [website, playground]) {
    for (const job of Object.values(workflow.definition.jobs)) {
      for (const step of job.steps.filter(step => step.uses)) assert.match(step.uses, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/u, step.uses);
    }
  }
});

test('the static family admits its source, builds once and publishes manual first, site second', () => {
  const order = ['Admit the exact accepted source', 'Build the guarded publication pair', 'Record the production pair for rollback',
    'Verify the receipt and publish the manual', 'Verify the receipt and publish the site', 'Read back the public hosts'];
  const positions = order.map(name => named(website, 'publish', name));
  assert.ok(positions.every(position => position >= 0), 'every publication step exists');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'steps run in contract order');
  assert.match(steps(website, 'publish')[positions[3]].run, /--host docs$/u);
  assert.match(steps(website, 'publish')[positions[4]].run, /--host site$/u);
  assert.equal(steps(website, 'publish')[0].with['persist-credentials'], false);
});

test('the Worker qualifies an immutable preview before promoting exactly that version', () => {
  const order = ['Admit the exact accepted source', 'Build the engine and dry-run the Worker bundle', 'Record the active version for rollback',
    'Upload an immutable version without traffic', 'Qualify the version preview', 'Promote exactly that version', 'Read back the canonical Home'];
  const positions = order.map(name => named(playground, 'deploy', name));
  assert.ok(positions.every(position => position >= 0), 'every deployment step exists');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'steps run in contract order');
  assert.doesNotMatch(playground.text, /pages deploy|static-family|website:build/u, 'the Worker controller never touches the static hosts');
  assert.doesNotMatch(website.text, /playground\.mjs|versions (?:upload|deploy)/u, 'the static controller never deploys the Worker');
});

test('ordinary runs never create projects, Workers, domains or DNS', () => {
  const sources = ['static-family.mjs', 'playground.mjs', 'cloudflare.mjs'].map(file => readFileSync(join(root, 'tools/publication', file), 'utf8'));
  for (const text of [...sources, website.text, playground.text]) {
    assert.doesNotMatch(text, /project create|\/domains|dns_records|\/zones\/|workers\/subdomain|wrangler deploy\b/u);
  }
});
