import { capture, fail, unwrap, DiffdevilError } from '../errors.js';
import { deepFreeze } from '../inert.js';
import { Budget, DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import { ast } from '../language/ast.js';
import { compileAst } from '../language/compile.js';
import { evaluateExpression } from '../language/evaluate.js';
import { present } from '../language/types.js';
import { decodeStringLiteral } from '../language/strings.js';
const templates = new WeakMap();
/** Parse only a substitution path. Templates are deliberately separate from detail. */
function placeholder(text, start) {
    let i = 0;
    const skip = () => { while (/[ \t\r\n]/.test(text[i] ?? '!'))
        i++; };
    const id = () => { skip(); const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i)); if (!match)
        fail('E_TEMPLATE_PLACEHOLDER', 'Expected a placeholder path.', 'config', { start: start + i, end: start + i }); i += match[0].length; return match[0]; };
    const root = id();
    let node = ast.name(root, { start, end: start + i }), keys = 0;
    while (true) {
        skip();
        let key, keyStart = i;
        if (text[i] === '.') {
            i++;
            keyStart = i;
            key = id();
        }
        else if (text[i] === '[') {
            i++;
            skip();
            keyStart = i;
            const quote = text[i];
            if (quote !== "'" && quote !== '"')
                fail('E_TEMPLATE_PLACEHOLDER', 'Placeholder brackets require a literal string key.', 'config');
            i++;
            while (i < text.length) {
                if (text[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (text[i++] === quote)
                    break;
            }
            try {
                key = decodeStringLiteral(text.slice(keyStart, i), { start: start + keyStart, end: start + i });
            }
            catch {
                fail('E_TEMPLATE_PLACEHOLDER', 'Invalid string key in placeholder.', 'config');
            }
            skip();
            if (text[i++] !== ']')
                fail('E_TEMPLATE_PLACEHOLDER', 'Placeholder member is not closed.', 'config');
        }
        else
            break;
        node = { kind: 'member', object: node, key, keySpan: { start: start + keyStart, end: start + i }, span: { start, end: start + i } };
        keys++;
    }
    skip();
    let formatter = 'display';
    if (i < text.length) {
        if (text[i++] !== '|')
            fail('E_TEMPLATE_PLACEHOLDER', 'Templates accept paths, not expressions.', 'config', { start: start + i - 1, end: start + text.length });
        const name = text.slice(i).trim();
        if (!['display', 'text', 'json'].includes(name))
            fail('E_TEMPLATE_FORMAT', 'Supported template formatters are display, text and json.', 'config');
        formatter = name;
    }
    return { node, formatter, band: root === 'bands' && keys === 1 };
}
function closingDelimiter(text, start) {
    let quote;
    for (let index = start; index < text.length; index++) {
        const c = text[index];
        if (quote) {
            if (c === '\\') {
                index++;
                continue;
            }
            if (c === quote)
                quote = undefined;
            continue;
        }
        if (c === '"' || c === "'") {
            quote = c;
            continue;
        }
        if (c === '}' && text[index + 1] === '}')
            return index;
    }
    return -1;
}
export function compileTemplate(text, schema, limits = DEFAULT_LIMITS) {
    return capture(() => {
        enforceBytes(text, limits.configBytes, 'Comment template', 'config');
        const segments = [];
        let literal = '', index = 0;
        const flush = () => { if (literal) {
            segments.push({ text: literal });
            literal = '';
        } };
        while (index < text.length) {
            if (text[index] === '\\') {
                let end = index;
                while (text[end] === '\\')
                    end++;
                if (text.slice(end, end + 2) === '{{') {
                    const count = end - index;
                    literal += '\\'.repeat(Math.floor(count / 2));
                    if (count % 2) {
                        literal += '{{';
                        index = end + 2;
                        continue;
                    }
                    index = end;
                }
                else {
                    literal += text.slice(index, end);
                    index = end;
                    continue;
                }
            }
            if (text.slice(index, index + 2) !== '{{') {
                literal += text[index++];
                continue;
            }
            flush();
            const end = closingDelimiter(text, index + 2);
            if (end < 0)
                fail('E_TEMPLATE_PLACEHOLDER', 'Unclosed template placeholder.', 'config', { start: index, end: text.length });
            const parsed = placeholder(text.slice(index + 2, end), index + 2);
            let expression;
            try {
                expression = unwrap(compileAst(parsed.node, { environment: schema, limits }));
            }
            catch (error) {
                if (error instanceof DiffdevilError)
                    throw new DiffdevilError({ ...error.diagnostic, code: 'E_TEMPLATE_PLACEHOLDER', phase: 'config' });
                throw error;
            }
            const type = present(expression.resultType);
            if (parsed.formatter !== 'json' && typeof type === 'object' && !parsed.band)
                fail('E_TEMPLATE_FORMAT', 'Records and collections require the json template formatter.', 'config');
            segments.push({ expression, formatter: parsed.formatter, band: parsed.band });
            index = end + 2;
        }
        flush();
        const probe = unwrap(compileAst(ast.literal(''), { environment: schema, limits }));
        const program = deepFreeze({ kind: 'diffdevil.template', schemaId: probe.schemaId });
        templates.set(program, deepFreeze(segments));
        return program;
    });
}
/** Escape substituted data, not the author-written Markdown surrounding it. */
export function escapeMarkdown(text) {
    return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('@', '@\u200b').replace(/[\\`*_{}\[\]()#+.!|~\-]/g, '\\$&');
}
function display(value, band) {
    if (band && value.kind === 'record')
        return value.fields.status?.kind === 'string' && value.fields.status.value === 'resolved' && value.fields.id?.kind === 'string' ? value.fields.id.value : 'unknown';
    switch (value.kind) {
        case 'number': {
            const m = value.measurement;
            return m.status === 'exact' ? String(m.value) : m.status === 'bounded' ? `${m.lower}–${m.upper}` : m.status;
        }
        case 'boolean': return value.decision.status === 'resolved' ? String(value.decision.value) : 'unknown';
        case 'string': return value.value;
        case 'null': return 'null';
        case 'missing': return 'not available';
        case 'unknown': return 'unknown';
        default: fail('E_TEMPLATE_FORMAT', 'This value requires the json template formatter.', 'format');
    }
}
export function renderTemplateResult(program, environment, limits = DEFAULT_LIMITS) {
    return capture(() => {
        const segments = templates.get(program);
        if (!segments)
            fail('E_PROGRAM', 'Render only a successfully compiled template.');
        if (environment.schemaId !== program.schemaId)
            fail('E_ENVIRONMENT_SCHEMA', 'The template requires a different environment schema.');
        const budget = new Budget(limits);
        let output = '';
        for (const segment of segments) {
            if ('text' in segment) {
                output += segment.text;
                budget.charge(segment.text.length);
                continue;
            }
            const result = unwrap(evaluateExpression(segment.expression, environment, { limits: { ...limits, expressionWork: limits.expressionWork - budget.work } }));
            budget.charge(result.work);
            if (segment.formatter === 'json') {
                const json = JSON.stringify(result.value, null, 2);
                let longest = 0;
                for (const match of json.matchAll(/`+/g))
                    longest = Math.max(longest, match[0].length);
                const fence = '`'.repeat(Math.max(3, longest + 1));
                output += `\n${fence}json\n${json}\n${fence}\n`;
            }
            else {
                const text = display(result.value, segment.band);
                output += segment.formatter === 'display' ? escapeMarkdown(text) : text;
            }
            enforceBytes(output, limits.resultBytes, 'Rendered template', 'format');
        }
        enforceBytes(output, limits.resultBytes, 'Rendered template', 'format');
        return { text: output, work: budget.work };
    });
}
/** Render using the same bounded expression evaluator as ordinary queries. */
export function renderTemplate(program, environment, limits = DEFAULT_LIMITS) {
    return capture(() => unwrap(renderTemplateResult(program, environment, limits)).text);
}
export function commentLifecycle(mode, trigger, rule) {
    const m = mode ?? 'upsert', t = trigger ?? (rule === 'band' ? 'band-changed' : 'matched');
    if (!['create', 'once', 'upsert', 'once-per-transition'].includes(m) || !['always', 'matched', 'band-changed'].includes(t) || t === 'band-changed' && rule !== 'band' || m === 'once-per-transition' && (rule !== 'boolean' || t !== 'matched'))
        fail('E_CONFIG', 'Comment lifecycle is incompatible with the selected rule.', 'config');
    return { mode: m, trigger: t };
}
//# sourceMappingURL=templates.js.map