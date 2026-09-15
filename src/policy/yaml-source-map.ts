import { CST, type Scalar } from 'yaml';
import type { SourceRange } from '../model.js';
import type { PolicyLocation } from './source.js';

interface Character { readonly value: string; readonly start: number; readonly end: number }
const horizontal = (character: Character | undefined): boolean => character?.value === ' ' || character?.value === '\t';

/** Source provenance only. The YAML library, not this mapper, decides the scalar value. */
export function yamlScalarLocation(node: Scalar, text: string, source: string): PolicyLocation {
  const start = node.range?.[0] ?? 0, end = node.range?.[1] ?? start;
  const range: SourceRange = { source, start, end };
  if (typeof node.value !== 'string' || !node.srcToken) return { range };
  const token = node.srcToken;
  if (!CST.isScalar(token)) return { range };
  const characters = token.type === 'block-scalar'
    ? blockCharacters(token.source, text, start, token.indent, node.type)
    : flowCharacters(token.source, token.offset, node.type);
  // A mapper disagreement must never turn into an inaccurate caret. Keep the
  // scalar and decoded offset when a future YAML syntax form needs a new mapping.
  if (characters.map(character => character.value).join('') !== node.value) return { range };
  return { range, characters, emptyOffset: node.type === 'QUOTE_DOUBLE' || node.type === 'QUOTE_SINGLE' ? start + 1 : end };
}
function rawCharacters(raw: string, offset: number): Character[] {
  const result: Character[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\r' && raw[i + 1] === '\n') {
      result.push({ value: '\n', start: offset + i, end: offset + i + 2 }); i++;
    } else result.push({ value: raw[i]!, start: offset + i, end: offset + i + 1 });
  }
  return result;
}
function spanCharacter(value: string, first: Character, last = first): Character {
  return { value, start: first.start, end: last.end };
}
const ESCAPES: Readonly<Record<string, string>> = Object.freeze({
  '0': '\0', a: '\x07', b: '\b', t: '\t', '\t': '\t', n: '\n', v: '\v', f: '\f', r: '\r',
  e: '\x1b', ' ': ' ', '"': '"', '/': '/', '\\': '\\', N: '\x85', _: '\u00a0', L: '\u2028', P: '\u2029',
});
function flowCharacters(raw: string, offset: number, type: Scalar['type']): Character[] {
  const quoted = type === 'QUOTE_DOUBLE' || type === 'QUOTE_SINGLE';
  const input = rawCharacters(quoted ? raw.slice(1, -1) : raw, offset + (quoted ? 1 : 0));
  const output: Character[] = [];
  for (let i = 0; i < input.length;) {
    const current = input[i]!;
    if (type === 'QUOTE_SINGLE' && current.value === "'" && input[i + 1]?.value === "'") {
      output.push(spanCharacter("'", current, input[i + 1]!)); i += 2; continue;
    }
    if (type === 'QUOTE_DOUBLE' && current.value === '\\') {
      const next = input[i + 1]!;
      if (next.value === '\n') {
        i += 2; while (horizontal(input[i])) i++;
        continue;
      }
      if (['x', 'u', 'U'].includes(next.value)) {
        const width = next.value === 'x' ? 2 : next.value === 'u' ? 4 : 8;
        const value = String.fromCodePoint(Number.parseInt(input.slice(i + 2, i + 2 + width).map(c => c.value).join(''), 16));
        for (let unit = 0; unit < value.length; unit++) output.push(spanCharacter(value[unit]!, current, input[i + width + 1]!));
        i += width + 2;
      } else {
        output.push(spanCharacter(ESCAPES[next.value] ?? next.value, current, next)); i += 2;
      }
      continue;
    }
    // YAML flow folding discards horizontal whitespace surrounding a physical
    // newline. An empty continuation line contributes a newline rather than a space.
    let newline = i;
    while (horizontal(input[newline])) newline++;
    if (input[newline]?.value === '\n') {
      const breaks: Character[] = [];
      let cursor = newline;
      while (input[cursor]?.value === '\n') {
        breaks.push(input[cursor++]!);
        while (horizontal(input[cursor])) cursor++;
      }
      if (breaks.length === 1) output.push(spanCharacter(' ', current, input[cursor - 1]!));
      else for (let index = 1; index < breaks.length; index++) output.push(spanCharacter('\n', breaks[index]!));
      i = cursor; continue;
    }
    output.push(current); i++;
  }
  return output;
}
interface Line { readonly characters: Character[]; readonly newline?: Character }
function linesOf(characters: Character[]): Line[] {
  const lines: Line[] = []; let current: Character[] = [];
  for (const character of characters) {
    if (character.value === '\n') { lines.push({ characters: current, newline: character }); current = []; }
    else current.push(character);
  }
  if (current.length) lines.push({ characters: current });
  return lines;
}
function blockCharacters(raw: string, text: string, headerStart: number, indent: number, type: Scalar['type']): Character[] {
  // Block token offset names the header, while source contains the indented body.
  const bodyStart = text.indexOf('\n', headerStart) + 1;
  if (!bodyStart) return [];
  const header = text.slice(headerStart, bodyStart);
  const explicit = /[1-9]/.exec(header.split('#', 1)[0]!);
  const lines = linesOf(rawCharacters(raw, bodyStart));
  const leading = (line: Line): number => line.characters.findIndex(character => character.value !== ' ');
  const first = lines.find(line => leading(line) >= 0);
  const remove = explicit ? indent + Number(explicit[0]) : first ? leading(first) : 0;
  const stripped = lines.map(line => ({ ...line, characters: !first && !explicit ? [] : line.characters.slice(Math.min(remove, leading(line) < 0 ? line.characters.length : leading(line))) }));
  const output: Character[] = [];
  for (let i = 0; i < stripped.length; i++) {
    const line = stripped[i]!, next = stripped[i + 1];
    output.push(...line.characters);
    if (!line.newline) continue;
    if (type !== 'BLOCK_FOLDED' || !next) output.push(line.newline);
    else if (horizontal(line.characters[0]) || horizontal(next.characters[0])) output.push(line.newline);
    else if (line.characters.length && next.characters.length) output.push(spanCharacter(' ', line.newline));
    else if (line.characters.length) { /* The first empty line supplies the separating newline. */ }
    else output.push(line.newline);
  }
  const keep = /^[>|][1-9]?\+|^[>|]\+[1-9]?/.test(header);
  const strip = /^[>|][1-9]?-|^[>|]-[1-9]?/.test(header);
  if (!keep) {
    let length = output.length;
    while (length > 0 && output[length - 1]!.value === '\n') length--;
    output.splice(strip || length === 0 ? length : Math.min(length + 1, output.length));
  }
  return output;
}
