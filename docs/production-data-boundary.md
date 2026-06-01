# Production Data Boundary

Last updated: 2026-05-27

## Decision

Real business records must not be persisted in browser storage for production. Browser storage is allowed only for low-risk UI state such as theme, sidebar collapse state, active tabs, filters, temporary drafts, and client-side migration markers.

## Server-Owned Data

The following domains are server-owned:

- Clients and contacts
- Accounting records: invoices, bills, expenses, bank accounts, transactions, budgets, tax obligations, audit events
- Project records, tasks, milestones, change orders, progress updates, and assigned tasks
- HR records and payroll records
- Procurement records: suppliers, pricebook, purchase requests, purchase orders, RFQs, quotations, receiving logs
- Warehouse records: inventory, locations, receiving, transfers, adjustments, movements
- Workflows, jobs, to-dos, and dataset records

## Storage Boundary

- Production backend: Supabase tables with tenant-scoped RLS.
- Development backend: `.data/` file store when Supabase is not configured.
- Browser storage: UI preferences, filters, active view state, and one-time legacy migration markers only.

## Migration Rule

Existing browser business payloads may be read once by migration helpers, written through authenticated server APIs, then removed from browser storage. New saves must go to `/api/business-records/*` or the HR records API.

## Implemented In This Build

- Added `/api/business-records/[collection]` and `/api/business-records/[collection]/[id]` route handlers.
- Added `public.business_records` Supabase schema and tenant-scoped RLS policies.
- Added development fallback to `.data/business` so local demo data is no longer stored in the browser.
- Migrated core launch modules to server-owned records:
  - Client database
  - Accounting overview, invoices, budgeting, banking, and legacy Financials invoice/bill/budget pages
  - Project management workspace and legacy Projects page
  - Warehouse workspace
- Kept browser reads only where they are migration reads or low-risk account/UI state reads.

## Launch Gate

Modules that still write business records directly to browser storage are not approved for real production data until they use `/api/business-records/*`, object storage, or a purpose-built server API. The current security check enforces the boundary for the core launch modules listed above.

## Required Supabase Scripts

Run these scripts before production launch:

- `scripts/supabase-multi-company.sql`
- `scripts/supabase-clients-table.sql`
- `scripts/supabase-hr-records-table.sql`
- `scripts/supabase-business-records-table.sql`
- `scripts/supabase-sales-orders-table.sql`
- `scripts/supabase-rate-limits-table.sql`
- `scripts/supabase-production-verify.sql`
