# VPRINT Frontend — System Overview

## What does this app do?

This is the internal operations dashboard for the VPRINT automation system. It is a private web app used by the team — not the customer-facing store. It lets operators monitor every order the automation has touched: see live status, watch the automation run step-by-step, pause or stop a running job, browse FireSprint-specific jobs, manage the vendor product catalog, and watch a full event timeline per order.

---

## How it connects to the backend

```
VPRINT Automation Server  (d:/vprint-automation)
        │
        │  REST API over HTTPS
        ▼
Vprint-frontend  (this app)
        │
        │  Renders in the browser
        ▼
Ops team dashboard
```

The frontend never talks to WooCommerce or FireSprint directly. It only calls the automation server's API. All data lives in the backend's Supabase database — the dashboard just reads and displays it.

---

## Shell: sidebar + topbar

Every page (except login/signup) is wrapped in the same shell:

**Sidebar (left, dark)**
- Unleash logo at top
- Navigation links: Overview, Orders, Events, Vendor Catalog
- FireSprint sub-section: FireSprint Orders, FireSprint Log
- Logout at the bottom
- Active page is highlighted with a left border accent

**Topbar (top of each page)**
- Page title + "VPrint Automation" label
- **Bell icon** — live notification feed (see below)
- **Profile dropdown** — shows logged-in email, logout option

**Auth gate**
The entire dashboard is behind a JWT login. If no token is stored, the login form is shown instead of the page. The token is stored client-side; logging out clears it.

---

## Features — page by page

---

### 1. Overview (`/dashboard`)

The home screen. Auto-refreshes every **8 seconds** without any user action.

#### Top row — 4 stat cards

| Card | What it shows |
|---|---|
| **Poller Status** | Whether the automation engine is idle or actively running an order right now |
| **Queue (FireSprint)** | How many orders are waiting (pending) + currently being processed |
| **Completion Rate** | % of terminal orders that succeeded (placed ÷ total finished) |
| **Webhooks (24h)** | How many WooCommerce webhook calls came in during the last 24 hours |

#### Poller Status card (the most important one)

This card shows the live state of the automation engine. When it is running an order it shows:
- Which Woo order number it is working on
- A **4-step progress bar**: Session → Artwork → Cart → Checkout — with the current step glowing blue and completed steps turning green
- Which SKU it is currently processing (e.g. `artwork:FS-BANNER-4X8`)
- A percentage progress bar
- **Live session link** — opens the Browserbase browser session so you can watch the automation in real time
- **Debug inspector link** — opens the browser DevTools session
- **Pause / Resume / Stop & fail buttons** — control the running order without touching the server directly

Below the run controls there is a **"Sync FireSprint Orders"** button. Clicking it triggers an immediate sync of FireSprint order statuses back into the database and shows how many were scanned, updated, and how many tracking numbers were found.

#### FireSprint Lines by Status

Six small count cards — one per status: Pending, Processing, Placed, Failed, Awaiting Approval, On Hold. These are counts of individual line items (not whole orders), so one order with 3 products counts as 3 lines.

#### All Orders by Status

A grid showing the total count of orders in every status (received, pending, processing, placed, failed, etc.).

---

### 2. Orders list (`/dashboard/orders`)

A paginated table of all orders. Auto-refreshes every **15 seconds**.

**Columns:**
- **Woo #** — the WooCommerce order number; a blue pulsing dot appears next to the order currently being automated
- **Customer** — name and email
- **Status** — the automation status (colour-coded pill) + the raw WooCommerce status underneath + any control state (paused / stop requested)
- **Duration** — how long the automation took (or is taking, shown in blue if still running)
- **FS Lines** — a summary of FireSprint line-item statuses for this order (e.g. `placed ×2 pending ×1`)
- **Actions** — opens a Manage dialog
- **Created** — when the order arrived
- Arrow button → navigates to the order detail page

**Filters (always visible above the table):**
- **Search box** — search by Woo order number, customer name, or email. Press Enter or click Apply.
- **Status dropdown** — filter to one status (received, pending, processing, awaiting approval, on hold, in-review, placed, failed)
- **FireSprint only toggle** — hides orders that have no FireSprint lines
- **Clear** button appears when a filter is active

**Manage dialog**

Clicking "Manage" on any order opens a popup with:
- Current status and control state
- **Pause** — pauses the automation mid-run (only works if that order is actively running)
- **Resume** — resumes a paused order
- **Stop / Permanent stop** — marks the order (and remaining items) as failed. Shows a confirmation alert before proceeding.
- "Open order details" link goes to the full detail page

---

### 3. Order detail (`/dashboard/orders/[wooId]`)

The deepest view. Shows everything about one order. Auto-refreshes every **10 seconds**.

**Header**
- Order number, customer name, email
- Status pills (automation status + WooCommerce status if different + control state)
- A blue pulsing dot if the automation is running this order right now
- Back arrow to the orders list

**Live Control Panel** *(only visible while this order is being automated)*

A blue-tinted panel showing:
- "Automation running" with a spinner
- Which item it is on (e.g. "Item 2 / 3")
- Which internal step it is on
- A live progress bar
- Live session and debug inspector links
- Pause / Resume / Stop & fail controls

**Alert banners**

Contextual banners that appear automatically:
- Red banner — if one or more FireSprint lines failed, lists each SKU with the agent's error message
- Blue banner — if lines are currently being processed but the live control panel is not showing (edge case)
- Yellow banner — if lines are sitting in the queue waiting to be picked up

**Three tabs**

| Tab | What it shows |
|---|---|
| **Line Items** | Every product in the order, split into FireSprint lines and other vendor lines |
| **Automation Events** | A colour-coded timeline of every event the automation logged for this order |
| **Order Info** | All metadata: IDs, timestamps, customer, session URL, debug URL |

**Line Items tab**

FireSprint lines table: SKU · Product name · Qty · Status (with icon) · FireSprint order ID (clickable link to the actual FireSprint order) · Agent message (the reason it failed or confirmation it was placed).

Other vendor lines below (SKU, product, qty, vendor name, status).

**Automation Events tab**

A vertical timeline. Each event is a card with:
- Event type (e.g. `order.processing_started`, `cart.item_added`, `checkout.failed`) in monospace
- Timestamp
- Human-readable message
- A "Payload ›" expander showing the raw JSON data attached to that event

Events are colour-coded by type (green for success events, red for failures, blue for info, etc.) via `lib/automationEventStyles.ts`.

**Order Info tab**

A clean two-column table with: Woo Order ID, Internal ID, Status, WC Status, Customer, Email, Created date, Processing started, Completed at, Total duration, Session URL, Debug URL.

---

### 4. Live notification bell (topbar, all pages)

The bell icon in the top-right corner tracks order changes in real time by polling the orders list every **10 seconds**.

It detects:
- **New orders** — an order ID that wasn't in the previous poll
- **Status changes** — an order whose status changed since the last poll (e.g. `processing → placed`, `processing → failed`)

Each event appears as a notification entry. Clicking a notification navigates directly to that order's detail page. Unread count shows as a badge. Opening the panel marks all as read.

Notifications are session-only — they reset on page refresh.

---

## Folder-by-folder breakdown

### `app/` — pages and routing

Built on the Next.js **App Router**. Every folder inside `app/` maps to a URL. Each folder can have:
- `page.tsx` — the actual page component rendered at that URL
- `layout.tsx` — a wrapper shared by all pages inside (e.g. the sidebar lives in `app/dashboard/layout.tsx`)

#### `app/dashboard/` — the whole ops dashboard

Contains the dashboard shell (sidebar navigation, topbar, auth gate) and all sub-pages.

#### `app/dashboard/orders/[wooId]/` — dynamic order detail page

`[wooId]` is a URL parameter. Visiting `/dashboard/orders/12345` loads the detail page for Woo order #12345.

#### `app/dashboard/firesprint/` — FireSprint sub-section

Two views: the FireSprint order list and the FireSprint event stream. Separated from the general orders view because FireSprint has its own sync cycle and status fields.

---

### `components/` — reusable UI pieces

#### `components/ui/` — base design system

Pre-built components from **shadcn/ui** (built on Radix UI + Tailwind). Things like `button`, `card`, `badge`, `dialog`, `dropdown-menu`, `table`, `toast`, etc. These are the raw building blocks. They live in the repo (not installed as a package) so they can be customised.

#### `components/dashboard/` — dashboard-specific components

- `auth-form.tsx` — the login/signup form
- `unleash-logo.tsx` — the Unleash brand logo in the sidebar

---

### `hooks/` — custom React hooks

| Hook | What it does |
|---|---|
| `use-dashboard-api.tsx` | All dashboard data fetching — orders, events, overview, order controls. Also provides the auth context (JWT storage, login state). |
| `use-api.tsx` | Generic authenticated API call hook |
| `use-fetch.tsx` | Low-level fetch wrapper with error handling |
| `use-interval.tsx` | Runs a function on a repeating timer — used for live-polling |
| `use-mobile.ts` | Detects if the user is on a mobile screen |
| `use-toast.tsx` | Shows toast notification popups |

---

### `lib/` — shared utilities and configuration

| File / folder | What it does |
|---|---|
| `utils.ts` | General helpers (Tailwind class merging with `cn()`, formatting) |
| `automationEventStyles.ts` | Maps automation event type strings to Tailwind colour classes — this is why events look colour-coded in the timeline |
| `index.ts` | Re-exports commonly used lib helpers |
| `query/` | React Query configuration — query keys, shared utilities, default fetch options |

---

### `provider/` — React context providers

`index.tsx` wraps the whole app with:
- **QueryClientProvider** — makes React Query available everywhere (retry logic: max 2 retries, never retries on 400/401/403/404)
- **Axios** — configured with base URL and auth headers
- **Toaster** — global toast notification renderer
- **ReactQueryDevtools** — dev-only panel for inspecting the cache

---

### `types/` — TypeScript type definitions

| File | What it defines |
|---|---|
| `dashboard.ts` | Types for `Order`, `OrdersResponse`, `OverviewData`, `AutomationEvent`, `EventsResponse` — matching what the API returns |
| `index.ts` | Re-exports all types from one place |

---

### `public/` — static assets

Logos and SVGs served directly (no processing). Includes the Unleash logo PNG.

---

## Key technologies

| What | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Component library | shadcn/ui (Radix UI primitives) |
| Server state / data fetching | TanStack React Query |
| HTTP client | Axios |
| Notifications | react-hot-toast |
| Icons | Lucide React |
| Git hooks | Husky |
