import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';

/** Compile only product-owned schemas. Runtime policy never compiles a user schema. */
export function buildSchemas() {
  const paths = {
    values: 'spec/detail/v1/values.schema.json', ast: 'spec/detail/v1/ast.schema.json',
    policy: 'schemas/policy-v1.schema.json', report: 'schemas/report-v1.schema.json',
    plan: 'schemas/plan-v1.schema.json', query: 'schemas/query-result-v1.schema.json',
  };
  // Conditional and referenced schemas constrain types across adjacent clauses.
  // Strict type/required lints are not validity rules for conditional types or
  // `not: {required: [...]}` clauses deliberately forbidding a property.
  const ajv = new Ajv2020({ strict: true, strictTypes: false, strictRequired: false, allErrors: true, inlineRefs: false, code: { source: true, lines: true } });
  const ids = {};
  for (const [name, path] of Object.entries(paths)) {
    const schema = JSON.parse(readFileSync(path, 'utf8'));
    ajv.addSchema(schema); ids[name] = schema.$id;
  }
  mkdirSync('dist/lib/validation', { recursive: true });
  writeFileSync('dist/lib/validation/schemas.cjs', standaloneCode(ajv, ids));
}
