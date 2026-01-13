# R5: Error Boundaries (Phase A + B)

## Summary

Implement React Error Boundaries for graceful error handling in production. Prevents component errors from crashing the entire application.

**Scope**: Phase A (Infrastructure) + Phase B (Integration)  
**Phase C**: Intentionally BLOCKED - requires R3 merge (see below)

---

## Changes

### ✅ Phase A: Infrastructure (commit `dba74fa`)

**New Files**:
- `shared/ui/components/ErrorBoundary.jsx` - Error boundary component
  - Catches React component errors
  - Displays fallback UI
  - Provides retry/reset functionality
  - Logs errors to console
  
- `shared/ui/components/ErrorFallback.jsx` - Fallback UI component
  - User-friendly error message
  - "Try Again" button (resets error state)
  - "Go to Home" button (navigate away)
  - Dev mode: displays error stack
  
- `tests/unit/components/ErrorBoundary.test.jsx` - 8 unit tests
  - Render children when no error
  - Display fallback UI on error
  - Call onError callback
  - Custom fallback support
  - Reset error state
  - Error logging
  - Dev mode error details

### ✅ Phase B: Integration (commit `6660341`)

**Modified Files**:
- `app/App.jsx` - Global error boundary
  - Wraps entire app
  - Full-page fallback UI
  - Prevents app-wide crashes
  
- `app/estimates/EstimateView.jsx` - Route-level boundary
  - Isolates estimate editor errors
  - Preserves navigation on error
  
- `app/projects/ProjectsPage.jsx` - Route-level boundary
  - Isolates projects page errors
  - Preserves navigation on error

### ⏸️ Phase C: Storage Persistence (BLOCKED)

**Status**: NOT included in this PR  
**Blocker**: Requires `storageService` from R3 PR #2  
**Reason**: Phase C adds error loop protection (track error count/timestamps via storage)  
**Action**: Will be implemented as follow-up PR after R3 merges to `refactor/phase1-security`

**Planned Features** (Phase C - future):
- Track error count in localStorage
- Detect error loops (3+ errors in 60 seconds)
- Critical error mode (force page reload, disable retry)
- Automatic error state cleanup

---

## Testing

### Unit Tests
```bash
npm run test:unit
# ✅ 92/92 tests PASSED
```

**ErrorBoundary Tests** (8):
1. ✅ Render children when no error
2. ✅ Display fallback UI when error is thrown
3. ✅ Call onError callback when error occurs
4. ✅ Render custom fallback when provided
5. ✅ Render custom fallback function with error and reset
6. ✅ Reset error state when resetError is called
7. ✅ Log error to console
8. ✅ Display error details in development mode

### Manual Testing Checklist
- [ ] Trigger error in estimate editor → see fallback UI
- [ ] Click "Try Again" → component recovers
- [ ] Click "Go to Home" → navigate to home page
- [ ] Trigger error in App.jsx → see full-page fallback
- [ ] Verify error logging in console (dev mode)

---

## Architecture

### Error Boundary Hierarchy

```
<App>                          ← Global Boundary (full-page fallback)
  <Router>
    <Routes>
      <ErrorBoundary>          ← Route-level boundaries
        <EstimateView />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <ProjectsPage />
      </ErrorBoundary>
    </Routes>
  </Router>
</App>
```

### Error Handling Flow

1. **Component Error** → `ErrorBoundary.componentDidCatch()`
2. **Set Error State** → `setState({ hasError: true, error })`
3. **Render Fallback** → `<ErrorFallback error={error} resetError={this.resetError} />`
4. **User Action**:
   - Click "Try Again" → `resetError()` → clear state, re-render children
   - Click "Go to Home" → `navigate('/')` → leave error page

### Key Design Decisions

1. **No storage dependency (Phase A+B)**:
   - ErrorBoundary works standalone
   - Phase C adds storage as enhancement, not requirement
   
2. **Route-level boundaries**:
   - Isolate errors to specific features
   - Preserve navigation (sidebar, header remain functional)
   
3. **Global boundary**:
   - Last resort for critical errors
   - Full-page fallback (app-wide crash protection)

4. **Simple retry mechanism**:
   - Reset component state on retry
   - No automatic retry (user-triggered only)

---

## Dependencies

### Required (for Phase A+B)
- None ✅

### Optional (for Phase C - future)
- **R3 Storage Service**: `storageService.js` from `refactor/r3-storage-service`
- **Blocker**: R3 PR #2 must merge to `refactor/phase1-security` first

---

## Migration Notes

### For Developers

**No breaking changes**. ErrorBoundary is opt-in via wrapping components.

**To add error boundary to new routes**:
```jsx
import ErrorBoundary from 'shared/ui/components/ErrorBoundary';

function MyRoute() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

**Custom fallback UI** (optional):
```jsx
<ErrorBoundary
  fallback={(error, resetError) => (
    <CustomFallback error={error} onReset={resetError} />
  )}
>
  <MyComponent />
</ErrorBoundary>
```

---

## Review Checklist

### Code Quality
- [ ] All tests passing (92/92 unit tests)
- [ ] No console errors in dev mode
- [ ] ErrorBoundary component follows React best practices
- [ ] Fallback UI is user-friendly (non-technical language)

### Architecture
- [ ] Global boundary wraps entire app (App.jsx)
- [ ] Route-level boundaries on critical pages (EstimateView, ProjectsPage)
- [ ] Error state resets on navigation (resetKeys prop)
- [ ] No storage dependency in Phase A+B code

### Documentation
- [ ] R5_ERROR_BOUNDARIES_PLAN.md updated with Phase C blocked status
- [ ] Commit messages clear (Phase A, Phase B, docs)
- [ ] PR description explains Phase C blocker

### Phase C Blocker
- [ ] Phase C intentionally NOT included
- [ ] Blocker documented: requires R3 merge
- [ ] Follow-up plan clear: Phase C after R3 lands

---

## Post-Merge Actions

1. **Monitor Sentry/Logs**: Watch for error boundary triggers in production
2. **Wait for R3 Merge**: Once R3 PR #2 merges to `refactor/phase1-security`
3. **Implement Phase C**: 
   - Pull latest `refactor/phase1-security` (now includes storageService)
   - Add storage persistence to ErrorBoundary
   - Add error loop protection
   - Add critical error UI mode
   - Create follow-up PR

---

## Related

- **R2**: Backend unified error handling (provides logging infrastructure)
- **R3**: Storage service (required for Phase C)
- **Phase 1 Goal**: Stability and error resilience

---

## References

- [React Error Boundaries Docs](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Handling Best Practices](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react)

---

**Base Branch**: `refactor/phase1-security` (commit `ed61cf2` - R2 complete)  
**Head Branch**: `refactor/r5-error-boundaries`  
**Commits**: 3 (Phase A + Phase B + docs)  
**Tests**: ✅ 92/92 PASSED  
**Status**: Ready to merge (Phase C blocked, intentional)
