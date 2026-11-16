# Project OS learning loop

Peter Project OS v1.0.0 infers a brief, audits what applies, changes selectively, and verifies. It does not remember a finished check. This loop is the memory. It stays in the project repository. The private skill package stays in `.claude/skills/peter-project-os/` and out of Git.

Read the private `SKILL.md` and only the references that match the task. Then read the active lessons printed by:

```sh
python3 workflows/project-os/check.py
```

If the command says the package is missing, ask for the authorized archive. Do not rebuild the private project map from memory or from this file.

## When a check is already closed

A dimension is closed when an active lesson, or a dated `DISCOVERIES.md` entry, names the check and the evidence it used. Do not run that check again unless the evidence changed: a source it names was edited, the check was blocked, or the lesson says its `skip_when` no longer holds.

List the dimensions that apply. Mark closed ones as covered. Work on the open failures. Three focused changes is enough for one pass.

## How to learn

After a check is verified, add one lesson to `workflows/project-os/lessons.jsonl`, or retire the lesson it replaces. One verified finding is one lesson.

```json
{"id":"short-slug","date":"YYYY-MM-DD","project":"the-daily-nun","claim":"One sentence.","evidence":"Command, file, or review a later agent can find.","use_when":"When this lesson should change the next pass.","skip_when":"When the evidence is stale.","status":"active"}
```

`status` is `active` or `retired`. Retire a lesson by editing that field when its evidence no longer holds. Do not add a second active lesson with the same claim.

A lesson needs evidence. An impression, a guessed metric, or an unread file is not a lesson. Do not put private project-map text, coursework, application material, or secrets in a lesson.

If the same failure shows up in two active lessons, change the check or the instruction and retire the duplicates. Another copy of the same lesson is not learning.

Run `python3 workflows/project-os/check.py` after editing lessons. Exit 0 means the lessons are valid and, when the private package is present, its packaged files still match v1.0.0. Exit 2 means the package is not in this checkout. The checker does not install, publish, or score the project.

Copy this folder into another project, replace the lessons with that project's verified findings, and keep the same rule: the private package is requested, not reconstructed.
