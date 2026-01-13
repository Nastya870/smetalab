# R4: Component Decomposition Plan

**Target**: `app/estimates/EstimateWithSidebar.jsx`  
**Current Size**: 3457 lines (3626 total with PropTypes)  
**Status**: 🔴 Monolithic, needs refactoring

---

## 📊 Structural Analysis

### Component Metrics

| Metric | Count | Category |
|--------|-------|----------|
| **Lines of Code** | 3457 | 🔴 Critical |
| **React Hooks** | 75 | 🔴 Excessive |
| **Event Handlers** | 27+ | 🔴 Excessive |
| **useState** | ~25 | 🔴 Excessive |
| **useCallback** | ~18 | 🟡 High |
| **useMemo** | ~8 | ✅ Acceptable |
| **useEffect** | ~5 | ✅ Acceptable |
| **useRef** | ~10 | 🟡 High |

### Existing Sub-components (Already Extracted)

✅ **WorkRow** (`app/estimates/components/WorkRow.jsx`, 311 lines)  
✅ **MaterialRow** (`app/estimates/components/MaterialRow.jsx`, 336 lines)

---

## 🎯 Decomposition Strategy

### Phase Approach: INCREMENTAL (Bottom-Up)

**Rationale**: Извлекаем чистые UI компоненты первыми, затем добавляем бизнес-логику.

**Gates**:
- ✅ All unit tests passing (`npm run test:unit`)
- ✅ Smoke test: открыть смету, добавить работу, сохранить
- ✅ No behavior changes (pixel-perfect UI)
- ✅ No localStorage changes (R3 handles this)

---

## 📦 Component Candidates (Priority Order)

### TIER 1: Pure UI Components (No State, Props Only)

#### 1. **EstimateHeader** 🟢 Safe
**Location**: Lines 1767-1945 (Header + Toolbar)  
**Responsibility**: Название, статус, кнопки действий  
**Props**:
```typescript
{
  estimateName: string;
  estimateStatus: string;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onExport: () => void;
  onSaveAsTemplate: () => void;
  onToggleSidebar: () => void;
  onOpenParameters: () => void;
  isSidebarVisible: boolean;
  exportingExcel: boolean;
}
```
**Dependencies**: None (pure UI)  
**Risk**: 🟢 Low (no state, no side effects)

---

#### 2. **EstimateTotals** 🟢 Safe
**Location**: Lines 2497-2564 (Footer Summary)  
**Responsibility**: Сумма работ, материалов, итого  
**Props**:
```typescript
{
  worksTotal: number;
  materialsTotal: number;
  grandTotal: number;
}
```
**Dependencies**: `formatCurrency` utility  
**Risk**: 🟢 Low (pure computed display)

---

#### 3. **WorksListPanel** 🟡 Medium
**Location**: Lines 2137-2245 (Works Sidebar Content)  
**Responsibility**: Список доступных работ (Virtuoso)  
**Props**:
```typescript
{
  filteredWorks: Work[];
  addedWorkIds: Set<string>;
  addingWorkId: string | null;
  loadingWorks: boolean;
  errorWorks: string | null;
  onAddWork: (work: Work) => void;
}
```
**Dependencies**: Virtuoso, formatCurrency  
**Risk**: 🟡 Medium (виртуализация, может быть performance issue)

---

#### 4. **WorksFiltersPanel** 🟢 Safe
**Location**: Lines 3216-3377 (Nested Drawer with Filters)  
**Responsibility**: Фильтры по стадиям (RadioGroup)  
**Props**:
```typescript
{
  open: boolean;
  onClose: () => void;
  selectedSection: string | null;
  availableSections: string[];
  worksAfterSearch: Work[];
  onSectionChange: (section: string | null) => void;
}
```
**Dependencies**: MUI components  
**Risk**: 🟢 Low (controlled component)

---

#### 5. **WorksSearchBar** 🟢 Safe
**Location**: Lines 2005-2027 (Search + Tabs)  
**Responsibility**: Поиск + переключатель global/tenant  
**Props**:
```typescript
{
  searchTerm: string;
  onSearchChange: (term: string) => void;
  workSourceTab: 'global' | 'tenant';
  onTabChange: (tab: string) => void;
}
```
**Dependencies**: None  
**Risk**: 🟢 Low (controlled inputs)

---

### TIER 2: Semi-Stateful UI Components

#### 6. **MaterialsDialog** 🟡 Medium
**Location**: Lines 2569-2790 (Materials Modal)  
**Responsibility**: Выбор материала для работы  
**Props**:
```typescript
{
  open: boolean;
  mode: 'add' | 'replace';
  currentWorkItem: WorkItem | null;
  materialToReplace: Material | null;
  allMaterials: Material[];
  loadingMaterials: boolean;
  materialSearchQuery: string;
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onMaterialSelect: (material: Material) => void;
  onLoadMore: () => void;
  materialsHasMore: boolean;
}
```
**Dependencies**: Virtuoso, Intersection Observer  
**Risk**: 🟡 Medium (infinite scroll logic)

---

#### 7. **SaveTemplateDialog** 🟢 Safe
**Location**: Lines 2812-2978 (Template Save Modal)  
**Responsibility**: Форма сохранения шаблона  
**Props**:
```typescript
{
  open: boolean;
  formData: { name: string; description: string; category: string };
  saving: boolean;
  onClose: () => void;
  onFormChange: (field: string, value: string) => void;
  onSave: () => void;
}
```
**Dependencies**: MUI TextField  
**Risk**: 🟢 Low (simple form)

---

#### 8. **PriceCoefficientModal** 🟢 Safe (Already Extracted)
**Location**: External component (imported)  
**Status**: ✅ Already extracted  
**Props**: See `PriceCoefficientModal.jsx`

---

#### 9. **ObjectParametersSidebar** 🟢 Safe (Already Extracted)
**Location**: External component (imported)  
**Status**: ✅ Already extracted  
**Props**: See `ObjectParametersSidebar.jsx`

---

### TIER 3: Complex Stateful Components (Future)

#### 10. **EstimateTable** 🔴 Complex
**Location**: Lines 2248-2496 (Main Table)  
**Responsibility**: Таблица сметы с секциями, работами, материалами  
**Props**:
```typescript
{
  estimateData: EstimateData;
  deferredEstimateData: EstimateData;
  onWorkQuantityChange: (sectionIdx, itemIdx, qty) => void;
  onWorkPriceChange: (sectionIdx, itemIdx, price) => void;
  onDeleteWork: (sectionIdx, itemIdx) => void;
  onDeleteMaterial: (sectionIdx, itemIdx, matIdx) => void;
  onMaterialConsumptionChange: (sectionIdx, itemIdx, matIdx, consumption) => void;
  onOpenAddMaterial: (sectionIdx, itemIdx) => void;
  onOpenReplaceMaterial: (sectionIdx, itemIdx, matIdx) => void;
  // + другие 10+ handlers
}
```
**Dependencies**: WorkRow, MaterialRow, React.memo  
**Risk**: 🔴 High (много state mutation, performance critical)  
**Note**: Извлекать ПОСЛЕ Tier 1 + Tier 2

---

## 🚦 Extraction Order (Roadmap)

### Sprint 1: Header & Footer (Pure UI)
- [x] **R4.1**: Extract `EstimateHeader` (2 hours)
- [x] **R4.2**: Extract `EstimateTotals` (1 hour)
- [x] **Gate**: Tests + smoke test

### Sprint 2: Sidebar Components
- [ ] **R4.3**: Extract `WorksSearchBar` (1 hour)
- [ ] **R4.4**: Extract `WorksFiltersPanel` (2 hours)
- [ ] **R4.5**: Extract `WorksListPanel` (3 hours)
- [ ] **Gate**: Tests + smoke test

### Sprint 3: Dialogs
- [ ] **R4.6**: Extract `MaterialsDialog` (4 hours)
- [ ] **R4.7**: Extract `SaveTemplateDialog` (1 hour)
- [ ] **Gate**: Tests + smoke test

### Sprint 4: Main Table (Future)
- [ ] **R4.8**: Extract `EstimateTable` (8+ hours)
- [ ] **R4.9**: Extract table sub-components (sections, rows)
- [ ] **Gate**: Performance testing + regression tests

**Total Estimated Time**: ~22 hours (excluding Sprint 4)

---

## 📋 Detailed Specifications

### 1. EstimateHeader

**File**: `app/estimates/components/EstimateHeader.jsx`

**Current Code Location**: Lines 1767-1945

**Key Sections**:
```jsx
// Заголовок (Lines 1767-1789)
<Box sx={{ mb: 3 }}>
  <Typography variant="h2">Конструктор смет</Typography>
  <Typography variant="caption">...</Typography>
</Box>

// Toolbar (Lines 1790-1945)
<Box sx={{ display: 'flex', gap: 1.5, ... }}>
  <Stack>
    {/* Название сметы */}
    <Typography>{estimateName}</Typography>
    {/* Статус */}
    <Box><Chip label={status} /></Box>
  </Stack>
  
  {/* Кнопки действий */}
  <Button onClick={onSave}>Сохранить</Button>
  <Button onClick={onExport}>Экспорт Excel</Button>
  <Button onClick={onSaveAsTemplate}>Сохранить как шаблон</Button>
  <IconButton onClick={onToggleSidebar}>...</IconButton>
  <IconButton onClick={onOpenParameters}>...</IconButton>
</Box>
```

**Props Interface**:
```typescript
interface EstimateHeaderProps {
  // Display
  estimateName: string;
  estimateStatus: 'draft' | 'active' | 'completed';
  estimateDate?: string;
  
  // State indicators
  hasUnsavedChanges: boolean;
  isSidebarVisible: boolean;
  exportingExcel: boolean;
  
  // Actions
  onSave: () => void;
  onExport: () => void;
  onSaveAsTemplate: () => void;
  onToggleSidebar: () => void;
  onOpenParameters: () => void;
}
```

**Dependencies**:
- MUI: Box, Typography, Button, Stack, Chip, IconButton, Tooltip
- Icons: IconFileTypeXls, IconTemplate, IconPackage

**Testing**:
```javascript
describe('EstimateHeader', () => {
  it('should render estimate name', () => { ... });
  it('should show unsaved changes indicator', () => { ... });
  it('should call onSave when save button clicked', () => { ... });
  it('should disable export button while exporting', () => { ... });
  it('should show correct status chip', () => { ... });
});
```

**Migration Steps**:
1. Create `app/estimates/components/EstimateHeader.jsx`
2. Copy JSX (lines 1767-1945)
3. Replace props with destructured props
4. Replace state/handlers with prop callbacks
5. Add PropTypes validation
6. Import in `EstimateWithSidebar.jsx`
7. Replace inline JSX with `<EstimateHeader {...props} />`
8. Run tests

---

### 2. EstimateTotals

**File**: `app/estimates/components/EstimateTotals.jsx`

**Current Code Location**: Lines 2497-2564

**Key Sections**:
```jsx
<Box sx={{ display: 'flex', justifyContent: 'space-between', ... }}>
  {/* Сумма работ */}
  <Box>
    <Typography variant="body2">Работы:</Typography>
    <Typography variant="h6">{formatCurrency(worksTotal)}</Typography>
  </Box>
  
  {/* Сумма материалов */}
  <Box>
    <Typography variant="body2">Материалы:</Typography>
    <Typography variant="h6">{formatCurrency(materialsTotal)}</Typography>
  </Box>
  
  {/* Итого */}
  <Box>
    <Typography variant="body2">Итого:</Typography>
    <Typography variant="h4">{formatCurrency(grandTotal)}</Typography>
  </Box>
</Box>
```

**Props Interface**:
```typescript
interface EstimateTotalsProps {
  worksTotal: number;
  materialsTotal: number;
  grandTotal: number;
  currency?: 'RUB' | 'USD' | 'EUR';
}
```

**Dependencies**:
- `formatCurrency` from `../projects/utils`
- MUI: Box, Typography

**Testing**:
```javascript
describe('EstimateTotals', () => {
  it('should display works total', () => { ... });
  it('should display materials total', () => { ... });
  it('should display grand total', () => { ... });
  it('should format currency correctly', () => { ... });
});
```

---

### 3. WorksSearchBar

**File**: `app/estimates/components/WorksSearchBar.jsx`

**Current Code Location**: Lines 2005-2027

**Props Interface**:
```typescript
interface WorksSearchBarProps {
  searchTerm: string;
  workSourceTab: 'global' | 'tenant';
  onSearchChange: (term: string) => void;
  onTabChange: (tab: 'global' | 'tenant') => void;
}
```

**Dependencies**:
- MUI: Box, TextField, Tabs, Tab, InputAdornment
- Icons: IconSearch

---

### 4. WorksFiltersPanel

**File**: `app/estimates/components/WorksFiltersPanel.jsx`

**Current Code Location**: Lines 3216-3377

**Props Interface**:
```typescript
interface Work {
  id: string;
  section: string;
  // ...
}

interface WorksFiltersPanelProps {
  open: boolean;
  selectedSection: string | null;
  availableSections: string[];
  worksAfterSearch: Work[];
  onClose: () => void;
  onSectionChange: (section: string | null) => void;
  onReset: () => void;
  onApply: () => void;
}
```

**Dependencies**:
- MUI: Drawer, Box, Typography, IconButton, FormControl, RadioGroup, FormControlLabel, Radio, Button
- Icons: IconX

---

### 5. WorksListPanel

**File**: `app/estimates/components/WorksListPanel.jsx`

**Current Code Location**: Lines 2137-2245

**Props Interface**:
```typescript
interface WorksListPanelProps {
  filteredWorks: Work[];
  addedWorkIds: Set<string>;
  addingWorkId: string | null;
  loadingWorks: boolean;
  errorWorks: string | null;
  onAddWork: (work: Work) => void;
}
```

**Dependencies**:
- react-virtuoso (Virtuoso component)
- MUI: Box, Typography, CircularProgress, Alert, Button
- Icons: IconSearch, IconArrowRight
- `formatCurrency` utility

**Notes**:
- Виртуализация требует тестирования производительности
- Проверить memory leaks при частом открытии/закрытии

---

### 6. MaterialsDialog

**File**: `app/estimates/components/MaterialsDialog.jsx`

**Current Code Location**: Lines 2569-2790

**Props Interface**:
```typescript
interface MaterialsDialogProps {
  open: boolean;
  mode: 'add' | 'replace';
  currentWorkItem: WorkItem | null;
  materialToReplace: Material | null;
  allMaterials: Material[];
  loadingMaterials: boolean;
  materialSearchQuery: string;
  materialsHasMore: boolean;
  
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onMaterialSelect: (material: Material) => void;
  onLoadMore: () => void;
}
```

**Dependencies**:
- react-virtuoso (Virtuoso)
- MUI: Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem, Chip, CircularProgress
- Icons: IconSearch, IconReplace, IconPlus
- Intersection Observer (для loadMore)

**Notes**:
- Infinite scroll logic остается внутри компонента
- loadMoreRef передается как prop

---

### 7. SaveTemplateDialog

**File**: `app/estimates/components/SaveTemplateDialog.jsx`

**Current Code Location**: Lines 2812-2978

**Props Interface**:
```typescript
interface TemplateFormData {
  name: string;
  description: string;
  category: string;
}

interface SaveTemplateDialogProps {
  open: boolean;
  formData: TemplateFormData;
  saving: boolean;
  
  onClose: () => void;
  onFormChange: (field: keyof TemplateFormData, value: string) => void;
  onSave: () => void;
}
```

**Dependencies**:
- MUI: Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Box, Typography
- Icons: IconX, IconTemplate

---

## 🔧 Shared Utilities (To Create)

### `app/estimates/utils/currency.js`
```javascript
export { formatCurrency } from '../../projects/utils';
```

### `app/estimates/types.ts` (Optional, for TypeScript migration)
```typescript
export interface Work {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  phase?: string;
  section?: string;
  subsection?: string;
}

export interface Material {
  id: string;
  material_id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  consumption: number;
  total: number;
  auto_calculate?: boolean;
}

export interface WorkItem {
  id: string;
  workId: string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  total: number;
  phase?: string;
  section?: string;
  subsection?: string;
  materials: Material[];
}

export interface EstimateSection {
  id: string;
  code: string;
  title: string;
  name: string;
  items: WorkItem[];
  subtotal: number;
}

export interface EstimateData {
  sections: EstimateSection[];
}
```

---

## ⚠️ Constraints & Non-Goals

### ❌ DO NOT:
1. **Change localStorage logic** - R3 handles this, EstimateWithSidebar still has legacy code
2. **Introduce state manager** - Keep useState/useReducer within components for now
3. **Modify business logic** - Pure refactoring, zero behavior changes
4. **Change UX/UI** - Pixel-perfect match, no visual regressions
5. **Touch WorkRow/MaterialRow** - Already optimized with React.memo

### ✅ DO:
1. **Extract pure UI first** - Start with stateless components
2. **Keep props minimal** - Only what's needed for rendering
3. **Maintain performance** - Virtualization, React.memo stay intact
4. **Add PropTypes** - Validation for all props
5. **Write tests** - Unit tests for each new component
6. **Document props** - JSDoc comments for interfaces

---

## 🧪 Testing Strategy

### Unit Tests (New Components)
**Location**: `tests/unit/estimates/components/`

**Coverage**:
- Props rendering
- Event handlers (mock callbacks)
- Conditional rendering
- Edge cases (empty states, loading, errors)

**Example** (EstimateHeader.test.jsx):
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import EstimateHeader from 'app/estimates/components/EstimateHeader';

describe('EstimateHeader', () => {
  const defaultProps = {
    estimateName: 'Смета от 01.01.2026',
    estimateStatus: 'draft',
    hasUnsavedChanges: false,
    isSidebarVisible: false,
    exportingExcel: false,
    onSave: vi.fn(),
    onExport: vi.fn(),
    onSaveAsTemplate: vi.fn(),
    onToggleSidebar: vi.fn(),
    onOpenParameters: vi.fn(),
  };

  it('should render estimate name', () => {
    render(<EstimateHeader {...defaultProps} />);
    expect(screen.getByText('Смета от 01.01.2026')).toBeInTheDocument();
  });

  it('should call onSave when save button clicked', () => {
    render(<EstimateHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('Сохранить'));
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('should show unsaved changes indicator', () => {
    render(<EstimateHeader {...defaultProps} hasUnsavedChanges={true} />);
    expect(screen.getByText('Несохраненные изменения')).toBeInTheDocument();
  });

  it('should disable export button while exporting', () => {
    render(<EstimateHeader {...defaultProps} exportingExcel={true} />);
    const exportButton = screen.getByText('Экспорт Excel').closest('button');
    expect(exportButton).toBeDisabled();
  });
});
```

### Smoke Tests (Integration)
**Location**: `tests/integration/estimates/`

**Scenarios**:
1. Open estimate → Verify header renders
2. Click "Сохранить" → Verify API call
3. Add work → Verify table updates
4. Export Excel → Verify download

---

## 📦 File Structure (After Refactoring)

```
app/estimates/
├── EstimateView.jsx (parent, unchanged)
├── EstimateWithSidebar.jsx (main orchestrator, smaller)
├── PriceCoefficientModal.jsx (existing)
├── ObjectParametersSidebar.jsx (existing)
├── components/
│   ├── WorkRow.jsx (existing)
│   ├── MaterialRow.jsx (existing)
│   ├── EstimateHeader.jsx (NEW - R4.1)
│   ├── EstimateTotals.jsx (NEW - R4.2)
│   ├── WorksSearchBar.jsx (NEW - R4.3)
│   ├── WorksFiltersPanel.jsx (NEW - R4.4)
│   ├── WorksListPanel.jsx (NEW - R4.5)
│   ├── MaterialsDialog.jsx (NEW - R4.6)
│   ├── SaveTemplateDialog.jsx (NEW - R4.7)
│   └── EstimateTable.jsx (FUTURE - R4.8)
└── utils/
    └── currency.js (re-export)

tests/unit/estimates/components/
├── EstimateHeader.test.jsx (NEW)
├── EstimateTotals.test.jsx (NEW)
├── WorksSearchBar.test.jsx (NEW)
├── WorksFiltersPanel.test.jsx (NEW)
├── WorksListPanel.test.jsx (NEW)
├── MaterialsDialog.test.jsx (NEW)
└── SaveTemplateDialog.test.jsx (NEW)
```

---

## 📈 Success Metrics

### Before Refactoring
- **EstimateWithSidebar.jsx**: 3457 lines
- **Testability**: Low (monolithic)
- **Reusability**: Low (tight coupling)
- **Readability**: Low (cognitive load)

### After Sprint 1-3 (Target)
- **EstimateWithSidebar.jsx**: ~1500 lines (−57%)
- **Extracted Components**: 7 new components (~1200 lines total)
- **Test Coverage**: +7 component test files (~500 lines)
- **Reusability**: Medium (components can be reused in templates, reports)
- **Readability**: High (single responsibility per component)

### After Sprint 4 (Future)
- **EstimateWithSidebar.jsx**: ~800 lines (−77%)
- **Extracted Components**: 10+ components
- **Main responsibility**: Orchestration only (state management, API calls)

---

## 🚀 Next Steps (R4.1 Start)

**AFTER APPROVAL OF THIS PLAN:**

1. **Create branch**: `refactor/r4-decomposition`
2. **Extract EstimateHeader** (first component)
3. **Write tests**
4. **Smoke test**
5. **Create PR** (small, reviewable)

**Estimated Time**: 2 hours for R4.1

---

## ⚠️ Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Performance regression** | Medium | High | Keep React.memo, useMemo, useCallback intact |
| **Props drilling** | High | Medium | Extract related components together (e.g., WorksSearchBar + WorksFiltersPanel) |
| **Test gaps** | Medium | High | Require 100% test coverage for extracted components |
| **Merge conflicts** | Low | Medium | Small PRs, frequent merges to parent branch |
| **Behavior changes** | Low | Critical | Pixel-perfect smoke testing, screenshot comparison |

---

## 📝 Approval Checklist

Before starting R4.1:
- [ ] Plan reviewed by user
- [ ] Priority order confirmed (Tier 1 → Tier 2 → Tier 3)
- [ ] Testing strategy approved
- [ ] File structure approved
- [ ] Risk mitigation acceptable

**Status**: 🟡 **AWAITING APPROVAL**

---

**Last Updated**: 2 января 2026 г.  
**Version**: 1.0  
**Author**: AI Assistant (R4.0 - Inventory Phase)
