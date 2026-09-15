import { CstParser, EOF, type IToken } from 'chevrotain';
import { fail } from '../errors.js';
import { DEFAULT_LIMITS, type EvaluationLimits } from '../limits.js';
import * as t from './lexer.js';
import { sourceRange, type ExpressionSource } from './source.js';

/** Syntax only. The small ACTION guards account for recursion, never for expression meaning. */
export class DetailParser extends CstParser {
  private depth = 0;
  private limits = DEFAULT_LIMITS;
  private sourceText: ExpressionSource = { text: '', language: 'diffdevil-expr/1' };
  constructor() {
    super(t.tokens, { recoveryEnabled: false, nodeLocationTracking: 'full', maxLookahead: 2 });
    this.performSelfAnalysis();
  }
  prepare(source: ExpressionSource, input: IToken[], limits: EvaluationLimits): void {
    this.depth = 0; this.sourceText = source; this.limits = limits; this.input = input;
  }
  release(): void { this.depth = 0; this.input = []; }
  private guard(extra: number): void {
    if (this.depth + extra > this.limits.nestingDepth) {
      const offset = this.LA(1).startOffset;
      const start = Number.isFinite(offset) && offset >= 0 ? offset : this.sourceText.text.length;
      fail('E_LIMIT', 'Expression exceeds its nesting limit.', 'parse', sourceRange(this.sourceText, start, start));
    }
  }
  readonly source = this.RULE('source', () => { this.SUBRULE(this.expression); this.CONSUME(EOF); });
  readonly expression = this.RULE('expression', () => { this.SUBRULE(this.conditional); });
  readonly conditional = this.RULE('conditional', () => {
    this.ACTION(() => { this.guard(1); this.depth++; });
    this.SUBRULE(this.disjunction);
    this.OPTION(() => { this.CONSUME(t.Question); this.SUBRULE(this.conditional); this.CONSUME(t.Colon); this.SUBRULE2(this.conditional); });
    this.ACTION(() => { this.depth--; });
  });
  readonly disjunction = this.RULE('disjunction', () => {
    this.SUBRULE(this.conjunction);
    this.MANY(() => { this.CONSUME(t.Or); this.SUBRULE2(this.conjunction); });
  });
  readonly conjunction = this.RULE('conjunction', () => {
    this.SUBRULE(this.equality);
    this.MANY(() => { this.CONSUME(t.And); this.SUBRULE2(this.equality); });
  });
  readonly equality = this.RULE('equality', () => {
    this.SUBRULE(this.comparison);
    this.OPTION(() => { this.CONSUME(t.EqualityOperator); this.SUBRULE2(this.comparison); });
  });
  readonly comparison = this.RULE('comparison', () => {
    this.SUBRULE(this.additive);
    this.OPTION(() => { this.CONSUME(t.ComparisonOperator); this.SUBRULE2(this.additive); });
  });
  readonly additive = this.RULE('additive', () => {
    this.SUBRULE(this.product);
    this.MANY(() => { this.CONSUME(t.AdditiveOperator); this.SUBRULE2(this.product); });
  });
  readonly product = this.RULE('product', () => {
    this.SUBRULE(this.unary);
    this.MANY(() => { this.CONSUME(t.ProductOperator); this.SUBRULE2(this.unary); });
  });
  readonly unary = this.RULE('unary', () => {
    let prefixes = 0;
    this.MANY(() => { this.CONSUME(t.UnaryOperator); this.ACTION(() => { this.guard(++prefixes); }); });
    this.SUBRULE(this.access);
  });
  readonly access = this.RULE('access', () => { this.SUBRULE(this.primary); this.MANY(() => { this.SUBRULE(this.member); }); });
  readonly member = this.RULE('member', () => {
    this.OR([
      { ALT: () => { this.CONSUME(t.Dot); this.CONSUME(t.Identifier); } },
      { ALT: () => { this.CONSUME(t.LBracket); this.CONSUME(t.StringLiteral); this.CONSUME(t.RBracket); } },
    ]);
  });
  readonly primary = this.RULE('primary', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.literal) },
      { ALT: () => { this.CONSUME(t.Identifier); this.OPTION(() => this.SUBRULE(this.callSuffix)); } },
      { ALT: () => this.SUBRULE(this.list) },
      { ALT: () => this.SUBRULE(this.record) },
      { ALT: () => { this.CONSUME(t.LParen); this.SUBRULE(this.expression); this.CONSUME(t.RParen); } },
    ]);
  });
  readonly callSuffix = this.RULE('callSuffix', () => {
    this.CONSUME(t.LParen);
    this.OPTION(() => { this.SUBRULE(this.argument); this.MANY(() => { this.CONSUME(t.Comma); this.SUBRULE2(this.argument); }); });
    this.CONSUME(t.RParen);
  });
  readonly argument = this.RULE('argument', () => {
    this.OR([{ ALT: () => this.SUBRULE(this.lambda) }, { ALT: () => this.SUBRULE(this.expression) }]);
  });
  readonly lambda = this.RULE('lambda', () => { this.CONSUME(t.Identifier); this.CONSUME(t.Arrow); this.SUBRULE(this.expression); });
  readonly list = this.RULE('list', () => {
    this.CONSUME(t.LBracket);
    this.OPTION(() => { this.SUBRULE(this.expression); this.MANY(() => { this.CONSUME(t.Comma); this.SUBRULE2(this.expression); }); });
    this.CONSUME(t.RBracket);
  });
  readonly record = this.RULE('record', () => {
    this.CONSUME(t.LBrace);
    this.OPTION(() => { this.SUBRULE(this.field); this.MANY(() => { this.CONSUME(t.Comma); this.SUBRULE2(this.field); }); });
    this.CONSUME(t.RBrace);
  });
  readonly field = this.RULE('field', () => {
    this.OR([{ ALT: () => this.CONSUME(t.Identifier) }, { ALT: () => this.CONSUME(t.StringLiteral) }]);
    this.CONSUME(t.Colon); this.SUBRULE(this.expression);
  });
  readonly literal = this.RULE('literal', () => {
    this.OR([t.NumberLiteral, t.StringLiteral, t.True, t.False, t.Null].map(token => ({ ALT: () => this.CONSUME(token) })));
  });
}
// Synchronous callers share initialization, never invocation state. No callbacks can re-enter parsing.
export const detailParser = new DetailParser();
