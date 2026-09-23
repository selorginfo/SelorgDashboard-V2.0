# SELORG ADMIN DASHBOARD
## Updated Module & Feature Requirements — V1
### Warehouse → Dark Store → Customer Fulfillment Architecture

**Document Status:** Recommended V1 baseline for Admin Dashboard UX/UI design  
**Product:** Selorg Quick Commerce  
**Basis:** Existing Selorg Customer App, Picker App, Rider App, HSD Scanner App, and the provided Admin Dashboard requirements document.

---

# 1. Product Purpose

The Selorg Admin Dashboard is the central operational and management system for the quick-commerce platform.

The complete operational chain is:

**Supplier → Central Warehouse → Dark Store → Customer Order → Picking → HSD Scanning → Packing → Rider → Customer**

The Admin Dashboard must provide visibility and control across this entire chain.

The most important distinction is:

- **Central Warehouse:** bulk inventory storage, receiving, putaway, stock management, and replenishment of dark stores.
- **Dark Store:** local inventory used to fulfill customer orders.
- **Customer Order:** fulfilled from the inventory of the relevant dark store.

---

# 2. Core Supply & Fulfillment Flow

```text
Supplier
   ↓
Central Warehouse
   ↓
Inbound / Receiving
   ↓
Quality Check
   ↓
Putaway
   ↓
Warehouse Inventory
   ↓
Stock Transfer Request
   ↓
Transfer Approval
   ↓
Transfer Picking
   ↓
Transfer Packing / Preparation
   ↓
Dispatch
   ↓
In Transit
   ↓
Dark Store Receiving
   ↓
Quantity Verification
   ↓
Dark Store Inventory
   ↓
Customer Order
   ↓
Order Reservation
   ↓
Picker
   ↓
HSD Scanner / Verification
   ↓
Packing
   ↓
Rider Assignment
   ↓
Out for Delivery
   ↓
Customer
```

---

# 3. V1 Module Architecture

## Priority Legend

- 🔴 **Must Have — V1 Core**
- 🟠 **Important — V1 / V1.5**
- 🟡 **Conditional — Include if supported by the current backend**
- 🔵 **Future — V2+**

---

# 4. Dashboard / Command Center 🔴

## Purpose

Provide an at-a-glance operational view across warehouse, dark stores, orders, inventory, riders, payments, and exceptions.

## KPI Cards

- Total Orders
- Orders Today
- Revenue Today
- Active Orders
- Pending Picking
- Pending Packing
- Ready for Dispatch
- Active Deliveries
- Delivered Orders
- Cancelled Orders
- Refunds
- SLA %

## Supply Chain KPIs

- Warehouse Stock
- Low Warehouse Stock
- Pending Transfer Requests
- Transfers In Transit
- Transfers Awaiting Receiving
- Dark Stores with Low Stock
- Out-of-Stock SKUs

## Store Operations

- Dark Store Status
- Orders per Store
- Pending Picking
- Pending Packing
- Picker Utilization
- Scanner Status
- Store Inventory Alerts

## Delivery Operations

- Riders Online
- Riders Offline
- Active Deliveries
- Delayed Deliveries
- Unassigned Orders
- Failed Deliveries

## Alerts

- SLA Breach
- Stockout
- Low Stock
- Warehouse Transfer Delay
- Receiving Discrepancy
- Payment Failure
- Picking Exception
- Scanner Offline
- Rider Issue
- Customer Escalation

---

# 5. Orders 🔴

Orders are the central operational object connecting the customer, dark store, picker, scanner, packing, rider, payment, and support systems.

## 5.1 Order List

### Columns

- Order ID
- Customer
- Dark Store
- Date / Time
- Order Status
- Payment Status
- Picker
- Rider
- Delivery Zone
- Order Value
- SLA Status
- Exception

### Filters

- Date / Time
- Order Status
- Payment Status
- Dark Store
- Picker
- Rider
- Zone
- Order Value
- SLA
- Exception

## 5.2 Order Detail

### Customer

- Customer Name
- Phone
- Delivery Address

### Store & Fulfillment

- Dark Store
- Picker
- Picking Status
- Packing Status
- Rider
- Delivery Status

### Items

- Product
- SKU
- Quantity
- Picked Quantity
- Missing Quantity
- Substitution
- Price

### Pricing

- Subtotal
- Discount
- Coupon
- Delivery Fee
- Tip
- Total

### Payment

- Payment Method
- Payment Status
- Transaction Reference

## 5.3 Order Timeline

```text
Order Placed
↓
Confirmed
↓
Picking Started
↓
Picking Completed
↓
Packed
↓
Ready
↓
Rider Assigned
↓
Picked Up
↓
Out for Delivery
↓
OTP Verified
↓
Delivered
```

Each event should show:

- Timestamp
- Status
- User / System
- Location where applicable

## 5.4 Admin Actions

- Assign Picker
- Reassign Picker
- Assign Rider
- Reassign Rider
- Cancel Order
- Approve Cancellation
- Initiate Refund
- Contact Customer
- Contact Rider
- Add Internal Note
- View Audit History

## 5.5 Order Exceptions

- Order Stuck
- Missing Item
- Payment Failure
- Picking Failure
- Packing Failure
- Rider Unavailable
- Delivery Failed
- Customer Unavailable

---

# 6. Central Warehouse 🔴

## Purpose

Manage the central inventory source that supplies the dark stores.

The warehouse is a separate operational entity from the dark store.

---

## 6.1 Warehouse Dashboard

### KPIs

- Total Warehouse Stock
- Total SKUs
- Available Stock
- Reserved Stock
- Damaged Stock
- Low Stock
- Out-of-Stock
- Inbound Shipments
- Pending Transfer Requests
- Transfers Preparing
- Transfers In Transit
- Transfers Awaiting Receipt

### Alerts

- Low Stock
- Expiry
- Receiving Discrepancy
- Transfer Delay
- Damaged Stock
- Inventory Mismatch

---

## 6.2 Warehouse Inventory

### Inventory Fields

- SKU
- Product
- Barcode
- Batch
- Expiry
- Available Quantity
- Reserved Quantity
- Damaged Quantity
- Warehouse
- Zone
- Rack
- Bin

### Inventory Actions

- Adjust Stock
- Reserve Stock
- Release Stock
- Transfer Stock
- Mark Damaged
- Stock Audit

---

## 6.3 Inbound / Receiving

### Workflow

```text
Purchase Order
↓
Expected Shipment
↓
Goods Received
↓
Quantity Verification
↓
Quality Check
↓
Accepted / Rejected
↓
GRN
↓
Putaway
↓
Warehouse Inventory Updated
```

### Screens

- Purchase Orders
- Expected Shipments
- Receiving Queue
- Receiving Detail
- Quality Check
- GRN
- Rejected / Damaged Items

### Receiving Information

- Supplier
- PO
- Shipment
- SKU
- Expected Quantity
- Received Quantity
- Accepted Quantity
- Rejected Quantity
- Batch
- Expiry
- Discrepancy
- Receiving Status

---

# 7. Warehouse Putaway & Storage 🔴

After receiving, stock must be assigned to its physical warehouse location.

## Location Hierarchy

```text
Warehouse
  ↓
Zone
  ↓
Rack
  ↓
Shelf / Bin
  ↓
SKU / Batch
```

## Putaway

- Putaway Queue
- SKU
- Quantity
- Batch
- Expiry
- Suggested Location
- Assigned Location
- Operator
- Timestamp

## Actions

- Assign Location
- Confirm Putaway
- Move Stock
- Change Location
- Audit Location

---

# 8. Warehouse → Dark Store Transfers 🔴

This is a core V1 module.

The transfer system controls replenishment from the central warehouse to dark stores.

## 8.1 Transfer Request

A dark store can request stock from the central warehouse.

### Fields

- Transfer ID
- From Warehouse
- To Dark Store
- Requested By
- Request Date
- Priority
- Status
- Items
- Requested Quantity
- Approved Quantity
- Dispatched Quantity
- Received Quantity

## 8.2 Transfer Lifecycle

```text
Draft
↓
Requested
↓
Pending Approval
↓
Approved
↓
Transfer Picking
↓
Ready for Dispatch
↓
Dispatched
↓
In Transit
↓
Partially Received / Received
↓
Completed
```

Possible terminal/exception statuses:

- Rejected
- Cancelled
- Discrepancy

## 8.3 Transfer Picking

Warehouse operator prepares the requested stock.

Show:

- Transfer ID
- Dark Store
- SKU
- Requested Quantity
- Approved Quantity
- Picked Quantity
- Remaining Quantity
- Warehouse Location
- Batch
- Expiry

## 8.4 Transfer Preparation

- Picked Items
- Quantity Verification
- Package / Bag / Pallet
- Dispatch Ready
- Operator
- Timestamp

## 8.5 Transfer Dispatch

- Transfer ID
- Warehouse
- Dark Store
- Dispatch Time
- Quantity
- Vehicle / Transport information if supported
- Dispatch Operator
- Expected Arrival
- Status

## 8.6 Transfer Tracking

Statuses:

- Preparing
- Ready
- Dispatched
- In Transit
- Arrived
- Receiving
- Completed
- Delayed

## 8.7 Transfer Receiving at Dark Store

The dark store receives and verifies the shipment.

Show:

- Expected Quantity
- Received Quantity
- Accepted Quantity
- Damaged Quantity
- Missing Quantity
- Discrepancy
- Receiver
- Receiving Time

## 8.8 Transfer Discrepancy

Possible reasons:

- Missing Quantity
- Damaged Quantity
- Wrong SKU
- Wrong Batch
- Quantity Mismatch

The discrepancy must be recorded and auditable.

---

# 9. Dark Stores & Operations 🔴

## Purpose

Manage local fulfillment locations that serve customer orders.

## 9.1 Dark Store List

- Store ID
- Store Name
- Location
- Manager
- Status
- Operating Hours
- Capacity
- Active Orders
- Inventory Status

## 9.2 Dark Store Detail

### Overview

- Current Orders
- Inventory
- Incoming Transfers
- Pickers
- Packers
- Scanners
- Store KPIs
- Capacity
- Exceptions

### KPIs

- Orders / Hour
- Pick Accuracy
- Average Picking Time
- Average Packing Time
- Stockout %
- Order Throughput
- SLA %

---

# 10. Dark Store Inventory 🔴

Dark store inventory is separate from warehouse inventory.

## Inventory Status

- Available
- Reserved
- Picked
- Damaged
- Expiring
- Out of Stock

## Stock Sources

- Warehouse Transfer
- Stock Adjustment
- Return / Recovery if supported

## Inventory Actions

- Receive Transfer
- Adjust Stock
- Mark Damaged
- Correct Stock
- Transfer History
- Stock Audit

## Customer Order Relationship

```text
Dark Store Available Stock
↓
Customer Order
↓
Stock Reserved
↓
Picker Picks Item
↓
Stock Consumed / Updated
```

---

# 11. Picking & Packing 🔴

This module directly supports the Picker App workflow.

## 11.1 Picking Queue

Statuses:

- Pending
- Assigned
- In Progress
- Completed
- Failed
- Exception

## 11.2 Picker Assignment

- Auto Assignment
- Manual Assignment
- Reassignment

## 11.3 Pick Detail

- Order
- Picker
- Items
- Required Quantity
- Picked Quantity
- Missing Items
- Substitutions
- Start Time
- Completion Time

## 11.4 Picker Performance

- Orders Picked
- Items Picked
- Pick Accuracy
- Average Picking Time
- Items / Hour
- Error Rate
- Exception Rate

## 11.5 Packing

Statuses:

- Waiting for Packing
- Packing in Progress
- Packed
- Packing Exception

Information:

- Order
- Packer
- Items
- Package / Bag
- Packing Time
- Verification Status

---

# 12. Scanner / HSD Operations 🔴

## 12.1 Scanner Dashboard

- Total Scanners
- Online
- Offline
- Active
- Error State

## 12.2 Scanner Device List

- Device ID
- Store
- Operator
- Last Activity
- Network Status
- Scanner Status
- Last Sync

## 12.3 Scan Activity

- Order Scan
- Item Scan
- Bag Scan
- Rack Scan

## 12.4 Scan Exceptions

- Invalid Barcode
- Duplicate Scan
- Wrong Item
- Server Rejection
- Scanner Offline
- Offline Pending Sync

## 12.5 Scan Audit

- Operator
- Scan Type
- Item / Order / Bag
- Timestamp
- Store
- Device
- Result

---

# 13. Inventory Management 🔴

Inventory should be visible separately at both warehouse and dark-store level.

## 13.1 Inventory Overview

- Total SKUs
- Warehouse Stock
- Dark Store Stock
- Available
- Reserved
- Low Stock
- Out of Stock
- Damaged
- Expiring Soon

## 13.2 Stock Adjustments

- Increase
- Decrease
- Correction
- Damage
- Loss
- Reconciliation

Every adjustment must include:

- Reason
- User
- Timestamp
- Location
- Previous Quantity
- New Quantity

## 13.3 Batch & Expiry

- Batch Number
- Expiry Date
- Quantity
- Location
- Expiring Soon
- Expired
- Disposal

---

# 14. Catalog 🔴

## Products

- Product List
- Create Product
- Edit Product
- Product Details
- SKU
- Barcode
- Images
- Description
- Unit
- Weight
- Brand
- Tax
- Status

## Categories

- Category List
- Subcategories
- Category Hierarchy
- Reordering

## Product Availability

- Store Availability
- Active / Inactive
- Stock Status

## Pricing

- Base Price
- Selling Price
- Discount Price
- Store-Level Pricing if supported

## Product Lifecycle

- Draft
- Active
- Out of Stock
- Temporarily Unavailable
- Discontinued

---

# 15. Pricing & Promotions 🟠

## Coupons

- Create
- Edit
- Activate / Deactivate
- Expiry
- Usage Limits

## Promotions

- Percentage Discount
- Fixed Discount
- Product Discount
- Category Discount
- Minimum Order
- First Order Offer
- Store-Specific Offer

## Banners

- Home Banners
- Promotional Banners
- Scheduling
- Active / Inactive

## Analytics

- Usage
- Revenue Generated
- Discount Given
- Conversion

---

# 16. Riders & Delivery 🔴

This module directly supports the Rider App.

## 16.1 Rider Directory

- Rider ID
- Name
- Phone
- Status
- Store / Hub
- Vehicle
- KYC Status
- Rating

## 16.2 Rider Status

- Online
- Offline
- Available
- Busy
- On Delivery
- On Break

## 16.3 Live Delivery

- Current Location
- Current Order
- ETA
- Delivery Status
- Delayed Orders

## 16.4 Order Assignment

- Manual Assignment
- Reassignment
- Unassigned Orders

## 16.5 Rider Performance

- Deliveries
- Acceptance Rate
- On-Time %
- Average Delivery Time
- Failed Deliveries
- Cancellation Rate
- Customer Rating

## 16.6 Rider Earnings

- Delivery Earnings
- Incentives
- Deductions
- Adjustments
- Settlement Status

## 16.7 Rider Incidents

- Accident
- Delivery Failure
- Customer Issue
- Vehicle Issue
- Other

---

# 17. Customers 🔴

## Customer List

- Customer ID
- Name
- Phone
- Email
- Orders
- Total Spend
- Last Order
- Wallet Balance
- Status

## Customer Detail

### Profile
- Personal Information
- Account Status

### Orders
- Order History

### Addresses
- Saved Addresses

### Wallet
- Balance
- Transactions

### Payments
- Payment History

### Refunds
- Refund History

### Support
- Tickets
- Complaints

---

# 18. Payments & Finance 🔴

## Payment Dashboard

- Online Payments
- COD
- Wallet
- Failed Payments
- Pending Payments
- Successful Payments

## Payment Transactions

- Transaction ID
- Order ID
- Customer
- Amount
- Method
- Status
- Gateway Reference

## COD Reconciliation

- Expected Cash
- Rider Collected
- Deposited
- Difference
- Reconciliation Status

## Refunds

- Refund Requests
- Approved
- Processing
- Completed
- Failed

## Rider Settlement

- Earnings
- Incentives
- Deductions
- Payout Status

## Finance Reports

- Revenue
- Refunds
- COD
- Payment Failures
- Settlements

---

# 19. Returns & Refunds 🔴

## Return Requests

- Requested
- Approved
- Rejected
- Pickup Pending
- Received
- QC
- Completed

## Refund Workflow

- Requested
- Under Review
- Approved
- Processing
- Completed
- Failed

## Return Reasons

- Missing Item
- Damaged Item
- Wrong Item
- Quality Issue
- Customer Cancellation
- Other

## Return / Refund Detail

- Order
- Customer
- Item
- Reason
- Evidence
- Amount
- Tax
- Payment Method
- Resolution

---

# 20. Support / Customer Experience 🟠

## Ticket Center

- Open
- Pending
- Assigned
- Escalated
- Resolved
- Closed

## Ticket Detail

- Customer
- Order
- Issue
- Conversation
- Order Status
- Payment
- Refund
- Previous Tickets

## Support Actions

- Refund
- Cancel Order
- Reassign
- Escalate
- Add Note
- Contact Customer

## CX Metrics

- Ticket Volume
- Resolution Time
- First Response Time
- CSAT
- Escalation Rate

---

# 21. Notifications 🟠

## Notification Center

- Customer Notifications
- Rider Notifications
- Picker Notifications
- Admin Notifications

## Templates

- Order Confirmed
- Order Packed
- Rider Assigned
- Out for Delivery
- Delivered
- Payment Failed
- Refund Completed
- Transfer Dispatched
- Transfer Received
- Transfer Delayed

## Channels

- Push
- SMS
- Email

## Rules

- Trigger
- Audience
- Channel
- Timing
- Escalation

---

# 22. Vendors / Suppliers 🟡

Include this module if supplier/procurement operations are part of the current backend.

## Vendor Directory

- Vendor
- Status
- Contact
- KYC

## Purchase Orders

- PO Creation
- PO Status
- Items
- Quantity
- Cost

## Receiving

- Expected Quantity
- Received Quantity
- Rejected Quantity
- GRN
- Quality Check

## Vendor Performance

- Fill Rate
- Lead Time
- Defect Rate

---

# 23. Reports & Analytics 🔴

## Operations

- Orders
- SLA
- Picking
- Packing
- Warehouse Transfers
- Dark Store Performance
- Delivery

## Supply Chain

- Warehouse Stock
- Transfer Volume
- Transfer Time
- Transfer Discrepancy
- Dark Store Replenishment
- Stock Availability

## Sales

- Revenue
- Orders
- Average Order Value
- Products Sold

## Inventory

- Stock Turnover
- Stockouts
- Inventory Value
- Wastage
- Expiry

## Rider

- Deliveries
- On-Time %
- Earnings
- Utilization

## Customer

- New Customers
- Repeat Customers
- Orders / Customer
- Refund Rate

## Finance

- Revenue
- Refunds
- COD
- Payment Failures
- Settlements

## Export

- CSV
- Excel
- PDF where required

---

# 24. Zones & Maps 🟠

## Zones

- Create Zone
- Edit Zone
- Serviceability
- Delivery Radius

## Map

- Central Warehouse
- Dark Stores
- Riders
- Active Deliveries
- Customer Demand
- Delivery Zones

## Zone Analytics

- Orders
- Delivery Time
- Rider Density
- SLA
- Revenue

---

# 25. Admin Users & Access 🔴

## Admin Users

- User List
- Create User
- Edit
- Activate / Deactivate

## Roles

Recommended initial roles:

- Super Admin
- Operations Admin
- Warehouse Manager
- Dark Store Manager
- Rider Manager
- Customer Support
- Finance Admin
- Catalog Manager

## Permissions

Per module:

- View
- Create
- Edit
- Delete
- Approve
- Refund
- Assign
- Export

---

# 26. Audit Logs 🔴

Every sensitive administrative action should be recorded.

## Audit Events

- Login
- Logout
- Order Modification
- Order Cancellation
- Refund
- Inventory Adjustment
- Warehouse Transfer
- Transfer Approval
- Transfer Dispatch
- Transfer Receiving
- Product Modification
- Price Change
- User Creation
- Permission Change
- Rider Assignment
- Store Configuration
- System Configuration

## Audit Data

- User
- Action
- Module
- Record
- Old Value
- New Value
- Timestamp
- IP / Device where available

---

# 27. Settings & Master Data 🔴

## Business Settings

- Company
- Operating Hours
- Currency
- Tax
- Order Rules

## Warehouse Settings

- Warehouse Locations
- Zones
- Racks
- Bins
- Capacity
- Receiving Rules

## Dark Store Settings

- Store Timings
- Capacity
- Delivery Radius
- SLA
- Replenishment Rules

## Order Settings

- Cancellation Rules
- Refund Rules
- Delivery Fee
- COD Rules

## Master Data

- Cities
- Zones
- Warehouses
- Dark Stores
- Categories
- Order Statuses
- Payment Methods
- Transfer Statuses

## Notification Settings

- Templates
- Triggers
- Escalations

---

# 28. Integrations & System Health 🟠

## Integrations

- Payment Gateway
- Maps
- Notification Provider
- Backend / OMS
- Warehouse System
- Rider System
- Picker System
- Scanner System

## Integration Health

- Connected
- Disconnected
- Last Sync
- Errors
- Retry

---

# 29. Recommended V1 Sidebar

```text
SELORG ADMIN

├── Dashboard
│
├── Orders
│   ├── All Orders
│   ├── Active Orders
│   ├── Exceptions
│   ├── Returns
│   └── Refunds
│
├── Supply Chain
│   ├── Vendors / Suppliers
│   └── Purchase Orders
│
├── Central Warehouse
│   ├── Warehouse Dashboard
│   ├── Inventory
│   ├── Inbound / Receiving
│   ├── Putaway
│   ├── Locations
│   ├── Stock Transfers
│   ├── Transfer Picking
│   ├── Transfer Dispatch
│   └── Stock Audit
│
├── Dark Stores
│   ├── Store Dashboard
│   ├── Store Inventory
│   ├── Incoming Transfers
│   ├── Transfer Receiving
│   ├── Picking
│   ├── Packing
│   └── Scanner Operations
│
├── Catalog
│   ├── Products
│   ├── Categories
│   ├── Pricing
│   └── Availability
│
├── Riders & Delivery
│   ├── Riders
│   ├── Live Deliveries
│   ├── Assignments
│   ├── Incidents
│   └── Rider Earnings
│
├── Customers
│   ├── Customers
│   ├── Wallets
│   └── Customer Activity
│
├── Payments & Finance
│   ├── Transactions
│   ├── COD Reconciliation
│   ├── Refunds
│   └── Settlements
│
├── Promotions
│   ├── Coupons
│   ├── Promotions
│   └── Banners
│
├── Support
│   ├── Tickets
│   ├── Escalations
│   └── CX Analytics
│
├── Reports & Analytics
│
├── Zones & Maps
│
├── Notifications
│
├── Admin & Access
│   ├── Admin Users
│   ├── Roles & Permissions
│   └── Audit Logs
│
├── Settings
│
└── Integrations & System Health
```

---

# 30. Core Inventory Model

The Admin Dashboard should distinguish three inventory states/locations:

```text
                    SUPPLIER
                       ↓
               CENTRAL WAREHOUSE
                       ↓
              WAREHOUSE INVENTORY
                       ↓
              STOCK TRANSFER
                       ↓
                 IN TRANSIT
                       ↓
                DARK STORE
                       ↓
             DARK STORE INVENTORY
                       ↓
                 CUSTOMER ORDER
```

The same SKU may therefore exist simultaneously in:

- Central Warehouse
- In Transit
- Dark Store A
- Dark Store B
- Dark Store C

The dashboard must show inventory by **location**, not only as one global stock number.

---

# 31. Transfer Inventory Accounting

For each transfer:

```text
Warehouse Available
        ↓
Warehouse Reserved
        ↓
Warehouse Picked
        ↓
Warehouse Dispatched
        ↓
Transfer In Transit
        ↓
Dark Store Received
        ↓
Dark Store Available
```

If there is a discrepancy:

```text
Expected Quantity
        vs
Received Quantity
        ↓
Discrepancy
        ↓
Investigation / Adjustment
        ↓
Audit Log
```

This is critical for inventory accuracy.

---

# 32. Order Fulfillment Inventory Relationship

Customer orders must consume inventory from the correct dark store.

```text
Customer
   ↓
Order
   ↓
Assigned Dark Store
   ↓
Check Available Inventory
   ↓
Reserve Stock
   ↓
Picker
   ↓
Pick Items
   ↓
HSD Verification
   ↓
Packing
   ↓
Inventory Updated
   ↓
Rider
   ↓
Delivery
```

The dashboard should allow an operator to trace this relationship from the order detail.

---

# 33. End-to-End Order Detail

A single Order Detail page should ideally provide:

```text
ORDER #SEL123456

Customer
    ↓
Dark Store
    ↓
Inventory Reservation
    ↓
Picker
    ↓
Picking Events
    ↓
HSD Scan Events
    ↓
Package / Bag
    ↓
Rider
    ↓
Live Delivery
    ↓
OTP / Proof of Delivery
    ↓
Payment
    ↓
Refund / Return
    ↓
Support Tickets
    ↓
Audit History
```

This should be one of the most important UX patterns in the Admin Dashboard.

---

# 34. V1 Priority

## 🔴 Must Have — V1 Core

1. Dashboard
2. Orders
3. Central Warehouse
4. Warehouse Inventory
5. Inbound / Receiving
6. Putaway
7. Warehouse → Dark Store Transfers
8. Dark Stores
9. Dark Store Inventory
10. Picking & Packing
11. Scanner Operations
12. Catalog
13. Riders & Delivery
14. Customers
15. Payments & Finance
16. Returns & Refunds
17. Reports
18. Admin Users / RBAC
19. Audit Logs
20. Settings

## 🟠 Important — V1 / V1.5

21. Promotions
22. Support / CX
23. Notifications
24. Zones & Maps
25. Integrations & System Health

## 🟡 Conditional

26. Vendors / Suppliers
27. Purchase Orders
28. Advanced procurement workflows

## 🔵 Future — V2+

- AI Routing
- Blockchain Traceability
- AR Product Preview
- Voice Ordering Intelligence
- Auto SOP Generation
- Predictive Maintenance
- ESG / Carbon Tracking
- Advanced ML Recommendations
- Advanced Fraud Intelligence
- Streaming / Kafka Pipeline Monitoring
- Multi-tenancy
- Advanced IoT / Cold Chain

---

# 35. Design Principles

## 35.1 Operations First

The dashboard should prioritize what operations teams need to act on immediately:

- Orders
- Inventory
- Transfers
- Picking
- Packing
- Riders
- Exceptions
- SLA

## 35.2 Location-Aware Inventory

Every inventory quantity should be associated with a location:

- Warehouse
- Dark Store
- In Transit

## 35.3 Order-Centric Traceability

The Order ID should connect:

**Customer → Dark Store → Picker → Scanner → Package → Rider → Delivery → Payment → Support**

## 35.4 Transfer Traceability

The Transfer ID should connect:

**Warehouse Request → Approval → Picking → Dispatch → In Transit → Dark Store Receiving → Discrepancy → Inventory**

## 35.5 Auditability

Sensitive operational actions must be traceable to:

- User
- Timestamp
- Location
- Record
- Action
- Previous value
- New value

---

# 36. Scope Boundary

This document is the recommended functional baseline for the Selorg Admin Dashboard V1.

It should be used as the source of truth for the next design phases:

1. Admin Sitemap
2. Screen Tree
3. Role & Permission Matrix
4. Detailed Screen Requirements
5. User Workflows
6. UX/UI Design
7. Design System
8. Claude Design Prompt
9. Prototype Validation

The V1 design should not introduce unsupported functionality merely because it appears in a future-state enterprise roadmap.

---

# 37. Final Operating Model

The complete Selorg operating model for the Admin Dashboard is:

```text
SUPPLY
Supplier
   ↓
Central Warehouse
   ↓
Warehouse Receiving
   ↓
Warehouse Inventory
   ↓
Warehouse → Dark Store Transfer
   ↓
Transfer In Transit
   ↓
Dark Store Receiving
   ↓
Dark Store Inventory

FULFILLMENT
Customer Order
   ↓
Dark Store Selection
   ↓
Inventory Reservation
   ↓
Picker
   ↓
HSD Scanner
   ↓
Packing
   ↓
Rider Assignment
   ↓
Pickup
   ↓
Out for Delivery
   ↓
OTP / Proof
   ↓
Delivered

POST-ORDER
Payment
   ↓
Refund / Return
   ↓
Support
   ↓
Customer Experience

CONTROL LAYER
Dashboard
Reports
Notifications
RBAC
Audit Logs
Settings
Integrations
```

**This structure should be treated as the updated V1 architecture before proceeding to the detailed screen-by-screen design and Claude Design prompt.**
