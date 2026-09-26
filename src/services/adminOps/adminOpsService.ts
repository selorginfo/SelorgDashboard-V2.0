import { api } from "@/lib/apiClient";
import type { Badge, Tone } from "@/types/common";
import type {
  CodCollectionBoard,
  CodCollectionRow,
  CodLedgerState,
  CodRiderTransferBoard,
  CodRiderTransferRow,
  CodRiderTransferState,
  CustomerReviewRow,
  HsdDeviceHistoryEvent,
  HsdDeviceRow,
  OpsActivityItem,
  OpsDateRange,
  OpsDocItem,
  OpsMetric,
  OpsOrderRef,
  OpsRangeQuery,
  OrderProgressRow,
  OrderProgressTimelineEvent,
  WorkerDetailBundle,
  WorkerStatsBundle,
} from "@/types/adminOps";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function unwrap(res: unknown): Record<string, unknown> {
  const root = asRecord(res);
  const data = root["data"];
  if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  return root;
}

function extractList(res: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const root = asRecord(res);
  for (const k of keys) {
    if (Array.isArray(root[k])) return root[k] as Record<string, unknown>[];
  }
  const data = root["data"];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const k of keys) {
      if (Array.isArray(d[k])) return d[k] as Record<string, unknown>[];
    }
  }
  return [];
}

function str(v: unknown, fallback = ""): string {
  if (v == null || v === "") return fallback;
  return String(v);
}

function money(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && Number.isFinite(v)) return `₹${Math.round(v).toLocaleString("en-IN")}`;
  const s = String(v);
  if (s.startsWith("₹")) return s;
  const n = Number(s.replace(/[₹,\s]/g, ""));
  if (Number.isFinite(n)) return `₹${Math.round(n).toLocaleString("en-IN")}`;
  return s;
}

function toneFrom(label: string): Tone {
  const s = label.toLowerCase();
  if (/suspend|offline|fail|exception|error|reject/.test(s)) return "red";
  if (/pending|review|delay|warn|idle/.test(s)) return "amber";
  if (/online|active|available|deliver|verified|settled|ok|idle/.test(s)) return "green";
  if (/busy|on.?shift|accepted|picked|progress/.test(s)) return "blue";
  return "grey";
}

function badge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) {
    const b = raw as Badge;
    return { label: b.label || "—", tone: b.tone || toneFrom(b.label || "") };
  }
  const label = str(raw, "—");
  return { label, tone: toneFrom(label) };
}

function metricsFrom(raw: unknown, fallbackKeys?: string[]): OpsMetric[] {
  if (Array.isArray(raw)) {
    return raw
      .map((row, i) => {
        const r = asRecord(row);
        const label = str(r["label"] ?? r["name"] ?? r["key"], "");
        const value = str(r["value"] ?? r["count"] ?? r["amount"], "");
        if (!label && !value) return null;
        return { label: label || `Metric ${i + 1}`, value: value || "—" };
      })
      .filter((m): m is OpsMetric => m != null);
  }
  const obj = asRecord(raw);
  const keys = fallbackKeys ?? Object.keys(obj);
  return keys
    .filter((k) => obj[k] != null && typeof obj[k] !== "object")
    .map((k) => ({
      label: k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      value: str(obj[k], "—"),
    }));
}

function orderRef(raw: Record<string, unknown>, index: number): OpsOrderRef {
  const id = str(raw["orderId"] ?? raw["_id"] ?? raw["id"] ?? raw["orderNumber"], `order-${index}`);
  return {
    id,
    orderNumber: str(raw["orderNumber"] ?? raw["orderId"] ?? raw["id"], id),
    status: str(raw["status"] ?? raw["fulfillmentLabel"], "") || undefined,
    amount: raw["amount"] != null || raw["orderValue"] != null || raw["total"] != null
      ? money(raw["amount"] ?? raw["orderValue"] ?? raw["total"])
      : undefined,
    store: str(raw["store"] ?? raw["darkStore"] ?? raw["hub"], "") || undefined,
    createdAt: str(raw["createdAt"] ?? raw["deliveredAt"] ?? raw["time"], "") || undefined,
    note: str(raw["note"] ?? raw["remark"], "") || undefined,
  };
}

function activityItem(raw: Record<string, unknown>, index: number): OpsActivityItem {
  return {
    id: str(raw["_id"] ?? raw["id"], `act-${index}`),
    time: str(raw["time"] ?? raw["timestamp"] ?? raw["createdAt"], "—"),
    event: str(raw["event"] ?? raw["action"] ?? raw["status"] ?? raw["type"], "Event"),
    detail: str(raw["detail"] ?? raw["note"] ?? raw["message"], "") || undefined,
  };
}

function docItem(raw: Record<string, unknown>, index: number): OpsDocItem {
  return {
    id: str(raw["_id"] ?? raw["id"] ?? raw["type"], `doc-${index}`),
    label: str(raw["label"] ?? raw["name"] ?? raw["type"] ?? raw["docType"], `Document ${index + 1}`),
    status: str(raw["status"] ?? raw["verificationStatus"], "—"),
    value: str(raw["value"] ?? raw["number"] ?? raw["url"], "") || undefined,
  };
}

function mapWorkerDetail(res: unknown, fallbackId: string): WorkerDetailBundle {
  const root = unwrap(res);
  const profileObj = asRecord(root["profile"] ?? root["user"] ?? root);
  const id = str(
    profileObj["riderId"] ?? profileObj["pickerId"] ?? profileObj["_id"] ?? profileObj["id"] ?? root["id"] ?? fallbackId,
    fallbackId,
  );
  const name = str(
    profileObj["name"] ?? profileObj["fullName"] ?? root["name"] ?? root["fullName"],
    "—",
  );
  const phone = str(profileObj["phone"] ?? profileObj["mobile"] ?? root["phone"] ?? root["mobile"], "—");
  const status = badge(
    profileObj["approvalStatus"] ?? profileObj["approval"] ?? profileObj["status"] ?? root["status"] ?? root["workStatus"] ?? "—",
  );

  const profileMetrics = Array.isArray(root["profile"])
    ? metricsFrom(root["profile"])
    : metricsFrom(profileObj, [
        "employeeId",
        "email",
        "phone",
        "mobile",
        "role",
        "joiningDate",
        "joinedAt",
        "approvalStatus",
        "approval",
        "active",
        "darkStore",
        "kycStatus",
        "vehicle",
        "vehicleType",
      ]);

  const workObj = asRecord(root["work"] ?? root["workSummary"]);
  const currentOrder = asRecord(workObj["currentOrder"]);
  const codObj = asRecord(root["cod"] ?? root["cash"] ?? root["float"]);
  const lastDeposit = asRecord(codObj["lastDeposit"]);
  const work = [
    ...metricsFrom(workObj, [
      "isOnline",
      "onlineSince",
      "lastSeenAt",
      "darkStore",
      "vehicleType",
      "vehicleNumber",
      "totalTrips",
      "hub",
      "zone",
      "workforceRole",
    ]),
    ...(currentOrder["orderNumber"]
      ? [{ label: "Current order", value: str(currentOrder["orderNumber"]) }]
      : []),
    ...(codObj["cashInHand"] != null || codObj["cashInHandDisplay"]
      ? [{ label: "COD cash in hand", value: money(codObj["cashInHandDisplay"] ?? codObj["cashInHand"]) }]
      : []),
    ...(codObj["transferStatus"]
      ? [{ label: "COD transfer", value: str(codObj["transferStatus"]).replace(/_/g, " ") }]
      : []),
    ...(codObj["blockedFromOnline"] != null
      ? [{ label: "Online blocked", value: codObj["blockedFromOnline"] ? "Yes — transfer COD" : "No" }]
      : []),
    ...(lastDeposit["ref"]
      ? [{ label: "Last COD transfer", value: `${str(lastDeposit["ref"])} · ${money(lastDeposit["amount"])}` }]
      : []),
  ];

  const locationRaw = root["location"] ?? root["gpsLocation"] ?? root["lastLocation"];
  const locationObj = asRecord(locationRaw);
  const currentLoc = asRecord(locationObj["current"]);
  const location = metricsFrom(
    {
      ...locationObj,
      ...(currentLoc["latitude"] != null ? { lat: currentLoc["latitude"] } : {}),
      ...(currentLoc["longitude"] != null ? { lng: currentLoc["longitude"] } : {}),
    },
    ["lat", "lng", "address", "updatedAt", "lastSeenAt"],
  );

  const docsRaw = root["docs"] ?? root["documents"] ?? root["kycDocuments"];
  const docs = Array.isArray(docsRaw)
    ? docsRaw.map((d, i) => docItem(asRecord(d), i))
    : metricsFrom(docsRaw).map((m, i) => ({ id: `doc-${i}`, label: m.label, status: m.value }));

  const earnings = metricsFrom(root["earnings"] ?? root["earningsSummary"], [
    "walletBalance",
    "totalEarnings",
  ]);

  const attendanceRaw = root["attendance"] ?? root["attendanceSummary"];
  const attendance = Array.isArray(attendanceRaw)
    ? attendanceRaw.slice(0, 10).map((row, i) => {
        const r = asRecord(row);
        const punchIn = str(r["punchIn"], "");
        const punchOut = str(r["punchOut"], "open");
        return {
          label: punchIn ? `Shift ${i + 1}` : `Attendance ${i + 1}`,
          value: punchIn ? `${punchIn} → ${punchOut}` : str(r["status"], "—"),
        };
      })
    : metricsFrom(attendanceRaw);

  const statsOrders = extractList(asRecord(root["stats"]), ["orders", "recentOrders", "items"]);
  const orders = (statsOrders.length ? statsOrders : extractList(root, ["orders", "recentOrders", "items"])).map(
    orderRef,
  );
  const activity = extractList(root, ["activity", "timeline", "events"]).map(activityItem);

  return {
    id,
    name,
    phone,
    status,
    profile: profileMetrics,
    work,
    location,
    docs,
    earnings,
    attendance,
    orders,
    activity,
  };
}

function mapWorkerStats(res: unknown, range: OpsDateRange): WorkerStatsBundle {
  const root = unwrap(res);
  const metrics = metricsFrom(root["metrics"] ?? root["stats"] ?? root["summary"] ?? root);
  const orders = extractList(root, ["orders", "items", "list"]).map(orderRef);
  return { range, metrics, orders };
}

function codState(raw: unknown): CodLedgerState {
  const s = str(raw, "pending").toLowerCase();
  if (s.includes("exception") || s.includes("fail")) return "exception";
  if (s.includes("settle")) return "settled";
  if (s.includes("verif")) return "verified";
  if (s.includes("submit")) return "submitted";
  if (s.includes("collect")) return "collected";
  return "pending";
}

function mapCodRow(raw: Record<string, unknown>, index: number): CodCollectionRow {
  const orderId = str(raw["orderId"] ?? raw["_id"] ?? raw["id"], `cod-${index}`);
  const state = codState(
    raw["collectionStatus"] ?? raw["state"] ?? raw["codStatus"] ?? raw["paymentStatus"] ?? raw["status"] ?? raw["ledgerState"],
  );
  const amount = raw["amount"] ?? raw["orderValue"] ?? raw["total"];
  const collectedAmt = raw["collectedAmount"] ?? raw["collected"];
  const isPending = state === "pending";
  const isSettled = state === "settled";
  return {
    id: str(raw["_id"] ?? raw["id"], orderId),
    orderId,
    orderNumber: str(raw["orderNumber"] ?? raw["orderId"], orderId),
    orderValue: money(amount),
    collected: money(collectedAmt ?? (state === "collected" || isSettled ? amount : 0)),
    pending: money(isPending ? amount : raw["pending"] ?? raw["pendingAmount"] ?? 0),
    submitted: money(raw["submitted"] ?? raw["submittedAmount"] ?? (state === "submitted" || state === "collected" ? collectedAmt : 0)),
    verified: money(raw["verified"] ?? raw["verifiedAmount"] ?? (isSettled ? amount : 0)),
    settled: money(raw["settled"] ?? raw["settledAmount"] ?? (isSettled ? amount : 0)),
    exception: str(raw["exception"] ?? raw["exceptionReason"] ?? (state === "exception" ? "Exception" : ""), "—"),
    state,
    rider: str(raw["rider"] ?? raw["riderName"] ?? raw["riderId"], "") || undefined,
    store: str(raw["store"] ?? raw["darkStore"], "") || undefined,
    updatedAt: str(raw["updatedAt"] ?? raw["collectedAt"] ?? raw["deliveredAt"] ?? raw["createdAt"], "") || undefined,
  };
}

function mapCodBoard(res: unknown): CodCollectionBoard {
  const root = unwrap(res);
  const rows = extractList(res, ["orders", "rows", "items", "list", "cod", "collections"]).map(mapCodRow);
  const summarySource = root["summary"] ?? root["totals"] ?? root["metrics"];
  let summary = metricsFrom(summarySource, [
    "orderValue",
    "collected",
    "pending",
    "submitted",
    "verified",
    "settled",
    "exception",
    "realizedRevenue",
  ]);
  if (summary.length === 0 && rows.length > 0) {
    const countBy = (state: CodLedgerState) => rows.filter((r) => r.state === state).length;
    summary = [
      { label: "Orders", value: String(rows.length) },
      { label: "Pending", value: String(countBy("pending")) },
      { label: "Collected", value: String(countBy("collected")) },
      { label: "Submitted", value: String(countBy("submitted")) },
      { label: "Verified", value: String(countBy("verified")) },
      { label: "Settled", value: String(countBy("settled")) },
      { label: "Exception", value: String(countBy("exception")) },
    ];
  }
  const summaryObj = asRecord(summarySource);
  const realizedFromApi =
    root["realizedRevenue"] ??
    root["settledRevenue"] ??
    summaryObj["realizedRevenue"] ??
    summaryObj["settled"];
  const settledTotal = rows.reduce((sum, r) => {
    const n = Number(String(r.settled).replace(/[₹,\s—-]/g, ""));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const realizedRevenue =
    realizedFromApi != null && realizedFromApi !== ""
      ? money(realizedFromApi)
      : rows.length
        ? money(settledTotal)
        : "—";
  return { summary, rows, realizedRevenue };
}

function transferState(raw: unknown): CodRiderTransferState {
  const s = str(raw, "clear").toLowerCase();
  if (s.includes("block")) return "blocked";
  if (s.includes("pending")) return "pending_transfer";
  return "clear";
}

function mapCodTransferRow(raw: Record<string, unknown>, index: number): CodRiderTransferRow {
  const riderId = str(raw["riderId"] ?? raw["_id"] ?? raw["id"], `rider-${index}`);
  const cashAmt = Number(raw["cashInHand"] ?? 0);
  const status = transferState(raw["transferStatus"] ?? raw["status"]);
  return {
    id: riderId,
    riderId,
    riderName: str(raw["riderName"] ?? raw["name"], "Rider"),
    phone: str(raw["phone"], "") || undefined,
    hub: str(raw["hub"] ?? raw["darkStore"] ?? raw["store"], "") || undefined,
    isOnline: Boolean(raw["isOnline"]),
    cashInHand: money(raw["cashInHandDisplay"] ?? cashAmt),
    cashInHandAmount: Number.isFinite(cashAmt) ? cashAmt : 0,
    collectedToday: money(raw["collectedToday"] ?? 0),
    depositedToday: money(raw["depositedToday"] ?? 0),
    lastDepositAt: str(raw["lastDepositAt"], "") || undefined,
    lastDepositRef: str(raw["lastDepositRef"], "") || undefined,
    transferStatus: status,
    blockedFromOnline: Boolean(raw["blockedFromOnline"]) || status === "blocked",
    ordersPendingSettle: Number(raw["ordersPendingSettle"] ?? 0) || 0,
  };
}

function mapCodTransferBoard(res: unknown): CodRiderTransferBoard {
  const root = unwrap(res);
  const rows = extractList(res, ["riders", "rows", "items", "list", "transfers"]).map(mapCodTransferRow);
  const summarySource = root["summary"] ?? root["totals"] ?? root["metrics"];
  let summary = metricsFrom(summarySource, [
    "ridersWithFloat",
    "totalCashInHand",
    "blockedFromOnline",
    "transferredToday",
    "collectedToday",
  ]);
  if (summary.length === 0 && rows.length > 0) {
    summary = [
      { label: "Riders with float", value: String(rows.filter((r) => r.cashInHandAmount > 0).length) },
      { label: "Cash in hand", value: money(rows.reduce((s, r) => s + r.cashInHandAmount, 0)) },
      { label: "Blocked online", value: String(rows.filter((r) => r.blockedFromOnline).length) },
      { label: "Transferred", value: String(rows.filter((r) => r.transferStatus === "clear").length) },
    ];
  }
  const note = str(asRecord(summarySource)["note"] ?? root["note"], "") || undefined;
  return { summary, rows, note };
}

const STAGE_LABELS: Record<string, string> = {
  pending: "Placed",
  confirmed: "Waiting for Picker",
  waiting_for_picker: "Waiting for Picker",
  picker_accepted: "Picker Accepted",
  packed_in_rack: "Waiting for Rider",
  packed_rack: "Packed & Rack",
  waiting_for_rider: "Waiting for Rider",
  rider_accepted: "Rider Accepted",
  rider_picked: "Rider Picked",
  delivered: "Delivered",
  exception: "Exception",
  cancelled: "Cancelled",
};

function mapTimeline(raw: Record<string, unknown>, index: number): OrderProgressTimelineEvent {
  return {
    id: str(raw["_id"] ?? raw["id"], `tl-${index}`),
    time: str(raw["time"] ?? raw["timestamp"] ?? raw["createdAt"], "—"),
    status: str(raw["status"] ?? raw["event"] ?? raw["stage"], "—"),
    note: str(raw["note"] ?? raw["message"], "") || undefined,
    actor: str(raw["actor"] ?? raw["by"], "") || undefined,
  };
}

function mapOrderProgress(raw: Record<string, unknown>, index: number): OrderProgressRow {
  const id = str(raw["_id"] ?? raw["id"] ?? raw["orderId"], `op-${index}`);
  const stage = str(raw["fulfillmentStage"] ?? raw["stage"], "");
  const label =
    str(raw["fulfillmentLabel"], "") ||
    STAGE_LABELS[stage] ||
    str(raw["status"], "") ||
    "—";
  const timelineRaw = raw["timeline"] ?? raw["logs"] ?? raw["events"];
  const timeline = Array.isArray(timelineRaw)
    ? timelineRaw.map((e, i) => mapTimeline(asRecord(e), i))
    : [];
  return {
    id,
    orderNumber: str(raw["orderNumber"] ?? raw["orderId"], id),
    store: str(raw["store"] ?? raw["darkStore"] ?? raw["hub"] ?? raw["offerHubKey"], "—"),
    fulfillmentStage: stage || "—",
    fulfillmentLabel: label,
    status: str(raw["status"], "") || undefined,
    picker: str(raw["picker"] ?? raw["pickerName"] ?? raw["hhdUserName"] ?? raw["pickerId"], "") || undefined,
    rider: str(raw["rider"] ?? raw["riderName"] ?? raw["riderId"], "") || undefined,
    updatedAt: str(raw["updatedAt"] ?? raw["lastEventAt"] ?? raw["createdAt"], "") || undefined,
    timeline,
  };
}

function mapReview(raw: Record<string, unknown>, index: number): CustomerReviewRow {
  const orderId = str(raw["orderId"] ?? raw["_id"] ?? raw["id"] ?? raw["reviewId"], `rev-${index}`);
  const ratingRaw = raw["rating"] ?? raw["stars"] ?? raw["score"] ?? raw["ratingScore"];
  const rating = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw);
  return {
    id: str(raw["reviewId"] ?? raw["_id"] ?? raw["id"], orderId),
    orderId,
    orderNumber: str(raw["orderNumber"] ?? raw["orderId"], orderId),
    rating: Number.isFinite(rating) ? rating : 0,
    comment: str(raw["reviewText"] ?? raw["comment"] ?? raw["review"] ?? raw["feedback"], ""),
    customer: str(raw["customer"] ?? raw["customerName"], "") || undefined,
    createdAt: str(raw["date"] ?? raw["createdAt"] ?? raw["reviewedAt"], "") || undefined,
    store: str(raw["store"] ?? raw["darkStore"], "") || undefined,
  };
}

function mapDevice(raw: Record<string, unknown>, index: number): HsdDeviceRow {
  const id = str(raw["_id"] ?? raw["id"] ?? raw["deviceId"], `hsd-${index}`);
  return {
    id,
    deviceId: str(raw["deviceId"] ?? raw["serial"] ?? raw["imei"], id),
    label: str(raw["label"] ?? raw["name"] ?? raw["deviceName"], id),
    store: str(raw["store"] ?? raw["darkStore"] ?? raw["hub"], "—"),
    status: badge(raw["status"] ?? raw["deviceStatus"] ?? "—"),
    assignedTo: str(raw["assignedTo"] ?? raw["picker"] ?? raw["pickerName"], "") || undefined,
    lastSeen: str(raw["lastSeen"] ?? raw["lastSeenAt"] ?? raw["updatedAt"], "") || undefined,
    model: str(raw["model"] ?? raw["deviceModel"], "") || undefined,
  };
}

function mapHistory(raw: Record<string, unknown>, index: number): HsdDeviceHistoryEvent {
  return {
    id: str(raw["_id"] ?? raw["id"], `hist-${index}`),
    time: str(raw["time"] ?? raw["timestamp"] ?? raw["createdAt"], "—"),
    event: str(raw["event"] ?? raw["action"] ?? raw["type"], "Event"),
    detail: str(raw["detail"] ?? raw["note"] ?? raw["message"], "") || undefined,
    orderNumber: str(raw["orderNumber"] ?? raw["orderId"], "") || undefined,
    actor: str(raw["actor"] ?? raw["by"] ?? raw["picker"], "") || undefined,
  };
}

function rangeParams(q: OpsRangeQuery): Record<string, string | undefined> {
  return {
    range: q.range,
    from: q.range === "custom" ? q.from : undefined,
    to: q.range === "custom" ? q.to : undefined,
  };
}

export const adminOpsService = {
  async getRiderDetail(id: string): Promise<WorkerDetailBundle> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/riders/${id}`);
    return mapWorkerDetail(res, id);
  },

  async getRiderStats(id: string, q: OpsRangeQuery): Promise<WorkerStatsBundle> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/riders/${id}/stats`, rangeParams(q));
    return mapWorkerStats(res, q.range);
  },

  async getPickerDetail(id: string): Promise<WorkerDetailBundle> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/pickers/${id}`);
    return mapWorkerDetail(res, id);
  },

  async getPickerStats(id: string, q: OpsRangeQuery): Promise<WorkerStatsBundle> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/pickers/${id}/stats`, rangeParams(q));
    return mapWorkerStats(res, q.range);
  },

  async getCodCollection(q: OpsRangeQuery): Promise<CodCollectionBoard> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/cod`, rangeParams(q));
    return mapCodBoard(res);
  },

  async getCodRiderTransfers(q: OpsRangeQuery): Promise<CodRiderTransferBoard> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/cod/transfers`, rangeParams(q));
    return mapCodTransferBoard(res);
  },

  async getOrderProgress(params?: { status?: string; store?: string }): Promise<OrderProgressRow[]> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/order-progress`, {
      status: params?.status || undefined,
      store: params?.store || undefined,
    });
    return extractList(res, ["orders", "items", "list", "rows"]).map(mapOrderProgress);
  },

  async getCustomerReviews(params?: { rating?: string; from?: string; to?: string }): Promise<CustomerReviewRow[]> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/reviews`, {
      rating: params?.rating || undefined,
      from: params?.from || undefined,
      to: params?.to || undefined,
    });
    return extractList(res, ["reviews", "items", "list", "rows"]).map(mapReview);
  },

  async getHsdDevices(): Promise<HsdDeviceRow[]> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/hsd-devices`);
    return extractList(res, ["devices", "items", "list", "rows"]).map(mapDevice);
  },

  async getHsdDeviceHistory(id: string, q: OpsRangeQuery): Promise<HsdDeviceHistoryEvent[]> {
    const res = await api.get<unknown>(`/api/v1/admin/ops/hsd-devices/${id}/history`, rangeParams(q));
    return extractList(res, ["history", "events", "items", "list"]).map(mapHistory);
  },
};

export const OPS_RANGE_OPTIONS: { value: OpsDateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom" },
];

export const FULFILLMENT_STAGES = [
  { value: "confirmed", label: "Waiting for Picker" },
  { value: "picker_accepted", label: "Picker Accepted" },
  { value: "packed_in_rack", label: "Waiting for Rider" },
  { value: "rider_accepted", label: "Rider Accepted" },
  { value: "rider_picked", label: "Rider Picked" },
  { value: "delivered", label: "Delivered" },
  { value: "exception", label: "Exception" },
] as const;
