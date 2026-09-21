# Product FAQ authoring and integration

## Meaning

The FAQ answers adoption, differentiation and trust questions before operational details. Its
single authored source is `docs/manual/faq.md`, rendered at `/faq/` as a standalone product page
with the shared header and footer, not the manual sidebar. This document owns the editorial and
integration rules that keep the source, public page, documentation links and individual search
answers consistent. Source implementation is not publication or feature availability.

## Reader journey

The ordered categories are **Why diffdevil?**, **Understanding the numbers**, **Browser extension
and Playground**, **Policies and automation**, **Managed App and your data**, and **Compatibility
and help**. The opening earns adoption by answering why the product differs, when an existing
size labeler is enough, which surface to choose, and how coding agents fit. Ordinary help stays
later. The FAQ does not mirror the manual or collect leftover reference material.

Questions are plain and neutral. Answers are candid, personal and occasionally dry, within the
[brand voice](BRANDING.md), without making privacy or permission claims into jokes. Start with
the actual answer. Normally use 40–90 words, never more than 120; one or two paragraphs suffice.
Zero or one unobtrusive deeper link may follow. An answer must remain useful without that link.
Tutorials, workflows, option catalogues and long troubleshooting procedures belong in the manual.

## One source, several entry points

Edit `docs/manual/faq.md`, not generated content. Its native HTML disclosures and ordinary
Markdown prose remain readable on GitHub. Semantic identifiers are authored explicitly and
visible above each question; changing a title or category does not change its identifier.
Retain an established identifier when wording evolves. A deliberate merge must preserve the
retired fragment at the surviving answer and reconcile its search and inbound links.

`apps/website/docs-manifest.mjs` declares the FAQ as a product route, not a Starlight collection
entry. The existing `tools/website-docs.mjs` pipeline projects it to ignored
`apps/website/src/generated/faq.md`, preserving its title, frontmatter and content while resolving
repository-relative deeper links to selected website routes. It does not add fixture-companion
links to an answer. A missing selected destination fails generation rather than publishing a
broken or accidental source URL.

The same manifest places **Help → FAQ** and selects relevant question identifiers for existing
manual pages. Their related-question links derive the question text from the authored FAQ; no
second title or answer list is maintained. This keeps the actual operating manual connected now.
The separate manual route/host migration can change destinations in that manifest without
rewriting FAQ prose or creating another FAQ edition.

The shared product header includes FAQ after Install, including the compact menu. The shared
footer and repository README expose it. There is no homepage FAQ section, duplicate starting-point
list, or resources block beneath the questions. Homepage contextual links are optional and sparse;
manual-to-FAQ links carry the main explanatory relationship.

## Disclosure and search behavior

The first two answers begin open; all disclosures are independent. Native controls remain usable
without JavaScript. The small enhancement opens and focuses a question reached by hash, search,
Back/Forward or its visible permalink, including re-clicking the same fragment after closing the
answer. Ordinary modified link clicks retain browser behavior. Copy uses the canonical
`https://diffdevil.dev/faq/#identifier` destination and reports clipboard failure without breaking
navigation.

One Pagefind build indexes the site/manual and extracts one `FAQ` record per rendered question.
The complete FAQ is not indexed again as a giant site-page hit. Each answer record carries its
actual title, category, semantic identifier, canonical destination and any relevant development
standing. Search results identify FAQ answers and open the exact disclosure; following a
same-page result closes the search dialog before moving focus. There is no FAQ-only search box,
remote search service or independently authored search answer.

The build uses the existing locked Pagefind package supplied by the Starlight toolchain through
its ESM API. This replaces the default indexing pass; it does not run a second competing pass or
add another search dependency graph. Toolchain updates retain the build and browser checks.

## Availability and deeper ownership

Write for the complete selected release experience. Keep real extension or managed-service
limitations in narrow development notes, not a page-wide provisional voice. A grouped note is
attached to each affected answer's metadata so direct links and search do not lose it. Remove the
note and its references together only when the corresponding availability is established.

The FAQ does not invent Store links, commercial prices, supported browsers or hosting adapters.
Measurement and evidence semantics belong in the language/integration contracts; provider trust
belongs in the Action/API guides; hosted data and history belong in
[Privacy and data](PRIVACY-AND-DATA.md); application operation belongs in its maintained runtime
guide. FAQ summaries must be reconciled when those facts change.

## Verification

`npm run test:faq` exercises question extraction, stable fragments, search metadata, development
standing, the product/manual route distinction and contextual-link integrity. The ordinary root
`npm test` discovers this suite through the existing `apps/**/*.test.mjs` convention.

After `npm run website:build`, `npm run qa:faq` exercises the real built page and Pagefind index:
all question records, independent and keyboard disclosures, permalinks, clipboard, Back/Forward,
search focus, manual/deeper links, compact navigation, responsive layouts and no-JavaScript use.
It owns its local static server and browser and closes both. Results and selected screenshots are
written under `artifacts/website/faq-qa/`. The read-only FAQ workflow runs that journey on the exact
PR head and retains its evidence. No verification command deploys the website or applies provider
effects.
