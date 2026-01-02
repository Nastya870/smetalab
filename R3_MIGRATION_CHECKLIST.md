# R3 Storage Service Migration Checklist

## ✅ Completed (3/10)

### 1. Infrastructure (DONE)
- ✅ `shared/lib/services/storageService.js` (217 lines)
  - Class-based design, dependency injection
  - Error handling: QuotaExceededError, JSON parse, storage unavailable
  - Memory cache fallback
  - 27/27 unit tests passing
  - Commit: `0b67dfe` (feat(R3): add storageService with safe error handling)

### 2. AuthContext (DONE)
- ✅ `shared/lib/contexts/AuthContext.jsx`
  - 8 localStorage calls → storageService
  - Keys: user, tenant, accessToken, refreshToken
  - Removed manual JSON.parse/stringify
  - Gate: 18/18 auth integration tests ✅
  - Commit: `407f753` (refactor(R3): migrate AuthContext to storageService)

### 3. authService (DONE)
- ✅ `shared/lib/services/authService.js`
  - 21 localStorage calls → storageService
  - Functions: register, login, logout, refreshAccessToken, getMe, isAuthenticated, getAccessToken, getCurrentUser, getCurrentTenant, getUserRoles, getRedirectPath
  - Keys: accessToken, refreshToken, user, tenant, tenants, roles, redirectAfterLogin
  - Gate: 18/18 auth integration tests ✅
  - Commit: `ed9252c` (refactor(R3): migrate authService to storageService)

---

## ⏳ Remaining (7/10)

### 4. ProtectedRoute (HIGH PRIORITY)
**File**: `app/routes/ProtectedRoute.jsx`  
**Calls**: 4 localStorage  
**Keys**: `accessToken`, `user`, `redirectAfterLogin`  
**Lines**: 12, 13, 18, 25  
**Actions**:
- Line 12: `localStorage.getItem('accessToken')` → `storageService.get('accessToken')`
- Line 13: `localStorage.getItem('user')` → `storageService.get('user')` (remove JSON.parse)
- Line 18: `localStorage.setItem('redirectAfterLogin', currentPath)` → `storageService.set('redirectAfterLogin', currentPath)`
- Line 25: `localStorage.clear()` → `storageService.clear()`

**Import**: Add `import storageService from '@/shared/lib/services/storageService';`

---

### 5. AuthLogin (HIGH PRIORITY)
**File**: `app/pages/auth-forms/AuthLogin.jsx`  
**Calls**: 12 localStorage  
**Keys**: `accessToken`, `refreshToken`, `user`, `tenant`, `tenants`, `roles`, `redirectAfterLogin`  
**Lines**: 72-77 (removeItem), 86 (setItem), 90-91 (getItem), 101 (getItem)  
**Actions**:
- Lines 72-77: `localStorage.removeItem(...)` → `storageService.remove(...)`
- Line 86: `localStorage.setItem('roles', JSON.stringify(...))` → `storageService.set('roles', ...)`
- Lines 90-91: `localStorage.getItem(...)` → `storageService.get(...)`
- Line 101: `localStorage.getItem('redirectAfterLogin')` → `storageService.get('redirectAfterLogin')`

**Import**: Add `import storageService from '@/shared/lib/services/storageService';`

---

### 6. VerifyEmail (MEDIUM PRIORITY)
**File**: `app/pages/VerifyEmail.jsx`  
**Calls**: 3 localStorage  
**Keys**: `user`, `accessToken`  
**Lines**: 53 (getItem), 57 (setItem), 64 (getItem)  
**Actions**:
- Line 53: `localStorage.getItem('user')` → `storageService.get('user')` (remove JSON.parse)
- Line 57: `localStorage.setItem('user', JSON.stringify(...))` → `storageService.set('user', ...)`
- Line 64: `localStorage.getItem('accessToken')` → `storageService.get('accessToken')`

**Import**: Add `import storageService from '@/shared/lib/services/storageService';`

---

### 7. EmailVerificationBanner (LOW PRIORITY)
**File**: `shared/ui/components/EmailVerificationBanner.jsx`  
**Calls**: 4 localStorage  
**Keys**: `email_banner_dismissed`, `email_verification_last_sent`  
**Lines**: 30 (getItem), 43 (getItem), 64 (setItem), 81 (setItem)  
**Actions**:
- Line 30: `localStorage.getItem('email_banner_dismissed')` → `storageService.get('email_banner_dismissed')`
- Line 43: `localStorage.getItem('email_verification_last_sent')` → `storageService.get('email_verification_last_sent')`
- Line 64: `localStorage.setItem('email_banner_dismissed', Date.now().toString())` → `storageService.set('email_banner_dismissed', Date.now().toString())`
- Line 81: `localStorage.setItem('email_verification_last_sent', Date.now().toString())` → `storageService.set('email_verification_last_sent', Date.now().toString())`

**Import**: Add `import storageService from '@/shared/lib/services/storageService';`

---

### 8. Materials Index (LOW PRIORITY - UI State)
**File**: `app/references/materials/index.jsx`  
**Calls**: 2 localStorage  
**Keys**: `materialsGlobalFilter`  
**Lines**: 187 (getItem), 236 (setItem)  
**Actions**:
- Line 187: `return localStorage.getItem('materialsGlobalFilter') || 'global';` → `return storageService.get('materialsGlobalFilter', 'global');`
- Line 236: `localStorage.setItem('materialsGlobalFilter', globalFilter);` → `storageService.set('materialsGlobalFilter', globalFilter);`

**Import**: Add `import storageService from '@/shared/lib/services/storageService';`

---

### 9. Works Index (LOW PRIORITY - UI State)
**File**: `app/references/works/index.jsx`  
**Calls**: 2 localStorage  
**Keys**: `worksGlobalFilter`  
**Lines**: 143 (getItem), 189 (setItem)  
**Actions**:
- Line 143: `return localStorage.getItem('worksGlobalFilter') || 'global';` → `return storageService.get('worksGlobalFilter', 'global');`
- Line 189: `localStorage.setItem('worksGlobalFilter', globalFilter);` → `storageService.set('worksGlobalFilter', globalFilter);`

**Import**: Add `import storageService from '@/shared/lib/services/storageService';`

---

### 10. axiosInstance (Verify Only)
**File**: `shared/lib/axiosInstance.js`  
**Action**: Check if uses localStorage directly (should use authService.getAccessToken() already)  
**Priority**: VERIFY (may be already using authService)

---

## Migration Strategy

### Batch 1: Critical Auth Flow (Items 4-6)
**Priority**: HIGH  
**Files**: ProtectedRoute, AuthLogin, VerifyEmail  
**Reason**: Core authentication flow, must work flawlessly  
**Gate**: Run `npx vitest run tests/integration/api/auth.api.test.js` after each file

### Batch 2: UI State (Items 7-9)
**Priority**: LOW-MEDIUM  
**Files**: EmailVerificationBanner, materials/index, works/index  
**Reason**: Non-critical UX preferences  
**Gate**: Manual smoke test (login, navigate, check filters persist)

### Batch 3: Verification (Item 10)
**Priority**: VERIFY  
**File**: axiosInstance  
**Action**: Grep search, confirm uses authService

---

## Testing Gates

### After Each File Migration
```bash
# Quick check - no localStorage references remain
grep -n "localStorage\." <file_path>

# Full unit tests
npm run test:unit

# Auth integration tests
npx vitest run tests/integration/api/auth.api.test.js
```

### Before PR Creation
```bash
# Full test suite
npm run test:unit
npx vitest run tests/integration/api/auth.api.test.js

# No localStorage references in migrated files
grep -rn "localStorage\." app/routes/ProtectedRoute.jsx
grep -rn "localStorage\." app/pages/auth-forms/AuthLogin.jsx
grep -rn "localStorage\." app/pages/VerifyEmail.jsx
grep -rn "localStorage\." shared/ui/components/EmailVerificationBanner.jsx
grep -rn "localStorage\." app/references/materials/index.jsx
grep -rn "localStorage\." app/references/works/index.jsx

# Smoke test checklist:
# - [ ] Login works
# - [ ] Logout works
# - [ ] Refresh token works
# - [ ] ProtectedRoute redirects correctly
# - [ ] Materials filter persists
# - [ ] Works filter persists
# - [ ] Email banner dismiss persists
```

---

## Success Criteria

1. ✅ storageService unit tests: 27/27 passing
2. ✅ Auth integration tests: 18/18 passing
3. ⏳ Full unit test suite: 111/111 passing
4. ⏳ No direct localStorage/sessionStorage usage in `app/` and `shared/` (except storageService.js)
5. ⏳ All storage keys preserved (no renames)
6. ⏳ Smoke tests pass (login, logout, filter persistence)

---

## Storage Keys Inventory (DO NOT MODIFY)

### Auth Keys (Critical)
- `accessToken` - JWT access token
- `refreshToken` - JWT refresh token
- `user` - Current user object
- `tenant` - Current tenant object
- `tenants` - Array of all user tenants
- `roles` - User roles array
- `redirectAfterLogin` - Post-login redirect path

### UI State Keys (Non-Critical)
- `materialsGlobalFilter` - Materials global filter state ('global' | 'tenant')
- `worksGlobalFilter` - Works global filter state ('global' | 'tenant')
- `email_banner_dismissed` - Email verification banner dismissed timestamp
- `email_verification_last_sent` - Last email verification sent timestamp

**TOTAL**: 11 unique keys (7 auth, 4 UI state)

---

## Rollback Plan

If auth tests fail after migration:
```bash
git revert <commit_hash>
npm run test:unit
npx vitest run tests/integration/api/auth.api.test.js
```

If smoke tests fail:
1. Check browser DevTools → Application → Local Storage
2. Verify keys match expected format (not double-stringified JSON)
3. Clear storage manually, re-login
4. If issue persists, rollback commit

---

## Completion ETA
- **Current**: 3/10 files (30%)
- **Remaining**: 7 files (~2-3 hours)
- **Target**: Complete before next PR

---

Last Updated: 2026-01-02 17:20 UTC  
Branch: `refactor/r3-storage-service`  
Parent: `refactor/phase1-security @ ed61cf2 (r2-complete)`
