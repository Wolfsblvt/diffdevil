import { createToken, Lexer, tokenMatcher } from 'chevrotain';
import { fail } from '../errors.js';
import { DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import { decodeStringLiteral } from './strings.js';
import { sourceRange } from './source.js';
// Categories retain operator order in each CST chain, rather than grouping by spelling.
export const AdditiveOperator = createToken({ name: 'AdditiveOperator', pattern: Lexer.NA });
export const ProductOperator = createToken({ name: 'ProductOperator', pattern: Lexer.NA });
export const ComparisonOperator = createToken({ name: 'ComparisonOperator', pattern: Lexer.NA });
export const EqualityOperator = createToken({ name: 'EqualityOperator', pattern: Lexer.NA });
export const UnaryOperator = createToken({ name: 'UnaryOperator', pattern: Lexer.NA });
export const Identifier = createToken({ name: 'Identifier', pattern: /[A-Za-z_][A-Za-z0-9_]*/ });
const keyword = (name, pattern, categories = []) => createToken({ name, pattern, longer_alt: Identifier, categories });
export const True = keyword('True', /true/);
export const False = keyword('False', /false/);
export const Null = keyword('Null', /null/);
export const In = keyword('In', /in/, [ComparisonOperator]);
// Capture malformed numeric spellings as one token, then diagnose rather than accepting a prefix.
export const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]*)?[A-Za-z_0-9]*/ });
export const StringLiteral = createToken({
    name: 'StringLiteral', line_breaks: false, start_chars_hint: ['"', "'"],
    pattern: { exec(text, offset) {
            const quote = text[offset];
            if (quote !== '"' && quote !== "'")
                return null;
            let i = offset + 1;
            while (i < text.length && text[i] !== '\r' && text[i] !== '\n') {
                if (text[i] === quote) {
                    i++;
                    break;
                }
                if (text[i] === '\\') {
                    i++;
                    if (text[i] === '\r' || text[i] === '\n' || i === text.length)
                        break;
                }
                i++;
            }
            return [text.slice(offset, i)];
        } },
});
const punctuation = (name, pattern, categories = []) => createToken({ name, pattern, categories });
export const Arrow = punctuation('Arrow', /=>/);
export const GreaterEqual = punctuation('GreaterEqual', />=/, [ComparisonOperator]);
export const LessEqual = punctuation('LessEqual', /<=/, [ComparisonOperator]);
export const Equal = punctuation('Equal', /==/, [EqualityOperator]);
export const NotEqual = punctuation('NotEqual', /!=/, [EqualityOperator]);
export const And = punctuation('And', /&&/);
export const Or = punctuation('Or', /\|\|/);
export const Greater = punctuation('Greater', />/, [ComparisonOperator]);
export const Less = punctuation('Less', /</, [ComparisonOperator]);
export const Not = punctuation('Not', /!/, [UnaryOperator]);
export const Plus = punctuation('Plus', /\+/, [AdditiveOperator, UnaryOperator]);
export const Minus = punctuation('Minus', /-/, [AdditiveOperator, UnaryOperator]);
export const Star = punctuation('Star', /\*/, [ProductOperator]);
export const Slash = punctuation('Slash', /\//, [ProductOperator]);
export const Percent = punctuation('Percent', /%/, [ProductOperator]);
export const Question = punctuation('Question', /\?/);
export const Colon = punctuation('Colon', /:/);
export const Dot = punctuation('Dot', /\./);
export const Comma = punctuation('Comma', /,/);
export const LParen = punctuation('LParen', /\(/);
export const RParen = punctuation('RParen', /\)/);
export const LBracket = punctuation('LBracket', /\[/);
export const RBracket = punctuation('RBracket', /\]/);
export const LBrace = punctuation('LBrace', /\{/);
export const RBrace = punctuation('RBrace', /\}/);
const Whitespace = createToken({ name: 'Whitespace', pattern: /[ \t\r\n]+/, group: Lexer.SKIPPED, line_breaks: true });
export const tokens = [Whitespace, AdditiveOperator, ProductOperator, ComparisonOperator, EqualityOperator, UnaryOperator,
    True, False, Null, In, Identifier, NumberLiteral, StringLiteral, Arrow, GreaterEqual, LessEqual,
    Equal, NotEqual, And, Or, Greater, Less, Not, Plus, Minus, Star, Slash, Percent,
    Question, Colon, Dot, Comma, LParen, RParen, LBracket, RBracket, LBrace, RBrace];
const lexer = new Lexer(tokens, { positionTracking: 'full', recoveryEnabled: false });
export function stringValue(token, source) {
    try {
        return decodeStringLiteral(token.image, sourceRange(source, token.startOffset, token.endOffset + 1));
    }
    catch {
        return fail('E_STRING', 'Invalid string literal or Unicode escape.', 'lex', sourceRange(source, token.startOffset, token.endOffset + 1));
    }
}
export function numericValue(token, source) {
    const raw = token.image, range = sourceRange(source, token.startOffset, token.endOffset + 1);
    if (!/^(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(raw)) {
        fail('E_NUMBER_LITERAL', `Invalid decimal literal ${raw}.`, 'lex', range);
    }
    const literalType = /[.eE]/.test(raw) ? 'float' : 'integer';
    if (literalType === 'integer' && (raw.length > 16 || BigInt(raw) > 9007199254740991n)) {
        fail('E_NUMBER_LITERAL', 'Integer literal exceeds the safe integer domain.', 'lex', range);
    }
    const value = Number(raw);
    if (!Number.isFinite(value))
        fail('E_NUMBER_LITERAL', 'Float literal must be finite.', 'lex', range);
    return { literalType, value };
}
/** Strict lexing. A returned vector has no lexical recovery and contains validated literals. */
export function lexSource(source, limits = DEFAULT_LIMITS) {
    enforceBytes(source.text, limits.expressionBytes, 'Expression', 'lex');
    const bom = source.text.startsWith('\uFEFF') ? 1 : 0;
    const result = lexer.tokenize(source.text.slice(bom));
    if (result.tokens.length > limits.tokens)
        fail('E_LIMIT', 'Expression exceeds its token limit.', 'lex');
    for (const token of result.tokens) {
        token.startOffset += bom;
        if (token.endOffset !== undefined)
            token.endOffset += bom;
        if (bom && token.startLine === 1)
            token.startColumn += bom;
        if (bom && token.endLine === 1)
            token.endColumn += bom;
        if (tokenMatcher(token, NumberLiteral))
            numericValue(token, source);
        if (tokenMatcher(token, StringLiteral))
            enforceBytes(stringValue(token, source), limits.stringBytes, 'String literal', 'lex');
    }
    const error = result.errors[0];
    if (error)
        fail('E_LEX_CHARACTER', 'Unexpected character in expression.', 'lex', sourceRange(source, error.offset + bom, error.offset + bom + error.length));
    return result.tokens;
}
//# sourceMappingURL=lexer.js.map