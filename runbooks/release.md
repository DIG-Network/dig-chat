# Runbook — releasing DIG Chat

## Where DIG Chat sits in the release model

DIG Chat lives at `modules/apps/dig-chat` in the `dig_ecosystem` superproject, which puts it in the
**apps** group (`CLAUDE.md` §3.6-A):

- A **midnight-UTC cron** cuts exactly one nightly per night — a dated `nightly-YYYYMMDD` tag plus a
  rolling `nightly` pre-release. The cron NEVER cuts a stable version.
- A **stable `vX.Y.Z`** is cut only by a manual `workflow_dispatch(channel: stable)`.

Merging does not release. Pushing a tag by hand is not how a release is made — the workflow owns
tagging.

## Before a release can happen at all

This repository is new. Until the following exist, treat every item below as pending rather than as a
procedure to follow:

1. **`RELEASE_TOKEN`** — a classic PAT on the repository. The release workflow pushes the changelog
   commit and the tag with it, never `GITHUB_TOKEN`: a tag pushed by `GITHUB_TOKEN` does not fire the
   deploy-on-tag workflow, and the changelog commit has to clear branch protection.
2. **Branch protection on `main`** — see below. It can only be provisioned once CI is green, because
   a required check that has never passed blocks every PR.
3. **A code-signing story.** An unsigned Electron build triggers SmartScreen on Windows and Gatekeeper
   on macOS. Neither certificate exists yet, and neither can be created without the user.

## Branch protection to provision

Once CI is green on `main`:

- Pull request required; no direct pushes, no force-push, no deletion.
- Required status checks, `strict = true`. The contexts must string-match the job NAMES in
  `.github/workflows/ci.yml` exactly, or every PR silently blocks:
  - `format, lint, typecheck, test, build`
  - `commit messages`
  - `version increment`
- `required_conversation_resolution = true` — including every GHAS/CodeQL comment.
- Squash-merge only, `required_linear_history = true`, `delete_branch_on_merge = true`.
- `required_approving_review_count = 0` — the loop cannot approve its own PR.
- `enforce_admins = false` — the one sanctioned direct-to-main path, so the `RELEASE_TOKEN` identity
  can push the release commit and tag.

## Cutting a release

1. Confirm `main` is green.
2. Confirm `package.json`'s `version` is the one being cut. The version gate fails a PR whose version
   did not increase, so by this point it already is.
3. Run the release workflow: **Actions → Release → Run workflow**, `channel: stable`.
4. Watch it: `gh run watch --repo DIG-Network/dig-chat`.
5. Verify the tag points where you think: `gh api repos/DIG-Network/dig-chat/git/ref/tags/vX.Y.Z`.
   An **annotated** tag returns the tag OBJECT's sha — dereference it to the commit before anyone
   bumps a submodule pointer to it.

## Bumping the superproject pointer

The superproject gitlink is **orchestrator-owned**. Report the commit to pin; do not add or move the
submodule from inside this repository.

Never bump to a red tip. For a functional release, pin the commit the released `vX.Y.Z` tag
dereferences to; for a CI-only change that cuts no release, pin the merged `main` tip.

## Verifying a release is real

A green workflow is not a shipped artifact. Check the artifact:

```bash
gh release view vX.Y.Z --repo DIG-Network/dig-chat
```

and confirm a per-platform binary is attached. A release with no assets is a tag, not a release.
