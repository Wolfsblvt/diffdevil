# Store preparation

## Meaning

This directory contains authored submission material, not a Store listing. The build and asset generator do not publish anything, create a developer account or change the website. No extension ID or Store URL has been invented.

Run `npm run extension:store` after the candidate build and successful rendered-browser QA. The output is `artifacts/browser-extension/store`: a 128px icon, five 1280×800 RGB screenshots, 440×280 and 1400×560 RGB promotional rasters, editable SVG compositions and a SHA-256 manifest. The Store icon uses the accepted master mark; the small monochrome interface slot uses the accepted centre-seam shared product glyph. No font files are part of this source-session handoff.

[Listing](listing.md) contains the single purpose and ready-to-edit listing copy. [Privacy answers](privacy-answers.md) maps actual behavior to declarations rather than equating local processing with no data handling. [Submission](submission.md) contains the release gate and reviewer notes. [The application privacy notice](../privacy.md) is also rendered into the unpacked extension.

Assets remain reserved product artwork. Screenshots are actual renders of this source candidate against explicitly authored fixtures; they are not captures of a live private repository or an accepted installed extension. Their disclosure remains visible. Promotion compositions use the same measured fixture: 178 Changed = 60 added-only + 18 deleted-only + 100 modified; raw +160/−118 = 278 churn.
