import { BULK_ORDER_STAGES, type BulkOrder, type BulkOrderEvent, type BulkOrderItem, type BulkOrderStatus, type BulkPaymentStatus } from "@/types/bulkOrder";

/**
 * Frontend-only seed for the Bulk Orders module. The clients and BLK-44xx ids continue the
 * static rows the Bulk Orders workspace table already showed (services/workspace/data/bulkorders.ts)
 * so the numbers line up across screens. Dates are generated relative to "today".
 */

export const BULK_PRODUCTS: Omit<BulkOrderItem, "qty">[] = [
  { product: "Basmati Rice 25 kg", sku: "GRN-BSM-25", unitPrice: 2150 },
  { product: "Sunflower Oil 15 L tin", sku: "OIL-SUN-15", unitPrice: 2380 },
  { product: "Toor Dal 30 kg", sku: "PLS-TOR-30", unitPrice: 4290 },
  { product: "Onion 50 kg sack", sku: "VEG-ONI-50", unitPrice: 1650 },
  { product: "Tomato 25 kg crate", sku: "VEG-TOM-25", unitPrice: 980 },
  { product: "Potato 50 kg sack", sku: "VEG-POT-50", unitPrice: 1400 },
  { product: "Paneer 5 kg block", sku: "DRY-PNR-05", unitPrice: 1780 },
  { product: "Full Cream Milk 10 L", sku: "DRY-MLK-10", unitPrice: 640 },
  { product: "Chicken Breast 10 kg", sku: "MEA-CHB-10", unitPrice: 2950 },
  { product: "Refined Sugar 50 kg", sku: "GRN-SUG-50", unitPrice: 2240 },
  { product: "Atta 50 kg", sku: "GRN-ATA-50", unitPrice: 1920 },
  { product: "Packaged Water 20 L (x10)", sku: "BEV-WTR-20", unitPrice: 700 },
];

export const MOCK_BULK_RIDERS = ["Raju Naik", "Suresh Gowda", "Ravi Shankar", "Deepak Kumar", "Naresh P."];
export const MOCK_BULK_PICKERS = ["Lokesh M.", "Asha R.", "Prakash V.", "Sunita D.", "Harish G."];

export const BULK_STORES = ["WH-01 Bommasandra", "DS-01 Indiranagar", "DS-02 Koramangala", "DS-03 HSR Layout", "DS-04 Whitefield"];
export const BULK_SLOTS = ["06:00 – 08:00", "08:00 – 10:00", "10:00 – 12:00", "14:00 – 16:00", "16:00 – 18:00"];
export const BULK_PAYMENT_METHODS = ["Credit (Net 15)", "Credit (Net 30)", "NEFT / RTGS", "UPI", "Cash on delivery"];

interface ClientSeed {
  business: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
}

const CLIENTS: ClientSeed[] = [
  { business: "Zomato Hyperpure", contactName: "Rahul Verma", phone: "+91 98450 11220", email: "procurement@hyperpure.in", address: "No. 14, 2nd Stage, BTM Layout, Bengaluru 560076" },
  { business: "FreshMenu Kitchens", contactName: "Sana Qureshi", phone: "+91 99001 44871", email: "kitchen.ops@freshmenu.in", address: "Plot 88, Outer Ring Rd, Marathahalli, Bengaluru 560037" },
  { business: "Swiggy Stores", contactName: "Aditya Rao", phone: "+91 97411 20983", email: "instamart.b2b@swiggy.in", address: "HAL 2nd Stage, 100 Ft Rd, Indiranagar, Bengaluru 560038" },
  { business: "Rebel Foods", contactName: "Neha Bhat", phone: "+91 90080 55312", email: "supply@rebelfoods.co", address: "5th Block, 80 Ft Rd, Koramangala, Bengaluru 560095" },
  { business: "Licious B2B", contactName: "Manish Gupta", phone: "+91 96860 70045", email: "b2b@licious.in", address: "EPIP Zone, Whitefield, Bengaluru 560066" },
  { business: "BigBasket Pro", contactName: "Pooja Das", phone: "+91 95388 12004", email: "pro.orders@bigbasket.in", address: "KIADB Industrial Area, Whitefield, Bengaluru 560066" },
  { business: "Metro Cash & Carry", contactName: "Srinivas K.", phone: "+91 98804 66017", email: "yeshwanthpur@metro.co.in", address: "26/3 Tumkur Rd, Yeshwanthpur, Bengaluru 560022" },
  { business: "Taj West End Catering", contactName: "Farah Siddiqui", phone: "+91 80225 13131", email: "stores.twe@tajhotels.com", address: "25 Race Course Rd, Bengaluru 560001" },
];

/** [status, paymentStatus, stage index reached] for each seeded order. */
const PLAN: [BulkOrderStatus, BulkPaymentStatus, number][] = [
  ["Delivered", "Paid", 8],
  ["Pending", "Pending", 0],
  ["Processing", "Paid", 3],
  ["Processing", "Partially paid", 2],
  ["Cancelled", "Refunded", 1],
  ["Ready for Delivery", "Paid", 5],
  ["Out for Delivery", "Paid", 7],
  ["Pending", "Pending", 0],
  ["Delivered", "Paid", 8],
  ["Processing", "Paid", 4],
  ["Out for Delivery", "Partially paid", 7],
  ["Ready for Delivery", "Paid", 6],
  ["Pending", "Failed", 0],
  ["Delivered", "Paid", 8],
  ["Processing", "Paid", 2],
  ["Delivered", "Partially paid", 8],
  ["Pending", "Pending", 1],
  ["Cancelled", "Pending", 0],
  ["Ready for Delivery", "Paid", 5],
  ["Delivered", "Paid", 8],
  ["Processing", "Pending", 3],
  ["Out for Delivery", "Paid", 7],
];

const STAFF = ["Arun K.", "Kavya S.", "Ops desk"];

function at(daysOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function build(i: number): BulkOrder {
  const [status, paymentStatus, stage] = PLAN[i]!;
  const client = CLIENTS[i % CLIENTS.length]!;
  const lineCount = 3 + (i % 4);
  const items: BulkOrderItem[] = Array.from({ length: lineCount }, (_, j) => {
    const p = BULK_PRODUCTS[(i * 3 + j * 5) % BULK_PRODUCTS.length]!;
    return { ...p, qty: 4 + ((i + 1) * (j + 3)) % 36 };
  });
  const orderedDaysAgo = status === "Delivered" || status === "Cancelled" ? 3 + (i % 5) : i % 3;
  const orderDate = at(-orderedDaysAgo, 9 + (i % 8), (i * 11) % 60);
  const deliveryOffset = status === "Delivered" ? -orderedDaysAgo + 1 : status === "Out for Delivery" ? 0 : 1 + (i % 3);
  const deliveryDate = at(deliveryOffset, 8 + (i % 4) * 2);
  const staff = STAFF[i % STAFF.length]!;
  const picker = stage >= 3 ? MOCK_BULK_PICKERS[i % MOCK_BULK_PICKERS.length] : undefined;
  const rider = stage >= 6 ? MOCK_BULK_RIDERS[i % MOCK_BULK_RIDERS.length] : undefined;

  const history: BulkOrderEvent[] = BULK_ORDER_STAGES.slice(0, stage + 1).map((name, s) => ({
    stage: name,
    at: new Date(new Date(orderDate).getTime() + s * 70 * 60_000).toISOString(),
    by: name === "Rider Assigned" || name === "Out for Delivery" || name === "Delivered" ? rider ?? staff : name === "Picking" || name === "Packed" ? picker ?? staff : staff,
    note:
      name === "Rider Assigned"
        ? rider
        : name === "Picking"
          ? picker
          : name === "Payment Confirmed" && paymentStatus !== "Paid"
            ? "Credit terms approved"
            : undefined,
  }));
  if (status === "Cancelled") {
    history.push({ stage: "Cancelled", at: at(-orderedDaysAgo, 16), by: staff, note: "Client requested cancellation" });
  }

  return {
    id: `BLK-${4400 + i}`,
    ...client,
    store: BULK_STORES[i % BULK_STORES.length]!,
    orderDate,
    deliveryDate,
    slot: BULK_SLOTS[i % BULK_SLOTS.length]!,
    items,
    discount: i % 3 === 0 ? 1500 + (i % 4) * 500 : 0,
    deliveryCharge: i % 4 === 0 ? 0 : 450,
    taxRate: 0.05,
    paymentStatus,
    paymentMethod: BULK_PAYMENT_METHODS[i % BULK_PAYMENT_METHODS.length]!,
    status,
    stage,
    picker,
    rider,
    history,
  };
}

export const mockBulkOrderData: BulkOrder[] = PLAN.map((_, i) => build(i)).reverse();

export const BULK_ORDER_STATUSES: BulkOrderStatus[] = [
  "Pending",
  "Processing",
  "Ready for Delivery",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export const BULK_PAYMENT_STATUSES: BulkPaymentStatus[] = ["Paid", "Pending", "Partially paid", "Refunded", "Failed"];
