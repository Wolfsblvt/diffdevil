# diffdevil Action runtime

## Meaning

Generated, install-free native ESM distribution shared by all four Actions. It contains compiled diffdevil code, standalone schema validators, and the exact locked runtime package trees with their redistribution notices. It is not a single-file minified bundle.

Regenerate with `npm run build:actions`; verify tracked bytes with `npm run check:actions`. Do not edit generated files here. The root project licence remains unselected; dependency notices do not select one. See `../../docs/integration/action-distribution.md` for the build and consumer boundaries.
