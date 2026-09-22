# Store preparation

## Meaning

This directory is the canonical source for the future Chrome Web Store listing and upload assets for **diffdevil for GitHub**. It does not create a Store listing, developer account, extension id, review request or publication effect.

The Store must never contain copy or images that exist only in the provider dashboard or an ignored build directory. The repository owns the exact listing copy, privacy answers, reviewer handoff, screenshots, promotional artwork, icon and asset manifest that a release operator later submits.

[Listing](listing.md) contains the single purpose and ready-to-edit listing copy. [Privacy answers](privacy-answers.md) maps actual behavior to declarations rather than equating local processing with no data handling. [Submission](submission.md) contains the release gate and reviewer notes. [The application privacy notice](../privacy.md) is also rendered into the unpacked extension.

## Source layout

```text
apps/browser-extension/store/
  listing.md
  privacy-answers.md
  submission.md
  assets/
    asset-manifest.json
    store-icon-128.png
    screenshots/
      01-changed-on-github.png
      02-inspect-the-report.png
      03-your-icon-preference.png
      04-your-policy-bands.png
      05-honest-uncertainty.png
    promo/
      small-promo-440x280.png
      small-promo-440x280.svg
      marquee-promo-1400x560.png
      marquee-promo-1400x560.svg
```

`listing.md` is the Store copy source. `privacy-answers.md` maps the actual local-first behavior to Store declarations. `submission.md` owns the release gate and reviewer notes. The asset manifest records dimensions, colour format, SHA-256, provenance and standing for every submitted raster. Editable promotional SVGs live beside their rendered PNGs.

## Ordinary preparation

```sh
npm run extension:store
```

This command does **not** render new Store material. It validates the committed manifest and image bytes, then copies the complete Markdown and asset source byte-for-byte to:

```text
artifacts/browser-extension/store/
```

That ignored directory is a disposable submission kit. The committed `apps/browser-extension/store/` tree remains the authority.

## Deliberate asset regeneration

```sh
npm run extension:build
npm run extension:qa
npm run extension:store:generate
```

The generation command intentionally rewrites the tracked `assets/` tree from the real extension UI, authored GitHub fixtures and accepted identity source. Inspect the image set, manifest, captions and resulting Git diff before committing it. Ordinary verification and packaging must not silently change Store artwork.

The five screenshots render the actual production interface against explicitly authored fixtures. They are not captures of a private repository or proof of live provider behavior. The promotional compositions use the same exact fixture facts: 178 Changed = 60 added-only + 18 deleted-only + 100 modified; raw +160/−118 = 278 churn. Store copy and reviewer notes preserve that boundary honestly.

Assets remain reserved product artwork. The extension's small monochrome interface slot uses the accepted centre-seam product glyph; the Store icon uses the accepted master symbol. No font files or remotely hosted executable code are introduced by the Store kit.
