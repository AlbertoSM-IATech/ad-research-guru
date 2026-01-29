
# Plan: Toast Notification for Keywords Outside Pagination

## Verification Results

The synchronization system has been **successfully verified**:

1. **Wizard to Table/Panel Sync**: Created "test keyword sync" with Ads data (Clicks: 25, CPC: $0.35, Pedidos: 3) - all values appeared correctly in both the table and lateral panel
2. **Panel to Table Sync**: Changed Clicks from 25 to 30 in the side panel - table immediately reflected the change
3. **Quick Action Sync**: Used "+1 Click" button in panel - both panel and table updated to 31 instantly
4. **Dashboard Sync**: All metrics (Gasto Total, Clicks Totales, Conversion) updated in real-time

---

## New Feature: Pagination Toast with "Ver Keyword" Button

### Problem
When a new keyword is created via the wizard, it may not be visible due to:
- Current page showing different items (pagination)
- Active search term filtering it out
- Sorting placing it on another page

### Solution
After creating a keyword, detect if it's visible on the current page. If not, show a toast with a button to navigate to it.

### Implementation Steps

**1. Calculate keyword visibility after creation**

In `handleWizardComplete`, after adding the keyword:
- Find the index of the new keyword in `filteredKeywords`
- Calculate which page it would appear on: `Math.floor(index / ITEMS_PER_PAGE) + 1`
- Compare with `currentPage`

**2. Show toast with action button when keyword is not visible**

```text
+---------------------------------------------+
|  Keyword creada                        [X]  |
|  Market Score: 68/100                       |
|  [Ver keyword] - La keyword esta en pag. 8  |
+---------------------------------------------+
```

**3. Button behavior options (prioritized)**

| Option | Action | Pros |
|--------|--------|------|
| A (Recommended) | Navigate to keyword's page | Simple, preserves filters |
| B | Clear filters + go to page 1 | Ensures visibility but loses context |
| C | Show option to choose | More control but extra clicks |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/advertising/KeywordsSection.tsx` | Add visibility check and enhanced toast with action |

### Technical Details

```text
handleWizardComplete(keyword):
  1. onAdd(keyword)
  2. setSelectedKeywordId(keyword.id)
  
  3. useEffect after keywords update:
     - Find keyword in filteredKeywords by ID
     - If found: calculate targetPage
     - If targetPage !== currentPage:
       - Show toast with action button "Ver keyword"
       - Button onClick: setCurrentPage(targetPage)
     - If not found (filtered out):
       - Show toast: "Keyword creada - puede estar oculta por filtros"
       - Button: "Mostrar" -> clear search/filters and go to page 1
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Keyword on current page | Normal toast (no action button) |
| Keyword on different page | Toast + "Ver keyword" button |
| Keyword filtered out by search | Toast + "Limpiar filtros" button |
| Keyword filtered out by advanced filters | Toast + "Limpiar filtros" button |

### Acceptance Criteria

1. Create keyword via wizard while on page 3 with 150 keywords
2. If new keyword lands on page 8 (due to sorting), toast shows "Ver keyword" button
3. Clicking button navigates to page 8
4. Keyword is visible in table after navigation
5. Panel remains open showing the new keyword
