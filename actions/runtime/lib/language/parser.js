import { CstParser, EOF } from 'chevrotain';
import { fail } from '../errors.js';
import { DEFAULT_LIMITS } from '../limits.js';
import * as t from './lexer.js';
import { sourceRange } from './source.js';
/** Syntax only. The small ACTION guards account for recursion, never for expression meaning. */
export class DetailParser extends CstParser {
    depth = 0;
    limits = DEFAULT_LIMITS;
    sourceText = { text: '', language: 'diffdevil-expr/1' };
    constructor() {
        super(t.tokens, { recoveryEnabled: false, nodeLocationTracking: 'full', maxLookahead: 2 });
        this.performSelfAnalysis();
    }
    prepare(source, input, limits) {
        this.depth = 0;
        this.sourceText = source;
        this.limits = limits;
        this.input = input;
    }
    release() { this.depth = 0; this.input = []; }
    guard(extra) {
        if (this.depth + extra > this.limits.nestingDepth) {
            const offset = this.LA(1).startOffset;
            const start = Number.isFinite(offset) && offset >= 0 ? offset : this.sourceText.text.length;
            fail('E_LIMIT', 'Expression exceeds its nesting limit.', 'parse', sourceRange(this.sourceText, start, start));
        }
    }
    source = this.RULE('source', () => { this.SUBRULE(this.expression); this.CONSUME(EOF); });
    expression = this.RULE('expression', () => { this.SUBRULE(this.conditional); });
    conditional = this.RULE('conditional', () => {
        this.ACTION(() => { this.guard(1); this.depth++; });
        this.SUBRULE(this.disjunction);
        this.OPTION(() => { this.CONSUME(t.Question); this.SUBRULE(this.conditional); this.CONSUME(t.Colon); this.SUBRULE2(this.conditional); });
        this.ACTION(() => { this.depth--; });
    });
    disjunction = this.RULE('disjunction', () => {
        this.SUBRULE(this.conjunction);
        this.MANY(() => { this.CONSUME(t.Or); this.SUBRULE2(this.conjunction); });
    });
    conjunction = this.RULE('conjunction', () => {
        this.SUBRULE(this.equality);
        this.MANY(() => { this.CONSUME(t.And); this.SUBRULE2(this.equality); });
    });
    equality = this.RULE('equality', () => {
        this.SUBRULE(this.comparison);
        this.OPTION(() => { this.CONSUME(t.EqualityOperator); this.SUBRULE2(this.comparison); });
    });
    comparison = this.RULE('comparison', () => {
        this.SUBRULE(this.additive);
        this.OPTION(() => { this.CONSUME(t.ComparisonOperator); this.SUBRULE2(this.additive); });
    });
    additive = this.RULE('additive', () => {
        this.SUBRULE(this.product);
        this.MANY(() => { this.CONSUME(t.AdditiveOperator); this.SUBRULE2(this.product); });
    });
    product = this.RULE('product', () => {
        this.SUBRULE(this.unary);
        this.MANY(() => { this.CONSUME(t.ProductOperator); this.SUBRULE2(this.unary); });
    });
    unary = this.RULE('unary', () => {
        let prefixes = 0;
        this.MANY(() => { this.CONSUME(t.UnaryOperator); this.ACTION(() => { this.guard(++prefixes); }); });
        this.SUBRULE(this.access);
    });
    access = this.RULE('access', () => { this.SUBRULE(this.primary); this.MANY(() => { this.SUBRULE(this.member); }); });
    member = this.RULE('member', () => {
        this.OR([
            { ALT: () => { this.CONSUME(t.Dot); this.CONSUME(t.Identifier); } },
            { ALT: () => { this.CONSUME(t.LBracket); this.CONSUME(t.StringLiteral); this.CONSUME(t.RBracket); } },
        ]);
    });
    primary = this.RULE('primary', () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.literal) },
            { ALT: () => { this.CONSUME(t.Identifier); this.OPTION(() => this.SUBRULE(this.callSuffix)); } },
            { ALT: () => this.SUBRULE(this.list) },
            { ALT: () => this.SUBRULE(this.record) },
            { ALT: () => { this.CONSUME(t.LParen); this.SUBRULE(this.expression); this.CONSUME(t.RParen); } },
        ]);
    });
    callSuffix = this.RULE('callSuffix', () => {
        this.CONSUME(t.LParen);
        this.OPTION(() => { this.SUBRULE(this.argument); this.MANY(() => { this.CONSUME(t.Comma); this.SUBRULE2(this.argument); }); });
        this.CONSUME(t.RParen);
    });
    argument = this.RULE('argument', () => {
        this.OR([{ ALT: () => this.SUBRULE(this.lambda) }, { ALT: () => this.SUBRULE(this.expression) }]);
    });
    lambda = this.RULE('lambda', () => { this.CONSUME(t.Identifier); this.CONSUME(t.Arrow); this.SUBRULE(this.expression); });
    list = this.RULE('list', () => {
        this.CONSUME(t.LBracket);
        this.OPTION(() => { this.SUBRULE(this.expression); this.MANY(() => { this.CONSUME(t.Comma); this.SUBRULE2(this.expression); }); });
        this.CONSUME(t.RBracket);
    });
    record = this.RULE('record', () => {
        this.CONSUME(t.LBrace);
        this.OPTION(() => { this.SUBRULE(this.field); this.MANY(() => { this.CONSUME(t.Comma); this.SUBRULE2(this.field); }); });
        this.CONSUME(t.RBrace);
    });
    field = this.RULE('field', () => {
        this.OR([{ ALT: () => this.CONSUME(t.Identifier) }, { ALT: () => this.CONSUME(t.StringLiteral) }]);
        this.CONSUME(t.Colon);
        this.SUBRULE(this.expression);
    });
    literal = this.RULE('literal', () => {
        this.OR([t.NumberLiteral, t.StringLiteral, t.True, t.False, t.Null].map(token => ({ ALT: () => this.CONSUME(token) })));
    });
}
// Synchronous callers share initialization, never invocation state. No callbacks can re-enter parsing.
export const detailParser = new DetailParser();
//# sourceMappingURL=parser.js.map