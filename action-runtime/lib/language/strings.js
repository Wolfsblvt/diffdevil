import { fail } from '../errors.js';
import { scalarCharacters } from '../paths.js';
/** Decode the specified scalar string literal, without JavaScript evaluation. */
export function decodeStringLiteral(raw, range) {
    const quote = raw[0];
    if ((quote !== '"' && quote !== "'") || raw.at(-1) !== quote)
        fail('E_STRING_ESCAPE', 'String literal is not closed.', 'lex', range);
    let value = '';
    const escaped = { '\\': '\\', '/': '/', "'": "'", '"': '"', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
    for (let index = 1; index < raw.length - 1; index++) {
        const c = raw[index];
        if (c.charCodeAt(0) < 32 || c === quote)
            fail('E_STRING_ESCAPE', 'Unescaped quote or control character in string.', 'lex', range);
        if (c !== '\\') {
            const code = c.charCodeAt(0);
            if (code >= 0xd800 && code <= 0xdbff) {
                const next = raw.charCodeAt(index + 1);
                if (index + 1 >= raw.length - 1 || next < 0xdc00 || next > 0xdfff)
                    fail('E_STRING_ESCAPE', 'A raw surrogate pair cannot be split by an escape.', 'lex', range);
                value += c + raw[++index];
                continue;
            }
            if (code >= 0xdc00 && code <= 0xdfff)
                fail('E_STRING_ESCAPE', 'Unpaired raw surrogate in string.', 'lex', range);
            value += c;
            continue;
        }
        const next = raw[++index];
        if (next === 'u') {
            const hex = raw.slice(index + 1, index + 5);
            if (!/^[0-9a-fA-F]{4}$/.test(hex) || index + 4 >= raw.length - 1)
                fail('E_STRING_ESCAPE', 'Unicode escape requires four hexadecimal digits.', 'lex', range);
            value += String.fromCharCode(parseInt(hex, 16));
            index += 4;
        }
        else if (next !== undefined && Object.hasOwn(escaped, next) && index < raw.length - 1)
            value += escaped[next];
        else
            fail('E_STRING_ESCAPE', 'Unsupported string escape.', 'lex', range);
    }
    try {
        scalarCharacters(value, 'E_STRING_ESCAPE');
    }
    catch {
        fail('E_STRING_ESCAPE', 'Strings require valid Unicode scalar values.', 'lex', range);
    }
    return value;
}
//# sourceMappingURL=strings.js.map