import { ShoppingCart, PackageCheck, ScanBarcode, UserCog, Boxes, Target } from "lucide-react";
import { Link } from "react-router-dom";
import type { Order } from "@/types/order";
import { ORDER_STAGES } from "@/types/order";
import { Card } from "@/components/ui/Card";
import styles from "./FulfilmentChain.module.css";

/** Order → Bag → Products scanned → Picker → Rack → Status — the end-to-end trace called out in
 * the requirements doc §33. */
export function FulfilmentChain({ order }: { order: Order }) {
  const scannedCount = order.items.filter((i) => i.missing === 0).length;
  const hasShort = order.items.some((i) => i.missing > 0);
  const racked = order.stage >= 6;

  const chain = [
    { label: "Order", value: order.id, meta: order.date, tone: "green" as const, icon: ShoppingCart, to: undefined },
    { label: "Bag", value: "BAG-000982", meta: "890126400982", tone: "green" as const, icon: PackageCheck, to: "/bags" },
    {
      label: "Products scanned",
      value: `${scannedCount} / ${order.items.length}`,
      meta: hasShort ? "1 short quantity" : "All verified",
      tone: hasShort ? ("amber" as const) : ("green" as const),
      icon: ScanBarcode,
      to: "/scan-history",
    },
    { label: "Picker", value: order.picker, meta: order.store, tone: "green" as const, icon: UserCog, to: "/picker-dir" },
    {
      label: "Rack",
      value: racked ? "DS01-R05" : "Not yet racked",
      meta: racked ? "Staging A · scanned" : "Awaiting rack scan",
      tone: racked ? ("green" as const) : ("grey" as const),
      icon: Boxes,
      to: "/racks",
    },
    {
      label: "Status",
      value: ORDER_STAGES[order.stage],
      meta: order.stage >= 7 ? "Ready for rider" : "In progress",
      tone: order.stage >= 7 ? ("green" as const) : ("amber" as const),
      icon: Target,
      to: undefined,
    },
  ];

  return (
    <Card className={styles.card}>
      <div className={styles.title}>Fulfilment chain</div>
      <div className={styles.row}>
        {chain.map((c, i) => {
          const Icon = c.icon;
          const inner = (
            <div className={styles.node} data-tone={c.tone}>
              <div className={styles.nodeHead}>
                <span className={styles.nodeIcon}>
                  <Icon size={12} strokeWidth={1.8} />
                </span>
                <span className={styles.nodeLabel}>{c.label}</span>
              </div>
              <div className={styles.nodeValue}>{c.value}</div>
              <div className={styles.nodeMeta}>{c.meta}</div>
            </div>
          );
          return (
            <div key={c.label} className={styles.item}>
              {c.to ? (
                <Link to={c.to} className={styles.link}>
                  {inner}
                </Link>
              ) : (
                inner
              )}
              {i < chain.length - 1 ? <span className={styles.arrow}>→</span> : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
