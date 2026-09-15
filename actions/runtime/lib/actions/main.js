import { runAction } from './run.js';
import { escapeCommand } from './outputs.js';
/** Workflow-command output is confined to this transport boundary, never provider or policy modules. */
export async function actionMain(entry) {
    const token = process.env['INPUT_GITHUB-TOKEN']?.trim();
    if (token)
        process.stdout.write(`::add-mask::${escapeCommand(token)}\n`);
    const result = await runAction(entry);
    if (result.ok) {
        process.exitCode = result.value.exitCode;
        for (const diagnostic of result.value.effects?.diagnostics ?? []) {
            const message = token ? diagnostic.message.replaceAll(token, '[redacted]') : diagnostic.message;
            process.stdout.write(`::error::${escapeCommand(`${diagnostic.code}: ${message}`)}\n`);
        }
    }
    else {
        process.exitCode = 2;
        for (const diagnostic of result.diagnostics) {
            const message = token ? diagnostic.message.replaceAll(token, '[redacted]') : diagnostic.message;
            process.stdout.write(`::error::${escapeCommand(`${diagnostic.code}: ${message}`)}\n`);
        }
    }
}
//# sourceMappingURL=main.js.map