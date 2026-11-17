# Developing Connect Four

## Running locally

The game uses ES modules, so serve the folder over HTTP (for example `python3 -m http.server`) rather than opening `index.html` directly.

## Releases

Releases are automatic. Every push to `main` runs `.github/workflows/release.yml`, which runs `scripts/release.mjs`:

- It finds the latest `v*` tag and reads the conventional commits since it.
- `feat` bumps the minor version, `fix` and `perf` bump the patch, and `!` or a `BREAKING CHANGE` footer bumps the major. Other types alone do not release.
- It creates the tag and a GitHub Release with notes grouped into features, fixes and maintenance.

After a release the workflow also commits `version.json` (with `[skip release]`). Every page reads it and shows the version: the home screen adds a link to the release after "Source Code", and every other page shows "Connect Four vX.Y.Z" at the bottom. If the branch blocks direct pushes from Actions, that step is skipped and the label keeps the last version.

If a release commit is undone, amended or force pushed, the next push moves the existing tag to the new commit and updates its release in place instead of making another version. Add `[skip release]` to a commit message to stop a push from releasing.

The workflow can also be run by hand from the Actions tab with a mode: `release`, `dry-run` (prints the next version and notes only), `backfill` (creates releases with notes for existing tags that have none, using the titles in `scripts/release-titles.json`) or `refresh` (rewrites the notes and titles of existing releases).

No setup is needed beyond the default `GITHUB_TOKEN`. Locally, `GITHUB_REPOSITORY=gabriellongshaw/connectfour node scripts/release.mjs --dry` shows what the next release would be.

## Structure

- `index.html` — home screen
- `offline/`, `bot/`, `online/` — the three game modes
- `assets/js/core/` — theme, Firebase loader, page transitions, utilities
- `assets/js/components/` — board, confetti, modal, back button, QR scanner, version label
- `assets/js/modes/` — game logic for each mode
- `assets/js/pages/` — page entry points
- `scripts/` — release automation
- `.github/workflows/` — release workflow
- `version.json` — current version, written by the release workflow