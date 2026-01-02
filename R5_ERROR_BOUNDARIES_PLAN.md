# R5: Error Boundaries - Implementation Plan

**Project**: Smeta Pro - Multi-tenant Construction Estimation SaaS  
**Phase**: Phase 1 - Security & Stability  
**Task**: R5 - React Error Boundaries  
**Date**: January 2, 2026  
**Branch**: `refactor/r5-error-boundaries`  
**Parent**: `refactor/phase1-security` (tag: `r2-complete`, commit: `ed61cf2`)  
**Status**: 🔄 IN PROGRESS - Phase A+B Complete, Phase C BLOCKED

---

## 🚦 Implementation Status

### ✅ Phase A: Infrastructure (Complete)
- **Commit**: `dba74fa` - "feat(R5): add ErrorBoundary infrastructure (Phase A)"
- **Files Created**: ErrorBoundary.jsx, ErrorFallback.jsx, ErrorBoundary.test.jsx
- **Tests**: 8/8 passing

### ✅ Phase B: Integration (Complete)
- **Commit**: `6660341` - "feat(R5): integrate ErrorBoundary into app and critical routes (Phase B)"
- **Modified**: App.jsx, EstimateView.jsx, ProjectsPage.jsx
- **Tests**: 92/92 passing (unit gate GREEN)

### ⏸️ Phase C: Storage Persistence (BLOCKED)
- **Status**: BLOCKED pending R3 merge into `refactor/phase1-security`
- **Blocker**: Requires `storageService` from R3 PR #2
- **Reason**: Phase C adds error loop protection (tracking error count/timestamps via storage)
- **Action**: Will implement AFTER R3 merge to parent branch
- **ETA**: Follow-up PR after R3 lands

**Current Gate**: ✅ 92/92 unit tests passing (Phase A+B only)

---

## 📋 Overview

Implement React Error Boundaries to gracefully handle component errors in production without crashing the entire application. This complements R2 (backend error handling) and R3 (storage service) by adding frontend resilience.

### Dependencies
- ✅ **R2 Complete**: Backend unified error handling ready
- ⏸️ **R3 Complete**: Storage service ready on `refactor/r3-storage-service` branch (NOT merged to parent)
- 🔄 **R5**: Add React Error Boundaries (Phase A+B done, Phase C blocked)

### Objectives
1. Prevent component errors from crashing entire app
2. Display user-friendly fallback UI
3. Log errors to backend (using R2 infrastructure)
4. Persist error state (using R3 storage service)
5. Provide recovery mechanisms (reload, reset state)

---

## 🎯 Scope

### Core Components (3)

#### 1. ErrorBoundary Component
**File**: `shared/ui/components/ErrorBoundary.jsx`

**Features**:
- Catch React component errors
- Display fallback UI with error details (dev mode only)
- Log errors to console + backend
- Provide "Retry" and "Go Home" actions
- Reset error state on navigation

**API**:
```jsx
<ErrorBoundary
  fallback={(error, resetError) => <CustomFallback />}
  onError={(error, errorInfo) => logErrorToBackend(error, errorInfo)}
  resetKeys={[location.pathname]} // Auto-reset on navigation
>
  <YourComponent />
</ErrorBoundary>
```

#### 2. Global Error Boundary
**File**: `app/App.jsx` (modification)

**Placement**:
- Wrap entire app (outside Router)
- Catch critical errors that break navigation
- Full-page fallback UI

**Fallback UI**:
- App logo + error message
- "Reload Page" button
- "Report Issue" link (optional)
- Error details in dev mode

#### 3. Route-Level Error Boundaries
**Files**: Key route files (estimate editor, references, dashboard)

**Placement**:
- Wrap individual routes/pages
- Isolate errors to specific features
- Preserve navigation while showing error for failed component

**Example Routes**:
- `/app/estimates/*` - Estimate editor boundary
- `/app/references/*` - References boundary
- `/app/dashboard` - Dashboard boundary

---

## 🏗️ Implementation Strategy

### Phase A: Infrastructure (30 min)
1. Create `ErrorBoundary.jsx` component
2. Add error logging service (integrates with R2 backend)
3. Create fallback UI components
4. Write unit tests for ErrorBoundary

### Phase B: Integration (20 min)
1. Wrap `App.jsx` with global boundary
2. Add route-level boundaries to critical pages
3. Test error scenarios (throw errors in components)
4. Verify error logging to backend

### Phase C: Storage Integration (15 min)
1. Use storageService (R3) to persist error count
2. Implement "too many errors" detection
3. Add error recovery hints based on error type
4. Clear error state on successful render

---

## 📐 Error Boundary Hierarchy

```
App (Global Boundary)
├── Router
    ├── Dashboard (Page Boundary)
    ├── Estimates (Page Boundary)
    │   ├── EstimateEditor (Component Boundary - optional)
    │   └── EstimateList
    ├── References (Page Boundary)
    │   ├── Materials
    │   └── Works
    └── Settings (Page Boundary)
```

**Strategy**:
- **Global**: Catch catastrophic errors (routing, context failures)
- **Page**: Isolate errors to specific features
- **Component** (optional): Protect critical expensive components

---

## 🔧 Error Logging Integration

### Backend Endpoint (R2)
Use existing error handling from R2:
- `POST /api/errors/log` (if exists)
- OR extend existing error endpoints

### Log Format
```javascript
{
  type: 'REACT_ERROR_BOUNDARY',
  message: error.message,
  stack: error.stack,
  componentStack: errorInfo.componentStack,
  userAgent: navigator.userAgent,
  url: window.location.href,
  timestamp: Date.now(),
  userId: user?.id,
  tenantId: tenant?.id
}
```

### Storage (R3)
```javascript
// Track error frequency
storageService.set('errorBoundary_lastError', {
  message: error.message,
  timestamp: Date.now(),
  count: errorCount
});

// Clear on successful recovery
storageService.remove('errorBoundary_lastError');
```

---

## 🎨 Fallback UI Design

### Global Fallback (Full Page)
```
┌─────────────────────────────────────┐
│          [Smeta Pro Logo]           │
│                                     │
│   😔 Что-то пошло не так           │
│                                     │
│   Произошла непредвиденная ошибка. │
│   Мы уже работаем над решением.    │
│                                     │
│   [Перезагрузить страницу]         │
│   [Вернуться на главную]           │
│                                     │
│   (Error details - dev mode only)  │
└─────────────────────────────────────┘
```

### Page/Component Fallback (Inline)
```
┌─────────────────────────────────────┐
│  ⚠️ Не удалось загрузить компонент │
│                                     │
│  [Попробовать снова]               │
│  [Вернуться назад]                 │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)
**File**: `tests/unit/components/ErrorBoundary.test.jsx`

**Scenarios**:
- Catches errors thrown in child components
- Displays fallback UI
- Calls onError callback
- Resets on resetKeys change
- Recovers after retry

### Integration Tests
**File**: `tests/integration/error-boundaries.test.jsx`

**Scenarios**:
- Error in one route doesn't affect others
- Navigation resets error state
- Global boundary catches uncaught errors
- Error logging to backend works

### Manual Testing
- Throw error in component: `throw new Error('Test error')`
- Verify fallback UI appears
- Check error logged to backend
- Test recovery actions
- Verify navigation resets state

---

## 📊 Success Criteria

- [ ] ErrorBoundary component implemented with tests
- [ ] Global boundary wraps App.jsx
- [ ] Route-level boundaries on 3+ critical pages
- [ ] Error logging to backend works
- [ ] Storage integration for error persistence
- [ ] Fallback UI designed and tested
- [ ] Unit tests: 100% coverage for ErrorBoundary
- [ ] Integration tests pass
- [ ] No UX regression (errors handled gracefully)

---

## 🚫 Out of Scope

**Not in R5**:
- Custom error pages for 404/403/500 (separate task)
- Network error handling (already in R2 via axios)
- Form validation errors (not component crashes)
- Backend error responses (already handled in R2)

**Deferred to later**:
- Sentry/error tracking service integration
- Advanced error analytics
- A/B testing error messages
- Error recovery strategies beyond basic retry

---

## 📝 Files to Create/Modify

### New Files (3)
1. `shared/ui/components/ErrorBoundary.jsx` (component)
2. `shared/ui/components/ErrorFallback.jsx` (fallback UI)
3. `tests/unit/components/ErrorBoundary.test.jsx` (tests)

### Modified Files (4-6)
1. `app/App.jsx` (wrap with global boundary)
2. `app/estimates/EstimateWithSidebar.jsx` (page boundary)
3. `app/references/materials/index.jsx` (page boundary)
4. `app/references/works/index.jsx` (page boundary)
5. `app/dashboard/index.jsx` (page boundary - if exists)

---

## ⏱️ Estimated Effort

- **Infrastructure**: 30 min (ErrorBoundary + tests)
- **Integration**: 20 min (wrap App + routes)
- **Testing**: 15 min (manual + verify logging)
- **Documentation**: 10 min (update plan, session log)

**Total**: ~1.5 hours

---

## 🔗 Related

- **R2**: Backend error handling (provides logging endpoint)
- **R3**: Storage service (persists error state)
- **Phase 1 Goal**: Stability and error resilience

---

## 📚 References

- [React Error Boundaries Docs](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [react-error-boundary library](https://github.com/bvaughn/react-error-boundary) (optional, can build from scratch)

---

**Completed Steps**:
1. ✅ Implement ErrorBoundary component (Phase A)
2. ✅ Add unit tests (8 tests passing)
3. ✅ Integrate into App.jsx (Phase B)
4. ✅ Add route-level boundaries (EstimateView, ProjectsPage)
5. ✅ Test and verify (92/92 unit tests GREEN)

**Pending Steps** (Phase C - BLOCKED):
1. ⏸️ Add storage persistence (requires R3 merge)
2. ⏸️ Implement error loop protection (3 errors in 60s)
3. ⏸️ Add critical error UI mode
4. ⏸️ Add persistence tests

---

**Status**: ✅ Phase A+B Complete | ⏸️ Phase C BLOCKED  
**PR Ready**: Yes (Phase A+B can be merged independently)  
**Blocker**: R3 PR #2 must merge to `refactor/phase1-security` before Phase C

