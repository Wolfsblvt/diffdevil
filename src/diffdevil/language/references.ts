import type { BoundNode } from './compile.js';
import type { Schema } from './types.js';

export interface PolicyReferences { readonly metrics: readonly string[]; readonly bands: readonly string[]; readonly rules: readonly string[] }
/** Collect resolved references, including a whole root passed through a record/list. */
export function boundReferences(node: BoundNode, schema: Schema): PolicyReferences {
  const result = { metrics: new Set<string>(), bands: new Set<string>(), rules: new Set<string>() };
  const stack = [node];
  while (stack.length) {
    const next = stack.pop()!;
    if (next.kind === 'identifier' || next.kind === 'member') {
      const keys: string[] = [];
      let root: BoundNode = next;
      while (root.kind === 'member') { keys.unshift(root.key); root = root.object; }
      if (root.kind === 'identifier' && root.binding === 'root') {
        if (root.name === 'metrics' || root.name === 'bands' || root.name === 'rules') {
          const names = result[root.name];
          if (keys.length) names.add(keys[0]!);
          else {
            const type = schema[root.name];
            if (type && typeof type === 'object' && type.kind === 'record') for (const name of Object.keys(type.fields)) names.add(name);
          }
        }
        continue;
      }
    }
    switch (next.kind) {
      case 'member': stack.push(next.object); break;
      case 'unary': stack.push(next.operand); break;
      case 'binary': stack.push(next.left, next.right); break;
      case 'conditional': stack.push(next.condition, next.whenTrue, next.whenFalse); break;
      case 'call': stack.push(...next.arguments); break;
      case 'lambda': stack.push(next.body); break;
      case 'list': stack.push(...next.items); break;
      case 'record': stack.push(...next.fields.map(f => f.value)); break;
    }
  }
  return { metrics: [...result.metrics].sort(), bands: [...result.bands].sort(), rules: [...result.rules].sort() };
}
