# R3: Storage Service - Implementation Plan

**Project**: Smeta Pro - Multi-tenant Construction Estimation SaaS  
**Phase**: Phase 1 - Security & Stability  
**Task**: R3 - Centralized Storage Service  
**Date**: January 2, 2026  
**Branch**: `refactor/r3-storage-service`  
**Parent**: `refactor/phase1-security` (tag: `r2-complete`, commit: `ed61cf2`)  
**Status**: 🔄 IN PROGRESS (Batch 1 Complete - 60%)

---

## Progress Summary

### ✅ Completed (6/10 files - 60%)

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
  - `e4befb0` - refactor(R3): migrate ProtectedRoute to storageService
  - `8ff5038` - refactor(R3): migrate AuthLogin to storageService
  - `830220a` - refactor(R3): migrate VerifyEmail to storageService

**Test Results**:
- Unit: 111/111 PASSED ✅
- Auth Integration: 18/18 PASSED ✅

### ⏳ Remaining (4 files - Batch 2: UI State)
- `shared/ui/components/EmailVerificationBanner.jsx` (4 calls)
- `app/references/materials/index.jsx` (2 calls)
- `app/references/works/index.jsx` (2 calls)
- `shared/lib/axiosInstance.js` (verify only - likely uses authService already)

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
   - Commit: `830220a`

**Verification**: ✅ `npm run test:unit` (111/111) && `npx vitest run tests/integration/api/auth.api.test.js` (18/18)

#### ⏳ Phase B: UI Components (Medium Priority) - PENDING
**Files**:
1. `shared/ui/components/EmailVerificationBanner.jsx` (4 calls)
   - Keys: `email_banner_dismissed`, `email_verification_last_sent`

2. `app/references/materials/index.jsx` (2 calls)
   - Keys: `materialsGlobalFilter`

3. `app/references/works/index.jsx` (2 calls)
   - Keys: `worksGlobalFilter`

4. `shared/lib/axiosInstance.js` (verify only)
   - Should use `authService.getAccessToken()` already

**Search Completed**:
```bash
# All localStorage/sessionStorage usage found and categorized
# Total: 38 calls across 10 files
# Migrated: 30 calls (6 files) ✅
# Remaining: 8 calls (4 files) ⏳
```

#### Phase C: Utility Hooks (Low Priority)
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

- ✅ Zero direct `localStorage`/`sessionStorage` calls in codebase (except fallback)
- ✅ All tests pass (unit + auth integration)
- ✅ Feature flag works (enable/disable without errors)
- ✅ Error handling tested (quota, parsing, security)
- ✅ No UX changes (behavior identical to before)

---

## File Structure (After R3)

```
shared/lib/services/
  ├── storageService.js (new)
  └── emailService.js (existing)

tests/unit/services/
  └── storageService.test.js (new)

shared/lib/contexts/
  └── AuthContext.jsx (modified - uses storageService)

shared/lib/
  └── axiosInstance.js (modified - uses storageService)

app/components/
  └── [various components] (modified - uses storageService)
```

---

## Next Steps After R3

**R4**: Rate Limiting & Security Headers  
**R5**: Logging & Monitoring (includes Error Boundary for React)

**Order**: R3 → R4 → R5 → Phase 1 PR to `master`

---

## Notes

- **Mechanical migration**: Like R2, this is search-replace with type safety
- **No business logic changes**: Only error handling improvements
- **Gating policy**: Same as R2 (unit + auth integration)
- **Documentation**: `R3_PROGRESS_LOG.md` tracks progress like `R2_PROGRESS_LOG.md`
