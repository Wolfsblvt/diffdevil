# diffdevil design reference errata

## Meaning

This record preserves explicit corrections to the admitted design reference without rewriting its source bytes. It is the durable bridge between reference provenance and the behavior production consumers must implement and qualify.

## E001 — Explicit light-theme accent text

**Standing:** Open production consequence; the supplied `tokens.css` remains unchanged as provenance.

**Observed source:** [`tokens.css`](tokens.css) defines light `--accent-text: #aa167d` in `[data-theme="light"]`, then later defines `:root, [data-theme="dark"] { --accent-text: #f061ba; }`. The `:root` selector also matches `<html data-theme="light">`, so an explicit light selection can receive the dark text value.

**Required production consequence:** Runtime tokens must make an explicit light or dark choice authoritative, then qualify the computed `--accent-text` value in both explicit themes. This is a cascade correction, not a new palette choice or authority to modify the preserved reference file.

**Source:** [Accepted design source input](https://github.com/Wolfsblvt/emergency-meeting/issues/483#issuecomment-5722715573); [visual implementation Work](https://github.com/Wolfsblvt/emergency-meeting/issues/475).
