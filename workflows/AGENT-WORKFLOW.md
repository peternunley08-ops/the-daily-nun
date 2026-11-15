# Agent workflow

This is The Daily Nun's repository coordination layer. Peter authorizes the coordinator to choose routine next steps and an efficient division of work within the agreed task. Use of the original Peter Project OS v1.0.0 is recorded in [PR #32](https://github.com/peternunley08-ops/the-daily-nun/pull/32), and Peter has now supplied the original package. The full skill is installed locally at `.claude/skills/peter-project-os/` and ignored by Git because it contains personal project metadata. This document complements the skill; it does not reproduce it. Follow AGENTS.md for editorial, privacy, source, and publishing rules.

## Apply Peter Project OS

Read the local `SKILL.md`, `references/agent-adaptation.md`, and only The Daily Nun entry in `references/peter-project-map.md`. Load other references only for the current task. Other checkouts need their own authorized copy; no global configuration or background service is installed. File placement is verified; host command discovery is not tested. Any agent with filesystem access can read the entrypoint directly.

Preserve the skill's sequence: diagnose, structure, refine selectively, simplify, verify. For small tasks keep the brief inline. For substantial work define acceptance criteria before edits and record inspected, sampled, blocked, and not-applicable coverage in the existing task record. Separate observations, inferences, and unknowns. Run existing builders and verify affected exports only when source changes require them. Do not repeat the completed PR #32 audit without new evidence.

The model routes below remain optional: the skill requires no fixed agent count or multi-model review. It grants no publishing permission. Keep its complete package and personal project map out of public commits and delegated briefs; share only relevant project instructions. Missing capabilities must be reported, not simulated.

## Choose the next task

1. Read AGENTS.md and the relevant DISCOVERIES.md entries. Refresh the remote and inspect working changes, open Issues, branches, and PRs before editing. Recent verified work takes precedence over old handoff notes.
2. Within the authorized scope, prioritize a concrete blocker or correctness fix, then complete its verification and handoff. Do not start another broad audit because an agent is available.
3. Claim an Issue with agent owner, scope, status, and files. Check overlapping claims; assign one writer to each file. The coordinator owns shared instructions and the discoveries log.
4. For a new expensive task, describe roughly two to four steps, expected artifacts, and proposed delegation; wait for Peter's confirmation. Broad research, a redesign, bulk media regeneration, or multiple substantial agent assignments are examples. Do not ask again for routine work covered by that confirmation.
5. If a necessary instruction, source, or tool is unavailable, record the exact blocker. Continue independent authorized work; do not invent a replacement or claim verification.

## Route work economically

Use a single agent for small edits, deterministic checks, and integration. Shell scripts and existing builders should handle mechanical work. Check that the agreed scope authorizes delegation; existing authorization does not need to be requested again. Delegate only when an independent task or focused review justifies the extra context and coordination.

- Implementation and asset verification: a capable coding model through Codex; increase reasoning only for unresolved complexity.
- Editorial review: a bounded Claude Sonnet review of changed copy or instructions. Request findings and proposed corrections, not a competing rewrite.
- Inventory and consistency checks: a smaller model such as Gemini Flash, given explicit files and checks. A cheap model's judgment is not source verification.
- Difficult synthesis or unresolved contradictions: escalate the specific problem to a stronger available model after the initial approach exposes a reason to do so.

These are routing suggestions, not measured cost or quality rankings. Discover available providers, models, and options at execution time; do not silently substitute an unavailable requested model. Follow the host's delegation tools and lifecycle rules. This file itself cannot launch agents or enforce budgets.

Default to at most two delegated tasks at once, with separate scopes. Do not send full conversation history or large research folders when a short brief and precise paths suffice. Request concise evidence and a stopping condition. Cancel redundant work. Do not ask several agents the same question unless the approved task specifically needs independent assessments.

## Task brief

Always include the objective, allowed files, read/write mode, and privacy/publishing constraints. Include other fields when relevant:

```text
Issue / owner / role:
Objective and acceptance criteria:
Read first: AGENTS.md; relevant discoveries; exact input files
Allowed files and mode (read-only or write):
Known findings and work not to repeat:
Constraints: scope and source limits; no private application material; no posting or merging
Effort boundary: one focused pass; stop and report if scope expands
Return: findings with file references, changes, checks, blockers
```

Keep child work within the parent's claim or create a separate claim when scope requires it. Reviewers remain read-only. Parallel writers use disjoint files or isolated checkouts, with integration owned by the coordinator. Children must not recursively delegate unless explicitly authorized.

## Verify and hand off

- Review the diff and run checks appropriate to the changed behavior. Documentation-only changes need link and consistency checks, not media regeneration. Use existing content checks for relevant content or builder changes.
- Resolve small review findings directly. Repeat a review only if a substantive change or unresolved concern warrants it.
- Append a concise dated DISCOVERIES.md entry with the Issue, decisions, actual checks, remaining blockers, and next action. Distinguish proposed, running, completed, and verified work.
- Report actual model/provider use when known. Report token use only when measured by the tooling; otherwise say it was not measured. Never promise percentage savings without evidence.
- Prepare a focused branch and PR. Refresh the remote before pushing, preserve concurrent work, and follow the host's PR linking requirements. Publishing and merging remain subject to the user's authorized scope.

## Next-task rule

After completing the approved scope, propose one useful next step from current Issues. Start it only when it is routine and already authorized; a next-task suggestion does not expand the scope. Recheck live task state before acting. New substantial research requires a short plan and confirmation.
