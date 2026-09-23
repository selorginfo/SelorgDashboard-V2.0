import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  useCustomers,
  useCreditWallet,
  useSetCustomerStatus,
  useCreateCustomer,
  useCustomerOrders,
  useCustomerRefunds,
  useCustomerWallet,
  useCustomerActivity,
} from "@/modules/commerce/hooks/useCustomers";
import { CustomerFormModal } from "@/modules/commerce/components/CustomerFormModal";
import type { NewCustomerInput } from "@/services/commerce/customerService";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { KpiStat } from "@/types/common";
import type { Customer } from "@/types/commerce";
import styles from "./CustomersPage.module.css";

const TABS = ["Customers", "Wallets", "Activity", "Refund history", "Order history"] as const;

function deriveKpis(customers: Customer[]): KpiStat[] {
  const total = customers.length;
  const active = customers.filter((c) => c.status.label === "Active").length;
  const withTickets = customers.filter((c) => c.tickets !== "0" && Number(c.tickets) > 0).length;
  const walletFloat = customers.reduce((sum, c) => sum + c.walletBalance, 0);
  const walletStr =
    walletFloat >= 100000
      ? `₹${(walletFloat / 100000).toFixed(1)}L`
      : walletFloat >= 1000
        ? `₹${(walletFloat / 1000).toFixed(1)}K`
        : `₹${walletFloat}`;
  return [
    { label: "Total customers", value: total.toLocaleString("en-IN") },
    { label: "Active", value: active.toLocaleString("en-IN") },
    { label: "Wallet float", value: walletStr },
    {
      label: "Open tickets",
      value: withTickets.toLocaleString("en-IN"),
      color: withTickets > 0 ? "var(--amber-tx)" : undefined,
    },
  ];
}

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function CustomersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Customers");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { data: customers, isLoading, isError, refetch } = useCustomers();
  const creditWallet = useCreditWallet();
  const setStatus = useSetCustomerStatus();
  const createCustomer = useCreateCustomer();
  const navigate = useNavigate();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const canCredit = can("customers", "edit");
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const kpis = useMemo(() => (customers ? deriveKpis(customers) : []), [customers]);
  const selected: Customer | undefined = customers?.find((c) => c.id === selectedId) ?? customers?.[0];
  const selectedKey = selected?.id;

  const { data: wallet } = useCustomerWallet(selectedKey);
  const { data: activity = [], isLoading: activityLoading } = useCustomerActivity(
    tab === "Activity" || tab === "Customers" ? selectedKey : undefined,
  );
  const { data: refunds = [], isLoading: refundsLoading } = useCustomerRefunds(
    tab === "Refund history" ? selectedKey : undefined,
  );
  const { data: orders = [], isLoading: ordersLoading } = useCustomerOrders(
    tab === "Order history" || tab === "Wallets" ? selectedKey : undefined,
  );

  if (isLoading) return <CardSkeleton />;
  if (isError || !customers) return <ErrorState message="Couldn't load customers." onRetry={() => refetch()} />;

  function submitCredit() {
    if (!selected) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      pushToast("Enter a valid credit amount", "error");
      return;
    }
    if (!reason.trim()) {
      pushToast("Add a reason for the credit", "error");
      return;
    }
    creditWallet.mutate(
      { id: selected.id, amount: value },
      {
        onSuccess: () => {
          pushToast(`Credited ${formatRupees(value)} to ${selected.name}'s wallet — ${reason.trim()}`, "success");
          setAmount("");
          setReason("");
        },
        onError: () => pushToast("Couldn't credit wallet", "error"),
      },
    );
  }

  function blockCustomer() {
    if (!selected) return;
    setStatus.mutate(
      { id: selected.id, status: { label: "Blocked", tone: "red" } },
      { onSuccess: () => pushToast(`${selected.name} blocked`, "success") },
    );
  }

  function goToRefund() {
    if (!selected) return;
    pushToast(`Pick the ticket for ${selected.name} to issue the refund`, "info");
    navigate("/support");
  }

  function exportProfile() {
    if (!selected) return;
    const rows: [string, string][] = [
      ["Customer ID", selected.id],
      ["Name", selected.name],
      ["Status", selected.status.label],
      ["Wallet balance", String(selected.walletBalance)],
      ["Open tickets", String(selected.tickets)],
    ];
    const csv = rows.map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `customer-${selected.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    pushToast(`Exported profile for ${selected.name}`, "success");
  }

  const walletCustomers = customers.filter((c) => c.walletBalance > 0 || (wallet && selected?.id === c.id));

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="customers" />

      <KpiStrip kpis={kpis} moduleId="customers" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {canCredit ? (
          <Button size="sm" variant="primary" onClick={() => setNewCustomerOpen(true)}>
            <Plus size={13} /> New customer
          </Button>
        ) : null}
      </div>

      {tab === "Customers" ? (
        <>
          {customers.length === 0 ? (
            <EmptyState title="No customers found" />
          ) : (
            <div className={styles.customerGrid}>
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.customerCardBtn}
                  data-selected={c.id === selected?.id}
                  onClick={() => setSelectedId(c.id)}
                >
                  <Card className={styles.customerCard}>
                    <div className={styles.cardTop}>
                      <span className={styles.customerName}>{c.name || c.phone || c.id.slice(-6)}</span>
                      <Badge label={c.status.label} tone={c.status.tone} />
                    </div>
                    <div className={styles.cardMeta}>{c.phone || "—"}</div>
                    <div className={styles.statRow}>
                      <div className={styles.statCell}>
                        <span className={styles.statValue}>{c.orders}</span>
                        <span className={styles.statLabel}>Orders</span>
                      </div>
                      <div className={styles.statCell}>
                        <span className={styles.statValue}>{c.totalSpend}</span>
                        <span className={styles.statLabel}>Spend</span>
                      </div>
                      <div className={styles.statCell}>
                        <span className={styles.statValue}>{formatRupees(c.walletBalance)}</span>
                        <span className={styles.statLabel}>Wallet</span>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}

          {selected ? (
            <Card className={styles.detailStrip}>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.detailTitle}>{selected.name || "Customer"}</div>
                  <div className={styles.detailMeta}>{selected.phone}</div>
                </div>
                <Badge label={selected.status.label} tone={selected.status.tone} />
              </div>

              <div className={styles.detailFields}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Orders</span>
                  <span className={styles.fieldValue}>{selected.orders}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Total spend</span>
                  <span className={styles.fieldValue}>{selected.totalSpend}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Last order</span>
                  <span className={styles.fieldValue}>{selected.lastOrder}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Wallet balance</span>
                  <span className={styles.fieldValue}>
                    {formatRupees(wallet?.balance ?? selected.walletBalance)}
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Open tickets</span>
                  <span className={styles.fieldValue}>{selected.tickets}</span>
                </div>
              </div>

              <div className={styles.actionRow}>
                <Button size="sm" onClick={() => navigate(`/orders?q=${encodeURIComponent(selected.name || selected.phone)}`)}>
                  View orders
                </Button>
                {canCredit ? (
                  <Button size="sm" onClick={() => setShowCreditForm((v) => !v)}>
                    Adjust wallet
                  </Button>
                ) : null}
                {can("customers", "refund") ? (
                  <Button size="sm" onClick={goToRefund}>
                    Issue refund
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => navigate("/support")}>
                  Raise ticket
                </Button>
                {canCredit ? (
                  <Button size="sm" variant="danger" isLoading={setStatus.isPending} onClick={blockCustomer}>
                    Block customer
                  </Button>
                ) : null}
                <Button size="sm" onClick={exportProfile}>
                  Export profile
                </Button>
              </div>

              {canCredit && showCreditForm ? (
                <div className={styles.creditForm}>
                  <div className={styles.creditFormTitle}>Credit wallet</div>
                  <div className={styles.creditFormRow}>
                    <div className={styles.creditField}>
                      <FieldLabel>Amount (₹)</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 200"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <div className={styles.creditFieldGrow}>
                      <FieldLabel>Reason</FieldLabel>
                      <Input
                        placeholder="e.g. Refund goodwill credit"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    <Button variant="primary" size="sm" isLoading={creditWallet.isPending} onClick={submitCredit}>
                      Credit wallet
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}

          {selected ? (
            <Card className={styles.activityCard}>
              <div className={styles.activityTitle}>Customer activity</div>
              <div className={styles.activityList}>
                {activityLoading ? (
                  <div className={styles.activityMeta}>Loading activity…</div>
                ) : activity.length === 0 ? (
                  <EmptyState title="No activity yet" description="Orders, refunds and tickets will appear here." />
                ) : (
                  activity.map((entry) => (
                    <div key={`${entry.title}-${entry.at}`} className={styles.activityRow}>
                      <span className={styles.activityDot} />
                      <div>
                        <div className={styles.activityEvent}>{entry.title}</div>
                        <div className={styles.activityMeta}>{entry.meta}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === "Wallets" ? (
        <Card className={styles.tableCard}>
          {!selected ? (
            <EmptyState title="Select a customer first" />
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Wallet balance</th>
                    <th>Orders</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(walletCustomers.length ? walletCustomers : [selected]).map((c) => (
                    <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: "pointer" }}>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td>
                        {formatRupees(
                          c.id === selected.id ? (wallet?.balance ?? c.walletBalance) : c.walletBalance,
                        )}
                      </td>
                      <td>{c.orders}</td>
                      <td>
                        <Badge label={c.status.label} tone={c.status.tone} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === "Activity" ? (
        <Card className={styles.activityCard}>
          <div className={styles.activityTitle}>Activity — {selected?.name || "customer"}</div>
          {activityLoading ? (
            <div className={styles.activityMeta}>Loading…</div>
          ) : activity.length === 0 ? (
            <EmptyState title="No activity" />
          ) : (
            <div className={styles.activityList}>
              {activity.map((entry) => (
                <div key={`${entry.title}-${entry.at}`} className={styles.activityRow}>
                  <span className={styles.activityDot} />
                  <div>
                    <div className={styles.activityEvent}>{entry.title}</div>
                    <div className={styles.activityMeta}>{entry.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === "Refund history" ? (
        <Card className={styles.tableCard}>
          {refundsLoading ? (
            <div className={styles.activityMeta}>Loading refunds…</div>
          ) : refunds.length === 0 ? (
            <EmptyState title="No refunds for this customer" />
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Refund</th>
                    <th>Order</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id.slice(-8)}</td>
                      <td>{r.orderNumber}</td>
                      <td>{formatRupees(r.amount)}</td>
                      <td>{r.method || "—"}</td>
                      <td>{r.status}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === "Order history" ? (
        <Card className={styles.tableCard}>
          {ordersLoading ? (
            <div className={styles.activityMeta}>Loading orders…</div>
          ) : orders.length === 0 ? (
            <EmptyState title="No orders for this customer" />
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Placed</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.orderNumber || o.id}</td>
                      <td>{o.status}</td>
                      <td>{formatRupees(o.total)}</td>
                      <td>{o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : "—"}</td>
                      <td>
                        <Button size="sm" onClick={() => navigate(`/orders/${o.orderNumber || o.id}`)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      <CustomerFormModal
        open={newCustomerOpen}
        onOpenChange={setNewCustomerOpen}
        isLoading={createCustomer.isPending}
        onSubmit={(input: NewCustomerInput) => {
          createCustomer.mutate(input, {
            onSuccess: (c) => {
              pushToast(`${c.name} registered`, "success");
              setNewCustomerOpen(false);
            },
            onError: (e) => pushToast((e as Error).message, "error"),
          });
        }}
      />
    </div>
  );
}
