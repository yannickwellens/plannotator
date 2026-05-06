# Downstream fork sync

This fork keeps a small fork-only patch stack on top of synced Plannotator upstream/fork history. Do not open upstream PRs for these local Pi workflow changes unless that policy changes.

## Source of truth

- Git commits on the downstream branch are the source of truth.
- Current downstream branch: `fork/pi-mode-selector-patches`.
- Safety branch from the original dirty tree: `safety/pi-mode-selector-wip-20260506-181442`.
- Recovery patch files are optional exports from commits, not the primary source.

## Custom patch scope

The local patch supports `~/repo/pi-extensions/pi-mode-selector/plan-flow.ts`:

- `plan_finalize` emits JSON object requests on `plannotator:request`.
- Requests include `requestId`, `payload`, `session`, and `respond`.
- Results on `plannotator:review-result` include the same Pi session metadata so only the matching session switches to BUILD.
- Duplicate request IDs are claimed once to avoid duplicate browser windows when multiple listeners exist.
- Active browser sessions stop on Pi session shutdown.

Patch files in this repo:

- `apps/pi-extension/plannotator-events.ts`
- `apps/pi-extension/plannotator-events.test.ts`

Keep upstream behavior while rebasing this patch. In particular, preserve `clearContextNudge` on plan review decisions and keep `annotate-last` awaiting `getLastAssistantMessageText(ctx)`.

## Pi skill

Pi can load the project skill at `.agents/skills/downstream-fork-sync/SKILL.md`. Use `/skill:downstream-fork-sync` or ask Pi to sync/update the Plannotator fork while preserving the downstream patch stack.

## Normal sync flow

```bash
# 1. Start clean.
git status --short

# 2. Fetch both remotes.
git fetch --all --prune

# 3. Update local main to the synced fork/upstream base.
git switch main
git pull --ff-only origin main

# 4. Rebase the downstream patch stack.
git switch fork/pi-mode-selector-patches
git rebase origin/main

# 5. Resolve conflicts, usually in apps/pi-extension/plannotator-events.ts.
# Prefer origin/main for unrelated version/lockfile churn.
git checkout origin/main -- bun.lock

# 6. Run focused checks.
bun test apps/pi-extension/plannotator-events.test.ts

# 7. Run broader checks when time/deps allow.
bun test
bun run typecheck
```

If rebase becomes messy, reset the patch branch to the synced base and cherry-pick the downstream commits one by one:

```bash
git switch fork/pi-mode-selector-patches
git reset --hard origin/main
git cherry-pick <downstream-commit-1> <downstream-commit-2>
```

## Export recovery patches

Optional recovery export after downstream commits are clean:

```bash
mkdir -p /tmp/plannotator-downstream-patches
git format-patch origin/main..HEAD -o /tmp/plannotator-downstream-patches
```

Reapply later with:

```bash
git am /tmp/plannotator-downstream-patches/*.patch
```

## Verification checklist

Minimum:

```bash
bun test apps/pi-extension/plannotator-events.test.ts
```

Manual sanity:

- `plan_finalize` in `pi-mode-selector` opens one Plannotator browser review.
- Approval result returns only to the originating Pi session.
- Denial feedback returns only to the originating Pi session.
- Duplicate request IDs do not open duplicate browser sessions.
- Upstream `clearContextNudge` still reaches review results.

## Push policy

Do not push automatically from agent runs. After local verification, user can push manually:

```bash
git push -u origin fork/pi-mode-selector-patches
```

If user later wants fork `main` itself to include the downstream patch stack:

```bash
git switch main
git merge --ff-only fork/pi-mode-selector-patches
git push origin main
```
