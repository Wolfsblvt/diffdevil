// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The diffdevil syntax palette as a Shiki theme: five restrained classes on the
 * midnight machine ground, identical in both site themes because code always sits on
 * `--bg-machine`. Values mirror `--syn-*` in design/tokens.css.
 */
import type { ThemeRegistrationRaw } from 'shiki';

const key = '#c3b5ff', string = '#d9c8a0', number = '#f0f2f5', punct = '#828690', comment = '#6f7480', text = '#f0f2f5';

export const diffdevilSyntax: ThemeRegistrationRaw = {
  name: 'diffdevil',
  type: 'dark',
  colors: { 'editor.background': '#0c0f17', 'editor.foreground': text },
  settings: [
    { settings: { foreground: text, background: '#0c0f17' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: comment, fontStyle: 'italic' } },
    { scope: ['string', 'string.quoted', 'string.unquoted', 'punctuation.definition.string'], settings: { foreground: string } },
    { scope: ['constant.numeric', 'constant.language', 'constant.language.boolean', 'constant.language.null'], settings: { foreground: number, fontStyle: 'bold' } },
    { scope: ['entity.name.tag', 'entity.name.tag.yaml', 'support.type.property-name', 'support.type.property-name.json', 'meta.object-literal.key', 'variable.other.property', 'entity.other.attribute-name'], settings: { foreground: key } },
    { scope: ['punctuation', 'punctuation.separator', 'punctuation.definition', 'meta.brace', 'keyword.operator'], settings: { foreground: punct } },
    { scope: ['keyword', 'storage', 'storage.type', 'keyword.control'], settings: { foreground: key } },
    { scope: ['entity.name.function', 'support.function', 'variable', 'variable.parameter'], settings: { foreground: text } },
    { scope: ['markup.inserted', 'meta.diff.header.to-file'], settings: { foreground: '#8fd6aa' } },
    { scope: ['markup.deleted', 'meta.diff.header.from-file'], settings: { foreground: '#ff9fb0' } },
    { scope: ['meta.diff.range', 'meta.diff.header', 'punctuation.definition.range.diff'], settings: { foreground: punct } },
  ],
};
