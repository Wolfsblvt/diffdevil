import { fail } from './errors.js';
import { Budget } from './limits.js';
/** UTF-16 offsets are retained elsewhere; path operations consume Unicode scalars. */
export function scalarCharacters(text, code = 'E_SOURCE') {
    for (let i = 0; i < text.length; i++) {
        const unit = text.charCodeAt(i);
        if (unit >= 0xd800 && unit <= 0xdbff) {
            const next = text.charCodeAt(++i);
            if (!(next >= 0xdc00 && next <= 0xdfff))
                fail(code, 'Text contains an unpaired high surrogate.', code === 'E_STRING' ? 'lex' : 'source');
        }
        else if (unit >= 0xdc00 && unit <= 0xdfff)
            fail(code, 'Text contains an unpaired low surrogate.', code === 'E_STRING' ? 'lex' : 'source');
    }
    return Array.from(text);
}
export function compareScalarStrings(left, right) {
    const a = Array.from(left), b = Array.from(right);
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const d = a[i].codePointAt(0) - b[i].codePointAt(0);
        if (d !== 0)
            return d < 0 ? -1 : 1;
    }
    return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
}
export function validatePath(path) {
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\0'))
        fail('E_SOURCE', 'Expected a non-empty repository-relative path without NUL.', 'source');
    scalarCharacters(path);
    if (path.split('/').some(segment => segment === '' || segment === '.' || segment === '..'))
        fail('E_SOURCE', `Path is not normalized: ${JSON.stringify(path)}.`, 'source');
    return path;
}
function invalidPattern(pattern) { return fail('E_GLOB_PATTERN', `Invalid diffdevil-glob/1 pattern: ${JSON.stringify(pattern)}.`); }
export function compilePathPattern(pattern) {
    if (typeof pattern !== 'string' || !pattern || pattern.startsWith('/') || pattern.startsWith('!') || /[{}\0]|[?*+@!]\(/u.test(pattern))
        invalidPattern(pattern);
    scalarCharacters(pattern, 'E_GLOB_PATTERN');
    const segments = [];
    for (const segment of pattern.split('/')) {
        if (!segment || segment === '.' || segment === '..')
            invalidPattern(pattern);
        if (segment === '**') {
            segments.push({ kind: 'globstar' });
            continue;
        }
        const chars = Array.from(segment), tokens = [];
        for (let i = 0; i < chars.length; i++) {
            const character = chars[i];
            if (character === '*') {
                if (chars[i + 1] === '*')
                    invalidPattern(pattern);
                tokens.push({ kind: 'star' });
            }
            else if (character === '?')
                tokens.push({ kind: 'any' });
            else if (character !== '[')
                tokens.push({ kind: 'literal', character });
            else {
                let cursor = i + 1;
                const negate = chars[cursor] === '!';
                if (negate)
                    cursor++;
                const members = [];
                if (chars[cursor] === ']')
                    members.push(chars[cursor++]);
                while (cursor < chars.length && chars[cursor] !== ']')
                    members.push(chars[cursor++]);
                if (chars[cursor] !== ']' || members.length === 0)
                    invalidPattern(pattern);
                const ranges = [];
                for (let j = 0; j < members.length; j++) {
                    const lower = members[j].codePointAt(0);
                    if (members[j + 1] === '-' && j + 2 < members.length) {
                        const upper = members[j + 2].codePointAt(0);
                        if (lower > upper)
                            invalidPattern(pattern);
                        ranges.push([lower, upper]);
                        j += 2;
                    }
                    else
                        ranges.push([lower, lower]);
                }
                tokens.push({ kind: 'class', negate, ranges });
                i = cursor;
            }
        }
        segments.push({ kind: 'segment', tokens });
    }
    return { source: pattern, segments };
}
function segmentMatches(text, tokens, budget) {
    const chars = Array.from(text);
    let current = new Uint8Array(chars.length + 1);
    current[0] = 1;
    for (const token of tokens) {
        const next = new Uint8Array(chars.length + 1);
        for (let i = 0; i <= chars.length; i++) {
            budget.charge();
            if (token.kind === 'star') {
                if (current[i] || (i > 0 && next[i - 1]))
                    next[i] = 1;
                continue;
            }
            if (!current[i] || i === chars.length)
                continue;
            const char = chars[i];
            const code = char.codePointAt(0);
            const match = token.kind === 'any' || (token.kind === 'literal' ? token.character === char : token.ranges.some(([a, b]) => a <= code && code <= b) !== token.negate);
            if (match)
                next[i + 1] = 1;
        }
        current = next;
    }
    return current[chars.length] === 1;
}
export function matchPath(path, pattern, budget = new Budget()) {
    validatePath(path);
    const parts = path.split('/');
    let current = new Uint8Array(parts.length + 1);
    current[0] = 1;
    for (const segment of pattern.segments) {
        const next = new Uint8Array(parts.length + 1);
        for (let i = 0; i <= parts.length; i++) {
            budget.charge();
            if (segment.kind === 'globstar') {
                if (current[i] || (i > 0 && next[i - 1]))
                    next[i] = 1;
            }
            else if (current[i] && i < parts.length && segmentMatches(parts[i], segment.tokens, budget))
                next[i + 1] = 1;
        }
        current = next;
    }
    return current[parts.length] === 1;
}
export function glob(path, pattern, budget = new Budget()) { return matchPath(path, compilePathPattern(pattern), budget); }
export function pathMatches(file, pattern, budget = new Budget()) {
    const compiled = compilePathPattern(pattern);
    return matchPath(file.path, compiled, budget) || (file.oldPath !== undefined && matchPath(file.oldPath, compiled, budget));
}
export function compilePathPolicy(policy = {}) {
    return { ...(policy.includeOnly !== undefined ? { includeOnly: policy.includeOnly.map(compilePathPattern) } : {}), exclude: (policy.exclude ?? []).map(compilePathPattern), forceInclude: (policy.forceInclude ?? []).map(compilePathPattern) };
}
export function selectPath(file, policy, scope = false) {
    const reasons = [];
    let included = false;
    for (const endpoint of [file.path, ...(file.oldPath !== undefined ? [file.oldPath] : [])]) {
        const boundary = policy.includeOnly === undefined || policy.includeOnly.some(pattern => matchPath(endpoint, pattern));
        const forced = policy.forceInclude.find(pattern => matchPath(endpoint, pattern));
        const excluded = policy.exclude.find(pattern => matchPath(endpoint, pattern));
        let match, reason;
        if (forced && (!scope || boundary)) {
            match = true;
            reason = { code: 'FORCE_INCLUDED', subject: forced.source };
        }
        else if (!boundary) {
            match = false;
            reason = { code: 'OUTSIDE_INCLUDE_ONLY', subject: endpoint };
        }
        else if (excluded) {
            match = false;
            reason = { code: 'PATH_EXCLUDED', subject: excluded.source };
        }
        else {
            match = true;
            reason = { code: 'PATH_INCLUDED', subject: endpoint };
        }
        included ||= match;
        reasons.push(reason);
    }
    return { included, reasons };
}
//# sourceMappingURL=paths.js.map