# AI Agent Instructions - Smeta Pro

## Project Overview
**Smeta Pro** - Multi-tenant construction estimation SaaS application built with React + Material-UI frontend, Express backend, and PostgreSQL database (Neon). The system manages construction estimates, purchases, projects, and implements role-based access control (RBAC) with tenant isolation.

## Architecture

### Stack
- **Frontend**: React 19, Material-UI 7, Vite 6, React Router 7
- **Backend**: Express 5, PostgreSQL (Neon), JWT authentication
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Key Libraries**: ApexCharts, ExcelJS, jsPDF, Formik, Yup

### Directory Structure
```
app/              # React frontend (pages, components, hooks)
server/           # Express backend
  ├── controllers/  # Request handlers
  ├── repositories/ # Data access layer (NO classes, named exports)
  ├── services/     # Business logic
  ├── middleware/   # Auth, permissions, rate limiting
  └── routes/       # API endpoints
shared/lib/       # Shared code (contexts, utils, formatters)
database/         # Migrations, seeds, schema docs
tests/            # Unit (67), Integration (26), E2E (Playwright)
scripts/          # DB management (users, roles, migrations)
```

## Multi-Tenancy & Authorization

### Core Concept
Every user belongs to a **tenant** (company). Data isolation enforced via `tenant_id` in all domain tables. JWT tokens carry `userId`, `tenantId`, and `permissions[]`.

### Authentication Flow
1. Login → Backend validates credentials → Returns JWT with embedded permissions
2. Frontend stores token → Axios interceptor adds `Authorization: Bearer <token>`
3. Backend middleware (`server/middleware/auth.js`) extracts `req.user = { userId, tenantId, permissions, isSuperAdmin }`

### Permission System
- **Roles**: `super_admin`, `admin`, `project_manager`, `estimator`, `supplier`, `viewer`
- **Super Admin**: Bypasses all checks, can operate without `tenantId`
- **Permissions**: Format `resource.action` (e.g., `estimates.create`, `users.manage`)
- **Frontend**: `PermissionsContext` provides `checkPermission(resource, action)` and `checkVisibility(resource, action)` hooks
- **Backend**: Middleware checks `req.user.permissions` or queries `user_role_assignments` table

### Key Files
- `server/middleware/auth.js` - JWT validation, adds `req.user`
- `server/middleware/adminAuth.js` - Super admin & admin role checks
- `shared/lib/contexts/PermissionsContext.jsx` - Frontend permission checking
- `database/README.md` - Complete schema documentation

## Development Workflows

### Setup & Running
```bash
npm install
cp .env.example .env  # Configure DATABASE_URL, JWT secrets
npm run db:migrate    # Run migrations
npm run dev           # Starts Vite (port 3000) + Express (port 3001)
npm run dev:server    # Backend only (nodemon)
```

### Testing
```bash
npm test              # All tests (vitest)
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e      # Playwright E2E tests
npm run test:coverage # Coverage report
```
**Important**: Integration tests run sequentially (`singleThread: true` in `vitest.config.mjs`)

### Database Management
```bash
npm run db:users           # List all users with roles
npm run db:set-admin <email>  # Grant super_admin role
node scripts/runMigrations.js  # Manual migration run
```
**Critical**: Users must re-login after role changes (JWT refresh needed).

## Code Patterns

### Repository Pattern (NO Classes)
Repositories use **named exports**, NOT classes:
```javascript
// ✅ Correct
export async function findById(id, tenantId) { ... }
export async function create(data, tenantId, userId) { ... }
export default { findById, create };

// ❌ Avoid
export class EstimatesRepository { ... }
```

### Tenant Isolation
Every query MUST filter by `tenant_id`:
```javascript
// Controllers
const { tenantId, userId } = req.user;
const data = await repository.findAll(tenantId);

// Repositories
SELECT * FROM estimates WHERE tenant_id = $1;
```

### Error Handling
Use `sanitizeErrorMessage()` from `server/utils/sanitize.js` to prevent SQL/sensitive data leaks:
```javascript
catch (error) {
  return res.status(500).json({
    success: false,
    message: sanitizeErrorMessage(error.message)
  });
}
```

### Frontend Data Fetching
- Use `axiosInstance` from `shared/lib/axiosInstance.js` (auto-adds JWT token)
- SWR for caching: `import useSWR from 'swr'`
- Context APIs: `AuthContext`, `PermissionsContext`

## Common Tasks

### Adding New API Endpoint
1. Create route in `server/routes/<resource>.js`
2. Implement controller in `server/controllers/<resource>Controller.js`
3. Add repository functions in `server/repositories/<resource>Repository.js`
4. Protect with `authenticateToken` middleware
5. Document with JSDoc Swagger comments (Swagger UI at `/api-docs`)

### Adding New Permission
1. Insert into `permissions` table (via migration or script)
2. Assign to role in `role_permissions` table
3. Update frontend checks: `checkPermission('resource', 'action')`
4. Update backend: Check `req.user.permissions` or add middleware

### Debugging Auth Issues
- Check JWT payload: Token decoded in `server/middleware/auth.js`
- Verify permissions: `GET /api/permissions/users/:userId` endpoint
- Console logs: Backend logs all auth attempts with `✅`/`❌` prefixes
- Frontend: Use React DevTools → Context → PermissionsContext

## Deployment

### Environments
- **Development**: Vite dev server proxies `/api` to Express (port 3001)
- **Production**: Build with `npm run build`, serve `dist/` + Express server
- **Platforms**: Vercel (frontend), Render.com (backend), Neon (database)

### Config Files
- `vite.config.mjs` - Vite setup, API proxy, path aliases
- `render.yaml` - Render.com deployment config
- `vercel.json` - Vercel SPA routing
- `.env.production` - Production environment variables

## Testing Notes

### E2E Tests (Playwright)
- **Status**: 6/7 login tests passing (86%)
- **Blocker**: Email verification required after registration (blocks test flow)
- **Routes**: Use `/auth/login`, not `/login`; redirects to `/app`, not `/dashboard`
- **API Data**: Backend expects `fullName`, not `firstName`/`lastName`
- **Token**: Extract from `data.tokens.accessToken`

### Test Structure
- `tests/unit/` - Component & utility tests (67 tests)
- `tests/integration/` - API endpoint tests (26 tests)
- `tests/e2e/` - Playwright browser tests
- `tests/setup.js` - Vitest jsdom config

## Anti-Patterns to Avoid

1. **Never bypass tenant isolation** - Always pass `tenantId` to queries
2. **Don't hardcode permissions** - Use permission system, not role name checks
3. **Avoid direct localStorage in components** - Use AuthContext/PermissionsContext
4. **No SQL in controllers** - Keep data access in repositories
5. **Don't modify migrations** - Create new migration files for schema changes

## Quick Reference

### Key API Endpoints
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/refresh` - Refresh token
- `GET /api/permissions/users/:userId` - User permissions
- `GET /api/users/me` - Current user info
- Swagger docs: `http://localhost:3001/api-docs`

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` - Token signing keys
- `VITE_APP_BASE_NAME` - Frontend base path

### Migration Pattern
```javascript
export async function up(db) {
  await db.query(`CREATE TABLE ...`);
}
export async function down(db) {
  await db.query(`DROP TABLE ...`);
}
```

---
**Last Updated**: December 18, 2025  
**Version**: 1.28
