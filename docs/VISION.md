# diffdevil Vision

## Meaning

This is the durable product vision for diffdevil. It defines the complete experience and product boundary that implementation should serve, independent of the first delivery sequence, current repository maturity, or any single GitHub workflow.

## Centre

> **The devil is in the diff.**

Git and hosting providers expose patches, file lists, and blunt counters. Useful decisions often depend on distinctions those surfaces do not preserve cleanly: additions versus deletions, replacements counted once, which files belong to a scope, whether evidence is complete, which policy matched, and which external effect was actually intended.

diffdevil exists to turn those details into trustworthy, portable facts and deliberate automation.

The product should let a developer, maintainer, script, CI job, TypeScript consumer, or coding agent ask a precise question about a change without reimplementing diff parsing, uncertainty handling, filtering, policy evaluation, and GitHub metadata behavior every time.

## Product promise

diffdevil provides one deterministic core that can:

1. acquire or consume a diff;
2. normalize it into stable facts;
3. distinguish raw churn from replacement-aware changes;
4. preserve exact, bounded, incomplete, and unmeasurable evidence honestly;
5. select files through explicit scopes and path policy;
6. calculate named metrics and evaluate queries, checks, bands, and rules;
7. emit versioned reports and inspectable effect plans;
8. optionally apply only the GitHub labels and owned comments selected by policy.

The same meaning should survive local CLI use, shell composition, library embedding, GitHub Actions, a managed GitHub App, a public read-only PR playground, saved reports, the website/documentation experience, and coding-agent workflows.

## The experience

### Start useful without learning a language

A normal user should be able to:

- analyze a local change;
- retrieve one scalar value;
- check a threshold through exit status;
- list matching files;
- apply ordinary pull-request size labels;
- use the read-only GitHub Action;

without learning the full detail expression language or copying a complete policy file.

The advanced language exists because deep configuration is valuable, not because basic use should feel like a compiler course taught during a production outage.

### Grow without hitting an artificial ceiling

When defaults are no longer enough, the same engine should support:

- raw and replacement-aware metrics in any meaningful combination;
- named file scopes;
- per-file and aggregate queries;
- reusable parameters;
- custom bands and rules;
- report and plan reuse;
- label groups and comment lifecycle;
- alternate diff sources;
- direct TypeScript integration.

The basic interface must lower into the same semantics rather than becoming a separate simplified implementation that eventually disagrees with the full language.

### Know what the number means

A result must expose:

- what source was compared;
- which metric version was used;
- which paths were included or excluded;
- whether evidence was exact, bounded, incomplete, or unmeasurable;
- how configured policy reached its result.

A convenient number is not worth inventing certainty.

### Compose it anywhere

Machine modes must be clean enough for assignment, pipes, conditional scripts, other CI systems, and agents. Human output should be readable without becoming the machine contract. JSON and other structured outputs should be versioned and stable.

### Apply effects deliberately

Analysis, policy evaluation, planning, and mutation are distinct.

A token does not turn reading into writing. An effect plan can be inspected before application. Label reconciliation may remove only declared managed members. Comment lifecycle must identify its own comments. Unrelated metadata remains untouched.

### Try it before installing it

A public read-only playground should let somebody enter a public pull-request URL and inspect what diffdevil sees: normalized files, raw and replacement-aware measurements, evidence quality, selected metrics, policy results, and the compact projection an automation or coding agent would consume.

The playground is a real product surface, not a hand-maintained demo. It uses the same engine and public contracts, applies no repository effects, and never turns a public PR into permission to inspect private data.

### Use it without becoming its operator

The managed GitHub App should provide the useful repository experience without requiring every adopter to assemble and maintain workflows, credentials, runners, upgrades, and hosted configuration themselves. It uses the same engine, policy model, reports, plans, and effect boundaries as the package and Actions.

Repository-owned policy remains authoritative. Hosted defaults may help a repository begin, but the service must not create a second hidden policy system that eventually disagrees with source-controlled configuration.

### Keep the open product complete

The open package, CLI, API, and Actions remain fully capable product surfaces. Hosted value comes from operation, administration, continuity, scheduling, history, scale, and support rather than withholding the useful engine or policy language. A self-hosted application or service can remain possible without forcing ordinary users to become infrastructure maintainers.

## Product shape

The selected complete shape is:

- one repository;
- one public npm package;
- a CLI executable named `diffdevil`;
- a public TypeScript API with deliberate subpath exports where useful;
- a root GitHub Action;
- `analyze`, `apply`, and `sync-labels` sub-actions;
- local Git, unified-diff, GitHub pull-request API, and normalized-report inputs;
- the optional detail expression language;
- presets and convenience authoring that compile into the same policy model;
- human, scalar, lines, NUL, JSON, JSONL, environment, Markdown, and compact agent-facing projections where each earns its use;
- managed labels, owned comments, and label-definition validation/synchronization;
- a managed GitHub App that operates the same engine and repository-owned policy;
- a public read-only PR playground backed by the same reports and projections;
- a website and documentation experience rendered from repository-owned product and manual sources;
- application and service code that may remain in this repository and release lifecycle without changing the reusable package boundary.

## Product character

diffdevil is serious developer infrastructure with a small authored spark.

The name carries the personality. Operational output carries trust. Public copy may be mildly mischievous; metrics, errors, logs, comments, schemas, and machine output remain calm and exact.

## Non-goals

diffdevil is not:

- merely a pull-request size labeler;
- a semantic code-review system;
- an AI reviewer;
- a risk, complexity, quality, or importance detector;
- a general CI orchestrator;
- a general command-execution engine;
- a repository-governance platform;
- a hidden default label taxonomy for every project;
- an excuse to execute pull-request code with privileged credentials;
- a second status database;
- a language whose complexity must be learned before the tool is useful.

## Success

diffdevil succeeds when:

- a three-line replacement can be represented as three modified positions while raw `+3/-3` remains available;
- unrelated additions and deletions are not falsely paired;
- incomplete evidence produces an honest and useful result;
- a shell script or agent can ask a precise question with one stable command;
- a repository can express its own policy without forking the engine;
- the zero-config Action is useful without trapping advanced users;
- the full package, CLI, and Action all consume the same semantics;
- applied GitHub effects are convenient, scoped, and explainable;
- a developer can understand a public PR through the playground before installing anything;
- a repository can move between CLI, Actions, and the managed App without changing measurement or policy meaning;
- the website teaches the product from the same maintained sources contributors update with the code;
- hosted convenience adds operational value without making the open product deliberately incomplete;
- the tool feels distinctive without making a production workflow look unserious.
