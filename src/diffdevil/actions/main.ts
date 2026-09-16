import { runAction } from './run.js';
import { escapeCommand } from './outputs.js';
import type { ActionEntryPoint } from './surface.js';
export function actionCredentialValues(environment: NodeJS.ProcessEnv = process.env): readonly string[] {
  return [...new Set(['INPUT_GITHUB-TOKEN', 'INPUT_POLICY-TOKEN']
    .map(name => environment[name]?.trim()).filter((value): value is string => Boolean(value)))]
    .sort((left, right) => right.length - left.length);
}
export function redactActionCredentials(message: string, credentials: readonly string[]): string {
  return credentials.reduce((redacted, credential) => redacted.replaceAll(credential, '[redacted]'), message);
}
/** Workflow-command output is confined to this transport boundary, never provider or policy modules. */
export async function actionMain(entry: ActionEntryPoint): Promise<void> {
  const credentials = actionCredentialValues();
  for (const credential of credentials) process.stdout.write(`::add-mask::${escapeCommand(credential)}\n`);
  const result = await runAction(entry);
  if (result.ok) {
    process.exitCode = result.value.exitCode;
    for (const diagnostic of result.value.effects?.diagnostics ?? []) {
      const message = redactActionCredentials(diagnostic.message, credentials);
      process.stdout.write(`::error::${escapeCommand(`${diagnostic.code}: ${message}`)}\n`);
    }
  } else {
    process.exitCode = 2;
    for (const diagnostic of result.diagnostics) {
      const message = redactActionCredentials(diagnostic.message, credentials);
      process.stdout.write(`::error::${escapeCommand(`${diagnostic.code}: ${message}`)}\n`);
    }
  }
}
