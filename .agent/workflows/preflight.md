---
description: Mandatory preflight checklist to run before every git commit/push: cleanup+inventory, filemap update, OpenAPI sync, migrations baseline/archive, README update, and final ALLOW decision.
---

# Workflow: preflight

Purpose:
Run a mandatory repository preflight checklist to keep the repo clean and consistent after refactors. Produce a structured report and a final ALLOW decision for commit/push.

Run this workflow before every git commit/push.

## 0) Context
- Read current changes: `git status`, `git diff --stat` (or equivalent).
- Identify impacted areas (folders/modules).

## 1) Cleanup / inventory (repo hygiene)
Goal: avoid committing junk and detect leftovers after refactor.

Check:
- temporary files, logs, cache, build artifacts, editor files
- duplicates or obsolete files
- `.gitignore` coverage for non-source artifacts

Actions:
- Remove obvious junk or add it to `.gitignore`.
- Build an inventory list:
  - NEW: new files added
  - ORPHAN: likely unused/unreferenced leftovers
  - GENERATED: files that should be ignored or regenerated deterministically
  - DELETE/ARCHIVE: candidates to remove or move to archive
- If uncertain: mark as “Needs human decision” (do not guess).


## 2) Swagger / OpenAPI consistency
- Locate OpenAPI/Swagger spec files (json/yaml).
- Compare code routes/controllers vs spec `paths` and schemas.

Produce:
- Missing in spec (exists in code)
- Dead in code (exists in spec only)
- Changed (params/schemas/status codes/security/tags mismatch)

Actions:
- Update the spec to match the codebase (or follow the repo’s chosen direction if spec drives code).
- Validate that security/auth sections match current behavior.

## 3) Migrations (post-refactor + baseline)
- Locate migrations directory and the baseline migration file.
- Check ordering/naming and detect obsolete migrations after refactor/baseline changes.
- Update baseline to represent the current target schema.
- Move obsolete migrations into `migrations/archive/...` (do not delete silently).
- Add a short note in the archive explaining what moved and why.

## 4) README update
Ensure README matches current reality:
- how to run the project
- where/how to view or generate OpenAPI/Swagger
- migrations workflow (baseline, apply/rollback if applicable, archive)
- new env vars/config changes
- structure section (align with filemap)

## 5) Final report (mandatory)
Output the following report format exactly:

1) Inventory
- removed/ignored:
- archive/delete candidates:
- needs decision:

2) OpenAPI
- missing / dead / changed:
- spec updates applied:

3) Migrations
- baseline updates:
- moved to archive:
- risks/questions:

4) README
- updates applied:

5) ALLOW decision
- ALLOW commit/push: YES/NO
- If NO: blocking reasons + exact remediation steps.