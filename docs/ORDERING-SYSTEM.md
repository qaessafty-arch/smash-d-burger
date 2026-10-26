# Smashed Burger: table ordering system

A real, database-backed restaurant ordering platform built on top of the existing Smashed Burger site.
Customers order from their table, waiters verify orders in person, the kitchen prepares them, and the
owner manages everything from an admin dashboard.

## 1. Technical assessment (what existed, and what was done)

| | Before | Now |
|---|---|---|
| Stack | Next.js 16 (App Router), React 19, Tailwind 4, **static export** to GitHub Pages | Same stack, now running as a **Node server** (no static export) |
| Menu | Hard-coded in `app/page.tsx`; edits kept in the visitor's `localStorage` | 18 existing items and 5 categories **imported unchanged** into the database (`seed/menu.json`) |
| Customization | Hard-coded per category in the customizer modal | Admin-configurable option groups per item; the original options (remove ingredient, sauce level, extras, size, seasoning, dip, ice) were seeded |
| Cart / order | Browser memory; "order" = a WhatsApp link | Server-side pricing, order numbers, verification code + QR, status workflow |
| Backend / DB / auth | None | SQLite, staff accounts with roles, audit log |
| Stock | Simulated in the browser | Removed (it was fake). Admin marks items available / sold out |
| Landing page, branding, i18n (EN/KU/AR), reviews, map | Working | **Kept**. Ordering is integrated into the existing page and design tokens |

Removed because they were demo-only or are superseded: the browser "Edit Menu" modal, "Simulate order", "Restock",
the WhatsApp order builder, the old customizer / tray / stock components.

**Why SQLite on Node:** the requirement is a real multi-role system (orders, secrets, staff logins, live updates). That needs a
server. SQLite (via Node's built-in `node:sqlite`) needs no external service, no paid product, and no native build step. One
restaurant = one small file. **GitHub Pages can no longer host the site**; deploy to any Node >= 22.13 host with a persistent disk.

## 2. Architecture

```
Customer phone ──► Next.js pages ──► /api/* route handlers ──► lib/server/* ──► SQLite (data/restaurant.db)
Waiter / Kitchen / Admin (same app, /staff/* and /admin/*)         │
                                                                   └─ SSE event bus (+ polling fallback)
```

- `lib/server/db.ts` schema + migrations (`PRAGMA user_version`), transactions (`BEGIN IMMEDIATE`)
- `lib/server/orders.ts` pricing, order creation, workflow transitions, verification, service requests
- `lib/server/auth.ts` staff sessions, customer table sessions, audit log
- `lib/server/http.ts` route wrapper (CSRF origin check, safe errors), validators; `security.ts` hashing, tokens, rate limits
- `components/ordering/*` customer UI (menu, item sheet, tray, table gate, call waiter); `components/staff/*` staff UI
- Pages: `/` (menu + ordering), `/order/<secret>` tracking, `/t/<secret>` table QR, `/s/<secret>` waiter-started session,
  `/staff/login`, `/staff/waiter`, `/staff/kitchen`, `/staff/verify`, `/admin/*`

### Order workflow

```
awaiting_verification ─► verified ─► confirmed (sent to kitchen) ─► preparing ─► ready ─► served ─► completed
        │                    │            └────────────── cancelled (waiter; manager once cooking) ──────────┘
        └── rejected / cancelled (customer may cancel only before verification)
```

Who may do each step is enforced on the server (`TRANSITIONS` in `orders.ts`): waiters verify/confirm/serve/complete, kitchen
prepares and marks ready, managers/admins can do both. Steps cannot be skipped. Every change is stored in
`order_status_history` with the person responsible. Admin settings switch behaviour:

- **Waiter must verify every order** (default on). If off, orders from a scanned table QR go straight to the kitchen.
  Orders from a table the customer picked manually are *always* verified.
- **Kitchen only receives verified orders** (default on).
- **Waiters can mark served without the kitchen** (default off).

### Table identification

1. **Table QR** `/t/<secret>`: opens the menu with the table fixed; the secret is random and separate from the table number. "New QR" in admin
   invalidates a printed code and closes its sessions.
2. **Manual selection**: allowed / waiter-only / off (setting). Only active, real tables are offered. Orders from these sessions always need waiter verification.
3. **Waiter-assisted**: waiter taps "Start session" on a table, the customer scans a one-time QR (15 minutes).

### Verification

The customer sees a 6-digit code and a QR after ordering. The waiter either types the code or scans the QR, **reviews the order and table**, and only
then verifies; verification records who and when. The QR contains `https://<site>/staff/verify?t=<random 192-bit token>`, not an order id, and
only works for a signed-in waiter. Codes/tokens expire (default 90 min), are single use, and a waiter can issue a fresh code. After
10 wrong lookups in 5 minutes a waiter is locked out for the rest of the window.

## 3. Database

Tables: `settings, staff, staff_sessions, categories, items, option_groups, options, tables, table_sessions, waiter_links, orders, order_items,
order_item_options, order_status_history, service_requests, notifications, audit_log`.

- Prices are integers (IQD). `order_items` and `order_item_options` store the **name and price at order time**, so later menu edits never change history.
- `UNIQUE(session_id, idempotency_key)` prevents duplicate orders from double taps / retries; order numbers are allocated inside a write transaction.
- A partial unique index guarantees pending verification codes are unique; foreign keys are enforced; CHECK constraints guard quantities, roles, statuses.
- Only hashes of bearer tokens (tracking token, staff session, table session) are stored. The verification code/token exist in plain text only while an order awaits verification.

## 4. Security summary

- Staff passwords: scrypt with per-user salt. Sessions: random token in an `httpOnly`, `SameSite=Lax`, `Secure` cookie (hash stored server-side), 12 h.
- Role checks happen in every API handler (`requireStaff`). Admin/manager/waiter/kitchen permissions are tested.
- All prices, option rules, availability and totals are recomputed on the server; client price fields are ignored.
- Customers can only read an order with its secret tracking token; table sessions bind orders to a table.
- Origin check on all mutating requests, JSON-only bodies, input validation, generic error messages, rate limits (login, orders, verification, uploads, requests).
- Uploads: content sniffing (PNG/JPG/WebP/GIF only, 4 MB), random file names, served with `nosniff`.
- CSV export neutralises spreadsheet formula injection. Security headers set in `next.config.mjs`.

## 5. Install and run

Requirements: Node >= 22.13, pnpm 12.

```bash
pnpm install
cp .env.example .env.local        # optional
pnpm dev                          # http://localhost:3000
# production
pnpm build && pnpm start
```

First start creates the database in `./data`, imports the menu, and creates an administrator. Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` before the
first start, or read the generated password from the server log (shown once). **Back up `data/`** (database + uploaded photos).

| Variable | Purpose |
|---|---|
| `DATABASE_PATH` | SQLite file (default `./data/restaurant.db`) |
| `UPLOAD_DIR` | Uploaded images (default `./data/uploads`) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | First-start administrator |
| `INSECURE_COOKIES=1` | Only for plain-HTTP private networks; production should use HTTPS |

Hosting notes: run a single instance (the in-memory rate limiter and live-update bus are per process), behind HTTPS, on a persistent disk.

## 6. How to use it

1. **Admin** signs in at `/staff/login` → `/admin`. *Tables & QR*: add tables, print the QR sheet, stick one on each table. *Settings*: tax/service %, hours, workflow.
   *Staff*: create waiter and kitchen accounts. *Menu*: edit prices, availability, photos, option groups (Kurdish/Arabic names optional).
2. **Customer** scans the table QR → browses → taps a dish → customizes → tray → Place order → sees the code/QR and live status.
3. **Waiter** (`/staff/waiter`): new orders appear with a sound; at the table, enter the customer's code or scan their QR, check the table/items, *Verify*, then *Confirm & send to kitchen*.
   Handles call-waiter/bill requests, serves ready orders.
4. **Kitchen** (`/staff/kitchen`): Start preparing → Mark ready (the waiter is notified).

## 7. Tests

`pnpm test` runs 24 end-to-end API tests against a running server with a throwaway database (see `tests/api.test.mjs`): ordering, QR sessions,
server-side pricing and tampering, duplicate submission, verification (code, QR token, expired, replay, wrong order, brute force), role gates,
workflow order, kitchen isolation from unverified orders, cancellation rules, service requests, waiter-assisted sessions, manual table rules,
menu management and historical price snapshots, admin protections, tax/service math, statistics, CSV export, upload validation, CSRF, login throttling.
CI (`.github/workflows/ci.yml`) typechecks, builds and runs them.

## 8. Known limitations

- Single restaurant, single server process. No multi-tenant / multi-branch support.
- Status transitions are a fixed, role-checked map with three admin switches, not a fully editable workflow.
- Waiter-to-table assignments are stored and shown but do not yet filter or route notifications; every waiter sees every table.
- Customer notifications are in-app (live status page, vibration) plus browser notifications while the page is open; there is no push/SMS when the page is closed.
- No payment processing (bill requests only). Items cannot be re-ordered within a category (categories can).
- Kurdish strings were written without a native review. Remote menu photos (Unsplash) are hot-linked, as before; uploading your own is recommended.
- Camera QR scanning needs HTTPS and a browser with camera access; typing the code always works.

## 9. Quick switches (pause anything temporarily)

Admin and managers see **Quick switches** at the top of the dashboard: table ordering, delivery button, guests picking their own table,
each guest request (call waiter, bill, water, utensils, napkins), and an optional message shown to guests. Changes reach guests within a minute.
Hide a category or mark a dish sold out in **Menu**. Setting up tables: **Tables & QR** (add tables, print the QR codes, stick one on each table).
