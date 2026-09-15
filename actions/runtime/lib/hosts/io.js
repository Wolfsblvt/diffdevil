import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { open, realpath, writeFile, rename, unlink } from 'node:fs/promises';
import { fail } from '../errors.js';
const inputLimit = 64 * 1024 * 1024;
export async function readUtf8(path, options = {}) {
    const maximum = options.maximum ?? inputLimit;
    try {
        const handle = await open(path, 'r');
        try {
            const metadata = await handle.stat();
            if (!metadata.isFile())
                fail('E_SOURCE', 'Input must be a regular file; use --stdin for streamed input.', 'source');
            if (metadata.size > maximum)
                fail('E_LIMIT', `Input exceeds the ${maximum}-byte limit.`, 'source');
            const chunks = [];
            let length = 0;
            // Enforce the bound during acquisition as well as before it: a file can grow.
            for await (const chunk of handle.createReadStream({ autoClose: false })) {
                const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                length += bytes.length;
                if (length > maximum)
                    fail('E_LIMIT', 'Input grew beyond its acquisition limit.', 'source');
                chunks.push(bytes);
            }
            try {
                return new TextDecoder('utf-8', { fatal: true, ignoreBOM: options.preserveBom ?? false }).decode(Buffer.concat(chunks));
            }
            catch {
                return fail('E_SOURCE', 'Input is not valid UTF-8.', 'source');
            }
        }
        finally {
            await handle.close();
        }
    }
    catch (error) {
        if (error instanceof Error && error.name === 'DiffdevilError')
            throw error;
        return fail('E_SOURCE', `Cannot read input: ${error instanceof Error ? error.message : 'filesystem error'}`, 'source');
    }
}
/** Read selected workspace data without following a policy/template escape outside the checkout. */
export async function readWorkspaceUtf8(path, root, options = {}) {
    const [workspace, source] = await Promise.all([realpath(root), realpath(path)]);
    const inside = relative(workspace, source);
    if (inside === '..' || inside.startsWith('../') || inside.startsWith('..\\') || isAbsolute(inside)) {
        fail('E_POLICY_SOURCE', 'Workspace policy and template files must remain inside the selected workspace, including symlink targets.', 'config');
    }
    return readUtf8(source, options);
}
export async function stdinText(options = {}) {
    const maximum = options.maximum ?? inputLimit;
    const chunks = [];
    let length = 0;
    for await (const chunk of process.stdin) {
        const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        length += b.length;
        if (length > maximum)
            fail('E_LIMIT', 'Stdin exceeds the acquisition limit.', 'source');
        chunks.push(b);
    }
    try {
        return new TextDecoder('utf-8', { fatal: true, ignoreBOM: options.preserveBom ?? false }).decode(Buffer.concat(chunks));
    }
    catch {
        return fail('E_SOURCE', 'Stdin is not valid UTF-8.', 'source');
    }
}
/** Write a complete result beside its destination before replacing that destination. */
export async function writeAtomic(path, text) {
    const temporary = resolve(dirname(path), `.diffdevil-${randomUUID()}.tmp`);
    try {
        await writeFile(temporary, text, { encoding: 'utf8', flag: 'wx' });
        await rename(temporary, path);
    }
    catch (error) {
        await unlink(temporary).catch(() => { });
        throw error;
    }
}
//# sourceMappingURL=io.js.map