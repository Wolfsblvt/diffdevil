import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fail, unwrap } from '../errors.js';
import { DEFAULT_LIMITS } from '../limits.js';
import { explainPolicy, type CompiledPolicy, type PolicyCompileOptions } from '../policy/compile.js';
import { readPolicyJson } from '../policy/source.js';
import { loadLocalPolicy } from '../hosts/policy.js';
import { parameterValue, policyRecord } from '../policy/validation.js';
import { parseNumericInput } from '../language/shortcuts.js';
import type { PathOverrides } from '../policy/types.js';
import type { Invocation } from './arguments.js';
import { readUtf8 } from '../hosts/io.js';

const execute = promisify(execFile);
async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
export function pathOverrides(v: Invocation['values']): PathOverrides {
  const paths: Record<string, unknown> = {};
  for (const [flag, field] of [['exclude','exclude'],['include-only','includeOnly'],['force-include','forceInclude']] as const) {
    if (v[flag] !== undefined || v[`${flag}-mode`] !== undefined) paths[field] = v[flag] ?? [];
    if (v[`${flag}-mode`] !== undefined) paths[`${field}Mode`] = v[`${flag}-mode`];
  }
  return paths as PathOverrides;
}
export interface SelectedPolicy { readonly policy: CompiledPolicy; readonly parameters: Readonly<Record<string, unknown>> }
/** Trusted local acquisition only. Policy/evaluation modules never read a file. */
export async function loadPolicy(invocation: Invocation, cwd: string): Promise<SelectedPolicy | undefined> {
  const v = invocation.values;
  if (v.report && !v.config && !v.preset && !(invocation.command === 'plan' && v['no-config'])) {
    if (v.param || v['params-file'] || invocation.command === 'plan') fail('E_REPORT_CONTEXT', 'Re-evaluating a saved report requires --config, --preset, or explicit built-in defaults with --no-config for plan.', 'config');
    if (v['exclude-mode'] || v['include-only-mode'] || v['force-include-mode']) fail('E_REPORT_CONTEXT','Layered path modes require a selected policy.','config');
    return undefined;
  }
  let file = v.config ? resolve(cwd, String(v.config)) : undefined;
  if (!file && !v['no-config']) {
    let root = cwd;
    try { root = (await execute('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', windowsHide: true })).stdout.trim(); }
    catch { /* An explicit unified diff may live outside a Git repository. */ }
    const candidate = resolve(root, '.diffdevil.yml');
    if (await exists(candidate)) file = candidate;
  }
  const presets = presetSelection(v.preset as readonly string[] | undefined);
  const options: PolicyCompileOptions = { paths: pathOverrides(v), ...(presets === undefined ? {} : { presets }) };
  const policy = await loadLocalPolicy(file, cwd, options);
  return { policy, parameters: await readParameters(policy, v, cwd) };
}
export async function readParameters(policy: CompiledPolicy, v: Invocation['values'], cwd: string): Promise<Readonly<Record<string, unknown>>> {
  const declarations = explainPolicy(policy).document.parameters ?? {};
  const parameters: Record<string, unknown> = Object.create(null);
  const add = (name: string, value: unknown): void => {
    if (Object.hasOwn(parameters, name)) fail('E_CONFIG_CONFLICT', `Parameter ${name} was supplied more than once.`, 'config');
    if (!Object.hasOwn(declarations, name)) fail('E_PARAMETER_UNKNOWN', `Unknown parameter ${name}.`, 'config');
    parameters[name] = parameterValue(declarations[name]!.type, value, `/params/${name}`);
  };
  if (v['params-file']) {
    const path = resolve(cwd, String(v['params-file']));
    const data = unwrap(readPolicyJson(await readUtf8(path, { maximum: DEFAULT_LIMITS.configBytes, preserveBom: true }), { name:path })).document;
    for (const [name, value] of Object.entries(policyRecord(data, '/params'))) add(name, value);
  }
  for (const binding of (v.param ?? []) as readonly string[]) {
    const split = binding.indexOf('=');
    if (split < 1) fail('E_USAGE', 'A parameter binding requires NAME=VALUE.', 'config');
    const name = binding.slice(0,split), text = binding.slice(split+1);
    const type = declarations[name]?.type;
    if (type === undefined) fail('E_PARAMETER_UNKNOWN', `Unknown parameter ${name}.`, 'config');
    let value: unknown = text;
    if (type === 'boolean') {
      if (text !== 'true' && text !== 'false') fail('E_PARAMETER_TYPE', `Parameter ${name} requires true or false.`, 'config');
      value = text === 'true';
    } else if (type === 'integer' || type === 'float') value = parseNumericInput(text).value;
    add(name,value);
  }
  return parameters;
}

export function presetSelection(names: readonly string[] | undefined): readonly 'size@1'[] | undefined {
  if (names === undefined) return undefined;
  if (names.length === 1 && names[0] === 'none') return [];
  if (names.length === 1 && names[0] === 'size@1') return ['size@1'];
  return fail('E_CONFIG_CONFLICT', 'Select one supported preset or none.', 'config');
}
