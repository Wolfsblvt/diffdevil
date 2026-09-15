import { fail } from '../errors.js';
import { checkedInteger } from '../numeric.js';
import { scalarCharacters, validatePath } from '../paths.js';
function sourceError(message, line) { return fail('E_SOURCE', line === undefined ? message : `${message} At diff line ${line + 1}.`, 'source'); }
function countToken(text) {
    if (!/^(0|[1-9][0-9]*)$/u.test(text))
        sourceError('Invalid hunk count.');
    const value = BigInt(text);
    if (value > BigInt(Number.MAX_SAFE_INTEGER))
        sourceError('Hunk count exceeds the safe integer domain.');
    return Number(value);
}
function linesOf(text) {
    if (text.includes('\0'))
        sourceError('A unified diff cannot contain NUL bytes.');
    scalarCharacters(text);
    const lines = text.split('\n');
    if (lines[lines.length - 1] === '')
        lines.pop();
    return lines;
}
function readHunks(lines, start) {
    const blocks = [];
    let i = start, additions = 0, deletions = 0, hunk = 0;
    let previousOldEnd = -1, previousNewEnd = -1;
    while (i < lines.length && lines[i].startsWith('@@')) {
        const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:.*)?$/u.exec(lines[i].replace(/\r$/u, ''));
        if (!header)
            sourceError('Malformed or unsupported hunk header.', i);
        const oldStart = countToken(header[1]), oldCount = countToken(header[2] ?? '1');
        const newStart = countToken(header[3]), newCount = countToken(header[4] ?? '1');
        if ((oldCount > 0 && oldStart === 0) || (newCount > 0 && newStart === 0) || (oldCount === 0 && newCount === 0))
            sourceError('Invalid empty hunk range.', i);
        if (oldStart < previousOldEnd || newStart < previousNewEnd)
            sourceError('Hunk ranges overlap or are out of order.', i);
        previousOldEnd = oldStart + oldCount;
        previousNewEnd = newStart + newCount;
        if (!Number.isSafeInteger(previousOldEnd) || !Number.isSafeInteger(previousNewEnd))
            sourceError('Hunk range exceeds the safe integer domain.', i);
        let oldUsed = 0, newUsed = 0, blockAdded = 0, blockDeleted = 0;
        let blockOldStart = oldStart, blockNewStart = newStart, contentSeen = false, marked = false;
        const flush = () => {
            if (blockAdded || blockDeleted)
                blocks.push({ added: blockAdded, deleted: blockDeleted, hunk, oldStart: blockOldStart, newStart: blockNewStart });
            blockAdded = 0;
            blockDeleted = 0;
        };
        i++;
        hunk++;
        while (oldUsed < oldCount || newUsed < newCount) {
            if (i >= lines.length)
                sourceError('Truncated hunk: declared lines are missing.', i);
            const line = lines[i];
            if (line.replace(/\r$/u, '') === '\\ No newline at end of file') {
                if (!contentSeen || marked)
                    sourceError('Misplaced no-newline marker.', i);
                marked = true;
                i++;
                continue;
            }
            if (line[0] !== '+' && line[0] !== '-' && line[0] !== ' ')
                sourceError('Expected a hunk content line.', i);
            if (line[0] === ' ') {
                flush();
                oldUsed++;
                newUsed++;
            }
            else {
                if (!blockAdded && !blockDeleted) {
                    blockOldStart = oldStart + oldUsed;
                    blockNewStart = newStart + newUsed;
                }
                if (line[0] === '+') {
                    blockAdded++;
                    newUsed++;
                    additions++;
                }
                else {
                    blockDeleted++;
                    oldUsed++;
                    deletions++;
                }
            }
            if (oldUsed > oldCount || newUsed > newCount)
                sourceError('Hunk content exceeds its declared range.', i);
            contentSeen = true;
            marked = false;
            i++;
        }
        if (i < lines.length && lines[i].replace(/\r$/u, '') === '\\ No newline at end of file') {
            if (marked)
                sourceError('Repeated no-newline marker.', i);
            i++;
        }
        flush();
    }
    checkedInteger(additions);
    checkedInteger(deletions);
    return { patch: { additions, deletions, blocks }, next: i };
}
/** Parse a provider patch fragment. Metadata is not accepted in this entry point. */
export function parsePatch(text) {
    const lines = linesOf(text);
    if (lines.length === 0)
        return { additions: 0, deletions: 0, blocks: [] };
    const result = readHunks(lines, 0);
    if (result.next !== lines.length)
        sourceError('Unexpected content outside a hunk.', result.next);
    return result.patch;
}
function quotedPath(text) {
    if (text[0] !== '"')
        return { value: text, consumed: text.length };
    const bytes = [], encoder = new TextEncoder();
    let i = 1;
    for (; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            try {
                return { value: new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)), consumed: i + 1 };
            }
            catch {
                return sourceError('Git path is not valid UTF-8.');
            }
        }
        if (char !== '\\') {
            const cp = text.codePointAt(i);
            const scalar = String.fromCodePoint(cp);
            bytes.push(...encoder.encode(scalar));
            if (cp > 0xffff)
                i++;
            continue;
        }
        const next = text[++i];
        if (next === undefined)
            sourceError('Incomplete quoted Git path.');
        const escapes = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11, '\\': 92, '"': 34 };
        if (Object.hasOwn(escapes, next))
            bytes.push(escapes[next]);
        else if (/[0-7]/u.test(next)) {
            let octal = next;
            for (let j = 0; j < 2 && /[0-7]/u.test(text[i + 1] ?? 'x'); j++)
                octal += text[++i];
            const byte = Number.parseInt(octal, 8);
            if (byte > 255)
                sourceError('Git path escape exceeds one byte.');
            bytes.push(byte);
        }
        else
            sourceError('Unsupported quoted Git path escape.');
    }
    return sourceError('Unterminated quoted Git path.');
}
function headerPath(text, stripPrefix) {
    let value;
    if (text.startsWith('"')) {
        const quoted = quotedPath(text);
        value = quoted.value;
        const rest = text.slice(quoted.consumed);
        if (rest !== '' && !rest.startsWith('\t'))
            sourceError('Unexpected content after quoted Git path.');
    }
    else
        value = text.split('\t', 1)[0];
    if (value === '/dev/null')
        return undefined;
    if (stripPrefix && (value.startsWith('a/') || value.startsWith('b/')))
        value = value.slice(2);
    return validatePath(value);
}
function gitHeaderPair(text) {
    let left, right;
    if (text.startsWith('"')) {
        const first = quotedPath(text);
        if (text[first.consumed] !== ' ')
            sourceError('Malformed Git file header.');
        left = first.value;
        const second = text.slice(first.consumed + 1);
        if (second.startsWith('"')) {
            const decoded = quotedPath(second);
            if (decoded.consumed !== second.length)
                sourceError('Trailing data after Git path.');
            right = decoded.value;
        }
        else
            right = second;
    }
    else if (text.includes(' "b/')) {
        const split = text.indexOf(' "b/');
        left = text.slice(0, split);
        const tail = text.slice(split + 1), decoded = quotedPath(tail);
        if (decoded.consumed !== tail.length)
            sourceError('Trailing data after Git path.');
        right = decoded.value;
    }
    else {
        const candidates = [...text.matchAll(/ b\//gu)].map(match => match.index);
        const same = candidates.find(pos => text.slice(0, pos).replace(/^a\//u, '') === text.slice(pos + 1).replace(/^b\//u, ''));
        const split = same ?? candidates[0];
        if (split === undefined)
            sourceError('Malformed Git file header.');
        left = text.slice(0, split);
        right = text.slice(split + 1);
    }
    if (!left.startsWith('a/') || !right.startsWith('b/'))
        sourceError('Git diff must use a/ and b/ path prefixes.');
    return [left.slice(2), right.slice(2)];
}
/** Complete Git-style or ordinary multi-file unified diff, with strict hunk accounting. */
export function parseUnifiedDiff(text) {
    const lines = linesOf(text), files = [];
    let i = 0;
    while (i < lines.length) {
        const first = lines[i].replace(/\r$/u, '');
        const gitStyle = first.startsWith('diff --git ');
        if (first.startsWith('diff --cc ') || first.startsWith('diff --combined '))
            sourceError('Combined merge diffs are not supported.', i);
        if (!gitStyle && !first.startsWith('--- '))
            sourceError('Expected a Git or unified-diff file header.', i);
        let before, after;
        if (gitStyle) {
            [before, after] = gitHeaderPair(first.slice(11));
            i++;
        }
        let changeType = 'modified', kind = 'text';
        let patch, hasHeaders = false, knownEmpty = false, identity = false, sawMetadata = false;
        let oldMode, newMode;
        let renamedFrom, renamedTo;
        while (i < lines.length) {
            const line = lines[i].replace(/\r$/u, '');
            if (line.startsWith('diff --'))
                break;
            if (line.startsWith('@@')) {
                if (!hasHeaders)
                    sourceError('Text hunk has no file path headers.', i);
                const parsed = readHunks(lines, i);
                patch = parsed.patch;
                i = parsed.next;
                break;
            }
            if (line.startsWith('--- ')) {
                if (hasHeaders)
                    break;
                before = headerPath(line.slice(4), gitStyle);
                i++;
                if (i >= lines.length || !lines[i].startsWith('+++ '))
                    sourceError('Missing +++ file header.', i);
                after = headerPath(lines[i].replace(/\r$/u, '').slice(4), gitStyle);
                i++;
                hasHeaders = true;
                if (before === undefined && after === undefined)
                    sourceError('Both diff endpoints are /dev/null.', i);
                if (before === undefined)
                    changeType = 'added';
                else if (after === undefined)
                    changeType = 'deleted';
                continue;
            }
            if (!gitStyle)
                sourceError('Unexpected metadata in ordinary unified diff.', i);
            sawMetadata = true;
            if (line.startsWith('new file mode ')) {
                changeType = 'added';
                newMode = line.slice(14);
                if (newMode === '160000')
                    kind = 'submodule';
            }
            else if (line.startsWith('deleted file mode ')) {
                changeType = 'deleted';
                oldMode = line.slice(18);
                if (oldMode === '160000')
                    kind = 'submodule';
            }
            else if (line.startsWith('old mode ')) {
                oldMode = line.slice(9);
                if (oldMode === '160000')
                    kind = 'submodule';
            }
            else if (line.startsWith('new mode ')) {
                newMode = line.slice(9);
                if (newMode === '160000')
                    kind = 'submodule';
            }
            else if (line.startsWith('index ')) {
                const index = /^index ([0-9a-f]+)\.\.([0-9a-f]+)(?: ([0-7]{6}))?$/u.exec(line);
                if (!index)
                    sourceError('Malformed Git object header.', i);
                if (index[3] === '160000')
                    kind = 'submodule';
                // An added/deleted file without hunks is zero only with empty-blob proof.
                const emptyHashes = ['e69de29bb2d1d6434b8b29ae775ad8c2e48c5391', '473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813'];
                const empty = (hash) => hash.length >= 7 && emptyHashes.some(full => full.startsWith(hash));
                knownEmpty = (changeType === 'added' && /^0+$/u.test(index[1]) && empty(index[2])) || (changeType === 'deleted' && /^0+$/u.test(index[2]) && empty(index[1]));
            }
            else if (line === 'similarity index 100%')
                identity = true;
            else if (/^(dis)?similarity index \d+%$/u.test(line)) { /* A non-100% similarity alone is not complete text evidence. */ }
            else if (line.startsWith('rename from ')) {
                changeType = 'renamed';
                renamedFrom = headerPath(line.slice(12), false);
            }
            else if (line.startsWith('rename to ')) {
                changeType = 'renamed';
                renamedTo = headerPath(line.slice(10), false);
            }
            else if (line.startsWith('copy from ')) {
                changeType = 'copied';
                renamedFrom = headerPath(line.slice(10), false);
            }
            else if (line.startsWith('copy to ')) {
                changeType = 'copied';
                renamedTo = headerPath(line.slice(8), false);
            }
            else if (line.startsWith('Binary files ') || line === 'GIT binary patch') {
                kind = 'binary';
                i++;
                if (line === 'GIT binary patch')
                    while (i < lines.length && !lines[i].startsWith('diff --'))
                        i++;
                break;
            }
            else
                sourceError('Unsupported or malformed diff metadata.', i);
            i++;
        }
        if (renamedFrom !== undefined)
            before = renamedFrom;
        if (renamedTo !== undefined)
            after = renamedTo;
        if (changeType === 'renamed' || changeType === 'copied') {
            if (renamedFrom === undefined || renamedTo === undefined)
                sourceError('Rename or copy is missing an endpoint.', i);
        }
        const path = changeType === 'deleted' ? before : after;
        if (path === undefined)
            sourceError('Diff file has no usable path.', i);
        validatePath(path);
        if (before !== undefined)
            validatePath(before);
        if (!patch && kind === 'text') {
            if (identity || knownEmpty || (oldMode !== undefined && newMode !== undefined && oldMode.slice(0, 3) === newMode.slice(0, 3)))
                patch = { additions: 0, deletions: 0, blocks: [] };
            else if (hasHeaders || sawMetadata)
                sourceError('Text diff has no complete hunks or proven content identity.', i);
            else
                sourceError('Empty Git file header is not a complete change.', i);
        }
        if (oldMode && newMode && oldMode.slice(0, 3) !== newMode.slice(0, 3))
            changeType = 'type-changed';
        files.push({ path, ...((changeType === 'renamed' || changeType === 'copied') && before !== undefined ? { oldPath: before } : {}), changeType, kind,
            ...(patch ? { additions: patch.additions, deletions: patch.deletions, patch } : {}) });
    }
    // Git represents a file/symlink type change as deletion followed by addition.
    // Keep the blocks separate: the two independent patches are not one replacement.
    const joined = [];
    for (const file of files) {
        const previous = joined.findIndex(other => other.path === file.path);
        if (previous < 0) {
            joined.push(file);
            continue;
        }
        const old = joined[previous];
        if (old.changeType !== 'deleted' || file.changeType !== 'added' || !old.patch || !file.patch)
            sourceError('Duplicate file path in diff.');
        const patch = { additions: old.patch.additions + file.patch.additions, deletions: old.patch.deletions + file.patch.deletions, blocks: [...old.patch.blocks, ...file.patch.blocks] };
        joined[previous] = { path: file.path, changeType: 'type-changed', kind: old.kind === 'text' && file.kind === 'text' ? 'text' : 'unknown', additions: patch.additions, deletions: patch.deletions, patch };
    }
    return joined;
}
//# sourceMappingURL=patch.js.map