# Releasing Fluss (guide for AI agents)

This describes how to cut a release. **Read the hard rules first — they exist
because the release artifacts are produced by CI, not by you.**

## Hard rules

1. **The release is built by the GitHub Actions workflow, not locally.** Pushing
   a `v*` tag triggers `.github/workflows/release.yml`, which builds the
   Windows/macOS/Linux installers and opens a **draft** GitHub release named
   `Fluss vX.Y.Z` with those installers attached and notes from `CHANGELOG.md`.
2. **Do NOT create the release yourself.** Never run `gh release create`, never
   build installers locally and upload them, never hand-craft assets. The only
   legitimate release is the draft the workflow produces from this exact build.
3. **Do NOT publish.** The draft is published by a human after review. Your job
   ends when the tag is pushed.
4. **You do NOT need to watch the build.** It's fine to push the tag and stop.
   You may optionally check the run once (`gh run list`), but waiting for it to
   finish is not required and not expected.
5. **NEVER delete/overwrite a published release, and NEVER move an existing
   tag.** No `gh release delete`, no `--cleanup-tag`, no `git push --delete`, no
   force-tagging a version that already exists — until you have PROVEN the
   release is an unpublished draft (see below). A published release is pinned by
   users and the in-app updater; deleting or re-pointing it breaks them and
   cannot be undone. If in doubt, **bump the version instead** — it is always
   safe.
6. **A version, once tagged, is spent.** Never reuse a version number. The next
   release is always a higher semver, even to fix a mistake in the previous one.

Your entire responsibility: prepare the changelog, then push a *new* version tag.

## Before ANY destructive git/release command — check status first

Re-cutting is ONLY permitted on an unpublished draft, and only after this check
returns `true`:
```bash
gh release view vX.Y.Z --json isDraft --jq .isDraft   # must print: true
```
- Prints `true` → it's an unpublished draft; re-cutting is allowed (see the last
  section).
- Prints `false` → it is **PUBLISHED**. STOP. Do not delete it, do not move its
  tag. Bump to the next version and cut a fresh release instead.
- Errors / not found → no release exists for that tag; just proceed to tag.

Never run a delete/re-tag "to be safe" without this check passing first.

## Updater signing (already set up — read, don't redo)

The build signs the installers so the in-app updater will accept them. Both
repository secrets are already configured; a tagged build fails without them:

| Secret | Value | Status |
|---|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | contents of `~/.tauri/fluss-updater.key` | set |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | contents of `~/.tauri/fluss-updater.password.txt` | set |

Verify rather than re-create: `gh secret list`. Only ever re-run
`npx tauri signer generate` if the private key is genuinely lost — a new keypair
means a new `pubkey`, and every already-installed copy of Fluss stops trusting
updates.

The matching **public** key lives in `src-tauri/tauri.conf.json`
(`plugins.updater.pubkey`). Never change it once a release is out — installed
copies of Fluss only trust updates signed by that exact key. Losing the private
key means every existing install stops being updatable and users must reinstall
by hand, so keep it backed up outside the repo. The private key must never be
committed.

## Preconditions

- Working tree is clean and on the default branch (`main`), up to date with
  `origin`.
- All CI checks are green on the commit you're about to tag.
- You know the new version. Use semver: `vMAJOR.MINOR.PATCH` (e.g. `v0.2.0`).

## Steps

1. **Determine the version.** Inspect the latest tag and the commits since:
   ```bash
   git describe --tags --abbrev=0        # latest release tag
   git log <last-tag>..HEAD --oneline    # what changed
   ```
   Pick the next semver bump (patch = fixes, minor = features, major = breaking).

2. **Bump the version files.** Set the new version in **both** `package.json`
   and `src-tauri/tauri.conf.json`:
   ```bash
   node -e "for(const f of ['package.json','src-tauri/tauri.conf.json']){const j=require('./'+f);j.version='0.2.0';require('fs').writeFileSync(f,JSON.stringify(j,null,2)+'\n')}"
   ```
   This is **required, not hygiene.** `tauri.conf.json` is what `getVersion()`
   returns at runtime, which is the number the About section shows and the number
   the in-app update check compares against. Leave it stale and every dev build
   and every local build reports the old version and nags about an update that is
   already installed. CI overwrites these files during the tagged build, so
   installers are always labelled correctly either way — the commit matters for
   everything that isn't a CI installer.

3. **Update `CHANGELOG.md`.** Add a new section at the **top**, below the intro.
   The heading MUST contain the version — the workflow extracts release notes by
   matching it:
   ```markdown
   ## v0.2.0

   **Features**
   - ...

   **Fixes**
   - ...
   ```
   Write the notes from the commit log above. Keep the newest version first.

4. **Commit and push the bump + changelog** to `main`. One commit, and it must
   land *before* the tag so the tag points at a commit that knows its own
   version:
   ```bash
   git add CHANGELOG.md package.json src-tauri/tauri.conf.json
   git commit -m "release: v0.2.0"
   git push origin main
   ```

5. **Tag and push the tag.** This is the trigger:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

6. **Stop and report.** Tell the user the tag is pushed and the release workflow
   is building the draft. Give them the Actions URL and the releases URL so they
   can review and publish:
   - Actions: `https://github.com/<owner>/<repo>/actions`
   - Releases: `https://github.com/<owner>/<repo>/releases`

That's it. Do not take further release actions.

## Notes

- **Version files** are also synced to the tag **inside CI** (`Sync app version
  to tag` in `release.yml`), so a forgotten bump can't produce a mislabelled
  installer. That is a safety net, not a substitute for step 2 — the sync never
  reaches `main`, so the repo (and therefore every dev build) keeps reporting the
  old version until you commit the bump yourself.
- **`latest.json`** is generated in the release job and attached to the release.
  It is the updater's endpoint
  (`releases/latest/download/latest.json`), so the in-app update only appears
  once the draft is **published** — drafts serve no public assets. A release
  missing any platform's `.sig` fails the job instead of shipping.
- **Tag format** must match `v*` or the workflow won't fire.
- **Engines** (`yt-dlp`, `ffmpeg`, `deno`) are downloaded during CI by
  `scripts/fetch-binaries.sh` — never commit them.

## If the release is wrong

**First decide which case you're in** using the status check above.

**Case A — it's still an unpublished draft (`isDraft` == `true`).** Nobody has
it yet, so you may re-cut the same version. Delete the draft + tag, fix, re-tag:
```bash
gh release view v0.2.0 --json isDraft --jq .isDraft   # confirm: true
gh release delete v0.2.0 --cleanup-tag --yes          # draft + tag
git tag -d v0.2.0 2>/dev/null || true                 # local tag if present
# fix, commit, then repeat the Steps above with the SAME version
```

**Case B — it's published (`isDraft` == `false`), or you're unsure.** Do NOT
touch it. Leave the published release and its tag exactly as they are. Fix the
problem and ship a **new, higher version** (e.g. `v0.2.1`) via the normal Steps.
Users on the old version get it through the in-app update check. This is always
the safe choice — when unsure between Case A and B, treat it as B.
