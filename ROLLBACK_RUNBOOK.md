# Phase 1 Rollback Runbook

**Version**: 1.0  
**Date**: December 26, 2025  
**Phase**: Phase 1 - Security Foundation (R2 → R3 → R5)

---

## Purpose

This document provides step-by-step rollback procedures for Phase 1 refactoring tasks:
- **R2**: Unified Error Handling System
- **R3**: Storage Service Layer
- **R5**: Error Boundaries Implementation

---

## Pre-Rollback Checklist

Before initiating rollback:

1. ✅ **Identify failure point**: Document which refactoring task (R2/R3/R5) failed
2. ✅ **Assess impact**: Determine if production is affected
3. ✅ **Notify team**: Alert stakeholders about rollback initiation
4. ✅ **Capture evidence**: Save error logs, screenshots, test results
5. ✅ **Review baseline**: Confirm `phase1-start` tag exists

---

## Emergency Rollback (Production Down)

**Time Target**: < 5 minutes

```bash
# 1. Identify last working deployment
# Check Vercel/Render deployment history for previous successful build

# 2. Rollback via deployment platform (PREFERRED)
# Vercel: Deployments → Select previous working deployment → "Promote to Production"
# Render: Deploys → Select previous working build → "Redeploy"

# 3. OR use git revert (safe for shared branches)
git checkout master
git log --oneline -10  # Find commit to revert to
git revert <bad-commit-hash>  # Create revert commit
git push origin master

# 4. Verify services
curl https://api.yourdomain.com/health
# Expected: 200 OK

# 5. Monitor logs for 10 minutes
# Check: Error rates, response times, user complaints
```

**Post-Emergency Actions**:
- Document root cause in incident report
- Schedule post-mortem within 24 hours
- Pause Phase 1 until analysis complete

---

## Controlled Rollback by Task

### R2: Unified Error Handling System

**Symptoms of Failure**:
- Errors not appearing in UI
- Inconsistent error messages
- Backend errors not reaching frontend
- `ApiError` class throwing exceptions

**Rollback Steps**:

```bash
# 1. Identify changed files
git diff phase1-start HEAD --name-only | grep -E '(error|Error)'

# Expected files:
# - server/utils/errors.js (new)
# - server/middleware/errorHandler.js (modified)
# - server/controllers/*.js (multiple)
# - shared/lib/utils/errorMessages.js (new)

# 2. Revert error handling files
git checkout phase1-start -- server/utils/errors.js
git checkout phase1-start -- server/middleware/errorHandler.js
git checkout phase1-start -- shared/lib/utils/errorMessages.js

# 3. Revert controller changes (if needed)
git checkout phase1-start -- server/controllers/

# 4. Test locally
npm run test:unit
npm run test:integration

# 5. Commit rollback
git add .
git commit -m "Rollback R2: Unified Error Handling System"
git push origin refactor/phase1-security
```

**Validation**:
- ✅ Unit tests pass (84/84)
- ✅ Integration tests pass (≥130/140)
- ✅ Error messages display correctly in UI
- ✅ API returns proper error codes (400/401/403/404/500)

---

### R3: Storage Service Layer

**Symptoms of Failure**:
- `localStorage` operations failing
- `Token not found` errors
- Session data not persisting
- Logout not clearing data

**Rollback Steps**:

```bash
# 1. Identify changed files
git diff phase1-start HEAD --name-only | grep -E '(storage|Storage|token)'

# Expected files:
# - shared/lib/services/storageService.js (new)
# - shared/lib/contexts/AuthContext.jsx (modified)
# - app/pages/authentication/* (multiple)

# 2. Revert storage service
git checkout phase1-start -- shared/lib/services/storageService.js

# 3. Revert AuthContext
git checkout phase1-start -- shared/lib/contexts/AuthContext.jsx

# 4. Revert authentication pages (if needed)
git checkout phase1-start -- app/pages/authentication/

# 5. Test locally
npm run dev
# Manual test:
# - Login → Check localStorage for tokens
# - Refresh page → Verify session persists
# - Logout → Verify localStorage cleared

# 6. Commit rollback
git add .
git commit -m "Rollback R3: Storage Service Layer"
git push origin refactor/phase1-security
```

**Validation**:
- ✅ Login flow works end-to-end
- ✅ Tokens stored in `localStorage`
- ✅ Refresh preserves session
- ✅ Logout clears all data
- ✅ No console errors related to storage

---

### R5: Error Boundaries Implementation

**Symptoms of Failure**:
- White screen of death (WSOD)
- Uncaught exceptions crashing app
- Error boundary not catching errors
- Infinite error loops

**Rollback Steps**:

```bash
# 1. Identify changed files
git diff phase1-start HEAD --name-only | grep -E '(ErrorBoundary|error-boundary)'

# Expected files:
# - app/components/ErrorBoundary.jsx (new)
# - app/App.jsx (modified)
# - app/pages/* (potentially wrapped)

# 2. Revert ErrorBoundary component
git checkout phase1-start -- app/components/ErrorBoundary.jsx

# 3. Revert App.jsx
git checkout phase1-start -- app/App.jsx

# 4. Remove ErrorBoundary imports from pages
# (Manual step if wrapped individual routes)

# 5. Test locally
npm run dev
# Manual test:
# - Navigate all main routes
# - Trigger intentional error (e.g., undefined variable)
# - Verify app doesn't crash completely

# 6. Commit rollback
git add .
git commit -m "Rollback R5: Error Boundaries Implementation"
git push origin refactor/phase1-security
```

**Validation**:
- ✅ App loads without errors
- ✅ All routes navigable
- ✅ No infinite loops
- ✅ Console errors don't crash UI

---

## Full Phase 1 Rollback

**Use Case**: Multiple tasks failed or cascading failures

```bash
# 1. Reset branch to phase1-start tag
git checkout refactor/phase1-security
git reset --hard phase1-start

# 2. Verify clean state
git status
# Expected: "nothing to commit, working tree clean"

# 3. Compare with master
git diff master

# 4. Create clean branch (safe alternative to force push)
git checkout -b refactor/phase1-security-restart
git push origin refactor/phase1-security-restart

# 5. Update PR to point to new branch
# OR use git revert if changes already merged:
# git checkout refactor/phase1-security
# git revert <bad-commit-range>
# git push origin refactor/phase1-security

# 6. Delete tag (optional, if restarting)
git tag -d phase1-start
git push origin :refs/tags/phase1-start
```

**Post-Rollback Analysis**:
- Review all test failures
- Document blockers in `PHASE1_POSTMORTEM.md`
- Update `REFACTORING_PHASE1_READINESS.md` with lessons learned
- Schedule team review before retry

---

## Database Rollback (If Schema Changed)

**⚠️ Critical**: Phase 1 should NOT modify database schema. If migrations were run:

```bash
# 1. List recent migrations
node scripts/listMigrations.js

# 2. Rollback last N migrations
node scripts/runMigrations.js --rollback --count=N

# 3. Verify schema
psql $DATABASE_URL -c "\dt"
# Compare with backup schema

# 4. Restore from backup (if needed)
pg_restore -d $DATABASE_URL backup.dump
```

---

## Metrics Comparison

After rollback, re-run baseline metrics:

```bash
# 1. Unit tests
npm run test:unit > metrics/rollback-unit.txt

# 2. Integration tests
npm run test:integration > metrics/rollback-integration.txt

# 3. Build size
npm run build
# Compare with metrics/phase1-baseline-bundle.txt

# 4. Diff comparison
diff metrics/phase1-baseline-unit.txt metrics/rollback-unit.txt
diff metrics/phase1-baseline-integration.txt metrics/rollback-integration.txt
```

**Expected Results**:
- Unit tests: 84/84 (same as baseline)
- Integration tests: ≥130/140 (same or better)
- Build time: ~47s
- EstimateView bundle: 1469kB (unchanged)

---

## Communication Template

**Slack/Email Announcement**:

```
🔄 ROLLBACK INITIATED - Phase 1 Refactoring

Task: [R2/R3/R5 or Full Phase 1]
Reason: [Brief description]
Impact: [Production/Staging/Development]
ETA: [5 min / 30 min / 1 hour]
Status: [In Progress / Completed]

Next Steps:
1. [Action item 1]
2. [Action item 2]

Post-mortem scheduled: [Date/Time]
```

---

## Prevention Strategies

**Before Next Phase 1 Attempt**:

1. **Increase test coverage**:
   - Add tests for error handling edge cases
   - Add integration tests for storage service
   - Add E2E tests for error boundaries

2. **Implement feature flags**:
   - Wrap R2/R3/R5 in toggles
   - Enable incremental rollout

3. **Staging deployment**:
   - Deploy to staging first
   - Soak test for 24 hours
   - Get QA sign-off

4. **Rollback rehearsal**:
   - Practice rollback steps in development
   - Time each rollback scenario
   - Document any surprises

---

## Appendix: Critical File List

**R2 Files**:
- `server/utils/errors.js`
- `server/middleware/errorHandler.js`
- `shared/lib/utils/errorMessages.js`
- `server/controllers/*.js` (15+ files)

**R3 Files**:
- `shared/lib/services/storageService.js`
- `shared/lib/contexts/AuthContext.jsx`
- `app/pages/authentication/*.jsx` (5 files)

**R5 Files**:
- `app/components/ErrorBoundary.jsx`
- `app/App.jsx`

**Baseline Metrics**:
- `metrics/phase1-baseline-unit.txt` (84 tests)
- `metrics/phase1-baseline-integration.txt` (130+ tests)
- `metrics/phase1-baseline-bundle.txt` (EstimateView 1469kB)
- `metrics/phase1-baseline-versions.txt` (Node v22.19.0, npm 10.9.3)

---

## Contact Information

**On-Call Engineer**: [TBD]  
**Deployment Access**: Vercel (frontend), Render (backend)  
**Database Admin**: [TBD]  
**Incident Channel**: #smeta-pro-incidents

---

**Last Updated**: December 26, 2025  
**Next Review**: Before Phase 1 execution
