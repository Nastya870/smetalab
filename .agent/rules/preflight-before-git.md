---
trigger: always_on
---

---
trigger: always_on
---

# Preflight before git commit/push (Always On)

You must enforce this rule for every interaction in this workspace.

Hard requirement:
- Before executing, suggesting, or approving any action that results in `git commit` or `git push` (including commands, UI actions, or instructions to the user), you MUST run the workspace workflow named `preflight`.
- You MUST NOT allow commit/push to proceed unless the workflow ends with `ALLOW commit/push: YES`.

If the workflow ends with `ALLOW commit/push: NO`:
- Stop. Provide the blocking reasons and the exact remediation steps.
- Do not propose “quick bypasses”. Do not proceed until issues are resolved or explicitly marked as “Needs human decision”.

Additional requirements:
- If anything is ambiguous, label it “Needs human decision” and present options.
- Minimize diffs and preserve project conventions/formatting.
