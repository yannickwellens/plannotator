---
name: downstream-fork-sync
description: Keep this Plannotator fork synced with origin/upstream while preserving the fork-only pi-mode-selector Plannotator patch stack. Use when the user asks to update, pull, sync, rebase, refresh, or recover the fork while keeping local Pi/Plannotator custom changes.
---

# Downstream Fork Sync

Use this skill to update this Plannotator fork without losing the fork-only Pi integration patch used by `~/repo/pi-extensions/pi-mode-selector/`.

## Core rule

Custom changes are a downstream Git patch stack, not ad-hoc edits. Preserve these commits on top of the synced base:

- `fix(pi): scope plannotator event requests to sessions`
- `docs: document downstream fork sync workflow`

Primary downstream branch:

```bash
fork/pi-mode-selector-patches
```

Never push unless user explicitly asks. Default: leave branch ready and print push commands.

## Before you start

1. Read the repo workflow doc:

```bash
git rev-parse --show-toplevel
```

Then read `docs/downstream-sync.md` from that repo root.

2. Check current state:

```bash
git status --short --branch
git remote -v
git branch -vv
git log --oneline --decorate --max-count=8 --all
```

3. If working tree is dirty, protect it before sync:

```bash
stamp=$(date +%Y%m%d-%H%M%S)
git switch -c "safety/pi-mode-selector-wip-$stamp"
git add <files that belong to the downstream patch>
git commit -m "wip: preserve pi-mode-selector plannotator patch"
```

Do not include unrelated scratch files or generated junk. If unsure, inspect the diff first.

## Normal update flow

Use this when repo is clean and branch exists.

```bash
# Fetch latest fork/upstream refs.
git fetch --all --prune

# Confirm origin/main and upstream/main relationship.
git rev-list --left-right --count origin/main...upstream/main

# Update local main to the synced fork base.
git switch main
git pull --ff-only origin main

# Rebase downstream patch branch onto new base.
git switch fork/pi-mode-selector-patches
git rebase origin/main
```

If `origin/main` and `upstream/main` differ, prefer `origin/main` unless user explicitly wants to base directly on upstream. Report the difference before continuing.

## Conflict rules

Most conflicts should be in:

- `apps/pi-extension/plannotator-events.ts`
- `bun.lock`

For `bun.lock`, prefer the synced base unless the downstream patch intentionally added dependencies:

```bash
git checkout origin/main -- bun.lock
git add bun.lock
```

For `apps/pi-extension/plannotator-events.ts`, preserve both upstream behavior and downstream session behavior.

Must preserve upstream behavior:

- `clearContextNudge?: boolean` on plan review results.
- `clearContextNudge: result.clearContextNudge` in emitted review result.
- `annotate-last` awaits `getLastAssistantMessageText(ctx)`.
- Existing exported browser session helpers from `plannotator-browser.js`.

Must preserve downstream behavior:

- `PlannotatorRequestSessionRef` with `sessionFile`, `leafId`, `cwd`.
- Optional `session` on `PlannotatorRequestBase`.
- Optional `session` on `PlannotatorReviewResultEvent`.
- `getSessionRef(ctx)`.
- `matchesRequestSession(request.session, activeSession)`.
- Duplicate request guard via `claimPlannotatorRequest(request.requestId)`.
- `releasePlannotatorRequestClaim(request.requestId)` on validation/startup errors.
- `Symbol.for("plannotator.pi.event-listener-state")` global claim map.
- `activePlanReviewSessions` tracking.
- `session_shutdown` cleanup that unsubscribes request listener, stops active sessions, and clears active context.
- Emitted review result includes `session: capturedSession`.

After resolving each conflict:

```bash
git add <resolved-files>
git rebase --continue
```

## If rebase gets messy

Abort and replay patch commits from the previous downstream branch/safety branch:

```bash
git rebase --abort
git switch fork/pi-mode-selector-patches
git reset --hard origin/main
git cherry-pick <downstream-commit-1> <downstream-commit-2>
```

If only exported patch files are available:

```bash
git switch -c fork/pi-mode-selector-patches origin/main
git am /tmp/plannotator-downstream-patches/*.patch
```

## Export recovery patches

After downstream branch is clean and verified, optional export:

```bash
mkdir -p /tmp/plannotator-downstream-patches
git format-patch origin/main..HEAD -o /tmp/plannotator-downstream-patches
```

Do not track `/tmp` patches in the repo unless user asks for repo-stored patch artifacts.

## Verification

Run focused test first:

```bash
bun test apps/pi-extension/plannotator-events.test.ts
```

Run broader checks when available:

```bash
bun run typecheck
bun test
```

Important: `bun run typecheck` runs `apps/pi-extension/vendor.sh`, which can regenerate Pi vendor files. If `bun test` fails with stale generated Pi files, run `bun run typecheck`, then rerun `bun test`.

Also check final branch shape:

```bash
git status --short --branch
git rev-list --left-right --count origin/main...HEAD
git log --oneline --decorate origin/main..HEAD
git diff --stat origin/main..HEAD
git diff --name-status origin/main..HEAD
```

Expected: downstream branch is ahead of `origin/main` by only the fork patch commits and docs/skill commits.

## Manual sanity checklist

- `plan_finalize` in `pi-mode-selector` opens one Plannotator browser review.
- Approval result returns only to the originating Pi session.
- Denial feedback returns only to the originating Pi session.
- Duplicate request IDs do not open duplicate browser sessions.
- Upstream `clearContextNudge` still reaches review results.
- `annotate-last` still works.

## Final report format

Report:

- Current branch.
- Base commit from `origin/main` / `upstream/main`.
- Downstream commits ahead of base.
- Files changed.
- Verification commands and results.
- Whether push was performed. Default should be no.
- Manual push commands:

```bash
git push -u origin fork/pi-mode-selector-patches
```

If user wants fork `main` to include the patch stack:

```bash
git switch main
git pull --ff-only origin main
git merge --ff-only fork/pi-mode-selector-patches
git push origin main
```
