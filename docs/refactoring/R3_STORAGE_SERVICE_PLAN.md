# R3: Storage Service - Implementation Plan

**Project**: Smeta Pro - Multi-tenant Construction Estimation SaaS  
**Phase**: Phase 1 - Security & Stability  
**Task**: R3 - Centralized Storage Service  
**Date**: January 2, 2026  
**Branch**: `refactor/r3-storage-service`  
**Parent**: `refactor/phase1-security` (tag: `r2-complete`, commit: `ed61cf2`)  
**Status**: ✅ COMPLETE (100%)

---

## Progress Summary

### ✅ COMPLETE (10/10 files - 100%)

#### Infrastructure (100%)
- ✅ `shared/lib/services/storageService.js` (217 lines)
- ✅ `tests/unit/services/storageService.test.js` (27/27 tests PASSED)
- ✅ Commit: `0b67dfe` - feat(R3): add storageService with safe error handling

#### Auth Layer Migration (100%)
- ✅ `shared/lib/contexts/AuthContext.jsx` (8 calls → storageService)
- ✅ `shared/lib/services/authService.js` (21 calls → storageService)
- ✅ Commits:
  - `407f753` - refactor(R3): migrate AuthContext to storageService
  - `ed9252c` - refactor(R3): migrate authService to storageService

#### Batch 1: Critical Auth Flow (100%)
- ✅ `app/routes/ProtectedRoute.jsx` (4 calls → storageService)
- ✅ `app/pages/auth-forms/AuthLogin.jsx` (12 calls → storageService)
- ✅ `app/pages/VerifyEmail.jsx` (3 calls → storageService)
- ✅ Commits:
  - `3dff5d1` - refactor(R3): migrate ProtectedRoute to storageService (Batch 1)
  - `a5c8dba` - refactor(R3): migrate AuthLogin to storageService (Batch 1)
  - `506c31d` - refactor(R3): migrate VerifyEmail to storageService (Batch 1)

#### Batch 2: UI State (100%)
- ✅ `shared/ui/components/EmailVerificationBanner.jsx` (4 calls → storageService)
- ✅ `app/references/materials/index.jsx` (2 calls → storageService)
- ✅ `app/references/works/index.jsx` (2 calls → storageService)
- ✅ `shared/lib/axiosInstance.js` (1 call → authService.getAccessToken())
- ✅ Commit:
  - `468c11f` - refactor(R3): migrate UI state storage to storageService (Batch 2)

**Test Results**:
- Unit: 111/111 PASSED ✅
- Auth Integration: 18/18 PASSED ✅

---

## Context

### R2 Status: ✅ COMPLETE
- **Merge**: PR #1 (`ed61cf2`) → `refactor/phase1-security`
- **Tag**: `r2-complete`
- **Stats**: 27 controllers, 167 functions, -2380 lines boilerplate
- **Tests**: Unit 84/84 ✅, Auth 18/18 ✅
- **API Compatibility**: 100% preserved

### R3 Objective
Eliminate direct usage of `localStorage`/`sessionStorage` across the frontend. Create centralized storage service with error handling, type safety, and safe guards for quota/parsing errors.

**NO UX/logic changes** - mechanical migration only (like R2).

---

## Scope

### 1. Create Storage Service Infrastructure

**File**: `shared/lib/services/storageService.js`

```javascript
/**
 * Centralized storage service with error handling
 * Wraps localStorage/sessionStorage with:
 * - QuotaExceededError handling
 * - JSON parse error handling
 * - Type safety
 * - Feature flag support
 */

const storageService = {
  // Core operations
  get(key, defaultValue = null, storage = localStorage)
  set(key, value, storage = localStorage)
  remove(key, storage = localStorage)
  clear(storage = localStorage)
  
  // Helpers
  hasKey(key, storage = localStorage)
  getAll(storage = localStorage)
  
  // Error handling (internal)
  _safeGet(key, defaultValue, storage)
  _safeSet(key, value, storage)
};
```

**Error Classes to Handle**:
- `QuotaExceededError` - Storage quota exceeded (fallback to memory cache)
- `SyntaxError` - JSON.parse() failures (return defaultValue)
- `SecurityError` - Storage access blocked (fallback gracefully)

**Feature Flag** (optional):
- `USE_STORAGE_SERVICE` - Enable/disable new service (default: `true`)
- Allows A/B testing and easy rollback

---

### 2. Migration Targets (Priority Order)

#### ✅ Phase A: Auth Layer (Critical) - COMPLETE
**Files**:
1. ✅ `shared/lib/contexts/AuthContext.jsx`
   - Replaced: `localStorage.getItem/setItem/removeItem` → `storageService.get/set/remove`
   - Keys: `accessToken`, `refreshToken`, `user`, `tenant`
   - Commit: `407f753`

2. ✅ `shared/lib/services/authService.js`
   - Replaced: 21 localStorage calls → storageService
   - Keys: `accessToken`, `refreshToken`, `user`, `tenant`, `tenants`, `roles`, `redirectAfterLogin`
   - Commit: `ed9252c`

3. ✅ `app/routes/ProtectedRoute.jsx`
   - Replaced: 4 localStorage calls → storageService
   - Keys: `accessToken`, `user`, `redirectAfterLogin`
   - Commit: `e4befb0`

4. ✅ `app/pages/auth-forms/AuthLogin.jsx`
   - Replaced: 12 localStorage calls → storageService
   - Keys: `accessToken`, `refreshToken`, `user`, `tenant`, `tenants`, `roles`, `redirectAfterLogin`
   - Commit: `8ff5038`

5. ✅ `app/pages/VerifyEmail.jsx`
   - Replaced: 3 localStorage calls → storageService
   - Keys: `user`, `accessToken`
   - Commit: `506c31d`

**Verification**: ✅ `npm run test:unit` (111/111) && `npx vitest run tests/integration/api/auth.api.test.js` (18/18)

#### ✅ Phase B: UI Components (Medium Priority) - COMPLETE
**Files**:
1. ✅ `shared/ui/components/EmailVerificationBanner.jsx` (4 calls)
   - Keys: `email_banner_dismissed`, `email_verification_last_sent`

2. ✅ `app/references/materials/index.jsx` (2 calls)
   - Keys: `materialsGlobalFilter`

3. ✅ `app/references/works/index.jsx` (2 calls)
   - Keys: `worksGlobalFilter`

4. ✅ `shared/lib/axiosInstance.js` (1 call)
   - Migrated to: `authService.getAccessToken()` (which uses storageService internally)

**Commit**: `468c11f` - refactor(R3): migrate UI state storage to storageService (Batch 2)

**Search Results**:
```bash
# All in-scope localStorage/sessionStorage usage migrated
# Total migrated: 49 calls across 10 files ✅
# Out of scope: 19 calls (SocialProfile, EstimateWithSidebar, hooks, NotificationsContext)
```

#### Phase C: Utility Hooks (Deferred to R4/R5)
Custom hooks using storage:
- `useLocalStorage` (if exists) → migrate to `useStorageService`
- `usePersistentState` (if exists)

---

### 3. Error Handling Strategy

**Pattern**:
```javascript
// BEFORE (direct localStorage)
try {
  const value = JSON.parse(localStorage.getItem('key'));
} catch (error) {
  console.error('Parse error:', error);
}

// AFTER (storageService)
const value = storageService.get('key', defaultValue);
// Error handling internal - no try/catch needed
```

**Quota Exceeded Fallback**:
```javascript
// Internal to storageService
if (error.name === 'QuotaExceededError') {
  console.warn('Storage quota exceeded, using memory cache');
  // Fallback to in-memory cache (Map/WeakMap)
  memoryCache.set(key, value);
}
```

---

### 4. Testing Requirements

**Unit Tests** (new file):
- `tests/unit/services/storageService.test.js`
  - ✅ get/set/remove operations
  - ✅ JSON serialization/deserialization
  - ✅ QuotaExceededError handling (mock)
  - ✅ Invalid JSON handling
  - ✅ Default value returns
  - ✅ Storage type switching (localStorage/sessionStorage)

**Integration Tests** (existing):
- `tests/integration/api/auth.api.test.js` - must remain 18/18 PASSED
- No new integration tests required (behavior unchanged)

**Gating Criteria**:
- Unit tests: current + new storageService tests pass
- Auth integration: 18/18 PASSED
- Feature flag tested: service can be disabled without breaking app

---

### 5. Implementation Steps

#### Step 1: Infrastructure (30 min)
```bash
# Create service file
touch shared/lib/services/storageService.js

# Create tests
touch tests/unit/services/storageService.test.js

# Create progress log
touch R3_PROGRESS_LOG.md
```

**Deliverables**:
- `storageService.js` with full API
- `storageService.test.js` with 100% coverage
- Feature flag support

**Commit**: `feat(R3): add centralized storage service infrastructure`

#### Step 2: AuthContext Migration (45 min)
- Replace all `localStorage` calls in `AuthContext.jsx`
- Update `axiosInstance.js` token logic
- Run tests: `npx vitest run tests/integration/api/auth.api.test.js`

**Commit**: `feat(R3): migrate AuthContext to storageService`

#### Step 3: Component Migration (batch) (60 min)
- Search for all `localStorage`/`sessionStorage` usage
- Replace with `storageService` calls
- Group by feature area (sidebar, filters, tables, etc.)

**Commits**:
- `feat(R3): migrate UI components to storageService (batch 1)`
- `feat(R3): migrate UI components to storageService (batch 2)`
- ...

#### Step 4: Documentation & Verification (15 min)
- Update `R3_PROGRESS_LOG.md` with final stats
- Run full test suite
- Create PR to `refactor/phase1-security`

**Commit**: `docs(R3): update progress log - R3 complete`

---

## Rollback Plan

**If issues found**:
1. Set feature flag: `USE_STORAGE_SERVICE = false`
2. App reverts to direct localStorage usage
3. Fix storageService in isolation
4. Re-enable flag when fixed

**Safe rollback**: No breaking changes - feature flag ensures compatibility.

---

## Success Criteria

- ✅ Zero direct `localStorage`/`sessionStorage` calls in target files (auth + UI state)
- ✅ All tests pass (unit 111/111 + auth integration 18/18)
- ✅ Error handling tested (quota, parsing, security)
- ✅ No UX changes (behavior identical to before)
- ✅ Keys preserved 1:1 (all 11 storage keys migrated)

**Out of scope** (intentional):
- Utility hooks (useLocalStorage, useReferenceCache) → R4/R5
- Complex state components (SocialProfile, EstimateWithSidebar, NotificationsContext) → R4/R5
- Debug/test files (localStorageMonitor, E2E fixtures) → excluded

---

## File Structure (After R3)

```
shared/lib/services/
  ├── storageService.js ✅ (new - 217 lines)
  ├── authService.js ✅ (migrated)
  └── emailService.js (existing)

tests/unit/services/
  └── storageService.test.js ✅ (new - 27 tests)

shared/lib/contexts/
  └── AuthContext.jsx ✅ (migrated)

shared/lib/
  └── axiosInstance.js ✅ (migrated to authService.getAccessToken)

app/routes/
  └── ProtectedRoute.jsx ✅ (migrated)

app/pages/auth-forms/
  └── AuthLogin.jsx ✅ (migrated)

app/pages/
  └── VerifyEmail.jsx ✅ (migrated)

shared/ui/components/
  └── EmailVerificationBanner.jsx ✅ (migrated)

app/references/
  ├── materials/index.jsx ✅ (migrated)
  └── works/index.jsx ✅ (migrated)
```

---

## Final Statistics

**Commits**: 14 total
- Infrastructure: 1 (storageService + tests)
- Auth layer: 3 (AuthContext, authService, docs)
- Batch 1: 4 (ProtectedRoute, AuthLogin, VerifyEmail, docs)
- Batch 2: 2 (UI state, docs)
- Git history: 1 (cleanup duplicate commit)
- Documentation: 3 (progress logs, plan updates)

**Lines Changed**:
- Added: ~350 lines (storageService + tests)
- Modified: ~120 lines (10 files migrated)
- Removed: ~60 lines (direct localStorage calls)

**Test Coverage**:
- storageService: 27/27 unit tests ✅
- Integration: 18/18 auth tests ✅
- Total: 111/111 unit tests passing ✅

---

## Next Steps After R3

**R4**: Component Decomposition & State Management  
**R5**: Performance Optimization (includes Error Boundary, Suspense)

**Order**: R3 ✅ → R4 → R5 → Phase 1 PR to `master`

---

## Notes

- **Mechanical migration**: Like R2, this is search-replace with type safety
- **No business logic changes**: Only error handling improvements
- **Gating policy**: Same as R2 (unit + auth integration)
- **Git history**: Cleaned duplicate commits (830220a removed, consolidated to 506c31d)
- **Documentation**: `R3_BATCH1_SESSION_LOG.md` tracks Batch 1, this file tracks overall plan

---

**Last Updated**: January 2, 2026  
**Final Status**: ✅ COMPLETE (100%)
