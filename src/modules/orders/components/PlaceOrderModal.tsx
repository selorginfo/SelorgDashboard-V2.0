import { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { PlaceOrderInput } from "@/services/orders/orderService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: PlaceOrderInput) => void;
  isLoading: boolean;
}

interface ItemRow { productId: string; quantity: number }

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash on Delivery" },
  { value: "wallet", label: "Wallet" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

export function PlaceOrderModal({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ productId: "", quantity: 1 }]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCustomerId(""); setItems([{ productId: "", quantity: 1 }]);
      setPaymentMethod("cash"); setDeliveryNotes(""); setCouponCode(""); setError("");
    }
  }, [open]);

  function addItem() { setItems((prev) => [...prev, { productId: "", quantity: 1 }]); }
  function removeItem(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }
  function setItem(i: number, key: keyof ItemRow, val: string | number) {
    setItems((prev) => prev.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId.trim()) { setError("Customer ID is required"); return; }
    const validItems = items.filter((it) => it.productId.trim());
    if (validItems.length === 0) { setError("At least one product ID is required"); return; }
    setError("");
    onSubmit({
      customerId: customerId.trim(),
      items: validItems.map((it) => ({ productId: it.productId.trim(), quantity: Math.max(1, it.quantity) })),
      paymentMethod,
      deliveryNotes: deliveryNotes.trim() || undefined,
      couponCode: couponCode.trim() || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Place order on behalf of customer"
      description="Admin-placed orders go directly to confirmed status and are picked from DS-Adyar-01."
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button size="sm" variant="primary" isLoading={isLoading} onClick={handleSubmit as never}>Place order</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error ? <div style={{ color: "var(--red-tx, #dc2626)", fontSize: "0.82rem", padding: "8px 12px", background: "var(--red-bg, #fef2f2)", borderRadius: 6 }}>{error}</div> : null}

        <div>
          <FieldLabel>Customer ID *</FieldLabel>
          <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="MongoDB ObjectId of the customer" required />
        </div>

        <div>
          <FieldLabel>Items *</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 32px", gap: 8, alignItems: "center" }}>
                <Input
                  value={item.productId}
                  onChange={(e) => setItem(i, "productId", e.target.value)}
                  placeholder="Product ID (ObjectId)"
                />
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => setItem(i, "quantity", parseInt(e.target.value, 10) || 1)}
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 6, border: "none", background: "transparent", color: "var(--tx-muted)", cursor: "pointer" }}
                  aria-label="Remove item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addItem}>
              <Plus size={13} /> Add item
            </Button>
          </div>
        </div>

        <div>
          <FieldLabel>Payment method</FieldLabel>
          <Select value={paymentMethod} onValueChange={setPaymentMethod} options={PAYMENT_OPTIONS} aria-label="Payment method" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Coupon code</FieldLabel>
            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <FieldLabel>Delivery notes</FieldLabel>
            <Input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </form>
    </Dialog>
  );
}
