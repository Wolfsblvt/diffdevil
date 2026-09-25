# Technical and project documentation

The manual teaches how to use diffdevil. The repository also maintains the design decisions, integration contracts, development procedures, and operator evidence behind it. Use these deeper sources when you need to change the product, embed it, operate an application, or inspect what a particular qualification actually proved.

This is a selected map, not an automatically published inventory of every repository file. Links use stable, allow-listed source identities; the source resolver identifies the exact source snapshot behind this manual. Unknown paths and arbitrary destination URLs are not accepted.

## Develop or contribute

Start with the [documentation map](https://diffdevil.dev/source/?f=docs%2FREADME.md), then [Development](https://diffdevil.dev/source/?f=docs%2FDEVELOPMENT.md) for prerequisites, restoration, builds, ordinary `npm run verify`, and separately qualified package, Action, browser, and live-provider journeys. [Project map](https://diffdevil.dev/source/?f=docs%2FPROJECT-MAP.md) locates implementation ownership without asking you to infer it from directory names.

[Vision](https://diffdevil.dev/source/?f=docs%2FVISION.md) describes the product's destination. [Direction](https://diffdevil.dev/source/?f=docs%2FDIRECTION.md) separates that destination from the currently implemented and deployed frontier. [Decisions](https://diffdevil.dev/source/?f=docs%2FDECISIONS.md) preserves the selected tradeoffs; [Architecture](https://diffdevil.dev/source/?f=docs%2FARCHITECTURE.md) explains the shared engine and host boundaries.

Follow the repository's current contribution instructions. Ordinary bugs and proposals go to the [repository Issues](https://github.com/Wolfsblvt/diffdevil/issues); a minimal non-sensitive reproduction is more useful than a raw private report dump. Review the [licence map](https://diffdevil.dev/source/?f=LICENSES%2FREADME.md) before reusing application code, examples, documentation, or visual assets.

## Integrate or embed

The [TypeScript API reference](../reference/typescript-api.md) is the consumer entry. [GitHub acquisition and effects](https://diffdevil.dev/source/?f=docs%2Fintegration%2Fgithub-api.md) owns trusted policy, freshness, permissions, and provider observations. [Action distribution](https://diffdevil.dev/source/?f=docs%2Fintegration%2Faction-distribution.md) explains the committed install-free runtime rather than introducing another workflow setup guide.

For language implementation work, use the [detail contract package](https://diffdevil.dev/source/?f=src%2Fdiffdevil%2Fcontracts%2Fdetail%2Fv1%2FREADME.md) and [parser architecture](https://diffdevil.dev/source/?f=docs%2Flanguage%2Fparser-architecture.md). The [detail manual](../reference/language-and-contracts/detail-language.md) remains the language user's reference. [Presentation](https://diffdevil.dev/source/?f=docs%2Fpresentation.md) owns the shared output model; terminal, checks, and browser surfaces do not get independent measurement semantics.

## Operate an application

Enter through [Self-host the App](../use/managed-app/self-hosting.md), then use the [App operator source](https://diffdevil.dev/source/?f=apps%2Fgithub-app%2FREADME.md), [App architecture](https://diffdevil.dev/source/?f=docs%2Fintegration%2Fgithub-app.md), and [privacy/history contract](https://diffdevil.dev/source/?f=docs%2FPRIVACY-AND-DATA.md). These own resources, credentials, recovery, consent, export, and deletion. They do not imply an open public dashboard or a second supported hosting stack.

The [Playground operator source](https://diffdevil.dev/source/?f=apps%2Fplayground%2FREADME.md) covers the independently operated public read-only application. The [website source](https://diffdevil.dev/source/?f=apps%2Fwebsite%2FREADME.md) and [manual renderer](https://diffdevil.dev/source/?f=apps%2Fmanual%2FREADME.md) own static builds and the joined search/route projection. A build is not a deployment.

The [extension source](https://diffdevil.dev/source/?f=apps%2Fbrowser-extension%2FREADME.md) and [extension privacy notice](https://diffdevil.dev/source/?f=apps%2Fbrowser-extension%2Fprivacy.md) explain local installation, storage, and release qualification. The [canonical Skill](https://diffdevil.dev/source/?f=skills%2Fdiffdevil%2FSKILL.md) and [installation/update reference](https://diffdevil.dev/source/?f=skills%2Fdiffdevil%2Freferences%2Finstall-and-update.md) are complete instruction artifacts, not App enrollment.

## Understand evidence and releases

[Qualification](https://diffdevil.dev/source/?f=docs%2Fqualification.md) binds evidence to exact candidates and observed boundaries. [Publication boundary](https://diffdevil.dev/source/?f=docs%2Fpublication-boundary.md) separates public source and artifacts from provider effects. Use [Releases](releases.md) for package, Action, Skill, App, extension, and website standing before treating one successful release action as publication of all of them.

Dated release notes and research under `docs/reference/` remain historical evidence, outside the default current reader search. They explain their original subject and date; they do not override maintained contracts. The [v1.0.0 account](https://diffdevil.dev/source/?f=docs%2Freleases%2Fv1.0.0.md) describes that release, not everything added to source afterward.

For a suspected vulnerability, use the private route in [Security reporting](https://diffdevil.dev/source/?f=SECURITY.md). For a failed task, return to [Troubleshooting](troubleshooting.md). The standalone [FAQ](https://diffdevil.dev/faq/) remains the short-answer surface rather than another copy of these sources.
