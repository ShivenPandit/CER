# CER Management System — API Fetch & Pagination Strategy

**Document Version:** 1.0.0  
**Target:** SharePoint Framework (SPFx) Data Layer & SharePoint REST API  

---

## 1. Architectural Principles

To ensure enterprise-grade stability, zero data loss, and smooth performance in high-scale corporate SharePoint environments, all data retrieval operations follow these foundational principles:

1. **Pagination Traversal via Continuation Tokens:**
   - Single-page queries (`$top`) are strictly prohibited for entity collections expected to grow over time (e.g. Proposals, Audit Trails, Workflow Configurations).
   - Collections must use the `getAllListItems` pattern, which inspects continuation tokens and transparently aggregates pages before resolving.

2. **Multi-Flavored OData Token Handling:**
   - SharePoint REST APIs return pagination links in different properties depending on the `Accept` header format:
     - `application/json;odata=nometadata`: `data["odata.nextLink"]`
     - `application/json;odata=minimalmetadata` / `odata.metadata=minimal`: `data["@odata.nextLink"]`
     - `application/json;odata=verbose`: `data.d.__next`
   - The data service evaluates all three variants hierarchically.

3. **Multi-Tier Query Fallbacks:**
   - When querying lists with complex expanded fields (e.g. `Person or Group` fields like `cerOwner`, `Author`, `Editor`):
     - **Tier 1 (Full Expansion):** `expand=cerOwner,Author,Editor` with explicit subfield selection (`Id,Title,EMail,Name`).
     - **Tier 2 (Core Expansion Fallback):** `expand=cerOwner` with subfield selection (`Id,Title,EMail,Name`).
     - **Tier 3 (Unexpanded Fallback):** Plain entity retrieval if SharePoint field configurations differ or permissions restrict user profile expansion.

4. **In-Memory Caching & In-Flight Request Deduplication:**
   - Proposals, workflow configurations, and user roles utilize short-lived time-to-live (TTL) memory caching (25s–30s) to prevent repeated redundant network requests across rapid component tab switches.
   - Concurrent requests share active in-flight promises (`_inFlightProposals`) so simultaneous dashboard components trigger exactly one SharePoint HTTP GET request.

---

## 2. API Operation Standards

### A. Fetching Proposals (`getAllProposals`)
```typescript
const fetchItems = typeof this._sp.getAllListItems === "function"
  ? (opts: any) => this._sp.getAllListItems(listName, opts)
  : (opts: any) => this._sp.getListItems(listName, opts);

items = await fetchItems({
  top: 500,
  orderby: "Created desc",
  expand: "cerOwner,Author,Editor",
  select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name,Author/Id,Author/Title,Author/EMail,Editor/Id,Editor/Title,Editor/EMail",
});
```

### B. Fetching Workflow Levels (`getWorkflowLevels`)
```typescript
items = await fetchItems({
  select: "Id,ID,Title,levelId,level_id,level_name,roleTitle,role_title,sbu,isActive,is_active,created_by,created_date,Created,assignmentType,assignment_type",
  top: 200,
});
```

### C. Proposal Number Generator (`generateProposalNumber`)
```typescript
items = await fetchItems({
  select: "Id,Title,cerPrNo",
  top: 2000,
  orderby: "Created desc",
});
```

---

## 3. Best Practices for Developers
- Never hardcode `$top: 50` or `$top: 100` without pagination.
- Always provide index-optimized `$select` projections to avoid payload bloat.
- Preserve fallback tiers when working with SharePoint person fields.

