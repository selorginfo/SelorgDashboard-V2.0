# Delivery & Container Stalls — API endpoints

Backend contract for the **Delivery** and **Container Stalls** modules of the Selorg Admin Dashboard.
The frontend is complete and currently runs on local seed data (`src/services/ops/opsService.ts`,
`src/services/bulkOrders/bulkOrderService.ts`); each service's interface is the contract below, so
switching to the real backend means one fetch-backed implementation per service — no screen changes.

Screens, fields, actions and action forms are generated from the approved design
(`design-reference/Selorg Admin Dashboard.dc.html` → `scripts/generate-ops-screens.mjs`), so the request
bodies below are exactly what the UI sends.

> Status: **proposed**. Paths marked *existing* are already in the backend API catalog
> (`src/data/dashboardApiCatalog.json`); everything else needs to be built.

## Contents

- [Conventions](#conventions)
- [Delivery module](#delivery-module) — [Live Deliveries](#live-deliveries), [Bulk Delivery Board](#bulk-delivery-board), [Bulk Order Queue](#bulk-order-queue), [Delivery Batches](#delivery-batches), [Load Planning](#load-planning), [Run Sheet & Stops](#run-sheet--stops), [Route Planning](#route-planning), [Live Vehicle Tracking](#live-vehicle-tracking), [Consignment Tracking](#consignment-tracking), [Vehicle Operators](#vehicle-operators), [Delivery Exceptions](#delivery-exceptions), [Delivery Fleet](#delivery-fleet), [Bulk Orders (B2B)](#bulk-orders-b2b), [Riders & Live](#riders--live-existing), [Zones & Maps](#zones--maps-existing)
- [Container Stalls module](#container-stalls-module) — [Network Overview](#network-overview), [Areas & Mapping](#areas--mapping), [Stall Directory](#stall-directory), [Stall Employees](#stall-employees), [Customer Conversions](#customer-conversions), [Stall Orders](#stall-orders), [Advertisements](#advertisements), [Product Samples](#product-samples), [Incentive Rules](#incentive-rules), [Employee Earnings](#employee-earnings)
- [Cross-cutting](#cross-cutting) — real-time events, stall app ingestion, audit, permissions
- [Gap summary](#gap-summary)

## Conventions

| Topic | Contract |
|---|---|
| Base path | `/api/v1/admin` — same namespace and cookie/JWT auth as the rest of the admin API (`src/lib/apiClient.ts`) |
| List response | `{ "items": Record[], "total": number, "page": number, "pageSize": number, "tabCounts": { [tab]: number } }` |
| Record | Flat object; field names are the camelCase of the UI column. `status` is `{ "label": string, "tone": "green"\|"amber"\|"blue"\|"red"\|"grey" }`. Every record also carries `stage` (index into the screen's flow) and `activity[]`. |
| Tabs | `?tab=<kebab tab name>` — the server decides which records a tab contains (e.g. `window-at-risk`). |
| Search / filter | `?q=` matches any visible field; `?status=` matches the status label exactly. |
| Actions | `POST {resource}/:id/{action-slug}` with the action's form fields. Returns the updated record (status, changed columns, `stage`, new `activity` entry). |
| Bulk actions | `POST {resource}/bulk/{action-slug}` with `{ "ids": string[], ...fields }`. All-or-nothing: returns `409` listing ineligible ids. |
| Flow advance | `POST {resource}/:id/advance` records the next stage without a form (the "Mark …" button). |
| Closed records | Status-changing actions on a record in an end state (Completed, Delivered, Cancelled, Retired, Expired, Ended, Trip closed, Resolved, Paid, Inactive, Reconciled, Refunded) return **409 `RECORD_CLOSED`**. Exempt: Change status, Create new version, Mark available, Flag as invalid, Reattribute conversion, Refund delivery/order, Review performance, Report stop issue. |
| Errors | `400 VALIDATION` `{ field, message }` for a missing required field (the UI marks required fields with *) · `403` role not permitted · `404` · `409` state conflict |
| Activity / audit | Every create, edit, delete, advance and action writes an activity entry `{ action, by, at, note }` on the record and an audit-log row (`/api/v1/admin/audit`). `note` is the form summary the UI builds, e.g. `Vehicle: KA-05 AB 8890 · Auto · 350 kg · Estimated load (kg): 284 kg`. |
| Route order | Register the fixed sub-paths `kpis`, `export`, `bulk/*`, `preview`, `release`, `overview` before `/:id` so they are not read as record ids. |
| Export | `GET {resource}/export?tab=&q=&status=&format=csv\|xlsx\|pdf\|json&delivery=download\|email\|save` (the UI currently downloads CSV locally). |

## Delivery module

Sidebar order: Riders & Live · Live Deliveries · Bulk Delivery Board · Bulk Order Queue · Bulk Orders · Delivery Batches · Load Planning · Run Sheet & Stops · Route Planning · Live Vehicle Tracking · Consignment Tracking · Vehicle Operators · Delivery Exceptions · Delivery Fleet · Zones & Maps.

### Live Deliveries

Route `/deliveries` · Every live delivery from bag pickup to doorstep. Pick one to see its route, rider and timeline.

**Resource:** `/api/v1/admin/deliveries`  ·  **Entity:** Delivery  ·  **Record capabilities (design CAP):** update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/deliveries` | List records — query: `tab` (`out-for-delivery`, `unassigned`, `running-late`, `arriving-now`, `completed`, `failed`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/deliveries/kpis` | KPI strip (Out for delivery, Unassigned, Running late, Avg time, On-time, Failed today) |
| GET | `/api/v1/admin/deliveries/:deliveryId` | One record with `stage`, `activity[]` and linked-record references |
| PATCH | `/api/v1/admin/deliveries/:deliveryId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/deliveries/:deliveryId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/deliveries/:deliveryId/assign-rider` | Assign rider — advances the flow stage |
| POST | `/api/v1/admin/deliveries/:deliveryId/reassign-rider` | Reassign rider |
| POST | `/api/v1/admin/deliveries/:deliveryId/call-customer` | Call customer |
| POST | `/api/v1/admin/deliveries/:deliveryId/reattempt-delivery` | Reattempt delivery — advances the flow stage |
| POST | `/api/v1/admin/deliveries/:deliveryId/mark-delivered` | Mark delivered — advances the flow stage |
| POST | `/api/v1/admin/deliveries/:deliveryId/mark-failed` | Mark failed |
| POST | `/api/v1/admin/deliveries/:deliveryId/refund-delivery` | Refund delivery |
| POST | `/api/v1/admin/deliveries/bulk/assign-rider` | Bulk assign rider — body adds `ids: string[]` (only records whose status matches `/needs rider|blocked/i`) |
| POST | `/api/v1/admin/deliveries/bulk/reassign-rider` | Bulk reassign rider — body adds `ids: string[]` |
| GET | `/api/v1/admin/deliveries/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/deliveries/:deliveryId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Delivery | DLV-77412 |
| `order` | Order | SEL-104822 |
| `customer` | Customer | Priya Nair |
| `rider` | Rider | Vikram J. |
| `zone` | Zone | Z-04 Indiranagar |
| `distance` | Distance | 1.8 km |
| `eta` | ETA | 4 min |
| `status` | Status | On the way |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/deliveries/:deliveryId/assign-rider</code> — Assign rider</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `rider` | enum | yes | Vikram J. · Imran A. · Naveen R. · Sameer Q. · Deepak T. |
| `mode` | enum | yes | Manual pick · Auto-suggest nearest · Broadcast to zone |
| `eta` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/deliveries/:deliveryId/reassign-rider</code> — Reassign rider</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `rider` | enum | yes | Vikram J. · Imran A. · Naveen R. · Sameer Q. · Deepak T. |
| `reason` | enum | yes | Rider unavailable · Vehicle issue · Delay risk · Zone change · Rider declined |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/deliveries/:deliveryId/call-customer</code> — Call customer</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `purpose` | enum | yes | Confirm address · Rider cannot reach · Running late · Delivery attempt · Reschedule |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/deliveries/:deliveryId/reattempt-delivery</code> — Reattempt delivery</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `when` | enum | yes | Now · In 30 minutes · Later today · Tomorrow |
| `rider` | enum | yes | Same rider · Vikram J. · Imran A. · Naveen R. · Sameer Q. · Deepak T. |
| `contact` | enum | yes | Yes · No |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/deliveries/:deliveryId/mark-delivered</code> — Mark delivered</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `proof` | enum | yes | OTP verified · Photo at door · Customer signature · Left with security |
| `code` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/deliveries/:deliveryId/mark-failed</code> — Mark failed</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Customer unavailable · Address unreachable · Customer refused · Wrong address · Safety concern |
| `goods` | enum | yes | Return to store · Rider holds for reattempt · Dispose — perishable |
| `refund` | enum | yes | Full refund · No refund · Decide later |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/deliveries/:deliveryId/refund-delivery</code> — Refund delivery</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `scope` | enum | yes | Delivery fee only · Full order · Partial |
| `amount` | string | yes | — |
| `method` | enum | yes | Original payment method · Selorg wallet |
| `note` | string | yes | — |

</details>

**Existing backend endpoints to reuse:** `GET /api/v1/rider/dispatch/unassigned`, `GET /api/v1/rider/dispatch/unassigned/count`, `POST /api/v1/rider/dispatch/assign`, `POST /api/v1/rider/dispatch/auto-assign`, `GET /api/v1/rider/dispatch/orders/:orderId/assignment`, `GET /api/v1/rider/dispatch/orders/:orderId/recommendations`, `GET /api/v1/rider/dispatch/map/orders`, `POST /api/v1/admin/support/tickets/:id/redelivery`

### Bulk Delivery Board

Route `/bd-overview` · Multiple ready orders from one area, grouped into a batch and delivered stop by stop by a single auto or van.

**Resource:** `/api/v1/admin/bulk-delivery/overview`  ·  **Entity:** Area  ·  **Record capabilities (design CAP):** read-only (system-generated)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-delivery/overview` | Summary for the screen — query: `tab` (`board-today`, `by-area`, `batch-funnel`, `alerts`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-delivery/overview/kpis` | KPI strip (Orders ready to batch, Batches today, Vehicles on route, Stops planned, Exceptions, Vehicle utilisation) |
| GET | `/api/v1/admin/bulk-delivery/overview/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Existing backend endpoints to reuse:** `GET /api/v1/shared/analytics/dispatch-efficiency`, `GET /api/v1/shared/analytics/fleet-utilization`

### Bulk Order Queue

Route `/bd-queue` · Ready orders waiting to be grouped. Eligibility is area, delivery window and readiness — an order must be racked before it can be batched.

**Resource:** `/api/v1/admin/bulk-delivery/queue`  ·  **Entity:** Order  ·  **Record capabilities (design CAP):** update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-delivery/queue` | List records — query: `tab` (`all-eligible`, `suggested-batches`, `unbatched`, `window-at-risk`, `not-eligible`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-delivery/queue/kpis` | KPI strip (Eligible orders, Suggested into batches, Unbatched, Window at risk, Areas, Avg wait to batch) |
| GET | `/api/v1/admin/bulk-delivery/queue/:orderId` | One record with `stage`, `activity[]` and linked-record references |
| PATCH | `/api/v1/admin/bulk-delivery/queue/:orderId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/bulk-delivery/queue/:orderId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-delivery/queue/:orderId/group-into-batch` | Group into batch — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/queue/:orderId/add-to-existing-batch` | Add to existing batch — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/queue/:orderId/remove-from-batch` | Remove from batch |
| POST | `/api/v1/admin/bulk-delivery/queue/:orderId/mark-priority` | Mark priority — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/queue/:orderId/exclude-from-bulk` | Exclude from bulk |
| POST | `/api/v1/admin/bulk-delivery/queue/bulk/group-into-batch` | Bulk group into batch — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-delivery/queue/bulk/mark-priority` | Bulk mark priority — body adds `ids: string[]` |
| GET | `/api/v1/admin/bulk-delivery/queue/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-delivery/queue/:orderId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Order | SEL-104822 |
| `customer` | Customer | Priya Nair |
| `area` | Area | AREA-01 Indiranagar |
| `address` | Address | 402 Palm Grove, 12th Main |
| `readyAt` | Ready at | 19:02 |
| `window` | Window | by 19:45 |
| `suggestedBatch` | Suggested batch | BDB-2045 · stop 2 |
| `status` | Eligibility | Eligible |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-delivery/queue/:orderId/group-into-batch</code> — Group into batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `area` | enum | yes | AREA-01 Indiranagar · AREA-02 Koramangala · AREA-03 HSR Layout · AREA-04 Whitefield |
| `orders` | string | yes | — |
| `window` | enum | yes | Next 45 minutes · Next hour · All ready orders |
| `vtype` | enum | yes | Auto rickshaw · up to 350 kg · Pickup · up to 500 kg · Mini truck · up to 750 kg · Decide after capacity check |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/queue/:orderId/add-to-existing-batch</code> — Add to existing batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `batch` | enum | yes | BDB-2045 Indiranagar · 6 stops · BDB-2046 HSR Layout · 5 stops · BDB-2047 Koramangala · 6 stops |
| `check` | enum | yes | Capacity and window both fit · Adds distance — accept · Needs re-optimisation |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/queue/:orderId/remove-from-batch</code> — Remove from batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Order cancelled · Window no longer achievable · Capacity exceeded · Customer rescheduled · Wrong area |
| `route` | enum | yes | Re-optimise remaining stops · Keep existing sequence |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/queue/:orderId/mark-priority</code> — Mark priority</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `level` | enum | yes | Deliver first · Deliver within window · Standard |
| `reason` | enum | yes | Customer request · Perishable items · Compensation for earlier delay · Corporate account |
| `lock` | enum | yes | Yes · No |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/queue/:orderId/exclude-from-bulk</code> — Exclude from bulk</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Address invalid · Outside area · Fragile — single delivery · Customer requested rider · Too far from cluster |
| `route2` | enum | yes | Standard rider · Next batch · Hold at store |
| `note` | string | yes | — |

</details>

**Existing backend endpoints to reuse:** `GET /api/v1/rider/dispatch/group-orders`, `GET /api/v1/rider/dispatch/group-delivery`, `GET /api/v1/rider/dispatch/group-delivery/filter-options`, `GET /api/v1/rider/dispatch/clusters`, `POST /api/v1/rider/dispatch/clusters`, `PUT /api/v1/rider/dispatch/clusters/:clusterId/orders`, `DELETE /api/v1/rider/dispatch/clusters/:clusterId`, `POST /api/v1/rider/dispatch/cluster-metrics`

### Delivery Batches

Route `/bd-batches` · One batch is one auto trip carrying 40–50 customer orders from a single dark store, sequenced into stops and delivered one after another.

**Resource:** `/api/v1/admin/bulk-delivery/batches`  ·  **Entity:** Batch  ·  **Record capabilities (design CAP):** create, update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-delivery/batches` | List records — query: `tab` (`all-batches`, `awaiting-dispatch`, `in-transit`, `completed`, `over-capacity`, `cancelled`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-delivery/batches/kpis` | KPI strip (Batches today, In transit, Completed, Over capacity, Avg orders per batch, Avg route) |
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/bulk-delivery/batches` | Create a batch |
| PATCH | `/api/v1/admin/bulk-delivery/batches/:batchId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/assign-vehicle` | Assign vehicle — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/assign-operator` | Assign operator — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/optimise-route` | Optimise route — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/run-dispatch-checklist` | Run dispatch checklist — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/dispatch-batch` | Dispatch batch — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/pause-batch` | Pause batch |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/resume-batch` | Resume batch — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/split-batch` | Split batch — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/cancel-batch` | Cancel batch |
| POST | `/api/v1/admin/bulk-delivery/batches/bulk/assign-vehicle` | Bulk assign vehicle — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-delivery/batches/bulk/optimise-route` | Bulk optimise route — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-delivery/batches/bulk/dispatch-batch` | Bulk dispatch batch — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-delivery/batches/bulk/cancel-batch` | Bulk cancel batch — body adds `ids: string[]` |
| GET | `/api/v1/admin/bulk-delivery/batches/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-delivery/batches/:batchId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Batch | BDB-2041 |
| `area` | Area | AREA-01 Indiranagar |
| `vehicle` | Vehicle | Bajaj Auto · KA-05 AB 8890 |
| `operator` | Operator | Anil V. |
| `orders` | Orders | 48 |
| `stopsDone` | Stops done | 31 of 48 |
| `distance` | Distance | 19.2 km |
| `status` | Status | In transit |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/assign-vehicle</code> — Assign vehicle</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `vehicle` | enum | yes | KA-05 AB 8890 · Auto · 350 kg · KA-03 IJ 5580 · Auto · 350 kg · KA-01 MH 4412 · Tata Ace · 750 kg · KA-51 CD 1120 · Jeeto · 500 kg · KA-09 GH 2240 · Auto · 350 kg |
| `load` | string | yes | — |
| `check` | enum | yes | Within capacity · Near limit — accept · Exceeds — split required |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/assign-operator</code> — Assign operator</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `operator` | enum | yes | Anil V. · Kiran D. · Suresh N. · Vinod P. · Ramesh Y. · Imtiaz A. · Prakash V. |
| `licence` | enum | yes | LMV — auto · LMV-TR — light transport |
| `report` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/optimise-route</code> — Optimise route</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `basis` | enum | yes | Shortest distance · Fastest duration · Meet every delivery window · Balance distance and windows |
| `locked` | enum | yes | Yes · No — re-sequence everything |
| `start` | enum | yes | Dark store · Vehicle's current position |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/run-dispatch-checklist</code> — Run dispatch checklist</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `orders` | enum | yes | Yes · No — 1 still packing |
| `vehicle2` | enum | yes | Yes · No |
| `operator2` | enum | yes | Yes · No |
| `route3` | enum | yes | Yes · No |
| `exceptions` | enum | yes | Yes · No |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/dispatch-batch</code> — Dispatch batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `time` | string | yes | — |
| `eta` | string | yes | — |
| `notify` | enum | yes | Yes, all stops with ETA · Yes, first stop only · No |
| `docs` | enum | yes | Delivery list + invoices · Delivery list only |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/pause-batch</code> — Pause batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Vehicle issue · Operator break · Weather · Route blocked · Awaiting decision |
| `resume` | string | yes | — |
| `customers` | enum | yes | Yes, with revised ETA · No |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/resume-batch</code> — Resume batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `from` | enum | yes | Next stop in sequence · Re-optimise remaining stops |
| `eta2` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/split-batch</code> — Split batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `into` | enum | yes | 2 trips, same vehicle · 2 vehicles · 3 trips |
| `basis2` | enum | yes | Weight · Geographic cluster · Delivery window · Priority |
| `second` | enum | yes | Same vehicle, return trip · KA-01 MH 4412 · Tata Ace · KA-51 CD 1120 · Jeeto |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/cancel-batch</code> — Cancel batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Too few orders · No vehicle available · No operator available · Area suspended · Orders reassigned to riders |
| `orders2` | enum | yes | Return to bulk queue · Reassign to standard riders · Hold at store |
| `note` | string | yes | — |

</details>

**Existing backend endpoints to reuse:** `POST /api/v1/rider/dispatch/clusters/:clusterId/assign`, `POST /api/v1/rider/dispatch/batch-assign`, `POST /api/v1/rider/dispatch/batch-assign-by-store`, `POST /api/v1/darkstore/outbound/dispatch/batch`, `GET /api/v1/darkstore/outbound/dispatch`, `POST /api/v1/darkstore/outbound/dispatch/assign`

### Load Planning

Route `/bulk-dispatch` · Load planning for bulk B2B dispatches — vehicle assignment, bag loading and route confirmation

**Resource:** `/api/v1/admin/bulk-orders/load-plans`  ·  **Entity:** Load plan  ·  **Record capabilities (design CAP):** create, update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-orders/load-plans` | List records — query: `tab` (`today-s-loads`, `assigned`, `completed`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-orders/load-plans/kpis` | KPI strip (—) |
| GET | `/api/v1/admin/bulk-orders/load-plans/:loadPlanId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/bulk-orders/load-plans` | Create a load plan |
| PATCH | `/api/v1/admin/bulk-orders/load-plans/:loadPlanId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/bulk-orders/load-plans/:loadPlanId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-orders/load-plans/:loadPlanId/match-vehicle` | Match vehicle — advances the flow stage |
| POST | `/api/v1/admin/bulk-orders/load-plans/:loadPlanId/assign-driver` | Assign driver — advances the flow stage |
| POST | `/api/v1/admin/bulk-orders/load-plans/:loadPlanId/split-into-trips` | Split into trips — advances the flow stage |
| POST | `/api/v1/admin/bulk-orders/load-plans/:loadPlanId/dispatch-load` | Dispatch load — advances the flow stage |
| POST | `/api/v1/admin/bulk-orders/load-plans/bulk/match-vehicle` | Bulk match vehicle — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-orders/load-plans/bulk/dispatch-load` | Bulk dispatch load — body adds `ids: string[]` |
| GET | `/api/v1/admin/bulk-orders/load-plans/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-orders/load-plans/:loadPlanId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Load plan | LP-2210 |
| `vehicle` | Vehicle | KA-05-AB-1122 |
| `driver` | Driver | Raju Naik |
| `origin` | Origin | WH-01 Bommasandra |
| `destination` | Destination | Zomato Hyperpure, BTM |
| `bags` | Bags | 18 |
| `weight` | Weight | 480 kg |
| `status` | Status | In progress |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-orders/load-plans/:loadPlanId/match-vehicle</code> — Match vehicle</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `vehicle` | enum | yes | KA-01 MH 4412 · Tata Ace · 750 kg · KA-05 AB 8890 · Bajaj Auto · 350 kg · KA-51 CD 1120 · Mahindra Jeeto · 500 kg · KA-01 EF 7710 · Ashok Leyland Dost · 1,000 kg · KA-09 GH 2240 · Bajaj Auto · 350 kg |
| `weight` | string | yes | — |
| `check` | enum | yes | Within capacity · Needs a second trip |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-orders/load-plans/:loadPlanId/assign-driver</code> — Assign driver</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `driver` | enum | yes | Kiran D. · Anil V. · Suresh N. · Ramesh Y. · Vinod P. · Vikram J. · Imran A. · Naveen R. · Deepak T. |
| `mode` | enum | yes | Single · cycle (1–2 orders) · Single · bike (up to 3 orders) · Bulk · e-auto (40–50 orders) |
| `licence` | enum | yes | Not required — cycle · MCWG — two-wheeler · LMV — e-auto · LMV-TR — light transport |
| `slot` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-orders/load-plans/:loadPlanId/split-into-trips</code> — Split into trips</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `trips` | enum | yes | 2 · 3 |
| `basis` | enum | yes | Weight · Item category · Delivery priority · Chilled and ambient |
| `second` | enum | yes | Same vehicle, return trip · KA-01 MH 4412 · Tata Ace · KA-51 CD 1120 · Mahindra Jeeto |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-orders/load-plans/:loadPlanId/dispatch-load</code> — Dispatch load</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `time` | string | yes | — |
| `eta` | string | yes | — |
| `notify` | enum | yes | Yes, with tracking link · Yes, SMS only · No |
| `note` | string | no | — |

</details>

**Existing backend endpoints to reuse:** (none — needs new endpoints)

### Run Sheet & Stops

Route `/bd-stops` · The stop-by-stop run sheet for one batch — 48 customer orders on one auto, delivered in sequence. Each stop is its own drop with its own outcome.

**Resource:** `/api/v1/admin/bulk-delivery/batches/:batchId/stops`  ·  **Entity:** Stop  ·  **Record capabilities (design CAP):** update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId/stops` | List records — query: `tab` (`run-sheet`, `delivered`, `failed-and-skipped`, `pending`, `re-queued`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/kpis` | KPI strip (Stops on this run, Delivered, Failed, Skipped — retry, Pending, Avg per stop) |
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo` | One record with `stage`, `activity[]` and linked-record references |
| PATCH | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/mark-delivered` | Mark delivered — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/reattempt-stop` | Reattempt stop — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/skip-stop` | Skip stop |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/call-customer` | Call customer |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/move-to-tomorrow` | Move to tomorrow — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/re-queue-at-end-of-run` | Re-queue at end of run — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/report-stop-issue` | Report stop issue |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/bulk/reattempt-stop` | Bulk reattempt stop — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/bulk/skip-stop` | Bulk skip stop — body adds `ids: string[]` |
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId/stops/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Stop | 27 |
| `order` | Order | SEL-104796 |
| `customer` | Customer | Customer ···8830 |
| `address` | Address | 44 Domlur 2nd Stage |
| `bags` | Bags | 2 |
| `arrived` | Arrived | 18:28 |
| `timeAtStop` | Time at stop | 4 min |
| `status` | Status | Failed — unreachable |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/mark-delivered</code> — Mark delivered</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `proof` | enum | yes | OTP verified · Photo at door · Customer signature · Left with security |
| `code` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/reattempt-stop</code> — Reattempt stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `when` | enum | yes | At the end of this run · Next run from this store · Tomorrow's first run |
| `contact` | enum | yes | Yes — call now · Yes — send SMS · No |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/skip-stop</code> — Skip stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `stop5` | enum | yes | Stop 2 · Stop 3 · Stop 5 · Stop 6 |
| `reason` | enum | yes | Customer unavailable · Address not found · Delivery refused · Gate closed · Unsafe to stop |
| `goods` | enum | yes | Return to store on this trip · Reattempt at end of route · Reassign to a rider · Refund and return |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/call-customer</code> — Call customer</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `purpose` | enum | yes | Confirm address · Rider cannot reach · Running late · Delivery attempt · Reschedule |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/move-to-tomorrow</code> — Move to tomorrow</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `slot` | enum | yes | Morning run · Afternoon run · Evening run |
| `goods` | enum | yes | Return to dark store · Hold on vehicle — ambient only |
| `reason` | enum | yes | Customer unavailable · Address not found · Gate closed · Customer rescheduled · Ran out of run time |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/re-queue-at-end-of-run</code> — Re-queue at end of run</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `position` | enum | yes | Last stop · After the next stop · Before the final stop |
| `eta` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/stops/:stopNo/report-stop-issue</code> — Report stop issue</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `issue` | enum | yes | Wrong address · Customer refused · Damaged on arrival · Wrong bag on vehicle · Payment not collected · Safety concern |
| `bag` | string | no | — |
| `action` | enum | yes | Return bag to store · Replace from next run · Refund the customer · Continue the run |
| `note` | string | yes | — |

</details>

**Existing backend endpoints to reuse:** (none — needs new endpoints)

### Route Planning

Route `/bd-route` · Sequence the stops for one batch. Optimise, lock a priority stop, reorder by hand — then compare against the current route before applying.

**Resource:** `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops`  ·  **Entity:** Route  ·  **Record capabilities (design CAP):** update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops` | List records — query: `tab` (`optimised-sequence`, `manual-order`, `route-comparison`, `constraints`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/kpis` | KPI strip (Stops in batch, Batch on the board, Optimised distance, Estimated duration, Locked stop, Saved vs manual) |
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId` | One record with `stage`, `activity[]` and linked-record references |
| PATCH | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/optimise-route` | Optimise route — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/lock-stop` | Lock stop — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/unlock-stop` | Unlock stop — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/move-stop` | Move stop — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/add-stop` | Add stop — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/remove-stop` | Remove stop |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/compare-routes` | Compare routes |
| POST | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/apply-route` | Apply route — advances the flow stage |
| GET | `/api/v1/admin/bulk-delivery/batches/:batchId/route/stops/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Stop | Stop 1 |
| `order` | Order | SEL-104809 |
| `customer` | Customer | Vinod Menon |
| `address` | Address | 88 100ft Rd, Indiranagar |
| `window` | Window | by 19:10 |
| `distanceFromPrevious` | Distance from previous | 0.8 km from store |
| `eta` | ETA | 19:24 |
| `status` | State | Locked — priority |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/optimise-route</code> — Optimise route</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `basis` | enum | yes | Shortest distance · Fastest duration · Meet every delivery window · Balance distance and windows |
| `locked` | enum | yes | Yes · No — re-sequence everything |
| `start` | enum | yes | Dark store · Vehicle's current position |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/lock-stop</code> — Lock stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `stop` | enum | yes | Stop 1 · Stop 2 · Stop 3 · Stop 4 · Stop 5 · Stop 6 |
| `reason` | enum | yes | Customer requested time · Perishable order · Corporate account · Compensation |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/unlock-stop</code> — Unlock stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `stop2` | enum | yes | Stop 1 · Stop 2 · Stop 3 |
| `then` | enum | yes | Re-optimise remaining · Leave sequence as is |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/move-stop</code> — Move stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `stop3` | enum | yes | Stop 2 · Stop 3 · Stop 4 · Stop 5 · Stop 6 |
| `to` | enum | yes | 1 · 2 · 3 · 4 · 5 · 6 |
| `reason` | enum | yes | Local knowledge · Customer request · Traffic · Window pressure |
| `recalc` | enum | yes | Recalculate ETAs · Leave ETAs |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/add-stop</code> — Add stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `order2` | enum | yes | SEL-104815 Karthik S. · SEL-104803 Sneha Gupta · SEL-104827 Girish P. |
| `pos` | enum | yes | Optimal position · End of route · Specific position |
| `impact` | enum | yes | Within capacity and windows · Adds 1.2 km — accept · Breaks a window — reject |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/remove-stop</code> — Remove stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `stop4` | enum | yes | Stop 2 · Stop 3 · Stop 4 · Stop 5 · Stop 6 |
| `what` | enum | yes | Returns to bulk queue · Goes to a standard rider · Held at store |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/compare-routes</code> — Compare routes</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `against` | enum | yes | Current applied route · Manual sequence · Previous version |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/batches/:batchId/route/stops/:stopId/apply-route</code> — Apply route</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `confirm` | enum | yes | Optimised sequence · Manual sequence |
| `lockit` | enum | yes | Yes · No — allow further edits |
| `note` | string | no | — |

</details>

**Existing backend endpoints to reuse:** `POST /api/v1/rider/dispatch/simulate`, `GET /api/v1/warehouse/outbound/routes/:id/map (warehouse outbound — pattern to copy)`, `GET /api/v1/logistics/admin/analytics/cost-per-route`

### Live Vehicle Tracking

Route `/bd-track` · Where each bulk vehicle is right now, which stop it is on, and which customer is next.

**Resource:** `/api/v1/admin/bulk-delivery/trips`  ·  **Entity:** Vehicle  ·  **Record capabilities (design CAP):** read-only (system-generated)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-delivery/trips` | List records — query: `tab` (`on-route`, `running-late`, `at-a-stop`, `paused`, `returned`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-delivery/trips/kpis` | KPI strip (Vehicles on route, Stops remaining, Running late, Paused, Avg stop time, Stops on time) |
| GET | `/api/v1/admin/bulk-delivery/trips/:batchId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/bulk-delivery/trips/:batchId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-delivery/trips/:batchId/track-live` | Track live |
| POST | `/api/v1/admin/bulk-delivery/trips/:batchId/call-operator` | Call operator |
| POST | `/api/v1/admin/bulk-delivery/trips/:batchId/notify-customer` | Notify customer |
| POST | `/api/v1/admin/bulk-delivery/trips/:batchId/skip-stop` | Skip stop |
| POST | `/api/v1/admin/bulk-delivery/trips/:batchId/re-route-remaining` | Re-route remaining — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/trips/:batchId/pause-batch` | Pause batch |
| POST | `/api/v1/admin/bulk-delivery/trips/:batchId/close-trip` | Close trip — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/trips/bulk/notify-customer` | Bulk notify customer — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-delivery/trips/bulk/pause-batch` | Bulk pause batch — body adds `ids: string[]` |
| GET | `/api/v1/admin/bulk-delivery/trips/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-delivery/trips/:batchId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Vehicle | KA-05 AB 8890 · Auto |
| `batch` | Batch | BDB-2041 |
| `operator` | Operator | Anil V. |
| `area` | Area | AREA-01 Indiranagar |
| `currentStop` | Current stop | Stop 4 delivered |
| `nextCustomer` | Next customer | Sana M. · stop 5 |
| `stopsLeft` | Stops left | 2 |
| `status` | Status | In transit |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-delivery/trips/:batchId/track-live</code> — Track live</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `view` | enum | yes | Current position · Route so far · Full trip trail |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/trips/:batchId/call-operator</code> — Call operator</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `purpose` | enum | yes | Position check · Delay reason · Customer cannot be reached · Route guidance · Breakdown · Skip decision |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/trips/:batchId/notify-customer</code> — Notify customer</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `channel` | enum | yes | SMS · WhatsApp · Call · Email |
| `message` | enum | yes | On the way with ETA · Running late · Arriving now · Unloading · Delivered — please sign |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/trips/:batchId/skip-stop</code> — Skip stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `stop5` | enum | yes | Stop 2 · Stop 3 · Stop 5 · Stop 6 |
| `reason` | enum | yes | Customer unavailable · Address not found · Delivery refused · Gate closed · Unsafe to stop |
| `goods` | enum | yes | Return to store on this trip · Reattempt at end of route · Reassign to a rider · Refund and return |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/trips/:batchId/re-route-remaining</code> — Re-route remaining</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `basis3` | enum | yes | Fastest recovery · Windows most at risk first · Shortest remaining distance |
| `skip` | enum | yes | Yes, at the end · No |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/trips/:batchId/pause-batch</code> — Pause batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Vehicle issue · Operator break · Weather · Route blocked · Awaiting decision |
| `resume` | string | yes | — |
| `customers` | enum | yes | Yes, with revised ETA · No |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/trips/:batchId/close-trip</code> — Close trip</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `delivered` | string | yes | — |
| `failed` | string | no | — |
| `odo` | string | no | — |
| `check2` | enum | yes | Yes, at the store · Parked at hub · Still out |
| `note` | string | no | — |

</details>

**Existing backend endpoints to reuse:** `GET /api/v1/rider/dispatch/map`, `GET /api/v1/rider/dispatch/map/riders`, `GET /api/v1/warehouse/outbound/routes/active/map (pattern)`, `socket.io client already wired in src/lib/socket.ts`

### Consignment Tracking

Route `/bulk-track` · Real-time consignment visibility from dispatch to delivery confirmation

**Resource:** `/api/v1/admin/bulk-orders/consignments`  ·  **Entity:** Consignment  ·  **Record capabilities (design CAP):** update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-orders/consignments` | List records — query: `tab` (`active`, `in-transit`, `delivered`, `exceptions`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-orders/consignments/kpis` | KPI strip (—) |
| GET | `/api/v1/admin/bulk-orders/consignments/:consignmentId` | One record with `stage`, `activity[]` and linked-record references |
| PATCH | `/api/v1/admin/bulk-orders/consignments/:consignmentId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/bulk-orders/consignments/:consignmentId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-orders/consignments/:consignmentId/track-live` | Track live |
| POST | `/api/v1/admin/bulk-orders/consignments/:consignmentId/call-operator` | Call operator |
| POST | `/api/v1/admin/bulk-orders/consignments/:consignmentId/notify-customer` | Notify customer |
| POST | `/api/v1/admin/bulk-orders/consignments/:consignmentId/mark-delivered` | Mark delivered — advances the flow stage |
| POST | `/api/v1/admin/bulk-orders/consignments/:consignmentId/close-trip` | Close trip — advances the flow stage |
| POST | `/api/v1/admin/bulk-orders/consignments/bulk/notify-customer` | Bulk notify customer — body adds `ids: string[]` |
| GET | `/api/v1/admin/bulk-orders/consignments/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-orders/consignments/:consignmentId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Consignment | CON-8810 |
| `client` | Client | Zomato Hyperpure |
| `origin` | Origin | WH-01 Bommasandra |
| `destination` | Destination | BTM Layout |
| `vehicle` | Vehicle | KA-05-AB-1122 |
| `dispatched` | Dispatched | 09:30 |
| `eta` | ETA | 11:00 |
| `status` | Status | In transit |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-orders/consignments/:consignmentId/track-live</code> — Track live</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `view` | enum | yes | Current position · Route so far · Full trip trail |

</details>

<details><summary><code>POST /api/v1/admin/bulk-orders/consignments/:consignmentId/call-operator</code> — Call operator</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `purpose` | enum | yes | Position check · Delay reason · Customer cannot be reached · Route guidance · Breakdown · Skip decision |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-orders/consignments/:consignmentId/notify-customer</code> — Notify customer</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `channel` | enum | yes | SMS · WhatsApp · Call · Email |
| `message` | enum | yes | On the way with ETA · Running late · Arriving now · Unloading · Delivered — please sign |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-orders/consignments/:consignmentId/mark-delivered</code> — Mark delivered</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `proof` | enum | yes | OTP verified · Photo at door · Customer signature · Left with security |
| `code` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-orders/consignments/:consignmentId/close-trip</code> — Close trip</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `delivered` | string | yes | — |
| `failed` | string | no | — |
| `odo` | string | no | — |
| `check2` | enum | yes | Yes, at the store · Parked at hub · Still out |
| `note` | string | no | — |

</details>

**Existing backend endpoints to reuse:** (none — needs new endpoints)

### Vehicle Operators

Route `/bd-ops` · Operators who drive the bulk vehicles. They deliver a whole batch stop by stop, unlike riders who take one order at a time.

**Resource:** `/api/v1/admin/bulk-delivery/operators`  ·  **Entity:** Operator  ·  **Record capabilities (design CAP):** create, update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-delivery/operators` | List records — query: `tab` (`all-operators`, `on-route`, `available`, `off-duty`, `licence-check`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-delivery/operators/kpis` | KPI strip (Operators, On route, Available, Off duty, Licence expiring, Avg stops per trip) |
| GET | `/api/v1/admin/bulk-delivery/operators/:operatorId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/bulk-delivery/operators` | Create a operator |
| PATCH | `/api/v1/admin/bulk-delivery/operators/:operatorId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/bulk-delivery/operators/:operatorId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-delivery/operators/:operatorId/assign-vehicle` | Assign vehicle — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/operators/:operatorId/assign-batch` | Assign batch — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/operators/:operatorId/renew-licence` | Renew licence — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/operators/:operatorId/mark-off-duty` | Mark off duty — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/operators/:operatorId/review-performance` | Review performance — advances the flow stage |
| GET | `/api/v1/admin/bulk-delivery/operators/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-delivery/operators/:operatorId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Operator | Anil V. · Operator |
| `licence` | Licence | LMV-TR · to 14 Mar 28 |
| `vehicle` | Vehicle | KA-05 AB 8890 · Auto |
| `area` | Area | AREA-01 Indiranagar |
| `batchesToday` | Batches today | 3 |
| `stopsDelivered` | Stops delivered | 16 |
| `onTime` | On-time | 97% |
| `status` | Status | On route |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-delivery/operators/:operatorId/assign-vehicle</code> — Assign vehicle</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `vehicle` | enum | yes | KA-05 AB 8890 · Auto · 350 kg · KA-03 IJ 5580 · Auto · 350 kg · KA-01 MH 4412 · Tata Ace · 750 kg · KA-51 CD 1120 · Jeeto · 500 kg · KA-09 GH 2240 · Auto · 350 kg |
| `load` | string | yes | — |
| `check` | enum | yes | Within capacity · Near limit — accept · Exceeds — split required |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/operators/:operatorId/assign-batch</code> — Assign batch</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `batch2` | enum | yes | BDB-2046 HSR Layout · 5 stops · BDB-2047 Koramangala · 6 stops |
| `vehicle3` | enum | yes | KA-51 CD 1120 · Jeeto · KA-03 KL 6620 · Tata Ace |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/operators/:operatorId/renew-licence</code> — Renew licence</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `cls` | enum | yes | LMV · LMV-TR · HMV |
| `until` | string | yes | — |
| `ref` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/operators/:operatorId/mark-off-duty</code> — Mark off duty</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Shift ended · Weekly off · Leave · Unwell · Vehicle unavailable |
| `until2` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/operators/:operatorId/review-performance</code> — Review performance</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `period` | enum | yes | Last 30 days · Last quarter · Year to date |
| `verdict` | enum | yes | Promote to preferred · Maintain · Place under review · Reduce allocation |
| `note` | string | yes | — |

</details>

**Existing backend endpoints to reuse:** `GET /api/v1/admin/riders (rider directory — operators are a separate workforce type)`

### Delivery Exceptions

Route `/bd-exceptions` · A failed or blocked stop inside a batch. The rest of the route continues — decide what happens to this one order.

**Resource:** `/api/v1/admin/bulk-delivery/exceptions`  ·  **Entity:** Exception  ·  **Record capabilities (design CAP):** update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/bulk-delivery/exceptions` | List records — query: `tab` (`open`, `customer-issues`, `vehicle-and-route`, `resolved-today`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/bulk-delivery/exceptions/kpis` | KPI strip (Open exceptions, Customer unavailable, Vehicle issue, Address problem, Route blocked, Avg resolution) |
| GET | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId` | One record with `stage`, `activity[]` and linked-record references |
| PATCH | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/reattempt-stop` | Reattempt stop — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/skip-stop` | Skip stop |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/re-route-remaining` | Re-route remaining — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/reassign-to-rider` | Reassign to rider — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/return-to-store` | Return to store — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/refund-order` | Refund order |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/escalate` | Escalate |
| POST | `/api/v1/admin/bulk-delivery/exceptions/:exceptionId/resolve-exception` | Resolve exception — advances the flow stage |
| POST | `/api/v1/admin/bulk-delivery/exceptions/bulk/reattempt-stop` | Bulk reattempt stop — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-delivery/exceptions/bulk/skip-stop` | Bulk skip stop — body adds `ids: string[]` |
| POST | `/api/v1/admin/bulk-delivery/exceptions/bulk/resolve-exception` | Bulk resolve exception — body adds `ids: string[]` |
| GET | `/api/v1/admin/bulk-delivery/exceptions/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/bulk-delivery/exceptions/:exceptionId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Exception | EXC-BD-441 |
| `batch` | Batch | BDB-2043 |
| `stop` | Stop | Stop 3 |
| `order` | Order | SEL-104799 · Manoj Iyer |
| `operator` | Operator | Suresh N. |
| `raised` | Raised | 18:52 |
| `impact` | Impact | Route held 14 min |
| `status` | Status | Customer unavailable |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/bulk-delivery/exceptions/:exceptionId/reattempt-stop</code> — Reattempt stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `when` | enum | yes | At the end of this run · Next run from this store · Tomorrow's first run |
| `contact` | enum | yes | Yes — call now · Yes — send SMS · No |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/exceptions/:exceptionId/skip-stop</code> — Skip stop</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `stop5` | enum | yes | Stop 2 · Stop 3 · Stop 5 · Stop 6 |
| `reason` | enum | yes | Customer unavailable · Address not found · Delivery refused · Gate closed · Unsafe to stop |
| `goods` | enum | yes | Return to store on this trip · Reattempt at end of route · Reassign to a rider · Refund and return |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/exceptions/:exceptionId/re-route-remaining</code> — Re-route remaining</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `basis3` | enum | yes | Fastest recovery · Windows most at risk first · Shortest remaining distance |
| `skip` | enum | yes | Yes, at the end · No |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/exceptions/:exceptionId/reassign-to-rider</code> — Reassign to rider</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `rider` | enum | yes | Vikram J. · Imran A. · Naveen R. · Sameer Q. · Deepak T. |
| `when2` | enum | yes | Vehicle at next stop · Back at the dark store |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/exceptions/:exceptionId/return-to-store</code> — Return to store</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `goods2` | enum | yes | Intact — restock · Perishable — check cold chain · Damaged — write off |
| `refund` | enum | yes | Full refund · Reschedule delivery · Awaiting customer contact |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/exceptions/:exceptionId/refund-order</code> — Refund order</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `scope` | enum | yes | Full order · Delivery fee only · Partial |
| `amount` | string | yes | — |
| `method` | enum | yes | Original payment method · Selorg wallet |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/exceptions/:exceptionId/escalate</code> — Escalate</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `to` | enum | yes | Ops lead · Warehouse manager · Finance admin · Super Admin |
| `severity` | enum | yes | High · Critical |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/bulk-delivery/exceptions/:exceptionId/resolve-exception</code> — Resolve exception</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `outcome` | enum | yes | Delivered on reattempt · Returned to store · Reassigned to rider · Refunded · Customer rescheduled · No action needed |
| `route4` | enum | yes | Continue as planned · Re-optimised · Batch closed early |
| `note` | string | yes | — |

</details>

**Existing backend endpoints to reuse:** `POST /api/v1/admin/support/tickets/:id/redelivery`

### Delivery Fleet

Route `/vehicles` · Two delivery modes from one fleet. Single delivery: a cycle or bike carries 1–3 orders on a short hop. Bulk delivery: an e-auto carries a batch of 40–50 orders and works them one by one.

**Resource:** `/api/v1/admin/fleet/vehicles`  ·  **Entity:** Vehicle  ·  **Record capabilities (design CAP):** create, update, delete

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/fleet/vehicles` | List records — query: `tab` (`all-vehicles`, `e-auto-bulk`, `bike-single`, `cycle-single`, `charging-and-service`, `documents`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/fleet/vehicles/kpis` | KPI strip (Vehicles, E-autos · bulk, Bikes · single, Cycles · single, On a bulk run, Docs expiring) |
| GET | `/api/v1/admin/fleet/vehicles/:vehicleId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/fleet/vehicles` | Create a vehicle |
| PATCH | `/api/v1/admin/fleet/vehicles/:vehicleId` | Edit fields (writes "Record updated" to activity) |
| DELETE | `/api/v1/admin/fleet/vehicles/:vehicleId` | Delete (Super Admin / Operations Admin only) |
| POST | `/api/v1/admin/fleet/vehicles/:vehicleId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/fleet/vehicles/:vehicleId/assign-to-store` | Assign to store — advances the flow stage |
| POST | `/api/v1/admin/fleet/vehicles/:vehicleId/assign-driver` | Assign driver — advances the flow stage |
| POST | `/api/v1/admin/fleet/vehicles/:vehicleId/set-delivery-mode` | Set delivery mode — advances the flow stage |
| POST | `/api/v1/admin/fleet/vehicles/:vehicleId/log-maintenance` | Log maintenance — advances the flow stage |
| POST | `/api/v1/admin/fleet/vehicles/:vehicleId/renew-document` | Renew document — advances the flow stage |
| POST | `/api/v1/admin/fleet/vehicles/:vehicleId/mark-available` | Mark available — advances the flow stage |
| POST | `/api/v1/admin/fleet/vehicles/:vehicleId/retire-vehicle` | Retire vehicle |
| POST | `/api/v1/admin/fleet/vehicles/bulk/assign-to-store` | Bulk assign to store — body adds `ids: string[]` |
| POST | `/api/v1/admin/fleet/vehicles/bulk/log-maintenance` | Bulk log maintenance — body adds `ids: string[]` |
| GET | `/api/v1/admin/fleet/vehicles/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/fleet/vehicles/:vehicleId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Vehicle | KA-01 MH 4412 · Mahindra Treo |
| `mode` | Mode | E-auto · bulk |
| `homeDarkStore` | Home dark store | DS-01 Indiranagar |
| `capacity` | Capacity | 52 orders |
| `operator` | Operator | Kiran D. |
| `tripsToday` | Trips today | 2 |
| `utilisation` | Utilisation | 92% |
| `status` | Status | On a bulk run |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/fleet/vehicles/:vehicleId/assign-to-store</code> — Assign to store</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `store` | enum | yes | DS-01 Indiranagar · DS-02 Koramangala · DS-03 HSR Layout · DS-04 Whitefield · DS-05 Jayanagar |
| `shift` | enum | yes | Shift 1 (06–14) · Shift 2 (14–22) · Shift 3 (22–06) |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/fleet/vehicles/:vehicleId/assign-driver</code> — Assign driver</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `driver` | enum | yes | Kiran D. · Anil V. · Suresh N. · Ramesh Y. · Vinod P. · Vikram J. · Imran A. · Naveen R. · Deepak T. |
| `mode` | enum | yes | Single · cycle (1–2 orders) · Single · bike (up to 3 orders) · Bulk · e-auto (40–50 orders) |
| `licence` | enum | yes | Not required — cycle · MCWG — two-wheeler · LMV — e-auto · LMV-TR — light transport |
| `slot` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/fleet/vehicles/:vehicleId/set-delivery-mode</code> — Set delivery mode</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `mode` | enum | yes | Single · cycle (1–2 orders) · Single · bike (up to 3 orders) · Bulk · e-auto (40–50 orders) |
| `radius` | enum | yes | 2 km · 4 km · 6 km · Whole zone |
| `from` | enum | yes | Next shift · Immediately |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/fleet/vehicles/:vehicleId/log-maintenance</code> — Log maintenance</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `type` | enum | yes | Scheduled service · Repair · Tyres · Battery · Bodywork |
| `from` | string | yes | — |
| `days` | enum | yes | 1 · 2 · 3 · 5 · 7+ |
| `cost` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/fleet/vehicles/:vehicleId/renew-document</code> — Renew document</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `doc` | enum | yes | Insurance · Fitness certificate · Permit · Pollution certificate · Road tax |
| `until` | string | yes | — |
| `ref` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/fleet/vehicles/:vehicleId/mark-available</code> — Mark available</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `check` | enum | yes | Service complete · Documents current · Driver assigned |
| `store` | enum | yes | DS-01 Indiranagar · DS-02 Koramangala · DS-03 HSR Layout · DS-04 Whitefield · DS-05 Jayanagar |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/fleet/vehicles/:vehicleId/retire-vehicle</code> — Retire vehicle</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | End of lease · Beyond economical repair · Sold · Replaced · Failed fitness |
| `when` | enum | yes | Immediately · End of month |
| `note` | string | yes | — |

</details>

**Existing backend endpoints to reuse:** `GET /api/v1/rider/fleet`, `GET /api/v1/rider/fleet/summary`, `GET /api/v1/rider/fleet/vehicles`, `POST /api/v1/rider/fleet/vehicles`, `GET /api/v1/rider/fleet/vehicles/:vehicleId`, `PUT /api/v1/rider/fleet/vehicles/:vehicleId`, `DELETE /api/v1/rider/fleet/:vehicleId`, `GET /api/v1/rider/fleet/maintenance`, `POST /api/v1/rider/fleet/maintenance`, `PUT /api/v1/rider/fleet/maintenance/:taskId`, `GET/POST/PUT/DELETE /api/v1/admin/vehicle-types`

### Bulk Orders (B2B)

Route `/bulk-orders` (bespoke page, `src/modules/bulkOrders`). Contract = `BulkOrderService` in `src/services/bulkOrders/bulkOrderService.ts`.

| Method | Path | Purpose / body |
|---|---|---|
| GET | `/api/v1/admin/bulk-orders` | List — query `q`, `status` (Pending, Processing, Ready for Delivery, Out for Delivery, Delivered, Cancelled), `paymentStatus` (Paid, Pending, Partially paid, Refunded, Failed), `from`, `to` (order date), `page` |
| GET | `/api/v1/admin/bulk-orders/:bulkOrderId` | Order with `items[]`, totals, `picker`, `rider`, `history[]` |
| POST | `/api/v1/admin/bulk-orders` | Create — `{ business, contactName, phone, email, address, store, deliveryDate, slot, paymentMethod, items: [{ sku, qty }] }`; server prices items and returns `BLK-xxxx` |
| POST | `/api/v1/admin/bulk-orders/:id/status` | `{ status, note? }` — forward-only; advancing records every intermediate timeline stage; `Out for Delivery` requires a rider (409 otherwise) |
| POST | `/api/v1/admin/bulk-orders/:id/payment-status` | `{ paymentStatus }` |
| POST | `/api/v1/admin/bulk-orders/:id/assign-picker` | `{ pickerId }` — on a Processing order this starts Picking |
| POST | `/api/v1/admin/bulk-orders/:id/assign-rider` | `{ riderId }` — on a Ready order this records Rider Assigned |
| POST | `/api/v1/admin/bulk-orders/:id/cancel` | `{ note }` — not allowed once Delivered |
| GET | `/api/v1/admin/bulk-orders/products` | Orderable B2B SKUs with unit price |

Timeline stages: Order Created → Payment Confirmed → Processing → Picking → Packed → Ready for Delivery → Rider Assigned → Out for Delivery → Delivered.
Reuses *existing* `GET /api/v1/admin/riders` and the picker directory for the assignment pickers.

### Riders & Live (existing)

Bespoke page already on the real API — `GET /api/v1/admin/riders`, `/api/v1/rider/*` (see `src/services/riders/ridersService.real.ts`). No change.

### Zones & Maps (existing)

Generic workspace on the real API — *existing* `GET/POST /api/v1/admin/zones`, `GET/PUT/DELETE /api/v1/admin/zones/:id`, plus `/api/v1/merch/geofence/zones`. No change.

## Container Stalls module

Physical container stalls that convert walk-up customers into app users. Each **area** is 10 stores:
1 main dark store holding all stock + 9 container stores (stalls) that hold no sellable stock — every
order a stall generates is fulfilled by the area's dark store. **No backend exists for this module yet.**

### Network Overview

Route `/stall-overview` · How the whole stall network is performing — 4 areas, 36 stalls, and every customer they brought onto the app today.

**Resource:** `/api/v1/admin/stalls/overview`  ·  **Entity:** Area  ·  **Record capabilities (design CAP):** read-only (system-generated)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stalls/overview` | Summary for the screen — query: `tab` (`network-today`, `by-area`, `funnel`, `alerts`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stalls/overview/kpis` | KPI strip (Areas, Container stalls, Active, Interactions today, First orders, Conversion rate) |
| GET | `/api/v1/admin/stalls/overview/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

### Areas & Mapping

Route `/stall-areas` · Ten stores per area: 1 main dark store holding and supplying all stock, plus 9 container stores for promotion and conversion. Container stores hold no sellable stock — every order they generate is fulfilled by the area's dark store.

**Resource:** `/api/v1/admin/stall-areas`  ·  **Entity:** Area  ·  **Record capabilities (design CAP):** create, update, delete

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stall-areas` | List records — query: `tab` (`all-areas`, `complete-10-of-10`, `gaps`, `under-review`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stall-areas/kpis` | KPI strip (Areas, Main dark stores, Container stores, Stores total (4 × 10), Container stores live, Attributed revenue) |
| GET | `/api/v1/admin/stall-areas/:areaId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/stall-areas` | Create a area |
| PATCH | `/api/v1/admin/stall-areas/:areaId` | Edit fields (writes "Record updated" to activity) |
| DELETE | `/api/v1/admin/stall-areas/:areaId` | Delete (Super Admin / Operations Admin only) |
| POST | `/api/v1/admin/stall-areas/:areaId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stall-areas/:areaId/map-dark-store` | Map dark store — advances the flow stage |
| POST | `/api/v1/admin/stall-areas/:areaId/plan-stalls` | Plan stalls — advances the flow stage |
| POST | `/api/v1/admin/stall-areas/:areaId/set-area-target` | Set area target — advances the flow stage |
| POST | `/api/v1/admin/stall-areas/:areaId/review-performance` | Review performance — advances the flow stage |
| GET | `/api/v1/admin/stall-areas/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stall-areas/:areaId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Area | AREA-01 Indiranagar |
| `mainDarkStore` | Main dark store (stock) | IND-DS-001 · DS-01 · supplies all 9 |
| `containerStores` | Container stores | 9 of 9 |
| `employees` | Employees | 9 |
| `interactionsToday` | Interactions today | 248 |
| `conversionsToday` | Conversions today | 46 |
| `conversionRate` | Conversion rate | 18.5% |
| `status` | Status | 10 of 10 live |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stall-areas/:areaId/map-dark-store</code> — Map dark store</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `store` | enum | yes | DS-01 Indiranagar · DS-02 Koramangala · DS-03 HSR Layout · DS-04 Whitefield · DS-05 Jayanagar |
| `distance` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-areas/:areaId/plan-stalls</code> — Plan stalls</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `count` | enum | yes | 1 · 2 · 3 · 4 · 9 |
| `when` | string | yes | — |
| `owner` | enum | yes | Field ops · Nisha · Field ops · Arjun · Marketing · Pooja |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-areas/:areaId/set-area-target</code> — Set area target</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `metric` | enum | yes | First orders per day · Conversion rate · Interactions per stall |
| `value` | string | yes | — |
| `period` | enum | yes | Weekly · Monthly |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-areas/:areaId/review-performance</code> — Review performance</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `period` | enum | yes | Last 30 days · Last quarter · Year to date |
| `verdict` | enum | yes | Promote to preferred · Maintain · Place under review · Reduce allocation |
| `note` | string | yes | — |

</details>

### Stall Directory

Route `/stalls` · Every physical container stall — where it stands, who runs it, and how many customers it converted today.

**Resource:** `/api/v1/admin/stalls`  ·  **Entity:** Container stall  ·  **Record capabilities (design CAP):** create, update, delete

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stalls` | List records — query: `tab` (`all-stalls`, `active`, `setup-pending`, `closed-and-maintenance`, `unassigned`, `top-performing`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stalls/kpis` | KPI strip (Stalls, Active, Setup pending, Temporarily closed, Maintenance, Interactions today) |
| GET | `/api/v1/admin/stalls/:stallId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/stalls` | Create a container stall |
| PATCH | `/api/v1/admin/stalls/:stallId` | Edit fields (writes "Record updated" to activity) |
| DELETE | `/api/v1/admin/stalls/:stallId` | Delete (Super Admin / Operations Admin only) |
| POST | `/api/v1/admin/stalls/:stallId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stalls/:stallId/assign-employee` | Assign employee — advances the flow stage |
| POST | `/api/v1/admin/stalls/:stallId/change-status` | Change status — advances the flow stage |
| POST | `/api/v1/admin/stalls/:stallId/assign-advertisement` | Assign advertisement — advances the flow stage |
| POST | `/api/v1/admin/stalls/:stallId/allocate-samples` | Allocate samples — advances the flow stage |
| POST | `/api/v1/admin/stalls/:stallId/edit-stall` | Edit stall — advances the flow stage |
| POST | `/api/v1/admin/stalls/:stallId/close-temporarily` | Close temporarily |
| POST | `/api/v1/admin/stalls/:stallId/deactivate-stall` | Deactivate stall |
| POST | `/api/v1/admin/stalls/bulk/assign-advertisement` | Bulk assign advertisement — body adds `ids: string[]` |
| POST | `/api/v1/admin/stalls/bulk/allocate-samples` | Bulk allocate samples — body adds `ids: string[]` |
| POST | `/api/v1/admin/stalls/bulk/change-status` | Bulk change status — body adds `ids: string[]` |
| GET | `/api/v1/admin/stalls/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stalls/:stallId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Stall | CS-001 Indiranagar 100ft |
| `area` | Area | AREA-01 Indiranagar |
| `location` | Location | 100ft Rd, near Sony signal |
| `employee` | Employee | Kavya Shetty |
| `visitorsToday` | Visitors today | 42 |
| `downloads` | Downloads | 26 |
| `firstOrders` | First orders | 11 |
| `status` | Status | Active |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stalls/:stallId/assign-employee</code> — Assign employee</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `who` | enum | yes | EMP-121 Vinod Kumar · EMP-124 Sneha D. · New hire — create record |
| `from` | string | yes | — |
| `shift` | enum | yes | 09:00–18:00 · 10:00–19:00 · 11:00–20:00 |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stalls/:stallId/change-status</code> — Change status</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `status` | enum | yes | Planned · Setup pending · Active · Temporarily closed · Maintenance · Inactive |
| `reason` | enum | yes | Site ready · Permit received · Permit issue · Structure repair · Low footfall · Relocating · Seasonal |
| `until` | string | no | — |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stalls/:stallId/assign-advertisement</code> — Assign advertisement</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `ad` | enum | yes | Monsoon Fresh Launch · First Order Free Delivery · Dairy Under ₹99 · Onam Special · Weekend Sampling Drive |
| `from` | string | yes | — |
| `to` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stalls/:stallId/allocate-samples</code> — Allocate samples</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `product` | enum | yes | Organic Tomato 100g pack · Amul Gold Milk 200ml · Paneer 50g cube · Yoghurt 80g cup · Cold Pressed Oil 50ml · Farm Eggs 2pc · Basmati Rice 100g |
| `qty` | string | yes | — |
| `from` | string | yes | — |
| `to` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stalls/:stallId/edit-stall</code> — Edit stall</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `name` | string | yes | — |
| `address` | string | yes | — |
| `hours` | string | yes | — |
| `days` | enum | yes | All days · Mon–Sat · Weekends only |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stalls/:stallId/close-temporarily</code> — Close temporarily</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Permit issue · Weather · Local event · Employee on leave · Low footfall · Relocating |
| `until` | string | yes | — |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stalls/:stallId/deactivate-stall</code> — Deactivate stall</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Site lost · Persistently low conversion · Area restructure · Permit revoked · Replaced by new stall |
| `staff` | enum | yes | Reassign to another stall · Move to unassigned pool · Exiting the company |
| `note` | string | yes | — |

</details>

### Stall Employees

Route `/stall-staff` · Field employees who run the stalls — they explain Selorg, hand out samples and help customers install the app and place a first order.

**Resource:** `/api/v1/admin/stall-employees`  ·  **Entity:** Stall employee  ·  **Record capabilities (design CAP):** create, update, delete

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stall-employees` | List records — query: `tab` (`all-employees`, `active`, `unassigned`, `on-leave`, `top-converters`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stall-employees/kpis` | KPI strip (Employees, Active, On leave, Unassigned, Avg fixed salary, Avg incentive) |
| GET | `/api/v1/admin/stall-employees/:employeeId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/stall-employees` | Create a stall employee |
| PATCH | `/api/v1/admin/stall-employees/:employeeId` | Edit fields (writes "Record updated" to activity) |
| DELETE | `/api/v1/admin/stall-employees/:employeeId` | Delete (Super Admin / Operations Admin only) |
| POST | `/api/v1/admin/stall-employees/:employeeId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stall-employees/:employeeId/assign-to-stall` | Assign to stall — advances the flow stage |
| POST | `/api/v1/admin/stall-employees/:employeeId/reassign-stall` | Reassign stall — advances the flow stage |
| POST | `/api/v1/admin/stall-employees/:employeeId/set-fixed-salary` | Set fixed salary — advances the flow stage |
| POST | `/api/v1/admin/stall-employees/:employeeId/mark-on-leave` | Mark on leave — advances the flow stage |
| POST | `/api/v1/admin/stall-employees/:employeeId/review-performance` | Review performance — advances the flow stage |
| POST | `/api/v1/admin/stall-employees/:employeeId/suspend-employee` | Suspend employee |
| POST | `/api/v1/admin/stall-employees/bulk/assign-to-stall` | Bulk assign to stall — body adds `ids: string[]` |
| POST | `/api/v1/admin/stall-employees/bulk/set-fixed-salary` | Bulk set fixed salary — body adds `ids: string[]` |
| GET | `/api/v1/admin/stall-employees/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stall-employees/:employeeId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Employee | EMP-102 Bhavana S. |
| `area` | Area | AREA-03 HSR Layout |
| `stall` | Stall | CS-019 HSR Sector 2 |
| `interactionsToday` | Interactions today | 48 |
| `conversions` | Conversions | 14 |
| `orders` | Orders | 42 |
| `fixedSalary` | Fixed salary | ₹18,000 |
| `status` | Status | Active |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stall-employees/:employeeId/assign-to-stall</code> — Assign to stall</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `area` | enum | yes | AREA-01 Indiranagar · AREA-02 Koramangala · AREA-03 HSR Layout · AREA-04 Whitefield |
| `stall` | enum | yes | CS-014 Koramangala 8th · CS-033 Whitefield Hope Farm · CS-035 Whitefield Kadugodi |
| `from` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-employees/:employeeId/reassign-stall</code> — Reassign stall</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `stall` | enum | yes | CS-014 Koramangala 8th · CS-033 Whitefield Hope Farm · CS-035 Whitefield Kadugodi |
| `from` | string | yes | — |
| `reason` | enum | yes | Performance · Stall closed · Employee request · Area rebalance · Cover for leave |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-employees/:employeeId/set-fixed-salary</code> — Set fixed salary</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `amount` | string | yes | — |
| `from` | string | yes | — |
| `reason` | enum | yes | New hire · Annual revision · Promotion · Correction · Role change |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-employees/:employeeId/mark-on-leave</code> — Mark on leave</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `type` | enum | yes | Casual · Sick · Unpaid · Emergency |
| `from` | string | yes | — |
| `to` | string | yes | — |
| `cover` | enum | yes | Reassign a colleague · Close stall temporarily · Leave unattended |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-employees/:employeeId/review-performance</code> — Review performance</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `period` | enum | yes | Last 30 days · Last quarter · Year to date |
| `verdict` | enum | yes | Promote to preferred · Maintain · Place under review · Reduce allocation |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-employees/:employeeId/suspend-employee</code> — Suspend employee</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Conduct · Falsified conversions · Sample misuse · Repeated absence · Under investigation |
| `length` | enum | yes | Pending review · 7 days · 30 days · Indefinite |
| `pay` | enum | yes | Salary only, no incentive · Withhold both · Full pay |
| `note` | string | yes | — |

</details>

### Customer Conversions

Route `/stall-conv` · Interaction → app download → registration → first order → delivered. Every conversion is attributed to an area, stall and employee.

**Resource:** `/api/v1/admin/stall-conversions`  ·  **Entity:** Conversion  ·  **Record capabilities (design CAP):** read-only (system-generated)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stall-conversions` | List records — query: `tab` (`today-s-conversions`, `completed`, `dropped-after-download`, `registered-no-order`, `order-failed`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stall-conversions/kpis` | KPI strip (Interactions today, App downloads, Registrations, First orders, Delivered, Interaction to order) |
| GET | `/api/v1/admin/stall-conversions/:conversionId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/stall-conversions/:conversionId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stall-conversions/:conversionId/view-attribution` | View attribution |
| POST | `/api/v1/admin/stall-conversions/:conversionId/open-customer` | Open customer |
| POST | `/api/v1/admin/stall-conversions/:conversionId/reattribute-conversion` | Reattribute conversion |
| POST | `/api/v1/admin/stall-conversions/:conversionId/flag-as-invalid` | Flag as invalid |
| POST | `/api/v1/admin/stall-conversions/bulk/flag-as-invalid` | Bulk flag as invalid — body adds `ids: string[]` |
| GET | `/api/v1/admin/stall-conversions/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stall-conversions/:conversionId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Conversion | CNV-9041 |
| `stall` | Stall | CS-019 HSR Sector 2 |
| `employee` | Employee | EMP-102 Bhavana S. |
| `customer` | Customer | Customer ···8841 |
| `downloaded` | Downloaded | 11:04 |
| `registered` | Registered | 11:09 |
| `firstOrder` | First order | SEL-104822 · ₹1,284 |
| `status` | Status | Delivered |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stall-conversions/:conversionId/view-attribution</code> — View attribution</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `depth` | enum | yes | Area, stall and employee · Full journey to delivery · Incentive impact |

</details>

<details><summary><code>POST /api/v1/admin/stall-conversions/:conversionId/open-customer</code> — Open customer</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `view` | enum | yes | Customer profile · Order history · Acquisition source |

</details>

<details><summary><code>POST /api/v1/admin/stall-conversions/:conversionId/reattribute-conversion</code> — Reattribute conversion</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `to` | enum | yes | Different stall · Different employee · Organic — no stall |
| `stall` | enum | yes | CS-001 Indiranagar 100ft · CS-010 Koramangala 5th · CS-019 HSR Sector 2 · CS-028 Whitefield ITPL |
| `reason` | enum | yes | Wrong stall recorded · Employee changed mid-interaction · Customer already registered · Duplicate record |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-conversions/:conversionId/flag-as-invalid</code> — Flag as invalid</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `reason` | enum | yes | Customer already existed · Self-registered by employee · Duplicate device · Order cancelled immediately · Suspected fraud |
| `incentive` | enum | yes | Reverse the incentive · Leave incentive in place |
| `note` | string | yes | — |

</details>

### Stall Orders

Route `/stall-orders` · Orders that exist because a stall converted the customer — each one routed to the dark store mapped to that stall's area.

**Resource:** `/api/v1/admin/stall-orders`  ·  **Entity:** Stall order  ·  **Record capabilities (design CAP):** read-only (system-generated)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stall-orders` | List records — query: `tab` (`all-stall-orders`, `first-orders`, `repeat-orders`, `delivered`, `failed`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stall-orders/kpis` | KPI strip (Stall orders today, Revenue attributed, Avg order value, First orders, Failed, Share of area orders) |
| GET | `/api/v1/admin/stall-orders/:orderId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/stall-orders/:orderId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stall-orders/:orderId/open-order` | Open order |
| POST | `/api/v1/admin/stall-orders/:orderId/view-attribution` | View attribution |
| POST | `/api/v1/admin/stall-orders/:orderId/reattribute-conversion` | Reattribute conversion |
| GET | `/api/v1/admin/stall-orders/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stall-orders/:orderId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Order | SEL-104822 |
| `customer` | Customer | Customer ···8841 |
| `stall` | Stall | CS-019 HSR Sector 2 |
| `employee` | Employee | EMP-102 Bhavana S. |
| `darkStore` | Dark store | HSR-DS-003 |
| `value` | Value | ₹1,284 |
| `placed` | Placed | 11:09 |
| `status` | Status | Delivered |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stall-orders/:orderId/open-order</code> — Open order</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `view` | enum | yes | Order workspace · Picking task · Delivery tracking |

</details>

<details><summary><code>POST /api/v1/admin/stall-orders/:orderId/view-attribution</code> — View attribution</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `depth` | enum | yes | Area, stall and employee · Full journey to delivery · Incentive impact |

</details>

<details><summary><code>POST /api/v1/admin/stall-orders/:orderId/reattribute-conversion</code> — Reattribute conversion</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `to` | enum | yes | Different stall · Different employee · Organic — no stall |
| `stall` | enum | yes | CS-001 Indiranagar 100ft · CS-010 Koramangala 5th · CS-019 HSR Sector 2 · CS-028 Whitefield ITPL |
| `reason` | enum | yes | Wrong stall recorded · Employee changed mid-interaction · Customer already registered · Duplicate record |
| `note` | string | yes | — |

</details>

### Advertisements

Route `/stall-ads` · Advertising and promotional material running at the stalls — assigned by area or to specific stalls, with a live window.

**Resource:** `/api/v1/admin/stall-ads`  ·  **Entity:** Advertisement  ·  **Record capabilities (design CAP):** create, update, delete

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stall-ads` | List records — query: `tab` (`all-campaigns`, `running`, `scheduled`, `draft`, `ended`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stall-ads/kpis` | KPI strip (Campaigns, Running, Scheduled, Ended, Stalls covered, Spend this month) |
| GET | `/api/v1/admin/stall-ads/:adId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/stall-ads` | Create a advertisement |
| PATCH | `/api/v1/admin/stall-ads/:adId` | Edit fields (writes "Record updated" to activity) |
| DELETE | `/api/v1/admin/stall-ads/:adId` | Delete (Super Admin / Operations Admin only) |
| POST | `/api/v1/admin/stall-ads/:adId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stall-ads/:adId/assign-to-stalls` | Assign to stalls — advances the flow stage |
| POST | `/api/v1/admin/stall-ads/:adId/schedule-campaign` | Schedule campaign — advances the flow stage |
| POST | `/api/v1/admin/stall-ads/:adId/replace-creative` | Replace creative — advances the flow stage |
| POST | `/api/v1/admin/stall-ads/:adId/extend-window` | Extend window — advances the flow stage |
| POST | `/api/v1/admin/stall-ads/:adId/end-campaign` | End campaign |
| POST | `/api/v1/admin/stall-ads/bulk/assign-to-stalls` | Bulk assign to stalls — body adds `ids: string[]` |
| POST | `/api/v1/admin/stall-ads/bulk/schedule-campaign` | Bulk schedule campaign — body adds `ids: string[]` |
| POST | `/api/v1/admin/stall-ads/bulk/end-campaign` | Bulk end campaign — body adds `ids: string[]` |
| GET | `/api/v1/admin/stall-ads/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stall-ads/:adId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Advertisement | Monsoon Fresh Launch |
| `type` | Type | Standee + poster |
| `campaign` | Campaign | Monsoon Fresh |
| `areas` | Areas | All 4 areas |
| `stalls` | Stalls | 31 |
| `window` | Window | 18–31 Aug |
| `interactions` | Interactions | 2,840 |
| `status` | Status | Running |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stall-ads/:adId/assign-to-stalls</code> — Assign to stalls</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `scope` | enum | yes | All active stalls · One area · Selected stalls |
| `area` | enum | no | AREA-01 Indiranagar · AREA-02 Koramangala · AREA-03 HSR Layout · AREA-04 Whitefield |
| `from` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-ads/:adId/schedule-campaign</code> — Schedule campaign</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `start` | string | yes | — |
| `end` | string | yes | — |
| `stalls` | string | yes | — |
| `spend` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-ads/:adId/replace-creative</code> — Replace creative</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `asset` | enum | yes | banner-monsoon-hero.jpg · banner-dairy-99.jpg · onam-hero-v2.jpg · Upload new |
| `type` | enum | yes | Poster · Standee · Banner · Digital creative |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-ads/:adId/extend-window</code> — Extend window</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `until` | string | yes | — |
| `budget` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-ads/:adId/end-campaign</code> — End campaign</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `when` | enum | yes | Immediately · End of day · End of week |
| `reason` | enum | yes | Budget met · Target achieved · Low ROI · Replaced |
| `note` | string | yes | — |

</details>

### Product Samples

Route `/stall-samples` · Product samples allocated to stalls for tasting and giveaway. Tracked as marketing stock, separate from saleable inventory.

**Resource:** `/api/v1/admin/stall-sample-allocations`  ·  **Entity:** Sample allocation  ·  **Record capabilities (design CAP):** create, update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stall-sample-allocations` | List records — query: `tab` (`active-allocations`, `exhausted`, `awaiting-approval`, `reconciled`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stall-sample-allocations/kpis` | KPI strip (Active allocations, Units allocated, Distributed, Remaining, Exhausted, Distribution rate) |
| GET | `/api/v1/admin/stall-sample-allocations/:allocationId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/stall-sample-allocations` | Create a sample allocation |
| PATCH | `/api/v1/admin/stall-sample-allocations/:allocationId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/stall-sample-allocations/:allocationId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stall-sample-allocations/:allocationId/approve-allocation` | Approve allocation — advances the flow stage |
| POST | `/api/v1/admin/stall-sample-allocations/:allocationId/allocate-samples` | Allocate samples — advances the flow stage |
| POST | `/api/v1/admin/stall-sample-allocations/:allocationId/record-distribution` | Record distribution — advances the flow stage |
| POST | `/api/v1/admin/stall-sample-allocations/:allocationId/reconcile-allocation` | Reconcile allocation — advances the flow stage |
| POST | `/api/v1/admin/stall-sample-allocations/:allocationId/reorder-samples` | Reorder samples — advances the flow stage |
| POST | `/api/v1/admin/stall-sample-allocations/bulk/approve-allocation` | Bulk approve allocation — body adds `ids: string[]` |
| POST | `/api/v1/admin/stall-sample-allocations/bulk/reorder-samples` | Bulk reorder samples — body adds `ids: string[]` |
| GET | `/api/v1/admin/stall-sample-allocations/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stall-sample-allocations/:allocationId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Allocation | SMP-4041 |
| `product` | Product | Organic Tomato 100g pack |
| `stall` | Stall | CS-019 HSR Sector 2 |
| `employee` | Employee | EMP-102 Bhavana S. |
| `allocated` | Allocated | 600 |
| `distributed` | Distributed | 482 |
| `remaining` | Remaining | 118 |
| `status` | Status | Distributing |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stall-sample-allocations/:allocationId/approve-allocation</code> — Approve allocation</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `qty` | string | yes | — |
| `from` | enum | yes | Marketing stock · Warehouse — marketing account · Vendor sample supply |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-sample-allocations/:allocationId/allocate-samples</code> — Allocate samples</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `product` | enum | yes | Organic Tomato 100g pack · Amul Gold Milk 200ml · Paneer 50g cube · Yoghurt 80g cup · Cold Pressed Oil 50ml · Farm Eggs 2pc · Basmati Rice 100g |
| `qty` | string | yes | — |
| `from` | string | yes | — |
| `to` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-sample-allocations/:allocationId/record-distribution</code> — Record distribution</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `qty` | string | yes | — |
| `date` | string | yes | — |
| `interactions` | string | no | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-sample-allocations/:allocationId/reconcile-allocation</code> — Reconcile allocation</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `distributed` | string | yes | — |
| `returned` | string | no | — |
| `wastage` | string | no | — |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-sample-allocations/:allocationId/reorder-samples</code> — Reorder samples</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `qty` | string | yes | — |
| `priority` | enum | yes | Urgent — stall idle · Normal · Next cycle |
| `note` | string | no | — |

</details>

### Incentive Rules

Route `/stall-incentives` · What a stall employee earns on top of fixed salary. Rules are versioned — editing an active rule creates a new version.

**Resource:** `/api/v1/admin/stall-incentive-rules`  ·  **Entity:** Incentive rule  ·  **Record capabilities (design CAP):** create, update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stall-incentive-rules` | List records — query: `tab` (`active-rules`, `conversion-rules`, `volume-rules`, `scheduled`, `version-history`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stall-incentive-rules/kpis` | KPI strip (Active rules, Conversion-based, Volume-based, Scheduled, Conflicts, Latest version) |
| GET | `/api/v1/admin/stall-incentive-rules/:ruleId` | One record with `stage`, `activity[]` and linked-record references |
| POST | `/api/v1/admin/stall-incentive-rules` | Create a incentive rule |
| PATCH | `/api/v1/admin/stall-incentive-rules/:ruleId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/stall-incentive-rules/:ruleId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stall-incentive-rules/:ruleId/preview-incentive` | Preview incentive |
| POST | `/api/v1/admin/stall-incentive-rules/:ruleId/create-new-version` | Create new version — advances the flow stage |
| POST | `/api/v1/admin/stall-incentive-rules/:ruleId/submit-for-approval` | Submit for approval — advances the flow stage |
| POST | `/api/v1/admin/stall-incentive-rules/:ruleId/approve-rule` | Approve rule — advances the flow stage |
| POST | `/api/v1/admin/stall-incentive-rules/:ruleId/schedule-rule` | Schedule rule — advances the flow stage |
| POST | `/api/v1/admin/stall-incentive-rules/:ruleId/expire-rule` | Expire rule |
| GET | `/api/v1/admin/stall-incentive-rules/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stall-incentive-rules/:ruleId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Rule | SIN-301 First order bounty |
| `appliesTo` | Applies to | Stall employee |
| `metric` | Metric | First orders |
| `condition` | Condition | Every verified first order |
| `reward` | Reward | ₹50 |
| `scope` | Scope | Global |
| `version` | Version | v3 |
| `status` | Status | Active |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stall-incentive-rules/:ruleId/preview-incentive</code> — Preview incentive</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `interactions` | string | yes | — |
| `registrations` | string | yes | — |
| `orders` | string | yes | — |
| `value` | string | no | — |
| `area` | enum | yes | Global rules only · AREA-04 Whitefield · AREA-03 HSR Layout |

</details>

<details><summary><code>POST /api/v1/admin/stall-incentive-rules/:ruleId/create-new-version</code> — Create new version</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `change` | enum | yes | Amount · Condition · Scope · Effective dates |
| `value` | string | yes | — |
| `from` | string | yes | — |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-incentive-rules/:ruleId/submit-for-approval</code> — Submit for approval</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `approver` | enum | yes | Finance Admin · Super Admin |
| `effective` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-incentive-rules/:ruleId/approve-rule</code> — Approve rule</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `scope` | enum | yes | This version only · Version and schedule |
| `effective` | string | yes | — |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-incentive-rules/:ruleId/schedule-rule</code> — Schedule rule</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `start` | string | yes | — |
| `end` | string | no | — |
| `scope` | enum | yes | Global · Bengaluru · Single dark store |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-incentive-rules/:ruleId/expire-rule</code> — Expire rule</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `when` | enum | yes | Immediately · End of today · End of cycle |
| `replace` | enum | yes | Nothing · New version · Different rule |
| `note` | string | yes | — |

</details>

### Employee Earnings

Route `/stall-earnings` · Fixed salary plus incentive for each stall employee. Salary is monthly; incentive accrues on verified conversions and is paid with it.

**Resource:** `/api/v1/admin/stall-earnings`  ·  **Entity:** Earning  ·  **Record capabilities (design CAP):** update

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/stall-earnings` | List records — query: `tab` (`august-payable`, `incentive-detail`, `approved`, `on-hold`, `paid-history`), `q`, `status`, `page`, `pageSize` |
| GET | `/api/v1/admin/stall-earnings/kpis` | KPI strip (August payable, Fixed salary, Incentives, Employees, On hold, Avg incentive) |
| GET | `/api/v1/admin/stall-earnings/:earningId` | One record with `stage`, `activity[]` and linked-record references |
| PATCH | `/api/v1/admin/stall-earnings/:earningId` | Edit fields (writes "Record updated" to activity) |
| POST | `/api/v1/admin/stall-earnings/:earningId/advance` | Record the next flow stage manually ("Mark …") |
| POST | `/api/v1/admin/stall-earnings/:earningId/view-calculation` | View calculation |
| POST | `/api/v1/admin/stall-earnings/:earningId/approve-earning` | Approve earning — advances the flow stage |
| POST | `/api/v1/admin/stall-earnings/:earningId/adjust-incentive` | Adjust incentive — advances the flow stage |
| POST | `/api/v1/admin/stall-earnings/:earningId/hold-payment` | Hold payment |
| POST | `/api/v1/admin/stall-earnings/:earningId/release-with-salary` | Release with salary — advances the flow stage |
| POST | `/api/v1/admin/stall-earnings/bulk/approve-earning` | Bulk approve earning — body adds `ids: string[]` |
| POST | `/api/v1/admin/stall-earnings/bulk/hold-payment` | Bulk hold payment — body adds `ids: string[]` |
| GET | `/api/v1/admin/stall-earnings/export` | Export view — query: `tab`, `q`, `status`, `format` (csv, xlsx, pdf, json) |

**Record shape** (`GET /api/v1/admin/stall-earnings/:earningId`):

| Field | Column in the UI | Example |
|---|---|---|
| `id` | Earning | SER-2041 |
| `employee` | Employee | EMP-102 Bhavana S. |
| `stall` | Stall | CS-019 HSR Sector 2 |
| `fixedSalary` | Fixed salary | ₹18,000 |
| `incentive` | Incentive | ₹6,240 |
| `deduction` | Deduction | ₹0 |
| `totalPayable` | Total payable | ₹24,240 |
| `status` | Status | Awaiting approval |
| `stage` | Flow stage index (0-based) | 3 |
| `activity[]` | Activity log (action, by, at, note) | — |

**Action request bodies** — every action also accepts `note` and returns the updated record:

<details><summary><code>POST /api/v1/admin/stall-earnings/:earningId/view-calculation</code> — View calculation</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `depth` | enum | yes | Applied rules only · Full calculation trace · Rule versions used |

</details>

<details><summary><code>POST /api/v1/admin/stall-earnings/:earningId/approve-earning</code> — Approve earning</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `period` | enum | yes | This week · Last week · Custom |
| `check` | enum | yes | Rules applied correctly · Manual review completed |
| `note` | string | no | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-earnings/:earningId/adjust-incentive</code> — Adjust incentive</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `dir` | enum | yes | Add · Deduct |
| `amount` | string | yes | — |
| `reason` | enum | yes | Rule missed a conversion · Invalid conversion reversed · Goodwill · Data correction · Manager discretion |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-earnings/:earningId/hold-payment</code> — Hold payment</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `scope` | enum | yes | Incentive only · Salary and incentive |
| `reason` | enum | yes | Conversions under review · Employee suspended · Bank details invalid · Investigation open |
| `until` | string | no | — |
| `note` | string | yes | — |

</details>

<details><summary><code>POST /api/v1/admin/stall-earnings/:earningId/release-with-salary</code> — Release with salary</summary>

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `month` | enum | yes | August 2026 · September 2026 |
| `date` | string | yes | — |
| `method` | enum | yes | Bank transfer · UPI |
| `note` | string | no | — |

</details>

## Cross-cutting

### Real-time (socket.io — client already in `src/lib/socket.ts`)

| Event | Payload | Used by |
|---|---|---|
| `delivery.updated` | Delivery record | Live Deliveries |
| `bulk.vehicle.position` | `{ vehicleId, batchId, lat, lng, speed, currentStop, nextStop, at }` | Live Vehicle Tracking, Run Sheet |
| `bulk.stop.updated` | Stop record | Run Sheet & Stops |
| `bulk.exception.raised` | Exception record | Delivery Exceptions, Bulk Delivery Board alerts |
| `stall.conversion.updated` | Conversion record | Customer Conversions, Network Overview |

### Stall employee app ingestion (feeds Customer Conversions)

| Method | Path | Body |
|---|---|---|
| POST | `/api/v1/stall-app/interactions` | `{ stallId, employeeId, at }` |
| POST | `/api/v1/stall-app/conversions` | `{ interactionId, stage: "downloaded" \| "registered", customerRef, at }` |
| — | (internal) | First order and delivery are attributed automatically from the order service when a registered stall customer orders; attribution routes the order to the area's mapped dark store. |

### Incentive calculation

- Incentive accrues only on **verified** conversions; conversions flagged invalid before payroll reverse their incentive.
- Rules are versioned: `POST /stall-incentive-rules/:ruleId/create-new-version` creates a draft; the current version keeps paying until the new one is approved.
- `POST /api/v1/admin/stall-incentive-rules/preview` `{ interactions, registrations, orders, value?, area }` → `{ lines: [{ ruleId, version, amount }], total }`.
- Monthly: `POST /api/v1/admin/stall-earnings/release` `{ month, date, method }` releases approved earnings with the salary run.

### Permissions (mirrors `src/constants/permissions.ts`)

| Role | Delivery | Container Stalls |
|---|---|---|
| Super Admin | Everything | Everything |
| Operations Admin | View, create, edit, act, delete, export | View, create, edit, act, delete, export |
| Rider Manager | View, create, edit, act on every delivery screen | — (not visible) |
| Finance Admin | — (not visible) | View all; edit/act on Stall Employees (salary), Incentive Rules, Employee Earnings; approve rules and earnings; export |
| Catalog Manager *(design: Marketing Manager)* | — | View all; edit/act on Areas, Stall Directory, Advertisements, Product Samples; approve ads and samples |
| Others | — | — |

Server must enforce the same matrix — the UI only hides controls.

## Gap summary

| Area | Existing backend | Needed |
|---|---|---|
| Live Deliveries | Rider dispatch assign / auto-assign / recommendations / map | Delivery list + record with timeline; mark delivered/failed; reattempt; refund |
| Bulk queue & batches | Dispatch clusters, group orders, batch-assign | Batch entity with vehicle + operator + capacity check, dispatch checklist, pause/resume/split/cancel |
| Run sheet & routes | Simulate (partial) | Stops per batch with per-stop outcome; route optimise / lock / move / apply / compare |
| Tracking | Dispatch map (riders) | Vehicle positions for bulk trips, trip close, socket events |
| Operators | — | Operator directory (licence, vehicle, batches) |
| Exceptions | — | Stop-level exceptions with decisions |
| Fleet | Rider fleet vehicles + maintenance | Store/driver assignment, delivery mode, documents, retire |
| B2B bulk orders, load plans, consignments | — | All endpoints above |
| Container Stalls (all 10 screens) | — | All endpoints above + stall-app ingestion + incentive engine |
