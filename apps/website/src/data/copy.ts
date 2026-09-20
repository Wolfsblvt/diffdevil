// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Site copy, keyed as in the accepted copy deck. Strings only; values live in tokens,
 * rules in the behaviour spec. `{origin}` is resolved at build from the configured
 * origin. Nothing here is a product measurement: numbers on the surfaces come from the
 * engine at build or run time.
 */
export const copy = {
  nav: {
    docs: 'Docs', playground: 'Playground', examples: 'Examples', menu: 'Menu', install: 'Install', dashboard: 'Dashboard',
    command: 'npm i -D @wolfsblvt/diffdevil', copied: 'Copied ✓', source: 'Source on GitHub',
  },
  /** Install⌄: [product wording → product page, description, action wording → the action itself]. */
  install: {
    extension: ['Browser extension', 'Changed and policy directly inside GitHub', 'Add to Chrome'],
    app: ['GitHub App', 'Automatic checks, labels and managed operation', 'Install on GitHub'],
    open: 'CLI and GitHub Actions',
  },
  theme: {
    label: 'Theme', dark: 'Dark', light: 'Light',
    auto: (resolved: string) => `Automatic, using ${resolved}`,
    next: (label: string) => `Next click: ${label}.`,
  },
  community: {
    trigger: 'Community and social links', tooltip: 'Community', heading: 'Community',
    discord: ['Discord', 'Wolfsblvt Works community'], bluesky: ['Bluesky', 'Development updates'], works: ['Wolfsblvt Works', 'About the maker'], github: ['GitHub', 'Source code'],
  },
  search: {
    trigger: 'Search', title: 'Search diffdevil', placeholder: 'Search the site and the manual', close: 'Close search',
    hint: 'Searches site pages and the manual. Every result says which one it is.', kindDocs: 'Docs', kindSite: 'Site',
    unavailable: 'The search index is part of the built site and is not available in this preview.',
    none: (query: string) => `Nothing found for "${query}".`,
    count: (total: number, shown: number) => (total > shown ? `${total} results · showing the first ${shown}` : `${total} result${total === 1 ? '' : 's'}`),
  },
  footer: {
    line: 'One deterministic core. CLI, TypeScript API, GitHub Actions, GitHub App, playground and agents read the same report.',
    licence: 'Engine MIT · applications AGPL-3.0-only · docs CC BY 4.0 · brand reserved',
    get: 'Get', learn: 'Learn', project: 'Project',
  },
  a11y: { copied: 'Copied to clipboard.', menu: 'Menu' },

  hero: {
    eyebrow: 'Composable diff analysis and automation for GitHub and the CLI',
    h1: 'The devil is in the diff.',
    strap: 'Measure changes. Match rules. Act on the result.',
    why: 'Git gives you a patch and a pair of raw counters. diffdevil turns the details inside that diff into facts you can see in GitHub, query locally, evaluate in workflows, and hand to agents.',
    ctaPrimary: 'Add to Chrome', ctaSecondary: 'Use the CLI / Actions', ctaTertiary: 'Try a public PR',
    specimenHead: 'src/Foo.cs · one edit block', specimenSemantics: 'replacement-lines-v1',
    leftLabel: 'Replacement-aware · what a size policy counts',
    rightLabel: 'Raw counters · what the patch shows',
    rightSub: 'still reported, never renamed',
    foot: 'Calling this "5 changed lines" would misrepresent the edit. Two lines were replaced, one was added.',
  },

  routes: {
    one: { index: '01', label: 'CLI · TypeScript · GitHub Actions', title: 'Run diffdevil yourself',
      body: 'One workflow file gives a repository size labels, no comments, and an inspectable summary. The same engine answers local queries, script conditions, the TypeScript API and agents.',
      file: '.github/workflows/size.yml', fileMeta: 'writes labels · pull-requests: write', cta: 'Install',
      links: [['Label PRs in one file', 'getStarted'], ['Query locally', 'localAutomation'], ['Author a policy', 'recipes']] as const },
    two: { index: '02', label: 'Browser extension', title: 'Bring Changed into GitHub',
      body: 'See replacement-aware Changed, per-file decomposition, personal or repository size bands, and inspectable reports directly on pull requests. No workflow, App installation, or repository write access required.',
      cta: 'Add to Chrome', link: 'Explore the browser extension' },
    three: { index: '03', label: 'GitHub App', title: 'Let it run for you',
      body: 'Install the GitHub App once for automatic analysis, native checks, labels, comments, and managed configuration. No workflow file, token assembly, or runner upkeep.',
      cta: 'Install the App', links: [['How the App works', '/app/'], ['Self-hosting', '/app/#self-host']] as const },
  },

  /** Where a refused PR URL is explained; used by the playground. */
  prPlaceholder: 'https://github.com/owner/repo/pull/123',

  measure: {
    eyebrow: '#measure', h2: 'Why changed lines exist',
    body: 'Raw churn counts additions and deletions separately. Replacement-aware changed lines classify adjacent replacements once, while keeping added-only, deleted-only and modified as separate facts. Your size policy reads one number; the rest stays visible so nobody has to trust it blind.',
    links: [['How changed lines work', 'typesAndMeasurements'], ['Measurement versions and metric semantics', 'versioning']] as const,
    panelHead: 'docs/examples/reports/exact.json · policy full.yml',
    primaryLabel: 'Policy-focus metric · review', decomposition: 'Decomposition', raw: 'Raw · contrast',
    tryIt: 'Try this fixture in the playground',
  },

  query: {
    eyebrow: '#query', h2: 'Query what changed',
    body: 'Analyze once. Read the result as prose, a value, a condition, a path list, or data. False, unknown and error are different exit codes, so a shell can tell them apart.',
    links: [['Query reference', 'cli'], ['Local automation guide', 'localAutomation']] as const,
    foot: 'same report → human · scalar · lines · NUL · JSON · JSONL · env · Markdown · agent',
    foot2: 'stdout is the result; diagnostics go to stderr',
  },

  policy: {
    eyebrow: '#policy', h2: 'Policy → plan → apply',
    body: 'Facts are not effects. Planning is not applying. A token being present never turns reading into writing. You declare the policy; diffdevil evaluates it, shows the intended effects, and mutates only when told to.',
    col1: ['§ Configured', '.diffdevil.yml', 'you own this'], col2: ['→ Proposed', 'diffdevil plan', 'inspectable, no writes'], col3: ['⟲ Applied + readback', 'diffdevil apply', 'explicit'],
    col3Body: ['Read current labels on PR #123.', 'Group size: size/S present, size/M absent.', '  − remove size/S', '  + add size/M', 'Unrelated labels untouched (3).', 'Applied 2 label changes.', 'Readback confirms size/M.'],
    col3Note: 'What an explicit apply reports. Readback is observed provider state, never assumed.',
    links: [['Policies and bands', 'policies'], ['Managed label groups and owned comments', 'templates'], ['Plan and apply in Actions', 'actions']] as const,
  },

  agents: {
    eyebrow: '#agents', h2: 'Give agents facts, not patches to eyeball',
    body: 'A coding agent that reads a diff re-derives arithmetic and invents precision. diffdevil hands it deterministic facts with evidence standing, in a projection built for a context window. Same semantics as the report, nothing added.',
    links: [['Agent integration docs', 'agents'], ['Agent output contract', 'cli']] as const,
    compareLeft: ['What a person reads', 'diffdevil analyze'], compareRight: ['What an agent consumes', 'diffdevil analyze --format agent'],
    compareFoot: '= ≈ ? ∅ survive into this form. No judgment, no prose, no renamed churn.',
    skill: {
      title: 'Teach your agent diffdevil once', metaPrefix: 'Agent Skill',
      body: 'A versioned skill, one Markdown file, installed byte-identically by your harness. It teaches the agent to analyze, query, check, plan, and apply under your explicit grant; to read = ≈ ? ∅; and to keep facts, policy, proposed and applied effects apart. It can check whether its installed version is current.',
      cta: 'Add the skill to your agent', ctaDone: 'Copied ✓ — paste it to your agent', path: '/skill/SKILL.md', link: 'Read the skill',
      disclosure: 'Explore the Agent Skill', disclosureSub: 'contents · installation · versioning', disclosureOpen: 'Close the Agent Skill details',
      teaches: ['Teaches', 'which command answers which question; how to read the compact output; how to obtain the package on demand'],
      reinforces: ['Reinforces', 'facts ≠ policy ≠ proposed ≠ applied ≠ readback; bounded stays bounded; apply needs your grant'],
      current: ['Stays current', 'compares its version with /skill/version; how it refreshes depends on your harness'],
      install: '"Add the skill" copies one instruction: fetch /skill/SKILL.md, save it verbatim as a skill named diffdevil, re-check /skill/version when it runs.',
      runtime: 'The agent runs the real CLI. Nothing is bundled into the skill; the npm package is the engine.',
      authority: 'Analysis and planning need nothing from you. Applying effects happens only under your explicit grant; the skill and the docs own the details.',
      links: [['Agent integration docs', 'agents'], ['Skill changelog', 'releases']] as const,
      copyInstruction: 'Install the diffdevil Agent Skill from {origin}/skill/SKILL.md as a skill named "diffdevil", byte-identical. When the skill runs, compare its version with {origin}/skill/version.',
    },
    setup: {
      title: 'Or let an agent set diffdevil up', meta: 'one sentence + a URL', lead: 'Let an agent set up',
      cta: (intent: string) => `Copy the ${intent} setup prompt`, ctaDone: 'Copied ✓', note: 'Any harness · no vendor',
      disclosure: 'See the exact prompt and setup steps', disclosureSub: 'prompt · steps · authority', disclosureOpen: 'Close the setup details',
      stepsHead: 'What the agent will do', authorityHead: 'Authority',
      foot: 'Instructions are versioned Markdown, the same file the docs render.', footLink: 'Read them yourself',
    },
  },

  setupIntents: [
    { id: 'cli', chip: 'the CLI locally', short: 'CLI', path: '/setup/cli.md',
      description: 'Installs the package as a dev dependency, writes a starter .diffdevil.yml with the size preset, and runs one analysis so you see a result before touching CI.',
      prompt: 'Set up the diffdevil CLI in this repository by following {origin}/setup/cli.md exactly.',
      steps: ['Reads the versioned instructions', 'Adds @wolfsblvt/diffdevil as a dev dependency', 'Writes .diffdevil.yml from the size@1 preset', 'Runs diffdevil analyze and shows you the summary'],
      authority: 'Local files only. No GitHub access, no tokens, no writes outside your working tree.' },
    { id: 'actions', chip: 'GitHub Actions', short: 'Actions', path: '/setup/actions.md',
      description: 'Adds the one-file size workflow, explains the write permission it needs, and asks before enabling comments or touching existing workflows.',
      prompt: 'Set up diffdevil GitHub Actions for this repository by following {origin}/setup/actions.md exactly.',
      steps: ['Reads the versioned instructions', 'Adds .github/workflows/size.yml (root Action, size@1)', 'Explains pull-requests: write and pull_request_target before committing', 'Runs a read-only analysis locally and shows the summary'],
      authority: 'The workflow writes labels inside one managed group when it runs on GitHub. Nothing runs against GitHub until you merge it.' },
    { id: 'app', chip: 'the GitHub App', short: 'App', path: '/setup/app.md', github: true,
      description: 'Walks you to the App installation on GitHub, then aligns your .diffdevil.yml with the preset you chose so repository policy and App defaults agree.',
      prompt: 'Set up the diffdevil GitHub App for this repository by following {origin}/setup/app.md exactly.',
      steps: ['Reads the versioned instructions', 'Hands you the installation link; you authorize it on GitHub', 'Writes or aligns .diffdevil.yml with the chosen preset', 'Checks that no Action writer targets the same labels'],
      authority: 'Installation and permissions are granted by you on GitHub. The agent never holds App credentials.' },
    { id: 'everything', chip: 'everything', chipSub: 'includes the Skill', short: 'full', path: '/setup/everything.md',
      description: 'CLI locally, repository policy, the Agent Skill, and one GitHub execution route — Actions or the App, never both writing the same labels.',
      prompt: 'Set up diffdevil completely for this repository by following {origin}/setup/everything.md exactly, including the Agent Skill.',
      steps: ['Reads the versioned instructions', 'CLI as dev dependency + .diffdevil.yml', 'Installs SKILL.md byte-identically as a skill', 'Asks: Actions or App? Configures one, never both'],
      authority: 'Asks before any GitHub-facing change. Refuses to enable a second writer for effects the other route already owns.' },
  ],

  evidence: {
    eyebrow: '#evidence', h2: 'Evidence you can trust',
    body: 'Every value states how it was established. A convenient number is not worth inventing certainty, so exact, bounded, unknown and unmeasurable stay different words in every output.',
    link: ['Evidence semantics', 'typesAndMeasurements'] as const,
    cells: [
      { glyph: '=', word: 'exact', status: 'exact', text: 'Every included edit block was observed.' },
      { glyph: '≈', word: 'bounded', status: 'bounded', text: 'A proven interval. When the whole interval lies inside one band, the band is still proven.' },
      { glyph: '?', word: 'unknown', status: 'unknown', text: 'File set incomplete; only a lower bound. No band is invented; the rule holds, or selects only its declared unknown label.' },
      { glyph: '∅', word: 'unmeasurable', status: 'unmeasurable', text: 'Lines are undefined for binary content. Shown as undefined, never as 0.' },
    ],
    foot: 'A line count does not establish importance, risk, complexity or quality. Your policy owns that judgment; diffdevil evaluates it and shows its work.',
  },

  app: {
    eyebrowTail: 'diffdevil GitHub App', h2: 'Same diffdevil. Less plumbing.', h2Lines: ['Same diffdevil.', 'Less plumbing.'] as const,
    body: 'Install once on the repositories you choose. The App runs the same engine and the same .diffdevil.yml as the Action, and stays up to date without a workflow file, a token, or a runner to babysit.',
    ctaPrimary: 'Install on GitHub', ctaSecondary: 'How the App works', ctaTertiary: 'Self-host it',
    foot: 'Open source (AGPL-3.0). Official hosted version with a useful free allowance; self-hosting documented with its real requirements.',
    benefits: [
      ['Install once', 'No workflow file for ordinary use, no personal token assembly, no runner minutes or upgrades.'],
      ['Native check summaries', 'Evidence, raw and replacement-aware facts, rule results and observed effects on the PR itself.'],
      ['Org defaults, repo overrides', 'Pick a preset for the account; a repository’s .diffdevil.yml wins where it speaks.'],
      ['Effective configuration', 'See every setting and where it came from. Export the resolved ordinary policy any time.'],
      ['Deliberate effects', 'Labels only in declared groups, comments only when opted in, readback after every write.'],
      ['History if you want it', 'Opt-in, numeric, pathless. Nothing is archived before you say so.'],
    ] as const,
  },

  extension: {
    name: 'diffdevil for GitHub', add: 'Add to Chrome',
    h2: 'Changed, where you already review',
    body: 'diffdevil for GitHub adds replacement-aware totals, per-file decomposition, size bands and inspectable reports directly to pull requests, without requiring a repository workflow or write access.',
    columns: [
      ['See the useful number', 'Aggregate and per-file Changed, with added-only, deleted-only, and modified positions kept distinct.'],
      ['Apply your own policy', 'See virtual size bands even when the repository has no workflow, labels, App installation, or diffdevil configuration.'],
      ['Open the evidence', 'Inspect the complete report, policy origin, exclusions, and evidence quality without leaving the pull request.'],
    ] as const,
    explore: 'Explore diffdevil for GitHub', trust: 'Local analysis by default. Raw patches are not persisted.',
    specimenNote: 'Authored pull-request scene in the visual language of GitHub. Every figure is the engine result for',
    distinction: 'The extension changes your view. The App runs for the repository.',
  },

  support: {
    h2: 'Support diffdevil',
    body: 'diffdevil is open source and built in the open. If it saves your team time, a sponsorship or a star helps keep it maintained.',
    sponsor: 'Sponsor', star: 'Star us on GitHub',
  },

  playground: {
    title: 'Playground', sub: 'Read-only · public pull requests and curated examples · no account · nothing stored',
    tabPr: 'Public pull request', tabExamples: 'Curated pull requests',
    inputLabel: 'Pull request URL', inputHint: 'Public github.com pull requests only. Never asks for a token.', inputButton: 'Analyze public PR',
    analyzed: 'Analyzed', edit: 'edit', copyUrl: 'copy URL',
    fixtures: 'Frozen fixtures', fixturesHint: 'Repository-owned, deterministic. Work without touching GitHub.',
    prs: 'Real pull requests', prsHint: 'Real open-source PRs we picked and snapshotted. Open from cache; refresh on demand.',
    config: '§ Configuration', controls: 'Controls', policy: 'Policy',
    preset: 'Preset', metric: 'Size metric', bands: 'Bands', exclude: 'Exclude', comment: 'Comment', commentOff: 'off · opt-in, upsert', commentOn: 'on · upsert',
    kept: 'Also in this policy', keptTail: 'untouched by these controls:', keptLink: 'Open in Policy',
    configNote: 'Edits re-evaluate the acquired comparison. Nothing is refetched.',
    policyValid: '✓ valid · annotations are live effects per key · bounded data for the shared compiler, no code runs',
    primaryLabel: 'Policy-focus metric', changedUnit: 'changed',
    viewsH: 'See this result as', viewsSub: 'Four views. Same analysis. Each one is what a different reader of diffdevil gets.',
    tiles: [
      { id: 'terminal', glyph: '$', title: 'Terminal', meaning: 'What a developer sees from the CLI' },
      { id: 'agent', glyph: '{ }', title: 'Agent · data', meaning: 'What tools, scripts and agents consume' },
      { id: 'github', glyph: '→', title: 'GitHub preview', meaning: 'What diffdevil proposes to change on the PR' },
      { id: 'explain', glyph: '?', title: 'Explanation', meaning: 'Why the result happened, key by key' },
    ] as const,
    export: 'Export', exportSub: 'CLI, Action, .diffdevil.yml',
    terminalFoot: 'The real human presenter’s output for this report — not a website re-rendering.',
    agentFoot: 'Same semantics as the report. The Agent Skill teaches an agent to read exactly this.',
    githubNotice: '→ Proposed, not applied.', githubNoticeBody: 'The playground has not read this repository’s labels or comments, so it shows the desired end state, not add / remove / no-op operations. apply reads back first.',
    labelsH: 'Desired labels', checkH: 'Check summary · as the GitHub App posts it', checkFoot: 'A conclusion describes policy execution, never merge approval or code quality.',
    commentH: 'Owned comment · rendered', commentOffNote: 'off in this policy', commentShownWith: 'shown with review-comment.yml',
    explainLanes: [['■', 'Fact', 'observed'], ['§', 'Rule', 'configured'], ['→', 'Proposed', 'desired effect, nothing applied'], ['⟲', 'Readback', 'Not observed. The playground reads no repository state and applies nothing.']] as const,
    explainKeys: 'Which settings produced this',
    filesH: 'Files', filesCols: ['path', 'change', 'scope', 'raw + − churn', '+only −only ~mod changed', 'evidence'],
    otherMetrics: 'Other metrics',
    working: 'Reading the current pull-request comparison…',
    done: 'Analysis complete. No provider effects were applied.',
    newer: 'A newer head exists.', newerBody: (sha: string, snap: string) => `The pull request moved to ${sha} after this snapshot. Everything below belongs to ${snap}, our teaching reference.`, analyzeLatest: 'Analyze latest', backToSnapshot: 'Back to snapshot',
    whyThisPr: 'Why this PR',
    states: {
      refused: (input: string) => `× Not a public github.com pull-request URL. "${input}" is private or absent. The playground reads public pull requests only, never asks for a token, and does not fetch arbitrary URLs. Accepted shape: https://github.com/owner/repo/pull/123`,
      budget: (minutes: number | undefined) => `GitHub read budget exhausted for this playground${minutes ? ` · retry in ${minutes} min` : ''}. The public playground shares GitHub’s 60 unauthenticated requests per hour per address. Curated examples and your previous result remain available. For an immediate answer locally: npx @wolfsblvt/diffdevil analyze`,
      upstream: 'GitHub did not answer; your input is kept. Retry.',
      unreachable: 'The playground API could not be reached; your input is kept. Curated examples still work without it.',
      previous: 'from previous analysis',
      previousPolicy: 'from previous valid policy',
    },
    exportPermission: 'This workflow writes labels. Uses Wolfsblvt/diffdevil@v1 on pull_request_target with pull-requests: write and policy-source: base. The read-only alternative uses /actions/analyze with pull-requests: read. A working preview is not proof of write permission.',
    exportReadOnly: 'Reads only. Analyzes your local comparison. No token, no repository writes.',
    exportAssumptions: 'Assumptions written into this export',
    exportApp: 'Carry into the GitHub App', exportAppBody: 'Opens App setup with this policy prefilled. Asks you to install and authorize there; nothing from this anonymous session is kept.', exportAppCta: 'Continue to App setup',
  },

  examples: {
    title: 'Examples',
    howTitle: 'Why look at these',
    how: 'A number is only convincing once you have seen it on a change you can judge yourself. Each example is a real pull request picked for one lesson: what a replacement-aware count says that raw churn hides, what an exclusion changes, or how a band is decided. Open one in the playground, change the policy, and watch the same engine that runs in your CI answer.',
    howNote: 'Every figure on a card is the snapshot analysis of that pull request, with its head and date. Nothing here is typed in.',
    realTitle: 'Real pull requests', realBody: 'Open-source pull requests we picked and snapshotted. They open from the snapshot; analyze the latest head on demand.',
    open: 'Open in the playground', why: 'Why this PR',
  },

  docs: { title: 'Docs', search: 'Search the manual', tryIt: 'Try it in the playground' },
} as const;

export type SetupIntentId = 'cli' | 'actions' | 'app' | 'everything';
