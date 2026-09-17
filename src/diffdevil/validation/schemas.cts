interface SchemaError {
  readonly instancePath: string;
  readonly schemaPath: string;
  readonly keyword: string;
  readonly message?: string;
  readonly params: Readonly<Record<string, unknown>>;
}

interface Validator {
  (value: unknown): boolean;
  readonly errors?: readonly SchemaError[] | null;
}

// tools/schema-build.mjs overwrites this TypeScript-only module with standalone
// Ajv validators after compilation. It gives the cross-runtime ESM import a
// concrete type without retaining a second validator implementation in source.
const validators = Object.create(null) as Readonly<Record<'policy' | 'report' | 'plan' | 'query' | 'ast' | 'values', Validator>>;

export = validators;
