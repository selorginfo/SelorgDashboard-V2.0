import type { ModuleId } from "@/constants/nav";

/**
 * Transcribed verbatim from the approved design's `PURPOSE` map
 * (design-reference/Selorg Admin Dashboard.dc.html:4663-4710) — `[who, what they decide here,
 * what happens after]`. Drives the "purpose banner" shown at the top of nearly every screen
 * (`hasPurpose` block, dc.html:1629-1650): a who/what description with an embedded compact
 * numbered flow stepper when the route also has a `flow`.
 */
export const PURPOSE: Partial<Record<ModuleId, [string, string, string]>> = {
  orders: [
    "Support and ops agents",
    "find the order a customer is asking about and see exactly which stage it is stuck at",
    "Acting here reassigns work, refunds or cancels — the customer app updates immediately.",
  ],
  exceptions: [
    "Ops lead on shift",
    "triage what is broken right now, worst first, and give each one an owner",
    "Resolved exceptions leave this board and appear in the audit log.",
  ],
  barcodes: [
    "Ops and warehouse leads",
    "review every SKU barcode mapping, print labels, and activate or deactivate codes",
    "Printed labels and status changes flow to scanners and the product catalog.",
  ],
  returns: [
    "Support and finance",
    "decide whether a return is accepted and how the customer is refunded",
    "Approving schedules a rider pickup; the refund is raised against the original payment.",
  ],
  wh: [
    "Warehouse manager",
    "see today's receiving, putaway and dispatch load in one place",
    "Each activity line opens the record that created it.",
  ],
  "wh-inv": [
    "Warehouse manager",
    "check what stock exists, where it sits and what is expiring",
    "Adjustments and blocks here change what transfers can allocate.",
  ],
  inbound: [
    "Receiving team at the dock",
    "verify a supplier delivery line by line before it becomes stock",
    "Accepting generates the GRN and creates the putaway task.",
  ],
  putaway: [
    "Putaway operator",
    "place received stock into a specific zone, rack and bin",
    "Confirming putaway makes the stock available to allocate.",
  ],
  transfers: [
    "Warehouse and store managers",
    "approve, pick and dispatch replenishment to the dark stores",
    "Dispatch starts the transit clock; the store confirms receipt at the other end.",
  ],
  stores: [
    "Regional ops manager",
    "compare the five dark stores and spot the one that needs help",
    "Open a store to see its racks, pickers and live queue.",
  ],
  "store-inv": [
    "Dark store manager",
    "see what is on the shelf and what needs replenishing",
    "Raising replenishment creates a transfer request to the warehouse.",
  ],
  picking: [
    "Dark store manager",
    "watch the live pick queue and unblock anything running late",
    "Completed picks move to packing; bags then need a rack scan.",
  ],
  bags: [
    "Packing station supervisor",
    "confirm each bag holds the right products and reaches a staging rack",
    "Once racked, the order is ready for rider collection.",
  ],
  racks: [
    "Dark store manager",
    "see which staging racks have space and which bags are waiting on them",
    "Rack barcodes are scanned by the picker app to link a bag to a slot.",
  ],
  scanner: [
    "HSD operations",
    "monitor scanner devices and the live scan stream for failures",
    "Failed scans become barcode exceptions for the store to resolve.",
  ],
  catalog: [
    "Catalog manager",
    "manage product master data, pricing and where each product is sold",
    "Publishing pushes the product live to the selected stores.",
  ],
  mastersheet: [
    "Catalog manager",
    "upload the Selorg master sheet to sync products, categories, banners and home page content with the database",
    "Each sheet tab maps to one sheet in the Excel mastersheet — download the sample, fill it in, then upload.",
  ],
  promotions: [
    "Marketing and catalog",
    "run coupons and campaigns and see which are earning their discount",
    "Scheduling makes the offer live in the customer app at the set time.",
  ],
  vendors: [
    "Vendor manager and procurement",
    "judge whether a supplier is performing, and act on quality or document problems",
    "Placing a vendor on hold blocks new purchase orders until the review date.",
  ],
  "cms-home": [
    "Content manager",
    "compose the home screen section by section and see it on a phone before it ships",
    "Publishing replaces the live home layout for the selected surface.",
  ],
  "cms-media": [
    "Content authors",
    "find an asset, see exactly where it is used, and replace it safely",
    "Replacing an asset updates every content item that references it.",
  ],
  "cms-cal": [
    "Content manager",
    "see what goes live and what expires over the next two weeks, and catch slot clashes",
    "Rescheduling moves the item's publish job; nothing changes until the scheduled time.",
  ],
  shifts: [
    "Operations admin",
    "define the standard shift patterns the whole workforce is rostered onto",
    "Editing a template updates every future roster entry using it; past shifts keep the pattern they ran on.",
  ],
  roster: [
    "Store and rider ops",
    "see which shifts are short of people today and fill the gaps before they start",
    "Assigning notifies the worker; unconfirmed people get a reminder as the shift approaches.",
  ],
  "rider-approvals": [
    "Rider operations leads",
    "review interview documents, then approve or reject with a written reason",
    "Until approved the rider stays on the Interview screen. Rejecting shows the reason so they can resubmit.",
  ],
  "picker-approvals": [
    "Store operations leads",
    "view uploaded verification documents and clear the picker interview",
    "Approving unlocks the picker app; rejecting requires a reason and allows resubmit.",
  ],
  "rider-dir": [
    "Rider manager",
    "see who is on the road, who is free, and act on anyone underperforming",
    "Suspension takes the rider offline immediately; zone changes apply from the next shift.",
  ],
  "picker-dir": [
    "Dark store manager",
    "see approved pickers only — Available when on shift, otherwise Offline",
    "Pending applicants stay under Picker Approvals until an admin approves them.",
  ],
  "rider-details": [
    "Rider manager and ops",
    "open one rider's profile, work, location, docs, earnings, attendance, orders and activity",
    "Date-range stats and order rows drill into the live order record.",
  ],
  "picker-details": [
    "Dark store manager and ops",
    "open one picker's profile, work, HSD session, productivity, orders and activity",
    "Date-range stats and order rows drill into the live order record.",
  ],
  "cod-collection": [
    "Finance and ops",
    "track COD from collection through rider transfer to the company without treating pending cash as revenue",
    "Settled amounts are realized; riders with undeposited float cannot go online the next day.",
  ],
  "order-progress": [
    "Ops lead on shift",
    "see every open order by fulfillment stage and its timeline from order logs",
    "Opening a row jumps to the order detail for reassignment or exception handling.",
  ],
  "customer-reviews": [
    "Support and ops",
    "read customer ratings tied to real orders",
    "Clicking a review opens the order that was rated.",
  ],
  "hsd-devices": [
    "Dark store ops",
    "see which HSD devices are online, who holds them, and their assign/release history",
    "History is filtered by date range and never invented when the API is empty.",
  ],
  "rider-earn": [
    "Finance",
    "verify how each rider's week was computed before it enters Tuesday's payout run",
    "Earnings accrue daily but pay out once weekly: the week locks Sunday 23:59, Finance approves Monday, the bank pays Tuesday.",
  ],
  "picker-earn": [
    "Finance",
    "verify picker pay for the week, driven by orders and items completed",
    "Earnings accrue per shift but pay out once weekly: the week locks Sunday 23:59, Finance approves Monday, the bank pays Tuesday.",
  ],
  payouts: [
    "Finance admin",
    "run the single weekly payout that pays every rider and picker for the closed week",
    "Releasing a run sends one bank file; individual earnings cannot be paid outside it.",
  ],
  "earn-rules": [
    "Finance admin",
    "define what riders and pickers earn, and preview the effect before it goes live",
    "Editing an active rule creates a new version; the current one stays live until the new one is approved.",
  ],
  "rider-support": [
    "Support agent",
    "resolve a rider's issue with their delivery, earning and location already in view",
    "Resolving asks the rider for a CSAT rating and closes the SLA timer.",
  ],
  "picker-support": [
    "Support agent",
    "resolve a picker's issue with their task, bag, rack and scanner in view",
    "Resolving closes the SLA timer and notifies the store manager.",
  ],
  categories: [
    "Catalog manager",
    "shape the category tree customers browse, and move products between branches safely",
    "Disabling a branch hides it in the app; deleting one requires its products be moved first.",
  ],
  cms: [
    "Content authors and catalog manager",
    "manage every piece of content across the customer app, picker app, rider app, HSD scanner and web app from one pipeline",
    "Publishing pushes the item live to the selected surface only — each surface is reviewed and scheduled separately.",
  ],
  riders: [
    "Rider manager",
    "see where every rider is and reassign anything running late",
    "Assignment notifies the rider app instantly.",
  ],
  zones: [
    "Ops manager",
    "define where Selorg delivers from each store and at what promise",
    "Pausing a zone stops new orders from that area.",
  ],
  customers: [
    "Support and growth",
    "understand one customer's history before answering or compensating them",
    "Wallet credits and refunds appear in the customer app at once.",
  ],
  payments: [
    "Finance",
    "reconcile online payments, COD collection and refunds",
    "Reconciliation closes the day's cash position.",
  ],
  support: [
    "Support team",
    "work the ticket queue with order and payment context attached",
    "Resolving a ticket asks the customer for a CSAT rating.",
  ],
  reports: [
    "Managers and analysts",
    "pick a domain, read the metric and drill into the detail",
    "Published reports are circulated to the owning team.",
  ],
  "rpt-overall": [
    "Ops and finance leads",
    "see whole-business revenue, orders and SLA from live analytics",
    "Drill into Sales, Operations or All Reports for domain detail.",
  ],
  "rpt-sales": [
    "Finance and merchandising",
    "validate revenue, category mix, payments and discounts from live orders",
    "Exports pull the current filtered table for reconciliation.",
  ],
  "rpt-ops": [
    "Ops leads",
    "track fulfillment, cancellations, delivery SLA and store performance",
    "Exceptions and scanner detail also live under Monitoring.",
  ],
  "rpt-people": [
    "Workforce managers",
    "see picker and rider staffing from live analytics aggregates",
    "Earnings and attendance detail remain in Workforce modules.",
  ],
  "rpt-customer": [
    "Growth and support leads",
    "measure new vs returning customers, retention, LTV and churn",
    "Named customer records open in the Customers module.",
  ],
  notifications: [
    "Ops on duty",
    "see what the system is alerting on, worst first",
    "Each alert deep-links to the record that raised it.",
  ],
  users: [
    "Super Admin",
    "manage who has access, at what scope, and check their activity",
    "Role and scope changes take effect at the user's next sign-in.",
  ],
  roles: [
    "Super Admin",
    "set what each role can do in each module",
    "Permission changes apply to every user holding that role.",
  ],
  audit: [
    "Auditor or Super Admin",
    "investigate exactly who changed what, and to what value",
    "Events are immutable — you can flag or export, not edit.",
  ],
  settings: [
    "Super Admin",
    "configure business, warehouse and store rules the whole portal reads",
    "Published settings change behaviour across all modules.",
  ],
  integrations: [
    "IT and ops",
    "check that connected systems are healthy and retry what failed",
    "Retrying drains the queue; disabling stops the integration.",
  ],
};
