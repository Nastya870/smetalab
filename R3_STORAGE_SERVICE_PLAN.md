# R3: Storage Service - Implementation Plan

**Project**: Smeta Pro - Multi-tenant Construction Estimation SaaS  
**Phase**: Phase 1 - Security & Stability  
**Task**: R3 - Centralized Storage Service  
**Date**: January 2, 2026  
**Branch**: `refactor/r3-storage-service`  
**Parent**: `refactor/phase1-security` (tag: `r2-complete`, commit: `ed61cf2`)

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

#### Phase A: Auth Layer (Critical)
**Files**:
1. `shared/lib/contexts/AuthContext.jsx`
   - `localStorage.getItem('accessToken')` → `storageService.get('accessToken')`
   - `localStorage.setItem('accessToken', token)` → `storageService.set('accessToken', token)`
   - `localStorage.removeItem('accessToken')` → `storageService.remove('accessToken')`
   - Same for `refreshToken`, `user`, `permissions`

2. `shared/lib/axiosInstance.js`
   - Token retrieval logic

**Verification**: `npm run test:unit && npx vitest run tests/integration/api/auth.api.test.js`

#### Phase B: UI Components (Medium Priority)
**Search Patterns**:
```bash
# Find all localStorage/sessionStorage usage
grep -r "localStorage\." app/ shared/
grep -r "sessionStorage\." app/ shared/
```

**Expected Locations**:
- Sidebar state persistence
- Filter/search preferences
- Table column visibility
- Theme preferences (if any)
- Recent items cache

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
